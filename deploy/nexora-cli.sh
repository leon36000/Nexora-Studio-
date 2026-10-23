#!/usr/bin/env bash
# nexora — pilote une installation de Nexora : démarrer, arrêter, suivre, sauvegarder, restaurer,
# mettre à jour. Installé par install.sh, qui le lance avec NEXORA_HOME, NEXORA_PROJECT,
# NEXORA_REPO, NEXORA_REF et NEXORA_BUNDLE.
set -euo pipefail
: "${NEXORA_HOME:?NEXORA_HOME manquant}" "${NEXORA_PROJECT:?NEXORA_PROJECT manquant}"
NEXORA_REPO="${NEXORA_REPO:-leon36000/Nexora-Studio-}"
NEXORA_REF="${NEXORA_REF:-main}"
NEXORA_BUNDLE="${NEXORA_BUNDLE:-}"
ENV_FILE="$NEXORA_HOME/deploy/.env"
# Data kept by a backup, besides the PostgreSQL databases. `bootstrap` holds keys: encrypted.
DATA_VOLUMES=(connect-data workstudio-uploads)
SECRET_VOLUME=bootstrap
CIPHER=(-aes-256-cbc -pbkdf2 -iter 200000)
# Scheduled backups read their passphrase here (0600, never in .env) and keep 7 days of archives.
PASSPHRASE_FILE="$NEXORA_HOME/deploy/.backup-passphrase"
BACKUP_RETENTION_DAYS=7
ROLLBACK_SUFFIX=nexora-avant-maj
TMP_DIRS=()
trap 'rm -rf "${TMP_DIRS[@]}"' EXIT
new_tmp() { local d; d="$(mktemp -d)"; chmod 700 "$d"; TMP_DIRS+=("$d"); echo "$d"; }

compose() { docker compose -p "$NEXORA_PROJECT" -f "$NEXORA_HOME/deploy/compose.yml" --env-file "$ENV_FILE" "$@"; }
die() { echo "nexora : $*" >&2; exit 1; }
url() { grep -E '^NEXORA_PUBLIC_URL=' "$ENV_FILE" | tail -1 | cut -d= -f2- | sed "s/^'//; s/'\$//"; }
# The smoke test talks to WorkStudio's local port and declares the public address as its origin:
# behind HTTPS with an internal certificate the public address is not trusted from this machine.
smoke_run() {
  local port; port="$(env_value NEXORA_WORKSTUDIO_PORT)"
  if [ -n "$port" ]; then
    "$NEXORA_HOME/scripts/smoke.sh" "http://127.0.0.1:$port" "$@" "--origin=$(url)"
  else
    "$NEXORA_HOME/scripts/smoke.sh" "$(url)" "$@"
  fi
}
env_value() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | sed "s/^'//; s/'\$//"; }

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
encrypt() { openssl enc "${CIPHER[@]}" -salt -pass env:NEXORA_BACKUP_PASSPHRASE -in "$1" -out "$2"; }
decrypt() { openssl enc -d "${CIPHER[@]}" -pass env:NEXORA_BACKUP_PASSPHRASE -in "$1" -out "$2" 2> /dev/null; }

# A container image already on this machine that has sh and tar: the PostgreSQL one.
helper_image() { compose config --images 2> /dev/null | grep -m1 -E 'pgvector|postgres'; }
volume_size() {
  docker run --rm --entrypoint sh -v "${NEXORA_PROJECT}_$1:/v:ro" "$IMAGE" -c 'du -sb /v' | cut -f1
}
archive_volume() { # archive_volume <volume> <dir> <file>
  docker run --rm --entrypoint sh -v "${NEXORA_PROJECT}_$1:/v:ro" -v "$2:/out" "$IMAGE" -c "tar czf /out/$3 -C /v ."
}
restore_volume() { # restore_volume <volume> <dir> <file>
  docker volume create --label "com.docker.compose.project=$NEXORA_PROJECT" \
    --label "com.docker.compose.volume=$1" "${NEXORA_PROJECT}_$1" > /dev/null
  docker run --rm --entrypoint sh -v "${NEXORA_PROJECT}_$1:/v" -v "$2:/in:ro" "$IMAGE" -c "tar xzf /in/$3 -C /v"
}

