# Ledger Nexora WorkStudio v3.1 — opérationnel, navigateurs, performance, facilité (27/10/2026)

> Note (ménage du 27/10/2026) : les plans par jalon (v1, J1 à J11, K1 à K15), les captures et les rapports de campagne de `docs/verification/`, le rapport de test réel et les anciens codemods cités ci-dessous ont été retirés (exécutés ou remplacés) ; ils restent dans l'historique git (commit `b05d7e07`). Les jeux d'essai de la fumée sont dans `scripts/fixtures/`.

Demande du fondateur : « assure-toi que Nexora WorkStudio soit 100 % opérationnel et performant ainsi que parfaitement optimisé pour les navigateurs », « à la pointe et extrêmement puissant tout en demeurant facile », et l'entreprise devient **Nexora AI** (le produit reste Nexora WorkStudio). Branche `worktree-agent-a5dcfc987412a02d0` ; rien n'est poussé, pc6 n'est pas redéployé (procédure en fin de fichier).

Outils ajoutés (tous dans `scripts/verification/`) : `navigateurs.mjs` (+ `navigateurs-pc6.sh`, `navigateurs-docker.sh`), `lighthouse.sh`, `analyse-bundles.py`, `chaine-import.py` ; `scripts/codemods/contracts-barrel-vers-fichiers.py`. La fumée accepte `NEXORA_SECRETS_ROOT` (arbre de travail sans `.secrets`).

## 1. Opérationnel : inventaire vérifié

Référence : instance pc6 (v3 + K15 déployée), modèle GLM 5.3, **fumée complète 44/44** avant les changements (`scripts/verification/fumee-pc6.sh`, 27/10). Parcours couverts par la fumée (HTTP) : inscription, espace, accueil, Connect, connecteurs, base de connaissances, planification, génération, chat public, `/embed.js` et manifeste, Playground, agents, prompts, Assistant (projets, tâches, connexions), interpréteur, citations, confirmation, API développeur (clés), traces, garde-fous, évaluations, lots, délégation, recherche web, OCR, transcription, synthèse vocale, réunion, extraction, Copilote, Étapes, budgets, audit, gouvernance, consommation, modèles.

Parcours **au navigateur** (`navigateurs.mjs`, 28 étapes par profil) : pages publiques (connexion, inscription, mot de passe oublié : langue, titre, police chargée, pas de débordement), connexion par le formulaire, 20 écrans de l'application (accueil, Assistant, Playground, agents, prompts, connecteurs, développeurs, traces, évaluations, lots, intégrations, tables, fichiers, connaissances, journaux, compétences, réglages ×4), éditeur (canevas, glisser-déposer d'un bloc depuis la barre d'outils, annuler / rétablir, recherche `Cmd+K` ou `Ctrl+K`), création et affichage d'un chat public, bulle `/embed.js` sur un site tiers (autre origine), CLS / LCP de l'accueil. Erreurs console, erreurs de page et clés de traduction visibles font échouer l'étape.

## 2. Navigateurs

| Navigateur | Profil | Avant (pc6) | Après (build local) |
|---|---|---|---|
| Chromium | bureau, bureau « plateforme Mac », mobile 390 px | 84/86 (2 échecs = bogue de mon outil : bloc déposé dans un workflow existant, corrigé) | tout vert hors artefacts de l'instance locale (Connect absent, utilisateur sans organisation : 403/503 attendus) |
| Firefox | bureau, Mac, mobile | **0/12 à la connexion** : erreur console de politique de sécurité sur chaque page | 30/30 bureau, 30/30 Mac, 25/26 mobile (une SSE interrompue à la navigation) |
| WebKit (Safari) | bureau, Mac, mobile iPhone 14 | impossible à lancer sur pc6 (bibliothèques système absentes, pas de `sudo`) ; lancé dans le conteneur officiel Playwright 1.61.1 : **4/64**, connexion mobile bloquée | glisser-déposer, annuler/rétablir, recherche, bulle `/embed.js`, connexion mobile : verts |

