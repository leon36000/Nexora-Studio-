# Nexora WorkStudio v1 — plan d'implémentation

> **Pour l'exécutant** : appliquer `superpowers:subagent-driven-development` (ou `executing-plans` en ligne), tâche par tâche. Cocher les cases au fil de l'eau, consigner chaque décision dans le ledger : `docs/superpowers/plans/2026-10-22-nexora-workstudio-ledger.md`.
> **Spec** : `docs/superpowers/specs/2026-10-22-nexora-workstudio-design.md` (la section 5 donne la définition de « terminé »).

**But** : livrer Nexora WorkStudio v1, c'est-à-dire :
- un fork de Sim v0.9.31 sans code `ee/` propriétaire ;
- rebrandé Nexora, en français par défaut ;
- branché sur Nexora API (fork d'OpenGateLLM) et Nexora Connect (fork d'OpenConnector) ;
- installable par un seul `docker compose up`.

**Architecture** : monorepo Git à la racine du projet.
- `workstudio/` : Sim, Next.js 16, Bun, Turbo, Drizzle, Better Auth ;
- `services/nexora-api/` : FastAPI ;
- `services/nexora-connect/` : TypeScript ;
- `deploy/` : compose ;
- `scripts/` : contrôles.

**Pile** : Bun 1.x, Next.js 16.4, React 19.2, next-intl, Vitest, Docker Compose v5, Python 3.12.

---

## Contraintes globales (valables pour toutes les tâches)

1. **Ne jamais lire, copier ni restaurer le code `ee/` d'origine.** La seule source d'`ee/` est `sim-noee/sim/apps/sim/ee/` (nos remplacements). `check-no-ee.sh` compare les empreintes des fichiers aux blobs d'origine, sans jamais les afficher.
2. **Aucun push** vers un dépôt distant. Commits locaux uniquement.
3. **Ressources partagées sur pc6** :
   - ne jamais arrêter un processus ou un conteneur qui n'a pas été lancé par ce travail (vLLM, Ollama, autres sessions) ;
   - les conteneurs du test (`spike-*`) peuvent être arrêtés une fois le compose de `deploy/` fonctionnel ;
   - le disque n'a que ≈ 60 Go libres : surveiller avec `df -h /`, et nettoyer les images et caches **créés par ce travail** au-delà de 85 % de remplissage ;
   - un seul `tsc` complet à la fois (≈ 9 Go de mémoire).
4. **Docker** : `sg docker -c "docker …"`. Ports publiés sur 127.0.0.1 uniquement.
5. **Secrets** : jamais dans Git. `deploy/.env` est ignoré ; seul `deploy/.env.example` est commité.
6. **Style** : suivre les conventions de Sim (Biome, alias `@/`, tests Vitest à côté des fichiers). En-tête « Nexora clean-room replacement » obligatoire dans `apps/sim/ee/**`. Les nouveaux fichiers Nexora hors `ee/` n'ont pas d'en-tête spécial.
7. **TDD** : pour toute logique (fonctions, routes, scripts), écrire d'abord un test qui échoue. Pour les traductions et la marque, le test est le script de contrôle.
8. **Vérifier avant d'annoncer** : chaque tâche se termine par la commande de vérification indiquée, avec sa sortie consignée dans le ledger.
9. **Arrêts** : demander au fondateur seulement en cas d'action irréversible, de réglage système ou de sécurité, de push, ou si le plan s'avère impossible. Sinon, trancher et consigner la décision (« ruling ») dans le ledger.

## Points de vigilance pour la relecture

- Absence d'`ee/` d'origine, y compris dans les objets Git.
- Aucune régression de typage.
- Aucune marque tierce visible.
- Les secrets.
- La compatibilité ARM64.

Chemins utiles :
- `S=/tmp/claude-1000/-home-pc6--claude-spares-spare-uLDMGF/e8c957db-5c05-499a-8980-d742c3991fc0/scratchpad`
- `R=/home/pc6/Desktop/Nexora Studio`

---

