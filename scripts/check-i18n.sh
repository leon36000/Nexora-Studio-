#!/usr/bin/env bash
# Fails when a translated interface folder still holds hardcoded prose instead of messages.
# Covered folders: scripts/data/i18n-covered-dirs.txt; allowed proper nouns: scripts/data/i18n-allowed-terms.txt.
set -euo pipefail
ROOT="${NEXORA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
exec python3 -I "$(dirname "$0")/lib/check_i18n.py" --root "$ROOT" "$@"
