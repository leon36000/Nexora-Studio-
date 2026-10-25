from typing import Annotated, assert_never

from fastapi import APIRouter, Body, Depends, HTTPException, Response, Security
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, PlainTextResponse

from api.dependencies import create_audio_speech_use_case_factory, create_audio_transcriptions_use_case_factory
from api.domain.audio.entities import CreateAudioSpeechBody, CreateAudioTranscriptionsFile
from api.domain.audio.errors import AudioDiarizationUnavailableError, AudioFileSizeLimitExceededError
from api.domain.key.entities import Key
from api.domain.model.errors import StatusCodeModelError, TooBusyModelError, UnknownModelError
from api.domain.provider.errors import (
    NoAvailableProviderError,
    ProviderAdapterValidationRequestError,
    ProviderAdapterValidationResponseError,
    UnsupportedProviderEndpointError,
)
from api.domain.router.errors import RouterHasNoProvidersError, RouterHasWrongTypeError, RouterNotFoundError, RouterRateLimitExceededError
from api.domain.user.errors import UserHasNoAccessToRouterError
from api.domain.user.views import AuthenticatedUserView
from api.infrastructure.fastapi.accesscontroller import AccessController
from api.infrastructure.fastapi.dependencies import get_authenticated_key, get_authenticated_user
from api.infrastructure.fastapi.documentation import get_documentation_responses
from api.infrastructure.fastapi.endpoints.exceptions import (
    FileSizeLimitExceededHTTPException,
    ModelIsTooBusyExceptionHTTPException,
    ModelNotFoundHTTPException,
    RateLimitExceededHTTPException,
    UnsupportedProviderEndpointHTTPException,
    WrongModelTypeHTTPException,
)
from api.infrastructure.fastapi.routes import EndpointRoute, RouterName
from api.infrastructure.fastapi.schemas.audio import AudioTranscriptionsResponse, CreateAudioTranscriptionsForm
from api.use_cases.audio import (
    CreateAudioSpeechCommand,
    CreateAudioSpeechUseCase,
    CreateAudioSpeechUseCaseSuccess,
    CreateAudioTranscriptionsCommand,
    CreateAudioTranscriptionsJsonUseCaseSuccess,
    CreateAudioTranscriptionsTextUseCaseSuccess,
    CreateAudioTranscriptionsUseCase,
)

router = APIRouter(prefix="/v1", tags=[RouterName.AUDIO.title()])


@router.post(
    path=EndpointRoute.AUDIO_TRANSCRIPTIONS,
    dependencies=[Security(dependency=AccessController())],
    status_code=200,
    responses=get_documentation_responses(
        [
            ModelIsTooBusyExceptionHTTPException,
            ModelNotFoundHTTPException,
            RateLimitExceededHTTPException,
            WrongModelTypeHTTPException,
            FileSizeLimitExceededHTTPException,
        ]
    ),
    response_model=AudioTranscriptionsResponse,
)
async def create_audio_transcription(
    data: Annotated[CreateAudioTranscriptionsForm, Depends(CreateAudioTranscriptionsForm.as_form)],
    create_audio_transcriptions_use_case: CreateAudioTranscriptionsUseCase = Depends(create_audio_transcriptions_use_case_factory),
    authenticated_user: AuthenticatedUserView = Depends(get_authenticated_user),
    authenticated_key: Key = Depends(get_authenticated_key),
) -> JSONResponse:
    payload = data.model_dump(mode="json", exclude={"file"})
    payload["file"] = CreateAudioTranscriptionsFile(
        name=data.file.filename,
        file=data.file.file,
        content_type=data.file.content_type,
        size=data.file.size,
    )

    command = CreateAudioTranscriptionsCommand(payload=payload, authenticated_user=authenticated_user, authenticated_key=authenticated_key)
    result = await create_audio_transcriptions_use_case.execute(command)

    match result:
        case CreateAudioTranscriptionsJsonUseCaseSuccess(data=data, headers=headers, media_type=media_type):
            content = AudioTranscriptionsResponse.model_validate(data.model_dump()).model_dump()
            if content.get("words") is None:
                content.pop("words", None)
            return JSONResponse(content=content, status_code=200, headers=headers, media_type=media_type)
        case CreateAudioTranscriptionsTextUseCaseSuccess(text=text, headers=headers, media_type=media_type):
            return PlainTextResponse(content=text, status_code=200, headers=headers, media_type=media_type)
        case AudioFileSizeLimitExceededError(size=size, expected_size=expected_size):
            raise FileSizeLimitExceededHTTPException(size=size, expected_size=expected_size)
        case AudioDiarizationUnavailableError(reason=reason):
            raise HTTPException(status_code=501, detail=f"Speaker diarization is not available: {reason}.")
        case NoAvailableProviderError():
            raise ModelIsTooBusyExceptionHTTPException()
        case ProviderAdapterValidationRequestError(errors=errors):
            raise HTTPException(status_code=422, detail=jsonable_encoder(errors))
        case ProviderAdapterValidationResponseError(errors=errors):
            raise HTTPException(status_code=422, detail=jsonable_encoder(errors))
        case UnsupportedProviderEndpointError(endpoint=endpoint, provider_type=provider_type):
            raise UnsupportedProviderEndpointHTTPException(endpoint=endpoint, provider_type=provider_type)
        case RouterRateLimitExceededError(id=_, limit_type=limit_type, headers=headers):
            raise RateLimitExceededHTTPException(limit_type=limit_type, headers=headers)
        case RouterNotFoundError():
            raise ModelNotFoundHTTPException(name=data.model)
        case RouterHasNoProvidersError():
            raise ModelNotFoundHTTPException(name=data.model)
        case RouterHasWrongTypeError(actual_type=actual_type, expected_type=expected_type):
            raise WrongModelTypeHTTPException(expected_type=expected_type, actual_type=actual_type)
        case UserHasNoAccessToRouterError():
            raise ModelNotFoundHTTPException(name=data.model)
        case TooBusyModelError(detail=detail):
            raise ModelIsTooBusyExceptionHTTPException()
        case StatusCodeModelError(status_code=status_code, detail=detail):
            raise HTTPException(status_code=status_code, detail=detail)
        case UnknownModelError(detail=detail):
            raise HTTPException(status_code=500, detail=detail)
        case _ as unreachable:
            assert_never(unreachable)