## Tâche 0 — Dépôt et import propre des sources

**Fichiers** : `.gitignore`, `workstudio/**`, `workstudio/UPSTREAM.md`, `services/nexora-api/**` + `UPSTREAM.md`, `services/nexora-connect/**` + `UPSTREAM.md`, `THIRD_PARTY_NOTICES.md`, `NOTICE`.

- [ ] Compléter `.gitignore` : `node_modules/`, `.next/`, `.turbo/`, `deploy/.env`, `**/.env`, `*.local.md`, `docs/recherche/mistral-studio/sources/`, `.claude/.ralph-loop.local.md`.
- [ ] `git init -b main` à la racine du projet ; `git remote add origin https://github.com/leon36000/Nexora-Studio-.git` (aucun push).
- [ ] Importer Sim :
  - `git -C $S/sim-noee/sim archive v0.9.31 | tar -x -C workstudio --exclude='apps/sim/ee'` ;
  - copier les remplacements avec `cp -a $S/sim-noee/sim/apps/sim/ee workstudio/apps/sim/ee`.
- [ ] Importer les services :
  - OpenGateLLM au commit `26583dc` et OpenConnector au commit `2d9a593`, par `git archive` depuis `$S/oss-deep/` ;
  - contrôle préalable que les deux SHA sont bien ceux des clones.
- [ ] Rédiger `UPSTREAM.md` pour chaque composant (URL, version et SHA, licence, date, « fichiers modifiés : voir l'historique Git à partir du commit d'import »), et `THIRD_PARTY_NOTICES.md` (Sim Apache-2.0 + NOTICE, OpenGateLLM MIT, OpenConnector Apache-2.0).
- [ ] Vérifier qu'aucun fichier d'environnement réel n'est importé (`.env`, clés) : `git status --porcelain | grep -i '\.env$'` doit être vide.
- [ ] Commit `chore: import Sim v0.9.31 (sans ee/), OpenGateLLM, OpenConnector + remplacements salle blanche` sur `main`, puis `git switch -c workstudio-v1`.

**Vérification** : `git log --oneline | head` ; `git ls-files workstudio/apps/sim/ee | wc -l` = 106 ; `du -sh .git`.

## Tâche 1 — Contrôles de provenance et de licences

**Fichiers** : `scripts/check-no-ee.sh`, `scripts/check-licenses.sh`, `scripts/lib/ee-reference.sh`, `scripts/tests/*.bats` ou `scripts/tests/*.sh`.

- [ ] Test d'abord : un faux fichier dans `ee/` sans en-tête doit faire échouer `check-no-ee.sh`. Un fichier dont le blob SHA-1 figure dans la liste de référence doit aussi le faire échouer.
- [ ] Liste de référence :
  - le script génère les empreintes des blobs d'origine avec `git -C <clone> ls-tree -r v0.9.31 apps/sim/ee`, qui produit les SHA seuls, sans lire le contenu ;
  - il les stocke dans `scripts/data/sim-ee-blob-shas.txt` (empreintes seules, aucun contenu).
- [ ] `check-no-ee.sh` vérifie trois choses :
  - (a) chaque fichier de `workstudio/apps/sim/ee/` porte l'en-tête ;
  - (b) aucun blob du dépôt (`git rev-list --objects --all`) ne figure dans la liste de référence ;
  - (c) aucun fichier du dépôt, hors `ee/`, n'a une empreinte présente dans la liste.
- [ ] `check-licenses.sh` vérifie, pour chacun des trois composants, la présence de LICENSE, d'UPSTREAM.md et d'une entrée dans THIRD_PARTY_NOTICES ; et pour Sim, de NOTICE.
- [ ] Commit.

**Vérification** : les deux scripts sortent avec 0 sur le dépôt et avec 1 sur les cas de test.

## Tâche 2 — Installation et état de référence

