from typing import Annotated

from pydantic import Field

from api.domain import BaseModel


class HttpProviderResponse(BaseModel):
    data: Annotated[dict | list | None, Field(default=None, description="The JSON data to use for the response.")]
    text: Annotated[str | None, Field(default=None, description="The text data to use for the response.")]
    content: Annotated[bytes | None, Field(default=None, description="The raw bytes of a binary (audio) response.")]
    media_type: Annotated[str | None, Field(default=None, description="The media type of the binary response.")]
