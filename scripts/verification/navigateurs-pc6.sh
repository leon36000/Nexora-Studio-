#!/usr/bin/env bash
# Parcours navigateurs (Chromium, Firefox, WebKit ; bureau et mobile) sur l'instance de test pc6.
# Identifiants de l'administrateur de test lus dans scripts/dev/.secrets (hors dépôt, jamais affichés).
# Usage : scripts/verification/navigateurs-pc6.sh [rapport.json] [options de navigateurs.mjs]
#         NEXORA_E2E_URL=http://localhost:3400 pour une autre instance ; NEXORA_SECRETS_ROOT depuis un arbre de travail.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
secrets_root="${NEXORA_SECRETS_ROOT:-$root}"
secrets_file="$secrets_root/scripts/dev/.secrets"
[[ -f "$secrets_file" ]] || { echo "absent : $secrets_file" >&2; exit 1; }
NEXORA_E2E_EMAIL="${NEXORA_E2E_EMAIL:-$(grep -E '^SMOKE_ADMIN_EMAIL=' "$secrets_file" | cut -d= -f2-)}"
NEXORA_E2E_PASSWORD="${NEXORA_E2E_PASSWORD:-$(grep -E '^SMOKE_ADMIN_PASSWORD=' "$secrets_file" | cut -d= -f2-)}"
export NEXORA_E2E_EMAIL NEXORA_E2E_PASSWORD
export NEXORA_E2E_URL="${NEXORA_E2E_URL:-http://localhost:3200}"
report="${1:-${TMPDIR:-/tmp}/nexora-navigateurs.json}"
shift || true
exec node "$root/scripts/verification/navigateurs.mjs" "$report" "$@"
