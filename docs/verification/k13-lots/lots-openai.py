"""K13 : le même classement des 500 avis, par le client `openai` officiel (files.create puis batches.create).

Lit une clé `sk-nexora-…` (variable NEXORA_API_KEY, créée dans Réglages › Clés API, jamais en argument),
envoie un JSONL de 500 requêtes `/v1/chat/completions` pour `qwen2.5:7b`, suit le lot jusqu'au bout,
télécharge le fichier de sortie et mesure l'exactitude contre la colonne `attendu` de `avis.csv`.

Usage : NEXORA_API_KEY=sk-nexora-… python3 lots-openai.py --url http://127.0.0.1:3219/v1 --report rapport-openai.json
(à lancer avec le python du venv où `openai` est installé : .nexora-work/oa-venv/bin/python)
"""
import argparse
import csv
import json
import os
import time
from pathlib import Path

import openai
from openai import OpenAI

ICI = Path(__file__).resolve().parent
CATEGORIES = ("livraison", "produit", "sav", "prix")
CONSIGNE = (
    "Tu classes des avis de clients. Réponds par un seul mot, en minuscules, choisi dans cette liste : "
    "livraison, produit, sav, prix. Le sujet « sav » regroupe le service client et le service après-vente.\n\n"
    "Avis : {avis}\n\nSujet :"
)


def normalise(texte: str) -> str:
    mot = (texte or "").strip().lower().strip(" .\"'«»:")
    for categorie in CATEGORIES:
        if mot.startswith(categorie):
            return categorie
    return mot


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:3219/v1")
    parser.add_argument("--model", default="qwen2.5:7b")
    parser.add_argument("--csv", default=str(ICI / "avis.csv"))
    parser.add_argument("--max-tokens", type=int, default=6)
    parser.add_argument("--kill-after", type=int, default=0, help="s'arrête après N lignes traitées pour qu'on tue le serveur (preuve de reprise)")
    parser.add_argument("--report", default=str(ICI / "rapport-openai.json"))
    args = parser.parse_args()

    client = OpenAI(base_url=args.url, api_key=os.environ["NEXORA_API_KEY"])
    avis = list(csv.DictReader(open(args.csv, encoding="utf-8")))
    lignes = [
        json.dumps({
            "custom_id": f"avis-{ligne['numero']}", "method": "POST", "url": "/v1/chat/completions",
            "body": {"model": args.model, "temperature": 0, "max_tokens": args.max_tokens,
                     "messages": [{"role": "user", "content": CONSIGNE.format(avis=ligne["avis"])}]},
        }, ensure_ascii=False)
        for ligne in avis
    ]
    chemin = ICI / "entree-lot.jsonl"
    chemin.write_text("\n".join(lignes) + "\n", encoding="utf-8")

    debut = time.time()
    fichier = client.files.create(file=open(chemin, "rb"), purpose="batch")
    lot = client.batches.create(input_file_id=fichier.id, endpoint="/v1/chat/completions", completion_window="24h", metadata={"jalon": "k13"})
    print(f"fichier {fichier.id} ({fichier.bytes} octets), lot {lot.id} : {lot.request_counts.total} requêtes", flush=True)
    rapport = {"fichier": fichier.id, "lot": lot.id, "modele": args.model, "requetes": lot.request_counts.total}
    dernier = -1
    while lot.status in ("validating", "in_progress", "cancelling"):
        time.sleep(5)
        try:
            lot = client.batches.retrieve(lot.id)
        except openai.APIConnectionError:
            print("serveur injoignable (arrêté pour le test ?), on réessaie", flush=True)
            continue
        fait = lot.request_counts.completed + lot.request_counts.failed
        if fait != dernier:
            print(f"{time.time() - debut:6.0f} s : {fait}/{lot.request_counts.total}", flush=True)
            dernier = fait
        if args.kill_after and fait >= args.kill_after:
            print(f"{fait} lignes traitées : tuez le serveur maintenant (kill -9), relancez-le, puis appelez le cron ; ce script continue de suivre le lot.", flush=True)
            args.kill_after = 0
    rapport["duree_s"] = round(time.time() - debut, 1)
    rapport["statut"] = lot.status
    rapport["compteurs"] = {"total": lot.request_counts.total, "reussies": lot.request_counts.completed, "echouees": lot.request_counts.failed}
    rapport["jetons"] = {"entree": lot.usage.input_tokens, "sortie": lot.usage.output_tokens} if lot.usage else None

    sortie = client.files.content(lot.output_file_id).text.splitlines() if lot.output_file_id else []
    attendu = {f"avis-{ligne['numero']}": ligne["attendu"] for ligne in avis}
    vus: dict = {}
    for ligne in sortie:
        objet = json.loads(ligne)
        vus.setdefault(objet["custom_id"], []).append(objet)
    doublons = [cle for cle, valeurs in vus.items() if len(valeurs) > 1]
    bons = sum(
        1 for cle, valeurs in vus.items()
        if normalise(valeurs[0]["response"]["body"]["choices"][0]["message"]["content"]) == attendu[cle]
    )
    rapport["sortie"] = {"lignes": len(sortie), "identifiants_distincts": len(vus), "doublons": len(doublons), "manquants": len(set(attendu) - set(vus)),
                         "exactitude": round(bons / len(vus), 4) if vus else None}
    if lot.error_file_id:
        rapport["erreurs"] = client.files.content(lot.error_file_id).text.splitlines()[:5]
    Path(args.report).write_text(json.dumps(rapport, ensure_ascii=False, indent=2))
    print(json.dumps(rapport, ensure_ascii=False))
    return 0 if lot.status == "completed" and not doublons else 1


if __name__ == "__main__":
    raise SystemExit(main())
