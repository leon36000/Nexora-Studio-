from typing import NoReturn, assert_never

from fastapi import APIRouter, Body, Depends, HTTPException, Security
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from api.dependencies import annotate_document_use_case_factory, create_ocr_use_case_factory
from api.domain.key.entities import Key
from api.domain.model.errors import StatusCodeModelError, TooBusyModelError, UnknownModelError
from api.domain.ocr.entities import OCR
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
    ModelIsTooBusyExceptionHTTPException,
    ModelNotFoundHTTPException,
    RateLimitExceededHTTPException,
    UnsupportedProviderEndpointHTTPException,
    WrongModelTypeHTTPException,
)
from api.infrastructure.fastapi.routes import EndpointRoute, RouterName
from api.infrastructure.fastapi.schemas.ocr import CreateOCRBody, OCRResponse
from api.use_cases.ocr import (
    DEFAULT_ANNOTATION_MODEL,
    AnnotateDocumentCommand,
    AnnotateDocumentUseCase,
    AnnotationFailed,
    AnnotationSucceeded,
    CreateOCRCommand,
    CreateOCRUseCase,
    CreateOCRUseCaseSuccess,
)

router = APIRouter(prefix="/v1", tags=[RouterName.OCR.upper()])


@router.post(
    path=EndpointRoute.OCR,
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
    response_model=OCRResponse,
)
async def create_ocr(
    body: CreateOCRBody = Body(description="The OCR creation request."),
    create_ocr_use_case: CreateOCRUseCase = Depends(create_ocr_use_case_factory),
    annotate_document_use_case: AnnotateDocumentUseCase = Depends(annotate_document_use_case_factory),
    authenticated_user: AuthenticatedUserView = Depends(get_authenticated_user),
    autenticated_key: Key = Depends(get_authenticated_key),
) -> JSONResponse:
    """
    Extracts text from files using Mistral Document AI pipeline
    """
    command = CreateOCRCommand(payload=body.model_dump(), authenticated_user=authenticated_user, authenticated_key=autenticated_key)
    result = await create_ocr_use_case.execute(command)
    if not isinstance(result, CreateOCRUseCaseSuccess):
        _raise_for(result, model=body.model)
    data, headers = result.data, result.headers

    # Nexora: an OCR model that does not annotate itself (a local vision model) hands the text to a chat model.
    if body.document_annotation_format is not None and data.document_annotation is None:
        annotation_model = body.annotation_model or DEFAULT_ANNOTATION_MODEL
        annotation = await annotate_document_use_case.execute(
            AnnotateDocumentCommand(
                markdown=_document_text(data),
                response_format=body.document_annotation_format.model_dump(),
                prompt=body.document_annotation_prompt,
                model=annotation_model,
                authenticated_user=authenticated_user,
                authenticated_key=autenticated_key,
            )
        )
        match annotation:
            case AnnotationSucceeded(annotation=text):
                data.document_annotation = text
            case AnnotationFailed(reason=reason):
                data.document_annotation_error = reason
            case error:
                _raise_for(error, model=annotation_model)

    return JSONResponse(content=OCRResponse.model_validate(data.model_dump()).model_dump(), status_code=200, headers=headers)


def _document_text(data: OCR) -> str:
    """The pages' Markdown, each table put back in place of its placeholder."""
    texts = []
    for page in data.pages:
        text = page.markdown or ""
        for table in page.tables:
            text = text.replace(f"[{table.id}]({table.id})", table.content)
        texts.append(text)
    return "\n\n".join(text for text in texts if text.strip())


def _raise_for(result, model: str) -> NoReturn:
    match result:
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
            raise ModelNotFoundHTTPException(name=model)
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
