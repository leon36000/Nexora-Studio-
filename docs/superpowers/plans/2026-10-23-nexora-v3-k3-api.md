# K3 « Clés d'API, API compatible OpenAI, bouton « Code », SDK » — plan d'exécution

> **Pour les agents :** sous-compétence requise : superpowers:executing-plans (exécution par l'architecte lui-même). Les étapes se cochent (`- [x]`) au fil de l'eau.

**But :** un développeur crée une clé dans Réglages › Clés API, puis appelle les modèles **et les agents publiés** de Nexora avec n'importe quel client OpenAI (Python, TS, cURL, n8n, LibreChat), sous l'adresse de l'instance ; la clé est gouvernée (modèles autorisés, plafond mensuel, débit, expiration, révocation) et sa consommation est visible.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` §3 (SDK dans le dépôt, non publié ; API sous l'adresse existante, derrière Caddy, sans nouveau sous-domaine) ; analyse d'écart `docs/recherche/ecart-mistral-studio-v2.md` §3.2 K3 (« Terminé quand ») et matrice §1.13–1.14.

## Architecture retenue

```
client OpenAI ──HTTPS──> Caddy <domaine>/v1/* ──> WorkStudio (réécriture Next /v1/* → /api/nexora/v1/*)
                                                     │  passerelle : clé Nexora (table nexora_api_key),
                                                     │  modèles autorisés, débit, plafond, budget, usage
                                                     ├─ model: "<modèle>"  ──> Nexora API (clé de WorkStudio)
                                                     └─ model: "agent:<nom|id>" ──> exécution de la version
                                                        déployée de l'agent (journal d'exécution, ledger)
```

