"""Finds third-party brand names in Nexora's user-facing source.

Usage: python3 -I scripts/lib/check_brand.py [--root DIR] [--allowlist FILE]
Exit: 0 clean, 1 violations found.

Scope: the shipped user-facing code (see SCAN_DIRS). Comment lines, tests, fixtures and
generated files are skipped. Path prefixes and line patterns listed in the allowlist
(scripts/data/brand-allowlist.txt) are exempt; each entry there carries its reason.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SCAN_DIRS = [
    "workstudio/apps/sim",
    "workstudio/apps/realtime",
    "workstudio/packages/emcn",
    "services/nexora-api/api",
    "services/nexora-connect/src",
    "services/nexora-connect/web",
    "deploy",
]
EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".json", ".webmanifest", ".html", ".yml", ".yaml", ".txt", ".xml"}
SKIP_PARTS = {"node_modules", ".next", ".turbo", "__fixtures__", "fixtures", "generated", "__pycache__", "dist", "tests", "__tests__", "__integration__"}
SKIP_SUFFIXES = (".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx", ".integration.ts", ".live.test.ts", ".d.ts")
SKIP_NAMES = {"package.json", "bun.lock", "package-lock.json", "tsconfig.json", "CLAUDE.md", "AGENTS.md", "README.md", "UPSTREAM.md", "LICENSE", "NOTICE", "NOTICE.md"}

TERMS = [
    ("sim.ai", re.compile(r"(?<![A-Za-z0-9-])(?:[a-z0-9-]+\.)*sim\.ai\b")),
    ("simstudio", re.compile(r"simstudio", re.I)),
    ("Sim Studio", re.compile(r"Sim Studio")),
    ("Sim", re.compile(r"(?<![A-Za-z0-9_@./$#-])Sim(?![A-Za-z0-9_-])")),
    ("OOMOL", re.compile(r"\bOOMOL\b|oomol\.com|oomol-lab|\bOomol\b")),
    ("Etalab", re.compile(r"\b[Ee]talab\b|\bAlbert API\b|\bDINUM\b")),
    ("OpenGateLLM", re.compile(r"opengatellm", re.I)),
]
# L'entreprise s'appelle « Nexora AI » ; « Nexora » seul désigne la suite (WorkStudio, API, Connect). Ces phrases
# nomment l'entreprise : elles doivent dire « Nexora AI ».
COMPANY_FILES = ["README.md", "NOTICE", "THIRD_PARTY_NOTICES.md", "install.sh", "docs/guide"]
COMPANY_PHRASES = re.compile(
    r"\bNexora\*{0,2} (?:construit|développe|fournit|propose|publie|édite|s’appuie|s\'appuie|SAS|Inc\b|Labs|SARL)"
    r"|(?:modifiés|ajoutées?|écrits?|édité|développé|publié)s? par Nexora(?! AI)"
    r"|(?:équipe|société|entreprise) Nexora(?! AI)"
)
COMMENT_LINE = re.compile(r"^\s*(//|/\*|\*|#(?!!)|<!--)")


def load_allowlist(path: Path) -> tuple[list[str], list[re.Pattern[str]]]:
    prefixes: list[str] = []
    patterns: list[re.Pattern[str]] = []
    if not path.exists():
        return prefixes, patterns
    for raw in path.read_text(encoding="utf-8").splitlines():
        entry = raw.split("  #", 1)[0].strip()
        if not entry or entry.startswith("#"):
            continue
        if entry.startswith("line:"):
            patterns.append(re.compile(entry[5:].strip()))
        else:
            prefixes.append(entry.rstrip("/"))
    return prefixes, patterns


def in_scope(rel: str, path: Path, prefixes: list[str]) -> bool:
    if path.suffix not in EXTENSIONS or path.name in SKIP_NAMES:
        return False
    if any(part in SKIP_PARTS for part in path.parts) or rel.endswith(SKIP_SUFFIXES):
        return False
    return not any(rel == p or rel.startswith(p + "/") for p in prefixes)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument("--allowlist")
    parser.add_argument("--only", help="limit the scan to scan dirs starting with this prefix (e.g. workstudio)")
    args = parser.parse_args()
    root = Path(args.root)
    allowlist = Path(args.allowlist) if args.allowlist else root / "scripts/data/brand-allowlist.txt"
    prefixes, patterns = load_allowlist(allowlist)

    hits: list[str] = []
    files = 0
    for scan_dir in [d for d in SCAN_DIRS if not args.only or d.startswith(args.only)]:
        base = root / scan_dir
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            rel = path.relative_to(root).as_posix()
            if not in_scope(rel, path, prefixes):
                continue
            files += 1
            try:
                lines = path.read_text(encoding="utf-8").splitlines()
            except UnicodeDecodeError:
                continue
            for number, line in enumerate(lines, 1):
                if COMMENT_LINE.match(line) or any(p.search(line) for p in patterns):
                    continue
                for label, term in TERMS:
                    if term.search(line):
                        hits.append(f"{rel}:{number}: [{label}] {line.strip()[:160]}")
                        break

    for target in COMPANY_FILES:
        base = root / target
        company_files = sorted(base.rglob("*.md")) if base.is_dir() else [base]
        for path in company_files:
            if not path.is_file():
                continue
            files += 1
            for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
                if COMPANY_PHRASES.search(line):
                    hits.append(f"{path.relative_to(root).as_posix()}:{number}: [Nexora AI] {line.strip()[:160]}")

    for hit in hits:
        print(hit)
    if hits:
        print(f"check-brand: FAILED ({len(hits)} occurrence(s) in {files} files scanned)")
        return 1
    print(f"check-brand: OK ({files} files scanned)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
