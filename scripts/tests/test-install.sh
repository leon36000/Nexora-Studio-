#!/usr/bin/env bash
# Tests for install.sh with fake docker/curl binaries. Run: bash scripts/tests/test-install.sh
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="$REPO/install.sh"
fails=0
ok() { echo "ok   - $1"; }
ko() { echo "FAIL - $1"; fails=$((fails+1)); }
envval() { grep -E "^$1=" "$2" | tail -1 | cut -d= -f2-; }
scratch="$(mktemp -d)"; trap 'rm -rf "$scratch"' EXIT
new_home() { mktemp -d "$scratch/run.XXXXXX"; }

# Fake binaries: docker logs every call; `compose pull` fails when FAKE_PULL_EXIT=1; curl answers 200.
fakebin="$(new_home)"
cat > "$fakebin/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker $*" >> "$FAKE_LOG"
case "$*" in
  "compose version"*) echo "Docker Compose version v2.30.0" ;;
  *"config --images"*) printf 'pgvector/pgvector:pg17\nnexora/workstudio:local\n' ;;
  "image inspect"*) exit "${FAKE_LOCAL_EXIT:-1}" ;;
  *"exec -T ollama ollama pull"*) exit "${FAKE_OLLAMA_PULL_EXIT:-0}" ;;
  *"exec -T ollama ollama show"*) exit "${FAKE_OLLAMA_SHOW_EXIT:-0}" ;;
  *"exec -T ollama"*) exit 0 ;;
  *" pull"*) exit "${FAKE_PULL_EXIT:-0}" ;;
  *" up "*) exit "${FAKE_UP_EXIT:-0}" ;;
esac
exit 0
EOF
cat > "$fakebin/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >> "$FAKE_LOG"
case "$*" in *"%{http_code}"*) printf 200 ;; esac
exit 0
EOF
chmod +x "$fakebin/docker" "$fakebin/curl"

run() { # run <home> [args...] — env passed by caller
  local home="$1"; shift
  PATH="$fakebin:$PATH" FAKE_LOG="$home.log" NEXORA_HOME="$home" NEXORA_BIN_DIR="$home-bin" \
    NEXORA_BUNDLE="$REPO" bash "$SCRIPT" "$@" < /dev/null > "$home.out" 2>&1
}

# 1. Unattended install with Mistral, no start.
h="$(new_home)/nexora"
NEXORA_ORGANIZATION_NAME="Société Test" NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr \
  NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=sk-test run "$h" --yes --no-start \
  && ok "unattended install succeeds" || { ko "unattended install succeeds"; cat "$h.out"; }
e="$h/deploy/.env"
[ "$(stat -c %a "$e" 2>/dev/null)" = "600" ] && ok ".env is private" || ko ".env is private"
[ "$(envval NEXORA_ORGANIZATION_NAME "$e")" = "Société Test" ] && ok "organization name" || ko "organization name"
[ "$(envval NEXORA_ORGANIZATION_OWNER_EMAIL "$e")" = "gerant@pme-test.fr" ] && ok "owner email" || ko "owner email"
[ "$(envval NEXORA_ALLOWED_EMAIL_DOMAINS "$e")" = "pme-test.fr" ] && ok "sign-up restricted to the owner's domain" || ko "sign-up restricted to the owner's domain"
[ "$(envval NEXORA_UPSTREAM_URL "$e")" = "https://api.mistral.ai" ] && ok "Mistral URL" || ko "Mistral URL"
[ "$(envval NEXORA_UPSTREAM_MODEL "$e")" = "mistral-small-latest" ] && ok "Mistral model" || ko "Mistral model"
[ "$(envval NEXORA_UPSTREAM_KEY "$e")" = "sk-test" ] && ok "Mistral key" || ko "Mistral key"
[ "$(envval NEXORA_IMAGE_PREFIX "$e")" = "ghcr.io/leon36000/nexora-" ] && ok "published images" || ko "published images"
[ "$(envval NEXORA_VERSION "$e")" = "latest" ] && ok "latest version" || ko "latest version"
[ -z "$(envval COMPOSE_PROFILES "$e")" ] && ok "no local model service" || ko "no local model service"
[ "$(envval BETTER_AUTH_SECRET "$e" | wc -c)" -ge 33 ] && ok "secrets generated" || ko "secrets generated"
[ -x "$h-bin/nexora" ] && ok "nexora command installed" || ko "nexora command installed"

