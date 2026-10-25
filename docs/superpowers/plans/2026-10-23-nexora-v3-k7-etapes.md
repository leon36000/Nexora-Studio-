# K7 — Éditeur pour débutants : mode « Étapes » — plan d'implémentation

> **Pour les agents** : sous-compétence requise : `superpowers:executing-plans` (ou `subagent-driven-development`). Les étapes utilisent des cases à cocher (`- [x]`) ; elles sont cochées au fur et à mesure.

**Objectif** : une vue « Étapes » (liste verticale de cartes) pour lire et modifier un workflow sans canevas, avec aller-retour sans perte vers le canevas (« Mode avancé »), un test pas à pas, une barre d'outils triée et 20 modèles PME.

**Architecture** : la vue Étapes n'a **pas de modèle de données propre** : c'est une lecture du workflow vivant (blocs et arêtes du store de l'éditeur). Des fonctions pures (`lib/nexora/steps/`) reconnaissent la forme (une chaîne de blocs du catalogue, avec des conditions à deux branches qui se rejoignent, exactement ce que `compilePlan` produit), calculent les modifications structurelles (ajouter, retirer, déplacer une étape) sous forme de patchs de blocs et d'arêtes, et classent les erreurs d'exécution. Les formulaires de réglage sont ceux de l'éditeur de blocs existant (le panneau `Editor`), rien n'est dupliqué. Quand la forme n'est pas reconnue, la vue est en lecture seule avec un lien vers le canevas, comme le formulaire d'agent (`lib/nexora/agents.ts`).

**Pile** : TypeScript, React 19, Zustand (préférence de mode), next-intl (espace de noms `steps`), Vitest.

**Spec** : `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` (§4, amendement K7) ; `docs/recherche/ecart-mistral-studio-v2.md` §1.6 et §3.2 (K7).

## Contraintes globales

- Pas de code `ee/` d'origine de Sim ; marque Nexora ; chaque chaîne visible passe par next-intl (espace de noms `steps`, fr et en) ; `check-i18n` vert.
- Imports absolus, pas de `any`, pas d'export inutilisé, commentaires rares (le *pourquoi*), `bun` uniquement.
- Éditeur : l'état de vue reste dans Zustand (règle `sim-url-state.md`, carve-out de l'éditeur), pas dans l'URL.
- Pas de migration (0451 réservé, non consommé). Aucune perte de puissance : le canevas reste accessible en un clic et reste le mode de tous les autres workflows.
- Pas de `cd`, pas de `biome --write` sans liste de fichiers ; fichiers temporaires dans `.nexora-work/`.

## Revue ciblée (cas que la spec sous-entend)

1. Workflow sans déclencheur, avec deux déclencheurs, ou avec un bloc inconnu du catalogue : lecture seule, jamais d'écriture. Test : `read.test.ts`.
2. Condition dont une branche est vide, ou dont les deux branches se rejoignent, ou dont une seule branche est reliée (modèle « Compte rendu ») : reconnue et réécrite sans perte. Test : `read.test.ts`, `edit.test.ts`.
3. Supprimer une étape au milieu d'une branche ou la dernière d'une branche : les arêtes se recollent, aucune étape orpheline. Test : `edit.test.ts`.
4. Bloc désactivé, verrouillé ou dans une boucle : forme non reconnue (lecture seule). Test : `read.test.ts`.
5. Erreur d'exécution inconnue : explication générique en français plus le message d'origine, jamais un message vide. Test : `errors.test.ts`.

