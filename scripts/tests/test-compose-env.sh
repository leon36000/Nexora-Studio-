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
# Réglages › État shows the installed version and probes the transcription service only when it is on.
[ "$(value NEXORA_VERSION)" = "local" ] && ok "WorkStudio knows the installed version" || ko "WorkStudio knows the installed version (got: $(value NEXORA_VERSION))"
[ -z "$(value NEXORA_WHISPER_URL)" ] && ok "no transcription service to check by default" || ko "no transcription service to check by default"
command="$(python3 -I -c 'import json,sys; print(" ".join(json.load(sys.stdin)["services"]["workstudio"]["command"]))' <<< "$rendered")"
case "$command" in *". /bootstrap/nexora-admin.env"*) ok "WorkStudio reads its model administration key" ;; *) ko "WorkStudio reads its model administration key" ;; esac
[ -z "$(value NEXORA_API_ADMIN_PASSWORD)" ] && ok "the Nexora API admin password stays out of WorkStudio" || ko "the Nexora API admin password stays out of WorkStudio"

[ -n "$(value NEXORA_CONNECT_ADMIN_TOKEN)" ] && ok "WorkStudio can administer Nexora Connect (connectors catalog)" || ko "WorkStudio can administer Nexora Connect (connectors catalog)"

# Uploaded files (knowledge documents, workspace files) must outlive container updates.
mounts="$(python3 -I -c 'import json,sys; v=json.load(sys.stdin)["services"]["workstudio"].get("volumes",[]); print(" ".join(m.get("target","") if isinstance(m,dict) else m for m in v))' <<< "$rendered")"
case " $mounts " in *" /app/apps/sim/uploads "*) ok "uploaded files are kept in a volume" ;; *) ko "uploaded files are kept in a volume (mounts: $mounts)" ;; esac

# The local model reads attached documents: Ollama's 4 096-token default context cannot hold them.
ollama_ctx() { python3 -I -c 'import json,sys; print(json.load(sys.stdin)["services"]["ollama"].get("environment",{}).get("OLLAMA_CONTEXT_LENGTH") or "")' <<< "$1"; }
[ "$(ollama_ctx "$rendered")" = "16384" ] && ok "the local model gets a 16k context by default" || ko "the local model gets a 16k context by default (got: $(ollama_ctx "$rendered"))"
ctx_env="$(mktemp)"; cp "$env_file" "$ctx_env"; printf "NEXORA_OLLAMA_CONTEXT_LENGTH=32768\n" >> "$ctx_env"
ctx_rendered="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$ctx_env" config --format json 2>/dev/null)"; rm -f "$ctx_env"
[ "$(ollama_ctx "$ctx_rendered")" = "32768" ] && ok "the local model context is set in deploy/.env" || ko "the local model context is set in deploy/.env (got: $(ollama_ctx "$ctx_rendered"))"

# « Appliquer » restarts WorkStudio only when something brings it back; SSO is optional by default.
[ "$(value NEXORA_SUPERVISED)" = "1" ] && ok "WorkStudio knows it is restarted by Docker" || ko "WorkStudio knows it is restarted by Docker"
[ -z "$(value NEXORA_OIDC_REQUIRED)" ] && ok "single sign-on is not required by default" || ko "single sign-on is not required by default (got: $(value NEXORA_OIDC_REQUIRED))"

# The default model's name is fixed: WorkStudio, the bootstrap and Nexora API must agree on it.
printf "NEXORA_MODEL_NAME=assistant\n" >> "$env_file"
rendered="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$env_file" config --format json 2>/dev/null)"
[ "$(value NEXORA_DEFAULT_MODEL)" = "nexora-default" ] && ok "the default model is always nexora-default" || ko "the default model is always nexora-default (got: $(value NEXORA_DEFAULT_MODEL))"
required_env="$(mktemp)"; cp "$env_file" "$required_env"; printf "NEXORA_OIDC_REQUIRED=true\n" >> "$required_env"
required="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$required_env" config --format json 2>/dev/null | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["services"]["workstudio"]["environment"].get("NEXORA_OIDC_REQUIRED") or "")')"; rm -f "$required_env"
[ "$required" = "true" ] && ok "« connexion obligatoire » set in deploy/.env reaches WorkStudio" || ko "« connexion obligatoire » set in deploy/.env reaches WorkStudio (got: $required)"

# HTTPS: Caddy serves the public domain only when the « https » profile is on.
has_service() { python3 -I -c 'import json,sys; print(sys.argv[1] in json.load(sys.stdin)["services"])' "$1" <<< "$rendered"; }
[ "$(has_service caddy)" = "False" ] && ok "no HTTPS proxy by default" || ko "no HTTPS proxy by default"
https_env="$(mktemp)"; cp "$env_file" "$https_env"
printf "NEXORA_DOMAIN=nexora.pme-test.fr\nNEXORA_TLS=internal\nCOMPOSE_PROFILES=https\n" >> "$https_env"
https_rendered="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$https_env" config --format json 2>/dev/null)"; rm -f "$https_env"
ports="$(python3 -I -c 'import json,sys; c=json.load(sys.stdin)["services"].get("caddy",{}); print(" ".join(str(p.get("published")) for p in c.get("ports",[])))' <<< "$https_rendered")"
[ "$ports" = "80 443" ] && ok "HTTPS proxy publishes 80 and 443" || ko "HTTPS proxy publishes 80 and 443 (got: $ports)"
python3 -I -c 'import json,sys; c=json.load(sys.stdin)["services"]["caddy"]; assert c["environment"]["NEXORA_DOMAIN"]=="nexora.pme-test.fr" and any(v.get("target")=="/etc/caddy/Caddyfile" for v in c["volumes"])' <<< "$https_rendered" 2>/dev/null \
  && ok "HTTPS proxy gets the domain and its Caddyfile" || ko "HTTPS proxy gets the domain and its Caddyfile"

