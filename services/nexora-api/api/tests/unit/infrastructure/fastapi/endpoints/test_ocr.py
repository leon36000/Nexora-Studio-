import json
from unittest.mock import AsyncMock, Mock

from fastapi import HTTPException
import pytest

from api.domain.ocr.entities import OCR, OCRPageObject, OCRTableObject, OCRUsage
from api.domain.provider.errors import ProviderAdapterValidationRequestError
from api.domain.router.errors import RouterNotFoundError
from api.infrastructure.fastapi.endpoints.ocr import create_ocr
from api.infrastructure.fastapi.schemas.ocr import CreateOCRBody
from api.tests.unit.use_case.factories import AuthenticatedUserFactory, KeyFactory
from api.use_cases.ocr import AnnotationFailed, AnnotationSucceeded, CreateOCRUseCaseSuccess

FORMAT = {"type": "json_schema", "json_schema": {"name": "facture", "schema": {"type": "object", "properties": {"numero": {"type": "string"}}}}}
PNG = "data:image/png;base64,iVBORw0KGgo="


def _ocr(annotation: str | None = None) -> CreateOCRUseCaseSuccess:
    pages = [
        OCRPageObject(
            index=0,
            images=[],
            markdown="# Facture FA-12\n\n[tbl-0.html](tbl-0.html)",
            tables=[OCRTableObject(id="tbl-0.html", content="<table>…</table>", format="html")],
        ),
        OCRPageObject(index=1, images=[], markdown="Total TTC : 1 500 €"),
    ]
    return CreateOCRUseCaseSuccess(
        data=OCR(id="r", model="vision", pages=pages, document_annotation=annotation, usage_info=OCRUsage(pages_processed=2)), headers={}
    )


async def _call(body: dict, ocr_result, annotation_result=None):
    ocr_use_case = Mock(execute=AsyncMock(return_value=ocr_result))
    annotate = Mock(execute=AsyncMock(return_value=annotation_result))
    response = await create_ocr(
        body=CreateOCRBody(**body),
        create_ocr_use_case=ocr_use_case,
        annotate_document_use_case=annotate,
        authenticated_user=AuthenticatedUserFactory(admin=True),
        autenticated_key=KeyFactory(),
    )
    return response, annotate


class TestCreateOcr:
    @pytest.mark.asyncio
    async def test_should_annotate_the_read_text_with_the_default_chat_model(self):
        response, annotate = await _call(
            {
                "model": "vision",
                "document": {"type": "image_url", "image_url": PNG},
                "document_annotation_format": FORMAT,
                "document_annotation_prompt": "En euros",
            },
            _ocr(),
            AnnotationSucceeded(annotation='{"numero": "FA-12"}'),
        )

        body = json.loads(response.body)
        assert body["document_annotation"] == '{"numero": "FA-12"}'
        command = annotate.execute.await_args.args[0]
        assert command.model == "nexora-default" and command.prompt == "En euros"
        assert command.response_format["json_schema"]["name"] == "facture"
        # Tables apart are put back where their placeholder sits, so the annotation model reads them.
        assert "<table>…</table>" in command.markdown and "Total TTC : 1 500 €" in command.markdown

    @pytest.mark.asyncio
    async def test_should_use_the_annotation_model_asked(self):
        _, annotate = await _call(
            {
                "model": "vision",
                "document": {"type": "image_url", "image_url": PNG},
                "document_annotation_format": FORMAT,
                "annotation_model": "qwen2.5:7b",
            },
            _ocr(),
            AnnotationSucceeded(annotation="{}"),
        )
        assert annotate.execute.await_args.args[0].model == "qwen2.5:7b"

    @pytest.mark.asyncio
    async def test_should_keep_the_annotation_of_an_ocr_model_that_annotates_itself(self):
        response, annotate = await _call(
            {"model": "mistral-ocr", "document": {"type": "image_url", "image_url": PNG}, "document_annotation_format": FORMAT},
            _ocr('{"numero": "M-1"}'),
        )
        assert json.loads(response.body)["document_annotation"] == '{"numero": "M-1"}'
        annotate.execute.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_should_not_annotate_without_a_format(self):
        response, annotate = await _call({"model": "vision", "document": {"type": "image_url", "image_url": PNG}}, _ocr())
        assert json.loads(response.body)["document_annotation"] is None
        annotate.execute.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_should_report_why_the_annotation_is_empty(self):
        response, _ = await _call(
            {"model": "vision", "document": {"type": "image_url", "image_url": PNG}, "document_annotation_format": FORMAT},
            _ocr(),
            AnnotationFailed(reason="the annotation model did not answer a JSON object"),
        )
        body = json.loads(response.body)
        assert body["document_annotation"] is None
        assert "JSON" in body["document_annotation_error"]
        assert body["pages"][1]["markdown"] == "Total TTC : 1 500 €"

    @pytest.mark.asyncio
    async def test_should_name_the_annotation_model_when_it_is_unknown(self):
        with pytest.raises(HTTPException) as raised:
            await _call(
                {
                    "model": "vision",
                    "document": {"type": "image_url", "image_url": PNG},
                    "document_annotation_format": FORMAT,
                    "annotation_model": "absent",
                },
                _ocr(),
                RouterNotFoundError(name="absent"),
            )
        assert raised.value.status_code == 404
        assert "absent" in str(raised.value.detail)

    @pytest.mark.asyncio
    async def test_should_refuse_a_broken_pdf_with_422(self):
        error = ProviderAdapterValidationRequestError(provider_type="openai", errors=[{"msg": "unreadable PDF"}])
        with pytest.raises(HTTPException) as raised:
            await _call({"model": "vision", "document": {"type": "document_url", "document_url": "data:application/pdf;base64,AA=="}}, error)
        assert raised.value.status_code == 422

    def test_should_refuse_a_format_without_schema(self):
        with pytest.raises(ValueError):
            CreateOCRBody(
                model="v",
                document={"type": "image_url", "image_url": PNG},
                document_annotation_format={"type": "json_schema", "json_schema": {"name": "x"}},
            )
