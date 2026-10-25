# Les traces

Chaque appel de modèle de l'instance devient une **trace** : l'arbre de ce qui s'est passé, avec les questions, les réponses, les jetons, la durée et l'empreinte carbone. Elles servent à comprendre pourquoi un agent a répondu ainsi, à repérer ce qui est lent ou en échec et à contrôler ce qui sort vers un modèle.

L'écran **Traces** est dans la barre latérale de chaque espace.

## Ce qui est tracé

| Origine | Ce que contient la trace |
|---|---|
| **Assistant** | La question du membre, la réponse, et chaque étape de l'agent : modèle → connaissances ou outil → modèle |
| **Agent** | Les mêmes étapes, pour un agent publié et ouvert à d'autres que les membres |
| **Playground** | Une réponse de modèle, avec son raisonnement quand le modèle en donne un |
| **Copilote** et **Générer avec l'IA** | Chaque appel de modèle fait pour vous |
| **Workflow** | Chaque bloc, et les appels de modèle des blocs Agent |
| **Clé d'API** | Les modèles appelés avec une clé `sk-nexora-…` ; les agents appelés par une clé sont des traces d'agent, rattachées à la clé |

Une trace est enregistrée à la fin de l'appel : elle apparaît dans l'écran en quelques secondes (la liste se rafraîchit toute seule).

## Lire une trace

Choisissez une trace dans la liste. Le panneau de droite montre :

- l'**origine**, le **modèle**, la **durée**, les **jetons** en entrée et en sortie, le **CO₂** (estimé d'après la mesure de Nexora API pour ce modèle ; « — » quand le modèle n'est pas mesuré) ;
- l'**arbre des étapes** : modèle, outil, connaissances, délégation à un autre workflow, avec la durée et les jetons de chacune ;
- l'**entrée** et la **sortie** de l'étape choisie, et le **raisonnement** du modèle quand il existe.

Une étape en erreur est marquée en rouge. Un bloc dont l'erreur a été traitée par un chemin d'erreur du workflow n'est pas une erreur.

Les campagnes d’[évaluations](evaluations.md) laissent aussi leurs traces, nommées « Évaluation : … » (une pour la réponse de la cible, une pour le juge quand c’est un modèle). À l’inverse, des traces peuvent devenir un **jeu de tests** : dans Évaluations, la source *Traces* reprend la question et la réponse de chaque trace que vous pouvez lire.

## Filtrer

Statut, origine, modèle, agent, clé d'API, durée (plus de 1 s, 5 s, 10 s ou 30 s), période, et recherche de texte dans les questions et les réponses. Les filtres sont dans l'adresse de la page : copiez-la pour partager une vue.

Les administrateurs de l'instance ont aussi le bouton **Instance** : les traces des appels faits avec une clé d'instance, qui n'appartiennent à aucun espace.

## Qui voit quoi

- Les traces d'un **agent**, d'un **workflow** ou d'une **clé** sont visibles de tous les membres de l'espace (même en lecture seule).
- Les traces de l'**Assistant** (chats réservés aux membres), du **Playground**, du **Copilote** et de **Générer avec l'IA** sont **privées** : seuls leur auteur et les administrateurs de l'espace les voient. Un cadenas les signale. C'est la règle déjà appliquée aux journaux des conversations de l'Assistant.
- Un membre qui n'a pas le droit de lire une trace reçoit la même réponse que pour une trace qui n'existe pas.

## Masquage des données personnelles

Avant d'être enregistrées, les traces sont **masquées** : adresses e-mail, IBAN valides, numéros de téléphone, numéros de carte bancaire valides, clés d'API et jetons deviennent `[E-MAIL]`, `[IBAN]`, `[TÉLÉPHONE]`, `[CARTE]`, `[SECRET]`. Le masquage s'applique aussi à ce qui est exporté (voir plus bas) et aux textes de recherche. Le panneau indique combien de données ont été masquées dans la trace.

Trois niveaux, réglables par un administrateur :

- **Standard** (par défaut) : le masquage ci-dessus.
- **Strict** : aucun contenu n'est conservé — ni questions, ni réponses, ni raisonnement, ni message d'erreur —, seulement l'arbre, les noms, les durées, les jetons et le statut.
- **Aucun masquage** : à réserver à une instance de confiance.

Quand une politique d'espace masque ou refuse des données avant l'envoi à un modèle hors instance, le panneau le dit (« Données personnelles masquées avant l'envoi à … : IBAN ×1 ») ; voir [Gouvernance avancée et garde-fous](gouvernance.md). Avec le service local de détection, les noms sont masqués aussi.

Le masquage repose sur des motifs : c'est un filet de sécurité, pas une garantie. Un nom, une adresse postale ou un numéro écrit de façon inhabituelle peuvent rester lisibles. Pour des données très sensibles, choisissez le niveau strict.

## Conservation et purge

Les traces sont gardées **30 jours** par défaut (de 1 à 365). Une purge automatique tourne chaque heure (le service de tâches planifiées existant) ; **Purger maintenant** la lance sans attendre.

Les conversations de l'Assistant ne sont **jamais supprimées** par défaut : un administrateur peut régler un délai, compté depuis le dernier message.

Les réglages sont dans le bouton **Réglages des traces** de l'écran (administrateurs de l'instance) : enregistrer les traces ou non, conservation, niveau de masquage, conservation des conversations, export.

## Exporter vers Langfuse, Phoenix ou Grafana

Les traces sont stockées dans PostgreSQL : rien d'autre à installer. Pour les envoyer aussi à un outil d'observabilité, renseignez dans **Réglages des traces** l'adresse OTLP/HTTP du collecteur et ses en-têtes :

| Outil | Adresse des traces | En-têtes |
|---|---|---|
| Langfuse | `https://<langfuse>/api/public/otel/v1/traces` | `Authorization: Basic <base64 clé_publique:clé_secrète>` et `x-langfuse-ingestion-version: 4` |
| Phoenix | `http://<phoenix>:6006/v1/traces` | selon votre déploiement |
| Grafana (Alloy, Tempo) | `http://<collecteur>:4318/v1/traces` | selon votre déploiement |

- Le collecteur est joint **depuis le serveur WorkStudio** : indiquez l'adresse telle qu'il la voit (par exemple le nom du service dans le réseau Docker).
- Les valeurs des en-têtes sont **chiffrées** et ne sont jamais réaffichées.
- **Tester l'envoi** envoie un span de test avec les réglages enregistrés ; l'écran indique le dernier envoi.
- Les spans suivent les conventions OpenTelemetry pour l'IA générative (`gen_ai.request.model`, `gen_ai.usage.input_tokens`…) et portent l'entrée et la sortie (`input.value`, `output.value`), déjà masquées. Un collecteur injoignable ne perd rien : les traces restent dans PostgreSQL.
- Rien n'est envoyé tant que l'export n'est pas activé : aucune donnée ne quitte l'instance sans action d'un administrateur.

## Limites

- Une trace n'existe qu'une fois l'exécution terminée : une exécution interrompue sans fin propre n'en a pas.
- Les contenus sont coupés à 8 000 caractères par étape et une trace garde 500 étapes au plus ; la trace l'indique.
- Les modèles que Nexora API ne mesure pas (services extérieurs) n'ont pas d'empreinte carbone.
