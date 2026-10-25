"""Taux d'erreur de diarisation (DER) d'une hypothèse contre la référence de `k12_reunion.py`.

DER = (parole manquée + fausse alarme + confusion d'intervenants) / durée de parole de référence,
mesuré par trames de 10 ms, avec la correspondance optimale intervenants hypothèse -> référence
(méthode hongroise exacte par énumération : 3 à 6 intervenants). Sans marge de tolérance autour
des frontières (le plus sévère ; la mesure usuelle accorde 250 ms). La parole superposée n'existe pas
dans ce test : une seule étiquette par trame.

Usage : python3 -I scripts/verification/k12_der.py reference.json hypothese.json [--collar 0]
hypothese.json : {"segments": [{"speaker": "...", "start": s, "end": s}, ...]}
Bibliothèque standard seulement.
"""
from __future__ import annotations

import argparse
import itertools
import json
import sys

FRAME = 0.01


def frames(segments: list[dict], total: int) -> list[str | None]:
    labels: list[str | None] = [None] * total
    for segment in segments:
        for index in range(int(round(segment["start"] / FRAME)), min(total, int(round(segment["end"] / FRAME)))):
            labels[index] = segment["speaker"]
    return labels


def der(reference: list[dict], hypothesis: list[dict], collar: float = 0.0) -> dict:
    total = int(round(max(s["end"] for s in [*reference, *hypothesis]) / FRAME)) + 1
    ref, hyp = frames(reference, total), frames(hypothesis, total)
    if collar > 0:  # frames within `collar` s of a reference boundary are ignored
        skip = set()
        width = int(round(collar / FRAME))
        for segment in reference:
            for edge in (segment["start"], segment["end"]):
                centre = int(round(edge / FRAME))
                skip.update(range(max(0, centre - width), min(total, centre + width + 1)))
    else:
        skip = set()
    ref_names = sorted({x for x in ref if x})
    hyp_names = sorted({x for x in hyp if x})
    counts: dict[tuple[str, str], int] = {}
    for index in range(total):
        if index in skip or not ref[index] or not hyp[index]:
            continue
        counts[(ref[index], hyp[index])] = counts.get((ref[index], hyp[index]), 0) + 1
    best, best_map = -1, {}
    pool = hyp_names + [None] * len(ref_names)
    for chosen in itertools.permutations(pool, len(ref_names)):
        matched = sum(counts.get((r, h), 0) for r, h in zip(ref_names, chosen) if h)
        if matched > best:
            best, best_map = matched, {h: r for r, h in zip(ref_names, chosen) if h}
    speech = missed = false_alarm = confusion = 0
    for index in range(total):
        if index in skip:
            continue
        r, h = ref[index], hyp[index]
        if r:
            speech += 1
        if r and not h:
            missed += 1
        elif h and not r:
            false_alarm += 1
        elif r and h and best_map.get(h) != r:
            confusion += 1
    return {
        "der": round((missed + false_alarm + confusion) / speech, 4),
        "missed": round(missed / speech, 4),
        "false_alarm": round(false_alarm / speech, 4),
        "confusion": round(confusion / speech, 4),
        "speech_seconds": round(speech * FRAME, 1),
        "speakers_reference": len(ref_names),
        "speakers_hypothesis": len(hyp_names),
        "mapping": best_map,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("reference")
    parser.add_argument("hypothesis")
    parser.add_argument("--collar", type=float, default=0.0)
    args = parser.parse_args()
    reference = json.load(open(args.reference))["segments"]
    hypothesis = json.load(open(args.hypothesis))["segments"]
    print(json.dumps(der(reference, hypothesis, args.collar), ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
