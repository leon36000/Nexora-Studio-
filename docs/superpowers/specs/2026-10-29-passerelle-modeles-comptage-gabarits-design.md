# Passerelle multi-modèles, comptage au jeton et gabarits WorkStudio : conception (29/10/2026)

Statut : conception à valider. Aucun code produit n'est modifié par ce document.
Lié à : `docs/recherche/ecart-mistral-studio-v2.md`, `docs/recherche/mistral-studio/`, et, dans le dépôt du site (`root/nexora-web`), `docs/superpowers/plans/ledger.md` (tranches S5, S7, S2 vague 2).

## 1. Ce que le fondateur demande

1. Un accès gratuit à WorkStudio pour son profil administrateur, et les accès à son panneau d'administration.
2. Vérifier que LiteLLM est bien intégré au nouveau site (Nexora Web), et que les clients de WorkStudio passent par lui.
3. Ajouter cinq modèles, avec détails, benchmarks et prix : DeepSeek V4.1 Flash 1017, GLM 5.3 Flash, GLM 5.3, MiniMax M3.1, Kimi K3.1 Pro.
4. Facturer à la consommation au jeton, avec un comptage très précis et l'historique de consommation.
5. Un routeur de modèles alimenté par la clé API du fondateur ; chaque client génère ses propres clés.
6. Un panneau client comparable à celui d'OpenRouter, et un panneau administrateur où l'ajout d'un modèle est facile.
7. Des gabarits prêts à l'emploi dans WorkStudio, d'après Mistral Studio et Mistral Workflows.

Choix de mise en œuvre (les miens, à corriger si besoin) : on étend la passerelle qui existe déjà dans le site au lieu d'en écrire une seconde ; on garde LiteLLM en amont comme moteur de routage ; le grand livre du site reste la seule source de vérité pour l'argent.

## 2. État des lieux vérifié dans le code

### 2.1 Nouveau site (dépôt `nexora-web`, dossier `NexoraSite`)

LiteLLM est déjà intégré au **nouveau** site. L'ancien site `NexoraWeb` a été supprimé le 28/10 à la demande du fondateur.

| Élément | Où | État |
|---|---|---|
| LiteLLM interne, version épinglée `v1.106.2` par empreinte | `deploy/compose.yml`, `deploy/litellm/config.yaml` | en place ; un seul amont de développement (`dev/cloud-glm-5-3`, LiteLLM de pc1) |
| Modèles poussés de Directus vers LiteLLM (D3), stockés en base | route `POST /api/admin/catalog/sync-litellm` | en place |
| Catalogue : fournisseurs, modèles, prix immuables, taux de change, versions publiées | `packages/db/src/schema-gateway.ts` | en place, avec plancher de marge et approbation du taux |
| Passerelle compatible OpenAI : `/v1/models`, `/v1/chat/completions`, `/v1/embeddings` | `web/src/server/gateway/` | en place, réservation au grand livre, erreur 402 au format OpenAI, clé maîtresse jamais exposée |
| Clés clientes par organisation (empreinte SHA-256, affichée une seule fois), plafond de dépense, RPM, TPM, modèles autorisés, expiration, révocation | table `api_keys` | en place |
| Événements d'usage (métadonnées seulement, jamais le contenu) : jetons d'entrée, de sortie, en cache, coût de vente, coût amont, prix appliqués, latence | table `usage_events` | en place |
| Grand livre, achats de crédits, abonnements, tranches de crédits mensuels, litiges, Stripe en mode test | `schema-billing.ts`, `web/src/server/billing/` | en place |
| Agents hébergés sur WorkStudio, `agent/<slug>` dans la passerelle, frais par exécution | tranche S7, migration 0008 | en place |
| Dons du personnel : abonnement, VPS ou crédits offerts sans Stripe, plafonnés par mois (D4) | table `staff_accounts`, `gift_grants` | en place |
| Module Directus « Modèles » pour administrer le catalogue | `cms/extensions-src/nexora-cms/src/catalog/` | en place |

Limites connues, consignées dans le journal du site : bascule multi-fournisseurs, libération des réservations perdues, rapprochement périodique LiteLLM et grand livre, aucun prix réel, coût amont de WorkStudio non suivi (donc pas de plancher de marge).

### 2.2 WorkStudio (ce dépôt)

