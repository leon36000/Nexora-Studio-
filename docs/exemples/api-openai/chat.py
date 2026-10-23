"""Appelle Nexora avec le client « openai » officiel : un modèle, puis un agent publié, en flux.

    pip install openai
    export NEXORA_BASE_URL=https://ia.pme.fr/v1      # adresse de l'instance + /v1
    export NEXORA_API_KEY=sk-nexora-...              # Réglages › Clés API (clé d'espace)
    python chat.py "agent:Assistant général"

Le premier argument (facultatif) est l'agent à appeler (« agent:<nom> » ou « agent:<identifiant> »).
"""

import os
import sys

import openai
from openai import OpenAI

client = OpenAI(base_url=os.environ["NEXORA_BASE_URL"], api_key=os.environ["NEXORA_API_KEY"])


def stream(model: str, question: str) -> None:
    print(f"--- {model}")
    chunks = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": question}],
        stream=True,
        stream_options={"include_usage": True},
    )
    for chunk in chunks:
        if chunk.choices and chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
        if chunk.usage:
            print(f"\n[{chunk.usage.prompt_tokens} + {chunk.usage.completion_tokens} jetons]")


try:
    print("Modèles :", ", ".join(model.id for model in client.models.list()))
    stream("nexora-default", "Bonjour ! Présente-toi en une phrase.")
    if len(sys.argv) > 1:
        stream(sys.argv[1], "Bonjour ! À quoi sers-tu, en une phrase ?")
except openai.AuthenticationError as error:  # 401 : clé invalide, expirée ou révoquée
    sys.exit(f"Clé refusée : {error.message}")
except openai.PermissionDeniedError as error:  # 403 : modèle ou agent non autorisé pour la clé
    sys.exit(f"Accès refusé : {error.message}")
except openai.RateLimitError as error:  # 429 : débit ou plafond mensuel de la clé
    sys.exit(f"Limite atteinte : {error.message}")
