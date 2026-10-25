#!/usr/bin/env bash
# Tests for deploy/nexora-cli.sh (the « nexora » command) with a fake docker. Run: bash scripts/tests/test-cli.sh
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CLI="$REPO/deploy/nexora-cli.sh"
fails=0
ok() { echo "ok   - $1"; }
ko() { echo "FAIL - $1"; fails=$((fails+1)); }
scratch="$(mktemp -d)"; trap 'rm -rf "$scratch"' EXIT
export FAKE_DIR="$scratch"

# Volume contents the fake docker streams: a data volume, and the bootstrap volume with its keys.
mkdir -p "$scratch/vol" "$scratch/boot"
echo "données témoins" > "$scratch/vol/donnees"; tar czf "$scratch/volume.tar.gz" -C "$scratch/vol" .
echo "export VLLM_API_KEY=cle-secrete-123" > "$scratch/boot/nexora-api.env"; tar czf "$scratch/bootstrap.tar.gz" -C "$scratch/boot" .

# Fake docker: logs every call; simulates the database dump, the volume streams and their restore,
# the services' state and the probes of « nexora check ».
fakebin="$scratch/bin"; mkdir -p "$fakebin"
cat > "$fakebin/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker $*" >> "$FAKE_LOG"
args="$*"
case "$args" in
  *"exec -T postgres pg_dumpall"*)
    printf '%s\n' 'DROP DATABASE IF EXISTS nexora;' 'DROP ROLE IF EXISTS postgres;' 'CREATE ROLE postgres;' \
      'ALTER ROLE postgres WITH SUPERUSER;' '\connect nexora' "SELECT pg_catalog.set_config('search_path', '', false);" \
      "INSERT INTO compte VALUES ('donnée témoin');" ;;
  *"exec -T postgres psql"*) cat > "$FAKE_LOG.sql" ;;
  *"exec -T workstudio"*"chat/completions"*) printf '%s' "${FAKE_API_CODE:-200}" ;;
  *"exec -T workstudio"*"nexora-connect:3000/health"*) printf '%s' "${FAKE_CONNECT_CODE:-200}" ;;
  *"config --images"*) printf 'pgvector/pgvector:pg17\nnexora/workstudio:local\n' ;;
  *"--profile * config --services"*) printf 'postgres\nworkstudio\ncaddy\n' ;;
  *"config --services"*) printf 'postgres\nworkstudio\n' ;;
  *"ps --status running --services"*) printf '%s\n' ${FAKE_RUNNING-postgres nexora-connect workstudio workstudio-realtime cron} ;;
  *"ps -a --format"*"workstudio-migrations"*) echo "${FAKE_MIGRATIONS:-exited 0}" ;;
  "image inspect -f"*)
    case "${*: -1}" in
      *-nexora-avant-maj) echo "sha256:precedente" ;;
      *) cat "$FAKE_IMAGE_ID" 2> /dev/null || echo "sha256:ancienne" ;;
    esac ;;
  "volume inspect"*) [ -z "${FAKE_EMPTY:-}" ]; exit $? ;;
  "volume rm"*) [ -z "${FAKE_HUP:-}" ] || kill -HUP "$PPID" ;;
  *"du -sb /v"*) echo "${FAKE_VOLUME_BYTES:-1000}	/v" ;;
  *"--entrypoint df"*) printf 'Filesystem 1024-blocks Used Available Capacity Mounted on\noverlay 1 1 %s 1%% /\n' "${FAKE_DOCKER_FREE_KB:-100000000}" ;;
  *"tar czf - -C /v"*) case "$args" in *_bootstrap:*) cat "$FAKE_DIR/bootstrap.tar.gz" ;; *) cat "$FAKE_DIR/volume.tar.gz" ;; esac ;;
  *"tar xzf - -C /v"*) gzip -t 2> /dev/null || echo "FLUX INVALIDE" >> "$FAKE_LOG" ;;
esac
exit 0
EOF
cat > "$fakebin/df" <<'EOF'
#!/usr/bin/env bash
printf 'Avail\n%s\n' "${FAKE_FREE_BYTES:-100000000000}"
EOF
# Fake curl (host side of « nexora check »): pages by path, status code appended when asked.
cat > "$fakebin/curl" <<'EOF'
#!/usr/bin/env bash
echo "curl $*" >> "$FAKE_LOG"
url="${*: -1}"
case "$url" in
  */login) body="${FAKE_LOGIN_BODY-<html lang=\"fr\"><title>Connexion</title>}"; code="${FAKE_LOGIN_CODE:-200}" ;;
  */api/health) body='{"status":"ok","timestamp":"2026-10-23T10:00:00Z"}'; code="${FAKE_HEALTH_CODE:-200}" ;;
  */health) body='ok'; code="${FAKE_REALTIME_CODE:-200}" ;;
  *) body=''; code=404 ;;
esac
case "$*" in *"%{http_code}"*) printf '%s\n%s' "$body" "$code" ;; *) printf '%s' "$body" ;; esac
EOF
# Real tar, except that writing an archive fails half-way when FAKE_TAR_FAIL is set (full disk).
cat > "$fakebin/tar" <<'EOF'
#!/usr/bin/env bash
if [ -n "${FAKE_TAR_FAIL:-}" ] && [ "${1:-}" = cf ]; then echo "partiel" > "$2"; exit 1; fi
exec /usr/bin/tar "$@"
EOF
chmod +x "$fakebin/docker" "$fakebin/df" "$fakebin/curl" "$fakebin/tar"

ENV_FIXTURE='NEXORA_PUBLIC_URL=http://localhost:3000
NEXORA_VERSION=2.0.0
POSTGRES_PASSWORD=pg-secret-456
BETTER_AUTH_SECRET=tres-secret-123
ENCRYPTION_KEY=cle-chiffrement-789
NEXORA_CONNECT_ENCRYPTION_KEY=cle-connect-000'
new_home() {
  local home="$scratch/home.$RANDOM"; mkdir -p "$home/deploy" "$home.tmp"
  printf '%s\n' "$ENV_FIXTURE" > "$home/deploy/.env"
  echo "services: version-installée" > "$home/deploy/compose.yml"
  chmod 600 "$home/deploy/.env"; echo "$home"
}
cli() { # cli <home> [args...] — env from the caller; TMPDIR private to the run
  local home="$1"; shift
  PATH="$fakebin:$PATH" FAKE_LOG="$home.log" FAKE_IMAGE_ID="$home.imageid" TMPDIR="$home.tmp" NEXORA_HOME="$home" NEXORA_PROJECT=nexora-t \
    NEXORA_REPO=leon36000/Nexora-Studio- NEXORA_REF=main NEXORA_BUNDLE="$REPO" bash "$CLI" "$@" < /dev/null > "$home.out" 2>&1
}
# Nothing left behind: no plaintext copy in TMPDIR, nothing in the staging area next to the backups.
no_leftovers() { # no_leftovers <home> <label>
  local stage="$1/backups/.en-cours"
  [ -z "$(ls -A "$1.tmp" 2>/dev/null)" ] && ok "$2: TMPDIR left empty" || ko "$2: TMPDIR left empty ($(ls -A "$1.tmp"))"
  [ ! -d "$stage" ] || [ -z "$(ls -A "$stage")" ] && ok "$2: staging area left empty" || ko "$2: staging area left empty ($(ls -A "$stage"))"
}
line_of() { grep -nE -- "$2" "$1" | head -1 | cut -d: -f1; }
last_line_of() { grep -nE -- "$2" "$1" | tail -1 | cut -d: -f1; }

