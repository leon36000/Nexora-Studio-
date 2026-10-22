#!/usr/bin/env bash
# End-to-end smoke test of a running Nexora platform. Usage: scripts/smoke.sh [base-url] [report.json]
set -euo pipefail
exec python3 -I "$(dirname "$0")/smoke.py" --url "${1:-http://localhost:3000}" ${2:+--report "$2"}
