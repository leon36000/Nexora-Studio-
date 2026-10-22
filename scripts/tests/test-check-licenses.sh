#!/usr/bin/env bash
# Tests for scripts/check-licenses.sh. Run: bash scripts/tests/test-check-licenses.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$HERE/check-licenses.sh"
fails=0
expect() { local want="$1" label="$2"; shift 2; "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" -eq "$want" ]; then echo "ok   - $label"; else echo "FAIL - $label (exit $got, want $want)"; fails=$((fails+1)); fi; }

make_tree() {
  local d; d="$(mktemp -d)"
  mkdir -p "$d/workstudio" "$d/services/nexora-api" "$d/services/nexora-connect"
  for c in workstudio services/nexora-api services/nexora-connect; do echo L > "$d/$c/LICENSE"; echo U > "$d/$c/UPSTREAM.md"; done
  echo N > "$d/workstudio/NOTICE"
  printf '| `workstudio/` |\n| `services/nexora-api/` |\n| `services/nexora-connect/` |\n' > "$d/THIRD_PARTY_NOTICES.md"
  echo "$d"
}
d="$(make_tree)"; expect 0 "complete tree passes" env NEXORA_ROOT="$d" bash "$SCRIPT"
d="$(make_tree)"; rm "$d/services/nexora-api/UPSTREAM.md"; expect 1 "missing UPSTREAM fails" env NEXORA_ROOT="$d" bash "$SCRIPT"
d="$(make_tree)"; rm "$d/workstudio/NOTICE"; expect 1 "missing Sim NOTICE fails" env NEXORA_ROOT="$d" bash "$SCRIPT"
d="$(make_tree)"; mv "$d/services/nexora-connect/LICENSE" "$d/services/nexora-connect/LICENSE.txt"; expect 0 "LICENSE.txt accepted" env NEXORA_ROOT="$d" bash "$SCRIPT"
d="$(make_tree)"; rm "$d/services/nexora-connect/LICENSE"; expect 1 "missing LICENSE fails" env NEXORA_ROOT="$d" bash "$SCRIPT"
d="$(make_tree)"; printf '| `workstudio/` |\n' > "$d/THIRD_PARTY_NOTICES.md"; expect 1 "component absent from notices fails" env NEXORA_ROOT="$d" bash "$SCRIPT"
[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
