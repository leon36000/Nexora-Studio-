#!/usr/bin/env bash
# Tests for deploy/nexora-cli.sh (the « nexora » command) with a fake docker. Run: bash scripts/tests/test-cli.sh
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CLI="$REPO/deploy/nexora-cli.sh"
fails=0
ok() { echo "ok   - $1"; }
ko() { echo "FAIL - $1"; fails=$((fails+1)); }
scratch="$(mktemp -d)"; trap 'rm -rf "$scratch"' EXIT

# Fake docker: logs every call; simulates the database dump, volume archives and their restore.
fakebin="$scratch/bin"; mkdir -p "$fakebin"
cat > "$fakebin/docker" <<'EOF'
#!/usr/bin/env bash
echo "docker $*" >> "$FAKE_LOG"
args="$*"
out_dir() { local prev=""; for a in "$@"; do case "$a" in *:/out) echo "${a%:/out}"; return ;; esac; prev="$a"; done; }
in_dir() { for a in "$@"; do case "$a" in *:/in*) echo "${a%%:/in*}"; return ;; esac; done; }
case "$args" in
  *"exec -T postgres pg_dumpall"*) echo "-- PostgreSQL database cluster dump" ;;
  *"exec -T postgres psql"*) cat > /dev/null ;;
  *"config --images"*) printf 'pgvector/pgvector:pg17\nnexora/workstudio:local\n' ;;
  "inspect -f"*) echo "pgvector/pgvector:pg17" ;;
  *"du -sb /v"*) echo "${FAKE_VOLUME_BYTES:-1000}	/v" ;;
  *"tar czf /out/"*)
    dir="$(out_dir "$@")"; name="$(echo "$args" | sed -E 's#.*tar czf /out/([^ ]+).*#\1#')"
    vol="$(echo "$args" | sed -E 's#.* -v ([^ :]+):/v.*#\1#')"
    echo "data-of-$vol" | gzip > "$dir/$name" ;;
  *"tar xzf /in/"*) : ;;
esac
exit 0
EOF
cat > "$fakebin/df" <<'EOF'
#!/usr/bin/env bash
printf 'Avail\n%s\n' "${FAKE_FREE_BYTES:-100000000000}"
EOF
chmod +x "$fakebin/docker" "$fakebin/df"

new_home() {
  local home="$scratch/home.$RANDOM"; mkdir -p "$home/deploy"
  printf 'NEXORA_PUBLIC_URL=http://localhost:3000\nNEXORA_VERSION=2.0.0\nBETTER_AUTH_SECRET=tres-secret-123\n' > "$home/deploy/.env"
  chmod 600 "$home/deploy/.env"; echo "$home"
}
cli() { # cli <home> [args...] — env from the caller
  local home="$1"; shift
  PATH="$fakebin:$PATH" FAKE_LOG="$home.log" NEXORA_HOME="$home" NEXORA_PROJECT=nexora-t \
    NEXORA_REPO=leon36000/Nexora-Studio- NEXORA_REF=main NEXORA_BUNDLE="$REPO" bash "$CLI" "$@" < /dev/null > "$home.out" 2>&1
}

# 1. Backup: database, data volumes, encrypted secrets, manifest, private archive.
h="$(new_home)"
NEXORA_BACKUP_PASSPHRASE='phrase de passe' cli "$h" backup && ok "backup succeeds" || { ko "backup succeeds"; cat "$h.out"; }
archive="$(ls "$h"/backups/nexora-*.tar 2>/dev/null | head -1)"
[ -n "$archive" ] && ok "archive written in backups/" || ko "archive written in backups/"
[ "$(stat -c %a "$archive" 2>/dev/null)" = "600" ] && ok "archive is private" || ko "archive is private"
listing="$(tar tf "$archive" 2>/dev/null | sort | tr '\n' ' ')"
for f in manifest.json postgres.sql.gz connect-data.tar.gz workstudio-uploads.tar.gz bootstrap.tar.gz.enc env.enc; do
  case " $listing" in *"$f"*) ok "archive holds $f" ;; *) ko "archive holds $f (has: $listing)" ;; esac