- **Passerelle dans WorkStudio** (`lib/nexora/developer-api/`, routes `app/api/nexora/v1/**`), Nexora API reste un service interne : elle ne voit que la clé de WorkStudio. Les clés des développeurs sont propres à WorkStudio (`sk-nexora-…`, hachées en SHA-256, jamais stockées en clair) : elles ne valent rien sur Nexora API en direct, donc aucune règle (modèles, plafond, débit) ne peut être contournée par `api.<domaine>` ou le port 8000.
- **Deux portées** : clé d'**espace** (créée par un membre « Modifier » ou « Admin » de l'espace ; modèles + agents publiés de cet espace) et clé d'**instance** (créée par un administrateur de l'instance ; modèles seulement). Aucune n'est liée à une personne : ce sont des clés de **compte de service** (le créateur est seulement journalisé ; elles survivent à son départ).
- **Agents** : `agent:<nom>` ou `agent:<id du workflow>` ; agent publié = workflow déployé du dossier « Agents » de l'espace de la clé ; exécuté par la **version déployée** (`preprocessExecution` + `executeWorkflow`, déclencheur `api`), donc compté dans le journal d'exécution, le ledger de consommation et les budgets de l'espace ; flux converti au format `chat.completion.chunk`.
- **Usage par clé** : table `nexora_api_key_usage` (jour local de l'instance × modèle : requêtes, jetons), écrite par la passerelle à la fin de chaque appel (jetons lus dans la réponse de Nexora API ou dans le résultat de l'exécution de l'agent).

## Décisions (prises pour le fondateur) et leur coût

| # | Décision | Pourquoi | Coût si faux |
|---|---|---|---|
| D1 | Base URL **`<adresse de l'instance>/v1`** (réécriture Next `/v1/:path*` → `/api/nexora/v1/:path*`, donc identique avec ou sans Caddy ; Caddy route `/v1/*` sans compression ni tampon pour le flux). | C'est la forme attendue par tous les clients OpenAI (`https://api.openai.com/v1`) ; pas de collision : l'API de WorkStudio est sous `/api/v1`, aucune page n'existe sous `/v1`. Aucun nouveau sous-domaine (spec §3). | Un futur besoin d'une page `/v1/...` dans WorkStudio devra choisir un autre chemin. |
| D2 | Passerelle dans WorkStudio, clés propres à WorkStudio (pas de clé Nexora API par développeur). | Les agents ne peuvent être exécutés que par WorkStudio ; un seul point de contrôle ; aucune modification de Nexora API (fork amont) ; pas de contournement possible. | Les appels passent par Node (≈ 1 à 5 ms de plus) ; `api.<domaine>` reste l'accès direct historique à Nexora API, réservé à ses propres clés (créées par curl). |
| D3 | Clé d'espace : création et révocation par les membres « Modifier » ou « Admin » ; liste visible de tous les membres ; clé d'instance : administrateurs de l'instance seulement. Contrôlé côté serveur (opérations d'application). | Une clé ne donne jamais plus que ce que son créateur peut faire (exécuter les agents = écrire) ; révoquer une clé fuitée doit être facile. | Un membre « Modifier » peut créer des clés : un administrateur peut retirer « Gérer les clés API » par un groupe d'accès (capacité `api_keys.manage`), la révocation n'en dépend jamais. |
| D4 | Les clés d'instance n'appellent pas les agents (403 en français). | Un agent appartient à un espace ; une clé d'instance n'en a pas. | Il faut une clé par espace pour ses agents. |
| D5 | Modèles autorisés = liste de noms Nexora API (alias compris : `nexora-default` suit le modèle par défaut) ; `null` = tous. Interrupteur « Agents publiés » séparé (par défaut : oui). Requête refusée ⇒ **403** `model_not_allowed`. | Lisible dans l'interface ; un alias autorisé reste valable quand l'administrateur change le défaut. | Un modèle ajouté plus tard n'est pas ouvert aux clés restreintes (voulu). |
| D6 | Débit par clé : requêtes/minute (60 par défaut, 1 à 6 000), seau à jetons Redis du cœur ; **429** `rate_limit_exceeded` en français + en-têtes `x-ratelimit-*`. Plafond mensuel en jetons (facultatif), mois civil du fuseau de l'instance ; atteint ⇒ **429** `monthly_cap_reached` (code « insufficient_quota » côté OpenAI). | Même mois que les budgets J8 ; 429 est ce que les clients OpenAI savent attendre. | Le plafond est vérifié avant l'appel : un appel en cours peut le dépasser d'une réponse (comme les budgets). |
| D7 | Budgets J8 : les appels directs de modèles d'une clé d'espace comptent dans le budget de l'espace et de l'instance (ceux d'une clé d'instance dans celui de l'instance) ; une clé d'espace est refusée en **402** une fois le budget de son espace ou de l'instance atteint ; une clé d'instance ne répond qu'à son propre plafond (elle est créée par un administrateur). Les agents passent déjà par la garde d'exécution. | Sinon une clé contournerait les budgets. | Une clé d'instance sans plafond peut dépasser le budget de l'instance : l'administrateur lui donne un plafond. |
| D8 | Clé expirée ou révoquée ⇒ **401** avec un message français distinct (`expired_api_key`, `revoked_api_key`) ; la révocation est une suppression logique (`revoked_at`) gardée pour l'historique et la consommation. | Critère K3 ; l'administrateur comprend pourquoi un outil a cessé de marcher. | La table garde les clés révoquées (quelques lignes). |
| D9 | Agent : l'entrée de l'agent est le dernier message `user` ; les échanges précédents de la requête lui sont donnés en tête (« Échanges précédents »), les messages `system` de l'appelant sont ignorés (les instructions de l'agent font foi) ; contenu texte seulement (image ⇒ 400) ; mémoire de l'agent : une conversation neuve par requête. | Les clients OpenAI sont sans état et renvoient tout l'historique ; un appelant ne doit pas réécrire les consignes d'un agent publié. | Pas de pièces jointes vers les agents par l'API en K3. |
| D10 | Points d'accès : `GET /v1/models`, `GET /v1/models/{id}`, `POST /v1/chat/completions` (flux ou non), `POST /v1/embeddings`, `POST /v1/audio/transcriptions`, `GET /v1/openapi.json` (public). Le reste ⇒ 404 en français au format OpenAI. | Couvre n8n, LibreChat, les SDK `openai` et les bases de connaissances externes. | OCR, rerank et lots (K13) restent sur Nexora API en interne. |
| D11 | SDK : Python → paquet `nexora-sdk`, module `nexora` (le module `simstudio` reste) ; TypeScript → description, auteur, dépôt Nexora, `private: true` ; classes `NexoraClient`/`NexoraError` (anciens noms gardés comme alias), en-tête `User-Agent` Nexora, adresse par défaut `http://localhost:3000`, non publiés ; exemples `openai` officiels dans `docs/exemples/api-openai/`. **Le nom npm `simstudio-ts-sdk` est gardé** : le changer modifie `bun.lock`, que K2 modifie en même temps (correctif Next.js). | Spec §3 ; compatibilité ; pas de conflit de verrou. | Renommer le paquet npm (et rafraîchir `bun.lock`) au moment de la publication. |
| D12 | Page **Développeurs** : page d'espace `/workspace/<id>/developpeurs` (entrée de la barre latérale), pas une section de Réglages ; bouton « Code » dans le Playground et sur chaque agent. | Évite de toucher le registre des Réglages (travaux K1/K2 en parallèle) ; un développeur y arrive en un clic. | Rien. |

