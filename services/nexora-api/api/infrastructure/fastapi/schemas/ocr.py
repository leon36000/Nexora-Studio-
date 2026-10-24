from typing import Annotated, Literal

from pydantic import Field, StringConstraints, field_validator

from api.domain import BaseModel
from api.domain.usage.entities import Usage


class DocumentURLChunk(BaseModel):
    document_name: Annotated[str | None, Field(default=None, description="The filename of the document.")]
    document_url: Annotated[str, Field(default=..., description="The URL of the document.")]
    type: Annotated[Literal["document_url"], Field(default="document_url", description="The type of the document.")]


class ImageURL(BaseModel):
    detail: Annotated[str | None, Field(default=None, description="The detail of the image.")]
    url: Annotated[str, Field(default=..., description="The URL of the image.")]


class ImageURLChunk(BaseModel):
    image_url: Annotated[ImageURL | str, Field(default=..., description="The URL of the image to OCR.")]
    type: Annotated[Literal["image_url"], Field(default="image_url", description="The type of the image.")]


class DocumentAnnotationFormat(BaseModel):
    type: Annotated[Literal["json_schema"], Field(default="json_schema", description="Only `json_schema` is accepted, as on Mistral.")]
    json_schema: Annotated[dict, Field(default=..., description="`name`, `schema` (a JSON Schema object), optional `strict` and `description`.")]  # fmt: off

    @field_validator("json_schema")
    @classmethod
    def require_a_schema(cls, value: dict) -> dict:
        if not isinstance(value.get("schema"), dict):
            raise ValueError("json_schema.schema must be a JSON Schema object")
        if not isinstance(value.get("name"), str) or not value["name"].strip():
            raise ValueError("json_schema.name is required")
        return value


class CreateOCRBody(BaseModel):
    document: Annotated[DocumentURLChunk | ImageURLChunk, Field(default=..., description="Document to run OCR on.")]
    document_annotation_prompt: Annotated[str | None, Field(default=None, description="Optional prompt to guide the model in extracting structured output from the entire document. A document_annotation_format must be provided.")]  # fmt: off
    document_annotation_format: Annotated[DocumentAnnotationFormat | None, Field(default=None, description="JSON Schema the whole document is annotated with; the result is `document_annotation`, a JSON string.")]  # fmt: off
    annotation_model: Annotated[str | None, Field(default=None, description="Nexora: the text-generation model that fills `document_annotation_format` when the OCR model does not annotate itself (default: `nexora-default`).")]  # fmt: off
    table_format: Annotated[Literal["markdown", "html"] | None, Field(default=None, description="null: tables inline in the page Markdown; `markdown` or `html`: tables apart in `tables`, with a placeholder in the Markdown.")]  # fmt: off
    pages: Annotated[list[int] | str | None, Field(default=None, description="Pages to read, from 0: a list, or a string such as `0,2-4`. All pages when absent.")]  # fmt: off
    model: Annotated[str, StringConstraints(strip_whitespace=True), Field(description="The model to use for the OCR, call `/v1/models` endpoint to get the list of available models, only `image-to-text` model type is supported.")]  # fmt: off


class OCRUsage(BaseModel):
    doc_size_bytes: Annotated[int | None, Field(default=None, description="Document size in bytes")]
    pages_processed: Annotated[int, Field(default=..., description="Number of pages processed")]


class OCRPageDimensions(BaseModel):
    dpi: Annotated[int, Field(default=..., description="Dots per inch of the page-image")]
    height: Annotated[int, Field(default=..., description="Height of the image in pixels")]
    width: Annotated[int, Field(default=..., description="Width of the image in pixels")]


class OCRImageObject(BaseModel):
    bottom_right_x: Annotated[int | None, Field(default=None, description="X coordinate of bottom-right corner of the extracted image")]
    bottom_right_y: Annotated[int | None, Field(default=None, description="Y coordinate of bottom-right corner of the extracted image")]
    id: Annotated[str, Field(default=..., description="Image ID for extracted image in a page")]
    image_annotation: Annotated[str | None, Field(default=None, description="Annotation of the extracted image in json str")]
    image_base64: Annotated[str | None, Field(default=None, description="Base64 string of the extracted image")]
    top_left_x: Annotated[int | None, Field(default=None, description="X coordinate of top-left corner of the extracted image")]
    top_left_y: Annotated[int | None, Field(default=None, description="Y coordinate of top-left corner of the extracted image")]


class OCRTableObject(BaseModel):
    content: Annotated[str | None, Field(default=None, description="The content of the extracted table, in the requested table format")]
    format: Annotated[str | None, Field(default=None, description="The format of the extracted table: 'markdown' or 'html'")]
    id: Annotated[str | None, Field(default=None, description="Table ID for the extracted table in a page")]


class OCRPageObject(BaseModel):
    dimensions: Annotated[OCRPageDimensions | None, Field(default=None, description="The dimensions of the PDF Page's screenshot image")]
    footer: Annotated[str | None, Field(default=None, description="The footer of the page, returned when extract_footer is enabled")]
    header: Annotated[str | None, Field(default=None, description="The header of the page, returned when extract_header is enabled")]
    hyperlinks: Annotated[list[str], Field(default=[], description="The hyperlinks extracted from the page.")]
    images: Annotated[list[OCRImageObject], Field(default=..., description="List of all extracted images in the page.")]
    index: Annotated[int, Field(default=..., description="The page index in a pdf document starting from 0")]
    markdown: Annotated[str | None, Field(default=None, description="The markdown string response of the page")]
    tables: Annotated[list[OCRTableObject], Field(default=[], description="The tables extracted from the page, in the requested table_format.")]
    truncated: Annotated[bool | None, Field(default=None, description="Nexora: true when the model stopped at its answer length limit, so the page text may be cut.")]  # fmt: off


class OCRResponse(BaseModel):
    document_annotation: Annotated[str | None, Field(default=None, description="Formatted response in the request_format if provided in json str")]  # fmt: off
    document_annotation_error: Annotated[str | None, Field(default=None, description="Nexora: why `document_annotation` is empty although a format was given.")]  # fmt: off
    id: Annotated[str | None, Field(default=None, description="The ID of the OCR request.")]
    model: Annotated[str | None, Field(default=None, description="The model used to generate the OCR.")]
    pages: Annotated[list[OCRPageObject], Field(default=..., description="List of OCR info for pages.")]
    usage: Annotated[Usage | None, Field(default=None, description="Usage information for the request.")]
    usage_info: Annotated[OCRUsage | None, Field(default=None, description="Usage information for the request.")]
