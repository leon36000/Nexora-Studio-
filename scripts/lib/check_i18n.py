"""Finds hardcoded interface prose in the source folders declared as translated.

Usage: python3 -I scripts/lib/check_i18n.py [--root DIR]
Exit: 0 clean, 1 hardcoded text found.

Covered folders: scripts/data/i18n-covered-dirs.txt (grows as areas are translated).
Allowed terms (product and brand names shown as-is): scripts/data/i18n-allowed-terms.txt.
A line can be exempted with a trailing `// i18n-ignore: <reason>` comment.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SKIP_SUFFIXES = (".test.ts", ".test.tsx", ".dom.test.tsx", ".integration.ts", ".d.ts", ".stories.tsx")
COMMENT_LINE = re.compile(r"^\s*(//|/\*|\*)")
JSX_TEXT = re.compile(r">([^<>{}`]*?)<")
ATTRIBUTE = re.compile(r"\b(?:placeholder|title|aria-label|alt|label|tooltip|description)=(['\"])(.*?)\1")
PROPERTY = re.compile(r"\b(?:label|title|description|placeholder|tooltip|emptyText|heading|subtitle|confirmText|cancelText|buttonText)\s*:\s*(['\"])(.*?)\1")
TOAST = re.compile(r"\btoast(?:\.\w+)?\(\s*(['\"])(.*?)\1")
BARE_TEXT = re.compile(r"^\s*([A-ZÀ-Ö][^=;(){}<>`$|&]*?)\s*$")
WORD = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]{2,}")
CODE_LIKE = re.compile(r"^[\w./:@#$%&*+=?\-\[\](),;|^~!]*$|^(GET|POST|PUT|PATCH|DELETE)\s+/")


def is_prose(text: str, allowed: set[str]) -> bool:
    text = text.strip()
    if not text or not WORD.search(text):
        return False
    if " " not in text and (CODE_LIKE.match(text) and not re.match(r"^[A-ZÀ-Ö][a-zà-ÿ]+$", text)):
        return False  # identifiers, paths, keys
    if CODE_LIKE.match(text.split(" ", 1)[0]) and re.match(r"^(GET|POST|PUT|PATCH|DELETE)\s+/", text):
        return False
    if text.startswith("&") or text in allowed:
        return False
    words = WORD.findall(text)
    return not all(w in allowed or w.isupper() for w in words)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    args = parser.parse_args()
    root = Path(args.root)
    covered_file = root / "scripts/data/i18n-covered-dirs.txt"
    allowed_file = root / "scripts/data/i18n-allowed-terms.txt"
    covered = [l.split("#", 1)[0].strip() for l in covered_file.read_text().splitlines()] if covered_file.exists() else []
    covered = [c for c in covered if c]
    allowed = {l.split("#", 1)[0].strip() for l in allowed_file.read_text().splitlines()} if allowed_file.exists() else set()
    allowed.discard("")

    hits: list[str] = []
    files = 0
    for entry in covered:
        base = root / entry
        candidates = [base] if base.is_file() else sorted(base.rglob("*.tsx")) + sorted(base.rglob("*.ts"))
        for path in candidates:
            rel = path.relative_to(root).as_posix()
            if rel.endswith(SKIP_SUFFIXES) or "node_modules" in path.parts:
                continue
            files += 1
            lines = path.read_text(encoding="utf-8").splitlines()
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
                for text in found:
                    if is_prose(text, allowed):
                        hits.append(f"{rel}:{number}: {text.strip()[:100]}")
                        break
    for hit in hits:
        print(hit)
    if hits:
        print(f"check-i18n: FAILED ({len(hits)} hardcoded text(s) in {files} files)")
        return 1
    print(f"check-i18n: OK ({files} files in {len(covered)} covered folder(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
