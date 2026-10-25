"""The service as the Nexora image runs it: French and English small models, real recognizers."""

import os

import pytest

pytest.importorskip("fr_core_news_sm")
pytest.importorskip("en_core_web_sm")

os.environ["PII_SPACY_MODELS"] = "fr:fr_core_news_sm,en:en_core_web_sm"

from fastapi.testclient import TestClient

import server

IBAN = "FR76 3000 6000 0112 3456 7890 189"
TEXT = f"Bonjour, je suis Marie Dupont. Mon IBAN est {IBAN}, écrivez à marie.dupont@exemple.fr ou appelez le 06 12 34 56 78."
ENTITIES = ["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "IBAN_CODE", "CREDIT_CARD", "IP_ADDRESS", "FR_NIR"]


@pytest.fixture(scope="module")
def client():
    with TestClient(server.app) as client:
        yield client


def analyze(client, text, **body):
    response = client.post("/analyze", json={"text": text, "language": "fr", **body})
    assert response.status_code == 200, response.text
    return [(text[r["start"] : r["end"]], r["entity_type"]) for r in response.json()]


def test_french_and_english_are_served_and_nothing_else(client):
    assert set(server.SUPPORTED_LANGUAGES) == {"fr", "en"}
    entities = client.get("/supportedentities", params={"language": "fr"}).json()
    for entity in ["IBAN_CODE", "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD", "PERSON", "FR_NIR"]:
        assert entity in entities


def test_iban_and_email_are_detected(client):
    found = analyze(client, TEXT, entities=["IBAN_CODE", "EMAIL_ADDRESS"])
    assert (IBAN, "IBAN_CODE") in found
    assert ("marie.dupont@exemple.fr", "EMAIL_ADDRESS") in found


def test_person_phone_and_nir_are_detected_in_french(client):
    found = analyze(client, TEXT + " Sécu : 1 84 12 76 451 089 46.", entities=ENTITIES)
    assert ("Marie Dupont", "PERSON") in found
    assert ("06 12 34 56 78", "PHONE_NUMBER") in found
    assert ("1 84 12 76 451 089 46", "FR_NIR") in found


def test_only_the_requested_entities_come_back(client):
    assert {entity for _, entity in analyze(client, TEXT, entities=["EMAIL_ADDRESS"])} == {"EMAIL_ADDRESS"}


def test_places_and_dates_of_an_ordinary_sentence_are_not_in_the_policy_entities(client):
    found = analyze(client, "Rendez-vous à Paris le 12 mars 2026 pour 1 000,50 €.", entities=ENTITIES)
    assert found == []


def test_redact_masks_every_detected_entity(client):
    response = client.post("/redact", json={"text": TEXT, "language": "fr", "entities": ENTITIES})
    assert response.status_code == 200
    masked = response.json()["text"]
    for secret in [IBAN, "marie.dupont@exemple.fr", "Marie Dupont", "06 12 34 56 78"]:
        assert secret not in masked
    assert "<IBAN_CODE>" in masked and "<EMAIL_ADDRESS>" in masked and "<PERSON>" in masked


def test_redact_batch_keeps_order_and_leaves_clean_text_alone(client):
    texts = ["Rien à signaler.", f"IBAN {IBAN}", "Bonjour"]
    response = client.post("/redact_batch", json={"texts": texts, "language": "fr", "entities": ENTITIES})
    assert response.status_code == 200
    masked = response.json()["texts"]
    assert masked[0] == texts[0] and masked[2] == texts[2]
    assert IBAN not in masked[1] and "<IBAN_CODE>" in masked[1]


def test_a_language_that_is_not_served_is_refused_with_422_not_500(client):
    response = client.post("/analyze", json={"text": "Hola", "language": "es"})
    assert response.status_code == 422
    assert "es" in response.json()["detail"]
    assert client.post("/redact_batch", json={"texts": ["Hola"], "language": "es"}).status_code == 422
