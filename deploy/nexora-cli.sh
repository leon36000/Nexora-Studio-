#!/usr/bin/env bash
# nexora — pilote une installation de Nexora : démarrer, arrêter, suivre, vérifier, sauvegarder,
# restaurer, mettre à jour, passer en HTTPS. Installé par install.sh, qui le lance avec NEXORA_HOME,
# NEXORA_PROJECT, NEXORA_REPO, NEXORA_REF et NEXORA_BUNDLE.
set -euo pipefail
: "${NEXORA_HOME:?NEXORA_HOME manquant}" "${NEXORA_PROJECT:?NEXORA_PROJECT manquant}"
NEXORA_REPO="${NEXORA_REPO:-leon36000/Nexora-Studio-}"
NEXORA_REF="${NEXORA_REF:-main}"
NEXORA_BUNDLE="${NEXORA_BUNDLE:-}"
ENV_FILE="$NEXORA_HOME/deploy/.env"
BACKUP_DIR="${NEXORA_BACKUP_DIR:-$NEXORA_HOME/backups}"
# Work files (encrypted members, decrypted configuration, package copy) live in a private folder
# next to the backups: same disk as the space check, and never in a shared /tmp.
STAGE="$BACKUP_DIR/.en-cours"
# Backup, restore and update never run at the same time.
LOCK_FILE="$NEXORA_HOME/.nexora.lock"
# Data kept by a backup, besides the PostgreSQL databases; every member is encrypted.
DATA_VOLUMES=(connect-data workstudio-uploads)
SECRET_VOLUME=bootstrap
ARCHIVE_FORMAT=2
ARCHIVE_MEMBERS=(postgres.sql.gz.enc connect-data.tar.gz.enc workstudio-uploads.tar.gz.enc bootstrap.tar.gz.enc env.enc)
# A restored configuration without these keys would not open the restored data.
ENV_REQUIRED_KEYS=(POSTGRES_PASSWORD BETTER_AUTH_SECRET ENCRYPTION_KEY NEXORA_CONNECT_ENCRYPTION_KEY)
# Stopped during an update so that nothing is written after the backup (in this order).
MAINTENANCE_SERVICES=(cron workstudio workstudio-realtime)
CIPHER=(-aes-256-cbc -pbkdf2 -iter 200000)
# Scheduled backups read their passphrase here (0600, never in .env) and keep 7 days of archives.
PASSPHRASE_FILE="$NEXORA_HOME/deploy/.backup-passphrase"
BACKUP_RETENTION_DAYS=7
ROLLBACK_SUFFIX=nexora-avant-maj

