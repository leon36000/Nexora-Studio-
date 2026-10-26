# K15 — Intégration au site et application installable : plan d'implémentation

> **Pour les agents :** exécution par la session K15 elle-même. Étapes à cocher (`- [x]`).

**But :** `<script src="https://<instance>/embed.js" data-nexora-chat="<identifiant>" async>` met une bulle de chat Nexora sur n'importe quel site ; `NEXORA_EMBED_ORIGINS` limite les sites autorisés ; le manifeste rend Nexora installable ; un guide et une fumée le prouvent.

**Spec :** `docs/superpowers/specs/2026-10-25-nexora-k15-integration-site-design.md`.

## Contraintes globales

- Jamais de code `ee/` d'origine ; `bash scripts/check-no-ee.sh` vert. Texte visible via next-intl ; `bash scripts/check-i18n.sh` vert. Marque « Nexora WorkStudio » ; `bash scripts/check-brand.sh` vert.
- TDD : test vu rouge avant le code, puis vert ; retirer chaque garde ⇒ rouge.
- Suite : `LANG=en_US.UTF-8 bun run --cwd <worktree>/workstudio/apps/sim test <fichiers>` ; suite complète une seule fois à la fin.
- `NexoraWeb` (site du fondateur) : lecture seule.

## Tâche 1 — Origines autorisées (spec §5, §6)

**Fichiers :** `packages/utils/src/embed-origins.ts` (+ `.test.ts`, paquet `@sim/utils`), `lib/core/security/csp.ts` (+ `csp.test.ts`), `lib/core/config/env.ts`, `proxy.ts` (+ `proxy.test.ts`), `next.config.ts`.

- [x] Test rouge `embed-origins.test.ts` (paquet `@sim/utils`) : liste vide/absente ⇒ aucune restriction ; liste valide (https, `http://localhost:3000`, `http://127.0.0.1`, `http://[::1]:8080`) normalisée et dédoublonnée ; ignorées : `*`, `https://*.exemple.fr`, `ftp://x`, `javascript:alert(1)`, `http://exemple.fr` (http hors localhost), `https://exemple.fr/chemin`, `https://u:p@exemple.fr`, `exemple.fr`, valeur vide entre deux virgules ; chaque entrée rejetée est signalée avec sa raison.
- [x] Code `embed-origins.ts` (fonction pure, sans journal).
- [x] Test rouge `csp.test.ts` : `getChatEmbedCSPPolicy()` sans variable ⇒ `frame-ancestors *` ; liste valide ⇒ `frame-ancestors 'self' https://…` et jamais `*` ; entrée invalide ignorée + `logger.warn` ; liste sans entrée valide ⇒ `frame-ancestors 'self'` + `logger.error` ; la variable est relue à chaque appel (exécution, pas construction).
- [x] Code : `NEXORA_EMBED_ORIGINS` dans `env.ts` ; `getChatEmbedCSPPolicy()` lit `getEnv` et journalise.
- [x] Test rouge `proxy.test.ts` : une requête `/chat/abc` reçoit l'en-tête CSP calculé à l'exécution ; code `proxy.ts` ; retrait du CSP du bloc « Chat pages » de `next.config.ts`.
- [x] `deploy/compose.yml` (valeur par défaut vide), `deploy/.env.example`, `scripts/tests/test-compose-env.sh`.

## Tâche 2 — Script `/embed.js` (spec §1–4)

**Fichiers :** `public/embed.js`, `lib/nexora/embed/script.test.ts` (jsdom), `next.config.ts` (en-têtes), `proxy.ts` (matcher).

