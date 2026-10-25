"""Nexora code sandbox controller (profile « code »).

Runs AI-written Python for WorkStudio in throwaway containers. This process is the only one that
holds the Docker socket; WorkStudio reaches it over the internal network with a bearer token, and
the code it runs never sees the socket, the token, the network or the host:

- each sandbox is a container of this same image, created with `--network none`, a read-only root,
  `/tmp` as a size-capped `noexec` tmpfs, user 10001, every capability dropped, `no-new-privileges`,
  Docker's default seccomp and AppArmor profiles, a process limit, one CPU and a memory limit equal
  to its memory+swap limit (tmpfs pages count against it), and a bounded lifetime (`sleep N` as its
  command, then removal);
- the environment of a sandbox is built here from a fixed list, never inherited;
- files are written and read through `docker exec` with stdin/stdout, inside `/tmp` only;
- the number of live sandboxes, the run time and the output size are bounded.

Standard library only (Python 3.12). Tests: python3 -I deploy/code/test_sandbox.py; escape suite:
scripts/verification/interpreteur-evasion.sh.
"""

import base64
import hmac
import http.client
import json
import math
import os
import posixpath
import re
import secrets
import signal
import socket
import struct
import sys
import threading
import time
import urllib.parse
from dataclasses import dataclass, field, replace
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LABEL = "nexora.code-sandbox"
RUNNER = "/opt/nexora-code/runner.py"
SANDBOX_USER = "10001:10001"
BASE_ENV = {
    "HOME": "/tmp",
    "LANG": "C.UTF-8",
    "MPLBACKEND": "Agg",
    "MPLCONFIGDIR": "/tmp/.matplotlib",
    "PATH": "/usr/local/bin:/usr/bin:/bin",
    "PYTHONDONTWRITEBYTECODE": "1",
}
SANDBOX_ID = re.compile(r"^[0-9a-f]{24}$")
ENV_NAME = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
MAX_ENV_BYTES = 64 * 1024
MAX_ENV_COUNT = 64
MAX_ERROR_BYTES = 256 * 1024
MAX_LIST_BYTES = 4 * 1024 * 1024
DEFAULT_OUTPUT_BYTES = 4 * 1024 * 1024

# Small programs run inside the sandbox (as its own user) to touch its files: arguments travel as
# argv and bytes as stdin/stdout, never through a shell.
WRITE_FILE = "import os,sys\np=sys.argv[1]\nos.makedirs(os.path.dirname(p),exist_ok=True)\nwith open(p,'wb') as f:\n    f.write(sys.stdin.buffer.read())"
READ_FILE = (
    "import os,sys\np=sys.argv[1];m=int(sys.argv[2])\n"
    "if not os.path.isfile(p): sys.exit(2)\n"
    "if os.path.getsize(p)>m: sys.exit(3)\n"
    "d=open(p,'rb').read(m+1)\n"
    "if len(d)>m: sys.exit(3)\n"
    "sys.stdout.buffer.write(d)"
)
STAT_FILE = "import os,sys\np=sys.argv[1]\nif not os.path.isfile(p): sys.exit(2)\nprint(os.path.getsize(p))"
REMOVE_FILE = "import os,sys\ntry:\n    os.remove(sys.argv[1])\nexcept FileNotFoundError:\n    pass"
LIST_FILES = (
    "import json,os,sys\nroot=sys.argv[1];depth=int(sys.argv[2])\n"
    "if not os.path.isdir(root): sys.exit(2)\nout=[]\n"
    "def walk(d,level):\n"
    "    for e in sorted(os.scandir(d),key=lambda e:e.name):\n"
    "        rel=os.path.relpath(e.path,root)\n"
    "        if e.is_dir():\n"
    "            out.append({'path':e.path,'relativePath':rel,'kind':'directory','size':0})\n"
    "            if level<depth: walk(e.path,level+1)\n"
    "        elif e.is_file():\n"
    "            out.append({'path':e.path,'relativePath':rel,'kind':'file','size':e.stat().st_size})\n"
    "walk(root,1)\nprint(json.dumps(out))"
)


