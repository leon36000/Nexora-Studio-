#!/usr/bin/env bash
# Nexora — installation en une commande :
#   curl -fsSL https://raw.githubusercontent.com/leon36000/Nexora-Studio-/main/install.sh | bash
#
# Vérifie Docker, télécharge le paquet de déploiement dans ~/nexora, pose quelques questions
# (organisation, votre adresse, modèle de langage), génère les secrets, démarre la plateforme
# avec les images publiées (repli : construction depuis les sources) et installe la commande
# `nexora` (start, stop, status, logs, update, smoke, uninstall).
#
# Options :
#   --yes          aucune question : valeurs lues dans l'environnement (NEXORA_ORGANIZATION_NAME,
#                  NEXORA_ORGANIZATION_OWNER_EMAIL, NEXORA_MODEL_CHOICE=local|mistral|openai,
#                  NEXORA_UPSTREAM_URL/MODEL/KEY, NEXORA_WORKSTUDIO_PORT, et toute clé de deploy/.env)
#   --from-source  construit les images sur cette machine au lieu de les télécharger
#   --no-start     prépare tout sans démarrer
#   --update       met à jour une installation existante (configuration conservée)
# Variables : NEXORA_HOME (~/nexora), NEXORA_PROJECT (nexora), NEXORA_REPO, NEXORA_REF (main),
#   NEXORA_BIN_DIR (~/.local/bin), NEXORA_BUNDLE (copie locale du dépôt, au lieu de GitHub).
set -euo pipefail

