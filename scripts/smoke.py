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
import http.server
import io
import json
import os
from pathlib import Path
import secrets
import sys
import threading
import wave
import time
import urllib.error
import urllib.parse
import urllib.request

TEMPLATE_INPUTS = {
    "Devis client": {"client": "Boulangerie Martin, Lyon", "prestations": "Site vitrine : 1 x 2400 EUR HT"},
    "Relance de facture impayée": {"client": "Garage Durand", "facture": "F-2026-104", "montant": "1 250 EUR TTC", "echeance": "15/09/2026", "niveau": "2"},
    "Réponse support (FAQ)": {"question": "Livrez-vous le samedi ?", "faq": "Livraison du lundi au samedi, de 8h à 18h."},
    "Tri des e-mails entrants": {"email": "De : client@exemple.fr\nObjet : Facture en double\nBonjour, j'ai reçu deux fois la facture F-88."},
    # Run by the « Réunion » check: it starts from a recording, not a text.
    "Compte rendu de réunion": {},
}
MEETING_TEMPLATE = "Compte rendu de réunion"
# The 20 SME templates every new workspace receives (K7); the five first ones are run by the checks below.
SME_TEMPLATES = [
    "Devis client", "Relance de facture impayée", "Réponse support (FAQ)", "Tri des e-mails entrants",
    "Compte rendu de réunion", "Offre d’emploi", "Fiche produit", "Publication réseaux sociaux",
    "Réponse à une réclamation", "Newsletter mensuelle", "Relance de devis sans réponse",
    "Rapport d’activité hebdomadaire", "Traduction professionnelle", "Résumé d’un contrat",
    "Contrôle d’une facture fournisseur", "Accueil d’un nouveau salarié", "Réponse à un avis client",
    "Ordre du jour de réunion", "Réponse client validée avant envoi", "Compte rendu d’entretien",
]
# What the Steps view reads: one trigger carrying the marker, then blocks of the step catalog (K7).
STEP_TRIGGERS = {"start_trigger", "generic_webhook", "schedule", "chat_trigger"}
STEP_BLOCKS = {"agent", "condition", "api", "wait", "human_in_the_loop_v2", "response", "smtp", "stt_v2",
               "table_v2", "knowledge", "function", "mcp", "workflow", "variables"}
# Three voices (a woman, a man, a second woman), 61 s, made by the local French voices.
MEETING_AUDIO = Path(__file__).resolve().parent.parent / "docs" / "verification" / "k12-reunion" / "reunion-courte.mp3"


# 5×7 glyphs for the OCR and extraction checks' test images (standard library only: no imaging package needed).
_GLYPHS = {
    "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
    "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
    "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
    "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
    "J": ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
    "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
    "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
    "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
    "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
    "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
    "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
    "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
    " ": ["00000"] * 7,
    "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
    ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
    "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
    "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
}


def text_png(text: str, scale: int = 14) -> bytes:
    """Black text on white, as an 8-bit greyscale PNG; one line of the image per line of `text`."""
    import struct
    import zlib

    lines = []
    for text_line in text.split("\n"):
        columns = []
        for char in text_line:
            glyph = _GLYPHS[char]
            columns.extend([[row[c] == "1" for row in glyph] for c in range(5)])
            columns.append([False] * 7)
        lines.append(columns)
    margin, line_height = 3, 10
    width = (max(len(columns) for columns in lines) + 2 * margin) * scale
    height = (line_height * len(lines) - 3 + 2 * margin) * scale
    rows = []
    for y in range(height):
        gy_all = y // scale - margin
        number, gy = divmod(gy_all, line_height) if gy_all >= 0 else (-1, -1)
        columns = lines[number] if 0 <= number < len(lines) else []
        line = bytearray([0])  # filter: none
        for x in range(width):
            gx = x // scale - margin
            ink = 0 <= gy < 7 and 0 <= gx < len(columns) and columns[gx][gy]
            line.append(0 if ink else 255)
        rows.append(bytes(line))
    chunk = lambda kind, data: struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