TMP_DIRS=() PARTIAL_FILES=() RESUME_SERVICES=() LOCKED=0
cleanup() {
  local status=$?
  if [ "${#RESUME_SERVICES[@]}" -gt 0 ]; then
    echo "Redémarrage des services arrêtés (${RESUME_SERVICES[*]})…" >&2
    compose start "${RESUME_SERVICES[@]}" > /dev/null 2>&1 || echo "nexora : relancez Nexora avec « nexora start »." >&2
  fi
  rm -rf "${TMP_DIRS[@]+"${TMP_DIRS[@]}"}" "${PARTIAL_FILES[@]+"${PARTIAL_FILES[@]}"}"
  rmdir "$STAGE" 2> /dev/null || true
  if [ "$LOCKED" = mkdir ]; then rmdir "$LOCK_FILE.d" 2> /dev/null || true; fi
  exit "$status"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
new_tmp() { # new_tmp VAR — a private folder in the staging area, removed on exit (even on failure)
  mkdir -p "$STAGE"; chmod 700 "$BACKUP_DIR" "$STAGE"
  local d; d="$(mktemp -d "$STAGE/XXXXXX")"; chmod 700 "$d"
  TMP_DIRS+=("$d"); printf -v "$1" '%s' "$d"
}

compose() { docker compose -p "$NEXORA_PROJECT" -f "$NEXORA_HOME/deploy/compose.yml" --env-file "$ENV_FILE" "$@"; }
die() { echo "nexora : $*" >&2; exit 1; }
env_value() { { grep -E "^$1=" "$ENV_FILE" 2> /dev/null || true; } | tail -1 | cut -d= -f2- | sed "s/^'//; s/'\$//"; }
url() { env_value NEXORA_PUBLIC_URL; }

take_lock() {
  [ "$LOCKED" = 0 ] || return 0
  local busy="une autre opération Nexora (sauvegarde, restauration ou mise à jour) est en cours : réessayez quand elle sera terminée."
  if command -v flock > /dev/null; then
    exec 9> "$LOCK_FILE"
    flock -n 9 || die "$busy"
    LOCKED=flock
  else
    mkdir "$LOCK_FILE.d" 2> /dev/null || die "$busy (Si aucune ne tourne, supprimez $LOCK_FILE.d.)"
    LOCKED=mkdir
  fi
  # Under the lock, whatever is left in the staging area comes from an interrupted run.
  rm -rf "$STAGE" "$BACKUP_DIR"/.nexora-*.tar.partiel 2> /dev/null || true
}

# The address WorkStudio is published on (NEXORA_BIND_ADDRESS) when it is a concrete IP, else this machine.
local_host() {
  local a; a="$(env_value NEXORA_BIND_ADDRESS)"
  if [[ "$a" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] && [ "$a" != 0.0.0.0 ]; then echo "$a"
  elif [[ "$a" =~ ^[0-9a-fA-F:]*:[0-9a-fA-F:]*$ ]] && [ "$a" != "::" ]; then echo "[$a]"
  else echo 127.0.0.1; fi
}
workstudio_port() { local p; p="$(env_value NEXORA_WORKSTUDIO_PORT)"; echo "${p:-3000}"; }

# The account-based smoke test (operators): WorkStudio's local address, the public one as origin —
# behind HTTPS with an internal certificate the public address is not trusted from this machine.
smoke_run() {
  command -v python3 > /dev/null || die "python3 est nécessaire pour « nexora smoke » ; « nexora check » vérifie sans python3 ni compte."
  "$NEXORA_HOME/scripts/smoke.sh" "http://$(local_host):$(workstudio_port)" "$@" "--origin=$(url)"
}

# --- Account-free check (after an update or a restore, or on demand) -------------------------------
# Nothing is created: no account, no workspace. The model is called with WorkStudio's own key,
# inside its container, so the key is never printed nor passed on a command line of this machine.
API_PROBE='. /bootstrap/nexora-api.env 2> /dev/null || exit 3; printf "Authorization: Bearer %s\n" "$VLLM_API_KEY" | curl -s -o /dev/null -m 300 -w "%{http_code}" -H @- -H "Content-Type: application/json" -d "{\"model\":\"$NEXORA_DEFAULT_MODEL\",\"max_tokens\":1,\"messages\":[{\"role\":\"user\",\"content\":\"Bonjour\"}]}" "$VLLM_BASE_URL/chat/completions"'
http_get() { # http_get <url> — prints the body, then the status code on the last line
  curl -s -m 15 -H 'Accept-Language: fr-FR,fr;q=0.9' -w '\n%{http_code}' "$1" < /dev/null 2> /dev/null || true
}
probe_login() {
  local r; r="$(http_get "$CHECK_BASE/login")"
  [ "${r##*$'\n'}" = 200 ] || { echo "HTTP ${r##*$'\n'}"; return 1; }
  case "${r%$'\n'*}" in *'lang="fr"'*) ;; *) echo "page servie sans lang=\"fr\""; return 1 ;; esac
}
probe_health() {
  local r; r="$(http_get "$CHECK_BASE/api/health")"
  [ "${r##*$'\n'}" = 200 ] || { echo "HTTP ${r##*$'\n'}"; return 1; }
  case "${r%$'\n'*}" in *'"status":"ok"'*) ;; *) echo "réponse inattendue"; return 1 ;; esac
}
probe_migrations() {
  local s; s="$(compose ps -a --format '{{.State}} {{.ExitCode}}' workstudio-migrations < /dev/null 2> /dev/null | head -1 || true)"
  [ "$s" = "exited 0" ] || { echo "état : ${s:-conteneur absent}"; return 1; }
}
probe_api() {
  local c; c="$(compose exec -T workstudio sh -c "$API_PROBE" < /dev/null 2> /dev/null || true)"
  [ "$c" = 200 ] || { echo "HTTP ${c:-sans réponse}"; return 1; }
}
probe_connect() {
  local c; c="$(compose exec -T workstudio curl -s -o /dev/null -m 15 -w '%{http_code}' http://nexora-connect:3000/health < /dev/null 2> /dev/null || true)"
  [ "$c" = 200 ] || { echo "HTTP ${c:-sans réponse}"; return 1; }
}
probe_realtime() {
  local p r; p="$(env_value NEXORA_REALTIME_PORT)"; r="$(http_get "http://$(local_host):${p:-3002}/health")"
  [ "${r##*$'\n'}" = 200 ] || { echo "HTTP ${r##*$'\n'}"; return 1; }
}
check() {
  CHECK_BASE="http://$(local_host):$(workstudio_port)"
  local passed=0 total=0 detail name fn
  echo "Vérification de Nexora (sans compte) sur $CHECK_BASE…"
  while IFS='|' read -r fn name; do
    total=$((total + 1))
    if detail="$("$fn" 2>&1)"; then echo "[OK]     $name"; passed=$((passed + 1))
    else echo "[ÉCHEC]  $name — $detail"; fi
  done <<'EOF'
probe_login|Page de connexion en français
probe_health|État de WorkStudio (/api/health)
probe_migrations|Migrations de la base appliquées
probe_api|Nexora API répond (modèle par défaut, 1 jeton, clé de WorkStudio)
probe_connect|Nexora Connect (/health)
probe_realtime|Serveur temps réel (/health)
EOF
  echo "$passed/$total contrôles réussis."
  [ "$passed" -eq "$total" ]
}