backup() {
  ask_passphrase confirm
  IMAGE="$(helper_image)" || true
  [ -n "${IMAGE:-}" ] || die "configuration illisible : vérifiez $NEXORA_HOME/deploy."
  local dir="${NEXORA_BACKUP_DIR:-$NEXORA_HOME/backups}" need=0 size free v
  for v in postgres-data "${DATA_VOLUMES[@]}" "$SECRET_VOLUME"; do
    size="$(volume_size "$v" 2> /dev/null || echo 0)"
    need=$((need + ${size:-0}))
  done
  mkdir -p "$dir"; chmod 700 "$dir"
  free="$(df --output=avail -B1 "$dir" | tail -1 | tr -d ' ')"
  if [ $((need * 2)) -gt "$free" ]; then
    die "espace disque insuffisant pour la sauvegarde : il manque environ $(((need * 2 - free) / 1000000000 + 1)) Go dans $dir."
  fi

  WORK="$(new_tmp)"
  echo "Sauvegarde des bases de données…"
  compose exec -T postgres pg_dumpall -U postgres --clean --if-exists | gzip > "$WORK/postgres.sql.gz"
  echo "Sauvegarde des fichiers…"
  for v in "${DATA_VOLUMES[@]}"; do archive_volume "$v" "$WORK" "$v.tar.gz"; done
  archive_volume "$SECRET_VOLUME" "$WORK" "$SECRET_VOLUME.tar.gz"
  encrypt "$WORK/$SECRET_VOLUME.tar.gz" "$WORK/$SECRET_VOLUME.tar.gz.enc"; rm -f "$WORK/$SECRET_VOLUME.tar.gz"
  encrypt "$ENV_FILE" "$WORK/env.enc"

  local files=(postgres.sql.gz) f sums=""
  for v in "${DATA_VOLUMES[@]}"; do files+=("$v.tar.gz"); done
  files+=("$SECRET_VOLUME.tar.gz.enc" env.enc)
  for f in "${files[@]}"; do
    sums+="${sums:+, }\"$f\": \"$(sha256sum "$WORK/$f" | cut -d' ' -f1)\""
  done
  printf '{\n  "version": "%s",\n  "created": "%s",\n  "files": { %s }\n}\n' \
    "$(env_value NEXORA_VERSION)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$sums" > "$WORK/manifest.json"

  local archive="$dir/nexora-${ARCHIVE_KIND:-}$(date +%Y%m%d-%H%M%S).tar"
  (umask 077; tar cf "$archive" -C "$WORK" manifest.json "${files[@]}")
  chmod 600 "$archive"
  LAST_BACKUP="$archive"
  echo "Sauvegarde terminée : $archive"
  echo "Gardez la phrase de passe : sans elle, la sauvegarde ne peut pas être restaurée."
}

