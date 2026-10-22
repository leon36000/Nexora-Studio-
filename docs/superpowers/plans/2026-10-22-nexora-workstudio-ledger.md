# Ledger — Nexora WorkStudio v1

Journal d'exécution du plan `2026-10-22-nexora-workstudio.md`. Chaque entrée indique la date, la tâche, ce qui a été fait, la preuve de vérification et les décisions prises (« rulings »).

## Décisions (rulings)

| # | Date | Tâche | Décision | Raison |
|---|---|---|---|---|
| R1 | 22/10/2026 | — | Brainstorming par questions sauté ; tous les choix de conception sont de l'agent | Le fondateur a demandé une exécution autonome, sans arrêt |
| R2 | 22/10/2026 | 0 | Import par `git archive` (sans historique amont) ; base Sim v0.9.31 `ec64b00` | Le `.git` du clone de travail contient les objets `ee/` d'origine |
| R3 | 22/10/2026 | 12 | Images amd64 construites par la CI (workflow fourni), non vérifiées localement | Construire en amd64 sur pc6 exigerait d'installer binfmt/QEMU, un réglage système |
| R4 | 22/10/2026 | 4 | Liens de documentation : `docsUrl()` ; à défaut de `NEXT_PUBLIC_DOCUMENTATION_URL`, renvoi vers le guide du dépôt | Nexora n'a pas encore de site de documentation |

## Journal

- 22/10/2026 — Spec et plan écrits.
