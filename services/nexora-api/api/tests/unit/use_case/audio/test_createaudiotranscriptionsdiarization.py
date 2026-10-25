from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, create_autospec

import pytest

from api.domain.audio import AudioDiarizer
from api.domain.audio.diarization import SpeakerTurn, TimedWord
from api.domain.audio.entities import (
    AudioTranscriptions,
    AudioTranscriptionsResponseFormat,
    CreateAudioTranscriptionsFile,
    CreateAudioTranscriptionsForm,
)
from api.domain.audio.errors import AudioDiarizationUnavailableError
from api.domain.provider.entities import ProviderEndpoint, ProviderResponse
from api.domain.router.entities import RouterRateLimitState, RouterType
from api.domain.usage import UsageContext, UsageRepository
from api.tests.unit.use_case.factories import AuthenticatedUserFactory, KeyFactory, RouterFactory
from api.use_cases.audio import CreateAudioTranscriptionsCommand, CreateAudioTranscriptionsJsonUseCaseSuccess, CreateAudioTranscriptionsUseCase

TRACE_ID = "c" * 32
WORDS = [TimedWord(start=0.0, end=0.5, word=" Bonjour"), TimedWord(start=3.0, end=3.5, word=" Salut")]
TURNS = [SpeakerTurn(start=0.0, end=1.0, speaker=9), SpeakerTurn(start=3.0, end=4.0, speaker=2)]


@pytest.fixture
def mock_audio_diarizer():
    diarizer = create_autospec(AudioDiarizer, instance=True, spec_set=True)
    diarizer.diarize.return_value = TURNS
    return diarizer


@pytest.fixture
def router():
    return RouterFactory(id=1, name="audio-router", type=RouterType.AUTOMATIC_SPEECH_RECOGNITION, providers=1)


@pytest.fixture
def admin_user():
    return AuthenticatedUserFactory(id=1, admin=True)


@pytest.fixture
def make_command(admin_user):
    def _make(response_format, num_speakers=None):
        audio = BytesIO(b"audio-bytes")
        return CreateAudioTranscriptionsCommand(
            payload=CreateAudioTranscriptionsForm(
                file=CreateAudioTranscriptionsFile(name="reunion.wav", file=audio, content_type="audio/wav", size=11),
                model="audio-router",
                language=None,
                prompt="",
                response_format=response_format,
                temperature=0.0,
                num_speakers=num_speakers,
            ),
            authenticated_user=admin_user,
            authenticated_key=KeyFactory(),
        )

    return _make


def _use_case(audio_diarizer) -> CreateAudioTranscriptionsUseCase:
    tokenizer = MagicMock()
    tokenizer.compute_tokens.side_effect = lambda texts: len(texts)
    usage_repository = create_autospec(UsageRepository, instance=True, spec_set=True)
    usage_repository.start_record.return_value = TRACE_ID
    return CreateAudioTranscriptionsUseCase(
        model_environmental_impacts_computer=MagicMock(),
        model_tokenizer=tokenizer,
        provider_client=AsyncMock(),
        provider_load_balancer=AsyncMock(),
        provider_metrics_logger=AsyncMock(),
        provider_repository=AsyncMock(),
        router_rate_limiter=AsyncMock(),
        router_repository=AsyncMock(),
        usage_context=create_autospec(UsageContext, instance=True, spec_set=True),
        usage_repository=usage_repository,
        audio_diarizer=audio_diarizer,
    )


def _wire(use_case, router, transcription: AudioTranscriptions):
    use_case._resolve_router = AsyncMock(return_value=router)
    use_case._check_rate_limits = AsyncMock(return_value=RouterRateLimitState.admin_rate_limit_state())
    use_case._send_to_provider = AsyncMock(return_value=ProviderResponse(data=transcription))


