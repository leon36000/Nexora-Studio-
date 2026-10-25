"""K13 : classe les 500 avis de `avis.csv` avec un modèle, par l'écran « Traitements par lot ».

Crée un compte jetable et son espace, importe le CSV dans une table, lance un lot (modèle choisi,
colonne `Sujet`, réponse courte), suit sa progression, puis mesure l'exactitude contre la colonne
`attendu` et écrit un rapport JSON. Option --kill-after N : `kill -9` du serveur de développement
(`--pid`) après N lignes traitées, pour la preuve de reprise (le script attend ensuite que vous
relanciez le serveur et appelle le cron).

Usage :
  python3 lancer.py --url http://127.0.0.1:3219 --model vllm/qwen2.5:7b --report rapport.json
"""
import argparse
import csv
import io
import json
import os
import secrets
import sys
import time
import urllib.parse
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "scripts"))
from smoke import Smoke  # noqa: E402

ICI = Path(__file__).resolve().parent
CATEGORIES = ("livraison", "produit", "sav", "prix")
CONSIGNE = (
    "Tu classes des avis de clients. Réponds par un seul mot, en minuscules, choisi dans cette liste : "
    "livraison, produit, sav, prix. Le sujet « sav » regroupe le service client et le service après-vente.\n\n"
    "Avis : {{avis}}\n\nSujet :"
)


