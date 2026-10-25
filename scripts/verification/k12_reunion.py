"""Fabrique l'enregistrement de test K12 : une réunion de dix minutes à trois voix, et sa référence.

Chaque réplique de `k12_reunion_script.py` est synthétisée par une voix française locale
(speaches, `/v1/audio/speech`) puis les répliques sont mises bout à bout avec de courts silences.
La référence (qui parle quand) est exacte par construction ; elle sert à mesurer le taux d'erreur
de diarisation (`k12_der.py`). Bibliothèque standard seulement.

Usage : python3 -I scripts/verification/k12_reunion.py --speaches http://127.0.0.1:8000 --out DOSSIER
Écrit : reunion.wav (16 kHz mono), reference.json, reference.rttm, texte.txt.
"""
from __future__ import annotations

import argparse
import io
import json
import random
import sys
import urllib.request
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from k12_reunion_script import TURNS  # noqa: E402

SAMPLE_RATE = 16000
# Trois voix de Piper : une femme (siwis), un homme (gilles), une seconde femme au timbre différent (upmc).
VOICES = {
    "Marie": ("speaches-ai/piper-fr_FR-siwis-medium", "siwis"),
    "Paul": ("speaches-ai/piper-fr_FR-gilles-low", "gilles"),
    "Claire": ("speaches-ai/piper-fr_FR-upmc-medium", "upmc"),
}


def speak(base: str, speaker: str, text: str) -> bytes:
    model, voice = VOICES[speaker]
    body = json.dumps({"model": model, "voice": voice, "input": text, "response_format": "wav",
                       "sample_rate": SAMPLE_RATE, "speed": 0.93}).encode()
    request = urllib.request.Request(f"{base}/v1/audio/speech", data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=300) as response:
        return response.read()


def pcm_of(wav_bytes: bytes) -> bytes:
    with wave.open(io.BytesIO(wav_bytes)) as wav:
        if (wav.getframerate(), wav.getnchannels(), wav.getsampwidth()) != (SAMPLE_RATE, 1, 2):
            raise SystemExit(f"format inattendu : {wav.getframerate()} Hz, {wav.getnchannels()} voie(s)")
        return wav.readframes(wav.getnframes())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--speaches", default="http://127.0.0.1:8000")
    parser.add_argument("--out", required=True)
    parser.add_argument("--seed", type=int, default=12)
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rng = random.Random(args.seed)

    pcm = bytearray()
    segments: list[dict] = []
    for index, (speaker, text) in enumerate(TURNS):
        audio = pcm_of(speak(args.speaches.rstrip("/"), speaker, text))
        # Un silence de 0,6 à 1,4 s entre deux répliques, comme dans une conversation posée.
        gap = int(SAMPLE_RATE * rng.uniform(0.6, 1.4)) * 2
        start = len(pcm) / 2 / SAMPLE_RATE
        pcm += audio
        segments.append({"speaker": speaker, "start": round(start, 3), "end": round(len(pcm) / 2 / SAMPLE_RATE, 3), "text": text})
        pcm += b"\x00" * gap
        print(f"\r{index + 1}/{len(TURNS)}", end="", file=sys.stderr)
    print(file=sys.stderr)

    with wave.open(str(out / "reunion.wav"), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(bytes(pcm))
    duration = len(pcm) / 2 / SAMPLE_RATE
    (out / "reference.json").write_text(json.dumps({"duration": round(duration, 3), "segments": segments}, ensure_ascii=False, indent=1))
    (out / "reference.rttm").write_text("".join(
        f"SPEAKER reunion 1 {s['start']:.3f} {s['end'] - s['start']:.3f} <NA> <NA> {s['speaker']} <NA> <NA>\n" for s in segments))
    (out / "texte.txt").write_text(" ".join(t for _, t in TURNS) + "\n")
    print(f"{out / 'reunion.wav'} : {duration / 60:.1f} min, {len(segments)} répliques, 3 voix")
    return 0


if __name__ == "__main__":
    sys.exit(main())
