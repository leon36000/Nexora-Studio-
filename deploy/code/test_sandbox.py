"""Tests for sandbox.py (no Docker needed). Run: python3 -I deploy/code/test_sandbox.py

The escape suite (scripts/verification/interpreteur-evasion.sh) drives the same controller against
the real Docker engine; these tests pin the policy the controller applies before Docker is involved.
"""
import base64
import http.client
import json
import sys
import threading
import unittest
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import sandbox  # noqa: E402

sandbox.log = lambda event, **fields: None

GIB = 1024 * 1024 * 1024


def settings(**overrides):
    values = {"token": "t" * 32, "image": "nexora/code:test", "instance": "test"}
    values.update(overrides)
    return sandbox.Settings(**values)


class FakeDocker:
    """Records the calls the service makes; exec answers come from a queue."""

    def __init__(self):
        self.created = []
        self.killed = []
        self.removed = []
        self.execs = []
        self.exec_results = []
        self.listed = []

    def create(self, name, spec):
        self.created.append((name, spec))
        return f"c{len(self.created)}"

    def start(self, container_id):
        pass

    def kill(self, container_id):
        self.killed.append(container_id)

    def remove(self, container_id):
        self.removed.append(container_id)

    def list(self, label):
        return self.listed

    def exec(self, container_id, cmd, env, stdin, timeout_s, max_output):
        self.execs.append({"container": container_id, "cmd": cmd, "env": env, "stdin": stdin, "timeout": timeout_s})
        if self.exec_results:
            return self.exec_results.pop(0)
        return sandbox.ExecResult(exit_code=0, stdout=b"", stderr=b"")


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


class ContainerSpecTest(unittest.TestCase):
    def test_container_spec_is_locked_down(self):
        spec = sandbox.container_spec(settings(), "abc", 600)
        host = spec["HostConfig"]
        self.assertEqual(host["NetworkMode"], "none")
        self.assertTrue(spec["NetworkDisabled"])
        self.assertTrue(host["ReadonlyRootfs"])
        self.assertEqual(host["CapDrop"], ["ALL"])
        self.assertNotIn("CapAdd", host)
        self.assertIn("no-new-privileges", host["SecurityOpt"])
        self.assertFalse(any("unconfined" in option for option in host["SecurityOpt"]))
        self.assertFalse(host.get("Privileged", False))
        self.assertEqual(host["PidsLimit"], 64)
        self.assertEqual(host["NanoCpus"], 1_000_000_000)
        self.assertEqual(host["Memory"], GIB)
        self.assertEqual(host["MemorySwap"], GIB)
        tmp = host["Tmpfs"]["/tmp"]
        for option in ("noexec", "nosuid", "nodev", "size=256m"):
            self.assertIn(option, tmp.split(","))
        self.assertEqual(spec["User"], "10001:10001")
        self.assertNotIn("Binds", host)
        self.assertNotIn("Mounts", host)
        self.assertNotIn("Devices", host)
        self.assertNotEqual(host.get("PidMode"), "host")
        self.assertNotEqual(host.get("IpcMode"), "host")
        self.assertNotIn("Runtime", host)
        names = {entry.split("=", 1)[0] for entry in spec["Env"]}
        self.assertEqual(names, set(sandbox.BASE_ENV))
        self.assertEqual(spec["Labels"][sandbox.LABEL], "test")
        self.assertEqual(spec["Cmd"], ["sleep", "600"])

    def test_runtime_is_set_only_when_configured(self):
        spec = sandbox.container_spec(settings(runtime="runsc"), "abc", 60)
        self.assertEqual(spec["HostConfig"]["Runtime"], "runsc")

    def test_limits_come_from_settings(self):
        spec = sandbox.container_spec(settings(cpus=2, memory_mb=2048, tmpfs_mb=512, pids=32), "abc", 60)
        host = spec["HostConfig"]
        self.assertEqual(host["NanoCpus"], 2_000_000_000)
        self.assertEqual(host["Memory"], 2 * GIB)
        self.assertEqual(host["MemorySwap"], 2 * GIB)
        self.assertEqual(host["PidsLimit"], 32)
        self.assertIn("size=512m", host["Tmpfs"]["/tmp"])

    def test_settings_refuse_a_short_token(self):
        with self.assertRaises(ValueError):
            sandbox.Settings.from_env({"NEXORA_CODE_SANDBOX_TOKEN": "short"})
        with self.assertRaises(ValueError):
            sandbox.Settings.from_env({})

    def test_settings_read_limits_from_env(self):
        s = sandbox.Settings.from_env({"NEXORA_CODE_SANDBOX_TOKEN": "x" * 32, "NEXORA_CODE_MEMORY_MB": "2048", "NEXORA_CODE_MAX_SANDBOXES": "4"})
        self.assertEqual(s.memory_mb, 2048)
        self.assertEqual(s.max_sandboxes, 4)
        self.assertEqual(s.max_per_workspace, 1)

    def test_settings_read_the_per_workspace_limit_from_env(self):
        s = sandbox.Settings.from_env({"NEXORA_CODE_SANDBOX_TOKEN": "x" * 32, "NEXORA_CODE_MAX_PER_WORKSPACE": "3"})
        self.assertEqual(s.max_per_workspace, 3)
        with self.assertRaises(ValueError):
            sandbox.Settings.from_env({"NEXORA_CODE_SANDBOX_TOKEN": "x" * 32, "NEXORA_CODE_MAX_PER_WORKSPACE": "0"})


