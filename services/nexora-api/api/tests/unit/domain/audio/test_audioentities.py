from pydantic import ValidationError
import pytest

from api.domain.audio.entities import AudioSpeech, AudioSpeechResponseFormat, CreateAudioSpeechBody
from api.domain.provider.entities import ProviderResponse


class TestCreateAudioSpeechBody:
    def test_uses_openai_defaults(self):
        # Arrange / Act
        body = CreateAudioSpeechBody(model="voix-fr", input="Bonjour")

        # Assert
        assert body.voice == "default"
        assert body.response_format == AudioSpeechResponseFormat.MP3
        assert body.speed == 1.0

    def test_get_prompts_returns_the_text_to_speak(self):
        # Arrange
        body = CreateAudioSpeechBody(model="voix-fr", input="Bonjour à tous")

        # Act / Assert
        assert body.get_prompts() == ["Bonjour à tous"]

    @pytest.mark.parametrize("text", ["", "x" * 4097])
    def test_rejects_an_empty_or_too_long_text(self, text):
        # Act / Assert
        with pytest.raises(ValidationError):
            CreateAudioSpeechBody(model="voix-fr", input=text)

    @pytest.mark.parametrize("speed", [0.1, 4.5])
    def test_rejects_a_speed_outside_openai_bounds(self, speed):
        # Act / Assert
        with pytest.raises(ValidationError):
            CreateAudioSpeechBody(model="voix-fr", input="Bonjour", speed=speed)

    def test_rejects_an_unknown_format(self):
        # Act / Assert
        with pytest.raises(ValidationError):
            CreateAudioSpeechBody(model="voix-fr", input="Bonjour", response_format="opus")

    @pytest.mark.parametrize(
        ("audio_format", "media_type"),
        [("mp3", "audio/mpeg"), ("wav", "audio/wav"), ("flac", "audio/flac"), ("pcm", "audio/pcm")],
    )
    def test_each_format_knows_its_media_type(self, audio_format, media_type):
        # Act / Assert
        assert AudioSpeechResponseFormat(audio_format).media_type == media_type


class TestAudioSpeechInProviderResponse:
    def test_provider_response_can_carry_audio_alone(self):
        # Arrange / Act
        response = ProviderResponse(audio=AudioSpeech(content=b"RIFF", media_type="audio/wav"))

        # Assert
        assert response.get_completions() == []

    def test_provider_response_refuses_audio_with_text(self):
        # Act / Assert
        with pytest.raises(ValidationError):
            ProviderResponse(audio=AudioSpeech(content=b"RIFF", media_type="audio/wav"), text="x")
