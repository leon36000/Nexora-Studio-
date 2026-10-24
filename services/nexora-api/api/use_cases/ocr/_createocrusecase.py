import base64
import binascii

from api.domain import ForwardablePayload
from api.domain.ocr.entities import OCR, CreateOCRBody, OCRDocumentURLChunk, OCRImageURLChunk, OCRPageObject, OCRTableObject, OCRUsage
from api.domain.provider.entities import Provider, ProviderEndpoint, ProviderResponse, ProviderType
from api.domain.provider.errors import ProviderAdapterValidationRequestError
from api.domain.router.entities import Router, RouterType
from api.domain.usage.entities import EnvironmentalImpacts, PromptTokensDetails, Usage
from api.domain.user.views import AuthenticatedUserView
from api.infrastructure.documents import UnreadablePdfError, read_pdf
from api.use_cases._providerrequestforwardingusecase import (
    ForwardingCommand,
    ProviderRequestForwardingUseCase,
    ProviderRequestForwardingUseCaseResult,
    ProviderRequestForwardingUseCaseSuccess,
)

# Nexora: vision models served through chat completions read images only; Nexora API reads the PDF.
VISION_CHAT_PROVIDER_TYPES = frozenset({ProviderType.OPENAI, ProviderType.VLLM})
# A CPU vision model reads a page in about a minute: longer scans are sent page by page by the caller.
MAX_SCANNED_PAGES_PER_REQUEST = 10
PDF_DATA_URL_PREFIX = "data:application/pdf;base64,"


class CreateOCRCommand(ForwardingCommand[CreateOCRBody]): ...


CreateOCRUseCaseSuccess = ProviderRequestForwardingUseCaseSuccess


def _inline_pdf(payload: ForwardablePayload) -> bytes | None:
    document = getattr(payload, "document", None)
    if not isinstance(document, OCRDocumentURLChunk) or not document.document_url.startswith(PDF_DATA_URL_PREFIX):
        return None
    try:
        return base64.b64decode(document.document_url[len(PDF_DATA_URL_PREFIX) :], validate=False)
    except (binascii.Error, ValueError):
        return b""


def _sum(left: Usage, right: Usage) -> Usage:
    return Usage(
        prompt_tokens=left.prompt_tokens + right.prompt_tokens,
        completion_tokens=left.completion_tokens + right.completion_tokens,
        total_tokens=left.total_tokens + right.total_tokens,
        cost=round(left.cost + right.cost, 6),
        impacts=EnvironmentalImpacts(kWh=left.impacts.kWh + right.impacts.kWh, kgCO2eq=left.impacts.kgCO2eq + right.impacts.kgCO2eq),
        prompt_tokens_details=PromptTokensDetails(cached_tokens=left.prompt_tokens_details.cached_tokens + right.prompt_tokens_details.cached_tokens),
    )


def _refusal(provider: Provider, message: str) -> ProviderAdapterValidationRequestError:
    return ProviderAdapterValidationRequestError(
        provider_type=provider.type, errors=[{"loc": ["body", "document"], "msg": message, "type": "value_error"}]
    )


class CreateOCRUseCase(ProviderRequestForwardingUseCase[CreateOCRCommand, ProviderRequestForwardingUseCaseResult[OCR]]):
    ROUTER_TYPE = RouterType.IMAGE_TO_TEXT
    ENDPOINT = ProviderEndpoint.OCR

    async def _send_to_provider(
        self,
        provider: Provider,
        authenticated_user: AuthenticatedUserView,
        router: Router,
        prompt_tokens: int,
        payload: ForwardablePayload,
        request_id: str,
    ):
        """Nexora: a PDF for a vision model is read here — its text layer locally, its scanned pages by the model, one image each."""
        pdf = _inline_pdf(payload) if provider.type in VISION_CHAT_PROVIDER_TYPES else None
        if pdf is None:
            return await super()._send_to_provider(
                provider=provider,
                authenticated_user=authenticated_user,
                router=router,
                prompt_tokens=prompt_tokens,
                payload=payload,
                request_id=request_id,
            )

        try:
            reading = read_pdf(pdf, pages=payload.pages, table_format=payload.table_format)
        except UnreadablePdfError as error:
            return _refusal(provider, f"unreadable PDF: {error}")

        with reading:
            scanned = [page for page in reading.pages if page.needs_vision]
            if len(scanned) > MAX_SCANNED_PAGES_PER_REQUEST:
                return _refusal(
                    provider,
                    f"this vision model reads images only: send one image per page (a PDF is read here with at most "
                    f"{MAX_SCANNED_PAGES_PER_REQUEST} scanned pages, this one has {len(scanned)})",
                )

            usage = Usage()
            pages: list[OCRPageObject] = []
            for page in reading.pages:
                if not page.needs_vision:
                    pages.append(
                        OCRPageObject(index=page.index, images=[], markdown=page.markdown, tables=[OCRTableObject(**t) for t in page.tables])
                    )
                    continue
                image = f"data:image/png;base64,{base64.b64encode(reading.render_png(page.index)).decode()}"
                page_payload = payload.model_copy(
                    update={
                        "document": OCRImageURLChunk(image_url=image),
                        "document_annotation_format": None,
                        "document_annotation_prompt": None,
                        "pages": None,
                    }
                )
                result = await super()._send_to_provider(
                    provider=provider,
                    authenticated_user=authenticated_user,
                    router=router,
                    prompt_tokens=prompt_tokens,
                    payload=page_payload,
                    request_id=request_id,
                )
                if not isinstance(result, ProviderResponse):
                    return result
                usage = _sum(usage, result.data.usage)
                read = result.data.pages[0] if result.data.pages else None
                pages.append(
                    OCRPageObject(index=page.index, images=[], markdown=read.markdown if read else "", truncated=read.truncated if read else None)
                )

        self.usage_context.record_usage(request_id=request_id, usage=usage)
        self.usage_repository.update_record(usage=usage, provider_id=provider.id, provider_model_name=provider.model_name)
        data = OCR(
            id=request_id,
            model=payload.model,
            pages=pages,
            usage=usage,
            usage_info=OCRUsage(pages_processed=len(pages), doc_size_bytes=len(pdf)),
        )
        return ProviderResponse(data=data)