def multipart(fields: dict, file_field: str, file_name: str, content: bytes) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    body = b""
    for name, value in fields.items():
        body += f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
    body += (
        f'--{boundary}\r\nContent-Disposition: form-data; name="{file_field}"; filename="{file_name}"\r\n'
        "Content-Type: text/csv\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
    return body, f"multipart/form-data; boundary={boundary}"


def percentile(valeurs: list, p: float) -> float:
    ordre = sorted(valeurs)
    rang = max(0, min(len(ordre) - 1, round(p * (len(ordre) - 1))))
    return ordre[rang]


def latences(s: Smoke, ws: str, n: int, modele: str) -> dict:
    """Latence de bout en bout (flux complet) de n questions interactives du Playground, l'une après l'autre."""
    durees = []
    for i in range(n):
        debut = time.time()
        status, texte = s.call("POST", "/api/nexora/playground", {
            "workspaceId": ws, "model": modele,
            "messages": [{"role": "user", "content": f"Réponds en une phrase courte : quelle est la capitale du pays numéro {i % 7 + 1} de ta liste préférée ?"}],
            "temperature": 0.2, "maxTokens": 256}, raw=True, timeout=300)
        assert status == 200, (status, texte[:200])
        assert '"done"' in texte, texte[:200]
        durees.append(time.time() - debut)
        time.sleep(0.5)
    return {
        "n": n, "p50_s": round(percentile(durees, 0.5), 2), "p95_s": round(percentile(durees, 0.95), 2),
        "moyenne_s": round(sum(durees) / n, 2), "max_s": round(max(durees), 2), "durees_s": [round(d, 2) for d in durees],
    }


def normalise(texte: str) -> str:
    mot = (texte or "").strip().lower().strip(" .\"'«»:")
    for categorie in CATEGORIES:
        if mot.startswith(categorie):
            return categorie
    return mot


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:3219")
    parser.add_argument("--model", default="vllm/qwen2.5:7b")
    parser.add_argument("--csv", default=str(ICI / "avis.csv"))
    parser.add_argument("--concurrency", type=int, default=2)
    parser.add_argument("--max-tokens", type=int, default=6)
    parser.add_argument("--report", default=str(ICI / "rapport.json"))
    parser.add_argument("--kill-after", type=int, default=0, help="kill -9 du serveur après N lignes traitées")
    parser.add_argument("--pid", type=int, default=0)
    parser.add_argument("--latence", type=int, default=0, help="nombre de questions interactives (Playground) avant puis pendant le lot")
    parser.add_argument("--modele-interactif", default="vllm/nexora-default", help="modèle des questions interactives (GLM 5.3 par défaut)")
    parser.add_argument("--email", help="compte de test à créer (sinon jetable aléatoire)")
    parser.add_argument("--password")
    args = parser.parse_args()

    s = Smoke(args.url)
    rapport: dict = {"modele": args.model, "concurrence": args.concurrency, "etapes": []}
    email = args.email or f"k13-{secrets.token_hex(4)}@nexora.test"
    status, body = s.call("POST", "/api/auth/sign-up/email", {"email": email, "password": args.password or secrets.token_hex(16), "name": "K13 Lots"}, timeout=300)
    assert status == 200, (status, body)
    status, body = s.call("POST", "/api/workspaces", {"name": "Lots K13 : 500 avis"}, timeout=600)
    assert status == 200, (status, str(body)[:300])
    ws = body["workspace"]["id"]
    rapport["workspaceId"] = ws

    contenu = Path(args.csv).read_bytes()
    attendues = len(list(csv.reader(io.StringIO(contenu.decode("utf-8"))))) - 1
    donnees, type_contenu = multipart({"workspaceId": ws}, "file", "avis.csv", contenu)
    status, body = s.call("POST", "/api/table/import-csv", data=donnees, content_type=type_contenu, timeout=600)
    assert status == 200, (status, str(body)[:400])
    table_id = body["data"]["table"]["id"] if "data" in body else body["table"]["id"]
    rapport["tableId"] = table_id
    for _ in range(60):
        _, sources = s.call("GET", f"/api/nexora/batches/sources?workspaceId={ws}")
        table = next((t for t in sources["tables"] if t["id"] == table_id), None)
        if table and table["rowCount"] >= attendues:
            break
        time.sleep(1)
    assert table and table["rowCount"] == attendues, f"table importée incomplète : {table}"
    print(f"table {table['name']} : {table['rowCount']} lignes, colonnes {table['columns']}")

    if args.latence:
        rapport["latence_sans_lot"] = latences(s, ws, args.latence, args.modele_interactif)
        print("latence sans lot :", {k: v for k, v in rapport["latence_sans_lot"].items() if k != "durees_s"}, flush=True)

    debut = time.time()
    status, body = s.call("POST", "/api/nexora/batches", {
        "workspaceId": ws, "name": "Classement des avis", "tableId": table_id,
        "target": {"kind": "model", "model": args.model},
        "template": CONSIGNE, "outputColumnName": "Sujet", "maxTokens": args.max_tokens,
        "concurrency": args.concurrency, "expiresInHours": 24,
    }, timeout=300)
    assert status == 200, (status, str(body)[:400])
    lot = body["batch"]
    rapport["batchId"] = lot["id"]
    print(f"lot {lot['id']} lancé : {lot['total']} requêtes")

    if args.latence:
        time.sleep(15)
        _, etat = s.call("GET", f"/api/nexora/batches/{lot['id']}?workspaceId={ws}&limit=1")
        rapport["avancement_au_debut_de_la_mesure"] = etat["batch"]["completed"] + etat["batch"]["failed"]
        rapport["latence_pendant_le_lot"] = latences(s, ws, args.latence, args.modele_interactif)
        _, etat = s.call("GET", f"/api/nexora/batches/{lot['id']}?workspaceId={ws}&limit=1")
        rapport["avancement_a_la_fin_de_la_mesure"] = etat["batch"]["completed"] + etat["batch"]["failed"]
        avant, pendant = rapport["latence_sans_lot"]["p95_s"], rapport["latence_pendant_le_lot"]["p95_s"]
        rapport["hausse_p95"] = round(pendant / avant - 1, 3)
        print("latence pendant le lot :", {k: v for k, v in rapport["latence_pendant_le_lot"].items() if k != "durees_s"}, "hausse du p95 :", rapport["hausse_p95"], flush=True)

    tue = False
    dernier = -1
    while lot["status"] in ("in_progress", "cancelling"):
        time.sleep(3)
        try:
            status, body = s.call("GET", f"/api/nexora/batches/{lot['id']}?workspaceId={ws}&limit=1", timeout=30)
        except OSError:
            status, body = 0, {}
        if status != 200:
            print("lecture impossible (serveur arrêté ?)", status)
            time.sleep(2)
            continue
        lot = body["batch"]
        fait = lot["completed"] + lot["failed"]
        if fait != dernier:
            print(f"{time.time() - debut:6.0f} s : {fait}/{lot['total']}", flush=True)
            dernier = fait
        if args.kill_after and not tue and fait >= args.kill_after and args.pid:
            os.kill(args.pid, 9)
            tue = True
            rapport["tue_a"] = fait
            print(f"serveur tué (kill -9) à {fait} lignes ; relancez-le puis appelez le cron, le script attend.", flush=True)
            for _ in range(600):
                time.sleep(3)
                try:
                    status, body = s.call("GET", f"/api/nexora/batches/{lot['id']}?workspaceId={ws}&limit=1", timeout=10)
                except Exception:
                    continue
                if status == 200:
                    lot = body["batch"]
                    break
    duree = time.time() - debut
    rapport["lot"] = lot
    rapport["duree_s"] = round(duree, 1)

    # Les réponses sont dans la table : on les relit par l'export CSV du lot.
    status, texte = s.call("GET", f"/api/nexora/batches/{lot['id']}/export?workspaceId={ws}", raw=True, timeout=120)
    assert status == 200, status
    lignes = list(csv.reader(io.StringIO(texte.lstrip("﻿")), delimiter=";"))
    entete, corps = lignes[0], lignes[1:]
    assert entete[:4] == ["ligne", "identifiant", "entrée", "résultat"], entete
    rapport["export_lignes"] = len(corps)

    # Colonne `attendu` de la table, relue par ligne.
    status, table_rows = s.call("GET", f"/api/table/{table_id}/rows?workspaceId={ws}&limit=1000", timeout=120)
    assert status == 200, (status, str(table_rows)[:200])
    lignes_table = table_rows.get("data", table_rows).get("rows", [])
    rapport["lignes_table"] = len(lignes_table)
    schema = next((t for t in s.call("GET", f"/api/table/{table_id}?workspaceId={ws}")[1].get("data", {}).get("table", {}).get("schema", {}).get("columns", [])), None)
    cols = {c["name"]: c.get("id", c["name"]) for c in s.call("GET", f"/api/table/{table_id}?workspaceId={ws}")[1].get("data", {}).get("table", {}).get("schema", {}).get("columns", [])}
    bons = faux = vides = 0
    confusions: dict = {}
    for ligne in lignes_table:
        donnees_ligne = ligne["data"]
        attendu = str(donnees_ligne.get(cols.get("attendu", "attendu"), "")).strip()
        obtenu = normalise(str(donnees_ligne.get(cols.get("Sujet", "Sujet"), "") or ""))
        if not obtenu:
            vides += 1
        elif obtenu == attendu:
            bons += 1
        else:
            faux += 1
            confusions[f"{attendu}->{obtenu}"] = confusions.get(f"{attendu}->{obtenu}", 0) + 1
    total = bons + faux + vides
    rapport["exactitude"] = {"bons": bons, "faux": faux, "vides": vides, "total": total, "taux": round(bons / total, 4) if total else None, "confusions": confusions}
    Path(args.report).write_text(json.dumps(rapport, ensure_ascii=False, indent=2))
    print(json.dumps({k: rapport[k] for k in ("duree_s", "exactitude")}, ensure_ascii=False))
    return 0 if lot["status"] == "completed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