class PathTest(unittest.TestCase):
    def test_paths_outside_tmp_are_refused(self):
        for path in ("/etc/passwd", "/tmp/../etc/passwd", "/proc/1/environ", "tmp/a", "/tmp", "/tmp/", "/tmp/a\x00b", "", "/var/run/docker.sock"):
            with self.assertRaises(ValueError, msg=path):
                sandbox.check_sandbox_path(path)

    def test_paths_under_tmp_are_accepted(self):
        self.assertEqual(sandbox.check_sandbox_path("/tmp/sim/inputs/ventes.xlsx"), "/tmp/sim/inputs/ventes.xlsx")
        self.assertEqual(sandbox.check_sandbox_path("/tmp/sim//outputs/./a.png"), "/tmp/sim/outputs/a.png")

    def test_env_names_are_validated(self):
        self.assertEqual(sandbox.check_envs({"SIM_X": "1"}), {"SIM_X": "1"})
        for bad in ({"1A": "x"}, {"A-B": "x"}, {"A": 3}, {"A": "x\x00"}, {"LD_PRELOAD": "/tmp/x.so"}):
            with self.assertRaises(ValueError, msg=str(bad)):
                sandbox.check_envs(bad)


class ServiceTest(unittest.TestCase):
    def setUp(self):
        self.docker = FakeDocker()
        self.clock = Clock()
        self.service = sandbox.SandboxService(settings(), self.docker, clock=self.clock)

    def test_busy_when_max_sandboxes_reached(self):
        self.service.create(None)
        self.service.create(None)
        with self.assertRaises(sandbox.Busy):
            self.service.create(None)
        self.assertEqual(len(self.docker.created), 2)

    def test_one_workspace_cannot_take_every_sandbox(self):
        self.service.create(None, workspace_id="ws-1")
        with self.assertRaises(sandbox.Busy) as refused:
            self.service.create(None, workspace_id="ws-1")
        self.assertEqual(refused.exception.scope, "workspace")
        self.service.create(None, workspace_id="ws-2")
        self.assertEqual(len(self.docker.created), 2)

    def test_the_instance_limit_still_applies_across_workspaces(self):
        self.service.create(None, workspace_id="ws-1")
        self.service.create(None, workspace_id="ws-2")
        with self.assertRaises(sandbox.Busy) as refused:
            self.service.create(None, workspace_id="ws-3")
        self.assertEqual(refused.exception.scope, "instance")

    def test_a_workspace_gets_its_slot_back_when_its_sandbox_ends(self):
        first = self.service.create(None, workspace_id="ws-1")
        self.service.kill(first["sandboxId"])
        self.service.create(None, workspace_id="ws-1")
        self.service.create(None, workspace_id="ws-1-bis")
        self.clock.now += 601
        self.service.reap()
        self.service.create(None, workspace_id="ws-1")

    def test_the_per_workspace_limit_is_configurable(self):
        service = sandbox.SandboxService(settings(max_per_workspace=2, max_sandboxes=3), self.docker, clock=self.clock)
        service.create(None, workspace_id="ws-1")
        service.create(None, workspace_id="ws-1")
        with self.assertRaises(sandbox.Busy):
            service.create(None, workspace_id="ws-1")

    def test_a_workspace_id_must_be_a_plain_identifier(self):
        for bad in ["", "a b", "ws/../x", "x" * 65, 12, ["ws"]]:
            with self.assertRaises(ValueError, msg=str(bad)):
                self.service.create(None, workspace_id=bad)
        self.assertEqual(self.docker.created, [])

    def test_lifetime_and_timeout_are_clamped(self):
        created = self.service.create(10 * 3600 * 1000)
        self.assertEqual(self.docker.created[0][1]["Cmd"], ["sleep", "600"])
        self.service.run(created["sandboxId"], "print(1)", {}, 10 * 3600 * 1000, None)
        run = next(call for call in self.docker.execs if sandbox.RUNNER in call["cmd"])
        self.assertLessEqual(run["timeout"], 120)

    def test_run_timeout_kills_container(self):
        created = self.service.create(None)
        self.docker.exec_results = [
            sandbox.ExecResult(exit_code=0, stdout=b"", stderr=b""),  # code written
            sandbox.ExecResult(exit_code=-1, stdout=b"partial", stderr=b"", timed_out=True),
        ]
        result = self.service.run(created["sandboxId"], "while True: pass", {}, 5000, None)
        self.assertTrue(result["timedOut"])
        self.assertIn("c1", self.docker.killed)
        with self.assertRaises(sandbox.NotFound):
            self.service.run(created["sandboxId"], "print(1)", {}, 5000, None)

    def test_memory_kill_is_reported(self):
        created = self.service.create(None)
        self.docker.exec_results = [
            sandbox.ExecResult(exit_code=0, stdout=b"", stderr=b""),
            sandbox.ExecResult(exit_code=137, stdout=b"", stderr=b""),
            sandbox.ExecResult(exit_code=2, stdout=b"", stderr=b""),  # no error file
        ]
        result = self.service.run(created["sandboxId"], "x = bytearray(10**10)", {}, 5000, None)
        self.assertTrue(result["oomKilled"])
        self.assertEqual(result["error"]["name"], "MemoryError")

    def test_python_error_is_reported(self):
        created = self.service.create(None)
        error = json.dumps({"name": "ZeroDivisionError", "value": "division by zero", "traceback": "Traceback..."}).encode()
        self.docker.exec_results = [
            sandbox.ExecResult(exit_code=0, stdout=b"", stderr=b""),
            sandbox.ExecResult(exit_code=1, stdout=b"avant\n", stderr=b""),
            sandbox.ExecResult(exit_code=0, stdout=error, stderr=b""),
        ]
        result = self.service.run(created["sandboxId"], "1/0", {}, 5000, None)
        self.assertEqual(result["error"]["name"], "ZeroDivisionError")
        self.assertEqual(result["stdout"], "avant\n")

    def test_run_env_contains_only_base_and_requested_values(self):
        created = self.service.create(None)
        self.service.run(created["sandboxId"], "print(1)", {"SIM_PAYLOAD": "/tmp/p"}, 5000, None)
        run = next(call for call in self.docker.execs if sandbox.RUNNER in call["cmd"])
        names = {entry.split("=", 1)[0] for entry in run["env"]}
        self.assertEqual(names, set(sandbox.BASE_ENV) | {"SIM_PAYLOAD"})
        self.assertFalse(any("t" * 32 in entry for entry in run["env"]))

    def test_reaper_removes_expired_sandboxes(self):
        created = self.service.create(60_000)
        self.clock.now += 61
        self.service.reap()
        self.assertIn("c1", self.docker.killed)
        with self.assertRaises(sandbox.NotFound):
            self.service.kill(created["sandboxId"])
        self.service.create(None)
        self.service.create(None)

    def test_reaper_removes_orphans_of_this_instance(self):
        self.docker.listed = [{"Id": "orphan", "Labels": {sandbox.LABEL: "test"}}]
        self.service.reap()
        self.assertIn("orphan", self.docker.removed)

    def test_write_file_passes_bytes_through_stdin(self):
        created = self.service.create(None)
        self.service.write_file(created["sandboxId"], "/tmp/sim/inputs/a.bin", b"\x00\x01")
        call = self.docker.execs[-1]
        self.assertEqual(call["stdin"], b"\x00\x01")
        self.assertEqual(call["cmd"][-1], "/tmp/sim/inputs/a.bin")

    def test_read_file_too_large(self):
        created = self.service.create(None)
        self.docker.exec_results = [sandbox.ExecResult(exit_code=3, stdout=b"", stderr=b"")]
        with self.assertRaises(sandbox.TooLarge):
            self.service.read_file(created["sandboxId"], "/tmp/sim/outputs/a.png", 10)


