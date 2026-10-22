"""Tests for bootstrap.py. Run: python3 -I deploy/bootstrap/test_bootstrap.py"""
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

ADMIN = {"id": 1, "email": "admin", "permissions": ["admin"]}


class FakeApi(BaseHTTPRequestHandler):
    """Minimal Nexora API: admin session, routers, roles, organizations, users and keys."""

    state: dict = {}

    @classmethod
    def reset(cls, routers=(10, 11)):
        cls.state = {"routers": list(routers), "roles": {}, "orgs": {}, "users": {}, "keys": {"admin-key": ADMIN}, "role_updates": 0}

    def log_message(self, *args):
        pass

    def _json(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _caller(self):
        return self.state["keys"].get(self.headers.get("Authorization", "").removeprefix("Bearer "))

    def _body(self):
        return json.loads(self.rfile.read(int(self.headers["Content-Length"])))

    def do_GET(self):
        s, caller, path = self.state, self._caller(), self.path.split("?")[0]
        if path == "/health":
            return self._json(200, {})
        if path == "/v1/me":
            return self._json(200, caller) if caller else self._json(401, {})
        if not caller or "admin" not in caller["permissions"]:
            return self._json(403, {})
        listing = {"/v1/admin/routers": [{"id": r, "name": f"m{r}"} for r in s["routers"]], "/v1/admin/roles": list(s["roles"].values()), "/v1/admin/organizations": list(s["orgs"].values()), "/v1/admin/users": list(s["users"].values())}
        return self._json(200, {"data": listing[path]}) if path in listing else self._json(404, {})

    def do_POST(self):
        s, body = self.state, self._body()
        if self.path == "/v1/auth/login":
            ok = body == {"email": "admin", "password": "pw"}
            return self._json(200, {"value": "admin-key"}) if ok else self._json(401, {})
        caller = self._caller()
        if not caller or "admin" not in caller["permissions"]:
            return self._json(403, {})
        if self.path == "/v1/admin/roles":
            rid = 100 + len(s["roles"]); s["roles"][rid] = {"id": rid, **body}
            return self._json(201, {"id": rid})
        if self.path == "/v1/admin/organizations":
            oid = 200 + len(s["orgs"]); s["orgs"][oid] = {"id": oid, **body}
            return self._json(201, {"id": oid})
        if self.path == "/v1/admin/users":
            uid = 300 + len(s["users"]); s["users"][uid] = {"id": uid, **body}
            return self._json(201, {"id": uid})
        if self.path == "/v1/admin/keys":
            user = s["users"][body["user"]]
            key = f"key-{len(s['keys'])}"
            s["keys"][key] = {"id": user["id"], "email": user["email"], "permissions": s["roles"][user["role_id"]]["permissions"]}
            return self._json(201, {"value": key})
        return self._json(404, {})

    def do_PATCH(self):
        s, body = self.state, self._body()
        rid = int(self.path.rsplit("/", 1)[1])
        s["roles"][rid].update(body); s["role_updates"] += 1
        return self._json(200, {"id": rid})


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
        FakeApi.reset()
        self.out = Path(tempfile.mkdtemp()) / "nexora-api.env"

    def run_bootstrap(self, password="pw"):
        return bootstrap.ensure_workstudio_key(self.url, "admin", password, self.out, wait_seconds=1)

    def test_creates_a_least_privilege_key_and_writes_a_private_env_file(self):
        key = self.run_bootstrap()
        owner = FakeApi.state["keys"][key]
        self.assertEqual(owner["email"], bootstrap.WORKSTUDIO_EMAIL)
        self.assertNotIn("admin", owner["permissions"])
        self.assertEqual(self.out.read_text(), f"export VLLM_API_KEY={key}\n")
        self.assertEqual(oct(os.stat(self.out).st_mode & 0o777), "0o600")

    def test_grants_unlimited_access_to_every_model(self):
        self.run_bootstrap()
        (role,) = FakeApi.state["roles"].values()
        self.assertEqual(role["permissions"], [])
        covered = {(l["router_id"], l["type"]) for l in role["limits"] if l["value"] is None}
        self.assertEqual(covered, {(r, t) for r in (10, 11) for t in ("rpm", "rpd", "tpm", "tpd")})

    def test_keeps_a_working_key_and_covers_models_added_later(self):
        first = self.run_bootstrap()
        FakeApi.state["routers"].append(12)
        self.assertEqual(self.run_bootstrap(), first)
        self.assertEqual(len(FakeApi.state["users"]), 1)
        (role,) = FakeApi.state["roles"].values()
        self.assertIn((12, "rpm"), {(l["router_id"], l["type"]) for l in role["limits"]})

    def test_replaces_an_admin_key_left_by_an_older_bootstrap(self):
        self.out.write_text("export VLLM_API_KEY=admin-key\n")
        key = self.run_bootstrap()
        self.assertNotEqual(key, "admin-key")
        self.assertNotIn("admin", FakeApi.state["keys"][key]["permissions"])

    def test_fails_loudly_on_wrong_admin_password(self):
        with self.assertRaises(bootstrap.BootstrapError):
            self.run_bootstrap(password="wrong")
        self.assertFalse(self.out.exists())


if __name__ == "__main__":
    unittest.main()