def text_pdf(lines: list[str]) -> bytes:
    """One-page PDF with a real text layer (ASCII lines, Helvetica)."""
    escape = lambda line: line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    stream = "BT /F1 12 Tf 72 760 Td 16 TL " + " ".join(f"({escape(line)}) Tj T*" for line in lines) + " ET"
    objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ]
    out, offsets = "%PDF-1.4\n", []
    for number, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n{body}\nendobj\n"
    xref = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n" + "".join(f"{o:010d} 00000 n \n" for o in offsets)
    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    return out.encode("latin-1")


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
             headers: dict | None = None, data: bytes | None = None, content_type: str = "application/json",
             binary: bool = False):
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
                if binary:
                    return response.status, payload
                return response.status, (payload.decode() if raw else json.loads(payload or b"{}"))
        except urllib.error.HTTPError as error:
            payload = error.read()
            try:
                if binary:
                    return error.code, payload
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
            pdf = text_pdf(["Conditions de livraison", "La livraison est offerte a partir de 80 euros d'achat.",
                            "En dessous, elle coute 6 euros."])
            status, text = s.call("POST", f"/api/chat/{agent['chatIdentifier']}", {
                "input": "D'après le document joint, à partir de quel montant la livraison est-elle offerte ?",
                "conversationId": conversation,
                "files": [{"name": "conditions-livraison.pdf", "type": "application/pdf", "size": len(pdf),
                           "data": "data:application/pdf;base64," + base64.b64encode(pdf).decode()}],
            }, raw=True, timeout=600)
            require(status == 200 and '"event":"error"' not in text, f"chat with a PDF returned HTTP {status}: {text[:300]}")
            pdf_answer = "".join(
                str(json.loads(line[5:]).get("chunk", "")) for line in text.splitlines()
                if line.startswith("data:") and line[5:].strip().startswith("{"))
            require("80" in pdf_answer, f"the answer ignores the attached PDF: {pdf_answer[:300]}")
            status, _ = Smoke(args.url, args.origin).call("POST", f"/api/chat/{agent['chatIdentifier']}", {"input": question}, raw=True)
            require(status in (401, 403), f"members-only chat answered an anonymous visitor (HTTP {status})")
            admin_organization()
            status, _ = admin.call("GET", path)
            require(status == 404, f"another member reads the conversation (HTTP {status})")
            return f"« {agent['name']} » répond en flux ({len(answer)} caractères), lit un PDF joint, historique relu, cloisonné"
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
        state["kb"] = kb_id
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

    INVOICE_COLUMNS = [("numero", "string"), ("date", "date"), ("fournisseur", "string"), ("client", "string"),
                       ("total_ht", "number"), ("total_tva", "number"), ("total_ttc", "number"), ("date_echeance", "date"),
                       ("devise", "string"), ("a_verifier", "boolean"), ("motifs", "string")]
    INVOICE_LINES = ["FACTURE FA-2026-0142", "DATE : 12/03/2026", "ATELIER DUBOIS SARL",
                     "TOTAL HT : 1 250,00 EUR", "TVA 20 % : 250,00 EUR", "TOTAL TTC : 1 500,00 EUR"]

    def extraction():
        if not (usages().get("vision") and usages().get("chat")):
            return "non testé : il faut un modèle « Vision / OCR » et un modèle de discussion (Réglages › Modèles)"
        sub = lambda i, t, v: {"id": i, "type": t, "value": v}
        status, body = s.call("POST", "/api/table", {"name": f"Factures_fumee_{secrets.token_hex(3)}", "workspaceId": state["ws"],
                                                     "schema": {"columns": [{"name": n, "type": t} for n, t in INVOICE_COLUMNS]}})
        require(status in (200, 201), f"table creation returned HTTP {status}: {str(body)[:200]}")
        definition = (body.get("data") or {}).get("table", {})
        table = definition.get("id")
        # Rows are stored by stable column id: read them back by column name.
        column_names = {c["id"]: c["name"] for c in (definition.get("schema") or {}).get("columns", []) if c.get("id")}
        status, body = s.call("POST", "/api/workflows", {"name": f"Extraction de fumée {secrets.token_hex(3)}", "workspaceId": state["ws"]})
        wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
        try:
            start, extract, save = secrets.token_hex(8), secrets.token_hex(8), secrets.token_hex(8)
            edge = lambda a, b: {"id": secrets.token_hex(8), "source": a, "target": b, "sourceHandle": "source", "targetHandle": "target"}
            status, _ = s.call("PUT", f"/api/workflows/{wf}/state", {"blocks": {
                start: {"id": start, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                        "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [{"id": secrets.token_hex(4), "name": "document", "type": "file[]", "value": ""}])}, "outputs": {}},
                extract: {"id": extract, "type": "nexora_extract", "name": "Extraction", "position": {"x": 420, "y": 0}, "enabled": True,
                          "subBlocks": {"fileReference": sub("fileReference", "short-input", "<start.document>"), "template": sub("template", "dropdown", "invoice")},
                          "outputs": {}, "data": {"canonicalModes": {"file": "advanced"}}},
                save: {"id": save, "type": "table_v2", "name": "Enregistrement", "position": {"x": 840, "y": 0}, "enabled": True,
                       "subBlocks": {"operation": sub("operation", "dropdown", "insert_row"), "tableSelector": sub("tableSelector", "table-selector", table),
                                     "data": sub("data", "code", "<extraction.row>")}, "outputs": {}, "data": {"canonicalModes": {"tableId": "basic"}}}},
                "edges": [edge(start, extract), edge(extract, save)], "loops": {}, "parallels": {}})
            require(status == 200, f"state save returned HTTP {status}")
            pdf_lines = ["Facture FA-2026-0142", "Date : 12/03/2026", "Atelier Dubois SARL",
                         "Total HT : 1 250,00 EUR", "TVA 20 % : 250,00 EUR", "Total TTC : 1 500,00 EUR"]
            # The scan is a real rendering (150 dpi, slight skew and blur) from the K4 test set: a
            # synthetic bitmap font is not something a 3B vision model reads reliably.
            k4 = Path(__file__).resolve().parent.parent / "docs" / "verification" / "k4-factures"
            scan = json.loads((k4 / "attendu.json").read_text(encoding="utf-8"))["facture-06-scan.png"]
            documents = [("facture.pdf", "application/pdf", text_pdf(pdf_lines)),
                         ("facture-06-scan.png", "image/png", (k4 / "facture-06-scan.png").read_bytes())]
            for name, mime, data in documents:
                status, run = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False,
                                     "input": {"document": [{"name": name, "mimeType": mime, "data": base64.b64encode(data).decode()}]}}, timeout=900)
                require(status == 200 and run.get("success"), f"{name}: run returned HTTP {status}: {str(run.get('error'))[:200]}")
            status, body = s.call("GET", f"/api/table/{table}/rows?workspaceId={state['ws']}&limit=10")
            rows = [{column_names.get(k, k): v for k, v in (row.get("data") or {}).items()} for row in (body.get("data") or {}).get("rows", [])]
            require(status == 200 and len(rows) == 2, f"expected 2 rows in the table, got HTTP {status}: {str(body)[:200]}")
            wanted = {"FA-2026-0142": ("2026-03-12", "ATELIER DUBOIS SARL", 1250, 250, 1500),
                      scan["numero"]: (scan["date"], scan["fournisseur"].upper(), scan["total_ht"], scan["total_tva"], scan["total_ttc"])}
            by_number = {str(row.get("numero")): row for row in rows}
            require(set(by_number) == set(wanted), f"numéros lus {sorted(by_number)}, attendus {sorted(wanted)}")
            for number, row in by_number.items():
                got = (str(row.get("date"))[:10], str(row.get("fournisseur")).upper(), row.get("total_ht"), row.get("total_tva"), row.get("total_ttc"))
                require(got == wanted[number], f"{number} : lu {got}, attendu {wanted[number]}")
                require(row.get("a_verifier") is False, f"row flagged « à vérifier »: {row.get('motifs')}")
            return "facture PDF et facture scannée : six champs exacts, deux lignes dans la table, rien « à vérifier »"
        finally:
            s.call("DELETE", f"/api/workflows/{wf}")
            s.call("DELETE", f"/api/table/{table}?workspaceId={state['ws']}")

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

    def multipart(fields: dict[str, str], file_field: str, file_name: str, file_type: str, content: bytes) -> tuple[bytes, str]:
        boundary = f"nexora{secrets.token_hex(8)}"
        parts = b"".join(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
            for name, value in fields.items()
        )
        parts += (f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{file_name}"\r\n'
                  f"Content-Type: {file_type}\r\n\r\n").encode() + content + f"\r\n--{boundary}--\r\n".encode()
        return parts, f"multipart/form-data; boundary={boundary}"

    def speech():
        """K12: the local French voice speaks, through the Assistant's route and through the developer API;
        the Assistant's dictation hears the sentence again (the full voice round trip, offline)."""
        if not usages().get("speech"):
            return "non testé : aucun modèle « Synthèse vocale » (Réglages › Modèles, ou voix locale à l'installation)"
        sentence = "Bonjour, la livraison de vos croissants aura lieu mardi prochain à six heures."
        status, wav = s.call("POST", "/api/nexora/assistant/voice/speak", {"workspaceId": state["ws"], "text": sentence}, binary=True, timeout=300)
        require(status == 200, f"speak returned HTTP {status}: {wav[:200]!r}")
        require(wav[:4] == b"RIFF" and wav[8:12] == b"WAVE", f"not a WAV: {wav[:12]!r}")
        with wave.open(io.BytesIO(wav)) as audio:
            seconds = audio.getnframes() / audio.getframerate()
        require(seconds > 2.5, f"the audio lasts only {seconds:.1f} s")
        status, _ = Smoke(args.url, args.origin).call("POST", "/api/nexora/assistant/voice/speak", {"workspaceId": state["ws"], "text": sentence}, binary=True)
        require(status in (401, 403), f"an anonymous visitor made the voice speak (HTTP {status})")

        if usages().get("transcription"):
            body, content_type = multipart({"workspaceId": state["ws"], "language": "fr"}, "file", "dictee.wav", "audio/wav", wav)
            status, heard = s.call("POST", "/api/nexora/assistant/voice/dictate", data=body, content_type=content_type, timeout=600)
            require(status == 200, f"dictate returned HTTP {status}: {str(heard)[:200]}")
            text = str(heard.get("text", "")).lower()
            require("livraison" in text and "croissant" in text, f"the dictation did not hear the sentence: {text!r}")
            heard_text = f"dictée relue : « {text[:50]}… »"
        else:
            heard_text = "dictée non testée (aucun modèle de transcription)"

        status, created = s.call("POST", "/api/nexora/api-keys", {"workspaceId": state["ws"], "name": f"voix-{secrets.token_hex(3)}"})
        require(status == 200, f"key creation returned HTTP {status}")
        key = created["key"]
        try:
            auth = {"Authorization": f"Bearer {created['value']}"}
            _, models = s.call("GET", "/v1/models", headers=auth)
            voices = [m["id"] for m in models.get("data", []) if m.get("type") == "text-to-speech"]
            require(voices, f"no speech model in /v1/models: {[m.get('id') for m in models.get('data', [])]}")
            status, api_wav = s.call("POST", "/v1/audio/speech", {"model": voices[0], "input": sentence, "response_format": "wav"}, headers=auth, binary=True, timeout=300)
            require(status == 200 and api_wav[:4] == b"RIFF", f"/v1/audio/speech returned HTTP {status}: {api_wav[:120]!r}")
            status, refused = Smoke(args.url, args.origin).call("POST", "/v1/audio/speech", {"model": voices[0], "input": sentence})
            require(status == 401, f"/v1/audio/speech without a key answered HTTP {status}")
            status, long_text = s.call("POST", "/v1/audio/speech", {"model": voices[0], "input": "x" * 5000}, headers=auth)
            require(status == 400 and "4 096" in json.dumps(long_text, ensure_ascii=False), f"a 5000-character text answered HTTP {status}: {str(long_text)[:200]}")
        finally:
            s.call("DELETE", f"/api/nexora/api-keys/{key['id'] if isinstance(key, dict) else key}?workspaceId={state['ws']}")
        return f"WAV de {seconds:.1f} s par l'Assistant et par /v1/audio/speech, 401 sans clé, 400 au-delà de 4 096 caractères ; {heard_text}"

    def usages() -> dict:
        _, home = s.call("GET", f"/api/nexora/home?workspaceId={state['ws']}")
        return home.get("modelUsages") or {}

    def meeting():
        """K12: a recording of three voices becomes « Intervenant 1 / 2 / 3 », then the SME template
        carries it to the validation step (summary written, human approval waiting)."""
        if not usages().get("transcription"):
            return "non testé : aucun modèle « Transcription » (Réglages › Modèles)"
        audio = Path(os.environ.get("NEXORA_SMOKE_MEETING_AUDIO") or MEETING_AUDIO)
        if not audio.exists():
            return f"non testé : {audio} absent"
        data = base64.b64encode(audio.read_bytes()).decode()
        recording = [{"name": audio.name, "mimeType": "audio/mpeg", "data": data}]
        wf = reader_workflow("Réunion de fumée", "stt_v2", "enregistrement", "audioFile",
                             {"provider": ("dropdown", "nexora"), "audioFileReference": ("short-input", "<start.enregistrement>"),
                              "language": ("dropdown", "fr"), "diarization": ("switch", True)})
        try:
            status, run = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False, "input": {"enregistrement": recording}}, timeout=1800)
            require(status == 200 and run.get("success"), f"meeting run returned HTTP {status}: {str(run.get('error'))[:200]}")
            out = run.get("output") or {}
            lines = [line for line in str(out.get("transcriptBySpeaker", "")).splitlines() if line.strip()]
            require(out.get("speakers", 0) >= 2, f"fewer than two speakers told apart: {out.get('speakers')} ({str(out)[:200]})")
            require(lines and all(line.startswith("Intervenant ") and " : " in line for line in lines), f"lines without a speaker: {lines[:3]}")
            labels = {line.split(" : ", 1)[0] for line in lines}
            require({"Intervenant 1", "Intervenant 2"} <= labels, f"speakers seen: {sorted(labels)}")
            require("campagne" in str(out.get("transcript", "")).lower(), f"the meeting was not heard: {str(out.get('transcript'))[:200]}")
        finally:
            s.call("DELETE", f"/api/workflows/{wf}")
        told = f"{out['speakers']} intervenants ({', '.join(sorted(labels))}), {len(lines)} prises de parole"

        # The SME template itself: recording -> transcription by speaker -> summary -> validation -> e-mail.
        # The e-mail leg needs a mailbox the instance may reach (its host listed in EGRESS_ALLOWED_HOSTS):
        # NEXORA_SMOKE_MEETING_MAIL=1 with NEXORA_SMOKE_SMTP_HOST and NEXORA_SMOKE_MAILPIT_URL.
        smtp_host, mailbox = os.environ.get("NEXORA_SMOKE_SMTP_HOST", ""), os.environ.get("NEXORA_SMOKE_MAILPIT_URL", "")
        with_mail = os.environ.get("NEXORA_SMOKE_MEETING_MAIL") == "1" and smtp_host and mailbox
        template = state["workflows"][MEETING_TEMPLATE]
        # Sim checks every block's required fields before a run starts, so the template's e-mail block
        # is filled either with the real test mailbox or, without one, with a server nothing listens on
        # (the checks below stop at the validation, or at a refusal, before anything is sent).
        status, loaded = s.call("GET", f"/api/workflows/{template}")
        require(status == 200, f"template state returned HTTP {status}")
        saved = (loaded.get("data") or loaded)["state"]
        smtp = next((b for b in saved["blocks"].values() if b["type"] == "smtp"), None)
        require(smtp, "the template has no e-mail block")
        server = {"smtpHost": smtp_host, "smtpPort": os.environ.get("NEXORA_SMOKE_SMTP_PORT", "1025")} if with_mail else {"smtpHost": "127.0.0.1", "smtpPort": "9"}
        for key, value in {**server, "smtpUsername": "reunion", "smtpPassword": "reunion", "smtpSecure": "None", "from": "reunions@nexora.test"}.items():
            smtp["subBlocks"].setdefault(key, {"id": key, "type": "short-input", "value": ""})["value"] = value
        status, _ = s.call("PUT", f"/api/workflows/{template}/state", saved)
        require(status == 200, f"template state save returned HTTP {status}")

        def mails_for(recipient: str) -> list:
            with urllib.request.urlopen(f"{mailbox.rstrip('/')}/api/v1/search?query=to:{recipient}", timeout=30) as response:
                return json.load(response).get("messages", [])

        def meeting_run(recipient: str) -> tuple[str, str]:
            status, run = s.call("POST", f"/api/workflows/{template}/execute", {"useDraftState": True, "stream": False, "input": {
                "enregistrement": recording, "participants": "Marie, Paul, Claire", "destinataire": recipient}}, timeout=1800)
            require(status == 200 and run.get("success"), f"template run ({recipient.split('-')[0]}) returned HTTP {status}: {str(run.get('error'))[:200]} ; {json.dumps(run, ensure_ascii=False)[:500]}")
            paused = (run.get("output") or {}).get("data") or {}
            minutes = next((f["value"] for f in paused.get("responseStructure", []) if f.get("name") == "compteRendu"), "")
            resume = (paused.get("_resume") or {}).get("apiUrl", "")
            require(len(minutes) > 200 and resume, f"the run did not stop at the validation with minutes: {str(run)[:300]}")
            require("campagne" in minutes.lower(), f"the minutes do not mention the meeting: {minutes[:200]}")
            # The address in the pause data is the public one; the check reaches the same route locally.
            parts = urllib.parse.urlsplit(resume)
            return minutes, parts.path + (f"?{parts.query}" if parts.query else "")

        # A refusal at the validation sends nothing; an approval sends the minutes.
        refused_to = f"refus-{secrets.token_hex(4)}@nexora.test"
        minutes, resume = meeting_run(refused_to)
        status, _ = s.call("POST", resume, {"approuve": False, "commentaire": "Refusé par la fumée"}, timeout=300)
        require(status == 200, f"resume (refusal) returned HTTP {status}")
        approved_to = f"reunion-{secrets.token_hex(4)}@nexora.test"
        minutes, resume = meeting_run(approved_to)
        status, resumed = s.call("POST", resume, {"approuve": True, "commentaire": "Validé par la fumée"}, timeout=300)
        require(status == 200, f"resume returned HTTP {status}: {str(resumed)[:200]}")
        if not with_mail:
            return f"{told} ; modèle PME : compte rendu de {len(minutes)} caractères, arrêt à la validation, reprise acceptée (e-mail non vérifié : NEXORA_SMOKE_MEETING_MAIL absent)"
        found: list = []
        for _ in range(30):
            found = mails_for(approved_to)
            if found:
                break
            time.sleep(2)
        require(found and found[0]["Subject"] == "Compte rendu de réunion", f"no e-mail reached the mailbox for {approved_to}")
        require(not mails_for(refused_to), "an e-mail left after a refusal")
        return f"{told} ; modèle PME : compte rendu de {len(minutes)} caractères, rien envoyé après un refus, e-mail reçu après l'approbation"

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

    def etapes():
        # K7. The Steps view opens what the Copilot and the SME templates build, and edits it in place:
        # the workflow the canvas loads is the same one, with only the touched step changed.
        def opens_in_steps(saved: dict) -> list:
            blocks, edges = saved["blocks"], saved["edges"]
            triggers = [b for b in blocks.values() if b["type"] in STEP_TRIGGERS]
            require(len(triggers) == 1, f"{len(triggers)} déclencheur(s)")
            marker = (triggers[0].get("subBlocks") or {}).get("nexoraView", {}).get("value")
            require(marker == "etapes", "le déclencheur ne porte pas le repère « Étapes »")
            require(not saved.get("loops") and not saved.get("parallels"), "boucle ou parallèle : forme non reconnue")
            foreign = sorted({b["type"] for b in blocks.values() if b["type"] not in STEP_TRIGGERS | STEP_BLOCKS})
            require(not foreign, f"blocs hors catalogue : {foreign}")
            reached, queue = {triggers[0]["id"]}, [triggers[0]["id"]]
            while queue:
                current = queue.pop()
                for edge in edges:
                    if edge["source"] == current and edge["target"] not in reached:
                        reached.add(edge["target"])
                        queue.append(edge["target"])
            require(reached == set(blocks), "des blocs ne sont reliés à aucune étape")
            return [b["name"] for b in blocks.values()]

        def load(wf: str) -> dict:
            status, loaded = s.call("GET", f"/api/workflows/{wf}")
            require(status == 200, f"état HTTP {status}")
            return (loaded.get("data") or loaded)["state"]

        missing = [name for name in SME_TEMPLATES if name not in state["workflows"]]
        require(not missing, f"modèles PME absents : {missing}")
        for name in SME_TEMPLATES:
            try:
                opens_in_steps(load(state["workflows"][name]))
            except AssertionError as error:
                raise AssertionError(f"modèle « {name} » : {error}") from error

        description = "Quand je lance le workflow avec un texte, un agent le résume en une phrase en français."
        status, body = s.call("POST", "/api/nexora/copilot/plan", {"workspaceId": state["ws"], "description": description}, timeout=600)
        require(status == 200 and body.get("plan"), f"plan HTTP {status}: {str(body)[:300]}")
        plan = body["plan"]
        status, created = s.call("POST", "/api/nexora/copilot/create", {"workspaceId": state["ws"], "plan": plan})
        require(status == 200 and created.get("workflowId"), f"création HTTP {status}: {str(created)[:300]}")
        wf = created["workflowId"]
        try:
            before = load(wf)
            names = opens_in_steps(before)
            agent = next((b for b in before["blocks"].values() if b["type"] == "agent"), None)
            require(agent, "le plan du Copilote n'a pas d'étape « agent »")
            # « Modifier une étape » : le message de l'agent, comme le formulaire de l'éditeur l'écrit.
            marker = f"ÉTAPES-{secrets.token_hex(3)}"
            messages = agent["subBlocks"]["messages"]["value"]
            messages[-1]["content"] = f"{messages[-1]['content']}\nTermine ta réponse par le mot {marker}."
            status, _ = s.call("PUT", f"/api/workflows/{wf}/state", before)
            require(status == 200, f"enregistrement HTTP {status}")
            # « Retour au canevas » : le même workflow, la même forme, seule l'étape touchée a changé.
            after = load(wf)
            require(opens_in_steps(after) == names, "les étapes ont changé de nom ou d'ordre")
            require({k: v["type"] for k, v in after["blocks"].items()} == {k: v["type"] for k, v in before["blocks"].items()}, "la forme du workflow a changé")
            require(sorted((e["source"], e["target"], e.get("sourceHandle")) for e in after["edges"]) ==
                    sorted((e["source"], e["target"], e.get("sourceHandle")) for e in before["edges"]), "les liens ont changé")
            require(marker in json.dumps(after["blocks"][agent["id"]]["subBlocks"]["messages"], ensure_ascii=False), "la modification n'est pas revenue")
            fields = [f["name"] for f in (plan.get("trigger") or {}).get("fields") or []]
            text = "La réunion de lundi a fixé la livraison au 15 novembre et le budget à 12 000 euros."
            status, run = s.call("POST", f"/api/workflows/{wf}/execute", {"useDraftState": True, "stream": False,
                                 "input": {name: text for name in fields} if fields else text}, timeout=600)
            require(status == 200 and run.get("success") is not False and not run.get("error"), f"exécution HTTP {status}: {str(run)[:200]}")
            return f"{len(SME_TEMPLATES)} modèles PME ouverts en Étapes ; « {plan.get('title', '?')} » créé par le Copilote, étape modifiée, forme intacte, exécuté"
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
        _, logs = admin.call("GET", f"/api/audit-logs?organizationId={admin_organization()}&action=workspace.created&limit=50")
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
            "temperature": 0.2, "maxTokens": 1024}, raw=True, timeout=300)
        require(status == 200, f"playground returned HTTP {status}: {text[:200]}")
        events = [json.loads(line[5:]) for line in text.splitlines() if line.startswith("data:")]
        answer = "".join(e.get("chunk", "") for e in events)
        done = [e for e in events if e.get("done")]
        require(answer.strip() and done and not done[-1].get("error"), f"no streamed answer: {text[:200]}")
        usage = done[-1].get("usage") or {}
        return f"« {answer.strip()[:50]} » ({usage.get('completionTokens', '?')} jetons)"

    def playground_reasoning():
        # A reasoning model streams its reasoning in « thinking » events, never in the answer chunks.
        status, text = s.call("POST", "/api/nexora/playground", {
            "workspaceId": state["ws"], "model": "vllm/nexora-default",
            "messages": [{"role": "user", "content": "Combien font 17 × 3 ? Réponds par le nombre seul."}],
            "temperature": 0.2, "maxTokens": 2048, "reasoningEffort": "low"}, raw=True, timeout=300)
        require(status == 200, f"playground returned HTTP {status}: {text[:200]}")
        events = [json.loads(line[5:]) for line in text.splitlines() if line.startswith("data:")]
        answer = "".join(e.get("chunk", "") for e in events)
        thinking = "".join(e.get("thinking", "") for e in events)
        done = [e for e in events if e.get("done")]
        require(done and not done[-1].get("error"), f"stream did not end cleanly: {text[-200:]}")
        require(answer.strip(), f"no answer after the reasoning ({len(thinking)} characters of reasoning)")
        require("<think>" not in answer and "</think>" not in answer, f"reasoning tags in the answer: {answer[:120]}")
        require(len(thinking.strip()) < 40 or thinking.strip() not in answer, "the reasoning leaked into the answer")  # a one-word reasoning is a substring of a one-word answer
        effort = "effort refusé, réponse quand même" if done[-1].get("effortIgnored") else "effort accepté"
        return f"« {answer.strip()[:30]} », réflexion {len(thinking)} caractères à part, {effort}"

    def model_card():
        # « Tester » on the default model: a non-empty answer (or a reasoning model reported cut), capability recorded.
        admin_organization()
        status, body = admin.call("GET", "/api/nexora/models")
        require(status == 200, f"models returned HTTP {status}: {body}")
        default = next(m for m in body["models"] if m["isDefault"])
        status, tested = admin.call("POST", f"/api/nexora/models/{default['id']}/test", timeout=300)
        require(status == 200, f"testing {default['name']} returned HTTP {status}: {tested}")
        require(tested["reply"].strip(), f"{default['name']} gave an empty test answer (truncated={tested.get('truncated')})")
        require("<think>" not in tested["reply"], "reasoning tags in the test answer")
        _, body = admin.call("GET", "/api/nexora/models")
        card = next(m for m in body["models"] if m["id"] == default["id"])["card"]
        require(card["testedAt"], "the test was not recorded on the model card")
        require(card["reasoning"] == tested["capabilities"]["reasoning"], f"card {card} does not match the test {tested['capabilities']}")
        require(card["location"] in ("local", "eu", "external"), f"unknown data location {card['location']}")
        if default["source"] == "openai-compatible":
            require(card["locationEditable"], "an OpenAI-compatible model's location must be declared by an administrator")
        badges = [b for b, on in (("raisonnement", card["reasoning"]), ("outils", card["tools"]), ("vision", card["vision"])) if on]
        return f"{default['name']} : « {tested['reply'][:40]} » ({tested['latencyMs']} ms), {', '.join(badges) or 'aucun badge'}, {card['location']}"

    def developer_api():
        """K3: a key created by the interface's route calls a model then a published agent over /v1,
        in the official OpenAI wire format (SSE chunks), is refused 403/401 when it should be, and
        its use appears in Réglages › Consommation."""
        def stream_text(text: str) -> tuple[str, dict]:
            answer, usage = "", {}
            for line in text.splitlines():
                if not line.startswith("data:") or line[5:].strip() == "[DONE]":
                    continue
                chunk = json.loads(line[5:])
                require("error" not in chunk, f"error in the stream: {chunk}")
                for choice in chunk.get("choices") or []:
                    answer += (choice.get("delta") or {}).get("content") or ""
                usage = chunk.get("usage") or usage
            require(text.rstrip().endswith("data: [DONE]"), f"stream does not end with [DONE]: {text[-120:]}")
            return answer, usage

        def bearer(value: str) -> dict:
            return {"Authorization": f"Bearer {value}"}

        status, body = s.call("POST", "/api/nexora/api-keys", {"workspaceId": state["ws"], "name": f"fumee-{secrets.token_hex(3)}"})
        require(status == 200 and str(body.get("value", "")).startswith("sk-nexora-"), f"key creation returned HTTP {status}: {str(body)[:200]}")
        key, value = body["key"], body["value"]
        status, listed = s.call("GET", f"/api/nexora/api-keys?workspaceId={state['ws']}")
        require(status == 200 and value not in json.dumps(listed), "the key value came back in the list")
        try:
            # Listing the Assistant's agents publishes the « Assistant général » on first use.
            _, agents = s.call("GET", f"/api/nexora/assistant/agents?workspaceId={state['ws']}", timeout=300)
            agent = agents["agents"][0]
            status, models = s.call("GET", "/v1/models", headers=bearer(value))
            require(status == 200, f"/v1/models returned HTTP {status}: {str(models)[:200]}")
            ids = [m["id"] for m in models.get("data", [])]
            status, text = s.call("POST", "/v1/chat/completions", {
                "model": "nexora-default", "stream": True, "max_tokens": 1024,
                "messages": [{"role": "user", "content": "Dis bonjour en une phrase."}]}, headers=bearer(value), raw=True, timeout=300)
            require(status == 200, f"model call returned HTTP {status}: {text[:200]}")
            model_answer, model_usage = stream_text(text)
            require(model_answer.strip(), f"empty model answer: {text[:200]}")
            require(any(i == f"agent:{agent['name']}" or i == f"agent:{agent['workflowId']}" for i in ids), f"agent missing from /v1/models: {ids}")
            status, text = s.call("POST", "/v1/chat/completions", {
                "model": f"agent:{agent['workflowId']}", "stream": True,
                "messages": [{"role": "user", "content": "Bonjour, en une phrase : à quoi sers-tu ?"}]}, headers=bearer(value), raw=True, timeout=300)
            require(status == 200, f"agent call returned HTTP {status}: {text[:200]}")
            agent_answer, _ = stream_text(text)
            require(len(agent_answer.strip()) > 10, f"empty agent answer: {text[:300]}")

            status, body = s.call("POST", "/api/nexora/api-keys", {
                "workspaceId": state["ws"], "name": f"fumee-restreinte-{secrets.token_hex(3)}",
                "allowedModels": ["nexora-default"], "allowAgents": False})
            require(status == 200, f"restricted key creation returned HTTP {status}")
            restricted = body["value"]
            status, refused = s.call("POST", "/v1/chat/completions", {
                "model": f"agent:{agent['workflowId']}", "messages": [{"role": "user", "content": "x"}]}, headers=bearer(restricted))
            require(status == 403 and refused["error"]["code"] == "model_not_allowed", f"agent with a restricted key: HTTP {status} {refused}")
            default_ids = {m["id"] for m in models["data"] if m["id"] == "nexora-default" or "nexora-default" in (m.get("aliases") or [])}
            other = next((i for i in ids if not i.startswith("agent:") and i != "nexora-default" and i not in default_ids), None)
            if other:
                status, refused = s.call("POST", "/v1/chat/completions", {
                    "model": other, "messages": [{"role": "user", "content": "x"}]}, headers=bearer(restricted))
                require(status == 403 and refused["error"]["code"] == "model_not_allowed", f"{other} with a restricted key: HTTP {status} {refused}")
            s.call("DELETE", f"/api/nexora/api-keys/{body['key']['id']}?workspaceId={state['ws']}")

            status, _ = s.call("GET", "/api/nexora/api-keys/instance")
            require(status == 403, f"a member who is not an instance admin reads the instance keys (HTTP {status})")
            status, body = s.call("POST", "/api/workspaces", {"name": "Fumée Nexora clés"}, timeout=300)
            require(status == 200, f"second workspace creation returned HTTP {status}")
            other_ws = body["workspace"]["id"]
            try:
                status, _ = s.call("DELETE", f"/api/nexora/api-keys/{key['id']}?workspaceId={other_ws}")
                require(status == 404, f"a key was revoked through another workspace (HTTP {status})")
            finally:
                s.call("DELETE", f"/api/workspaces/{other_ws}")
            status, refused = s.call("GET", "/v1/models", headers=bearer("sk-nexora-inconnue"))
            require(status == 401 and refused["error"]["code"] == "invalid_api_key", f"unknown key: HTTP {status} {refused}")
        finally:
            s.call("DELETE", f"/api/nexora/api-keys/{key['id']}?workspaceId={state['ws']}")
        status, refused = s.call("GET", "/v1/models", headers=bearer(value))
        require(status == 401 and refused["error"]["code"] == "revoked_api_key" and "révoquée" in refused["error"]["message"],
                f"revoked key: HTTP {status} {refused}")

        admin_organization()
        status, report = admin.call("GET", "/api/nexora/consumption?days=7", timeout=300)
        require(status == 200, f"consumption returned HTTP {status}")
        row = next((r for r in report.get("apiKeys", []) if r["keyId"] == key["id"]), None)
        require(row and row["requests"] >= 2 and row["modelTokens"] > 0, f"the key's use is missing from the consumption: {row}")
        return (f"clé créée, « {model_answer.strip()[:30]} » ({model_usage.get('completion_tokens', '?')} jetons), "
                f"agent « {agent['name']} » répond en flux, 403 hors liste, 401 révoquée, {row['requests']} requêtes en consommation")

    def traces():
        """K8: every model call becomes a trace. A question to a members-only agent that searches a
        knowledge base shows up in Traces within 5 s as model → knowledge → model; an IBAN typed in
        it is masked everywhere; « duration > 10 s » finds a slow run only; a purge one day on,
        with a simulated clock, empties the workspace's traces; a test OTLP collector receives the
        spans of a Playground call; a person outside the workspace reads none of them."""
        ws = state["ws"]
        if "kb" not in state:
            knowledge_base()
        admin_organization()
        sub = lambda i, t, v: {"id": i, "type": t, "value": v}

        def traces_of(client, **query):
            params = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in {"workspaceId": ws, "limit": 100, **query}.items())
            status, body = client.call("GET", f"/api/nexora/traces?{params}")
            require(status == 200, f"traces returned HTTP {status}: {str(body)[:200]}")
            return body["traces"]

        def wait_for(predicate, seconds=5.0, **query):
            deadline = time.monotonic() + seconds
            while True:
                found = [t for t in traces_of(s, **query) if predicate(t)]
                if found or time.monotonic() > deadline:
                    return found
                time.sleep(0.4)

        status, body = s.call("POST", "/api/workflows", {"name": "Agent de fumée traces", "workspaceId": ws})
        require(status in (200, 201), f"workflow creation returned HTTP {status}")
        agent_wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
        start, agent_block = secrets.token_hex(8), secrets.token_hex(8)
        knowledge_tool = {"type": "knowledge", "title": "Knowledge", "toolId": "knowledge_search", "operation": "search",
                          "params": {"knowledgeBaseSelector": state["kb"]}, "isExpanded": False, "usageControl": "auto"}
        instructions = ("Tu es l'assistant d'une PME. Pour toute question sur les livraisons, cherche d'abord dans la base de "
                        "connaissances avec l'outil, puis réponds en une phrase en français.")
        agent_state = {"blocks": {
            start: {"id": start, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                    "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [])}, "outputs": {}},
            agent_block: {"id": agent_block, "type": "agent", "name": "Agent", "position": {"x": 420, "y": 0}, "enabled": True,
                          "subBlocks": {"messages": sub("messages", "messages-input", [{"role": "system", "content": instructions}, {"role": "user", "content": "<start.input>"}]),
                                        "model": sub("model", "combobox", "vllm/nexora-default"),
                                        "tools": sub("tools", "tool-input", [knowledge_tool]),
                                        "memoryType": sub("memoryType", "dropdown", "none")},
                          "outputs": {}}},
            "edges": [{"id": secrets.token_hex(8), "source": start, "target": agent_block, "sourceHandle": "source", "targetHandle": "target"}],
            "loops": {}, "parallels": {}}
        wait_wf = None
        collector = None
        try:
            status, body = s.call("PUT", f"/api/workflows/{agent_wf}/state", agent_state)
            require(status == 200, f"agent state save returned HTTP {status}: {str(body)[:200]}")
            status, body = s.call("POST", f"/api/workflows/{agent_wf}/deploy", {})
            require(status == 200, f"agent deploy returned HTTP {status}: {str(body)[:200]}")
            identifier = f"traces-fumee-{secrets.token_hex(4)}"
            status, body = s.call("POST", "/api/chat", {
                "workflowId": agent_wf, "identifier": identifier, "title": "Agent traces", "authType": "workspace",
                "customizations": {"primaryColor": "#1f2937", "welcomeMessage": "Bonjour"},
                "outputConfigs": [{"blockId": agent_block, "path": "content"}]})
            require(status in (200, 201), f"members-only chat publication returned HTTP {status}: {str(body)[:200]}")

            # (a) a question that needs the knowledge base: its tree appears in under 5 s
            traces_of(s)  # a first read warms the route, so the 5 s measure below is the trace's latency alone
            question = "Quand livrez-vous le samedi ? Cherchez dans la base de connaissances."
            status, text = s.call("POST", f"/api/chat/{identifier}", {"input": question, "conversationId": secrets.token_hex(8)}, raw=True, timeout=300)
            require(status == 200 and '"event":"error"' not in text, f"chat returned HTTP {status}: {text[:200]}")
            ended = time.monotonic()
            found = wait_for(lambda t: t["name"] == "Agent de fumée traces" and t["source"] == "assistant")
            appeared = time.monotonic() - ended
            require(found, "the Assistant-style chat left no trace within 5 s")
            trace = found[0]
            require(appeared < 5.0, f"the trace took {appeared:.1f} s to appear")
            _, detail = s.call("GET", f"/api/nexora/traces/{trace['id']}?workspaceId={ws}")
            kinds = [sp["kind"] for sp in detail["spans"]]
            require(trace["visibility"] == "private", "a members-only chat trace must be private")
            require("knowledge" in kinds and kinds.count("model") >= 2, f"the tree misses model → knowledge → model: {kinds}")
            order = [k for k in kinds if k in ("model", "knowledge")]
            require(order[:3] == ["model", "knowledge", "model"], f"unexpected order of the steps: {order}")
            require(trace["inputTokens"] > 0 and trace["durationMs"] > 0, f"no tokens or duration: {trace}")

            # (b) an IBAN typed in a question is masked everywhere
            iban = "FR76 3000 6000 0112 3456 7890 189"
            status, text = s.call("POST", f"/api/chat/{identifier}", {"input": f"Mon IBAN est {iban} et mon e-mail jean.dupont@exemple.fr : confirme en une phrase que tu les as notés.", "conversationId": secrets.token_hex(8)}, raw=True, timeout=300)
            require(status == 200, f"chat with an IBAN returned HTTP {status}")
            found = wait_for(lambda t: "[IBAN]" in (t.get("inputPreview") or ""))
            require(found, "the question with an IBAN left no trace")
            _, detail = s.call("GET", f"/api/nexora/traces/{found[0]['id']}?workspaceId={ws}")
            dump = json.dumps(detail)
            require("3000 6000" not in dump and "7630006000" not in dump and "jean.dupont@exemple.fr" not in dump, "an IBAN or an e-mail address is readable in the stored trace")
            require(found[0]["maskedCount"] >= 2, f"masking was not counted: {found[0]['maskedCount']}")
            require(not traces_of(s, q="3000 6000"), "the text search finds the raw IBAN")

            # (c) « duration > 10 s » keeps a slow run and drops the fast ones
            status, body = s.call("POST", "/api/workflows", {"name": "Attente de fumée traces", "workspaceId": ws})
            wait_wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
            wstart, wblock = secrets.token_hex(8), secrets.token_hex(8)
            wait_state = {"blocks": {
                wstart: {"id": wstart, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                         "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [])}, "outputs": {}},
                wblock: {"id": wblock, "type": "wait", "name": "Attente", "position": {"x": 300, "y": 0}, "enabled": True,
                         "subBlocks": {"timeValue": sub("timeValue", "short-input", "11"), "timeUnit": sub("timeUnit", "dropdown", "seconds")}, "outputs": {}}},
                "edges": [{"id": secrets.token_hex(8), "source": wstart, "target": wblock, "sourceHandle": "source", "targetHandle": "target"}],
                "loops": {}, "parallels": {}}
            status, _ = s.call("PUT", f"/api/workflows/{wait_wf}/state", wait_state)
            require(status == 200, f"wait state save returned HTTP {status}")
            status, body = s.call("POST", f"/api/workflows/{wait_wf}/execute", {"useDraftState": True, "stream": False, "input": {}}, timeout=120)
            require(status == 200 and body.get("success"), f"wait run returned HTTP {status}: {str(body)[:200]}")
            fast_total = len(traces_of(s))
            slow = wait_for(lambda t: t["durationMs"] >= 10_000, minDurationMs=10_000)
            require(slow, "the 11 s run is missing from « duration > 10 s »")
            over_ten = traces_of(s, minDurationMs=10_000)
            require(all(t["durationMs"] >= 10_000 for t in over_ten) and len(over_ten) < fast_total,
                    f"the duration filter keeps fast traces: {[t['durationMs'] for t in over_ten]}")

            # (e) a test OTLP collector receives the spans of a Playground call
            received: list[dict] = []

            class Collector(http.server.BaseHTTPRequestHandler):
                def do_POST(self):
                    body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
                    received.append({"path": self.path, "auth": self.headers.get("X-Collector-Key"), "body": json.loads(body or b"{}")})
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b"{}")

                def log_message(self, *args):
                    pass

            collector = http.server.ThreadingHTTPServer(("0.0.0.0", 0), Collector)
            threading.Thread(target=collector.serve_forever, daemon=True).start()
            collector_host = os.environ.get("NEXORA_SMOKE_COLLECTOR_HOST", "127.0.0.1")
            endpoint = f"http://{collector_host}:{collector.server_address[1]}/v1/traces"
            status, saved = admin.call("PUT", "/api/nexora/traces/settings", {"otlp": {"enabled": True, "endpoint": endpoint, "headers": [{"name": "X-Collector-Key", "value": "cle-de-fumee"}]}})
            require(status == 200, f"OTLP settings returned HTTP {status}: {str(saved)[:200]}")
            require("cle-de-fumee" not in json.dumps(saved), "an export header value came back from the settings")
            status, tested = admin.call("POST", "/api/nexora/traces/settings/test-export", {})
            require(status == 200 and tested.get("ok"), f"export test failed: {tested}")
            marker = f"export-{secrets.token_hex(3)}"
            status, text = s.call("POST", "/api/nexora/playground", {"workspaceId": ws, "model": "vllm/nexora-default", "temperature": 0.2, "maxTokens": 512,
                                  "messages": [{"role": "user", "content": f"Réponds simplement « {marker} »."}]}, raw=True, timeout=300)
            require(status == 200, f"playground returned HTTP {status}")
            deadline = time.monotonic() + 10
            spans: list[dict] = []
            while time.monotonic() < deadline and not spans:
                for item in received:
                    for resource in item["body"].get("resourceSpans", []):
                        for scope in resource.get("scopeSpans", []):
                            spans += [sp for sp in scope.get("spans", []) if marker in json.dumps(sp)]
                time.sleep(0.4)
            require(spans, f"the collector got no span of the Playground call ({len(received)} request(s))")
            require(any(r["auth"] == "cle-de-fumee" for r in received), "the collector did not get the configured header")
            attrs = {a["key"] for sp in spans for a in sp["attributes"]}
            require({"gen_ai.request.model", "gen_ai.usage.input_tokens"} <= attrs, f"missing gen_ai attributes: {sorted(attrs)}")
            admin.call("PUT", "/api/nexora/traces/settings", {"otlp": {"enabled": False, "headers": []}})

            # (f) a person outside the workspace reads nothing of it
            outsider = Smoke(args.url, args.origin)
            status, _ = outsider.call("POST", "/api/auth/sign-up/email", {"email": f"hors-espace-{secrets.token_hex(4)}@nexora.test", "password": secrets.token_hex(16), "name": "Hors espace"})
            require(status == 200, f"outsider sign-up returned HTTP {status}")
            status, _ = outsider.call("GET", f"/api/nexora/traces?workspaceId={ws}")
            require(status in (403, 404), f"a non-member lists the traces (HTTP {status})")
            status, _ = outsider.call("GET", f"/api/nexora/traces/{trace['id']}?workspaceId={ws}")
            require(status in (403, 404), f"a non-member reads a trace (HTTP {status})")
            status, _ = outsider.call("GET", "/api/nexora/traces/settings")
            require(status == 403, f"a plain member reads the trace settings (HTTP {status})")

            # (d) retention of one day, clock two days ahead: the workspace's traces are purged
            status, _ = admin.call("PUT", "/api/nexora/traces/settings", {"retentionDays": 1})
            require(status == 200, f"retention change returned HTTP {status}")
            before = len(traces_of(s))
            require(before >= 3, f"too few traces before the purge: {before}")
            as_of = time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(time.time() + 2 * 86400))
            status, purged = admin.call("POST", "/api/nexora/traces/purge", {"workspaceId": ws, "asOf": as_of})
            require(status == 200 and purged["deletedTraces"] >= before, f"purge returned HTTP {status}: {purged}")
            require(not traces_of(s), "traces remain after the simulated purge")
            return (f"arbre modèle → connaissances → modèle en {appeared:.1f} s, IBAN et e-mail masqués ({found[0]['maskedCount']} masquages), "
                    f"« durée > 10 s » ⇒ {len(over_ten)} sur {fast_total}, collecteur OTLP : {len(spans)} span(s), "
                    f"purge simulée : {purged['deletedTraces']} traces, extérieur refusé")
        finally:
            admin.call("PUT", "/api/nexora/traces/settings", {"retentionDays": 30, "otlp": {"enabled": False, "headers": []}})
            if collector:
                collector.shutdown()
            s.call("DELETE", f"/api/workflows/{agent_wf}")
            if wait_wf:
                s.call("DELETE", f"/api/workflows/{wait_wf}")


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

    def prompts():
        """K9: a published agent reads its instructions from a versioned prompt at run time: moving
        the production label changes its answer without republishing, moving it back restores it,
        each run records the version it used, and a workspace key reads the labelled version."""
        name = f"Fumée prompts {secrets.token_hex(3)}"
        status, body = s.call("POST", "/api/nexora/prompts", {
            "workspaceId": state["ws"], "name": name, "note": "Première version",
            "content": "Réponds uniquement par le mot POMME, en majuscules, sans rien ajouter."})
        require(status == 200 and body.get("prompt", {}).get("labels") == {"production": 1, "test": 1},
                f"prompt creation returned HTTP {status}: {str(body)[:200]}")
        prompt_id = body["prompt"]["id"]
        wf, key_id = None, None
        try:
            status, body = s.call("POST", f"/api/nexora/prompts/{prompt_id}/versions", {
                "workspaceId": state["ws"], "note": "Un autre fruit",
                "content": "Réponds uniquement par le mot {{fruit}}, en majuscules, sans rien ajouter.",
                "variables": [{"name": "fruit", "type": "text", "defaultValue": "CERISE"}]})
            require(status == 200 and body.get("version", {}).get("version") == 2, f"new version returned HTTP {status}: {str(body)[:200]}")
            require(body["prompt"]["labels"]["production"] == 1, "a new version moved the production label")

            status, body = s.call("POST", "/api/workflows", {"name": f"Agent à prompt {secrets.token_hex(3)}", "workspaceId": state["ws"]})
            require(status in (200, 201), f"workflow creation returned HTTP {status}")
            wf = body.get("id") or (body.get("workflow") or body.get("data") or {}).get("id")
            start, agent_id = secrets.token_hex(8), secrets.token_hex(8)
            sub = lambda i, t, v: {"id": i, "type": t, "value": v}
            status, body = s.call("PUT", f"/api/workflows/{wf}/state", {"blocks": {
                start: {"id": start, "type": "start_trigger", "name": "Start", "position": {"x": 0, "y": 0}, "enabled": True,
                        "subBlocks": {"inputFormat": sub("inputFormat", "input-format", [])}, "outputs": {}},
                agent_id: {"id": agent_id, "type": "agent", "name": "Agent", "position": {"x": 420, "y": 0}, "enabled": True,
                           "subBlocks": {"messages": sub("messages", "messages-input", [{"role": "system", "content": "Réponds par le mot BANANE."}, {"role": "user", "content": "<start.input>"}]),
                                         "model": sub("model", "combobox", os.environ.get("NEXORA_SMOKE_PROMPTS_MODEL", "vllm/nexora-default")),
                                         "promptId": sub("promptId", "combobox", prompt_id),
                                         "promptLabel": sub("promptLabel", "dropdown", "production")},
                           "outputs": {}}},
                "edges": [{"id": secrets.token_hex(8), "source": start, "target": agent_id, "sourceHandle": "source", "targetHandle": "target"}],
                "loops": {}, "parallels": {}})
            require(status == 200, f"state save returned HTTP {status}: {str(body)[:200]}")
            status, body = s.call("POST", f"/api/workflows/{wf}/deploy", {})
            require(status == 200, f"deploy returned HTTP {status}: {str(body)[:200]}")

            def run_published() -> tuple[str, int]:
                status, body = s.call("POST", f"/api/workflows/{wf}/execute", {"input": "Quel est ton mot ?", "stream": False}, timeout=300)
                require(status == 200 and body.get("success"), f"run returned HTTP {status}: {str(body.get('error') or body)[:200]}")
                output = body.get("output") or {}
                return str(output.get("content") or ""), int((output.get("prompt") or {}).get("version") or 0)

            def move(version: int):
                status, body = s.call("PUT", f"/api/nexora/prompts/{prompt_id}/labels", {"workspaceId": state["ws"], "label": "production", "version": version})
                require(status == 200 and body["prompt"]["labels"]["production"] == version, f"label move returned HTTP {status}: {str(body)[:200]}")

            answer, used = run_published()
            require("POMME" in answer.upper() and used == 1, f"production v1: expected POMME (v1), got {answer[:80]!r} (v{used})")
            move(2)
            answer, used = run_published()
            require("CERISE" in answer.upper() and used == 2, f"after the move to v2 without republishing: expected CERISE (v2), got {answer[:80]!r} (v{used})")
            move(1)
            answer, used = run_published()
            require("POMME" in answer.upper() and used == 1, f"back to v1: expected POMME, got {answer[:80]!r} (v{used})")

            status, body = s.call("POST", f"/api/workspaces/{state['ws']}/api-keys", {"name": f"fumee-prompts-{secrets.token_hex(3)}"})
            require(status in (200, 201), f"workspace key creation returned HTTP {status}: {str(body)[:200]}")
            key_id, key = body["key"]["id"], body["key"]["key"]
            status, body = s.call("GET", f"/api/v2/prompts/{prompt_id}?workspaceId={state['ws']}&label=production", headers={"x-api-key": key})
            require(status == 200 and body["data"]["version"]["number"] == 1 and "POMME" in body["data"]["version"]["content"],
                    f"v2 API, label=production: HTTP {status} {str(body)[:200]}")
            status, body = s.call("GET", f"/api/v2/prompts/{prompt_id}?workspaceId={state['ws']}&version=2", headers={"x-api-key": key})
            require(status == 200 and body["data"]["version"]["variables"][0]["name"] == "fruit", f"v2 API, version=2: HTTP {status} {str(body)[:200]}")
            status, _ = s.call("GET", f"/api/v2/prompts/{prompt_id}?workspaceId={state['ws']}")
            require(status == 401, f"v2 API without a key answered HTTP {status}")
            return "POMME (v1) → CERISE (v2) sans republier → POMME (v1) ; API v2 avec une clé d'espace"
        finally:
            if wf:
                s.call("DELETE", f"/api/workflows/{wf}")
            if key_id:
                s.call("DELETE", f"/api/workspaces/{state['ws']}/api-keys/{key_id}")
            s.call("DELETE", f"/api/nexora/prompts/{prompt_id}?workspaceId={state['ws']}")

    def evaluations():
        """K10: a test set, a judge and a campaign comparing two targets run in the background; the
        statistics and the row-by-row comparison are read, a failing target under its threshold
        raises an alert, a campaign can be cancelled, and a schedule launches its campaign."""
        base = "/api/nexora/evaluations"
        ws = state["ws"]
        model = os.environ.get("NEXORA_SMOKE_EVAL_MODEL", "vllm/nexora-default")
        lines = [
            {"question": "Combien font 2+2 ? Réponds par un seul chiffre.", "attendu": "4",
             "réponse": "OK: 4", "verdict": "pass", "justification": "Le bon chiffre."},
            {"question": "Quelle est la capitale de la France ? Réponds en un mot.", "attendu": "Paris"},
            {"question": "De quelle couleur est le ciel par temps clair ? Réponds en un mot.", "attendu": "bleu"},
        ]
        text = "\n".join(json.dumps(line, ensure_ascii=False) for line in lines)
        suffix = secrets.token_hex(3)
        status, body = s.call("POST", f"{base}/datasets", {"workspaceId": ws, "name": f"Fumée jeu {suffix}", "source": {"kind": "jsonl", "text": text}})
        require(status == 200 and body["dataset"]["rowCount"] == 3 and body["dataset"]["annotatedCount"] == 1,
                f"dataset import returned HTTP {status}: {str(body)[:200]}")
        dataset_id = body["dataset"]["id"]
        status, body = s.call("POST", f"{base}/judges", {"workspaceId": ws, "name": f"Fumée juge {suffix}",
                                                          "config": {"kind": "contains", "value": "OK:", "caseSensitive": False}})
        require(status == 200, f"judge creation returned HTTP {status}: {str(body)[:200]}")
        judge_id = body["judge"]["id"]
        long_dataset_id = None
        try:
            status, body = s.call("POST", f"{base}/judges/try", {"workspaceId": ws, "datasetId": dataset_id, "limit": 10,
                                                                  "config": {"kind": "contains", "value": "OK:", "caseSensitive": False}})
            require(status == 200 and body["agreement"]["total"] == 1 and body["agreement"]["rate"] == 1.0,
                    f"judge trial returned HTTP {status}: {str(body)[:300]}")

            def wait(campaign_id: str, seconds: int = 240) -> dict:
                deadline = time.time() + seconds
                while time.time() < deadline:
                    status, body = s.call("GET", f"{base}/campaigns/{campaign_id}?workspaceId={ws}")
                    require(status == 200, f"campaign read returned HTTP {status}")
                    if body["campaign"]["status"] not in ("pending", "running"):
                        return body
                    time.sleep(2)
                raise AssertionError(f"campaign {campaign_id} did not finish in {seconds} s")

            # The judge looks for the marker « OK: »: only the first target is told to write it.
            targets = [{"kind": "model", "model": model, "system": "Chaque réponse doit commencer exactement par OK: suivi de la réponse la plus brève possible (exemple : OK: Paris)."},
                       {"kind": "model", "model": model}]
            status, body = s.call("POST", f"{base}/campaigns", {"workspaceId": ws, "name": f"Fumée campagne {suffix}", "datasetId": dataset_id,
                                                                 "judgeId": judge_id, "targets": targets, "concurrency": 2, "alertThreshold": 0.9})
            require(status == 200, f"campaign launch returned HTTP {status}: {str(body)[:200]}")
            campaign_id = body["campaign"]["id"]
            result = wait(campaign_id)
            require(result["campaign"]["status"] == "completed", f"campaign ended {result['campaign']['status']}: {result['campaign'].get('error')}")
            stats = {entry["targetKey"]: entry["summary"] for entry in result["summaries"]}
            require(stats["t1"]["finished"] == 3 and stats["t2"]["finished"] == 3, f"unexpected counts: {stats}")
            require(stats["t1"]["passRate"] == 1.0 and stats["t2"]["passRate"] == 0.0,
                    f"pass rates: t1={stats['t1']['passRate']} t2={stats['t2']['passRate']}")
            require(stats["t1"]["latencyP50"] is not None and stats["t1"]["inputTokens"] > 0, "latency or tokens missing")
            status, body = s.call("GET", f"{base}/compare?workspaceId={ws}&a={campaign_id}:t2&b={campaign_id}:t1")
            require(status == 200 and body["counts"]["improved"] == 3 and body["counts"]["regressed"] == 0,
                    f"comparison returned HTTP {status}: {str(body.get('counts') or body)[:200]}")
            status, body = s.call("GET", f"{base}/alerts?workspaceId={ws}")
            alerts = [a for a in body["alerts"] if a["campaignId"] == campaign_id]
            require(status == 200 and len(alerts) == 1 and alerts[0]["targetKey"] == "t2" and alerts[0]["passRate"] == 0.0,
                    f"alerts returned HTTP {status}: {str(alerts)[:200]}")
            status, _ = s.call("POST", f"{base}/alerts/{alerts[0]['id']}/acknowledge", {"workspaceId": ws})
            require(status == 200, f"acknowledge returned HTTP {status}")

            # A long campaign (84 items, one at a time) is still running when it is cancelled.
            status, body = s.call("POST", f"{base}/datasets", {"workspaceId": ws, "name": f"Fumée long jeu {suffix}",
                                                                "source": {"kind": "jsonl", "text": "\n".join([text] * 14)}})
            require(status == 200 and body["dataset"]["rowCount"] == 42, f"long dataset returned HTTP {status}: {str(body)[:200]}")
            long_dataset_id = body["dataset"]["id"]
            status, body = s.call("POST", f"{base}/campaigns", {"workspaceId": ws, "name": f"Fumée annulée {suffix}", "datasetId": long_dataset_id,
                                                                 "judgeId": judge_id, "targets": targets, "concurrency": 1})
            require(status == 200, f"second launch returned HTTP {status}")
            cancelled_id = body["campaign"]["id"]
            status, body = s.call("POST", f"{base}/campaigns/{cancelled_id}/cancel", {"workspaceId": ws})
            require(status == 200 and body["campaign"]["status"] == "cancelled", f"cancel returned HTTP {status}: {str(body)[:200]}")
            time.sleep(3)
            status, body = s.call("GET", f"{base}/campaigns/{cancelled_id}?workspaceId={ws}")
            require(body["campaign"]["status"] == "cancelled", f"a cancelled campaign became {body['campaign']['status']}")

            status, body = s.call("POST", f"{base}/schedules", {"workspaceId": ws, "name": f"Fumée nuit {suffix}", "cron": "0 3 * * *", "timezone": "Europe/Paris",
                                                                 "datasetId": dataset_id, "judgeId": judge_id, "targets": targets[:1], "alertThreshold": 0.5})
            require(status == 200 and body["schedule"]["nextRunAt"], f"schedule creation returned HTTP {status}: {str(body)[:200]}")
            schedule_id = body["schedule"]["id"]
            status, body = s.call("POST", f"{base}/schedules/{schedule_id}/run", {"workspaceId": ws})
            require(status == 200, f"schedule run returned HTTP {status}: {str(body)[:200]}")
            scheduled = wait(body["campaign"]["id"])
            require(scheduled["campaign"]["status"] == "completed" and scheduled["campaign"]["scheduleId"] == schedule_id,
                    f"scheduled campaign: {scheduled['campaign']['status']}")
            status, body = s.call("DELETE", f"{base}/schedules/{schedule_id}?workspaceId={ws}")
            require(status == 200, f"schedule deletion returned HTTP {status}")
            return (f"jeu de 3 lignes, 2 cibles : réussite {int(stats['t1']['passRate'] * 100)} % et {int(stats['t2']['passRate'] * 100)} %, "
                    "comparaison 3 améliorations, alerte levée puis acquittée, annulation, planification lancée")
        finally:
            for campaign in s.call("GET", f"{base}/campaigns?workspaceId={ws}")[1].get("campaigns", []):
                if campaign["name"].startswith("Fumée") and campaign["name"].endswith(suffix) or f"Fumée nuit {suffix}" in campaign["name"]:
                    s.call("DELETE", f"{base}/campaigns/{campaign['id']}?workspaceId={ws}")
            s.call("DELETE", f"{base}/judges/{judge_id}?workspaceId={ws}")
            for leftover in (dataset_id, long_dataset_id):
                if leftover:
                    s.call("DELETE", f"{base}/datasets/{leftover}?workspaceId={ws}")

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
    s.check("Playground : réflexion séparée de la réponse", playground_reasoning)
    s.check("Agent : publication, chat public, versions", agent)
    s.check("Prompts : étiquette production déplacée sans republier, API v2", prompts)
    s.check("Assistant : conversation en flux, historique, cloisonnement", assistant)
    s.check("API développeur : clé, modèle et agent au format OpenAI, refus 401 et 403", developer_api)
    s.check("Traces : arbre, IBAN masqué, durée > 10 s, collecteur OTLP, purge, cloisonnement", traces)
    s.check("Évaluations : campagne, statistiques, comparaison, alerte, annulation, planification", evaluations)
    if os.environ.get("NEXORA_SMOKE_WEB_SEARCH") == "1":
        s.check("Recherche web (SearXNG)", web_search)
    for name in TEMPLATE_INPUTS:
        if name != MEETING_TEMPLATE:
            s.check(f"Exécution du modèle « {name} »", run_template(name))
    s.check("Lecture de document (OCR, modèle de vision local)", ocr)
    s.check("Transcription vocale (modèle local)", transcription)
    s.check("Synthèse vocale (voix locale : Assistant, API développeur, dictée)", speech)
    s.check("Réunion : intervenants par voix, compte rendu, validation", meeting)
    s.check("Extraction : facture PDF et scannée ⇒ table « Factures »", extraction)
    s.check("Copilote : description ⇒ workflow exécuté", copilot)
    s.check("Étapes : modèles PME et Copilote ouverts en Étapes, étape modifiée, forme intacte, exécution", etapes)
    s.check("Budgets : refus au plafond, reprise après relèvement", budgets)
    s.check("Journal d'audit", audit)
    s.check("Gouvernance : réglages d'instance, e-mail de test", governance)
    s.check("Consommation mesurée par Nexora API", usage)
    s.check("Modèles : liste, ajout, test, défaut, retrait", models)
    s.check("Modèles : fiche du modèle par défaut (test, raisonnement, localisation)", model_card)

    failed = [r for r in s.results if r["status"] != "pass"]
    print(f"\n{len(s.results) - len(failed)}/{len(s.results)} contrôles réussis")
    if args.report:
        with open(args.report, "w", encoding="utf-8") as handle:
            json.dump({"url": s.url, "results": s.results}, handle, ensure_ascii=False, indent=2)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
