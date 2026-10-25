import logging

import httpx
from pydantic import ValidationError

from api.domain import BaseModel
from api.domain.audio import AudioDiarizer
from api.domain.audio.diarization import SpeakerTurn
from api.domain.audio.entities import CreateAudioTranscriptionsFile
from api.domain.audio.errors import AudioDiarizationUnavailableError

logger = logging.getLogger(__name__)


class _DiarizeAnswer(BaseModel):
    turns: list[SpeakerTurn]


class HttpAudioDiarizer(AudioDiarizer):
    """Asks the Nexora diarization service (`POST {url}/diarize`) who speaks when."""

    def __init__(self, url: str, timeout: int):
        self.url = url.rstrip("/")
        self.timeout = timeout

    async def diarize(self, file: CreateAudioTranscriptionsFile, num_speakers: int | None) -> list[SpeakerTurn] | AudioDiarizationUnavailableError:
        form = {"num_speakers": str(num_speakers)} if num_speakers is not None else {}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.url}/diarize",
                    data=form,
                    files={"file": (file.name, file.file, file.content_type)},
                )
        except httpx.TimeoutException:
            return AudioDiarizationUnavailableError(reason=f"the diarization service timed out after {self.timeout} s")
        except httpx.TransportError:
            return AudioDiarizationUnavailableError(reason="the diarization service is unreachable")

        if response.status_code != 200:
            return AudioDiarizationUnavailableError(reason=_reason(response))

        try:
            return _DiarizeAnswer.model_validate(response.json()).turns
        except (ValidationError, ValueError):
            logger.error("The diarization service answered an unexpected body: %s", response.text[:200])
            return AudioDiarizationUnavailableError(reason="the diarization service answered in an unexpected format")


def _reason(response: httpx.Response) -> str:
    try:
        detail = response.json().get("detail")
    except (ValueError, AttributeError):
        detail = None
    return detail if isinstance(detail, str) and detail else f"the diarization service answered HTTP {response.status_code}"
