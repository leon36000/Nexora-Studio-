#!/usr/bin/env bash
# Proves that no file from Sim's proprietary apps/sim/ee/ is present in this repository.
#  (a) every file under workstudio/apps/sim/ee/ carries the Nexora clean-room header;
#  (b) no blob reachable in git history matches an original ee/ blob hash;
#  (c) no file in the working tree (tracked or untracked, not ignored) matches one.
# The reference list holds blob hashes only (scripts/data/sim-ee-blob-shas.txt), never content.
# Exit: 0 clean, 1 violation, 2 usage error.
set -euo pipefail

ROOT="${NEXORA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
REF="${EE_REF_FILE:-$ROOT/scripts/data/sim-ee-blob-shas.txt}"
EE_DIR="$ROOT/workstudio/apps/sim/ee"
HEADER='Nexora clean-room replacement'
EMPTY_BLOB='e69de29bb2d1d6434b8b29ae775ad8c2e48c5391'

[ -f "$REF" ] || { echo "check-no-ee: reference list not found: $REF" >&2; exit 2; }
violations=0
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
grep -Eo '^[0-9a-f]{40}' "$REF" | grep -v "$EMPTY_BLOB" | sort -u > "$tmp/ref" || true

# (a) header on every ee/ file
if [ -d "$EE_DIR" ]; then
  while IFS= read -r -d '' f; do
    if ! head -n 3 "$f" | grep -q "$HEADER"; then
      echo "missing clean-room header: ${f#"$ROOT"/}"; violations=$((violations+1))
    fi
  done < <(find "$EE_DIR" -type f -print0)
fi

# (b) every blob in the object database reachable from any ref
if git -C "$ROOT" rev-parse --git-dir >/dev/null 2>&1 && git -C "$ROOT" rev-parse --verify -q HEAD >/dev/null; then
  git -C "$ROOT" rev-list --objects --all | cut -d' ' -f1 \
    | git -C "$ROOT" cat-file --batch-check='%(objecttype) %(objectname)' \
    | awk '$1=="blob"{print $2}' | sort -u > "$tmp/history"
  comm -12 "$tmp/ref" "$tmp/history" > "$tmp/hit-history"
  if [ -s "$tmp/hit-history" ]; then
    echo "original ee/ blobs found in git history: $(wc -l < "$tmp/hit-history")"; violations=$((violations+1))
  fi
fi

# (c) working tree, tracked and untracked (ignored files excluded)
( cd "$ROOT" && git ls-files -z -co --exclude-standard 2>/dev/null || find . -type f -not -path './.git/*' -print0 ) \
  | ( cd "$ROOT" && while IFS= read -r -d '' p; do [ -f "$p" ] && printf '%s\n' "$p"; done ) > "$tmp/paths"
( cd "$ROOT" && git hash-object --stdin-paths < "$tmp/paths" ) > "$tmp/hashes"
paste -d' ' "$tmp/hashes" "$tmp/paths" | sort -k1,1 > "$tmp/tree"
join -j1 "$tmp/ref" "$tmp/tree" > "$tmp/hit-tree" || true
if [ -s "$tmp/hit-tree" ]; then
  echo "files identical to an original ee/ file:"; cut -d' ' -f2- "$tmp/hit-tree"; violations=$((violations+1))
fi

if [ "$violations" -gt 0 ]; then echo "check-no-ee: FAILED ($violations problem(s))"; exit 1; fi
echo "check-no-ee: OK ($(wc -l < "$tmp/ref") reference hashes, $(wc -l < "$tmp/paths") files checked)"
