from http import HTTPMethod

from api.domain.audio.entities import AudioSpeech
from api.domain.provider.entities import ProviderEndpoint, ProviderRequest, ProviderResponse
from api.domain.provider.errors import ProviderAdapterValidationRequestError, ProviderAdapterValidationResponseError
from api.infrastructure.http._httpproviderrequest import HttpProviderRequest
from api.infrastructure.http._httpproviderresponse import HttpProviderResponse
from api.infrastructure.http.adapters import HttpProviderAdapter


class AudioSpeechAdapter(HttpProviderAdapter):
    SOURCE_ENDPOINT = ProviderEndpoint.AUDIO_SPEECH
    TARGET_ENDPOINT_ROUTE = "/v1/audio/speech"
    TARGET_ENDPOINT_METHOD = HTTPMethod.POST
    RESPONSE_TYPE = None

    def to_http_request(self, request: ProviderRequest) -> HttpProviderRequest | ProviderAdapterValidationRequestError:
        target_url = self._build_target_url(base_url=self.provider.url, target_endpoint_route=self.TARGET_ENDPOINT_ROUTE)
        body = request.payload.model_dump(mode="json", exclude_none=True)
        body["model"] = self.provider.model_name

        return HttpProviderRequest(method=self.TARGET_ENDPOINT_METHOD, url=target_url, body=body)

    def to_provider_response(
        self,
        http_response: HttpProviderResponse,
        request: ProviderRequest,
    ) -> ProviderResponse | ProviderAdapterValidationResponseError:
        if http_response.content is None:
            return ProviderAdapterValidationResponseError(
                provider_type=self.provider.type,
                errors=[{"type": "missing", "loc": ("body",), "msg": "The provider answered without audio.", "input": None}],
            )

        media_type = http_response.media_type or request.payload.response_format.media_type
        return ProviderResponse(audio=AudioSpeech(content=http_response.content, media_type=media_type))
