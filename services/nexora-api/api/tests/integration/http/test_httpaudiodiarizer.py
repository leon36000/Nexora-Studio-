from io import BytesIO

import httpx
import pytest
import respx

from api.domain.audio.diarization import SpeakerTurn
from api.domain.audio.entities import CreateAudioTranscriptionsFile
from api.domain.audio.errors import AudioDiarizationUnavailableError
from api.infrastructure.http import HttpAudioDiarizer

URL = "http://diarize:8001"


def _file() -> CreateAudioTranscriptionsFile:
    return CreateAudioTranscriptionsFile(name="reunion.wav", file=BytesIO(b"RIFF"), content_type="audio/wav", size=4)


@pytest.mark.asyncio(loop_scope="session")
class TestHttpAudioDiarizer:
    @respx.mock
    async def test_returns_the_speaker_turns_and_sends_the_speaker_count(self):
        route = respx.post(f"{URL}/diarize").mock(
            return_value=httpx.Response(
                200,
                json={"duration": 5.0, "speakers": 2, "turns": [{"start": 0.0, "end": 2.5, "speaker": 0}, {"start": 3.0, "end": 5.0, "speaker": 1}]},
            )
        )
        diarizer = HttpAudioDiarizer(url=URL, timeout=30)

        turns = await diarizer.diarize(file=_file(), num_speakers=2)

        assert turns == [SpeakerTurn(start=0.0, end=2.5, speaker=0), SpeakerTurn(start=3.0, end=5.0, speaker=1)]
        body = route.calls[0].request.content
        assert b'name="num_speakers"' in body and b"\r\n\r\n2\r\n" in body
        assert b'filename="reunion.wav"' in body

    @respx.mock
    async def test_omits_the_speaker_count_when_not_given(self):
        route = respx.post(f"{URL}/diarize").mock(return_value=httpx.Response(200, json={"duration": 1.0, "speakers": 1, "turns": []}))

        await HttpAudioDiarizer(url=URL, timeout=30).diarize(file=_file(), num_speakers=None)

        assert b'name="num_speakers"' not in route.calls[0].request.content

    @respx.mock
    async def test_reports_the_service_refusal_with_its_reason(self):
        respx.post(f"{URL}/diarize").mock(return_value=httpx.Response(422, json={"detail": "Le fichier n'est pas un enregistrement lisible."}))

        result = await HttpAudioDiarizer(url=URL, timeout=30).diarize(file=_file(), num_speakers=None)

        assert result == AudioDiarizationUnavailableError(reason="Le fichier n'est pas un enregistrement lisible.")

    @respx.mock
    async def test_reports_an_unreachable_service(self):
        respx.post(f"{URL}/diarize").mock(side_effect=httpx.ConnectError("refused"))

        result = await HttpAudioDiarizer(url=URL, timeout=30).diarize(file=_file(), num_speakers=None)

        assert isinstance(result, AudioDiarizationUnavailableError)
        assert "joignable" in result.reason or "unreachable" in result.reason

    @respx.mock
    async def test_reports_a_timeout(self):
        respx.post(f"{URL}/diarize").mock(side_effect=httpx.ReadTimeout("slow"))

        result = await HttpAudioDiarizer(url=URL, timeout=1).diarize(file=_file(), num_speakers=None)

        assert isinstance(result, AudioDiarizationUnavailableError)
        assert "timed out" in result.reason

    @respx.mock
    async def test_reports_an_answer_that_is_not_the_expected_shape(self):
        respx.post(f"{URL}/diarize").mock(return_value=httpx.Response(200, json={"oops": True}))

        result = await HttpAudioDiarizer(url=URL, timeout=30).diarize(file=_file(), num_speakers=None)

        assert isinstance(result, AudioDiarizationUnavailableError)
