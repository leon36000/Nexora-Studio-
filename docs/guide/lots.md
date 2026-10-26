# Les traitements par lot

Un **lot** fait traiter des centaines ou des milliers de requêtes par un modèle, **en arrière-plan et sans gêner personne** : classer 500 avis clients, résumer un millier de tickets, calculer les vecteurs d'un catalogue. Deux entrées, un seul moteur :

- l'écran **Traitements par lot** (barre latérale) : on choisit une table, qui répond (un modèle, un prompt ou un agent) et le texte envoyé pour chaque ligne ; la réponse arrive dans une **nouvelle colonne de la table** ;
- l'**API au format OpenAI** (`/v1/files` et `/v1/batches`) : le client `openai`, n8n ou un script envoient un fichier JSONL et reviennent chercher les résultats.

Ce qu'un lot garantit :

- **Priorité basse.** Le lot cède la place à l'Assistant, au Playground et aux appels en direct : avant chaque requête, il attend (30 secondes au plus) qu'une conversation en cours se termine. Toutes les requêtes de lots et de campagnes d'évaluation de l'instance se partagent **4 appels simultanés** ; chaque lot en lance 2 à la fois par défaut (1 à 4 au choix).
- **Rien ne se perd.** Si le serveur redémarre, le lot reprend tout seul (au plus quelques minutes plus tard, au prochain passage de la tâche planifiée) : les réponses déjà obtenues sont conservées, une requête interrompue est refaite une seule fois.
- **Expiration réglable.** Un lot qui n'est pas terminé au bout de **24 heures** (par défaut ; de 1 heure à 7 jours) passe en « expiré » : ce qui a été répondu est conservé, le reste sort en erreur `batch_expired`.
- **Tracé et compté.** Chaque appel apparaît dans **Traces** (« API · lot · nom de la clé », ou « Lot : nom du lot ») et dans **Réglages › Consommation** ; le budget mensuel de l'espace est vérifié avant chaque requête (budget atteint : le lot s'arrête et le dit).

## Depuis l'écran

1. **Traitements par lot › Nouveau lot.**
2. **Table à traiter** : une table de l'espace, ou **Importer un CSV** (il devient une nouvelle table ; les lignes arrivent en quelques secondes).
3. **Qui répond** : un modèle (avec des consignes facultatives), un **prompt** versionné (étiquette `production`, `test` ou une version : elle est figée au lancement) ou un **agent** publié.
4. **Texte envoyé pour chaque ligne** : citez les colonnes entre doubles accolades, par exemple `Classe cet avis : {{avis}}`. Les lignes dont toutes les colonnes citées sont vides sont ignorées (le nombre est indiqué).
5. **Nom de la nouvelle colonne** : lettres, chiffres et tirets bas (les accents sont retirés). La colonne est créée au lancement ; un nom déjà pris est refusé.
6. **Longueur maximale de la réponse** : un classement tient en quelques jetons. Avec un modèle local sur processeur, un plafond bas (6 à 16 jetons) divise le temps par deux ou trois.
7. **Lancer.** La page du lot affiche la progression (rafraîchie toutes les 3 secondes), les premières lignes avec leur réponse, les erreurs, les jetons. **Annuler le lot** interrompt les requêtes en cours (les réponses déjà écrites restent dans la table) ; **Exporter en CSV** donne toutes les lignes (séparateur `;`, ouvre directement dans un tableur français) ; **Ouvrir la table** montre la colonne remplie.

Une ligne supprimée de la table pendant le lot est simplement sautée à l'écriture. Une réponse trop grande pour une cellule est comptée en erreur. Le lot lit les lignes **au lancement** : celles ajoutées ensuite ne sont pas traitées.

## Par l'API

