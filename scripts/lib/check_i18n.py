"""Finds hardcoded interface prose in the source folders declared as translated.

Usage: python3 -I scripts/lib/check_i18n.py [--root DIR]
Exit: 0 clean, 1 hardcoded text found.

Covered folders: scripts/data/i18n-covered-dirs.txt (grows as areas are translated).
Shared packages: scripts/data/i18n-shared-packages.txt — packages the app renders (design system,
canvas renderer) cannot import next-intl copy, so their default copy lives in one labels file per
package, marked `// i18n-defaults: <namespace>.<path>`, and nowhere else: a default parameter
(`cancelLabel = 'Cancel'`) or a fallback (`?? 'Confirm'`) is refused there too. Each key of the
labels file must be translated in apps/sim/messages/fr/<namespace>.json, and its English message
must be the default itself.
Allowed terms (product and brand names shown as-is): scripts/data/i18n-allowed-terms.txt.
A line can be exempted with a trailing `// i18n-ignore: <reason>` comment.
Dates, numbers and settings-catalog labels must follow the interface language: `formatDate` /
`formatDateTime` (English) and an `en-US` literal are refused, `allNavigationItems` needs `useSettingsNavCopy`.
emcn elements whose built-in copy is English (a searchable combobox's search placeholder, a file
drop zone's label) must be given translated copy.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKIP_SUFFIXES = (".test.ts", ".test.tsx", ".dom.test.tsx", ".integration.ts", ".d.ts", ".stories.tsx")
COMMENT_LINE = re.compile(r"^\s*(//|/\*|\*)")
JSX_TEXT = re.compile(r"(?<![=-])>([^<>{}`]*?)<")
ATTRIBUTE = re.compile(r"\b(?:placeholder|title|aria-label|alt|label|tooltip|description)=(['\"])(.*?)\1")
# `keyLabel` names a third-party provider (« Cohere »), shown as-is.
PROPERTY = re.compile(
    r"\b(?:label|title|description|placeholder|tooltip|emptyText|heading|subtitle|confirmText|cancelText|buttonText"
    r"|(?!keyLabel\b)[a-z]\w*(?:Label|Title|Description|Placeholder|Tooltip|Heading|Caption|Hint|Message))"
    r"\s*:\s*(['\"])(.*?)\1"
)
TOAST = re.compile(r"\btoast(?:\.\w+)?\(\s*(['\"])(.*?)\1")
BARE_TEXT = re.compile(r"^\s*([A-ZÀ-Ö][^=;(){}<>`$|&]*?)\s*$")
WORD = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]{2,}")
DEFAULT_PARAMETER = re.compile(r"\b\w*(?:[Ll]abel|[Pp]laceholder|[Tt]ext|[Tt]itle|[Mm]essage|[Hh]int|[Cc]aption)\s*=\s*(['\"])(.*?)\1")
FALLBACK = re.compile(r"(?:\?\?|\|\||&&|\?|:)\s*\(?\s*(['\"])(.*?)\1")
TEMPLATE = re.compile(r"`([^`]*)`")
DEFAULTS_MARKER = re.compile(r"//\s*i18n-defaults:\s*([\w.]+)")
DEFAULTS_ENTRY = re.compile(r"^[ \t]*(\w+):\s*(['\"])([^'\"\n]*)\2,?[ \t]*$", re.M)
MESSAGES_DIR = "workstudio/apps/sim/messages"
NAVIGATION_CATALOG_IMPORT = re.compile(r"import\s*\{[^}]*\ballNavigationItems\b[^}]*\}\s*from")
ENGLISH_DATE_FORMATTER_IMPORT = re.compile(r"import\s*\{[^}]*\bformatDate(?:Time)?\b[^}]*\}\s*from\s*['\"]@sim/utils/formatting['\"]")
ENGLISH_LOCALE_LITERAL = re.compile(r"\b(?:toLocale(?:Date|Time)?String|Intl\.(?:DateTimeFormat|NumberFormat))\(\s*['\"]en-US['\"]")
CODE_OPERATOR = re.compile(r"&&|\|\||\?\?|=>|===|!==|\)\.")
CLASS_TOKEN = re.compile(r"[-\[\]:/!#.%()0-9]")
CLASS_WORDS = {
    "flex", "grid", "block", "inline", "hidden", "contents", "border", "rounded", "shadow", "truncate",
    "relative", "absolute", "fixed", "sticky", "static", "grow", "shrink", "italic", "underline",
    "uppercase", "lowercase", "capitalize", "transition", "transform", "outline", "ring", "group", "peer",
    "invisible", "visible", "isolate", "container", "antialiased", "nodrag", "nowheel", "nopan", "sr-only",
}
CODE_LIKE = re.compile(r"^[\w./:@#$%&*+=?\-\[\](),;|^~!]*$|^(GET|POST|PUT|PATCH|DELETE)\s+/")
# emcn components whose built-in copy is English: (element, prop that turns the copy on, prop that replaces it).
EMCN_ENGLISH_DEFAULTS = (
    ("ChipCombobox", re.compile(r"\bsearchable\b"), "searchPlaceholder", "« Search... »"),
    ("Combobox", re.compile(r"\bsearchable\b"), "searchPlaceholder", "« Search... »"),
    ("ChipModalField", re.compile(r"\btype=['\"]file['\"]"), "label", "« Drop files here or click to browse »"),
    ("ChipModalField", re.compile(r"\btype=['\"]file['\"]"), "draggingLabel", "« Drop files here »"),
)


def is_class_list(text: str) -> bool:
    """A Tailwind class list or CSS value (`px-2 text-caption`, `calc(100vw - 16px)`), not prose."""
    tokens = text.split()
    return bool(tokens) and all(CLASS_TOKEN.search(t.rstrip(".…")) or t in CLASS_WORDS for t in tokens)


def is_prose(text: str, allowed: set[str]) -> bool:
    text = text.strip()
    if not text or not WORD.search(text):
        return False
    if text.startswith("=") or CODE_OPERATOR.search(text) or is_class_list(text):
        return False
    word = text.rstrip(".…!?:")
    if " " not in text and (CODE_LIKE.match(text) and not re.match(r"^[A-ZÀ-Ö][a-zà-ÿ]+$", word)):
        return False  # identifiers, paths, keys
    if CODE_LIKE.match(text.split(" ", 1)[0]) and re.match(r"^(GET|POST|PUT|PATCH|DELETE)\s+/", text):
        return False
    if text.startswith("&") or text in allowed:
        return False
    words = WORD.findall(text)
    return not all(w in allowed or w.isupper() for w in words)


def opening_tags(source: str, name: str):
    """Yields (line number, text) of each `<name ...>` opening tag, braces and strings included."""
    for match in re.finditer(r"<" + name + r"\b", source):
        depth, index = 0, match.end()
        while index < len(source):
            char = source[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            elif char == ">" and depth == 0 and source[index - 1] != "=":
                break
            index += 1
        yield source.count("\n", 0, match.start()) + 1, source[match.start() : index + 1]


def english_emcn_defaults(source: str) -> list[tuple[int, str]]:
    """emcn elements left on their English built-in copy (search placeholder, drop zone label)."""
    hits = []
    for name, enabled, prop, copy in EMCN_ENGLISH_DEFAULTS:
        for number, tag in opening_tags(source, name):
            if "i18n-ignore:" in tag or not enabled.search(tag):
                continue
            if not re.search(r"\b" + prop + r"=", tag):
                hits.append((number, f"<{name}> shows {copy}: pass {prop}"))
    return hits


def english_formatting(source: str) -> list[tuple[int, str]]:
    """Dates and catalog labels that bypass the interface language."""
    hits = []
    for match in ENGLISH_DATE_FORMATTER_IMPORT.finditer(source):
        number = source.count("\n", 0, match.start()) + 1
        hits.append((number, "formatDate/formatDateTime from @sim/utils/formatting are English: use useDateFormat()"))
    for match in ENGLISH_LOCALE_LITERAL.finditer(source):
        number = source.count("\n", 0, match.start()) + 1
        line = source.splitlines()[number - 1]
        if "i18n-ignore:" not in line:
            hits.append((number, "formatted in en-US: use the interface locale (useLocale() / useDateFormat())"))
    if (
        NAVIGATION_CATALOG_IMPORT.search(source)
        and "useSettingsNavCopy" not in source
        and "export const allNavigationItems" not in source
    ):
        number = source.count("\n", 0, NAVIGATION_CATALOG_IMPORT.search(source).start()) + 1
        hits.append((number, "settings catalog labels are English values: read them with useSettingsNavCopy()"))
    return hits


def read_list(path: Path) -> list[str]:
    if not path.exists():
        return []
    return [entry for entry in (l.split("#", 1)[0].strip() for l in path.read_text().splitlines()) if entry]


def message_at(root: Path, locale: str, dotted: str):
    """The message at `<namespace>.<path>` for a locale, or None."""
    import json

    namespace, *path = dotted.split(".")
    file = root / MESSAGES_DIR / locale / f"{namespace}.json"
    if not file.exists():
        return None
    node = json.loads(file.read_text(encoding="utf-8"))
    for part in path:
        if not isinstance(node, dict) or part not in node:
            return None
        node = node[part]
    return node


def defaults_file_hits(root: Path, rel: str, source: str, allowed: set[str], same_in_french: set[str]) -> list[str]:
    """A shared package's labels file: every default must be translated, and kept in English."""
    marker = DEFAULTS_MARKER.search(source)
    if not marker:
        return []
    target = marker.group(1)
    hits = []
    for entry in DEFAULTS_ENTRY.finditer(source):
        number = source.count("\n", 0, entry.start(1)) + 1
        key, default = entry.group(1), entry.group(3)
        french = message_at(root, "fr", f"{target}.{key}")
        english = message_at(root, "en", f"{target}.{key}")
        if not isinstance(french, str):
            hits.append(f"{rel}:{number}: « {default} » has no French message {target}.{key}")
        elif french == default and is_prose(re.sub(r"\{\w+\}", " ", default), allowed | same_in_french):
            hits.append(f"{rel}:{number}: « {default} » is left in English in fr {target}.{key}")
        if english != default:
            hits.append(f"{rel}:{number}: en {target}.{key} must be the default « {default} »")
    return hits