- Le déploiement Nexora (`deploy/compose.yml`, `deploy/.env.example`, `install.sh`) ne définit pas `BILLING_ENABLED`. Vérifié dans `workstudio/apps/sim/.env.example` : sans cette variable, **aucune limite de forfait n'est appliquée** dans WorkStudio. L'accès gratuit du fondateur côté WorkStudio est donc déjà acquis ; le coût réel se situe dans la passerelle (appels de modèles), voir 5.
- Un rôle administrateur de plateforme existe (`isPlatformAdmin`, `user.role = 'admin'`, mode super-utilisateur).
- Des gabarits existent déjà : le dossier « Modèles PME » est créé dans chaque nouvel espace (`lib/nexora/seed-templates.ts`, `lib/nexora/templates.ts`), avec au moins : Devis client, Relance de facture impayée, Réponse support (FAQ), Tri des e-mails entrants, Compte rendu de réunion.
- La passerelle `nexora-api` de ce dépôt (OpenGateLLM) a aussi des clés, des fournisseurs, des routeurs, des rôles, des organisations et un usage. Le site et ce service font donc en partie double emploi : voir le chantier G8.

## 3. Les cinq modèles : fiches vérifiées

Sources : pages officielles lues le 28/10/2026 (DeepSeek, Z.ai, MiniMax, Kimi) ; les chiffres d'agrégateurs ne sont cités que pour les signaler. Tous les prix sont en dollars américains par million de jetons (« M »). Un point marqué « non confirmé » n'est pas sur une page officielle.

| | DeepSeek V4.1 Flash 1017 | GLM 5.3 | GLM 5.3 Flash | MiniMax M3.1 Flash | Kimi K3.1 Pro |
|---|---|---|---|---|---|
| Identifiant d'API | `deepseek-flash` | `glm-5.3` | `glm-5.3-flash` | `MiniMax-M3.1-Flash` | `kimi-k3.1-pro` |
| Publication | 17/10/2026 | 18/08/2026 | 26/08/2026 | non confirmée | non confirmée |
| Entrée | 0,15 creux / 0,30 pointe | 1,40 | 0,15 | 0,15 | 2,00 |
| Entrée en cache | 0,003 creux / 0,006 pointe | 0,26 | 0,03 | 0,015 | 0,20 (écriture : 2,00 pour 5 min, 4,00 pour 1 h) |
| Sortie | 0,60 creux / 1,20 pointe | 4,40 | 0,50 | 0,60 | 10,00 |
| Contexte | 1 M | 1 M | 1 M | 1 M | 1 M |
| Sortie maximale | 384 K | 128 K | 128 K | non confirmée | 131 072 par défaut, jusqu'à 1 048 576 |
| Vision | oui | non (texte seul) | oui (image, vidéo, fichier) | oui | oui |
| Appels d'outils | oui | oui | oui | oui | oui |
| Raisonnement | activable ou non | toujours actif | toujours actif | toujours actif | toujours actif |
| Sortie JSON structurée | oui | oui | oui | non confirmée | oui, schéma strict |
| Poids ouverts | oui, licence MIT, 763 B | oui, 753 B, texte de licence non lu | oui, licence MIT, 320 B dont 18 B actifs | oui, licence « minimax-community », texte non lu, environ 428 B dont 23 B actifs (en-tête Hugging Face : 220 B) | **pas encore**, annoncés pour le 04/11/2026 ; licence inconnue |

