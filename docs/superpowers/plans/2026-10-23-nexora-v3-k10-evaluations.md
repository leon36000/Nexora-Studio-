# K10 — Évaluations — Plan d'implémentation

> **Pour les agents d'exécution :** utiliser superpowers:executing-plans (exécution native dans la session). Les étapes utilisent des cases à cocher (`- [ ]`), cochées au fur et à mesure.

**Objectif :** mesurer la qualité des agents, des prompts K9 et des modèles : jeux de tests, juges, campagnes en arrière-plan, statistiques, comparaison, seuils d'alerte et campagnes planifiées, avec une page « Évaluations » en français.

**Architecture :** domaine `lib/nexora/evaluations/` (modules purs testés : règles, statistiques, verdict des juges, import ; dépôt Drizzle ; moteur de campagnes avec bail et reprise ; cibles qui réutilisent `wand.ts`, les prompts K9 et l'exécution d'un agent publié). Cas d'usage autorisés `defineAuthorizedWorkspaceUseCase` + routes internes `/api/nexora/evaluations/**` + route cron `/api/cron/run-nexora-evaluations` (cron existant). Les appels de modèle passent par les chemins existants (traces K8, budgets, consommation de Nexora API). Interface : page d'espace `/workspace/<id>/evaluations`.

**Stack :** Next.js 16 / React 19, Drizzle + PostgreSQL, zod (contrats), React Query, next-intl (fr par défaut), vitest, `re2js` (regex linéaire), `croner` (planification).

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` ; contenu et « Terminé quand » de K10 : `docs/recherche/ecart-mistral-studio-v2.md` §3.2 ; référence Mistral : `docs/recherche/mistral-studio/14-observabilite-evaluations.md`.

## Contraintes globales

- Aucun code `ee/` d'origine de Sim (`scripts/check-no-ee.sh`). Les ajouts restent dans `lib/nexora/`, `app/api/nexora/`, les pages Nexora et `messages/{fr,en}/evaluations.json`.
- Tout texte d'interface passe par next-intl (`evaluations`), français par défaut ; le dossier de la page est ajouté à `scripts/data/i18n-covered-dirs.txt`.
- Migration **0446** (K5 prend 0445), `when` supérieur à celui de la dernière entrée du journal (0444 : `1792897222733`), additive uniquement (tables neuves), `check:migrations` sans bloquant.
- TDD : test rouge d'abord, chaque garde retirée ⇒ test rouge. Pas de test qui restate une déclaration.
- `bun`, jamais `npm` ; pas de `cd` ; `biome` sur des listes de fichiers explicites.
- Concurrence par défaut **2**, maximum 8 par campagne, **4 appels de campagne au plus à la fois pour toute l'instance** ; une campagne cède la place aux exécutions interactives en cours (Assistant, chat) au plus 30 s par élément.
- Plafonds : 10 000 lignes par jeu de tests, 5 000 éléments (lignes × cibles) par campagne, réponse conservée coupée à 20 000 caractères.
- Les campagnes appellent les modèles par les chemins de l'instance : trace K8 (source `playground` renommée « Évaluation : … » côté modèle ; exécutions d'agent tracées par le journal d'exécution), budget mensuel vérifié avant chaque élément (`checkBudget`), jetons et CO₂ relevés par élément.
- Rien ne sort de l'instance : un modèle hors instance reste signalé comme tel par les fiches (K1) ; les campagnes n'ajoutent aucune destination.

## Revue ciblée (cas que la spec n'énonce pas)

- Un juge LLM qui répond autre chose que le format demandé (texte libre, JSON dans une clôture, raisonnement `<think>`) : verdict `error` avec la réponse brute en note, jamais `pass` par défaut.
- Un motif regex catastrophique (`(a+)+b`) : refusé ou exécuté en temps linéaire (RE2), jamais bloquant pour la boucle d'événements.
- Redémarrage du serveur au milieu d'une campagne : les éléments « en cours » sont repris (au plus 3 tentatives), aucun élément n'est compté deux fois.
- Annulation pendant que des éléments sont en vol : plus aucun nouvel élément ne démarre, les appels en vol de ce processus sont interrompus, le statut final est « annulée ».
- Budget mensuel atteint pendant une campagne : la campagne s'arrête proprement (« interrompue : budget mensuel atteint »), les éléments restants ne sont pas marqués en échec de qualité.
- Jeu de tests supprimé ou modifié après le lancement : la campagne garde son instantané (entrée, attendu, consigne) ; la comparaison apparie par identifiant de ligne et signale les lignes absentes d'un côté.
- Membre sans droit d'écriture : lit les campagnes, ne lance rien ; un membre d'un autre espace reçoit « introuvable ».
- Conversation de l'Assistant d'un autre membre : jamais importable (introuvable) ; traces privées d'un autre auteur : refusées.

---

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `workstudio/packages/db/migrations/0446_nexora_evaluations.sql`, `meta/_journal.json`, `meta/0446_snapshot.json`, `packages/db/schema.ts`, `packages/testing/src/mocks/schema-tables.generated.ts` | tables `nexora_eval_dataset`, `_row`, `_judge`, `_campaign`, `_item`, `_schedule`, `_alert` |
| `apps/sim/lib/nexora/evaluations/types.ts` | types partagés : cibles, configurations de juges, verdicts |
| `.../rules.ts` | juges à règles : contient, regex (RE2), JSON valide |
| `.../semantic.ts` | proximité sémantique : cosinus + embeddings Nexora API |
| `.../judge.ts` | consignes du juge LLM, lecture du verdict, `runJudge` |
| `.../stats.ts` | percentiles, synthèse par cible, comparaison de deux séries, accord avec les annotations |
| `.../import.ts` | CSV / JSONL / table / traces / conversations → lignes de jeu de tests |
| `.../repository.ts` (+ `repository.integration.ts`) | accès PostgreSQL : jeux, juges, campagnes, éléments (réclamation `SKIP LOCKED`, bail), planifications, alertes |
| `.../targets.ts` | exécution d'un élément : modèle, prompt K9, agent publié |
| `.../runner.ts` | moteur : concurrence bornée, bail, reprise, annulation, priorité, clôture |
| `.../alerts.ts` | alerte sous le seuil : enregistrement, e-mail si SMTP |
| `.../schedule.ts` | prochaine échéance (croner), déclenchement des campagnes planifiées |
| `.../application/operations.ts`, `use-cases.ts` | opérations d'espace et cas d'usage autorisés + audit |
| `apps/sim/lib/api/contracts/nexora-evaluations.ts` | contrats des routes |
| `apps/sim/app/api/nexora/evaluations/**`, `app/api/cron/run-nexora-evaluations/route.ts` | routes |
| `docker/crontab`, `helm/sim/values.yaml` | ligne cron chaque minute |
| `apps/sim/lib/nexora/developer-api/agents.ts` | extraction de `launchAgentRun` (partagée avec la passerelle) |
| `apps/sim/lib/nexora/wand.ts` | `nexoraWandComplete` accepte modèle, température, plafond de jetons, trace |
| `apps/sim/hooks/queries/nexora-evaluations.ts` | React Query |
| `apps/sim/app/workspace/[workspaceId]/evaluations/**` | page, détail de campagne, jeu de tests, comparaison, fenêtres |
| `apps/sim/messages/{fr,en}/evaluations.json`, `i18n/messages.ts`, sidebar | textes, entrée de barre latérale |
| `packages/audit/src/types.ts`, `lib/nexora/audit-labels.ts` | actions d'audit |
| `docs/guide/evaluations.md`, `docs/guide/index`, `scripts/smoke.py` | guide, contrôle de fumée « Évaluations » |
| `docs/verification/k10-faq/` | jeu « FAQ tarifs » (30 questions, 10 annotations), prompts v1/v2, script de campagne, rapport |

---

### Tâche 1 : Migration 0446 et schéma

**Fichiers :** migration, journal, instantané, `schema.ts`, simulacre de schéma, `packages/audit/src/types.ts`.

**Interfaces — produit :** exports Drizzle `nexoraEvalDataset`, `nexoraEvalRow`, `nexoraEvalJudge`, `nexoraEvalCampaign`, `nexoraEvalItem`, `nexoraEvalSchedule`, `nexoraEvalAlert` ; actions d'audit `EVALUATION_DATASET_CREATED`, `EVALUATION_DATASET_DELETED`, `EVALUATION_JUDGE_SAVED`, `EVALUATION_JUDGE_DELETED`, `EVALUATION_CAMPAIGN_LAUNCHED`, `EVALUATION_CAMPAIGN_CANCELLED`, `EVALUATION_CAMPAIGN_DELETED`, `EVALUATION_SCHEDULE_SAVED`, `EVALUATION_SCHEDULE_DELETED`, `EVALUATION_ALERT_ACKNOWLEDGED`.

- [x] **Étape 1 : écrire le schéma** dans `schema.ts` (colonnes décidées : voir le ledger K10, tables neuves, clés étrangères en cascade vers l'espace, `ON DELETE RESTRICT` du jeu et du juge depuis une campagne, index `(campaign_id, status)`, unicité `(campaign_id, row_id, target_key)`, unicité du nom par espace sans casse).
- [x] **Étape 2 : générer** `bunx drizzle-kit generate`, renommer en `0446_nexora_evaluations` (idx 446, `when` > 1792897222733), instantané `0446_snapshot.json` rebasé sur 0444.
- [x] **Étape 3 : vérifier** sur un Postgres jetable (`pgvector/pgvector:pg17`) : migrations rejouées de bout en bout ; `drizzle-kit generate` ne produit plus rien ; `bun run check:migrations` sans bloquant ; `bun run scripts/generate-schema-mock.ts`.
- [x] **Étape 4 : commit** `feat(k10): tables des évaluations (migration 0446)`.

### Tâche 2 : Règles et statistiques (modules purs)

**Fichiers :** `evaluations/types.ts`, `rules.ts`, `stats.ts` + tests `rules.test.ts`, `stats.test.ts`.

**Interfaces — produit :**
- `type JudgeVerdict = 'pass' | 'fail' | 'error'` ; `interface JudgeOutcome { verdict: JudgeVerdict; score: number | null; note: string }`
- `evaluateRule(config: RuleJudgeConfig, subject: { answer: string; expected: string | null }): JudgeOutcome` ; `validateRuleConfig(config): string | null` (message en français ou `null`)
- `percentile(values: number[], p: number): number | null` (interpolation linéaire)
- `summarizeItems(items: SummaryItem[]): TargetSummary` — `{ total, finished, errors, passed, failed, passRate: number | null, meanScore: number | null, latencyP50: number | null, latencyP95: number | null, inputTokens, outputTokens, kgCo2eq: number | null }` ; une erreur (cible ou juge) **compte comme non réussie** dans le taux (une cible qui plante ne paraît pas bonne) et est affichée à part
- `compareSeries(a: SeriesItem[], b: SeriesItem[]): { rows: ComparedRow[]; counts: { improved, regressed, same, onlyA, onlyB } }` — appariement par `rowId`
- `agreement(pairs: { judge: JudgeVerdict; human: 'pass' | 'fail' }[]): { total, matched, rate: number | null }` (les verdicts `error` comptent comme désaccord)

- [x] **Étape 1 : tests rouges** : `contains` (casse, valeur littérale ou attendu de la ligne, attendu absent ⇒ `error`), `regex` (`(a+)+b` sur 30 000 `a` ⇒ rapide, motif avec assertion arrière ⇒ refusé par `validateRuleConfig`), `json_valid` (clôture ```json acceptée, clés requises, tableau racine accepté seulement sans clés requises), `percentile` ([] ⇒ null, p50/p95 sur 1..100 = 50,5 / 95,05), `summarizeItems` (une erreur n'est pas une réussite, CO₂ nul si aucun élément mesuré, jamais 0), `compareSeries` (ligne présente d'un seul côté, régression pass→fail), `agreement` (10 paires, 8 concordantes ⇒ 0,8 ; `error` = désaccord ; 0 annotation ⇒ `rate` null).
- [x] **Étape 2 : voir rouge** `LANG=en_US.UTF-8 bun run --cwd workstudio/apps/sim test lib/nexora/evaluations`.
- [x] **Étape 3 : implémenter** (`compileLinearRegex` de `@/lib/core/security/linear-regex` pour les motifs).
- [x] **Étape 4 : retirer chaque garde** (RE2, exclusion des erreurs, appariement par identifiant) ⇒ le test correspondant rougit ; remettre.
- [x] **Étape 5 : commit.**

### Tâche 3 : Juges LLM, proximité sémantique et appel de modèle

**Fichiers :** `judge.ts`, `semantic.ts`, `lib/nexora/wand.ts` (+ `wand.test.ts`), tests `judge.test.ts`, `semantic.test.ts`.

**Interfaces — consomme :** `nexoraWandComplete` (étendu). **Produit :**
- `nexoraWandComplete(input: { messages; signal?; responseFormat?; trace?; model?: string; temperature?: number; maxTokens?: number }): Promise<{ text: string; usage: WandUsage }>`
- `buildJudgeMessages(config: LlmJudgeConfig, subject: JudgeSubject): WandMessage[]` ; `parseJudgeReply(config: LlmJudgeConfig, reply: string): JudgeOutcome`
- `runJudge(config: JudgeConfig, subject: JudgeSubject, deps: JudgeDeps): Promise<JudgeOutcome & { usage: WandUsage | null }>` où `JudgeDeps = { complete: (…) => …; embed: (texts: string[], model: string) => Promise<number[][]> }`
- `cosineSimilarity(a: number[], b: number[]): number` ; `embedTexts(texts: string[], model: string, signal?: AbortSignal): Promise<number[][]>` (Ollama de l'instance, `/api/embed`, comme les bases de connaissances)

- [x] **Étape 1 : tests rouges** : réponse `{"verdict":"correct","note":"…"}` ; clôture ```json ; `<think>` en tête ; texte libre ⇒ `error` avec la réponse brute ; classification : étiquette hors liste ⇒ `error` ; note : `7/10` et `{"score":7}` lus, hors bornes ⇒ `error`, seuil `passAt` ; sémantique : cosinus de vecteurs colinéaires = 1, orthogonaux = 0, vecteur nul ⇒ 0 sans NaN, seuil ; `nexoraWandComplete` envoie le modèle, la température 0 et `max_tokens` demandés.
- [x] **Étape 2 : rouge, implémenter, vert.**
- [x] **Étape 3 : gardes retirées** (seuil, bornes de note, étiquette hors liste) ⇒ rouge.
- [x] **Étape 4 : commit.**

### Tâche 4 : Import des jeux de tests

**Fichiers :** `import.ts`, `import.test.ts`.

**Produit :** `interface RowDraft { input: string; expected: string | null; guidance: string | null; candidate: string | null; humanVerdict: 'pass' | 'fail' | null; humanNote: string | null; sourceRef: string | null }` ; `parseCsvRows(text: string, mapping?: ColumnMapping): { rows: RowDraft[]; skipped: number }` ; `parseJsonlRows(text: string, mapping?: ColumnMapping): { rows: RowDraft[]; skipped: number }` ; `rowsFromTable(columns, rows, mapping)` ; `rowsFromTraces(traces)` ; `rowsFromConversation(messages)` ; colonnes reconnues par défaut : `question|input|entrée`, `attendu|expected|réponse attendue`, `consigne|guidance`, `réponse|candidate`, `verdict`, `justification`.

- [x] **Étape 1 : tests rouges** : CSV avec `;`, BOM et guillemets ; JSONL avec une ligne invalide (comptée « ignorée », pas d'échec global) ; 10 001 lignes ⇒ erreur « au plus 10 000 lignes » ; ligne sans entrée ignorée ; verdict `oui/non/pass/fail` normalisé ; conversation : un échange (question, réponse) par paire de messages, les messages d'outil ignorés.
- [x] **Étape 2 : rouge, implémenter (CSV via `decodeCsvText`/`detectCsvDelimiter`/`parseCsvBuffer` de `lib/table/import`), vert.**
- [x] **Étape 3 : commit.**

### Tâche 5 : Dépôt PostgreSQL

**Fichiers :** `repository.ts`, `repository.integration.ts`.

**Produit (signatures utilisées par le moteur et les cas d'usage) :** `insertDataset`, `listDatasets`, `getDatasetWithRows`, `appendRows`, `updateRow`, `deleteDataset` (refus si une campagne l'utilise) ; `saveJudge`, `listJudges`, `getJudge`, `deleteJudge` ; `insertCampaignWithItems(campaign, items)` ; `claimNextItem(campaignId, workerId, now): Promise<ItemRecord | null>` (`UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED LIMIT 1)`) ; `completeItem`, `heartbeat(campaignId, owner, leaseUntil)` ; `adoptCampaign(campaignId, owner, now, leaseMs)` (prend une campagne dont le bail est expiré, remet ses éléments `running` à `pending` avec `attempt + 1`, `error` après 3) ; `listAdoptableCampaigns(now)` ; `finishCampaign(campaignId, status, error?)` ; `cancelCampaign` ; `listCampaigns` (progression et taux par SQL) ; `getCampaignItems` ; planifications : `insertSchedule`, `claimDueSchedules(now)` (`SKIP LOCKED`, avance `next_run_at` dans la même requête) ; alertes : `insertAlert`, `listAlerts`, `acknowledgeAlert`.

- [x] **Étape 1 : tests d'intégration rouges** (Postgres jetable) : deux travailleurs réclament en même temps ⇒ jamais le même élément ; bail expiré ⇒ reprise, élément `running` remis à `pending` ; 4ᵉ tentative ⇒ `error` ; suppression d'un jeu utilisé ⇒ refus ; instantané de campagne indépendant de la modification du jeu ; `claimDueSchedules` deux fois ⇒ une seule campagne ; unicité du nom d'un jeu sans casse.
- [x] **Étape 2 : implémenter, vert ; gardes retirées (`SKIP LOCKED`, borne de tentatives) ⇒ rouge.**
- [x] **Étape 3 : commit.**

### Tâche 6 : Cibles — modèle, prompt K9, agent publié

**Fichiers :** `targets.ts`, `targets.test.ts`, `developer-api/agents.ts` (extraction de `launchAgentRun`), `developer-api/agent-format.test.ts` inchangé.

**Interfaces — produit :** `runTarget(target: EvalTarget, row: { input: string }, ctx: TargetContext, deps: TargetDeps): Promise<TargetResult>` avec `TargetResult = { answer: string; latencyMs: number; usage: { promptTokens; completionTokens }; executionId: string | null }` ; `describeTarget(target, resolved): string` ; `launchAgentRun(target, request?): Promise<{ stream; settleUsage; executionId }>` extrait de `startAgentRun` sans changement de comportement de la passerelle.

- [x] **Étape 1 : tests rouges** : cible `model` → message système facultatif + question, modèle sans préfixe `vllm/` ; cible `prompt` → version épinglée au lancement (pas l'étiquette), variables rendues, une variable manquante ⇒ erreur d'élément claire ; cible `agent` → la sortie du bloc réponse ; erreur du modèle ⇒ `TargetResult` rejeté avec message court ; réponse coupée à 20 000 caractères ; `<think>` jamais dans la réponse.
- [x] **Étape 2 : rouge, implémenter, vert.** Le test K3 existant de la passerelle reste vert.
- [x] **Étape 3 : commit.**

### Tâche 7 : Moteur de campagnes

**Fichiers :** `runner.ts`, `runner.test.ts` (dépôt en mémoire), `interactive-load.ts`.

**Interfaces — produit :** `runCampaign(campaignId: string, deps: RunnerDeps): Promise<'completed' | 'cancelled' | 'interrupted' | 'failed'>` ; `startCampaign(campaignId: string): void` (démarre sans attendre, une seule exécution par campagne et par processus) ; `resumeCampaigns(now: Date): Promise<string[]>` (appelé par le cron). `RunnerDeps = { store, runTarget, runJudge, checkBudget, interactiveBusy, now, sleep, globalLimit }`.

- [x] **Étape 1 : tests rouges** : concurrence 2 ⇒ jamais plus de 2 éléments en vol (30 éléments) ; limite globale partagée entre deux campagnes ; annulation en cours ⇒ plus aucun élément démarré, statut `cancelled`, signal d'annulation transmis aux cibles ; redémarrage simulé (bail expiré) ⇒ éléments repris sans doublon, 3 tentatives max ; budget atteint ⇒ `interrupted` avec message, éléments restants `pending` ; erreur d'une cible ⇒ élément `error`, la campagne continue ; erreur du juge ⇒ verdict `error` ; priorité : tant qu'une exécution interactive est en cours, un nouvel élément attend (au plus 30 s, horloge simulée) puis part ; clôture : statut `completed`, alertes calculées une fois.
- [x] **Étape 2 : rouge, implémenter, vert ; gardes retirées (borne de concurrence, bail, attente bornée) ⇒ rouge.**
- [x] **Étape 3 : commit.**

### Tâche 8 : Alertes et planification

**Fichiers :** `alerts.ts`, `schedule.ts`, tests, `app/api/cron/run-nexora-evaluations/route.ts` (+ test), `docker/crontab`, `helm/sim/values.yaml`.

**Produit :** `raiseCampaignAlerts(campaign, summaries, deps): Promise<AlertRecord[]>` (une alerte par cible sous le seuil, une seule par campagne et cible ; e-mail aux administrateurs de l'instance et au créateur seulement si `hasEmailService()`) ; `nextRun(cron: string, timezone: string, after: Date): Date | null` ; `runDueSchedules(now: Date, deps): Promise<{ started: string[] }>` ; route cron `GET` (auth `verifyCronAuth`, `?asOf=` accepté uniquement avec l'authentification cron, pour les essais).

- [x] **Étape 1 : tests rouges** : taux 0,66 sous un seuil 0,8 ⇒ une alerte par cible fautive ; taux = seuil ⇒ pas d'alerte ; aucune évaluation réussie (tout en erreur) ⇒ alerte « campagne en échec » ; pas de SMTP ⇒ alerte enregistrée sans e-mail ; échéance `0 3 * * *` Europe/Paris autour du passage à l'heure d'été ; échéance déjà passée plusieurs fois ⇒ une seule campagne (pas de rattrapage multiple) ; cron : sans secret ⇒ 401.
- [x] **Étape 2 : rouge, implémenter, vert ; `check:cron-parity` vert.**
- [x] **Étape 3 : commit.**

### Tâche 9 : Cas d'usage, contrats et routes

**Fichiers :** `application/operations.ts`, `application/use-cases.ts` (+ `use-cases.test.ts`), `lib/api/contracts/nexora-evaluations.ts`, `app/api/nexora/evaluations/**/route.ts`, `surface.ts`, audit.

**Produit :** opérations `nexora_evaluations.{datasets,judges,campaigns,schedules,alerts}.*` (lecture : `read` ; création, lancement, annulation, suppression : `write` ; clés d'espace refusées) ; routes listées dans la carte ; erreur 404 pour toute ressource d'un autre espace ; import de conversation limité aux conversations du demandeur ; import de traces limité à `canReadTrace` et, pour une trace privée, à son auteur.

- [x] **Étape 1 : tests rouges** : membre en lecture ne lance pas (403) ; jeu d'un autre espace ⇒ 404 ; conversation d'un autre membre ⇒ 404 ; trace privée d'un autre auteur ⇒ refusée ; campagne dont les cibles dépassent 5 000 éléments ⇒ 400 en français ; agent non publié ⇒ 400 ; juge regex invalide ⇒ 400 ; audit émis au lancement et à l'annulation.
- [x] **Étape 2 : rouge, implémenter, vert ; `check:api-validation:strict`.**
- [x] **Étape 3 : commit.**

### Tâche 10 : Interface

**Fichiers :** `app/workspace/[workspaceId]/evaluations/**`, `hooks/queries/nexora-evaluations.ts`, `messages/{fr,en}/evaluations.json`, `i18n/messages.ts`, `sidebar.tsx`, `i18n-covered-dirs.txt`.

- [ ] **Étape 1 : crochets React Query** (clés hiérarchiques, `signal`, invalidation).
- [ ] **Étape 2 : page** `evaluations` : bandeau d'alertes (accusé de réception), onglets Campagnes / Jeux de tests / Juges / Planifications (nuqs `onglet`), listes et fenêtres de création ; rafraîchissement automatique des campagnes en cours.
- [ ] **Étape 3 : pages** jeu de tests (lignes, ajout, annotations) et campagne (progression, tableau de synthèse par cible, matrice lignes × cibles, annulation, bouton « Comparer ») ; page de comparaison `evaluations/comparer`.
- [ ] **Étape 4 : fenêtres** import d'un jeu (fichier CSV/JSONL, table, traces, conversations avec case d'accord), juge (type, consignes, « Essayer » sur 10 lignes avec accord), campagne (jeu, juge, cibles, concurrence, seuil), planification (cron simple ou expression, fuseau, seuil).
- [ ] **Étape 5 : vérifier** `check-i18n`, `check-brand`, `type-check`, parcours au navigateur (captures `docs/verification/k10-evaluations/`).
- [ ] **Étape 6 : commit.**

### Tâche 11 : Jeu « FAQ tarifs » et preuves réelles

**Fichiers :** `docs/verification/k10-faq/` : `faq-tarifs.jsonl` (30 questions, réponses attendues, consigne de notation, 10 annotations avec réponse candidate, verdict et justification), `prompt-v1.md`, `prompt-v2.md`, `lancer.py` (crée jeu, juge, prompts, campagne ; mesure l'accord ; planification), `rapport.md`.

- [ ] **Étape 1 : écrire le jeu** (grille tarifaire fictive cohérente, 30 questions variées : prix, remises, durées, options, cas limites « non communiqué »).
- [ ] **Étape 2 : campagne réelle** sur pc6 (serveur de développement 127.0.0.1:3217 contre la pile) : `qwen2.5:7b` + prompt v2, GLM 5.3 + prompt v1, GLM 5.3 + prompt v2 ; le tableau de comparaison est affiché ; mesures de durée.
- [ ] **Étape 3 : accord du juge** avec les 10 annotations ≥ 80 % (« Essayer ») ; si en dessous, ajuster les consignes du juge (pas les annotations).
- [ ] **Étape 4 : campagne planifiée** la nuit (`0 3 * * *`, Europe/Paris) déclenchée par le cron avec `asOf` simulé ⇒ alerte sous le seuil (bandeau, e-mail capturé par le Mailpit de pc6 si SMTP essayé).
- [ ] **Étape 5 : commit des preuves.**

### Tâche 12 : Guide, fumée, ledger

**Fichiers :** `docs/guide/evaluations.md`, index des guides, `scripts/smoke.py` (contrôle « Évaluations »), `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md` (section K10).

- [ ] **Étape 1 : guide en français** (jeux, juges, campagnes, lecture des statistiques, comparaison, seuils, planification, limites).
- [ ] **Étape 2 : fumée** : jeu de 3 lignes, juge « contient », campagne sur un modèle, statistiques, comparaison de deux cibles, annulation, alerte d'une planification avec `asOf`.
- [ ] **Étape 3 : ledger** : décisions « Ruling : … — pourquoi — coût si faux », preuves, vérifications à faire après déploiement.
- [ ] **Étape 4 : commit.**

### Tâche 13 : Fusion et vérifications finales

- [ ] `git merge main` (résoudre les conflits).
- [ ] `biome check` sur les fichiers touchés ; `bun run type-check` ; `check:audits` ; `check:test-types` ; `check:api-validation:strict` ; `check:migrations` ; suite complète `LANG=en_US.UTF-8 bun run --cwd workstudio/apps/sim test` ; `check-i18n`, `check-brand`, `check-no-ee`, `check-licenses`.
- [ ] Arrêter le serveur de développement et le Postgres jetable, supprimer `.next/dev`.
- [ ] Commit final sur la branche (sans pousser ni fusionner dans `main`).