# --- Encryption ------------------------------------------------------------------------------------
# The passphrase comes from NEXORA_BACKUP_PASSPHRASE or is typed (twice for a new backup).
ask_passphrase() {
  [ -n "${NEXORA_BACKUP_PASSPHRASE:-}" ] && return 0
  if [ "${AUTO_BACKUP:-0}" = 1 ] && [ -r "$PASSPHRASE_FILE" ]; then
    NEXORA_BACKUP_PASSPHRASE="$(cat "$PASSPHRASE_FILE")"; export NEXORA_BACKUP_PASSPHRASE; return 0
  fi
  [ -t 0 ] || die "phrase de passe requise : définissez NEXORA_BACKUP_PASSPHRASE ou lancez la commande dans un terminal."
  local first second
  read -rsp "Phrase de passe de la sauvegarde : " first; echo
  [ -n "$first" ] || die "phrase de passe vide."
  if [ "${1:-}" = confirm ]; then
    read -rsp "Confirmez la phrase de passe : " second; echo
    [ "$first" = "$second" ] || die "les deux phrases de passe diffèrent."
  fi
  export NEXORA_BACKUP_PASSPHRASE="$first"
}
encrypt_to() { openssl enc "${CIPHER[@]}" -salt -pass env:NEXORA_BACKUP_PASSPHRASE -out "$1"; } # stdin → file
decrypt_stream() { openssl enc -d "${CIPHER[@]}" -pass env:NEXORA_BACKUP_PASSPHRASE -in "$1" 2> /dev/null; } # file → stdout

# --- Volumes, services, disk -----------------------------------------------------------------------
# A container image already on this machine that has sh, tar and df: the PostgreSQL one.
helper_image() { compose config --images 2> /dev/null | grep -m1 -E 'pgvector|postgres'; }
volume_exists() { docker volume inspect "${NEXORA_PROJECT}_$1" > /dev/null 2>&1; }
volume_size() {
  docker run --rm --entrypoint sh -v "${NEXORA_PROJECT}_$1:/v:ro" "$IMAGE" -c 'du -sb /v' | cut -f1
}
archive_volume() { # archive_volume <volume> — tar.gz on stdout
  docker run --rm --entrypoint sh -v "${NEXORA_PROJECT}_$1:/v:ro" "$IMAGE" -c 'tar czf - -C /v .'
}
restore_volume() { # restore_volume <volume> <encrypted tar.gz>
  docker volume create --label "com.docker.compose.project=$NEXORA_PROJECT" \
    --label "com.docker.compose.volume=$1" "${NEXORA_PROJECT}_$1" > /dev/null
  decrypt_stream "$2" | docker run --rm -i --entrypoint sh -v "${NEXORA_PROJECT}_$1:/v" "$IMAGE" -c 'tar xzf - -C /v'
}
free_bytes() { df --output=avail -B1 "$1" | tail -1 | tr -d ' '; }
# Free space where Docker keeps its volumes, seen from a throwaway container (works on any host).
docker_free_bytes() {
  local kb; kb="$(docker run --rm --entrypoint df "$IMAGE" -Pk / 2> /dev/null | awk 'NR == 2 { print $4 }' || true)"
  [ -n "$kb" ] && echo $((kb * 1024))
}
gb() { echo $(($1 / 1000000000 + 1)); }
running_services() { compose ps --status running --services 2> /dev/null || true; }
forget_resume() { # forget_resume <service> — it was restarted by hand
  local s kept=()
  for s in "${RESUME_SERVICES[@]+"${RESUME_SERVICES[@]}"}"; do [ "$s" = "$1" ] || kept+=("$s"); done
  RESUME_SERVICES=("${kept[@]+"${kept[@]}"}")
}

# --- Backup ----------------------------------------------------------------------------------------
backup() {
  ask_passphrase confirm
  take_lock
  IMAGE="$(helper_image)" || true
  [ -n "${IMAGE:-}" ] || die "configuration illisible : vérifiez $NEXORA_HOME/deploy."
  local dir="$BACKUP_DIR" need=0 size free v
  for v in postgres-data "${DATA_VOLUMES[@]}" "$SECRET_VOLUME"; do
    size="$(volume_size "$v" 2> /dev/null || echo 0)"
    need=$((need + ${size:-0}))
  done
  mkdir -p "$dir"; chmod 700 "$dir"
  free="$(free_bytes "$dir")"
  if [ $((need * 2)) -gt "$free" ]; then
    die "espace disque insuffisant pour la sauvegarde : il manque environ $(gb $((need * 2 - free))) Go dans $dir."
  fi

  local WORK; new_tmp WORK
  # Everything is encrypted as it is produced: no plaintext copy ever touches the disk.
  echo "Sauvegarde des bases de données…"
  compose exec -T postgres pg_dumpall -U postgres --clean --if-exists | gzip | encrypt_to "$WORK/postgres.sql.gz.enc"
  echo "Sauvegarde des fichiers…"
  archive_volume workstudio-uploads | encrypt_to "$WORK/workstudio-uploads.tar.gz.enc"
  # Nexora Connect keeps its connections in SQLite (WAL): stopped for a consistent copy.
  local connect_stopped=0
  if running_services | grep -qx nexora-connect; then
    compose stop nexora-connect > /dev/null 2>&1; RESUME_SERVICES+=(nexora-connect); connect_stopped=1
  fi
  archive_volume connect-data | encrypt_to "$WORK/connect-data.tar.gz.enc"
  if [ "$connect_stopped" = 1 ]; then compose start nexora-connect > /dev/null 2>&1; forget_resume nexora-connect; fi
  archive_volume "$SECRET_VOLUME" | encrypt_to "$WORK/$SECRET_VOLUME.tar.gz.enc"
  encrypt_to "$WORK/env.enc" < "$ENV_FILE"

  local f sums=""
  for f in "${ARCHIVE_MEMBERS[@]}"; do
    sums+="${sums:+, }\"$f\": \"$(sha256sum "$WORK/$f" | cut -d' ' -f1)\""
  done
  printf '{\n  "format": %s,\n  "version": "%s",\n  "created": "%s",\n  "files": { %s }\n}\n' \
    "$ARCHIVE_FORMAT" "$(env_value NEXORA_VERSION)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sums" > "$WORK/manifest.json"

  # Written under a temporary name, renamed once whole: a partial archive never looks like a backup.
  local name partial
  name="nexora-${ARCHIVE_KIND:-}$(date +%Y%m%d-%H%M%S).tar"; partial="$dir/.$name.partiel"
  PARTIAL_FILES+=("$partial")
  (umask 077; tar cf "$partial" -C "$WORK" manifest.json "${ARCHIVE_MEMBERS[@]}")
  chmod 600 "$partial"; mv "$partial" "$dir/$name"
  rm -rf "$WORK"
  LAST_BACKUP="$dir/$name"
  echo "Sauvegarde terminée : $LAST_BACKUP"
  echo "Gardez la phrase de passe : sans elle, la sauvegarde ne peut pas être restaurée."
}

