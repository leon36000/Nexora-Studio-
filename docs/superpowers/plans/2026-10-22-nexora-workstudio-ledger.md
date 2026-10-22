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
- 22/10/2026 — **Tâche 2b terminée** (sous-agent, salle blanche respectée). Les 13 fichiers de tests en échec passent ; 14 fichiers, 131 tests verts, 42 tests marqués « skip » avec renvoi vers ce ledger.
  - **Défauts réels corrigés dans nos remplacements `ee/`** :
    - identifiants d'opérations en `snake_case` (`access_requests.list_mine`, `workspaces.fork.*`) ; les routes v2 levaient une exception à l'import ;
    - cible de demande d'accès en union stricte (400 si invalide) ;
    - messages d'interdiction alignés sur le cœur ;
    - `createForkBootstrapTransform` délègue maintenant au remappeur du cœur ;
    - `/access-requests` : boucle de redirection infinie corrigée ;
    - `PermissionAccessBoundary` refuse désormais par défaut (« Checking access », puis un avis de restriction).
  - **Tests de fonctions entreprise désactivées** (SSO/SCIM, forks, demandes d'accès) : chaque fichier a un test du comportement Nexora (404, fonction désactivée), l'ancien bloc est en « skip ». Le cliché `copilot-refused-routes.json` est régénéré.
  - R12 : la suite unitaire se lance en `LANG=en_US.UTF-8`. 8 tests (graphiques, xlsx, `providers/utils`) supposent une locale anglaise ; la machine est en `fr_FR`.
- 22/10/2026 — **Tâche 4 (marque), en cours** :
  - `scripts/check-brand.sh` (Python, 10 tests) et sa liste d'exemptions motivée `scripts/data/brand-allowlist.txt`.
  - Codemods `scripts/codemods/docs_url.py` (478 liens `docs.sim.ai` → `docsUrl()`) et `scripts/codemods/rebrand.py` (1 280 remplacements Sim → Nexora dans 580 fichiers, hors lignes de commentaires).
  - Marque par défaut Nexora WorkStudio et indigo `#4F46E5` (`lib/branding/defaults.ts`, `ee/whitelabeling`) ; manifeste en français ; `security.txt` (contact = e-mail de support de la marque).
  - Constantes de site (`@sim/utils/site`) et aide : dépôt et guide Nexora. L'entrée « Join Slack » (communauté de Sim) devient « Report an issue » (issues GitHub Nexora).
  - Suppressions : e-mails marketing de Sim (`emails/broadcasts`, `public/email/broadcast`) et logos inutilisés.
  - Wordmark « nexora » et favicons générés par `scripts/brand/generate_assets.py` (Inter Bold). Canevas du wordmark des e-mails redimensionné (600 × 102, affiché en 100 × 17).
  - R8 : site marketing de Sim jamais servi en auto-hébergement. `lib/nexora/marketing.ts` + `proxy.ts` redirigent vers `/login`, ou vers les URL légales configurées pour `/terms` et `/privacy`. Tests unitaires et tests du proxy.
  - R9 : application de bureau (Electron) non livrée en v1 ; son code de mise à jour est exempté du contrôle de marque.
  - R10 : **polices commerciales retirées** (Season Sans de Displaay, Söhne de Klim, présentes dans le dépôt de Sim mais hors Apache-2.0) et remplacées par Inter (OFL-1.1), avec `OFL.txt` et une entrée dans `THIRD_PARTY_NOTICES.md`.
  - R11 : sans facturation, les sections de réglages réservées aux offres Max ou Enterprise de Sim sont masquées, sauf si l'instance les débloque (`selfHostedOverride`). Plus de badge d'offre payante.
  - `check-brand --only workstudio` : **OK (15 786 fichiers)**. Les services (OOMOL, Etalab) restent pour la tâche 11.
- 22/10/2026 — **Tâches 2 et 4 terminées.**
  - Après la marque : `tsc` à 0 erreur ; suite unitaire complète (en `LANG=en_US.UTF-8`) à 37 804 tests verts et 50 « skip » sur 3 329 fichiers.
  - Deux échecs, traités :
    - un test de normalisation de lien, réécrit à tort par le codemod, est corrigé ;
    - un dépassement de délai sous charge (`agent-cli/services.test.ts`) passe seul (100/100 avec le fichier voisin).
  - Correctif complémentaire : les tests liés à des sources exemptées (Google Analytics, attribution, routage MCP, SCIM, Twilio, `process-contents`) ont été restaurés à leur version d'origine. Le codemod les avait réécrits alors que leur source restait inchangée. `urls.test.ts` vérifie maintenant l'hôte canonique Nexora.
  - L'accent visible (`--brand-accent`, `--brand`) passe du vert de Sim à l'indigo `#4F46E5` dans `globals.css`. Le thème injecté renseigne aussi `--brand` et `--brand-hover`.
  - Contrôles : `check-no-ee` OK (32 185 fichiers), `check-licenses` OK, `check-brand --only workstudio` OK (15 822 fichiers), tests des scripts 4/4.
- 22/10/2026 — **Tâche 5 terminée.**
  - `next-intl` 4.14.9 (MIT) dans `apps/sim`.
  - `lib/i18n/config.ts` : locale résolue par le cookie `NEXORA_LOCALE`, puis `Accept-Language`, défaut `fr` (6 tests). `i18n/request.ts` : fuseau `NEXORA_TIME_ZONE`, défaut Europe/Paris.
  - `i18n/messages.ts` : un fichier JSON par zone et par langue (`messages/{fr,en}/<zone>.json`, 12 zones), repli sur l'anglais. Test de parité des clés, des arguments ICU et des messages vides (4 tests).
  - Plugin `next-intl` dans `next.config.ts`. La mise en page racine devient asynchrone : `<html lang={locale}>` et `NextIntlClientProvider`.
  - `vitest.setup.ts` simule `next-intl` avec les vrais messages anglais, donc les tests existants gardent leurs textes.
  - Sélecteur de langue dans Réglages > Général > Préférences (« Français » / « English », cookie + `router.refresh()`).
  - `scripts/check-i18n.sh` (15 tests) avec `scripts/data/i18n-covered-dirs.txt` et `i18n-allowed-terms.txt`.
  - Vérification réelle sur l'environnement de développement :
    - `scripts/dev/up.sh` crée Postgres et Redis jetables `nexora-dev-*` sur 127.0.0.1, des secrets ignorés par Git, puis applique les migrations ;
    - `next dev` tourne sur 127.0.0.1:3100 et le serveur temps réel sur 127.0.0.1:3102 (nouvelle variable `HOST` dans `apps/realtime`, défaut `0.0.0.0` pour les conteneurs) ;
    - `/login` rend `lang="fr"` par défaut, `lang="en"` avec le cookie `en`, et `lang="fr"` pour un navigateur en allemand. Le wordmark « nexora » s'affiche, le titre est « Log In | Nexora WorkStudio ». `tsc` à 0 erreur.
  - R13 : la zone `home` (Chat/copilot) est masquée en v1 et sort du périmètre de la tâche 6.3. L'accueil effectif est le premier workflow.
- 22/10/2026 — **Tâche 11.1 (Nexora API) faite** :
  - marque (nom par défaut « Nexora API », Swagger, liens vers le guide, utilisateur `nexora` dans l'image, paquet `nexora-api`) ;
  - le fournisseur « Albert » est conservé (interopérabilité, exempté du contrôle de marque) ;
  - **défaut d'origine corrigé** : le fournisseur `mistral` sans URL pointait vers l'API Albert ; il pointe maintenant vers `https://api.mistral.ai/`. Test écrit avant le correctif ;
  - pytest unitaires : **591 verts** (environnement Python dédié dans le scratchpad, sans uv) ;
  - `check-brand --only services/nexora-api` OK.
- 22/10/2026 — **Tâche 11.2 (Nexora Connect), en cours** :
  - fournisseurs OOMOL (`oomol_console`, `fusion-api`) supprimés, catalogue régénéré (1 648 services) ; Brevo épinglé en tête ;
  - `src/server/nexora-env.ts` : alias `NEXORA_CONNECT_*` et refus de démarrer sans clé de chiffrement (6 tests) ;
  - marketplace par défaut en `.invalid` ;
  - le reste du rebranding (serveur, console web, langues) est confié à un sous-agent.
  - Base de référence avant modifications : 4 115 tests verts.
- 22/10/2026 — **Tâche 12, partie 1** :
  - `deploy/.env.example`, `scripts/init-env.sh` (12 secrets, fichier en 600, jamais réécrit ; 17 tests) ;
  - `deploy/nexora-api/config.yml` : modèle `nexora-default` derrière le connecteur `openai`, URL amont **sans `/v1`** ;
  - `deploy/postgres/init` : base `nexora_api` sur le même PostgreSQL ;
  - `deploy/bootstrap/bootstrap.py` : clé Nexora API pour WorkStudio, gardée tant qu'elle fonctionne, fichier 600 attribué à l'uid 1001 de WorkStudio ; 4 tests avec un faux serveur ;
  - `deploy/compose.yml` (9 services, ports sur `NEXORA_BIND_ADDRESS`) : `docker compose config` valide.
  - R14 : WorkStudio charge `VLLM_API_KEY` depuis le volume `bootstrap` à son démarrage (`sh -c '. /bootstrap/nexora-api.env && exec bun apps/sim/bootstrap.js'`).
- 22/10/2026 — **Tâche 7 terminée.**
  - `providers/nexora.ts` : liste noire effective et modèle Nexora par défaut ; 7 tests écrits avant le code.
  - `NEXORA_ONLY_MODELS` (env + `isNexoraOnlyModels`) masque tous les fournisseurs sauf `vllm`, à la fois dans `isProviderBlacklisted` (serveur) et dans `/api/settings/allowed-providers` (sélecteur client).
  - Le modèle par défaut des nouveaux blocs Agent est le modèle du groupe de permissions s'il existe, sinon le premier modèle Nexora API quand Nexora est le seul fournisseur. Le hook attend la liste noire avant de se déclarer prêt.
  - Le fournisseur `vllm` s'affiche « Nexora », avec l'icône Nexora ; l'identifiant interne est conservé pour la compatibilité.
  - Vérification HTTP sur l'environnement de développement branché sur la Nexora API du test : 27 fournisseurs masqués, `vllm` visible, modèles `["vllm/nexora-qwen"]`.
  - Tests `providers`, hooks et permissions : 197 fichiers et 2 319 tests verts. `tsc` : aucune erreur dans ces fichiers (les 7 erreurs restantes sont dans les tables en cours de traduction).
  - `scripts/dev/up.sh` ajoute à `.env.local` le fichier local ignoré `scripts/dev/.extra-env`.
  - Reste à vérifier visuellement après la tâche 6 : le choix par défaut « Nexora › nexora-qwen » dans l'éditeur.
- 22/10/2026 — **Tâche 8 terminée.**
  - `lib/nexora/connect.ts` : `ensureNexoraConnectServer` enregistre « Nexora Connect » (streamable-http, en-tête `Authorization: Bearer <NEXORA_CONNECT_TOKEN>`, `existingServerBehavior: 'reject'`). L'opération est idempotente (conflit = déjà présent), ne lève jamais d'exception et ne fait rien sans configuration ; 4 tests écrits avant le code.
  - Appel non bloquant depuis `emitWorkspaceCreatedPlatformEvent`, déclenché après validation de la transaction par les trois chemins de création (création classique, projet, espace du propriétaire entreprise).
  - Nouvelles variables d'environnement : `NEXORA_CONNECT_MCP_URL`, `NEXORA_CONNECT_TOKEN`.
  - Vérification réelle (environnement de développement + Nexora Connect du test) : un nouvel espace « Atelier Nexora » contient le serveur « Nexora Connect », et la découverte renvoie 5 outils (`list_apps`, `list_connections`, `search_actions`, `get_action_guide`, `execute_action`). 28 fichiers et 190 tests verts.
  - R15 : les espaces créés avant la configuration ne sont pas rattrapés en v1 ; ajout manuel possible dans Réglages > MCP.
- 22/10/2026 — **6.5 (journaux, intégrations) livrée par sous-agent** : `check-i18n` OK (59 fichiers), parité de leurs clés OK, tests de zone verts.