Sources : [DeepSeek, tarifs](https://api-docs.deepseek.com/quick_start/pricing), [DeepSeek, fiche](https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash-1017), [Z.ai, tarifs](https://docs.z.ai/guides/overview/pricing), [GLM 5.3](https://docs.z.ai/guides/llm/glm-5.3.md), [GLM 5.3 Flash](https://docs.z.ai/guides/vlm/glm-5.3-flash.md), [MiniMax, tarifs](https://platform.minimax.io/docs/guides/pricing), [MiniMax M3.1 Flash](https://huggingface.co/MiniMaxAI/MiniMax-M3.1-Flash), [Kimi, tarifs](https://platform.kimi.ai/docs/pricing/chat), [Kimi K3.1 Pro](https://platform.kimi.ai/docs/guide/kimi-k3-1-pro-quickstart.md).

Points qui changent la conception :

1. **« MiniMax M3.1 » seul n'existe pas** dans la documentation officielle : il y a `MiniMax-M3` (0,30 $ en entrée, 1,20 $ en sortie, cache 0,06 $) et `MiniMax-M3.1-Flash`. Je propose d'ajouter M3.1 Flash, et M3 si le fondateur le veut aussi.
2. **DeepSeek facture deux tarifs selon l'heure** : la pointe est de 01 h à 04 h et de 06 h à 10 h UTC, du lundi au vendredi hors jours fériés chinois ; le reste, y compris les fins de semaine, est « creux », à la moitié du prix. Le catalogue actuel n'a qu'un prix par modèle : il faut ajouter des plages horaires (chantier G1).
3. **Kimi facture l'écriture du cache** (5 min ou 1 h) en plus de la lecture ; le catalogue actuel ne connaît que la lecture du cache (chantier G2).
4. **Kimi K3.1 Pro : aucun benchmark officiel chiffré** (le guide contient des champs vides « [xx.x%] »). On affichera « non publié » et, à part, les mesures de tiers.
5. **GLM 5.3 Flash** existe aussi en `glm-5.3-flashx` (0,37 / 0,075 / 1,25) ; la variante `-legal` est sur candidature. Je n'ajoute pas FlashX sans demande.
6. Les noms de modèles concurrents dans les tableaux (Opus 5, GPT-5.6 Sol, « Fable 5 » ou « Mythos 5 ») sont ceux des éditeurs ; Z.ai les nomme de façon incohérente entre ses deux pages.

### Benchmarks publiés par les éditeurs (extraits)

| Benchmark | DeepSeek V4.1 Flash 1017 | GLM 5.3 | MiniMax M3.1 Flash | Kimi K3 (pas K3.1 Pro) |
|---|---|---|---|---|
| DeepSWE v1.1 | 77,0 | 66,9 | 73,7 | 67,5 |
| Terminal-Bench 4.0 | 42,3 | 37,9† | 38,1 | 12,6† |
| NL2Repo | 68,2 | 58,0 | 61,2 | 58,0† |
| Agents' Last Exam | 35,4 | 28,5 | 29,6 | 28,3 |
| Automation-Bench 1.0.6 | 60,5 | 48,2 | 62,8 | 46,7† |
| HLE sans outils | 42,6 | 42,0† (texte seul) | 43,4 | 43,5 |
| CyberGym | n.d. | 84,5 | 82,2 | n.d. |

† Chiffre repris du tableau d'un autre éditeur (DeepSeek ou MiniMax), faute de publication par l'éditeur du modèle. Les colonnes ne sont pas strictement comparables : chaque éditeur publie ses propres exécutions, avec ses propres harnais. Z.ai publie aussi, pour GLM 5.3 Flash, DeepSWE v1.1 à 63,4 et AutomationBench à 48,8. À afficher dans les fiches avec la mention « publié par l'éditeur », la source et la date de lecture.

## 4. Écarts et chantiers

| # | Écart | Chantier |
|---|---|---|
| G1 | Un seul prix par modèle ; DeepSeek a un tarif pointe / creux | Prix à plages horaires : table de calendrier de tarification, prix immuables conservés, le règlement choisit le tarif à l'heure de la requête |
| G2 | Pas de jetons d'écriture de cache (Kimi), ni de jetons de raisonnement séparés dans `usage_events` | Colonnes `cache_write_tokens`, `reasoning_tokens` ; prix d'écriture de cache 5 min / 1 h |
| G3 | Les fiches de modèles n'ont ni benchmarks, ni licence, ni nombre de paramètres, ni date, ni lien source | Champs structurés `benchmarks`, `license`, `open_weights`, `params`, `released_at`, `source_urls`, rendus sur `/modeles` |
| G4 | Panneau client : clés et usage de base | Journal d'activité requête par requête (filtres, export CSV), graphiques par modèle et par clé, plafond mensuel, alertes de solde, achat de crédits |
| G5 | Ajout d'un modèle : module Directus fonctionnel mais sans assistant | Assistant « Ajouter un modèle » : choisir le fournisseur, saisir l'identifiant amont, essai en direct, prix, aperçu de la marge, publication avec approbation |
| G6 | Un seul fournisseur amont ; pas de bascule | Routeur : plusieurs fournisseurs par modèle public, ordre de priorité, bascule sur erreur ou limite, prix amont par fournisseur |
| G7 | Rapprochement LiteLLM et grand livre non fait ; coût amont de WorkStudio non suivi | Tâche périodique de rapprochement, écarts signalés dans l'admin |
| G8 | Deux passerelles : `nexora-api` (WorkStudio) et la passerelle du site | Décision à prendre : WorkStudio appelle la passerelle du site (une seule comptabilité), `nexora-api` restant pour les fonctions que le site n'a pas (OCR, audio, rerank) |
| G9 | Accès gratuit du fondateur | Voir 5 |
| G10 | Peu de gabarits WorkStudio | Voir 6 |

## 5. Accès gratuit et panneau administrateur

- Le mécanisme de dons du personnel existe déjà (D4) : crédits offerts plafonnés par mois, abonnement ou VPS offerts sans Stripe. Il suffit pour démarrer ; il ne donne pas un accès **illimité**.
- Proposition : une organisation marquée « maison » (drapeau posé depuis l'admin, journalisé). Ses requêtes sont **comptées au coût réel** (le coût amont reste dans `usage_events` et dans les rapports) mais **débitées à zéro** ; aucune réservation n'échoue en 402. Le fondateur voit ainsi ce que lui coûte son usage sans se facturer.
- Côté WorkStudio : le profil du fondateur est administrateur de plateforme ; une fois G8 tranché, ses appels de modèles passent par la passerelle avec l'organisation « maison ».
- **Accès au panneau d'administration.** Il y en a deux : Directus (catalogue, contenus, agents, SEO) et l'application du site (`/compte`, administration des paiements). En développement, les identifiants Directus sont dans `NexoraSite/deploy/.env` (fichier en mode 600, hors Git). Je ne les recopie ni dans la conversation ni dans Git. Je les remettrai au fondateur dans un fichier à part, en local, après création du compte de développement. La clé d'activation Directus (licence) reste à la charge du fondateur.

## 6. Gabarits WorkStudio

Constats sur Mistral (analyses dans `docs/recherche/mistral-studio/12-workflows-1-concepts-construction.md` et `34-videos-workflows.md`) : leurs exemples mettent en avant l'approbation humaine, les sous-flux, les activités parallèles, les sorties structurées et la reprise sans rejouer. Quatre cas : conformité d'une expédition (document, classement, pause pour un relecteur), triage d'un sinistre (texte et photos en parallèle, gravité décidée par le code), modernisation de code (un sous-flux par fichier, revue avant la proposition), résumé hebdomadaire de tickets (connecteur, clarification humaine).

Proposition de bibliothèque Nexora (gabarits en français, branchés sur la passerelle, chacun avec un exemple de données et un test d'exécution) :

- **Déjà là (5)** : devis client, relance de facture, réponse support (FAQ), tri des e-mails, compte rendu de réunion.
- **À ajouter, première vague (10)** : triage de demandes d'assurance ou de réclamations (vision, parallèle, gravité déterministe) ; conformité d'un document avec approbation humaine ; saisie de factures fournisseurs par OCR avec rapprochement ; qualification de prospects entrants ; résumé hebdomadaire de projet (tickets) ; veille concurrentielle ; réponse à un appel d'offres à partir d'une base de connaissances ; onboarding d'un nouvel employé ; revue de contrat avec pause pour validation ; rapport mensuel de ventes à partir d'un tableur.
- **Deuxième vague** : à fixer avec le fondateur selon les secteurs visés (OPSYS-AI).

Chaque gabarit déclare son modèle par défaut (`NEXORA_DEFAULT_MODEL`) et reste modifiable par le client. Une page « Gabarits » avec recherche par secteur est à prévoir dans l'espace de travail.

## 7. Sécurité et règles

- Les clés amont (DeepSeek, Z.ai, MiniMax, Moonshot) vont dans le coffre du site (`vault_secrets`, `@nexora/vault`), jamais dans Git ni dans les journaux.
- Les contenus des requêtes ne sont pas journalisés ; l'historique ne garde que des métadonnées. Conserver cette règle pour l'historique client.
- Licences : Kimi K3 impose un accord séparé aux fournisseurs de modèle « en service » au-delà de 20 M$ de revenu cumulé sur 12 mois ; la licence de K3.1 Pro n'est pas publiée. À relire avant de revendre ou d'héberger les poids.
- Les prix et benchmarks affichés ont une date de lecture et un lien vers la source ; on ne publie rien dont la source est un agrégateur.
- Pas de paiement réel tant que « Autoriser les paiements réels » n'est pas coché par le fondateur.

## 8. Ordre de réalisation (TDD, tranches vérifiables)

1. G3 puis l'ajout des cinq modèles avec leurs fiches (en brouillon, non publiés tant que les prix de vente ne sont pas décidés).
2. G1 et G2 : comptage exact (plages horaires, écriture de cache, raisonnement), avec tests de rejeu sur des cas chiffrés à la main.
3. Organisation « maison » et accès administrateur.
4. G4 : panneau client (activité, graphiques, export, plafonds, alertes).
5. G5 : assistant d'ajout de modèle.
6. G6 et G7 : routeur, bascule, rapprochement.
7. G8 puis G10 : branchement de WorkStudio et gabarits.

## 9. Ce qu'il me faut du fondateur

1. **Marge** : marge cible par modèle, ou règle générale (par exemple un pourcentage sur le coût amont), et plancher. Sans réponse, je pose une marge de 30 % comme valeur de développement, en brouillon.
2. **Clés amont** : sa clé de chaque fournisseur (DeepSeek, Z.ai, MiniMax, Moonshot), à saisir dans le coffre par lui-même. Je ne les demande pas dans la conversation.
3. **MiniMax** : M3.1 Flash seulement, ou aussi M3 ?
4. **G8** : OK pour que WorkStudio appelle la passerelle du site ?
