#!/usr/bin/env bash
# Checks that each third-party component keeps its license, its provenance file and a notice entry.
# Exit: 0 complete, 1 something missing.
set -uo pipefail
ROOT="${NEXORA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
COMPONENTS=(workstudio services/nexora-api services/nexora-connect)
missing=0
miss() { echo "missing: $1"; missing=$((missing+1)); }

[ -f "$ROOT/THIRD_PARTY_NOTICES.md" ] || miss "THIRD_PARTY_NOTICES.md"
for c in "${COMPONENTS[@]}"; do
  [ -f "$ROOT/$c/LICENSE" ] || [ -f "$ROOT/$c/LICENSE.txt" ] || [ -f "$ROOT/$c/LICENSE.md" ] || miss "$c/LICENSE"
  [ -f "$ROOT/$c/UPSTREAM.md" ] || miss "$c/UPSTREAM.md"
  grep -qF "\`$c/\`" "$ROOT/THIRD_PARTY_NOTICES.md" 2>/dev/null || miss "THIRD_PARTY_NOTICES.md entry for $c/"
done
[ -f "$ROOT/workstudio/NOTICE" ] || miss "workstudio/NOTICE (Apache-2.0 §4(d))"
[ -f "$ROOT/services/nexora-connect/NOTICE.md" ] || [ ! -d "$ROOT/services/nexora-connect/src" ] || miss "services/nexora-connect/NOTICE.md (Apache-2.0 §4(d))"

if [ "$missing" -gt 0 ]; then echo "check-licenses: FAILED ($missing missing)"; exit 1; fi
echo "check-licenses: OK (${#COMPONENTS[@]} components)"