- [ ] `cd workstudio && bun install --frozen-lockfile`. En cas d'échec réseau ou de lockfile, `bun install` puis consigner l'écart.
- [ ] Contrôle de types de `apps/sim` : la commande exacte vient du `package.json`, par exemple `bunx tsc --noEmit -p apps/sim`. Attendu : 0 erreur, comme dans le rapport 06.
- [ ] Tests unitaires de référence sur les fichiers qui importent `@/ee/` : `bunx vitest run --project sim <liste>`. Consigner les échecs préexistants : ce sont des tests qui « mockaient » l'ancien `ee/` et qu'il faut réécrire ou supprimer en tâche 2b.
- [ ] Tâche 2b :
  - réparer ou réécrire les tests cassés par la sortie d'`ee/`, à partir du comportement de nos remplacements ;
  - supprimer les tests propres à `ee/` (absents de toute façon).

**Vérification** : `tsc` à 0 ; liste des tests en échec, vide ou justifiée dans le ledger.

## Tâche 3 — Télémétrie coupée, copilot masqué

**Fichiers** : `workstudio/apps/sim/lib/core/config/env.ts` (valeurs par défaut), le fournisseur PostHog côté client, l'initialisation de Sentry (`instrumentation*.ts`, `sentry.*.config.ts`), l'endpoint de télémétrie, le gate du copilot, et les tests correspondants.

