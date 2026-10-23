# Nexora WorkStudio v2 — ledger

Spec : `docs/superpowers/specs/2026-10-23-nexora-v2-design.md`. Plans : `docs/superpowers/plans/2026-10-23-nexora-v2-*.md`.

## Décisions (rulings)

| # | Date | Jalon | Décision | Raison |
|---|---|---|---|---|
| V1 | 23/10/2026 | — | Le fondateur délègue toutes les décisions (« tu es l'architecte en chef […] commence et ne t'arrête plus ») ; GitHub est la référence, envois sans redemander | Messages du 23/10/2026 |
| V2 | 23/10/2026 | — | CI d'images désactivée sur `main` : le build Next de WorkStudio dépasse les runners gratuits (16 Go) ; l'installateur construit sur place | Deux essais en échec mémoire ; le fondateur : « si c'est trop de complications, continue sur l'infrastructure, oublie GitHub » |
| V3 | 23/10/2026 | J1 | Embeddings des connaissances via l'Ollama de Nexora directement (`KB_EMBEDDING_MODEL=ollama/bge-m3`, chemin d'origine de Sim) ; routeurs d'embeddings Nexora API en J2 | Chemin déjà testé en amont, pas de nouveau fournisseur à écrire |
| V4 | 23/10/2026 | — | Six décisions de relecture (Ollama permanent, un routeur par modèle d'embeddings, traduction des blocs par niveaux, `nexora-default` alias, invitations seules en J3, SearXNG désactivé par défaut) | Spec §8bis |

## Journal

- 23/10/2026 — Analyse d'écart (sous-agent) ; conception v2 (`55251596`) ; relecture « constructeur » ; plan J1.
- 23/10/2026 — **J1 T1** : Ollama permanent (plus de profil), `nexora-api` attend Ollama, `install.sh` télécharge toujours `bge-m3` (`pull_ollama_model`, threads limités) et le modèle de discussion local si `NEXORA_UPSTREAM_URL=http://ollama:11434` ; un `.env` v1 (`COMPOSE_PROFILES=ollama`) se met à jour sans erreur. WorkStudio : `OLLAMA_URL`, `KB_EMBEDDING_MODEL=ollama/bge-m3`, `EMBEDDING_OUTPUT_DIMS=1024` ; erreurs d'embedding expliquées en français (`classifyKnowledgeProcessingError`). Preuves : test-install 47 cas verts ; vitest (classement, configuration) ; pile pc6 redéployée, **fumée 12/12** dont « Base de connaissances (embeddings locaux) » en 5,4 s. Ruling : la vérification « recherche sans reranker » est couverte par la fumée (aucun reranker configuré, recherche OK) plutôt qu'un test unitaire dédié — coût si faux : régression non détectée hors fumée. Disque : 252 entrées de mon cache de construction du 22/10 supprimées (59 Go libres).
- 23/10/2026 — **J1 T2** : service `cron` (image `nexora/cron` depuis `workstudio/docker/cron.Dockerfile`, supercronic + `docker/crontab` d'origine), `SIM_URL=http://workstudio:3000`, `CRON_SECRET` existant, `TZ` = fuseau Nexora ; ajouté à la CI d'images. Preuves : fumée **12/13 avant** (planification créée, jamais exécutée), **13/13 après** (exécution en 10,1 s) ; journaux du cron : tâches « job succeeded ».
- 23/10/2026 — **J1 T3** : nouveaux blocs Agent, Router, Router v2, Evaluator, Guardrails préremplis avec le modèle Nexora (`receivesDefaultModel`) ; un bloc existant dont le modèle n'est pas servi par l'instance affiche « Ce modèle n'est pas disponible sur cette instance » et un bouton « Utiliser le modèle Nexora » (`unavailableModelReplacement`). Tests : 140 verts (combobox, lib/nexora, stores/workflows). Rulings : pas de `resolveNexoraModel` tant qu'aucun consommateur ; fumée « Routeur » remplacée par tests unitaires + navigateur en T11 ; Pi exclu.
