"""Poids de code par paquet des chunks JavaScript qu'une page charge (cartes source du build de production).
Les octets sont ceux du code généré attribué à chaque source par les correspondances de la carte (donc après
élagage des exports inutilisés), pas la taille des fichiers sources.

Usage : python3 -I scripts/verification/analyse-bundles.py <url-de-la-page> [nombre-de-lignes] [--chunks DOSSIER]
        COOKIE='nom=valeur' pour une page derrière la connexion.
Le dossier des chunks est celui du build local (workstudio/apps/sim/.next/static/chunks) ; la page
peut venir d'une instance qui sert ce même build. Les tailles sont celles du code source embarqué
(après minification, avant compression) : elles servent à repérer les paquets lourds, pas à mesurer le transfert.
"""
from __future__ import annotations

import collections
import json
import os
import re
import sys
import urllib.request

B64 = {c: i for i, c in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/")}


def generated_bytes_per_source(mappings: str, line_lengths: list[int], count: int) -> list[int]:
    """Attribue à chaque source les caractères générés que ses segments couvrent (décodage VLQ de la carte)."""
    sizes = [0] * count
    source = 0
    for line_index, line in enumerate(mappings.split(";")):
        column = 0
        previous: tuple[int, int] | None = None  # (source, colonne générée de départ)
        for segment in line.split(",") if line else []:
            values = []
            shift = value = 0
            for char in segment:
                digit = B64[char]
                value += (digit & 31) << shift
                if digit & 32:
                    shift += 5
                else:
                    values.append(-(value >> 1) if value & 1 else value >> 1)
                    shift = value = 0
            column += values[0]
            if previous is not None:
                sizes[previous[0]] += max(0, column - previous[1])
            if len(values) >= 4:
                source += values[1]
                previous = (source, column)
            else:
                previous = None
        end = line_lengths[line_index] if line_index < len(line_lengths) else 0
        if previous is not None:
            sizes[previous[0]] += max(0, end - previous[1])
    return sizes

args = [a for a in sys.argv[1:] if not a.startswith("--")]
chunks_dir = "workstudio/apps/sim/.next/static/chunks/"
if "--chunks" in sys.argv:
    chunks_dir = sys.argv[sys.argv.index("--chunks") + 1].rstrip("/") + "/"
    args = [a for a in args if a != chunks_dir.rstrip("/")]
url = args[0]
limit = int(args[1]) if len(args) > 1 else 25

request = urllib.request.Request(url, headers={"Cookie": os.environ.get("COOKIE", ""), "Accept-Encoding": "identity"})
html = urllib.request.urlopen(request).read().decode()
chunks = sorted(set(re.findall(r"/_next/static/chunks/([^\"\\\s?]+\.js)", html)))

by_package: collections.Counter[str] = collections.Counter()
total_bytes = 0
for chunk in chunks:
    path = chunks_dir + chunk
    if not os.path.exists(path):
        continue
    total_bytes += os.path.getsize(path)
    with open(path, encoding="utf8", errors="ignore") as handle:
        text = handle.read()
    found = re.search(r"sourceMappingURL=(\S+)", text[-300:])
    if not found or not os.path.exists(chunks_dir + found.group(1)):
        continue
    with open(chunks_dir + found.group(1), encoding="utf8") as handle:
        source_map = json.load(handle)
    sizes = generated_bytes_per_source(
        source_map["mappings"], [len(line) for line in text.split("\n")], len(source_map["sources"])
    )
    for source, size in zip(source_map["sources"], sizes):
        package = re.search(r"node_modules/(?:\.bun/[^/]+/node_modules/)?((?:@[^/]+/)?[^/]+)", source)
        if package:
            key = package.group(1)
        else:
            key = re.sub(r"turbopack:///", "", source)
            if not os.environ.get("FULL"):
                key = re.sub(r"^(apps/sim/[^/]+/[^/]+).*", r"\1", key)
        by_package[key] += size

print(f"{len(chunks)} chunks, {total_bytes} octets de JavaScript minifié")
for key, size in by_package.most_common(limit):
    print(f"{size:>9} {key}")
