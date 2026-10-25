# K8 « Traces et observabilité » — plan d'exécution

> **Pour les agents :** sous-compétence requise : superpowers:executing-plans (exécution par l'agent lui-même, TDD : test rouge d'abord, garde retirée ⇒ rouge). Les étapes se cochent (`- [x]`) au fil de l'eau.

**But :** chaque appel de modèle de l'instance (Playground, agents, Assistant, Copilote, « Générer avec l'IA », workflows, appels directs par une clé K3) devient une **trace** — un arbre de spans (modèle, outil, connaissances, délégation) avec entrées, sorties, jetons, durée et CO₂ — lisible dans un écran **Traces**, masquée avant stockage, conservée 30 jours par défaut, exportable en OTLP.

**Architecture :** un collecteur unique `lib/nexora/traces/` reçoit des brouillons de trace normalisés ; trois adaptateurs les produisent (journal d'exécution de Sim pour agents/Assistant/workflows/agents K3 ; appel direct de `wand.ts` pour Playground/Copilote/« Générer » ; relais K3 pour les modèles appelés par clé). Le collecteur masque (TypeScript pur), plafonne, calcule le CO₂, écrit dans PostgreSQL (deux tables, indexées), puis exporte en OTLP/HTTP JSON si l'administrateur l'a réglé. Lecture par opérations d'application protégées ; visibilité à deux niveaux (espace / privé).

**Stack :** Next.js, Drizzle/PostgreSQL, next-intl, React Query, nuqs, emcn ; aucune nouvelle dépendance.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` §3 (matériel 8 cœurs / 32 Go ⇒ traces dans PostgreSQL, export OTLP facultatif, pas de ClickHouse) ; analyse d'écart `docs/recherche/ecart-mistral-studio-v2.md` §3.2 K8 (« Terminé quand », contraignant) et matrice §1.7 ; Mistral Observability `docs/recherche/mistral-studio/14-observabilite-evaluations.md` (modes de masquage `default`/`strict`/`none`, langage de filtres, champs d'une trace).

## Contraintes globales

- Aucun code `ee/` d'origine ; tout texte visible passe par next-intl (nouvel espace de noms `traces`, fr + en) ; marque Nexora ; `check-i18n`, `check-brand`, `check-no-ee`, `check-licenses` verts.
- Ajouts dans `lib/nexora/traces/`, `app/api/nexora/traces/`, `app/workspace/[workspaceId]/traces/` ; seuls points d'accroche dans le cœur de Sim : `lib/logs/execution/logger.ts` (un appel après la complétion), `lib/nexora/wand.ts`, relais K3, barre latérale.
- Migration **0444** (K9 prend 0442, K5 0443 dans leurs branches) : tables neuves seulement ⇒ sûre selon `db-migrate`.
- Le masquage ne dépend d'aucun service (le service PII local est le jalon K14) et s'applique **avant** tout stockage et tout export.
- Une trace ne doit jamais ralentir ni faire échouer l'appel qu'elle décrit : l'enregistrement est asynchrone, ses erreurs sont journalisées, jamais propagées.
- Aucun secret (en-têtes de l'export, clés) dans les journaux, l'audit, les réponses d'API.
- Pas de `cd` dans les commandes ; travail dans le worktree ; essais sur un `next dev` à moi (127.0.0.1:3216) et un Postgres jetable.

## Décisions (prises pour le fondateur) et leur coût

Consignées aussi dans le ledger (section K8).

| # | Décision | Pourquoi | Coût si faux |
|---|---|---|---|
| D1 | **Tables indexées, non partitionnées** : `nexora_trace` (une ligne par trace, filtres) et `nexora_trace_span` (une ligne par span, en cascade). Index `(workspace_id, started_at desc)`, `(started_at)` pour la purge, `(user_id, …)`, `(api_key_id, …)`, `(execution_id)` unique. Purge par lots de 5 000. | Charge visée : une PME sur 8 cœurs / 32 Go, 30 jours ⇒ quelques centaines de milliers de traces ; les index couvrent tous les filtres, la purge par lots ne bloque pas. Le partitionnement déclaratif impose une clé de partition dans la clé primaire, des FK impossibles et un entretien de partitions que Drizzle ne décrit pas. | Au-delà d'environ 50 millions de spans, il faudra partitionner par mois (migration de rattrapage) ; le schéma et l'API n'en dépendent pas. |
| D2 | **Journal d'exécution = source des agents, de l'Assistant, des workflows et des agents K3** (un appel après `completeWorkflowExecution`), pas une seconde instrumentation du fournisseur. | Les spans modèle/outil/connaissances/sous-workflow, les jetons et les coûts y sont déjà, protégés des secrets ; un seul point ⇒ aucune source oubliée. | Une trace n'existe qu'à la fin de l'exécution (pas d'affichage en cours) ; un run tué sans complétion n'en a pas (le journal le marque déjà échoué). |
| D3 | **Visibilité** : `workspace` (tout membre de l'espace) ou `private` (Assistant — chats réservés aux membres —, Playground, Copilote, « Générer » : seuls leur auteur et les administrateurs de l'espace). Traces sans espace (clé d'instance) : administrateurs de l'instance. Un trace refusée répond 404 comme une absente. | Règle J6 déjà appliquée aux journaux ; les essais personnels (Playground) sont de même nature qu'un chat privé. | Un administrateur lit les essais de ses membres (voulu, comme pour l'Assistant). |
| D4 | **Masquage** : modes `standard` (défaut : e-mail, IBAN valide mod 97, téléphone, carte Luhn, secrets `sk-…`/`Bearer`/JWT, valeurs de clés nommées `password`, `authorization`, `apiKey`…), `strict` (aucun contenu stocké : seulement noms, durées, jetons, statut), `none`. Remplacement par `[E-MAIL]`, `[IBAN]`, `[TÉLÉPHONE]`, `[CARTE]`, `[SECRET]`. | Calqué sur Mistral (`default`/`strict`/`none`), défaut protecteur, sans service. Best-effort : le guide le dit. | Un nom ou une adresse postale reste lisible (K14 : service PII). |
| D5 | **Rétention** : 30 jours par défaut (1 à 365), purge horaire par le cron existant (`/api/cron/purge-nexora-traces`) ; « Purger maintenant » par un administrateur (`asOf` facultatif pour les tests, portée espace facultative) ; **rétention des conversations** de l'Assistant séparée (aucune par défaut — on ne détruit pas l'historique des gens sans qu'un administrateur le décide). | Critère « horloge simulée » vérifiable de bout en bout ; pas de perte de données surprise. | Un client qui veut 90 jours de conversations le règle (une minute). |
| D6 | **Export OTLP/HTTP JSON** vers l'URL complète des traces d'un collecteur (Langfuse `/api/public/otel/v1/traces`, Phoenix `/v1/traces`, Grafana/Alloy), en-têtes chiffrés au repos (jamais renvoyés), convention `gen_ai.*` + `input.value`/`output.value` + `nexora.*`, **contenu déjà masqué**, un essai de plus, sans file d'attente persistante. Adresses privées autorisées (collecteur interne), l'administrateur décide. | Spec : export facultatif. Pas de dépendance (JSON à la main). | Un collecteur injoignable perd les traces de cette période (elles restent dans PostgreSQL) ; le réglage affiche la dernière erreur. |
| D7 | **CO₂ par span modèle** = jetons × intensité mesurée par Nexora API pour ce modèle sur 30 jours (module `consumption/co2.ts`, cache 10 min) ; inconnu ⇒ `null` affiché « — », jamais 0. | Même chiffre que l'écran Consommation, pro rata des jetons. | Modèle hors Nexora API : pas de CO₂. |
| D8 | Texte libre = `ILIKE` sur une colonne `search_text` (8 Ko masqués) bornée par espace et période ; pas de `pg_trgm`. | Aucune extension ; la période (30 j) borne le balayage. | Recherche lente au-delà de ~1 million de traces par espace ⇒ trigramme en rattrapage. |
| D9 | Contenus plafonnés : 8 000 caractères par entrée/sortie de span, 500 spans par trace (`truncated` signalé). | Borne le stockage et l'export. | Une trace géante est coupée, marquée « tronquée ». |
| D10 | Page d'espace `/workspace/<id>/traces` (entrée de barre latérale) et réglages dans une fenêtre « Réglages des traces » (administrateurs de l'instance), comme K3 pour « Développeurs ». | Évite le registre des Réglages ; accès en un clic. | Rien. |
| D11 | Les appels directs par clé K3 aux **modèles** sont tracés par le relais ; les **agents** appelés par clé le sont par le journal d'exécution, la clé étant rattachée par un indice en mémoire (`run-origin`, LRU 10 min). | Évite deux traces pour un appel d'agent. | Si la complétion a lieu hors du processus de la requête, la trace n'a pas la clé (source « API »). |

## Revue (points d'attention)

- Un IBAN, un e-mail, un numéro de téléphone ou de carte saisi dans une question n'apparaît **nulle part** en clair : ni `input`/`output` des spans, ni aperçus, ni `search_text`, ni export OTLP, ni erreur.
- Un faux positif ne casse rien : un numéro de commande de 16 chiffres qui n'est pas une carte (Luhn) reste intact ; un horodatage n'est pas un téléphone.
- Membre B ne lit jamais la trace privée de A (détail, liste, facettes, filtre texte qui retrouverait le contenu) ; un administrateur d'un autre espace non plus.
- Chaque lecture est bornée à l'espace de l'URL ; un identifiant de trace d'un autre espace ⇒ 404.
- Enregistrer une trace échoue (base, réglage illisible) ⇒ l'appel du modèle réussit quand même.
- Rétention : une trace d'exactement la limite est conservée, juste au-delà purgée ; rejouer la purge est sans effet ; deux purges simultanées ne se gênent pas.
- Une complétion rejouée (reprise après pause) ne crée pas de doublon (`execution_id` unique).
- Traces désactivées (`enabled = false`) : rien n'est écrit ni exporté.

---

### Tâche 1 : Schéma et migration 0444

**Fichiers :** `packages/db/schema.ts` (tables `nexoraTrace`, `nexoraTraceSpan`), `packages/db/migrations/0444_nexora_traces.sql` + journal + instantané, maquette de schéma des tests.

- [x] **Étape 1 :** décrire les deux tables et leurs index (D1) ; `drizzle-kit generate`, renommer le fichier, l'entrée du journal et l'instantané en `0444_nexora_traces`.
- [x] **Étape 2 :** relire selon `db-migrate` (tables neuves ⇒ aucune annotation), `bun run scripts/generate-schema-mock.ts`, `check:migrations`, un second `generate` n'écrit rien.
- [x] **Étape 3 :** appliquer la migration sur un Postgres jetable (conteneur lancé et supprimé par moi) et vérifier les index avec `\d`.

### Tâche 2 : Masquage des données personnelles (TDD)

**Fichiers :** `lib/nexora/traces/redaction.ts` (+ `redaction.test.ts`).
**Interfaces :** produit `type RedactionMode = 'standard' | 'strict' | 'none'`, `redactText(text: string, mode: RedactionMode): { text: string; masked: number }`, `redactValue<T>(value: T, mode: RedactionMode): { value: T; masked: number }` (parcourt objets et tableaux ; masque par nom de clé sensible).

- [x] **Étape 1 : tests rouges** — IBAN français avec espaces (`FR76 3000 6000 0112 3456 7890 189`) et sans, IBAN allemand ⇒ `[IBAN]` ; suite de 22 caractères alphanumériques au mod 97 faux ⇒ intacte ; e-mails (dont `+tag`, domaine français) ; téléphones `06 12 34 56 78`, `+33 6 12 34 56 78`, `0033612345678`, `+1 415 555 0100` ; carte `4111 1111 1111 1111` et `4111-1111-1111-1111`, 16 chiffres au Luhn faux ⇒ intacts ; horodatage `1792795162036` et montant `1 234,56 €` intacts ; `sk-nexora-…`, `Bearer eyJ…`, JWT ⇒ `[SECRET]` ; clé `password`/`authorization`/`apiKey` ⇒ valeur `[SECRET]` quel que soit le contenu ; mode `none` ⇒ identique ; mode `strict` pour `redactText` ⇒ masque tout motif comme `standard` ; compteur `masked` exact ; texte vide / non-chaîne ⇒ inchangé ; 200 Ko sans motif en moins de 100 ms (pas d'explosion d'expression régulière).
- [x] **Étape 2 :** implémenter (ordre : secrets, e-mail, IBAN validé, carte validée Luhn, téléphone) ; vert.
- [x] **Étape 3 : garde retirée ⇒ rouge** (validation mod 97, Luhn, masquage par clé), consigné dans le ledger.

### Tâche 3 : Réglages des traces

**Fichiers :** `lib/nexora/traces/settings.ts` (+ test), clé `nexoraTraces` des métadonnées de l'organisation d'instance (comme `nexoraBudgets`, sans migration).
**Interfaces :** `interface TraceSettings { enabled: boolean; retentionDays: number; redaction: RedactionMode; conversationRetentionDays: number | null; otlp: { enabled: boolean; endpoint: string; headers: { name: string; value: string }[] } }` ; `DEFAULT_TRACE_SETTINGS` (`enabled: true`, 30, `standard`, `null`, OTLP éteint) ; `loadTraceSettings(): Promise<TraceSettings>` (cache LRU 30 s, valeurs déchiffrées, repli sur les défauts si illisible) ; `saveTraceSettings(change, actorId)` (valide : rétention 1–365, conversations 1–3650 ou `null`, URL `http(s)`, en-tête vide = valeur conservée, `null` = effacé ; chiffre les valeurs ; invalide le cache) ; `presentTraceSettings(settings)` (valeurs d'en-têtes jamais renvoyées : `hasValue`).

- [x] **Étape 1 : tests rouges** — défauts, rétention 0 / 366 / 1,5 refusées, URL `ftp://` refusée, valeur d'en-tête laissée vide conserve l'ancienne, présentation sans aucune valeur, lecture illisible ⇒ défauts, cache invalidé après sauvegarde.
- [x] **Étape 2 :** implémenter, vert.

### Tâche 4 : Brouillons de trace et adaptateurs de spans (TDD)

**Fichiers :** `lib/nexora/traces/types.ts`, `lib/nexora/traces/from-execution.ts`, `lib/nexora/traces/from-call.ts`, `lib/nexora/traces/caps.ts` (+ tests).
**Interfaces :** produit
`interface TraceDraft { id: string; workspaceId: string | null; userId: string | null; source: 'playground'|'agent'|'assistant'|'copilot'|'wand'|'workflow'|'api_key'; visibility: 'workspace'|'private'; name: string; agentId: string | null; agentName: string | null; apiKeyId: string | null; executionId: string | null; status: 'ok'|'error'; error: string | null; startedAt: Date; durationMs: number; inputTokens: number; outputTokens: number; spans: SpanDraft[] }` ;
`interface SpanDraft { id: string; parentId: string | null; kind: 'model'|'tool'|'knowledge'|'delegation'|'step'; name: string; model: string | null; startedAt: Date; durationMs: number; status: 'ok'|'error'; inputTokens: number; outputTokens: number; input: string | null; output: string | null; attributes: Record<string, unknown> }` ;
`draftFromExecution(input: { executionId: string; workspaceId: string; workflow: { id: string; name: string }; traceSpans: TraceSpan[]; trigger: string; memberChatUserId: string | null; actorUserId: string | null; status: 'ok'|'error'; durationMs: number; startedAt: Date; error: string | null; hint?: RunOriginHint }): TraceDraft` ;
`draftFromCall(input: { source; workspaceId; userId; apiKeyId; name; model; startedAt; durationMs; messages: unknown; answer: string | null; usage: {promptTokens:number;completionTokens:number} | null; error: string | null; reasoning?: string | null }): TraceDraft` (un span modèle racine) ; `capDraft(draft: TraceDraft): TraceDraft` (D9).

- [x] **Étape 1 : tests rouges** sur des arbres de spans réels (relevés dans le journal de pc6, copiés en fixtures) : agent → modèle → outil → modèle ; outil `knowledge_search` ⇒ `knowledge` ; bloc `workflow` ⇒ `delegation` ; boucle/parallèle aplatis sous leur parent ; `errorHandled` n'est pas une erreur ; trace sans span ⇒ un span racine ; `memberChatUserId` ⇒ `assistant`, privée, propriétaire ; déclencheur `chat` sans membre ⇒ `agent`, visible de l'espace ; indice `api_key` ⇒ source et clé ; plafonds (8 000 caractères, 500 spans, `truncated`).
- [x] **Étape 2 :** implémenter, vert.

### Tâche 5 : Collecteur, dépôt et règles de visibilité (TDD)

**Fichiers :** `lib/nexora/traces/record.ts`, `lib/nexora/traces/repository.ts`, `lib/nexora/traces/visibility.ts`, `lib/nexora/traces/co2.ts` (+ tests unitaires et `repository.integration.ts` sur vrai Postgres).
**Interfaces :** `recordTrace(draft: TraceDraft, deps?: RecordDeps): Promise<void>` (ne lève jamais ; `enabled = false` ⇒ rien) ; `insertTrace(row, spans)` idempotent sur `executionId` ; `listTraces(filters, viewer)`, `getTrace(id, viewer)`, `listFacets(workspaceId, viewer)` ; `canReadTrace(viewer: { userId: string; isInstanceAdmin: boolean; workspacePermission: 'read'|'write'|'admin'|null }, trace: { visibility; userId; workspaceId }): boolean` ; `spanCo2(model: string, tokens: number): Promise<number | null>`.

- [x] **Étape 1 : tests rouges** — le collecteur masque un IBAN dans l'entrée, la sortie, l'erreur, `search_text`, l'aperçu et les attributs ; mode `strict` ⇒ aucun contenu ; échec d'insertion ⇒ journalisé, pas de levée ; trace rejouée ⇒ une seule ligne ; `canReadTrace` : privée ⇒ auteur et administrateur de l'espace seulement, membre lecture ⇒ non, administrateur d'un autre espace ⇒ non ; sans espace ⇒ administrateur d'instance seulement.
- [x] **Étape 2 :** implémenter ; intégration : filtres combinés (espace, statut, modèle, agent, clé, durée min/max, période, texte, curseur), tri `started_at desc, id desc`, 10 000 traces insérées ⇒ liste du premier écran en moins de 100 ms (plan d'exécution sur l'index).
- [x] **Étape 3 : garde retirée ⇒ rouge** (masquage appelé, visibilité, idempotence).

### Tâche 6 : Points d'accroche — journal d'exécution et appels directs

**Fichiers :** `lib/logs/execution/logger.ts` (un appel après `emitExecutionCompletedEvent`), `lib/nexora/traces/from-run.ts` (lit le nom du workflow, charge les spans projetés, appelle `recordTrace`), `lib/nexora/traces/run-origin.ts` (LRU, `noteRunOrigin(executionId, hint)` / `takeRunOrigin`), `lib/nexora/developer-api/agents.ts` (note l'origine clé avant l'exécution), `lib/nexora/wand.ts` (option `trace` : contexte `{ source, workspaceId, userId }` ; trace écrite à la fin du flux/de la réponse, flux annulé compris), `app/api/nexora/playground/route.ts`, `app/api/wand/route.ts`, `lib/nexora/copilot/*` (contexte passé), `lib/nexora/developer-api/models.ts` + `sse.ts` (texte de la réponse et fin du flux).

- [x] **Étape 1 : tests rouges** — le logger appelle le collecteur seulement si la complétion est persistée (`completionPersisted`) et jamais en cas d'exception du collecteur ; `wand` : flux terminé ⇒ une trace avec réponse, jetons, durée ; flux coupé par le client ⇒ trace « interrompue » ; rejet 422 ⇒ trace en erreur ; Copilote ⇒ source `copilot` privée ; relais K3 : flux et non-flux ⇒ trace `api_key` avec la clé, sans la valeur de la clé ; refus 401/403 avant l'appel ⇒ aucune trace.
- [x] **Étape 2 :** implémenter, vert ; vérifier que les tests existants du logger, de `wand`, du Playground et du relais K3 restent verts.

### Tâche 7 : API de lecture et opérations protégées

**Fichiers :** `lib/api/contracts/nexora-traces.ts`, `lib/nexora/traces/application/{operations,use-cases}.ts`, `app/api/nexora/traces/{route.ts,surface.ts,[traceId]/route.ts,facets/route.ts}` (+ tests de route).
**Interfaces :** `GET /api/nexora/traces?workspaceId&status&model&agentId&apiKeyId&source&minDurationMs&maxDurationMs&q&from&to&cursor&limit` ⇒ `{ traces: TraceSummary[], nextCursor: string | null }` ; `GET /api/nexora/traces/{traceId}?workspaceId` ⇒ `{ trace, spans }` ; `GET /api/nexora/traces/facets?workspaceId` ⇒ `{ agents, models, apiKeys, sources }`.

- [x] **Étape 1 : tests rouges** — non-membre ⇒ 403 ; trace d'un autre espace ⇒ 404 ; trace privée d'un autre membre ⇒ 404 en détail, absente de la liste et des facettes, absente d'une recherche texte qui retrouverait son contenu ; administrateur de l'espace ⇒ la voit ; paramètres invalides ⇒ 400 ; limite bornée à 100.
- [x] **Étape 2 :** opérations (skill `migrate-application-operation`), contrats (`sim-api-contracts.md`, `check:api-validation:strict`), routes ; vert.

### Tâche 8 : Rétention, purge, réglages d'instance, cron

**Fichiers :** `lib/nexora/traces/purge.ts` (+ test, `purge.integration.ts`), `lib/nexora/traces/application/settings-use-cases.ts`, `app/api/nexora/traces/{settings/route.ts,settings/test-export/route.ts,purge/route.ts}`, `app/api/cron/purge-nexora-traces/route.ts`, `workstudio/docker/crontab`, `workstudio/helm/sim/values.yaml`, rétention des conversations de l'Assistant (`lib/nexora/assistant/repository.ts`).
**Interfaces :** `purgeTraces(opts: { now: Date; retentionDays: number; workspaceId?: string; batchSize?: number }): Promise<{ deleted: number }>` ; `purgeConversations(opts: { now: Date; retentionDays: number }): Promise<{ deleted: number }>` ; `runScheduledPurge(now: Date)` (verrou consultatif ; lit les réglages).

- [x] **Étape 1 : tests rouges (vrai Postgres)** — trace de `now − 1 jour` pile conservée, d'une seconde plus ancienne purgée ; rétention 1 jour + horloge simulée +2 jours ⇒ tout purgé ; portée espace ⇒ les autres espaces intacts ; lots de 2 sur 7 lignes ⇒ 7 supprimées ; rejouée ⇒ 0 ; deux purges simultanées ⇒ pas d'erreur ; spans supprimés en cascade ; conversations : plus ancienne que la limite (dernier message) supprimée avec ses messages, `null` ⇒ rien ; route d'administration : membre ⇒ 403 ; cron sans secret ⇒ 401.
- [x] **Étape 2 :** implémenter ; vert ; ligne `17 * * * *` dans la crontab et `values.yaml`.
- [x] **Étape 3 :** audit des changements de réglages et des purges (sans valeur d'en-tête).

### Tâche 9 : Export OTLP

**Fichiers :** `lib/nexora/traces/otlp.ts` (+ test), appel dans `record.ts`.
**Interfaces :** `buildOtlpPayload(trace: StoredTrace, spans: StoredSpan[]): OtlpTracesPayload` (ids 32/16 hex, temps en nanosecondes, `gen_ai.operation.name`, `gen_ai.request.model`, `gen_ai.usage.*`, `input.value`, `output.value`, `nexora.source`, `nexora.workspace_id`, `nexora.kg_co2eq`, statut) ; `exportTrace(settings, trace, spans, fetchFn?): Promise<{ ok: boolean; status?: number; error?: string }>` ; `lastExportStatus()`.

- [x] **Étape 1 : tests rouges** — charge utile conforme (resourceSpans/scopeSpans/spans, `parentSpanId` vide pour la racine, identifiants hexadécimaux de la bonne longueur) ; en-têtes personnalisés envoyés ; **aucun IBAN en clair dans la charge** ; export éteint ⇒ aucun appel ; collecteur en 500 ⇒ un nouvel essai puis abandon, sans lever ; délai de 5 s.
- [x] **Étape 2 :** implémenter ; vert ; « Tester l'envoi » (route `test-export`) envoie un span de test.

### Tâche 10 : Écran Traces et réglages

**Fichiers :** `app/workspace/[workspaceId]/traces/{page.tsx,traces.tsx,components/{trace-filters,trace-list,trace-detail,span-tree,trace-settings-modal}.tsx}`, `hooks/queries/nexora-traces.ts`, entrée dans `w/components/sidebar/sidebar.tsx`, `messages/{fr,en}/traces.json` (+ déclaration dans le chargeur de messages), tests des utilitaires (arbre, libellés de durée, filtres ↔ URL).

- [ ] **Étape 1 : tests rouges** des fonctions pures : construction de l'arbre depuis `parentId`, durée lisible (« 850 ms », « 12,4 s »), filtres ⇄ paramètres d'URL (nuqs).
- [ ] **Étape 2 :** écran selon `sim-components.md`, `sim-queries.md`, `sim-url-state.md`, `sim-ui-copy.md` : liste (heure, nom, source, modèle, durée, jetons, CO₂, statut), filtres (espace courant, agent, modèle, clé, statut, durée > 1 s / 5 s / 10 s / 30 s, texte, période), détail à droite avec l'arbre de spans et les entrées/sorties masquées, état vide en français, réglages (administrateurs de l'instance : activer, rétention, masquage, conversations, OTLP, essai d'envoi, « Purger maintenant »).
- [ ] **Étape 3 :** parcours au navigateur sur mon `next dev` ; captures dans `docs/verification/k8-traces/`.

### Tâche 11 : Guide, fumée, ledger

**Fichiers :** `docs/guide/traces.md`, `docs/guide/README.md` (lien), `README.md` (ligne), `scripts/smoke.py` (contrôle « Traces »), `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md` (section K8).

- [ ] **Étape 1 :** guide en français (lire une trace, filtres, masquage et ses limites, rétention, export vers Langfuse/Phoenix/Grafana, visibilité des traces privées).
- [ ] **Étape 2 :** contrôle de fumée « Traces » : (a) question à l'Assistant (agent avec base de connaissances) ⇒ la trace apparaît en moins de 5 s avec l'arbre modèle → outil → modèle ; (b) IBAN saisi ⇒ masqué dans le détail ; (c) workflow avec attente de 11 s ⇒ filtre « durée > 10 s » ne rend que lui ; (d) purge avec rétention de 1 jour et horloge simulée ⇒ traces de l'espace supprimées, autres espaces intacts, rétention remise à 30 ; (e) collecteur OTLP de test dans le script ⇒ reçoit les spans d'un appel Playground ; (f) un membre ne voit pas la trace privée d'un autre.
- [ ] **Étape 3 :** ledger : décisions D1–D11, preuves, ce qu'il reste à vérifier après déploiement.

### Tâche 12 : Vérifications et validation

- [ ] **Étape 1 :** biome sur les fichiers touchés ; `bun run type-check` (racine `workstudio/`) ; `check:audits`, `check:test-types`, `check:api-validation:strict`, `check:migrations` ; vitest ciblé et d'intégration ; `check-i18n`, `check-brand`, `check-no-ee`, `check-licenses`.
- [ ] **Étape 2 :** serveur de développement sur la pile de pc6 : fumée « Traces » verte avec GLM 5.3, puis arrêt du serveur et suppression de `.next/dev`.
- [ ] **Étape 3 :** commit sur la branche (message en français, signature Claude), sans pousser ni fusionner.
