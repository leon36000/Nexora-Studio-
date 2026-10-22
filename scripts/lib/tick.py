"""Tick every checkbox of a plan section: python3 -I scripts/lib/tick.py <plan.md> "<heading prefix>" [item substring]."""
import sys
from pathlib import Path

plan, heading = Path(sys.argv[1]), sys.argv[2]
item = sys.argv[3] if len(sys.argv) > 3 else None
lines = plan.read_text().splitlines(keepends=True)
inside = False
count = 0
for i, line in enumerate(lines):
    if line.startswith("## "):
        inside = line[3:].startswith(heading)
        continue
    if inside and line.lstrip().startswith("- [ ]") and (item is None or item in line):
        lines[i] = line.replace("- [ ]", "- [x]", 1)
        count += 1
plan.write_text("".join(lines))
print(f"ticked {count}")