done
tar xOf "$archive" env.enc 2>/dev/null | grep -q "tres-secret-123" && ko "secrets are encrypted" || ok "secrets are encrypted"
tar xOf "$archive" manifest.json 2>/dev/null | grep -q '"version": "2.0.0"' && ok "manifest records the version" || ko "manifest records the version"
grep -q "pg_dumpall" "$h.log" && grep -q -- "--clean" "$h.log" && ok "database dumped with --clean" || ko "database dumped with --clean"

# 2. No passphrase without a terminal: refused before anything is written.
h2="$(new_home)"
cli "$h2" backup && ko "backup without passphrase refused" || ok "backup without passphrase refused"
[ ! -d "$h2/backups" ] || [ -z "$(ls -A "$h2/backups")" ] && ok "nothing written without passphrase" || ko "nothing written without passphrase"

# 3. Not enough disk: refused with the missing amount.
h3="$(new_home)"
FAKE_FREE_BYTES=1000 FAKE_VOLUME_BYTES=5000000000 NEXORA_BACKUP_PASSPHRASE=x cli "$h3" backup \
  && ko "backup refused on a full disk" || ok "backup refused on a full disk"
grep -q "Go" "$h3.out" && ok "says how much space is missing" || ko "says how much space is missing"

# 4. Restore with the wrong passphrase: stops before touching anything.
h4="$(new_home)"; : > "$h4.log"
NEXORA_BACKUP_PASSPHRASE='mauvaise' cli "$h4" restore "$archive" && ko "wrong passphrase refused" || ok "wrong passphrase refused"
grep -q " down" "$h4.log" && ko "nothing stopped on a wrong passphrase" || ok "nothing stopped on a wrong passphrase"

# 5. Corrupted archive: refused before touching anything.
h5="$(new_home)"; : > "$h5.log"
bad="$scratch/bad.tar"; work="$scratch/bad"; mkdir -p "$work"; tar xf "$archive" -C "$work"
echo "altéré" | gzip > "$work/postgres.sql.gz"; tar cf "$bad" -C "$work" .
NEXORA_BACKUP_PASSPHRASE='phrase de passe' cli "$h5" restore "$bad" && ko "corrupted archive refused" || ok "corrupted archive refused"
grep -q " down" "$h5.log" && ko "nothing stopped on a corrupted archive" || ok "nothing stopped on a corrupted archive"

# 6. Restore: stop, replace volumes and database, restart; .env restored.
h6="$(new_home)"; : > "$h6.log"; echo "NEXORA_PUBLIC_URL=http://autre" > "$h6/deploy/.env"
NEXORA_BACKUP_PASSPHRASE='phrase de passe' cli "$h6" restore "$archive" && ok "restore succeeds" || { ko "restore succeeds"; cat "$h6.out"; }
grep -q "compose -p nexora-t .* down" "$h6.log" && ok "instance stopped first" || ko "instance stopped first"
for v in postgres-data connect-data workstudio-uploads bootstrap; do
  grep -q "volume rm -f nexora-t_$v" "$h6.log" && ok "volume $v replaced" || ko "volume $v replaced"
done
grep -q "exec -T postgres psql" "$h6.log" && ok "database restored" || ko "database restored"
grep -q "tres-secret-123" "$h6/deploy/.env" && ok ".env restored" || ko ".env restored"
[ "$(stat -c %a "$h6/deploy/.env")" = "600" ] && ok "restored .env is private" || ko "restored .env is private"
tail -1 "$h6.log" | grep -q " up -d" && ok "instance restarted last" || ko "instance restarted last"