# --- Restore ---------------------------------------------------------------------------------------
manifest_field() { sed -nE "s/.*\"$1\": \"?([^\",]*)\"?,?\$/\1/p" "$2" | head -1; }
# Everything is checked before anything changes: members, sums, passphrase, every payload.
verify_archive() { # verify_archive <archive> — sets WORK, with env decrypted in it
  local archive="$1" untouched="rien n'a été modifié." size free listing expected name sum v
  size="$(wc -c < "$archive" | tr -d ' ')"
  mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
  free="$(free_bytes "$BACKUP_DIR")"
  if [ $((size * 2)) -gt "$free" ]; then
    die "espace disque insuffisant pour préparer la restauration : il manque environ $(gb $((size * 2 - free))) Go dans $BACKUP_DIR ; $untouched"
  fi
  listing="$(tar tf "$archive" 2> /dev/null | sort)" || die "archive illisible : $untouched"
  expected="$(printf '%s\n' manifest.json "${ARCHIVE_MEMBERS[@]}" | sort)"
  [ "$listing" = "$expected" ] || die "archive incomplète ou inattendue (contenu : $(echo $listing)) : $untouched"
  new_tmp WORK
  tar xf "$archive" -C "$WORK" manifest.json "${ARCHIVE_MEMBERS[@]}" 2> /dev/null || die "archive illisible : $untouched"
  [ "$(manifest_field format "$WORK/manifest.json")" = "$ARCHIVE_FORMAT" ] \
    || die "archive d'un format ancien ou inconnu : $untouched"
  for name in "${ARCHIVE_MEMBERS[@]}"; do
    sum="$(sed -nE "s/.*\"${name//./\\.}\": \"([0-9a-f]{64})\".*/\1/p" "$WORK/manifest.json")"
    [ -n "$sum" ] && [ "$(sha256sum "$WORK/$name" | cut -d' ' -f1)" = "$sum" ] \
      || die "archive altérée ou incomplète ($name) : $untouched"
  done
  (umask 077; decrypt_stream "$WORK/env.enc" > "$WORK/env") || die "phrase de passe incorrecte : $untouched"
  for name in "${ENV_REQUIRED_KEYS[@]}"; do
    grep -qE "^$name=." "$WORK/env" || die "archive invalide (configuration sans $name) : $untouched"
  done
  decrypt_stream "$WORK/postgres.sql.gz.enc" | gzip -t 2> /dev/null \
    || die "archive invalide (bases de données illisibles) : $untouched"
  for v in "${DATA_VOLUMES[@]}" "$SECRET_VOLUME"; do
    # A volume archive always starts with its root « ./ » (a short non-tar stream lists as empty).
    decrypt_stream "$WORK/$v.tar.gz.enc" | tar tzf - > "$WORK/$v.list" 2> /dev/null && [ "$(head -1 "$WORK/$v.list")" = ./ ] \
      || die "archive invalide (fichiers $v illisibles) : $untouched"
  done
  grep -qE '(^|/)nexora-api\.env$' "$WORK/$SECRET_VOLUME.list" \
    || die "archive invalide (clés de Nexora API absentes) : $untouched"
}
# pg_dumpall drops and re-creates every role, including the superuser psql is connected as: those
# two statements always fail. Skipped (only in the roles part), so that any other error stops.
without_connected_superuser() {
  awk '!body && /^\\connect / { body = 1 }
    body || ($0 != "DROP ROLE IF EXISTS postgres;" && $0 != "CREATE ROLE postgres;")'
}
# pg_dump empties the search path, but it does not qualify the operators of a trigger's WHEN clause:
# pgvector's « vector = vector » (installed in public) is then not found and the trigger fails.
with_extension_operators() {
  sed "s/set_config('search_path', '', false)/set_config('search_path', 'public', false)/"
}