## Contraintes globales

- Pas de code `ee/` d'origine ; tout texte visible passe par next-intl (nouvel espace de noms `developers`) ; marque Nexora ; `check-i18n`, `check-brand`, `check-no-ee`, `check-licenses` verts.
- Jamais de valeur de clé dans les journaux, l'audit, la base (empreinte SHA-256 seulement) ni l'affichage après la création.
- Fichiers des jalons parallèles évités : K1 (`lib/nexora/model-admin.ts`, `wand.ts`, flux du Playground, fournisseurs, Réglages › Modèles), K2 (`packages/emcn`, messages existants, `package.json`/`bun.lock`). Le Playground n'est touché que pour le bouton « Code », après relecture.
- Ne pas redémarrer les conteneurs de production ; essais sur un `next dev` à soi (127.0.0.1:3212).

## Revue (points d'attention)

- Clé inconnue, expirée, révoquée, d'un espace supprimé ⇒ 401 ; jamais 500.
- Clé d'espace A ⇒ jamais un agent de l'espace B (même par identifiant).
- Flux : le client `openai` reçoit des `chat.completion.chunk` valides puis `[DONE]` ; une erreur en cours de flux arrive en `event: error` ; l'usage est enregistré même si le client coupe.
- Nexora API injoignable ⇒ 503 en français, rien d'enregistré.
- Le plafond et le débit ne sont pas contournables par un alias ou une casse différente du nom de modèle.

---

### Task 1 : Schéma et migration

**Files :** `packages/db/schema.ts` (tables `nexora_api_key`, `nexora_api_key_usage`), `packages/db/migrations/0440_nexora_api_keys.sql` (+ journal), maquette de schéma des tests.
- [x] **Step 1 :** Tables (portée `workspace|instance` avec contrainte de cohérence, `key_hash` unique, `allowed_models` jsonb, `allow_agents`, `monthly_token_cap`, `requests_per_minute`, `expires_at`, `revoked_at`, `last_used_at` ; usage : clé × jour × modèle).
- [x] **Step 2 :** `drizzle-kit generate`, relecture `db-migrate` (tables neuves ⇒ sûres), `generate-schema-mock`, `check:migrations`, nouveau `generate` sans fichier.

### Task 2 : Politique des clés (TDD)

