#!/usr/bin/env bash
# Parcours navigateurs dans le conteneur officiel de Playwright : WebKit (Safari) y fonctionne sans installer de
# bibliothèque système (sur l'hôte, WebKit exige des paquets absents d'Ubuntu 24.04 arm64 et un accès administrateur).
# L'image est la même version que playwright-core du dépôt (v1.61.1) : `docker pull mcr.microsoft.com/playwright:v1.61.1-noble`.
# Usage : scripts/verification/navigateurs-docker.sh [rapport.json] [options de navigateurs.mjs]
#         NEXORA_E2E_URL (défaut http://localhost:3200) ; le conteneur partage le réseau de l'hôte.
#         Identifiants : NEXORA_E2E_EMAIL / NEXORA_E2E_PASSWORD, sinon scripts/dev/.secrets (NEXORA_SECRETS_ROOT depuis un arbre de travail).
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
secrets_root="${NEXORA_SECRETS_ROOT:-$root}"
secrets_file="$secrets_root/scripts/dev/.secrets"
if [[ -z "${NEXORA_E2E_EMAIL:-}" || -z "${NEXORA_E2E_PASSWORD:-}" ]]; then
  [[ -f "$secrets_file" ]] || { echo "absent : $secrets_file" >&2; exit 1; }
  NEXORA_E2E_EMAIL="$(grep -E '^SMOKE_ADMIN_EMAIL=' "$secrets_file" | cut -d= -f2-)"
  NEXORA_E2E_PASSWORD="$(grep -E '^SMOKE_ADMIN_PASSWORD=' "$secrets_file" | cut -d= -f2-)"
fi
export NEXORA_E2E_EMAIL NEXORA_E2E_PASSWORD
image="${NEXORA_PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v1.61.1-noble}"
report="$(realpath -m "${1:-${TMPDIR:-/tmp}/nexora-navigateurs-docker.json}")"
shift || true
out="$(dirname "$report")"
mkdir -p "$out"
# Sans node_modules dans le dépôt (serveur x86) : NEXORA_PLAYWRIGHT_CORE_DIR = dossier contenant node_modules/playwright-core
# (installé par `npm install playwright-core@1.61.1` dans le même conteneur), monté en lecture seule.
core=()
if [[ -n "${NEXORA_PLAYWRIGHT_CORE_DIR:-}" ]]; then
  core=(-v "$NEXORA_PLAYWRIGHT_CORE_DIR:/pw:ro" -e NEXORA_PLAYWRIGHT_CORE=/pw/node_modules/playwright-core)
fi
docker run --rm --network host --ipc=host --user "$(id -u):$(id -g)" \
  -v "$root:/work:ro" -v "$out:/out" "${core[@]}" \
  -e NEXORA_E2E_EMAIL -e NEXORA_E2E_PASSWORD -e NEXORA_E2E_URL="${NEXORA_E2E_URL:-http://localhost:3200}" \
  -e NEXORA_E2E_SHOTS=/out/captures \
  "$image" node /work/scripts/verification/navigateurs.mjs "/out/$(basename "$report")" "$@"
