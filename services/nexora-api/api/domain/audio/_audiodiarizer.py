from abc import ABC, abstractmethod

from api.domain.audio.diarization import SpeakerTurn
from api.domain.audio.entities import CreateAudioTranscriptionsFile
from api.domain.audio.errors import AudioDiarizationUnavailableError


class AudioDiarizer(ABC):
    @abstractmethod
    async def diarize(self, file: CreateAudioTranscriptionsFile, num_speakers: int | None) -> list[SpeakerTurn] | AudioDiarizationUnavailableError:
        """Who speaks when in a recording: speaker turns, or why the diarization service cannot answer."""
