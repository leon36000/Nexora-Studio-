#!/usr/bin/env bash
# Renders deploy/compose.yml with deploy/.env.example and checks the configuration WorkStudio
# receives on a fresh install. Run: bash scripts/tests/test-compose-env.sh (needs docker compose).
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
fails=0
ok() { echo "ok   - $1"; }
ko() { echo "FAIL - $1"; fails=$((fails+1)); }
dc() { if docker info > /dev/null 2>&1; then docker "$@"; else sg docker -c "docker $(printf '%q ' "$@")"; fi; }

env_file="$(mktemp)"; trap 'rm -f "$env_file"' EXIT
sed 's/=change-me$/=0123456789abcdef0123456789abcdef/' "$ROOT/deploy/.env.example" > "$env_file"
rendered="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$env_file" config --format json 2>/dev/null)"
[ -n "$rendered" ] && ok "compose renders with the example configuration" || { ko "compose renders with the example configuration"; exit 1; }
value() { python3 -I -c 'import json,sys; e=json.load(sys.stdin)["services"]["workstudio"]["environment"]; print(e.get(sys.argv[1]) or "")' "$1" <<< "$rendered"; }

# A partial SMTP configuration stops WorkStudio at start: no SMTP value without a server.
smtp="$(for k in SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS; do value "$k"; done | tr -d '\n')"
[ -z "$smtp" ] && ok "no SMTP setting without an SMTP server" || ko "no SMTP setting without an SMTP server (got: $smtp)"
[ -z "$(value SEARXNG_URL)" ] && [ -z "$(value PREVIEW_BLOCKS)" ] && ok "web search off on a fresh install" || ko "web search off on a fresh install"
[ "$(value KB_EMBEDDING_MODEL)" = "ollama/bge-m3" ] && ok "knowledge bases embed with the local model" || ko "knowledge bases embed with the local model"
command="$(python3 -I -c 'import json,sys; print(" ".join(json.load(sys.stdin)["services"]["workstudio"]["command"]))' <<< "$rendered")"
case "$command" in *". /bootstrap/nexora-admin.env"*) ok "WorkStudio reads its model administration key" ;; *) ko "WorkStudio reads its model administration key" ;; esac
[ -z "$(value NEXORA_API_ADMIN_PASSWORD)" ] && ok "the Nexora API admin password stays out of WorkStudio" || ko "the Nexora API admin password stays out of WorkStudio"

[ -n "$(value NEXORA_CONNECT_ADMIN_TOKEN)" ] && ok "WorkStudio can administer Nexora Connect (connectors catalog)" || ko "WorkStudio can administer Nexora Connect (connectors catalog)"

# install.sh writes values holding $ or # between single quotes: Compose must keep them as is.
printf "NEXORA_SMTP_HOST=smtp.pme-test.fr\nNEXORA_SMTP_PASS='p@ss\$word #2'\n" >> "$env_file"
rendered="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$env_file" config --format json 2>/dev/null)"
# (`compose config` prints a literal $ as $$, the form it would not interpolate again.)
[ "$(value SMTP_PASS | sed 's/\$\$/$/g')" = 'p@ss$word #2' ] && ok "quoted secrets reach WorkStudio unchanged" || ko "quoted secrets reach WorkStudio unchanged (got: $(value SMTP_PASS))"

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
