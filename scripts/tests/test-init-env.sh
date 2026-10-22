#!/usr/bin/env bash
# Tests for scripts/init-env.sh. Run: bash scripts/tests/test-init-env.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$HERE/init-env.sh"
fails=0
ok() { echo "ok   - $1"; }
ko() { echo "FAIL - $1"; fails=$((fails+1)); }

d="$(mktemp -d)"; mkdir -p "$d/deploy"; cp "$HERE/../deploy/.env.example" "$d/deploy/.env.example" 2>/dev/null || ko "deploy/.env.example exists"
NEXORA_ROOT="$d" bash "$SCRIPT" >/dev/null 2>&1 && ok "creates the file" || ko "creates the file"
[ "$(stat -c %a "$d/deploy/.env" 2>/dev/null)" = "600" ] && ok "file is private (600)" || ko "file is private (600)"
for v in POSTGRES_PASSWORD BETTER_AUTH_SECRET ENCRYPTION_KEY INTERNAL_API_SECRET API_ENCRYPTION_KEY CRON_SECRET NEXORA_API_SECRET_KEY NEXORA_API_ADMIN_PASSWORD NEXORA_API_REDIS_PASSWORD NEXORA_CONNECT_ENCRYPTION_KEY NEXORA_CONNECT_RUNTIME_TOKEN NEXORA_CONNECT_ADMIN_TOKEN; do
  val="$(grep -E "^$v=" "$d/deploy/.env" | cut -d= -f2-)"
  [ "${#val}" -ge 32 ] && ok "$v is generated" || ko "$v is generated (got '${val}')"
done
grep -q "=change-me$" "$d/deploy/.env" && ko "no placeholder left" || ok "no placeholder left"
before="$(sha256sum "$d/deploy/.env")"; NEXORA_ROOT="$d" bash "$SCRIPT" >/dev/null 2>&1; after="$(sha256sum "$d/deploy/.env")"
[ "$before" = "$after" ] && ok "never rewrites an existing file" || ko "never rewrites an existing file"
d2="$(mktemp -d)"; mkdir -p "$d2/deploy"; cp "$d/deploy/.env.example" "$d2/deploy/"; NEXORA_ROOT="$d2" bash "$SCRIPT" >/dev/null 2>&1
[ "$(grep ^ENCRYPTION_KEY= "$d/deploy/.env")" != "$(grep ^ENCRYPTION_KEY= "$d2/deploy/.env")" ] && ok "secrets differ between installs" || ko "secrets differ between installs"
[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
