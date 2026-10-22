#!/usr/bin/env bash
# Tests for scripts/check-no-ee.sh. Run: bash scripts/tests/test-check-no-ee.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$HERE/check-no-ee.sh"
HEADER='// Nexora clean-room replacement — written from core call sites only, Apache-2.0 core untouched.'
fails=0

make_repo() {
  local dir; dir="$(mktemp -d)"
  mkdir -p "$dir/workstudio/apps/sim/ee/mod"
  git -C "$dir" init -q -b main
  git -C "$dir" config user.email t@t && git -C "$dir" config user.name t
  printf '%s\nexport const ok = 1\n' "$HEADER" > "$dir/workstudio/apps/sim/ee/mod/index.ts"
  : > "$dir/ref.txt"
  echo "$dir"
}

expect() { # expect <code> <label> <cmd...>
  local want="$1" label="$2"; shift 2
  "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" -eq "$want" ]; then echo "ok   - $label"; else echo "FAIL - $label (exit $got, want $want)"; fails=$((fails+1)); fi
}

d="$(make_repo)"; git -C "$d" add -A && git -C "$d" commit -qm init
expect 0 "clean repo passes" env NEXORA_ROOT="$d" EE_REF_FILE="$d/ref.txt" bash "$SCRIPT"

d="$(make_repo)"; echo 'export const x = 1' > "$d/workstudio/apps/sim/ee/mod/bad.ts"
expect 1 "ee file without header fails" env NEXORA_ROOT="$d" EE_REF_FILE="$d/ref.txt" bash "$SCRIPT"

d="$(make_repo)"; echo 'original proprietary line' > "$d/workstudio/apps/sim/lib.ts"
git -C "$d" hash-object "$d/workstudio/apps/sim/lib.ts" > "$d/ref.txt"
expect 1 "file matching a reference blob fails" env NEXORA_ROOT="$d" EE_REF_FILE="$d/ref.txt" bash "$SCRIPT"

d="$(make_repo)"; echo 'original proprietary line' > "$d/old.ts"
git -C "$d" add -A && git -C "$d" commit -qm leak && git -C "$d" rm -q old.ts && git -C "$d" commit -qm rm
git -C "$d" hash-object -t blob --stdin <<< 'original proprietary line' > "$d/ref.txt"
expect 1 "reference blob in git history fails" env NEXORA_ROOT="$d" EE_REF_FILE="$d/ref.txt" bash "$SCRIPT"

d="$(make_repo)"; git -C "$d" add -A && git -C "$d" commit -qm init
expect 2 "missing reference file is an error" env NEXORA_ROOT="$d" EE_REF_FILE="$d/missing.txt" bash "$SCRIPT"

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