# HTTPS with a domain: public addresses in https, Caddy profile on, certificate choice kept.
hs="$(new_home)/nexora"
NEXORA_ORGANIZATION_NAME="PME" NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral \
  NEXORA_UPSTREAM_KEY=sk-test NEXORA_DOMAIN=nexora.pme-test.fr NEXORA_TLS=internal run "$hs" --yes --no-start \
  && ok "install with a domain" || { ko "install with a domain"; cat "$hs.out"; }
es="$hs/deploy/.env"
[ "$(envval NEXORA_PUBLIC_URL "$es")" = "https://nexora.pme-test.fr" ] && ok "public address in https" || ko "public address in https"
[ "$(envval NEXORA_PUBLIC_REALTIME_URL "$es")" = "https://nexora.pme-test.fr" ] && ok "realtime through the same domain" || ko "realtime through the same domain"
[ "$(envval NEXORA_CONNECT_PUBLIC_URL "$es")" = "https://connect.nexora.pme-test.fr" ] && ok "Connect on its subdomain" || ko "Connect on its subdomain"
case ",$(envval COMPOSE_PROFILES "$es")," in *",https,"*) ok "HTTPS profile on" ;; *) ko "HTTPS profile on" ;; esac
[ "$(envval NEXORA_TLS "$es")" = "internal" ] && ok "certificate choice kept" || ko "certificate choice kept"
[ -f "$hs/deploy/caddy/Caddyfile" ] && ok "Caddyfile shipped" || ko "Caddyfile shipped"
PATH="$fakebin:$PATH" FAKE_LOG="$h.cli.log" "$h-bin/nexora" status > /dev/null 2>&1
grep -q "compose -p .* ps" "$h.cli.log" 2>/dev/null && ok "nexora runs the shipped command" || ko "nexora runs the shipped command"
PATH="$fakebin:$PATH" "$h-bin/nexora" help 2>&1 | grep -q "backup" && ok "nexora offers backup and restore" || ko "nexora offers backup and restore"
grep -q "=change-me$" "$e" && ko "no placeholder left" || ok "no placeholder left"
[ -f "$h/deploy/compose.yml" ] && [ -f "$h/scripts/smoke.py" ] && ok "deployment bundle copied" || ko "deployment bundle copied"
[ ! -d "$h/workstudio" ] && ok "sources not copied when images are published" || ko "sources not copied when images are published"
[ -x "$h-bin/nexora" ] && grep -q "$h" "$h-bin/nexora" && ok "nexora command installed" || ko "nexora command installed"
grep -q "sk-test" "$h.out" && ko "key not printed" || ok "key not printed"
grep -q " up " "$h.log" 2>/dev/null && ko "--no-start starts nothing" || ok "--no-start starts nothing"

# 1b. Web search stays off unless asked: queries would leave the instance.
[ "$(envval NEXORA_WEB_SEARCH "$e")" = "0" ] && [ -z "$(envval NEXORA_SEARXNG_URL "$e")" ] && ok "web search off by default" || ko "web search off by default"
hs="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  NEXORA_WEB_SEARCH=1 run "$hs" --yes --no-start && ok "install with web search succeeds" || { ko "install with web search succeeds"; cat "$hs.out"; }
es="$hs/deploy/.env"
[ "$(envval COMPOSE_PROFILES "$es")" = "search" ] && ok "web search service enabled" || ko "web search service enabled"
[ "$(envval NEXORA_SEARXNG_URL "$es")" = "http://searxng:8080" ] && ok "WorkStudio points at SearXNG" || ko "WorkStudio points at SearXNG"
[ "$(envval NEXORA_PREVIEW_BLOCKS "$es")" = "searxng" ] && ok "Web Search block revealed" || ko "Web Search block revealed"
[ "$(envval NEXORA_SEARXNG_SECRET "$es" | wc -c)" -ge 33 ] && ok "SearXNG secret generated" || ko "SearXNG secret generated"

