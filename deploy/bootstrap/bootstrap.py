"""Gives Nexora WorkStudio its Nexora API key, and keeps the model on the upstream of deploy/.env.

Runs once per `docker compose up`, after Nexora API is healthy. Signs in as the bootstrap admin,
then:
- keeps the default model (the router carrying the `nexora-default` alias) on
  NEXORA_UPSTREAM_URL/MODEL/KEY when those change. Nexora API reads its model list only on its very
  first start, so without this a model changed in deploy/.env would never apply. The provider list
  hides keys: a fingerprint of the applied upstream, kept next to the key file, tells a new key
  apart, and an unchanged fingerprint leaves a default chosen in WorkStudio's interface alone;
- keeps a dedicated `workstudio` user (role without admin permission, unlimited on every model)
  in sync, and writes that user's key as `export VLLM_API_KEY=...` to the shared bootstrap volume,
  where the WorkStudio container reads it at startup. A key that still belongs to that user is
  kept, so restarts do not pile up keys;
- writes an admin key as `export NEXORA_API_ADMIN_KEY=...` to `nexora-admin.env`, read by the
  WorkStudio container only, for its model settings (the admin password stays out of WorkStudio).
Standard library only.
"""
from __future__ import annotations

import hashlib
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


class BootstrapError(RuntimeError):
    pass


class SessionExpiredError(BootstrapError):
    """The admin session ended mid-run: Nexora API reuses its session key until it expires."""


