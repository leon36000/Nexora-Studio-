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
- 22/10/2026 — **Tâche 0 terminée.** Dépôt Git initialisé (`main`, remote `origin` sans push). Commit d'import `8fbcd64` : Sim v0.9.31 sans `apps/sim/ee`, 106 modules salle blanche (tous avec en-tête), OpenGateLLM `26583dc`, OpenConnector `2d9a593`. Aucun fichier `.env` importé. Branche de travail `workstudio-v1`. `.git` = 285 Mo (les migrations Drizzle de Sim pèsent 189 Mo).
  - R5 : identité Git locale au dépôt = `leon36000` (compte GitHub du fondateur) ; co-auteur Claude dans chaque message.
  - Repéré pour la tâche 4 : `apps/sim/public/landing` (41 Mo : vidéos et témoignages clients de Sim) à retirer avec le site marketing.
- 22/10/2026 — **Tâche 1 terminée.** `scripts/check-no-ee.sh` (en-tête + historique Git + arbre de travail, 2,7 s) et `scripts/check-licenses.sh`, avec leurs tests (`scripts/tests/test-check-*.sh` : 5/5 et 6/6). Sur le dépôt : `check-no-ee: OK (318 reference hashes, 32180 files checked)`, `check-licenses: OK (3 components)`. Bug trouvé par le test d'historique (`cat-file` recevait le chemin avec l'empreinte), corrigé.
  - R6 : la référence `scripts/data/sim-ee-blob-shas.txt` contient seulement les empreintes de blobs (`git ls-tree`, sans lecture du contenu), sans les chemins. L'empreinte du fichier vide est ignorée. Pas de `scripts/lib/ee-reference.sh` : la commande de génération est écrite en tête du fichier de données.