# 1. Backup: database, data volumes and secrets all encrypted, manifest, private archive.
h="$(new_home)"; : > "$h.log"
NEXORA_BACKUP_PASSPHRASE='phrase de passe' cli "$h" backup && ok "backup succeeds" || { ko "backup succeeds"; cat "$h.out"; }
archive="$(ls "$h"/backups/nexora-*.tar 2>/dev/null | head -1)"
[ -n "$archive" ] && ok "archive written in backups/" || ko "archive written in backups/"
[ "$(stat -c %a "$archive" 2>/dev/null)" = "600" ] && ok "archive is private" || ko "archive is private"
listing="$(tar tf "$archive" 2>/dev/null | sort | tr '\n' ' ')"
for f in manifest.json postgres.sql.gz.enc connect-data.tar.gz.enc workstudio-uploads.tar.gz.enc bootstrap.tar.gz.enc env.enc; do
  case " $listing" in *" $f "*) ok "archive holds $f" ;; *) ko "archive holds $f (has: $listing)" ;; esac
done
mkdir -p "$scratch/plain"; tar xf "$archive" -C "$scratch/plain" 2>/dev/null
plain="$(for f in "$scratch/plain"/*; do cat "$f"; gzip -dc < "$f" 2>/dev/null; done)"
for secret in tres-secret-123 "donnée témoin" "données témoins" cle-secrete-123; do
  case "$plain" in *"$secret"*) ko "nothing readable without the passphrase ($secret)" ;; *) ok "nothing readable without the passphrase ($secret)" ;; esac
done
tar xOf "$archive" manifest.json 2>/dev/null | grep -q '"version": "2.0.0"' && ok "manifest records the version" || ko "manifest records the version"
tar xOf "$archive" manifest.json 2>/dev/null | grep -q '"format": 2' && ok "manifest records the archive format" || ko "manifest records the archive format"
grep -q "pg_dumpall" "$h.log" && grep -q -- "--clean" "$h.log" && ok "database dumped with --clean" || ko "database dumped with --clean"
no_leftovers "$h" "backup"
# Nexora Connect keeps its connections in SQLite (WAL): stopped while its volume is copied, then restarted.
s="$(line_of "$h.log" "stop nexora-connect")"; c="$(line_of "$h.log" "nexora-t_connect-data:/v:ro .*tar czf")"; r="$(line_of "$h.log" "start nexora-connect")"
[ -n "$s" ] && [ -n "$c" ] && [ -n "$r" ] && [ "$s" -lt "$c" ] && [ "$c" -lt "$r" ] \
  && ok "Connect stopped during its copy, restarted after" || ko "Connect stopped during its copy, restarted after ($s $c $r)"
hc="$(new_home)"; : > "$hc.log"
FAKE_RUNNING="postgres workstudio" NEXORA_BACKUP_PASSPHRASE=p cli "$hc" backup
grep -qE " (stop|start) nexora-connect" "$hc.log" && ko "a stopped Connect stays stopped" || ok "a stopped Connect stays stopped"

# 2. No passphrase without a terminal: refused before anything is written.
h2="$(new_home)"
cli "$h2" backup && ko "backup without passphrase refused" || ok "backup without passphrase refused"
[ ! -d "$h2/backups" ] || [ -z "$(ls -A "$h2/backups")" ] && ok "nothing written without passphrase" || ko "nothing written without passphrase"

# 3. Not enough disk: refused with the missing amount.
h3="$(new_home)"
FAKE_FREE_BYTES=1000 FAKE_VOLUME_BYTES=5000000000 NEXORA_BACKUP_PASSPHRASE=x cli "$h3" backup \
  && ko "backup refused on a full disk" || ok "backup refused on a full disk"
grep -q "Go" "$h3.out" && ok "says how much space is missing" || ko "says how much space is missing"
# An archive that cannot be written whole never looks like a backup.
h3b="$(new_home)"
FAKE_TAR_FAIL=1 NEXORA_BACKUP_PASSPHRASE=x cli "$h3b" backup && ko "failed archive reported" || ok "failed archive reported"
[ -z "$(ls "$h3b"/backups/nexora-*.tar 2>/dev/null)" ] && ok "no partial archive under a final name" || ko "no partial archive under a final name"
[ -z "$(ls -A "$h3b/backups" 2>/dev/null | grep -v '^sauvegardes.log$')" ] && ok "partial archive removed" || ko "partial archive removed ($(ls -A "$h3b/backups"))"
no_leftovers "$h3b" "failed backup"

# Forge archives: replace one member (re-encrypted with the passphrase), keeping the manifest consistent.
pass='phrase de passe'
enc() { openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "pass:$pass" -out "$1"; }
forge() { # forge <out.tar> [member file]... — from $archive, members replaced, manifest sums updated
  local out="$1" work; work="$(mktemp -d "$scratch/forge.XXXX")"; shift
  tar xf "$archive" -C "$work"
  while [ "$#" -gt 1 ]; do
    cp "$2" "$work/$1"
    sed -i -E "s/\"$1\": \"[0-9a-f]{64}\"/\"$1\": \"$(sha256sum "$work/$1" | cut -d' ' -f1)\"/" "$work/manifest.json"
    shift 2
  done
  (cd "$work" && tar cf "$out" manifest.json postgres.sql.gz.enc connect-data.tar.gz.enc workstudio-uploads.tar.gz.enc bootstrap.tar.gz.enc env.enc 2>/dev/null)
}
refused_untouched() { # refused_untouched <label> <archive> [env...]
  local label="$1" arc="$2" hh; shift 2; hh="$(new_home)"; : > "$hh.log"
  ( [ "$#" -eq 0 ] || export "$@"; NEXORA_BACKUP_PASSPHRASE="$pass" cli "$hh" restore "$arc" ) && ko "$label refused" || ok "$label refused"
  grep -qE " down| volume rm" "$hh.log" && ko "$label: nothing touched" || ok "$label: nothing touched"
  grep -q "rien n'a été modifié" "$hh.out" && ok "$label: says nothing was changed" || ko "$label: says nothing was changed ($(tail -1 "$hh.out"))"
  no_leftovers "$hh" "$label"
}

