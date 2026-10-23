#!/usr/bin/env bash
# End-to-end smoke test of a running Nexora platform.
# Usage: scripts/smoke.sh [base-url] [report.json] [--quick]
set -euo pipefail
url="${1:-http://localhost:3000}"
[ "$#" -gt 0 ] && shift
args=()
for arg in "$@"; do
  case "$arg" in --*) args+=("$arg") ;; *) args+=(--report "$arg") ;; esac
done
exec python3 -I "$(dirname "$0")/smoke.py" --url "$url" "${args[@]}"
