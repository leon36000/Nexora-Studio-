"""Replaces the upstream Sim brand with Nexora in string and JSX text (comment lines untouched).

Usage: python3 -I scripts/codemods/rebrand.py <file>...
Rules (applied to non-comment lines only):
  - 'Sim Studio'                                  -> 'Nexora WorkStudio'
  - User-Agent 'Sim/1.0 (+https://sim.ai)' etc.   -> 'Nexora/1.0 (+<repo>)'
  - 'Simbot/1.0'                                  -> 'NexoraBot/1.0'
  - http(s)://(www.|app.)sim.ai[...] in examples  -> https://workstudio.example.com[...]
  - the word 'Sim' (not part of an identifier,
    package, path, header or env name)            -> 'Nexora'
"""
import re
import sys
from pathlib import Path

REPO = "https://github.com/leon36000/Nexora-Studio-"
COMMENT_LINE = re.compile(r"^\s*(//|/\*|\*|<!--)")
RULES = [
    (re.compile(r"Sim Studio"), "Nexora WorkStudio"),
    (re.compile(r"Simbot/(\d)"), r"NexoraBot/\1"),
    (re.compile(r"((?:Nexora|Sim|Simbot|NexoraBot)/\d[^'\"]*?)\(\+?https://(?:www\.)?sim\.ai/?\)"), rf"\1(+{REPO})"),
    (re.compile(r"https?://(?:www\.|app\.)?sim\.ai\b"), "https://workstudio.example.com"),
    (re.compile(r"(?<![A-Za-z0-9_@./$#-])Sim(?![A-Za-z0-9_-])"), "Nexora"),
]


def rewrite(text: str) -> tuple[str, int]:
    total = 0
    out = []
    for line in text.splitlines(keepends=True):
        if not COMMENT_LINE.match(line):
            for pattern, repl in RULES:
                line, n = pattern.subn(repl, line)
                total += n
        out.append(line)
    return "".join(out), total


def main() -> int:
    for name in sys.argv[1:]:
        path = Path(name)
        text = path.read_text(encoding="utf-8")
        new, count = rewrite(text)
        if count:
            path.write_text(new, encoding="utf-8")
            print(f"{count}\t{name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