# 7. Existing commands still work; status also shows version, free disk and last backup.
h7="$(new_home)"; cli "$h7" status; grep -q "compose -p nexora-t .* ps" "$h7.log" && ok "status" || ko "status"
grep -q "Version : 2.0.0" "$h7.out" && ok "status shows the version" || ko "status shows the version"
grep -q "Disque libre : .* Go" "$h7.out" && ok "status shows free disk" || ko "status shows free disk"
grep -q "Dernière sauvegarde : aucune" "$h7.out" && ok "status says when no backup exists" || ko "status says when no backup exists"
mkdir -p "$h7/backups"; : > "$h7/backups/nexora-20261023-101500.tar"; cli "$h7" status
grep -q "Dernière sauvegarde : .*nexora-20261023-101500.tar" "$h7.out" && ok "status shows the last backup" || ko "status shows the last backup"
cli "$h7" url; grep -q "http://localhost:3000" "$h7.out" && ok "url" || ko "url"

# 8. Safe update: backup first, then update, quick smoke; on failure, previous images and data come back.
fakebundle="$scratch/bundle"; mkdir -p "$fakebundle"
printf '#!/usr/bin/env bash\necho "install.sh $*" >> "$FAKE_LOG"\nexit "${FAKE_UPDATE_EXIT:-0}"\n' > "$fakebundle/install.sh"
updated_home() {
  local home; home="$(new_home)"; mkdir -p "$home/scripts"
  printf '#!/usr/bin/env bash\necho "smoke $*" >> "$FAKE_LOG"\nexit "${FAKE_SMOKE_EXIT:-0}"\n' > "$home/scripts/smoke.sh"
  chmod +x "$home/scripts/smoke.sh"; : > "$home.log"; echo "$home"
}
update_cli() { local home="$1"; shift
  PATH="$fakebin:$PATH" FAKE_LOG="$home.log" NEXORA_HOME="$home" NEXORA_PROJECT=nexora-t NEXORA_BUNDLE="$fakebundle" \
    NEXORA_BACKUP_PASSPHRASE=p bash "$CLI" update "$@" < /dev/null > "$home.out" 2>&1; }

h8="$(updated_home)"
update_cli "$h8" && ok "update succeeds" || { ko "update succeeds"; cat "$h8.out"; }
line() { grep -nE "$1" "$h8.log" | head -1 | cut -d: -f1; }
d="$(line pg_dumpall)"; u="$(line "install.sh --update")"; q="$(line "smoke .*--quick")"
[ -n "$d" ] && [ -n "$u" ] && [ -n "$q" ] && [ "$d" -lt "$u" ] && [ "$u" -lt "$q" ] \
  && ok "backup, then update, then quick smoke" || ko "backup, then update, then quick smoke ($d $u $q)"
grep -q "tag pgvector/pgvector:pg17 pgvector/pgvector:pg17-nexora-avant-maj" "$h8.log" && ok "running images kept for a rollback" || ko "running images kept for a rollback"

h9="$(updated_home)"
FAKE_SMOKE_EXIT=1 update_cli "$h9" && ko "failed update reported" || ok "failed update reported"
grep -q "tag pgvector/pgvector:pg17-nexora-avant-maj pgvector/pgvector:pg17" "$h9.log" && ok "previous images restored" || ko "previous images restored"
grep -q "volume rm -f nexora-t_postgres-data" "$h9.log" && ok "data restored from the backup" || ko "data restored from the backup"
grep -qi "revenu" "$h9.out" && ok "says the previous version is back" || ko "says the previous version is back"

h10="$(updated_home)"
FAKE_UPDATE_EXIT=1 update_cli "$h10" && ko "update that cannot install reported" || ok "update that cannot install reported"
grep -q "smoke" "$h10.log" && ko "no smoke after a failed install" || ok "no smoke after a failed install"
grep -q "tag pgvector/pgvector:pg17-nexora-avant-maj pgvector/pgvector:pg17" "$h10.log" && ok "rollback after a failed install" || ko "rollback after a failed install"

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
