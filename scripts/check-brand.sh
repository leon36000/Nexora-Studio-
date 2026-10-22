#!/usr/bin/env bash
# Fails when a third-party brand (Sim, sim.ai, OOMOL, Etalab…) appears in Nexora's user-facing source.
# Exemptions live in scripts/data/brand-allowlist.txt, one reason per entry.
set -euo pipefail
ROOT="${NEXORA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
exec python3 -I "$(dirname "$0")/lib/check_brand.py" --root "$ROOT" "$@"