# 4. Restore with the wrong passphrase: stops before touching anything.
h4="$(new_home)"; : > "$h4.log"
NEXORA_BACKUP_PASSPHRASE='mauvaise' cli "$h4" restore "$archive" && ko "wrong passphrase refused" || ok "wrong passphrase refused"
grep -q " down" "$h4.log" && ko "nothing stopped on a wrong passphrase" || ok "nothing stopped on a wrong passphrase"
no_leftovers "$h4" "restore with a wrong passphrase"

# 5. Corrupted or incomplete archives: refused before touching anything.
bad="$scratch/bad.tar"; work="$scratch/bad"; mkdir -p "$work"; tar xf "$archive" -C "$work"
echo "altéré" > "$work/postgres.sql.gz.enc"
(cd "$work" && tar cf "$bad" manifest.json postgres.sql.gz.enc connect-data.tar.gz.enc workstudio-uploads.tar.gz.enc bootstrap.tar.gz.enc env.enc)
refused_untouched "corrupted archive" "$bad"
(cd "$work" && tar xf "$archive" postgres.sql.gz.enc && tar cf "$scratch/missing.tar" manifest.json postgres.sql.gz.enc connect-data.tar.gz.enc bootstrap.tar.gz.enc env.enc)
refused_untouched "archive missing a member" "$scratch/missing.tar"
echo "intrus" > "$work/intrus.txt"
(cd "$work" && tar cf "$scratch/extra.tar" manifest.json postgres.sql.gz.enc connect-data.tar.gz.enc workstudio-uploads.tar.gz.enc bootstrap.tar.gz.enc env.enc intrus.txt)
refused_untouched "archive with an unexpected member" "$scratch/extra.tar"
echo "pas du gzip" | enc "$scratch/notgz.enc"; forge "$scratch/notgz.tar" postgres.sql.gz.enc "$scratch/notgz.enc"
refused_untouched "database dump that is not gzip" "$scratch/notgz.tar"
echo "pas une archive" | gzip | enc "$scratch/nottar.enc"; forge "$scratch/nottar.tar" connect-data.tar.gz.enc "$scratch/nottar.enc"
refused_untouched "volume that is not a tar" "$scratch/nottar.tar"
printf 'NEXORA_PUBLIC_URL=http://x\n' | enc "$scratch/env-partiel.enc"; forge "$scratch/env.tar" env.enc "$scratch/env-partiel.enc"
refused_untouched "configuration without its secrets" "$scratch/env.tar"
tar czf - -C "$scratch/vol" . | enc "$scratch/boot-vide.enc"; forge "$scratch/boot.tar" bootstrap.tar.gz.enc "$scratch/boot-vide.enc"
refused_untouched "bootstrap volume without its keys" "$scratch/boot.tar"
sed 's/"format": 2/"format": 1/' "$work/manifest.json" > "$scratch/manifest-v1.json"; forge "$scratch/v1.tar" manifest.json "$scratch/manifest-v1.json"
refused_untouched "archive of an unknown format" "$scratch/v1.tar"
# Disk: the staging area (next to the backups) and Docker's disk must hold the restore.
refused_untouched "restore on a full backup disk" "$archive" FAKE_FREE_BYTES=10
refused_untouched "restore on a full Docker disk" "$archive" FAKE_DOCKER_FREE_KB=0 FAKE_VOLUME_BYTES=0

# 6. Restore: safety backup of the current data, stop, replace volumes and database, restart, check.
h6="$(new_home)"; : > "$h6.log"; echo "NEXORA_PUBLIC_URL=http://autre" > "$h6/deploy/.env"
NEXORA_BACKUP_PASSPHRASE='phrase de passe' cli "$h6" restore "$archive" && ok "restore succeeds" || { ko "restore succeeds"; cat "$h6.out"; }
ls "$h6"/backups/nexora-avant-restauration-*.tar > /dev/null 2>&1 && ok "current data backed up before restoring" || ko "current data backed up before restoring"
b="$(line_of "$h6.log" "pg_dumpall")"; d="$(line_of "$h6.log" "compose -p nexora-t .* down")"
[ -n "$b" ] && [ -n "$d" ] && [ "$b" -lt "$d" ] && ok "safety backup before anything is stopped" || ko "safety backup before anything is stopped ($b $d)"
[ -n "$d" ] && ok "instance stopped first" || ko "instance stopped first"
for v in postgres-data connect-data workstudio-uploads bootstrap; do
  grep -q "volume rm -f nexora-t_$v" "$h6.log" && ok "volume $v replaced" || ko "volume $v replaced"
done
grep -q "FLUX INVALIDE" "$h6.log" && ko "volumes restored from decrypted streams" || ok "volumes restored from decrypted streams"
grep -q "exec -T postgres psql -v ON_ERROR_STOP=1" "$h6.log" && ok "database restored, stopping at the first error" || ko "database restored, stopping at the first error"
grep -q "donnée témoin" "$h6.log.sql" 2>/dev/null && ok "database dump decrypted for psql" || ko "database dump decrypted for psql"
# pg_dump empties the search path, so a pgvector operator in a trigger's WHEN clause
# (« old.embedding IS DISTINCT FROM new.embedding ») cannot be found: restore with public in it.
grep -q "set_config('search_path', 'public', false)" "$h6.log.sql" 2>/dev/null && ! grep -q "set_config('search_path', '', false)" "$h6.log.sql" \
  && ok "extension operators resolvable during the restore" || ko "extension operators resolvable during the restore"
grep -qxE "(DROP|CREATE) ROLE (IF EXISTS )?postgres;" "$h6.log.sql" 2>/dev/null \
  && ko "the connected superuser is not dropped nor re-created (expected errors)" || ok "the connected superuser is not dropped nor re-created (expected errors)"
