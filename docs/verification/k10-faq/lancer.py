"""Vérification réelle de K10 « Évaluations » avec le jeu « FAQ tarifs ».

Sur une instance WorkStudio (par défaut le serveur de développement du jalon), ce script :
  1. crée un compte et un espace jetables, importe `faq-tarifs.jsonl` (30 questions, 10 annotées) ;
  2. crée le prompt « FAQ tarifs » (version 1 : grille et consigne vague ; version 2 : règles strictes) ;
  3. crée le juge (un modèle qui classe « correct » ou « incorrect ») et mesure son accord avec les 10
     annotations par « Essayer » (critère : au moins 80 %) ;
  4. lance une campagne qui compare le modèle local (`qwen2.5:7b`, prompt v2), GLM 5.3 avec le prompt v1 et
     GLM 5.3 avec le prompt v2, attend la fin, lit les statistiques et compare les séries ligne à ligne ;
  5. planifie une campagne « la nuit » (0 3 * * *, Europe/Paris), joue le passage de l'heure par le cron avec
     `asOf`, et vérifie qu'une alerte est levée sous le seuil (et l'e-mail dans Mailpit s'il est joignable).

Il écrit `rapport.json` et `rapport.md` à côté de lui. Aucun secret n'est affiché ni écrit.
usage : python3 lancer.py --url http://127.0.0.1:3217 --env-file .nexora-work/dev.env [--save-user chemin.json]
"""

import argparse
import datetime
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

PROMPT_V1_RULES = "Réponds de façon utile et aimable aux questions des clients."
PROMPT_V2_RULES = """Règles :
1. Réponds en une ou deux phrases, en français.
2. Donne toujours le montant ou le chiffre exact de la grille, avec « HT » et la période quand il s'agit d'un prix.
3. Ne mélange jamais les forfaits : cite celui dont on te parle.
4. N'invente rien. Si la grille ne contient pas l'information demandée, réponds exactement : « Je n'ai pas cette information : contactez commercial@atelier-lumen.example. »"""

JUDGE_INSTRUCTIONS = (
    "Tu juges les réponses d'un assistant du service commercial d'un éditeur de logiciel. "
    "Une réponse est correcte si les chiffres et les faits essentiels (montant, durée, nombre, oui ou non, forfait concerné) "
    "correspondent à la réponse attendue ; la formulation, la longueur et la politesse ne comptent pas, et omettre « HT » ne rend pas "
    "une réponse incorrecte quand le montant est bon. Elle est incorrecte si un chiffre ou un fait essentiel est faux, "
    "si elle attribue à un forfait ce qui appartient à un autre, ou si elle donne une information là où la réponse attendue "
    "dit que l'information n'est pas disponible (c'est une invention). Une réponse qui dit honnêtement ne pas avoir l'information, "
    "quand c'est ce que la réponse attendue prévoit, est correcte."
)


PROMPT_V1_INTRO = "Tu es l'assistant du service commercial d'Atelier Lumen, un logiciel de facturation pour les PME. Voici nos tarifs."
PROMPT_V2_INTRO = (
    "Tu es l'assistant du service commercial d'Atelier Lumen, un logiciel de facturation pour les PME. "
    "Tu réponds aux questions des clients sur les tarifs à partir de la grille ci-dessous, et d'elle seule."
)


def prompt_text(intro: str, rules: str) -> str:
    grid = (HERE / "tarifs.md").read_text(encoding="utf-8").strip()
    return f"{intro}\n\n{grid}\n\n{rules}"


def read_env(path: str, key: str) -> str | None:
    for line in pathlib.Path(path).read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1]
    return None


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def wait_campaign(s, ws: str, campaign_id: str, timeout_s: int, label: str) -> dict:
    deadline = time.time() + timeout_s
    last = ""
    while time.time() < deadline:
        status, body = s.call("GET", f"{BASE}/campaigns/{campaign_id}?workspaceId={ws}", timeout=60)
        require(status == 200, f"lecture de la campagne : HTTP {status}")
        campaign = body["campaign"]
        done = sum(1 for item in body["items"] if item["status"] in ("done", "error"))
        line = f"{label} : {campaign['status']} {done}/{campaign['itemTotal']}"
        if line != last:
            print("   ", line, flush=True)
            last = line
        if campaign["status"] not in ("pending", "running"):
            return body
        time.sleep(5)
    raise TimeoutError(f"{label} : pas terminée après {timeout_s} s")


