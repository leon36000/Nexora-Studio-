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
        cls.state = {"routers": {r: cls.router(r, f"m{r}") for r in routers}, "providers": {}, "roles": {}, "orgs": {}, "users": {}, "keys": {"admin-key": ADMIN}, "role_updates": 0}

    @staticmethod
    def router(rid, name, aliases=()):
        return {"id": rid, "name": name, "type": "text-generation", "aliases": list(aliases), "load_balancing_strategy": "shuffle", "cost_prompt_tokens": 0.0, "cost_completion_tokens": 0.0}

    def _names_taken(self, names, except_id=None):
        return any(r["id"] != except_id and ({r["name"], *r["aliases"]} & set(names)) for r in self.state["routers"].values())

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
        length = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(length)) if length else {}

    def do_GET(self):
        s, caller, path = self.state, self._caller(), self.path.split("?")[0]
        if path.startswith("/v1/admin") and s.get("expire_next_session"):
            s["expire_next_session"] = False
            return self._json(401, {})
        if path == "/health":
            return self._json(200, {})
        if path == "/v1/me":
            if s.get("me_unavailable") and caller and caller is not ADMIN:
                return self._json(503, {})
            return self._json(200, caller) if caller else self._json(401, {})
        if not caller or "admin" not in caller["permissions"]:
            return self._json(403, {})
        if path == "/v1/admin/providers":
            router_id = int(self.path.split("router_id=")[1].split("&")[0])
            listed = [{k: v for k, v in p.items() if k != "key"} for p in s["providers"].values() if p["router_id"] == router_id]
            return self._json(200, {"data": listed})
        listing = {"/v1/admin/routers": list(s["routers"].values()), "/v1/admin/roles": list(s["roles"].values()), "/v1/admin/organizations": list(s["orgs"].values()), "/v1/admin/users": list(s["users"].values())}
        return self._json(200, {"data": listing[path]}) if path in listing else self._json(404, {})

    def do_POST(self):
        s, body = self.state, self._body()
        if self.path.startswith("/v1/models/"):  # the transcription service downloads a model
            s.setdefault("downloads", []).append(self.path.removeprefix("/v1/models/"))
            return self._json(200, {})
        if self.path == "/v1/auth/login":
            ok = body == {"email": "admin", "password": "pw"}
            return self._json(200, {"value": "admin-key"}) if ok else self._json(401, {})
        caller = self._caller()
        if not caller or "admin" not in caller["permissions"]:
            return self._json(403, {})
        if self.path == "/v1/admin/routers":
            names = [body["name"], *body.get("aliases", [])]
            if self._names_taken(names):
                return self._json(409, {})
            rid = 500 + len(s["routers"]); s["routers"][rid] = {**self.router(rid, body["name"], body.get("aliases", [])), "type": body["type"]}
            return self._json(201, {"id": rid})
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
            if s.get("unreachable_provider_url") == body["url"]:
                return self._json(424, {"detail": "not reachable"})
            if any(p["router_id"] == body["router_id"] and p["url"].rstrip("/") == body["url"].lower().rstrip("/") and p["model_name"] == body["model_name"] for p in s["providers"].values()):
                return self._json(409, {})
            pid = 400 + len(s["providers"]) + s.setdefault("deleted", 0)
            # Like Nexora API, stores the address with a trailing slash.
            s["providers"][pid] = {"id": pid, "router_id": body["router_id"], "type": body.get("type"), "url": body["url"].lower().rstrip("/") + "/", "model_name": body["model_name"], "key": body["key"], "timeout": body.get("timeout")}
            return self._json(201, {"id": pid})
        if self.path == "/v1/admin/keys":
            user = ADMIN if body["user"] == ADMIN["id"] else s["users"][body["user"]]
            key = f"key-{len(s['keys'])}"
            permissions = user["permissions"] if user is ADMIN else s["roles"][user["role_id"]]["permissions"]
            s["keys"][key] = {"id": user["id"], "email": user["email"], "permissions": permissions}
            return self._json(201, {"value": key})
        return self._json(404, {})

    def do_DELETE(self):
        s = self.state
        if self.path.startswith("/v1/admin/routers/"):
            rid = int(self.path.rsplit("/", 1)[1])
            s["routers"].pop(rid)
            s["providers"] = {k: p for k, p in s["providers"].items() if p["router_id"] != rid}
            self.send_response(204); self.end_headers()
            return
        pid = int(self.path.rsplit("/", 1)[1])
        s["providers"].pop(pid); s["deleted"] = s.get("deleted", 0) + 1
        self.send_response(204); self.end_headers()

    def do_PATCH(self):
        s, body = self.state, self._body()
        rid = int(self.path.rsplit("/", 1)[1])
        if self.path.startswith("/v1/admin/routers/"):
            if set(body) != {"name", "type", "aliases", "load_balancing_strategy", "cost_prompt_tokens", "cost_completion_tokens"}:
                return self._json(422, {})
            if self._names_taken([body["name"], *body["aliases"]], except_id=rid):
                return self._json(409, {})
            if s.get("refuse_alias_on_create") and rid != 10 and "nexora-default" in body["aliases"]:
                return self._json(500, {})
            s["routers"][rid].update(body)
            return self._json(200, {"id": rid})
        if self.path.startswith("/v1/admin/providers/"):
            # Full-body update, as Nexora API requires.
            if s.get("refuse_provider_update"):
                return self._json(422, {})
            if set(body) != {"router_id", "timeout", "model_hosting_zone", "model_total_params", "model_active_params"}:
                return self._json(422, {})
            s["providers"][rid].update(body)
            return self._json(200, {"id": rid})
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

    def run_bootstrap(self, password="pw", upstream=None, voice=None):
        return bootstrap.ensure_workstudio_key(self.url, "admin", password, self.out, wait_seconds=1, upstream=upstream, voice=voice)

    def voice(self, **overrides):
        # The fake Nexora API also plays the transcription service (/health, POST /v1/models/<id>).
        return {"url": self.url, "model": "Systran/faster-whisper-small", "wait_seconds": 1, **overrides}

    def transcription_routers(self):
        return [r for r in FakeApi.state["routers"].values() if r["type"] == "automatic-speech-recognition"]

    def seed_provider(self, url="http://ollama:11434", model="qwen2.5:0.5b", key="none"):
        FakeApi.state["providers"][1] = {"id": 1, "router_id": 10, "url": url, "model_name": model, "key": key}

    def default_router(self, alias="m10"):
        (router,) = [r for r in FakeApi.state["routers"].values() if alias in r["aliases"]]
        return router

    def providers_of(self, router):
        return [p for p in FakeApi.state["providers"].values() if p["router_id"] == router["id"]]

    def test_points_the_default_model_at_the_upstream_set_in_deploy_env(self):
        self.seed_provider()
        self.run_bootstrap(upstream={"router": "m10", "url": "http://Host.docker.internal:18141/", "model": "qwen2.5:7b", "key": "none"})
        default = self.default_router()
        (provider,) = self.providers_of(default)
        self.assertEqual(default["name"], "qwen2.5:7b")
        self.assertEqual((provider["url"], provider["model_name"]), ("http://host.docker.internal:18141/", "qwen2.5:7b"))
        self.assertEqual(FakeApi.state["routers"][10]["name"], "qwen2.5:0.5b")  # the previous model stays available

    def test_router_named_default_gets_model_name_and_alias(self):
        FakeApi.state["routers"][10] = FakeApi.router(10, "nexora-default")
        self.seed_provider(model="qwen2.5:7b")
        self.run_bootstrap(upstream={"router": "nexora-default", "url": "http://ollama:11434", "model": "qwen2.5:7b", "key": "none"})
        self.assertEqual((FakeApi.state["routers"][10]["name"], FakeApi.state["routers"][10]["aliases"]), ("qwen2.5:7b", ["nexora-default"]))
        self.assertEqual(list(FakeApi.state["providers"]), [1])

    def test_renamed_router_avoids_a_taken_name(self):
        FakeApi.state["routers"][10] = FakeApi.router(10, "nexora-default")
        FakeApi.state["routers"][11] = FakeApi.router(11, "qwen2.5:7b")
        self.seed_provider(model="qwen2.5:7b")
        self.run_bootstrap(upstream={"router": "nexora-default", "url": "http://ollama:11434", "model": "qwen2.5:7b", "key": "none"})
        self.assertEqual(FakeApi.state["routers"][10]["name"], "qwen2.5:7b (2)")

    def test_same_fingerprint_keeps_the_default_chosen_in_the_interface(self):
        upstream = {"router": "nexora-default", "url": "http://ollama:11434", "model": "qwen2.5:7b", "key": "none"}
        FakeApi.state["routers"][10] = FakeApi.router(10, "nexora-default")
        self.seed_provider(model="qwen2.5:7b")
        self.run_bootstrap(upstream=upstream)
        # The interface moves the alias to another model.
        FakeApi.state["routers"][10]["aliases"] = []
        FakeApi.state["routers"][11]["aliases"] = ["nexora-default"]
        FakeApi.state["providers"][2] = {"id": 2, "router_id": 11, "url": "https://api.mistral.ai/", "model_name": "mistral-small-latest", "key": "k"}
        before = (dict(FakeApi.state["providers"]), [dict(r) for r in FakeApi.state["routers"].values()])
        self.run_bootstrap(upstream=upstream)
        self.assertEqual((dict(FakeApi.state["providers"]), [dict(r) for r in FakeApi.state["routers"].values()]), before)

    def test_changed_fingerprint_makes_the_new_upstream_the_default(self):
        FakeApi.state["routers"][10] = FakeApi.router(10, "nexora-default")
        self.seed_provider(model="qwen2.5:7b")
        self.run_bootstrap(upstream={"router": "nexora-default", "url": "http://ollama:11434", "model": "qwen2.5:7b", "key": "none"})
        self.run_bootstrap(upstream={"router": "nexora-default", "url": "https://api.mistral.ai", "model": "mistral-small-latest", "key": "k"})
        default = self.default_router("nexora-default")
        (provider,) = self.providers_of(default)
        self.assertEqual((default["name"], provider["model_name"]), ("mistral-small-latest", "mistral-small-latest"))
        self.assertEqual(FakeApi.state["routers"][10]["aliases"], [])

    def test_a_lost_default_is_given_back_to_the_env_model(self):
        upstream = {"router": "nexora-default", "url": "http://ollama:11434", "model": "qwen2.5:7b", "key": "none"}
        FakeApi.state["routers"][10] = FakeApi.router(10, "nexora-default")
        self.seed_provider(model="qwen2.5:7b")
        self.run_bootstrap(upstream=upstream)
        FakeApi.state["routers"][10]["aliases"] = []  # e.g. a crash between the two PATCHes of a move
        self.run_bootstrap(upstream=upstream)
        self.assertEqual(self.default_router("nexora-default")["id"], 10)

    def test_a_lost_default_is_created_from_the_env_when_its_router_is_gone(self):
        FakeApi.state["routers"] = {11: FakeApi.router(11, "mistral-small-latest")}
        self.run_bootstrap(upstream={"router": "nexora-default", "url": "http://ollama:11434", "model": "qwen2.5:7b", "key": "none"})
        default = self.default_router("nexora-default")
        self.assertEqual(default["name"], "qwen2.5:7b")
        (provider,) = self.providers_of(default)
        self.assertEqual(provider["model_name"], "qwen2.5:7b")

    def test_the_alias_goes_back_when_the_new_default_refuses_it(self):
        FakeApi.state["routers"][10] = FakeApi.router(10, "nexora-default")
        self.seed_provider(model="qwen2.5:7b")
        self.run_bootstrap(upstream={"router": "nexora-default", "url": "http://ollama:11434", "model": "qwen2.5:7b", "key": "none"})
        FakeApi.state["refuse_alias_on_create"] = True
        with self.assertRaises(bootstrap.BootstrapError):
            self.run_bootstrap(upstream={"router": "nexora-default", "url": "https://api.mistral.ai", "model": "mistral-small-latest", "key": "k"})
        self.assertIn("nexora-default", FakeApi.state["routers"][10]["aliases"])

    def test_admin_key_is_written_then_reused(self):
        self.run_bootstrap()
        admin_file = self.out.parent / "nexora-admin.env"
        first = admin_file.read_text()
        self.assertRegex(first, r"^export NEXORA_API_ADMIN_KEY=\S+\n$")
        self.assertEqual(oct(os.stat(admin_file).st_mode & 0o777), "0o600")
        key = first.strip().split("=", 1)[1]
        self.assertIn("admin", FakeApi.state["keys"][key]["permissions"])
        self.run_bootstrap()
        self.assertEqual(admin_file.read_text(), first)

    def test_a_transient_api_error_keeps_the_admin_key(self):
        self.run_bootstrap()
        admin_file = self.out.parent / "nexora-admin.env"
        first = admin_file.read_text()
        keys_before = len(FakeApi.state["keys"])
        FakeApi.state["me_unavailable"] = True
        self.run_bootstrap()
        self.assertEqual(admin_file.read_text(), first)
        self.assertEqual(len(FakeApi.state["keys"]), keys_before)

    def test_revoked_admin_key_is_replaced(self):
        admin_file = self.out.parent / "nexora-admin.env"
        admin_file.write_text("export NEXORA_API_ADMIN_KEY=revoked\n")
        self.run_bootstrap()
        key = admin_file.read_text().strip().split("=", 1)[1]
        self.assertNotEqual(key, "revoked")
        self.assertIn("admin", FakeApi.state["keys"][key]["permissions"])

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

    def test_a_chat_model_gets_time_to_answer_on_a_cpu(self):
        # A 7B model on a CPU-only server needs minutes for a long prompt (agents with tools).
        self.seed_provider()
        FakeApi.state["providers"][1].update({"timeout": 120, "model_hosting_zone": "FRA", "model_total_params": 7, "model_active_params": 7})
        self.run_bootstrap(upstream={"router": "m10", "url": "http://ollama:11434", "model": "qwen2.5:0.5b", "key": "none"})
        provider = FakeApi.state["providers"][1]
        self.assertEqual(provider["timeout"], bootstrap.CHAT_PROVIDER_TIMEOUT)
        self.assertGreaterEqual(bootstrap.CHAT_PROVIDER_TIMEOUT, 600)
        self.assertEqual((provider["model_hosting_zone"], provider["model_total_params"]), ("FRA", 7))

    def test_a_refused_timeout_update_does_not_hold_workstudio_back(self):
        self.seed_provider()
        FakeApi.state["providers"][1]["timeout"] = 120
        FakeApi.state["refuse_provider_update"] = True
        self.run_bootstrap(upstream={"router": "m10", "url": "http://ollama:11434", "model": "qwen2.5:0.5b", "key": "none"})
        self.assertTrue(self.out.exists())

    def test_a_new_chat_provider_gets_the_long_timeout(self):
        self.seed_provider()
        self.run_bootstrap(upstream={"router": "m10", "url": "http://host.docker.internal:18141", "model": "qwen2.5:7b", "key": "none"})
        (provider,) = self.providers_of(self.default_router())
        self.assertEqual(provider["timeout"], bootstrap.CHAT_PROVIDER_TIMEOUT)

    def test_leaves_an_unseeded_model_to_the_api(self):
        FakeApi.reset(routers=())
        self.run_bootstrap(upstream={"router": "nexora-default", "url": "http://x:1", "model": "m", "key": "none"})
        self.assertEqual((FakeApi.state["routers"], FakeApi.state["providers"]), ({}, {}))

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
        FakeApi.state["routers"][12] = FakeApi.router(12, "m12")
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

    def test_registers_the_local_transcription_service_once(self):
        key = self.run_bootstrap(voice=self.voice())
        self.assertEqual(self.run_bootstrap(voice=self.voice()), key)
        (router,) = self.transcription_routers()
        self.assertEqual((router["name"], router["aliases"]), ("whisper-small", []))
        (provider,) = self.providers_of(router)
        self.assertEqual(
            (provider["type"], provider["url"], provider["model_name"], provider["key"], provider["timeout"]),
            ("openai", self.url.lower() + "/", "Systran/faster-whisper-small", "none", 600),
        )
        self.assertEqual(FakeApi.state["downloads"], ["Systran/faster-whisper-small"] * 2)
        (role,) = FakeApi.state["roles"].values()
        self.assertIn((router["id"], "rpm"), {(l["router_id"], l["type"]) for l in role["limits"]})

    def test_a_transcription_service_that_does_not_answer_does_not_hold_workstudio_back(self):
        key = self.run_bootstrap(voice=self.voice(url="http://127.0.0.1:9"))
        self.assertEqual(FakeApi.state["keys"][key]["email"], bootstrap.WORKSTUDIO_EMAIL)
        self.assertEqual(self.transcription_routers(), [])

    def test_a_refused_transcription_provider_leaves_no_empty_router(self):
        FakeApi.state["unreachable_provider_url"] = self.url
        self.run_bootstrap(voice=self.voice())
        self.assertEqual(self.transcription_routers(), [])

    def test_names_the_transcription_model_after_its_size(self):
        self.assertEqual(bootstrap.transcription_router_name("Systran/faster-whisper-small"), "whisper-small")
        self.assertEqual(bootstrap.transcription_router_name("deepdml/faster-whisper-large-v3-turbo-ct2"), "whisper-large-v3-turbo-ct2")

    def test_fails_loudly_on_wrong_admin_password(self):
        with self.assertRaises(bootstrap.BootstrapError):
            self.run_bootstrap(password="wrong")
        self.assertFalse(self.out.exists())


if __name__ == "__main__":
    unittest.main()
