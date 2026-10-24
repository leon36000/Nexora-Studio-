from api.domain.provider.entities import ProviderRequest
from api.domain.provider.errors import ProviderAdapterValidationRequestError
from api.infrastructure.http._httpproviderrequest import HttpProviderRequest
from api.infrastructure.http.adapters.ocr import OcrAdapter


class MistralOcrAdapter(OcrAdapter):
    def to_http_request(self, request: ProviderRequest) -> HttpProviderRequest | ProviderAdapterValidationRequestError:
        http_request = super().to_http_request(request)
        # Nexora: Mistral refuses an annotation prompt without `document_annotation_format` (the
        # Vision block's question): the OCR text is returned instead. Mistral refuses unknown fields.
        if "document_annotation_format" not in http_request.body:
            http_request.body.pop("document_annotation_prompt", None)
        http_request.body.pop("annotation_model", None)
        return http_request
