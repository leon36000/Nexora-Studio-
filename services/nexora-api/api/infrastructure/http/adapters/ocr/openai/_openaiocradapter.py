from http import HTTPMethod
import re

from pydantic import ValidationError

from api.domain.ocr.entities import OCR, OCRImageURL, OCRImageURLChunk, OCRPageObject, OCRUsage
from api.domain.provider.entities import ProviderRequest, ProviderResponse
from api.domain.provider.errors import ProviderAdapterValidationRequestError, ProviderAdapterValidationResponseError
from api.infrastructure.http._httpproviderrequest import HttpProviderRequest
from api.infrastructure.http._httpproviderresponse import HttpProviderResponse
from api.infrastructure.http.adapters.ocr import OcrAdapter

TRANSCRIPTION_PROMPT = (
    "Extract all the text of this image as Markdown. Keep the original language, the reading order "
    "and the structure (headings, lists, tables). Answer with the extracted text only."
)
MAX_TOKENS = 4096
# A small vision model often answers « Here is the extracted text…: » and fences the text as a code
# block. When the whole answer is that wrapping, only the text inside is the transcription.
WRAPPED_TRANSCRIPTION = re.compile(r"\s*(?:[^\n`]{0,200}:\s*)?```[A-Za-z]*\n(?P<text>.*?)\n?```\s*", re.DOTALL)


def unwrap_transcription(answer: str) -> str:
    wrapped = WRAPPED_TRANSCRIPTION.fullmatch(answer)
    return wrapped.group("text").strip() if wrapped else answer


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
        elif document.document_url.startswith("data:image/"):
            image_url = document.document_url
        else:
            return ProviderAdapterValidationRequestError(
                provider_type=self.provider.type,
                errors=[{"loc": ["body", "document"], "msg": "this vision model reads images only: send one image per page", "type": "value_error"}],
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
            content = http_response.data["choices"][0]["message"]["content"] or ""
            data = OCR(
                id=request.id,
                model=request.payload.model,
                pages=[
                    OCRPageObject(
                        index=0, images=[], markdown=content if request.payload.document_annotation_prompt else unwrap_transcription(content)
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
