# ========================================
# Combined Presidio service (analyzer + anonymizer) on a single port (5001).
# CPU spaCy NER + regex/checksum pattern recognizers.
#
# Nexora edition: French and English with the small spaCy models instead of five languages with
# the large ones, a multi-stage build (no compiler in the final image) and the model wheels checked
# against pinned SHA-256 sums (docker/pii-models.sha256). Choose other languages with
#   --build-arg SPACY_MODELS="es_core_news_sm-3.8.0 ..." --build-arg PII_SPACY_MODELS="es:es_core_news_sm"
# (add the sums of the wheels to pii-models.sha256, or build with ALLOW_UNPINNED_MODELS=1).
#
# Source files are COPY'd last so code edits never re-download deps or models.
# ========================================
FROM python:3.12-slim-bookworm AS builder

WORKDIR /build

# build-essential for any sdist that compiles native deps (e.g. blis/thinc).
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Pinned Python deps. Separate layer so source edits don't reinstall them.
COPY apps/pii/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Pinned spaCy models, downloaded with retries/resume (the wheels truncate on flaky networks if pip
# fetches the URLs directly) and checked against docker/pii-models.sha256. Licences: en_core_web_sm
# MIT; fr_core_news_sm LGPL-LR (a data resource downloaded here, never stored in the repository).
ARG SPACY_MODELS="fr_core_news_sm-3.8.0 en_core_web_sm-3.8.0"
ARG ALLOW_UNPINNED_MODELS=0
COPY docker/pii-models.sha256 ./pii-models.sha256
RUN for model in ${SPACY_MODELS}; do \
      whl="${model}-py3-none-any.whl"; \
      curl -fL --retry 5 --retry-delay 5 --retry-all-errors -C - \
        -o "/tmp/${whl}" \
        "https://github.com/explosion/spacy-models/releases/download/${model}/${whl}" || exit 1; \
      expected="$(awk -v f="${whl}" '$2 == f { print $1 }' pii-models.sha256)"; \
      actual="$(sha256sum "/tmp/${whl}" | cut -d' ' -f1)"; \
      if [ -n "${expected}" ] && [ "${expected}" != "${actual}" ]; then echo "checksum mismatch for ${whl}"; exit 1; fi; \
      if [ -z "${expected}" ] && [ "${ALLOW_UNPINNED_MODELS}" != "1" ]; then echo "no pinned checksum for ${whl} (${actual})"; exit 1; fi; \
    done && \
    pip install --no-cache-dir /tmp/*.whl && \
    rm /tmp/*.whl

FROM python:3.12-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

RUN groupadd -g 1001 pii && \
    useradd -u 1001 -g pii pii && \
    chown -R pii:pii /app

COPY --chown=pii:pii apps/pii/server.py apps/pii/french.py apps/pii/languages.py ./
COPY --chown=pii:pii --chmod=755 docker/pii-entrypoint.sh ./

USER pii

# The languages served; must match the models installed above.
ARG PII_SPACY_MODELS="fr:fr_core_news_sm,en:en_core_web_sm"
ENV PII_SPACY_MODELS=${PII_SPACY_MODELS}

# Listen on 5001. Runs as its own service, reached via PII_URL; 5001 avoids colliding with the
# app's 3000 in local/compose runs on one host.
EXPOSE 5001

# Per-pattern regex match timeout (Presidio's `regex`-module `finditer(timeout=...)`),
# an interactive backstop against a catastrophic user-supplied custom regex. Presidio
# logs and skips a pattern that exceeds it — the request stays up rather than hanging.
# Set well below the 60s library default so a pathological pattern can't stall a worker.
# MUST be an integer — Presidio parses it with `int()`, so a float (e.g. 1.5) crashes
# the service at import.
ENV REGEX_TIMEOUT_SECONDS=2

# start-period covers the model cold start. With PII_WORKERS>1 each worker loads the models
# independently and in parallel, so allow generous headroom.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD curl -fsS http://localhost:5001/health || exit 1

# Worker count is env-driven so ONE image scales per task size: set PII_WORKERS to the task's vCPU
# count (each worker loads the models independently, see docs/guide/gouvernance.md for the memory
# measured with the small models). Defaults to 1.
CMD ["./pii-entrypoint.sh"]
