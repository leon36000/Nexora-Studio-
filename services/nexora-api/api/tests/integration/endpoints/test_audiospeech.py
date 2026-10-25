import json
from unittest.mock import AsyncMock, MagicMock
from urllib.parse import urljoin

import httpx
from httpx import AsyncClient
import pytest
import pytest_asyncio
import respx

from api.dependencies import create_audio_speech_use_case_factory
from api.domain.model.errors import StatusCodeModelError, TooBusyModelError, UnknownModelError
from api.domain.provider.entities import HostingZone, ProviderEndpoint, ProviderType
from api.domain.provider.errors import NoAvailableProviderError, UnsupportedProviderEndpointError
from api.domain.role.entities import LimitType
from api.domain.router.entities import RouterType
from api.domain.router.errors import RouterHasNoProvidersError, RouterHasWrongTypeError, RouterNotFoundError, RouterRateLimitExceededError
from api.domain.user.errors import UserHasNoAccessToRouterError
from api.infrastructure.fastapi.routes import EndpointRoute
from api.tests.helpers import INVALID_API_KEY, create_key
from api.tests.integration.conftest import override_global_context
from api.tests.integration.endpoints.utils import DEFAULT_PROVIDER_URL
from api.tests.integration.factories.sql import RouterSQLFactory, UserSQLFactory

URL = f"/v1{EndpointRoute.AUDIO_SPEECH}"
DEFAULT_MODEL_NAME = "voix-fr"
WAV_BYTES = b"RIFF$\x00\x00\x00WAVEfmt "


@pytest.mark.asyncio(loop_scope="session")
class TestCreateAudioSpeech:
    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, db_session, test_redis_pool):
        self.user = UserSQLFactory(name="Alice", email="alice@example.com")
        self.key = await create_key(db_session, name="user_key", user=self.user)
        self.router_owner = UserSQLFactory(name="Bob", email="bob@example.com", admin_user=True)

        mock_tokenizer = MagicMock()
        mock_tokenizer.encode.side_effect = lambda text: [0] * 7 if text else []
        with override_global_context(redis_pool=test_redis_pool, tokenizer=mock_tokenizer):
            yield

    @respx.mock
    async def test_happy_path(self, client: AsyncClient, db_session):
        admin_key = await create_key(db_session, name="admin_speech_key", user=self.router_owner)
        RouterSQLFactory(
            user=self.router_owner,
            name=DEFAULT_MODEL_NAME,
            type=RouterType.TEXT_TO_SPEECH,
            providers=1,
            providers__type=ProviderType.OPENAI,
            providers__url=DEFAULT_PROVIDER_URL,
            providers__model_hosting_zone=HostingZone.FRA,
        )
        await db_session.flush()
        route = respx.post(url=urljoin(DEFAULT_PROVIDER_URL, "/v1/audio/speech")).mock(
            return_value=httpx.Response(status_code=200, content=WAV_BYTES, headers={"Content-Type": "audio/wav"})
        )

        response = await client.post(
            url=URL,
            headers={"Authorization": f"Bearer {admin_key.token}"},
            json={"model": DEFAULT_MODEL_NAME, "input": "Bonjour à tous", "voice": "siwis", "response_format": "wav"},
        )

        assert response.status_code == 200, response.text
        assert response.headers["content-type"] == "audio/wav"
        assert response.content == WAV_BYTES
        sent = json.loads(route.calls[0].request.content)
        assert sent["model"] != DEFAULT_MODEL_NAME  # the provider's own model name replaces the router name
        assert (sent["input"], sent["voice"], sent["response_format"], sent["speed"]) == ("Bonjour à tous", "siwis", "wav", 1.0)

    async def test_rejects_an_unknown_api_key(self, client: AsyncClient):
        response = await client.post(
            url=URL,
            headers={"Authorization": f"Bearer {INVALID_API_KEY}"},
            json={"model": DEFAULT_MODEL_NAME, "input": "Bonjour"},
        )

        assert response.status_code == 401

    async def test_rejects_an_empty_text(self, client: AsyncClient):
        response = await client.post(
            url=URL,
            headers={"Authorization": f"Bearer {self.key.token}"},
            json={"model": DEFAULT_MODEL_NAME, "input": ""},
        )

        assert response.status_code == 422

    @pytest.mark.parametrize(
        "use_case_result,expected_status,expected_detail",
        [
            (RouterNotFoundError(name=DEFAULT_MODEL_NAME), 404, f"Model {DEFAULT_MODEL_NAME} not found."),
            (RouterHasNoProvidersError(id=1), 404, f"Model {DEFAULT_MODEL_NAME} not found."),
            (UserHasNoAccessToRouterError(id=1), 404, f"Model {DEFAULT_MODEL_NAME} not found."),
            (
                RouterHasWrongTypeError(id=1, actual_type=RouterType.TEXT_GENERATION, expected_type=RouterType.TEXT_TO_SPEECH),
                422,
                "Model has wrong type. Expected: text-to-speech. Actual: text-generation.",
            ),
            (NoAvailableProviderError(router_id=1), 503, "Model is too busy, please try again later."),
            (TooBusyModelError(status_code=503, detail="provider busy"), 503, "Model is too busy, please try again later."),
            (RouterRateLimitExceededError(id=1, limit_type=LimitType.RPM, headers={}), 429, "Request limit per minute exceeded."),
            (StatusCodeModelError(status_code=400, detail="bad request"), 400, "bad request"),
            (UnknownModelError(status_code=500, detail="upstream failure"), 500, "upstream failure"),
            (
                UnsupportedProviderEndpointError(endpoint=ProviderEndpoint.AUDIO_SPEECH, provider_type=ProviderType.VLLM),
                500,
                "Model provider type vllm does not support the /audio/speech endpoint.",
            ),
        ],
    )
    async def test_error_maps_to_correct_http_status(self, client: AsyncClient, app, use_case_result, expected_status, expected_detail):
        mock_use_case = AsyncMock()
        mock_use_case.execute.return_value = use_case_result
        app.dependency_overrides[create_audio_speech_use_case_factory] = lambda: mock_use_case

        response = await client.post(
            url=URL,
            headers={"Authorization": f"Bearer {self.key.token}"},
            json={"model": DEFAULT_MODEL_NAME, "input": "Bonjour"},
        )

        assert response.status_code == expected_status
        assert response.json()["detail"] == expected_detail
