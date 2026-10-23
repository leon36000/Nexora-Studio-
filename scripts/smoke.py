"""End-to-end smoke test of a running Nexora platform (scripts/smoke.sh wraps it).

Usage: NEXORA_SMOKE_ADMIN_EMAIL=... NEXORA_SMOKE_ADMIN_PASSWORD=... \
       python3 -I scripts/smoke.py [--url http://localhost:3000] [--report smoke-report.json]
Creates a throwaway account, then checks, over real HTTP: the French interface, the five SME
templates in a new workspace, Nexora Connect and its tools, a run of every template through
Nexora API, the audit log, the usage dashboard and the model settings (adding a model needs
NEXORA_SMOKE_OPENAI_URL and NEXORA_SMOKE_OPENAI_MODEL, an OpenAI-compatible service Nexora API reaches). The last two are read by an owner or admin
of the instance organization (credentials from the environment, never the command line): a
throwaway account must not be able to read them. Standard library only. Exit 0 when all pass.
"""
from __future__ import annotations

import argparse
import base64
import http.cookiejar
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request

TEMPLATE_INPUTS = {
    "Devis client": {"client": "Boulangerie Martin, Lyon", "prestations": "Site vitrine : 1 x 2400 EUR HT"},
    "Relance de facture impayée": {"client": "Garage Durand", "facture": "F-2026-104", "montant": "1 250 EUR TTC", "echeance": "15/09/2026", "niveau": "2"},
    "Réponse support (FAQ)": {"question": "Livrez-vous le samedi ?", "faq": "Livraison du lundi au samedi, de 8h à 18h."},
    "Tri des e-mails entrants": {"email": "De : client@exemple.fr\nObjet : Facture en double\nBonjour, j'ai reçu deux fois la facture F-88."},
    "Compte rendu de réunion": {"transcription": "Paul : on lance la campagne le 3 novembre. Anne : je prépare le visuel pour vendredi."},
}


# 5×7 glyphs for the OCR check's test image (standard library only: no imaging package needed).
_GLYPHS = {
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    " ": ["00000"] * 7,
}


def text_png(text: str, scale: int = 14) -> bytes:
    """Black text on white, as an 8-bit greyscale PNG."""
    import struct
    import zlib

    columns = []
    for char in text:
        glyph = _GLYPHS[char]
        columns.extend([[row[c] == "1" for row in glyph] for c in range(5)])
        columns.append([False] * 7)
    margin = 3
    width, height = (len(columns) + 2 * margin) * scale, (7 + 2 * margin) * scale
    rows = []
    for y in range(height):
        gy = y // scale - margin
        line = bytearray([0])  # filter: none
        for x in range(width):
            gx = x // scale - margin
            ink = 0 <= gy < 7 and 0 <= gx < len(columns) and columns[gx][gy]
            line.append(0 if ink else 255)
        rows.append(bytes(line))
    chunk = lambda kind, data: struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


class _LocalSecureCookies(http.cookiejar.DefaultCookiePolicy):
    def return_ok_secure(self, cookie, request):
        return True


class Smoke:
    def __init__(self, url: str, origin: str | None = None):
        self.url = url.rstrip("/")
        self.origin = (origin or url).rstrip("/")
        # Talking to the local port of an HTTPS instance: its Secure session cookie must come back over http.
        local_https = self.origin.startswith("https://") and self.url.startswith("http://")
        self.jar = http.cookiejar.CookieJar(policy=_LocalSecureCookies() if local_https else None)
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.results: list[dict] = []

    def call(self, method: str, path: str, body: dict | None = None, timeout: int = 120, raw: bool = False,
             headers: dict | None = None, data: bytes | None = None, content_type: str = "application/json"):
        if data is None:
            data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(f"{self.url}{path}", data=data, method=method)
        request.add_header("Content-Type", content_type)
        for name, value in (headers or {}).items():
            request.add_header(name, value)
        request.add_header("Origin", self.origin)
        request.add_header("Accept-Language", "fr-FR,fr;q=0.9")
        try:
            with self.opener.open(request, timeout=timeout) as response:
                payload = response.read()
                return response.status, (payload.decode() if raw else json.loads(payload or b"{}"))
        except urllib.error.HTTPError as error:
            payload = error.read()
            try:
                return error.code, (payload.decode() if raw else json.loads(payload or b"{}"))
            except json.JSONDecodeError:
                return error.code, {}

    only: str | None = None
    # Checks every other one builds on: always run, even with --only.
    FOUNDATIONS = ("Inscription d'un compte", "Nouvel espace avec les modèles PME")

    def check(self, name: str, fn):
        if self.only and self.only.lower() not in name.lower() and name not in self.FOUNDATIONS:
            return None
        started = time.monotonic()
        try:
            detail = fn()
            status, error = "pass", None
        except Exception as exc:  # noqa: BLE001 - every failure is reported, not raised
            detail, status, error = None, "fail", str(exc)
        self.results.append({"check": name, "status": status, "seconds": round(time.monotonic() - started, 1), "detail": detail, "error": error})
        mark = "OK  " if status == "pass" else "FAIL"
        print(f"[{mark}] {name} ({self.results[-1]['seconds']} s){' — ' + str(detail) if detail else ''}{' — ' + error if error else ''}", flush=True)
        return detail