grep -q "ALTER ROLE postgres" "$h6.log.sql" 2>/dev/null && ok "its password still restored" || ko "its password still restored"
grep -q "tres-secret-123" "$h6/deploy/.env" && ok ".env restored" || ko ".env restored"
[ "$(stat -c %a "$h6/deploy/.env")" = "600" ] && ok "restored .env is private" || ko "restored .env is private"
u="$(last_line_of "$h6.log" " up -d --wait$")"; k="$(last_line_of "$h6.log" "chat/completions")"
[ -n "$u" ] && [ -n "$k" ] && [ "$u" -lt "$k" ] && ok "instance restarted, then checked without an account" || ko "instance restarted, then checked without an account ($u $k)"
grep -qE "smoke|sign-up" "$h6.log" && ko "no account created by the restore" || ok "no account created by the restore"
no_leftovers "$h6" "restore"
# An empty instance (no database volume) has nothing to back up first.
h6b="$(new_home)"; : > "$h6b.log"
FAKE_EMPTY=1 NEXORA_BACKUP_PASSPHRASE="$pass" cli "$h6b" restore "$archive" && ok "restore onto an empty instance" || { ko "restore onto an empty instance"; cat "$h6b.out"; }
grep -q "pg_dumpall" "$h6b.log" && ko "no safety backup of an empty instance" || ok "no safety backup of an empty instance"
# A closed terminal (SIGHUP) while the data is being replaced does not leave it half-restored.
h6h="$(new_home)"; : > "$h6h.log"
FAKE_HUP=1 NEXORA_BACKUP_PASSPHRASE="$pass" cli "$h6h" restore "$archive" && ok "restore survives a closed terminal" || { ko "restore survives a closed terminal"; tail -3 "$h6h.out"; }
grep -q "exec -T postgres psql" "$h6h.log" && ok "data fully restored despite SIGHUP" || ko "data fully restored despite SIGHUP"
# In a terminal: archive date and version shown, « restaurer » typed to confirm.
h6c="$(new_home)"; : > "$h6c.log"
printf 'non\n' | PATH="$fakebin:$PATH" FAKE_LOG="$h6c.log" TMPDIR="$h6c.tmp" NEXORA_HOME="$h6c" NEXORA_PROJECT=nexora-t NEXORA_BACKUP_PASSPHRASE="$pass" \
  script -qec "bash $(printf '%q' "$CLI") restore $(printf '%q' "$archive")" /dev/null > "$h6c.out" 2>&1
grep -q "2.0.0" "$h6c.out" && grep -qE "20[0-9]{2}-[0-9]{2}-[0-9]{2}" "$h6c.out" && ok "terminal: archive date and version shown" || ko "terminal: archive date and version shown ($(cat "$h6c.out"))"
grep -q "restaurer" "$h6c.out" && ok "terminal: asks to type « restaurer »" || ko "terminal: asks to type « restaurer »"
grep -qE " down| volume rm|pg_dumpall" "$h6c.log" && ko "terminal: nothing done without confirmation" || ok "terminal: nothing done without confirmation"
no_leftovers "$h6c" "cancelled restore"
h6d="$(new_home)"; : > "$h6d.log"
printf 'non\n' | PATH="$fakebin:$PATH" FAKE_LOG="$h6d.log" TMPDIR="$h6d.tmp" NEXORA_HOME="$h6d" NEXORA_PROJECT=nexora-t NEXORA_BACKUP_PASSPHRASE="$pass" \
  script -qec "bash $(printf '%q' "$CLI") restore --yes $(printf '%q' "$archive")" /dev/null > "$h6d.out" 2>&1
grep -q " down" "$h6d.log" && ok "terminal: --yes skips the confirmation" || ko "terminal: --yes skips the confirmation ($(tail -3 "$h6d.out"))"

# 7. Existing commands still work; status also shows version, free disk and last backup.
h7="$(new_home)"; cli "$h7" status; grep -q "compose -p nexora-t .* ps" "$h7.log" && ok "status" || ko "status"
grep -q "Version : 2.0.0" "$h7.out" && ok "status shows the version" || ko "status shows the version"
grep -q "Disque libre : .* Go" "$h7.out" && ok "status shows free disk" || ko "status shows free disk"
grep -q "Dernière sauvegarde : aucune" "$h7.out" && ok "status says when no backup exists" || ko "status says when no backup exists"
mkdir -p "$h7/backups"; : > "$h7/backups/nexora-20261023-101500.tar"; touch -d '1 hour ago' "$h7/backups/nexora-20261023-101500.tar"
: > "$h7/backups/.nexora-20261023-111500.tar.partiel"; cli "$h7" status
grep -q "Dernière sauvegarde : .*nexora-20261023-101500.tar" "$h7.out" && ok "status shows the last backup, not a partial one" || ko "status shows the last backup, not a partial one ($(grep Dernière "$h7.out"))"
cli "$h7" url; grep -q "http://localhost:3000" "$h7.out" && ok "url" || ko "url"

# 7b. One operation at a time: backup, restore and update refuse to run while another holds the lock.
h7b="$(new_home)"
exec 8> "$h7b/.nexora.lock"; flock 8
NEXORA_BACKUP_PASSPHRASE=p cli "$h7b" backup && ko "backup refused while another operation runs" || ok "backup refused while another operation runs"
grep -q "en cours" "$h7b.out" && ok "says another operation is running" || ko "says another operation is running ($(cat "$h7b.out"))"
NEXORA_BACKUP_PASSPHRASE="$pass" cli "$h7b" restore "$archive" && ko "restore refused while another operation runs" || ok "restore refused while another operation runs"
exec 8>&-
NEXORA_BACKUP_PASSPHRASE=p cli "$h7b" backup && ok "lock released by the other operation" || ko "lock released by the other operation"

# 8. Account-free check: login page in French, health, migrations, Nexora API, Connect, realtime.
h8c="$(new_home)"; printf 'NEXORA_WORKSTUDIO_PORT=3300\nNEXORA_REALTIME_PORT=3302\n' >> "$h8c/deploy/.env"; : > "$h8c.log"
cli "$h8c" check && ok "check passes on a healthy instance" || { ko "check passes on a healthy instance"; cat "$h8c.out"; }
grep -q "curl .*http://127.0.0.1:3300/login" "$h8c.log" && ok "check: login page on the local port" || ko "check: login page on the local port"
grep -q "curl .*http://127.0.0.1:3300/api/health" "$h8c.log" && ok "check: /api/health" || ko "check: /api/health"
grep -q "curl .*http://127.0.0.1:3302/health" "$h8c.log" && ok "check: realtime server" || ko "check: realtime server"
grep -q "ps -a --format .* workstudio-migrations" "$h8c.log" && ok "check: migrations container" || ko "check: migrations container"
grep -q "exec -T workstudio .*nexora-connect:3000/health" "$h8c.log" && ok "check: Nexora Connect from WorkStudio" || ko "check: Nexora Connect from WorkStudio"
api="$(grep "chat/completions" "$h8c.log")"
case "$api" in *'exec -T workstudio'*'/bootstrap/nexora-api.env'*'$VLLM_API_KEY'*'max_tokens\":1'*'$VLLM_BASE_URL/chat/completions'*) ok "check: one-token completion with WorkStudio's own key, inside its container" ;;
  *) ko "check: one-token completion with WorkStudio's own key, inside its container ($api)" ;; esac
