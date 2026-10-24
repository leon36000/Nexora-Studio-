"""Mesure l'exactitude de l'extraction de factures (K4) sur le jeu versionné de ce dossier.

Usage :
  NEXORA_API_KEY=... python3 -I docs/verification/k4-factures/mesurer.py \\
      [--url http://127.0.0.1:8000/v1] [--vision-model qwen2.5vl:3b] \\
      [--annotation-model nexora-default] [--report rapport.json]

Chaque facture part à `POST /v1/ocr` de Nexora API avec le schéma du modèle prêt « Facture » de
WorkStudio (mêmes champs, mêmes descriptions que `lib/nexora/document-ai/fields.ts`), puis les six
champs du critère K4 (numéro, date, fournisseur, HT, TVA, TTC) sont comparés à `attendu.json` :
texte sans tenir compte de la casse, des accents, des espaces ni de la ponctuation ; dates au jour ;
montants à 0,01 près. La clé n'est jamais affichée. Bibliothèque standard seulement. Code de
sortie 0 quand l'exactitude atteint le seuil (90 % par défaut).
"""

from __future__ import annotations

import argparse
import base64
import json
import os
from pathlib import Path
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request

HERE = Path(__file__).resolve().parent
FIELDS = ("numero", "date", "fournisseur", "total_ht", "total_tva", "total_ttc")

# Le modèle prêt « Facture » de WorkStudio (annotationFormat d'EXTRACTION_TEMPLATES.invoice).
INVOICE_FIELDS = [
    ("numero", "string", "Numéro de la facture"),
    ("date", "date", "Date d’émission de la facture"),
    ("fournisseur", "string", "Raison sociale du fournisseur qui émet la facture, sans son adresse"),
    ("client", "string", "Nom du client facturé, sans son adresse"),
    ("total_ht", "number", "Montant total hors taxes"),
    ("total_tva", "number", "Montant total de la TVA"),
    ("total_ttc", "number", "Montant total toutes taxes comprises, à payer"),
    ("date_echeance", "date", "Date d’échéance du paiement"),
    ("devise", "string", "Code ISO de la devise, par exemple EUR"),
]


def annotation_format() -> dict:
    properties = {}
    for name, kind, description in INVOICE_FIELDS:
        notes = [description] + (["date au format AAAA-MM-JJ"] if kind == "date" else [])
        properties[name] = {"type": ["number" if kind == "number" else "string", "null"], "description": " ; ".join(notes)}
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "extraction",
            "strict": True,
            "schema": {"type": "object", "additionalProperties": False, "required": [f[0] for f in INVOICE_FIELDS], "properties": properties},
        },
    }


def document_of(path: Path) -> dict:
    data = base64.b64encode(path.read_bytes()).decode()
    if path.suffix == ".pdf":
        return {"type": "document_url", "document_url": f"data:application/pdf;base64,{data}"}
    mime = "image/png" if path.suffix == ".png" else "image/jpeg"
    return {"type": "image_url", "image_url": f"data:{mime};base64,{data}"}


def text_key(value) -> str:
    text = unicodedata.normalize("NFD", str(value or "")).encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]", "", text)


def amount(value) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    text = re.sub(r"[\s  €]|eur$", "", str(value or ""), flags=re.I)
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".") if text.rfind(",") > text.rfind(".") else text.replace(",", "")
    else:
        text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def same(field: str, expected, got) -> bool:
    if field.startswith("total_"):
        value = amount(got)
        return value is not None and abs(value - expected) <= 0.01
    if field == "date":
        text = str(got or "")
        match = re.match(r"(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$", text)
        return (f"{match[3]}-{int(match[2]):02d}-{int(match[1]):02d}" if match else text[:10]) == expected
    return text_key(got) == text_key(expected)


def call(url: str, key: str, body: dict, timeout: int) -> tuple[int, dict | str]:
    request = urllib.request.Request(f"{url}/ocr", data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode(errors="replace")[:500]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default=os.environ.get("NEXORA_API_URL", "http://127.0.0.1:8000/v1"))
    parser.add_argument("--vision-model", default="qwen2.5vl:3b")
    parser.add_argument("--annotation-model", default="nexora-default")
    parser.add_argument("--only", help="ne mesurer que les fichiers dont le nom contient ce texte")
    parser.add_argument("--threshold", type=float, default=0.9)
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--report")
    args = parser.parse_args()
    key = os.environ.get("NEXORA_API_KEY", "")
    if not key:
        print("NEXORA_API_KEY manquante (clé Nexora API ayant accès aux deux modèles)", file=sys.stderr)
        return 2

    expected = json.loads((HERE / "attendu.json").read_text(encoding="utf-8"))
    results, correct, total = [], 0, 0
    for name, values in expected.items():
        if args.only and args.only not in name:
            continue
        body = {"model": args.vision_model, "document": document_of(HERE / name), "document_annotation_format": annotation_format(),
                "annotation_model": args.annotation_model}
        started = time.monotonic()
        status, data = call(args.url.rstrip("/"), key, body, args.timeout)
        seconds = round(time.monotonic() - started, 1)
        annotation, error = {}, None
        cut = isinstance(data, dict) and any(page.get("truncated") for page in data.get("pages", []))
        if status == 200 and isinstance(data, dict) and data.get("document_annotation"):
            annotation = json.loads(data["document_annotation"])
        else:
            error = f"HTTP {status}: {data.get('document_annotation_error') if isinstance(data, dict) else data}"
        fields = {field: {"attendu": values[field], "lu": annotation.get(field), "exact": same(field, values[field], annotation.get(field))} for field in FIELDS}
        good = sum(item["exact"] for item in fields.values())
        correct, total = correct + good, total + len(FIELDS)
        wrong = ", ".join(f"{f} = {fields[f]['lu']!r}" for f in FIELDS if not fields[f]["exact"])
        note = " (lecture tronquée)" if cut else ""
        print(f"{name:<22} {good}/{len(FIELDS)}  {seconds:>6} s  {wrong or error or ''}{note}", flush=True)
        results.append({"fichier": name, "secondes": seconds, "exacts": good, "lecture_tronquee": cut, "champs": fields, "erreur": error})

    accuracy = correct / total if total else 0.0
    print(f"\nExactitude : {correct}/{total} champs = {accuracy:.1%} (lecture {args.vision_model}, structuration {args.annotation_model})")
    if args.report:
        Path(args.report).write_text(json.dumps({
            "date": time.strftime("%Y-%m-%d %H:%M"), "lecture": args.vision_model, "structuration": args.annotation_model,
            "exactitude": round(accuracy, 4), "champs_exacts": correct, "champs": total, "factures": results,
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0 if accuracy >= args.threshold else 1


if __name__ == "__main__":
    sys.exit(main())