# 1b'. Local transcription stays off unless asked; on, its profile joins the others.
[ -z "$(envval NEXORA_WHISPER_URL "$e")" ] && ok "local transcription off by default" || ko "local transcription off by default"
hv="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  NEXORA_WEB_SEARCH=1 NEXORA_VOICE=1 run "$hv" --yes --no-start && ok "install with local transcription succeeds" || { ko "install with local transcription succeeds"; cat "$hv.out"; }
ev="$hv/deploy/.env"
[ "$(envval COMPOSE_PROFILES "$ev")" = "search,voice" ] && ok "transcription profile added to web search" || ko "transcription profile added to web search (got: $(envval COMPOSE_PROFILES "$ev"))"
[ "$(envval NEXORA_WHISPER_URL "$ev")" = "http://whisper:8000" ] && ok "the bootstrap registers the transcription service" || ko "the bootstrap registers the transcription service"
[ "$(envval NEXORA_WHISPER_THREADS "$ev")" -ge 1 ] 2> /dev/null && ok "transcription threads capped" || ko "transcription threads capped"
# Answered « non » when installing again (configuration removed first): no transcription service left.
rm -f "$ev"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  NEXORA_WEB_SEARCH=1 NEXORA_VOICE=0 run "$hv" --yes --no-start
case ",$(envval COMPOSE_PROFILES "$ev")," in *,voice,*) ko "transcription profile removed when answered no" ;; *) ok "transcription profile removed when answered no" ;; esac
[ -z "$(envval NEXORA_WHISPER_URL "$ev")" ] && ok "the bootstrap no longer registers the transcription service" || ko "the bootstrap no longer registers the transcription service"

# 1c. Outgoing email by SMTP, given as environment values in unattended mode.
hm="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  NEXORA_SMTP_HOST=smtp.pme-test.fr NEXORA_SMTP_PORT=587 NEXORA_SMTP_USER=robot NEXORA_SMTP_PASS=secret NEXORA_EMAIL_FROM=nexora@pme-test.fr \
  run "$hm" --yes --no-start
em="$hm/deploy/.env"
[ "$(envval NEXORA_SMTP_HOST "$em")" = "smtp.pme-test.fr" ] && [ "$(envval NEXORA_SMTP_PORT "$em")" = "587" ] && [ "$(envval NEXORA_EMAIL_FROM "$em")" = "nexora@pme-test.fr" ] && ok "SMTP settings recorded" || ko "SMTP settings recorded"
grep -q "secret" "$hm.out" && ko "SMTP password not printed" || ok "SMTP password not printed"
[ -z "$(envval NEXORA_SMTP_HOST "$e")" ] && ok "no SMTP by default" || ko "no SMTP by default"

# 2. A second run keeps the existing configuration and secrets.
before="$(sha256sum "$e")"
NEXORA_ORGANIZATION_NAME=Autre NEXORA_ORGANIZATION_OWNER_EMAIL=x@y.fr run "$h" --yes --no-start
[ "$before" = "$(sha256sum "$e")" ] && ok "re-run keeps deploy/.env" || ko "re-run keeps deploy/.env"

# 3. The owner email is required.
h2="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL= run "$h2" --yes --no-start && ko "owner email required" || ok "owner email required"
[ ! -e "$h2/deploy/.env" ] && ok "nothing configured without an owner" || ko "nothing configured without an owner"

# 4. Local model: the Ollama service, port override, start with published images.
h3="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=local NEXORA_WORKSTUDIO_PORT=3300 \
  NEXORA_HEALTH_TIMEOUT=5 run "$h3" --yes && ok "install with start succeeds" || { ko "install with start succeeds"; cat "$h3.out"; }
