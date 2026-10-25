"""Preuve de la reprise d'une campagne après le redémarrage du serveur (K10).

Deux temps, séparés par l'arrêt puis le redémarrage du serveur WorkStudio par l'opérateur :
  python3 reprise.py start  --url … --env-file … --state état.json   (crée l'espace, lance la campagne, attend 8 éléments)
  … arrêter le serveur pendant que la campagne tourne, le relancer …
  python3 reprise.py finish --url … --env-file … --state état.json   (appelle le cron, attend la fin, vérifie)

Vérifie que la campagne se termine toute seule après le redémarrage (bail expiré, reprise par le cron), que
chaque ligne a exactement un élément par cible, et qu'aucun élément n'est resté « en cours ».
"""

import argparse
import importlib.util
import json
import pathlib
import secrets
import sys
import time
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BASE = "/api/nexora/evaluations"

spec = importlib.util.spec_from_file_location("smoke", ROOT / "scripts" / "smoke.py")
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def read_env(path: str, key: str) -> str:
    for line in pathlib.Path(path).read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1]
    raise KeyError(key)


def login(s, email: str, password: str) -> None:
    status, _ = s.call("POST", "/api/auth/sign-in/email", {"email": email, "password": password})
    require(status == 200, f"connexion : HTTP {status}")


def progress(s, ws: str, campaign_id: str) -> tuple[str, int, int]:
    status, body = s.call("GET", f"{BASE}/campaigns/{campaign_id}?workspaceId={ws}", timeout=60)
    require(status == 200, f"lecture : HTTP {status}")
    items = body["items"]
    done = sum(1 for item in items if item["status"] in ("done", "error"))
    return body["campaign"]["status"], done, body["campaign"]["itemTotal"]


def start(args) -> None:
    s = smoke.Smoke(args.url)
    email, password = f"k10-reprise-{secrets.token_hex(4)}@nexora.test", secrets.token_hex(16)
    status, _ = s.call("POST", "/api/auth/sign-up/email", {"email": email, "password": password, "name": "K10 reprise"})
    require(status == 200, f"inscription : HTTP {status}")
    status, body = s.call("POST", "/api/workspaces", {"name": "Reprise K10"}, timeout=300)
    ws = body["workspace"]["id"]
    jsonl = (HERE / "faq-tarifs.jsonl").read_text(encoding="utf-8")
    status, body = s.call("POST", f"{BASE}/datasets", {"workspaceId": ws, "name": "FAQ tarifs", "source": {"kind": "jsonl", "text": jsonl}})
    dataset_id = body["dataset"]["id"]
    status, body = s.call("POST", f"{BASE}/judges", {"workspaceId": ws, "name": "Contient", "config": {"kind": "contains", "value": None, "caseSensitive": False}})
    judge_id = body["judge"]["id"]
    system = "Réponds en une phrase, en t'appuyant sur ta connaissance générale de la facturation en ligne."
    status, body = s.call("POST", f"{BASE}/campaigns", {"workspaceId": ws, "name": "Reprise après redémarrage", "datasetId": dataset_id, "judgeId": judge_id,
                                                         "targets": [{"kind": "model", "model": args.model, "system": system}], "concurrency": 1})
    require(status == 200, f"campagne : HTTP {status} {body}")
    campaign_id = body["campaign"]["id"]
    while True:
        state, done, total = progress(s, ws, campaign_id)
        print(f"{state} {done}/{total}", flush=True)
        if done >= 8:
            break
        require(state in ("pending", "running"), f"la campagne s'est arrêtée trop tôt : {state}")
        time.sleep(3)
    pathlib.Path(args.state).write_text(json.dumps({"email": email, "password": password, "ws": ws, "campaign": campaign_id, "done_at_stop": done}))
    pathlib.Path(args.state).chmod(0o600)
    print("état écrit : arrêtez le serveur maintenant, puis relancez-le, puis « finish ».")


def finish(args) -> None:
    saved = json.loads(pathlib.Path(args.state).read_text())
    s = smoke.Smoke(args.url)
    login(s, saved["email"], saved["password"])
    ws, campaign_id = saved["ws"], saved["campaign"]
    state, done, total = progress(s, ws, campaign_id)
    print(f"après le redémarrage : {state} {done}/{total} (il y en avait {saved['done_at_stop']} à l'arrêt)")
    cron = urllib.request.Request(f"{args.url}/api/cron/run-nexora-evaluations", headers={"Authorization": f"Bearer {read_env(args.env_file, 'CRON_SECRET')}"})
    deadline = time.time() + 900
    adopted_at = None
    while time.time() < deadline:
        with urllib.request.urlopen(cron, timeout=60) as response:
            tick = json.loads(response.read())
        if tick.get("resumed") and adopted_at is None:
            adopted_at = time.time()
            print("cron : campagne reprise", tick["resumed"], flush=True)
        state, done, total = progress(s, ws, campaign_id)
        print(f"{state} {done}/{total}", flush=True)
        if state not in ("pending", "running"):
            break
        time.sleep(10)
    require(state == "completed", f"la campagne n'a pas repris : {state}")
    status, body = s.call("GET", f"{BASE}/campaigns/{campaign_id}?workspaceId={ws}")
    items = body["items"]
    require(len(items) == total == 30, f"{len(items)} éléments pour {total} attendus")
    require(len({item["rowId"] for item in items}) == 30, "une ligne a plusieurs éléments")
    require(all(item["status"] == "done" for item in items), f"éléments non terminés : {[i['status'] for i in items if i['status'] != 'done']}")
    require(adopted_at is not None, "le cron n'a jamais signalé de reprise")
    print("reprise vérifiée : 30 éléments terminés, un par ligne, aucun en cours")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("phase", choices=["start", "finish"])
    parser.add_argument("--url", default="http://127.0.0.1:3217")
    parser.add_argument("--env-file", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--model", default="vllm/qwen2.5:7b")
    args = parser.parse_args()
    (start if args.phase == "start" else finish)(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