class NotFound(Exception):
    pass


class Busy(Exception):
    pass


class TooLarge(Exception):
    pass


class DockerUnavailable(Exception):
    pass


@dataclass(frozen=True)
class Settings:
    token: str
    image: str = "nexora/code:local"
    instance: str = "nexora"
    cpus: float = 1.0
    memory_mb: int = 1024
    tmpfs_mb: int = 256
    pids: int = 64
    max_run_seconds: int = 120
    max_lifetime_seconds: int = 600
    max_sandboxes: int = 2
    runtime: str = ""
    max_body_bytes: int = 64 * 1024 * 1024
    max_read_bytes: int = 32 * 1024 * 1024
    max_output_bytes: int = 16 * 1024 * 1024
    socket_path: str = "/var/run/docker.sock"

    @classmethod
    def from_env(cls, env=os.environ) -> "Settings":
        token = env.get("NEXORA_CODE_SANDBOX_TOKEN", "")
        if len(token) < 32:
            raise ValueError("NEXORA_CODE_SANDBOX_TOKEN must be set (32 characters or more)")

        def number(name, default, cast=int):
            raw = env.get(name, "").strip()
            if not raw:
                return default
            value = cast(raw)
            if value <= 0:
                raise ValueError(f"{name} must be positive")
            return value

        instance = env.get("NEXORA_CODE_INSTANCE", "nexora")
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,30}", instance):
            raise ValueError("NEXORA_CODE_INSTANCE must be lowercase letters, digits and dashes")
        return cls(
            token=token,
            image=env.get("NEXORA_CODE_IMAGE", "nexora/code:local"),
            instance=instance,
            cpus=number("NEXORA_CODE_CPUS", 1.0, float),
            memory_mb=number("NEXORA_CODE_MEMORY_MB", 1024),
            tmpfs_mb=number("NEXORA_CODE_TMPFS_MB", 256),
            pids=number("NEXORA_CODE_PIDS", 64),
            max_run_seconds=number("NEXORA_CODE_MAX_SECONDS", 120),
            max_lifetime_seconds=number("NEXORA_CODE_MAX_LIFETIME_SECONDS", 600),
            max_sandboxes=number("NEXORA_CODE_MAX_SANDBOXES", 2),
            runtime=env.get("NEXORA_CODE_RUNTIME", "").strip(),
            socket_path=env.get("NEXORA_CODE_DOCKER_SOCKET", "/var/run/docker.sock"),
        )

    def limits(self) -> dict:
        return {
            "cpus": self.cpus,
            "memoryMb": self.memory_mb,
            "tmpfsMb": self.tmpfs_mb,
            "pids": self.pids,
            "maxRunSeconds": self.max_run_seconds,
            "maxLifetimeSeconds": self.max_lifetime_seconds,
            "maxSandboxes": self.max_sandboxes,
            "network": False,
            "runtime": self.runtime or "runc",
        }


def container_spec(settings: Settings, sandbox_id: str, lifetime_s: int) -> dict:
    """The `POST /containers/create` body of one sandbox: everything that isolates it is here."""
    memory = settings.memory_mb * 1024 * 1024
    host = {
        "NetworkMode": "none",
        "ReadonlyRootfs": True,
        "CapDrop": ["ALL"],
        "SecurityOpt": ["no-new-privileges"],
        "PidsLimit": settings.pids,
        "NanoCpus": int(settings.cpus * 1_000_000_000),
        "Memory": memory,
        "MemorySwap": memory,
        "Tmpfs": {"/tmp": f"rw,noexec,nosuid,nodev,size={settings.tmpfs_mb}m,mode=1777"},
        "IpcMode": "private",
        "ShmSize": 16 * 1024 * 1024,
        "Ulimits": [{"Name": "nofile", "Soft": 256, "Hard": 256}],
        "Init": True,
        "AutoRemove": True,
        "LogConfig": {"Type": "none", "Config": {}},
    }
    if settings.runtime:
        host["Runtime"] = settings.runtime
    return {
        "Image": settings.image,
        "Cmd": ["sleep", str(lifetime_s)],
        "Entrypoint": [],
        "User": SANDBOX_USER,
        "WorkingDir": "/tmp",
        "Env": [f"{name}={value}" for name, value in BASE_ENV.items()],
        "NetworkDisabled": True,
        "Hostname": "bac-a-sable",
        "Labels": {LABEL: settings.instance, f"{LABEL}.id": sandbox_id},
        "HostConfig": host,
    }