class DockerClientTest(unittest.TestCase):
    def test_list_encodes_the_label_filter_in_the_url(self):
        seen = []

        class Recording(sandbox.DockerClient):
            def request(self, method, path, body=None, timeout=30.0):
                seen.append(path)
                return 200, []

        Recording("/nonexistent").list("nexora.code-sandbox=test")
        path = seen[0]
        self.assertNotRegex(path, r"[\s\"{}]")
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(path).query)
        self.assertEqual(json.loads(query["filters"][0]), {"label": ["nexora.code-sandbox=test"]})


class DemuxTest(unittest.TestCase):
    @staticmethod
    def frame(stream, payload):
        return bytes([stream, 0, 0, 0]) + len(payload).to_bytes(4, "big") + payload

    def test_demux_splits_stdout_and_stderr(self):
        demux = sandbox.Demux(max_output=100)
        data = self.frame(1, b"hello ") + self.frame(2, b"oops") + self.frame(1, b"world")
        demux.feed(data[:5])
        demux.feed(data[5:])
        self.assertEqual(demux.stdout, b"hello world")
        self.assertEqual(demux.stderr, b"oops")
        self.assertFalse(demux.truncated)

    def test_output_is_capped(self):
        demux = sandbox.Demux(max_output=8)
        demux.feed(self.frame(1, b"0123456789") + self.frame(2, b"abc"))
        self.assertEqual(len(demux.stdout) + len(demux.stderr), 8)
        self.assertTrue(demux.truncated)


