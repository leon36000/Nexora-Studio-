# Exemples : l'API de Nexora avec le client « openai » officiel

Nexora sert ses modèles **et ses agents publiés** au format OpenAI, sous l'adresse de l'instance :
`https://<votre domaine>/v1` (ou `http://<serveur>:3000/v1` sans HTTPS). Guide complet :
[`docs/guide/api-developpeurs.md`](../../guide/api-developpeurs.md).

| Fichier | Langage | Ce qu'il fait |
|---|---|---|
| [`chat.py`](chat.py) | Python (`pip install openai`) | liste les modèles, appelle `nexora-default` puis un agent, en flux, et traite les refus 401, 403 et 429 |
| [`chat.ts`](chat.ts) | TypeScript (`npm install openai`) | même chose avec le client Node |

```bash
export NEXORA_BASE_URL=https://ia.pme.fr/v1
export NEXORA_API_KEY=sk-nexora-...      # Réglages › Clés API › Nexora API
python chat.py "agent:Assistant général"
```

Ces exemples ne sont pas publiés : copiez-les dans vos projets.
