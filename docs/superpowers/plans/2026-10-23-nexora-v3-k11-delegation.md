# K11 — Multi-agents (délégation) et compétences : plan d'implémentation

> **Pour l'exécutant :** sous-compétence requise : `superpowers:executing-plans` (ou `subagent-driven-development`). Les étapes utilisent des cases à cocher (`- [x]`) ; cocher au fur et à mesure.

**Objectif :** un agent peut « confier » une demande à un autre agent publié de l'espace (réponse rendue à l'agent principal, ou main passée pour la suite de la conversation), avec limite de profondeur, détection de boucle, visibilité dans l'Assistant et la trace K8 ; les compétences du cœur sont sélectionnables dans le formulaire d'agent et invocables par `@` dans l'Assistant.

**Architecture :** la délégation est un **outil du bloc Agent** (`delegate_to_agent`, un exemplaire par agent appelable, noms de fil uniques attribués par la couche fournisseur) exécuté **dans le processus** par `runWorkflowTool` (le même passage que les workflows-outils : même exécution, même journal, même facturation, version **déployée** de l'agent appelé, ses propres outils, bases, prompt et modèle). Tout le code neuf est dans `lib/nexora/delegation/` ; trois crochets minces dans le cœur : `tools/index.ts` (branche de l'outil), `executor/handlers/agent/handler.ts` (outils ajoutés, passage de main), `lib/workflows/streaming/agent-stream-protocol.ts` (trame `delegation`). Les compétences réutilisent le champ `skills` et l'outil `load_skill` déjà présents dans le bloc Agent.

**Pile :** TypeScript, Vitest, Next.js (app router), React Query, next-intl, Redis (état du passage de main), journaux d'exécution de Sim et traces K8.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md`, § K11 de `docs/recherche/ecart-mistral-studio-v2.md` §3.2 (critères « Terminé quand » contraignants) et matrice §1.3.

## Contraintes globales