@router.post(
    path=EndpointRoute.AUDIO_SPEECH,
    dependencies=[Security(dependency=AccessController())],
    status_code=200,
    responses=get_documentation_responses(
        [
            ModelIsTooBusyExceptionHTTPException,
            ModelNotFoundHTTPException,
            RateLimitExceededHTTPException,
            WrongModelTypeHTTPException,
        ]
    ),
    response_class=Response,
)
async def create_audio_speech(
    body: CreateAudioSpeechBody = Body(description="The speech synthesis request."),
    create_audio_speech_use_case: CreateAudioSpeechUseCase = Depends(create_audio_speech_use_case_factory),
    authenticated_user: AuthenticatedUserView = Depends(get_authenticated_user),
    authenticated_key: Key = Depends(get_authenticated_key),
) -> Response:
    """
    Turns a text into speech with a `text-to-speech` model (OpenAI `/v1/audio/speech` format).
    """
    command = CreateAudioSpeechCommand(payload=body, authenticated_user=authenticated_user, authenticated_key=authenticated_key)
    result = await create_audio_speech_use_case.execute(command)

    match result:
        case CreateAudioSpeechUseCaseSuccess(audio=audio, media_type=media_type, headers=headers):
            return Response(content=audio, status_code=200, headers=headers, media_type=media_type)
        case NoAvailableProviderError():
            raise ModelIsTooBusyExceptionHTTPException()
        case ProviderAdapterValidationRequestError(errors=errors):
            raise HTTPException(status_code=422, detail=jsonable_encoder(errors))
        case ProviderAdapterValidationResponseError(errors=errors):
            raise HTTPException(status_code=422, detail=jsonable_encoder(errors))
        case UnsupportedProviderEndpointError(endpoint=endpoint, provider_type=provider_type):
            raise UnsupportedProviderEndpointHTTPException(endpoint=endpoint, provider_type=provider_type)
        case RouterRateLimitExceededError(id=_, limit_type=limit_type, headers=headers):
            raise RateLimitExceededHTTPException(limit_type=limit_type, headers=headers)
        case RouterNotFoundError() | RouterHasNoProvidersError() | UserHasNoAccessToRouterError():
            raise ModelNotFoundHTTPException(name=body.model)
        case RouterHasWrongTypeError(actual_type=actual_type, expected_type=expected_type):
            raise WrongModelTypeHTTPException(expected_type=expected_type, actual_type=actual_type)
        case TooBusyModelError():
            raise ModelIsTooBusyExceptionHTTPException()
        case StatusCodeModelError(status_code=status_code, detail=detail):
            raise HTTPException(status_code=status_code, detail=detail)
        case UnknownModelError(detail=detail):
            raise HTTPException(status_code=500, detail=detail)
        case _ as unreachable:
            assert_never(unreachable)
