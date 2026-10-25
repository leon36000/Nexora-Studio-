# Gouvernance avancée et garde-fous

Cette page réunit ce qui protège les données de l'entreprise quand elles passent par un modèle : le service local de détection des données personnelles, les politiques par espace, les modèles interdits à un groupe d'accès, l'export du journal d'audit pour un tableur. Elle s'adresse aux administrateurs de l'instance. Les réglages sont dans **Réglages › Données personnelles** et **Réglages › Groupes d'accès**.

Rappel : un modèle est **« Sur ce serveur »** (rien ne sort), **« Hébergé UE »** ou **« Hors instance »** (vos questions partent chez un tiers, dans le pays où il est hébergé). Chaque fiche de modèle l'indique (Réglages › Modèles › Modifier la fiche). Les politiques ci-dessous ne concernent que les modèles **Hors instance** : un modèle de l'Ollama de l'instance n'est jamais touché, et rien n'est analysé quand le modèle est sur ce serveur.

## Le service local de détection

Le **bloc Garde-fous** (« Données personnelles »), la politique des espaces et le masquage des traces s'appuient sur un petit service installé sur votre serveur, qui ne parle à personne d'autre. Il reconnaît :

- les **noms de personnes**, les **adresses e-mail**, les **numéros de téléphone** (français et étrangers), les **IBAN** (clé de contrôle vérifiée), les **cartes bancaires** (clé de Luhn), les **adresses IP** ;
- le **numéro de sécurité sociale** (15 caractères, clé de contrôle vérifiée, Corse comprise).

Les **lieux** et les **dates** ne sont pas des données à masquer : « Paris, le 12 mars » reste lisible.

**Installation.** L'installateur pose la question « Activer la détection locale des données personnelles ? ». Pour l'ajouter plus tard, dans `deploy/.env` : `NEXORA_PII=1`, `NEXORA_PII_URL=http://pii:5001` et `pii` dans `COMPOSE_PROFILES`, puis `nexora restart`. Le profil se construit sur le serveur la première fois (téléchargement des modèles de langue).

**Ce que ça coûte** (mesuré sur pc6, un processeur de 20 cœurs, un seul processus) :

| | |
|---|---|
| Image | 798 Mo sur le disque (180 Mo compressée) ; l'image du cœur, avec cinq langues et les grands modèles, dépassait 2 Go de modèles |
| Mémoire | 306 Mo au repos, 316 Mo après 400 requêtes ; limite posée à 1 Go |
| Vitesse | 3,6 ms pour un message, 8 ms pour cinq messages d'une conversation |
| Pour une machine de 8 cœurs / 32 Go | un processus suffit (`PII_WORKERS=1`) ; chaque processus de plus recharge les modèles (environ 300 Mo) |

**Langues.** L'image sert le **français** et l'**anglais**. Le modèle français (`fr_core_news_sm`) est publié sous la licence **LGPL-LR**, qui n'est pas une licence permissive : il est téléchargé à la construction de l'image, jamais copié dans le dépôt, et vous pouvez le retirer (voir `THIRD_PARTY_NOTICES.md`) ; sans lui, les noms français ne sont plus reconnus, mais les IBAN, e-mails, cartes, téléphones et numéros de sécurité sociale le restent.

**Sans le service**, rien ne casse : le masquage des politiques et des traces retombe sur les **motifs** (IBAN, e-mail, carte, téléphone, clés et jetons), sans les noms. Réglages › Données personnelles dit dans quel cas vous êtes.

**Si le service est installé mais ne répond pas**, une politique « Masquer » ou « Refuser » n'envoie pas la demande (message « Le service de protection des données personnelles ne répond pas ») : mieux vaut une demande en échec qu'une donnée qui part sans protection.

## Politique d'un espace : autoriser, masquer, refuser