def check_sandbox_path(path: str) -> str:
    """A normalized absolute path strictly inside /tmp, or ValueError."""
    if not isinstance(path, str) or not path or "\x00" in path or not path.startswith("/"):
        raise ValueError("path must be an absolute path under /tmp")
    normalized = posixpath.normpath(path)
    if not normalized.startswith("/tmp/") or normalized == "/tmp":
        raise ValueError("path must be under /tmp")
    return normalized


def check_envs(envs) -> dict:
    if envs is None:
        return {}
    if not isinstance(envs, dict) or len(envs) > MAX_ENV_COUNT:
        raise ValueError("envs must be an object of at most 64 variables")
    total = 0
    for name, value in envs.items():
        if not ENV_NAME.match(name) or name.startswith("LD_"):
            raise ValueError(f"invalid environment variable name: {name[:40]}")
        if not isinstance(value, str) or "\x00" in value:
            raise ValueError(f"invalid environment variable value: {name}")
        total += len(name) + len(value)
    if total > MAX_ENV_BYTES:
        raise ValueError("envs are too large")
    return dict(envs)


@dataclass
class ExecResult:
    exit_code: int
    stdout: bytes
    stderr: bytes
    timed_out: bool = False
    truncated: bool = False


class Demux:
    """Splits Docker's multiplexed exec stream (8-byte frame headers), keeping at most max_output bytes."""

    def __init__(self, max_output: int):
        self.max_output = max_output
        self.stdout = b""
        self.stderr = b""
        self.truncated = False
        self._pending = b""

    def feed(self, data: bytes) -> None:
        self._pending += data
        while len(self._pending) >= 8:
            stream = self._pending[0]
            size = struct.unpack(">I", self._pending[4:8])[0]
            if len(self._pending) < 8 + size:
                return
            payload = self._pending[8 : 8 + size]
            self._pending = self._pending[8 + size :]
            room = self.max_output - len(self.stdout) - len(self.stderr)
            if len(payload) > room:
                payload = payload[: max(room, 0)]
                self.truncated = True
            if stream == 2:
                self.stderr += payload
            else:
                self.stdout += payload