NEXORA_REPO="${NEXORA_REPO:-leon36000/Nexora-Studio-}"
NEXORA_REF="${NEXORA_REF:-main}"
NEXORA_HOME="${NEXORA_HOME:-$HOME/nexora}"
NEXORA_PROJECT="${NEXORA_PROJECT:-nexora}"
NEXORA_BIN_DIR="${NEXORA_BIN_DIR:-$HOME/.local/bin}"
NEXORA_BUNDLE="${NEXORA_BUNDLE:-}"
NEXORA_HEALTH_TIMEOUT="${NEXORA_HEALTH_TIMEOUT:-900}"
OWNER_LC="$(printf '%s' "${NEXORA_REPO%%/*}" | tr '[:upper:]' '[:lower:]')"
PUBLISHED_PREFIX="${NEXORA_PUBLISHED_PREFIX:-ghcr.io/$OWNER_LC/nexora-}"
RAW_URL="https://raw.githubusercontent.com/$NEXORA_REPO/$NEXORA_REF"
ENV_FILE="$NEXORA_HOME/deploy/.env"

# Deployment bundle: everything compose.yml mounts or the CLI runs, nothing else.
BUNDLE_FILES=(
  deploy/compose.yml
  deploy/.env.example
  deploy/nexora-api/config.yml
  deploy/postgres/init/01-nexora-api.sql
  deploy/bootstrap/bootstrap.py
  deploy/searxng/settings.yml
  scripts/init-env.sh
  scripts/smoke.sh
  scripts/smoke.py
)
WEBMAIL_DOMAINS=" gmail.com googlemail.com outlook.com outlook.fr hotmail.com hotmail.fr live.com live.fr yahoo.com yahoo.fr icloud.com me.com orange.fr wanadoo.fr free.fr sfr.fr laposte.net bbox.fr proton.me protonmail.com gmx.fr gmx.com "

YES=0 FROM_SOURCE=0 START=1 UPDATE=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=1 ;;
    --from-source) FROM_SOURCE=1 ;;
    --no-start) START=0 ;;
    --update) UPDATE=1 ;;
    -h|--help) sed -n '2,20p' "$0" 2>/dev/null | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Option inconnue : $arg (voir --help)" >&2; exit 2 ;;
  esac
done

if [ -t 1 ]; then B=$'\033[1m' G=$'\033[32m' Y=$'\033[33m' R=$'\033[31m' N=$'\033[0m'; else B='' G='' Y='' R='' N=''; fi
step() { printf '\n%s==> %s%s\n' "$B" "$*" "$N"; }
info() { printf '    %s\n' "$*"; }
warn() { printf '%s    ! %s%s\n' "$Y" "$*" "$N" >&2; }
die() { printf '%s    ✗ %s%s\n' "$R" "$*" "$N" >&2; exit 1; }

# Questions are read from the terminal even when the script itself arrives through a pipe.
if [ "$YES" -eq 0 ] && [ "$UPDATE" -eq 0 ] && ! { [ -r /dev/tty ] && (: < /dev/tty) 2>/dev/null; }; then
  YES=1
  warn "Pas de terminal : installation sans questions (valeurs lues dans l'environnement)."
fi

ask() { # ask <variable> <question> <default> [secret]
  local __var="$1" __question="$2" __default="$3" __secret="${4:-}" __answer=""
  if [ "$YES" -eq 1 ]; then printf -v "$__var" '%s' "$__default"; return; fi
  if [ -n "$__default" ] && [ -z "$__secret" ]; then __question="$__question [$__default]"; fi
  if [ -n "$__secret" ]; then
    read -r -s -p "    $__question : " __answer < /dev/tty; echo > /dev/tty
  else
    read -r -p "    $__question : " __answer < /dev/tty
  fi
  printf -v "$__var" '%s' "${__answer:-$__default}"
}

set_env() { # set_env KEY VALUE — replaces or appends one line of deploy/.env, keeping it private
  case "$2" in *$'\n'*) die "Valeur sur plusieurs lignes refusée pour $1." ;; esac
  local tmp; tmp="$(mktemp "$ENV_FILE.XXXXXX")"
  KEY="$1" VAL="$2" awk 'BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VAL"]; done = 0 }
    index($0, k "=") == 1 { if (!done) print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }' "$ENV_FILE" > "$tmp"
  cat "$tmp" > "$ENV_FILE"; rm -f "$tmp"
}
get_env() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true; }

compose() { docker compose -p "$NEXORA_PROJECT" -f "$NEXORA_HOME/deploy/compose.yml" --env-file "$ENV_FILE" "$@"; }

preflight() {
  step "Vérification de la machine"
  case "$(uname -s)" in Linux|Darwin) ;; *) die "Système non pris en charge : $(uname -s). Utilisez Linux ou macOS." ;; esac
  case "$(uname -m)" in x86_64|amd64|aarch64|arm64) info "Système : $(uname -s) $(uname -m)" ;; *) die "Processeur non pris en charge : $(uname -m)." ;; esac
  command -v docker > /dev/null 2>&1 || die "Docker est introuvable. Installez Docker (https://docs.docker.com/engine/install/) puis relancez cette commande."
  docker compose version > /dev/null 2>&1 || die "Docker Compose v2 est introuvable (commande « docker compose »). Mettez Docker à jour."
  if ! docker info > /dev/null 2>&1; then
    die "Docker ne répond pas, ou votre compte n'a pas le droit de l'utiliser. Démarrez Docker ; sous Linux : sudo usermod -aG docker \$USER, puis reconnectez-vous."
  fi
  info "Docker : $(docker compose version 2>/dev/null | head -1)"
  command -v openssl > /dev/null 2>&1 || die "openssl est introuvable (nécessaire pour générer les secrets)."
  [ -n "$NEXORA_BUNDLE" ] || command -v curl > /dev/null 2>&1 || die "curl est introuvable."
  mkdir -p "$NEXORA_HOME"
  local free_kb; free_kb="$(df -Pk "$NEXORA_HOME" 2>/dev/null | awk 'NR == 2 { print $4 }')"
  if [ -n "$free_kb" ] && [ "$free_kb" -lt $((10 * 1024 * 1024)) ]; then
    warn "Moins de 10 Go libres sur le disque de $NEXORA_HOME : les images et le modèle peuvent ne pas tenir."
  fi
}

fetch_bundle() {
  step "Paquet de déploiement → $NEXORA_HOME"
  local f
  for f in "${BUNDLE_FILES[@]}"; do
    mkdir -p "$NEXORA_HOME/$(dirname "$f")"
    if [ -n "$NEXORA_BUNDLE" ]; then
      cp "$NEXORA_BUNDLE/$f" "$NEXORA_HOME/$f"
    else
      curl -fsSL "$RAW_URL/$f" -o "$NEXORA_HOME/$f" || die "Téléchargement impossible : $RAW_URL/$f"
    fi
  done
  chmod +x "$NEXORA_HOME/scripts/"*.sh
  info "Source : ${NEXORA_BUNDLE:-github.com/$NEXORA_REPO ($NEXORA_REF)}"
}

fetch_sources() {
  step "Sources de Nexora (construction locale des images)"
  if [ -n "$NEXORA_BUNDLE" ] && git -C "$NEXORA_BUNDLE" rev-parse --git-dir > /dev/null 2>&1; then
    git -C "$NEXORA_BUNDLE" archive HEAD workstudio services | tar -x -C "$NEXORA_HOME"
  elif [ -n "$NEXORA_BUNDLE" ]; then
    cp -R "$NEXORA_BUNDLE/workstudio" "$NEXORA_BUNDLE/services" "$NEXORA_HOME/"
  else
    local tmp; tmp="$(mktemp -d)"
    curl -fsSL "https://codeload.github.com/$NEXORA_REPO/tar.gz/$NEXORA_REF" | tar -xz -C "$tmp" \
      || { rm -rf "$tmp"; die "Téléchargement des sources impossible."; }
    rm -rf "$NEXORA_HOME/workstudio" "$NEXORA_HOME/services"
    mv "$tmp"/*/workstudio "$tmp"/*/services "$NEXORA_HOME/"
    rm -rf "$tmp"
  fi
  info "Sources prêtes. La construction prend de 10 à 20 minutes."
}

default_local_model() {
  local kb=0
  if [ -r /proc/meminfo ]; then kb="$(awk '/^MemTotal:/ { print $2 }' /proc/meminfo)"
  elif command -v sysctl > /dev/null 2>&1; then kb="$(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1024 ))"; fi
  if [ "${kb:-0}" -ge $((16 * 1024 * 1024)) ]; then echo "qwen2.5:7b"; else echo "qwen2.5:3b"; fi
}

configure() {
  step "Configuration"
  NEXORA_ROOT="$NEXORA_HOME" bash "$NEXORA_HOME/scripts/init-env.sh" > /dev/null
  # Any key of deploy/.env already set in the environment wins over the template.
  local key
  for key in $(grep -oE '^[A-Z0-9_]+' "$ENV_FILE"); do
    if [ -n "${!key+x}" ]; then set_env "$key" "${!key}"; fi
  done

  local org email domains port choice url model key
  ask org "Nom de votre organisation" "${NEXORA_ORGANIZATION_NAME:-Mon entreprise}"
  ask email "Votre adresse e-mail (vous serez propriétaire)" "${NEXORA_ORGANIZATION_OWNER_EMAIL:-}"
  case "$email" in
    *@*.*) ;;
    *) rm -f "$ENV_FILE"; die "Adresse du propriétaire manquante ou invalide (NEXORA_ORGANIZATION_OWNER_EMAIL)." ;;
  esac
  local domain="${email##*@}"
  case "$WEBMAIL_DOMAINS" in *" $domain "*) domain="" ;; esac
  ask domains "Domaines e-mail autorisés à s'inscrire (vide = tout le monde)" "${NEXORA_ALLOWED_EMAIL_DOMAINS-$domain}"
  ask port "Port de Nexora WorkStudio" "${NEXORA_WORKSTUDIO_PORT:-$(get_env NEXORA_WORKSTUDIO_PORT)}"

  if [ "$YES" -eq 0 ]; then
    info ""
    info "Modèle de langage :"
    info "  1) Modèle local, installé avec Nexora (Ollama, sur cette machine, gratuit)"
    info "  2) Mistral AI (La Plateforme, clé API)"
    info "  3) Autre service compatible OpenAI (vLLM, Ollama existant, LiteLLM…)"
  fi
  ask choice "Votre choix (1, 2 ou 3)" "${NEXORA_MODEL_CHOICE:-local}"
  case "$choice" in
    1|local)
      ask model "Modèle Ollama" "${NEXORA_UPSTREAM_MODEL:-$(default_local_model)}"
      url="http://ollama:11434" key="none"
      set_env COMPOSE_PROFILES "" ;;
    2|mistral)
      ask model "Modèle Mistral" "${NEXORA_UPSTREAM_MODEL:-mistral-small-latest}"
      ask key "Clé API Mistral" "${NEXORA_UPSTREAM_KEY:-}" secret
      [ -n "$key" ] || { rm -f "$ENV_FILE"; die "Clé API Mistral manquante (NEXORA_UPSTREAM_KEY)."; }
      url="https://api.mistral.ai"
      set_env COMPOSE_PROFILES "" ;;
    3|openai)
      ask url "Adresse du service (sans /v1)" "${NEXORA_UPSTREAM_URL:-}"
      ask model "Nom du modèle" "${NEXORA_UPSTREAM_MODEL:-}"
      ask key "Clé API (vide si aucune)" "${NEXORA_UPSTREAM_KEY:-}" secret
      [ -n "$url" ] && [ -n "$model" ] || { rm -f "$ENV_FILE"; die "Adresse et modèle du service requis (NEXORA_UPSTREAM_URL, NEXORA_UPSTREAM_MODEL)."; }
      key="${key:-none}"
      set_env COMPOSE_PROFILES "" ;;
    *) rm -f "$ENV_FILE"; die "Choix de modèle inconnu : $choice" ;;
  esac

  if [ "$YES" -eq 0 ]; then
    local smtp_host smtp_port smtp_user smtp_pass mail_from
    ask smtp_host "Serveur d'e-mail SMTP pour les invitations (vide = aucun)" "${NEXORA_SMTP_HOST:-}"
    if [ -n "$smtp_host" ]; then
      ask smtp_port "Port SMTP" "${NEXORA_SMTP_PORT:-587}"
      ask smtp_user "Utilisateur SMTP" "${NEXORA_SMTP_USER:-}"
      ask smtp_pass "Mot de passe SMTP" "${NEXORA_SMTP_PASS:-}" secret
      ask mail_from "Adresse d'expédition" "${NEXORA_EMAIL_FROM:-nexora@${email##*@}}"
      set_env NEXORA_SMTP_HOST "$smtp_host"; set_env NEXORA_SMTP_PORT "$smtp_port"
      set_env NEXORA_SMTP_USER "$smtp_user"; set_env NEXORA_SMTP_PASS "$smtp_pass"
      set_env NEXORA_EMAIL_FROM "$mail_from"
    fi
  fi

  local web
  ask web "Activer la recherche web ? Vos requêtes partiront vers des moteurs publics (o/N)" "${NEXORA_WEB_SEARCH:-0}"
  case "$web" in
    1|o|O|oui|y|yes)
      set_env NEXORA_WEB_SEARCH 1
      set_env NEXORA_SEARXNG_URL "http://searxng:8080"
      set_env COMPOSE_PROFILES search ;;
    *)
      set_env NEXORA_WEB_SEARCH 0
      set_env NEXORA_SEARXNG_URL "" ;;
  esac

  set_env NEXORA_ORGANIZATION_NAME "$org"
  set_env NEXORA_ORGANIZATION_OWNER_EMAIL "$email"
  set_env NEXORA_ALLOWED_EMAIL_DOMAINS "$domains"
  set_env NEXORA_WORKSTUDIO_PORT "$port"
  if [ -z "${NEXORA_PUBLIC_URL+x}" ]; then set_env NEXORA_PUBLIC_URL "http://localhost:$port"; fi
  set_env NEXORA_UPSTREAM_URL "$url"
  set_env NEXORA_UPSTREAM_MODEL "$model"
  set_env NEXORA_UPSTREAM_KEY "$key"
  if [ "$FROM_SOURCE" -eq 1 ]; then
    set_env NEXORA_IMAGE_PREFIX "nexora/"; set_env NEXORA_VERSION "local"
  else
    set_env NEXORA_IMAGE_PREFIX "${NEXORA_IMAGE_PREFIX:-$PUBLISHED_PREFIX}"
    set_env NEXORA_VERSION "${NEXORA_VERSION:-latest}"
  fi
  info "Configuration écrite dans $ENV_FILE (lisible par vous seul)."
}

install_cli() {
  mkdir -p "$NEXORA_BIN_DIR"
  local cli="$NEXORA_BIN_DIR/nexora"
  {
    echo '#!/usr/bin/env bash'
    echo "# nexora — pilote l'installation de Nexora (écrit par install.sh)."
    echo 'set -euo pipefail'
    printf 'NEXORA_HOME=%q\nNEXORA_PROJECT=%q\nNEXORA_REPO=%q\nNEXORA_REF=%q\nNEXORA_BUNDLE=%q\n' \
      "$NEXORA_HOME" "$NEXORA_PROJECT" "$NEXORA_REPO" "$NEXORA_REF" "$NEXORA_BUNDLE"
    cat <<'CLI'
ENV_FILE="$NEXORA_HOME/deploy/.env"
compose() { docker compose -p "$NEXORA_PROJECT" -f "$NEXORA_HOME/deploy/compose.yml" --env-file "$ENV_FILE" "$@"; }
url() { grep -E '^NEXORA_PUBLIC_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2-; }
case "${1:-help}" in
  start) compose up -d ;;
  stop) compose stop ;;
  restart) compose restart ;;
  status) compose ps ;;
  logs) shift; compose logs -f --tail=200 "$@" ;;
  url) url ;;
  open) command -v xdg-open > /dev/null && xdg-open "$(url)" || open "$(url)" ;;
  smoke) shift; "$NEXORA_HOME/scripts/smoke.sh" "$(url)" "$@" ;;
  update)
    if [ -n "$NEXORA_BUNDLE" ]; then
      NEXORA_HOME="$NEXORA_HOME" NEXORA_PROJECT="$NEXORA_PROJECT" NEXORA_BUNDLE="$NEXORA_BUNDLE" bash "$NEXORA_BUNDLE/install.sh" --update
    else
      curl -fsSL "https://raw.githubusercontent.com/$NEXORA_REPO/$NEXORA_REF/install.sh" \
        | NEXORA_HOME="$NEXORA_HOME" NEXORA_PROJECT="$NEXORA_PROJECT" NEXORA_REPO="$NEXORA_REPO" NEXORA_REF="$NEXORA_REF" bash -s -- --update
    fi ;;
  uninstall)
    purge=0; [ "${2:-}" = "--purge" ] && purge=1
    if [ "$purge" -eq 1 ]; then
      echo "Supprime Nexora ET toutes ses données (comptes, workflows, base, secrets) dans $NEXORA_HOME."
      read -r -p "Tapez « supprimer » pour confirmer : " answer
      [ "$answer" = "supprimer" ] || { echo "Annulé."; exit 1; }
      compose --profile ollama down -v --remove-orphans
      rm -rf "$NEXORA_HOME"
    else
      compose --profile ollama down --remove-orphans
      echo "Services arrêtés et supprimés. Données et configuration conservées dans $NEXORA_HOME (nexora uninstall --purge pour tout effacer)."
    fi
    rm -f "$0" ;;
  *)
    echo "Usage : nexora start|stop|restart|status|logs [service]|url|open|smoke|update|uninstall [--purge]" ;;
esac
CLI
  } > "$cli"
  chmod 755 "$cli"
  info "Commande installée : $cli"
  case ":$PATH:" in *":$NEXORA_BIN_DIR:"*) ;; *) warn "Ajoutez $NEXORA_BIN_DIR à votre PATH pour utiliser « nexora »." ;; esac
}

pull_ollama_model() { # pull_ollama_model <model> — downloads once, caps threads
  local model="${1:-bge-m3}"
  step "Préparation du modèle local $model (téléchargement la première fois)"
  compose exec -T ollama ollama pull "$model" || die "Téléchargement du modèle $model impossible. Vérifiez la connexion, puis relancez « nexora update »."
  # llama.cpp starts one thread per core and collapses (x100 slower) when other programs take
  # cores; half the cores keeps nearly all the speed of a dedicated machine.
  local cores threads
  cores="$(getconf _NPROCESSORS_ONLN 2> /dev/null || echo 4)"
  threads="${NEXORA_OLLAMA_THREADS:-$(( cores > 1 ? cores / 2 : 1 ))}"
  case "$model$threads" in *[!A-Za-z0-9._:/-]*) die "Nom de modèle ou nombre de threads invalide." ;; esac
  compose exec -T ollama sh -c "printf 'FROM $model\\nPARAMETER num_thread $threads\\n' > /tmp/Modelfile && ollama create $model -f /tmp/Modelfile" > /dev/null \
    || warn "Réglage des threads du modèle impossible : il fonctionnera, plus lentement sur une machine chargée."
  info "Modèle $model prêt ($threads threads)."
}

images_present() { # every image of the configuration is already on this machine (docker load, cache)
  local images img
  images="$(compose config --images 2> /dev/null)" || return 1
  [ -n "$images" ] || return 1
  for img in $images; do docker image inspect "$img" > /dev/null 2>&1 || return 1; done
}

start_failed() { die "Le démarrage a échoué. Consultez « nexora logs » (ou « nexora logs <service> »), corrigez, puis relancez « nexora start »."; }

start() {
  step "Démarrage de Nexora"
  local up=(up -d)
  if [ "$(get_env NEXORA_IMAGE_PREFIX)" = "nexora/" ]; then
    [ -d "$NEXORA_HOME/workstudio" ] || fetch_sources
    up+=(--build)
  elif compose pull; then
    :
  elif images_present; then
    warn "Images publiées injoignables : utilisation des images déjà présentes sur cette machine."
    up+=(--pull never)
  else
    warn "Images publiées indisponibles : construction depuis les sources."
    fetch_sources
    set_env NEXORA_IMAGE_PREFIX "nexora/"; set_env NEXORA_VERSION "local"
    up+=(--build)
  fi

  # Ollama always runs: it serves the knowledge-base embeddings and, when chosen, the chat model.
  # Nexora API reads the model list when it starts, so the models must be there first.
  compose "${up[@]}" --wait ollama || start_failed
  pull_ollama_model "$(get_env NEXORA_EMBED_MODEL)"
  if [ "$(get_env NEXORA_UPSTREAM_URL)" = "http://ollama:11434" ]; then
    pull_ollama_model "$(get_env NEXORA_UPSTREAM_MODEL)"
  fi
  compose "${up[@]}" || start_failed

  step "Attente de Nexora WorkStudio"
  local port waited=0 code
  port="$(get_env NEXORA_WORKSTUDIO_PORT)"
  while :; do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$port/login" || true)"
    [ "$code" = "200" ] && break
    [ "$waited" -ge "$NEXORA_HEALTH_TIMEOUT" ] && die "WorkStudio ne répond pas après ${waited} s. Consultez « nexora logs workstudio »."
    sleep 5; waited=$((waited + 5))
  done
}

main() {
  printf '%sNexora — installation%s\n' "$B" "$N"
  preflight
  fetch_bundle
  if [ "$UPDATE" -eq 1 ]; then
    [ -f "$ENV_FILE" ] || die "Aucune installation dans $NEXORA_HOME : lancez l'installation sans --update."
    info "Configuration existante conservée."
  elif [ -f "$ENV_FILE" ]; then
    info "Configuration existante conservée ($ENV_FILE)."
  else
    configure
  fi
  install_cli
  if [ "$START" -eq 0 ]; then
    step "Prêt"; info "Démarrez avec : nexora start"; exit 0
  fi
  start
  step "${G}Nexora est prêt${N}"
  info "Ouvrez $(get_env NEXORA_PUBLIC_URL) et créez votre compte avec $(get_env NEXORA_ORGANIZATION_OWNER_EMAIL)."
  info "Commandes : nexora status | logs | update | smoke | uninstall"
}

main