Défauts trouvés et corrigés (cause, test rouge d'abord) :

1. **Firefox : erreur console sur chaque page** (« blocked a JavaScript eval … Missing 'unsafe-eval' »). Cause : Zod sonde `new Function("")` à la construction de chaque schéma ; la politique de sécurité n'autorise pas `eval`, et Firefox rapporte la sonde même interceptée. Correctif : `z.config({ jitless: true })` dans le navigateur, chargé le premier par `instrumentation-client.ts` (Zod lit le réglage à la construction du schéma : le placer dans un fournisseur échouait, constaté). Test : `lib/core/zod-browser-config.test.ts` ; preuve de bout en bout : Firefox 30/30.
2. **Téléphone (WebKit) : « Se connecter » grisé pour toujours** quand les champs sont remplis avant la fin du chargement (remplissage automatique, saisie rapide sur un téléphone lent) : l'état React est vide pendant que le texte reste à l'écran. Correctif : `usePrehydrationValues` reprend les valeurs déjà saisies après l'hydratation (connexion, inscription). Test : `use-prehydration-values.test.tsx`. Preuve : connexion mobile WebKit sans attendre le chargement.
3. **`/embed.js` : message envoyé à un cadre pas encore chargé** — Firefox (« target origin … does not match ») et WebKit (« Unable to post message ») écrivaient une erreur dans la console du site du client. Correctif : on n'écrit au cadre qu'après son `load`. Test : `script.test.ts`.
4. **Raccourcis** : l'application choisit `Cmd` ou `Ctrl` d'après l'agent utilisateur, comme prévu ; vérifié Chromium/Firefox/WebKit, plateformes Linux et Mac (le WebKit de Playwright se présente comme Safari sur Mac même sous Linux : l'outil suit désormais la page, pas un drapeau). Aucun défaut de l'application.
5. Revue statique Safari/Firefox anciens (`AbortSignal.any`, `structuredClone`, `Promise.withResolvers`, `MediaRecorder` mp4, `CSS.highlights`) : tout est gardé ou a un repli ; seul avertissement WebKit : `interactive-widget` du méta viewport (ignoré par Safari, sans effet) — filtré dans l'outil, non « corrigé » (Chrome Android s'en sert pour le clavier).
6. Polices : `Inter` variable chargée (`display: block`, préchargée) dans les trois moteurs. `backdrop-filter` : n'est utilisé que par le site marketing (route bloquée) ; le CSS généré porte les préfixes `-webkit-`.

## 3. Performance (mesures avant / après)

Avant = pc6 (image v3 déployée) ; après = build de production local du code de la branche (même machine, même navigateur Chromium 149, cache vide, requêtes compressées, `scripts/verification/lighthouse.sh`, `analyse-bundles.py`).

**Page de connexion**

| Mesure | Avant | Après |
|---|---|---|
| HTML (compressé) | 136 Ko | **28 Ko** (−79 %) |
| JavaScript transféré | 946 Ko | **620 Ko** (−34 %) |
| Total transféré (58 → 46 requêtes) | 1 237 Ko | **804 Ko** (−35 %) |
| JavaScript minifié chargé | 2,94 Mo | **2,03 Mo** (−31 %) |
| Lighthouse mobile : performance (2 passes chacune) | 57–58 | **80** |
| LCP mobile / TBT mobile | 6,9–9,2 s / 640–730 ms | **3,8–4,6 s / 210–390 ms** |
| Lighthouse bureau : performance | 97–98 | **99** (LCP 1,1–1,2 → 0,9 s, TBT 60–80 → 0 ms) |
| Accessibilité / bonnes pratiques | 94 / 96 | **100 / 100** |

