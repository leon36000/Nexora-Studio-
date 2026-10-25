# K14 — Gouvernance avancée et garde-fous — Plan d'implémentation

> **Pour les agents :** sous-compétence requise : `superpowers:executing-plans` (exécution en ligne, par la session qui a écrit ce plan). Les étapes utilisent des cases `- [ ]`, cochées au fur et à mesure.

**Objectif :** une instance Nexora sait détecter les données personnelles en local (service PII sur CPU), empêcher qu'elles partent vers un modèle « Hors instance » (masquées ou refusées, réglage par espace), limiter les modèles par groupe d'accès, exporter son journal d'audit vers un tableur français, et — si c'est praticable sur CPU — modérer les demandes avec un modèle local sous licence ouverte.

**Architecture :**
- **Service PII** : le service Presidio du cœur (`workstudio/apps/pii`, `docker/pii.Dockerfile`, déjà appelé par le bloc Garde-fous via `PII_URL` mais absent de Compose) est allégé (modèles de langue réglables par variable, français + anglais au lieu de cinq langues et 2,2 Go), enrichi de reconnaisseurs français (numéro de sécurité sociale, téléphones français) et ajouté à Compose sous le profil `pii`. Aucune donnée ne le quitte.
- **Barrière de sortie des données** (`lib/nexora/data-protection/`) : une politique par espace (`allow` / `mask` / `refuse`, valeur d'instance par défaut) gardée dans les métadonnées de l'organisation d'instance (comme `nexoraBudgets`, sans migration). Un module unique décide si un modèle est « Hors instance » (fiche de modèle K1 + alias résolus), masque (motifs de K8 puis service PII) ou refuse, et note ce qu'il a fait. Il est branché aux trois seuls points par où une conversation part vers un modèle : `prepareConversationGeneration` (agents, Assistant, workflows, évaluations d'agent), `wand.ts` (Playground, Copilote, « Générer avec l'IA », juge et cibles des campagnes K10) et le relais de la passerelle K3.
- **Traces K8** : attribut `dataProtection` sur le span modèle (appels directs) et note par exécution (agents) affichés dans l'écran Traces ; le masquage des traces ajoute le service PII (noms) après les motifs, quand il est configuré.
- **Groupes d'accès** : le champ `deniedModels` (déjà appliqué dans les blocs et la passerelle K3) reçoit enfin son sélecteur dans la fenêtre d'un groupe, la résolution des alias (`nexora-default` désigne GLM 5.3) dans le garde des blocs, et le garde du Playground, de « Générer » et du Copilote.
- **Journal d'audit** : export CSV pour tableur français (`;`, virgule décimale, BOM, dates locales, en-têtes et actions en français).

**Pile technique :** Python 3.12 (Presidio 2.2.362, spaCy 3.8, FastAPI, pytest, ruff), TypeScript (Next.js, vitest, next-intl, React Query), Compose.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` §3 (un modèle hors instance est toujours signalé ; SAML hors périmètre) et `docs/recherche/ecart-mistral-studio-v2.md` §3.2 K14 (contenu et « Terminé quand », contraignants), matrice §1.13 et §1.16.

## Contraintes globales

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee.sh` vert. Les fichiers de `apps/sim/ee/` touchés sont des remplacements Nexora (en-tête « Nexora clean-room replacement »).
- Tout texte visible passe par next-intl (`messages/{fr,en}/…`) ; `check-i18n.sh` vert ; marque « Nexora » (`check-brand.sh`). Le français est écrit à la main, jamais traduit à l'aveugle.
- Licences : Presidio (MIT), spaCy (MIT), `en_core_web_sm` (MIT) ; `fr_core_news_sm` est sous **LGPL-LR** (non permissive) : téléchargé à la construction, jamais versionné, argument de construction pour s'en passer, noté dans `THIRD_PARTY_NOTICES.md`. Modération : Granite Guardian (Apache-2.0). `check-licenses.sh` vert.
- Rien ne sort de l'instance : le service PII et la modération tournent dans le réseau interne de Compose ; aucune télémétrie.
- Matériel visé : 8 cœurs, 32 Go ; poids et mémoire du service PII mesurés et documentés.
- Toute modification de `deploy/` met à jour `scripts/tests/test-compose-env.sh` ; on lance `bash scripts/tests/test-*.sh`.
- Migration : **aucune attendue** (politique dans les métadonnées de l'organisation). Si elle devenait nécessaire : numéro **0450**, `when` supérieur à celui de la dernière entrée du journal de `main`, skill `db-migrate`.
- Chaque élément de groupe d'accès suit la skill `add-permission-group-item` (registre, règle de capacité, garde serveur, tests) ; ici aucune clé nouvelle n'est ajoutée (voir « Ruling » du ledger), mais le garde de `deniedModels` est complété et revalidé selon `validate-permission-group-item`.
- Protégé : règles `sim-api-contracts` (contrats dans `lib/api/contracts/`, `defineInternalJsonRoute`), `sim-ui-copy`, `sim-testing` ; `check:audits` (dont `check:permission-group-enforcement`), `check:test-types`, `check:api-validation:strict`, `check:migrations`.
- Environnement : on ne reconstruit ni ne redémarre `nexora-*` ; le service PII et tout changement de `deploy/` se testent dans des conteneurs jetables (autre nom de projet et port).
- Pas de `cd` ; fichiers temporaires dans `.nexora-work/` ; plus de 30 Go de disque libres.

## Points de vigilance (Review Focus)

1. **Un modèle local ne doit rien coûter ni rien changer** : avec une politique « masquer » ou « refuser », une conversation envoyée à `qwen2.5:7b` (Sur ce serveur) part intacte et sans appel au service PII. Test : garde avec fiche `local`.
2. **Alias et noms équivalents** : `nexora-default`, `vllm/cloud-glm-5-3`, `CLOUD-GLM-5-3` et un alias ajouté plus tard désignent le même modèle « Hors instance » ; un modèle introuvable dans la liste est traité comme hors instance (le plus prudent). Tests : localisation, garde de groupe.
3. **Service PII configuré mais muet** : la politique « masquer » ne laisse pas passer en silence — refus 503 en français ; sans `PII_URL`, les motifs seuls masquent (IBAN, e-mail, carte, téléphone, clés) et l'écran le dit. Tests : masquage, réglages.
4. **Boucle d'outils et flux** : la conversation entière est renvoyée à chaque tour (résultats d'outils compris) ; chaque tour est masqué, le même texte n'est analysé qu'une fois, la mémoire de l'agent garde l'original, un refus survient avant le premier octet. Tests : garde de charge utile, cache.
5. **Contenus en parties** (`content` en tableau avec images), messages d'outils, `null` : seul le texte est touché, la forme est conservée. Test : garde de messages.
6. **Texte français sans donnée personnelle** (« Paris », « 12 mars », « 1 000,50 € ») : jamais masqué par erreur (lieux et dates exclus de la liste). Test : motifs et entités demandées.
7. **Export CSV** : cellule commençant par `=`, guillemets, retours à la ligne, accents, nombres à virgule décimale, plus de 10 000 lignes (bloc tronqué annoncé). Test : générateur du CSV français.
8. **Groupe restreint et clé d'API / Playground** : le même refus 403 en français partout (bloc, passerelle, Playground, « Générer »). Tests de chaque porte.

---

## Tâche 1 : Service PII local — image allégée, reconnaisseurs français, mesure

**Fichiers :**
- Modifier : `workstudio/apps/pii/server.py` (modèles de langue lus dans `PII_SPACY_MODELS`, reconnaisseurs français, langue non servie ⇒ 422), `workstudio/apps/pii/requirements.txt` (`preshed==3.0.13` : la version 3.0.14 empêche tout modèle de se charger)
- Créer : `workstudio/apps/pii/french.py` (reconnaisseurs `FR_NIR`, carte, téléphone), `languages.py` (lecture de `PII_SPACY_MODELS`), `tests/test_french.py`, `tests/test_languages.py`, `tests/test_server.py`, `pyproject.toml` (config pytest et ruff), `workstudio/docker/pii-models.sha256`
- Modifier : `workstudio/docker/pii.Dockerfile` (modèles réglables, français + anglais par défaut)
- Créer : `workstudio/apps/pii/README.md` n'est **pas** créé : la doc va dans le guide (tâche 12).

**Interfaces :**
- Produit : le service écoute sur `:5001` avec `/health`, `/analyze`, `/anonymize`, `/redact`, `/redact_batch`, `/supportedentities` (contrat Presidio du cœur, inchangé) ; langues servies `fr` et `en` ; nouvelles entités `FR_NIR`.
- Variables : `PII_SPACY_MODELS` (`fr:fr_core_news_sm,en:en_core_web_sm` par défaut dans l'image Nexora ; l'ancien défaut à cinq langues reste celui du fichier hors image).

- [x] **Étape 1 : écrire les tests rouges** (`tests/test_french.py`, exécutés avec Presidio seul, sans modèle spaCy) : `FR_NIR` reconnu pour `1 84 12 76 451 089 46` (clé 46) et refusé quand la clé est fausse ; Corse `2A`/`2B` acceptés ; un numéro de téléphone français `06 12 34 56 78` et `+33 6 12 34 56 78` reconnus par `PHONE_NUMBER` ; `01 23 45 67 89 01 23 45 67` non reconnu.
- [x] **Étape 2 : voir les tests échouer** — `python -m pytest apps/pii/tests` dans un conteneur jetable `python:3.12-slim-bookworm` avec `presidio-analyzer==2.2.362` : module `french` absent.
- [x] **Étape 3 : implémenter** `FrNirRecognizer(PatternRecognizer)` (13 chiffres + clé de contrôle 97, Corse) et `french_recognizers(language) -> list[EntityRecognizer]` dans `french.py` ; `server.py` les enregistre pour `fr`, lit `PII_SPACY_MODELS`, n'enregistre les reconnaisseurs nationaux que pour les langues servies, et déclare `PhoneRecognizer(supported_regions=("FR", …))`.
- [x] **Étape 4 : tests verts** + `ruff check` et `ruff format --check` sur `apps/pii`.
- [x] **Étape 5 : construire l'image jetable** `nexora-k14-pii:test` (`docker build -f workstudio/docker/pii.Dockerfile`), mesurer : taille de l'image (`docker images`), mémoire résidente au repos et après 200 requêtes (`docker stats`), latence p50/p95 d'un `redact` et d'un `redact_batch` de 5 messages courts sur le CPU de pc6 ; `sm` retenu d'après les scores publiés par spaCy (entités nommées 0,81 contre 0,83 pour `md`, 43 Mo contre 15 Mo) ; consigner les chiffres dans le ledger.
- [x] **Étape 6 : preuve réelle** — conteneur jetable (port 5101) : `/analyze` d'un texte avec IBAN, e-mail, téléphone, nom et NIR renvoie les cinq entités ; `/redact` masque. Supprimer conteneur et image après la mesure.
- [x] **Étape 7 : commit** `feat(k14): service PII allégé (français + anglais), reconnaisseurs français`.

## Tâche 2 : Compose, installateur et variables

**Fichiers :**
- Modifier : `deploy/compose.yml` (service `pii`, profil `pii`, `PII_URL` de WorkStudio), `install.sh` (question « Activer la protection des données personnelles ? »), `scripts/tests/test-compose-env.sh`, `scripts/tests/test-install.sh`
- Modifier : `THIRD_PARTY_NOTICES.md` (Presidio, spaCy, modèles de langue, mention LGPL-LR)

**Interfaces :**
- Consomme : image de la tâche 1.
- Produit : `NEXORA_PII_URL` (vide par défaut ; `http://pii:5001` quand le profil est activé) lu par WorkStudio comme `PII_URL` ; `EGRESS_ALLOWED_HOSTS` inchangé (le client PII n'utilise pas la barrière de sortie des utilisateurs : adresse fixée par l'administrateur, comme `VLLM_BASE_URL`).

- [x] **Étape 1 : tests rouges** dans `test-compose-env.sh` : par défaut aucun service `pii` rendu et `PII_URL` vide ; avec `COMPOSE_PROFILES=pii` + `NEXORA_PII_URL=http://pii:5001` : service construit depuis `workstudio`, profil `pii`, pas de port publié, santé `/health`, mémoire plafonnée, `PII_URL` dans `workstudio`. Dans `test-install.sh` : réponse « oui » ajoute le profil et l'adresse, « non » les retire sans toucher aux autres profils.
- [x] **Étape 2 : voir échouer** — `bash scripts/tests/test-compose-env.sh scripts/tests/test-install.sh`.
- [x] **Étape 3 : implémenter** service `pii` (build `../workstudio`, `docker/pii.Dockerfile`, `restart: unless-stopped`, `mem_limit` d'après la mesure, `healthcheck` sur `/health` avec `start_period` généreux), variable `PII_URL: ${NEXORA_PII_URL:-}` dans `workstudio`, question d'installation sur le modèle de la voix.
- [x] **Étape 4 : tests verts** + `bash scripts/tests/test-*.sh`.
- [x] **Étape 5 : conteneurs jetables** — `docker compose -p k14pii … --profile pii up -d pii` sur un port libre avec un fichier d'environnement jetable, `/health` puis suppression (`down -v`), sans toucher au projet `nexora`.
- [x] **Étape 6 : commit** `feat(k14): profil compose « pii » et question d'installation`.

## Tâche 3 : Le bloc Garde-fous détecte un IBAN et un e-mail (en français)

**Fichiers :**
- Modifier : `workstudio/apps/sim/lib/guardrails/pii-entities.ts` (langue `fr` en tête, `FR_NIR`, entités par langue), `workstudio/apps/sim/blocks/blocks/guardrails.ts` (langue par défaut `fr`), `lib/guardrails/pii-entities.test.ts`, messages `blocks`/`settings` si un libellé change
- Tester : `workstudio/apps/sim/lib/guardrails/validate-pii.test.ts` (déjà là) + test de contrat du bloc

**Interfaces :**
- Produit : `PII_LANGUAGES` = `fr`, `en` ; `DEFAULT_PII_LANGUAGE` = `fr` ; `SUPPORTED_PII_ENTITIES.FR_NIR` ('Numéro de sécurité sociale (NIR)'). Les entités nationales es/it/pl/fi restent déclarées mais ne sont proposées que pour leur langue (inchangé), et l'image Nexora ne sert plus que `fr` et `en` : une langue non servie n'est plus proposée.

- [x] **Étape 1 : tests rouges** : `coercePiiLanguage('fr')` accepté, `'es'` refusé ; `PII_ENTITIES_BY_LANGUAGE.fr` contient `IBAN_CODE`, `EMAIL_ADDRESS`, `PERSON`, `PHONE_NUMBER`, `FR_NIR` et ni `US_SSN` ni `ES_NIF` ; le bloc propose `fr` par défaut.
- [x] **Étape 2 : voir échouer** — `bun run --cwd workstudio/apps/sim vitest run lib/guardrails`.
- [x] **Étape 3 : implémenter** ; vérifier que `ee/data-retention` et les contrats qui lisent `PII_LANGUAGE_CODES` suivent (recherche des consommateurs, tests existants mis à jour).
- [x] **Étape 4 : tests verts** (guardrails, data-retention, contrats).
- [ ] **Étape 5 : preuve réelle** : `next dev` sur 127.0.0.1:3220 avec `PII_URL` vers le conteneur jetable de la tâche 1 ; un workflow Garde-fous « Détection de données personnelles » (types IBAN_CODE, EMAIL_ADDRESS, mode bloquer) exécuté sur « Mon IBAN est FR76 3000 6000 0112 3456 7890 189, écrivez à marie@exemple.fr » ⇒ non validé, `detectedEntities` = IBAN_CODE + EMAIL_ADDRESS ; en mode masquer ⇒ texte masqué.
- [x] **Étape 6 : commit** `feat(k14): garde-fous en français (langue, NIR)`.

## Tâche 4 : Politique par espace — stockage, cas d'usage, contrat, route

**Fichiers :**
- Créer : `lib/nexora/data-protection/policy.ts` (types, analyse tolérante, fusion, politique effective), `lib/nexora/data-protection/application/operations.ts`, `application/use-cases.ts`, `lib/api/contracts/nexora-data-protection.ts`, `app/api/nexora/data-protection/route.ts`, `hooks/queries/nexora-data-protection.ts`
- Modifier : `packages/audit` (action `NEXORA_DATA_PROTECTION_UPDATED`), `lib/nexora/audit-labels.ts`
- Tests : `policy.test.ts`, `application/use-cases.test.ts`, `app/api/nexora/data-protection/route.test.ts`

**Interfaces :**
- Produit :
  - `type PersonalDataMode = 'allow' | 'mask' | 'refuse'`
  - `interface DataProtectionPolicy { defaultMode: PersonalDataMode; workspaceModes: Record<string, PersonalDataMode>; moderation: { enabled: boolean } }` (champ `moderation` ajouté en tâche 10)
  - `resolveMode(policy, workspaceId: string | null): PersonalDataMode` (espace sinon valeur d'instance ; sans espace, valeur d'instance)
  - `readDataProtection(organizationId): Promise<DataProtectionPolicy>` ; `updateDataProtection(organizationId, change)` sous verrou de ligne ; `loadPolicyCached(): Promise<DataProtectionPolicy>` (LRU 30 s, vidée à l'écriture dans le processus)
  - Route `GET|PUT /api/nexora/data-protection` réservée aux administrateurs de l'instance, réponse : politique + espaces (id, nom) + état du service (`piiConfigured`, `piiReachable`).

- [x] **Étape 1 : tests rouges** : analyse tolérante (valeur inconnue ⇒ `allow`, espace supprimé ignoré, JSON absurde ⇒ défauts) ; `resolveMode` (espace prioritaire, `null` ⇒ instance) ; fusion qui laisse `nexoraBudgets` intact ; cas d'usage : membre simple refusé, espace inconnu ⇒ 422 « validation », audit écrit avec l'ancienne et la nouvelle valeur ; route : 401/403/200.
- [x] **Étape 2 : voir échouer.**
- [x] **Étape 3 : implémenter** sur le modèle exact de `consumption/budgets.ts` et de ses opérations (capacité `none` avec `// permission-group-exempt:`), état du service par un `GET {PII_URL}/health` borné à 2 s (mis en cache 15 s).
- [x] **Étape 4 : tests verts** + `bun run check:api-validation:strict` + `check:permission-group-enforcement`.
- [ ] **Étape 5 : commit** `feat(k14): politique de données personnelles par espace (stockage, route, audit)`.

## Tâche 5 : Moteur — localisation du modèle, masquage, garde, notes

**Fichiers :**
- Créer : `lib/nexora/data-protection/model-location.ts`, `masking.ts`, `guard.ts`, `notes.ts`, `errors.ts`, `index.ts`
- Modifier : `lib/guardrails/validate-pii.ts` n'est **pas** modifié : le moteur appelle `maskPIIBatch` tel quel.
- Tests : un fichier `.test.ts` par module.

**Interfaces :**
- Consomme : `loadPolicyCached`, `resolveMode` (tâche 4) ; `readModelCards`, `resolveModelCard`, `listNexoraModels` (K1) ; `redactText` (K8) ; `maskPIIBatch(texts, entities, language, patterns?)` du cœur.
- Produit :
  - `isOffInstanceModel(model: string): Promise<boolean>` — `vllm/<nom>`, `<nom>`, alias (`nexora-default`) ; fiche `external` ⇒ vrai ; `local`/`eu` ⇒ faux ; `ollama/…` ⇒ faux ; fournisseur inconnu ou modèle introuvable ⇒ vrai.
  - `PII_POLICY_ENTITIES` = `PERSON, EMAIL_ADDRESS, PHONE_NUMBER, IBAN_CODE, CREDIT_CARD, IP_ADDRESS, FR_NIR` (ni lieux, ni dates, ni URL).
  - `protectTexts(texts: string[], deps?): Promise<{ texts: string[]; found: Record<string, number> }>` — motifs de K8 puis service PII (cache LRU par empreinte du texte), `found` = entités par type ; service configuré mais en échec ⇒ `PersonalDataServiceError`.
  - `guardChatMessages(input: { messages: ChatMessageLike[]; model: string; workspaceId: string | null }): Promise<{ messages: ChatMessageLike[]; applied: ProtectionNote | null }>` — `allow` ⇒ messages inchangés (même objet) ; `mask` ⇒ copie masquée (contenus `string` et parties `text`) ; `refuse` ⇒ `PersonalDataRefusedError(found)` ; modèle local ⇒ inchangé sans appel au service.
  - `interface ProtectionNote { mode: 'mask' | 'refuse'; model: string; found: Record<string, number>; masked: number }`
  - `noteExecutionProtection(executionId, note)` / `takeExecutionProtection(executionId): ProtectionNote[]` (LRU borné, 30 min).
  - Messages d'erreur français : « Cette demande contient des données personnelles (IBAN, e-mail) : la politique de cet espace interdit de les envoyer à un modèle hors instance. », « Le service de protection des données personnelles ne répond pas : la demande n'a pas été envoyée au modèle. »

- [x] **Étape 1 : tests rouges** (un par risque du « Review Focus » 1, 2, 3, 4, 5, 6) : modèle local intact et service non appelé ; alias de GLM masqué ; modèle introuvable traité hors instance ; service muet ⇒ `PersonalDataServiceError` quand `PII_URL` est posé, motifs seuls sinon ; même texte analysé une fois sur cinq tours ; contenu en tableau avec image conservé ; « Paris, le 12 mars, 1 000,50 € » non masqué ; IBAN invalide (clé fausse) non masqué.
- [x] **Étape 2 : voir échouer.**
- [x] **Étape 3 : implémenter** (signatures ci-dessus) ; `isOffInstanceModel` s'appuie sur un cache LRU de 30 s des modèles et des fiches (clé unique), jamais sur un état par requête.
- [x] **Étape 4 : tests verts**, puis mutations « garde retirée ⇒ rouge » pour : contrôle de localisation, cache, refus avant masquage, conservation de la forme.
- [ ] **Étape 5 : commit** `feat(k14): barrière de sortie des données personnelles (localisation, masquage, refus)`.

## Tâche 6 : Branchement aux six surfaces

**Fichiers :**
- Modifier : `providers/conversation-generation.ts` (appel au début de `prepareConversationGeneration`, protocole `chat-completions` seulement), `lib/nexora/wand.ts` (garde avant la requête et la trace, ligne `dataProtection` dans la trace), `lib/nexora/developer-api/models.ts` (garde dans `relayChatCompletion`), `lib/nexora/developer-api/errors.ts` (403 `personal_data_not_allowed`, 503), `app/api/nexora/playground/route.ts`, `app/api/wand/route.ts`, `lib/nexora/copilot/generate.ts`, `lib/nexora/evaluations/live.ts` (messages d'erreur), `lib/api/contracts/…` si une réponse d'erreur s'ajoute
- Tests : un test par point d'entrée, avec un faux service PII local (serveur HTTP de test) et des fiches de modèles de test.

**Interfaces :**
- Consomme : `guardChatMessages`, erreurs de la tâche 5.
- Produit : tout appel qui part vers un modèle hors instance passe par `guardChatMessages` avec l'identifiant d'espace de l'appelant (`request.workspaceId` d'un agent, `trace.workspaceId` d'un appel direct, `key.workspaceId` d'une clé) ; refus ⇒ HTTP 403 en français (Playground, « Générer », passerelle au format OpenAI), erreur de bloc lisible (agents) ; service muet ⇒ 503.

- [x] **Étape 1 : tests rouges** — pour chacun : (a) Playground : politique `mask`, modèle externe, question avec IBAN ⇒ le corps envoyé à Nexora API contient `[IBAN]` et pas l'IBAN ; `refuse` ⇒ 403 `personal_data_not_allowed`, aucune requête amont ; modèle local ⇒ corps identique. (b) Agents : `prepareConversationGeneration` appelé cinq fois avec un résultat d'outil contenant un e-mail ⇒ les cinq charges masquées, l'original intact. (c) Passerelle : clé d'espace en `mask` ⇒ corps relayé masqué ; clé d'instance ⇒ valeur d'instance ; réponse 403 au format OpenAI en `refuse`. (d) Campagne K10 et juge : appel de `nexoraWandComplete` avec la trace d'un espace en `refuse` ⇒ erreur lisible, élément « erreur » (jamais « réussi »). (e) Copilote et « Générer » : même garde par `nexoraWandComplete`.
- [x] **Étape 2 : voir échouer.**
- [x] **Étape 3 : implémenter** ; `noteExecutionProtection` appelé avec `request.executionId` quand il existe ; `wand.ts` passe la note à `beginCallTrace` (tâche 7).
- [x] **Étape 4 : tests verts** + suites ciblées `providers`, `lib/nexora/developer-api`, `lib/nexora/evaluations`, `lib/nexora/copilot`, `lib/nexora/wand` + `check:audits`.
- [ ] **Étape 5 : commit** `feat(k14): la barrière de sortie protège agents, Assistant, workflows, Playground, passerelle, campagnes`.

## Tâche 7 : Traces K8 — ce qui a été masqué, et le service PII dans le masquage des traces

**Fichiers :**
- Modifier : `lib/nexora/traces/call.ts`, `from-call.ts`, `from-execution.ts` (notes d'exécution), `record.ts` (masquage complémentaire par le service PII), `settings.ts` (état), écran Traces (`app/workspace/[workspaceId]/traces/**`), messages `traces`
- Tests : `from-call.test.ts`, `from-execution.test.ts`, `record.test.ts`, composant du détail si testé

**Interfaces :**
- Consomme : `ProtectionNote`, `takeExecutionProtection`, `maskPIIBatch`.
- Produit : span modèle avec `attributes.dataProtection = ProtectionNote` ; le détail de la trace affiche « Données personnelles masquées avant l'envoi à {modèle} : IBAN ×1 » (ou « refusées ») ; `recordTrace` masque en plus les noms (service PII, entités `PERSON`) en mode `standard` quand `PII_URL` est posé ; service muet ⇒ les motifs seuls ont déjà masqué (la trace ne bloque jamais : avertissement journalisé).

- [x] **Étape 1 : tests rouges** : appel direct masqué ⇒ trace avec l'attribut et le nombre ; exécution d'agent avec note ⇒ attribut sur le span racine ; `recordTrace` avec faux service ⇒ « Bonjour Marie Dupont » devient « Bonjour <PERSON> » après les motifs ; service en échec ⇒ trace stockée avec le seul masquage par motifs ; mode `none` et `strict` inchangés.
- [x] **Étape 2 : voir échouer.**
- [x] **Étape 3 : implémenter.**
- [x] **Étape 4 : tests verts** (traces, wand, relais) ; vérification d'interface au navigateur à la tâche 8.
- [ ] **Étape 5 : commit** `feat(k14): la trace montre les données masquées ; le service PII complète le masquage des traces`.

## Tâche 8 : Réglages › Données personnelles (politique par espace)

**Fichiers :**
- Créer : `app/workspace/[workspaceId]/settings/components/nexora-data-protection/` (page, tableau par espace), entrée de navigation (skill `add-settings-page`), messages `settings.dataProtection` fr et en
- Modifier : navigation des réglages (réservée aux administrateurs de l'instance, comme Consommation), `lib/nexora/audit-labels.ts`

**Interfaces :**
- Consomme : hooks de la tâche 4.
- Produit : page « Données personnelles » : état du service (« Service local actif » / « Non installé : seuls les motifs (IBAN, e-mail, carte, téléphone) sont masqués »), valeur d'instance par défaut et une ligne par espace (Autoriser / Masquer / Refuser, « suit la valeur d'instance »), mention des modèles concernés (« Hors instance »), enregistrement avec audit.

- [x] **Étape 1 : test rouge** du brouillon (`draft.test.ts` : changement minimal envoyé, retour à « suit la valeur d'instance », bouton Enregistrer inactif sans changement) ; couverture des clés de messages fr/en par `check-i18n`.
- [x] **Étape 2 : voir échouer, implémenter, tests verts.**
- [ ] **Étape 3 : parcours au navigateur** (serveur de développement :3220) : ouverture, changement d'un espace en « Masquer », enregistrement, ligne d'audit « Politique de données personnelles modifiée » ; captures dans `docs/verification/k14-garde-fous/`.
- [ ] **Étape 4 : commit** `feat(k14): Réglages › Données personnelles`.

## Tâche 9 : Modèles interdits par groupe d'accès

**Fichiers :**
- Modifier : `ee/access-control/components/access-group-detail.tsx` (section « Modèles », sélecteur multiple avec la localisation de chaque modèle), `ee/access-control/utils/permission-check.ts` (alias résolus dans `validateModelProvider`/`assertPermissionsAllowed`), `app/api/nexora/playground/route.ts` (le Playground est le seul appel direct où la personne choisit le modèle ; « Générer » et le Copilote utilisent le modèle par défaut de l'instance, que le groupe écarte avec « Chat »), `ee/access-control/components/group-models.tsx` et `denied-models.ts` (sélecteur), messages `settings.accessGroups`
- Tests : `permission-check.test.ts`, test de route du Playground, brouillon du groupe

**Interfaces :**
- Produit : `deniedModels` modifiable depuis l'interface (identifiants `vllm/<nom>`, alias compris) ; un modèle refusé l'est aussi sous chacun de ses alias ; refus ⇒ `ModelNotAllowedError` dans un bloc, 403 `model_not_allowed` par la passerelle (déjà là), 403 en français par le Playground : « Votre groupe d'accès ne vous autorise pas le modèle « {nom} ». ».

- [x] **Étape 1 : tests rouges** : groupe qui interdit `vllm/cloud-glm-5-3` ⇒ `validateModelProvider(user, ws, 'vllm/nexora-default')` refuse quand l'alias désigne GLM 5.3, accepte `vllm/qwen2.5:7b` ; Playground : 403 pour l'utilisateur du groupe, 200 pour un autre ; passerelle : clé créée par un membre du groupe ⇒ 403 (existant, revalidé) ; brouillon : ajouter/retirer un modèle, la liste vide n'est pas la liste complète.
- [x] **Étape 2 : voir échouer.**
- [x] **Étape 3 : implémenter** ; skill `validate-permission-group-item` rejouée sur `deniedModels` (champ, parseur tolérant, sélecteur, garde, tests).
- [x] **Étape 4 : tests verts** + `check:permission-group-enforcement` (comptes inchangés) + `check:application-graph` + `check:capability-subject`.
- [ ] **Étape 5 : preuve réelle** : groupe « Comptabilité » créé sur une copie jetable de la base ; un membre ne peut pas choisir GLM 5.3 dans un bloc Agent (exécution refusée), ni par une clé d'espace créée par lui (403 en français), ni dans le Playground ; un autre membre le peut.
- [ ] **Étape 6 : commit** `feat(k14): modèles interdits par groupe d'accès (sélecteur, alias, Playground)`.

## Tâche 10 : Modération facultative (porte de décision)

**Fichiers (si praticable) :** `lib/nexora/data-protection/moderation.ts`, intégration à `guard.ts`, case « Modération des demandes » dans la page de la tâche 8, `deploy/compose.yml` inchangé (modèle tiré dans l'Ollama de l'instance par la page Modèles), messages.

**Interfaces :** `moderateMessages(messages, deps): Promise<{ flagged: boolean; category: string | null }>` ; refus 403 « Cette demande a été refusée par la modération de l'instance. ».

- [ ] **Étape 1 : mesure.** Dans un Ollama jetable (volume propre, hors pile), tirer `ibm/granite3.2-guardian:3b` (MoE 3B-A800M, Apache-2.0) ; mesurer latence p50/p95 sur 20 demandes françaises (10 inoffensives, 10 nuisibles), mémoire, taux de bonnes détections. **Critère de décision** : latence p95 ≤ 5 s sur CPU chargé et ≥ 8 détections correctes sur 10 sans faux positif sur les 10 inoffensives. Sinon : écarter la modération, consigner la raison et passer à l'étape 5.
- [ ] **Étape 2 : tests rouges** (si praticable) : verdict « Oui » ⇒ refus ; « Non » ⇒ passage ; modèle absent ou muet ⇒ refus 503 explicite (jamais passage silencieux) ; désactivée ⇒ aucun appel ; seule la dernière question utilisateur est évaluée (coût).
- [ ] **Étape 3 : implémenter**, **Étape 4 : tests verts.**
- [ ] **Étape 5 : consigner dans le ledger** la mesure et la décision (livrée ou écartée, pourquoi, coût si faux) ; supprimer l'Ollama jetable et son volume.
- [ ] **Étape 6 : commit** `feat(k14): modération locale facultative` ou `docs(k14): modération écartée (mesure)`.

## Tâche 11 : Export CSV du journal d'audit pour tableur français

**Fichiers :**
- Créer : `lib/nexora/audit-csv.ts` (formatage), `lib/nexora/audit-csv.test.ts`
- Modifier : `lib/audit-logs/csv.ts` ou `application/export-audit-logs.ts` (le cas d'usage appelle le formateur selon la langue de la requête), `app/api/audit-logs/export/route.ts` (nom du fichier et type), `lib/audit-logs/export.integration.ts` si besoin, messages `governance.auditLogs` (en-têtes)

**Interfaces :**
- Produit : `auditCsvHeader(locale): string`, `toAuditCsvRow(row, locale, maxBytes): string | undefined`, `AUDIT_CSV_BOM` ; en français : séparateur `;`, fin de ligne `\r\n`, BOM UTF-8, dates `jj/mm/aaaa hh:mm:ss` (fuseau de l'instance), en-têtes français, action avec le libellé de l'écran (`describeAuditEntry`/libellés), nombres avec virgule décimale, cellules neutralisées contre les formules ; en anglais : comportement actuel.

- [x] **Étape 1 : tests rouges** : une ligne type ⇒ `25/10/2026 14:03:12;Politique de données personnelles modifiée;…` ; `=SOMME(A1)` ⇒ `'=SOMME(A1)` ; guillemets doublés, retour à la ligne entre guillemets ; nombre `1234.5` dans une colonne numérique ⇒ `1234,5` ; BOM en tête ; export tronqué annoncé (`X-Export-Truncated`) ; locale anglaise inchangée.
- [x] **Étape 2 : voir échouer, implémenter, tests verts** (+ intégration `export.integration.ts` sur Postgres jetable).
- [x] **Étape 3 : preuve** : fichier téléchargé de l'instance de développement relu par `python3 -c "import csv"` avec `delimiter=';'` (14 colonnes partout) et ouvert avec LibreOffice (`soffice --headless --convert-to ods`, locale `fr_FR`) si disponible — sinon vérification du BOM, du séparateur et des dates par script ; consigner.
- [x] **Étape 4 : commit** `feat(k14): export CSV du journal d'audit pour tableur français`.

## Tâche 12 : Guide, contrôle de fumée « Garde-fous »

**Fichiers :**
- Créer : `docs/guide/gouvernance.md` ; modifier `docs/guide/README.md` (index), `docs/guide/reglages.md` (lien), `docs/guide/blocs.md` (Garde-fous), `docs/guide/traces.md` (attribut)
- Modifier : `scripts/smoke.py` (contrôle « Garde-fous »), `scripts/verification/fumee-pc6.sh` (variables)

**Interfaces :** contrôle de fumée « Garde-fous : détection IBAN + e-mail, politique « masquer » vue dans la trace, groupe sans GLM 5.3 (bloc et API), export CSV » ; indispensable : chaque sous-contrôle dit ce qu'il a vérifié.

- [ ] **Étape 1 : écrire le guide** (service local et son poids, politiques, groupes, modération, export, ce qui n'est pas couvert : motifs seulement sans service, noms avec fautes, SAML hors périmètre) ; lien vérifié par `check-brand` et le test d'index.
- [ ] **Étape 2 : écrire le contrôle de fumée** et le jouer sur le serveur de développement contre la pile de pc6 (GLM 5.3 par défaut) ; le sous-contrôle du service PII est facultatif tant que le profil n'est pas déployé (message « profil pii absent » explicite, jamais un succès).
- [ ] **Étape 3 : commit** `docs(k14): guide de la gouvernance, contrôle de fumée « Garde-fous »`.

## Tâche 13 : Vérification finale, ledger, fusion de `main`

- [ ] **Étape 1 : ledger** — section « K14 » à la fin de `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md` : chaque décision en « Ruling : … — pourquoi — coût si faux », mesures de poids, preuves, ce qu'il faut vérifier après déploiement.
- [ ] **Étape 2 : `git merge main`**, conflits résolus.
- [ ] **Étape 3 : vérifications** : biome sur les fichiers modifiés (`bun run --cwd workstudio/apps/sim biome check <fichiers>`), `bun run type-check` (racine `workstudio/`), `check:audits` (dont `check:permission-group-enforcement`), `check:test-types`, `check:api-validation:strict`, `check:migrations`, pytest et ruff du service PII, **suite complète** `LANG=en_US.UTF-8 bun run --cwd workstudio/apps/sim test`, à la racine `bash scripts/check-i18n.sh && bash scripts/check-brand.sh && bash scripts/check-no-ee.sh && bash scripts/check-licenses.sh`, `bash scripts/tests/test-*.sh`.
- [ ] **Étape 4 : commit** sur la branche (message en français, `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`), sans pousser ni fusionner dans `main`.
