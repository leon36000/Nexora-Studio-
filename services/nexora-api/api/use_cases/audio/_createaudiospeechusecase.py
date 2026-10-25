from dataclasses import dataclass

from api.domain.audio.entities import CreateAudioSpeechBody
from api.domain.provider.entities import ProviderEndpoint, ProviderResponse
from api.domain.router.entities import RouterType
from api.use_cases._providerrequestforwardingusecase import ForwardingCommand, ProviderRequestForwardingUseCase, ProviderRequestForwardingUseCaseError


class CreateAudioSpeechCommand(ForwardingCommand[CreateAudioSpeechBody]):
    pass


@dataclass
class CreateAudioSpeechUseCaseSuccess:
    audio: bytes
    media_type: str
    headers: dict[str, str]


type CreateAudioSpeechUseCaseResult = CreateAudioSpeechUseCaseSuccess | ProviderRequestForwardingUseCaseError


class CreateAudioSpeechUseCase(ProviderRequestForwardingUseCase[CreateAudioSpeechCommand, CreateAudioSpeechUseCaseResult]):
    ROUTER_TYPE = RouterType.TEXT_TO_SPEECH
    ENDPOINT = ProviderEndpoint.AUDIO_SPEECH

    def _build_success(
        self, command: CreateAudioSpeechCommand, response: ProviderResponse, headers: dict[str, str]
    ) -> CreateAudioSpeechUseCaseSuccess:
        return CreateAudioSpeechUseCaseSuccess(audio=response.audio.content, media_type=response.audio.media_type, headers=headers)