Même adresse et mêmes clés que l'[API des développeurs](api-developpeurs.md) : `https://<votre domaine>/v1`, clé `sk-nexora-…` (les limites de modèles, le débit, le plafond mensuel et la consommation par clé s'appliquent). Un lot appelle **un seul modèle** (pas d'agent) sur **un seul point d'accès** : `/v1/chat/completions` ou `/v1/embeddings`.

Le fichier d'entrée est un JSONL, une requête par ligne :

```jsonl
{"custom_id": "avis-1", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "qwen2.5:7b", "max_tokens": 8, "messages": [{"role": "user", "content": "Classe : livraison en retard"}]}}
{"custom_id": "avis-2", "method": "POST", "url": "/v1/chat/completions", "body": {"model": "qwen2.5:7b", "max_tokens": 8, "messages": [{"role": "user", "content": "Classe : produit cassé"}]}}
```

`method` et `url` sont facultatifs (forme courte de Mistral). Python, avec le client officiel :

```python
import os, time
from openai import OpenAI

client = OpenAI(base_url="https://ia.pme.fr/v1", api_key=os.environ["NEXORA_API_KEY"])
fichier = client.files.create(file=open("avis.jsonl", "rb"), purpose="batch")
lot = client.batches.create(
    input_file_id=fichier.id,
    endpoint="/v1/chat/completions",
    completion_window="24h",          # de 1h à 168h, ou de 1d à 7d
    metadata={"projet": "avis"},
)
while lot.status in ("validating", "in_progress", "cancelling"):
    time.sleep(10)
    lot = client.batches.retrieve(lot.id)
print(lot.status, lot.request_counts)  # completed  BatchRequestCounts(completed=500, failed=0, total=500)
for ligne in client.files.content(lot.output_file_id).text.splitlines():
    print(ligne)                        # une ligne JSON par requête réussie, avec son custom_id
```

cURL : `curl -F purpose=batch -F file=@avis.jsonl -H "Authorization: Bearer $NEXORA_API_KEY" $URL/v1/files`, puis `curl -H "Authorization: Bearer $NEXORA_API_KEY" -H "Content-Type: application/json" -d '{"input_file_id":"file-…","endpoint":"/v1/chat/completions"}' $URL/v1/batches`.

| Point d'accès | Rôle |
|---|---|
| `POST /v1/files` | envoyer un fichier (`purpose` = `batch` seulement ; 25 Mo au plus) |
| `GET /v1/files`, `GET /v1/files/{id}`, `DELETE /v1/files/{id}` | lister, lire, supprimer |
| `GET /v1/files/{id}/content` | télécharger le JSONL d'entrée, de sortie ou d'erreurs |
| `POST /v1/batches` | créer un lot et le démarrer |
| `GET /v1/batches`, `GET /v1/batches/{id}` | lister (`limit`, `after`), lire |
| `POST /v1/batches/{id}/cancel` | annuler (`cancelling`, puis `cancelled`) |

**Statuts** : `in_progress` (en cours), `cancelling`, `completed`, `failed` (fichier invalide : `errors.data` donne le code, le message et le **numéro de ligne** à corriger), `expired`, `cancelled`. Le lot compte `request_counts` (total, réussies, échouées) et `usage` (jetons).

**Résultats.** À la fin, `output_file_id` contient une ligne par requête **réussie** et `error_file_id` une ligne par requête **échouée** (absent si aucune) :

```jsonl
{"id": "batch_req_…", "custom_id": "avis-1", "response": {"status_code": 200, "request_id": "req_…", "body": { …réponse OpenAI… }}, "error": null}
{"id": "batch_req_…", "custom_id": "avis-9", "response": null, "error": {"code": "batch_cancelled", "message": "Le lot a été annulé avant l'exécution de cette requête."}}
```

Une requête que le modèle a refusée (400) garde sa réponse dans le fichier d'erreurs ; une panne passagère (modèle occupé, service injoignable) est retentée trois fois avant d'être comptée en erreur. Les résultats ne sont lisibles que pour la clé (l'espace) qui a créé le lot : un autre espace, ou une clé d'instance, reçoit 404.

**Erreurs** (en plus de celles de l'[API des développeurs](api-developpeurs.md#erreurs)) :

| Statut | Code | Cause |
|---|---|---|
| 400 | `invalid_endpoint`, `invalid_completion_window`, `invalid_request` | point d'accès, fenêtre ou métadonnées invalides, `purpose` autre que `batch` |
| 404 | `file_not_found`, `batch_not_found`, `model_not_found` | fichier ou lot inconnu pour cette clé, modèle absent de l'instance |
| 409 | `batch_not_cancellable` | le lot est déjà terminé |
| 413 | `file_too_large` | fichier de plus de 25 Mo |
| 429 | `batch_queue_full` | plus de 50 000 requêtes en attente dans l'espace (ou dans les clés d'instance) |

Dans le fichier d'entrée, une ligne qui n'est pas du JSON (`invalid_json_line`), un `custom_id` répété (`duplicate_custom_id`), un `model` qui change d'une ligne à l'autre (`model_mismatch`), `"stream": true`, un agent (`agent:…`) ou plus de **10 000 lignes** (`too_many_tasks`) font passer le lot en `failed` **sans rien exécuter**, avec les 20 premiers problèmes et leurs numéros de ligne.

Pendant le lot, une clé révoquée ou expirée, un modèle retiré de ses modèles autorisés, son plafond mensuel ou le budget de l'espace atteints font sortir les requêtes restantes en erreur (`revoked_api_key`, `model_not_allowed`, `monthly_cap_reached`, `monthly_budget_reached`), sans appel de modèle.

## Pour l'exploitant

- **Reprise.** La tâche planifiée `run-nexora-evaluations` (chaque minute) reprend aussi les lots dont le serveur s'est arrêté ; un lot est adopté 90 secondes au plus après la dernière sauvegarde de son bail. Aucune tâche planifiée à ajouter.
- **Charge.** Quatre appels simultanés au plus pour tous les lots et toutes les campagnes d'évaluation ; chaque appel direct d'un utilisateur (Playground, Copilote, API) ou chaque conversation de l'Assistant fait patienter les lots jusqu'à 30 secondes par requête.
- **Conservation.** Les lots terminés, leurs résultats et les fichiers sont supprimés **90 jours** après la fin du lot (le fichier de sortie n'expire pas avant). Un lot terminé se supprime aussi à la main depuis l'écran ; un fichier envoyé par l'API se supprime avec `DELETE /v1/files/{id}`.
- **Taille.** Les fichiers et les résultats sont stockés dans PostgreSQL : prévoyez la taille des requêtes (25 Mo au plus par fichier, 10 000 lignes par lot). Chaque espace de travail (ou l'ensemble des clés d'instance) garde **1 Go** de fichiers d'entrée au plus ; au-delà, `POST /v1/files` répond `429 file_storage_full` et supprimer un fichier (`DELETE /v1/files/{id}`) libère sa place. L'administrateur règle ce plafond avec `NEXORA_BATCH_FILES_QUOTA_MB` dans `deploy/.env`.
- **Clés et effacement.** Les fichiers et les lots d'une clé d'API ne sont visibles que de cette clé (pas des autres clés du même espace) ; l'écran WorkStudio voit ceux de tout l'espace. Supprimer un fichier d'entrée efface aussi les requêtes et les réponses des lots qui l'ont lu (et masque leurs fichiers de résultats) ; un lot encore en cours est alors arrêté.