def percent(rate) -> str:
    return "—" if rate is None else f"{round(rate * 100)} %"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:3217")
    parser.add_argument("--env-file", required=True, help="fichier d'environnement de l'instance (CRON_SECRET)")
    parser.add_argument("--local-model", default="vllm/qwen2.5:7b")
    parser.add_argument("--cloud-model", default="vllm/cloud-glm-5-3")
    parser.add_argument("--judge-model", default="nexora-default")
    parser.add_argument("--mailpit", default="http://127.0.0.1:18025")
    parser.add_argument("--save-user", help="écrit l'adresse et le mot de passe du compte jetable (hors dépôt)")
    parser.add_argument("--out", default=str(HERE))
    parser.add_argument("--timeout", type=int, default=3600)
    args = parser.parse_args()

    s = smoke.Smoke(args.url)
    email = f"k10-faq-{secrets.token_hex(4)}@nexora.test"
    password = secrets.token_hex(16)
    report: dict = {"date": datetime.datetime.now(datetime.timezone.utc).isoformat(), "checks": {}}

    status, body = s.call("POST", "/api/auth/sign-up/email", {"email": email, "password": password, "name": "K10 FAQ"})
    require(status == 200, f"inscription : HTTP {status}")
    if args.save_user:
        pathlib.Path(args.save_user).write_text(json.dumps({"email": email, "password": password}))
        pathlib.Path(args.save_user).chmod(0o600)
    status, body = s.call("POST", "/api/workspaces", {"name": "FAQ tarifs K10"}, timeout=300)
    require(status == 200, f"espace : HTTP {status}")
    ws = body["workspace"]["id"]
    report["workspaceId"] = ws

    # 1. Le jeu de tests
    jsonl = (HERE / "faq-tarifs.jsonl").read_text(encoding="utf-8")
    status, body = s.call("POST", f"{BASE}/datasets", {"workspaceId": ws, "name": "FAQ tarifs", "description": "30 questions sur la grille d'Atelier Lumen", "source": {"kind": "jsonl", "text": jsonl}})
    require(status == 200, f"jeu de tests : HTTP {status} {body}")
    dataset = body["dataset"]
    require(dataset["rowCount"] == 30 and dataset["annotatedCount"] == 10, f"jeu inattendu : {dataset}")
    print(f"jeu « {dataset['name']} » : {dataset['rowCount']} lignes, {dataset['annotatedCount']} annotées")

    # 2. Le prompt, versions 1 et 2
    status, body = s.call("POST", "/api/nexora/prompts", {"workspaceId": ws, "name": "FAQ tarifs", "description": "Réponses sur la grille de tarifs", "content": prompt_text(PROMPT_V1_INTRO, PROMPT_V1_RULES), "note": "v1 : grille et consigne vague"})
    require(status == 200, f"prompt : HTTP {status} {body}")
    prompt_id = body["prompt"]["id"]
    status, body = s.call("POST", f"/api/nexora/prompts/{prompt_id}/versions", {"workspaceId": ws, "content": prompt_text(PROMPT_V2_INTRO, PROMPT_V2_RULES), "note": "v2 : règles strictes, jamais d'invention"})
    require(status == 200, f"version 2 : HTTP {status} {body}")
    require(body["version"]["version"] == 2, "la version 2 n'a pas le numéro 2")
    s.call("PUT", f"/api/nexora/prompts/{prompt_id}/labels", {"workspaceId": ws, "label": "production", "version": 2})

    # 3. Le juge et son accord avec les annotations
    judge_config = {"kind": "llm_class", "model": args.judge_model, "instructions": JUDGE_INSTRUCTIONS, "labels": ["correct", "incorrect"], "passLabels": ["correct"]}
    status, body = s.call("POST", f"{BASE}/judges", {"workspaceId": ws, "name": "Exactitude des tarifs", "config": judge_config})
    require(status == 200, f"juge : HTTP {status} {body}")
    judge_id = body["judge"]["id"]
    started = time.time()
    status, body = s.call("POST", f"{BASE}/judges/try", {"workspaceId": ws, "config": judge_config, "datasetId": dataset["id"], "limit": 10}, timeout=900)
    require(status == 200, f"essai du juge : HTTP {status} {body}")
    agreement = body["agreement"]
    report["checks"]["accord_juge"] = {**agreement, "secondes": round(time.time() - started, 1), "lignes": [
        {"question": r["input"], "humain": r["humanVerdict"], "juge": r["verdict"], "note_juge": r["note"], "justification_humaine": r["humanNote"]} for r in body["results"]]}
    print(f"accord du juge : {agreement['matched']}/{agreement['total']} = {percent(agreement['rate'])}")
    for r in body["results"]:
        mark = "=" if r["humanVerdict"] == r["verdict"] else "≠"
        print(f"   {mark} humain {r['humanVerdict']} / juge {r['verdict']} : {r['input'][:60]}")
    require(agreement["total"] == 10, "l'essai devait porter sur les 10 lignes annotées")
    require(agreement["rate"] is not None and agreement["rate"] >= 0.8, f"accord du juge insuffisant : {agreement}")

    # 4. La campagne de comparaison
    targets = [
        {"kind": "prompt", "model": args.local_model, "promptId": prompt_id, "version": 2},
        {"kind": "prompt", "model": args.cloud_model, "promptId": prompt_id, "version": 1},
        {"kind": "prompt", "model": args.cloud_model, "promptId": prompt_id, "version": 2},
    ]
    status, body = s.call("POST", f"{BASE}/campaigns", {"workspaceId": ws, "name": "FAQ tarifs : modèles et prompts", "datasetId": dataset["id"], "judgeId": judge_id, "targets": targets, "concurrency": 2, "alertThreshold": 0.8})
    require(status == 200, f"campagne : HTTP {status} {body}")
    campaign_id = body["campaign"]["id"]
    print("campagne lancée :", campaign_id)
    started = time.time()
    result = wait_campaign(s, ws, campaign_id, args.timeout, "comparaison")
    elapsed = round(time.time() - started, 1)
    require(result["campaign"]["status"] == "completed", f"campagne non terminée : {result['campaign']['status']} {result['campaign'].get('error')}")
    labels = {t["key"]: t["label"] for t in result["campaign"]["targets"]}
    stats = {entry["targetKey"]: entry["summary"] for entry in result["summaries"]}
    report["checks"]["campagne"] = {"id": campaign_id, "secondes": elapsed, "cibles": [{"cle": k, "libelle": labels[k], **stats[k]} for k in labels]}
    print(f"campagne terminée en {elapsed} s")
    for key in labels:
        st = stats[key]
        print(f"   {labels[key]:<46} réussite {percent(st['passRate']):>5} ({st['passed']}/{st['finished']}, {st['errors']} erreurs) p50 {round(st['latencyP50'])} ms p95 {round(st['latencyP95'])} ms jetons {st['inputTokens'] + st['outputTokens']}")
        require(st["finished"] == 30, f"{labels[key]} : {st['finished']} éléments terminés sur 30")

    keys = list(labels)
    status, body = s.call("GET", f"{BASE}/compare?workspaceId={ws}&a={campaign_id}:{keys[1]}&b={campaign_id}:{keys[2]}", timeout=60)
    require(status == 200, f"comparaison : HTTP {status}")
    report["checks"]["comparaison_v1_v2"] = {"a": body["a"]["targetLabel"], "b": body["b"]["targetLabel"], **body["counts"]}
    print("comparaison v1 → v2 sur GLM :", body["counts"])
    status, body = s.call("GET", f"{BASE}/compare?workspaceId={ws}&a={campaign_id}:{keys[0]}&b={campaign_id}:{keys[2]}", timeout=60)
    require(status == 200, f"comparaison : HTTP {status}")
    report["checks"]["comparaison_local_cloud"] = {"a": body["a"]["targetLabel"], "b": body["b"]["targetLabel"], **body["counts"]}
    print("comparaison local → GLM, prompt v2 :", body["counts"])

    # 5. La campagne planifiée de nuit
    schedule_targets = [{"kind": "prompt", "model": args.local_model, "promptId": prompt_id, "version": 2}]
    status, body = s.call("POST", f"{BASE}/schedules", {"workspaceId": ws, "name": "FAQ tarifs, chaque nuit", "cron": "0 3 * * *", "timezone": "Europe/Paris", "datasetId": dataset["id"], "judgeId": judge_id, "targets": schedule_targets, "concurrency": 2, "alertThreshold": 0.95, "enabled": True})
    require(status == 200, f"planification : HTTP {status} {body}")
    schedule = body["schedule"]
    next_run = datetime.datetime.fromisoformat(schedule["nextRunAt"].replace("Z", "+00:00"))
    require(next_run.astimezone(datetime.timezone.utc).minute == 0, "l'échéance devrait tomber à l'heure pile")
    print("prochaine échéance :", schedule["nextRunAt"])
    as_of = (next_run + datetime.timedelta(seconds=30)).isoformat().replace("+00:00", "Z")
    cron_secret = read_env(args.env_file, "CRON_SECRET")
    require(bool(cron_secret), "CRON_SECRET introuvable dans le fichier d'environnement")
    request = urllib.request.Request(f"{args.url}/api/cron/run-nexora-evaluations?asOf={as_of}", headers={"Authorization": f"Bearer {cron_secret}"})
    with urllib.request.urlopen(request, timeout=120) as response:
        tick = json.loads(response.read())
    print("cron joué à", as_of, "→", {k: v for k, v in tick.items() if k != "success"})
    require(len(tick.get("started", [])) == 1, f"le cron devait lancer une campagne : {tick}")
    night_id = tick["started"][0]
    night = wait_campaign(s, ws, night_id, args.timeout, "campagne de nuit")
    night_stats = night["summaries"][0]["summary"]
    require(night["campaign"]["status"] == "completed", f"campagne de nuit : {night['campaign']['status']}")
    # La planification ne repart pas deux fois pour la même échéance.
    with urllib.request.urlopen(request, timeout=120) as response:
        second = json.loads(response.read())
    require(second.get("started") == [], f"la même échéance ne doit pas repartir : {second}")
    status, body = s.call("GET", f"{BASE}/alerts?workspaceId={ws}")
    alerts = [a for a in body["alerts"] if a["campaignId"] == night_id]
    require(status == 200 and len(alerts) >= 1, f"aucune alerte levée : {body}")
    report["checks"]["campagne_planifiee"] = {"asOf": as_of, "campagne": night_id, "reussite": night_stats["passRate"], "seuil": 0.95, "alertes": alerts}
    print(f"alerte levée : {alerts[0]['targetLabel']} à {percent(alerts[0]['passRate'])} sous le seuil de {percent(alerts[0]['threshold'])}")
    try:
        with urllib.request.urlopen(f"{args.mailpit}/api/v1/messages", timeout=10) as response:
            messages = json.loads(response.read()).get("messages", [])
        mails = [m for m in messages if "FAQ tarifs, chaque nuit" in m.get("Subject", "")]
        report["checks"]["campagne_planifiee"]["email_mailpit"] = bool(mails)
        print("e-mail dans Mailpit :", "oui" if mails else "non")
    except Exception as error:  # noqa: BLE001 - la preuve d'e-mail est facultative
        report["checks"]["campagne_planifiee"]["email_mailpit"] = f"non vérifié ({error})"

    out = pathlib.Path(args.out)
    (out / "rapport.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = ["# Rapport K10 — « FAQ tarifs »", "", f"Exécuté le {report['date']} sur l'instance de développement du jalon.", ""]
    lines += ["## Accord du juge avec les 10 annotations", "", f"{agreement['matched']} sur {agreement['total']} ({percent(agreement['rate'])}).", ""]
    lines += ["| Cible | Réussite | p50 | p95 | Jetons | Erreurs |", "|---|---|---|---|---|---|"]
    for key in labels:
        st = stats[key]
        lines.append(f"| {labels[key]} | {percent(st['passRate'])} ({st['passed']}/{st['finished']}) | {round(st['latencyP50'])} ms | {round(st['latencyP95'])} ms | {st['inputTokens'] + st['outputTokens']} | {st['errors']} |")
    lines += ["", f"Campagne de nuit : {percent(night_stats['passRate'])} de réussite pour un seuil de 95 %, alerte levée.", ""]
    (out / "rapport.md").write_text("\n".join(lines), encoding="utf-8")
    print("rapport écrit dans", out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