**Files :** `lib/nexora/developer-api/keys.ts`, `policy.ts` (+ `policy.test.ts`).
- [x] **Step 1 : Tests rouges** (modes de défaillance d'abord) : en-tête absent / mal formé / clé inconnue ⇒ `invalid_api_key` ; expirée ⇒ `expired_api_key` (date en français) ; révoquée ⇒ `revoked_api_key` ; modèle hors liste ⇒ `model_not_allowed`, y compris par alias, casse ou espaces ; alias autorisé (`nexora-default`) qui suit le routeur ; liste `null` ⇒ tout ; agent avec clé d'instance ⇒ `agent_needs_workspace_key` ; agents désactivés ⇒ `model_not_allowed` ; plafond atteint ⇒ `monthly_cap_reached`.
- [x] **Step 2 :** Implémenter (génération `sk-nexora-` + 40 caractères aléatoires, empreinte, suffixe affiché) ; tests verts.

### Task 3 : Gestion des clés (opérations, use cases, contrats, routes, audit)

**Files :** `lib/nexora/developer-api/application/{operations,use-cases}.ts`, `lib/nexora/developer-api/repository.ts`, `lib/api/contracts/nexora-api-keys.ts`, `app/api/nexora/api-keys/route.ts`, `app/api/nexora/api-keys/[keyId]/route.ts`, `app/api/nexora/api-keys/instance/route.ts`, `app/api/nexora/api-keys/instance/[keyId]/route.ts`, `hooks/queries/nexora-api-keys.ts`.
- [x] **Step 1 :** Opérations : espace `nexora_api_keys.workspace.{list(read),create(write),revoke(write)}` ; instance `organization.nexora_api_keys.{list,create,revoke}` (admins). Audit `api_key.created` / `api_key.revoked` (métadonnées `keyType: 'nexora_api'`, portée, jamais la valeur).
- [x] **Step 2 :** Liste avec usage du mois, plafond, débit, statut, modèles autorisés ; création ⇒ valeur renvoyée **une seule fois**.
- [x] **Step 3 :** Tests de routes (lecteur ⇒ 403 à la création ; non-admin ⇒ 403 sur l'instance ; révocation d'une clé d'un autre espace ⇒ 404).

### Task 4 : Passerelle compatible OpenAI (modèles)

**Files :** `lib/nexora/developer-api/{gateway,errors,upstream,usage,sse}.ts` (+ tests de la conversion SSE et de l'enregistrement d'usage), `lib/api/contracts/nexora-openai.ts`, routes `app/api/nexora/v1/{models,models/[model],chat/completions,embeddings,audio/transcriptions,openapi.json,[...path]}/route.ts`, réécriture dans `next.config.ts`.
- [x] **Step 1 : Tests rouges** : lecture de l'usage dans un flux Nexora (bloc `usage` final, flux coupé, lignes partielles) ; erreurs au format OpenAI.
- [x] **Step 2 :** Authentification ⇒ débit ⇒ plafond ⇒ budget ⇒ modèle autorisé ⇒ relais (flux tel quel, usage enregistré à la fin), `lastUsedAt`.
- [x] **Step 3 :** `/v1/models` filtré par la clé (+ agents de l'espace) ; OpenAPI.

### Task 5 : Agents au format OpenAI

**Files :** `lib/nexora/developer-api/agents.ts` (+ tests de la conversion messages ⇒ entrée et du flux Sim ⇒ `chat.completion.chunk`).
- [x] **Step 1 : Tests rouges** : dernier message utilisateur, historique en tête, `system` ignoré, image ⇒ 400 ; trames Sim `chunk` ⇒ `delta.content`, `final` ⇒ `finish_reason: stop` + usage, `error` ⇒ `event: error` ; non-flux ⇒ `chat.completion`.
- [x] **Step 2 :** Résolution `agent:<nom|id>` dans l'espace de la clé (nom ambigu ⇒ 409), exécution de la version déployée (déclencheur `api`, principal `system/public_api`), usage enregistré (`agent:<nom>`).

### Task 6 : Consommation et budgets

**Files :** `lib/nexora/consumption/{report.ts,budgets.ts}`, contrat `nexora-consumption.ts`, Réglages › Consommation (tableau « Par clé d'API »).
- [x] **Step 1 :** Rapport : par clé (portée, espace, requêtes, jetons modèles / agents) sur la période ; budgets : jetons des appels directs ajoutés au mois de l'espace et de l'instance.
- [x] **Step 2 :** Tests (agrégat par clé ; un appel direct compte dans le budget, un appel d'agent une seule fois).

### Task 7 : Réglages › Clés API unifiés

**Files :** `app/workspace/[workspaceId]/settings/components/nexora-api-keys/*`, insertion dans `api-keys.tsx`, messages `developers`.
- [x] **Step 1 :** Section « Nexora API — modèles et agents » (clés d'espace, et clés d'instance pour les administrateurs) : nom, portée, expiration, modèles autorisés, agents, plafond mensuel, débit ; usage du mois et barre du plafond ; valeur affichée une fois (copier) ; révocation confirmée.

### Task 8 : Page Développeurs et bouton « Code »

**Files :** `lib/nexora/developer-api/snippets.ts`, `app/workspace/[workspaceId]/developpeurs/*`, `components/nexora/code-snippets-modal.tsx` (ou équivalent), barre latérale, Playground (bouton), page d'agent (bouton).
- [x] **Step 1 :** Extraits Python (`openai`), TypeScript (`openai`), cURL, n8n avec la vraie adresse et le vrai identifiant de modèle (clé en variable `NEXORA_API_KEY`).
- [x] **Step 2 :** Page : adresse de base, authentification, modèles et agents disponibles, exemples, lien OpenAPI, SDK du dépôt.

### Task 9 : Caddy, SDK, exemples, guides

**Files :** `deploy/caddy/Caddyfile` (+ test de déploiement), `workstudio/packages/{ts-sdk,python-sdk}`, `docs/exemples/api-openai/`, `docs/guide/api-developpeurs.md`, `docs/guide/{README.md,nexora-api.md}`, `README.md`.
- [x] **Step 1 :** Caddy : `/v1/*` sans compression, `flush_interval -1`.
- [x] **Step 2 :** SDK rebaptisés Nexora (noms, README, classes, adresse par défaut), tests du SDK verts.
- [x] **Step 3 :** Guide développeur et liens.

### Task 10 : Fumée « API développeur »

**Files :** `scripts/smoke.py`.
- [x] **Step 1 :** Clé créée par la route de l'interface ⇒ `nexora-default` (forme officielle, flux) ⇒ agent publié (Assistant général) ⇒ modèle refusé ⇒ 403 ⇒ révocation ⇒ 401 ⇒ consommation de la clé visible par l'administrateur.

### Task 11 : Vérification

- [x] biome ; `bun run type-check` ; `check:audits` ; `check:test-types` ; `check:api-validation:strict` ; `check:migrations` + `drizzle-kit generate` sans fichier ; vitest ciblé ; `scripts/tests/test-*.sh` ; `check-i18n/brand/no-ee/licenses`.
- [x] Preuve en direct (next dev 127.0.0.1:3212, `cloud-glm-5-3`) avec le client `openai` Python officiel : `nexora-default` en flux, un agent en flux, 401 (révoquée, expirée), 403, consommation visible ; fumée « API développeur ».
- [x] Reste à vérifier par la session principale après déploiement (consigné dans le rapport).

## Preuves (23/10/2026, architecte K3)

- Migration `0440_nexora_api_keys` appliquée sur la base de la pile pc6 (tables neuves, additives ; journalisée, le déploiement ne la rejouera pas).
- `next dev` à soi sur 127.0.0.1:3212 (base, Redis et Nexora API de la pile, modèle par défaut `cloud-glm-5-3`), client `openai` officiel 3.37 (Python) — `scratchpad/k3/live-1.json` :
  - clé créée par la route de l'interface, valeur jamais renvoyée par la liste ;
  - `/v1/models` : modèles de l'instance + `agent:Assistant général`, `agent:Agent tarifs` ;
  - `nexora-default` en flux (≈ 68 évènements relayés tels quels, usage final 19 + 13 jetons) ;
  - agent « Assistant général » en flux (`chat.completion.chunk` puis usage 354 + 39) et sans flux par `agent:<identifiant>` ;
  - un agent dont l'outil MCP est en panne renvoie l'erreur au format OpenAI dans le flux (`agent_failed`), comme sa route de chat ;
  - 403 `model_not_allowed` (modèle hors liste, agents désactivés), 403 `agent_needs_workspace_key` (clé d'instance) ;
  - 401 `revoked_api_key`, `expired_api_key` (« Clé d’API expirée le 24 octobre 2026 », heure de Paris), `invalid_api_key` ;
  - débit : clé à 2 req/min ⇒ 200, 200, 429 `rate_limit_exceeded` avec `Retry-After` et `x-ratelimit-*` ;
  - Réglages › Consommation : ligne de la clé (3 requêtes, 32 jetons de modèles, 743 jetons d'agents), usage du mois sur la clé ;
  - `/v1/openapi.json` public avec l'adresse réelle ; `/v1/files` ⇒ 404 `unknown_endpoint` ;
  - pages `/developpeurs`, Réglages › Clés API, Playground, Réglages › Consommation rendues (200) sans erreur de message.
- Fumée « API développeur » contre ce serveur : 3/3 (`scratchpad/k3/smoke-k3-2.json`).
- Vérifications : biome (fichiers K3) propre ; `bun run type-check` (racine) vert ; `check:test-types` vert ; `check:api-validation:strict`, `check:route-verbs`, `check:utils`, `check:tool-registry-boundary` verts ; `check:audits` rouge seulement sur `check:unused-exports` dû aux travaux K2 en cours (`EMCN_DEFAULT_LABELS`, `workflow-renderer`, `CAPABILITY_IDS`) ; migration : lint `check-migrations-safety --dir` vert, `drizzle-kit generate` sans nouveau fichier ; vitest K3 (developer-api, consommation, messages, clés, réglages) 134/134, SDK TS 12/12, SDK Python 42/42 ; Nexora API (non modifiée) pytest 617 + ruff OK ; `scripts/tests/test-*.sh` tous verts (dont Caddyfile validé par `caddy validate`) ; `check-i18n/brand/no-ee/licenses` OK.

## Reste pour la session principale (après déploiement)

- Reconstruire et redémarrer `nexora-workstudio` (le Caddyfile ne change que pour le profil « https » : recharger Caddy là où il tourne).
- Rejouer la fumée complète (dont « API développeur ») sur :3200 avec GLM 5.3, puis `qwen2.5:7b`.
- Parcours au navigateur : Réglages › Clés API (création, valeur affichée une fois, révocation), page Développeurs, bouton « Code » du Playground et d'un agent, tableau « Par clé d'API » de Réglages › Consommation.
- Brancher un nœud OpenAI de n8n (ou LibreChat) sur `http://<pc6>:3200/v1` : critère K3 non vérifiable ici (aucun n8n/LibreChat sur pc6).
- Si K1 n'a pas réenregistré la base de `check:tool-registry-boundary`, la croissance du Playground vient surtout de K1 (+81 modules) ; K3 n'ajoute que le bouton « Code ».
