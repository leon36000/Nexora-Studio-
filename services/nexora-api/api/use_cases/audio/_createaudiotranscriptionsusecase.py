from dataclasses import dataclass

from api.domain import ForwardablePayload
from api.domain.audio import AudioDiarizer
from api.domain.audio.diarization import assign_speakers
from api.domain.audio.entities import AudioTranscriptions, AudioTranscriptionsResponseFormat, CreateAudioTranscriptionsForm, TimedWord
from api.domain.audio.errors import AudioDiarizationUnavailableError, AudioFileSizeLimitExceededError
from api.domain.model import ModelEnvironmentalImpactsComputer, ModelTokenizer
from api.domain.provider import ProviderClient, ProviderLoadBalancer, ProviderMetricsLogger, ProviderRepository
from api.domain.provider.entities import ProviderEndpoint, ProviderResponse
from api.domain.router import RouterRateLimiter, RouterRepository
from api.domain.router.entities import Router, RouterType
from api.domain.usage import UsageContext, UsageRepository
from api.domain.user.views import AuthenticatedUserView
from api.use_cases._providerrequestforwardingusecase import ForwardingCommand, ProviderRequestForwardingUseCase, ProviderRequestForwardingUseCaseError


class CreateAudioTranscriptionsCommand(ForwardingCommand[CreateAudioTranscriptionsForm]):
    @property
    def file_size(self) -> int:
        return self.payload.file.size

    @property
    def media_type(self) -> AudioTranscriptionsResponseFormat:
        return self.payload.response_format.media_type


@dataclass
class CreateAudioTranscriptionsJsonUseCaseSuccess:
    data: AudioTranscriptions
    headers: dict[str, str]
    media_type: str


@dataclass
class CreateAudioTranscriptionsTextUseCaseSuccess:
    text: str
    headers: dict[str, str]
    media_type: str


type AudioTranscriptionsUseCaseError = AudioFileSizeLimitExceededError | AudioDiarizationUnavailableError | ProviderRequestForwardingUseCaseError

type CreateAudioTranscriptionsUseCaseResult = (
    CreateAudioTranscriptionsJsonUseCaseSuccess | CreateAudioTranscriptionsTextUseCaseSuccess | AudioTranscriptionsUseCaseError
)


class CreateAudioTranscriptionsUseCase(ProviderRequestForwardingUseCase[CreateAudioTranscriptionsCommand, CreateAudioTranscriptionsUseCaseResult]):
    ROUTER_TYPE = RouterType.AUTOMATIC_SPEECH_RECOGNITION
    ENDPOINT = ProviderEndpoint.AUDIO_TRANSCRIPTIONS

    def __init__(
        self,
        model_environmental_impacts_computer: ModelEnvironmentalImpactsComputer,
        model_tokenizer: ModelTokenizer,
        provider_client: ProviderClient,
        provider_load_balancer: ProviderLoadBalancer,
        provider_metrics_logger: ProviderMetricsLogger,
        provider_repository: ProviderRepository,
        router_rate_limiter: RouterRateLimiter,
        router_repository: RouterRepository,
        usage_context: UsageContext,
        usage_repository: UsageRepository,
        audio_file_size_limit: int | None = None,
        audio_diarizer: AudioDiarizer | None = None,
    ) -> None:
        super().__init__(
            model_environmental_impacts_computer=model_environmental_impacts_computer,
            model_tokenizer=model_tokenizer,
            provider_client=provider_client,
            provider_load_balancer=provider_load_balancer,
            provider_metrics_logger=provider_metrics_logger,
            provider_repository=provider_repository,
            router_rate_limiter=router_rate_limiter,
            router_repository=router_repository,
            usage_context=usage_context,
            usage_repository=usage_repository,
        )
        self.audio_file_size_limit = audio_file_size_limit
        self.audio_diarizer = audio_diarizer

    def _check_command(self, command: CreateAudioTranscriptionsCommand) -> AudioFileSizeLimitExceededError | AudioDiarizationUnavailableError | None:
        if self.audio_file_size_limit is not None and command.file_size > self.audio_file_size_limit:
            return AudioFileSizeLimitExceededError(size=command.file_size, expected_size=self.audio_file_size_limit)

        if command.payload.response_format == AudioTranscriptionsResponseFormat.DIARIZED_JSON and self.audio_diarizer is None:
            return AudioDiarizationUnavailableError(reason="no diarization service is configured on this instance")

        return None

    async def _send_request(
        self,
        authenticated_user: AuthenticatedUserView,
        router: Router,
        prompt_tokens: int,
        payload: ForwardablePayload,
        request_id: str,
    ):
        if payload.response_format != AudioTranscriptionsResponseFormat.DIARIZED_JSON:
            return await super()._send_request(
                authenticated_user=authenticated_user, router=router, prompt_tokens=prompt_tokens, payload=payload, request_id=request_id
            )

        # Who speaks when is asked first: a recording that cannot be diarized costs no Whisper time.
        turns = await self.audio_diarizer.diarize(file=payload.file, num_speakers=payload.num_speakers)
        match turns:
            case AudioDiarizationUnavailableError() as error:
                return error
        payload.file.file.seek(0)

        result = await super()._send_request(
            authenticated_user=authenticated_user, router=router, prompt_tokens=prompt_tokens, payload=payload, request_id=request_id
        )
        match result:
            case ProviderResponse(data=AudioTranscriptions() as transcription):
                words = transcription.words or [
                    TimedWord(start=segment.start, end=segment.end, word=segment.text) for segment in transcription.segments or []
                ]
                transcription.segments = assign_speakers(words, turns)
                transcription.words = None

        return result

    def _build_success(
        self,
        command: CreateAudioTranscriptionsCommand,
        response: ProviderResponse,
        headers: dict[str, str],
    ) -> CreateAudioTranscriptionsJsonUseCaseSuccess | CreateAudioTranscriptionsTextUseCaseSuccess:
        if response.data:
            return CreateAudioTranscriptionsJsonUseCaseSuccess(data=response.data, headers=headers, media_type=command.media_type)

        return CreateAudioTranscriptionsTextUseCaseSuccess(text=response.text, headers=headers, media_type=command.media_type)
