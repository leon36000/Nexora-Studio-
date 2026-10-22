"""Tests for bootstrap.py. Run: python3 -I -m unittest deploy/bootstrap/test_bootstrap.py"""
import json
import os
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import bootstrap  # noqa: E402


class FakeApi(BaseHTTPRequestHandler):
    valid_keys = {"existing-key"}
    created = 0

    def log_message(self, *args):
        pass

    def _json(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        token = self.headers.get("Authorization", "").removeprefix("Bearer ")
        if self.path == "/v1/me/info":
            return self._json(200 if token in FakeApi.valid_keys else 401, {"id": 1})
        if self.path == "/health":
            return self._json(200, {"status": "ok"})
        self._json(404, {})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.path == "/v1/auth/login":
            if body == {"email": "admin", "password": "pw"}:
                return self._json(200, {"id": 1, "value": "session-key"})
            return self._json(401, {})
        if self.path == "/v1/me/keys":
            if self.headers.get("Authorization") != "Bearer session-key":
                return self._json(401, {})
            FakeApi.created += 1
            key = f"new-key-{FakeApi.created}"
            FakeApi.valid_keys.add(key)
            return self._json(201, {"id": FakeApi.created, "value": key})
        self._json(404, {})


class BootstrapTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), FakeApi)
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.out = Path(self.dir) / "nexora-api.env"

    def run_bootstrap(self, password="pw"):
        return bootstrap.ensure_workstudio_key(self.url, "admin", password, self.out, wait_seconds=1)

    def test_creates_a_key_and_writes_a_private_env_file(self):
        key = self.run_bootstrap()
        self.assertTrue(key.startswith("new-key-"))
        self.assertEqual(self.out.read_text(), f"export VLLM_API_KEY={key}\n")
        self.assertEqual(oct(os.stat(self.out).st_mode & 0o777), "0o600")

    def test_keeps_a_key_that_still_works(self):
        self.out.write_text("export VLLM_API_KEY=existing-key\n")
        before = FakeApi.created
        self.assertEqual(self.run_bootstrap(), "existing-key")
        self.assertEqual(FakeApi.created, before)

    def test_replaces_a_revoked_key(self):
        self.out.write_text("export VLLM_API_KEY=revoked\n")
        self.assertTrue(self.run_bootstrap().startswith("new-key-"))

    def test_fails_loudly_on_wrong_admin_password(self):
        with self.assertRaises(bootstrap.BootstrapError):
            self.run_bootstrap(password="wrong")
        self.assertFalse(self.out.exists())


if __name__ == "__main__":
    unittest.main()
