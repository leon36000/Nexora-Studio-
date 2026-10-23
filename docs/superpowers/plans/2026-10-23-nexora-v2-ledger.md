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
