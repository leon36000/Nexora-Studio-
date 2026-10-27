"""Cherche pourquoi un module lourd se retrouve dans le JavaScript d'une route : chaînes d'imports vers la cible.

Usage : python3 -I scripts/verification/chaine-import.py <graphe.jsonl> <fragment-du-module> [fragment …]
Le graphe vient de `next analyze -o` puis `next analyze export workstudio/apps/sim --route "/login" > graphe.jsonl`
(`bun run --cwd workstudio/apps/sim next analyze -o`, ~6 min et plusieurs Go sous .next/diagnostics/analyze : à supprimer après).
Seuls les modules des chunks navigateur de la route sont parcourus, à rebours depuis chaque cible ; chaque ligne
est une chaîne d'imports la plus courte vers un module « racine » (que personne d'autre ne charge dans la route).
"""
from __future__ import annotations

import collections
import json
import sys

path, needles = sys.argv[1], sys.argv[2:]

in_route: set[str] = set()
dependencies: dict[str, dict] = {}
with open(path, encoding="utf8") as handle:
    for line in handle:
        record = json.loads(line)
        if record["type"] == "output" and "/static/chunks/" in record["filename"]:
            in_route.update(record["modules"])
        elif record["type"] == "module" and "[app-client]" in record["ident"]:
            dependencies[record["ident"]] = record.get("dependencies") or {}

imported_by: dict[str, set[str]] = collections.defaultdict(set)
for ident, deps in dependencies.items():
    if ident not in in_route:
        continue
    for kind in ("sync", "async"):
        for dependency in deps.get(kind, []):
            if dependency in in_route:
                imported_by[dependency].add(ident)


def short(ident: str) -> str:
    return ident.replace("[project]/", "").replace(" [app-client] (ecmascript)", "")


for needle in needles:
    targets = [m for m in in_route if needle in m]
    print(f"== {needle} ({len(targets)} module(s) dans la route)")
    if not targets:
        continue
    target = sorted(targets, key=len)[0]
    seen = {target}
    queue = collections.deque([[target]])
    shown = 0
    while queue and shown < 6:
        chain = queue.popleft()
        parents = [p for p in imported_by.get(chain[-1], ()) if p not in seen]
        if not chain[-1] == target and not imported_by.get(chain[-1]):
            print("  " + " <- ".join(short(m)[-70:] for m in chain[:9]))
            shown += 1
        for parent in parents:
            seen.add(parent)
            queue.append([*chain, parent])
