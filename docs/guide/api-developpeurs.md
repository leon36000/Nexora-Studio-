# L'API des développeurs (format OpenAI)

Nexora sert les **modèles** de l'instance et les **agents publiés** de vos espaces au format de l'API d'OpenAI. Tout outil qui sait parler à OpenAI (client `openai` en Python ou TypeScript, n8n, LibreChat, Make, un script cURL) fonctionne en changeant deux réglages : l'**adresse** et la **clé**.

Dans WorkStudio, la page **Développeurs** (barre latérale) rassemble l'adresse, les identifiants disponibles et des exemples prêts à copier. Le bouton **« Code »** du Playground et de chaque agent donne le même exemple pour le modèle ou l'agent affiché.

## Adresse

`https://<votre domaine>/v1` : l'adresse de l'instance suivie de `/v1`, sans nouveau sous-domaine. Sans HTTPS, `http://<serveur>:3000/v1`. L'API propre de WorkStudio (workflows, tables…) reste sous `/api/v1` : les deux ne se confondent pas.

| Point d'accès | Rôle |
|---|---|
| `GET /v1/models` | modèles et agents que la clé peut appeler |
| `GET /v1/models/{id}` | un modèle ou un agent |
| `POST /v1/chat/completions` | conversation, en flux (`"stream": true`) ou non |
| `POST /v1/embeddings` | vecteurs (bases de connaissances externes) |
| `POST /v1/audio/transcriptions` | transcription d'un fichier audio (profil « voix ») |
| `GET /v1/openapi.json` | description OpenAPI, sans clé |

Tailles maximales : **20 Mo** pour un corps JSON (`413 request_too_large`), **25 Mo** pour un fichier audio (`413 file_too_large`). L'API est faite pour les appels **de serveur à serveur** (n8n, scripts, back-ends) : elle n'envoie pas d'en-têtes CORS, un navigateur ne peut donc pas l'appeler depuis une autre origine ; une clé ne doit jamais être placée dans une page web.

## Clés

Créez la clé dans **Réglages › Clés d’API Nexora**, section « Nexora API : modèles et agents » :

