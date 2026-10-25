# K9 — Prompts versionnés : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:executing-plans (exécution par la session K9 elle-même, décisions déléguées par le fondateur). Les étapes utilisent des cases à cocher (`- [ ]`).

**But :** un objet **Prompt** par espace, versionné et étiqueté, que les agents publiés lisent à l'exécution : déplacer l'étiquette `production` change leurs réponses sans republier.

**Architecture :** deux tables (`nexora_prompt_version`, immuable ; `nexora_prompt_label`, une ligne par étiquette) autour de `nexora_prompt` ; un domaine `lib/nexora/prompts/` (rendu pur des `{{variables}}`, diff, dépôt, résolution en cache, cas d'usage autorisés) ; deux surfaces (routes internes `/api/nexora/prompts/**` pour l'interface, `/api/v2/prompts/**` pour les clés) qui appellent les mêmes cas d'usage ; le bloc Agent reçoit une référence (`promptId`, `promptLabel`, `promptVariables`) que le gestionnaire résout au début de chaque exécution et qu'il consigne dans sa sortie.

**Technologies :** Next.js 16 (App Router), Drizzle + PostgreSQL, Zod (contrats), React Query, next-intl, `diff` 9.0.0, `lru-cache` 11.5.3, Vitest.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` ; contenu et critères : `docs/recherche/ecart-mistral-studio-v2.md` §3.2 K9 et §1.2 ; référence Mistral : `docs/recherche/mistral-studio/10-conversations-capacites.md` §3.6, `11-demarrage-playground-agents-connecteurs.md` §3.2.3.

## Contraintes globales

- Jamais de code `ee/` d'origine de Sim ; `bash scripts/check-no-ee.sh` vert.
- Tout texte visible passe par next-intl (`messages/{fr,en}/*.json`, le français par défaut, l'anglais au ton de l'original) ; `bash scripts/check-i18n.sh` vert. Marque « Nexora » ; `check-brand.sh` vert.
- Opérations protégées : skill `migrate-application-operation` (opération sémantique unique, cas d'usage `defineAuthorizedWorkspaceUseCase`, adaptateurs sans accès à `@sim/db`). Routes v2 : skill `v2-api-conventions` (enveloppe `{data}` / `{data,nextCursor}` / `{error}`, `.strict()`, `query` déclaré, 404 de dissimulation).
- Migration : skill `db-migrate` ; `bun run check:migrations` vert, `drizzle-kit generate` sans nouveau fichier, `bun run scripts/generate-schema-mock.ts`.
- TDD : chaque comportement a un test rouge avant le code ; retirer la garde ⇒ rouge.
- Formulaire d'agent : seul le champ « Consignes » change (K5 avance en parallèle sur la section outils).
- Ne jamais redémarrer les conteneurs `nexora` ; serveur de développement personnel sur 127.0.0.1:3214 ; fichiers temporaires dans `.nexora-work/`.
- Chaque décision tranchée : ligne « Ruling : … — pourquoi — coût si faux » dans la section K9 du ledger.

## Décisions de conception (reprises dans le ledger)

1. **Partage** : tout prompt appartient à un espace et y est partagé (lecture : rôle Lire ; écriture, nouvelle version, étiquette, suppression : rôle Modifier). Pas de prompt privé.
2. **Nom** : 1 à 100 caractères, unique dans l'espace sans tenir compte de la casse ; l'API v2 accepte l'identifiant **ou** le nom (`GET /api/v2/prompts/support-client?workspaceId=…`).
3. **Versions** : numérotées 1, 2, 3… par prompt, immuables (contenu, variables, note) ; numéro attribué sous verrou de la ligne du prompt.
4. **Étiquettes** : `production` et `test` (liste fermée `PROMPT_LABELS`). La version 1 reçoit les deux à la création ; une nouvelle version n'en reçoit aucune (il faut la promouvoir). Une référence peut aussi viser `latest` (dernière version), jamais stockée comme étiquette.
5. **Variables** : `{{nom}}` (espaces tolérés : `{{ nom }}`), nom `[A-Za-z_][A-Za-z0-9_]*`. Chaque version déclare ses variables : type `text` | `number` | `boolean`, description et valeur par défaut facultatives ; la liste suit le texte (variable ajoutée en `text`, variable disparue retirée). Rendu : valeur fournie, sinon défaut, sinon erreur en français ; un nombre accepte la virgule (`1,5`) ; un booléen accepte `true/false/oui/non/1/0` et s'écrit `oui`/`non`. Le texte d'un prompt ne passe jamais par la résolution des variables d'environnement `{{CLE}}` de Sim : un prompt ne peut pas extraire un secret.
6. **Résolution à l'exécution** : au début de `AgentBlockHandler.execute`, la référence est résolue (étiquette → version → texte rendu) et remplace le contenu du premier message `system` (ou en ajoute un). Cache `lru-cache` : étiquette → version (TTL 30 s, `max` 10 000) invalidé dans le processus à chaque déplacement, nouvelle version ou suppression ; contenu par identifiant de version sans TTL (immuable). La sortie du bloc reçoit `prompt: { id, name, version, label }`, visible dans les journaux (sortie du bloc dans la trace).
7. **Variables et secrets** : une valeur de variable résolue depuis un secret est refusée (même garde que les entrées structurelles du bloc), sinon elle atteindrait le modèle par un chemin que la projection des secrets ne suit pas.
8. **API v2** : `GET /api/v2/prompts` (liste paginée), `POST /api/v2/prompts` (création avec version 1), `GET /api/v2/prompts/{promptId}` (`label` ou `version`, sinon `production`), `POST /api/v2/prompts/{promptId}/versions`. Clés personnelles et clés d'espace (plafond d'écriture des clés d'espace respecté). Le déplacement d'étiquette reste dans l'interface.
9. **Audit** : `prompt.created`, `prompt.version_created`, `prompt.label_moved`, `prompt.deleted` (type de ressource `prompt`), libellés français dans `governance.json`.
10. **Groupes d'accès** : capacité `none` (exemption commentée) ; un interrupteur « Prompts » dans les groupes relève de K14.
11. **Hors périmètre** : Copilote, import d'un workflow dans un autre espace (la référence ne suit pas : erreur claire à l'exécution), étiquettes libres, prompts privés.

## Points de vigilance (non couverts par les tests unitaires d'une tâche)

1. Deux nouvelles versions enregistrées en même temps sur le même prompt ⇒ numéros distincts, aucune erreur 500 (test d'intégration, tâche 2).
2. Un agent publié dont le prompt est supprimé ou dont l'étiquette visée n'existe pas ⇒ l'exécution échoue avec un message français qui nomme le prompt et l'étiquette (test du résolveur, tâche 3).
3. Un nom de prompt déjà pris (casse différente) ⇒ 409 en français, pas 500 (intégration, tâche 2).
4. Un prompt d'un autre espace demandé par identifiant ⇒ 404 (dissimulation) en interne comme en v2 (intégration, tâche 2 ; v2 vérifié en réel, tâche 9).
5. Le formulaire d'agent relit sans perte un agent dont les consignes viennent d'un prompt, et un agent ancien (sans les sous-blocs prompt) reste lisible et inchangé (tests `agents.test.ts`, tâche 6).

---

### Tâche 1 : schéma, migration, audit

**Fichiers :**
- Modifier : `workstudio/packages/db/schema.ts` (après `nexoraApiKeyUsage`)
- Créer : `workstudio/packages/db/migrations/0442_nexora_prompts.sql` (+ `meta/0442_snapshot.json`, `meta/_journal.json`) par `drizzle-kit generate`
- Modifier : `workstudio/packages/testing/src/mocks/schema.mock.ts` (régénéré)
- Modifier : `workstudio/packages/audit/src/types.ts` (actions et type de ressource)
- Modifier : `workstudio/apps/sim/messages/{fr,en}/governance.json` (`auditLogs.actions.prompt.*`)

**Interfaces produites :**
- `nexoraPrompt` (`nexora_prompt`) : `id` text PK, `workspaceId` FK `workspace` cascade non nul, `name` text, `description` text non nul défaut `''`, `createdBy` FK `user` set null, `createdAt`, `updatedAt` ; index unique `nexora_prompt_workspace_name_idx` sur `(workspace_id, lower(name))`.
- `nexoraPromptVersion` (`nexora_prompt_version`) : `id` PK, `promptId` FK cascade, `version` integer, `content` text, `variables` jsonb `PromptVariable[]` défaut `[]`, `note` text défaut `''`, `createdBy` FK set null, `createdAt` ; unique `(prompt_id, version)`.
- `nexoraPromptLabel` (`nexora_prompt_label`) : `promptId` FK cascade, `label` text, `versionId` FK `nexora_prompt_version` cascade, `updatedBy` FK set null, `updatedAt` ; PK `(prompt_id, label)`.
- `AuditAction.PROMPT_CREATED = 'prompt.created'`, `PROMPT_VERSION_CREATED = 'prompt.version_created'`, `PROMPT_LABEL_MOVED = 'prompt.label_moved'`, `PROMPT_DELETED = 'prompt.deleted'` ; `AuditResourceType.PROMPT = 'prompt'`.

- [x] Écrire les tables, `drizzle-kit generate` (nom `nexora_prompts`), relire le SQL (tables neuves : rien à annoter).
- [x] `bun run check:migrations` vert ; deuxième `drizzle-kit generate` : « No schema changes » ; mock régénéré, `check:schema-mock` vert.
- [x] Actions d'audit et libellés français ; `type-check` du paquet audit.

### Tâche 2 : domaine — rendu, diff, dépôt (TDD)

**Fichiers :**
- Créer : `workstudio/apps/sim/lib/nexora/prompts/template.ts` + `template.test.ts`
- Créer : `workstudio/apps/sim/lib/nexora/prompts/diff.ts` + `diff.test.ts`
- Créer : `workstudio/apps/sim/lib/nexora/prompts/repository.ts` + `repository.integration.ts`

**Interfaces produites :**
- `PROMPT_LABELS = ['production', 'test'] as const` ; `type PromptLabel` ; `type PromptSelector = PromptLabel | 'latest'` ; `type PromptVariableType = 'text' | 'number' | 'boolean'` ; `interface PromptVariable { name: string; type: PromptVariableType; description?: string; defaultValue?: string }` (dans `template.ts`).
- `extractVariableNames(content: string): string[]` (ordre d'apparition, sans doublon).
- `reconcileVariables(content: string, declared: PromptVariable[]): PromptVariable[]`.
- `renderPrompt(content: string, variables: PromptVariable[], values: Record<string, unknown>): string` — lève `PromptRenderError` (message français, `variable` nommée).
- `diffPromptContent(before: string, after: string): PromptDiffLine[]` avec `PromptDiffLine = { kind: 'same' | 'added' | 'removed'; text: string }` (`diffLines` de `diff`).
- Dépôt (`repository.ts`) : `insertPromptWithFirstVersion`, `insertPromptVersion` (verrou `FOR UPDATE` sur le prompt, numéro = max + 1), `movePromptLabel`, `listPrompts(workspaceId, { search, limit, cursor })`, `getPromptDetail(workspaceId, idOrName)`, `getPromptVersionBySelector(promptId, selector | version)`, `deletePrompt` ; erreurs `PromptNameTakenError` (409), `PromptNotFoundError`, `PromptVersionNotFoundError`.

- [x] Tests rouges `template.test.ts` : extraction (`{{ a }}`, doublons, noms invalides ignorés), réconciliation, rendu (valeur, défaut, manquante ⇒ erreur nommée, nombre `1,5`, nombre invalide ⇒ erreur, booléen `oui` ⇒ `oui`, `0` ⇒ `non`, valeur `{{CLE}}` insérée telle quelle sans être résolue), texte sans variable inchangé.
- [x] Implémenter `template.ts` ; verts ; retirer chaque garde ⇒ rouge.
- [x] Test rouge puis implémentation de `diff.ts` (lignes ajoutées/retirées/communes).
- [x] Tests d'intégration rouges (Postgres jetable) : création v1 avec étiquettes `production` et `test` ; nom pris en casse différente ⇒ `PromptNameTakenError` ; deux versions concurrentes ⇒ 2 et 3 ; déplacement d'étiquette vers une version d'un autre prompt ⇒ refus ; lecture d'un autre espace ⇒ introuvable ; suppression ⇒ versions et étiquettes supprimées.
- [x] Implémenter `repository.ts` ; verts.

### Tâche 3 : résolution à l'exécution et cache (TDD)

**Fichiers :**
- Créer : `workstudio/apps/sim/lib/nexora/prompts/resolve.ts` + `resolve.test.ts`

**Interfaces produites :**
- `interface PromptReference { promptId: string; selector: PromptSelector; values: Record<string, unknown> }`
- `interface ResolvedPrompt { id: string; name: string; version: number; label: PromptSelector; text: string }`
- `resolvePromptReference(workspaceId: string, reference: PromptReference): Promise<ResolvedPrompt>` — lève `PromptResolutionError` (français : prompt introuvable, étiquette absente, variable).
- `invalidatePromptResolution(promptId: string): void`.

- [x] Tests rouges (lecteur du dépôt injecté par `createPromptResolver({ loadLabel, loadVersion })`) : la deuxième résolution vient du cache (une seule lecture d'étiquette) ; après `invalidatePromptResolution`, la nouvelle version est lue ; étiquette absente ⇒ erreur nommant le prompt et l'étiquette ; prompt supprimé ⇒ erreur ; une lecture en échec n'est pas mise en cache.
- [x] Implémenter ; verts ; retirer l'invalidation ⇒ rouge.

### Tâche 4 : opérations et cas d'usage autorisés

**Fichiers :**
- Créer : `workstudio/apps/sim/lib/nexora/prompts/application/operations.ts`, `use-cases.ts`, `use-cases.test.ts`

**Interfaces produites :**
- `nexoraPromptOperations` : `list` (`nexora_prompts.list`, read), `read` (read), `create` (write), `createVersion` (write), `moveLabel` (write), `delete` (write) ; `principalKinds: ['session', 'personal_api_key', 'workspace_api_key']`, `workspaceApiKey: 'allow'`, `capability: 'none'` (exemption commentée).
- Cas d'usage : `listPromptsUseCase`, `getPromptUseCase` (`{ workspaceId, promptRef, selector? | version? }`), `getPromptDetailUseCase`, `createPromptUseCase`, `createPromptVersionUseCase`, `movePromptLabelUseCase` (sans audit si l'étiquette pointe déjà la version), `deletePromptUseCase` ; chacun invalide le cache de résolution après succès (`afterSuccess`).

- [x] Tests rouges des cas d'usage (principal en lecture seule ⇒ refus d'écriture ; déplacement sans changement ⇒ aucune entrée d'audit ; audit projeté avec le nom du prompt, la version et l'étiquette ; échec de base ⇒ propagé, jamais 404).
- [x] Implémenter ; verts.

### Tâche 5 : routes internes, API v2, sélecteur

**Fichiers :**
- Créer : `workstudio/apps/sim/lib/api/contracts/nexora-prompts.ts`, `workstudio/apps/sim/lib/api/contracts/v2/prompts.ts`
- Créer : `workstudio/apps/sim/app/api/nexora/prompts/route.ts`, `[promptId]/route.ts`, `[promptId]/versions/route.ts`, `[promptId]/labels/route.ts`, `surface.ts`
- Créer : `workstudio/apps/sim/app/api/v2/prompts/route.ts`, `[promptId]/route.ts`, `[promptId]/versions/route.ts`, `utils.ts`
- Modifier : `workstudio/apps/sim/lib/api/contracts/v2/openapi/resources.ts`, `contracts/v2/list-pagination.test.ts`, fichiers générés (`generate:openapi`, `generate:v2-route-table`, `generate:cli-api`, `generate:mcp-operations`, `generate:cli-docs`)
- Modifier : `workstudio/apps/sim/lib/selectors/manifest.ts`, `lib/selectors/server/internal.ts` (sélecteur `workspace.prompts`)
- Créer : `workstudio/apps/sim/hooks/queries/nexora-prompts.ts` (+ `hooks/queries/utils/nexora-prompt-keys.ts` si un module serveur l'importe)

- [ ] Contrats (internes : `{ prompts }`, `{ prompt }` ; v2 : enveloppes) ; `?label` et `?version` exclusifs (400 en anglais nommant les champs, comme le reste de la v2).
- [ ] Routes internes (`defineInternalJsonRoute`, `internalSessionAuth`) et v2 (`defineV2JsonRoute`, `v2ApiKeyAuth`, `createV2ResourceConcealmentPolicy`) ; 409 pour un nom pris.
- [ ] Documentation OpenAPI et fichiers générés ; `check:openapi`, `check:v2-route-table`, `check:cli-api`, `check:mcp-operations`, `check:api-validation:strict` verts.
- [ ] Sélecteur `workspace.prompts` (liste et détail).
- [ ] Hooks React Query (clés hiérarchiques, `staleTime` nommés, invalidation des listes et du détail).

### Tâche 6 : bloc Agent, gestionnaire, formulaire (TDD)

**Fichiers :**
- Modifier : `workstudio/apps/sim/blocks/blocks/agent.ts` (sous-blocs `promptId` combobox `selectorKey: 'workspace.prompts'`, `promptLabel` dropdown `production`/`test`/`latest`, `promptVariables` table `Key`/`Value` ; sortie `prompt`)
- Modifier : `workstudio/apps/sim/messages/{fr,en}/blocks.json`
- Créer : `workstudio/apps/sim/executor/handlers/agent/prompt-reference.ts` + `prompt-reference.test.ts`
- Modifier : `workstudio/apps/sim/executor/handlers/agent/handler.ts` (`execute` enveloppe), `types.ts`
- Modifier : `workstudio/apps/sim/lib/nexora/agents.ts` + `agents.test.ts` (`instructionsPrompt`)
- Modifier : `workstudio/apps/sim/app/workspace/[workspaceId]/agents/[workflowId]/components/agent-form.tsx` (champ Consignes), `versions-section.tsx` (affichage du champ)

**Interfaces :**
- `readPromptReference(inputs: AgentInputs): PromptReference | null` ; `applyResolvedPrompt(inputs: AgentInputs, prompt: ResolvedPrompt): AgentInputs` (remplace le premier message `system`, sinon l'ajoute en tête) ; `withPromptOutput(output, prompt)` (sortie normale et `StreamingExecution`).
- `AgentConfig.instructionsPrompt: { promptId: string; label: PromptSelector; variables: Record<string, string> } | null`.

- [ ] Tests rouges `prompt-reference.test.ts` : référence absente ⇒ entrées inchangées ; présente ⇒ premier `system` remplacé, autres messages intacts ; sans `system` ⇒ ajouté en tête ; table de variables `{cells:{Key,Value}}` lue comme un objet ; sortie en flux reçoit `prompt`.
- [ ] Implémenter, brancher dans `execute` ; garde secrets sur `promptVariables` (refus français) ; verts.
- [ ] Tests rouges `agents.test.ts` : aller-retour `buildAgentWorkflow`/`readAgentWorkflow` avec `instructionsPrompt` ; agent sans sous-blocs prompt ⇒ `instructionsPrompt: null` ; diff de versions signale le changement de prompt.
- [ ] Implémenter `agents.ts` ; champ Consignes du formulaire (bascule « Texte » / « Prompt », choix du prompt, étiquette, valeurs des variables, résumé « Consignes : prompt X @production »).

### Tâche 7 : page Prompts, barre latérale, Playground

**Fichiers :**
- Créer : `workstudio/apps/sim/app/workspace/[workspaceId]/prompts/page.tsx`, `prompts.tsx`, `[promptId]/page.tsx`, `[promptId]/prompt-detail.tsx`, `components/*`
- Modifier : `workstudio/apps/sim/app/workspace/[workspaceId]/w/components/sidebar/sidebar.tsx` (entrée « Prompts » après « Agents »)
- Modifier : `workstudio/apps/sim/app/workspace/[workspaceId]/playground/playground.tsx` (« Enregistrer comme prompt »)
- Modifier : `workstudio/apps/sim/messages/{fr,en}/agents.json` (zone `agents.prompts`), `shell.json` (barre latérale)

- [ ] Liste (nom, description, version en production, mise à jour), « Nouveau prompt » (fenêtre : nom, description, texte, note).
- [ ] Détail : versions (numéro, note, auteur, date, étiquettes), texte et variables de la version choisie, « Nouvelle version » (texte, variables typées, note), « Mettre en production » / « Mettre en test », diff entre deux versions, suppression (rôle Modifier).
- [ ] Playground : « Enregistrer comme prompt » (nom + note) ⇒ page du prompt.
- [ ] Parcours au navigateur sur le serveur de développement.

### Tâche 8 : guide, fumée, ledger

**Fichiers :**
- Créer : `docs/guide/prompts.md` ; modifier `docs/guide/README.md` (lien)
- Modifier : `scripts/smoke.py` (contrôle « Prompts »)
- Modifier : `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md` (section K9)

- [ ] Contrôle « Prompts » : prompt v1 (« réponds par POMME ») et v2 (« … CERISE ») ; agent Start → Agent référencé `@production`, déployé ; exécution déployée ⇒ POMME ; étiquette vers v2 ⇒ CERISE sans redéployer ; retour v1 ⇒ POMME ; sortie `prompt.version` ; diff ; `GET /api/v2/prompts/{id}?label=production` avec une clé d'espace ⇒ v1.
- [ ] Guide et lien ; ledger (Rulings, preuves, à vérifier après déploiement).

### Tâche 9 : vérifications et commit

- [ ] Biome sur les fichiers touchés ; `bun run type-check` (racine `workstudio/`) ; `check:audits` ; `check:test-types` ; `check:api-validation:strict` ; `check:migrations`.
- [ ] Vitest ciblé + intégration (Postgres jetable lancé et supprimé).
- [ ] Réel : `next dev` sur 127.0.0.1:3214 contre la pile ; contrôle « Prompts » de la fumée (`--only Prompts`) avec GLM 5.3 ; arrêt du serveur, suppression de `.next/dev`.
- [ ] À la racine : `check-i18n`, `check-brand`, `check-no-ee`, `check-licenses`.
- [ ] Commit sur la branche (message français, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`), sans pousser.
