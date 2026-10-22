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
- 22/10/2026 — **Tâche 2 (partie 1).** `bun install --frozen-lockfile` : 2 144 paquets en 3,5 s (cache). Bun 1.4.2 installé pour l'utilisateur (`~/.local/share/nexora-tools`, liens dans `~/.local/bin`). **tsc `apps/sim` : 0 erreur.** Tests des 57 fichiers qui touchent `@/ee/` : 13 fichiers en échec (56 tests sur 1 192). Leur réparation (tâche 2b) est confiée à un sous-agent, sous contrainte de salle blanche.
- 22/10/2026 — **Tâche 3 terminée.**
  - Constats : PostHog ne démarre qu'avec une clé et `NEXT_PUBLIC_POSTHOG_ENABLED` (rien à changer) ; Sentry n'est pas une dépendance.
  - OpenTelemetry et `/api/telemetry` envoyaient **par défaut** à `telemetry.simstudio.ai` : remplacé par `lib/telemetry/endpoint.ts` (`resolveTelemetryEndpoint`), sans collecteur par défaut.
  - Le copilot (« mothership ») avait pour URL par défaut `https://www.copilot.sim.ai`, remplacée par `http://copilot.invalid`.
  - Les surfaces Chat et copilot sont masquées par défaut : nouveau `NEXT_PUBLIC_CHAT_ENABLED` ; `NEXT_PUBLIC_CHAT_DISABLED` garde la priorité.
  - Tests : `lib/nexora/edition-defaults.test.ts` et `lib/telemetry/endpoint.test.ts` (10/10, écrits avant le code) ; tests voisins 23 fichiers / 210 tests verts.
  - Restent des références à `sim.ai` sans appel par défaut (`status.sim.ai` monté seulement si `isHosted`, réécritures d'hôtes dans `tools/http/utils.ts`, CSP) : traitées avec la marque en tâche 4.
  - R7 : le Chat d'accueil de Sim dépend d'un service fermé, donc il est masqué en v1 (l'espace s'ouvre sur le premier workflow). Un Chat Nexora branché sur Nexora API est renvoyé à la phase 2.
