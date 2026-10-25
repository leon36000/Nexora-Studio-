"""HTTP face of the diarization service: `POST /diarize` (multipart `file`, optional `num_speakers`) and `GET /health`."""

import logging
import os
from collections.abc import Callable
from pathlib import Path
from typing import Annotated, Any, Protocol

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool

from nexora_diarize.audio import SAMPLE_RATE, DiarizeError, decode_audio
from nexora_diarize.pipeline import Diarizer, Turn

__all__ = ["DiarizeError", "build_app", "create_app"]

logger = logging.getLogger(__name__)

DEFAULT_MAX_SECONDS = 7200


class SupportsDiarize(Protocol):
    def diarize(self, samples: Any, num_speakers: int | None) -> list[Turn]: ...


def create_app(diarizer: SupportsDiarize, decode: Callable[[bytes], Any] = decode_audio, max_seconds: int = DEFAULT_MAX_SECONDS) -> FastAPI:
    app = FastAPI(title="Nexora diarization", docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/diarize")
    async def diarize(
        file: Annotated[UploadFile, File(description="The recording, in any format FFmpeg reads.")],
        num_speakers: Annotated[int | None, Form(ge=1, le=20, description="The number of speakers, when known.")] = None,
    ) -> dict[str, Any]:
        data = await file.read()
        try:
            samples = await run_in_threadpool(decode, data)
        except DiarizeError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        duration = len(samples) / SAMPLE_RATE
        if duration > max_seconds:
            raise HTTPException(
                status_code=422, detail=f"the recording is too long ({round(duration / 60)} min); the limit is {max_seconds // 60} min"
            )
        try:
            turns = await run_in_threadpool(diarizer.diarize, samples, num_speakers)
        except Exception:
            logger.exception("Diarization failed")
            raise HTTPException(status_code=500, detail="the diarization failed") from None
        return {
            "duration": round(duration, 3),
            "speakers": len({turn.speaker for turn in turns}),
            "turns": [{"start": turn.start, "end": turn.end, "speaker": turn.speaker} for turn in turns],
        }

    return app


def build_app() -> FastAPI:
    """Entry point of the container (`uvicorn --factory nexora_diarize.app:build_app`): models are read from `NEXORA_DIARIZE_MODELS`."""
    logging.basicConfig(level=logging.INFO)
    diarizer = Diarizer(
        models_dir=Path(os.environ.get("NEXORA_DIARIZE_MODELS", "/models")),
        threads=int(os.environ.get("NEXORA_DIARIZE_THREADS", "2")),
        threshold=float(os.environ.get("NEXORA_DIARIZE_THRESHOLD", "0.85")),
    )
    return create_app(diarizer, max_seconds=int(os.environ.get("NEXORA_DIARIZE_MAX_SECONDS", str(DEFAULT_MAX_SECONDS))))