Causes et correctifs : (a) 423 Ko de traductions de **tous** les écrans partaient avec la page de connexion → `liteMessages` (le proxy marque connexion, inscription, mot de passe, vérification, SSO et chat public ; un test relit les modules chargés par ces pages et échoue si l'un lit un autre namespace) ; (b) `login-form` importait le barrel `@/lib/api/contracts` (tous les schémas Zod) → imports directs, codemod sur 25 fichiers, test qui interdit le retour du barrel dans le code du navigateur ; (c) trois boutons sociaux chargeaient `components/icons.tsx` (670 Ko générés) → trois icônes locales ; (d) un logo importait la barre de navigation du site marketing → import direct ; (e) `posthog-js` (212 Ko) chargé alors que rien n'est envoyé à un tiers → `PostHogGate` ne le charge que si `NEXT_PUBLIC_POSTHOG_ENABLED` et une clé existent (test) ; (f) pas de point de repère `<main>` et un gris de texte à 4,25:1 → `<main>`, `--text-muted` clair `#7a7a7a` → `#737373` (4,6:1).

**Accueil / réglages / éditeur** (transfert compressé, cache vide) : accueil 5 849 → 5 760 Ko, réglages 4 811 → 4 629 Ko, éditeur 7 114 → 7 041 Ko ; Lighthouse bureau accueil : accessibilité 77 → 80 (le compte local n'a pas les données de pc6 : les scores de performance de l'accueil ne sont pas comparables, 45 contre 51). **Limite constatée, non traitée** : un chunk de 2,6 Mo compressés (16 Mo de JavaScript : `tools/generated/tool-metadata.ts` 6,7 Mo + les ~700 définitions de blocs et leurs icônes) est chargé par **toute** page de l'espace de travail, parce que `socket-provider` → `stores/workflows/registry` → `stores/workflows/subblock/store` importe `@/blocks/registry` (et `suggested-actions` le fait aussi pour l'accueil). Le sortir du chemin critique est un chantier d'architecture (chargement à la demande du registre, plusieurs importeurs à découpler : stores, accueil, recherche, journaux) qui sort de ce périmètre sûr ; il est immuable-caché un an, donc payé une fois par navigateur. Gain attendu : −2,6 Mo sur les écrans hors éditeur. Autres lourds repérés : `tool-outputs.ts` 8 Mo (éditeur seulement), monaco 12 Mo et js-tiktoken 5,6 Mo (chargés à la demande).

