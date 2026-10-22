"""Gives Nexora WorkStudio its Nexora API key, and keeps the model on the upstream of deploy/.env.

Runs once per `docker compose up`, after Nexora API is healthy. Signs in as the bootstrap admin,
then:
- points the Nexora model at NEXORA_UPSTREAM_URL/MODEL/KEY. Nexora API reads its model list only
  on its very first start, so without this a model changed in deploy/.env would never apply.
  The provider list hides keys: a fingerprint of the applied upstream, kept next to the key file,
  tells a new key apart;
- keeps a dedicated `workstudio` user (role without admin permission, unlimited on every model)
  in sync, and writes that user's key as `export VLLM_API_KEY=...` to the shared bootstrap volume,
  where the WorkStudio container reads it at startup. A key that still belongs to that user is
  kept, so restarts do not pile up keys.
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


def _sync_upstream_provider(base_url: str, admin_token: str, upstream: dict, fingerprint_file: Path) -> None:
    """Replaces the model's providers with the configured upstream when it changed."""
    api = f"{base_url}/v1/admin"
    router = _find(_call("GET", f"{api}/routers?limit=100", admin_token).get("data", []), name=upstream["router"])
    if not router:
        return  # Not seeded yet: Nexora API creates it from its configuration.
    url = upstream["url"].strip().rstrip("/").lower()
    fingerprint = hashlib.sha256(f"{url}|{upstream['model']}|{upstream['key']}".encode()).hexdigest()
    previous = fingerprint_file.read_text().strip() if fingerprint_file.exists() else None
    providers = _call("GET", f"{api}/providers?router_id={router['id']}&limit=100", admin_token).get("data", [])
    current = next(
        (p for p in providers if (p.get("url") or "").rstrip("/") == url and p.get("model_name") == upstream["model"]), None
    )

    if current and len(providers) == 1 and previous in (None, fingerprint):
        _write_private(fingerprint_file, fingerprint + "\n")
        return
    if current:  # Same address and model, new key: the API refuses a duplicate, so drop it first.
        _call("DELETE", f"{api}/providers/{current['id']}", admin_token)
    created = _call("POST", f"{api}/providers", admin_token, {
        "router_id": router["id"],
        "type": "openai",
        "url": url,
        "key": upstream["key"],
        "model_name": upstream["model"],
        "timeout": 120,
    })
    for provider in providers:
        if provider["id"] not in (created.get("id"), current and current["id"]):
            _call("DELETE", f"{api}/providers/{provider['id']}", admin_token)
    _write_private(fingerprint_file, fingerprint + "\n")


def _is_workstudio_key(base_url: str, key: str) -> bool:
    status, me = _request("GET", f"{base_url}/v1/me", token=key)
    return status == 200 and me.get("email") == WORKSTUDIO_EMAIL and "admin" not in me.get("permissions", [])


def ensure_workstudio_key(
    base_url: str, admin: str, password: str, out: Path, wait_seconds: int = 300, upstream: dict | None = None
) -> str:
    """WorkStudio's model key: owned by a dedicated user with model access only (least privilege)."""
    base_url = base_url.rstrip("/")
    _wait_until_healthy(base_url, wait_seconds)

    status, session = _request("POST", f"{base_url}/v1/auth/login", body={"email": admin, "password": password})
    if status != 200 or not session.get("value"):
        raise BootstrapError(f"Nexora API admin sign-in failed (HTTP {status}); check NEXORA_API_ADMIN_PASSWORD")
    if upstream:
        _sync_upstream_provider(base_url, session["value"], upstream, out.parent / "upstream.sha256")
    user_id = _sync_workstudio_user(base_url, session["value"])

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
                "router": os.environ.get("NEXORA_MODEL_NAME", "nexora-default"),
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
