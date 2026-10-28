#!/usr/bin/env bash
# Fumée complète sur une instance de vérification x86 (pc1 : projet compose « nexora-x86 », WorkStudio :3300), modèle
# de la passerelle LiteLLM (jamais de modèle local). Variante paramétrée de fumee-pc6.sh.
# Lit les identifiants de l'administrateur de test dans scripts/dev/.secrets (hors dépôt), prépare l'enregistrement
# de test par la voix française locale (speaches), un Mailpit de vérification et un relais qui ajoute la clé de la
# passerelle pour le test « OpenAI-compatible », puis lance scripts/smoke.py.
# Usage : scripts/verification/fumee-pc1.sh [rapport.json] [--only TEXTE]
# Réglages (variables d'environnement, valeurs par défaut pour pc1) :
#   NEXORA_VERIF_PROJECT=nexora-x86        projet compose (conteneurs <projet>-whisper-1, <projet>-nexora-api-1…)
#   NEXORA_VERIF_PORT=<NEXORA_WORKSTUDIO_PORT de deploy/.env>   port publié de WorkStudio
#   NEXORA_VERIF_MAILPIT=nexora-verif-mailpit   conteneur Mailpit (réseau du projet) ; NEXORA_VERIF_MAILPIT_URL=http://127.0.0.1:18025
#   NEXORA_VERIF_OPENAI_MODEL=cloud-glm-flash   modèle ajouté par le test « OpenAI-compatible » (via le relais)
#   NEXORA_VERIF_RELAIS=nexora-verif-relais     conteneur du relais (réseaux du projet et de la passerelle)
#   NEXORA_VERIF_GATEWAY_NETWORK=agentos-litellm_backend   réseau de la passerelle (surcharge locale du compose)
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${NEXORA_VERIF_DIR:-${TMPDIR:-/tmp}/nexora-verif}"
mkdir -p "$work"
report="${1:-$work/fumee.json}"
shift || true

project="${NEXORA_VERIF_PROJECT:-nexora-x86}"
secrets_root="${NEXORA_SECRETS_ROOT:-$root}"
secrets_file="$secrets_root/scripts/dev/.secrets"
env_file="$secrets_root/deploy/.env"
[[ -f "$secrets_file" ]] || { echo "absent : $secrets_file" >&2; exit 1; }
[[ -f "$env_file" ]] || { echo "absent : $env_file" >&2; exit 1; }
env_value() { grep -E "^$1=" "$env_file" | head -1 | cut -d= -f2-; }

NEXORA_SMOKE_ADMIN_EMAIL="$(grep -E '^SMOKE_ADMIN_EMAIL=' "$secrets_file" | cut -d= -f2-)"
NEXORA_SMOKE_ADMIN_PASSWORD="$(grep -E '^SMOKE_ADMIN_PASSWORD=' "$secrets_file" | cut -d= -f2-)"
export NEXORA_SMOKE_ADMIN_EMAIL NEXORA_SMOKE_ADMIN_PASSWORD

port="${NEXORA_VERIF_PORT:-$(env_value NEXORA_WORKSTUDIO_PORT)}"
network="${project}_default"

# Enregistrement de test en français : voix locale (speaches), conteneur du projet.
audio="$work/appel-fr.wav"
whisper="${project}-whisper-1"
if [[ ! -s "$audio" ]]; then
  docker exec "$whisper" sh -c 'curl -sf -X POST http://127.0.0.1:8000/v1/audio/speech -H "Content-Type: application/json" -d "{\"model\":\"speaches-ai/piper-fr_FR-siwis-medium\",\"voice\":\"siwis\",\"input\":\"Bonjour, ici la Boulangerie Martin. Nous confirmons la livraison de croissants mardi prochain à six heures.\",\"response_format\":\"wav\"}" -o /tmp/appel-fr.wav'
  docker cp "$whisper:/tmp/appel-fr.wav" "$audio"
fi

# Mailpit de vérification, sur le réseau du projet (joignable par son nom depuis WorkStudio).
mailpit="${NEXORA_VERIF_MAILPIT:-nexora-verif-mailpit}"
if ! docker inspect "$mailpit" >/dev/null 2>&1; then
  docker run -d --name "$mailpit" --network "$network" -p 127.0.0.1:18025:8025 axllent/mailpit:v1.32.0 >/dev/null
fi

# Relais de la passerelle : le test « OpenAI-compatible » ajoute un modèle par son adresse, sans clé ; la passerelle en exige une.
relais="${NEXORA_VERIF_RELAIS:-nexora-verif-relais}"
gateway_network="${NEXORA_VERIF_GATEWAY_NETWORK:-agentos-litellm_backend}"
if ! docker inspect "$relais" >/dev/null 2>&1; then
  RELAIS_AMONT="$(env_value NEXORA_UPSTREAM_URL)" RELAIS_CLE="$(env_value NEXORA_UPSTREAM_KEY)" \
    docker run -d --name "$relais" --network "$network" -e RELAIS_AMONT -e RELAIS_CLE \
      -v "$root/scripts/verification/proxy-openai-cle.py:/relais.py:ro" \
      --entrypoint /.venv/bin/python "$(env_value NEXORA_IMAGE_PREFIX)api:$(env_value NEXORA_VERSION)" /relais.py >/dev/null
  docker network connect "$gateway_network" "$relais" 2>/dev/null || true
fi

# Le collecteur OTLP de la fumée écoute sur l'hôte : WorkStudio le joint par la passerelle du réseau du projet.
collector_host="$(docker network inspect "$network" -f '{{(index .IPAM.Config 0).Gateway}}')"

export NEXORA_SMOKE_SMTP_HOST="$mailpit" NEXORA_SMOKE_SMTP_PORT=1025 \
  NEXORA_SMOKE_MAILPIT_URL="${NEXORA_VERIF_MAILPIT_URL:-http://127.0.0.1:18025}" \
  NEXORA_SMOKE_OPENAI_URL="http://$relais:4001" NEXORA_SMOKE_OPENAI_MODEL="${NEXORA_VERIF_OPENAI_MODEL:-cloud-glm-flash}" \
  NEXORA_SMOKE_AUDIO="$audio" NEXORA_SMOKE_AUDIO_TEXT=livraison NEXORA_SMOKE_WEB_SEARCH=1 NEXORA_SMOKE_COLLECTOR_HOST="$collector_host"

# « Confirmation » lit le journal d'exécution de Nexora Connect (jeton d'administration et port publié de la pile).
export NEXORA_SMOKE_CONNECT_URL="http://127.0.0.1:$(env_value NEXORA_CONNECT_PORT)"
NEXORA_SMOKE_CONNECT_TOKEN="$(env_value NEXORA_CONNECT_ADMIN_TOKEN)"
export NEXORA_SMOKE_CONNECT_TOKEN

origin="$(env_value NEXORA_PUBLIC_URL)"
exec python3 -I "$root/scripts/smoke.py" --url "http://127.0.0.1:$port" --origin "$origin" --report "$report" "$@"