grep -q "cle-secrete" "$h8c.out" "$h8c.log" && ko "check: no key printed" || ok "check: no key printed"
grep -qE "sign-up|smoke|python" "$h8c.log" && ko "check: no account, no python" || ok "check: no account, no python"
[ "$(grep -c "OK" "$h8c.out")" -ge 6 ] && ok "check: six checks reported" || ko "check: six checks reported ($(cat "$h8c.out"))"
check_fails() { # check_fails <label> <env...>
  local label="$1" hh; shift; hh="$(new_home)"; : > "$hh.log"
  ( export "$@"; cli "$hh" check ) && ko "check fails: $label" || ok "check fails: $label"
  grep -q "ÉCHEC" "$hh.out" && ok "check names the failure: $label" || ko "check names the failure: $label ($(cat "$hh.out"))"
}
check_fails "login page down" FAKE_LOGIN_CODE=502
check_fails "login page not in French" FAKE_LOGIN_BODY='<html lang="en"><title>Login</title>'
check_fails "health endpoint down" FAKE_HEALTH_CODE=500
check_fails "migrations failed" FAKE_MIGRATIONS="exited 1"
check_fails "Nexora API refuses" FAKE_API_CODE=503
check_fails "Nexora Connect down" FAKE_CONNECT_CODE=000
check_fails "realtime down" FAKE_REALTIME_CODE=000
# The address WorkStudio is published on: a concrete NEXORA_BIND_ADDRESS, else this machine.
h8d="$(new_home)"; printf 'NEXORA_BIND_ADDRESS=192.168.10.20\nNEXORA_WORKSTUDIO_PORT=3300\n' >> "$h8d/deploy/.env"; : > "$h8d.log"
cli "$h8d" check; grep -q "curl .*http://192.168.10.20:3300/login" "$h8d.log" && ok "check follows NEXORA_BIND_ADDRESS" || ko "check follows NEXORA_BIND_ADDRESS"
h8e="$(new_home)"; printf 'NEXORA_BIND_ADDRESS=0.0.0.0\n' >> "$h8e/deploy/.env"; : > "$h8e.log"
cli "$h8e" check; grep -q "curl .*http://127.0.0.1:3000/login" "$h8e.log" && ok "check uses 127.0.0.1 behind 0.0.0.0" || ko "check uses 127.0.0.1 behind 0.0.0.0"

# 9. Safe update: maintenance, backup, update, account-free check; on failure, only what changed comes back.
fakebundle="$scratch/bundle"; mkdir -p "$fakebundle"
# The fake release overwrites the installed package then the images, as install.sh --update does;
# FAKE_UPDATE_FAIL_AT stops it before the package (early) or before the images (package).
cat > "$fakebundle/install.sh" <<'EOF2'
#!/usr/bin/env bash
echo "install.sh $*" >> "$FAKE_LOG"
[ "${FAKE_UPDATE_FAIL_AT:-}" = early ] && exit 1
echo "services: nouvelle-version" > "$NEXORA_HOME/deploy/compose.yml"
[ "${FAKE_UPDATE_FAIL_AT:-}" = package ] && exit 1
echo "sha256:nouvelle" > "$FAKE_IMAGE_ID"
echo "docker compose up -d (install.sh)" >> "$FAKE_LOG"
exit "${FAKE_UPDATE_EXIT:-0}"
EOF2
updated_home() {
  local home; home="$(new_home)"; mkdir -p "$home/scripts"
  printf '#!/usr/bin/env bash\necho "smoke $*" >> "$FAKE_LOG"\nexit "${FAKE_SMOKE_EXIT:-0}"\n' > "$home/scripts/smoke.sh"
  chmod +x "$home/scripts/smoke.sh"; : > "$home.log"; echo "$home"
}
update_cli() { local home="$1"; shift
  PATH="${UPDATE_PATH:-$fakebin:$PATH}" FAKE_LOG="$home.log" FAKE_IMAGE_ID="$home.imageid" TMPDIR="$home.tmp" NEXORA_HOME="$home" NEXORA_PROJECT=nexora-t \
    NEXORA_BUNDLE="$fakebundle" NEXORA_BACKUP_PASSPHRASE=p bash "$CLI" update "$@" < /dev/null > "$home.out" 2>&1; }

h8="$(updated_home)"
mkdir -p "$h8/backups"; : > "$h8/backups/nexora-avant-maj-20200101-000000.tar"; : > "$h8/backups/nexora-20200101-120000.tar"
update_cli "$h8" && ok "update succeeds" || { ko "update succeeds"; cat "$h8.out"; }
m="$(line_of "$h8.log" "stop .*workstudio")"; d="$(line_of "$h8.log" pg_dumpall)"; u="$(line_of "$h8.log" "install.sh --update")"; q="$(line_of "$h8.log" "chat/completions")"
[ -n "$m" ] && [ -n "$d" ] && [ "$m" -lt "$d" ] && ok "WorkStudio in maintenance before the backup" || ko "WorkStudio in maintenance before the backup ($m $d)"
for svc in cron workstudio workstudio-realtime; do grep -q "stop .*\b$svc\b" "$h8.log" && ok "maintenance stops $svc" || ko "maintenance stops $svc"; done
[ -n "$d" ] && [ -n "$u" ] && [ -n "$q" ] && [ "$d" -lt "$u" ] && [ "$u" -lt "$q" ] \
  && ok "backup, then update, then account-free check" || ko "backup, then update, then account-free check ($d $u $q)"
grep -qE "smoke|sign-up" "$h8.log" && ko "update makes no account" || ok "update makes no account"
grep -q "tag pgvector/pgvector:pg17 pgvector/pgvector:pg17-nexora-avant-maj" "$h8.log" && ok "running images kept for a rollback" || ko "running images kept for a rollback"
r="$(line_of "$h8.log" "image rm pgvector/pgvector:pg17-nexora-avant-maj")"; t="$(line_of "$h8.log" "tag pgvector/pgvector:pg17 pgvector")"
[ -n "$r" ] && [ -n "$t" ] && [ "$r" -lt "$t" ] && ok "older rollback image released before tagging" || ko "older rollback image released before tagging ($r $t)"
[ -z "$(awk -v u="$u" 'NR > u && /image rm .*-nexora-avant-maj/' "$h8.log")" ] && ok "rollback images of the previous version kept after success" || ko "rollback images of the previous version kept after success"
[ ! -e "$h8/backups/nexora-avant-maj-20200101-000000.tar" ] && ok "older pre-update archives pruned" || ko "older pre-update archives pruned"
[ "$(ls "$h8"/backups/nexora-avant-maj-*.tar 2>/dev/null | wc -l)" = 1 ] && ok "latest pre-update archive kept" || ko "latest pre-update archive kept"
[ -e "$h8/backups/nexora-20200101-120000.tar" ] && ok "manual archives kept by an update" || ko "manual archives kept by an update"
grep -q "tres-secret-123" "$h8/deploy/.env" && ok "configuration kept" || ko "configuration kept"
no_leftovers "$h8" "update"