restore() { # restore [--yes] [--rollback] <archive>
  local archive="" yes=0 rollback=0 a
  for a in "$@"; do
    case "$a" in --yes|-y) yes=1 ;; --rollback) rollback=1 ;; -*) die "usage : nexora restore [--yes] <archive>" ;; *) archive="$a" ;; esac
  done
  [ -n "$archive" ] || die "usage : nexora restore [--yes] <archive>"
  [ -f "$archive" ] || die "archive introuvable : $archive"
  archive="$(cd "$(dirname "$archive")" && pwd)/$(basename "$archive")"
  ask_passphrase
  take_lock
  IMAGE="$(helper_image)" || true
  [ -n "${IMAGE:-}" ] || die "configuration illisible : vérifiez $NEXORA_HOME/deploy."
  local WORK; verify_archive "$archive"

  # Docker's disk: the restored data (about three times the compressed archive) replaces the current data.
  local size docker_free current=0 v s
  size="$(wc -c < "$archive" | tr -d ' ')"
  docker_free="$(docker_free_bytes || true)"
  if [ -n "$docker_free" ]; then
    for v in postgres-data "${DATA_VOLUMES[@]}" "$SECRET_VOLUME"; do
      if volume_exists "$v"; then s="$(volume_size "$v" 2> /dev/null || echo 0)"; current=$((current + ${s:-0})); fi
    done
    if [ $((docker_free + current)) -lt $((size * 3)) ]; then
      die "espace disque insuffisant pour les données de Docker : il manque environ $(gb $((size * 3 - docker_free - current))) Go ; rien n'a été modifié."
    fi
  fi

  if [ "$rollback" = 0 ] && [ "$yes" = 0 ] && [ -t 0 ]; then
    echo "Archive du $(manifest_field created "$WORK/manifest.json" | sed 's/T/ à /; s/Z$/ UTC/'), version $(manifest_field version "$WORK/manifest.json")."
    echo "La restauration remplace TOUTES les données actuelles de Nexora (comptes, workflows, bases, connexions, fichiers) et deploy/.env."
    local answer=""
    read -r -p "Tapez « restaurer » pour confirmer : " answer || true
    [ "$answer" = restaurer ] || { echo "Annulé : rien n'a été modifié."; exit 1; }
  fi

  # A safety net: the current data, backed up with the same passphrase (not on an empty instance,
  # not during an update's rollback, whose backup was just made).
  local safety=""
  if [ "$rollback" = 0 ]; then
    if volume_exists postgres-data; then
      echo "Sauvegarde de sécurité des données actuelles (même phrase de passe)…"
      compose up -d --wait postgres > /dev/null
      ARCHIVE_KIND=avant-restauration- backup
      safety="$LAST_BACKUP"
    else
      echo "Instance vide : pas de sauvegarde de sécurité."
    fi
  fi
  local failed="la restauration a échoué en cours de route." restart_failed="Nexora redémarre mal après la restauration : nexora status, puis nexora logs."
  if [ -n "$safety" ]; then
    failed+=" Les données d'avant sont dans $safety (nexora restore $safety)."
    restart_failed+=" Données d'avant : $safety."
  fi

  # Destructive part: a closed terminal (SIGHUP) must not stop it half-way.
  trap '' HUP
  echo "Arrêt de Nexora et remplacement des données…"
  RESUME_SERVICES=()
  compose down --remove-orphans || die "$failed"
  for v in postgres-data "${DATA_VOLUMES[@]}" "$SECRET_VOLUME"; do docker volume rm -f "${NEXORA_PROJECT}_$v" > /dev/null; done
  for v in "${DATA_VOLUMES[@]}" "$SECRET_VOLUME"; do restore_volume "$v" "$WORK/$v.tar.gz.enc" || die "$failed"; done
  install -m 600 "$WORK/env" "$ENV_FILE"
  echo "Restauration des bases de données…"
  compose up -d --wait postgres || die "$failed"
  decrypt_stream "$WORK/postgres.sql.gz.enc" | gunzip -c | without_connected_superuser | with_extension_operators \
    | compose exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -q -d postgres > /dev/null || die "$failed"
  echo "Redémarrage de Nexora…"
  compose up -d --wait || die "$restart_failed"
  trap 'exit 129' HUP
  echo "Restauration terminée : $(url)"
  if ! check; then
    [ "$rollback" = 1 ] && { echo "nexora : la vérification échoue encore : nexora status, puis nexora logs." >&2; return 0; }
    die "Nexora a redémarré mais la vérification échoue : nexora status, puis nexora logs."
  fi
}