e3="$h3/deploy/.env"
[ -z "$(envval COMPOSE_PROFILES "$e3")" ] && ok "Ollama is no longer an optional profile" || ko "Ollama is no longer an optional profile"
grep -q "ollama pull bge-m3" "$h3.log" && ok "downloads the embedding model" || ko "downloads the embedding model"
[ "$(envval NEXORA_UPSTREAM_URL "$e3")" = "http://ollama:11434" ] && ok "local model URL" || ko "local model URL"
[ -n "$(envval NEXORA_UPSTREAM_MODEL "$e3")" ] && ok "local model chosen" || ko "local model chosen"
[ "$(envval NEXORA_WORKSTUDIO_PORT "$e3")" = "3300" ] && ok "port override" || ko "port override"
[ "$(envval NEXORA_PUBLIC_URL "$e3")" = "http://localhost:3300" ] && ok "public URL follows the port" || ko "public URL follows the port"
grep -q "compose .* pull" "$h3.log" && ok "pulls published images" || ko "pulls published images"
grep -q "compose .* up -d" "$h3.log" && ! grep -q -- "--build" "$h3.log" && ok "starts without building" || ko "starts without building"
grep -q "ollama pull" "$h3.log" && ok "downloads the local model" || ko "downloads the local model"
grep -q "num_thread" "$h3.log" && grep -q "ollama create" "$h3.log" && ok "caps the model threads so a busy machine stays fast" || ko "caps the model threads so a busy machine stays fast"
first_up="$(grep -n "compose .* up -d" "$h3.log" | head -1)"; model_pull="$(grep -n "ollama pull" "$h3.log" | head -1 | cut -d: -f1)"
case "$first_up" in *"up -d --wait ollama"*) ok "starts the model server first" ;; *) ko "starts the model server first ($first_up)" ;; esac
last_up="$(grep -n "compose .* up -d$" "$h3.log" | tail -1 | cut -d: -f1)"
[ -n "$model_pull" ] && [ -n "$last_up" ] && [ "$model_pull" -lt "$last_up" ] && ok "model ready before Nexora API starts" || ko "model ready before Nexora API starts"
grep -q "localhost:3300" "$h3.out" && ok "prints the address" || ko "prints the address"

# 5. No published images: falls back to building from the sources.
h4="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  FAKE_PULL_EXIT=1 NEXORA_HEALTH_TIMEOUT=5 run "$h4" --yes && ok "fallback install succeeds" || { ko "fallback install succeeds"; cat "$h4.out"; }
grep -q -- "up -d --build" "$h4.log" && ok "builds from the sources" || ko "builds from the sources"
grep -q "up -d --build --wait ollama" "$h4.log" && grep -q "ollama pull bge-m3" "$h4.log" && ok "Ollama and the embedding model come with any model choice" || ko "Ollama and the embedding model come with any model choice"
grep -q "ollama pull mistral" "$h4.log" && ko "a remote chat model is not pulled into Ollama" || ok "a remote chat model is not pulled into Ollama"
[ "$(envval NEXORA_IMAGE_PREFIX "$h4/deploy/.env")" = "nexora/" ] && ok "switches to local images" || ko "switches to local images"
[ -d "$h4/workstudio" ] && [ -d "$h4/services/nexora-api" ] && ok "sources fetched for the build" || ko "sources fetched for the build"

# 5b. No registry but the images are already on the machine (docker load): no build.
h6="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  FAKE_PULL_EXIT=1 FAKE_LOCAL_EXIT=0 NEXORA_HEALTH_TIMEOUT=5 run "$h6" --yes && ok "offline install succeeds" || { ko "offline install succeeds"; cat "$h6.out"; }
grep -q -- "--build" "$h6.log" && ko "offline install builds nothing" || ok "offline install builds nothing"
[ ! -d "$h6/workstudio" ] && ok "offline install fetches no sources" || ko "offline install fetches no sources"

# 5c. A service that fails to start is reported, not mistaken for missing images.
h7="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  FAKE_UP_EXIT=1 NEXORA_HEALTH_TIMEOUT=5 run "$h7" --yes && ko "failed start is an error" || ok "failed start is an error"
grep -q -- "--build" "$h7.log" && ko "failed start does not trigger a build" || ok "failed start does not trigger a build"
grep -q "nexora logs" "$h7.out" && ok "failed start points to the logs" || ko "failed start points to the logs"

# 5d. An install from v1 (COMPOSE_PROFILES=ollama in deploy/.env) updates cleanly.
sed -i 's/^COMPOSE_PROFILES=.*/COMPOSE_PROFILES=ollama/' "$e3"
: > "$h3.log"
NEXORA_HEALTH_TIMEOUT=5 run "$h3" --update && ok "v1 install updates" || { ko "v1 install updates"; cat "$h3.out"; }
grep -q "ollama pull bge-m3" "$h3.log" && grep -q "ollama pull $(envval NEXORA_UPSTREAM_MODEL "$e3")" "$h3.log" && ok "update pulls the embedding and local chat models" || ko "update pulls the embedding and local chat models"