Build : 3 min 35 s avant, 3 min 57 s après (même ordre). Redirections après connexion : `/login → /home → /workspace → /workspace/<id> → …/home` (trois sauts, ~2,5 s) : non modifiées (le chargeur `/workspace` gère la création d'espace, les 409 et la session périmée) ; piste : décider l'espace côté serveur dans `/home`.

**Dépendances (`bun audit`)** : Next.js 16.4.2 — **aucun avis** (l'avis de la v2 est clos par K2) ; 16.4.3 existe (23/10, 4 jours) mais aucun avis ne le demande et la règle d'âge de 7 jours n'est pas atteinte : non adopté. Corrigés dans la même branche : `nodemailer` 10.1.4, `undici` 7.30.1 (63 → 52 avis). `bun audit fix` voulait aussi `better-auth` 1.6 → 1.7.7 (changement mineur, `packages/auth` et le correctif d'`oauth-provider` à reprendre) : **refusé**, et sans objet ici — les trois avis `better-auth` (critique « OAuth state utilisé comme lien magique », OAuth Proxy, autorisation d'appareil) ne concernent que les greffons `magicLink`, `oAuthProxy` et `deviceAuthorization`, qu'aucun fichier de `lib/auth` n'active. Restent : `zod` (< 4.6.6, mémoire sur collections énormes : montée mineure, à décider), `image-size` (majeure), `undici` 8.x (dépendance indirecte), MSAL Node (majeure), outils de développement (vite, js-yaml…). À ouvrir par le fondateur si la montée de `better-auth` est souhaitée.

## 4. Facilité : frictions relevées

Corrigées (test rouge d'abord) : (1) liens « Conditions d'utilisation » / « Politique de confidentialité » de la connexion et de l'inscription → `/terms` et `/privacy`, qui renvoient à `/login` (impasse) : ils viennent désormais de `NEXORA_TERMS_URL` / `NEXORA_PRIVACY_URL`, et la phrase disparaît tant qu'ils sont vides ; (2) l'adresse **`support@example.com`** s'affichait au pied de chaque chat public, dans chaque e-mail envoyé et dans `/.well-known/security.txt` → `NEXORA_SUPPORT_EMAIL`, sinon rien (404 pour `security.txt`) ; (3) bouton « Se connecter » bloqué sur téléphone (voir §2.2) ; (4) le canevas affichait `vllm/nexora-default` dans les blocs → « Modèle par défaut » ou le nom sans préfixe.

Relevées, non corrigées (par ordre d'effet) : (5) la page *Réglages › Modèles* est vide pour un utilisateur sans organisation (aucun message) ; (6) les descriptions de plus de mille intégrations (« Manage Slack messages… ») et des compétences intégrées restent en anglais ; (7) trois sauts de redirection après la connexion ; (8) « Nouvel agent » crée le workflow dès le clic (pas d'annulation) ; (9) l'étiquette « Modèle par défaut (nexora-default) » garde l'alias technique dans le sélecteur d'agent ; (10) Traces et Clés d'API renvoient 403 (visible en console) à un membre hors organisation. Un assistant de démarrage existe déjà (cinq étapes au premier lancement, huit modèles de départ sur l'Accueil) : il n'a pas été refait.

## 5. Marque « Nexora AI »

README, `NOTICE`, `THIRD_PARTY_NOTICES.md` et les métadonnées de l'application (auteur, créateur, éditeur) nomment l'entreprise « Nexora AI » ; « Nexora » seul désigne la suite. `scripts/check-brand.sh` refuse désormais « Nexora construit… », « modifiés par Nexora », « équipe Nexora », « Nexora SAS »… dans le README, `NOTICE`, `THIRD_PARTY_NOTICES.md`, `install.sh` et `docs/guide` (4 cas ajoutés à `scripts/tests/test-check-brand.sh`, rouges avant).

## 6. Vérifications finales

Suite `apps/sim` (`LANG=en_US.UTF-8`) : 3 585 fichiers, **40 467 tests verts** au dernier passage (un seul test, `session-sandbox.test.ts`, a expiré pendant que le type-check tournait en même temps — instabilité sous charge déjà consignée au ledger v3 ; seul, 32/32) (`LANG=en_US.UTF-8`) ; type-check de tous les workspaces ; `check:audits` 60/60 ; `check:test-types`, `check:api-validation:strict`, `check:permission-group-enforcement`, `check-no-ee`, `check-brand`, `check-i18n`, `check-licenses`, `scripts/tests/test-*.sh` : verts. Fumée pc6 : 44/44 sur l'image **déployée** (v3) ; la nouvelle image n'a pas été déployée (consigne), elle est validée par le parcours navigateur et les mesures ci-dessus sur un build de production local.

## 7. Procédure de déploiement (pour l'orchestrateur)

1. Fusionner la branche `worktree-agent-a5dcfc987412a02d0` dans `main` (aucune migration, aucune variable obligatoire nouvelle).
2. Facultatif dans `deploy/.env` : `NEXORA_SUPPORT_EMAIL`, `NEXORA_TERMS_URL`, `NEXORA_PRIVACY_URL` (vides = rien d'affiché). Sans elles, la phrase légale des formulaires et l'adresse de contact disparaissent : c'est voulu.
3. Reconstruire **uniquement l'image WorkStudio** (rien d'autre n'a changé : ni Nexora API, ni Connect, ni cron, ni realtime) : `git show HEAD:deploy/compose.yml > deploy/.compose-head.yml`, build dans un worktree du scratchpad, puis `docker compose -p nexora up -d --no-deps workstudio` ; supprimer `deploy/.compose-head.yml`. Le disque de pc6 est à 99 % : lancer d'abord `docker builder prune -f --keep-storage 10gb` (un build laisse ~20 Go de cache).
4. Vérifier : `scripts/verification/fumee-pc6.sh` (44/44 attendu), puis `scripts/verification/navigateurs-pc6.sh <rapport.json> --navigateurs chromium,firefox` et `scripts/verification/navigateurs-docker.sh <rapport.json> --navigateurs webkit` (WebKit tourne dans le conteneur Playwright, l'image `mcr.microsoft.com/playwright:v1.61.1-noble` est déjà tirée sur pc6).
5. Retour arrière : relancer l'image WorkStudio précédente (aucune donnée migrée).

## Ce qui n'a pas pu être vérifié

Safari sur un vrai Mac ou iPhone (WebKit de Playwright seulement : même moteur, pas le même navigateur) ; Edge (Chromium) et Chrome Android réels ; l'éditeur sous WebKit mobile (lecture seule vérifiée) ; Lighthouse sur les écrans authentifiés à contenu comparable (le compte local n'a pas les données de pc6, seule la connexion est comparable terme à terme) ; la fumée complète avec la **nouvelle** image sur pc6 (non déployée) ; l'effet réel de la montée de Zod / better-auth (non faite).
