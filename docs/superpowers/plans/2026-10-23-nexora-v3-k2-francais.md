# K2 « Français partout » et correctif Next.js — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** plus aucun mot anglais dans l'interface de Nexora WorkStudio (fenêtres de confirmation comprises), garanti par `check-i18n`, et Next.js corrigé de l'avis GHSA-p3m5-59mp-jv5r.

**Architecture:** les paquets partagés (`packages/emcn`, `packages/workflow-renderer`) n'importent jamais `apps/*` : leurs textes par défaut vivent dans un seul fichier de libellés par paquet (anglais, copie d'origine) exposé par un contexte React ; l'application fournit les libellés traduits (next-intl, espace `common`) à la racine. `check-i18n` interdit tout texte en dur ailleurs dans ces paquets et exige que chaque libellé par défaut soit traduit. Les textes des blocs suivent le mécanisme existant `translateBlockConfig` (copie d'affichage), étendu aux phrases du canevas, aux options et au titre par défaut.

**Tech Stack:** Next.js 16.4.x, next-intl, React context, Python 3 (`scripts/lib/check_i18n.py`), Vitest, bun.

**Spec:** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` (§3 Next.js, §4) et `docs/recherche/ecart-mistral-studio-v2.md` §3.2 « K2 » (contraignant).

## Global Constraints

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee.sh` vert.
- Tout texte visible passe par next-intl ; français par défaut ; **les messages anglais restent identiques à la copie d'origine**.
- `packages/*` n'importent jamais `apps/*`.
- Next.js : montée **corrective seulement** (16.4.x) ; correctif `patches/next@<version>.patch` porté à l'identique et vérifié.
- Jamais de commit ni de `--force` ; ne jamais arrêter un processus ou conteneur.
- Fichiers de K1 (`lib/nexora/model-admin.ts`, `wand.ts`, playground, fournisseurs, page Réglages › Modèles et leurs clés) : ne pas toucher. Les `messages/{fr,en}/*.json` partagés : relire puis Edit précis.

## Décisions (rulings)

