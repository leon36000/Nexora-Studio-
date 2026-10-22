#!/usr/bin/env bash
# Creates deploy/.env from deploy/.env.example, replacing every `change-me` value with a fresh
# random secret. Never overwrites an existing deploy/.env. The file is readable by its owner only.
set -euo pipefail
ROOT="${NEXORA_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
EXAMPLE="$ROOT/deploy/.env.example"
TARGET="$ROOT/deploy/.env"

if [ -e "$TARGET" ]; then
  echo "deploy/.env existe déjà : rien n'est modifié."
  exit 0
fi
[ -f "$EXAMPLE" ] || { echo "deploy/.env.example introuvable" >&2; exit 1; }

umask 077
tmp="$(mktemp "$ROOT/deploy/.env.XXXXXX")"
while IFS= read -r line || [ -n "$line" ]; do
  if [[ "$line" =~ ^([A-Z0-9_]+)=change-me$ ]]; then
    printf '%s=%s\n' "${BASH_REMATCH[1]}" "$(openssl rand -hex 32)"
  else
    printf '%s\n' "$line"
  fi
done < "$EXAMPLE" > "$tmp"
chmod 600 "$tmp"
mv "$tmp" "$TARGET"
echo "deploy/.env créé (secrets générés). Vérifiez NEXORA_PUBLIC_URL et le modèle amont (NEXORA_UPSTREAM_*)."
