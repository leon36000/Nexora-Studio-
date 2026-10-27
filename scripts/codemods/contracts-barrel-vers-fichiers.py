"""Remplace les imports de valeurs du barrel `@/lib/api/contracts` par l'import du fichier de contrat concerné.

Pourquoi : `export *` du barrel défait l'élagage — chaque page qui importe un seul contrat embarque les schémas Zod
de tous les autres (la page de connexion en chargeait plus de 150 Ko). Les imports de types seuls (`import type`)
sont effacés à la compilation et restent tels quels.

Usage : python3 -I scripts/codemods/contracts-barrel-vers-fichiers.py [--ecrire]   (sans option : liste ce qui changerait)
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "workstudio/apps/sim"
CONTRACTS = ROOT / "lib/api/contracts"
BARREL = "@/lib/api/contracts"
SKIP_PREFIXES = ("app/api/", "lib/api/contracts/", "lib/api/server/", "lib/internal/", "lib/function-execution/")

EXPORT = re.compile(r"^export\s+(?:declare\s+)?(?:const|function|class|enum|type|interface|let|var)\s+([A-Za-z0-9_$]+)", re.M)
EXPORT_LIST = re.compile(r"^export\s*(?:type\s*)?\{([^}]*)\}", re.M)


def module_exports(path: Path) -> set[str]:
    text = path.read_text(encoding="utf8")
    names = set(EXPORT.findall(text))
    for block in EXPORT_LIST.findall(text):
        for item in block.split(","):
            item = item.strip()
            if item:
                names.add(item.split(" as ")[-1].replace("type ", "").strip())
    return names


def build_map() -> dict[str, str]:
    index = (CONTRACTS / "index.ts").read_text(encoding="utf8")
    mapping: dict[str, str] = {}
    for target in re.findall(r"^export \* from '\./([^']+)'", index, re.M):
        file = CONTRACTS / f"{target}.ts"
        if not file.exists():
            file = CONTRACTS / target / "index.ts"
        if not file.exists():
            continue
        for name in module_exports(file):
            mapping.setdefault(name, target)
    return mapping


IMPORT = re.compile(r"import\s*\{([^}]*)\}\s*from\s*'" + re.escape(BARREL) + r"'\s*\n", re.S)


def rewrite(text: str, mapping: dict[str, str]) -> str:
    def replace(match: re.Match[str]) -> str:
        whole = match.group(0)
        if whole.lstrip().startswith("import type"):
            return whole
        groups: dict[str, list[str]] = {}
        for raw in match.group(1).split(","):
            item = raw.strip()
            if not item:
                continue
            name = re.sub(r"^type\s+", "", item).split(" as ")[0].strip()
            target = mapping.get(name)
            if target is None:
                return whole
            groups.setdefault(target, []).append(item)
        lines = []
        for target in sorted(groups):
            members = ", ".join(sorted(groups[target]))
            lines.append(f"import {{ {members} }} from '{BARREL}/{target}'\n")
        return "".join(lines)

    return IMPORT.sub(replace, text)


def main() -> None:
    write = "--ecrire" in sys.argv
    mapping = build_map()
    changed = 0
    for path in sorted(ROOT.rglob("*.ts*")):
        relative = path.relative_to(ROOT).as_posix()
        if relative.startswith(SKIP_PREFIXES) or ".test." in relative or "node_modules" in relative or relative.startswith(".next"):
            continue
        text = path.read_text(encoding="utf8")
        if BARREL + "'" not in text:
            continue
        new = rewrite(text, mapping)
        if new != text:
            changed += 1
            print(relative)
            if write:
                path.write_text(new, encoding="utf8")
    print(f"{changed} fichier(s)")


if __name__ == "__main__":
    main()