class DockerClient:
    """The few Docker Engine API calls the controller needs, over the Unix socket."""

    def __init__(self, socket_path: str):
        self.socket_path = socket_path

    def _connect(self, timeout: float) -> socket.socket:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        try:
            sock.connect(self.socket_path)
        except OSError as error:
            sock.close()
            raise DockerUnavailable(str(error)) from error
        return sock

    def request(self, method: str, path: str, body=None, timeout: float = 30.0):
        connection = http.client.HTTPConnection("docker", timeout=timeout)
        connection.sock = self._connect(timeout)
        data = json.dumps(body).encode() if body is not None else None
        headers = {"Content-Type": "application/json"} if data is not None else {}
        try:
            connection.request(method, path, body=data, headers=headers)
            response = connection.getresponse()
            raw = response.read()
        finally:
            connection.close()
        payload = json.loads(raw) if raw[:1] in (b"{", b"[") else raw
        return response.status, payload

    def create(self, name: str, spec: dict) -> str:
        status, body = self.request("POST", f"/containers/create?name={name}", spec)
        if status != 201:
            raise DockerUnavailable(f"create failed ({status}): {body}")
        return body["Id"]

    def start(self, container_id: str) -> None:
        status, body = self.request("POST", f"/containers/{container_id}/start")
        if status not in (204, 304):
            raise DockerUnavailable(f"start failed ({status}): {body}")

    def kill(self, container_id: str) -> None:
        self.request("POST", f"/containers/{container_id}/kill")

    def remove(self, container_id: str) -> None:
        self.request("DELETE", f"/containers/{container_id}?force=true")

    def list(self, label: str) -> list:
        filters = urllib.parse.quote(json.dumps({"label": [label]}))
        status, body = self.request("GET", f"/containers/json?all=1&filters={filters}")
        return body if status == 200 and isinstance(body, list) else []

    def exec(self, container_id, cmd, env, stdin, timeout_s, max_output) -> ExecResult:
        status, created = self.request(
            "POST",
            f"/containers/{container_id}/exec",
            {
                "Cmd": cmd,
                "Env": env,
                "AttachStdin": stdin is not None,
                "AttachStdout": True,
                "AttachStderr": True,
                "Tty": False,
                "WorkingDir": "/tmp",
            },
        )
        if status == 404 or status == 409:
            raise NotFound("sandbox is gone")
        if status != 201:
            raise DockerUnavailable(f"exec failed ({status}): {created}")
        exec_id = created["Id"]
        deadline = time.monotonic() + timeout_s
        sock = self._connect(max(1.0, timeout_s))
        demux = Demux(max_output)
        timed_out = False
        try:
            body = json.dumps({"Detach": False, "Tty": False}).encode()
            sock.sendall(
                (
                    f"POST /exec/{exec_id}/start HTTP/1.1\r\nHost: docker\r\n"
                    "Content-Type: application/json\r\nConnection: Upgrade\r\nUpgrade: tcp\r\n"
                    f"Content-Length: {len(body)}\r\n\r\n"
                ).encode()
                + body
            )
            head = b""
            while b"\r\n\r\n" not in head:
                chunk = sock.recv(4096)
                if not chunk:
                    raise DockerUnavailable("exec start closed")
                head += chunk
            status_line, _, rest = head.partition(b"\r\n\r\n")
            if b" 101 " not in status_line.split(b"\r\n")[0] and b" 200 " not in status_line.split(b"\r\n")[0]:
                raise DockerUnavailable(f"exec start refused: {status_line[:80]!r}")
            if stdin is not None:
                sock.sendall(stdin)
                sock.shutdown(socket.SHUT_WR)
            demux.feed(rest)
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    timed_out = True
                    break
                sock.settimeout(remaining)
                try:
                    chunk = sock.recv(65536)
                except socket.timeout:
                    timed_out = True
                    break
                if not chunk:
                    break
                demux.feed(chunk)
        finally:
            sock.close()
        exit_code = -1
        if not timed_out:
            _, info = self.request("GET", f"/exec/{exec_id}/json")
            if isinstance(info, dict) and info.get("ExitCode") is not None:
                exit_code = info["ExitCode"]
        return ExecResult(exit_code, demux.stdout, demux.stderr, timed_out, demux.truncated)


@dataclass
class Sandbox:
    sandbox_id: str
    container_id: str | None
    expires_at: float
    lock: threading.Lock = field(default_factory=threading.Lock)


