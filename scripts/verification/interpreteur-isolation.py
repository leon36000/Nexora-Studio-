#!/usr/bin/env python3
"""Checks the isolation settings Docker actually applies to a code sandbox (profile « code »).

It asks a running controller for one sandbox, reads that container's configuration with
`docker inspect`, compares every isolation setting with what docs/guide/interpreteur.md promises,
then removes the sandbox. It runs no code inside the sandbox: it checks the configuration.

Usage: python3 -I scripts/verification/interpreteur-isolation.py --url http://127.0.0.1:18215 \
         --token-file <file> [--report rapport.json]
Exit code 0 when every setting is as promised, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import urllib.request

GIB = 1024 * 1024 * 1024


def controller(url: str, token: str, path: str, body: dict | None = None) -> dict | None:
    request = urllib.request.Request(
        f"{url.rstrip('/')}{path}", data=json.dumps(body or {}).encode(), method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


def inspect(sandbox_id: str) -> dict:
    listed = subprocess.run(
        ["docker", "ps", "-q", "--filter", f"label=nexora.code-sandbox.id={sandbox_id}"],
        capture_output=True, text=True, check=True).stdout.split()
    if len(listed) != 1:
        raise SystemExit(f"le conteneur du bac {sandbox_id} est introuvable ({listed})")
    out = subprocess.run(["docker", "inspect", listed[0]], capture_output=True, text=True, check=True).stdout
    return json.loads(out)[0]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--token-file", required=True)
    parser.add_argument("--report")
    args = parser.parse_args()
    token = open(args.token_file, encoding="utf-8").read().strip()
    health = json.loads(urllib.request.urlopen(f"{args.url.rstrip('/')}/health", timeout=10).read())
    limits = health["limits"]
    created = controller(args.url, token, "/v1/sandboxes", {"lifetimeMs": 60_000})
    sandbox_id = created["sandboxId"]
    try:
        info = inspect(sandbox_id)
    finally:
        controller(args.url, token, f"/v1/sandboxes/{sandbox_id}/kill")
    host, config = info["HostConfig"], info["Config"]
    caps = host.get("CapAdd") or []
    security = host.get("SecurityOpt") or []
    memory = limits["memoryMb"] * 1024 * 1024
    checks = [
        ("aucun réseau", host["NetworkMode"] == "none" and config.get("NetworkDisabled") is True),
        ("système de fichiers en lecture seule", host["ReadonlyRootfs"] is True),
        ("toutes les capacités retirées", host.get("CapDrop") == ["ALL"] and not caps),
        ("no-new-privileges", "no-new-privileges" in security or "no-new-privileges:true" in security),
        ("filtre d'appels système et AppArmor non désactivés", not any("unconfined" in option for option in security)),
        ("pas de mode privilégié", host.get("Privileged") is False),
        ("aucun montage de l'hôte", not info.get("Mounts") and not host.get("Binds")),
        ("aucun périphérique de l'hôte", not host.get("Devices")),
        ("espaces de noms PID, IPC et UTS propres", host.get("PidMode") in ("", None) and host.get("IpcMode") in ("private", "") and host.get("UTSMode") in ("", None)),
        ("utilisateur sans droits", config["User"] == "10001:10001"),
        ("processus bornés", host["PidsLimit"] == limits["pids"]),
        ("processeur borné", host["NanoCpus"] == int(limits["cpus"] * 1_000_000_000)),
        ("mémoire bornée, sans swap", host["Memory"] == memory and host["MemorySwap"] == memory),
        ("fichiers temporaires plafonnés, sans exécution", "noexec" in host["Tmpfs"]["/tmp"] and f"size={limits['tmpfsMb']}m" in host["Tmpfs"]["/tmp"]),
        ("durée de vie bornée", config["Cmd"][0] == "sleep" and int(config["Cmd"][1]) <= limits["maxLifetimeSeconds"]),
        ("aucun secret dans l'environnement", not any(name.split("=")[0] in ("NEXORA_CODE_SANDBOX_TOKEN", "DATABASE_URL", "REDIS_URL") for name in config["Env"])),
        ("socket Docker absent", not any("docker.sock" in str(value) for value in (info.get("Mounts"), host.get("Binds")))),
    ]
    report = {"sandbox": sandbox_id, "limits": limits, "checks": [{"name": name, "ok": bool(ok)} for name, ok in checks]}
    for name, ok in checks:
        print(f"[{'OK  ' if ok else 'FAIL'}] {name}")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump(report, handle, ensure_ascii=False, indent=2)
    failed = [name for name, ok in checks if not ok]
    print(f"\n{len(checks) - len(failed)}/{len(checks)} réglages conformes")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
