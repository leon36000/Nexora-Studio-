#!/usr/bin/env python3
"""Fait d'un modèle le modèle par défaut de l'instance de test (l'ajoute au besoin), ou restaure l'ancien.

Usage : python3 -I scripts/verification/modele-defaut.py URL ORIGINE NOM [URL_AMONT]
  URL_AMONT  adresse OpenAI-compatible du modèle s'il faut l'ajouter (ex. http://host.docker.internal:18141)
Sortie : « ancien-id nom-ancien » sur une ligne, à repasser à restaurer (NOM = « --restaurer », puis l'identifiant).
La clé du modèle, si besoin, vient de NEXORA_VERIF_UPSTREAM_KEY (jamais en argument).
Les identifiants de l'administrateur viennent de NEXORA_SMOKE_ADMIN_EMAIL / NEXORA_SMOKE_ADMIN_PASSWORD.
"""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path

spec = importlib.util.spec_from_file_location("smoke", Path(__file__).resolve().parent.parent / "smoke.py")
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def main() -> int:
    url, origin, name = sys.argv[1], sys.argv[2], sys.argv[3]
    admin = smoke.Smoke(url, origin)
    status, _ = admin.call("POST", "/api/auth/sign-in/email", {"email": os.environ["NEXORA_SMOKE_ADMIN_EMAIL"], "password": os.environ["NEXORA_SMOKE_ADMIN_PASSWORD"]})
    if status != 200:
        print(f"connexion administrateur refusée (HTTP {status})")
        return 1
    _, body = admin.call("GET", "/api/nexora/models")
    current = next(m for m in body["models"] if m["isDefault"])
    if name == "--restaurer":
        status, _ = admin.call("POST", f"/api/nexora/models/{sys.argv[4]}/default")
        print("restauré" if status == 200 else f"échec (HTTP {status})")
        return 0 if status == 200 else 1
    target = next((m for m in body["models"] if m["name"] == name), None)
    if target is None:
        status, added = admin.call("POST", "/api/nexora/models", {"source": "openai-compatible", "model": name, "url": sys.argv[4],
                                                         **({"key": os.environ["NEXORA_VERIF_UPSTREAM_KEY"]} if os.environ.get("NEXORA_VERIF_UPSTREAM_KEY") else {})}, timeout=180)
        if status != 200:
            print(f"ajout refusé (HTTP {status}): {added}")
            return 1
        target = added["model"]
    status, tested = admin.call("POST", f"/api/nexora/models/{target['id']}/test", timeout=600)
    if status != 200 or not tested.get("reply"):
        print(f"test refusé (HTTP {status}): {tested}")
        return 1
    status, _ = admin.call("POST", f"/api/nexora/models/{target['id']}/default")
    if status != 200:
        print(f"défaut refusé (HTTP {status})")
        return 1
    print(f"{current['id']} {current['name']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
