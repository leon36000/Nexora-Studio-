import base64
from tempfile import SpooledTemporaryFile

from api.domain.audio.entities import AudioTranscriptionsResponseFormat, CreateAudioTranscriptionsFile, CreateAudioTranscriptionsForm
from api.domain.provider.entities import ProviderEndpoint, ProviderRequest, ProviderType
from api.infrastructure.http import HttpProviderResponse
from api.infrastructure.http.adapters.audio import AudioTranscriptionsAdapter
from api.infrastructure.http.adapters.audio.mistral import MistralAudioTranscriptionsAdapter
from api.tests.unit.use_case.factories import ProviderFactory

AUDIO_BYTES = b"audio-bytes"


def mock_audio_file() -> SpooledTemporaryFile:
    file = SpooledTemporaryFile()
    file.write(AUDIO_BYTES)
    file.seek(0)
    return file


def _original_request(**overrides) -> ProviderRequest:
    form = CreateAudioTranscriptionsForm(
        file=CreateAudioTranscriptionsFile(name="speech.mp3", file=mock_audio_file(), content_type="audio/mpeg", size=11),
        model="audio-router",
        language="en",
        prompt="",
        response_format=AudioTranscriptionsResponseFormat.JSON,
        temperature=0.0,
    )
    payload = {
        "id": "req-1",
        "endpoint": ProviderEndpoint.AUDIO_TRANSCRIPTIONS,
        "payload": form,
    }
    payload.update(overrides)
    return ProviderRequest(**payload)


class TestAudioTranscriptionsAdapter:
    def test_should_rewrite_form_model_to_provider_model_name(self):
        # Arrange
        provider = ProviderFactory(type=ProviderType.VLLM, url="https://vllm.test", model_name="whisper-1")
        adapter = AudioTranscriptionsAdapter(provider=provider)
        original_request = _original_request()

        # Act
        result = adapter.to_http_request(request=original_request)

        # Assert
        assert result.form["model"] == "whisper-1"
        assert original_request.payload.model == "audio-router"
        assert result.files == {"file": ("speech.mp3", original_request.payload.file.file, "audio/mpeg")}
        assert result.body == {}

    def test_should_set_response_model_from_original_form(self):
        # Arrange
        provider = ProviderFactory(type=ProviderType.VLLM, url="https://vllm.test", model_name="whisper-1")
        adapter = AudioTranscriptionsAdapter(provider=provider)
        original_request = _original_request(id="req-123")
        original_response = HttpProviderResponse(data={"id": "provider-id", "text": "hello world"})

        # Act
        result = adapter.to_provider_response(request=original_request, http_response=original_response)

        # Assert
        assert result.data.id == "req-123"
        assert result.data.text == "hello world"
        assert result.data.model == "audio-router"

    def test_should_drop_the_provider_usage_reported_in_seconds(self):
        # Arrange
        provider = ProviderFactory(type=ProviderType.VLLM, url="https://vllm.test", model_name="whisper-1")
        adapter = AudioTranscriptionsAdapter(provider=provider)
        original_response = HttpProviderResponse(data={"text": "hello world", "usage": {"type": "duration", "seconds": 372}})

        # Act
        result = adapter.to_provider_response(request=_original_request(), http_response=original_response)

        # Assert
        assert "usage" not in result.data.model_fields_set


class TestMistralAudioTranscriptionsAdapter:
    def test_should_encode_audio_file_into_chat_completions_body(self):
        # Arrange
        provider = ProviderFactory(type=ProviderType.MISTRAL, url="https://mistral.test", model_name="voxtral")
        adapter = MistralAudioTranscriptionsAdapter(provider=provider)

        # Act
        result = adapter.to_http_request(request=_original_request())

        # Assert
        assert result.url == "https://mistral.test/v1/chat/completions"
        assert result.body["model"] == "voxtral"
        assert result.body["messages"][0]["content"] == [
            {"type": "input_audio", "input_audio": base64.b64encode(AUDIO_BYTES).decode("utf-8")},
            {"type": "text", "text": "Transcribe this audio in this language : en"},
        ]
        assert result.files == {}
        assert result.form == {}


class TestDiarizedTranscriptionsAdapter:
    def _diarized_request(self) -> ProviderRequest:
        form = CreateAudioTranscriptionsForm(
            file=CreateAudioTranscriptionsFile(name="reunion.wav", file=mock_audio_file(), content_type="audio/wav", size=11),
            model="audio-router",
            language="fr",
            prompt="Vocabulaire : Nexora.",
            response_format=AudioTranscriptionsResponseFormat.DIARIZED_JSON,
            temperature=0.0,
            num_speakers=3,
        )
        return ProviderRequest(id="req-1", endpoint=ProviderEndpoint.AUDIO_TRANSCRIPTIONS, payload=form)

    def test_should_ask_the_provider_for_word_timestamps_and_keep_nexora_fields_to_itself(self):
        # Arrange
        adapter = AudioTranscriptionsAdapter(provider=ProviderFactory(type=ProviderType.OPENAI, url="http://whisper:8000", model_name="whisper-1"))

        # Act
        result = adapter.to_http_request(request=self._diarized_request())

        # Assert
        assert result.form["response_format"] == "verbose_json"
        assert result.form["timestamp_granularities[]"] == ["word"]
        assert result.form["prompt"] == "Vocabulaire : Nexora."
        assert "num_speakers" not in result.form

    def test_should_read_the_words_and_segments_of_a_verbose_answer(self):
        # Arrange
        adapter = AudioTranscriptionsAdapter(provider=ProviderFactory(type=ProviderType.OPENAI, url="http://whisper:8000"))
        answer = HttpProviderResponse(
            data={
                "text": "Bonjour à tous",
                "language": "french",
                "duration": 2.0,
                "words": [{"start": 0.0, "end": 0.4, "word": " Bonjour", "probability": 0.9}],
                "segments": [{"id": 0, "start": 0.0, "end": 1.0, "text": " Bonjour", "tokens": [1, 2]}],
            }
        )

        # Act
        result = adapter.to_provider_response(request=self._diarized_request(), http_response=answer)

        # Assert
        assert [(w.word, w.start, w.end) for w in result.data.words] == [(" Bonjour", 0.0, 0.4)]
        assert result.data.segments[0].text == " Bonjour"