class HttpTest(unittest.TestCase):
    def setUp(self):
        self.docker = FakeDocker()
        self.service = sandbox.SandboxService(settings(), self.docker)
        self.server = sandbox.make_server(("127.0.0.1", 0), self.service)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()

    def call(self, method, path, body=None, token="t" * 32):
        conn = http.client.HTTPConnection("127.0.0.1", self.server.server_address[1], timeout=5)
        headers = {"Content-Type": "application/json"}
        if token is not None:
            headers["Authorization"] = f"Bearer {token}"
        conn.request(method, path, body=json.dumps(body) if body is not None else None, headers=headers)
        response = conn.getresponse()
        raw = response.read()
        conn.close()
        return response.status, (json.loads(raw) if raw else None)

    def test_requests_without_token_are_refused(self):
        self.assertEqual(self.call("POST", "/v1/sandboxes", {}, token=None)[0], 401)
        self.assertEqual(self.call("POST", "/v1/sandboxes", {}, token="x" * 32)[0], 401)
        self.assertEqual(self.docker.created, [])

    def test_health_needs_no_token_and_shows_limits(self):
        status, body = self.call("GET", "/health", token=None)
        self.assertEqual(status, 200)
        self.assertEqual(body["limits"]["memoryMb"], 1024)
        self.assertNotIn("t" * 32, json.dumps(body))

    def test_create_then_write_outside_tmp_is_refused(self):
        status, body = self.call("POST", "/v1/sandboxes", {})
        self.assertEqual(status, 201)
        sandbox_id = body["sandboxId"]
        content = base64.b64encode(b"x").decode()
        status, body = self.call("POST", f"/v1/sandboxes/{sandbox_id}/files/write", {"path": "/etc/passwd", "contentBase64": content})
        self.assertEqual(status, 400)
        self.assertEqual(len(self.docker.execs), 0)

    def test_unknown_sandbox_is_404(self):
        status, _ = self.call("POST", "/v1/sandboxes/" + "0" * 24 + "/kill", {})
        self.assertEqual(status, 404)

    def test_third_sandbox_is_429(self):
        self.call("POST", "/v1/sandboxes", {})
        self.call("POST", "/v1/sandboxes", {})
        self.assertEqual(self.call("POST", "/v1/sandboxes", {})[0], 429)

    def test_a_busy_workspace_is_429_and_says_so(self):
        self.assertEqual(self.call("POST", "/v1/sandboxes", {"workspaceId": "ws-1"})[0], 201)
        status, body = self.call("POST", "/v1/sandboxes", {"workspaceId": "ws-1"})
        self.assertEqual((status, body["scope"]), (429, "workspace"))
        self.assertEqual(self.call("POST", "/v1/sandboxes", {"workspaceId": "ws-2"})[0], 201)

    def test_a_malformed_workspace_id_is_400(self):
        self.assertEqual(self.call("POST", "/v1/sandboxes", {"workspaceId": "a b"})[0], 400)

    def test_oversized_body_is_413(self):
        self.service.settings = settings(max_body_bytes=1000)
        status, _ = self.call("POST", "/v1/sandboxes", {"pad": "x" * 2000})
        self.assertEqual(status, 413)


if __name__ == "__main__":
    unittest.main(verbosity=1)
