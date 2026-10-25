from unittest.mock import AsyncMock, MagicMock, create_autospec

import pytest

from api.domain.audio.entities import AudioSpeech, CreateAudioSpeechBody
from api.domain.provider.entities import ProviderEndpoint, ProviderResponse
from api.domain.router.entities import RouterRateLimitState, RouterType
from api.domain.router.errors import RouterHasWrongTypeError
from api.domain.usage import UsageContext, UsageRepository
from api.tests.unit.use_case.factories import AuthenticatedUserFactory, KeyFactory, RouterFactory
from api.use_cases.audio import CreateAudioSpeechCommand, CreateAudioSpeechUseCase, CreateAudioSpeechUseCaseSuccess

TRACE_ID = "b" * 32


@pytest.fixture
def mock_model_tokenizer():
    tokenizer = MagicMock()
    tokenizer.compute_tokens.side_effect = lambda texts: len(texts)
    return tokenizer


@pytest.fixture
def mock_usage_context():
    return create_autospec(UsageContext, instance=True, spec_set=True)


@pytest.fixture
def mock_usage_repository():
    repository = create_autospec(UsageRepository, instance=True, spec_set=True)
    repository.start_record.return_value = TRACE_ID
    return repository


@pytest.fixture
def router():
    return RouterFactory(id=1, name="voix-fr", type=RouterType.TEXT_TO_SPEECH, providers=1)


@pytest.fixture
def admin_user():
    return AuthenticatedUserFactory(id=1, admin=True)


@pytest.fixture
def command(admin_user):
    return CreateAudioSpeechCommand(
        payload=CreateAudioSpeechBody(model="voix-fr", input="Bonjour à tous"),
        authenticated_user=admin_user,
        authenticated_key=KeyFactory(),
    )


@pytest.fixture
def use_case(mock_model_tokenizer, mock_usage_context, mock_usage_repository) -> CreateAudioSpeechUseCase:
    return CreateAudioSpeechUseCase(
        model_environmental_impacts_computer=MagicMock(),
        model_tokenizer=mock_model_tokenizer,
        provider_client=AsyncMock(),
        provider_load_balancer=AsyncMock(),
        provider_metrics_logger=AsyncMock(),
        provider_repository=AsyncMock(),
        router_rate_limiter=AsyncMock(),
        router_repository=AsyncMock(),
        usage_context=mock_usage_context,
        usage_repository=mock_usage_repository,
    )


class TestCreateAudioSpeechUseCase:
    def test_should_use_the_text_to_speech_router_type(self):
        assert CreateAudioSpeechUseCase.ROUTER_TYPE == RouterType.TEXT_TO_SPEECH

    def test_should_use_the_audio_speech_endpoint(self):
        assert CreateAudioSpeechUseCase.ENDPOINT == ProviderEndpoint.AUDIO_SPEECH

    @pytest.mark.asyncio
    async def test_should_return_the_audio_with_the_rate_limit_headers(self, use_case, command, router, admin_user):
        # Arrange
        audio = AudioSpeech(content=b"RIFFdata", media_type="audio/wav")
        use_case._resolve_router = AsyncMock(return_value=router)
        use_case._check_rate_limits = AsyncMock(return_value=RouterRateLimitState.admin_rate_limit_state())
        use_case._send_request = AsyncMock(return_value=ProviderResponse(audio=audio))

        # Act
        result = await use_case.execute(command=command)

        # Assert
        use_case.model_tokenizer.compute_tokens.assert_called_once_with(texts=["Bonjour à tous"])
        assert isinstance(result, CreateAudioSpeechUseCaseSuccess)
        assert result.audio == b"RIFFdata"
        assert result.media_type == "audio/wav"

    @pytest.mark.asyncio
    async def test_should_return_the_error_when_the_model_is_not_a_voice(self, use_case, command, admin_user):
        # Arrange
        error = RouterHasWrongTypeError(id=1, actual_type=RouterType.TEXT_GENERATION, expected_type=RouterType.TEXT_TO_SPEECH)
        use_case._resolve_router = AsyncMock(return_value=error)
        use_case._send_request = AsyncMock()

        # Act
        result = await use_case.execute(command=command)

        # Assert
        assert result == error
        use_case._send_request.assert_not_awaited()
