#!/usr/bin/env python3
"""Les cinq descriptions types du Copilote (spec v2 §8octies), de bout en bout.

Pour chaque description : plan demandé au modèle de l'instance, workflow créé,
puis exécuté une fois. Une exécution qui s'arrête sur une validation humaine
compte comme réussie (elle attend la personne).

Usage : python3 -I scripts/verification/copilote-cinq.py [URL] [ORIGINE]
  URL     adresse de WorkStudio (défaut http://localhost:3200)
  ORIGINE adresse publique que WorkStudio reconnaît, si différente de URL
Sortie : une ligne par description, puis « N/5 » ; code de retour 0 si 5/5.
"""

from __future__ import annotations

import importlib.util
import json
import secrets
import sys
import time
from pathlib import Path

SMOKE = Path(__file__).resolve().parent.parent / "smoke.py"
spec = importlib.util.spec_from_file_location("smoke", SMOKE)
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

DESCRIPTIONS = [
    "Chaque lundi à 9 h, relancer par e-mail les factures impayées.",
    "Trier les e-mails reçus par webhook : urgent ou non urgent.",
    "Répondre à une question avec la base de connaissances FAQ.",
    "Rédiger le compte rendu d'une réunion, puis le faire valider avant envoi.",
    "Appeler une API puis résumer la réponse.",
]
SAMPLE = "Bonjour, la facture F-2026-118 de 1 240 euros est en retard ; merci de nous répondre vite, c'est urgent."
SAMPLE_URL = "https://jsonplaceholder.typicode.com/todos/1"


def sample_for(field: str) -> str:
    """A plausible value for a trigger field, judged by its name."""
    name = field.lower()
    if any(word in name for word in ("url", "lien", "adresse_api", "endpoint")):
        return SAMPLE_URL
    if "mail" in name and "contenu" not in name and "texte" not in name:
        return "client@exemple.fr"
    return SAMPLE


def main() -> int:
    url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3200"
    origin = sys.argv[2] if len(sys.argv) > 2 else None
    s = smoke.Smoke(url, origin)
    email = f"copilote-{secrets.token_hex(4)}@nexora.test"
    status, _ = s.call("POST", "/api/auth/sign-up/email", {"email": email, "password": secrets.token_urlsafe(18), "name": "Vérification Copilote"})
    if status != 200:
        print(f"inscription refusée (HTTP {status})")
        return 1
    status, body = s.call("POST", "/api/workspaces", {"name": "Copilote cinq descriptions"}, timeout=300)
    if status != 200:
        print(f"espace refusé (HTTP {status})")
        return 1
    ws = body["workspace"]["id"]
    passed = 0
    for index, description in enumerate(DESCRIPTIONS, 1):
        started = time.time()
        try:
            status, body = s.call("POST", "/api/nexora/copilot/plan", {"workspaceId": ws, "description": description}, timeout=900)
            if status != 200 or not body.get("plan"):
                raise RuntimeError(f"plan HTTP {status}: {str(body)[:200]}")
            plan = body["plan"]
            status, created = s.call("POST", "/api/nexora/copilot/create", {"workspaceId": ws, "plan": plan})
            if status != 200 or not created.get("workflowId"):
                raise RuntimeError(f"création HTTP {status}: {str(created)[:200]}")
            fields = [f["name"] for f in (plan.get("trigger") or {}).get("fields") or []]
            run_input = {name: sample_for(name) for name in fields} if fields else SAMPLE
            status, run = s.call("POST", f"/api/workflows/{created['workflowId']}/execute",
                                 {"useDraftState": True, "stream": False, "input": run_input}, timeout=900)
            if status != 200 or run.get("success") is False or run.get("error"):
                raise RuntimeError(f"exécution HTTP {status}: {str(run)[:200]}")
            steps = [step.get("kind") for step in plan.get("steps", [])]
            trigger = (plan.get("trigger") or {}).get("kind")
            print(f"[{index}] OK {time.time() - started:.0f}s déclencheur={trigger} étapes={steps} "
                  f"avertissements={body.get('warnings', [])} | {json.dumps(run, ensure_ascii=False)[:120]}")
            passed += 1
        except Exception as error:  # noqa: BLE001 — one line per description, whatever failed
            print(f"[{index}] ÉCHEC {time.time() - started:.0f}s {error}")
    print(f"{passed}/5")
    return 0 if passed == 5 else 1


if __name__ == "__main__":
    sys.exit(main())