class SandboxService:
    def __init__(self, settings: Settings, docker, clock=time.monotonic):
        self.settings = settings
        self.docker = docker
        self.clock = clock
        self.sandboxes: dict[str, Sandbox] = {}
        self.lock = threading.Lock()

    def _get(self, sandbox_id: str) -> Sandbox:
        with self.lock:
            entry = self.sandboxes.get(sandbox_id)
        if entry is None or entry.container_id is None or entry.expires_at <= self.clock():
            raise NotFound("unknown or expired sandbox")
        return entry

    def _drop(self, entry: Sandbox) -> None:
        with self.lock:
            self.sandboxes.pop(entry.sandbox_id, None)
        if entry.container_id:
            try:
                self.docker.kill(entry.container_id)
            except DockerUnavailable:
                pass
            try:
                self.docker.remove(entry.container_id)
            except DockerUnavailable:
                pass

    def create(self, lifetime_ms) -> dict:
        maximum = self.settings.max_lifetime_seconds
        lifetime_s = maximum if lifetime_ms is None else min(maximum, max(10, math.ceil(float(lifetime_ms) / 1000)))
        sandbox_id = secrets.token_hex(12)
        with self.lock:
            now = self.clock()
            live = [entry for entry in self.sandboxes.values() if entry.expires_at > now]
            if len(live) >= self.settings.max_sandboxes:
                raise Busy("too many sandboxes")
            entry = Sandbox(sandbox_id, None, now + lifetime_s)
            self.sandboxes[sandbox_id] = entry
        try:
            name = f"nexora-code-{self.settings.instance}-{sandbox_id}"
            container_id = self.docker.create(name, container_spec(self.settings, sandbox_id, lifetime_s))
            entry.container_id = container_id
            self.docker.start(container_id)
        except Exception:
            self._drop(entry)
            raise
        log("created", sandbox=sandbox_id, lifetime=lifetime_s)
        return {"sandboxId": sandbox_id, "expiresInMs": lifetime_s * 1000}

    def _exec(self, entry, program, args, stdin=None, timeout_s=30.0, max_output=DEFAULT_OUTPUT_BYTES, env=None):
        cmd = ["python3", "-I", "-c", program, *args] if program else args
        return self.docker.exec(entry.container_id, cmd, env or self._env({}), stdin, timeout_s, max_output)

    @staticmethod
    def _env(extra: dict) -> list:
        return [f"{name}={value}" for name, value in {**BASE_ENV, **extra}.items()]

    def write_file(self, sandbox_id: str, path: str, content: bytes) -> None:
        path = check_sandbox_path(path)
        entry = self._get(sandbox_id)
        result = self._exec(entry, WRITE_FILE, [path], stdin=content, timeout_s=60.0)
        if result.exit_code != 0:
            raise ValueError(f"cannot write {path}: {result.stderr[-300:].decode(errors='replace')}")

    def read_file(self, sandbox_id: str, path: str, max_bytes) -> bytes:
        path = check_sandbox_path(path)
        limit = min(int(max_bytes or self.settings.max_read_bytes), self.settings.max_read_bytes)
        entry = self._get(sandbox_id)
        result = self._exec(entry, READ_FILE, [path, str(limit)], timeout_s=60.0, max_output=limit + 1024)
        if result.exit_code == 2:
            raise NotFound(f"no file at {path}")
        if result.exit_code == 3:
            raise TooLarge(f"{path} is larger than {limit} bytes")
        if result.exit_code != 0 or result.truncated:
            raise ValueError(f"cannot read {path}")
        return result.stdout

    def stat(self, sandbox_id: str, path: str) -> int:
        path = check_sandbox_path(path)
        result = self._exec(self._get(sandbox_id), STAT_FILE, [path])
        if result.exit_code != 0:
            raise NotFound(f"no file at {path}")
        return int(result.stdout.strip() or b"0")

    def list_files(self, sandbox_id: str, path: str, depth) -> list:
        path = check_sandbox_path(path)
        depth = max(1, min(int(depth or 1), 32))
        result = self._exec(self._get(sandbox_id), LIST_FILES, [path, str(depth)], max_output=MAX_LIST_BYTES)
        if result.exit_code == 2:
            raise NotFound(f"no directory at {path}")
        if result.exit_code != 0 or result.truncated:
            raise ValueError(f"cannot list {path}")
        return json.loads(result.stdout or b"[]")

    def remove_file(self, sandbox_id: str, path: str) -> None:
        path = check_sandbox_path(path)
        self._exec(self._get(sandbox_id), REMOVE_FILE, [path])

    def run(self, sandbox_id: str, code: str, envs, timeout_ms, max_output_bytes) -> dict:
        if not isinstance(code, str):
            raise ValueError("code must be a string")
        envs = check_envs(envs)
        entry = self._get(sandbox_id)
        remaining = entry.expires_at - self.clock()
        timeout_s = max(1.0, min(float(timeout_ms or 30_000) / 1000, self.settings.max_run_seconds, remaining))
        max_output = min(int(max_output_bytes or DEFAULT_OUTPUT_BYTES), self.settings.max_output_bytes)
        suffix = secrets.token_hex(8)
        code_path = f"/tmp/.nexora-code-{suffix}.py"
        error_path = f"/tmp/.nexora-error-{suffix}.json"
        with entry.lock:
            written = self._exec(entry, WRITE_FILE, [code_path], stdin=code.encode("utf-8"), timeout_s=30.0)
            if written.exit_code != 0:
                raise ValueError("cannot write the code into the sandbox")
            started = time.monotonic()
            result = self._exec(
                entry, None, ["python3", "-I", RUNNER, code_path, error_path], timeout_s=timeout_s, max_output=max_output, env=self._env(envs)
            )
            elapsed_ms = int((time.monotonic() - started) * 1000)
            response = {
                "stdout": result.stdout.decode("utf-8", errors="replace"),
                "stderr": result.stderr.decode("utf-8", errors="replace"),
                "exitCode": result.exit_code,
                "timedOut": result.timed_out,
                "outputTruncated": result.truncated,
                "oomKilled": False,
                "durationMs": elapsed_ms,
            }
            if result.timed_out:
                log("timed_out", sandbox=sandbox_id, seconds=timeout_s)
                self._drop(entry)
                return response
            if result.exit_code != 0:
                error = None
                report = self._exec(entry, READ_FILE, [error_path, str(MAX_ERROR_BYTES)], max_output=MAX_ERROR_BYTES + 1024)
                if report.exit_code == 0:
                    try:
                        parsed = json.loads(report.stdout)
                        error = {key: str(parsed.get(key, ""))[:MAX_ERROR_BYTES] for key in ("name", "value", "traceback")}
                    except (ValueError, AttributeError):
                        error = None
                if error is None and result.exit_code in (137, -9):
                    response["oomKilled"] = True
                    error = {"name": "MemoryError", "value": f"memory limit reached ({self.settings.memory_mb} MB)", "traceback": ""}
                if error is None:
                    error = {"name": "SystemExit", "value": str(result.exit_code), "traceback": ""}
                response["error"] = error
            log("ran", sandbox=sandbox_id, exit=result.exit_code, ms=elapsed_ms)
            return response

    def kill(self, sandbox_id: str) -> None:
        with self.lock:
            entry = self.sandboxes.get(sandbox_id)
        if entry is None:
            raise NotFound("unknown sandbox")
        self._drop(entry)
        log("killed", sandbox=sandbox_id)

    def kill_all(self) -> None:
        with self.lock:
            entries = list(self.sandboxes.values())
        for entry in entries:
            self._drop(entry)

    def reap(self) -> None:
        """Kills expired sandboxes, then removes containers of this instance it does not know."""
        now = self.clock()
        with self.lock:
            expired = [entry for entry in self.sandboxes.values() if entry.expires_at <= now and entry.container_id]
            known = {entry.container_id for entry in self.sandboxes.values() if entry.container_id}
            reserved = set(self.sandboxes)
        for entry in expired:
            self._drop(entry)
            log("expired", sandbox=entry.sandbox_id)
        try:
            containers = self.docker.list(f"{LABEL}={self.settings.instance}")
        except DockerUnavailable:
            return
        for container in containers:
            labels = container.get("Labels") or {}
            if container.get("Id") in known or labels.get(f"{LABEL}.id") in reserved:
                continue
            try:
                self.docker.remove(container["Id"])
                log("orphan_removed", container=str(container["Id"])[:12])
            except DockerUnavailable:
                pass


