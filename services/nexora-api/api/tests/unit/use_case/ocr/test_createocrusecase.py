import base64
from unittest.mock import create_autospec

import pytest

from api.domain.model import ModelEnvironmentalImpactsComputer, ModelTokenizer
from api.domain.ocr.entities import OCR, CreateOCRBody, OCRDocumentURLChunk, OCRImageURLChunk, OCRPageObject, OCRUsage
from api.domain.provider import ProviderClient, ProviderLoadBalancer, ProviderMetricsLogger, ProviderRepository
from api.domain.provider.entities import ProviderEndpoint, ProviderResponse, ProviderType
from api.domain.provider.errors import ProviderAdapterValidationRequestError
from api.domain.router import RouterRateLimiter, RouterRepository
from api.domain.router.entities import RouterType
from api.domain.usage import UsageContext, UsageRepository
from api.domain.usage.entities import EnvironmentalImpacts, Usage
from api.tests.unit.infrastructure.documents.pdfs import PageSpec, invoice_page, make_pdf
from api.tests.unit.use_case.factories import AuthenticatedUserFactory, ProviderFactory, RouterFactory
from api.use_cases.ocr import CreateOCRUseCase


class TestCreateOCRUseCase:
    def test_should_use_text_embeddings_inference_router_type(self):
        assert CreateOCRUseCase.ROUTER_TYPE == RouterType.IMAGE_TO_TEXT

    def test_should_use_embeddings_endpoint(self):
        assert CreateOCRUseCase.ENDPOINT == ProviderEndpoint.OCR


def _pdf_payload(specs: list[PageSpec], **extra) -> CreateOCRBody:
    data = base64.b64encode(make_pdf(specs)).decode()
    return CreateOCRBody(model="vision", document=OCRDocumentURLChunk(document_url=f"data:application/pdf;base64,{data}"), **extra)


def _read_page(markdown: str, prompt_tokens: int = 900, completion_tokens: int = 40) -> ProviderResponse:
    return ProviderResponse(
        data=OCR(
            id="req",
            model="vision",
            pages=[OCRPageObject(index=0, images=[], markdown=markdown)],
            usage=Usage(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, total_tokens=prompt_tokens + completion_tokens),
            usage_info=OCRUsage(pages_processed=1),
        )
    )


@pytest.fixture
def use_case() -> CreateOCRUseCase:
    tokenizer = create_autospec(ModelTokenizer, instance=True, spec_set=True)
    tokenizer.compute_tokens.side_effect = lambda texts: len(texts)
    impacts = create_autospec(ModelEnvironmentalImpactsComputer, instance=True, spec_set=True)
    impacts.compute.return_value = EnvironmentalImpacts()
    return CreateOCRUseCase(
        model_environmental_impacts_computer=impacts,
        model_tokenizer=tokenizer,
        provider_client=create_autospec(ProviderClient, instance=True, spec_set=True),
        provider_load_balancer=create_autospec(ProviderLoadBalancer, instance=True, spec_set=True),
        provider_metrics_logger=create_autospec(ProviderMetricsLogger, instance=True, spec_set=True),
        provider_repository=create_autospec(ProviderRepository, instance=True, spec_set=True),
        router_rate_limiter=create_autospec(RouterRateLimiter, instance=True, spec_set=True),
        router_repository=create_autospec(RouterRepository, instance=True, spec_set=True),
        usage_context=create_autospec(UsageContext, instance=True, spec_set=True),
        usage_repository=create_autospec(UsageRepository, instance=True, spec_set=True),
    )


async def _send(use_case: CreateOCRUseCase, payload: CreateOCRBody, provider_type: ProviderType = ProviderType.OPENAI):
    provider = ProviderFactory(type=provider_type, model_name="qwen2.5vl:3b")
    router = RouterFactory(type=RouterType.IMAGE_TO_TEXT, cost_prompt_tokens=0, cost_completion_tokens=0)
    return await use_case._send_to_provider(
        provider=provider,
        authenticated_user=AuthenticatedUserFactory(admin=True),
        router=router,
        prompt_tokens=0,
        payload=payload,
        request_id="req-1",
    )


class TestReadPdf:
    @pytest.mark.asyncio
    async def test_should_read_a_digital_pdf_without_calling_the_model(self, use_case):
        result = await _send(use_case, _pdf_payload([invoice_page(), invoice_page()]))

        assert isinstance(result, ProviderResponse)
        use_case.provider_client.forward.assert_not_awaited()
        assert [page.index for page in result.data.pages] == [0, 1]
        assert "| Pose de parquet | 25 | 1 000,00 |" in result.data.pages[0].markdown
        assert result.data.usage_info.pages_processed == 2
        assert result.data.usage.total_tokens == 0
        use_case.usage_repository.update_record.assert_called_once()

    @pytest.mark.asyncio
    async def test_should_return_tables_apart_when_a_table_format_is_asked(self, use_case):
        result = await _send(use_case, _pdf_payload([invoice_page()], table_format="html"))

        page = result.data.pages[0]
        assert "[tbl-0.html](tbl-0.html)" in page.markdown
        assert page.tables[0].format == "html" and page.tables[0].content.startswith("<table>")

    @pytest.mark.asyncio
    async def test_should_read_scanned_pages_with_the_vision_model(self, use_case):
        use_case.provider_client.forward.side_effect = [_read_page("Facture scannée"), _read_page("Page 3", 800, 20)]

        result = await _send(use_case, _pdf_payload([PageSpec(image=True), invoice_page(), PageSpec(image=True)]))

        assert [page.markdown for page in result.data.pages][0::2] == ["Facture scannée", "Page 3"]
        assert "Atelier Dubois" in result.data.pages[1].markdown
        assert use_case.provider_client.forward.await_count == 2
        sent = use_case.provider_client.forward.await_args_list[0].kwargs["request"].payload
        assert isinstance(sent.document, OCRImageURLChunk)
        assert sent.document.image_url.startswith("data:image/png;base64,")
        assert result.data.usage.prompt_tokens == 1700 and result.data.usage.completion_tokens == 60
        assert use_case.usage_repository.update_record.call_args.kwargs["usage"].total_tokens == 1760

    @pytest.mark.asyncio
    async def test_should_read_only_the_requested_pages(self, use_case):
        result = await _send(use_case, _pdf_payload([invoice_page(), PageSpec(image=True), invoice_page()], pages=[2]))

        assert [page.index for page in result.data.pages] == [2]
        use_case.provider_client.forward.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_should_refuse_more_than_ten_scanned_pages_as_images_only(self, use_case):
        result = await _send(use_case, _pdf_payload([PageSpec(image=True)] * 11))

        assert isinstance(result, ProviderAdapterValidationRequestError)
        assert "images only" in str(result.errors)
        use_case.provider_client.forward.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_should_refuse_a_broken_pdf(self, use_case):
        payload = CreateOCRBody(model="vision", document=OCRDocumentURLChunk(document_url="data:application/pdf;base64,JVBERi0xLjQKJQ=="))

        result = await _send(use_case, payload)

        assert isinstance(result, ProviderAdapterValidationRequestError)
        assert "PDF" in str(result.errors)

    @pytest.mark.asyncio
    async def test_should_forward_a_pdf_to_mistral_as_is(self, use_case):
        use_case.provider_client.forward.return_value = _read_page("lu par Mistral")
        payload = _pdf_payload([invoice_page()])

        result = await _send(use_case, payload, provider_type=ProviderType.MISTRAL)

        assert result.data.pages[0].markdown == "lu par Mistral"
        assert use_case.provider_client.forward.await_args.kwargs["request"].payload.document == payload.document
