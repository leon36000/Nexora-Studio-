from typing import Annotated

from fastapi import File, Form, UploadFile
from fastapi.exceptions import RequestValidationError
from pydantic import Field, ValidationError

from api.domain import BaseModel
from api.domain.audio.entities import AudioTranscriptionLanguage, AudioTranscriptionsResponseFormat
from api.domain.usage.entities import Usage

PLAIN_TEXT_SUBTITLE_FORMATS = {
    AudioTranscriptionsResponseFormat.TEXT: "text/plain",
    AudioTranscriptionsResponseFormat.SRT: "application/x-subrip",
    AudioTranscriptionsResponseFormat.VTT: "text/vtt",
}


class Segment(BaseModel):
    id: Annotated[int, Field(default=..., description="A unique identifier for the segment.")]
    type: Annotated[str, Field(default="transcript.text.segment", description="The type of the segment.")]
    text: Annotated[str, Field(default=..., description="The segment text.")]
    start: Annotated[float, Field(default=..., description="Start time of the segment in seconds.")]
    end: Annotated[float, Field(default=..., description="End time of the segment in seconds.")]
    speaker: Annotated[str | None, Field(default=None, description="Speaker label assigned by diarization, if available.")]


class Word(BaseModel):
    start: Annotated[float, Field(default=..., description="Start time of the word in seconds.")]
    end: Annotated[float, Field(default=..., description="End time of the word in seconds.")]
    word: Annotated[str, Field(default=..., description="The word.")]


class AudioTranscriptionsResponse(BaseModel):
    id: Annotated[str, Field(default=..., description="A unique identifier for the audio transcription.")]
    text: Annotated[str, Field(default=..., description="The transcription text.")]
    model: Annotated[str, Field(default=..., description="The model used to generate the transcription.")]
    segments: Annotated[
        list[Segment] | None,
        Field(default=None, description="Segments with their times (`verbose_json`) and speakers (`diarized_json`: `speaker_1`, `speaker_2`…)."),
    ]
    words: Annotated[
        list[Word] | None, Field(default=None, description="Words with their times, only set when the provider returns them (`verbose_json`).")
    ]
    usage: Annotated[Usage, Field(default_factory=Usage, description="Usage information for the request.")]


class CreateAudioTranscriptionsForm(BaseModel):
    file: UploadFile
    model: str
    language: AudioTranscriptionLanguage | None
    prompt: str
    response_format: AudioTranscriptionsResponseFormat
    temperature: float
    num_speakers: int | None = None

    # fmt: off
    @classmethod
    def as_form(
        cls,
        file: UploadFile = File(default=..., description="The audio file object (not file name) to transcribe, in one of these formats: mp3 or wav."),
        model: str = Form(default=..., description="ID of the model to use. Call `/v1/models` endpoint to get the list of available models, only `automatic-speech-recognition` model type is supported."),
        language: AudioTranscriptionLanguage | None = Form(default=None, description="The language of the output audio. If the output language is different than the audio language, the audio language will be translated into the output language. Output language must be supplied in ISO-639-1 format (e.g. en, fr) format."),
        prompt: str = Form(default="", description="An optional text to tell the model what to do with the input audio."),
        response_format: AudioTranscriptionsResponseFormat = Form(default=AudioTranscriptionsResponseFormat.JSON, description="The format of the transcript output: `json` (default), `text`, `diarized_json` to return per-segment speaker labels, `srt` or `vtt` for subtitle formats."),
        temperature: float = Form(default=0.0, ge=0.0, le=1.0, description="The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit."),
        num_speakers: int | None = Form(default=None, ge=1, le=20, description="Nexora extension for `response_format=diarized_json`: the number of speakers, when known (otherwise the diarization service counts them)."),
    ) -> "CreateAudioTranscriptionsForm":
        try:
            return cls(
                file=file,
                model=model,
                language=language,
                prompt=prompt,
                response_format=response_format,
                temperature=temperature,
                num_speakers=num_speakers,
            )
        except ValidationError as exc:
            raise RequestValidationError(exc.errors())