# Local transcription (profile « voice »): off by default; on, a pinned Whisper server reachable only
# on the internal network, with capped threads, registered by the bootstrap.
[ "$(has_service whisper)" = "False" ] && ok "no transcription service by default" || ko "no transcription service by default"
[ -z "$(python3 -I -c 'import json,sys; print(json.load(sys.stdin)["services"]["nexora-bootstrap"]["environment"].get("NEXORA_WHISPER_URL") or "")' <<< "$rendered")" ] \
  && ok "the bootstrap registers no transcription service by default" || ko "the bootstrap registers no transcription service by default"
voice_env="$(mktemp)"; cp "$env_file" "$voice_env"
printf "COMPOSE_PROFILES=voice\nNEXORA_WHISPER_URL=http://whisper:8000\n" >> "$voice_env"
voice_rendered="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$voice_env" config --format json 2>/dev/null)"; rm -f "$voice_env"
python3 -I -c '
import json, re, sys
services = json.load(sys.stdin)["services"]
w = services["whisper"]
assert re.search(r":\d+\.\d+\.\d+(-[a-z0-9]+)?$", w["image"]), w["image"]
assert not w.get("ports"), w.get("ports")
assert int(w["environment"]["WHISPER__CPU_THREADS"]) >= 1
assert any(v.get("type") == "volume" for v in w.get("volumes", []))
b = services["nexora-bootstrap"]["environment"]
assert b["NEXORA_WHISPER_URL"] == "http://whisper:8000"
assert "whisper-small" in b["NEXORA_WHISPER_MODEL"]
assert services["workstudio"]["environment"]["NEXORA_WHISPER_URL"] == "http://whisper:8000"
' <<< "$voice_rendered" 2>/dev/null \
  && ok "transcription service: pinned image, internal only, capped threads, registered by the bootstrap, checked by WorkStudio" \
  || ko "transcription service: pinned image, internal only, capped threads, registered by the bootstrap, checked by WorkStudio"
# Offline after its one-time download: the server never asks Hugging Face when it loads its model
# (every ten idle minutes); only the fetch before it starts may, and only while the model is missing.
python3 -I -c '
import json, sys
w = json.load(sys.stdin)["services"]["whisper"]
assert w["environment"]["HF_HUB_OFFLINE"] == "1", w["environment"]
assert w["environment"]["NEXORA_WHISPER_MODEL"].endswith("whisper-small")
command = " ".join(w["command"])
fetch, _, serve = command.partition(";")
assert "HF_HUB_OFFLINE=0" in fetch and "fetch-whisper-model.py" in fetch, command
assert "HF_HUB_OFFLINE" not in serve and "exec uvicorn" in serve, command
assert any(v.get("target", "").endswith("fetch-whisper-model.py") and v.get("read_only") for v in w["volumes"]), w["volumes"]
' <<< "$voice_rendered" 2>/dev/null \
  && ok "transcription server offline; its model fetched once before it starts" \
  || ko "transcription server offline; its model fetched once before it starts"

# The developer API (<domain>/v1, OpenAI format) streams through Caddy without compression.
caddyfile="$ROOT/deploy/caddy/Caddyfile"
python3 -I - "$caddyfile" <<'PY' && ok "Caddy relays /v1 unbuffered and uncompressed" || ko "Caddy relays /v1 unbuffered and uncompressed"
import re, sys
text = open(sys.argv[1], encoding="utf-8").read()
site = text.split("{$NEXORA_DOMAIN} {", 1)[1].split("\n}\n", 1)[0]
api = re.search(r"handle @developer_api \{(.*?)\n\t\}", site, re.S)
assert "@developer_api path /v1 /v1/*" in site and api, site
assert "flush_interval -1" in api.group(1) and "encode" not in api.group(1), api.group(1)
PY
if dc image inspect caddy:2.8.4-alpine > /dev/null 2>&1; then
  dc run --rm -e NEXORA_DOMAIN=nexora.pme-test.fr -e NEXORA_TLS=internal -v "$caddyfile:/etc/caddy/Caddyfile:ro" caddy:2.8.4-alpine \
    caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null 2>&1 \
    && ok "Caddyfile is valid" || ko "Caddyfile is valid"
fi

# install.sh writes values holding $ or # between single quotes: Compose must keep them as is.
printf "NEXORA_SMTP_HOST=smtp.pme-test.fr\nNEXORA_SMTP_PASS='p@ss\$word #2'\n" >> "$env_file"
rendered="$(dc compose -f "$ROOT/deploy/compose.yml" --env-file "$env_file" config --format json 2>/dev/null)"
# (`compose config` prints a literal $ as $$, the form it would not interpolate again.)
[ "$(value SMTP_PASS | sed 's/\$\$/$/g')" = 'p@ss$word #2' ] && ok "quoted secrets reach WorkStudio unchanged" || ko "quoted secrets reach WorkStudio unchanged (got: $(value SMTP_PASS))"

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
