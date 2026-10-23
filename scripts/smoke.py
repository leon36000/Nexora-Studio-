"""End-to-end smoke test of a running Nexora platform (scripts/smoke.sh wraps it).

Usage: NEXORA_SMOKE_ADMIN_EMAIL=... NEXORA_SMOKE_ADMIN_PASSWORD=... \
       python3 -I scripts/smoke.py [--url http://localhost:3000] [--report smoke-report.json]
Creates a throwaway account, then checks, over real HTTP: the French interface, the five SME
templates in a new workspace, Nexora Connect and its tools, a run of every template through
Nexora API, the audit log and the usage dashboard. The last two are read by an owner or admin
of the instance organization (credentials from the environment, never the command line): a
throwaway account must not be able to read them. Standard library only. Exit 0 when all pass.
"""
from __future__ import annotations

import argparse
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


class Smoke:
    def __init__(self, url: str):
        self.url = url.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
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
        request.add_header("Origin", self.url)
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

    def check(self, name: str, fn):
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
    parser.add_argument("--report")
    args = parser.parse_args()
    s = Smoke(args.url)
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
        deadline, seen = time.monotonic() + 180, None
        while time.monotonic() < deadline:
            _, body = s.call("GET", f"/api/schedules?workflowId={wf}")
            seen = body.get("schedule") or {}
            if seen.get("lastRanAt"):
                return f"exécuté à {seen['lastRanAt']}"
            time.sleep(10)
        raise AssertionError(f"the scheduled workflow never ran (cron missing?): {str(seen)[:200]}")

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

    admin = Smoke(args.url)

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

    def audit():
        status, _ = s.call("POST", "/api/organizations", {"name": "Dissidente", "slug": f"dissidente-{secrets.token_hex(3)}"}, timeout=180)
        require(status == 409, f"a member could found a second organization (HTTP {status})")
        _, logs = admin.call("GET", f"/api/audit-logs?organizationId={admin_organization()}&limit=50")
        entries = [(e["action"], e.get("actorEmail")) for e in logs.get("data", [])]
        require(("workspace.created", email) in entries, f"audit log does not show the member's new workspace: {entries[:10]}")
        return "workspace.created du membre tracé"

    s.check("Inscription d'un compte", signup)
    s.check("Interface en français, sans marque tierce", french_ui)
    s.check("Nouvel espace avec les modèles PME", workspace_with_templates)
    s.check("Nexora Connect et ses outils MCP", connect_tools)
    s.check("Base de connaissances (embeddings locaux)", knowledge_base)
    s.check("Planification (cron)", schedule)
    for name in TEMPLATE_INPUTS:
        s.check(f"Exécution du modèle « {name} »", run_template(name))
    s.check("Journal d'audit", audit)
    s.check("Consommation mesurée par Nexora API", usage)

    failed = [r for r in s.results if r["status"] != "pass"]
    print(f"\n{len(s.results) - len(failed)}/{len(s.results)} contrôles réussis")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump({"url": s.url, "results": s.results}, handle, ensure_ascii=False, indent=2)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
