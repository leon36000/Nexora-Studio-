"""Gives Nexora WorkStudio its Nexora API key.

Runs once per `docker compose up`, after Nexora API is healthy: signs in as the bootstrap
admin, creates a key named `workstudio`, and writes `export VLLM_API_KEY=...` to the shared
bootstrap volume, where the WorkStudio container reads it at startup. A key that still works
is kept, so restarts do not pile up keys. Standard library only.
"""
from __future__ import annotations

import json
import os
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


def ensure_workstudio_key(base_url: str, admin: str, password: str, out: Path, wait_seconds: int = 300) -> str:
    base_url = base_url.rstrip("/")
    _wait_until_healthy(base_url, wait_seconds)

    existing = _read_existing_key(out)
    if existing and _request("GET", f"{base_url}/v1/me/info", token=existing)[0] == 200:
        return existing

    status, session = _request("POST", f"{base_url}/v1/auth/login", body={"email": admin, "password": password})
    if status != 200 or not session.get("value"):
        raise BootstrapError(f"Nexora API admin sign-in failed (HTTP {status}); check NEXORA_API_ADMIN_PASSWORD")

    status, created = _request("POST", f"{base_url}/v1/me/keys", token=session["value"], body={"name": "workstudio"})
    if status not in (200, 201) or not created.get("value"):
        raise BootstrapError(f"Nexora API key creation failed (HTTP {status})")

    _write_private(out, f"export VLLM_API_KEY={created['value']}\n")
    return created["value"]


def main() -> int:
    try:
        ensure_workstudio_key(
            os.environ.get("NEXORA_API_URL", "http://nexora-api:8000"),
            os.environ.get("NEXORA_API_ADMIN", "admin"),
            os.environ["NEXORA_API_ADMIN_PASSWORD"],
            Path(os.environ.get("NEXORA_BOOTSTRAP_FILE", "/bootstrap/nexora-api.env")),
        )
    except (BootstrapError, KeyError) as error:
        print(f"bootstrap: {error}", file=sys.stderr)
        return 1
    print("bootstrap: WorkStudio key ready")
    return 0


if __name__ == "__main__":
    sys.exit(main())