restore() {
  local archive="${1:-}" name sum
  [ -n "$archive" ] || die "usage : nexora restore <archive>"
  [ -f "$archive" ] || die "archive introuvable : $archive"
  ask_passphrase
  WORK="$(new_tmp)"
  tar xf "$archive" -C "$WORK" 2> /dev/null || die "archive illisible : rien n'a été modifié."
  [ -f "$WORK/manifest.json" ] || die "archive incomplète (manifeste absent) : rien n'a été modifié."
  while read -r name sum; do
    [ -f "$WORK/$name" ] && [ "$(sha256sum "$WORK/$name" | cut -d' ' -f1)" = "$sum" ] \
      || die "archive altérée ou incomplète ($name) : rien n'a été modifié."
  done < <(grep -oE '"[^"]+": "[0-9a-f]{64}"' "$WORK/manifest.json" | sed -E 's/"([^"]+)": "([0-9a-f]+)"/\1 \2/')
  decrypt "$WORK/env.enc" "$WORK/env" || die "phrase de passe incorrecte : rien n'a été modifié."
  decrypt "$WORK/$SECRET_VOLUME.tar.gz.enc" "$WORK/$SECRET_VOLUME.tar.gz" \
    || die "phrase de passe incorrecte : rien n'a été modifié."
  IMAGE="$(helper_image)" || true
  [ -n "${IMAGE:-}" ] || die "configuration illisible : vérifiez $NEXORA_HOME/deploy."

  echo "Arrêt de Nexora et remplacement des données…"
  compose down --remove-orphans
  local v
  for v in postgres-data "${DATA_VOLUMES[@]}" "$SECRET_VOLUME"; do docker volume rm -f "${NEXORA_PROJECT}_$v" > /dev/null; done
  for v in "${DATA_VOLUMES[@]}"; do restore_volume "$v" "$WORK" "$v.tar.gz"; done
  restore_volume "$SECRET_VOLUME" "$WORK" "$SECRET_VOLUME.tar.gz"
  install -m 600 "$WORK/env" "$ENV_FILE"
  echo "Restauration des bases de données…"
  compose up -d --wait postgres
  gunzip -c "$WORK/postgres.sql.gz" | compose exec -T postgres psql -U postgres -q -d postgres > /dev/null
  echo "Redémarrage de Nexora…"
  compose up -d --wait || die "Nexora redémarre mal après la restauration : nexora status, puis nexora logs."
  echo "Restauration terminée : $(url) (vérification complète : nexora smoke --quick)"
}

# A line in the user's own crontab (no root needed). The cron container is not used: it would
# need the Docker socket, i.e. root on the host, to dump the databases and the volumes.
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
  local dir="${NEXORA_BACKUP_DIR:-$NEXORA_HOME/backups}" job
  mkdir -p "$dir"; chmod 700 "$dir"
  job="$(printf 'NEXORA_HOME=%q NEXORA_PROJECT=%q NEXORA_REPO=%q NEXORA_REF=%q NEXORA_BUNDLE=%q bash %q backup --auto >> %q 2>&1' \
    "$NEXORA_HOME" "$NEXORA_PROJECT" "$NEXORA_REPO" "$NEXORA_REF" "$NEXORA_BUNDLE" "$NEXORA_HOME/deploy/nexora-cli.sh" "$dir/sauvegardes.log")"
  printf '%s\n%s\n' "$current" "30 2 * * * $job $marker" | sed '/^$/d' | crontab -
  echo "Sauvegarde quotidienne planifiée à 2 h 30 dans $dir ($BACKUP_RETENTION_DAYS jours conservés)."
  echo "La phrase de passe est gardée dans $PASSPHRASE_FILE (lisible par vous seul) : copiez les archives ailleurs, pas ce fichier."
}

# A scheduled run: no terminal, passphrase from its file, old scheduled archives pruned.
auto_backup() {
  AUTO_BACKUP=1 ARCHIVE_KIND=auto- backup
  find "${NEXORA_BACKUP_DIR:-$NEXORA_HOME/backups}" -maxdepth 1 -name 'nexora-auto-*.tar' -mtime "+$((BACKUP_RETENTION_DAYS - 1))" -delete
}

rollback_tag() { case "${1##*/}" in *:*) echo "$1-$ROLLBACK_SUFFIX" ;; *) echo "$1:latest-$ROLLBACK_SUFFIX" ;; esac; }

