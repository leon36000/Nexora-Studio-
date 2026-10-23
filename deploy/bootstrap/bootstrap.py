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
  WorkStudio container only, for its model settings (the admin password stays out of WorkStudio);
- with the local transcription service (compose profile `voice`, NEXORA_WHISPER_URL set), downloads
  its model and registers it as a transcription model (`automatic-speech-recognition` router). A
  service that does not answer is reported and skipped: it never holds WorkStudio back.
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


def _request(
    method: str, url: str, token: str | None = None, body: dict | None = None, timeout: float = 15
) -> tuple[int, dict]:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read() or b"{}"
            try:
                return response.status, json.loads(raw)
            except ValueError:  # the transcription service answers its downloads in plain text
                return response.status, {}
    except urllib.error.HTTPError as error:
        return error.code, {}


def _wait_until_healthy(base_url: str, wait_seconds: int, service: str = "Nexora API") -> None:
    deadline = time.monotonic() + wait_seconds
    while True:
        try:
            if _request("GET", f"{base_url}/health")[0] == 200:
                return
        except OSError:
            pass
        if time.monotonic() >= deadline:
            raise BootstrapError(f"{service} is not reachable at {base_url}")
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


# A 7B chat model on a CPU-only server needs minutes for a long prompt (agents with tools): a
# shorter provider timeout turns the wait into « Model is too busy » (503).
CHAT_PROVIDER_TIMEOUT = 600
PROVIDER_UPDATE_FIELDS = ("router_id", "timeout", "model_hosting_zone", "model_total_params", "model_active_params")
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
        "timeout": CHAT_PROVIDER_TIMEOUT,
    })
    for provider in providers:
        if provider["id"] not in (created.get("id"), current and current["id"]):
            _call("DELETE", f"{api}/providers/{provider['id']}", token)


def _raise_chat_timeouts(api: str, token: str) -> None:
    """Gives every chat provider at least CHAT_PROVIDER_TIMEOUT (installs made with a shorter one)."""
    routers = _call("GET", f"{api}/routers?limit=100", token).get("data", [])
    for router in routers:
        if router.get("type") != "text-generation":
            continue
        for provider in _providers(api, token, router):
            if (provider.get("timeout") or 0) >= CHAT_PROVIDER_TIMEOUT:
                continue
            body = {field: provider.get(field) for field in PROVIDER_UPDATE_FIELDS}
            body.update({"router_id": router["id"], "timeout": CHAT_PROVIDER_TIMEOUT,
                         "model_hosting_zone": provider.get("model_hosting_zone") or "WOR",
                         "model_total_params": provider.get("model_total_params") or 0,
                         "model_active_params": provider.get("model_active_params") or 0})
            _call("PATCH", f"{api}/providers/{provider['id']}", token, body)


def _router_for_model(api: str, token: str, routers: list, upstream: dict, url: str) -> dict:
    """The router named after the deploy/.env model, created and pointed at its upstream if missing."""
    existing = next((r for r in routers if r["name"] == upstream["model"]), None)
    if existing:
        return existing
    created = _call("POST", f"{api}/routers", token, {"name": upstream["model"], "type": "text-generation", "aliases": []})
    router = {"id": created["id"], "name": upstream["model"], "type": "text-generation", "aliases": [], "load_balancing_strategy": "shuffle", "cost_prompt_tokens": 0.0, "cost_completion_tokens": 0.0}
    _point_router_at(api, token, router, upstream, url)
    return router


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
    if not routers:
        return  # Not seeded yet: Nexora API creates its models from its configuration.
    holder = next((r for r in routers if r["name"] == alias or alias in r.get("aliases", [])), None)
    url = upstream["url"].strip().rstrip("/").lower()
    fingerprint = hashlib.sha256(f"{url}|{upstream['model']}|{upstream['key']}".encode()).hexdigest()
    if not holder:
        # The default was lost (a move interrupted midway, its router removed): give it back to the
        # deploy/.env model, so nexora-default always answers.
        target = _router_for_model(api, admin_token, routers, upstream, url)
        _update_router(api, admin_token, target, aliases=[*target.get("aliases", []), alias])
        _write_private(fingerprint_file, fingerprint + "\n")
        return
    if holder["name"] == alias:
        providers = _providers(api, admin_token, holder)
        model = providers[0]["model_name"] if providers else alias
        _update_router(api, admin_token, holder, name=_free_name([r for r in routers if r is not holder], model), aliases=[*holder.get("aliases", []), alias])

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
        target = _router_for_model(api, admin_token, routers, upstream, url)
    else:
        _point_router_at(api, admin_token, target, upstream, url)
    if target["id"] != holder["id"]:
        kept = holder["aliases"]
        _update_router(api, admin_token, holder, aliases=[a for a in kept if a != alias])
        try:
            _update_router(api, admin_token, target, aliases=[*target.get("aliases", []), alias])
        except BootstrapError:
            _update_router(api, admin_token, holder, aliases=kept)  # never leave nexora-default unanswered
            raise
    _write_private(fingerprint_file, fingerprint + "\n")


TRANSCRIPTION_TYPE = "automatic-speech-recognition"
# The first start downloads the model (about 500 MB for `small`); a CPU transcription takes minutes.
WHISPER_DOWNLOAD_TIMEOUT = 1800
WHISPER_PROVIDER_TIMEOUT = 600


def transcription_router_name(model: str) -> str:
    """`Systran/faster-whisper-small` -> `whisper-small`: the name blocks and Réglages › Modèles show."""
    return model.rsplit("/", 1)[-1].removeprefix("faster-")