class TestDiarizedTranscription:
    @pytest.mark.asyncio
    async def test_should_label_the_segments_with_the_speakers_of_the_diarizer(self, mock_audio_diarizer, router, make_command):
        # Arrange
        use_case = _use_case(mock_audio_diarizer)
        _wire(use_case, router, AudioTranscriptions(id="t", text="Bonjour Salut", model="audio-router", words=WORDS))
        command = make_command(AudioTranscriptionsResponseFormat.DIARIZED_JSON, num_speakers=2)

        # Act
        result = await use_case.execute(command=command)

        # Assert
        assert isinstance(result, CreateAudioTranscriptionsJsonUseCaseSuccess)
        assert [(s.speaker, s.text) for s in result.data.segments] == [("speaker_1", "Bonjour"), ("speaker_2", "Salut")]
        assert result.data.words is None
        mock_audio_diarizer.diarize.assert_awaited_once()
        assert mock_audio_diarizer.diarize.await_args.kwargs["num_speakers"] == 2

    @pytest.mark.asyncio
    async def test_should_rewind_the_file_so_the_provider_reads_it_whole(self, mock_audio_diarizer, router, make_command):
        # Arrange: the diarizer reads the upload to its end
        async def read_all(file, num_speakers):
            file.file.read()
            return TURNS

        mock_audio_diarizer.diarize.side_effect = read_all
        use_case = _use_case(mock_audio_diarizer)
        _wire(use_case, router, AudioTranscriptions(id="t", text="Bonjour", model="audio-router", words=WORDS))
        command = make_command(AudioTranscriptionsResponseFormat.DIARIZED_JSON)

        # Act
        await use_case.execute(command=command)

        # Assert
        assert command.payload.file.file.tell() == 0

    @pytest.mark.asyncio
    async def test_should_refuse_before_any_work_when_no_diarizer_is_configured(self, router, make_command):
        # Arrange
        use_case = _use_case(None)
        _wire(use_case, router, AudioTranscriptions(id="t", text="x", model="audio-router"))

        # Act
        result = await use_case.execute(command=make_command(AudioTranscriptionsResponseFormat.DIARIZED_JSON))

        # Assert
        assert isinstance(result, AudioDiarizationUnavailableError)
        use_case._resolve_router.assert_not_awaited()
        use_case._send_to_provider.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_should_not_call_the_provider_when_the_diarizer_fails(self, mock_audio_diarizer, router, make_command):
        # Arrange
        mock_audio_diarizer.diarize.return_value = AudioDiarizationUnavailableError(reason="timeout")
        use_case = _use_case(mock_audio_diarizer)
        _wire(use_case, router, AudioTranscriptions(id="t", text="x", model="audio-router"))

        # Act
        result = await use_case.execute(command=make_command(AudioTranscriptionsResponseFormat.DIARIZED_JSON))

        # Assert
        assert result == AudioDiarizationUnavailableError(reason="timeout")
        use_case._send_to_provider.assert_not_awaited()

    @pytest.mark.asyncio
    @pytest.mark.parametrize("response_format", [AudioTranscriptionsResponseFormat.JSON, AudioTranscriptionsResponseFormat.VERBOSE_JSON])
    async def test_should_not_call_the_diarizer_for_other_formats(self, mock_audio_diarizer, router, make_command, response_format):
        # Arrange
        use_case = _use_case(mock_audio_diarizer)
        _wire(use_case, router, AudioTranscriptions(id="t", text="Bonjour", model="audio-router"))

        # Act
        result = await use_case.execute(command=make_command(response_format))

        # Assert
        assert isinstance(result, CreateAudioTranscriptionsJsonUseCaseSuccess)
        mock_audio_diarizer.diarize.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_should_fall_back_on_the_segments_when_the_provider_gives_no_words(self, mock_audio_diarizer, router, make_command):
        # Arrange
        from api.domain.audio.entities import Segment

        segments = [Segment(id=0, text=" Bonjour", start=0.0, end=0.5), Segment(id=1, text=" Salut", start=3.0, end=3.5)]
        use_case = _use_case(mock_audio_diarizer)
        _wire(use_case, router, AudioTranscriptions(id="t", text="Bonjour Salut", model="audio-router", segments=segments))

        # Act
        result = await use_case.execute(command=make_command(AudioTranscriptionsResponseFormat.DIARIZED_JSON))

        # Assert
        assert [(s.speaker, s.text) for s in result.data.segments] == [("speaker_1", "Bonjour"), ("speaker_2", "Salut")]


def test_endpoint_constant_still_targets_audio_transcriptions():
    assert CreateAudioTranscriptionsUseCase.ENDPOINT == ProviderEndpoint.AUDIO_TRANSCRIPTIONS