1. **Défauts d'emcn = contexte de libellés.** `EMCN_DEFAULT_LABELS` (anglais d'origine) dans `packages/emcn/src/components/labels/labels.tsx`, `EmcnLabelsProvider` / `useEmcnLabels()` ; une prop explicite d'un appelant reste prioritaire. Préféré aux props obligatoires (≈40 textes, des centaines d'appelants, et Storybook/tests d'emcn gardent l'anglais d'origine) et à un import de l'application (interdit). Même mécanisme pour `packages/workflow-renderer` (« On error », « Start » des boucles…).
2. **Noms d'instance des blocs** (« Start », « Agent ») : le nom enregistré reste l'identifiant des références (`<start.input>`) ; le canevas et le panneau affichent le titre traduit tant que le nom est celui généré automatiquement (`getDefaultBlockName`, suffixe numérique compris). Un nom choisi par l'utilisateur s'affiche tel quel.
3. **Refus d'un groupe d'accès** (« Editing workflows is not available… ») : la phrase unique `capabilityRefusal()` est écrite dans la langue par défaut de l'instance, comme `FeatureDisabledError` et les e-mails (levée loin de toute requête) ; les tests qui citaient la phrase anglaise utilisent `capabilityRefusal(id)`.
4. **Contenu tiers** (descriptions et actions du catalogue Nexora Connect, données utilisateur, réponses des modèles) n'est pas de l'interface : affiché tel quel avec `lang='en'` quand il vient de Connect. Libellés de champs d'identifiants courants traduits ; l'aide du fournisseur est repliée sous « Aide du fournisseur (en anglais) ».
5. **Journal d'audit** : l'action et le type de ressource sont toujours en français ; la colonne détail montre le nom de la ressource, sinon « — » (la description anglaise stockée reste dans l'export CSV).
6. **Next.js 16.4.2** : plus récente version corrective âgée de plus de 7 jours (règle `minimumReleaseAge` de `bunfig.toml`, qui s'applique aux binaires `@next/swc-*`) ; 16.4.1 corrige l'avis, 16.4.2 n'ajoute que des correctifs ; 16.4.3 (publiée le 23/10) est trop récente.

## Review Focus

- Fenêtre de confirmation sans `dismissLabel` explicite (≈43 pieds « Cancel ») : affiche « Annuler ».
- Combobox sans `emptyMessage` ni `searchPlaceholder` : « Aucune option correspondante », « Rechercher… ».
- Langue anglaise choisie dans Réglages : les libellés d'emcn redeviennent l'anglais d'origine (aucun mélange).
- Bloc renommé « Start » à la main puis remis : seul un nom généré est traduit à l'affichage, les références `<start.…>` restent valides.
- Catalogue Connecteurs : une catégorie écrite de trois façons par Connect donne une seule puce, et le filtre trouve les services des trois orthographes.

---

### Task 1: `check-i18n` vérifie les défauts des composants partagés (rouge)

**Files:** `scripts/lib/check_i18n.py`, `scripts/data/i18n-shared-packages.txt` (nouveau : `workstudio/packages/emcn/src`, `workstudio/packages/workflow-renderer/src`), `scripts/tests/test-check-i18n.sh`.

**Interfaces — Produces:** dans un dossier partagé, tout texte d'interface en dur est refusé (JSX, attributs, propriétés, **valeur par défaut d'un paramètre** `fooLabel = 'Cancel'`, **repli** `?? 'Confirm'`), sauf dans le fichier de libellés marqué `// i18n-defaults: <namespace>` en tête ; chaque clé de ce fichier doit exister dans `workstudio/apps/sim/messages/fr/<namespace>.json` et `en/…` (chemin pointé, ex. `common.emcn`).

- [x] Tests shell (rouges d'abord) : « default label parameter in a shared package fails », « fallback string in a shared package fails », « aria-label in a shared package fails », « labels file with every key translated passes », « labels file with a key missing from fr messages fails », « TSDoc examples pass ».
- [x] `bash scripts/tests/test-check-i18n.sh` rouge puis vert.
- [x] `bash scripts/check-i18n.sh` sur l'arbre actuel : **rouge** (chip-modal `Cancel`, combobox `No matching options found`, progress-item, « On error »…), sortie consignée.

### Task 2: libellés d'emcn

**Files:** `packages/emcn/src/components/labels/labels.tsx` (nouveau), `packages/emcn/src/components/index.ts`, tous les composants d'emcn relevés par Task 1, `packages/emcn/src/components/labels/labels.test.tsx`.

**Interfaces — Produces:** `EMCN_DEFAULT_LABELS` (`as const`, clés camelCase), `type EmcnLabels = { [K in keyof typeof EMCN_DEFAULT_LABELS]: string }`, `EmcnLabelsProvider({ labels?: Partial<EmcnLabels>, children })`, `useEmcnLabels(): EmcnLabels`, `formatEmcnLabel(template, values)` pour `{name}`.

- [x] Test DOM rouge : `ChipConfirmModal` sans `dismissLabel` dans `EmcnLabelsProvider labels={{ cancel: 'Annuler' }}` affiche « Annuler » ; sans fournisseur, « Cancel » ; une prop explicite gagne.
- [x] Remplacer chaque défaut par `useEmcnLabels()` ; vert ; `bun run --cwd packages/emcn test`, `type-check`.

### Task 3: libellés de workflow-renderer

**Files:** `packages/workflow-renderer/src/labels.tsx` (nouveau, `WORKFLOW_RENDERER_DEFAULT_LABELS`, `WorkflowRendererLabelsProvider`, `useWorkflowRendererLabels`), `index.ts`, composants relevés.
- [x] Même cycle que Task 2 (test : « On error » remplacé par le libellé fourni).

### Task 4: l'application fournit les libellés

**Files:** `apps/sim/app/_shell/providers/shared-labels-provider.tsx` (nouveau, `SharedLabelsProvider`, lit `useMessages().common`), `apps/sim/app/layout.tsx`, `apps/sim/messages/{fr,en}/common.json` (`emcn`, `workflowRenderer` ; en = copie exacte des défauts).
- [x] `check-i18n` vert pour les paquets partagés ; `i18n/messages.test.ts` vert.

### Task 5: blocs (canevas, paramètres, noms d'instance)

**Files:** `apps/sim/lib/i18n/blocks.ts` (+ test), `hooks/use-translated-block-config.ts`, `workflow-block.tsx`, aperçu `preview-workflow/.../block.tsx`, `messages/{fr,en}/blocks.json`, `lib/i18n/blocks-coverage.test.ts`.

**Interfaces — Produces:** clés `blocks.<type>.sentences.<default|opId>.<i>` (texte de la clause i) et `.<i>_after`, `blocks.<type>.subBlocks.<id>.canvasNoun`, `blocks.<type>.subBlocks.<id>.options.<optionId>`, `blocks.<type>.defaultTitle` ; `displayBlockName(storedName, rawConfig, translatedConfig): string`.
- [x] Tests rouges : phrase d'Agent traduite (« Interroger … avec … »), options statiques traduites, titre par défaut affiché pour « Start » / « Agent 2 », nom personnalisé inchangé ; couverture : les blocs cœur ont leurs phrases traduites, les 30 blocs d'intégration retenus ont tous leurs titres de paramètres visibles traduits.
- [x] Canevas et aperçu utilisent la configuration traduite ; vert.

### Task 6: composants partagés de l'application

**Files:** `apps/sim/components/{secrets,permissions,status-page}`, `components/ui/generated-password-input.tsx`, `app/workspace/[workspaceId]/w/components/preview`, `w/page.tsx`, `w/hooks`, `providers/workspace-permissions-provider.tsx` ; ajoutés à `scripts/data/i18n-covered-dirs.txt`.
- [x] Ajout aux dossiers couverts ⇒ rouge ; traduction ⇒ vert.

### Task 7: refus d'un groupe d'accès en français

**Files:** `apps/sim/lib/permission-groups/capabilities.ts`, `messages/{fr,en}/errors.json` (`capabilityRefusal`, `capabilities.<id avec _>`), tests qui citaient la phrase.
- [x] Test rouge : `capabilityRefusal('workflows.edit')` = « Non autorisé par le groupe d’accès de votre organisation : modification des workflows. » ; chaque capacité a un sujet fr et en, l'en égal à `describe`.
- [x] Vert ; tests des routes concernées verts.

### Task 8: Connecteurs

**Files:** `apps/sim/lib/nexora/connect-admin.ts` (`catalogCategoryKey`), `app/api/nexora/connectors/route.ts`, `connecteurs/connectors.tsx`, `connecteurs/[service]/components/credential-form.tsx`, `messages/{fr,en}/connectors.json`.
- [x] Tests rouges : trois orthographes ⇒ une catégorie ; filtre par n'importe laquelle ⇒ les trois services ; libellé « API Key » ⇒ « Clé d'API ».
- [x] Vert.

### Task 9: journal d'audit

**Files:** `lib/nexora/audit-labels.ts` (+ test), `messages/{fr,en}/governance.json`.
- [x] Tests rouges : toute `AuditAction` a un libellé fr (`knowledge_base.reindex_started|failed` manquaient) ; détail sans nom de ressource ⇒ `—`.

### Task 10: Next.js 16.4.2

**Files:** `workstudio/package.json` (overrides, optionalDependencies `@next/swc-*`, `patchedDependencies`), `apps/sim`, `apps/docs`, `packages/{emcn,testing,sim-setup}/package.json`, `patches/next@16.4.2.patch` (renommé, contenu identique : fichiers visés identiques entre 16.4.0 et 16.4.2, `git apply --check` OK), `patches/README.md`, `bun.lock`.
- [x] `bun install` (sans `--force`) ; `bun audit` ne cite plus `next` ; suite complète et construction vertes.

### Task 11: vérification et liste des écrans

- [x] biome, `type-check`, `check:audits`, `check:test-types`, vitest ciblés puis suite complète, `bun run --cwd apps/sim build`, `check-i18n/brand/no-ee/licenses`.
- [ ] Parcours au navigateur des 15 écrans sur pc6 (session principale, après reconstruction de l'image).
- [x] `docs/verification/k2-ecrans.md` : les 15 écrans à parcourir sur pc6 (route, à regarder).