# C1: an enterprise install (sign-up restricted to its domain) updates fine: the check needs no account.
h8a="$(updated_home)"; printf 'NEXORA_ALLOWED_EMAIL_DOMAINS=pme-test.fr\nNEXORA_REGISTRATION_DISABLED=true\nNEXORA_OIDC_REQUIRED=true\n' >> "$h8a/deploy/.env"
FAKE_SMOKE_EXIT=1 update_cli "$h8a" && ok "update succeeds with restricted sign-up" || { ko "update succeeds with restricted sign-up"; cat "$h8a.out"; }
grep -qE "smoke|sign-up" "$h8a.log" && ko "no sign-up attempted" || ok "no sign-up attempted"

# I9: the update needs no python3.
nopy="$scratch/nopy"; mkdir -p "$nopy"
for p in /usr/local/bin/* /usr/bin/* /bin/*; do case "${p##*/}" in python*) continue ;; esac; [ -e "$nopy/${p##*/}" ] || ln -s "$p" "$nopy/${p##*/}" 2>/dev/null; done
h8p="$(updated_home)"; printf '#!/usr/bin/env bash\npython3 -c pass\n' > "$h8p/scripts/smoke.sh"
UPDATE_PATH="$fakebin:$nopy" update_cli "$h8p" && ok "update works without python3" || { ko "update works without python3"; tail -5 "$h8p.out"; }

# « nexora smoke » (account-based, for operators) goes to WorkStudio's address, with the public origin.
h8b="$(updated_home)"
printf 'NEXORA_PUBLIC_URL=https://ia.example.fr\nNEXORA_WORKSTUDIO_PORT=3300\nNEXORA_BIND_ADDRESS=10.0.0.5\n' >> "$h8b/deploy/.env"
cli "$h8b" smoke --quick
grep -q "smoke http://10.0.0.5:3300 --quick --origin=https://ia.example.fr" "$h8b.log" \
  && ok "smoke on WorkStudio's address with the public origin" || ko "smoke on WorkStudio's address with the public origin ($(grep smoke "$h8b.log"))"

h9="$(updated_home)"
FAKE_API_CODE=500 update_cli "$h9" && ko "failed update reported" || ok "failed update reported"
grep -q "tag pgvector/pgvector:pg17-nexora-avant-maj pgvector/pgvector:pg17" "$h9.log" && ok "previous images restored" || ko "previous images restored"
grep -q "volume rm -f nexora-t_postgres-data" "$h9.log" && ok "data restored from the backup" || ko "data restored from the backup"
grep -q "nexora-avant-restauration" "$h9.out" && ko "no safety backup during a rollback" || ok "no safety backup during a rollback"
grep -qi "revenu" "$h9.out" && ok "says the previous version is back" || ko "says the previous version is back"
grep -q "version-installée" "$h9/deploy/compose.yml" && ok "previous package files restored" || ko "previous package files restored ($(cat "$h9/deploy/compose.yml"))"
no_leftovers "$h9" "rolled-back update"

h10="$(updated_home)"
FAKE_UPDATE_EXIT=1 update_cli "$h10" && ko "update that cannot install reported" || ok "update that cannot install reported"
q="$(line_of "$h10.log" "chat/completions")"; v="$(line_of "$h10.log" "volume rm")"
[ -z "$q" ] || { [ -n "$v" ] && [ "$q" -gt "$v" ]; } && ok "no check of a failed install (only after the rollback)" || ko "no check of a failed install (only after the rollback) ($q $v)"
grep -q "tag pgvector/pgvector:pg17-nexora-avant-maj pgvector/pgvector:pg17" "$h10.log" && ok "rollback after a failed install with new images" || ko "rollback after a failed install with new images"
grep -q "volume rm -f nexora-t_postgres-data" "$h10.log" && ok "data restored once new images ran" || ko "data restored once new images ran"

# I5: an update that fails before changing anything restores nothing, and WorkStudio comes back.
h10b="$(updated_home)"
FAKE_UPDATE_FAIL_AT=early update_cli "$h10b" && ko "early failure reported" || ok "early failure reported"
grep -q "volume rm" "$h10b.log" && ko "early failure: data untouched" || ok "early failure: data untouched"
grep -q "tag pgvector/pgvector:pg17-nexora-avant-maj pgvector/pgvector:pg17" "$h10b.log" && ko "early failure: images untouched" || ok "early failure: images untouched"
i="$(line_of "$h10b.log" "install.sh")"
[ -n "$(awk -v i="$i" 'NR > i && / (up -d|start)/' "$h10b.log")" ] && ok "early failure: WorkStudio restarted" || ko "early failure: WorkStudio restarted"
grep -qi "données" "$h10b.out" && ok "early failure: says the data was not touched" || ko "early failure: says the data was not touched"
no_leftovers "$h10b" "update failing early"
h10c="$(updated_home)"
FAKE_UPDATE_FAIL_AT=package update_cli "$h10c" && ko "failure after the package reported" || ok "failure after the package reported"
grep -q "version-installée" "$h10c/deploy/compose.yml" && ok "package-only failure: package files restored" || ko "package-only failure: package files restored"
grep -q "volume rm" "$h10c.log" && ko "package-only failure: data untouched" || ok "package-only failure: data untouched"
# A backup that cannot be made stops the update and leaves WorkStudio running again.
h10d="$(updated_home)"
FAKE_FREE_BYTES=1000 FAKE_VOLUME_BYTES=5000000000 update_cli "$h10d" && ko "update without room for its backup refused" || ok "update without room for its backup refused"
grep -q "install.sh" "$h10d.log" && ko "nothing installed without a backup" || ok "nothing installed without a backup"
grep -qE " start .*workstudio" "$h10d.log" && ok "WorkStudio restarted when the backup fails" || ko "WorkStudio restarted when the backup fails"

# 10. Daily backups: a user crontab line (no root), a private passphrase file, 7 days kept.
cat > "$fakebin/crontab" <<'EOF'
#!/usr/bin/env bash
case "${1:-}" in
  -l) [ -f "$FAKE_CRONTAB" ] && cat "$FAKE_CRONTAB" || { echo "no crontab for user" >&2; exit 1; } ;;
  -) cat > "$FAKE_CRONTAB" ;;
