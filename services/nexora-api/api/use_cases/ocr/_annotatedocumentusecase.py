"""Nexora: fills Mistral's `document_annotation_format` with a chat model of the instance.

Mistral annotates with its own OCR model. A local vision model is small and reads one page at a
time, so Nexora API reads the document first (text layer, or the vision model page by page) and
then asks a chat model — by default the instance's default model — for one JSON object that
follows the schema, through the chat use case, so access, rate limits and usage apply to it.
"""

from dataclasses import dataclass
import json
import re

from api.domain.chat.entities import CreateChatCompletionsBody
from api.domain.key.entities import Key
from api.domain.model.errors import StatusCodeModelError
from api.domain.user.views import AuthenticatedUserView
from api.use_cases._providerrequestforwardingusecase import ProviderRequestForwardingUseCaseError
from api.use_cases.chat import CreateChatCompletionsCommand, CreateChatCompletionsUseCase, CreateChatCompletionsUseCaseSuccess

DEFAULT_ANNOTATION_MODEL = "nexora-default"
# A reasoning model spends part of the answer budget thinking before it writes the JSON.
MAX_TOKENS = 8192
# About 30 dense pages: a longer document is cut, the annotation is about its beginning.
MAX_DOCUMENT_CHARS = 120_000
INSTRUCTIONS = (
    "You extract data from a document into a JSON object that follows the JSON Schema given with it. "
    "Answer with that single JSON object only: no prose, no code fence. Use exactly the schema's keys. "
    "Copy values as the document writes them. Write numbers as JSON numbers with a dot as the decimal separator, "
    "without currency sign, unit or thousands separator. Write dates as YYYY-MM-DD. "
    "When the document does not give a value, use null: never invent one."
)
THINKING = re.compile(r"^\s*<think>.*?</think>", re.DOTALL)
REFUSED_STATUSES = frozenset({400, 422})


@dataclass
class AnnotateDocumentCommand:
    markdown: str
    response_format: dict
    prompt: str | None
    model: str
    authenticated_user: AuthenticatedUserView
    authenticated_key: Key


@dataclass
class AnnotationSucceeded:
    annotation: str


@dataclass
class AnnotationFailed:
    reason: str


def extract_json_object(answer: str) -> dict | None:
    """The first JSON object of a model's answer, after its leading `<think>` block, fenced or not."""
    text = THINKING.sub("", answer or "", count=1)
    decoder = json.JSONDecoder()
    for start in (match.start() for match in re.finditer(r"\{", text)):
        try:
            value, _ = decoder.raw_decode(text, start)
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    return None


def _schema_of(response_format: dict) -> dict:
    json_schema = response_format.get("json_schema") if isinstance(response_format, dict) else None
    return json_schema.get("schema", {}) if isinstance(json_schema, dict) else {}


class AnnotateDocumentUseCase:
    def __init__(self, chat_completions_use_case: CreateChatCompletionsUseCase) -> None:
        self.chat_completions_use_case = chat_completions_use_case

    async def execute(self, command: AnnotateDocumentCommand) -> AnnotationSucceeded | AnnotationFailed | ProviderRequestForwardingUseCaseError:
        system = INSTRUCTIONS if not command.prompt else f"{INSTRUCTIONS}\n\nInstructions for this document:\n{command.prompt}"
        schema = json.dumps(_schema_of(command.response_format), ensure_ascii=False)
        user = f"JSON Schema:\n{schema}\n\nDocument:\n{command.markdown[:MAX_DOCUMENT_CHARS]}"
        messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]

        # Not every model server enforces a JSON Schema: fall back to JSON mode, then to the prompt alone.
        formats = (command.response_format, {"type": "json_object"}, None)
        for position, response_format in enumerate(formats):
            body = {"model": command.model, "messages": messages, "temperature": 0, "max_tokens": MAX_TOKENS, "stream": False}
            if response_format is not None:
                body["response_format"] = response_format
            result = await self.chat_completions_use_case.execute(
                CreateChatCompletionsCommand(
                    payload=CreateChatCompletionsBody(**body),
                    authenticated_user=command.authenticated_user,
                    authenticated_key=command.authenticated_key,
                )
            )
            last = position == len(formats) - 1
            if isinstance(result, StatusCodeModelError) and result.status_code in REFUSED_STATUSES and not last:
                continue
            if not isinstance(result, CreateChatCompletionsUseCaseSuccess):
                return result
            break

        content = result.data.choices[0].message.content if result.data.choices else ""
        value = extract_json_object(content or "")
        if value is None:
            return AnnotationFailed(reason="the annotation model did not answer a JSON object")
        return AnnotationSucceeded(annotation=json.dumps(value, ensure_ascii=False))