# --- Scheduled backups -----------------------------------------------------------------------------
# A line in the user's own crontab (no root needed). The cron container is not used: it would
# need the Docker socket, i.e. root on the host, to dump the databases and the volumes.
sq() { printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; } # quoted for /bin/sh
schedule_backup() { # schedule_backup quotidien|off
  local marker="# nexora-backup:$NEXORA_PROJECT" current
  case "${1:-}" in quotidien|off) ;; *) die "usage : nexora backup [--schedule quotidien|off]" ;; esac
  command -v crontab > /dev/null || die "crontab est absent de ce serveur : planifiez « nexora backup --auto » avec l'outil de votre choix."
  current="$(crontab -l 2> /dev/null | grep -vF "$marker" || true)"
  if [ "$1" = off ]; then
    printf '%s\n' "$current" | sed '/^$/d' | crontab -
    rm -f "$PASSPHRASE_FILE"
    echo "Sauvegarde quotidienne désactivée."
    return 0
  fi
  ask_passphrase confirm
  (umask 077; printf '%s\n' "$NEXORA_BACKUP_PASSPHRASE" > "$PASSPHRASE_FILE")
  chmod 600 "$PASSPHRASE_FILE"
  mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
  # cron runs the line with /bin/sh, a bare environment (PATH included), and turns « % » into newlines.
  local job
  job="PATH=$(sq "$PATH") NEXORA_HOME=$(sq "$NEXORA_HOME") NEXORA_PROJECT=$(sq "$NEXORA_PROJECT") NEXORA_REPO=$(sq "$NEXORA_REPO")"
  job+=" NEXORA_REF=$(sq "$NEXORA_REF") NEXORA_BUNDLE=$(sq "$NEXORA_BUNDLE") NEXORA_BACKUP_DIR=$(sq "$BACKUP_DIR")"
  job+=" $(sq "$(command -v bash)") $(sq "$NEXORA_HOME/deploy/nexora-cli.sh") backup --auto >> $(sq "$BACKUP_DIR/sauvegardes.log") 2>&1"
  job="${job//"%"/"\\%"}"
  printf '%s\n%s\n' "$current" "30 2 * * * $job $marker" | sed '/^$/d' | crontab -
  echo "Sauvegarde quotidienne planifiée à 2 h 30 dans $BACKUP_DIR ($BACKUP_RETENTION_DAYS jours conservés)."
  echo "La phrase de passe est gardée dans $PASSPHRASE_FILE (lisible par vous seul) : copiez les archives ailleurs, pas ce fichier."
}

# A scheduled run: no terminal, passphrase from its file, old scheduled archives pruned.
auto_backup() {
  AUTO_BACKUP=1 ARCHIVE_KIND=auto- backup
  find "$BACKUP_DIR" -maxdepth 1 -name 'nexora-auto-*.tar' -mtime "+$((BACKUP_RETENTION_DAYS - 1))" -delete
}

# --- Update ----------------------------------------------------------------------------------------
rollback_tag() { case "${1##*/}" in *:*) echo "$1-$ROLLBACK_SUFFIX" ;; *) echo "$1:latest-$ROLLBACK_SUFFIX" ;; esac; }
image_id() { docker image inspect -f '{{.Id}}' "$1" 2> /dev/null || true; }

