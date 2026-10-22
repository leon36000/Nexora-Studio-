"""Rewrites literal Sim documentation links into docsUrl() calls.

Usage: python3 -I scripts/codemods/docs_url.py <file>...
'https://docs.sim.ai/tools/slack' -> docsUrl('/tools/slack'), and adds the import.
Only whole string literals are rewritten; links inside longer strings are reported.
"""
import re
import sys
from pathlib import Path

LITERAL = re.compile(r"""(['"])https://docs\.sim\.ai(/[^'"\s]*)?\1""")
IMPORT = "import { docsUrl } from '@/lib/branding/docs-url'\n"
DIRECTIVE = re.compile(r"""^\s*['"]use (client|server)['"];?\s*$""")


def add_import(text: str) -> str:
    if "from '@/lib/branding/docs-url'" in text:
        return text
    lines = text.splitlines(keepends=True)
    index = 0
    while index < len(lines) and (DIRECTIVE.match(lines[index]) or not lines[index].strip()):
        index += 1
    return "".join(lines[:index]) + IMPORT + "".join(lines[index:])


def main() -> int:
    leftovers = 0
    for name in sys.argv[1:]:
        path = Path(name)
        text = path.read_text(encoding="utf-8")
        new, count = LITERAL.subn(lambda m: f"docsUrl('{m.group(2) or ''}')" if m.group(2) else "docsUrl()", text)
        if count:
            new = add_import(new)
            path.write_text(new, encoding="utf-8")
        rest = new.count("docs.sim.ai")
        leftovers += rest
        print(f"{name}: {count} rewritten, {rest} left")
    return 0


if __name__ == "__main__":
    sys.exit(main())