Réglages › **Données personnelles** (administrateurs de l'instance) :

- **Autoriser** : les données partent telles quelles (le comportement d'avant, et le réglage de départ).
- **Masquer** : avant l'envoi à un modèle hors instance, chaque donnée personnelle est remplacée par `<IBAN_CODE>`, `<EMAIL_ADDRESS>`, `<PERSON>`… Le modèle répond sans l'avoir vue ; votre historique garde l'original.
- **Refuser** : la demande n'est pas envoyée. La personne lit « Cette demande contient des données personnelles (IBAN, e-mail) : la politique de cet espace interdit de les envoyer à un modèle hors instance. »

Un réglage **par défaut de l'instance** et, au besoin, un réglage **par espace** (qui peut être plus souple ou plus strict). La politique s'applique partout où une conversation part vers un modèle :

| Où | Ce qui se passe en « Masquer » |
|---|---|
| Playground, Copilote, « Générer avec l'IA » | la question part masquée |
| Agents, Assistant, workflows (bloc Agent) | **chaque tour** de l'agent est masqué, résultats d'outils compris ; la mémoire de l'agent garde l'original |
| API compatible OpenAI (clé `sk-nexora-…`) | la question part masquée ; avec « Refuser », réponse 403 au format OpenAI (`personal_data_not_allowed`) ; une clé d'instance suit le réglage par défaut |
| Campagnes d'évaluation | l'élément concerné est en erreur avec la raison (jamais « réussi ») |

**Dans les traces.** La trace montre « Données personnelles masquées avant l'envoi à cloud-glm-5-3 : IBAN ×1, e-mail ×1 » (ou « refusé »). Avec le service installé, le masquage des traces (voir [Les traces](traces.md)) reconnaît aussi les noms.

**Limites à connaître.**
- La détection se trompe parfois : un nom rare, un prénom pris pour un mot courant, une adresse postale ne sont pas toujours reconnus ; l'inverse arrive. C'est un filet de sécurité, pas une garantie. Pour des données très sensibles, choisissez « Refuser » ou un modèle sur ce serveur.
- Un fichier ou une image envoyés à un modèle de vision ne sont pas analysés : seul le texte l'est.
- Un fournisseur hors instance dont la conversation n'est pas au format de discussion OpenAI ne peut pas être masqué : sous « Masquer » ou « Refuser », la demande est alors refusée plutôt qu'envoyée.
- Les modèles « Hébergé UE » ne sont pas concernés. Si vous les considérez comme « hors instance », déclarez-les « Hors instance » dans leur fiche.

## Modèles autorisés par groupe d'accès

Dans la fenêtre d'un groupe (Réglages › Groupes d'accès), la section **Modèles que le groupe peut choisir** liste les modèles de discussion avec leur localisation. Décochez un modèle : le groupe ne peut plus le choisir. Exemple : le groupe « Comptabilité » sans GLM 5.3.

Le refus est appliqué par le serveur :

- dans un **bloc Agent** (l'exécution s'arrête, « Model … is not allowed based on your permission group settings ») ;
- par l'**API** : un appel avec une clé créée par un membre du groupe répond 403 en français (« n'est pas autorisé par le groupe d'accès de la personne qui a créé cette clé »), et il n'est pas possible de créer une clé « tous les modèles » ;
- dans le **Playground** (403, « Votre groupe d'accès ne vous autorise pas le modèle … »).

Les **alias** suivent le modèle qu'ils désignent : `nexora-default` est le modèle par défaut de l'instance, donc interdire GLM 5.3 interdit aussi le modèle par défaut tant que GLM 5.3 est le défaut. Un modèle ajouté plus tard est autorisé jusqu'à ce que vous le décochiez. « Générer avec l'IA » et le Copilote utilisent le modèle par défaut de l'instance pour faire leur travail : retirez le droit **Chat** au groupe pour les lui interdire.

## Export du journal d'audit

Réglages › Journal d'audit › **Exporter** télécharge un fichier CSV que **Excel et LibreOffice en français ouvrent d'un double clic** : séparateur `;`, accents corrects, dates `25/10/2026 14:03:12` à l'heure de l'instance, libellés d'action en français (le code de l'action est dans une colonne), nombres avec virgule décimale, une ligne par événement. Le fichier est borné à 10 000 lignes ; au-delà, l'export le dit (`X-Export-Truncated`). Les contenus saisis par des personnes (noms, descriptions) sont protégés contre l'exécution de formules par le tableur.

## Ce qui n'est pas dans cette version

- **SAML** : la connexion unique reste OpenID Connect ([SSO](sso.md)) ; SAML sera ajouté sur demande d'un client.
- **Modération des demandes** par un modèle local : non livrée, voir le registre du jalon K14.