- Aucun code `ee/` d'origine de Sim ; ajouts dans `lib/nexora/` ; chaînes visibles via next-intl (`messages/{fr,en}/<zone>.json`), `check-i18n` vert ; marque Nexora ; pas de secret dans Git.
- Chaque test est écrit rouge avant son code ; chaque garde retirée ⇒ test rouge (consigné dans le ledger).
- Migration : **aucune nécessaire** (réglage dans l'état du workflow, passage de main dans Redis, profondeur dans la chaîne d'appels de l'exécution) ; **0452 n'est pas consommé**.
- Profondeur par défaut **3** (niveaux de délégation au-dessous de l'agent racine) ; boucle = agent déjà présent dans la chaîne ; messages en français.
- Ne jamais reconstruire ni redémarrer la pile `nexora` de pc6 ; `next dev` sur 127.0.0.1:3223 avec cache Turbopack sous `/dev/shm`.

## Points de vigilance (Review Focus)

1. Un agent qui se confie à lui-même : refusé comme une boucle (test `guard`).
2. L'agent appelé n'est plus publié (dépublié, archivé) : message clair, l'agent principal continue (test `run`).
3. Le modèle tente de viser un autre agent que ceux configurés (paramètre `agentId` envoyé par le modèle) : ignoré, l'identifiant configuré gagne (test `tool`).
4. Réponse de l'agent appelé avec des renvois `[1]` : les numéros ne se mélangent pas à ceux de l'agent principal (test `answer`).
5. Passage de main vers un agent retiré de « Peut confier à » : la conversation revient à l'agent principal (test `transfer`).
6. Agent dont la forme n'est pas reconnue (édité dans l'éditeur) : formulaire en lecture seule, `handoffs` conservé (test `agents`).

## Fichiers

Créer (dans `workstudio/apps/sim/`)
- `lib/nexora/delegation/guard.ts` : chaîne, profondeur, boucle, messages français, limite de l'instance.
- `lib/nexora/delegation/handoffs.ts` : liste « Peut confier à » ↔ lignes de tableau du bloc Agent.
- `lib/nexora/delegation/tool.ts` : l'outil `delegate_to_agent` d'un agent appelable.
- `lib/nexora/delegation/answer.ts` : renvois `[n]` de l'agent appelé remplacés par les noms de ses sources.
- `lib/nexora/delegation/transfer.ts` : « la main est passée à… » (Redis, sept jours).
- `lib/nexora/delegation/run.ts` : une délégation (contrôles, appel, trames, passage de main), dépendances injectées.
- `lib/nexora/delegation/execute.ts` : branchement de `run.ts` sur l'exécuteur (identité, environnement, version déployée, flux de la personne).
- `lib/nexora/delegation/agent-block.ts` : outils du bloc Agent, tour confié à l'agent appelé.
- `lib/nexora/delegation/targets.ts` : agents publiés de l'espace (lecture en base).
- `lib/nexora/delegation/form-targets.ts` : agents proposés par le formulaire.
- `lib/nexora/skills-mention.ts` : mentions `@compétence`.
- `hooks/queries/nexora-skills.ts` : compétences de l'espace (contrat lu directement : le barrel de contrats alourdit la page de l'Assistant).
- `app/workspace/[workspaceId]/agents/[workflowId]/components/{handoffs-field,skills-field}.tsx`, `app/workspace/[workspaceId]/assistant/components/skill-mention-list.tsx`.
- Tests à côté de chaque fichier (sauf `targets.ts`, une lecture en base couverte par la fumée, et `execute.ts` testé avec l'exécuteur simulé).

Modifier
- `lib/nexora/agents.ts` (+ test) : `AgentConfig.handoffs` et `skills`, aller-retour, comparaison de versions.
- `blocks/blocks/agent.ts`, `executor/handlers/agent/{types,handler}.ts` (+ test) : entrée `handoffs`, outils de délégation, tour confié.
- `tools/index.ts` : branche `delegate_to_agent`.
- `lib/workflows/streaming/agent-stream-protocol.ts` (+ test), `lib/nexora/tool-confirmation/sinks.ts` : trame `delegation`.
- `lib/nexora/traces/from-execution.ts` (+ test) : un appel de l'outil de délégation est un span `delegation`.
- `lib/nexora/agent-extras.ts` (+ test), `assistant/stream-reply.ts` (+ test), `assistant/hooks/use-assistant-turn.ts`, `assistant/components/{message-item,composer}.tsx`, `assistant/assistant.tsx`, `app/(interfaces)/chat/components/message/components/agent-extras.tsx`.
- `agents/[workflowId]/components/{agent-form,selected-list,versions-section}.tsx`, `agents/use-new-agent.ts`, `lib/nexora/assistant/general-agent.ts`, `messages/{fr,en}/{agents,assistant,blocks,interfaces}.json`.
- `deploy/compose.yml`, `deploy/.env.example` (`NEXORA_DELEGATION_MAX_DEPTH`), `docs/guide/agents.md`, `scripts/smoke.py`, ledger.

---

### Tâche 1 : garde — chaîne, profondeur, boucle

- [x] **Test rouge** `guard.test.ts` : `checkDelegation({ chain, current, target, maxDepth, nameOf })` renvoie `{ ok: true }` quand `chain=[A]`, `current=A`, `target=B` ; `{ ok:false, reason:'loop' }` quand la cible est déjà dans la chaîne (`[A,B]`, cible A, message `Boucle de délégation : « A » a déjà été sollicité (A → B → A).`) ; `reason:'self'` quand `target===current` ; `reason:'depth'` quand la chaîne normalisée compte `maxDepth+1` agents (message `Limite de délégation atteinte (3 niveaux)…`) ; une chaîne vide est normalisée en `[current]` ; une chaîne qui ne contient pas `current` y ajoute `current` ; un `maxDepth` hors de 1..10 revient à 3.
- [x] Vérifier le rouge, puis implémenter `guard.ts` (`DEFAULT_MAX_DELEGATION_DEPTH = 3`, `normalizeChain`, `checkDelegation`, `resolveMaxDepth`).
- [x] Vert ; retirer chaque garde (boucle, soi-même, profondeur, normalisation) ⇒ test rouge.

### Tâche 2 : configuration « Peut confier à » et compétences dans l'agent

**Interfaces :** `AgentHandoff = { agentId: string; mode: 'reply' | 'transfer' }` (`delegation/handoffs.ts`) ; `AgentConfig.handoffs: AgentHandoff[]`, `AgentConfig.skills: AgentSkill[]` (`{ skillId, name, description }`) ; sous-bloc `handoffs` (table `Agent` / `Mode`) et `skills` (déjà `skill-input`).

- [x] **Tests rouges** `handoffs.test.ts` (lignes ↔ liste, mode inconnu ⇒ illisible, doublon fusionné, ligne vide ignorée) et dans `agents.test.ts` : aller-retour avec `handoffs` et `skills` ; agent sans ces sous-blocs (enregistré avant K11) ⇒ listes vides ; sous-bloc `handoffs` à la forme inconnue ⇒ `readAgentWorkflow` renvoie `null` ; la comparaison de versions signale `handoffs` et `skills` ; les réglages d'un agent de l'éditeur (compétence ajoutée avec ses métadonnées) sont conservés.
- [x] Implémenter `handoffs.ts`, étendre `agents.ts` (`formSubBlocks`, `readAgentWorkflow`, `STATE_FIELDS`), `general-agent.ts` (listes vides), `use-new-agent.ts`, le bloc Agent (`handoffs`, entrée `inputs`) et `AgentInputs.handoffs`.
- [x] Vert ; garde retirée (forme inconnue ⇒ `null`) ⇒ rouge.

### Tâche 3 : l'outil de délégation et ses réponses

- [x] **Tests rouges** `tool.test.ts` : `buildDelegationTool(target, handoff, parentConversationId)` renvoie `id: 'delegate_to_agent'`, une description qui nomme l'agent et reprend sa description, un paramètre `question` obligatoire, `params` fixes (`agentId`, `mode`, `conversationId`), `modelBlockedParams` contenant ces trois clés ; `answer.test.ts` : `[1]` de la réponse remplacé par « (source : Titre) » avec les sources de l'agent appelé, un numéro sans source supprimé proprement, texte sans renvoi inchangé.
- [x] Implémenter `tool.ts`, `answer.ts`.
- [x] Vert ; garde retirée (`modelBlockedParams`) ⇒ rouge.

### Tâche 4 : exécution (contrôles, appel, trames, passage de main, tour confié)

**Interfaces :** `runDelegation(params, deps) → ToolResponse` ; `deps` : `loadTarget`, `runChild` (= `runWorkflowTool`), `emit`, `transfer`, `maxDepth`.

- [x] **Tests rouges** `run.test.ts` : (a) succès ⇒ sortie `{ agent, answer, mode }`, `childWorkflowId` pour la trace, trames `delegation` début puis fin, enfant lancé avec chaîne normalisée, `isDeployedContext: true` et `conversationId` dérivé ; (b) boucle et profondeur ⇒ `success:false` avec le message français, trame de fin en échec, enfant non lancé ; (c) agent dépublié ⇒ message clair ; (d) mode `transfer` réussi ⇒ état de passage de main écrit ; (e) mode `reply` ⇒ rien écrit ; (f) échec de l'enfant ⇒ `success:false` sans fuite de la pile ; `transfer.test.ts` : lecture/écriture, expiration, agent retiré de la liste ⇒ ignoré.
- [x] Implémenter `run.ts`, `transfer.ts`, `targets.ts`.
- [x] Vert ; gardes retirées (chaîne normalisée, déployé forcé, écriture du passage de main seulement en `transfer`) ⇒ rouge.

### Tâche 5 : crochets dans le cœur

- [x] **Tests rouges** : `handler.test.ts` (outils de délégation ajoutés quand `handoffs` est renseigné et pas sans ; passage de main : la conversation passe à l'agent appelé, retiré ⇒ l'agent principal répond) ; `agent-stream-protocol` (garde de trame `delegation`).
- [x] `tools/index.ts` : branche `delegate_to_agent` après le contrôle des groupes d'accès ; `handler.ts` : outils après `load_skill`, court-circuit avant la résolution du prompt ; protocole et puits : trame `delegation`.
- [x] Vert ; suite ciblée du bloc Agent verte.

### Tâche 6 : trace K8

- [x] **Test rouge** `from-execution.test.ts` : un appel de l'outil de délégation devient un span `delegation` nommé « Délégation → Agent tarifs », entrée = question, sortie = réponse ; un outil ordinaire reste `tool`.
- [x] Implémenter dans `from-execution.ts` ; vert ; garde retirée ⇒ rouge.

### Tâche 7 : formulaire d'agent

- [x] Hook `useDelegationTargets(workspaceId, excludeId)` (agents publiés = flux « Agents » déployés) ; `handoffs-field.tsx` (liste + mode par agent, l'agent lui-même exclu) ; `skills-field.tsx` (compétences de l'espace, intégrées exclues) ; messages `agents.editor.*` fr/en ; `check-i18n`.
- [x] Vérification au navigateur (tâche 10).

### Tâche 8 : Assistant (affichage et `@`)

- [x] **Tests rouges** : `agent-extras.test.ts` (`delegations` conservées et relues dans le commentaire final, ancien format lu sans), `stream-reply.test.ts` (trames `delegation` ⇒ `onDelegation`, résultat avec `delegations`), `skills-mention.test.ts` (`@ton-entreprise` reconnu, e-mail `a@b.fr` ignoré, compétence inconnue ignorée, instructions ajoutées à l'entrée envoyée au fil sans toucher au texte conservé).
- [x] Implémenter `skills-mention.ts`, `agent-extras.ts`, `stream-reply.ts`, `use-assistant-turn.ts`, `delegation-notes.tsx`, `skill-mention-list.tsx`, `composer.tsx` ; messages `assistant.*`.
- [x] Vert ; vérification au navigateur (tâche 10).

### Tâche 9 : guide, fumée, ledger

- [x] `docs/guide/agents.md` : « Peut confier à », modes, limite de profondeur, boucle, compétences et `@`, groupes d'accès (`delegate_to_agent`).
- [x] `scripts/smoke.py` : contrôle « Délégation » (agent tarifs avec base, Assistant général qui lui confie, trace, compétence « Ton de l'entreprise », boucle A→B→A).
- [x] Ledger : section K11 avec décisions (« Ruling : … — pourquoi — coût si faux »).

### Tâche 10 : vérification réelle et fin

- [x] `next dev` sur 127.0.0.1:3223 (cache Turbopack sous `/dev/shm`), fumée « Délégation » avec GLM 5.3, parcours au navigateur, arrêt et nettoyage de `.next/dev`.
- [x] `git merge main`, biome sur les fichiers touchés, `type-check`, `check:audits`, `check:test-types`, `check:api-validation:strict`, `check:migrations`, suite complète, scripts racine ; commit.
