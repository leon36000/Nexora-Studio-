from api.domain.audio.entities import AudioSpeech, AudioSpeechResponseFormat, CreateAudioSpeechBody
from api.domain.provider.entities import ProviderEndpoint, ProviderRequest, ProviderType
from api.infrastructure.http import HttpProviderResponse
from api.infrastructure.http._httpprovideradapterbuilder import HttpProviderAdapterBuilder
from api.infrastructure.http.adapters.audio import AudioSpeechAdapter
from api.tests.unit.use_case.factories import ProviderFactory


def _request(**overrides) -> ProviderRequest:
    body = CreateAudioSpeechBody(model="voix-fr", input="Bonjour", voice="siwis", response_format=AudioSpeechResponseFormat.WAV, speed=1.25)
    payload = {"id": "req-1", "endpoint": ProviderEndpoint.AUDIO_SPEECH, "payload": body}
    payload.update(overrides)
    return ProviderRequest(**payload)


class TestAudioSpeechAdapter:
    def test_should_post_the_json_body_to_the_provider_with_its_model_name(self):
        # Arrange
        provider = ProviderFactory(type=ProviderType.OPENAI, url="http://whisper:8000", model_name="speaches-ai/piper-fr_FR-siwis-medium")
        adapter = AudioSpeechAdapter(provider=provider)
        request = _request()

        # Act
        result = adapter.to_http_request(request=request)

        # Assert
        assert result.url == "http://whisper:8000/v1/audio/speech"
        assert result.method == "POST"
        assert result.body == {
            "model": "speaches-ai/piper-fr_FR-siwis-medium",
            "input": "Bonjour",
            "voice": "siwis",
            "response_format": "wav",
            "speed": 1.25,
        }
        assert request.payload.model == "voix-fr"

    def test_should_keep_the_audio_bytes_and_the_media_type_of_the_provider(self):
        # Arrange
        adapter = AudioSpeechAdapter(provider=ProviderFactory(type=ProviderType.OPENAI, url="http://whisper:8000"))
        response = HttpProviderResponse(content=b"RIFFxxxx", media_type="audio/wav")

        # Act
        result = adapter.to_provider_response(http_response=response, request=_request())

        # Assert
        assert result.audio == AudioSpeech(content=b"RIFFxxxx", media_type="audio/wav")

    def test_should_fall_back_on_the_requested_format_when_the_provider_names_no_media_type(self):
        # Arrange
        adapter = AudioSpeechAdapter(provider=ProviderFactory(type=ProviderType.OPENAI, url="http://whisper:8000"))
        response = HttpProviderResponse(content=b"RIFFxxxx")

        # Act
        result = adapter.to_provider_response(http_response=response, request=_request())

        # Assert
        assert result.audio.media_type == "audio/wav"

    def test_should_refuse_an_answer_without_audio(self):
        # Arrange
        adapter = AudioSpeechAdapter(provider=ProviderFactory(type=ProviderType.OPENAI, url="http://whisper:8000"))

        # Act
        result = adapter.to_provider_response(http_response=HttpProviderResponse(data={"error": "x"}), request=_request())

        # Assert
        assert result.errors


class TestAdapterRegistry:
    def test_openai_and_vllm_providers_serve_audio_speech(self):
        # Arrange
        builder = HttpProviderAdapterBuilder()

        # Act / Assert
        for provider_type in (ProviderType.OPENAI, ProviderType.VLLM):
            adapter = builder.build(endpoint=ProviderEndpoint.AUDIO_SPEECH, provider=ProviderFactory(type=provider_type))
            assert isinstance(adapter, AudioSpeechAdapter)
