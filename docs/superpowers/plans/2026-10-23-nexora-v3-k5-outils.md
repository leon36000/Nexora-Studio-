# K5 — Outils intégrés des agents — plan d'implémentation

> **Pour les agents :** sous-compétence requise : superpowers:executing-plans (exécution par la session K5 elle-même, en natif). Les étapes se cochent (`- [x]`) au fil de l'eau.

**But :** donner aux agents Nexora (formulaire, Assistant, chat publié, bloc Fonction) un interpréteur Python local et sans réseau, des réponses qui citent leurs sources « [1] [2] », une confirmation « Autoriser / Refuser » avant les actions d'écriture Nexora Connect ou MCP, et un interrupteur de recherche web ; trancher la génération d'images.

**Architecture :**
- **Bac à sable** : un service contrôleur (`deploy/code/`, Python sans dépendance, profil compose `code`) détient seul le socket Docker et lance chaque exécution dans un conteneur jetable de la même image (`nexora/code`) : `--network none`, racine en lecture seule, `/tmp` en tmpfs plafonné `noexec`, utilisateur 10001, `--cap-drop ALL`, `no-new-privileges`, seccomp et AppArmor par défaut, `--pids-limit`, `--cpus`, `--memory` = `--memory-swap`, durée de vie bornée, nombre de bacs simultanés borné. WorkStudio le pilote par HTTP avec un jeton, comme un troisième fournisseur de bac à sable distant (`nexora`, à côté d'E2B et Daytona) : tout le chemin Python existant du bloc Fonction (montage des fichiers, entrées privées, `__SIM_RESULT__`, récolte de `/tmp/sim/outputs`, fichiers persistés) sert tel quel. Réglage d'instance « Exécution de code », désactivé par défaut, réservé aux administrateurs, lu à l'exécution.
- **Outil « Interpréteur de code »** (`nexora_code_interpreter`) : un outil interne qui délègue à l'exécution de fonction Python, avec les fichiers de la conversation montés (`<start.files>`) ; fichiers produits ⇒ sortie `files` de l'agent ⇒ trames `output` déjà comprises par le chat, rendues aussi dans l'Assistant.
- **Citations et confirmation** au point de passage unique des appels d'outils, `executeProviderTool` (`providers/runtime-context.ts`) : un registre par requête numérote les résultats de `knowledge_search` et `searxng_search` (`ref: n`), une consigne demande au modèle de citer « [n] », l'agent sort `sources` (seulement les numéros cités), le flux SSE ajoute une trame `sources`. Un portillon de confirmation, fourni par le gestionnaire du bloc Agent, intercepte un appel marqué avant son exécution.
- **Confirmation interactive** (chat publié et Assistant) : attente dans la boucle ; demande enregistrée dans Redis (jeton haché, durée de vie), publiée sur un canal ; le flux du chat la transmet en trame `confirmation` ; la carte appelle `POST /api/nexora/tool-confirmations/[id]` ; refus ou délai ⇒ l'outil n'est pas appelé. **Exécution de workflow** (API, planification, éditeur, webhook) : l'action est différée, le bloc Agent met le workflow en pause par la pause humaine existante (`_pauseMetadata`), et la reprise « Autoriser » exécute une seule fois l'action enregistrée.

**Pile :** Python 3.12 (bibliothèque standard ; image : pandas 3.0.6, openpyxl 3.1.5, matplotlib 3.11.2, numpy 2.5.4, empreintes vérifiées), API Docker Engine par socket Unix ; TypeScript, Next.js 16, next-intl, Vitest, Redis (pub/sub existant).

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` (§3 : exécution de code désactivée par défaut, activée par un administrateur ; bac à sable sans réseau, ressources bornées, suite d'évasion obligatoire ; matériel 8 cœurs / 32 Go, GPU facultatif) ; contenu et « Terminé quand » : `docs/recherche/ecart-mistral-studio-v2.md` §3.2 (K5), matrice §1.3 et §1.16 ; outils Mistral : `docs/recherche/mistral-studio/11-demarrage-playground-agents-connecteurs.md` §3.9 et §3.10.9.

## Contraintes globales

- Aucun code `ee/` d'origine ; tout texte visible par next-intl (`messages/{fr,en}`, anglais = texte source) ; marque Nexora ; `check-i18n/brand/no-ee/licenses` verts.
- **Exécution de code désactivée par défaut**, activable par un administrateur de l'instance seulement ; sans le profil `code` installé, le réglage est grisé avec l'explication.
- Bac à sable **sans réseau**, CPU, mémoire, disque, durée et processus bornés ; aucun changement système sur l'hôte (pas de gVisor, pas de réglage du noyau, pas de remappage d'utilisateurs) ; le socket Docker n'est monté que dans le contrôleur.
- Aucun secret de WorkStudio ni du contrôleur dans le bac à sable : l'environnement des conteneurs est construit explicitement, jamais hérité.
- Formulaire d'agent : changements limités à la section des outils (K9 travaille sur les consignes en parallèle).
- Matériel visé 8 cœurs / 32 Go : défauts 1 CPU, 1 Go, 2 bacs simultanés.
- Double vérification : GLM 5.3 (`cloud-glm-5-3`) et `qwen2.5:7b` sur CPU pour ce qui dépend de la vitesse.
- Ne jamais reconstruire ni redémarrer les conteneurs du projet `nexora` ; tout conteneur lancé ici est étiqueté `nexora.k5-verif=1` et supprimé.

## Décisions (rulings)

| # | Décision | Coût si faux |
|---|---|---|
| R1 | **Conteneurs Docker durcis lancés par un contrôleur**, plutôt que gVisor `runsc`, microsandbox, Firecracker, nsjail/bubblewrap ou E2B auto-hébergé : gVisor, microsandbox et Firecracker exigent une installation sur l'hôte (runtime, KVM) interdite ici et absente chez la plupart des clients ; nsjail/bubblewrap dans un conteneur demandent des privilèges qui affaiblissent l'isolation ; E2B auto-hébergé (Nomad + Firecracker) est disproportionné pour une PME. Docker est déjà le prérequis de l'installation. Option `NEXORA_CODE_RUNTIME=runsc` si l'administrateur a installé gVisor lui-même. | Le noyau est partagé : une faille du noyau accessible malgré seccomp permettrait de sortir du conteneur. Mitigations : non-root, aucune capacité, `no-new-privileges`, seccomp et AppArmor par défaut, racine en lecture seule, pas de réseau ; `runsc` recommandé dans le guide. |
| R2 | **Une seule image `nexora/code`** pour le contrôleur et les exécutions (Python 3.12 slim épinglé par empreinte, dépendances verrouillées avec `--require-hashes`) ; le contrôleur tourne en root dans son conteneur pour lire le socket, les exécutions en utilisateur 10001 avec un environnement vide hors `HOME`, `MPLBACKEND`, `MPLCONFIGDIR` et les variables passées par l'appel. | Le code utilisateur peut lire le code source du contrôleur (public) mais pas son jeton (jamais dans l'image ni dans l'environnement des exécutions). |
| R3 | Le contrôleur **ne fait que de l'API Docker par le socket Unix** (bibliothèque standard, `exec` avec entrée standard par connexion « upgrade » pour écrire les fichiers, lecture démultiplexée), sans CLI Docker ni SDK. | ~150 lignes de protocole à maintenir ; couvertes par la suite d'évasion et les tests unitaires. |
| R4 | Intégration côté WorkStudio comme **fournisseur de bac à sable `nexora`** (interface `SandboxProvider` d'E2B/Daytona) : le chemin Python du bloc Fonction est réutilisé sans copie. Choisi quand `NEXORA_CODE_SANDBOX_URL` est défini ; Python seulement (JavaScript avec `import` et Shell restent refusés). | Les images de dépendances par espace (« bacs à sable » de Sim) ne sont pas proposées avec ce fournisseur. |
| R5 | Défauts : 1 CPU, 1 Go de mémoire (tmpfs compris), `/tmp` 256 Mo, 64 processus, 120 s par exécution, 600 s de vie par bac, 2 bacs simultanés (429 au-delà), réglables par `NEXORA_CODE_*`. | Un traitement plus gros demande de régler ces valeurs dans `deploy/.env`. |
| R6 | Réglage « Exécution de code » dans les **métadonnées de l'organisation d'instance** (`nexoraCodeExecution`, comme `nexoraModelCards`), lu à l'exécution avec un cache LRU de 15 s, sans redémarrage ; audit à chaque changement. | Un administrateur qui coupe l'exécution attend au plus 15 s. |
| R7 | Outil dédié **`nexora_code_interpreter`** (consigne en français pour le modèle, Python imposé, fichiers de la conversation montés sous `/tmp/sim/inputs`, sortie sous `/tmp/sim/outputs`) avec un bloc caché du même nom pour que le bloc Agent le convertisse comme tout outil de bloc ; pas d'outil `function_execute` brut (sa description parle de `fetch`, de JavaScript et du Shell, faux ici). | Un bloc de plus dans le registre (caché de la barre d'outils). |
| R8 | Les fichiers produits sortent par la **sortie `files` de l'agent** et les trames `output` existantes (`chat-outputs-v1`) : l'Assistant négocie désormais ce protocole et affiche les images de même origine et un lien de téléchargement. | Les agents publiés avant K5 n'ont que `content` dans leurs sorties : republier pour obtenir les fichiers. |
| R9 | Citations : numérotation **globale par tour d'agent** des résultats de `knowledge_search*` et `searxng_search` (`ref`), consigne ajoutée au message système quand l'agent a l'un de ces outils ; `sources` ne garde que les numéros cités ; lien interne `/workspace/<ws>/knowledge/<base>/<document>` pour un document téléversé, `sourceUrl` pour un connecteur, l'URL pour le web ; extrait affiché au clic. Trame SSE `sources` dédiée (pas une sortie sélectionnée, qu'un chat afficherait en texte). | Un visiteur anonyme d'un chat public voit le titre et l'extrait mais le lien interne lui demande de se connecter. |
| R10 | **Confirmation interactive par attente dans la boucle** (même exécution, même principal, pas de reconstruction de l'appel) pour les chats publiés et l'Assistant ; jeton de décision aléatoire envoyé seulement dans le flux de la personne qui converse, empreinte SHA-256 dans Redis, décision unique (`SET NX`), 10 min de délai puis refus ; commentaire SSE toutes les 15 s pendant l'attente. | Une exécution attend jusqu'à 10 min ; plusieurs processus WorkStudio sont pris en charge par Redis. |
| R11 | **Exécution de workflow** (non interactive) : action différée, réponse « en attente » au modèle, pause humaine existante (`_pauseMetadata`, formulaire Autoriser/Refuser) ; la reprise exécute l'action enregistrée **une seule fois**, dans le contexte de l'exécution d'origine, et expose `actions` aux blocs suivants. | Le texte de l'agent est écrit avant l'action : il ne commente pas son résultat. |
| R12 | Portée de « Demander avant d'agir » : interrupteur par outil MCP dans le formulaire, **activé à l'ajout** d'un outil ; un outil enregistré avant K5 (champ absent) n'est pas confirmé (aucun agent déployé ne change de comportement) ; pour l'outil `execute_action` de Nexora Connect, seules les actions `write`/`destructive` du catalogue (ou inconnues) sont confirmées, les lectures passent ; les outils Connect en lecture (`list_apps`, `list_connections`, `search_actions`, `get_action_guide`) n'ont pas l'interrupteur. | Un agent créé avant K5 doit être rouvert pour activer la confirmation. |
| R13 | **Images écartées de K5** : Nexora API n'a aucun type de routeur image (`RouterType` : ASR, image-to-text, classification, embeddings, text-generation) ; un fournisseur « compatible OpenAI images » demanderait un type de routeur, `/v1/images/generations`, consommation et budgets, le relais K3 et un service externe (pas de modèle local, hors périmètre v3), pour une valeur « faible » (matrice §1.3). | Un client qui veut des images garde le bloc existant avec sa propre clé OpenAI/Gemini (hors instance) jusqu'à un jalon dédié. |
| R14 | Interrupteur « Recherche web » du formulaire = outil de bloc `searxng` (URL de l'instance injectée par le bloc) ; grisé quand `SEARXNG_URL` est vide (profil `search` non activé). | — |

## Revue ciblée (Review Focus)

1. **Bac à sable** : un `path` d'écriture ou de lecture hors de `/tmp` (`..`, lien symbolique, `/proc/1/environ`) ⇒ refus 400, jamais de lecture hors du bac. Test : `test_paths_outside_tmp_are_refused`.
2. **Exécution qui dépasse** (boucle infinie, sortie géante) ⇒ conteneur tué, `timedOut: true` ou sortie tronquée, bac suivant utilisable. Tests : suite d'évasion « boucle infinie », `test_output_is_capped`.
3. **Contrôleur indisponible** ou 429 (deux bacs déjà pris) ⇒ erreur française dans le bloc Fonction et dans le résultat d'outil, pas d'exception non gérée. Test : `nexora.test.ts` « 429 ⇒ message de surcharge ».
4. **Décision rejouée ou concurrente** (deux clics, deux onglets, jeton faux, décision après délai) ⇒ une seule décision retenue, jeton faux ⇒ 403, après délai ⇒ 409. Tests : `store.test.ts`.
5. **Réponse qui cite un numéro inexistant** ou ne cite rien ⇒ aucune source inventée, liste vide. Test : `citations.test.ts` « numéro absent ignoré ».

---

### Tâche 1 : contrôleur de bac à sable et image `nexora/code`

**Fichiers :**
- Créer `deploy/code/Dockerfile`, `deploy/code/requirements.txt` (verrou avec empreintes, `uv pip compile --generate-hashes --exclude-newer 2026-10-17`), `deploy/code/sandbox.py` (contrôleur), `deploy/code/runner.py` (exécuté dans chaque bac), `deploy/code/test_sandbox.py` (unittest, faux Docker).
- Modifier `deploy/compose.yml` (service `code-sandbox`, profil `code`), `deploy/.env.example`, `scripts/init-env.sh` (jeton `NEXORA_CODE_SANDBOX_TOKEN`), `scripts/tests/test-compose-env.sh`, `scripts/tests/test-init-env.sh`, `install.sh` (question « exécution de code »), `.github/workflows/images.yml` (image `code`), `THIRD_PARTY_NOTICES.md` (paquets Python de l'image).

**Interfaces :**
- Produit : API HTTP du contrôleur (JSON, `Authorization: Bearer <NEXORA_CODE_SANDBOX_TOKEN>`, 401 sinon) :
  - `GET /health` ⇒ `{ok, limits:{cpus, memoryMb, tmpfsMb, pids, maxRunSeconds, maxLifetimeSeconds, maxSandboxes}}` (sans jeton).
  - `POST /v1/sandboxes` `{lifetimeMs?}` ⇒ 201 `{sandboxId, expiresAt}` ; 429 `{error:'busy'}`.
  - `POST /v1/sandboxes/{id}/files/write` `{path, contentBase64}` ⇒ 204 ; `…/files/read` `{path, maxBytes}` ⇒ `{contentBase64, byteLength}` (413 au-delà) ; `…/files/stat` `{path}` ⇒ `{size}` ; `…/files/list` `{path, depth}` ⇒ `{entries:[{path, relativePath, kind:'file'|'directory', size}]}` ; `…/files/remove` `{path}` ⇒ 204 ; 404 pour un fichier ou un bac absent.
  - `POST /v1/sandboxes/{id}/run` `{code, envs?, timeoutMs, maxOutputBytes?}` ⇒ `{stdout, stderr, exitCode, timedOut, outputTruncated, oomKilled, error?:{name, value, traceback}}`.
  - `POST /v1/sandboxes/{id}/kill` ⇒ 204.
- Produit : `container_spec(settings: Settings, sandbox_id: str, lifetime_s: int) -> dict` (corps de `POST /containers/create`), `check_sandbox_path(path: str) -> str`.

- [x] **Étape 1 : tests rouges** `deploy/code/test_sandbox.py` : `test_container_spec_is_locked_down` (NetworkMode `none`, `NetworkDisabled`, `ReadonlyRootfs`, `CapDrop == ['ALL']`, `no-new-privileges` dans `SecurityOpt`, aucun `seccomp=unconfined` ni `apparmor=unconfined`, `Privileged` faux, `PidsLimit == 64`, `NanoCpus == 1e9`, `Memory == MemorySwap == 1 Gio`, `Tmpfs['/tmp']` contient `noexec,nosuid,nodev,size=256m`, `User == '10001:10001'`, aucun `Binds`/`Mounts`, `Env` limité à la liste blanche, `Runtime` seulement si `NEXORA_CODE_RUNTIME`), `test_paths_outside_tmp_are_refused` (`/etc/passwd`, `/tmp/../etc`, `/proc/1/environ`, chemin relatif, octet nul ⇒ `ValueError` ; `/tmp/sim/inputs/a.xlsx` accepté), `test_requests_without_token_are_refused`, `test_busy_when_max_sandboxes_reached`, `test_run_timeout_kills_container`, `test_output_is_capped`, `test_lifetime_and_timeout_are_clamped`, `test_reaper_removes_expired_sandboxes`, `test_demux_splits_stdout_and_stderr`.
- [x] **Étape 2 :** `python3 -I deploy/code/test_sandbox.py` ⇒ échec (module absent).
- [x] **Étape 3 :** écrire `sandbox.py` (`Settings.from_env()`, `DockerClient`, `SandboxService`, `Handler`, `main()`), `runner.py` (exécute le fichier de code dans `__main__`, écrit `{name, value, traceback}` dans le fichier d'erreur donné, copie le cache de polices matplotlib préconstruit vers `MPLCONFIGDIR`), le `Dockerfile` (utilisateur `sandbox` 10001, cache matplotlib construit à l'image, `HEALTHCHECK`) et le service compose (`profiles: [code]`, socket monté seulement ici, pas de port publié, réseau interne par défaut).
- [x] **Étape 4 :** tests verts ; `bash scripts/tests/test-compose-env.sh` et `test-init-env.sh` verts (profil `code` absent par défaut, jeton généré, `NEXORA_CODE_SANDBOX_URL` vide par défaut et `http://code-sandbox:8080` avec le profil).

### Tâche 2 : suite d'évasion et contrôle de fonctionnement

**Fichiers :** créer `scripts/verification/interpreteur-evasion.py` (client HTTP du contrôleur, bibliothèque standard) et `scripts/verification/interpreteur-evasion.sh` (construit l'image, lance un contrôleur jetable étiqueté `nexora.k5-verif=1` sur un réseau privé, lance la suite, rapport JSON, nettoie) ; rapport consigné dans `docs/verification/k5-interpreteur/evasion.json`.

**Interfaces :** consomme l'API de la tâche 1. Produit un rapport `{checks:[{name, status:'bloqué'|'ÉCHEC', detail, durationMs}]}` ; code de sortie 1 si un seul contrôle n'est pas bloqué.

- [ ] **Étape 1 :** écrire les contrôles, chacun « bloqué » seulement si l'attaque échoue : réseau (TCP vers 1.1.1.1:53, vers l'hôte `172.17.0.1`, résolution DNS de `nexora-api`, seule interface `lo`) ; lecture de `/etc` et de l'hôte (`/etc/shadow` illisible, `/etc/os-release` = image Debian et pas l'hôte, aucun socket Docker, aucun montage de l'hôte hors fichiers réseau de Docker, aucune valeur du jeton du contrôleur dans `/proc/*/environ`) ; bombe de processus (fork en boucle ⇒ limite atteinte, bac suivant utilisable) ; boucle infinie (`timeoutMs` 5 000 ⇒ `timedOut` en moins de 15 s) ; 10 Go en mémoire (⇒ `MemoryError` ou `oomKilled`) ; disque rempli (2 Go dans `/tmp` ⇒ `ENOSPC` à 256 Mo, écriture dans `/` et `/home` ⇒ `EROFS`) ; élévation de privilèges (`os.setuid(0)`, `su`, binaire setuid, `unshare(CLONE_NEWUSER)`, `mount`, `CapEff == 0`, `NoNewPrivs == 1`) ; exécution d'un binaire déposé dans `/tmp` (`noexec`) ; chemins hors `/tmp` refusés par l'API ; requête sans jeton ⇒ 401 ; troisième bac ⇒ 429.
- [ ] **Étape 2 :** contrôle de fonctionnement dans la même suite : un classeur `ventes.xlsx` (openpyxl) ⇒ pandas somme par mois ⇒ PNG matplotlib + CSV + XLSX dans `/tmp/sim/outputs`, totaux exacts.
- [ ] **Étape 3 :** lancer la suite sur pc6 ; tous les contrôles « bloqué », rapport versionné.

> **Bloqué (24/10/2026)** : la rédaction de cette suite par la session K5 a été interrompue deux fois par un filtre de sécurité. Elle n'est pas livrée par cette session ; le contrôleur (tâche 1) est prêt à être vérifié par une autre voie (session principale ou fondateur). Tant que la suite n'a pas été passée, l'exécution de code reste désactivée par défaut et ne doit pas être activée en production.

### Tâche 3 : fournisseur `nexora` et réglage « Exécution de code »

**Fichiers :**
- Créer `workstudio/apps/sim/lib/execution/remote-sandbox/nexora.ts` (+ `nexora.test.ts`).
- Modifier `lib/execution/remote-sandbox/types.ts` (`SandboxProviderId` + `'nexora'`), `provider.ts` (`resolveProvider()` choisit `nexora` quand configuré), `lib/billing/sandbox-pricing.ts` (tarif nul), `lib/core/config/env.ts` (`NEXORA_CODE_SANDBOX_URL`, `NEXORA_CODE_SANDBOX_TOKEN`).
- Créer `lib/nexora/code-execution.ts` (+ test) ; `lib/api/contracts/nexora-code-execution.ts` ; `app/api/nexora/code-execution/route.ts` (+ test) ; `hooks/queries/nexora-code-execution.ts`.
- Modifier `lib/function-execution/execute-request.ts` (Python autorisé quand l'exécution est activée), `lib/nexora/audit-labels.ts`.
- Réglages : nouvelle section « Exécution de code » (skill `add-settings-page`) `app/workspace/[workspaceId]/settings/components/nexora-code-execution/nexora-code-execution.tsx`, navigation ; messages `settings.json` (fr, en).
- Modifier `deploy/compose.yml` (variables de WorkStudio).

**Interfaces :**
- Produit : `nexoraProvider: SandboxProvider` ; `isCodeSandboxConfigured(): boolean` ; `isCodeExecutionEnabled(): Promise<boolean>` ; `readCodeExecutionSetting(organizationId: string): Promise<{enabled: boolean; updatedAt?: string}>` ; `updateCodeExecutionSetting(organizationId: string, enabled: boolean): Promise<...>` ; contrats `getNexoraCodeExecutionContract` / `updateNexoraCodeExecutionContract` (vue `{configured, enabled, limits?}`).

- [ ] **Étape 1 : tests rouges** : `nexora.test.ts` (faux contrôleur HTTP local : `create` ⇒ `runCode` renvoie stdout/stderr/erreur Python au format `{name, value, traceback}` ; `timedOut` repris ; 429 ⇒ erreur « Exécution de code saturée… » ; `listFiles`/`readFileWithLimit` respectent `maxBytes` ; `kill` idempotent ; `create('shell')` refusé) ; `code-execution.test.ts` (désactivé par défaut, activé seulement si configuré **et** réglé, cache invalidé après mise à jour) ; `route.test.ts` (membre ⇒ 403, administrateur ⇒ 200, audit) ; `execute-request` : Python refusé quand désactivé avec le message français, accepté quand activé (fournisseur simulé).
- [ ] **Étape 2 :** lancer ⇒ rouge.
- [ ] **Étape 3 :** implémenter ; section Réglages (interrupteur, état du service, limites, avertissement de sécurité, lien vers le guide).
- [ ] **Étape 4 :** vert ; `type-check`.

### Tâche 4 : outil « Interpréteur de code », formulaire, Assistant, fichiers produits

**Fichiers :**
- Créer `tools/nexora/code-interpreter.ts` (id `nexora_code_interpreter`) ; enregistrer dans `tools/registry.ts` ; créer `blocks/blocks/nexora_code_interpreter.ts` (caché) dans `blocks/registry-maps.ts` ; messages `blocks.json`.
- Modifier `lib/nexora/agents.ts` (`AgentConfig.codeInterpreter`, `AgentConfig.webSearch`, lecture/écriture des outils), `agents/[workflowId]/components/agent-form.tsx` (deux interrupteurs dans la section des outils), `use-new-agent.ts`, `messages/{fr,en}/agents.json`.
- Créer `app/api/nexora/agent-tools/route.ts` + contrat (disponibilité `{codeInterpreter, webSearch}` pour un membre) + hook.
- Modifier `lib/nexora/assistant/general-agent.ts` (outil ajouté quand l'exécution est activée, sorties `content` + `files`), `publish-section.tsx` (sortie `files` publiée), `assistant/stream-reply.ts` (négocie `chat-outputs-v1`, lit les fichiers), `assistant/components/message-item.tsx` (images et téléchargements), contrat `nexora-assistant.ts` (`files` produits persistés).
- Modifier `executor/handlers/agent/handler.ts` (sortie `files` de l'agent = fichiers renvoyés par l'interpréteur).

**Interfaces :**
- Consomme : `isCodeExecutionEnabled()` (tâche 3).
- Produit : `CODE_INTERPRETER_TOOL_ID = 'nexora_code_interpreter'` ; `AgentConfig.codeInterpreter: boolean`, `AgentConfig.webSearch: boolean` ; sortie d'agent `files: UserFile[]`.

- [ ] **Étape 1 : tests rouges** : `agents.test.ts` (aller-retour `codeInterpreter`/`webSearch` ⇔ outils `nexora_code_interpreter` avec `files: '<start.files>'` et `searxng`, configuration d'avant K5 ⇒ `false`) ; `general-agent.test.ts` (outil ajouté si activé, retiré sinon, sorties `files`) ; `stream-reply.test.ts` (trame `output` porteuse d'un `UserFile` ⇒ `onFiles`).
- [ ] **Étape 2 :** rouge.
- [ ] **Étape 3 :** implémenter.
- [ ] **Étape 4 :** vert ; parcours réel : Assistant + classeur ⇒ graphique affiché et totaux exacts.

### Tâche 5 : citations numérotées et « Sources [1] [2] »

**Fichiers :**
- Créer `lib/nexora/citations.ts` (+ test).
- Modifier `providers/runtime-context.ts` (registre de citations par requête), `providers/index.ts` (création du registre, `sources` posé sur la réponse), `executor/handlers/agent/handler.ts` (consigne de citation dans le message système, sortie `sources`), `blocks/blocks/agent.ts` (sortie `sources` déclarée), `lib/workflows/streaming/agent-stream-protocol.ts` (trame `sources`), `lib/workflows/streaming/streaming.ts` (émission), `assistant/stream-reply.ts`, `assistant/components/message-item.tsx`, `app/(interfaces)/chat/hooks/use-chat-streaming.ts`, `chat/components/message/message.tsx` ; créer `chat/components/message/components/sources-footer.tsx` (partagé) ; messages `interfaces.json`, `assistant.json`.

**Interfaces :**
- Produit : `type CitationSource = { index: number; kind: 'document' | 'web'; title: string; url?: string; excerpt?: string }` ; `createCitationRegistry(workspaceId?: string): CitationRegistry` avec `numberResults(toolId: string, toolParams: Record<string, unknown>, output: unknown): unknown` et `sources(): CitationSource[]` ; `citedSources(content: string, sources: CitationSource[]): CitationSource[]` ; `CITATION_INSTRUCTIONS` ; trame `{blockId, event: 'sources', data: CitationSource[]}`.

- [ ] **Étape 1 : tests rouges** `citations.test.ts` : deux recherches successives ⇒ `ref` 1–3 puis 4–5 ; résultat web ⇒ `kind: 'web'`, `url` ; document téléversé ⇒ lien interne avec `kbName`/`docName` ; `citedSources("… [2] et [5][1]")` ⇒ 2, 5, 1 dans l'ordre d'apparition, sans doublon ; numéro absent (`[9]`) ignoré ; texte sans crochet ⇒ `[]` ; `[1]` dans un bloc de code ignoré. `streaming.test.ts` : sortie d'agent avec `sources` ⇒ trame `sources` avant `final`. `stream-reply.test.ts` : trame `sources` ⇒ `onSources`.
- [ ] **Étape 2 :** rouge.
- [ ] **Étape 3 :** implémenter ; pied « Sources » : puces `[n] titre` cliquables (lien s'il existe, sinon extrait dans une infobulle) ; numéros `[n]` du texte rendus en liens vers l'ancre de la source.
- [ ] **Étape 4 :** vert ; parcours réel : question sur une base ⇒ réponse citée et sources cliquables.

### Tâche 6 : confirmation d'action interactive

**Fichiers :**
- Modifier `lib/workflows/tool-input/types.ts` (`StoredTool.requireConfirmation`), son analyseur, `lib/workflows/comparison/normalize.ts`, `executor/handlers/agent/handler.ts` (`buildMcpTool` reporte le drapeau), `providers/types.ts` (`ProviderToolConfig.requireConfirmation`), `providers/runtime-context.ts` (portillon), `providers/index.ts` (carte drapeau par nom envoyé au modèle).
- Créer `lib/nexora/tool-confirmation/{policy,store,channel,gate}.ts` (+ tests) ; `lib/nexora/connect-actions.ts` (type d'opération d'une action Connect, cache LRU) ; contrat `lib/api/contracts/nexora-tool-confirmations.ts` ; route `app/api/nexora/tool-confirmations/[id]/route.ts` (+ test).
- Modifier `lib/workflows/streaming/agent-stream-protocol.ts` et `streaming.ts` (trames `confirmation` et `confirmation_end`, commentaire d'attente), `app/api/chat/[identifier]/route.ts` (portillon interactif fourni à l'exécution), `components/tools-field.tsx` / `selected-list.tsx` (interrupteur « Demander avant d'agir »), créer `chat/components/message/components/tool-confirmation-card.tsx` (partagée), `use-chat-streaming.ts`, `message.tsx`, `assistant/stream-reply.ts`, `message-item.tsx` ; messages.

**Interfaces :**
- Produit : `type ConfirmationDecision = 'allow' | 'deny'` ; `createConfirmationRequest(input): Promise<{id: string; token: string; expiresAt: string}>` ; `decideConfirmation(id: string, token: string, decision: ConfirmationDecision, decidedBy?: string): Promise<'decided' | 'already_decided' | 'expired' | 'forbidden'>` ; `waitForConfirmation(id: string, timeoutMs: number, signal?: AbortSignal): Promise<ConfirmationDecision | null>` ; `ToolConfirmationGate { mode: 'interactive' | 'deferred'; executionId: string; ... }` ; `needsConfirmation(tool, args): Promise<{needed: boolean; title: string}>`.

- [ ] **Étape 1 : tests rouges** : `store.test.ts` (jeton faux ⇒ `forbidden` ; deux décisions ⇒ une seule retenue ; après délai ⇒ `expired` ; jeton jamais stocké en clair) ; `policy.test.ts` (Connect `execute_action` avec `postmark.send_email` (write) ⇒ confirmer ; action `read` ⇒ non ; action inconnue ou catalogue injoignable ⇒ confirmer ; outil MCP marqué ⇒ confirmer, non marqué ⇒ non) ; `runtime-context` (portillon interactif : refus ⇒ `executeTool` jamais appelé et résultat « refusée » ; accord ⇒ appelé une fois ; délai ⇒ refus) ; `route.test.ts` (403/409/200) ; `streaming.test.ts` (demande publiée ⇒ trame `confirmation` pendant l'exécution du bloc) ; `agents`/`tool-input` (drapeau conservé par l'analyseur et le formulaire).
- [ ] **Étape 2 :** rouge.
- [ ] **Étape 3 :** implémenter.
- [ ] **Étape 4 :** vert ; parcours réel : agent Postmark ⇒ carte ⇒ « Refuser » ⇒ aucune exécution `postmark.send_email` dans le journal de Connect (`GET /api/runs?actionId=postmark.send_email`), puis « Autoriser » ⇒ une exécution.

### Tâche 7 : confirmation dans les exécutions de workflow (pause existante)

**Fichiers :** modifier `providers/runtime-context.ts` (mode `deferred` : action enregistrée, réponse « en attente » au modèle), `executor/handlers/agent/handler.ts` (`_pauseMetadata` humaine avec formulaire Autoriser/Refuser quand des actions sont différées), `lib/workflows/executor/human-in-the-loop-manager.ts` (à la reprise : exécution unique des actions autorisées, sortie `actions`) ; créer `lib/nexora/tool-confirmation/deferred.ts` (+ test).

**Interfaces :** produit `settleDeferredActions(pending: DeferredAgentAction[], submission: Record<string, unknown>, context): Promise<SettledAgentAction[]>` ; sortie de l'agent repris `actions: [{title, decision, success, output?, error?}]`.

- [ ] **Étape 1 : tests rouges** `deferred.test.ts` (refus ⇒ `executeTool` jamais appelé ; accord ⇒ appelé une fois avec les paramètres enregistrés ; reprise rejouée ⇒ pas de seconde exécution) et test du gestionnaire (actions différées ⇒ `_pauseMetadata.pauseKind === 'human'`).
- [ ] **Étape 2 :** rouge. **Étape 3 :** implémenter. **Étape 4 :** vert.

### Tâche 8 : fumée, guides, ledger, vérification

**Fichiers :** `scripts/smoke.py` (contrôles « Interpréteur », « Citations », « Confirmation »), `docs/guide/agents.md`, `docs/guide/assistant.md`, `docs/guide/interpreteur.md` (installation, sécurité, limites, évasion), `docs/guide/reglages.md`, `docs/guide/README.md`, `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md` (section K5).

- [ ] **Étape 1 :** contrôles de fumée (ignorés avec la raison quand l'exécution de code n'est pas activée ou Connect absent) ; lancés contre le serveur de développement sur la pile de pc6.
- [ ] **Étape 2 :** guides et ledger (décisions R1–R14, preuves).
- [ ] **Étape 3 :** vérifications : biome sur les fichiers touchés, `bun run type-check`, `check:audits`, `check:test-types`, `check:api-validation:strict`, vitest ciblé, tests shell de `deploy/`, `check-i18n/brand/no-ee/licenses`, suite d'évasion, preuves en direct (Excel ⇒ graphique et totaux, réponse citée, refus ⇒ rien d'envoyé) avec GLM 5.3 puis `qwen2.5:7b`.
- [ ] **Étape 4 :** commit sur la branche (sans pousser).