def _sync_transcription_model(base_url: str, admin_token: str, voice: dict) -> None:
    """Downloads the local transcription service's model, then registers it once in Nexora API."""
    url = voice["url"].strip().rstrip("/")
    model = voice["model"].strip()
    _wait_until_healthy(url, int(voice.get("wait_seconds", 600)), service="The transcription service")
    try:
        status, _ = _request("POST", f"{url}/v1/models/{model}", timeout=WHISPER_DOWNLOAD_TIMEOUT)
    except OSError as error:
        raise BootstrapError(f"transcription model download failed ({error})") from error
    if status not in (200, 201):
        raise BootstrapError(f"transcription model download failed (HTTP {status})")

    api = f"{base_url}/v1/admin"
    name = transcription_router_name(model)
    routers = _call("GET", f"{api}/routers?limit=100", admin_token).get("data", [])
    existing = next((r for r in routers if r["name"] == name), None)
    if existing:
        return  # registered by an earlier start, or chosen by an administrator: left as is
    created = _call("POST", f"{api}/routers", admin_token, {"name": name, "type": TRANSCRIPTION_TYPE, "aliases": []})
    status, _ = _request("POST", f"{api}/providers", token=admin_token, body={
        "router_id": created["id"],
        "type": "openai",
        "url": url,
        "key": "none",
        "model_name": model,
        "timeout": WHISPER_PROVIDER_TIMEOUT,
    }, timeout=120)
    if status not in (200, 201):
        _request("DELETE", f"{api}/routers/{created['id']}", token=admin_token)
        raise BootstrapError(f"Nexora API refused the transcription service (HTTP {status})")


ADMIN_KEY_NAME = "nexora-workstudio-admin"


def ensure_admin_key(base_url: str, admin_token: str, out: Path) -> str:
    """WorkStudio's model administration key (Réglages › Modèles): the admin password never reaches WorkStudio."""
    existing = None
    if out.exists():
        for line in out.read_text().splitlines():
            if line.startswith("export NEXORA_API_ADMIN_KEY="):
                existing = line.split("=", 1)[1].strip() or None
    if existing and _key_still_good(base_url, existing, lambda me: "admin" in me.get("permissions", [])):
        return existing
    admin = _call("GET", f"{base_url}/v1/me", admin_token)
    created = _call("POST", f"{base_url}/v1/admin/keys", admin_token, {"name": ADMIN_KEY_NAME, "user": admin["id"]})
    if not created.get("value"):
        raise BootstrapError("Nexora API returned no admin key value")
    _write_private(out, f"export NEXORA_API_ADMIN_KEY={created['value']}\n")
    return created["value"]


def _key_still_good(base_url: str, key: str, accepts) -> bool:
    """A stored key is replaced only when Nexora API says it is no longer valid (401/403) or it is
    not the right kind of key; a transient error keeps it, so restarts never pile up keys."""
    status, me = _request("GET", f"{base_url}/v1/me", token=key)
    if status in (401, 403):
        return False
    return accepts(me) if status == 200 else True


def _is_workstudio_key(base_url: str, key: str) -> bool:
    return _key_still_good(
        base_url, key, lambda me: me.get("email") == WORKSTUDIO_EMAIL and "admin" not in me.get("permissions", [])
    )


def ensure_workstudio_key(
    base_url: str,
    admin: str,
    password: str,
    out: Path,
    wait_seconds: int = 300,
    upstream: dict | None = None,
    voice: dict | None = None,
) -> str:
    """WorkStudio's model key: owned by a dedicated user with model access only (least privilege)."""
    base_url = base_url.rstrip("/")
    _wait_until_healthy(base_url, wait_seconds)
    try:
        return _ensure_signed_in(base_url, admin, password, out, upstream, voice)
    except SessionExpiredError:
        return _ensure_signed_in(base_url, admin, password, out, upstream, voice)


def _ensure_signed_in(base_url: str, admin: str, password: str, out: Path, upstream: dict | None, voice: dict | None) -> str:
    status, session = _request("POST", f"{base_url}/v1/auth/login", body={"email": admin, "password": password})
    if status != 200 or not session.get("value"):
        raise BootstrapError(f"Nexora API admin sign-in failed (HTTP {status}); check NEXORA_API_ADMIN_PASSWORD")
    if upstream:
        _sync_default_model(base_url, session["value"], upstream, out.parent / "upstream.sha256")
    try:
        _raise_chat_timeouts(f"{base_url}/v1/admin", session["value"])
    except SessionExpiredError:
        raise
    except BootstrapError as error:  # a longer timeout is a comfort, never a reason to keep WorkStudio down
        print(f"bootstrap: chat timeouts left as they are: {error}", file=sys.stderr)
    if voice:
        try:
            _sync_transcription_model(base_url, session["value"], voice)
        except SessionExpiredError:
            raise
        except BootstrapError as error:
            print(f"bootstrap: local transcription skipped: {error}", file=sys.stderr)
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
            voice={
                "url": os.environ["NEXORA_WHISPER_URL"],
                "model": os.environ.get("NEXORA_WHISPER_MODEL") or "Systran/faster-whisper-small",
                "wait_seconds": int(os.environ.get("NEXORA_WHISPER_WAIT_SECONDS") or 600),
            } if os.environ.get("NEXORA_WHISPER_URL", "").strip() else None,
        )
    except (BootstrapError, KeyError, OSError, ValueError) as error:
        print(f"bootstrap: {error}", file=sys.stderr)
        return 1
    print("bootstrap: WorkStudio key ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())