# 5e. Offline update: the Ollama registry is unreachable but the models are already there.
NEXORA_HEALTH_TIMEOUT=5 FAKE_OLLAMA_PULL_EXIT=1 run "$h3" --update && ok "offline update keeps the downloaded models" || { ko "offline update keeps the downloaded models"; cat "$h3.out"; }
NEXORA_HEALTH_TIMEOUT=5 FAKE_OLLAMA_PULL_EXIT=1 FAKE_OLLAMA_SHOW_EXIT=1 run "$h3" --update && ko "a missing model without network is an error" || ok "a missing model without network is an error"

# 5e'. An update whose new images cannot be downloaded fails (nexora update then puts the previous
# version back) instead of running the old images under the new package files.
: > "$h3.log"
NEXORA_HEALTH_TIMEOUT=5 FAKE_PULL_EXIT=1 FAKE_LOCAL_EXIT=0 run "$h3" --update && ko "update without new images fails" || ok "update without new images fails"
grep -q " up " "$h3.log" && ko "nothing started with the old images" || ok "nothing started with the old images"
grep -qi "images" "$h3.out" && ok "says the new images are missing" || ko "says the new images are missing ($(tail -1 "$h3.out"))"

# 5e''. A from-source install rebuilds from refreshed sources at each update.
hb="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY=k \
  NEXORA_HEALTH_TIMEOUT=5 run "$hb" --yes --from-source && ok "from-source install" || { ko "from-source install"; cat "$hb.out"; }
: > "$hb/workstudio/fichier-perime.txt"; : > "$hb.log"
NEXORA_HEALTH_TIMEOUT=5 run "$hb" --update && ok "from-source update" || { ko "from-source update"; cat "$hb.out"; }
[ ! -e "$hb/workstudio/fichier-perime.txt" ] && [ -d "$hb/workstudio" ] && ok "sources refreshed before building" || ko "sources refreshed before building"
grep -q -- "up -d --build" "$hb.log" && ok "update rebuilds the images" || ko "update rebuilds the images"

# 5f. Values with $ or # (SMTP password, API key) reach Docker Compose unchanged.
hq="$(new_home)/nexora"
NEXORA_ORGANIZATION_OWNER_EMAIL=gerant@pme-test.fr NEXORA_MODEL_CHOICE=mistral NEXORA_UPSTREAM_KEY='k$ey #1' \
  NEXORA_SMTP_HOST=smtp.pme-test.fr NEXORA_SMTP_PASS='p@ss$word #2' run "$hq" --yes --no-start
eq="$hq/deploy/.env"
quoted() { (set -a; . "$eq" >/dev/null 2>&1; printf '%s' "${!1}"); }
[ "$(quoted NEXORA_SMTP_PASS)" = 'p@ss$word #2' ] && ok "SMTP password kept intact" || ko "SMTP password kept intact (got: $(quoted NEXORA_SMTP_PASS))"
[ "$(quoted NEXORA_UPSTREAM_KEY)" = 'k$ey #1' ] && ok "API key kept intact" || ko "API key kept intact (got: $(quoted NEXORA_UPSTREAM_KEY))"

# 6. Without Docker, the installer stops and says why.
h5="$(new_home)/nexora"; nodocker="$(new_home)"
for b in bash sh cat grep sed awk tr cut mkdir cp rm mv chmod mktemp dirname basename head tail uname df wc od openssl tar sort printf date env id; do
  p="$(command -v "$b" 2>/dev/null)" && ln -s "$p" "$nodocker/$b"
done
PATH="$nodocker" NEXORA_HOME="$h5" NEXORA_BUNDLE="$REPO" NEXORA_ORGANIZATION_OWNER_EMAIL=a@b.fr \
  "$nodocker/bash" "$SCRIPT" --yes < /dev/null > "$h5.out" 2>&1 && ko "fails without Docker" || ok "fails without Docker"
grep -q "Docker" "$h5.out" && ok "explains the missing Docker" || ko "explains the missing Docker"

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