def scan_lines(rel: str, source: str, allowed: set[str], shared_package: bool = False) -> list[str]:
    """Hardcoded prose, line by line; a shared package also refuses default and fallback copy."""
    hits = []
    lines = source.splitlines()
    for number, line in enumerate(lines, 1):
        if COMMENT_LINE.match(line) or "i18n-ignore:" in line:
            continue
        found = [m.group(1) for m in JSX_TEXT.finditer(line)]
        bare = BARE_TEXT.match(line)
        if bare and not bare.group(1).rstrip().endswith(","):
            before = next((l.strip() for l in reversed(lines[: number - 1]) if l.strip()), "")
            after = next((l.strip() for l in lines[number:] if l.strip()), "")
            if before.endswith(">") or after.startswith("</"):
                found.append(bare.group(1))
        found += [m.group(2) for m in ATTRIBUTE.finditer(line)]
        found += [m.group(2) for m in PROPERTY.finditer(line)]
        found += [m.group(2) for m in TOAST.finditer(line)]
        if shared_package:
            found += [m.group(2) for m in DEFAULT_PARAMETER.finditer(line)]
            found += [m.group(2) for m in FALLBACK.finditer(line)]
            templates = [re.sub(r"\$\{[^}]*\}", " ", m.group(1)) for m in TEMPLATE.finditer(line)]
            found += [t for t in templates if not re.search(r"[():;<>=]|\bpx\b|\d(?:px|fr|rem|em|%)|\binset\b", t)]
        for text in found:
            if is_prose(text, allowed):
                hits.append(f"{rel}:{number}: {text.strip()[:100]}")
                break
    return hits


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument("--covered", action="append", help="check this folder or file instead of the covered list (repeatable)")
    args = parser.parse_args()
    root = Path(args.root)
    covered_file = root / "scripts/data/i18n-covered-dirs.txt"
    allowed_file = root / "scripts/data/i18n-allowed-terms.txt"
    covered = [l.split("#", 1)[0].strip() for l in covered_file.read_text().splitlines()] if covered_file.exists() else []
    covered = args.covered if args.covered else [c for c in covered if c]
    allowed = {l.split("#", 1)[0].strip() for l in allowed_file.read_text().splitlines()} if allowed_file.exists() else set()
    allowed.discard("")

    shared = read_list(root / "scripts/data/i18n-shared-packages.txt")
    same_in_french = set(read_list(root / "scripts/data/i18n-same-in-french.txt"))
    if args.covered:
        shared = [s for s in shared if any(s == c or s.startswith(c.rstrip("/") + "/") for c in args.covered)]

    hits: list[str] = []
    files = 0
    for entry in shared:
        base = root / entry
        for path in sorted(base.rglob("*.tsx")) + sorted(base.rglob("*.ts")):
            rel = path.relative_to(root).as_posix()
            if rel.endswith(SKIP_SUFFIXES) or "node_modules" in path.parts:
                continue
            files += 1
            source = path.read_text(encoding="utf-8")
            if DEFAULTS_MARKER.search(source):
                hits += defaults_file_hits(root, rel, source, allowed, same_in_french)
                continue
            hits += scan_lines(rel, source, allowed, shared_package=True)
    for entry in covered:
        base = root / entry
        candidates = [base] if base.is_file() else sorted(base.rglob("*.tsx")) + sorted(base.rglob("*.ts"))
        for path in candidates:
            rel = path.relative_to(root).as_posix()
            if rel.endswith(SKIP_SUFFIXES) or "node_modules" in path.parts:
                continue
            files += 1
            source = path.read_text(encoding="utf-8")
            if rel.endswith(".tsx"):
                hits += [f"{rel}:{number}: {message}" for number, message in english_emcn_defaults(source)]
            hits += [f"{rel}:{number}: {message}" for number, message in english_formatting(source)]
            hits += scan_lines(rel, source, allowed)
    for hit in hits:
        print(hit)
    if hits:
        print(f"check-i18n: FAILED ({len(hits)} hardcoded text(s) in {files} files)")
        return 1
    print(f"check-i18n: OK ({files} files in {len(covered)} covered folder(s) and {len(shared)} shared package(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