---

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `workstudio/apps/sim/lib/nexora/steps/catalog.ts` (+ test) | catalogue d'environ 25 étapes métier : type de bloc, catégorie, valeurs initiales, reconnaissance d'un bloc |
| `workstudio/apps/sim/lib/nexora/steps/read.ts` (+ test) | `readSteps(state)` : forme reconnue ou raisons de refus |
| `workstudio/apps/sim/lib/nexora/steps/edit.ts` (+ test) | patchs d'ajout, de retrait, de déplacement ; disposition des positions |
| `workstudio/apps/sim/lib/nexora/steps/mode.ts` (+ test) | marqueur « Étapes par défaut », résolution du mode |
| `workstudio/apps/sim/lib/nexora/steps/errors.ts` (+ test) | explication en clair d'une erreur d'exécution (clé de message) |
| `workstudio/apps/sim/lib/nexora/steps/summary.ts` (+ test) | phrase de résumé d'une carte (clé de message et valeurs) |
| `workstudio/apps/sim/lib/nexora/steps/five-plans.fixtures.ts` | les 5 plans types du Copilote (tests d'aller-retour) |
| `workstudio/apps/sim/stores/workflows/view-mode/store.ts` | préférence de mode par workflow (persistée) |
| `.../w/[workflowId]/components/steps-view/**` | vue Étapes : liste, carte, sélecteur d'étape, test pas à pas, bascule |
| `.../w/[workflowId]/workflow.tsx` | superpose la vue Étapes au canevas, bascule |
| `.../panel/components/toolbar/toolbar.tsx` + `lib/nexora/steps/toolbar-order.ts` | barre d'outils triée |
| `workstudio/apps/sim/lib/nexora/templates.ts` (+ test) | 20 modèles PME |
| `workstudio/apps/sim/lib/nexora/copilot/compile.ts` | pose le marqueur sur le déclencheur |
| `workstudio/apps/sim/messages/{fr,en}/steps.json`, `i18n/messages.ts` | messages |
| `docs/guide/etapes.md`, `docs/guide/README.md` | guide |
| `scripts/smoke.py` | contrôle de fumée « Étapes » |
| `docs/verification/k7-etapes/` | captures et durée du parcours |

---

### Tâche 1 : catalogue d'étapes

**Fichiers** : `lib/nexora/steps/catalog.ts`, `catalog.test.ts`.

**Interfaces** — produit :
`type StepCategory = 'essentiel' | 'donnees' | 'communication' | 'connect' | 'controle'`
`interface CatalogEntry { id: string; blockType: string; category: StepCategory; preset?: Record<string, unknown>; matches?: (subBlocks: Record<string, unknown>) => boolean }`
`STEP_CATALOG: readonly CatalogEntry[]`, `catalogEntryOf(block: {type: string; subBlocks?: unknown}): CatalogEntry | null`, `TRIGGER_BLOCK_TYPES: ReadonlySet<string>`, `isTriggerType(type: string): boolean`.

- [x] Test rouge : chaque entrée a un `id` unique et un `blockType` existant dans le registre (`getBlock`) ; 22 à 28 entrées ; les 6 types du langage du Copilote (agent, condition, api, wait, human_in_the_loop_v2, response) sont présents ; `catalogEntryOf` renvoie l'entrée la plus spécifique (un bloc `api` en POST ⇒ « envoyer des données », sinon « appeler une API »).
- [x] Implémenter le catalogue (essentiels : demander à l'IA, condition, appel d'API, attente, validation humaine, réponse, e-mail, table, action Nexora Connect, connaissances, fonction JavaScript, transcription, synthèse vocale, extraction de document, variables, sous-workflow, recherche web, lecture de fichier, traduction, vision, mémoire, routeur, évaluateur…).
- [x] Test vert, commit.

### Tâche 2 : lecture et forme reconnue

**Fichiers** : `lib/nexora/steps/read.ts`, `read.test.ts`, `five-plans.fixtures.ts`.

**Interfaces** — consomme `catalogEntryOf`, `isTriggerType` ; produit :
`type StepsRefusal = 'no-trigger' | 'several-triggers' | 'unknown-block' | 'disabled-block' | 'locked-block' | 'subflow' | 'extra-edges' | 'unreachable' | 'branch-in-branch'`
`interface StepNode { blockId: string; name: string; entryId: string; branches?: { if: string[]; else: string[] } }`
`type StepsReading = { recognized: true; triggerId: string; main: StepNode[]; branchNodes: Map<string, StepNode> } | { recognized: false; reasons: StepsRefusal[]; order: string[] }`
`readSteps(state: unknown): StepsReading` ; `order` = ordre topologique de repli pour la lecture seule.

- [x] Fixtures : les 5 plans (relance planifiée, tri par webhook avec condition, FAQ en chat avec base de connaissances, compte rendu avec validation puis condition, API puis résumé) validés par `copilotPlanSchema`.
- [x] Tests rouges : les 5 plans compilés par `compilePlan` sont reconnus, `main` suit l'ordre du plan et les branches la membership du plan ; les 5 refus de la revue ciblée ; une arête en trop, un bloc isolé, une boucle (`loops` non vide), un bloc `note`.
- [x] Implémenter : marche depuis le déclencheur selon l'algorithme de `buildGraph` (poignées `source`, `condition-<id>-if|else` ; jonction = premier bloc commun aux deux chaînes) ; toute arête et tout bloc doivent être consommés.
- [x] Tests verts, commit.

### Tâche 3 : modifications structurelles

**Fichiers** : `lib/nexora/steps/edit.ts`, `edit.test.ts`.

**Interfaces** — produit :
`type InsertPoint = { after: string } | { branch: { condition: string; side: 'if' | 'else' } }` (le déclencheur est un `after` valable)
`interface StepsPatch { addBlocks: PatchBlock[]; removeBlockIds: string[]; addEdges: PatchEdge[]; removeEdgeIds: string[]; positions: Record<string, {x: number; y: number}> }`
`planInsert(state, point: InsertPoint, entry: CatalogEntry, ids: {blockId: string; name: string}): StepsPatch`
`planRemove(state, blockId): StepsPatch`
`planMove(state, blockId, direction: 'up' | 'down'): StepsPatch`
`applyPatch(state, patch): state` (pour les tests et l'aperçu)
`layoutPositions(reading): Record<string, {x:number;y:number}>` (colonnes de 420 px, branches à ±260 px, comme `compilePlan`)

- [x] Tests rouges : insérer après chaque position des 5 plans ⇒ nouveau patch relu comme reconnu, une étape de plus, ordre attendu ; retirer chaque étape ⇒ relu reconnu, étape en moins, arêtes recollées ; descendre puis remonter ⇒ état identique à l'original (blocs, sous-blocs, arêtes, positions comprises) ; aucune des étapes non touchées ne change d'un octet (sous-blocs) ; retirer une condition retire ses branches ou les remonte (décision consignée) ; interdire une condition dans une branche.
- [x] Implémenter. Une étape « condition » insérée arrive avec ses deux poignées sans cible.
- [x] Tests verts, commit.

### Tâche 4 : mode, erreurs, résumé

**Fichiers** : `mode.ts`, `errors.ts`, `summary.ts` et leurs tests.

**Interfaces** — produit :
`STEPS_MARKER = { id: 'nexoraView', value: 'etapes' }`, `hasStepsMarker(state): boolean`
`type EditorMode = 'steps' | 'canvas'`, `resolveEditorMode(input: { preference: EditorMode | null; marked: boolean; recognized: boolean }): EditorMode`
`explainStepError(message: string): { key: string; values?: Record<string, string> }` (clés sous `steps.errors.*`)
`summarizeStep(block): { key: string; values: Record<string, string> } | null`

- [x] Tests rouges : préférence explicite « canevas » l'emporte ; « Étapes » sur forme non reconnue ⇒ Étapes (lecture seule) ; sans préférence, marqueur + forme reconnue ⇒ Étapes, sinon canevas ; erreurs : modèle introuvable, clé manquante, délai dépassé, URL refusée par la barrière de sortie, champ obligatoire manquant (« is missing required fields »), 401/403/404/429/5xx d'un appel d'API, référence inconnue, JSON invalide, serveur SMTP vide, budget dépassé (402) ; message inconnu ⇒ clé générique + texte d'origine ; résumé de chaque type du catalogue.
- [x] Implémenter, tests verts, commit.

### Tâche 5 : messages

**Fichiers** : `messages/fr/steps.json`, `messages/en/steps.json`, `i18n/messages.ts`.

- [x] Ajouter l'espace de noms `steps` (catalogue : libellé et description de chaque entrée ; vue, cartes, sélecteur, test pas à pas, erreurs, bascule, barre d'outils) en français puis en anglais ; l'enregistrer dans `MESSAGE_NAMESPACES` et `MESSAGES`.
- [x] Test existant de parité des messages vert ; commit.

### Tâche 6 : préférence de mode et actions

**Fichiers** : `stores/workflows/view-mode/store.ts` (+ `index.ts`), `components/steps-view/hooks/use-steps-actions.ts`.

- [x] Store Zustand `persist` avec `partialize` (modes par identifiant de workflow, 200 entrées au plus) ; `useStepsModel(workflowId)` (dans `components/steps-view/hooks`) renvoie la lecture, les blocs avec leurs valeurs et le mode résolu.
- [x] `useStepsActions` : applique un `StepsPatch` par `collaborativeBatchAddBlocks` / `BatchRemoveBlocks` / `BatchAddEdges` / `BatchRemoveEdges` / `BatchUpdatePositions`, blocs créés par `prepareBlockState` avec les valeurs initiales du catalogue ; sélectionne la nouvelle étape dans le panneau.
- [x] Vérification de type, commit.

### Tâche 7 : vue Étapes

**Fichiers** : `components/steps-view/{steps-view,step-card,step-picker,mode-switch,not-recognized-banner}.tsx`, `index.ts`, `workflow.tsx`.

- [x] Liste verticale : déclencheur, cartes numérotées, branches « Si oui / Sinon » en retrait, bouton « Ajouter une étape » entre les cartes ; carte = icône, libellé métier, phrase de résumé, état de test ; clic ⇒ ouvre l'éditeur de blocs existant (panneau) sur cette étape ; menu : monter, descendre, supprimer.
- [x] Sélecteur d'étapes : catalogue par catégorie, recherche, « Plus de blocs » ouvre la barre d'outils du canevas.
- [x] Bascule « Étapes | Canevas » dans l'en-tête ; la vue est superposée au canevas (qui reste monté) ; forme non reconnue ⇒ cartes en lecture seule, bandeau avec raisons et lien « Ouvrir dans le canevas ».
- [x] Vérification de type, check-i18n, commit.

### Tâche 8 : test pas à pas

**Fichiers** : `components/steps-view/{step-test,sample-data-form}.tsx`.

- [x] Formulaire « Données d'exemple » (champs du déclencheur, valeurs préremplies) ; bouton « Tester » : lance l'exécution existante, affiche par carte l'état (en attente, en cours, réussi, échec), la sortie, la durée ; « Tester jusqu'ici » sur chaque carte (exécution jusqu'au bloc) ; erreurs expliquées par `explainStepError`, message d'origine repliable.
- [x] Vérification de type, commit.

### Tâche 9 : barre d'outils triée

**Fichiers** : `lib/nexora/steps/toolbar-order.ts` (+ test), `toolbar.tsx`.

- [x] Test rouge : `orderToolbarBlocks(items)` met d'abord les essentiels dans l'ordre de la constante `ESSENTIAL_BLOCK_TYPES`, puis les autres blocs par nom ; `groupIntegrations(items)` place « Nexora Connect » (bloc MCP) en tête puis les intégrations directes, repliées par défaut.
- [x] Brancher dans `toolbar.tsx` (sections « Essentiels », « Autres blocs », « Nexora Connect », « Intégrations directes »), messages `steps.toolbar.*`, commit.

### Tâche 10 : marqueur à la création et 20 modèles

**Fichiers** : `copilot/compile.ts`, `compile.test.ts`, `templates.ts`, `templates.test.ts`, `seed-templates.ts`.

- [x] Test rouge : le déclencheur compilé porte le sous-bloc `nexoraView`, l'état passe `parseWorkflowJson`, `readSteps` le reconnaît ; idem pour chaque modèle PME.
- [x] Poser le marqueur dans `compilePlan` et `buildTemplateWorkflow`.
- [x] 20 modèles PME : les 5 existants + 15 nouveaux (offre d'emploi, fiche produit, réseaux sociaux, réclamation, newsletter, relance de devis, rapport hebdomadaire, traduction, résumé de contrat, contrôle de facture, accueil d'un salarié, avis client, ordre du jour, réponse validée avant envoi, compte rendu d'entretien), tous des chaînes linéaires. Adapter `templates.test.ts` : 20 modèles, mêmes garanties (importables, un déclencheur, un agent au moins, exemples non vides, références valides) ; le test « Start → Agent » vise les modèles sans étape spéciale.
- [x] Tests verts, commit.

### Tâche 11 : guide et fumée

- [x] `docs/guide/etapes.md` (parcours « relance des factures impayées », bascule, test pas à pas, limites) + ligne dans `docs/guide/README.md` ; mise à jour de `copilote.md` et `workflows.md` (liens).
- [x] `scripts/smoke.py` : contrôle « Étapes » (création par le Copilote ⇒ marqueur et forme lisible en Étapes ⇒ modification d'une étape par l'état ⇒ retour au canevas ⇒ exécution) ; contrôle que l'espace contient les 20 modèles.
- [x] Commit.

### Tâche 12 : parcours au navigateur

- [x] `next dev` sur 127.0.0.1:3221 contre la pile par IP de conteneur ; compte de test ; créer « relance des factures impayées » en mode Étapes sans quitter la vue ; captures et durée dans `docs/verification/k7-etapes/` ; arrêter `next dev`, supprimer `.next/dev`.

### Tâche 13 : fin

- [x] `git merge main`, vérifications (biome sur les fichiers, type-check, audits, test-types, api-validation, suite complète, scripts de contrôle à la racine), ledger (section K7 : décisions « Ruling », preuves), commit.

## Auto-revue

- Couverture : vue Étapes (T7), aller-retour (T2–T3, T7), test pas à pas (T8), barre d'outils (T9), 20 modèles (T10), mode par défaut (T4, T6, T10), i18n (T5), guide et fumée (T11), parcours (T12). Aucun trou.
- Les noms (`readSteps`, `planInsert`, `StepsPatch`, `resolveEditorMode`) sont identiques entre les tâches.

## Écarts par rapport au plan (constatés en route)

- Les tests des 5 workflows réels (`real-five.test.ts`, états de `copilote-cinq.py` gardés dans `lib/nexora/steps/copilote-cinq/`) s'ajoutent aux 5 plans simulés de `five-plans.fixtures.ts`.
- Le test pas à pas lit l'état de chaque carte dans la console de l'éditeur ; une erreur de validation avant lancement n'appartient à aucune carte et s'affiche dans un bandeau en tête (`error-explanation.tsx`).
- Les lignes du sélecteur d'étapes n'affichent que le libellé ; la description est l'infobulle de la ligne.
- Les décisions et leur coût sont dans le ledger, section K7.