- **Nom** : pour la reconnaître (« n8n de la comptabilité »).
- **Portée** : *cet espace* (ses modèles et ses agents publiés) ou *toute l'instance* (les modèles seulement, administrateurs de l'instance uniquement).
- **Expiration** : jamais, 30 jours, 90 jours ou un an.
- **Modèles autorisés** : tous, ou une liste. Un alias autorisé (`nexora-default`) suit le modèle par défaut choisi par l'administrateur. Une clé ne donne jamais plus que son créateur : si le **groupe d'accès** de la personne qui crée la clé limite les modèles (Réglages › Groupes d'accès), « Tous les modèles » est refusé et la liste ne peut contenir que des modèles que ce groupe autorise. La règle vaut aussi à chaque appel : si le groupe du créateur est restreint plus tard, la clé perd ces modèles (`403 model_not_allowed`) dans les 30 secondes. Une clé d'instance, ou une clé dont le créateur a été supprimé, suit le groupe par défaut de l'organisation.
- **Agents publiés** : autorisés ou non (clé d'espace). Autorisés, ils ouvrent **tous** les agents publiés de l'espace à la clé, y compris ceux réservés aux membres de l'espace : choisissez ce réglage clé par clé.
- **Plafond mensuel** : en jetons, par mois civil (fuseau de l'instance) ; vide = aucun. Chaque appel réserve d'abord une estimation (son message à raison de quatre caractères par jeton, plus `max_tokens` borné à 8 192, 1 024 par défaut), remplacée par sa consommation réelle quand il se termine : des appels simultanés ne peuvent donc pas passer ensemble sous le plafond. Le dépassement reste possible, mais limité au dernier appel admis juste sous le plafond (ce qu'il consomme au-delà de son estimation).
- **Requêtes par minute** : 60 par défaut.

La valeur (`sk-nexora-…`) n'est affichée **qu'une fois**. Seule son empreinte est conservée. Une clé n'appartient à personne : c'est une clé de compte de service, rattachée à l'espace ou à l'instance ; elle continue de fonctionner si la personne qui l'a créée quitte l'entreprise. Créer une clé d'espace demande le droit « Modifier » sur l'espace ; tout membre qui peut modifier l'espace peut aussi la **révoquer** (effet immédiat, consigné une seule fois dans le journal d'audit). **Supprimer un espace révoque ses clés** : elles répondent 401 dès la suppression, et une restauration de l'espace ne les rétablit pas (créez-en de nouvelles). Les clés de **workflows** (SDK, exécution par l'API de WorkStudio) restent dans la même page, plus bas.

Chaque ligne de clé montre son usage du mois (jetons, requêtes), son plafond, son débit, son expiration et sa dernière utilisation. Le détail par période est dans **Réglages › Consommation**, tableau « Par clé d'API ».

## Exemples

Python, avec le client officiel (`pip install openai`) :

```python
import os
from openai import OpenAI

client = OpenAI(base_url="https://ia.pme.fr/v1", api_key=os.environ["NEXORA_API_KEY"])
stream = client.chat.completions.create(
    model="nexora-default",
    messages=[{"role": "user", "content": "Bonjour !"}],
    stream=True,
)
for chunk in stream:
    if chunk.choices:
        print(chunk.choices[0].delta.content or "", end="")
```

cURL :

```bash
curl https://ia.pme.fr/v1/chat/completions \
  -H "Authorization: Bearer $NEXORA_API_KEY" -H "Content-Type: application/json" \
  -d '{"model": "agent:Assistant général", "messages": [{"role": "user", "content": "Bonjour"}]}'
```

TypeScript, n8n : page **Développeurs** ou [`docs/exemples/api-openai/`](../exemples/api-openai/README.md). Dans **n8n**, créez un identifiant « OpenAI » avec la clé et la *Base URL* `https://ia.pme.fr/v1`, puis choisissez le modèle par son identifiant. Dans **LibreChat**, déclarez un point d'accès personnalisé avec la même adresse et la même clé.

## Appeler un agent

`"model": "agent:<nom>"` (ou `agent:<identifiant du workflow>`, qui survit à un renommage ; le bouton « Code » de l'agent affiche les deux) appelle un agent **publié** de l'espace de la clé.

**Agents appelables** : les agents de la page **Agents** de l'espace (dossier « Agents ») qui ont une version publiée, c'est-à-dire publiés par le bouton « Publier » de l'agent (ou déployés depuis l'éditeur). Peu importe que leur lien de conversation soit public ou réservé aux membres : une clé d'espace qui autorise « Agents publiés » les appelle tous. Un agent jamais publié répond 404 ; le bouton « Code » le signale.

- c'est la **version publiée** qui répond, avec ses outils, ses connaissances et son modèle ;
- l'agent reçoit le dernier message de l'utilisateur, précédé des échanges antérieurs de la requête ; les messages `system` de l'appelant sont ignorés (l'agent garde ses consignes) ; texte seulement ;
- l'exécution apparaît dans les **journaux** de l'espace et compte dans sa **consommation** et son **budget** ;
- une clé d'instance ne peut pas appeler d'agent (403), ni une clé d'espace l'agent d'un autre espace (404).

## Erreurs

Les erreurs suivent le format d'OpenAI (`{"error": {"message", "type", "code"}}`), avec un message en français ; les clients officiels lèvent l'exception correspondante.

| Statut | Code | Cause |
|---|---|---|
| 401 | `invalid_api_key` | clé absente ou inconnue |
| 401 | `expired_api_key` | clé expirée (date dans le message) |
| 401 | `revoked_api_key` | clé révoquée |
| 403 | `model_not_allowed` | modèle ou agents non autorisés pour la clé, ou modèle refusé par le groupe d'accès du créateur |
| 403 | `agent_needs_workspace_key` | agent appelé avec une clé d'instance |
| 404 | `model_not_found` | modèle ou agent introuvable |
| 409 | `agent_name_ambiguous` | plusieurs agents publiés portent ce nom : utilisez `agent:<identifiant>` |
| 413 | `request_too_large`, `file_too_large` | corps JSON au-delà de 20 Mo, fichier audio au-delà de 25 Mo |
| 402 | `monthly_budget_reached` | budget mensuel de l'espace ou de l'instance atteint (Réglages › Consommation) |
| 429 | `rate_limit_exceeded` | trop de requêtes par minute (en-têtes `x-ratelimit-*`, `Retry-After`) |
| 429 | `monthly_cap_reached` | plafond mensuel de la clé atteint |
| 502 | `upstream_error` | Nexora API a refusé ou n'a pas pu traiter la requête (y compris quand elle refuse la clé propre de WorkStudio : votre clé n'est pas en cause) |
| 503 | `service_unavailable`, `model_busy` | Nexora API ne répond pas, ou le modèle est occupé |

## SDK

Les SDK Nexora de **workflows** sont dans le dépôt, non publiés : [`workstudio/packages/python-sdk`](../../workstudio/packages/python-sdk/README.md) (`from nexora import NexoraClient`) et [`workstudio/packages/ts-sdk`](../../workstudio/packages/ts-sdk/README.md). Pour les modèles et les agents, le client `openai` officiel suffit.

## Pour l'exploitant

- Derrière Caddy (profil « https »), `/v1` est relayé sans compression ni tampon, pour que les réponses en flux arrivent mot à mot.
- Les appels passent par WorkStudio, qui applique les règles des clés, puis par Nexora API avec la clé propre de WorkStudio : les clés `sk-nexora-…` ne valent rien sur Nexora API en direct. L'accès direct historique à Nexora API ([Nexora API](nexora-api.md), port 8000 et `api.<domaine>`) reste réservé à ses propres clés, créées par curl.
- Les appels directs de modèles comptent dans les budgets mensuels de l'espace (et de l'instance) ; ceux des agents y comptent par leurs exécutions. Le budget est relu au plus toutes les quelques secondes et n'est pas réservé comme le plafond d'une clé : des appels simultanés peuvent le dépasser légèrement.
- `/v1` échappe aux règles des pages de WorkStudio (filtre des robots, en-têtes de sécurité des pages, tampon de 10 Mo) : chaque point d'accès borne lui-même son corps.
