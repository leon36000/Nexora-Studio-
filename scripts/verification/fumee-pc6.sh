#!/usr/bin/env bash
# Fumée complète sur l'instance de test pc6 (projet compose « nexora », :3200).
# Lit les identifiants de l'administrateur de test dans scripts/dev/.secrets
# (hors dépôt), régénère au besoin l'enregistrement de test par la voix
# française locale (speaches), puis lance scripts/smoke.py.
# Usage : scripts/verification/fumee-pc6.sh [rapport.json] [--only TEXTE]
set -euo pipefail

root="$(cd "$(dirname "$0")/../.." && pwd)"
work="${NEXORA_VERIF_DIR:-${TMPDIR:-/tmp}/nexora-verif}"
mkdir -p "$work"
report="${1:-$work/fumee.json}"
shift || true

secrets_file="$root/scripts/dev/.secrets"
[[ -f "$secrets_file" ]] || { echo "absent : $secrets_file" >&2; exit 1; }
NEXORA_SMOKE_ADMIN_EMAIL="$(grep -E '^SMOKE_ADMIN_EMAIL=' "$secrets_file" | cut -d= -f2-)"
NEXORA_SMOKE_ADMIN_PASSWORD="$(grep -E '^SMOKE_ADMIN_PASSWORD=' "$secrets_file" | cut -d= -f2-)"
export NEXORA_SMOKE_ADMIN_EMAIL NEXORA_SMOKE_ADMIN_PASSWORD

audio="$work/appel-fr.wav"
if [[ ! -s "$audio" ]]; then
  docker exec nexora-whisper-1 sh -c 'curl -sf -X POST http://127.0.0.1:8000/v1/audio/speech -H "Content-Type: application/json" -d "{\"model\":\"speaches-ai/piper-fr_FR-siwis-medium\",\"voice\":\"siwis\",\"input\":\"Bonjour, ici la Boulangerie Martin. Nous confirmons la livraison de croissants mardi prochain à six heures.\",\"response_format\":\"wav\"}" -o /tmp/appel-fr.wav'
  docker cp nexora-whisper-1:/tmp/appel-fr.wav "$audio"
fi

export NEXORA_SMOKE_SMTP_HOST=nexora-verif-mailpit NEXORA_SMOKE_SMTP_PORT=1025 \
  NEXORA_SMOKE_MAILPIT_URL=http://127.0.0.1:18025 \
  NEXORA_SMOKE_OPENAI_URL=http://host.docker.internal:18141 NEXORA_SMOKE_OPENAI_MODEL=qwen2.5:0.5b \
  NEXORA_SMOKE_AUDIO="$audio" NEXORA_SMOKE_AUDIO_TEXT=croissant NEXORA_SMOKE_WEB_SEARCH=1 NEXORA_SMOKE_COLLECTOR_HOST=172.17.0.1

origin="$(grep -E '^NEXORA_PUBLIC_URL=' "$root/deploy/.env" | cut -d= -f2-)"
exec python3 -I "$root/scripts/smoke.py" --url http://127.0.0.1:3200 --origin "$origin" --report "$report" "$@"
