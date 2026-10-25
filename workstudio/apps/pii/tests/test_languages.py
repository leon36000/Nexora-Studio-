import pytest

from languages import DEFAULT_SPACY_MODELS, parse_spacy_models


def test_default_is_the_five_languages_of_the_core_image():
    models = parse_spacy_models(None)
    assert [m["lang_code"] for m in models] == ["en", "es", "it", "pl", "fi"]
    assert models[0] == {"lang_code": "en", "model_name": "en_core_web_lg"}
    assert parse_spacy_models("") == models
    assert parse_spacy_models("  ") == models
    assert DEFAULT_SPACY_MODELS.startswith("en:en_core_web_lg")


def test_nexora_image_serves_french_and_english():
    assert parse_spacy_models("fr:fr_core_news_sm, en:en_core_web_sm") == [
        {"lang_code": "fr", "model_name": "fr_core_news_sm"},
        {"lang_code": "en", "model_name": "en_core_web_sm"},
    ]


@pytest.mark.parametrize("value", ["fr", "fr:", ":fr_core_news_sm", "fr:a:b", "fr:x,fr:y", "FR:fr_core_news_sm", "fr:../evil"])
def test_a_malformed_list_stops_the_service_at_start(value):
    with pytest.raises(ValueError):
        parse_spacy_models(value)
