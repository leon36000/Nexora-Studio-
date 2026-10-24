import pytest

from api.domain.ocr.entities import CreateOCRBody, OCRDocumentURLChunk, OCRImageURL, OCRImageURLChunk
from api.domain.provider.entities import ProviderEndpoint, ProviderRequest, ProviderType
from api.domain.provider.errors import ProviderAdapterValidationRequestError
from api.infrastructure.fastapi.schemas.ocr import OCRResponse
from api.infrastructure.http import HttpProviderResponse
from api.infrastructure.http.adapters.ocr.mistral import MistralOcrAdapter
from api.infrastructure.http.adapters.ocr.openai import OpenaiOcrAdapter
from api.tests.unit.use_case.factories import ProviderFactory

PNG = "data:image/png;base64,iVBORw0KGgo="


FORMAT = {"type": "json_schema", "json_schema": {"name": "facture", "schema": {"type": "object", "properties": {"numero": {"type": "string"}}}}}


def _request(document, prompt: str | None = None, request_id: str = "req-1", **extra) -> ProviderRequest:
    body = CreateOCRBody(document=document, document_annotation_prompt=prompt, model="ocr-router", **extra)
    return ProviderRequest(id=request_id, endpoint=ProviderEndpoint.OCR, payload=body)


@pytest.fixture
def adapter() -> OpenaiOcrAdapter:
    return OpenaiOcrAdapter(provider=ProviderFactory(type=ProviderType.OPENAI, url="http://ollama:11434", model_name="qwen2.5vl:3b"))


