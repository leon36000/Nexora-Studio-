# Base de connaissances — Mistral Studio (pour Nexora Studio)

Cette base rassemble tout ce qui est publiquement disponible sur **Mistral Studio** (ex-« Mistral AI Studio », ex-« La Plateforme ») au **21/10/2026**, jusqu'aux détails. Elle sert de référence pour concevoir **Nexora Studio**.

**Commencer par [00-synthese.md](00-synthese.md)**, qui résume tout en un seul document et renvoie vers les chapitres détaillés.

## Méthode

| Source | Volume | Traitement |
|---|---|---|
| Documentation officielle `docs.mistral.ai` (`llms-full.txt`) | 422 pages, ~3,3 Mo | Lecture intégrale par 14 agents, un domaine chacun. Couverture vérifiée par script : 422/422 pages citées. |
| Spécification OpenAPI `docs.mistral.ai/openapi.yaml` | 319 opérations, 951 schémas | Catalogue généré par script, puis relu ([40](40-api-catalogue-endpoints.md)) |
| Site `mistral.ai` (produit, tarifs, SLA), centre d'aide, Trust Center, page de statut | ~95 pages | Agent web ([01](01-offre-produit-positionnement-tarifs.md)) |
| Annonces officielles, presse, faits sur l'entreprise, concurrence | — | Agent web ([02](02-historique-annonces-presse.md)) |
| Vidéo Pentiminax « Créer des agents IA avec Mistral AI Studio » (18:52) | 138 images distinctes + transcription | Examen image par image ([30](30-video-pentiminax-agents-sans-coder.md)) |
| Autres vidéos YouTube (chaîne officielle, conférences, tutoriels) | 248 repérées, 30 transcriptions lues ; puis 28 vidéos analysées image par image (≈ 3 750 images distinctes) ; 2 keynotes sans sous-titres transcrites en local | Agents vidéo ([31](31-autres-videos.md), [33](33-videos-console-agents-connecteurs-skills.md), [34](34-videos-workflows.md), [35](35-videos-observabilite-admin-audio-keynotes.md)) |
| Images publiques (doc, annonces, page produit, centre d'aide, README GitHub) | 323 images examinées | Agent images ([36](36-captures-doc-annonces.md)) |
| Retours d'utilisateurs (Hacker News, Reddit, GitHub, YouTube, blogs, avis) | voir le chapitre | Agent retours ([37](37-retours-utilisateurs.md)) |
| GitHub `mistralai`, PyPI, npm | 31 dépôts, ~44 paquets | Agent technique ([32](32-ecosysteme-open-source-sdk.md)) |

**Règles suivies** : faits uniquement, et toute inférence est marquée « (inférence) ». Les identifiants techniques sont gardés en anglais. Les incohérences de la doc sont relevées en section 8 de chaque chapitre (plus de 400 au total). Aucune recommandation pour Nexora : la conception se fera avec le fondateur.

## Chapitres

| # | Chapitre | Contenu |
|---|---|---|
| 00 | [Synthèse](00-synthese.md) | Vue d'ensemble, carte fonctionnelle, console, chiffres clés, maturité, chronologie, constats |
| 01 | [Offre produit, positionnement, tarifs](01-offre-produit-positionnement-tarifs.md) | Page Studio, gamme Mistral, plans, paliers, prix, SLA, confiance et conformité |
| 02 | [Historique, annonces, presse, concurrence](02-historique-annonces-presse.md) | Chronologie datée, couverture presse, faits sur l'entreprise, plateformes concurrentes |
| 03 | [Administration, sécurité, facturation](03-administration-securite-facturation.md) | Organisations, workspaces, RBAC, SSO, service accounts, audit logs, ZDR, Admin API |
| 10 | [Conversations et capacités](10-conversations-capacites.md) | Chat completions, Prompt Registry, vision, outils, JSON, citations, raisonnement, cache, embeddings, modération, secrets |
| 11 | [Démarrage, Playground, Agents, Connecteurs](11-demarrage-playground-agents-connecteurs.md) | Quickstarts, Playground, Prompts, Skills, Agents API, outils intégrés, handoffs, MCP |
| 12 | [Workflows (1/2) : concepts et construction](12-workflows-1-concepts-construction.md) | Temporal, workers, activities, déterminisme, agents durables, chiffrement, scheduling |
| 13 | [Workflows (2/2) : interaction et production](13-workflows-2-interaction-production.md) | Workflows conversationnels et Vibe, signals/queries/updates, deployments, quotas, erreurs |
| 14 | [Observabilité et évaluations](14-observabilite-evaluations.md) | Traces OTel, Explorer, masquage, datasets, évaluateurs, statistiques, optimisation |
| 15 | [Recherche : Libraries, Agentic Search, Search Toolkit](15-recherche-libraries-search-toolkit.md) | RAG géré, outils MCP de recherche, framework d'ingestion et de retrieval, Vespa/Postgres |
| 16 | [Document AI et OCR](16-document-ai-ocr.md) | `/v1/ocr`, annotations, Document QnA, formats, limites |
| 17 | [Batch, inférence, tarifs](17-batch-inference-tarifs.md) | Batch API, cycle de vie des modèles, Priority Tier, régions, grille tarifaire complète |
| 18 | [Audio (1/2) : transcription](18-audio-1-transcription.md) | Voxtral 3, offline et temps réel, diarisation, biais, détection de tours |
| 19 | [Audio (2/2) : TTS et agents vocaux](19-audio-2-tts-agents-vocaux.md) | Voix, clonage, émotions, agents vocaux LiveKit, téléphonie, webhooks |
| 20 | [Modèles, ressources, changelogs](20-modeles-ressources-changelogs.md) | 75 fiches modèles, cycle de vie, changelogs, avis de sécurité, fonctions dépréciées (fine-tuning…) |
| 21 | [Vibe Code](21-vibe-code.md) | CLI, VS Code, Vibe Code Web, permissions, plugins, MCP, ACP |
| 22 | [Vibe Work et Le Chat](22-vibe-work-le-chat.md) | Work, Skills, Projects, Libraries, Connectors, tâches planifiées, lien avec Studio |
| 30 | [Vidéo : agents sans coder (Pentiminax)](30-video-pentiminax-agents-sans-coder.md) | Inventaire exhaustif de l'interface Studio, écran par écran, avec 25 captures |
| 31 | [Autres vidéos](31-autres-videos.md) | 15 vidéos détaillées et 15 en complément, inventaire de 248 vidéos |
| 32 | [Écosystème open source et SDK](32-ecosysteme-open-source-sdk.md) | Dépôts GitHub, paquets PyPI/npm, licences, dépendances (Temporal…) |
| 33 | [Vidéos : console agents, connecteurs, skills](33-videos-console-agents-connecteurs-skills.md) | 12 vidéos analysées image par image : évolution du menu, fiches connecteurs, débogueur OAuth, versions des skills, Vibe (40 captures) |
| 34 | [Vidéos : Workflows](34-videos-workflows.md) | 6 vidéos : interface de Workflows à 4 dates, publication dans Vibe, vue d'exécution, code et CLI relevés (40 captures) |
| 35 | [Vidéos : observabilité, Admin, audio, keynotes](35-videos-observabilite-admin-audio-keynotes.md) | Agentic Safety, écrans Explorer, Datasets et Judges, Admin complet, playgrounds audio, keynote AI Now transcrite en local (40 captures) |
| 36 | [Captures : doc, annonces, aide](36-captures-doc-annonces.md) | 323 images examinées : générations de la console, premier écran Évaluations, Judges, exécution de workflows, workflows conversationnels (40 captures) |
| 37 | [Retours des utilisateurs](37-retours-utilisateurs.md) | Ce que développeurs et entreprises disent de Studio : points forts, irritants, demandes, comparaisons |
| 40 | [Catalogue de l'API](40-api-catalogue-endpoints.md) | Les 319 opérations par domaine, paramètres, corps, réponses, énumérations, schémas clés |

**Suite de la recherche** : le choix des bases et des briques open source pour construire Nexora est dans [`../open-source/`](../open-source/README.md), en commençant par [la décision](../open-source/00-decision-bases-et-briques.md).

## Dossier `sources/` (local, non versionné)

Il contient des copies de travail de contenus tiers et il est **exclu de git** (voir `.gitignore` à la racine du projet). **Ne pas le publier.**

- `docs-mistral/` : les 422 pages de la doc, une par fichier, dans l'arborescence du site ; `docs-mistral-llms-full.txt` (fichier unique) et `docs-mistral-llms.txt` (index).
- `openapi.yaml` : spécification de l'API.
- `mistral-ai-llms.txt` : résumé officiel de l'offre.
- `video-pentiminax/` : transcription et 25 captures d'écran de référence.
- `videos/` : transcriptions des autres vidéos retenues.

## Rafraîchir la base

```bash
curl -sL https://docs.mistral.ai/llms-full.txt -o sources/docs-mistral-llms-full.txt
```

```bash
curl -sL https://docs.mistral.ai/openapi.yaml -o sources/openapi.yaml
```

Pour voir ce qui a changé, comparer ensuite avec la copie du 21/10/2026, puis relire `resources/changelogs` et `resources/release-notes` dans la doc.
