#!/usr/bin/env bash
# Tests for scripts/check-i18n.sh. Run: bash scripts/tests/test-check-i18n.sh
set -u
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$HERE/check-i18n.sh"
fails=0
expect() { local want="$1" label="$2"; shift 2; "$@" >/dev/null 2>&1; local got=$?
  if [ "$got" -eq "$want" ]; then echo "ok   - $label"; else echo "FAIL - $label (exit $got, want $want)"; fails=$((fails+1)); fi; }
tree() { local d; d="$(mktemp -d)"; mkdir -p "$d/workstudio/apps/sim/app/zone" "$d/scripts/data"
  echo "workstudio/apps/sim/app/zone" > "$d/scripts/data/i18n-covered-dirs.txt"; printf 'Slack\nNexora\n' > "$d/scripts/data/i18n-allowed-terms.txt"; echo "$d"; }
w() { printf '%s\n' "$2" > "$1/workstudio/apps/sim/app/zone/c.tsx"; }
run() { NEXORA_ROOT="$1" bash "$SCRIPT"; }

d="$(tree)"; w "$d" "<p>{t('title')}</p>"; expect 0 "translated JSX passes" run "$d"
d="$(tree)"; w "$d" "<p>Save changes</p>"; expect 1 "English JSX text fails" run "$d"
d="$(tree)"; w "$d" "$(printf '<DropdownMenuItem>\n  <BookOpen />\n  Docs\n</DropdownMenuItem>')"; expect 1 "text alone on a line between JSX tags fails" run "$d"
d="$(tree)"; w "$d" "$(printf 'const x = [\n  Foo,\n  Bar\n]')"; expect 0 "identifiers alone on a line outside JSX pass" run "$d"
d="$(tree)"; w "$d" "<ChipInput placeholder='Search workflows' />"; expect 1 "English placeholder fails" run "$d"
d="$(tree)"; w "$d" "<button aria-label=\"Close\" />"; expect 1 "English aria-label fails" run "$d"
d="$(tree)"; w "$d" "const ITEMS = [{ label: 'Settings', id: 'x' }]"; expect 1 "English label property fails" run "$d"
d="$(tree)"; w "$d" "toast.error('Failed to save')"; expect 1 "English toast fails" run "$d"
d="$(tree)"; w "$d" "<p>Slack</p>"; expect 0 "allowed proper noun passes" run "$d"
d="$(tree)"; w "$d" "<span className='flex-1 text-small'>{name}</span>"; expect 0 "class names and expressions pass" run "$d"
d="$(tree)"; w "$d" "// Shows the Save button"; expect 0 "comments pass" run "$d"
d="$(tree)"; w "$d" "<p>Enregistrer les modifications</p>"; expect 1 "any hardcoded prose fails (French belongs in messages too)" run "$d"
d="$(tree)"; printf '<p>Save</p>\n' > "$d/workstudio/apps/sim/app/zone/c.test.tsx"; expect 0 "tests are ignored" run "$d"
d="$(tree)"; w "$d" "<code>GET /api/v1</code>"; expect 0 "code-like text passes" run "$d"
d="$(tree)"; w "$d" "$(printf '<ChipCombobox\n  options={options}\n  searchable\n/>')"; expect 1 "searchable combobox left on its English search placeholder fails" run "$d"
d="$(tree)"; w "$d" "<ChipCombobox options={o} searchable searchPlaceholder={t('search')} />"; expect 0 "searchable combobox with a translated search placeholder passes" run "$d"
d="$(tree)"; w "$d" "<Combobox options={o} searchable={config.searchable} />"; expect 1 "combobox searchable by config without a search placeholder fails" run "$d"
d="$(tree)"; w "$d" "<ChipCombobox options={o} value={v} />"; expect 0 "combobox without search passes" run "$d"
d="$(tree)"; w "$d" "$(printf '<ChipModalField\n  type=\x27file\x27\n  onChange={onFiles}\n/>')"; expect 1 "file drop zone left on its English label fails" run "$d"
d="$(tree)"; w "$d" "<ChipModalField type='file' label={t('drop')} onChange={onFiles} />"; expect 1 "file drop zone left on its English dragging label fails" run "$d"
d="$(tree)"; w "$d" "<ChipModalField type='file' label={t('drop')} draggingLabel={t('dropHere')} onChange={onFiles} />"; expect 0 "file drop zone with translated labels passes" run "$d"
[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
