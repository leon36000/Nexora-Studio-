from fastapi.testclient import TestClient

from nexora_diarize.app import DiarizeError, create_app
from nexora_diarize.pipeline import Turn


class FakeDiarizer:
    def __init__(self):
        self.calls: list[tuple[int, int | None]] = []

    def diarize(self, samples, num_speakers):
        self.calls.append((len(samples), num_speakers))
        return [Turn(start=0.0, end=1.0, speaker=0), Turn(start=1.5, end=2.5, speaker=1)]


def decode_two_seconds(data: bytes):
    if data == b"not audio":
        raise DiarizeError("the file is not a readable recording")
    return [0.0] * 32000


def make_client(diarizer=None, decode=decode_two_seconds, max_seconds=7200):
    app = create_app(diarizer=diarizer or FakeDiarizer(), decode=decode, max_seconds=max_seconds)
    return TestClient(app)


def test_health_says_ok_once_the_models_are_loaded():
    assert make_client().get("/health").json() == {"status": "ok"}


def test_diarize_answers_the_turns_and_the_number_of_speakers():
    diarizer = FakeDiarizer()
    response = make_client(diarizer).post("/diarize", files={"file": ("reunion.wav", b"RIFF", "audio/wav")}, data={"num_speakers": "2"})

    assert response.status_code == 200
    assert response.json() == {
        "duration": 2.0,
        "speakers": 2,
        "turns": [{"start": 0.0, "end": 1.0, "speaker": 0}, {"start": 1.5, "end": 2.5, "speaker": 1}],
    }
    assert diarizer.calls == [(32000, 2)]


def test_diarize_leaves_the_speaker_count_to_the_service_when_not_given():
    diarizer = FakeDiarizer()
    make_client(diarizer).post("/diarize", files={"file": ("reunion.wav", b"RIFF", "audio/wav")})

    assert diarizer.calls == [(32000, None)]


def test_a_file_that_is_not_audio_is_refused_with_the_reason():
    response = make_client().post("/diarize", files={"file": ("note.txt", b"not audio", "text/plain")})

    assert response.status_code == 422
    assert response.json() == {"detail": "the file is not a readable recording"}


def test_a_recording_longer_than_the_limit_is_refused():
    response = make_client(max_seconds=1).post("/diarize", files={"file": ("long.wav", b"RIFF", "audio/wav")})

    assert response.status_code == 422
    assert "too long" in response.json()["detail"]


def test_a_missing_file_is_refused():
    assert make_client().post("/diarize").status_code == 422


def test_a_speaker_count_outside_one_to_twenty_is_refused():
    client = make_client()

    for value in ("0", "21"):
        response = client.post("/diarize", files={"file": ("a.wav", b"RIFF", "audio/wav")}, data={"num_speakers": value})
        assert response.status_code == 422, value


def test_a_failure_of_the_diarizer_answers_a_clear_500():
    class Broken:
        def diarize(self, samples, num_speakers):
            raise RuntimeError("onnx exploded")

    response = make_client(Broken()).post("/diarize", files={"file": ("a.wav", b"RIFF", "audio/wav")})

    assert response.status_code == 500
    assert response.json() == {"detail": "the diarization failed"}