esac
EOF
chmod +x "$fakebin/crontab"
h11="$(new_home)"; export FAKE_CRONTAB="$h11.crontab"
echo "0 6 * * * /usr/bin/autre-tache" > "$FAKE_CRONTAB"
NEXORA_BACKUP_PASSPHRASE='phrase planifiée' cli "$h11" backup --schedule quotidien && ok "schedule accepted" || { ko "schedule accepted"; cat "$h11.out"; }
NEXORA_BACKUP_PASSPHRASE='phrase planifiée' cli "$h11" backup --schedule quotidien
[ "$(grep -c "backup --auto" "$FAKE_CRONTAB")" = "1" ] && ok "one daily line, even when scheduled twice" || ko "one daily line, even when scheduled twice ($(cat "$FAKE_CRONTAB"))"
grep -q "autre-tache" "$FAKE_CRONTAB" && ok "other crontab lines kept" || ko "other crontab lines kept"
pass_file="$h11/deploy/.backup-passphrase"
[ "$(stat -c %a "$pass_file" 2>/dev/null)" = "600" ] && ok "passphrase file is private" || ko "passphrase file is private"
grep -q "phrase planifiée" "$h11/deploy/.env" && ko "passphrase kept out of .env" || ok "passphrase kept out of .env"

mkdir -p "$h11/backups"
for f in nexora-auto-20200101-023000.tar nexora-20200101-120000.tar; do : > "$h11/backups/$f"; touch -d '10 days ago' "$h11/backups/$f"; done
: > "$h11/backups/nexora-auto-recent.tar"; touch -d '2 days ago' "$h11/backups/nexora-auto-recent.tar"
cli "$h11" backup --auto && ok "scheduled backup runs without a terminal" || { ko "scheduled backup runs without a terminal"; cat "$h11.out"; }
ls "$h11"/backups/nexora-auto-2*.tar 2>/dev/null | grep -qv 20200101 && ok "scheduled archive written" || ko "scheduled archive written"
[ ! -e "$h11/backups/nexora-auto-20200101-023000.tar" ] && ok "scheduled archives older than 7 days removed" || ko "scheduled archives older than 7 days removed"
[ -e "$h11/backups/nexora-auto-recent.tar" ] && ok "recent scheduled archives kept" || ko "recent scheduled archives kept"
[ -e "$h11/backups/nexora-20200101-120000.tar" ] && ok "manual archives never removed" || ko "manual archives never removed"

cli "$h11" backup --schedule off && ok "unschedule accepted" || ko "unschedule accepted"
grep -q "backup --auto" "$FAKE_CRONTAB" && ko "daily line removed" || ok "daily line removed"
grep -q "autre-tache" "$FAKE_CRONTAB" && ok "other lines kept on unschedule" || ko "other lines kept on unschedule"
[ ! -e "$pass_file" ] && ok "passphrase file removed" || ko "passphrase file removed"
cli "$h11" backup --schedule hebdomadaire && ko "unknown frequency refused" || ok "unknown frequency refused"

# The crontab line runs as cron runs it: /bin/sh, a bare environment, « % » special. An install
# path with a space, « % » and a quote, and a backup directory outside it, must survive.
weird="$scratch/dossier 100% d'essai/nexora"; mkdir -p "$weird/deploy" "$weird.tmp"
printf '%s\n' "$ENV_FIXTURE" > "$weird/deploy/.env"; chmod 600 "$weird/deploy/.env"
echo "services:" > "$weird/deploy/compose.yml"; cp "$CLI" "$weird/deploy/nexora-cli.sh"
elsewhere="$scratch/sauvegardes externes"
FAKE_CRONTAB="$scratch/weird.crontab" NEXORA_BACKUP_DIR="$elsewhere" NEXORA_BACKUP_PASSPHRASE='phrase 50%' cli "$weird" backup --schedule quotidien \
  && ok "schedule with an unusual path" || { ko "schedule with an unusual path"; cat "$weird.out"; }
job="$(grep "backup --auto" "$scratch/weird.crontab")"
case "$job" in *"PATH="*) ok "crontab line sets PATH" ;; *) ko "crontab line sets PATH ($job)" ;; esac
case "$job" in *"NEXORA_BACKUP_DIR="*) ok "crontab line passes the backup directory" ;; *) ko "crontab line passes the backup directory" ;; esac
[ -z "$(printf '%s' "$job" | sed 's/\\%//g' | tr -cd '%')" ] && ok "every % escaped for cron" || ko "every % escaped for cron ($job)"
cmd="$(printf '%s' "$job" | cut -d' ' -f6-)"; cmd="${cmd//\\%/%}"
env -i HOME="$scratch" FAKE_LOG="$weird.log" FAKE_DIR="$scratch" FAKE_IMAGE_ID="$weird.imageid" TMPDIR="$weird.tmp" /bin/sh -c "$cmd" \
  && ok "crontab line runs under /bin/sh with a bare environment" || { ko "crontab line runs under /bin/sh with a bare environment"; cat "$elsewhere/sauvegardes.log" 2>/dev/null | tail -5; }
ls "$elsewhere"/nexora-auto-*.tar > /dev/null 2>&1 && ok "scheduled archive lands in the chosen directory" || ko "scheduled archive lands in the chosen directory"

