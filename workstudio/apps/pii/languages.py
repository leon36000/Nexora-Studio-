"""Nexora edition: which languages the PII service serves, and with which spaCy model.

The core image serves five languages with the large models (2.2 GB). A Nexora installation talks
French and English, so its image sets `PII_SPACY_MODELS` to the small French and English models.
"""

import re

DEFAULT_SPACY_MODELS = "en:en_core_web_lg,es:es_core_news_lg,it:it_core_news_lg,pl:pl_core_news_lg,fi:fi_core_news_lg"

_LANGUAGE = re.compile(r"^[a-z]{2}$")
_MODEL = re.compile(r"^[a-z][a-z0-9_]*$")


def parse_spacy_models(value: str | None) -> list[dict[str, str]]:
    """`fr:fr_core_news_sm,en:en_core_web_sm` as the entries of Presidio's NLP configuration."""
    models: list[dict[str, str]] = []
    for entry in ((value or "").strip() or DEFAULT_SPACY_MODELS).split(","):
        language, separator, model = entry.strip().partition(":")
        if not separator or not _LANGUAGE.match(language) or not _MODEL.match(model):
            raise ValueError(f"PII_SPACY_MODELS: expected <language>:<model>, got {entry!r}")
        if any(known["lang_code"] == language for known in models):
            raise ValueError(f"PII_SPACY_MODELS: language {language!r} is listed twice")
        models.append({"lang_code": language, "model_name": model})
    return models
