# Nexora WorkStudio v3 — au niveau de Mistral Studio, et au-delà

**Date** : 23/10/2026. **Demande du fondateur** : « complète Nexora WorkStudio à la hauteur d'un Mistral Studio », en testant avec GLM 5.3 servi par la passerelle LiteLLM de pc1. Les décisions sont déléguées à l'architecte (voir §3).

**Documents liés**
- Analyse d'écart détaillée, qui fait partie de cette spec : [`docs/recherche/ecart-mistral-studio-v2.md`](../../recherche/ecart-mistral-studio-v2.md). Son §3.2 donne le contenu et les critères « Terminé quand » de chaque jalon ; ils s'appliquent tels quels, sauf amendement au §4 ci-dessous.
- Base de connaissances Mistral Studio : [`docs/recherche/mistral-studio/`](../../recherche/mistral-studio/README.md).
- Spec v2 : [`2026-10-23-nexora-v2-design.md`](2026-10-23-nexora-v2-design.md) ; ses règles restent en vigueur.

## 1. Intention

La v2 a rendu Nexora complet pour un usage PME local : agents, Assistant, Copilote, connecteurs, documents et voix, gouvernance, exploitation. La v3 comble ce qui sépare Nexora d'une plateforme du niveau de Mistral Studio, pour les développeurs autant que pour les métiers :
- modèles modernes (raisonnement) gérés partout ;
- une vraie surface développeur (clés, API compatible OpenAI, SDK, lots) ;
- la qualité mesurable (traces, prompts versionnés, évaluations) ;
- des agents plus capables (interpréteur de code, citations, confirmation d'action, délégation, compétences) ;
- l'Assistant au niveau de Vibe Work (workflows en formulaire, connexions personnelles, tâches planifiées, projets) ;
- Document AI structuré, voix complète ;
- un éditeur pour débutants et un produit entièrement en français.

Au-delà de Mistral : tout reste installable chez le client en une commande, en français, avec consommation, budgets et CO2 visibles, et avec un éditeur visuel que Mistral n'a pas.

## 2. Règles

- Toutes les règles de la v2 : pas de code `ee/` d'origine, français via next-intl et `check-i18n`, marque Nexora, conventions du dépôt, audits verts, aucun secret dans Git, TDD, revue finale par jalon, preuves dans le ledger, push sur `main`.
- Rien ne sort de l'instance sans action explicite d'un administrateur ; un modèle hors instance est affiché comme tel.
- Chaque jalon ajoute ses contrôles à `scripts/smoke.py`.
- **Double vérification** : chaque « Terminé quand » est vérifié sur pc6 avec le modèle par défaut **GLM 5.3** (`cloud-glm-5-3`) **et**, pour ce qui dépend de la vitesse, avec un modèle local CPU (`qwen2.5:7b`) ; GLM masque la lenteur du CPU.
- pc6 : instance de test (projet compose `nexora`, :3200). GLM 5.3 y est branché comme service « compatible OpenAI » par un tunnel SSH utilisateur (`~/.config/systemd/user/nexora-litellm-pc1-tunnel.service`, 172.17.0.1:18090 → pc1:4400) ; la clé de la passerelle reste hors du dépôt.
- Ne jamais arrêter un processus ou conteneur non lancé par ce travail ; surveiller le disque de pc6.

## 3. Décisions prises pour le fondateur (questions §4.2 de l'analyse)

| Question | Décision | Coût si faux |
|---|---|---|
| Modèles hors instance (LiteLLM, GLM 5.3) | **Option proposée aux clients, jamais par défaut** : un administrateur l'ajoute dans Réglages › Modèles ; la fiche affiche « Hors instance » et la zone déclarée ; les politiques d'espace (K14) peuvent l'interdire ou masquer les données. L'installateur ne la propose pas. Sur pc6, GLM 5.3 est le défaut pour les tests. | Un client qui voudrait du cloud par défaut le règle lui-même en une minute. |
| Matériel minimal visé | **Serveur CPU 8 cœurs, 32 Go de RAM, 100 Go de disque, GPU facultatif.** En découlent : traces stockées dans PostgreSQL (export OTLP facultatif vers Langfuse/Phoenix), diarisation en profil facultatif, pas d'images en local. | Un client sans 32 Go devra désactiver des profils (voix, interpréteur). |
| Exécution de code généré par l'IA (K5) | **Désactivée par défaut**, activée par un administrateur de l'instance ; bac à sable sans réseau, ressources bornées, suite de tests d'évasion obligatoire. | Un client qui la veut doit l'activer. |
| SDK et exposition de l'API (K3) | **SDK et exemples dans le dépôt, non publiés** sur PyPI/npm (publication = décision du fondateur, plus tard). L'API compatible OpenAI est servie **sous l'adresse existante de l'instance** (même domaine, derrière Caddy), sans nouveau sous-domaine public. | Les développeurs installent le SDK depuis le dépôt jusqu'à la publication. |
| Next.js (avis de vulnérabilité, ouvert en v2) | Montée de version **corrective seulement** (même version majeure et mineure), suite complète à l'appui, dans K2. Une montée de version mineure ou majeure reste au fondateur. | Si la correction exige une version mineure, l'avis reste ouvert et consigné. |
| Limite de 10 Mo du proxy pour les fichiers des chats publics intégrés | Inchangée (arbitrage mémoire). | Fichiers > 10 Mo refusés dans les chats intégrés seulement. |

## 4. Jalons et ordre d'exécution

Contenu et « Terminé quand » : analyse d'écart §3.2. Ordre d'exécution (dépendances respectées, le moins cher et le plus visible d'abord) :

| Ordre | Jalon | Taille | Dépend de |
|---|---|---|---|
| 1 | **K1** Modèles à raisonnement et fiches de modèles | M | — |
| 1 | **K2** Français partout, correctif Next.js | S | — |
| 2 | **K3** Clés d'API, API compatible OpenAI, bouton « Code », SDK | M-L | — |
| 3 | **K4** Document AI : extraction structurée et tableaux | M | K1 |
| 3 | **K9** Prompts versionnés | M | — |
| 4 | **K5** Outils intégrés : interpréteur, citations, confirmation, images | L | — |
| 4 | **K8** Traces et observabilité | L | K3 |
| 5 | **K6** Assistant étendu | L | K5 |
| 5 | **K10** Évaluations | L | K8, K9 |
| 6 | **K11** Multi-agents et compétences | M | K8 |
| 6 | **K12** Voix : réunions, synthèse vocale, dictée | M | — |
| 7 | **K13** Traitements par lot | M | K3 |
| 7 | **K14** Gouvernance avancée et garde-fous | M | K8 |
| 8 | **K7** Éditeur pour débutants : mode « Étapes » | L | K2 (et profite de K5/K6) |

Les jalons d'un même rang peuvent avancer en parallèle s'ils ne touchent pas les mêmes fichiers.

**Amendements aux critères de l'analyse**
- K7 : « trois personnes non techniques chronométrées » ne peut pas être fait par l'architecte. Remplacé par : un parcours au navigateur pas à pas, sans clavier technique, de « relance des factures impayées » en mode Étapes (captures et durée consignées), plus l'aller-retour sans perte sur les 5 workflows types. Le test avec de vraies personnes est recommandé au fondateur.
- K12 : la diarisation n'est intégrée que si une brique sous licence compatible (MIT/Apache/BSD, poids réutilisables commercialement) fonctionne sur CPU ; sinon elle est reportée en v4 avec la raison, le reste de K12 étant livré.
- K14 : SAML reste hors périmètre (v4 sur demande d'un client).
- Chaque jalon : la fumée complète reste verte sur pc6 avec GLM 5.3 par défaut.

## 5. Hors périmètre

Analyse d'écart §3.3 (fine-tuning, GEPA, agents vocaux temps réel et téléphonie, clonage de voix, agent de code, workflows Temporal en code, images en local, Canvas complet et Deep Research, multi-organisations et SCIM, facturation, Vespa).

## 6. Terminé quand (v3)

Tous les jalons K1–K14 sont cochés dans leurs plans, leurs critères passent réellement sur pc6 (double vérification), la fumée complète est verte avec GLM 5.3 puis avec `qwen2.5:7b` par défaut, tout est poussé sur GitHub.