# Update safely: back up, keep the running images, update, run the quick smoke test; on any
# failure, put the previous images and the backed-up data back.
update() {
  ask_passphrase confirm
  echo "Sauvegarde avant la mise à jour…"
  backup
  local images=() img
  mapfile -t images < <(compose config --images 2> /dev/null)
  for img in "${images[@]}"; do
    docker image inspect "$img" > /dev/null 2>&1 && docker tag "$img" "$(rollback_tag "$img")"
  done
  echo "Mise à jour…"
  if install_update && smoke_run --quick; then
    echo "Mise à jour terminée et vérifiée. Sauvegarde d'avant la mise à jour : $LAST_BACKUP"
    return 0
  fi
  echo "La mise à jour a échoué : retour à la version précédente…" >&2
  for img in "${images[@]}"; do
    docker image inspect "$(rollback_tag "$img")" > /dev/null 2>&1 && docker tag "$(rollback_tag "$img")" "$img"
  done
  restore "$LAST_BACKUP"
  echo "La version précédente est revenue, avec les données d'avant la mise à jour." >&2
  return 1
}

install_update() {
  if [ -n "$NEXORA_BUNDLE" ]; then
    NEXORA_HOME="$NEXORA_HOME" NEXORA_PROJECT="$NEXORA_PROJECT" NEXORA_BUNDLE="$NEXORA_BUNDLE" bash "$NEXORA_BUNDLE/install.sh" --update
  else
    curl -fsSL "https://raw.githubusercontent.com/$NEXORA_REPO/$NEXORA_REF/install.sh" \
      | NEXORA_HOME="$NEXORA_HOME" NEXORA_PROJECT="$NEXORA_PROJECT" NEXORA_REPO="$NEXORA_REPO" NEXORA_REF="$NEXORA_REF" bash -s -- --update
  fi
}

unschedule_if_any() {
  if command -v crontab > /dev/null && crontab -l 2> /dev/null | grep -qF "# nexora-backup:$NEXORA_PROJECT"; then
    schedule_backup off
  fi
}

uninstall() {
  if [ "${1:-}" = "--purge" ]; then
    echo "Supprime Nexora ET toutes ses données (comptes, workflows, base, secrets) dans $NEXORA_HOME."
    read -r -p "Tapez « supprimer » pour confirmer : " answer
    [ "$answer" = "supprimer" ] || { echo "Annulé."; exit 1; }
    unschedule_if_any
    compose --profile ollama down -v --remove-orphans
    rm -rf "$NEXORA_HOME"
  else
    unschedule_if_any
    compose --profile ollama down --remove-orphans
    echo "Services arrêtés et supprimés. Données et configuration conservées dans $NEXORA_HOME (nexora uninstall --purge pour tout effacer)."
  fi
  rm -f "${NEXORA_LAUNCHER:-}"
}

status() {
  compose ps
  local dir="${NEXORA_BACKUP_DIR:-$NEXORA_HOME/backups}" last free
  last="$(ls -1t "$dir"/nexora-*.tar 2> /dev/null | head -1 || true)"
  free="$(df --output=avail -B1 "$NEXORA_HOME" | tail -1 | tr -d ' ')"
  echo
  echo "Version : $(env_value NEXORA_VERSION)"
  echo "Disque libre : $((free / 1000000000)) Go"
  echo "Dernière sauvegarde : ${last:-aucune (nexora backup)}"
}

case "${1:-help}" in
  start) compose up -d ;;
  stop) compose stop ;;
  restart) compose restart ;;
  status) status ;;
  logs) shift; compose logs -f --tail=200 "$@" ;;
  url) url ;;
  open) command -v xdg-open > /dev/null && xdg-open "$(url)" || open "$(url)" ;;
  smoke) shift; smoke_run "$@" ;;
  backup)
    case "${2:-}" in
      --schedule) schedule_backup "${3:-}" ;;
      --auto) auto_backup ;;
      "") backup ;;
      *) die "usage : nexora backup [--schedule quotidien|off]" ;;
    esac ;;
  restore) shift; restore "${1:-}" ;;
  update) update ;;
  uninstall) shift; uninstall "${1:-}" ;;
  *)
    echo "Usage : nexora start|stop|restart|status|logs [service]|url|open|smoke|backup [--schedule quotidien|off]|restore <archive>|update|uninstall [--purge]" ;;
esac