maintenance_on() { # WorkStudio stops writing before the backup: nothing done after it can be lost
  local running s stopped=()
  running="$(running_services)"
  for s in "${MAINTENANCE_SERVICES[@]}"; do printf '%s\n' "$running" | grep -qx "$s" && stopped+=("$s"); done
  [ "${#stopped[@]}" -gt 0 ] || return 0
  echo "WorkStudio en maintenance pendant la mise à jour…"
  compose stop "${stopped[@]}" > /dev/null 2>&1
  for ((s = ${#stopped[@]} - 1; s >= 0; s--)); do RESUME_SERVICES+=("${stopped[$s]}"); done
}

restore_package() { # the package files (compose, scripts, this command) of the previous version
  local dir
  for dir in deploy scripts; do
    # New files rather than rewriting in place: this very script is one of them.
    rm -rf "${NEXORA_HOME:?}/$dir.nexora-maj" && mv "$NEXORA_HOME/$dir" "$NEXORA_HOME/$dir.nexora-maj"
    cp -a "$1/$dir" "$NEXORA_HOME/$dir" && rm -rf "$NEXORA_HOME/$dir.nexora-maj"
  done
}

# Update safely: maintenance, backup, keep the running images, update, account-free check. On
# failure, only what changed comes back: the package files, the images, and — once new images
# have run on the data — the data backed up just before.
update() {
  ask_passphrase confirm
  take_lock
  maintenance_on
  echo "Sauvegarde avant la mise à jour…"
  ARCHIVE_KIND=avant-maj- backup
  local images=() ids=() img old i
  mapfile -t images < <(compose config --images 2> /dev/null)
  for i in "${!images[@]}"; do
    img="${images[$i]}"; ids[$i]="$(image_id "$img")"
    [ -n "${ids[$i]}" ] || continue
    # The rollback image of the update before this one is released (unless something uses it).
    old="$(image_id "$(rollback_tag "$img")")"
    if [ -n "$old" ] && [ "$old" != "${ids[$i]}" ]; then docker image rm "$(rollback_tag "$img")" > /dev/null 2>&1 || true; fi
    docker tag "$img" "$(rollback_tag "$img")"
  done
  local package; new_tmp package
  cp -a "$NEXORA_HOME/deploy" "$NEXORA_HOME/scripts" "$package/"

  echo "Mise à jour…"
  if install_update; then
    RESUME_SERVICES=()
    echo "Vérification de la nouvelle version…"
    if check; then
      prune_after_update "${images[@]+"${images[@]}"}"
      echo "Mise à jour terminée et vérifiée. Sauvegarde d'avant la mise à jour : $LAST_BACKUP"
      return 0
    fi
  else
    local changed=0
    for i in "${!images[@]}"; do
      [ -z "${ids[$i]}" ] || [ "$(image_id "${images[$i]}")" = "${ids[$i]}" ] || changed=1
    done
    if [ "$changed" = 0 ]; then
      # The new version never ran: the data is untouched, only the package may have changed.
      if ! diff -rq "$package/deploy" "$NEXORA_HOME/deploy" > /dev/null 2>&1 || ! diff -rq "$package/scripts" "$NEXORA_HOME/scripts" > /dev/null 2>&1; then
        restore_package "$package"
      fi
      echo "La mise à jour n'a pas pu s'installer : vos données n'ont pas été touchées ; redémarrage de la version en place…" >&2
      RESUME_SERVICES=()
      compose up -d > /dev/null 2>&1 || echo "nexora : relancez Nexora avec « nexora start »." >&2
      return 1
    fi
  fi

  echo "La mise à jour a échoué : retour à la version précédente…" >&2
  for img in "${images[@]+"${images[@]}"}"; do
    docker image inspect "$(rollback_tag "$img")" > /dev/null 2>&1 && docker tag "$(rollback_tag "$img")" "$img"
  done
  restore_package "$package"
  restore --rollback "$LAST_BACKUP"
  echo "La version précédente est revenue, avec les données d'avant la mise à jour." >&2
  return 1
}

prune_after_update() { # keep the latest pre-update archive and the previous version's images
  local keep img; keep="$(basename "$LAST_BACKUP")"
  find "$BACKUP_DIR" -maxdepth 1 -name 'nexora-avant-maj-*.tar' ! -name "$keep" -delete
  for img in "$@"; do
    # A rollback tag on the very image now running is useless.
    [ "$(image_id "$(rollback_tag "$img")")" = "$(image_id "$img")" ] && docker image rm "$(rollback_tag "$img")" > /dev/null 2>&1 || true
  done
}

install_update() {
  if [ -n "$NEXORA_BUNDLE" ]; then
    NEXORA_HOME="$NEXORA_HOME" NEXORA_PROJECT="$NEXORA_PROJECT" NEXORA_BUNDLE="$NEXORA_BUNDLE" bash "$NEXORA_BUNDLE/install.sh" --update
  else
    curl -fsSL "https://raw.githubusercontent.com/$NEXORA_REPO/$NEXORA_REF/install.sh" \
      | NEXORA_HOME="$NEXORA_HOME" NEXORA_PROJECT="$NEXORA_PROJECT" NEXORA_REPO="$NEXORA_REPO" NEXORA_REF="$NEXORA_REF" bash -s -- --update
  fi
}

# --- HTTPS later -----------------------------------------------------------------------------------
set_env_line() { # set_env_line KEY VALUE — simple values only (validated by the caller)
  local tmp; tmp="$(mktemp "$ENV_FILE.XXXXXX")"
  KEY="$1" VAL="$2" awk 'BEGIN { k = ENVIRON["KEY"]; v = ENVIRON["VAL"]; done = 0 }
    index($0, k "=") == 1 { if (!done) print k "=" v; done = 1; next }
    { print }
    END { if (!done) print k "=" v }' "$ENV_FILE" > "$tmp"
  cat "$tmp" > "$ENV_FILE"; rm -f "$tmp"
}
https_setup() { # https_setup <domaine> [e-mail|internal]
  local site="${1:-}" tls="${2:-internal}" usage="usage : nexora https <domaine> [e-mail pour Let's Encrypt | internal]"
  [[ "$site" =~ ^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$ ]] || die "$usage"
  [ "$tls" = internal ] || [[ "$tls" =~ ^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$ ]] || die "$usage"
  local profiles; profiles="$(env_value COMPOSE_PROFILES)"
  case ",$profiles," in *,https,*) ;; *) profiles="${profiles:+$profiles,}https" ;; esac
  set_env_line NEXORA_DOMAIN "$site"
  set_env_line NEXORA_TLS "$tls"
  set_env_line NEXORA_PUBLIC_URL "https://$site"
  set_env_line NEXORA_PUBLIC_REALTIME_URL "https://$site"
  set_env_line NEXORA_CONNECT_PUBLIC_URL "https://connect.$site"
  set_env_line COMPOSE_PROFILES "$profiles"
  echo "Application de la configuration HTTPS…"
  compose up -d
  echo "Nexora répond sur https://$site (Nexora Connect : https://connect.$site, Nexora API : https://api.$site)."
  if [ "$tls" = internal ]; then
    echo "Certificat interne : installez l'autorité locale de Caddy sur les postes (guide d'installation, « Accès en HTTPS »)."
  fi
}

# --- Uninstall -------------------------------------------------------------------------------------
# Every profile (HTTPS, web search, transcription…), so that `down` stops them all.
profile_args() {
  local all base p
  all="$(compose --profile '*' config --services 2> /dev/null | wc -l)"
  base="$(compose config --services 2> /dev/null | wc -l)"
  if [ "$all" -gt "$base" ]; then PROFILE_ARGS=(--profile '*'); return; fi
  PROFILE_ARGS=()
  for p in $(sed -nE 's/^ *profiles: *\[([^]]*)\].*/\1/p' "$NEXORA_HOME/deploy/compose.yml" 2> /dev/null | tr -d "' " | tr ',' ' ' | sort -u); do
    PROFILE_ARGS+=(--profile "$p")
  done
}

unschedule_if_any() {
  if command -v crontab > /dev/null && crontab -l 2> /dev/null | grep -qF "# nexora-backup:$NEXORA_PROJECT"; then
    schedule_backup off
  fi
}

uninstall() {
  local PROFILE_ARGS=()
  case "${1:-}" in
    "") ;;
    --purge) purge; return ;;
    *) die "usage : nexora uninstall [--purge]" ;;
  esac
  unschedule_if_any
  profile_args
  compose "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" down --remove-orphans
  echo "Services arrêtés et supprimés. Données et configuration conservées dans $NEXORA_HOME (nexora uninstall --purge pour tout effacer)."
  rm -f "${NEXORA_LAUNCHER:-}"
}

