#!/usr/bin/env bash
# Tests for scripts/check-brand.sh. Run: bash scripts/tests/test-check-brand.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$HERE/check-brand.sh"
fails=0
expect() { local want="$1" label="$2"; shift 2; "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" -eq "$want" ]; then echo "ok   - $label"; else echo "FAIL - $label (exit $got, want $want)"; fails=$((fails+1)); fi; }
tree() { local d; d="$(mktemp -d)"; mkdir -p "$d/workstudio/apps/sim/app" "$d/scripts/data"; : > "$d/scripts/data/brand-allowlist.txt"; echo "$d"; }
run() { NEXORA_ROOT="$1" bash "$SCRIPT"; }

d="$(tree)"; echo "export const t = 'Nexora WorkStudio'" > "$d/workstudio/apps/sim/app/a.tsx"; expect 0 "clean file passes" run "$d"
d="$(tree)"; echo "<p>Welcome to Sim</p>" > "$d/workstudio/apps/sim/app/a.tsx"; expect 1 "visible Sim fails" run "$d"
d="$(tree)"; echo "const u = 'https://docs.sim.ai/x'" > "$d/workstudio/apps/sim/app/a.tsx"; expect 1 "sim.ai link fails" run "$d"
d="$(tree)"; echo "const n = 'powered by OOMOL'" > "$d/workstudio/apps/sim/app/a.ts"; expect 1 "OOMOL fails" run "$d"
d="$(tree)"; printf '// Sim did this\n * Sim also\n' > "$d/workstudio/apps/sim/app/a.ts"; expect 0 "comment lines are ignored" run "$d"
d="$(tree)"; printf "import { x } from '@sim/db'\nconst k = process.env.SIM_AGENT_API_URL\nconst h = 'X-Sim-Source-Env'\n" > "$d/workstudio/apps/sim/app/a.ts"; expect 0 "technical identifiers pass" run "$d"
d="$(tree)"; echo "<p>Sim</p>" > "$d/workstudio/apps/sim/app/a.test.tsx"; expect 0 "tests are ignored" run "$d"
d="$(tree)"; mkdir -p "$d/workstudio/apps/sim/app/(landing)"; echo "<p>Sim</p>" > "$d/workstudio/apps/sim/app/(landing)/p.tsx"; echo "workstudio/apps/sim/app/(landing)  # blocked" > "$d/scripts/data/brand-allowlist.txt"; expect 0 "allowlisted prefix passes" run "$d"
d="$(tree)"; echo "const ua = 'Sim/1.0'" > "$d/workstudio/apps/sim/app/a.ts"; echo "line: ^const ua  # test pattern" > "$d/scripts/data/brand-allowlist.txt"; expect 0 "allowlisted line pattern passes" run "$d"
d="$(tree)"; echo "export const SIMULATION = 'Simple'" > "$d/workstudio/apps/sim/app/a.ts"; expect 0 "words containing Sim pass" run "$d"
d="$(tree)"; echo "Nexora construit une suite d'IA." > "$d/README.md"; expect 1 "company named Nexora instead of Nexora AI fails" run "$d"
d="$(tree)"; echo "Nexora AI construit une suite d'IA ; Nexora WorkStudio en est l'application." > "$d/README.md"; expect 0 "company named Nexora AI passes" run "$d"
d="$(tree)"; echo "Ce dépôt contient des logiciels de tiers, modifiés par Nexora." > "$d/NOTICE"; expect 1 "NOTICE naming Nexora as the company fails" run "$d"
d="$(tree)"; mkdir -p "$d/docs/guide"; echo "Nexora SAS vous accompagne." > "$d/docs/guide/a.md"; expect 1 "a legal form attached to the bare name fails" run "$d"
[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
