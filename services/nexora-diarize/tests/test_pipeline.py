"""Real models, real voices: skipped unless NEXORA_DIARIZE_MODELS names a folder holding them (the image has them at /models)."""

import os
from pathlib import Path

import numpy as np
import pytest

from nexora_diarize.audio import DiarizeError, decode_audio
from nexora_diarize.pipeline import SAMPLE_RATE, Diarizer

MODELS = Path(os.environ.get("NEXORA_DIARIZE_MODELS", "/nonexistent"))
FIXTURE = Path(__file__).resolve().parents[3] / "docs" / "verification" / "k12-reunion"
needs_models = pytest.mark.skipif(not (MODELS / "segmentation.onnx").is_file(), reason="models absent (set NEXORA_DIARIZE_MODELS)")


@pytest.fixture(scope="module")
def meeting() -> np.ndarray:
    return decode_audio((FIXTURE / "reunion-courte.mp3").read_bytes())


@pytest.fixture(scope="module")
def reference() -> list[dict]:
    import json

    return json.loads((FIXTURE / "reunion-courte.reference.json").read_text())["segments"]


def test_decodes_an_mp3_to_sixteen_khz_mono(meeting):
    assert meeting.dtype == np.float32
    assert abs(len(meeting) / SAMPLE_RATE - 61.5) < 0.3


def test_refuses_bytes_that_are_not_audio():
    with pytest.raises(DiarizeError, match="not a readable recording"):
        decode_audio(b"this is not a recording")


def test_missing_models_are_named(tmp_path):
    with pytest.raises(FileNotFoundError, match="segmentation.onnx"):
        Diarizer(models_dir=tmp_path)


@needs_models
def test_silence_has_no_speaker():
    assert Diarizer(MODELS).diarize(np.zeros(SAMPLE_RATE * 5, dtype=np.float32), None) == []


@needs_models
def test_a_clip_shorter_than_half_a_second_has_no_speaker():
    assert Diarizer(MODELS).diarize(np.random.default_rng(1).normal(0, 0.1, SAMPLE_RATE // 4).astype(np.float32), None) == []


@needs_models
def test_three_voices_are_told_apart(meeting, reference):
    turns = Diarizer(MODELS).diarize(meeting, None)

    assert len({turn.speaker for turn in turns}) == 3
    # Each reference line is dominated by one detected speaker, and each voice by one reference name.
    voices: dict[str, dict[int, float]] = {}
    for line in reference:
        for turn in turns:
            overlap = min(line["end"], turn.end) - max(line["start"], turn.start)
            if overlap > 0:
                voices.setdefault(line["speaker"], {}).setdefault(turn.speaker, 0.0)
                voices[line["speaker"]][turn.speaker] += overlap
    dominant = {name: max(per_speaker, key=per_speaker.get) for name, per_speaker in voices.items()}
    assert len(set(dominant.values())) == 3, voices
    for name, per_speaker in voices.items():
        assert per_speaker[dominant[name]] / sum(per_speaker.values()) > 0.85, (name, per_speaker)


@needs_models
def test_the_speaker_count_given_by_the_caller_wins(meeting):
    assert len({turn.speaker for turn in Diarizer(MODELS).diarize(meeting, 1)}) == 1
    assert len({turn.speaker for turn in Diarizer(MODELS).diarize(meeting, 2)}) == 2


@needs_models
def test_turns_are_sorted_and_well_formed(meeting):
    turns = Diarizer(MODELS).diarize(meeting, None)

    assert turns == sorted(turns, key=lambda turn: turn.start)
    assert all(0 <= turn.start < turn.end <= 62 and turn.speaker >= 0 for turn in turns)