class TestOpenaiOcrAdapter:
    def test_should_ask_the_vision_model_to_transcribe_the_image_through_chat_completions(self, adapter):
        # Act
        result = adapter.to_http_request(request=_request(OCRImageURLChunk(image_url=PNG)))

        # Assert
        assert result.url == "http://ollama:11434/v1/chat/completions"
        assert result.body["model"] == "qwen2.5vl:3b"
        assert result.body["temperature"] == 0
        assert result.body["stream"] is False
        content = result.body["messages"][0]["content"]
        assert content[0]["type"] == "text" and "Markdown" in content[0]["text"]
        assert content[1] == {"type": "image_url", "image_url": {"url": PNG}}

    def test_should_read_an_image_given_as_an_object_or_as_an_image_document(self, adapter):
        for document in (OCRImageURLChunk(image_url=OCRImageURL(url=PNG)), OCRDocumentURLChunk(document_url=PNG)):
            result = adapter.to_http_request(request=_request(document))
            assert result.body["messages"][0]["content"][1]["image_url"]["url"] == PNG

    def test_should_ask_the_annotation_prompt_instead_of_a_transcription(self, adapter):
        result = adapter.to_http_request(request=_request(OCRImageURLChunk(image_url=PNG), prompt="Décris l'image"))
        assert result.body["messages"][0]["content"][0] == {"type": "text", "text": "Décris l'image"}

    def test_should_refuse_a_pdf_a_vision_model_cannot_read(self, adapter):
        # Act
        result = adapter.to_http_request(request=_request(OCRDocumentURLChunk(document_url="data:application/pdf;base64,JVBERi0=")))

        # Assert
        assert isinstance(result, ProviderAdapterValidationRequestError)
        assert "image" in str(result.errors)

    def test_should_return_the_transcription_as_a_single_page(self, adapter):
        # Arrange
        response = HttpProviderResponse(
            data={
                "choices": [{"message": {"role": "assistant", "content": "# Facture\\n\\nTotal : 12 €"}}],
                "usage": {"prompt_tokens": 900, "completion_tokens": 12},
            }
        )

        # Act
        result = adapter.to_provider_response(http_response=response, request=_request(OCRImageURLChunk(image_url=PNG), request_id="req-9"))

        # Assert
        assert result.data.id == "req-9"
        assert result.data.model == "ocr-router"
        assert [(page.index, page.markdown, page.images) for page in result.data.pages] == [(0, "# Facture\\n\\nTotal : 12 €", [])]
        assert result.data.document_annotation is None
        assert result.data.usage_info.pages_processed == 1

    @pytest.mark.parametrize(
        "answer",
        [
            "Here is the extracted text from the image, formatted as Markdown:\n\n```markdown\nNEXORA 2026\n```",
            "```markdown\nNEXORA 2026\n```",
            "Voici le texte extrait de l'image :\n\n```\nNEXORA 2026\n```",
            "NEXORA 2026",
        ],
    )
    def test_should_keep_only_the_extracted_text_when_the_model_wraps_it(self, adapter, answer):
        # A small vision model often prefaces its transcription and fences it as a code block.
        response = HttpProviderResponse(data={"choices": [{"message": {"content": answer}}]})
        result = adapter.to_provider_response(http_response=response, request=_request(OCRImageURLChunk(image_url=PNG)))
        assert result.data.pages[0].markdown == "NEXORA 2026"

    @pytest.mark.parametrize(
        "answer",
        [
            "Here is the extracted text:\n\nNEXORA 2026",
            "Voici le texte extrait de l'image :\nNEXORA 2026",
            "The extracted text from the image is:\n\n```\nNEXORA 2026\n```",
            "Sure! Here's the text in Markdown:\nNEXORA 2026",
        ],
    )
    def test_should_drop_the_model_preamble_with_or_without_a_code_block(self, adapter, answer):
        response = HttpProviderResponse(data={"choices": [{"message": {"content": answer}}]})
        result = adapter.to_provider_response(http_response=response, request=_request(OCRImageURLChunk(image_url=PNG)))
        assert result.data.pages[0].markdown == "NEXORA 2026"

    @pytest.mark.parametrize(
        "text",
        [
            "Lancez la commande :\n```\nnexora status\n```",
            "Facture n° 2026-104 :\n\nTotal à payer : 12 €",
            "Objet : livraison du mardi\nMerci de confirmer.",
            "Le contenu du colis :\n- 2 pains\n- 1 brioche",
        ],
    )
    def test_should_keep_a_label_line_that_belongs_to_the_document(self, adapter, text):
        response = HttpProviderResponse(data={"choices": [{"message": {"content": text}}]})
        result = adapter.to_provider_response(http_response=response, request=_request(OCRImageURLChunk(image_url=PNG)))
        assert result.data.pages[0].markdown == text

    def test_should_report_a_page_the_model_stopped_reading_at_its_length_limit(self, adapter):
        # A dense page can need more than the answer budget: the text read so far is kept, flagged.
        response = HttpProviderResponse(data={"choices": [{"message": {"content": "# Contrat\n\nArticle 1"}, "finish_reason": "length"}]})
        result = adapter.to_provider_response(http_response=response, request=_request(OCRImageURLChunk(image_url=PNG)))
        assert result.data.pages[0].markdown == "# Contrat\n\nArticle 1"
        assert result.data.pages[0].truncated is True
        assert OCRResponse.model_validate(result.data.model_dump()).pages[0].truncated is True

        complete = HttpProviderResponse(data={"choices": [{"message": {"content": "Fin"}, "finish_reason": "stop"}]})
        result = adapter.to_provider_response(http_response=complete, request=_request(OCRImageURLChunk(image_url=PNG)))
        assert not result.data.pages[0].truncated

    def test_should_give_a_dense_page_room_to_be_read_whole(self, adapter):
        result = adapter.to_http_request(request=_request(OCRImageURLChunk(image_url=PNG)))
        assert result.body["max_tokens"] >= 8192

    @pytest.mark.parametrize(
        "document",
        [
            OCRImageURLChunk(image_url="http://169.254.169.254/latest/meta-data/x.png"),
            OCRImageURLChunk(image_url=OCRImageURL(url="https://intranet.local/scan.png")),
            OCRImageURLChunk(image_url="file:///etc/passwd"),
            OCRDocumentURLChunk(document_url="http://intranet.local/scan.png"),
        ],
    )
    def test_should_refuse_an_image_given_by_address_instead_of_inline(self, adapter, document):
        # The model server would fetch the address itself, from inside the instance (SSRF).
        result = adapter.to_http_request(request=_request(document))
        assert isinstance(result, ProviderAdapterValidationRequestError)
        assert "data:image/" in str(result.errors)
        assert "images only" not in str(result.errors)

    def test_should_keep_code_blocks_that_belong_to_the_document(self, adapter):
        text = "# Procédure\n\nLancez :\n\n```\nnexora status\n```\n\nPuis vérifiez."
        response = HttpProviderResponse(data={"choices": [{"message": {"content": text}}]})
        result = adapter.to_provider_response(http_response=response, request=_request(OCRImageURLChunk(image_url=PNG)))
        assert result.data.pages[0].markdown == text

    def test_should_return_the_answer_to_an_annotation_prompt_as_the_document_annotation(self, adapter):
        response = HttpProviderResponse(data={"choices": [{"message": {"content": "Un chat roux."}}]})
        result = adapter.to_provider_response(http_response=response, request=_request(OCRImageURLChunk(image_url=PNG), prompt="Décris"))
        assert result.data.document_annotation == "Un chat roux."
        assert result.data.pages[0].markdown == "Un chat roux."

    def test_should_transcribe_when_an_annotation_format_is_given(self, adapter):
        # The prompt then guides the annotation step (a chat model), not a question to the vision model.
        request = _request(OCRImageURLChunk(image_url=PNG), prompt="Montants en euros", document_annotation_format=FORMAT)
        result = adapter.to_http_request(request=request)
        assert "Markdown" in result.body["messages"][0]["content"][0]["text"]
        assert "response_format" not in result.body and "annotation_model" not in result.body

        response = HttpProviderResponse(data={"choices": [{"message": {"content": "Facture FA-12"}}]})
        data = adapter.to_provider_response(http_response=response, request=request).data
        assert data.document_annotation is None
        assert data.pages[0].markdown == "Facture FA-12"


class TestMistralOcrAdapter:
    def test_should_forward_the_annotation_format_to_mistral(self):
        adapter = MistralOcrAdapter(
            provider=ProviderFactory(type=ProviderType.MISTRAL, url="https://api.mistral.ai", model_name="mistral-ocr-latest")
        )
        request = _request(OCRImageURLChunk(image_url=PNG), prompt="Montants en euros", document_annotation_format=FORMAT, annotation_model="glm")
        result = adapter.to_http_request(request=request)
        assert result.body["document_annotation_format"] == FORMAT
        assert result.body["document_annotation_prompt"] == "Montants en euros"
        # Mistral refuses unknown fields: Nexora's extension stays here.
        assert "annotation_model" not in result.body

    def test_should_not_forward_an_annotation_prompt_without_its_format(self):
        # Nexora API has no `document_annotation_format` to forward, and Mistral refuses a prompt without it.
        adapter = MistralOcrAdapter(
            provider=ProviderFactory(type=ProviderType.MISTRAL, url="https://api.mistral.ai", model_name="mistral-ocr-latest")
        )
        result = adapter.to_http_request(request=_request(OCRImageURLChunk(image_url=PNG), prompt="Décris"))
        assert "document_annotation_prompt" not in result.body
        assert result.body["model"] == "mistral-ocr-latest"