purge() {
  local home user_home dir n=0 answer="" keep
  home="$(cd "$NEXORA_HOME" 2> /dev/null && pwd -P)" || die "dossier d'installation introuvable : $NEXORA_HOME"
  user_home="$(cd "${HOME:-/}" 2> /dev/null && pwd -P || echo /)"
  # Never the root, the home folder or anything that contains it, nor a folder that is not an install.
  case "$user_home/" in "$home"/*|"$home/") die "dossier d'installation suspect ($home) : rien n'a été supprimé." ;; esac
  [ -f "$home/deploy/compose.yml" ] || die "$home n'est pas une installation de Nexora : rien n'a été supprimé."
  dir="$(cd "$BACKUP_DIR" 2> /dev/null && pwd -P || true)"
  case "$dir/" in "$home"/*) n="$(find "$dir" -maxdepth 1 -name 'nexora-*.tar' | wc -l | tr -d ' ')" ;; esac
  echo "Supprime Nexora ET toutes ses données (comptes, workflows, base, secrets) dans $home."
  [ "$n" -gt 0 ] && echo "Attention : $n sauvegarde(s) dans $dir, à l'intérieur de ce dossier, seraient effacées aussi."
  read -r -p "Tapez « supprimer » pour confirmer : " answer || true
  [ "$answer" = "supprimer" ] || { echo "Annulé."; exit 1; }
  if [ "$n" -gt 0 ]; then
    keep="$user_home/nexora-sauvegardes"; answer=""
    read -r -p "Garder les sauvegardes (déplacées dans $keep) ? [O/n] " answer || true
    case "$answer" in
      n|N|non|Non|NON) echo "Les sauvegardes seront effacées." ;;
      *) mkdir -p "$keep"; chmod 700 "$keep"; mv "$dir"/nexora-*.tar "$keep/"; echo "Sauvegardes conservées dans $keep." ;;
    esac
  fi
  unschedule_if_any
  profile_args
  compose "${PROFILE_ARGS[@]+"${PROFILE_ARGS[@]}"}" down -v --remove-orphans
  rm -rf "$home"
  rm -f "${NEXORA_LAUNCHER:-}"
}

status() {
  compose ps
  local last free
  last="$(ls -1t "$BACKUP_DIR"/nexora-*.tar 2> /dev/null | head -1 || true)"
  free="$(free_bytes "$NEXORA_HOME")"
  echo
  echo "Version : $(env_value NEXORA_VERSION)"
  echo "Disque libre : $((free / 1000000000)) Go"
  echo "Dernière sauvegarde : ${last:-aucune (nexora backup)}"
}

# One block, read whole before it runs: an update may replace this file while it executes.
{
case "${1:-help}" in
  start) compose up -d ;;
  stop) compose stop ;;
  restart) compose restart ;;
  status) status ;;
  logs) shift; compose logs -f --tail=200 "$@" ;;
  url) url ;;
  open) command -v xdg-open > /dev/null && xdg-open "$(url)" || open "$(url)" ;;
  check) check ;;
  smoke) shift; smoke_run "$@" ;;
  backup)
    case "${2:-}" in
      --schedule) schedule_backup "${3:-}" ;;
      --auto) auto_backup ;;
      "") backup ;;
      *) die "usage : nexora backup [--schedule quotidien|off]" ;;
    esac ;;
  restore) shift; restore "$@" ;;
  update) update ;;
  https) shift; https_setup "$@" ;;
  uninstall) shift; uninstall "${1:-}" ;;
  *)
    echo "Usage : nexora start|stop|restart|status|logs [service]|url|open|check|smoke [--quick]|backup [--schedule quotidien|off]|restore [--yes] <archive>|update|https <domaine> [e-mail|internal]|uninstall [--purge]" ;;
esac
exit $?
}