# 11. Uninstall: every profile stopped (Caddy, search, transcription); --purge guarded.
h12="$(new_home)"; : > "$h12.log"
FAKE_CRONTAB="$scratch/none.crontab" cli "$h12" uninstall
grep -q "down" "$h12.log" && grep "down" "$h12.log" | grep -qF -- "--profile *" && ok "uninstall stops every profile" || ko "uninstall stops every profile ($(grep down "$h12.log"))"
grep -q -- "--profile ollama" "$h12.log" && ko "no stale ollama profile" || ok "no stale ollama profile"
purge() { # purge <home> <answers> [env...]
  local home="$1" answers="$2"; shift 2
  printf '%b' "$answers" | env "$@" PATH="$fakebin:$PATH" FAKE_LOG="$home.log" FAKE_CRONTAB="$scratch/none.crontab" TMPDIR="$scratch" \
    NEXORA_HOME="$home" NEXORA_PROJECT=nexora-t bash "$CLI" uninstall --purge > "$home.out" 2>&1
}
fakeuser="$scratch/utilisateur"; mkdir -p "$fakeuser/deploy"; echo "services:" > "$fakeuser/deploy/compose.yml"; : > "$fakeuser/precieux"
purge "$fakeuser" 'supprimer\n' HOME="$fakeuser" && ko "--purge refuses the home directory" || ok "--purge refuses the home directory"
[ -e "$fakeuser/precieux" ] && ok "home directory untouched" || ko "home directory untouched"
notnexora="$scratch/autre-dossier"; mkdir -p "$notnexora"; : > "$notnexora/precieux"
purge "$notnexora" 'supprimer\n' HOME="$fakeuser" && ko "--purge refuses a folder that is not an install" || ok "--purge refuses a folder that is not an install"
[ -e "$notnexora/precieux" ] && ok "foreign folder untouched" || ko "foreign folder untouched"
inst="$fakeuser/nexora"; mkdir -p "$inst/deploy" "$inst/backups"; echo "services:" > "$inst/deploy/compose.yml"; : > "$inst/backups/nexora-20261023-101500.tar"
purge "$inst" 'supprimer\n\n' HOME="$fakeuser" && ok "--purge confirmed" || { ko "--purge confirmed"; cat "$inst.out"; }
grep -q "sauvegarde" "$inst.out" && ok "--purge warns that backups are inside" || ko "--purge warns that backups are inside"
[ ! -e "$inst" ] && ok "--purge removes the install" || ko "--purge removes the install"
[ -e "$fakeuser/nexora-sauvegardes/nexora-20261023-101500.tar" ] && ok "--purge keeps the backups when asked (default)" || ko "--purge keeps the backups when asked (default)"
grep "down" "$inst.log" | grep -qF -- "--profile *" && grep -q "down -v" "$inst.log" && ok "--purge removes every profile's volumes" || ko "--purge removes every profile's volumes"
inst2="$fakeuser/nexora2"; mkdir -p "$inst2/deploy" "$inst2/backups"; echo "services:" > "$inst2/deploy/compose.yml"; : > "$inst2/backups/nexora-20261023-111500.tar"
purge "$inst2" 'supprimer\nn\n' HOME="$fakeuser"
[ ! -e "$inst2" ] && [ ! -e "$fakeuser/nexora-sauvegardes/nexora-20261023-111500.tar" ] && ok "--purge deletes the backups when told to" || ko "--purge deletes the backups when told to"

# 12. HTTPS later: one command sets every public address and the « https » profile.
h13="$(new_home)"; printf 'COMPOSE_PROFILES=search\nNEXORA_DOMAIN=\nNEXORA_PUBLIC_URL=http://localhost:3000\n' >> "$h13/deploy/.env"; : > "$h13.log"
cli "$h13" https nexora.pme-test.fr internal && ok "https accepted" || { ko "https accepted"; cat "$h13.out"; }
ev() { grep -E "^$1=" "$h13/deploy/.env" | tail -1 | cut -d= -f2-; }
[ "$(ev NEXORA_DOMAIN)" = nexora.pme-test.fr ] && [ "$(ev NEXORA_TLS)" = internal ] && ok "https: domain and certificate" || ko "https: domain and certificate"
[ "$(ev NEXORA_PUBLIC_URL)" = https://nexora.pme-test.fr ] && [ "$(ev NEXORA_PUBLIC_REALTIME_URL)" = https://nexora.pme-test.fr ] \
  && [ "$(ev NEXORA_CONNECT_PUBLIC_URL)" = https://connect.nexora.pme-test.fr ] && ok "https: public addresses" || ko "https: public addresses ($(grep PUBLIC "$h13/deploy/.env"))"
[ "$(ev COMPOSE_PROFILES)" = search,https ] && ok "https: profile added to the others" || ko "https: profile added to the others ($(ev COMPOSE_PROFILES))"
[ "$(grep -c '^NEXORA_PUBLIC_URL=' "$h13/deploy/.env")" = 1 ] && ok "https: one line per setting" || ko "https: one line per setting"
[ "$(stat -c %a "$h13/deploy/.env")" = 600 ] && ok "https: .env stays private" || ko "https: .env stays private"
grep -q " up -d" "$h13.log" && ok "https: applied" || ko "https: applied"
cli "$h13" https 'bad domain;rm' && ko "https: invalid domain refused" || ok "https: invalid domain refused"

# 13. Code interpreter later: « nexora code on » generates its token once, sets the address and adds
# the « code » profile; « off » removes them and stops the controller.
h14="$(new_home)"; printf 'COMPOSE_PROFILES=search\nNEXORA_CODE_SANDBOX_URL=\n' >> "$h14/deploy/.env"; : > "$h14.log"
cli "$h14" code on && ok "code on accepted" || { ko "code on accepted"; cat "$h14.out"; }
ev14() { grep -E "^$1=" "$h14/deploy/.env" | tail -1 | cut -d= -f2-; }
token="$(ev14 NEXORA_CODE_SANDBOX_TOKEN)"
[ "${#token}" -ge 32 ] && ok "code on: token generated" || ko "code on: token generated (got ${#token} characters)"
[ "$(ev14 NEXORA_CODE_SANDBOX_URL)" = http://code-sandbox:8080 ] && ok "code on: controller address" || ko "code on: controller address ($(ev14 NEXORA_CODE_SANDBOX_URL))"
[ "$(ev14 COMPOSE_PROFILES)" = search,code ] && ok "code on: profile added to the others" || ko "code on: profile added to the others ($(ev14 COMPOSE_PROFILES))"
grep -q " up -d" "$h14.log" && ok "code on: applied" || ko "code on: applied"
cli "$h14" code on
[ "$(ev14 NEXORA_CODE_SANDBOX_TOKEN)" = "$token" ] && [ "$(grep -c '^NEXORA_CODE_SANDBOX_TOKEN=' "$h14/deploy/.env")" = 1 ] && ok "code on twice: same token" || ko "code on twice: same token"
[ "$(ev14 COMPOSE_PROFILES)" = search,code ] && ok "code on twice: profile once" || ko "code on twice: profile once ($(ev14 COMPOSE_PROFILES))"
: > "$h14.log"
cli "$h14" code off && ok "code off accepted" || { ko "code off accepted"; cat "$h14.out"; }
[ "$(ev14 COMPOSE_PROFILES)" = search ] && [ -z "$(ev14 NEXORA_CODE_SANDBOX_URL)" ] && ok "code off: profile and address removed" || ko "code off: profile and address removed"
grep -q "rm -f -s code-sandbox\|stop code-sandbox" "$h14.log" && ok "code off: controller stopped" || ko "code off: controller stopped ($(cat "$h14.log"))"
[ "$(stat -c %a "$h14/deploy/.env")" = 600 ] && ok "code: .env stays private" || ko "code: .env stays private"
cli "$h14" code maybe && ko "code: unknown argument refused" || ok "code: unknown argument refused"

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
