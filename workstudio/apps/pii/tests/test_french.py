"""Reconnaissance des données personnelles françaises, sans modèle spaCy (motifs et sommes de contrôle)."""

import pytest

from french import french_recognizers, nir_key_is_valid


def analyze(text: str, entity: str):
    results = []
    for recognizer in french_recognizers("fr"):
        if entity in recognizer.supported_entities:
            results.extend(recognizer.analyze(text, [entity], None))
    return [(text[r.start : r.end], r.entity_type) for r in results]


@pytest.mark.parametrize(
    "number",
    [
        "1 84 12 76 451 089 46",
        "184127645108946",
        "2 69 05 49 588 157 80",
    ],
)
def test_nir_with_valid_key_is_recognized(number):
    assert analyze(f"Mon numéro de sécu : {number}.", "FR_NIR") == [(number, "FR_NIR")]


def test_nir_with_wrong_key_is_not_recognized():
    assert analyze("Mon numéro : 1 84 12 76 451 089 47.", "FR_NIR") == []


def test_nir_of_corsica_uses_2a_and_2b():
    assert nir_key_is_valid("1 84 12 2A 451 089", "33") is True
    assert analyze("NIR 1 84 12 2A 451 089 33", "FR_NIR") == [("1 84 12 2A 451 089 33", "FR_NIR")]
    assert nir_key_is_valid("1 84 12 2A 451 089", "46") is False


def test_a_longer_digit_run_is_not_a_nir():
    assert analyze("Référence 9 1 84 12 76 451 089 46 77", "FR_NIR") == []


@pytest.mark.parametrize("number", ["06 12 34 56 78", "+33 6 12 34 56 78", "01.23.45.67.89", "0033612345678"])
def test_french_phone_numbers_are_recognized(number):
    assert analyze(f"Appelez-moi au {number} demain.", "PHONE_NUMBER") == [(number, "PHONE_NUMBER")]


@pytest.mark.parametrize("text", ["Facture 2026 10 25 0001", "Montant 1 000,50 € HT", "Le 12 mars 2026"])
def test_amounts_and_dates_are_not_phone_numbers(text):
    assert analyze(text, "PHONE_NUMBER") == []


def test_payment_card_with_luhn_is_recognized_in_french():
    assert analyze("Carte 4111 1111 1111 1111 expire 12/28", "CREDIT_CARD") == [("4111 1111 1111 1111", "CREDIT_CARD")]
    assert analyze("Carte 4111 1111 1111 1112", "CREDIT_CARD") == []
