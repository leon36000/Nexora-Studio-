#!/usr/bin/env python3
"""Defensive battery for the code interpreter (profile « code »): do the limits hold?

Each check submits a very small Python program to a throwaway sandbox of a running controller and
verifies that what the program tries is refused or bounded: outgoing network, host files, secrets,
processes, runaway loops, memory, disk, privileges, output size. It also checks the controller's own
front door (token, paths, capacity, lifetime). A check passes when the limit holds; none of the
programs is an exploit, each one asks "may I?" or "how far may I go?" and stays inside a bound it sets
itself (at most 3x the process limit, 2x the memory limit, 2x the temporary-file limit).

Usage: python3 -I scripts/verification/interpreteur-evasion.py --url http://127.0.0.1:18215 \
         --token-file <file> [--report rapport.json] [--only nom,nom] [--no-docker]
Exit code 0 when every limit holds, 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request


class Controller:
    def __init__(self, url: str, token: str):
        self.url = url.rstrip("/")
        self.token = token

    def call(self, path: str, body: dict | None = None, token: str | None = "default", timeout: float = 120.0):
        headers = {"Content-Type": "application/json"}
        bearer = self.token if token == "default" else token
        if bearer is not None:
            headers["Authorization"] = f"Bearer {bearer}"
        request = urllib.request.Request(
            f"{self.url}{path}", data=json.dumps(body or {}).encode(), method="POST", headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read()
                return response.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as error:
            raw = error.read()
            try:
                return error.code, json.loads(raw) if raw else None
            except ValueError:
                return error.code, None

    def health(self) -> dict:
        with urllib.request.urlopen(f"{self.url}/health", timeout=10) as response:
            return json.loads(response.read())

    def create(self, lifetime_ms: int = 120_000) -> str:
        status, body = self.call("/v1/sandboxes", {"lifetimeMs": lifetime_ms})
        assert status == 201, f"création refusée ({status}, {body})"
        return body["sandboxId"]

    def run(self, sandbox_id: str, code: str, timeout_ms: int = 30_000, **extra) -> tuple[int, dict | None]:
        return self.call(f"/v1/sandboxes/{sandbox_id}/run", {"code": code, "timeoutMs": timeout_ms, **extra},
                         timeout=timeout_ms / 1000 + 30)

    def kill(self, sandbox_id: str) -> None:
        self.call(f"/v1/sandboxes/{sandbox_id}/kill")


NETWORK = '''
import json, os, socket
out = {}
try:
    socket.create_connection(("1.1.1.1", 53), timeout=3)
    out["connect"] = "connected"
except OSError:
    out["connect"] = "refused"
try:
    socket.getaddrinfo("example.com", 80)
    out["dns"] = "resolved"
except OSError:
    out["dns"] = "refused"
out["interfaces"] = sorted(os.listdir("/sys/class/net"))
print(json.dumps(out))
'''

HOST_FILES = '''
import json, os
out = {"readable": [], "writable": [], "token_in_env": False, "socket_mounted": False}
for path in ("/etc/shadow", "/etc/gshadow", "/root", "/var/run/docker.sock", "/run/docker.sock", "/host"):
    try:
        if os.path.isdir(path):
            os.listdir(path)
        else:
            open(path, "rb").read(1)
        out["readable"].append(path)
    except OSError:
        pass
for path in ("/proc/sys/kernel/core_pattern", "/proc/sys/kernel/hostname", "/sys/kernel/uevent_helper", "/sys/fs/cgroup/cgroup.procs"):
    try:
        open(path, "a").close()
        out["writable"].append(path)
    except OSError:
        pass
root, init_root = os.stat("/"), os.stat("/proc/1/root/")
out["init_root_is_own_root"] = (root.st_dev, root.st_ino) == (init_root.st_dev, init_root.st_ino)
out["token_in_env"] = any("TOKEN" in name or "SECRET" in name or "PASSWORD" in name for name in os.environ)
out["socket_mounted"] = "docker.sock" in open("/proc/self/mountinfo").read()
print(json.dumps(out))
'''

PROCESSES = '''
import json, os, time
started = []
refused = 0
for _ in range(@LIMIT@ * 3):
    try:
        pid = os.fork()
    except OSError:
        refused += 1
        break
    if pid == 0:
        time.sleep(5)
        os._exit(0)
    started.append(pid)
for pid in started:
    os.kill(pid, 9)
for pid in started:
    os.waitpid(pid, 0)
print(json.dumps({"started": len(started), "refused": refused}))
'''

MEMORY = '''
import json
chunks = []
total = 0
while total < @LIMIT@ * 2:
    chunks.append(bytearray(b"\\x01") * (32 * 1024 * 1024))
    total += 32
print(json.dumps({"allocated_mb": total}))
'''

DISK = '''
import json, os
written = 0
errno_seen = None
try:
    with open("/tmp/remplissage.bin", "wb") as handle:
        while written < @LIMIT@ * 2:
            handle.write(b"\\0" * (4 * 1024 * 1024))
            handle.flush()
            os.fsync(handle.fileno())
            written += 4
except OSError as error:
    errno_seen = error.errno
print(json.dumps({"written_mb": written, "errno": errno_seen}))
'''

PRIVILEGES = '''
import json, os, subprocess
out = {"uid": os.getuid()}
try:
    os.setuid(0)
    out["setuid_root"] = "possible"
except OSError:
    out["setuid_root"] = "refused"
status = dict(line.split(":\\t", 1) for line in open("/proc/self/status").read().splitlines() if ":\\t" in line)
out["cap_eff"] = status["CapEff"].strip()
out["no_new_privs"] = status["NoNewPrivs"].strip()
with open("/tmp/essai.sh", "w") as handle:
    handle.write("#!/bin/sh\\necho bonjour\\n")
os.chmod("/tmp/essai.sh", 0o755)
try:
    subprocess.run(["/tmp/essai.sh"], capture_output=True)
    out["execute_in_tmp"] = "ran"
except OSError:
    out["execute_in_tmp"] = "refused"
try:
    open("/usr/local/essai-ecriture", "w")
    out["write_system"] = "possible"
except OSError:
    out["write_system"] = "refused"
setuid_files = []
for root in ("/usr/bin", "/bin", "/usr/sbin", "/sbin", "/usr/local/bin"):
    for name in os.listdir(root) if os.path.isdir(root) else []:
        try:
            if os.lstat(os.path.join(root, name)).st_mode & 0o6000:
                setuid_files.append(name)
        except OSError:
            pass
out["setuid_files"] = setuid_files
print(json.dumps(out))
'''

OUTPUT = '''
print("A" * 200000)
'''


def parse(response: dict | None) -> dict:
    return json.loads((response or {}).get("stdout", "").strip().splitlines()[-1])


def check_network(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        _, run = c.run(sandbox, NETWORK, 30_000)
        out = parse(run)
        return out["connect"] == "refused" and out["dns"] == "refused" and out["interfaces"] in (["lo"], []), json.dumps(out)
    finally:
        c.kill(sandbox)


def check_host_files(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        _, run = c.run(sandbox, HOST_FILES, 30_000)
        out = parse(run)
        return (not out["readable"] and not out["writable"] and out["init_root_is_own_root"]
                and not out["token_in_env"] and not out["socket_mounted"]), json.dumps(out)
    finally:
        c.kill(sandbox)


def check_processes(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        _, run = c.run(sandbox, PROCESSES.replace("@LIMIT@", str(limits["pids"])), 60_000)
        out = parse(run)
        return out["refused"] >= 1 and out["started"] < limits["pids"], f"{json.dumps(out)} (plafond {limits['pids']})"
    finally:
        c.kill(sandbox)


def check_infinite_loop(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    started = time.monotonic()
    status, run = c.run(sandbox, "while True:\n    pass\n", 3_000)
    elapsed = time.monotonic() - started
    after, _ = c.run(sandbox, "print(1)", 5_000)
    ok = status == 200 and bool(run and run.get("timedOut")) and elapsed < 3 + 10 and after == 404
    return ok, f"arrêtée après {elapsed:.1f} s, bac détruit ensuite : {after == 404}"


def check_memory(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        status, run = c.run(sandbox, MEMORY.replace("@LIMIT@", str(limits["memoryMb"])), 90_000)
        reached = (run or {}).get("stdout", "").strip()
        stopped = status == 200 and bool(run) and run.get("exitCode") != 0 and not reached
        return stopped, f"code de sortie {(run or {}).get('exitCode')}, arrêtée par la mémoire : {bool(run and run.get('oomKilled'))}"
    finally:
        c.kill(sandbox)


def check_disk(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        _, run = c.run(sandbox, DISK.replace("@LIMIT@", str(limits["tmpfsMb"])), 90_000)
        out = parse(run)
        return out["errno"] == 28 and out["written_mb"] <= limits["tmpfsMb"], f"{json.dumps(out)} (plafond {limits['tmpfsMb']} Mo)"
    finally:
        c.kill(sandbox)


def check_privileges(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        _, run = c.run(sandbox, PRIVILEGES, 30_000)
        out = parse(run)
        ok = (
            out["uid"] == 10001 and out["setuid_root"] == "refused" and set(out["cap_eff"]) == {"0"}
            and out["no_new_privs"] == "1" and out["execute_in_tmp"] == "refused"
            and out["write_system"] == "refused" and not out["setuid_files"]
        )
        return ok, json.dumps(out)
    finally:
        c.kill(sandbox)


def check_output_cap(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        _, run = c.run(sandbox, OUTPUT, 30_000, maxOutputBytes=2_000)
        size = len((run or {}).get("stdout", "")) + len((run or {}).get("stderr", ""))
        return size <= 2_000 and bool(run and run.get("outputTruncated")), f"{size} octets reçus pour 200 000 émis"
    finally:
        c.kill(sandbox)


def check_paths_and_envs(c: Controller, limits: dict) -> tuple[bool, str]:
    sandbox = c.create()
    try:
        refused = []
        for path in ("/etc/passwd", "/tmp/../etc/passwd", "/tmp", "relatif.txt", "/tmp/\x00x"):
            status, _ = c.call(f"/v1/sandboxes/{sandbox}/files/read", {"path": path, "maxBytes": 1000})
            refused.append(status == 400)
        status, _ = c.call(f"/v1/sandboxes/{sandbox}/files/write", {"path": "/tmp/../etc/essai", "contentBase64": "AA=="})
        refused.append(status == 400)
        status, _ = c.run(sandbox, "print(1)", 5_000, envs={"LD_PRELOAD": "/tmp/x.so"})
        refused.append(status == 400)
        return all(refused), f"{sum(refused)}/{len(refused)} demandes hors périmètre refusées"
    finally:
        c.kill(sandbox)


def check_front_door(c: Controller, limits: dict) -> tuple[bool, str]:
    anonymous, _ = c.call("/v1/sandboxes", {}, token=None)
    wrong, _ = c.call("/v1/sandboxes", {}, token="x" * 40)
    health = json.dumps(c.health())
    return anonymous == 401 and wrong == 401 and c.token not in health, f"sans jeton : {anonymous}, mauvais jeton : {wrong}, jeton absent de /health : {c.token not in health}"


def check_capacity_and_lifetime(c: Controller, limits: dict) -> tuple[bool, str]:
    created = []
    try:
        for _ in range(limits["maxSandboxes"]):
            created.append(c.create(lifetime_ms=1))
        status, _ = c.call("/v1/sandboxes", {})
        ceiling = limits["maxLifetimeSeconds"] * 1000
        c.kill(created.pop())
        status_long, body_long = c.call("/v1/sandboxes", {"lifetimeMs": 10**12})
        if status_long == 201:
            created.append(body_long["sandboxId"])
        ok = status == 429 and status_long == 201 and body_long["expiresInMs"] <= ceiling
        return ok, f"bac n° {limits['maxSandboxes'] + 1} : {status}, durée demandée démesurée ramenée à {body_long['expiresInMs'] // 1000} s (plafond {limits['maxLifetimeSeconds']} s)"
    finally:
        for sandbox in created:
            c.kill(sandbox)


def check_nothing_left(c: Controller, limits: dict, docker: bool) -> tuple[bool, str]:
    if not docker:
        return True, "contrôle Docker ignoré (--no-docker)"
    time.sleep(2)
    listed = subprocess.run(["docker", "ps", "-q", "--filter", "label=nexora.code-sandbox"], capture_output=True, text=True).stdout.split()
    return not listed, f"{len(listed)} conteneur(s) de bac restant(s)"


CHECKS = {
    "reseau": check_network,
    "fichiers-hote": check_host_files,
    "processus": check_processes,
    "boucle-infinie": check_infinite_loop,
    "memoire": check_memory,
    "disque": check_disk,
    "privileges": check_privileges,
    "sortie": check_output_cap,
    "chemins-et-variables": check_paths_and_envs,
    "porte-d-entree": check_front_door,
    "capacite-et-duree": check_capacity_and_lifetime,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--token-file", required=True)
    parser.add_argument("--report")
    parser.add_argument("--only", help="liste de contrôles séparés par des virgules")
    parser.add_argument("--no-docker", action="store_true")
    args = parser.parse_args()
    with open(args.token_file, encoding="utf-8") as handle:
        token = handle.read().strip()
    controller = Controller(args.url, token)
    limits = controller.health()["limits"]
    docker = not args.no_docker and shutil.which("docker") is not None
    wanted = set(args.only.split(",")) if args.only else set(CHECKS)
    results = []
    for name, check in CHECKS.items():
        if name not in wanted:
            continue
        started = time.monotonic()
        try:
            ok, detail = check(controller, limits)
        except Exception as error:  # noqa: BLE001 - a failing check is reported, not fatal
            ok, detail = False, f"{type(error).__name__}: {error}"
        results.append({"name": name, "ok": bool(ok), "detail": detail, "durationMs": int((time.monotonic() - started) * 1000)})
        print(f"[{'OK  ' if ok else 'FAIL'}] {name} — {detail}")
    ok, detail = check_nothing_left(controller, limits, docker)
    results.append({"name": "rien-ne-reste", "ok": ok, "detail": detail, "durationMs": 0})
    print(f"[{'OK  ' if ok else 'FAIL'}] rien-ne-reste — {detail}")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump({"limits": limits, "checks": results}, handle, ensure_ascii=False, indent=2)
    failed = [r["name"] for r in results if not r["ok"]]
    print(f"\n{len(results) - len(failed)}/{len(results)} limites tenues")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