def require(condition: bool, message: str):
    if not condition:
        raise AssertionError(message)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--quick", action="store_true",
                        help="essential checks only; still signs up a throwaway account and leaves it with its workspace "
                             "(refused when sign-up is restricted). The account-free check after an update is « nexora check ».")
    parser.add_argument("--report")
    parser.add_argument("--origin", help="public address WorkStudio trusts, when --url is its local port")
    parser.add_argument("--only", help="run only the checks whose name contains this text (plus sign-up and workspace)")
    args = parser.parse_args()
    s = Smoke(args.url, args.origin)
    s.only = args.only
    email = f"smoke-{secrets.token_hex(4)}@nexora.test"
    password = secrets.token_hex(16)
    state: dict = {}

    def signup():
        status, body = s.call("POST", "/api/auth/sign-up/email", {"email": email, "password": password, "name": "Test Fumée"})
        require(status == 200 and body.get("user"), f"sign-up returned HTTP {status}")
        return email

    def french_ui():
        status, html = s.call("GET", "/login", raw=True)
        require(status == 200, f"/login returned HTTP {status}")
        require('<html lang="fr"' in html, "page is not served with lang=fr")
        require("Connexion" in html, "French title « Connexion » not found")
        require("Sim Studio" not in html and "sim.ai" not in html, "upstream brand found in the page")
        return 'lang="fr", « Connexion »'

    def workspace_with_templates():
        status, body = s.call("POST", "/api/workspaces", {"name": "Fumée Nexora"}, timeout=300)
        require(status == 200, f"workspace creation returned HTTP {status}")
        state["ws"] = body["workspace"]["id"]
        names: list[str] = []
        for _ in range(30):
            _, listing = s.call("GET", f"/api/workflows?workspaceId={state['ws']}")
            names = [w["name"] for w in listing.get("data", [])]
            if all(n in names for n in TEMPLATE_INPUTS):
                break
            time.sleep(2)
        missing = [n for n in TEMPLATE_INPUTS if n not in names]
        require(not missing, f"templates missing: {missing}")
        state["workflows"] = {w["name"]: w["id"] for w in listing["data"]}
        return f"{len(TEMPLATE_INPUTS)} modèles PME"

    def connect_tools():
        tools: list = []
        for _ in range(15):
            _, servers = s.call("GET", f"/api/mcp/servers?workspaceId={state['ws']}")
            if any(x["name"] == "Nexora Connect" for x in servers.get("data", {}).get("servers", [])):
                _, discovered = s.call("GET", f"/api/mcp/tools/discover?workspaceId={state['ws']}", timeout=180)
                tools = discovered.get("data", {}).get("tools", [])
                if tools:
                    break
            time.sleep(2)
        require(len(tools) >= 5, f"expected ≥ 5 Nexora Connect tools, got {len(tools)}")
        return f"{len(tools)} outils"

    def connectors():
        # A key-only service Nexora Connect stores without calling the provider: the smoke stays offline.
        service = "postmark"
        _, catalog = s.call("GET", f"/api/nexora/connectors?workspaceId={state['ws']}&q={service}", timeout=180)
        require(any(x.get("service") == service for x in catalog.get("services", [])), f"{service} missing from the catalog")
        _, detail = s.call("GET", f"/api/nexora/connectors/{service}?workspaceId={state['ws']}")
        fields = next((a.get("fields") or [] for a in detail.get("auth", []) if a.get("type") == "api_key"), [])
        require(fields, f"no API key form for {service}: {str(detail)[:200]}")
        status, body = s.call("POST", "/api/workspaces", {"name": "Fumée Nexora B"}, timeout=300)
        require(status == 200, f"second workspace creation returned HTTP {status}")
        ws_b = body["workspace"]["id"]
        workflows: list[str] = []

        def connect_server(ws: str) -> str:
            for _ in range(15):
                _, servers = s.call("GET", f"/api/mcp/servers?workspaceId={ws}")
                found = [x["id"] for x in servers.get("data", {}).get("servers", []) if x["name"] == "Nexora Connect"]
                if found:
                    return found[0]
                time.sleep(2)
            raise AssertionError(f"no Nexora Connect server in workspace {ws}")

        def connections_seen_from(ws: str) -> str:
            """Runs list_connections through the workspace's own Nexora Connect server, as a workflow does."""
            start, mcp = secrets.token_hex(8), secrets.token_hex(8)
            sub = lambda i, t, v: {"id": i, "type": t, "value": v}
            status, body = s.call("POST", "/api/workflows", {"name": f"Connecteurs de fumée {secrets.token_hex(3)}", "workspaceId": ws})
            require(status in (200, 201), f"workflow creation returned HTTP {status}")
            wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
            workflows.append(wf)
            state_body = {"blocks": {
                start: {"id": start, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                        "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [])}, "outputs": {}},
                mcp: {"id": mcp, "type": "mcp", "name": "Connexions", "position": {"x": 420, "y": 0}, "enabled": True,
                      "data": {"canonicalModes": {"server": "advanced", "tool": "advanced"}},
                      "subBlocks": {"operation": sub("operation", "dropdown", "run"),
                                    "serverReference": sub("serverReference", "short-input", connect_server(ws)),
                                    "toolReference": sub("toolReference", "short-input", "list_connections"),
                                    "arguments": sub("arguments", "mcp-dynamic-args", {"service": service})},
                      "outputs": {}}},
                "edges": [{"id": secrets.token_hex(8), "source": start, "target": mcp, "sourceHandle": "source", "targetHandle": "target"}],
                "loops": {}, "parallels": {}}
            status, body = s.call("PUT", f"/api/workflows/{wf}/state", state_body)
            require(status == 200, f"state save returned HTTP {status}: {str(body)[:200]}")
            status, body = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False, "input": "liste"}, timeout=300)
            require(status == 200 and body.get("success"), f"run returned HTTP {status}: {str(body.get('error'))[:200]}")
            return json.dumps(body.get("output"))

        name_a = f"ws-{state['ws']}"
        try:
            status, body = s.call("POST", f"/api/nexora/connectors/{service}", {
                "workspaceId": state["ws"], "authType": "api_key",
                "values": {f["key"]: f"fumee-{secrets.token_hex(8)}" for f in fields if f.get("required") or f.get("secret")}})
            require(status == 200, f"connection returned HTTP {status}: {str(body)[:200]}")
            _, detail = s.call("GET", f"/api/nexora/connectors/{service}?workspaceId={state['ws']}")
            require(detail.get("connection"), "workspace A does not show its connection")
            require("fumee-" not in json.dumps(detail), "the key came back to the browser")
            _, detail_b = s.call("GET", f"/api/nexora/connectors/{service}?workspaceId={ws_b}")
            require(not detail_b.get("connection"), "workspace B shows workspace A's connection")
            require(name_a in connections_seen_from(state["ws"]), "workspace A's tools do not see its connection")
            require(name_a not in connections_seen_from(ws_b), "workspace B's tools see workspace A's connection")
            status, _ = s.call("DELETE", f"/api/nexora/connectors/{service}?workspaceId={state['ws']}")
            require(status == 200, f"disconnection returned HTTP {status}")
            require(name_a not in connections_seen_from(state["ws"]), "connection still visible after disconnection")
            return f"{service} connecté dans A, invisible depuis B, déconnecté"
        finally:
            s.call("DELETE", f"/api/nexora/connectors/{service}?workspaceId={state['ws']}")
            for wf in workflows:
                s.call("DELETE", f"/api/workflows/{wf}")
            s.call("DELETE", f"/api/workspaces/{ws_b}")

    def assistant():
        status, body = s.call("GET", f"/api/nexora/assistant/agents?workspaceId={state['ws']}", timeout=300)
        require(status == 200 and body.get("agents"), f"agents returned HTTP {status}: {str(body)[:200]}")
        agent = body["agents"][0]
        question = "Bonjour, en une phrase : à quoi sers-tu ?"
        status, body = s.call("POST", "/api/nexora/assistant/conversations", {
            "workspaceId": state["ws"], "workflowId": agent["workflowId"], "firstMessage": question})
        require(status == 201, f"conversation creation returned HTTP {status}: {str(body)[:200]}")
        conversation = body["conversation"]["id"]
        path = f"/api/nexora/assistant/conversations/{conversation}"
        try:
            s.call("POST", f"{path}/messages", {"role": "user", "content": question})
            status, text = s.call("POST", f"/api/chat/{agent['chatIdentifier']}", {"input": question, "conversationId": conversation}, raw=True, timeout=300)
            require(status == 200 and "data:" in text, f"agent chat returned HTTP {status}: {text[:200]}")
            answer = "".join(
                str(json.loads(line[5:]).get("chunk", "")) for line in text.splitlines()
                if line.startswith("data:") and line[5:].strip().startswith("{"))
            require(len(answer.strip()) > 10, f"no streamed answer: {text[:200]}")
            status, _ = s.call("POST", f"{path}/messages", {"role": "assistant", "content": answer})
            require(status == 201, f"answer storage returned HTTP {status}")
            _, detail = s.call("GET", path)
            require([m["role"] for m in detail.get("messages", [])] == ["user", "assistant"], f"history not kept: {str(detail)[:200]}")
            status, _ = Smoke(args.url, args.origin).call("POST", f"/api/chat/{agent['chatIdentifier']}", {"input": question}, raw=True)
            require(status in (401, 403), f"members-only chat answered an anonymous visitor (HTTP {status})")
            admin_organization()
            status, _ = admin.call("GET", path)
            require(status == 404, f"another member reads the conversation (HTTP {status})")
            return f"« {agent['name']} » répond en flux ({len(answer)} caractères), historique relu, cloisonné"
        finally:
            s.call("DELETE", path)

    def knowledge_base():
        status, body = s.call("POST", "/api/users/me/api-keys", {"name": f"fumee-{secrets.token_hex(3)}"})
        require(status in (200, 201), f"API key creation returned HTTP {status}")
        key = (body.get("key") or {}).get("key") if isinstance(body.get("key"), dict) else body.get("key") or (body.get("data") or {}).get("key")
        require(isinstance(key, str) and key, "no API key in the response")
        auth = {"x-api-key": key}
        status, body = s.call("POST", "/api/v1/knowledge", {"workspaceId": state["ws"], "name": "Fumée connaissances"}, headers=auth)
        require(status in (200, 201), f"knowledge base creation returned HTTP {status}: {str(body)[:200]}")
        data = body.get("data") or body
        kb_id = (data.get("knowledgeBase") or data).get("id")
        require(kb_id, f"no knowledge base id: {str(body)[:200]}")
        boundary = f"nexora{secrets.token_hex(8)}"
        text = "Horaires de livraison\n\nNexora livre ses clients le samedi de 8 h à 18 h, et en semaine de 7 h à 19 h.\n"
        form = (
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"workspaceId\"\r\n\r\n{state['ws']}\r\n"
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"livraison.txt\"\r\n"
            f"Content-Type: text/plain\r\n\r\n{text}\r\n--{boundary}--\r\n"
        ).encode()
        status, body = s.call("POST", f"/api/v1/knowledge/{kb_id}/documents", headers=auth, data=form,
                              content_type=f"multipart/form-data; boundary={boundary}", timeout=180)
        require(status in (200, 201, 202), f"document upload returned HTTP {status}: {str(body)[:200]}")
        deadline = time.monotonic() + 240
        state_seen = None
        while time.monotonic() < deadline:
            _, listing = s.call("GET", f"/api/v1/knowledge/{kb_id}/documents?workspaceId={state['ws']}", headers=auth)
            docs = (listing.get("data") or {}).get("documents") or []
            state_seen = [(d.get("processingStatus"), d.get("processingError")) for d in docs]
            if docs and all(d.get("processingStatus") == "completed" for d in docs):
                break
            require(not any(d.get("processingStatus") == "failed" for d in docs), f"indexing failed: {state_seen}")
            time.sleep(5)
        else:
            raise AssertionError(f"indexing did not finish in time: {state_seen}")
        status, body = s.call("POST", "/api/v1/knowledge/search", {"workspaceId": state["ws"], "knowledgeBaseIds": kb_id, "query": "Quand livrez-vous le samedi ?", "topK": 3}, headers=auth)
        require(status == 200, f"search returned HTTP {status}: {str(body)[:200]}")
        results = (body.get("data") or {}).get("results") or []
        require(any("samedi" in (r.get("content") or "") for r in results), f"the passage was not found: {str(results)[:300]}")
        return f"{len(results)} passage(s), embeddings locaux"

    def schedule():
        status, body = s.call("POST", "/api/workflows", {"name": "Fumée planifiée", "workspaceId": state["ws"]})
        require(status in (200, 201), f"workflow creation returned HTTP {status}: {str(body)[:200]}")
        wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
        require(wf, f"no workflow id: {str(body)[:200]}")
        block = secrets.token_hex(8)
        sub = lambda i, t, v: {"id": i, "type": t, "value": v}
        state_body = {"blocks": {block: {
            "id": block, "type": "schedule", "name": "Planification", "position": {"x": 0, "y": 0}, "enabled": True,
            "subBlocks": {"scheduleType": sub("scheduleType", "dropdown", "minutes"),
                          "minutesInterval": sub("minutesInterval", "short-input", "1"),
                          "timezone": sub("timezone", "dropdown", "UTC")},
            "outputs": {}}}, "edges": [], "loops": {}, "parallels": {}}
        status, body = s.call("PUT", f"/api/workflows/{wf}/state", state_body)
        require(status == 200, f"state save returned HTTP {status}: {str(body)[:200]}")
        status, body = s.call("POST", f"/api/workflows/{wf}/deploy", {})
        require(status == 200, f"deploy returned HTTP {status}: {str(body)[:200]}")
        try:
            deadline, seen = time.monotonic() + 180, None
            while time.monotonic() < deadline:
                _, body = s.call("GET", f"/api/schedules?workflowId={wf}")
                seen = body.get("schedule") or {}
                if seen.get("lastRanAt"):
                    return f"exécuté à {seen['lastRanAt']}"
                time.sleep(10)
            raise AssertionError(f"the scheduled workflow never ran (cron missing?): {str(seen)[:200]}")
        finally:
            # A schedule left behind would run every minute forever.
            s.call("DELETE", f"/api/workflows/{wf}")

    def wand():
        status, body = s.call("POST", "/api/wand", {"prompt": "Écris un objet d'e-mail court pour relancer une facture impayée.", "workspaceId": state["ws"], "stream": False}, timeout=300)
        require(status == 200 and body.get("success") and (body.get("content") or "").strip(), f"wand returned HTTP {status}: {str(body)[:200]}")
        return f"« {body['content'].strip()[:60]} »"

    def public_chat():
        status, html = s.call("GET", f"/chat/fumee-{secrets.token_hex(3)}", raw=True)
        require(status in (200, 404), f"/chat returned HTTP {status}")
        require('lang="fr"' in html, "the public chat page is not served in French")
        require("Ask me anything" not in html and "Chat not found" not in html, "English text left on the public chat page")
        return f'lang="fr" (HTTP {status})'

    def web_search():
        status, body = s.call("POST", "/api/workflows", {"name": "Fumée recherche web", "workspaceId": state["ws"]})
        require(status in (200, 201), f"workflow creation returned HTTP {status}")
        wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
        start, search = secrets.token_hex(8), secrets.token_hex(8)
        sub = lambda i, t, v: {"id": i, "type": t, "value": v}
        blocks = {
            start: {"id": start, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                    "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [])}, "outputs": {}},
            search: {"id": search, "type": "searxng", "name": "Recherche", "position": {"x": 400, "y": 0}, "enabled": True,
                     "subBlocks": {"query": sub("query", "long-input", "Nexora PME"), "maxResults": sub("maxResults", "short-input", "3")}, "outputs": {}},
        }
        edges = [{"id": secrets.token_hex(8), "source": start, "target": search, "sourceHandle": "source", "targetHandle": "target"}]
        status, body = s.call("PUT", f"/api/workflows/{wf}/state", {"blocks": blocks, "edges": edges, "loops": {}, "parallels": {}})
        require(status == 200, f"state save returned HTTP {status}: {str(body)[:200]}")
        status, body = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False, "input": {}}, timeout=180)
        require(status == 200, f"run returned HTTP {status}: {str(body)[:300]}")
        text = json.dumps(body)
        require('"results"' in text and "http" in text, f"no search result: {text[:300]}")
        return "résultats reçus de SearXNG"

    def run_template(name: str):
        def run():
            status, body = s.call("POST", f"/api/workflows/{state['workflows'][name]}/execute", {"useDraftState": True, "stream": False, "input": TEMPLATE_INPUTS[name]}, timeout=600)
            require(status == 200 and body.get("success"), f"run returned HTTP {status}: {str(body.get('error'))[:200]}")
            content = str((body.get("output") or {}).get("content", "")).strip()
            require(len(content) > 40, "empty answer from the model")
            return f"{len(content)} caractères"
        return run

    def usage():
        # Instance-wide figures: reserved to owners and admins of the instance organization.
        status, _ = s.call("GET", "/api/nexora/usage?days=7")
        require(status == 403, f"usage visible to a plain member (HTTP {status})")
        admin_organization()
        status, body = admin.call("GET", "/api/nexora/usage?days=7")
        require(status == 200, f"usage returned HTTP {status}")
        require(body["totals"]["requests"] > 0, "no request metered by Nexora API")
        return f"{body['totals']['requests']} requêtes, {body['totals']['totalTokens']} jetons"

    admin = Smoke(args.url, args.origin)

    def admin_organization() -> str:
        if "org" not in state:
            admin_email = os.environ.get("NEXORA_SMOKE_ADMIN_EMAIL", "")
            admin_password = os.environ.get("NEXORA_SMOKE_ADMIN_PASSWORD", "")
            require(admin_email and admin_password, "set NEXORA_SMOKE_ADMIN_EMAIL and NEXORA_SMOKE_ADMIN_PASSWORD (an owner or admin of the instance organization)")
            status, _ = admin.call("POST", "/api/auth/sign-in/email", {"email": admin_email, "password": admin_password})
            require(status == 200, f"admin sign-in returned HTTP {status}")
            _, body = admin.call("GET", "/api/organizations")
            organizations = body.get("organizations", [])
            require(len(organizations) == 1, f"the admin should own or administer one organization, not {len(organizations)}")
            state["org"] = organizations[0]["id"]
        return state["org"]

    def reader_workflow(name: str, block_type: str, field: str, canonical: str, sub_blocks: dict) -> str:
        """A Start with one file field feeding one Nexora reader block (as the « Capturer » cards build)."""
        sub = lambda i, t, v: {"id": i, "type": t, "value": v}
        status, body = s.call("POST", "/api/workflows", {"name": f"{name} {secrets.token_hex(3)}", "workspaceId": state["ws"]})
        require(status in (200, 201), f"workflow creation returned HTTP {status}")
        wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
        start, reader = secrets.token_hex(8), secrets.token_hex(8)
        status, _ = s.call("PUT", f"/api/workflows/{wf}/state", {"blocks": {
            start: {"id": start, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                    "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [{"id": secrets.token_hex(4), "name": field, "type": "file[]", "value": ""}])}, "outputs": {}},
            reader: {"id": reader, "type": block_type, "name": "Lecture", "position": {"x": 420, "y": 0}, "enabled": True,
                     "subBlocks": {k: sub(k, t, v) for k, (t, v) in sub_blocks.items()}, "outputs": {}, "data": {"canonicalModes": {canonical: "advanced"}}}},
            "edges": [{"id": secrets.token_hex(8), "source": start, "target": reader, "sourceHandle": "source", "targetHandle": "target"}], "loops": {}, "parallels": {}})
        require(status == 200, f"state save returned HTTP {status}")
        return wf

    def ocr():
        if not usages().get("vision"):
            return "non testé : aucun modèle « Vision / OCR » (Réglages › Modèles)"
        wf = reader_workflow("Lecture de fumée", "mistral_parse_v3", "document", "file",
                             {"provider": ("dropdown", "nexora"), "fileReference": ("short-input", "<start.document>"), "resultType": ("dropdown", "markdown")})
        try:
            image = base64.b64encode(text_png("NEXORA 2026")).decode()
            status, run = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False,
                                 "input": {"document": [{"name": "fumee.png", "mimeType": "image/png", "data": image}]}}, timeout=900)
            require(status == 200 and run.get("success"), f"OCR run returned HTTP {status}: {str(run.get('error'))[:200]}")
            read = json.dumps(run.get("output"), ensure_ascii=False).upper()
            # A small local vision model may misread a letter of the pixel font; the figures are enough.
            require("2026" in read, f"the image text was not read: {read[:200]}")
            require("HERE IS" not in read and "```" not in read, f"the model's wrapping was kept: {read[:200]}")
            return "texte d'une image relu par le modèle de vision local, sans préambule"
        finally:
            s.call("DELETE", f"/api/workflows/{wf}")

    def transcription():
        audio, expected = os.environ.get("NEXORA_SMOKE_AUDIO", ""), os.environ.get("NEXORA_SMOKE_AUDIO_TEXT", "")
        if not usages().get("transcription"):
            return "non testé : aucun modèle « Transcription » (Réglages › Modèles)"
        if not audio:
            return "non testé : NEXORA_SMOKE_AUDIO (fichier audio en français) absent"
        wf = reader_workflow("Transcription de fumée", "stt_v2", "enregistrement", "audioFile",
                             {"provider": ("dropdown", "nexora"), "audioFileReference": ("short-input", "<start.enregistrement>"), "language": ("dropdown", "fr")})
        try:
            data = base64.b64encode(open(audio, "rb").read()).decode()
            mime = "audio/wav" if audio.endswith(".wav") else "audio/mpeg"
            status, run = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False,
                                 "input": {"enregistrement": [{"name": os.path.basename(audio), "mimeType": mime, "data": data}]}}, timeout=900)
            require(status == 200 and run.get("success"), f"transcription run returned HTTP {status}: {str(run.get('error'))[:200]}")
            text = str((run.get("output") or {}).get("transcript", ""))
            require(len(text) > 10 and (not expected or expected.lower() in text.lower()), f"unexpected transcript: {text[:200]}")
            return f"« {text[:60]}… »"
        finally:
            s.call("DELETE", f"/api/workflows/{wf}")

    def usages() -> dict:
        _, home = s.call("GET", f"/api/nexora/home?workspaceId={state['ws']}")
        return home.get("modelUsages") or {}

    def copilot():
        description = "Quand je lance le workflow avec un texte, un agent le résume en une phrase en français."
        status, body = s.call("POST", "/api/nexora/copilot/plan", {"workspaceId": state["ws"], "description": description}, timeout=600)
        require(status == 200 and body.get("plan"), f"plan returned HTTP {status}: {str(body)[:300]}")
        plan = body["plan"]
        status, created = s.call("POST", "/api/nexora/copilot/create", {"workspaceId": state["ws"], "plan": plan})
        require(status == 200 and created.get("workflowId"), f"creation returned HTTP {status}: {str(created)[:300]}")
        wf = created["workflowId"]
        try:
            text = "La réunion de lundi a fixé la livraison au 15 novembre et le budget à 12 000 euros."
            fields = [f["name"] for f in (plan.get("trigger") or {}).get("fields") or []]
            run_input = {name: text for name in fields} if fields else text
            status, run = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False, "input": run_input}, timeout=600)
            # A plan ending with a « réponse » step answers with that step's body instead of {success, output}.
            require(status == 200 and run.get("success") is not False and not run.get("error"), f"generated workflow run returned HTTP {status}: {str(run)[:200]}")
            require(len(json.dumps(run, ensure_ascii=False)) > 40, f"empty answer from the generated workflow: {str(run)[:200]}")
            return f"« {plan.get('title', '?')} » : {len(plan.get('steps', []))} étape(s), créé et exécuté"
        finally:
            s.call("DELETE", f"/api/workflows/{wf}")

    def budgets():
        # A tiny workspace budget refuses the next run; raising it lets runs through again.
        admin_organization()
        name = "Devis client"
        run = lambda: s.call("POST", f"/api/workflows/{state['workflows'][name]}/execute",
                             {"useDraftState": True, "stream": False, "input": TEMPLATE_INPUTS[name]}, timeout=600)
        status, body = run()  # the workspace has used some tokens this month, so a 1-token cap is reached
        require(status == 200 and body.get("success"), f"first run returned HTTP {status}: {str(body.get('error'))[:200]}")
        try:
            status, body = admin.call("PUT", "/api/nexora/budgets", {"workspaceMonthlyTokens": {state["ws"]: 1}})
            require(status == 200, f"budget save returned HTTP {status}: {str(body)[:200]}")
            status, body = run()
            require(status == 402, f"run over budget returned HTTP {status}: {str(body)[:200]}")
            require("Budget mensuel" in json.dumps(body, ensure_ascii=False), f"refusal message is not the French one: {str(body)[:200]}")
            _, view = admin.call("GET", "/api/nexora/budgets")
            alerts = [a for a in view.get("alerts", []) if a.get("workspaceId") == state["ws"] and a.get("level") == "exhausted"]
            require(alerts, f"no budget alert recorded for the workspace: {str(view.get('alerts'))[:200]}")
        finally:
            admin.call("PUT", "/api/nexora/budgets", {"workspaceMonthlyTokens": {state["ws"]: None}})
        status, body = run()
        require(status == 200 and body.get("success"), f"run after raising the cap returned HTTP {status}: {str(body.get('error'))[:200]}")
        return "plafond minuscule ⇒ alerte enregistrée et refus 402 en français, plafond retiré ⇒ exécution acceptée"

    def governance():
        # Instance settings: administrators only, secrets never returned, SMTP test e-mail.
        status, _ = s.call("GET", "/api/nexora/settings")
        require(status == 403, f"instance settings visible to a plain member (HTTP {status})")
        admin_organization()
        status, view = admin.call("GET", "/api/nexora/settings")
        require(status == 200, f"settings returned HTTP {status}")
        done = ["réservés aux administrateurs"]
        smtp_host = os.environ.get("NEXORA_SMOKE_SMTP_HOST", "")
        if smtp_host and not view.get("smtp") and not view["envOverrides"]["smtp"]:
            draft = {"host": smtp_host, "port": int(os.environ.get("NEXORA_SMOKE_SMTP_PORT", "1025")),
                     "user": "fumee", "password": f"fumee-{secrets.token_hex(8)}", "from": "nexora@nexora.test"}
            status, result = admin.call("POST", "/api/nexora/settings/test-email", {"smtp": draft}, timeout=60)
            require(status == 200 and result.get("ok"), f"test e-mail failed: {str(result)[:200]}")
            mailbox = os.environ.get("NEXORA_SMOKE_MAILPIT_URL", "")
            if mailbox:
                with urllib.request.urlopen(f"{mailbox.rstrip('/')}/api/v1/messages", timeout=30) as response:
                    received = json.loads(response.read())
                require(any(result["sentTo"] in json.dumps(m.get("To")) for m in received.get("messages", [])),
                        "the test e-mail did not reach the local mailbox")
            try:
                status, saved = admin.call("PUT", "/api/nexora/settings", {"smtp": draft})
                require(status == 200, f"settings save returned HTTP {status}: {str(saved)[:200]}")
                _, reread = admin.call("GET", "/api/nexora/settings")
                require(reread["smtp"] and reread["smtp"].get("hasPassword"), f"stored SMTP not reported: {str(reread)[:200]}")
                require(draft["password"] not in json.dumps(reread), "the SMTP password came back to the browser")
            finally:
                admin.call("PUT", "/api/nexora/settings", {"smtp": None})
            done.append(f"e-mail de test reçu par {smtp_host}, mot de passe chiffré jamais renvoyé")
        else:
            done.append("e-mail non testé (NEXORA_SMOKE_SMTP_HOST absent ou SMTP déjà configuré)")
        return ", ".join(done)

    def audit():
        status, _ = s.call("POST", "/api/organizations", {"name": "Dissidente", "slug": f"dissidente-{secrets.token_hex(3)}"}, timeout=180)
        require(status == 409, f"a member could found a second organization (HTTP {status})")
        _, logs = admin.call("GET", f"/api/audit-logs?organizationId={admin_organization()}&limit=50")
        entries = [(e["action"], e.get("actorEmail")) for e in logs.get("data", [])]
        require(("workspace.created", email) in entries, f"audit log does not show the member's new workspace: {entries[:10]}")
        return "workspace.created du membre tracé"

    def models():
        status, _ = s.call("GET", "/api/nexora/models")
        require(status == 403, f"models visible to a plain member (HTTP {status})")
        admin_organization()
        status, body = admin.call("GET", "/api/nexora/models")
        require(status == 200, f"models returned HTTP {status}: {body}")
        defaults = [m for m in body["models"] if m["isDefault"]]
        require(len(defaults) == 1, f"expected one default model, got {[m['name'] for m in defaults]}")
        original = defaults[0]
        url, name = os.environ.get("NEXORA_SMOKE_OPENAI_URL", ""), os.environ.get("NEXORA_SMOKE_OPENAI_MODEL", "")
        if not (url and name):
            return f"{len(body['models'])} modèle(s), défaut {original['name']} (ajout non testé : NEXORA_SMOKE_OPENAI_URL/MODEL absents)"
        alias = name
        existing = next((m for m in body["models"] if m["name"] == alias), None)
        if existing:  # already added by an administrator: tested and moved, but kept
            model_id = existing["id"]
        else:
            status, added = admin.call("POST", "/api/nexora/models", {"source": "openai-compatible", "model": alias, "url": url}, timeout=180)
            require(status == 200, f"adding {alias} returned HTTP {status}: {added}")
            model_id = added["model"]["id"]
        try:
            status, tested = admin.call("POST", f"/api/nexora/models/{model_id}/test", timeout=300)
            require(status == 200 and tested.get("reply"), f"testing {alias} returned HTTP {status}: {tested}")
            status, _ = admin.call("POST", f"/api/nexora/models/{model_id}/default")
            require(status == 200, f"making {alias} the default returned HTTP {status}")
            _, body = admin.call("GET", "/api/nexora/models")
            require([m["id"] for m in body["models"] if m["isDefault"]] == [model_id], "the default did not move")
            status, refused = admin.call("DELETE", f"/api/nexora/models/{model_id}")
            require(status == 409 and refused.get("error") == "is-default", f"the default model could be removed (HTTP {status})")
        finally:
            admin.call("POST", f"/api/nexora/models/{original['id']}/default")
            status = 200 if existing else admin.call("DELETE", f"/api/nexora/models/{model_id}")[0]
        require(status == 200, f"removing {alias} returned HTTP {status}")
        _, body = admin.call("GET", "/api/nexora/models")
        require([m["id"] for m in body["models"] if m["isDefault"]] == [original["id"]], "the default did not come back")
        return f"{alias} {'déjà présent' if existing else 'ajouté'}, testé ({tested['latencyMs']} ms), défaut aller-retour{'' if existing else ', retiré'}"

    def home():
        status, html = s.call("GET", f"/workspace/{state['ws']}/home", raw=True)
        require(status == 200, f"home page returned HTTP {status}")
        for text in ("Démarrages rapides", "État de la plateforme", "Créer"):
            require(text in html, f"the Nexora home lacks « {text} »")
        status, body = s.call("GET", "/api/nexora/home")
        require(status == 200 and body.get("defaultModel"), f"home status returned HTTP {status}: {body}")
        require(body["isInstanceAdmin"] is False and body["onboarding"] is None, "a plain member sees the first launch")
        default_model = body["defaultModel"]
        status, _ = s.call("PATCH", "/api/nexora/onboarding", {"dismissed": True})
        require(status == 403, f"a plain member could change the first launch (HTTP {status})")
        admin_organization()
        status, body = admin.call("GET", "/api/nexora/home")
        require(status == 200 and body["isInstanceAdmin"] and body["onboarding"] is not None, f"admin home status: {body}")
        before = body["onboarding"]
        status, body = admin.call("PATCH", "/api/nexora/onboarding", {"dismissed": before["dismissed"]})
        require(status == 200 and body["onboarding"] == before, f"admin progress update returned HTTP {status}: {body}")
        return f"modèle par défaut {default_model}, premier lancement : {len(before['completed'])}/5 étapes"

    def playground():
        status, text = s.call("POST", "/api/nexora/playground", {
            "workspaceId": state["ws"], "model": "vllm/nexora-default",
            "messages": [{"role": "user", "content": "Dis bonjour en une phrase."}],
            "temperature": 0.2, "maxTokens": 60}, raw=True, timeout=300)
        require(status == 200, f"playground returned HTTP {status}: {text[:200]}")
        events = [json.loads(line[5:]) for line in text.splitlines() if line.startswith("data:")]
        answer = "".join(e.get("chunk", "") for e in events)
        done = [e for e in events if e.get("done")]
        require(answer.strip() and done and not done[-1].get("error"), f"no streamed answer: {text[:200]}")
        usage = done[-1].get("usage") or {}
        return f"« {answer.strip()[:50]} » ({usage.get('completionTokens', '?')} jetons)"

    def agent():
        status, body = s.call("POST", "/api/workflows", {"name": "Agent de fumée", "workspaceId": state["ws"]})
        require(status in (200, 201), f"workflow creation returned HTTP {status}")
        wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
        start, agent_id = secrets.token_hex(8), secrets.token_hex(8)
        sub = lambda i, t, v: {"id": i, "type": t, "value": v}
        def agent_state(instructions):
            return {"blocks": {
                start: {"id": start, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                        "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [])}, "outputs": {}},
                agent_id: {"id": agent_id, "type": "agent", "name": "Agent", "position": {"x": 420, "y": 0}, "enabled": True,
                           "subBlocks": {"messages": sub("messages", "messages-input", [{"role": "system", "content": instructions}, {"role": "user", "content": "<start.input>"}]),
                                         "model": sub("model", "combobox", "vllm/nexora-default"),
                                         "memoryType": sub("memoryType", "dropdown", "conversation"),
                                         "conversationId": sub("conversationId", "short-input", "<start.conversationId>")},
                           "outputs": {}}},
                "edges": [{"id": secrets.token_hex(8), "source": start, "target": agent_id, "sourceHandle": "source", "targetHandle": "target"}],
                "loops": {}, "parallels": {}}
        identifier = f"agent-fumee-{secrets.token_hex(4)}"
        try:
            status, body = s.call("PUT", f"/api/workflows/{wf}/state", agent_state("Tu es l'agent d'accueil d'une PME. Réponds en français, en une phrase."))
            require(status == 200, f"state save returned HTTP {status}: {str(body)[:200]}")
            status, body = s.call("POST", f"/api/workflows/{wf}/deploy", {})
            require(status == 200, f"deploy returned HTTP {status}: {str(body)[:200]}")
            status, body = s.call("POST", "/api/chat", {
                "workflowId": wf, "identifier": identifier, "title": "Agent de fumée", "authType": "public",
                "customizations": {"primaryColor": "#1f2937", "welcomeMessage": "Bonjour"},
                "outputConfigs": [{"blockId": agent_id, "path": "content"}]})
            require(status in (200, 201), f"chat publication returned HTTP {status}: {str(body)[:200]}")
            status, text = s.call("POST", f"/api/chat/{identifier}", {"input": "Bonjour, qui es-tu ?", "conversationId": secrets.token_hex(8)}, raw=True, timeout=300)
            require(status == 200 and len(text.strip()) > 20, f"published chat returned HTTP {status}: {text[:200]}")
            status, _ = s.call("PUT", f"/api/workflows/{wf}/state", agent_state("Tu es l'agent d'accueil. Réponds en anglais."))
            status, body = s.call("POST", f"/api/workflows/{wf}/deploy", {})
            require(status == 200, f"second deploy returned HTTP {status}")
            _, body = s.call("GET", f"/api/workflows/{wf}/deployments")
            versions = body.get("versions") or body.get("data") or []
            require(len(versions) >= 2, f"expected two versions, got {str(body)[:200]}")
            return f"publié ({identifier}), chat public répond, {len(versions)} versions"
        finally:
            s.call("DELETE", f"/api/workflows/{wf}")

    if args.quick:
        # On demand (operators): the platform answers in French, a workspace gets its templates, a
        # template runs through the model. Needs no admin credentials, but signs up an account:
        # `nexora update` and `nexora restore` use the account-free `nexora check` instead.
        s.check("Inscription d'un compte", signup)
        s.check("Interface en français, sans marque tierce", french_ui)
        s.check("Nouvel espace avec les modèles PME", workspace_with_templates)
        s.check("Exécution du modèle « Devis client »", run_template("Devis client"))
        failed = [r for r in s.results if r["status"] != "pass"]
        print(f"\n{len(s.results) - len(failed)}/{len(s.results)} contrôles réussis (rapide)")
        return 1 if failed else 0

    s.check("Inscription d'un compte", signup)
    s.check("Interface en français, sans marque tierce", french_ui)
    s.check("Nouvel espace avec les modèles PME", workspace_with_templates)
    s.check("Accueil Nexora (cartes, état, premier lancement)", home)
    s.check("Nexora Connect et ses outils MCP", connect_tools)
    s.check("Connecteurs : connexion d'espace cloisonnée", connectors)
    s.check("Base de connaissances (embeddings locaux)", knowledge_base)
    s.check("Planification (cron)", schedule)
    s.check("Générer avec l'IA (modèle Nexora)", wand)
    s.check("Chat public en français", public_chat)
    s.check("Playground (réponse en flux)", playground)
    s.check("Agent : publication, chat public, versions", agent)
    s.check("Assistant : conversation en flux, historique, cloisonnement", assistant)
    if os.environ.get("NEXORA_SMOKE_WEB_SEARCH") == "1":
        s.check("Recherche web (SearXNG)", web_search)
    for name in TEMPLATE_INPUTS:
        s.check(f"Exécution du modèle « {name} »", run_template(name))
    s.check("Lecture de document (OCR, modèle de vision local)", ocr)
    s.check("Transcription vocale (modèle local)", transcription)
    s.check("Copilote : description ⇒ workflow exécuté", copilot)
    s.check("Budgets : refus au plafond, reprise après relèvement", budgets)
    s.check("Journal d'audit", audit)
    s.check("Gouvernance : réglages d'instance, e-mail de test", governance)
    s.check("Consommation mesurée par Nexora API", usage)
    s.check("Modèles : liste, ajout, test, défaut, retrait", models)

    failed = [r for r in s.results if r["status"] != "pass"]
    print(f"\n{len(s.results) - len(failed)}/{len(s.results)} contrôles réussis")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump({"url": s.url, "results": s.results}, handle, ensure_ascii=False, indent=2)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
