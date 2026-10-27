#!/usr/bin/env bash
# Mesure Lighthouse d'une page (performance, accessibilité, bonnes pratiques, SEO) avec le Chromium de Playwright.
# Usage : scripts/verification/lighthouse.sh <url> <nom> [mobile|desktop] [dossier-sortie]
# Lighthouse n'est pas une dépendance du dépôt : il s'installe hors dépôt (LIGHTHOUSE_DIR, défaut ~/.cache/nexora-lighthouse).
# Pour une page derrière la connexion, passer un cookie de session : LIGHTHOUSE_COOKIE='better-auth.session_token=…'.
set -euo pipefail
url="${1:?url}"
name="${2:?nom}"
preset="${3:-mobile}"
out="${4:-${TMPDIR:-/tmp}/nexora-lighthouse}"
dir="${LIGHTHOUSE_DIR:-$HOME/.cache/nexora-lighthouse}"
mkdir -p "$out" "$dir"
if [[ ! -d "$dir/node_modules/lighthouse" ]]; then
  printf '{"name":"nexora-lighthouse","private":true}\n' > "$dir/package.json"
  bun add --cwd "$dir" lighthouse@13.5.0 >/dev/null
fi
chrome="${CHROME_PATH:-$(ls -d "$HOME"/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | tail -1)}"
extra=()
if [[ -n "${LIGHTHOUSE_COOKIE:-}" ]]; then extra+=(--extra-headers "{\"Cookie\":\"${LIGHTHOUSE_COOKIE}\"}"); fi
form=()
if [[ "$preset" == desktop ]]; then form+=(--preset=desktop); fi
CHROME_PATH="$chrome" node "$dir/node_modules/lighthouse/cli/index.js" "$url" \
  --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,accessibility,best-practices,seo \
  --output=json --output-path="$out/$name-$preset.json" --quiet "${form[@]}" "${extra[@]}"
node - "$out/$name-$preset.json" <<'EOF'
const r = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'))
const a = r.audits
const cats = Object.entries(r.categories).map(([k, v]) => `${k}:${Math.round(v.score * 100)}`).join(' ')
const get = (k) => a[k]?.displayValue ?? '-'
console.log(`${r.finalDisplayedUrl}\n  ${cats}\n  FCP ${get('first-contentful-paint')} LCP ${get('largest-contentful-paint')} TBT ${get('total-blocking-time')} CLS ${get('cumulative-layout-shift')} SI ${get('speed-index')} poids ${get('total-byte-weight')} DOM ${get('dom-size')}`)
EOF