def _request(method: str, url: str, token: str | None = None, body: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            return response.status, json.loads(response.read() or b"{}")
    except urllib.error.HTTPError as error:
        return error.code, {}


def _wait_until_healthy(base_url: str, wait_seconds: int) -> None:
    deadline = time.monotonic() + wait_seconds
    while True:
        try:
            if _request("GET", f"{base_url}/health")[0] == 200:
                return
        except OSError:
            pass
        if time.monotonic() >= deadline:
            raise BootstrapError(f"Nexora API is not reachable at {base_url}")
        time.sleep(2)


def _read_existing_key(path: Path) -> str | None:
    if not path.exists():
        return None
    for line in path.read_text().splitlines():
        if line.startswith("export VLLM_API_KEY="):
            return line.split("=", 1)[1].strip() or None
    return None


def _write_private(path: Path, content: str) -> None:
    """Writes a 0600 file, owned by NEXORA_BOOTSTRAP_OWNER (uid[:gid]) when set, so only its reader can open it."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write(content)
    owner = os.environ.get("NEXORA_BOOTSTRAP_OWNER", "").strip()
    if owner:
        uid, _, gid = owner.partition(":")
        os.chown(tmp, int(uid), int(gid or uid))
    os.replace(tmp, path)


WORKSTUDIO_NAME = "workstudio"
WORKSTUDIO_EMAIL = "workstudio@nexora.local"
LIMIT_TYPES = ("rpm", "rpd", "tpm", "tpd")


def _call(method: str, url: str, token: str, body: dict | None = None) -> dict:
    status, payload = _request(method, url, token=token, body=body)
    if status == 401:
        raise SessionExpiredError(f"{method} {url.split('/v1/', 1)[-1]} failed (HTTP 401)")
    if status not in (200, 201, 204):
        raise BootstrapError(f"{method} {url.split('/v1/', 1)[-1]} failed (HTTP {status})")
    return payload


def _find(items: list, **match) -> dict | None:
    return next((item for item in items if all(item.get(k) == v for k, v in match.items())), None)


def _sync_workstudio_user(base_url: str, admin_token: str) -> int:
    """Role without admin permission, unlimited on every model; its organization and user."""
    api = f"{base_url}/v1/admin"
    routers = _call("GET", f"{api}/routers?limit=100", admin_token).get("data", [])
    limits = [{"router_id": r["id"], "type": t, "value": None} for r in routers for t in LIMIT_TYPES]
    role_body = {"name": WORKSTUDIO_NAME, "permissions": [], "limits": limits}
    role = _find(_call("GET", f"{api}/roles?limit=100", admin_token).get("data", []), name=WORKSTUDIO_NAME)
    if role:
        _call("PATCH", f"{api}/roles/{role['id']}", admin_token, role_body)
        role_id = role["id"]
    else:
        role_id = _call("POST", f"{api}/roles", admin_token, role_body)["id"]

    org = _find(_call("GET", f"{api}/organizations?limit=100", admin_token).get("data", []), name=WORKSTUDIO_NAME)
    org_id = org["id"] if org else _call("POST", f"{api}/organizations", admin_token, {"name": WORKSTUDIO_NAME})["id"]

    users = _call("GET", f"{api}/users?email={WORKSTUDIO_EMAIL}&limit=100", admin_token).get("data", [])
    user = _find(users, email=WORKSTUDIO_EMAIL)
    if user:
        return user["id"]
    return _call("POST", f"{api}/users", admin_token, {
        "email": WORKSTUDIO_EMAIL,
        "name": "Nexora WorkStudio",
        "password": secrets.token_hex(24),
        "role_id": role_id,
        "organization_id": org_id,
    })["id"]


ROUTER_FIELDS = ("name", "type", "aliases", "load_balancing_strategy", "cost_prompt_tokens", "cost_completion_tokens")


def _update_router(api: str, token: str, router: dict, **changes) -> None:
    body = {field: router[field] for field in ROUTER_FIELDS}
    body.update(changes)
    _call("PATCH", f"{api}/routers/{router['id']}", token, body)
    router.update(changes)


def _free_name(routers: list, name: str) -> str:
    taken = {n for r in routers for n in (r["name"], *r.get("aliases", []))}
    candidate, n = name, 1
    while candidate in taken:
        n += 1
        candidate = f"{name} ({n})"
    return candidate


def _providers(api: str, token: str, router: dict) -> list:
    return _call("GET", f"{api}/providers?router_id={router['id']}&limit=100", token).get("data", [])


def _point_router_at(api: str, token: str, router: dict, upstream: dict, url: str) -> None:
    """Makes `upstream` the router's only provider (same address and model with a new key: replaced)."""
    providers = _providers(api, token, router)
    current = next(
        (p for p in providers if (p.get("url") or "").rstrip("/") == url and p.get("model_name") == upstream["model"]), None
    )
    if current:  # Same address and model, new key: the API refuses a duplicate, so drop it first.
        _call("DELETE", f"{api}/providers/{current['id']}", token)
    created = _call("POST", f"{api}/providers", token, {
        "router_id": router["id"],
        "type": "openai",
        "url": url,
        "key": upstream["key"],
        "model_name": upstream["model"],
        "timeout": 120,
    })
    for provider in providers:
        if provider["id"] not in (created.get("id"), current and current["id"]):
            _call("DELETE", f"{api}/providers/{provider['id']}", token)


def _sync_default_model(base_url: str, admin_token: str, upstream: dict, fingerprint_file: Path) -> None:
    """The default model is the router carrying the alias `upstream["router"]` (nexora-default).

    A router still *named* after the alias (Nexora API's first start) is renamed after its model and
    given the alias. The upstream of deploy/.env applies only when it changed since the last run, so
    a default chosen in WorkStudio's interface survives restarts: the .env model then becomes the
    default (its own router, created if needed) and the previous default stays available.
    """
    api = f"{base_url}/v1/admin"
    alias = upstream["router"]
    routers = _call("GET", f"{api}/routers?limit=100", admin_token).get("data", [])
    holder = next((r for r in routers if r["name"] == alias or alias in r.get("aliases", [])), None)
    if not holder:
        return  # Not seeded yet: Nexora API creates it from its configuration.
    if holder["name"] == alias:
        providers = _providers(api, admin_token, holder)
        model = providers[0]["model_name"] if providers else alias
        _update_router(api, admin_token, holder, name=_free_name([r for r in routers if r is not holder], model), aliases=[*holder.get("aliases", []), alias])

    url = upstream["url"].strip().rstrip("/").lower()
    fingerprint = hashlib.sha256(f"{url}|{upstream['model']}|{upstream['key']}".encode()).hexdigest()
    previous = fingerprint_file.read_text().strip() if fingerprint_file.exists() else None
    if previous == fingerprint:
        return
    if previous is None:
        providers = _providers(api, admin_token, holder)
        if len(providers) == 1 and (providers[0].get("url") or "").rstrip("/") == url and providers[0].get("model_name") == upstream["model"]:
            _write_private(fingerprint_file, fingerprint + "\n")
            return

    target = next((r for r in routers if r["name"] == upstream["model"]), None)
    if target is None:
        created = _call("POST", f"{api}/routers", admin_token, {"name": upstream["model"], "type": "text-generation", "aliases": []})
        target = {"id": created["id"], "name": upstream["model"], "type": "text-generation", "aliases": [], "load_balancing_strategy": "shuffle", "cost_prompt_tokens": 0.0, "cost_completion_tokens": 0.0}
    _point_router_at(api, admin_token, target, upstream, url)
    if target["id"] != holder["id"]:
        _update_router(api, admin_token, holder, aliases=[a for a in holder["aliases"] if a != alias])
        _update_router(api, admin_token, target, aliases=[*target.get("aliases", []), alias])
    _write_private(fingerprint_file, fingerprint + "\n")


ADMIN_KEY_NAME = "nexora-workstudio-admin"


def ensure_admin_key(base_url: str, admin_token: str, out: Path) -> str:
    """WorkStudio's model administration key (Réglages › Modèles): the admin password never reaches WorkStudio."""
    existing = None
    if out.exists():
        for line in out.read_text().splitlines():
            if line.startswith("export NEXORA_API_ADMIN_KEY="):
                existing = line.split("=", 1)[1].strip() or None
    if existing:
        status, me = _request("GET", f"{base_url}/v1/me", token=existing)
        if status == 200 and "admin" in me.get("permissions", []):
            return existing
    admin = _call("GET", f"{base_url}/v1/me", admin_token)
    created = _call("POST", f"{base_url}/v1/admin/keys", admin_token, {"name": ADMIN_KEY_NAME, "user": admin["id"]})
    if not created.get("value"):
        raise BootstrapError("Nexora API returned no admin key value")
    _write_private(out, f"export NEXORA_API_ADMIN_KEY={created['value']}\n")
    return created["value"]


def _is_workstudio_key(base_url: str, key: str) -> bool:
    status, me = _request("GET", f"{base_url}/v1/me", token=key)
    return status == 200 and me.get("email") == WORKSTUDIO_EMAIL and "admin" not in me.get("permissions", [])


def ensure_workstudio_key(
    base_url: str, admin: str, password: str, out: Path, wait_seconds: int = 300, upstream: dict | None = None
) -> str:
    """WorkStudio's model key: owned by a dedicated user with model access only (least privilege)."""
    base_url = base_url.rstrip("/")
    _wait_until_healthy(base_url, wait_seconds)
    try:
        return _ensure_signed_in(base_url, admin, password, out, upstream)
    except SessionExpiredError:
        return _ensure_signed_in(base_url, admin, password, out, upstream)


def _ensure_signed_in(base_url: str, admin: str, password: str, out: Path, upstream: dict | None) -> str:
    status, session = _request("POST", f"{base_url}/v1/auth/login", body={"email": admin, "password": password})
    if status != 200 or not session.get("value"):
        raise BootstrapError(f"Nexora API admin sign-in failed (HTTP {status}); check NEXORA_API_ADMIN_PASSWORD")
    if upstream:
        _sync_default_model(base_url, session["value"], upstream, out.parent / "upstream.sha256")
    user_id = _sync_workstudio_user(base_url, session["value"])
    ensure_admin_key(base_url, session["value"], out.parent / "nexora-admin.env")

    existing = _read_existing_key(out)
    if existing and _is_workstudio_key(base_url, existing):
        return existing

    created = _call("POST", f"{base_url}/v1/admin/keys", session["value"], {"name": WORKSTUDIO_NAME, "user": user_id})
    if not created.get("value"):
        raise BootstrapError("Nexora API returned no key value")
    _write_private(out, f"export VLLM_API_KEY={created['value']}\n")
    return created["value"]


def main() -> int:
    try:
        ensure_workstudio_key(
            os.environ.get("NEXORA_API_URL", "http://nexora-api:8000"),
            os.environ.get("NEXORA_API_ADMIN", "admin"),
            os.environ["NEXORA_API_ADMIN_PASSWORD"],
            Path(os.environ.get("NEXORA_BOOTSTRAP_FILE", "/bootstrap/nexora-api.env")),
            upstream={
                "router": "nexora-default",
                "url": os.environ["NEXORA_UPSTREAM_URL"],
                "model": os.environ["NEXORA_UPSTREAM_MODEL"],
                "key": os.environ.get("NEXORA_UPSTREAM_KEY") or "none",
            } if os.environ.get("NEXORA_UPSTREAM_URL") else None,
        )
    except (BootstrapError, KeyError, OSError, ValueError) as error:
        print(f"bootstrap: {error}", file=sys.stderr)
        return 1
    print("bootstrap: WorkStudio key ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())