def log(event: str, **fields) -> None:
    print(json.dumps({"event": event, **fields}), file=sys.stderr, flush=True)


ROUTE = re.compile(r"^/v1/sandboxes/([0-9a-f]{24})/(run|kill|files/write|files/read|files/stat|files/list|files/remove)$")


def make_server(address, service: SandboxService) -> ThreadingHTTPServer:
    class Handler(BaseHTTPRequestHandler):
        server_version = "nexora-code"
        sys_version = ""

        def log_message(self, *args):
            pass

        def _send(self, status: int, body=None) -> None:
            data = json.dumps(body).encode() if body is not None else b""
            self.send_response(status)
            if data:
                self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if data:
                self.wfile.write(data)

        def _authorized(self) -> bool:
            supplied = self.headers.get("Authorization", "")
            return hmac.compare_digest(supplied.encode(), f"Bearer {service.settings.token}".encode())

        def _body(self) -> dict:
            length = int(self.headers.get("Content-Length") or 0)
            if length > service.settings.max_body_bytes:
                self.close_connection = True
                raise TooLarge("request body too large")
            raw = self.rfile.read(length) if length else b"{}"
            body = json.loads(raw or b"{}")
            if not isinstance(body, dict):
                raise ValueError("body must be a JSON object")
            return body

        def do_GET(self):
            if self.path == "/health":
                return self._send(200, {"ok": True, "limits": service.settings.limits()})
            self._send(404, {"error": "not_found"})

        def do_POST(self):
            if not self._authorized():
                return self._send(401, {"error": "unauthorized"})
            try:
                body = self._body()
                if self.path == "/v1/sandboxes":
                    return self._send(201, service.create(body.get("lifetimeMs")))
                match = ROUTE.match(self.path)
                if not match:
                    return self._send(404, {"error": "not_found"})
                sandbox_id, operation = match.groups()
                if operation == "run":
                    return self._send(
                        200, service.run(sandbox_id, body.get("code"), body.get("envs"), body.get("timeoutMs"), body.get("maxOutputBytes"))
                    )
                if operation == "kill":
                    service.kill(sandbox_id)
                    return self._send(204)
                if operation == "files/write":
                    content = base64.b64decode(body.get("contentBase64") or "", validate=True)
                    service.write_file(sandbox_id, body.get("path"), content)
                    return self._send(204)
                if operation == "files/read":
                    data = service.read_file(sandbox_id, body.get("path"), body.get("maxBytes"))
                    return self._send(200, {"contentBase64": base64.b64encode(data).decode(), "byteLength": len(data)})
                if operation == "files/stat":
                    return self._send(200, {"size": service.stat(sandbox_id, body.get("path"))})
                if operation == "files/list":
                    return self._send(200, {"entries": service.list_files(sandbox_id, body.get("path"), body.get("depth"))})
                service.remove_file(sandbox_id, body.get("path"))
                return self._send(204)
            except TooLarge as error:
                self._send(413, {"error": "too_large", "message": str(error)})
            except NotFound as error:
                self._send(404, {"error": "not_found", "message": str(error)})
            except Busy:
                self._send(429, {"error": "busy", "message": "every sandbox is in use"})
            except DockerUnavailable as error:
                log("docker_unavailable", error=str(error)[:300])
                self._send(503, {"error": "docker_unavailable"})
            except (ValueError, TypeError, KeyError) as error:
                self._send(400, {"error": "invalid", "message": str(error)[:300]})

    class Server(ThreadingHTTPServer):
        daemon_threads = True

    return Server(address, Handler)


def main() -> None:
    settings = Settings.from_env()
    service = SandboxService(settings, DockerClient(settings.socket_path))
    service.reap()
    listen = os.environ.get("NEXORA_CODE_LISTEN", "0.0.0.0:8080")
    host, _, port = listen.rpartition(":")
    server = make_server((host, int(port)), service)

    def reaper():
        while True:
            time.sleep(15)
            service.reap()

    threading.Thread(target=reaper, daemon=True).start()

    def stop(*_):
        service.kill_all()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    log("listening", address=listen, limits=settings.limits())
    server.serve_forever()


if __name__ == "__main__":
    main()
