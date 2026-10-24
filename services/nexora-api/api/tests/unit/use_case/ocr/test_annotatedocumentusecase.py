import json
from unittest.mock import AsyncMock, create_autospec

import pytest

from api.domain.chat.entities import ChatCompletion
from api.domain.model.errors import StatusCodeModelError
from api.domain.router.errors import RouterNotFoundError
from api.tests.unit.use_case.factories import AuthenticatedUserFactory, KeyFactory
from api.use_cases.chat import CreateChatCompletionsUseCase, CreateChatCompletionsUseCaseSuccess
from api.use_cases.ocr import AnnotateDocumentCommand, AnnotateDocumentUseCase, AnnotationFailed, AnnotationSucceeded, extract_json_object

SCHEMA = {
    "type": "object",
    "properties": {"numero": {"type": ["string", "null"]}, "total_ttc": {"type": ["number", "null"]}},
    "required": ["numero", "total_ttc"],
    "additionalProperties": False,
}
FORMAT = {"type": "json_schema", "json_schema": {"name": "facture", "strict": True, "schema": SCHEMA}}


def _answer(content: str, **message) -> CreateChatCompletionsUseCaseSuccess:
    completion = ChatCompletion(
        id="chat-1",
        model="glm",
        object="chat.completion",
        created=0,
        choices=[{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": content, **message}}],
    )
    return CreateChatCompletionsUseCaseSuccess(data=completion, headers={})


@pytest.fixture
def chat() -> CreateChatCompletionsUseCase:
    use_case = create_autospec(CreateChatCompletionsUseCase, instance=True)
    use_case.execute = AsyncMock()
    return use_case


def _command(prompt: str | None = None) -> AnnotateDocumentCommand:
    return AnnotateDocumentCommand(
        markdown="# Facture FA-12\n\nTotal TTC : 1 500,00 €",
        response_format=FORMAT,
        prompt=prompt,
        model="nexora-default",
        authenticated_user=AuthenticatedUserFactory(admin=True),
        authenticated_key=KeyFactory(),
    )


class TestAnnotateDocumentUseCase:
    @pytest.mark.asyncio
    async def test_should_ask_the_chat_model_with_the_json_schema(self, chat):
        chat.execute.return_value = _answer('{"numero": "FA-12", "total_ttc": 1500}')

        result = await AnnotateDocumentUseCase(chat_completions_use_case=chat).execute(_command(prompt="Montants en euros."))

        assert isinstance(result, AnnotationSucceeded)
        assert json.loads(result.annotation) == {"numero": "FA-12", "total_ttc": 1500}
        payload = chat.execute.await_args.args[0].payload
        assert payload.model == "nexora-default"
        assert payload.response_format == FORMAT
        assert payload.temperature == 0 and payload.stream is False and payload.max_tokens >= 4096
        system, user = payload.messages
        assert system["role"] == "system" and "Montants en euros." in system["content"]
        assert "Total TTC : 1 500,00 €" in user["content"] and '"total_ttc"' in user["content"]

    @pytest.mark.asyncio
    async def test_should_retry_without_response_format_when_refused(self, chat):
        chat.execute.side_effect = [
            StatusCodeModelError(status_code=400, detail="response_format json_schema is not supported"),
            StatusCodeModelError(status_code=400, detail="response_format is not supported"),
            _answer('{"numero": "FA-12", "total_ttc": 1500}'),
        ]

        result = await AnnotateDocumentUseCase(chat_completions_use_case=chat).execute(_command())

        assert isinstance(result, AnnotationSucceeded)
        formats = [getattr(call.args[0].payload, "response_format", None) for call in chat.execute.await_args_list]
        assert formats == [FORMAT, {"type": "json_object"}, None]

    @pytest.mark.asyncio
    async def test_should_return_other_errors_as_they_are(self, chat):
        error = RouterNotFoundError(name="nexora-default")
        chat.execute.return_value = error

        assert await AnnotateDocumentUseCase(chat_completions_use_case=chat).execute(_command()) is error

    @pytest.mark.asyncio
    async def test_should_keep_the_json_after_the_reasoning(self, chat):
        chat.execute.return_value = _answer('<think>Le total est…</think>\n```json\n{"numero": "FA-12", "total_ttc": 1500.5}\n```')

        result = await AnnotateDocumentUseCase(chat_completions_use_case=chat).execute(_command())

        assert json.loads(result.annotation)["total_ttc"] == 1500.5

    @pytest.mark.asyncio
    async def test_should_report_an_answer_without_json(self, chat):
        chat.execute.return_value = _answer("Je ne trouve pas de facture.")

        result = await AnnotateDocumentUseCase(chat_completions_use_case=chat).execute(_command())

        assert isinstance(result, AnnotationFailed)
        assert "JSON" in result.reason


class TestExtractJsonObject:
    @pytest.mark.parametrize(
        "answer, expected",
        [
            ('{"a": 1}', {"a": 1}),
            ('Voici :\n```json\n{"a": "}"}\n```\nBonne journée', {"a": "}"}),
            ('<think>{"draft": true}</think>{"a": 2}', {"a": 2}),
            ('[1, 2] puis {"a": 3}', {"a": 3}),
            ("pas de JSON", None),
            ("", None),
        ],
    )
    def test_should_find_the_first_object_of_the_answer(self, answer, expected):
        assert extract_json_object(answer) == expected
