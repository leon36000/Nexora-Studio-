from http import HTTPMethod
import logging
import re

from pydantic import ValidationError

from api.domain.ocr.entities import OCR, OCRImageURL, OCRImageURLChunk, OCRPageObject, OCRUsage
from api.domain.provider.entities import ProviderRequest, ProviderResponse
from api.domain.provider.errors import ProviderAdapterValidationRequestError, ProviderAdapterValidationResponseError
from api.infrastructure.http._httpproviderrequest import HttpProviderRequest
from api.infrastructure.http._httpproviderresponse import HttpProviderResponse
from api.infrastructure.http.adapters.ocr import OcrAdapter

logger = logging.getLogger(__name__)

TRANSCRIPTION_PROMPT = (
    "Extract all the text of this image as Markdown. Keep the original language, the reading order "
    "and the structure (headings, lists, tables). Answer with the extracted text only."
)
# Room for a dense page (contracts, tables): a cut answer is kept but flagged `truncated`.
MAX_TOKENS = 8192
# A small vision model often prefaces its transcription (« Here is the extracted text…: », « Voici le
# texte extrait : ») and fences it as a code block. Only these known preambles are dropped: a label
# line of the document itself (« Facture n° 12 : ») stays.
MODEL_PREAMBLE = re.compile(
    r"(?:sure[,!.]?\s*)?(?:here\s+is|here's|here\s+are|below\s+is|voici|ci-dessous)\b[^\n`:]{0,80}?"
    r"\b(?:text|transcription|content|markdown|texte|contenu)\b[^\n`:]{0,120}:"
    r"|the\s+(?:extracted\s+)?text\s+(?:extracted\s+)?(?:from|in|of|on)\s+(?:the|this)\s+(?:image|page|document)\b[^\n`:]{0,80}:"
    r"|the\s+extracted\s+text\b[^\n`:]{0,80}:"
    r"|le\s+texte\s+(?:extrait|lu|de\s+l['’]image|de\s+la\s+page)\b[^\n`:]{0,80}:",
    re.IGNORECASE,
)
WHOLE_FENCE = re.compile(r"```[A-Za-z]*\n(?P<text>.*?)\n?```", re.DOTALL)


def unwrap_transcription(answer: str) -> str:
    """The transcription without the model's known preamble line and outer code fence, if any."""
    first_line, _, rest = answer.strip().partition("\n")
    text = rest.strip() if MODEL_PREAMBLE.fullmatch(first_line.strip()) else answer.strip()
    fenced = WHOLE_FENCE.fullmatch(text)
    if fenced:
        return fenced.group("text").strip()
    return text if text != answer.strip() else answer


def _inline_image(url: str) -> bool:
    return url.startswith("data:image/")


class OpenaiOcrAdapter(OcrAdapter):
    """Nexora: OCR with a vision model served by an OpenAI-compatible API (Ollama, vLLM).

    The model reads one image through chat completions and its answer becomes the single page of
    the OCR response. With `document_annotation_prompt`, the model answers that prompt instead
    (the Vision block asks its own question) and the answer is the document annotation. A vision
    model reads images only: a PDF is refused, callers send one image per page.
    """

    TARGET_ENDPOINT_ROUTE = "/v1/chat/completions"
    TARGET_ENDPOINT_METHOD = HTTPMethod.POST

    def to_http_request(self, request: ProviderRequest) -> HttpProviderRequest | ProviderAdapterValidationRequestError:
        document = request.payload.document
        if isinstance(document, OCRImageURLChunk):
            image_url = document.image_url.url if isinstance(document.image_url, OCRImageURL) else document.image_url
        elif document.document_url.startswith("data:application/pdf"):
            return ProviderAdapterValidationRequestError(
                provider_type=self.provider.type,
                errors=[{"loc": ["body", "document"], "msg": "this vision model reads images only: send one image per page", "type": "value_error"}],
            )
        else:
            image_url = document.document_url
        # The model server would download an address itself, from inside the instance: only inline images.
        if not _inline_image(image_url):
            return ProviderAdapterValidationRequestError(
                provider_type=self.provider.type,
                errors=[{"loc": ["body", "document"], "msg": "send the image inline, as a data:image/… URL", "type": "value_error"}],
            )

        prompt = request.payload.document_annotation_prompt or TRANSCRIPTION_PROMPT
        return HttpProviderRequest(
            method=self.TARGET_ENDPOINT_METHOD,
            url=self._build_target_url(base_url=self.provider.url, target_endpoint_route=self.TARGET_ENDPOINT_ROUTE),
            body={
                "model": self.provider.model_name,
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}, {"type": "image_url", "image_url": {"url": image_url}}],
                    }
                ],
                "temperature": 0,
                "max_tokens": MAX_TOKENS,
                "stream": False,
            },
        )

    def to_provider_response(
        self,
        http_response: HttpProviderResponse,
        request: ProviderRequest,
    ) -> ProviderResponse | ProviderAdapterValidationResponseError:
        try:
            choice = http_response.data["choices"][0]
            content = choice["message"]["content"] or ""
            truncated = choice.get("finish_reason") == "length"
            if truncated:
                logger.warning("vision model %s stopped at its length limit: the page text may be cut", self.provider.model_name)
            data = OCR(
                id=request.id,
                model=request.payload.model,
                pages=[
                    OCRPageObject(
                        index=0,
                        images=[],
                        markdown=content if request.payload.document_annotation_prompt else unwrap_transcription(content),
                        truncated=truncated or None,
                    )
                ],
                document_annotation=content if request.payload.document_annotation_prompt else None,
                usage_info=OCRUsage(pages_processed=1),
            )
        except (KeyError, IndexError, TypeError) as error:
            return ProviderAdapterValidationResponseError(
                provider_type=self.provider.type,
                errors=[{"loc": ["choices", 0, "message", "content"], "msg": f"no answer from the vision model: {error!r}", "type": "missing"}],
            )
        except ValidationError as error:
            return ProviderAdapterValidationResponseError(provider_type=self.provider.type, errors=error.errors())

        return ProviderResponse(data=data)