- [x] Test rouge (jsdom) : bulle créée (bouton `aria-label`, `aria-expanded=false`) ; ouvrir ⇒ iframe `https://instance/chat/<id>` sandboxée sans `allow-top-navigation`, panneau visible, `aria-expanded=true` ; Échap ferme et rend le focus au bouton ; `NexoraChat.open/close/toggle` ; `data-open` ouvre au chargement ; `data-position=left` ; `data-label` posé en `textContent` ; plein écran ≤ 640 px ; refus d'un identifiant invalide (`../x`, `A B`, `"><img src=x onerror=…>`, vide) : aucune bulle, aucun élément ajouté ; **aucune injection** par `data-label`, `data-color`, `data-target` (pas d'élément `img`/`script` créé, couleur non hexadécimale ignorée) ; `data-mode=inline` + `data-target` insère l'iframe dans la cible et pas de bulle ; cible introuvable ⇒ rien ; message `postMessage` d'une autre origine ou d'une autre fenêtre ignoré, de la bonne origine/fenêtre `close` ferme ; `prefers-reduced-motion` ⇒ aucune transition ; taille < 6 144 octets ; une seconde exécution ne crée pas deux bulles.
- [x] Code : source lisible `lib/nexora/embed/embed.src.js`, construite en `public/embed.js` minifié (< 6 Ko) par `bun run build:embed` ; l'empreinte de la source est dans la bannière et un test la compare.
- [x] En-têtes (CORS, CORP, cache, nosniff) dans `next.config.ts` ; test rouge dans `next.config.test.ts` ; `embed.js` exclu du `matcher` du proxy (test dans `proxy.test.ts`).

## Tâche 3 — Application installable (spec §7)

**Fichiers :** `app/manifest.ts` (+ `manifest.test.ts`), `messages/{fr,en}/shell.json` (ou `common.json`), `public/favicon/maskable-{192,512}x*.png`.

- [x] Test rouge : `lang: fr`, `id`, `name` = « Nexora WorkStudio », `short_name`, `start_url`, `scope`, `display: standalone`, couleurs hexadécimales, pas d'`orientation` bloquante ; icônes 192 et 512 `any` + 192 et 512 `maskable`, **chaque fichier existe sur disque** avec les dimensions déclarées ; aucune marque Sim ; raccourcis traduits ; aucun service worker (`public/sw.js`, `service-worker.js`, `app/sw`, `serviceWorker.register` absents).
- [x] Icônes `maskable` générées depuis le logo « n » (fond plein bleu de la marque, glyphe dans la zone sûre).
- [x] Code `manifest.ts` (textes par next-intl, locale par défaut `fr`) + messages fr/en.

## Tâche 4 — Guide (spec §8)

- [x] `docs/guide/integration-site.md` (script, iframe, lien ; Next.js 15 / React 19 avec `next/script` ; Directus / HTML statique ; origines autorisées ; API `/v1` depuis le serveur ; installer comme application ; réseau HTTPS ; section « Application PC ») ; ligne dans `docs/guide/README.md` ; variable dans `docs/guide/installation.md` si l'on y liste les variables.

## Tâche 5 — Fumée

- [x] `scripts/smoke.py` : contrôle « Intégration au site » (`/embed.js` 200, JavaScript, en-têtes ; `/chat/<identifiant>` du chat public créé par le contrôle précédent porte `frame-ancestors`, `*` par défaut ; manifeste JSON valide, icônes joignables en 200 image).
- [x] Rejeu du contrôle contre un `next dev` ou la pile (si disponible). Fait en partie : `next dev` privé (sans base de données) : `/embed.js`, `/chat/<id>` (avec et sans origines) et le manifeste vérifiés par HTTP avec l'aide `Smoke.fetch` ; la publication d'un agent par le contrôle complet attend la pile (déploiement).

## Tâche 6 — Vérifications finales

- [x] `check:audits`, `check:test-types`, `check:api-validation:strict`, `type-check` ; `check-i18n`, `check-brand`, `check-no-ee`, `check-licenses`, `test-compose-env` ; suite complète d'`apps/sim`.
- [x] Ledger : section K15 (rulings, preuves, non livré) ; plan coché ; commits.
