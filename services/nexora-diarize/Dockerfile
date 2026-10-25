# Nexora diarization service: who speaks when, on the CPU, offline (sherpa-onnx, Apache-2.0).
# The models are downloaded once, at build time, and checked against a pinned SHA-256.
FROM python:3.12-slim AS models
WORKDIR /build
COPY fetch_models.py .
RUN python -I fetch_models.py /models

FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NEXORA_DIARIZE_MODELS=/models
WORKDIR /app
COPY pyproject.toml ./
RUN python - <<'PY'
import tomllib, subprocess, sys
dependencies = tomllib.load(open("pyproject.toml", "rb"))["project"]["dependencies"]
subprocess.check_call([sys.executable, "-m", "pip", "install", "--no-cache-dir", *dependencies])
PY
COPY nexora_diarize ./nexora_diarize
COPY --from=models /models /models
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin nexora
USER nexora
EXPOSE 8001
HEALTHCHECK --interval=10s --timeout=5s --retries=30 --start-period=15s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/health', timeout=3)"
CMD ["python", "-m", "uvicorn", "--factory", "nexora_diarize.app:build_app", "--host", "0.0.0.0", "--port", "8001"]
