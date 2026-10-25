# K6 — Assistant étendu (équivalent de Vibe Work) — plan d'implémentation

> **Pour les agents :** exécuter tâche par tâche (superpowers:executing-plans), TDD (test rouge d'abord, garde retirée ⇒ rouge), cases à cocher au fur et à mesure.

**But :** l'Assistant lance des workflows publiés par formulaire, agit avec les boîtes personnelles de chacun, crée des tâches planifiées depuis la conversation, partage consignes et fichiers dans des projets, invoque des compétences par `@`, cherche sur le web si l'administrateur l'a permis, et renvoie les rédacteurs vers l'éditeur.

**Architecture :** tout vit dans `lib/nexora/assistant/**`, `lib/nexora/personal-connect*.ts`, des routes `app/api/nexora/assistant/**` et des composants de la page Assistant ; une seule migration (0451) ; le cœur de Sim n'est touché qu'en trois points minces : le chat (`app/api/chat/[identifier]/route.ts` : préparation de l'entrée + registre de l'exécution), l'exécution MCP interne (`lib/internal/mcp/execute-tool.ts` + `lib/mcp/application/execute-tool.ts` : jeton personnel) et le fork de Nexora Connect (`u-` réservé). Aucun fichier d'agent (`executor/handlers/agent/**`, formulaire d'agent) : K11 y travaille.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` ; contenu et « Terminé quand » : `docs/recherche/ecart-mistral-studio-v2.md` §3.2 K6 et matrice §1.15 ; Vibe Work : `docs/recherche/mistral-studio/22-vibe-work-le-chat.md`.

## Contraintes globales

- Pas de code `ee/` d'origine ; français via next-intl (`messages/{fr,en}/assistant.json`), marque Nexora ; `check-i18n`, `check-brand`, `check-no-ee`, `check-licenses` verts.
- Migration `0451` : `when` supérieur à celui de la dernière entrée du journal de `main` (0449 : 1792909013787) ; additive seulement (`-- migration-safe`).
- Une conversation, un projet, une tâche, une connexion personnelle : visibles de leur auteur seul ; autrui ⇒ **404** avant toute autorisation d'espace.
- **Jamais** de jeton personnel dans une réponse d'API, un journal, une trace, une erreur ou une page ; chiffré au repos (`encryptSecret`).
- Les ajouts restent dans `lib/nexora/` et les pages Nexora ; opérations d'application selon `migrate-application-operation`, routes `defineInternalJsonRoute`, contrats `lib/api/contracts/nexora-assistant*.ts`.

## Revue — cas qui piquent

- Un membre A envoie l'identifiant de conversation de B au chat ⇒ aucun projet, aucune compétence ni jeton de B (test dans `prepare-input` et `acting-member`).
- Un autre membre lance à la main une tâche planifiée de A ⇒ jamais le jeton de A (test dans `acting-member`).
- Connect injoignable pendant un appel personnel ⇒ repli **fermé** : l'outil échoue, jamais sur la connexion d'espace d'un service que la personne a connecté seule.
- Fichier de projet illisible, binaire ou trop gros ⇒ refusé avec une raison, rien n'est stocké.
- Désactiver / supprimer une tâche déjà supprimée dans l'éditeur ⇒ 404 propre, pas d'erreur 500.

## Fichiers

| Fichier | Rôle |
|---|---|
| `packages/db/schema.ts`, `migrations/0451_nexora_assistant_extended.sql`, `meta/_journal.json`, `meta/0451_snapshot.json` | tables et colonnes |
| `services/nexora-connect/src/core/action-policy.ts` (+ test) | `u-` réservé aux jetons limités |
| `lib/nexora/connect-admin.ts` | connexions et jetons personnels côté Connect |
| `lib/nexora/personal-connect.ts` | grant, jeton chiffré, synchro à l'usage |
| `lib/nexora/acting-member.ts` | qui agit (registre d'exécution, tâche planifiée) |
| `lib/nexora/assistant/projects.ts`, `skills.ts`, `prepare-input.ts`, `tasks.ts`, `workflows.ts`, `web-search.ts` | cas d'usage |
| `lib/api/contracts/nexora-assistant-extended.ts`, `app/api/nexora/assistant/{connections,projects,skills,tasks,workflows}/**` | surface HTTP |
| `hooks/queries/nexora-assistant-extended.ts`, `app/workspace/[workspaceId]/assistant/components/{projects,connections,tasks,workflow-launcher,skill-picker}*.tsx` | interface |
| `docs/guide/assistant.md`, `scripts/smoke.py`, ledger | guide, fumée, décisions |

---

### Task 1 : migration 0451 et schéma

**Fichiers :** `packages/db/schema.ts`, migration 0451, `_journal.json`, simulacre de schéma (`check:schema-mock`).

**Interfaces — produit :** tables `nexoraAssistantProject` (id, workspaceId, userId, name, instructions, version, createdAt, updatedAt), `nexoraAssistantProjectFile` (id, projectId, name, type, size, text, createdAt), `nexoraAssistantTask` (id, workspaceId, userId, workflowId, title, schedule, createdAt), `nexoraAssistantWorkflow` (workspaceId, workflowId, publishedBy, publishedAt), `nexoraPersonalConnectToken` (id, userId, workspaceId, tokenId, tokenEncrypted, grantHash, createdAt, updatedAt) ; colonnes `project_id`, `project_version` sur `nexora_assistant_conversation` ; `kind`, `payload` sur `nexora_assistant_message`.

- [x] Écrire la migration (CREATE TABLE + ALTER ADD COLUMN nullable) avec `-- migration-safe`, `when` > 1792909013787.
- [x] `bunx drizzle-kit generate` dans `packages/db` : aucune différence ; `check:schema-mock` ; `check:migrations`.
- [x] Appliquer toutes les migrations sur un Postgres jetable (`pgvector/pgvector:pg17`) ; le supprimer.

### Task 2 : Nexora Connect réserve `u-` aux jetons limités (fork)

**Fichiers :** `services/nexora-connect/src/core/action-policy.ts`, `action-policy.test.ts`.

- [x] Test rouge : un jeton non limité (« partagé ») ne peut pas utiliser une connexion `u-alice` (`connection_not_allowed`), comme pour `ws-` ; un jeton limité qui l'accorde le peut.
- [x] `workspaceConnectionPrefix` devient une liste `["ws-", "u-"]`. Suite de Connect verte, `tsc`.

### Task 3 : connexions et jetons personnels côté Connect (`connect-admin.ts`)

**Interfaces — produit :**
`personalConnectionName(userId): string` (`u-<userId>`) ; `listPersonalConnections(userId, options?)`, `connectPersonalWithCredentials(userId, service, authType, values, options?)`, `startPersonalOAuth(userId, service, options?)`, `disconnectPersonal(userId, service, options?)`, `syncPersonalToken(input: { userId, workspaceId, existingTokenId?: string }, options?) → { tokenId, token?: string, grantHash: string, grantedConnectionIds: string[] }`, `revokePersonalToken(tokenId, options?)`.

- [x] Tests rouges contre le faux Connect existant : le nom est `u-<id>`, la liste ne renvoie que les connexions de la personne, le jeton accorde ses connexions personnelles **plus** celles de l'espace pour les services qu'elle n'a pas connectés (le personnel l'emporte), met à jour la garantie sans recréer le jeton (le secret n'est lu qu'à la création), aucun secret dans les messages d'erreur.
- [x] Implémenter en réutilisant `createClient`.

### Task 4 : jeton personnel d'exécution (`personal-connect.ts`)

**Interfaces — produit :** `resolvePersonalConnectHeaders(input: { workspaceId, userId }): Promise<Record<string, string> | null>` (`null` = la personne n'a aucune connexion personnelle : jeton d'espace, comportement actuel) ; lève `PersonalConnectUnavailableError` quand Connect ne répond pas **et** que la personne a des connexions (repli fermé) ; `markPersonalGrantStale(workspaceId)`.

- [x] Tests rouges : pas de connexion ⇒ `null` ; première utilisation crée le jeton, le chiffre, renvoie `Authorization: Bearer …` ; deuxième utilisation sans changement ne rappelle pas la création ; garantie changée ⇒ mise à jour du même jeton ; Connect injoignable ⇒ erreur (jamais le jeton d'espace) ; le jeton clair n'apparaît dans aucun message d'erreur ni journal.
- [x] Implémenter avec cache LRU (30 s) de la liste de connexions, ligne `nexoraPersonalConnectToken`.

### Task 5 : qui agit (`acting-member.ts`) et injection MCP

**Interfaces — produit :** `registerRunMember(executionId: string, userId: string): () => void` ; `resolveActingMember(input: { executionId?: string; workflowId?: string; workspaceId: string; triggerType?: string; actorUserId?: string }): Promise<string | null>` ; `ExecuteMcpToolInput.memberHeaders?: Record<string,string>`.

- [x] Tests rouges : exécution enregistrée par le chat ⇒ la personne ; tâche planifiée déclenchée par le planificateur (`triggerType: 'schedule'`) ⇒ son propriétaire ; tâche lancée à la main par un autre ⇒ `null` ; exécution inconnue ⇒ `null`.
- [x] Le chat enregistre l'exécution des chats « membres » ; le gestionnaire interne `executeMcpTool` demande les en-têtes quand le serveur est « Nexora Connect », les passe en `memberHeaders` (fusionnés après `extraHeaders`, jamais depuis les arguments du modèle) ; mêmes en-têtes à la reprise après confirmation (`tool-confirmation/resume.ts`).
- [x] Test : un argument de modèle nommé `memberHeaders` ou `Authorization` n'est jamais transmis.

### Task 6 : routes et interface des connexions personnelles

**Opérations :** `nexora.assistant.connections.{list,connect,startOAuth,disconnect}` (rôle `read`, session seule).
**Routes :** `GET|POST /api/nexora/assistant/connections`, `POST …/connections/[service]/oauth`, `DELETE …/connections/[service]`, `GET …/connections/oauth/[requestId]` (poignée signée par personne).

- [x] Tests de route (`app/api/nexora/connectors/personal.test.ts`) : liste limitée à l'appelant, aucune valeur secrète renvoyée, OAuth lié à la personne (autre membre ⇒ 404, gardé vérifiée par mutation), grâce du jeton oubliée après connexion/déconnexion. **Écart au plan** : les routes personnelles sont le périmètre `scope=personal` des routes Connecteurs existantes, pas des routes `assistant/connections`.
- [x] « Mes connexions » : bascule « De l'espace / Mes connexions » de la page Connecteurs (catalogue, fiche, formulaire, OAuth réutilisés) et lien depuis l'Assistant.

### Task 7 : projets

**Opérations :** `nexora.assistant.projects.{list,create,read,update,delete,files.add,files.delete}`. Fichiers : texte extrait (`attachment-text.server`), 10 fichiers et 200 000 caractères au plus par projet, binaire refusé. Conversation : `projectId` choisi à la création.

- [x] Tests rouges : autre membre ⇒ 404 (lecture, mise à jour, suppression, ajout de fichier) ; fichier trop gros / illisible ⇒ refus explicite ; supprimer le projet détache ses conversations (elles restent lisibles) ; modifier consignes/fichiers incrémente `version`.
- [x] Page : sélecteur de projet dans « Nouvelle conversation », panneau Projets (consignes, fichiers).

### Task 8 : préparation de l'entrée du chat (`prepare-input.ts`) — projets et `@compétences`

**Interfaces — produit :** `prepareAssistantInput(input: { workspaceId, userId, conversationId?, text }): Promise<{ text: string; commit(): Promise<void> }>`.

- [x] Tests rouges : conversation d'un projet ⇒ consignes et fichiers placés avant la question à la première question et quand `version` a changé, jamais sinon ; `@nom` d'une compétence de l'espace ⇒ son contenu ajouté (une fois par nom) ; `@inconnu` laissé tel quel ; conversation d'un autre membre ⇒ aucun contexte ; texte du projet plafonné à 16 000 caractères.
- [x] Brancher dans la route du chat pour les chats « membres » seulement ; `commit()` après le flux terminé sans erreur.
- [x] Liste des compétences (lecture seule) : `GET /api/nexora/assistant/skills?workspaceId=` ; sélecteur `@` du compositeur.

### Task 9 : tâches planifiées

**Opérations :** `nexora.assistant.tasks.{plan,create,list,setEnabled,delete,runs}`. `plan` : Copilote `generatePlan` avec le contexte élargi aux services personnels de la personne, déclencheur forcé à une planification ; `create` : `createWorkflowFromPlan` dans le dossier « Tâches planifiées » puis `performFullDeploy` (le planificateur n'exécute que le déployé), ligne `nexoraAssistantTask`.

- [x] Tests rouges : une description sans horaire ⇒ plan refusé (« précisez quand ») ; `create` crée workflow + déploiement + tâche ; `setEnabled(false)` désactive la planification (statut `disabled`), `true` la réactive avec une prochaine échéance ; `delete` archive le workflow et supprime la tâche ; autre membre ⇒ 404 ; une tâche dont le workflow a disparu ⇒ ligne nettoyée à la lecture ; `runs` ne renvoie que des exécutions de ce workflow.
- [x] Détection d'une phrase de planification dans le compositeur (« chaque lundi », « tous les matins à 8 h »…) ⇒ proposition « Planifier cette tâche ? » ; carte de tâche dans le fil et panneau « Tâches planifiées ».
- [x] Contexte du Copilote : `loadCopilotCompileContext(workspaceId, { extraServices })`.

### Task 10 : workflows publiés dans l'Assistant

**Opérations :** `nexora.assistant.workflows.{list,publish,unpublish}` (liste : `read` ; publication : `write`). La liste donne, pour chaque workflow déployé publié, ses champs (`inputFormat` du Start de la version active).

- [x] Tests rouges : `fieldsFromStartBlock` (types texte/nombre/booléen, ordre, champs sans nom ignorés) ; lecteur ne peut pas publier (403) ; workflow non déployé ou archivé absent de la liste ; autre espace ⇒ 404.
- [x] `lib/nexora/assistant/workflow-run.ts` : lecture de la réponse d'exécution ⇒ résultat `{ status, output, error, pause }`, entrée du formulaire, réponse de reprise ; carte enregistrée dans le fil (`kind = 'workflow_run'`) et mise à jour après validation (`PATCH …/messages/[messageId]`).
- [x] Lanceur : choix du workflow, formulaire généré, exécution, carte de résultat avec « Approuver / Refuser » quand le run est en pause.

### Task 11 : recherche web, « Ouvrir dans l'éditeur », réglage administrateur

- [x] `lib/nexora/assistant/web-search.ts` : l'Assistant général reçoit l'outil une fois, à l'ouverture suivante, quand l'instance a le service de recherche (`SEARXNG_URL`) ; marque de révision pour respecter un retrait. **Écart au plan** : pas de réglage d'instance supplémentaire (voir le ledger).
- [x] Lien « Ouvrir dans l'éditeur » dans l'en-tête d'une conversation d'agent, pour les rédacteurs seulement (`canOpenInEditor`, testé).

### Task 12 : guide, fumée, ledger, vérifications

- [x] `docs/guide/assistant.md` (+ renvois dans `connecteurs.md`, `copilote.md`).
- [x] Contrôle de fumée « Assistant étendu » dans `scripts/smoke.py` (deux membres, projet à deux conversations, workflow « Devis client » par formulaire, tâche « tous les matins à 8 h » créée puis tâche à la minute exécutée, cloisonnement 404).
- [x] Ledger : section K6 avec les « Ruling ».
- [ ] Vérifications finales : biome sur les fichiers, `type-check`, `check:audits`, `check:test-types`, `check:api-validation:strict`, `check:migrations`, suite complète, `check-i18n/brand/no-ee/licenses` ; fusion de `main`, commit. *(voir le ledger pour les résultats)*
