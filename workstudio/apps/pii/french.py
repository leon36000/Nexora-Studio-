"""Nexora edition: French personal-data recognizers for the PII service.

Presidio ships no recognizer for the French social-security number (NIR), loads its payment-card
recognizer for English only, and reads phone numbers against a list of regions that leaves France
out of the French pipeline. These add them. Everything here is pattern- and checksum-based, so it
needs no language model and is tested without one.
"""

from presidio_analyzer import EntityRecognizer, Pattern, PatternRecognizer
from presidio_analyzer.predefined_recognizers import CreditCardRecognizer, PhoneRecognizer

# sex, year, month, department (or 2A/2B), commune, order, then the two-digit control key.
_NIR_BODY = r"[1-478]\s?\d{2}\s?(?:0[1-9]|1[0-2]|[2-9]\d)\s?(?:\d{2}|2[AB])\s?\d{3}\s?\d{3}"
_NIR = rf"(?<![\d.,])(?<!\d\s)({_NIR_BODY})\s?(\d{{2}})(?!\s?\d)"

_NIR_CONTEXT = ["sécurité sociale", "sécu", "nir", "insee", "n° ss", "numéro de sécurité"]

# Regions the phone recognizer reads a number against: France first, then its neighbours (not Luxembourg, whose four-digit numbers read a year as a phone number).
PHONE_REGIONS = ("FR", "BE", "CH", "DE", "ES", "IT", "GB")

# `phonenumbers` leniency 1 = the number must be valid for its region. Presidio's default (0, merely
# possible) reads a year such as "2026" as a French number.
PHONE_LENIENCY = 1


def nir_key_is_valid(body: str, key: str) -> bool:
    """The control key is 97 minus the 13-digit body modulo 97, Corsica's 2A/2B counted as 19/18."""
    digits = body.replace(" ", "").upper().replace("2A", "19").replace("2B", "18")
    if len(digits) != 13 or not digits.isdigit() or not key.isdigit():
        return False
    return 97 - int(digits) % 97 == int(key)


class FrNirRecognizer(PatternRecognizer):
    """French social-security number (15 characters), accepted only with a correct control key."""

    def __init__(self, supported_language: str = "fr") -> None:
        super().__init__(
            supported_entity="FR_NIR",
            patterns=[Pattern(name="fr_nir", regex=_NIR, score=0.5)],
            context=_NIR_CONTEXT,
            supported_language=supported_language,
        )

    def validate_result(self, pattern_text: str) -> bool | None:
        compact = pattern_text.replace(" ", "")
        return nir_key_is_valid(compact[:-2], compact[-2:])


def french_recognizers(language: str = "fr") -> list[EntityRecognizer]:
    """The recognizers added to the registry for French."""
    return [
        FrNirRecognizer(language),
        CreditCardRecognizer(supported_language=language),
        PhoneRecognizer(supported_language=language, supported_regions=PHONE_REGIONS, leniency=PHONE_LENIENCY),
    ]
