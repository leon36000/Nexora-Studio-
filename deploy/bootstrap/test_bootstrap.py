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
    """Minimal Nexora API: admin session, routers, providers, roles, organizations, users and keys."""

    state: dict = {}

    @classmethod
    def reset(cls, routers=(10, 11)):
        cls.state = {"routers": list(routers), "providers": {}, "roles": {}, "orgs": {}, "users": {}, "keys": {"admin-key": ADMIN}, "role_updates": 0}

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
        if path.startswith("/v1/admin") and s.get("expire_next_session"):
            s["expire_next_session"] = False
            return self._json(401, {})
        if path == "/health":
            return self._json(200, {})
        if path == "/v1/me":
            return self._json(200, caller) if caller else self._json(401, {})
        if not caller or "admin" not in caller["permissions"]:
            return self._json(403, {})
        if path == "/v1/admin/providers":
            router_id = int(self.path.split("router_id=")[1].split("&")[0])
            listed = [{k: v for k, v in p.items() if k != "key"} for p in s["providers"].values() if p["router_id"] == router_id]
            return self._json(200, {"data": listed})
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
        if self.path == "/v1/admin/providers":
            if any(p["router_id"] == body["router_id"] and p["url"].rstrip("/") == body["url"].lower().rstrip("/") and p["model_name"] == body["model_name"] for p in s["providers"].values()):
                return self._json(409, {})
            pid = 400 + len(s["providers"]) + s.setdefault("deleted", 0)
            # Like Nexora API, stores the address with a trailing slash.
            s["providers"][pid] = {"id": pid, "router_id": body["router_id"], "url": body["url"].lower().rstrip("/") + "/", "model_name": body["model_name"], "key": body["key"]}
            return self._json(201, {"id": pid})
        if self.path == "/v1/admin/keys":
            user = s["users"][body["user"]]
            key = f"key-{len(s['keys'])}"
            s["keys"][key] = {"id": user["id"], "email": user["email"], "permissions": s["roles"][user["role_id"]]["permissions"]}
            return self._json(201, {"value": key})
        return self._json(404, {})

    def do_DELETE(self):
        s = self.state
        pid = int(self.path.rsplit("/", 1)[1])
        s["providers"].pop(pid); s["deleted"] = s.get("deleted", 0) + 1
        self.send_response(204); self.end_headers()

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

    def run_bootstrap(self, password="pw", upstream=None):
        return bootstrap.ensure_workstudio_key(self.url, "admin", password, self.out, wait_seconds=1, upstream=upstream)

    def seed_provider(self, url="http://ollama:11434", model="qwen2.5:0.5b", key="none"):
        FakeApi.state["providers"][1] = {"id": 1, "router_id": 10, "url": url, "model_name": model, "key": key}

    def test_points_the_model_at_the_upstream_set_in_deploy_env(self):
        self.seed_provider()
        self.run_bootstrap(upstream={"router": "m10", "url": "http://Host.docker.internal:18141/", "model": "qwen2.5:7b", "key": "none"})
        (provider,) = [p for p in FakeApi.state["providers"].values() if p["router_id"] == 10]
        self.assertEqual((provider["url"], provider["model_name"]), ("http://host.docker.internal:18141/", "qwen2.5:7b"))

    def test_a_synced_provider_stays_put_on_the_next_start(self):
        upstream = {"router": "m10", "url": "http://host.docker.internal:18141", "model": "qwen2.5:7b", "key": "none"}
        self.seed_provider()
        self.run_bootstrap(upstream=upstream)
        synced = list(FakeApi.state["providers"])
        self.run_bootstrap(upstream=upstream)
        self.assertEqual(list(FakeApi.state["providers"]), synced)

    def test_follows_a_new_api_key(self):
        self.seed_provider(url="https://api.mistral.ai", model="mistral-small-latest", key="old")
        mistral = {"router": "m10", "url": "https://api.mistral.ai", "model": "mistral-small-latest", "key": "old"}
        self.run_bootstrap(upstream=mistral)
        self.run_bootstrap(upstream={**mistral, "key": "new"})
        (provider,) = FakeApi.state["providers"].values()
        self.assertEqual(provider["key"], "new")

    def test_leaves_an_up_to_date_provider_alone(self):
        self.seed_provider()
        self.run_bootstrap(upstream={"router": "m10", "url": "http://ollama:11434", "model": "qwen2.5:0.5b", "key": "none"})
        self.assertEqual(list(FakeApi.state["providers"]), [1])

    def test_leaves_an_unseeded_model_to_the_api(self):
        self.run_bootstrap(upstream={"router": "absent", "url": "http://x:1", "model": "m", "key": "none"})
        self.assertEqual(FakeApi.state["providers"], {})

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

    def test_signs_in_again_when_the_admin_session_expires_mid_run(self):
        FakeApi.state["expire_next_session"] = True
        key = self.run_bootstrap()
        self.assertEqual(FakeApi.state["keys"][key]["email"], bootstrap.WORKSTUDIO_EMAIL)

    def test_fails_loudly_on_wrong_admin_password(self):
        with self.assertRaises(bootstrap.BootstrapError):
            self.run_bootstrap(password="wrong")
        self.assertFalse(self.out.exists())


if __name__ == "__main__":
    unittest.main()