- [ ] Test : sans variable d'environnement, `isPosthogEnabled()` vaut false, Sentry n'est pas initialisé (pas de DSN), et `isCopilotAvailable()` vaut false quand `SIM_AGENT_API_URL` est vide.
- [ ] Supprimer toute valeur par défaut pointant vers `*.sim.ai` (copilot, télémétrie, `TELEMETRY_ENDPOINT`, docs). `NEXT_TELEMETRY_DISABLED=1` dans les Dockerfiles.
- [ ] Masquer les points d'entrée UI du copilot (panneau, raccourci, bouton) quand il est indisponible.
- [ ] `grep -rn "sim\.ai" workstudio/apps/sim --include=*.ts --include=*.tsx` : aucun appel réseau sortant (fetch, URL d'API) restant. Les liens de documentation sont traités en tâche 4.

**Vérification** : tests verts ; recherche des appels réseau vide (consigner la commande).

## Tâche 4 — Marque Nexora

**Fichiers** :
- `apps/sim/ee/whitelabeling/index.ts` : couleurs indigo `#4F46E5` / survol `#4338CA` / accent `#6366F1`, `supportEmail` neutre, `documentationUrl` ;
- logos `apps/sim/public/` (wordmark SVG « nexora », favicon, `apple-touch-icon`, image `og`) ;
- `app/layout.tsx` (métadonnées) ;
- gabarits d'e-mails ;
- `lib/branding/docs-url.ts` (nouveau) ;
- codemod `scripts/codemods/docs-url.ts`.

- [ ] `scripts/check-brand.sh` en premier (TDD : il doit échouer sur l'état actuel) :
  - termes cherchés : `Sim Studio|sim\.ai|simstudio|OOMOL|oomol|etalab|Etalab|Albert API`, et le mot « Sim » isolé dans le texte JSX et les chaînes affichées (`>Sim<`, `'Sim'`, `"Sim "`) ;
  - fichiers parcourus : `*.tsx`, `*.ts` non-test des dossiers d'interface (`apps/sim/app`, `apps/sim/components`, `apps/sim/blocks`, `apps/sim/lib/**/emails`, `public/*.json|*.webmanifest`), plus les services ;
  - liste d'exemptions explicite et commentée dans `scripts/data/brand-allowlist.txt` : en-têtes de licence, `UPSTREAM.md`, `THIRD_PARTY_NOTICES.md`, identifiants internes non affichés (noms de paquets `@sim/*`, variables `SIM_*`, chemins d'import).
- [ ] `docsUrl(path)` :
  - renvoie `NEXT_PUBLIC_DOCUMENTATION_URL + path` si la variable est définie ;
  - sinon, renvoie le guide du dépôt Nexora (`https://github.com/leon36000/Nexora-Studio-/tree/main/docs/guide`) ;
  - test unitaire.
- [ ] Codemod : remplacer les ≈ 490 littéraux `https://docs.sim.ai/...` par `docsUrl('/...')`, avec l'import ajouté. Lancer `bunx biome format`.
- [ ] Remplacer les autres occurrences visibles (« Sim », « Sim Studio », liens `www.sim.ai`, `simstudioai` dans les liens GitHub ou Discord) par la marque (`brand.name`) ou les retirer : liens vers Discord, X ou statut de Sim → supprimés.
- [ ] Assets : wordmark SVG texte « nexora » en indigo, favicon carré « n ». Ce sont des assets provisoires, à consigner.
- [ ] Revoir le menu « Sandboxes » marqué « Max » et tout badge d'offre payante de Sim (« Pro », « Team », « Upgrade ») : à masquer en auto-hébergement.

**Vérification** : `scripts/check-brand.sh` sort avec 0 ; `tsc` à 0 ; tests de `docs-url` verts.

## Tâche 5 — Infrastructure de traduction (next-intl)

**Fichiers** :
- `apps/sim/i18n/request.ts` : locale lue dans le cookie `NEXORA_LOCALE`, puis `Accept-Language`, défaut `fr` ;
- `apps/sim/i18n/config.ts` : `locales = ['fr', 'en']` ;
- `apps/sim/messages/fr.json`, `apps/sim/messages/en.json` ;
- `next.config.ts` : plugin `createNextIntlPlugin` ;
- `app/layout.tsx` : `NextIntlClientProvider`, `<html lang>` ;
- sélecteur de langue dans Réglages > Général.

- [ ] Test : la résolution de la locale (cookie fr / en / absent / invalide, et `Accept-Language`) renvoie la bonne valeur ; les clés de `fr.json` et `en.json` sont identiques (test de parité).
- [ ] Ajouter la dépendance `next-intl` (MIT) au `package.json` d'`apps/sim`, puis `bun install`.
- [ ] Pas de routage par préfixe de locale : ne pas toucher aux routes.
- [ ] `scripts/check-i18n.sh` :
  - cherche le texte JSX anglais en dur (regex `>\s*[A-Z][a-z]+( [a-z]+)*\s*<` et attributs `placeholder|title|aria-label|label="[A-Z][a-z]`) dans une liste de dossiers « couverts » (`scripts/data/i18n-covered-dirs.txt`), qui s'allonge à chaque tâche 6.x ;
  - sort avec 1 si une occurrence n'est pas exemptée.

**Vérification** : tests verts ; build Next (`bun run build` dans `apps/sim`, ou au minimum `tsc`) ; page d'accueil rendue avec `lang="fr"`.

## Tâche 6 — Traduction des surfaces principales (français par défaut)

Une sous-tâche par zone. Pour chacune :
1. ajouter le dossier dans `i18n-covered-dirs.txt` ;
2. lancer `check-i18n.sh` (il échoue) ;
3. remplacer les textes par `useTranslations` / `getTranslations` (espace de noms par zone) ;
4. remplir `fr.json` (vouvoiement, ton professionnel) et `en.json` (texte d'origine) ;
5. lancer `check-i18n.sh` (il passe), puis `tsc` ;
6. commit.

Les traductions peuvent être confiées à des sous-agents, en parallèle par zone, car les fichiers sont disjoints. Chaque sous-agent écrit dans un fichier de messages partiel `messages/<zone>.{fr,en}.json`, fusionné par `i18n/request.ts`.

- [ ] 6.1 Connexion, inscription, mot de passe oublié, vérification (`app/(auth)`).
- [ ] 6.2 Coquille et navigation : barre latérale, sélecteur d'espace de travail, recherche, menus (`app/workspace/[workspaceId]/components`, `w/components/sidebar`).
- [ ] 6.3 Accueil et chat du workspace (`home`, `chat`).
- [ ] 6.4 Éditeur de workflow : barre d'outils, panneau de blocs (catégories), panneau de propriétés, journaux d'exécution, déploiement (`w/[workflowId]`).
- [ ] 6.5 Journaux (`logs`).
- [ ] 6.6 Réglages : toutes les sections de `settings`.
- [ ] 6.7 Intégrations, tables, fichiers, connaissances (`integrations`, `tables`, `files`, `knowledge`).
- [ ] 6.8 Messages d'erreur communs, toasts, pages 404 et erreur (`app/not-found.tsx`, `error.tsx`, `components/emcn` pour les libellés génériques).

**Vérification** : `check-i18n.sh` sort avec 0 sur tous les dossiers couverts ; contrôle visuel dans le navigateur (capture dans `docs/recherche/test-reel/` ou `docs/guide/captures/`).

## Tâche 7 — Nexora API, fournisseur de modèles par défaut

**Fichiers** : `apps/sim/providers/vllm/**` (libellé et icône), `providers/models.ts` (métadonnées d'affichage), `blocks/blocks/agent.ts` (modèle par défaut), `lib/core/config/env.ts` (`NEXORA_ONLY_MODELS`), et la liste des fournisseurs affichés.

- [ ] Test d'abord :
  - avec `NEXORA_ONLY_MODELS=true`, la liste des fournisseurs proposés se limite à `vllm`, affiché « Nexora » ;
  - le modèle par défaut du bloc Agent est le premier modèle `vllm/` disponible ;
  - sans la variable, le comportement d'origine est conservé.
- [ ] Libellé « Nexora » et icône Nexora pour le fournisseur `vllm`. L'identifiant interne `vllm` est conservé, pour la compatibilité des workflows.
- [ ] Réutiliser le mécanisme existant de liste noire ou de filtrage des fournisseurs s'il existe (chercher `BLACKLISTED_PROVIDERS` ou un équivalent), plutôt que d'en créer un.

**Vérification** : tests verts ; dans le navigateur, le bloc Agent propose « Nexora › nexora-qwen » par défaut.

## Tâche 8 — Nexora Connect préconfiguré

**Fichiers** :
- `lib/nexora/connect.ts` (nouveau) : `ensureNexoraConnectServer(workspaceId)` crée la ligne du serveur MCP si `NEXORA_CONNECT_MCP_URL` est définie ;
- le point d'appel à la création d'un workspace ;
- `.env.example`.

- [ ] Test :
  - la création d'un workspace avec la variable insère un seul serveur « Nexora Connect » (idempotence : un second appel n'en crée pas de nouveau) ;
  - sans la variable, rien n'est inséré.
- [ ] Le jeton (`NEXORA_CONNECT_TOKEN`) est stocké comme en-tête, par le même chemin que la création manuelle d'un serveur MCP, chiffrement compris.
- [ ] Hôte ajouté par défaut à la liste d'autorisation des sorties réseau (`EGRESS_ALLOWED_HOSTS`) dans le compose.

**Vérification** : tests verts ; dans le navigateur, un nouveau workspace liste « Nexora Connect » et ses 5 outils.

## Tâche 9 — Gouvernance : SSO OIDC, journal d'audit, consommation

- [ ] 9.1 SSO OIDC :
  - examiner ce que fait notre remplacement `ee/sso` et ce que le cœur attend ;
  - activer le plugin `genericOAuth` de Better Auth (ou l'équivalent du cœur) depuis `NEXORA_OIDC_ISSUER`, `NEXORA_OIDC_CLIENT_ID`, `NEXORA_OIDC_CLIENT_SECRET` et `NEXORA_OIDC_NAME` ;
  - bouton « Se connecter avec <nom> » sur la page de connexion ;
  - test unitaire de la configuration.
  - Test réel facultatif avec Keycloak en conteneur (`quay.io/keycloak/keycloak`, arm64 disponible) si le temps le permet : à consigner.
- [ ] 9.2 Journal d'audit :
  - remplacer le composant `AuditLogs` (`ee/audit-logs/components/audit-logs`), aujourd'hui un bouchon, par une vraie page ;
  - elle lit les événements enregistrés par le cœur (table d'audit de `@sim/audit` : vérifier le schéma Drizzle) via une route API protégée réservée aux administrateurs ;
  - filtres par type et par date, pagination ;
  - tests de la route : autorisation et pagination.
- [ ] 9.3 Consommation :
  - remplacer `UsageMonitoring` par une page qui appelle `GET {VLLM_BASE_URL sans /v1}/v1/me/usage` côté serveur, avec la clé `VLLM_API_KEY` ;
  - elle affiche les jetons en entrée et en sortie et les requêtes par modèle et par jour ;
  - tests avec `fetch` simulé.

**Vérification** : tests verts ; les pages s'affichent dans le navigateur avec des données réelles.

## Tâche 10 — Modèles de workflows PME

**Fichiers** : `apps/sim/lib/nexora/templates/{devis,relance-facture,support-faq,tri-emails,compte-rendu}.json`, `lib/nexora/templates/index.ts`, et le point d'exposition (galerie de modèles du cœur s'il en existe une ; sinon dossier « Modèles PME » créé à la création d'un workspace, en réutilisant le chemin d'import de workflow du cœur).

- [ ] Explorer comment Sim importe un workflow (format JSON d'export) et s'il a une galerie de modèles. Consigner la décision.
- [ ] Test : chaque modèle est validé par le schéma d'import du cœur ; le seed est idempotent.
- [ ] Contenu (français, vouvoiement, modèle Nexora par défaut) :
  1. **Devis** : entrée (client, prestations) → Agent → devis structuré HT/TVA/TTC.
  2. **Relance de facture** : entrée (client, n° de facture, montant, échéance, niveau de relance) → Agent → e-mail de relance au ton adapté au niveau.
  3. **Support FAQ** : entrée (question, FAQ en texte) → Agent → réponse ou escalade.
  4. **Tri d'e-mails** : entrée (e-mail) → Agent (classification JSON : catégorie, urgence, résumé) → Condition → deux sorties.
  5. **Compte rendu de réunion** : entrée (transcription) → Agent → compte rendu (décisions, actions, responsables, échéances).

**Vérification** : tests verts ; les 5 modèles s'exécutent dans le navigateur ou par l'API (à consigner).

## Tâche 11 — Services : Nexora API et Nexora Connect

- [ ] 11.1 Nexora API (`services/nexora-api`) :
  - Dockerfile multi-architecture, sans le playground (cf. test réel) ;
  - `config.example.yml` avec un modèle `nexora-default` derrière le connecteur `openai` (URL et clé par variables d'environnement) ;
  - marque : titre OpenAPI « Nexora API », textes Etalab ou Albert retirés de l'interface et des docs servies ;
  - test : `pytest` sur les tests existants qui touchent la configuration, s'ils tournent sans services ; sinon, test de fumée HTTP en tâche 13.
- [ ] 11.2 Nexora Connect (`services/nexora-connect`) :
  - repérer et désactiver tout appel vers les services d'OOMOL (télémétrie, registre distant, OAuth hébergé) ;
  - chiffrement obligatoire (clé par variable, refus de démarrer sans elle) ;
  - marque Nexora dans les textes servis ;
  - tests du projet verts.
- [ ] `check-brand.sh` étendu à `services/`.

**Vérification** : les tests des deux services passent ; `check-brand.sh` sort avec 0.

## Tâche 12 — Déploiement en une commande

**Fichiers** : `deploy/compose.yml`, `deploy/.env.example`, `deploy/nexora-api/config.yml.tmpl`, `scripts/init-env.sh`, Dockerfiles de WorkStudio (reprise de `workstudio/docker/*.Dockerfile`), `.github/workflows/images.yml` (buildx amd64+arm64, **non exécuté localement**).

- [ ] `init-env.sh` :
  - génère `deploy/.env` (chmod 600) avec des secrets aléatoires : `BETTER_AUTH_SECRET`, `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`, mots de passe Postgres, clé maîtresse de Nexora API, clé de chiffrement de Nexora Connect ;
  - ne réécrit jamais un `.env` existant ;
  - test : deux exécutions de suite ne changent pas le fichier.
- [ ] Compose :
  - services `workstudio`, `workstudio-realtime`, `workstudio-migrations`, `postgres` (pgvector), `redis`, `nexora-api` (avec son propre Postgres ou une base dédiée, et son Redis), `nexora-connect` ;
  - réseau unique, noms de services uniques, `healthcheck`s, `depends_on: condition` ;
  - ports `127.0.0.1:3000` (WorkStudio), `127.0.0.1:8000` (API) et `127.0.0.1:8400` (Connect) ;
  - fournisseur de modèles amont configurable (`NEXORA_UPSTREAM_URL`, `NEXORA_UPSTREAM_MODEL`, `NEXORA_UPSTREAM_KEY`) : par défaut l'Ollama de l'hôte via `host.docker.internal`.
- [ ] Après la création de la clé de Nexora API, `VLLM_API_KEY` de WorkStudio doit être renseignée automatiquement par un service `nexora-bootstrap` éphémère ou un script `scripts/bootstrap.sh`. Consigner le choix.
- [ ] Construire les images arm64 en local, en surveillant le disque.
- [ ] Arrêter les conteneurs `spike-*` du test **seulement si** les ports entrent en conflit ou si le disque manque. Ce sont des conteneurs de ce travail ; le relais TCP 18141 est conservé tant qu'il est utile.

**Vérification** : `docker compose -f deploy/compose.yml up -d` ; tous les services sont `healthy` ; WorkStudio répond sur 127.0.0.1:3000.

## Tâche 13 — Fumée de bout en bout

**Fichier** : `scripts/smoke.sh` (bash + curl + jq), et éventuellement `scripts/smoke/*.ts` si des appels API complexes sont nécessaires.

- [ ] Vérifications :
  1. inscription d'un compte de test par l'API Better Auth (identifiants générés, non affichés) ;
  2. `GET /` renvoie `lang="fr"` et un texte français connu ;
  3. création d'un workflow Agent (import du modèle « Devis »), déploiement, exécution par clé d'API : réponse non vide, servie par le modèle Nexora ;
  4. l'API MCP du workspace liste les outils de Nexora Connect ;
  5. `GET /v1/me/usage` sur Nexora API, avec un nombre de jetons > 0 après l'exécution ;
  6. les 5 modèles PME s'exécutent : sortie non vide pour chacun.
- [ ] Sortie avec 0 si tout passe, tableau récapitulatif.

**Vérification** : `scripts/smoke.sh` sort avec 0 ; sortie consignée dans le ledger.

## Tâche 14 — Documentation

- [ ] `README.md` racine, en français : ce qu'est Nexora WorkStudio, l'architecture, le démarrage rapide (3 commandes), les licences et la provenance.
- [ ] `docs/guide/installation.md` : prérequis, `init-env.sh`, choix du modèle amont, compose, premier compte, SSO OIDC, mise à jour, sauvegarde.
- [ ] `docs/guide/README.md` : index du guide (cible de `docsUrl`).
- [ ] `workstudio/CLAUDE.md` et `AGENTS.md` : ajouter en tête les règles Nexora (pas d'`ee/` d'origine, i18n obligatoire, marque).

## Tâche 15 — Vérification finale et revue

- [ ] Lancer l'un après l'autre : `check-no-ee.sh`, `check-brand.sh`, `check-licenses.sh`, `check-i18n.sh`, `tsc`, les tests unitaires des fichiers modifiés (`git diff --name-only main...workstudio-v1`), `compose up`, puis `smoke.sh`.
- [ ] `superpowers:requesting-code-review` sur la branche ; traiter les retours.
- [ ] Mettre à jour le ledger avec les preuves ; mettre à jour la mémoire du projet.
- [ ] Fusionner `workstudio-v1` dans `main` en local (fast-forward ou merge). **Pas de push.**
- [ ] Seulement alors : émettre la promesse de fin de boucle.
