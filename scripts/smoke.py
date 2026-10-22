"""End-to-end smoke test of a running Nexora platform (scripts/smoke.sh wraps it).

Usage: python3 -I scripts/smoke.py [--url http://localhost:3000] [--report smoke-report.json]
Creates a throwaway account, then checks, over real HTTP: the French interface, the five SME
templates in a new workspace, Nexora Connect and its tools, a run of every template through
Nexora API, the usage dashboard, and the audit log. Standard library only. Exit 0 when all pass.
"""
from __future__ import annotations

import argparse
import http.cookiejar
import json
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

    def call(self, method: str, path: str, body: dict | None = None, timeout: int = 120, raw: bool = False):
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(f"{self.url}{path}", data=data, method=method)
        request.add_header("Content-Type", "application/json")
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

    def run_template(name: str):
        def run():
            status, body = s.call("POST", f"/api/workflows/{state['workflows'][name]}/execute", {"useDraftState": True, "stream": False, "input": TEMPLATE_INPUTS[name]}, timeout=600)
            require(status == 200 and body.get("success"), f"run returned HTTP {status}: {str(body.get('error'))[:200]}")
            content = str((body.get("output") or {}).get("content", "")).strip()
            require(len(content) > 40, "empty answer from the model")
            return f"{len(content)} caractères"
        return run

    def usage():
        status, body = s.call("GET", "/api/nexora/usage?days=7")
        require(status == 200, f"usage returned HTTP {status}")
        require(body["totals"]["requests"] > 0, "no request metered by Nexora API")
        return f"{body['totals']['requests']} requêtes, {body['totals']['totalTokens']} jetons"

    def audit():
        status, body = s.call("POST", "/api/organizations", {"name": "PME Fumée", "slug": f"pme-fumee-{secrets.token_hex(3)}"}, timeout=180)
        require(status == 200 and body.get("organizationId"), f"organization creation returned HTTP {status}")
        _, logs = s.call("GET", f"/api/audit-logs?organizationId={body['organizationId']}&limit=10")
        actions = [e["action"] for e in logs.get("data", [])]
        require("organization.created" in actions, f"audit log does not show the creation: {actions}")
        return "organization.created tracé"

    s.check("Inscription d'un compte", signup)
    s.check("Interface en français, sans marque tierce", french_ui)
    s.check("Nouvel espace avec les modèles PME", workspace_with_templates)
    s.check("Nexora Connect et ses outils MCP", connect_tools)
    for name in TEMPLATE_INPUTS:
        s.check(f"Exécution du modèle « {name} »", run_template(name))
    s.check("Consommation mesurée par Nexora API", usage)
    s.check("Journal d'audit", audit)

    failed = [r for r in s.results if r["status"] != "pass"]
    print(f"\n{len(s.results) - len(failed)}/{len(s.results)} contrôles réussis")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump({"url": s.url, "results": s.results}, handle, ensure_ascii=False, indent=2)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
