#!/usr/bin/env bash
# Lighthouse (mobile et bureau) sur la connexion, l'accueil et l'éditeur d'une instance, dans le conteneur officiel de
# Playwright (Chromium inclus, aucun Node ni Bun sur l'hôte : serveur x86 de vérification).
# L'hôte ne fournit que python3, docker et les identifiants de scripts/dev/.secrets (jamais affichés) : il ouvre une
# session par l'API, repère l'espace et un workflow (créé s'il n'y en a pas), puis passe le cookie de session à Lighthouse.
# Usage : scripts/verification/lighthouse-docker.sh [dossier-sortie]
#         NEXORA_E2E_URL (défaut http://localhost:3200) ; NEXORA_PLAYWRIGHT_CORE_DIR = dossier contenant
#         node_modules/lighthouse (installé par `npm install lighthouse@13.5.0` dans le conteneur Playwright) ;
#         NEXORA_SECRETS_ROOT depuis un arbre de travail ; NEXORA_LIGHTHOUSE_PASSES (défaut 2).
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
secrets_root="${NEXORA_SECRETS_ROOT:-$root}"
secrets_file="$secrets_root/scripts/dev/.secrets"
[[ -f "$secrets_file" ]] || { echo "absent : $secrets_file" >&2; exit 1; }
base="${NEXORA_E2E_URL:-http://localhost:3200}"
base="${base%/}"
out="$(realpath -m "${1:-${TMPDIR:-/tmp}/nexora-lighthouse}")"
mkdir -p "$out"
tools="${NEXORA_PLAYWRIGHT_CORE_DIR:?NEXORA_PLAYWRIGHT_CORE_DIR : dossier avec node_modules/lighthouse}"
image="${NEXORA_PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.61.1-noble}"
passes="${NEXORA_LIGHTHOUSE_PASSES:-2}"

NEXORA_E2E_EMAIL="$(grep -E '^SMOKE_ADMIN_EMAIL=' "$secrets_file" | cut -d= -f2-)"
NEXORA_E2E_PASSWORD="$(grep -E '^SMOKE_ADMIN_PASSWORD=' "$secrets_file" | cut -d= -f2-)"
export NEXORA_E2E_EMAIL NEXORA_E2E_PASSWORD NEXORA_E2E_URL="$base"

# Session, espace et workflow : « cookie<TAB>espace<TAB>workflow » (le cookie ne sort jamais de cette variable).
session="$(python3 -I - <<'EOF'
import json, os, urllib.request
base, origin = os.environ["NEXORA_E2E_URL"], os.environ["NEXORA_E2E_URL"]
def call(method, path, body=None, cookie=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json", "Origin": origin}
    if cookie:
        headers["Cookie"] = cookie
    request = urllib.request.Request(base + path, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.headers.get_all("Set-Cookie") or [], json.loads(response.read() or b"null")
cookies, _ = call("POST", "/api/auth/sign-in/email", {"email": os.environ["NEXORA_E2E_EMAIL"], "password": os.environ["NEXORA_E2E_PASSWORD"]})
cookie = "; ".join(c.split(";")[0] for c in cookies)
_, spaces = call("GET", "/api/workspaces", cookie=cookie)
workspace = (spaces.get("workspaces") or spaces)[0]["id"]
_, workflows = call("GET", f"/api/workflows?workspaceId={workspace}", cookie=cookie)
items = workflows.get("data") if isinstance(workflows, dict) else workflows
if items:
    workflow = items[0]["id"]
else:
    _, created = call("POST", "/api/workflows", {"name": "Lighthouse", "workspaceId": workspace}, cookie=cookie)
    workflow = created.get("id") or (created.get("workflow") or created.get("data") or {}).get("id")
print(f"{cookie}\t{workspace}\t{workflow}")
EOF
)"
cookie="${session%%$'\t'*}"; rest="${session#*$'\t'}"; workspace="${rest%%$'\t'*}"; workflow="${rest#*$'\t'}"

pages=("connexion|$base/login|" "accueil|$base/workspace/$workspace/home|$cookie" "editeur|$base/workspace/$workspace/w/$workflow|$cookie")
for pass in $(seq 1 "$passes"); do
  for preset in mobile desktop; do
    for entry in "${pages[@]}"; do
      name="${entry%%|*}"; rest="${entry#*|}"; url="${rest%%|*}"; page_cookie="${rest#*|}"
      LIGHTHOUSE_COOKIE_VALUE="$page_cookie" docker run --rm --network host --ipc=host --user "$(id -u):$(id -g)" \
        -v "$root:/work:ro" -v "$tools:/pw:ro" -v "$out:/out" -e HOME=/tmp -e LIGHTHOUSE_COOKIE_VALUE \
        "$image" bash -c 'export LIGHTHOUSE_DIR=/pw CHROME_PATH="$(ls -d /ms-playwright/chromium-*/chrome-linux*/chrome | tail -1)"; [[ -n "$LIGHTHOUSE_COOKIE_VALUE" ]] && export LIGHTHOUSE_COOKIE="$LIGHTHOUSE_COOKIE_VALUE"; exec bash /work/scripts/verification/lighthouse.sh "$0" "$1" "$2" /out' "$url" "$name-passe$pass" "$preset"
    done
  done
done
