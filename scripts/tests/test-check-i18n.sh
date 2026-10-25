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
# K2 follow-up: labels in camelCase properties, settings catalog labels, English date formatters.
d="$(tree)"; w "$d" "export const HEADERS = { file: { rootLabel: 'Files' } }"; expect 1 "English rootLabel property fails" run "$d"
d="$(tree)"; w "$d" "const x = { emptyMessage: 'Nothing here' }"; expect 1 "English emptyMessage property fails" run "$d"
d="$(tree)"; w "$d" "const x = { keyLabel: 'Cohere', id: 'cohere' }"; expect 0 "keyLabel brand names pass" run "$d"
d="$(tree)"; w "$d" "const x = { rootLabel: t('files'), listSegment: 'files' }"; expect 0 "translated rootLabel passes" run "$d"
d="$(tree)"; w "$d" "$(printf 'import { allNavigationItems } from \x27@/app/workspace/[workspaceId]/settings/navigation\x27\nconst l = allNavigationItems.map((i) => i.label)')"; expect 1 "settings catalog labels read without the localized copy fail" run "$d"
d="$(tree)"; w "$d" "$(printf 'import { allNavigationItems } from \x27@/app/workspace/[workspaceId]/settings/navigation\x27\nconst copy = useSettingsNavCopy()\nconst l = allNavigationItems.map((i) => copy.label(i))')"; expect 0 "settings catalog labels read through the localized copy pass" run "$d"
d="$(tree)"; w "$d" "import { formatDate } from '@sim/utils/formatting'"; expect 1 "English formatDate import fails" run "$d"
d="$(tree)"; w "$d" "import { formatDateTime, formatDuration } from '@sim/utils/formatting'"; expect 1 "English formatDateTime import fails" run "$d"
d="$(tree)"; w "$d" "import { formatDuration } from '@sim/utils/formatting'"; expect 0 "other formatters pass" run "$d"
d="$(tree)"; w "$d" "const label = date.toLocaleDateString('en-US', { month: 'short' })"; expect 1 "date formatted in en-US fails" run "$d"
d="$(tree)"; w "$d" "const label = date.toLocaleDateString(locale, { month: 'short' })"; expect 0 "date formatted in the user's locale passes" run "$d"
# Shared packages (K2): no hardcoded copy outside the package's labels file, whose keys must all be translated.
shared() { local d; d="$(tree)"; mkdir -p "$d/workstudio/packages/kit/src" "$d/workstudio/apps/sim/messages/fr" "$d/workstudio/apps/sim/messages/en"
  echo "workstudio/packages/kit/src" > "$d/scripts/data/i18n-shared-packages.txt"; echo "$d"; }
ws() { printf '%s\n' "$2" > "$1/workstudio/packages/kit/src/$3"; }
msgs() { printf '%s\n' "$2" > "$1/workstudio/apps/sim/messages/fr/common.json"; printf '%s\n' "$3" > "$1/workstudio/apps/sim/messages/en/common.json"; }
LABELS="$(printf "// i18n-defaults: common.kit\nexport const KIT_DEFAULT_LABELS = {\n  cancel: 'Cancel',\n  noMatches: 'No matching options found',\n} as const")"
d="$(shared)"; ws "$d" "export function M({ cancelLabel = 'Cancel' }) { return null }" m.tsx; expect 1 "default label parameter in a shared package fails" run "$d"
d="$(shared)"; ws "$d" "$(printf 'function M({\n  dismissLabel = \x27Cancel\x27,\n}) {}')" m.tsx; expect 1 "default label parameter on its own line fails" run "$d"
d="$(shared)"; ws "$d" "const title = props.srTitle ?? 'Confirm'" m.tsx; expect 1 "fallback string in a shared package fails" run "$d"
d="$(shared)"; ws "$d" "const empty = emptyMessage || (query ? 'No matching options found' : 'No options available')" m.tsx; expect 1 "conditional fallback copy in a shared package fails" run "$d"
d="$(shared)"; ws "$d" "<button aria-label='Close' />" m.tsx; expect 1 "aria-label in a shared package fails" run "$d"
d="$(shared)"; ws "$d" "<span className='sr-only'>Close</span>" m.tsx; expect 1 "screen-reader text in a shared package fails" run "$d"
d="$(shared)"; ws "$d" "$(printf '/**\n * <ChipModal srTitle=\x27Invite\x27>Invite team</ChipModal>\n */\nexport const x = 1')" m.tsx; expect 0 "TSDoc examples pass" run "$d"
d="$(shared)"; ws "$d" "const x = ({ placeholder = 'Search...' }) => x"  m.tsx; expect 1 "ellipsis default placeholder in a shared package fails" run "$d"
d="$(shared)"; ws "$d" 'const name = `Close ${tab.title}`' m.tsx; expect 1 "template literal copy in a shared package fails" run "$d"
d="$(shared)"; ws "$d" 'const cls = `${base} px-2 text-caption`' m.tsx; expect 0 "template literal class list passes" run "$d"
d="$(shared)"; ws "$d" "const state = [invalid && 'Invalid selection.'].join(' ')" m.tsx; expect 1 "conditional screen-reader copy in a shared package fails" run "$d"
d="$(shared)"; ws "$d" "if (event.key === 'Enter') submit()" m.tsx; expect 0 "key comparisons pass" run "$d"
d="$(shared)"; ws "$d" "const labels = useKitLabels(); return <p>{labels.cancel}</p>" m.tsx; expect 0 "copy read from the labels context passes" run "$d"
d="$(shared)"; ws "$d" "$LABELS" labels.tsx; msgs "$d" '{"kit":{"cancel":"Annuler","noMatches":"Aucune option correspondante"}}' '{"kit":{"cancel":"Cancel","noMatches":"No matching options found"}}'; expect 0 "labels file with every key translated passes" run "$d"
d="$(shared)"; ws "$d" "$LABELS" labels.tsx; msgs "$d" '{"kit":{"cancel":"Annuler"}}' '{"kit":{"cancel":"Cancel","noMatches":"No matching options found"}}'; expect 1 "labels file with a key missing from fr messages fails" run "$d"
d="$(shared)"; ws "$d" "$LABELS" labels.tsx; msgs "$d" '{"kit":{"cancel":"Annuler","noMatches":"Aucune option correspondante"}}' '{"kit":{"cancel":"Dismiss","noMatches":"No matching options found"}}'; expect 1 "labels file whose English message differs from the default fails" run "$d"
d="$(shared)"; ws "$d" "$LABELS" labels.tsx; msgs "$d" '{"kit":{"cancel":"Cancel","noMatches":"Aucune option correspondante"}}' '{"kit":{"cancel":"Cancel","noMatches":"No matching options found"}}'; expect 1 "labels file left in English in fr messages fails" run "$d"
[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
