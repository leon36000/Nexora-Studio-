# 21 — Vibe Code : CLI, extension VS Code et Vibe Code Web

> **Périmètre** : Vibe Code, le « mode coding » de Vibe, sur ses trois surfaces (CLI `vibe`, extension VS Code, Vibe Code Web) et dans les clients ACP (JetBrains, Zed) ; installation, configuration complète (`config.toml`), agents, skills, hooks, plugins, serveurs MCP, connecteurs, modèles locaux, clés API, téléportation CLI→web, terminaux, configuration admin (managed config), sécurité/approbations/permissions, sandbox cloud, GitHub, intégration Slack · **Sources** : 34 pages de docs.mistral.ai (copie du 21/10/2026) + vérification ciblée dans la spec OpenAPI locale · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Positionnement : un seul moteur, trois surfaces
   - 3.2 CLI : installation, prérequis, mise à jour
   - 3.3 CLI : accès, authentification, clés API et « profils »
   - 3.4 CLI : mode interactif
   - 3.5 CLI : mode programmatique (scripts, CI)
   - 3.6 CLI : sessions (reprise, fork, rewind) et worktrees git
   - 3.7 CLI : commandes slash et raccourcis clavier
   - 3.8 Configuration : fichiers, répertoire `VIBE_HOME`, précédence
   - 3.9 Référence complète des clés de configuration
   - 3.10 Modèles et fournisseurs
   - 3.11 Modèles hors ligne / locaux
   - 3.12 Agents, sous-agents et `AGENTS.md`
   - 3.13 Skills
   - 3.14 Hooks
   - 3.15 Plugins
   - 3.16 Serveurs MCP
   - 3.17 Connecteurs
   - 3.18 Téléportation CLI → web
   - 3.19 Support des terminaux
   - 3.20 Configuration admin (managed config)
   - 3.21 Sécurité, approbations et permissions
   - 3.22 Extension VS Code
   - 3.23 Migration depuis Mistral Code Enterprise
   - 3.24 Vibe Code Web : concepts, projets, sessions
   - 3.25 Vibe Code Web : sandbox, GitHub, limites, cycle de vie, sécurité
   - 3.26 Vibe Code Web pour Slack
   - 3.27 Vibe dans d'autres IDE (ACP)
4. Interface utilisateur
5. API et SDK (interfaces programmatiques)
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Ce que c'est** : Vibe Code est le **mode « coding »** de Vibe. Avec un accès lecture/écriture au système de fichiers, un shell et un jeu d'outils configurable, il lit des fichiers, lance des commandes, écrit du code et ouvre des pull requests **pour le compte de l'utilisateur et sous sa supervision**. Pour les tâches hors code (apps, documents, chats, réunions, outils métier), la doc oriente vers **Vibe Work**.
- **Trois surfaces, un seul moteur** : la **CLI** (`vibe`, paquet Python `mistral-vibe`), l'**extension VS Code** (« Mistral Vibe for VS Code », ID `mistralai.mistral-vibe-code`) et **Vibe Code Web** (sandbox cloud géré, branché sur un dépôt GitHub). Elles partagent le même moteur, la même configuration (`~/.vibe/`, `.vibe/`) et la même couche de personnalisation (agents, skills, serveurs MCP, connecteurs). Vibe implémente aussi l'**Agent Client Protocol (ACP)** (commande `vibe-acp`) et figure dans le registre ACP : il tourne dans JetBrains (AI Assistant), Zed, etc.
- **CLI et extension VS Code partagent configuration ET sessions** : on peut démarrer une session dans l'une et la reprendre dans l'autre. Le passage vers le web se fait par **téléportation** (`/teleport`, ou préfixe `&`) — à sens unique.
- **Contrôle humain en couches** : agents d'approbation intégrés (`ask`, `accept-edits` **par défaut**, `smart-approve` à classifieur, `auto-approve`), **dossiers de confiance** (trusted folders) pour la config projet, **permissions par outil** (`always`/`ask`/`never`, allow/deny lists), **hooks** shell (`pre_tool`, `post_tool`, `post_agent`), et **admin config** distribuée par l'organisation (qui n'est **pas** une frontière de sécurité).
- **Modèles** : un seul modèle intégré, **Mistral Medium 3.5** (alias `mistral-medium-3.5`) ; tout modèle de l'API Mistral (Codestral, Mistral Large 3, Small 4, Ministral, GLM 5.x de Z.ai…), tout fournisseur compatible OpenAI/Anthropic/Vertex, et modèles **locaux** (Devstral Small 2 via vLLM, preset `llamacpp`). Mode totalement hors ligne possible.
- **Extensibilité** : skills (spécification Agent Skills), plugins (format **Agent Plugins 1.0**, compatibles plugins Claude Code / Codex / Kimi Code / OpenCode), MCP (`http`, `streamable-http`, `stdio`, OAuth), connecteurs gérés par Mistral (partagés avec Vibe Work).
- **Vibe Code Web** = « plan de contrôle pour agents de code distants » : projets (1+ dépôts d'un **même propriétaire GitHub**), sessions dans un sandbox mono-locataire supprimé en fin de session, sortie = branche + pull request (attribuées à l'utilisateur via la **Mistral GitHub App**). Limites : 24 h max, 3 h d'inactivité, 2 sessions/jour (Free) ou 100/jour (payant).
- **Statuts** : Vibe Code Web / Teleport en **Public Preview** ; **plugins expérimentaux** ; smart-approve en **déploiement progressif** ; démarrage de sessions depuis Slack en **déploiement progressif** ; connexion navigateur dans l'extension VS Code « en cours d'activation » ; panneau de réglages de l'extension « en cours ». Le JetBrains plugin **Mistral Code Enterprise est déprécié**.
- **Facturation** : l'usage mensuel inclus des plans Mistral est **partagé entre Studio, l'API et Vibe Code** ; au-delà, pay-as-you-go (désactivé par défaut) sur crédits prépayés, sinon arrêt jusqu'à la période suivante.

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| **Vibe Code** | Mode coding de Vibe : agent avec accès fichiers, shell et outils, supervisé par l'utilisateur. |
| **Vibe Work** | Mode de Vibe pour les tâches transverses (apps, documents, réunions, outils métier) ; partage les connecteurs avec Vibe Code. |
| **Vibe CLI** / `vibe` | Interface terminal (TUI) de Vibe Code ; installe aussi `vibe-acp`. Paquet `mistral-vibe`. |
| `vibe-acp` | Exécutable serveur ACP installé avec la CLI ; à pointer depuis un client ACP sans registre (ex. Zed, `agent_servers`). |
| **ACP (Agent Client Protocol)** | Protocole ouvert client↔agent ; l'extension VS Code exécute l'agent Vibe via ACP ; JetBrains/Zed s'y branchent. |
| **Mode interactif** | Session de chat TUI (par défaut). |
| **Mode programmatique** | Exécution non interactive `vibe --prompt …` (scripts, CI) : pas de TUI, outils interactifs désactivés, appels nécessitant approbation refusés sauf `--auto-approve`. |
| **Agent** | « Surcharge de configuration » appliquée sur la config globale : prompt système, prompt de compaction, modèle actif, outils disponibles, règles d'approbation. |
| **Agents intégrés** | `ask`, `accept-edits` (défaut), `smart-approve`, `auto-approve`, `lean` (Lean 4, à installer). |
| **Subagent** (sous-agent) | Agent de délégation uniquement (`agent_type = "subagent"`), lancé par l'agent principal, renvoie du texte seul ; non sélectionnable par l'utilisateur. |
| `safety` | Indice visuel d'un agent (`safe`, `neutral`, `destructive`, `smart`, `yolo`) qui change la couleur de bordure de l'input ; n'applique aucune permission (sauf masquage des agents `yolo` quand `enable_auto_approve = false`). |
| **Smart approve** | Agent qui fait classifier chaque appel d'outil par un modèle ; exécute les appels jugés sûrs, retient les risqués. « Un classifieur, pas un sandbox. » |
| **Utility models** | Modèles des tâches de fond (`[utility_models]`) : classifieur smart-approve, titres de session. |
| **Trusted folder** (dossier de confiance) | Répertoire explicitement approuvé ; seule condition pour charger la config projet `.vibe/`, `.agents/skills/`, `AGENTS.md`. Mémorisé dans `~/.vibe/trusted_folders.toml`. |
| **Per-tool permissions** | Blocs `[tools.<nom>]` : `permission` (`always`/`ask`/`never`), `allowlist`, `denylist`. |
| **Skill** | Répertoire contenant un `SKILL.md` (frontmatter YAML + instructions) ; peut devenir une commande slash. Conforme à la spec Agent Skills (agentskills.io). |
| **Plugin** | Répertoire qui empaquette skills, serveurs MCP, dossiers de connaissance, sous-agents, hooks, bibliothèques, connecteurs requis ; manifeste `plugin.json` au format Agent Plugins 1.0. |
| `ai.mistral.vibe` | ID de l'extension Vibe dans un manifeste de plugin et nom du dossier des composants spécifiques Vibe. |
| **Namespace** (`toolNamespace`) | Préfixe des skills/connaissances/sous-agents d'un plugin (`release:changelog`). |
| **Knowledge folder** | Dossier de référence d'un plugin (`KNOWLEDGE.md`), lu par l'agent seulement quand c'est pertinent. |
| **Pinned plugins** | Contenu des plugins figé au démarrage de session jusqu'à `/reload-plugins`. |
| **Hook** | Commande shell branchée sur le cycle de vie : `pre_tool`, `post_tool`, `post_agent` ; contrat JSON stdin/stdout. |
| **MCP server** | Serveur Model Context Protocol configuré par l'utilisateur ; outils nommés `{server}_{tool}`. |
| **Connector** | Intégration gérée par Mistral (ex. `web_search`, GitHub, DeepWiki) ; outils nommés `connector_{connector}_{tool}`. |
| **Provider preset** / **Model preset** | Tables `[[providers]]` / `[[models]]` de `config.toml` décrivant un fournisseur d'inférence et un modèle (avec `alias`). |
| `active_model` | Alias du modèle courant. |
| **Compaction** | Résumé automatique ou manuel (`/compact`) de l'historique quand le contexte se remplit. |
| **Thinking level** | Niveau de raisonnement : `off`, `low`, `medium`, `high`, `max`. |
| **Admin config** / **managed config** | Configuration distribuée par l'administrateur (Organisation ou Workspace) aux clients CLI et VS Code ; couche de plus haute priorité. |
| `VIBE_HOME` | Variable qui déplace le répertoire d'état `~/.vibe/`. |
| `AGENTS.md` | Fichier d'instructions agent (utilisateur `~/.vibe/AGENTS.md` et projet). |
| **Worktree** | Session lancée dans un git worktree isolé (`--worktree`), stocké sous `~/.vibe/worktrees/`. |
| **Teleport** | Transfert d'une session CLI vers un sandbox Vibe Code Web (`/teleport`) ou envoi d'un prompt unique (`&`). |
| **Vibe Code Web** | Interface web / plan de contrôle d'agents de code distants. |
| **Project** (web) | Espace de travail : 1+ dépôts GitHub d'un même propriétaire + sessions. |
| **Session** (web) | Une exécution de l'agent contre un projet dans un sandbox dédié. |
| **Sandbox** | Environnement cloud isolé, mono-locataire, supprimé en fin de session. |
| **Activity stream** | Flux chronologique des commandes et sorties d'une session web ; « votre journal d'audit ». |
| **Mistral GitHub App** | App GitHub qui clone, pousse et ouvre des PR ; jetons *user access token* et *installation access token*. |
| **Leanstral** | Agent Lean 4 (`lean`) installable via `/leanstall`. |
| **Mistral Code Enterprise** | Ancienne extension (VS Code / JetBrains) remplacée par Vibe ; plugin JetBrains déprécié. |

## 3. Fonctionnalités en détail

### 3.1 Positionnement : un seul moteur, trois surfaces

**Cas d'usage annoncés** : écrire du code conforme aux conventions du projet ; explorer/expliquer une base de code ; revue de code (bugs, edge cases, changements risqués) ; débogage (erreur, test en échec, stack trace) ; automatisation (refactors, tests, migrations, setup, préparation de PR).

**Choisir la surface** (page « Choose CLI, VS Code, or web sessions ») :

| | CLI | Extension VS Code | Vibe Code Web |
|---|---|---|---|
| Installation locale | Requise | Requise (pas besoin de la CLI) | Aucune |
| Accès au dépôt | Clone local | Clone local | Directement via GitHub |
| Fichiers et shell | Working tree local | Working tree local, via ACP | Sandbox distant |
| Agents, skills, MCP, connecteurs personnalisés | Oui | Oui | Oui |
| Mode non interactif | Oui (`vibe --prompt`) | Non | Non |
| Durée de vie des sessions | Terminal local (partagé avec VS Code) | VS Code local (partagé avec la CLI) | Cloud géré |
| Meilleur usage | Développement terminal, automatisation, CI | Développement dans l'éditeur, revue visuelle | Tâches sur dépôt distant sans setup local |

- **CLI** : « la surface la plus flexible » ; tout émulateur de terminal ; sessions interactives et scripting ; accès complet au shell et au working tree. Exemples : refactorer un dossier, expliquer l'authentification, « lancer la suite de tests, corriger, committer », exécutions non surveillées en CI.
- **VS Code** : même agent que la CLI via ACP + **contexte éditeur** (fichier actif, sélection, diffs, source control). Exemples : expliquer le fichier ouvert, relire un diff avant PR, refactorer une sélection.
- **Vibe Code Web** : pas de checkout local ; sandbox géré ; prépare branches et PR ; peut reprendre une session démarrée en CLI ; laisse l'agent travailler en autonomie.
- **Slack** (cf. 3.26) : quand le contexte vit déjà dans un fil Slack (incident, support, alerte, décision d'équipe). **Web** : quand on connaît le dépôt et qu'on veut lancer une tâche distante. **CLI** : quand on travaille déjà en local ou que la tâche dépend de fichiers, services, secrets ou environnement locaux.
- Vibe Code Web est à éviter pour les tâches dépendant de fichiers locaux, secrets locaux, runtimes non supportés, matériel spécifique (GPU), services locaux.

### 3.2 CLI : installation, prérequis, mise à jour

**Méthodes d'installation**

| Plateforme | Commande | Détails |
|---|---|---|
| macOS / Linux (recommandé) | `curl -LsSf https://mistral.ai/vibe/install.sh \| bash` | Vérifie/installe `uv`, puis `uv tool install` ou `uv tool upgrade` de `mistral-vibe` ; rend disponibles `vibe` et `vibe-acp` (si le `PATH` est configuré ; sinon ajouter le dossier indiqué au profil shell et redémarrer le terminal). |
| Manuel | `uv tool install mistral-vibe` ou `pip install mistral-vibe` | Pour gérer soi-même ses outils Python. |
| Windows | `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 \| iex"` puis `uv tool install mistral-vibe` | Supporté, mais macOS et Linux sont les plateformes principales. |

**Prérequis** : Python **3.12+** pour l'installation manuelle (Vibe **3.0.0 seule** exigeait Python 3.14) ; compte Mistral **optionnel** (la CLI fonctionne entièrement hors ligne avec des modèles locaux ou avec toute clé API compatible).

**Premier lancement** (`vibe` à la racine du projet) : démarre avec les valeurs par défaut intégrées ; n'écrit `~/.vibe/config.toml` **que lorsqu'un réglage est sauvegardé** (thème choisi au setup, changement via `/config`) ; lance un **assistant de configuration** (setup wizard). Relancer l'assistant : `vibe --setup`.

**Vérifier** : `vibe --version` renvoie une version ; `vibe` ouvre la TUI ; un prompt est accepté sans redemande de clé. Prompt d'essai suggéré : « Find TODO comments in this project. »

**Mise à jour** : vérification d'une nouvelle version **une fois par jour**, proposée au lancement suivant (`enable_update_checks`, recommandé de le laisser activé). Forcer : `vibe update` ou `vibe --check-upgrade` (demandent confirmation avant d'installer, puis quittent).

**Réinitialiser** : `mv ~/.vibe/config.toml ~/.vibe/config.toml.bkp` puis `vibe` → redémarrage sur défauts intégrés.

### 3.3 CLI : accès, authentification, clés API et « profils »

**Choix d'accès dans l'assistant** :

| Option | Effet |
|---|---|
| **Launch browser** | Connexion avec le compte Mistral ; utilise le plan Mistral (Vibe Code inclus, limites selon plan et pay-as-you-go). Activé par défaut quand la config cible un fournisseur Mistral : les identifiants sont provisionnés et stockés automatiquement. |
| **Launch browser › Other** | Pour un déploiement **dédié ou auto-hébergé** : saisir le domaine de la console ; Vibe enregistre les URLs du déploiement dans le `config.toml` utilisateur. |
| **Use an API key** | Coller une clé générée dans **Code › Vibe CLI** (https://chat.mistral.ai/code/extensions) ou une clé d'un autre fournisseur compatible. La même clé fonctionne en mode Free, plan payant ou pay-as-you-go. |

**Où la clé est stockée / lue** — trois sources ; **ordre de résolution** (première trouvée gagne) :

1. **Environnement shell** (`MISTRAL_API_KEY`, ou `<PROVIDER>_API_KEY` référencée par `api_key_env_var`) — prioritaire.
2. **`~/.vibe/.env`** (chargé automatiquement au démarrage ; lisible uniquement par l'utilisateur ; **réservé aux identifiants**, la config générale va dans `config.toml`).
3. **Trousseau de l'OS** (macOS Keychain, Windows Credential Manager…) — là où l'assistant enregistre la clé ; repli sur `~/.vibe/.env` si aucun trousseau.

**Diagnostic** : `/status` affiche modèle et fournisseur actifs, **source d'identifiant utilisée** et sources qu'elle masque ; `/whoami` affiche le compte connecté, le Workspace, le plan et la portée de la clé.

**Bonnes pratiques clés** : clé de moindre privilège ; rotation et révocation régulières depuis la console ; ne jamais coller de clé dans prompts, logs, captures, tickets.

**« Profils »** : il n'existe pas de concept explicite de profil ; on bascule via des **presets** `[[providers]]` + `[[models]]` + `active_model` (exemple doc : OpenRouter, `api_style = "openai"`, `backend = "generic"`, modèle `mistralai/devstral-2512:free` alias `devstral-openrouter`, `input_price = 0.0`, `output_price = 0.0`), puis `export OPENROUTER_API_KEY=…`. Changer de modèle en session : `/config` ou `/model`.

### 3.4 CLI : mode interactif

Lancement : `vibe` ou `vibe "prompt initial"`. TUI de chat dans le terminal.

| Préfixe / geste | Effet |
|---|---|
| `@chemin` | Attache un fichier au prompt (autocomplétion). Pour une **image** : `@`-mention ou coller le chemin ; sur macOS, `Ctrl+V` ou `/paste-image` depuis le presse-papiers. Les images fonctionnent si le modèle actif les supporte (`supports_images`) ou si un `vision_model` est configuré. |
| `/` | Sélecteur de commandes slash avec autocomplétion (intégrées + skills + plugins). |
| `!commande` | Exécute directement dans le shell, **sans passer par l'agent** ; commande et sortie sont visibles par l'agent au message suivant. |
| `& prompt` | Envoie le prompt à un **sandbox Vibe Code Web** ; la CLI renvoie le lien de session cloud (cf. 3.18). |
| `Enter` pendant que l'agent travaille | **Met en file** un message ; tous les messages en file partent ensemble à la fin du tour. `Enter` à nouveau avec input vide → les remet à l'agent avant la fin du tour. |
| `Up` dans la file | Sélectionne un message en file ; `Enter` pour l'éditer, `Backspace` pour le retirer. |
| `Escape` | Interrompt l'agent et **met la file en pause** ; `Enter` envoie les messages en pause. |

Les commandes `!` et la plupart des commandes slash attendent que l'agent soit inactif.

**Revue avant application** : pour les modifications substantielles ou commandes shell, la CLI montre un **aperçu**, **demande confirmation** (sauf agent auto-approbateur), puis **affiche le résultat** de chaque étape.

### 3.5 CLI : mode programmatique (scripts, CI)

Déclenché par `--prompt` / `-p` : exécute une tâche et quitte. Prompt depuis un fichier (`--prompt-file PATH`) ou stdin (`-p` sans texte).

Comportement : pas de TUI ; outils interactifs (ex. `ask_user_question`) désactivés ; utilise `default_agent` (`accept-edits` sauf changement) ; **tout appel nécessitant une approbation est refusé** ; `--auto-approve` (alias `--yolo`) approuve tout (à réserver aux sandboxes), **ignoré** si l'admin a mis `enable_auto_approve = false` → autoriser alors via `permission = "always"` ou `allowlist`. **Pas de demande de confiance** : utiliser `--trust` (confiance temporaire). Smart approve en programmatique : appels risqués refusés.

| Flag | Effet |
|---|---|
| `--max-turns N` | Plafonne le nombre de tours assistant (**recommandé**). |
| `--max-tokens N` | Plafonne le total de tokens prompt + complétion. |
| `--time-limit SECONDS` | Arrête après échéance ; session reprenable ensuite. `SIGTERM` agit pareil. |
| `--max-price DOLLARS` | Plafond de coût **indicatif seulement** (prix issus de la config, possiblement manquants/obsolètes). |
| `--enabled-tools TOOL` | Restreint aux outils listés (nom exact, glob `bash*`, regex `re:^serena_.*$`) ; répétable. |
| `--disabled-tools TOOL` | Désactive après filtrage `--enabled-tools` ; répétable. |
| `--output text\|json\|streaming` | `text` (défaut) : réponse finale ; `json` : messages de session en tableau JSON à la fin ; `streaming` : un objet JSON par message au fil de l'eau. |
| `--output-dir DIR` | Écrit `export.json` (version de Vibe, config effective, usage tokens, coût, raison d'arrêt, issue) + copie de la session, quelle que soit la fin ; liste aussi chaque sous-agent (statut, modèle, tokens, coût, étapes) et copie sa session. |
| `--continue` / `--resume SESSION_ID` | Combinés à `-p`, continuent une session sauvegardée. |

Avant de quitter, une exécution programmatique **attend les sous-agents** laissés actifs par le dernier tour (`--time-limit` et autres arrêts les interrompent).

**Codes de sortie** : `0` agent terminé ; `1` démarrage impossible (flag ou config invalide) ; `2` échec de l'API modèle ou du runtime ; `3` arrêt avant la fin (limite atteinte, run stoppé, ou **refus de répondre du modèle**).

### 3.6 CLI : sessions (reprise, fork, rewind) et worktrees git

| Commande | Effet |
|---|---|
| `vibe --continue` / `-c` | Reprend la session la plus récente (du répertoire courant). |
| `vibe --resume` | Sélecteur des sessions passées (du répertoire courant). |
| `vibe --resume SESSION_ID` | Reprend une session précise, **ID partiel accepté**, depuis n'importe quel répertoire. |
| `/resume` (alias `/continue`) | Même sélecteur en session ; `d` deux fois supprime la session surlignée. |
| `/branch` | Fork de la conversation en nouvelle session reprenable (`vibe --resume <id>`), session courante inchangée. |
| `/rewind` ou `Escape` ×2 (input vide) | Revient à un message antérieur pour l'éditer et repartir de là. |
| `/rename` | Renomme la session. |

- Une session reprise **garde l'agent sur lequel elle tournait**, même si `default_agent` a changé ou si `--agent` est passé ; changer d'agent dans la session. Si l'agent n'existe plus → `--agent` ou `default_agent`.
- Compatibilité : Vibe 3.0 reprend les sessions de Vibe 2.0+, **pas celles de Vibe 1.x**.
- La reprise exige `[session_logging] enabled = true` (défaut).

**Worktrees** : `vibe --worktree my-feature` crée (ou réutilise) un git worktree sous `~/.vibe/worktrees/` sur une branche `my-feature`. Sans nom, le worktree est nommé d'après le prompt — **mettre le prompt en premier** (`vibe "Fix the login bug" --worktree`) car `--worktree` lit l'argument suivant comme nom. En fin de session interactive, Vibe supprime un worktree qu'il a créé s'il n'a aucun changement, sinon demande ; les exécutions programmatiques le laissent. `--worktree` vaut confiance pour le run (pas besoin de `--trust`) ; combinable avec `-c`/`--resume`. `worktree_limit` (défaut `15`) borne le nombre de worktrees récents conservés.

### 3.7 CLI : commandes slash et raccourcis clavier

**Commandes slash intégrées** (une commande absente de cette liste vient d'un skill local ou d'un plugin — préfixe `namespace:`) :

| Commande | Alias | Rôle |
|---|---|---|
| `/branch` | | Fork en nouvelle session reprenable. |
| `/clear` | `/new` | Nouvelle conversation ; prompt d'amorçage optionnel. |
| `/compact` | | Compacte l'historique par résumé ; instructions optionnelles. |
| `/config` | | Éditeur de réglages. |
| `/copy` | | Copie le dernier message de l'agent. |
| `/data-retention` | | Informations de rétention des données. |
| `/debug` | | Bascule la console de debug. |
| `/exit` | `:q`, `:quit`, `exit`, `quit` | Quitte. |
| `/help` | | Aide. |
| `/leanstall` / `/unleanstall` | | Installe / désinstalle l'agent Lean 4 (leanstral). |
| `/log` | | Chemin du fichier de log d'interaction courant. |
| `/log-level` | | Change le niveau de log pour la session ou le persiste dans `config.toml`. |
| `/loop` | | Planifie un prompt récurrent en langage naturel (ex. `/loop every two minutes check the build`) ; demander à l'agent de lister/annuler les planifications. |
| `/mcp` | `/connectors` | Parcourt serveurs MCP et connecteurs ; un nom liste ses outils ; sous-commandes `add`, `status`, `login`, `logout`. |
| `/model` | | Choix du modèle : `Enter` sauvegarde en config, `s` pour la session seulement. |
| `/paste-image` | | Colle une image du presse-papiers (macOS uniquement). |
| `/plugins` | | Plugins de la session. |
| `/proxy-setup` | | Proxy et certificats SSL. |
| `/reload` | | Recharge config, instructions d'agent et skills (pas les plugins) ; re-télécharge l'admin config. |
| `/reload-plugins` | | Re-épingle les plugins et rapporte les changements. |
| `/remote-project` | | Choisit le projet Vibe Code Web associé au dépôt. |
| `/rename` | | Renomme la session. |
| `/resume` | `/continue` | Parcourt, reprend ou supprime des sessions. |
| `/retry` | | Reprend une réponse interrompue ; instructions optionnelles. |
| `/rewind` | | Revient à un message précédent (ou `Esc` ×2). |
| `/status` | | Statistiques agent, modèle/fournisseur, source d'identifiant. |
| `/teleport` | | Téléporte la session vers Vibe Code Web. |
| `/theme` | | Thème. |
| `/thinking` | | Niveau de réflexion : `Enter` sauvegarde, `s` session seulement. |
| `/voice` | | Active/désactive le mode voix (dictée via `Ctrl+R`) et le **narrateur expérimental**. |
| `/whoami` | | Utilisateur Mistral connecté, workspace, plan. |

**Raccourcis clavier** (certains dépendent du terminal, de SSH, de tmux — cf. 3.19) :

| Raccourci | Action |
|---|---|
| `Enter` | Envoyer. |
| `Ctrl+J` / `Shift+Enter` | Nouvelle ligne (`Shift+Enter` seulement si le terminal le signale). |
| `Ctrl+C` | Copie la sélection s'il y en a ; sinon efface l'input ; input vide : refuse l'approbation en attente, retire le dernier message en file, ou interrompt l'agent ; rien en cours : deux fois pour quitter. |
| `Ctrl+D` | Supprime le caractère à droite ; input vide : deux fois pour quitter (une fois si `ask_confirmation_on_exit = false`). |
| `Ctrl+Z` | Suspend la CLI (macOS/Linux). |
| `Escape` / `Escape` ×2 | Interrompt / ferme le dialogue ; ×2 ouvre rewind (ou efface l'input s'il contient du texte). |
| `Ctrl+O` | Bascule l'affichage de la sortie des outils. |
| `Ctrl+G` | Édite l'input dans un éditeur externe. |
| `Ctrl+R` | Démarre/arrête l'enregistrement vocal (mode voix actif) ; `Escape` annule. |
| `Ctrl+Y` | Copie la sélection (macOS/Linux). |
| `Ctrl+Shift+C` / `Cmd+C` | Copie la sélection. |
| `Shift+Tab` | Fait défiler les agents (ask → accept-edits → smart-approve → auto-approve). |
| `Shift+Up` / `Shift+Down` | Défile le chat. |
| `Cmd+\` / `Alt+\` | Panneau todo list. |
| `Ctrl+\` | Console de debug. |

Souris : clic sur options d'approbation, questions, entrées de sélecteurs ; drag des barres de défilement ; double-clic = mot, triple-clic = paragraphe ; copie au relâchement sauf `autocopy_to_clipboard = false`.

### 3.8 Configuration : fichiers, répertoire `VIBE_HOME`, précédence

**Deux fichiers `config.toml` fusionnés** :
1. **Projet** : le `.vibe/config.toml` le plus proche en remontant depuis le répertoire de travail, **sans dépasser le home** ; chargé **uniquement si le dossier est de confiance**.
2. **Utilisateur** : `~/.vibe/config.toml`.

Les réglages projet surchargent les mêmes réglages utilisateur ; le reste vient du fichier utilisateur. `/config` sauvegarde par défaut dans le fichier utilisateur ; **Save to** permet de cibler le fichier projet ou la session courante seulement. Ouvrir le fichier : `open` (macOS), `xdg-open` (Linux), `Invoke-Item ~\.vibe\config.toml` (PowerShell).

**`VIBE_HOME`** déplace : `config.toml`, `.env`, `agents/`, `prompts/`, `skills/`, `plugins/`, `tools/`, `logs/` (et `AGENTS.md` utilisateur).

**Autres fichiers d'état mentionnés** : `~/.vibe/trusted_folders.toml`, `~/.vibe/managed_config_cache.json`, `~/.vibe/hooks.toml`, `~/.vibe/logs/vibe.log`, `~/.vibe/logs/session/` (sessions), `~/.vibe/worktrees/`.

**Répertoire de travail** : `--workdir /chemin` cible un autre projet ; `--add-dir DIR` (répétable) ajoute un répertoire pour la session : Vibe lui fait confiance pour la session, charge son `AGENTS.md` et sa config `.vibe/`, et autorise lecture/écriture sans l'invite « hors workdir ».

**Précédence (du plus fort au plus faible)** :

```text
admin config  >  agent settings  >  CLI flags (+ réglages /config « session »)  >  VIBE_* env vars  >  project config.toml  >  user config.toml
```

**Certificats d'entreprise** : par défaut validation contre les racines embarquées ; depuis Vibe 3.0, validation plus stricte (une CA privée sans certaines extensions standard peut être rejetée) → `enable_system_trust_store = true` pour utiliser le magasin de l'OS. `SSL_CERT_FILE` et `SSL_CERT_DIR` sont aussi chargés comme ancres supplémentaires. `/proxy-setup` configure proxy et certificats en session.

### 3.9 Référence complète des clés de configuration

#### 3.9.1 Clés de premier niveau (`config.toml`)

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `default_agent` | string | `"accept-edits"` | Agent sans `--agent`, interactif et programmatique. |
| `active_model` | string | | Alias de modèle courant (`[[models]].alias` ou ID intégré). |
| `allowed_models` | array<string> | | Liste blanche de motifs (exact, glob, `re:`) appliqués au **nom envoyé à l'API d'inférence**, pas à l'alias. Non vide → seuls les modèles correspondants sont sélectionnables. |
| `compaction_model` | table | modèle actif | Modèle de résumé (`/compact` et automatique) ; doit utiliser le fournisseur du modèle actif, sinon avertissement et repli. |
| `auto_compact_threshold` | number | | Seuil (tokens) de compaction auto pour les modèles qui n'en définissent pas ; ignoré s'il ≥ `max_context_length`. Non défini : 80 % de `max_context_length`, ou 200 000 tokens si fenêtre inconnue. `0` désactive. |
| `compaction_max_output_tokens` | number | `80000` | Plafond de sortie des requêtes de compaction (≤ plafond du modèle). `0` = même plafond que les autres requêtes. |
| `compaction_thinking` | string | | Niveau de réflexion de la 1re requête de compaction (`off`…`max`) ; la requête de repli tourne toujours sans raisonnement. |
| `compaction_reasoning_limit_tokens` | number | `32000` | Tokens de raisonnement (approx.) après lesquels la 1re requête est abandonnée pour un repli simple (sans outils ni raisonnement). `0` désactive. |
| `output_limit_retries` | number | `6` | Nombre de fois par tour où une réponse tronquée à la limite de sortie est jetée et redemandée (avec consigne de concision). `0` = fin du tour à la 1re troncature. |
| `output_token_reserve` | number | `4096` | Tokens gardés libres quand Vibe abaisse le plafond de sortie pour tenir dans le contexte (modèles avec `max_context_length`). |
| `vision_model` | table | | Modèle vision qui décrit les images si le modèle actif ne les supporte pas ; défaut : tout modèle vision du fournisseur actif. |
| `enabled_agents` / `disabled_agents` | array<string> | | Liste blanche / noire d'agents (noire appliquée si blanche vide). |
| `agent_paths` | array<string> | | Répertoires supplémentaires de découverte d'agents. |
| `system_prompt_id` | string | `"cli"` | Prompt système = nom d'un `.md` dans `~/.vibe/prompts/` ou `.vibe/prompts/` (sans extension). |
| `compaction_prompt_id` | string | `"compact"` | Prompt de compaction. |
| `title_prompt_id` | string | `"session_title"` | Prompt de génération des titres. |
| `skill_paths` | array<string> | | Répertoires supplémentaires de skills. |
| `enabled_skills` / `disabled_skills` | array<string> | | Filtres de skills (exact, glob, `re:`). |
| `enabled_tools` / `disabled_tools` | array<string> | | Filtres d'outils ; `disabled_tools` appliqué après `enabled_tools`. |
| `enable_mcp` | boolean | `true` | `false` bloque ajout/suppression/activation/connexion des serveurs MCP et le chargement de leurs outils (y compris des plugins). |
| `enable_connectors` | boolean | `true` | Autorise les connecteurs, y compris la recherche web intégrée. |
| `enable_auto_approve` | boolean | `true` | `false` masque `auto-approve` et tout agent `safety = "yolo"`, ignore `--auto-approve`, `--yolo`, `bypass_tool_permissions`. Pensé pour l'admin config. |
| `enable_subagents` | boolean | `true` | Délégation à des sous-agents. |
| `enable_background_processes` | boolean | `true` | Commandes en arrière-plan ; `false` → tout au premier plan jusqu'à complétion. |
| `enable_update_checks` | boolean | `true` | Vérification quotidienne de version. |
| `enable_notifications` | boolean | `true` | Cloche + titre du terminal quand Vibe finit ou attend une entrée, si le terminal n'a pas le focus. |
| `enable_telemetry` | boolean | `true` | Télémétrie anonyme d'usage et d'erreurs (aucun prompt, contenu de fichier ni sortie de modèle). |
| `enable_system_trust_store` | boolean | `false` | Valide HTTPS contre le magasin de l'OS. |
| `api_stream_idle_timeout` | number | `0` | Secondes de silence (après début de réponse) avant de considérer le flux bloqué ; `0` = pas de limite. |
| `ask_confirmation_on_exit` | boolean | `true` | Demande un 2e `Ctrl+D` (`Ctrl+C` demande toujours). |
| `autocopy_to_clipboard` | boolean | `true` | Copie au relâchement d'une sélection souris. |
| `cursor_blink` | boolean | `true` | Curseur clignotant. |
| `theme` | string | `"auto"` | `auto` suit le fond du terminal ou la préférence OS ; `/theme`. |
| `show_subagent_status_list` | boolean | `true` | Liste des sous-agents actifs au-dessus du prompt. |
| `worktree_limit` | number | `15` | Nombre max de worktrees Vibe récents gardés. |
| `log_level` | string | `"WARNING"` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` pour `~/.vibe/logs/vibe.log`. |
| `experimental_enable_model_catalog` | boolean | `false` | Expérimental : récupère le **catalogue de modèles curé** par Mistral au démarrage ; sans choix utilisateur, Vibe utilise le modèle recommandé du catalogue (sauf expérience assignant un autre). |
| `[[providers]]`, `[[models]]`, `[[mcp_servers]]`, `[[connectors]]` | table array | | Voir ci-dessous. |
| `[utility_models]`, `[session_logging]` | table | | Voir ci-dessous. |
| `[tools.<nom>]` | table | | Permissions par outil. |

**Clés dépréciées sans effet** : `displayed_workdir`, `context_warnings`, `raise_on_compaction_failure`, `enable_auto_update` (remplacé par `enable_update_checks`). Clé citée ailleurs : `bypass_tool_permissions` (ignorée quand `enable_auto_approve = false` ; non décrite dans la référence).

#### 3.9.2 `[[providers]]`

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `name` | string | requis | Identifiant référencé par `[[models]].provider`. |
| `api_base` | string | requis | URL de base de l'API. |
| `api_key_env_var` | string | | Variable d'env portant la clé (**forme obligatoire pour les secrets en admin config**). |
| `api_style` | string | `"openai"` | `"openai"`, `"openai-responses"`, `"reasoning"`, `"anthropic"`, `"vertex-anthropic"`. |
| `backend` | string | `"generic"` | `"generic"` ou `"mistral"`. |
| `region` | string | | Région Google Cloud (Vertex, `vertex-anthropic`) ; requiert `project_id`. |
| `project_id` | string | | Projet Google Cloud (Vertex). |
| `[providers.extra_headers]` | table | | En-têtes HTTP supplémentaires (ex. `"x-acme-tenant" = "engineering"`). |

Presets fournisseurs intégrés mentionnés : `mistral` (intégré) et `llamacpp` (`http://127.0.0.1:8080/v1`, sans clé).

#### 3.9.3 `[[models]]`

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `name` | string | requis | ID du modèle (ex. `mistral-medium-latest`). |
| `provider` | string | requis | Référence un `[[providers]].name`. |
| `alias` | string | `name` | Alias local utilisé par `active_model`. |
| `display_name` | string | `alias` | Libellé du sélecteur. |
| `temperature` | number | `0.2` | Température d'échantillonnage. |
| `top_p` | number | | Nucleus sampling, ]0 ; 1]. |
| `max_output_tokens` | number | | Sortie max par requête. |
| `input_price` / `output_price` | number | | Coût par million de tokens, sert au plafonnement de coût en programmatique. |
| `cached_input_price` | number | | Coût par million de tokens d'entrée en cache (sinon `input_price`). |
| `thinking` | string | `off` | Niveau de réflexion par défaut (parmi `thinking_levels`). |
| `thinking_levels` | array<string> | `off`, `low`, `medium`, `high`, `max` | Niveaux disponibles. |
| `supports_images` | boolean | `false` | Modèle vision ; autorise les `@`-mentions d'images. |
| `max_context_length` | number | | Fenêtre de contexte ; pilote la compaction auto et abaisse le plafond de sortie (moins `output_token_reserve`). |
| `auto_compact_threshold` | number | | Seuil de compaction propre au modèle (remplace 80 % de `max_context_length`). |

#### 3.9.4 `[utility_models]`

Valeur = `alias` d'un `[[models]]` ou `"active"` (modèle de la session). Non défini : petit modèle Mistral rapide si le fournisseur Mistral en sert un, sinon modèle de session. Alias inconnu ou exclu par `allowed_models` → avertissement + sélection automatique.

| Clé | Défaut | Rôle |
|---|---|---|
| `smart_approve` | Automatique | Classifieur de l'agent `smart-approve`. |
| `title` | Automatique | Génération des titres de session. |

#### 3.9.5 `[session_logging]`

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `enabled` | boolean | `true` | Sauvegarde des sessions (nécessaire à `--continue`, `--resume`, `/resume`). |
| `save_dir` | string | `~/.vibe/logs/session` | Répertoire de sauvegarde. |
| `generate_titles` | boolean | `true` | Titres générés en arrière-plan ; `false` → premier message affiché. |

#### 3.9.6 `[[mcp_servers]]` et `[mcp_servers.auth]`

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `name` | string | requis | Alias court ; préfixe des outils. |
| `transport` | string | requis | `http`, `streamable-http`, `stdio`. |
| `url` | string | | URL (HTTP). |
| `command` / `args` | string / array | | Commande et arguments (stdio). |
| `env` | table | | Variables d'env du processus stdio. |
| `startup_timeout_sec` | number | `10` | Attente de démarrage. |
| `tool_timeout_sec` | number | `60` | Attente d'un appel d'outil. |
| `disabled` | boolean | `false` | Masque tous les outils du serveur (`/mcp` bascule). |
| `disabled_tools` | array<string> | | Outils (sans préfixe) à masquer. |

| `[mcp_servers.auth]` | Type | Défaut | Effet |
|---|---|---|---|
| `type` | string | `"static"` | `"static"` (en-têtes / clé) ou `"oauth"` (connexion navigateur). |
| `headers` | table | | `static` : en-têtes. |
| `api_key_env` | string | | `static` : variable d'env de la clé (≠ `api_key_env_var` des fournisseurs). |
| `api_key_header` | string | `"Authorization"` | `static` : nom d'en-tête. |
| `api_key_format` | string | `"Bearer {token}"` | `static` : format de valeur. |
| `scopes` | array<string> | requis pour `oauth` | Scopes OAuth ; liste vide = scopes par défaut du serveur. |

Rétrocompatibilité : `headers`, `api_key_env`, `api_key_header`, `api_key_format` au niveau de `[[mcp_servers]]` = auth statique (ne pas combiner avec `[mcp_servers.auth]`).

#### 3.9.7 `[[connectors]]`

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `name` | string | requis | Nom tel que listé par `/connectors` (ex. `web_search`). |
| `disabled` | boolean | `false` | Masque tous les outils du connecteur. |
| `disabled_tools` | array<string> | | Outils (sans préfixe) à masquer. |

`/connectors` écrit ces entrées quand on active/désactive un connecteur ou un outil.

#### 3.9.8 `[tools.<tool_name>]`

`<tool_name>` = outil intégré (`read_file`, `write_file`, `edit`, `bash`, `grep`, `skill`, `ask_user_question`, `process_start`…), outil MCP `{server_name}_{tool_name}`, ou outil connecteur `connector_{connector_name}_{tool_name}`.

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `permission` | string | | `"always"` (auto), `"ask"` (demande), `"never"` (bloqué). |
| `allowlist` | array<string> | commandes lecture seule pour `bash` | Autorisé sans approbation : préfixes de commande pour `bash` (`["git status", "pnpm test"]`) ; globs de chemins absolus pour `read_file`, `write_file`, `edit` (`["/home/me/project/docs/*"]`). **Remplace** la liste par défaut. |
| `denylist` | array<string> | commandes interactives pour `bash` | Toujours refusé (`["rm -rf"]`, ou globs de chemins). **Remplace** la liste par défaut. |

#### 3.9.9 Fichiers de définition d'agent (`~/.vibe/agents/<nom>.toml`, `./.vibe/agents/<nom>.toml`)

| Clé | Type | Défaut | Effet |
|---|---|---|---|
| `agent_type` | string | `"agent"` | `"agent"` (sélectionnable) ou `"subagent"` (délégation). |
| `display_name` | string | | Libellé. |
| `description` | string | | Description ; **requise pour les sous-agents**. |
| `instructions` | string | | Prompt inline : pour un agent, **ajouté après** le prompt système ; pour un sous-agent, **remplace** le prompt `system_prompt_id`. |
| `safety` | string | `"neutral"` | `safe`, `neutral`, `destructive`, `smart`, `yolo` (couleur de bordure seulement). |
| `system_prompt_id` | string | | Fichier `.md` dans `./.vibe/prompts/` (dossiers de confiance) ou `~/.vibe/prompts/`. |
| `active_model` | string | | Modèle de l'agent. |
| `enabled_tools` / `disabled_tools` | array<string> | | Filtres d'outils de l'agent. |

La plupart des clés globales (`active_model`, `enabled_tools`, `disabled_tools`, blocs `[tools.*]`) peuvent être surchargées dans un fichier d'agent.

#### 3.9.10 Variables d'environnement

| Variable | Rôle |
|---|---|
| `VIBE_HOME` | Déplace `~/.vibe/`. |
| `VIBE_<KEY>` | Surcharge la clé de premier niveau `<key>` (ex. `VIBE_ACTIVE_MODEL`) ; `__` pour les clés imbriquées ; valeur non parsable ignorée et journalisée. |
| `MISTRAL_API_KEY` | Clé Mistral principale. |
| `<PROVIDER>_API_KEY` | Clé référencée par `api_key_env_var` (ex. `OPENROUTER_API_KEY`). |
| `SSL_CERT_FILE`, `SSL_CERT_DIR` | Ancres de confiance supplémentaires. |
| `COLORTERM` | `truecolor`/`24bit` active la couleur 24 bits. |
| `PLUGIN_ROOT`, `PLUGIN_DATA` | Définies par Vibe pour les serveurs MCP de plugins. |

### 3.10 Modèles et fournisseurs

Vibe embarque **un seul modèle intégré** : **Mistral Medium 3.5** (alias `mistral-medium-3.5`). `/model` ne liste que les modèles configurés pour l'utilisateur, **groupés par origine** : admin config de l'organisation, expériences, catalogue de modèles, puis configuration personnelle.

Modèles de chat disponibles via l'API Mistral (à mettre en `name` d'un `[[models]]` avec `provider = "mistral"`) :

| Modèle | Model ID | Usage conseillé |
|---|---|---|
| Mistral Medium 3.5 (recommandé) | `mistral-medium-latest` | Raisonnement et code phare |
| Z.ai GLM 5.3 | `zai-glm-5-3` | Raisonnement avancé et code |
| Z.ai GLM 5.2 | `zai-glm-5-2` | Raisonnement avancé et code |
| Mistral Large 3 | `mistral-large-latest` | Tâches complexes, grand contexte |
| Mistral Small 4 | `mistral-small-latest` | Usage général rapide et économique |
| Codestral | `codestral-latest` | Génération et complétion de code |
| Ministral 3 14B | `ministral-14b-latest` | Modèle edge équilibré |
| Ministral 3 8B | `ministral-8b-latest` | Edge léger |
| Ministral 3 3B | `ministral-3b-latest` | Plus petit modèle edge |

Épinglage de version : remplacer `-latest` par un suffixe daté (ex. `mistral-medium-3-5`, `codestral-2508`). Fournisseurs tiers : définir un `[[providers]]` (ex. OpenRouter `https://openrouter.ai/api/v1`, `api_key_env_var = "OPENROUTER_API_KEY"`) et un `[[models]]` (ex. `mistralai/codestral`, alias `codestral-openrouter`). Styles d'API supportés : OpenAI Chat, OpenAI Responses, `reasoning`, Anthropic, Anthropic sur Vertex AI.

### 3.11 Modèles hors ligne / locaux

- La CLI supporte **tout modèle derrière une API compatible OpenAI** ; cas d'usage : inférence locale, internet restreint, contrôle total de la destination du code. **Vibe n'embarque aucun modèle local.**
- **Modèles recommandés** : **Devstral Small 2** (`mistralai/Devstral-Small-2-24B-Instruct-2512`, dense 24B, agentique/code, empreinte légère) ; **Mistral Small 4** (MoE 119B, 6,5B actifs, hybride raisonnement/code, contexte 256k).
- **Matériel** (dimensionné pour Devstral Small 2) : FP8 + ~128k de contexte sur **H100 ou A100** ; 4 bits + 32k sur **RTX 4090 / tout GPU 24 Go** ; offload CPU possible mais nettement plus lent. Mistral Small 4 : au moins **un H100 80 Go en FP8**, davantage pour les longs contextes.
- **Déploiement recommandé : vLLM** — `vllm serve mistralai/Devstral-Small-2-24B-Instruct-2512 --tool-call-parser mistral --enable-auto-tool-choice --port 8080` ; flags utiles `--tensor-parallel-size`, `--dtype`, `--max-model-len`. Alternatives : llama.cpp, LM Studio, Ollama.
- **Brancher la CLI** : `[[providers]]` `name = "local"`, `api_base = "http://localhost:8080/v1"`, `api_style = "openai"`, `backend = "generic"`, sans `api_key_env_var` si le serveur n'exige pas de clé ; `[[models]]` alias `devstral-local` ; `active_model = "devstral-local"` **placé avant la première table `[[...]]`**. Ou utiliser le preset intégré `provider = "llamacpp"` (port 8080 = celui de l'exemple vLLM).
- Basculer local/hébergé en session : `/model`.
- **Totalement hors ligne** : `enable_telemetry = false` et `enable_update_checks = false` ; avec un fournisseur local, la CLI ne contacte ni `mistral.ai` ni aucun service externe. Skills, serveurs MCP et connecteurs touchant l'extérieur doivent être désactivés séparément (revoir `enabled_tools`, `disabled_tools`, `mcp_servers`, connecteurs).
- Bonnes pratiques : valider la qualité sur des tâches représentatives ; garder le serveur sur un réseau privé ; vérifier quelles données sortent quand on mélange outils locaux et distants.

### 3.12 Agents, sous-agents et `AGENTS.md`

**Agents intégrés (CLI)**

| Agent | Comportement | Usage conseillé |
|---|---|---|
| `ask` | Demande avant **tout** outil (y compris éditions). Anciennement nommé `default`. | Base de code inconnue ; vérifier chaque action. |
| `accept-edits` | **Défaut.** Auto-approuve les éditions de fichiers **dans le répertoire de travail** ; demande pour le shell et les autres outils sensibles. | Travail quotidien, refactors cadrés. |
| `smart-approve` | Classifie chaque appel ; exécute ceux jugés sûrs, demande avant les risqués (cf. 3.21). | Travail quotidien avec moins d'invites. |
| `auto-approve` | Auto-approuve tout, shell compris (peut lancer `rm -rf` sur tout chemin accessible). Désactivable par l'admin. | Environnements de confiance, sandboxés uniquement. |
| `lean` | Agent spécialisé **Lean 4** (assistant de preuve) ; `/leanstall` / `/unleanstall`. | Preuves formelles. |

- **Vibe 3.0 supprime l'agent `plan`** : si `default_agent = "plan"` sans agent personnalisé `plan`, avertissement et démarrage en `ask`.
- Sélection : `vibe --agent <nom>`, raccourcis `vibe --smart-approve`, `Shift+Tab` en session (interactif seulement), `default_agent` en config. `--auto-approve`/`--yolo` approuve tout pour un run quel que soit l'agent.

**Agents personnalisés** : fichier `.toml` dans `~/.vibe/agents/` (utilisateur) ou `./.vibe/agents/` (projet), nom de fichier = nom d'agent (`vibe --agent redteam` → `redteam.toml`). Exemple doc « Red team » : `agent_type = "agent"`, `safety = "safe"`, `active_model = "mistral-medium-3.5"`, `system_prompt_id = "redteam"` (attend `redteam.md`), `disabled_tools = ["edit", "write_file"]`, `[tools.bash] permission = "ask"`, `[tools.read_file] permission = "always"`.

- Le **prompt** d'un agent personnalisé ne s'applique que s'il est sélectionné **avant le premier message** ; en changeant plus tard, outils/permissions/modèle s'appliquent mais le prompt ne change qu'après `/clear`.
- **Recette « plan agent »** (remplace l'ancien `plan`) : `~/.vibe/agents/plan.toml` avec `safety = "safe"`, `disabled_tools = ["edit", "write_file"]`, `instructions` (« explorer et proposer un plan, ne rien modifier avant approbation »), `[tools.bash] permission = "ask"`. Flux : `vibe --agent plan` → plan validé → `Shift+Tab` vers `accept-edits` → implémentation.

**Sous-agents** : tournent indépendamment et renvoient **du texte seulement** à l'agent parent ; servent à explorer une grosse base sans polluer le contexte. Sans sous-agent personnalisé, l'agent peut lancer un **sous-agent générique** (mêmes instructions et outils). Personnalisé : `agent_type = "subagent"` + `description` (indique quand l'utiliser) ; ex. `research.toml` avec `enabled_tools = ["read_file", "skill"]`.

Règles des sous-agents : ne peuvent pas poser de questions à l'utilisateur ; n'utilisent que les **outils intégrés** autorisés par leur fichier (**pas d'outils MCP, connecteurs ou plugins**), jamais avec plus de permissions que le parent ; tournent **toujours sur le modèle de la session** (ignorent `active_model`) ; fichier invalide (ex. `description` vide) → erreur signalée (pas d'omission silencieuse). Désactivation : `enable_subagents = false`. Les sous-agents **héritent des hooks** du parent.

**`AGENTS.md`** :
1. Utilisateur : `~/.vibe/AGENTS.md` (ou `$VIBE_HOME`).
2. Projet : **chaque** `AGENTS.md` du répertoire courant jusqu'à la racine du **dossier de confiance** ; en cas de conflit, le plus proche du répertoire de travail gagne. Les `AGENTS.md` au-dessus de la zone de confiance ne sont jamais chargés.
3. Découverte automatique de nouveaux `AGENTS.md` quand l'agent lit des fichiers dans des sous-répertoires.

### 3.13 Skills

- **Format** : répertoire contenant `SKILL.md` = frontmatter YAML + instructions Markdown ; conforme à la **spécification Agent Skills** (portable vers d'autres agents).
- **Champs de frontmatter** :

| Champ | Défaut | Effet |
|---|---|---|
| `name` | | Nom d'invocation. |
| `description` | | Affiché dans la liste ; jusqu'à **1 024 caractères**. |
| `license`, `compatibility` | | Métadonnées (exemple : `MIT`, « Requires git »). |
| `user-invocable` | `true` | Expose le skill comme commande slash (CLI et VS Code) ; `false` le masque du sélecteur, l'agent peut toujours le charger. |
| `disable-model-invocation` | | `true` empêche l'agent de le charger de lui-même ; reste invocable par `/skill-name`. |
| `allowed-tools` | | Outils attendus — **lu mais non appliqué** : un skill peut appeler tout outil permis par l'agent actif. |

- **Découverte (ordre)** : 1) `skill_paths` de `config.toml` ; 2) projet `./.vibe/skills/` ou `./.agents/skills/` (dossier de confiance) ; 3) utilisateur `~/.vibe/skills/` ou `~/.agents/skills/`.
- **Filtres** : `enabled_skills` (liste blanche si non vide) / `disabled_skills` ; exact, glob, `re:`.
- **Commandes slash personnalisées** : les skills sont **la méthode recommandée** ; `/code-review focus on error handling` ajoute les instructions du skill au message.
- Skills de plugins préfixés par le namespace (`/vibe:skill-creator`).
- Contrôle : relire un skill qui peut appeler des outils d'écriture ; restreindre via outils/permissions de l'agent (pas via `allowed-tools`) ; versionner les skills projet dans `./.vibe/skills/`.

### 3.14 Hooks

Commandes shell branchées sur le cycle de vie pour **filtrer (gate), auditer ou réécrire** : bloquer des appels dangereux, expurger des arguments, ajouter du contexte après un outil, forcer l'agent à recommencer une réponse insatisfaisante. Effet au prochain lancement.

**Emplacements** : `./.vibe/hooks.toml` (projet, chargé en premier, **dossiers de confiance uniquement**) puis `~/.vibe/hooks.toml` (utilisateur). Même `name` dans les deux → l'entrée projet gagne. Hooks de plugins : validés et listés, **pas exécutés** (version actuelle).

**Déclaration** (`[[hooks]]`) :

| Champ | Requis | Détails |
|---|---|---|
| `name` | oui | Identifiant unique (dédoublonnage projet/utilisateur). |
| `type` | oui | `pre_tool`, `post_tool`, `post_agent`. |
| `command` | oui | Commande lancée, payload JSON sur stdin. Sous Windows : Git Bash si disponible, sinon PowerShell (comme l'outil `bash`). |
| `match` | pour `pre_tool`/`post_tool` | Nom d'outil : glob fnmatch ou regex `re:` ; insensible à la casse. |
| `timeout` | non | Secondes avant kill ; défaut `60`. |
| `strict` | hooks d'outil | `true` : échecs de parsing/exécution → refus (`pre_tool`) ou effacement du texte (`post_tool`) au lieu d'un avertissement. Défaut `false`. |
| `description` | non | Texte des diagnostics. |

**Contrat** : stdin = objet JSON UTF-8 avec `session_id`, `parent_session_id`, `transcript_path`, `cwd`, `hook_event_name` (+ champs d'outil). Réponse via **code de sortie + stdout** ; stderr pour diagnostics.

| Sortie | Effet |
|---|---|
| Exit `0`, stdout vide | Passthrough. |
| Exit `0`, objet JSON valide | Réponse structurée. |
| Exit `0`, stdout non conforme | Échec du hook : avertissement, ou refus/effacement si `strict = true`. |
| Exit ≠ 0, timeout, échec de lancement | Échec ; diagnostic tiré de stderr (sinon stdout, sinon code). |

Champs de réponse universels : `system_message` (affiché à l'utilisateur), `decision` (`"allow"` défaut | `"deny"`), `reason`, `hook_specific_output`. Champs inconnus tolérés (compatibilité ascendante).

| Type | Déclenchement | Reçoit | Peut renvoyer |
|---|---|---|---|
| `pre_tool` | Par appel d'outil, **avant** l'invite de permission ; le 1er `deny` court-circuite les autres `pre_tool`. | `tool_name` (nom complet, ex. `file_system.bash`, `<server>.<tool>` ; `match` accepte nom court ou complet), `tool_call_id`, `tool_input`. | `deny` + `reason` (devient l'erreur d'outil vue par le LLM) ; `hook_specific_output.tool_input` = **remplacement complet** des arguments, revalidé contre le schéma (échec → refus synthétisé), composé de gauche à droite ; les arguments réécrits sont ceux affichés dans l'invite, exécutés et vus aux tours suivants. |
| `post_tool` | Seulement si le corps de l'outil **a réellement tourné** (pas après refus `pre_tool`, refus utilisateur ou `never`). | `tool_name`, `tool_call_id`, `tool_input` (post-réécriture), `tool_status` (`success`/`failure`), `tool_output` (dict, `null` si échec), `tool_output_text` (texte vu par le LLM, modifiable par les hooks précédents), `tool_error`, `duration_ms` (**toujours `0`** pour l'instant). | `deny` + `reason` → remplace `tool_output_text` (la chaîne continue) ; `hook_specific_output.additional_context` → **ajouté** (séparateur `\n`) ; combinable (remplacement puis ajout). |
| `post_agent` | Après chaque tour assistant terminé **sans appel d'outil en attente**. | Contexte de session seul. | `deny` + `reason` → injecté comme nouveau message utilisateur demandant de recommencer ; **3 relances max par tour** (tous hooks confondus), puis réponse acceptée. Échec du hook → réponse acceptée + avertissement. |

Piège : les commandes lancées en arrière-plan passent par **`process_start`** et non `bash` → garde-fous shell avec `match = "re:bash|process_start"`. Exemple doc : hook `deny-rm-rf` (`strict = true`) + script Python lisant `tool_input.command` et renvoyant `{"decision":"deny","reason":…}` si `rm -rf`.

### 3.15 Plugins

**Avertissement (doc)** : **Expérimental**, en développement actif : le format et les fonctionnalités changeront ; une mise à jour peut casser des plugins existants.

**Principe** : un plugin est un **répertoire** qui empaquette skills, serveurs MCP, dossiers de connaissance, sous-agents, hooks, bibliothèques, connecteurs requis — pour partager un setup complet sans le fusionner dans sa propre config. Format **Agent Plugins 1.0** (agent-plugins.org) ; manifeste `plugin.json` obligatoire ; composants Vibe dans `ai.mistral.vibe/`, actifs seulement si l'extension `ai.mistral.vibe` est déclarée. Plugin intégré : **`vibe`** (skills `/vibe:skill-creator`, `/vibe:worktree`).

**Emplacements et priorité**

| Portée | Emplacement | Chargé |
|---|---|---|
| Projet | `./.vibe/plugins/<plugin>/` (répertoire de travail et répertoires `--add-dir`) | Workdir : si dossier de confiance ; `--add-dir` : toujours |
| Utilisateur | `~/.vibe/plugins/<plugin>/` (ou `$VIBE_HOME/plugins/`) | Toujours, dans tous les projets |
| Intégré | Livré avec Vibe | Toujours |

Même `name` : projet > utilisateur > intégré ; deux plugins de même nom **à la même portée** → aucun des deux n'est chargé.

**Arborescence** : `plugin.json` (requis), `mcp.json`, `libraries.json`, `connectors.json`, `skills/<nom>/SKILL.md`, `ai.mistral.vibe/{hooks.toml, knowledge/<nom>/KNOWLEDGE.md, agents/<nom>.toml}`. Sans extension Vibe : seuls `skills/` et `mcp.json` sont chargés. Tout chemin (ou lien symbolique) résolu hors du répertoire du plugin est rejeté.

**Manifeste `plugin.json`**

| Champ | Requis | Détails |
|---|---|---|
| `$schema` | oui | Exactement `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` (autres versions rejetées). |
| `name` | oui | 1–64 car. : minuscules, chiffres, `.`, `-` ; commence/finit par lettre ou chiffre ; ni `--` ni `..`. |
| `version`, `description` | non | Affichés dans `/plugins` ; `description` est aussi listée dans le contexte de l'agent. |
| `author` | non | Objet `name`, `email`, `url`. |
| `homepage`, `repository`, `license` | non | Chaînes. |
| `keywords` | non | Liste de chaînes. |
| `extensions` | non | Blocs par ID d'extension ; Vibe lit `ai.mistral.vibe`. |

Tout autre champ de premier niveau → manifeste rejeté.

**Extension `ai.mistral.vibe`** : `schemaVersion` (requis, `1`) ; `displayName` (1–100 car.) ; `toolNamespace` (identifiant : lettres, chiffres, `_`, `$`, pas de chiffre initial ; défaut = nom du plugin avec autres caractères → `_`, `_` initial si commence par un chiffre) ; `toolOverrides` (clés `<server-or-connector-id>/<tool-name>`, renommage `name` ou `exposure` `programmatic` | `direct` | `direct_and_programmatic` — **ne modifie actuellement que le catalogue affiché dans `/plugins`**, pas les outils vus par l'agent). **Namespaces réservés** : `agent`, `agents`, `collaboration`, `file_system`, `process`, `self`, `skill`, `subagent`, `vibe` (plugin non chargé ; et collision de namespace → aucun des plugins concernés chargé).

**Composants**

| Composant | Règles |
|---|---|
| **Skills** | `skills/<nom>/SKILL.md`, `name` du frontmatter = nom du dossier ; exposé `<namespace>:<skill>` et commande `/<namespace>:<skill>`. |
| **MCP** (`mcp.json`) | `$schema` exactement `https://agent-plugins.org/schemas/1.0.0/mcp.schema.json` + seule autre clé `mcpServers`, sinon **aucun** serveur chargé (cas typique : `.mcp.json` copié de Claude Code sans `$schema`). Transports : `stdio` (`command` requis : exécutable nu du `PATH` ou chemin `./…` ; `args`, `env`, `cwd` optionnels) et `streamable-http` (`url` requis, `headers` statiques). **`sse` non supporté.** `${PLUGIN_ROOT}` et `${PLUGIN_DATA}` (dossier de données inscriptible créé par Vibe) s'expandent dans `args`, valeurs `env` et `cwd`, **pas dans `command`** ; ne pas les définir dans `env` ; `cwd` doit commencer par `./`, `${PLUGIN_ROOT}` ou `${PLUGIN_DATA}` (défaut : dossier du plugin). Apparaissent dans `/mcp` tagués par plugin ; connexion `/mcp login <name>`. Collision de nom avec un serveur de `config.toml` → serveur du plugin désactivé + avertissement (jamais d'identifiants partagés). |
| **Knowledge** | `ai.mistral.vibe/knowledge/<nom>/KNOWLEDGE.md` ; frontmatter `name` (= dossier, minuscules/chiffres/`-`, ≤ 64), `description` (**5–300 car.**, sert à décider de la lecture), `display_name` (≤ 100), `icon` (≤ 16). Copié dans le dossier de données ; listé dans le contexte comme dossier **lecture seule** `<namespace>:<name>` (description + chemin), contenu **non injecté** : l'agent lit `KNOWLEDGE.md` si pertinent. ≤ **100 dossiers**, `KNOWLEDGE.md` ≤ **256 Ko**, pas de liens symboliques. |
| **Sous-agents** | `ai.mistral.vibe/agents/<nom>.toml` (kebab-case) → `<namespace>:<nom>` ; champs `schema_version` (requis, `1`), `agent_type` (requis, `"subagent"` — un plugin **ne peut pas** définir d'agent sélectionnable), `description` (requis, 1–300), `display_name` (≤ 100), `safety` (`safe`, `neutral` défaut, `destructive`, `yolo`), `instructions`, `active_model` (accepté mais ignoré), `enabled_tools`/`disabled_tools` (sans doublons), `[tools.<tool>]` `permission` (`allowlist`/`denylist` ignorées ; `always` traité comme `ask` si l'une est présente). Clés **snake_case** obligatoires (camelCase et clés inconnues rejetées). ≤ **128 fichiers de 64 Ko**. |
| **Hooks** | `ai.mistral.vibe/hooks.toml`, mêmes champs ; noms préfixés `nom-plugin:hook` ; ≤ **128 hooks**, fichier ≤ **64 Ko** ; **non exécutés** actuellement. |
| **Libraries** (`libraries.json`) | `schemaVersion: 1`, `python` / `node` : nom d'import → chemin `./…` (paquet ou `.py` ; répertoire pour Node). Copiées dans le dossier de données, ajoutées à `PYTHONPATH` / `NODE_PATH` des commandes de l'agent. Node.js requis pour Node. Même nom d'import dans deux plugins → aucune des deux chargée. |
| **Connectors** (`connectors.json`) | `schemaVersion: 1`, `connectors: [{ "id": "github", "tools": [...] }]` ; **déclaratif** : Vibe vérifie la disponibilité sur le compte et signale les manquants, sans rien connecter. |

**Gestion en session** : `/plugins` (auteur, version, emplacement, portée, format, **digest épinglé**, composants ; section **Not loaded** avec raisons ; `/` recherche, `r` recharge) ; `/reload-plugins` (relit les dossiers, bascule la session, rapporte `+` ajoutés, `-` retirés, `~` modifiés). `/reload` **ne recharge pas** les plugins. Les deux commandes plugins ne tournent que si l'agent est inactif.

**Épinglage** : au démarrage, Vibe épingle le contenu de chaque plugin ; éditer/mettre à jour/supprimer sur disque n'affecte pas une session en cours ; une session reprise utilise le contenu épinglé (plugin supprimé affiché `(uninstalled since pin)`) ; **MCP et connecteurs ne sont pas épinglés** (reconnexion au démarrage/reprise/rechargement).

**Sécurité** : relire un plugin comme du code ; plugins projet seulement en dossier de confiance (sauf `--add-dir`) ; plugins utilisateur partout ; `enable_mcp = false` bloque aussi leurs serveurs MCP ; **les plugins ne modifient pas les approbations**.

**Compatibilité avec d'autres agents**

| Format | Marqueur | Chargé |
|---|---|---|
| Claude Code | `.claude-plugin/plugin.json` | Skills et MCP |
| Codex | `.codex-plugin/plugin.json` | Skills et MCP |
| Kimi Code | `kimi.plugin.json` ou `.kimi-plugin/plugin.json` | Skills et MCP |
| OpenCode | contenu `.opencode/` ou `opencode.json` | Skills et MCP de `opencode.json` ; pas de plugins exécutables ni d'outils custom |

Un `plugin.json` Agent Plugins 1.0 prime sur ces marqueurs ; marqueurs de plusieurs formats tiers dans un même dossier → non chargé.

**Dépannage** (doc) : plugin absent de `/plugins` → session démarrée avant, ou projet non approuvé ; « Not loaded » → `$schema` ≠ 1.0.0, `name` avec majuscules ou `--`, champ inconnu, namespace réservé, doublon de nom ou de namespace ; connaissance/sous-agents/bibliothèques manquants → extension `ai.mistral.vibe` absente ou invalide (ex. `schemaVersion` manquant) ; sous-agent rejeté → clés camelCase ; serveur MCP qui ne démarre pas → `command`/`cwd` invalides (chemins absolus et `.` rejetés), `$schema` de `mcp.json`, collision de nom.

### 3.16 Serveurs MCP

- **Configurés par l'utilisateur** (≠ connecteurs gérés par Mistral). Ajout par `vibe mcp add`, `/mcp add` ou `[[mcp_servers]]`.
- **Transports** : `http` (HTTP standard), `streamable-http` (HTTP + streaming), `stdio` (processus local).
- **CLI hors session** (`vibe mcp add` écrit dans le `config.toml` utilisateur sans démarrer de session) :

| Forme | Exemple |
|---|---|
| OAuth distant (ouvre le navigateur) | `vibe mcp add linear --url https://mcp.linear.app/mcp` ; `--no-login` pour enregistrer sans se connecter ; `--scope` (répétable). |
| Clé API / en-têtes | `vibe mcp add mistralai --url https://api.mistral.ai/mcp --api-key-env MISTRAL_API_KEY` ; ou `--header`. |
| Local stdio | `vibe mcp add fetch_server --transport stdio --command uvx --arg mcp-server-fetch` ; `--arg` et `--env` répétables. |
| Suppression | `vibe mcp remove <name>` (supprime aussi les jetons OAuth stockés). |
| Aide | `vibe mcp add --help`. |

- **En session** : `/mcp add <url>` (OAuth ; options `--name`, `--scope`, `--transport`, `--no-login`) ; `/mcp` (liste) ; `/mcp <server>` (outils) ; `/mcp status` ; `/mcp login <name>` ; `/mcp logout <name>`. `/connectors` = alias.
- **Exemples TOML** : HTTP avec auth statique (`headers = { "X-Client" = "vibe" }`, `api_key_env`, `api_key_header = "Authorization"`, `api_key_format = "Bearer {token}"`) ; streamable-http avec `api_key_header = "X-API-Key"`, `api_key_format = "{token}"` ; OAuth (`type = "oauth"`, `scopes = []`, puis `/mcp login linear`) ; stdio (`command = "uvx"`, `args = ["mcp-server-fetch"]`, `env = {…}`).
- **Nommage / permissions** : outils exposés `{server_name}_{tool_name}` ; `[tools.fetch_server_get] permission = "always"` ; filtres `enabled_tools = ["serena_*"]`, `disabled_tools = ["fetch_server_*"]`.
- Note : l'exemple `vibe mcp add mistralai --url https://api.mistral.ai/mcp` indique l'existence d'un **serveur MCP Mistral** accessible par clé API (inférence : non détaillé ici).

### 3.17 Connecteurs

- **Intégrations gérées par Mistral** vers des services first-party et tiers ; **partagées avec Vibe Work** (la liste complète renvoie à « Connectors in Vibe Work »). Détectés et configurés automatiquement. Connecteur cité : `web_search` (recherche web **intégrée**, outil `weather_search` cité), DeepWiki (sans connexion), GitHub (exemple de `connectors.json`).

| | Connecteurs | Serveurs MCP |
|---|---|---|
| Configurés par | Mistral | L'utilisateur (`vibe mcp add`, `config.toml`) |
| Authentification | Login compte ou service | OAuth, en-têtes, variables d'env, clés API |
| Découvrabilité | Curée, listée dans la CLI | Tout ce qui parle MCP |
| Idéal pour | Services courants | Outils custom, serveurs privés, expérimental |

- **Gestion** via `/connectors` (alias de `/mcp`) — touches sur un connecteur : `Enter` (outils, ou connexion si non connecté ; connexion directe pour ceux sans login comme DeepWiki), `e`/`d` (activer/désactiver connecteur ou outil), `r` (rafraîchir), `/` (recherche), `Escape` (retour). Choix sauvegardés dans la config (`[[connectors]]`).
- Si `/connectors` indique que la clé API ne donne accès qu'aux **connecteurs partagés** : `vibe --setup` et créer une nouvelle clé depuis le lien affiché pour accéder aux **connecteurs personnels**.
- Désactivation globale : `enable_connectors = false` ; blocage admin possible.
- Nommage des outils : `connector_<connector>_<tool>` (dans `enabled_tools`, `disabled_tools`, `[tools.*]`).
- Bonnes pratiques : vérifier les accès avant authentification ; préférer lecture seule/portée réduite ; révoquer côté service les connecteurs inutilisés.

### 3.18 Téléportation CLI → web

**Encadré info (doc)** : Fait partie du flux sandbox Vibe Code Web, en **Public Preview** (capacités, limites, interface susceptibles de changer avant GA).

**Prérequis** : clé API liée à un compte **Pro, Team ou Enterprise** ; **Mistral GitHub App** installée sur le dépôt ; session sur un **modèle servi par l'API Mistral** (ex. Mistral Medium 3.5) — sessions sur autres fournisseurs ou serveurs locaux (y compris Devstral auto-hébergé) **non téléportables** (`/model` pour basculer) ; CLI lancée depuis un **dépôt Git avec remote GitHub**, branche extraite (pas de `HEAD` détaché). Mettre à jour (`vibe update`).

**Deux usages** :
1. **Prompt unique** : `& fix the failing tests` → tâche lancée dans un sandbox cloud, URL Vibe Code Web renvoyée.
2. **Déplacer une session en cours** : `/teleport` → Vibe **résume la conversation**, démarre une session web depuis la branche et le commit courants, **changements non commités inclus**, imprime l'URL (suivable depuis tout appareil connecté à Vibe). Première fois dans un dépôt : choix du **projet Vibe Code Web**, mémorisé (`/remote-project` pour changer). Branche absente du remote ou commits non poussés → Vibe **demande avant de pousser** et annule si refus.

**Après la téléportation** : clone du dépôt dans le sandbox → travail (lecture, commandes, édition) → streaming de la progression → questions de clarification si besoin → **push d'une branche et ouverture d'une PR en brouillon (draft)**. Commits, branches et PR restent dans le dépôt ; le sandbox est supprimé en fin de session.

**Limites** : durée max **24 h** ; inactivité (attente de réponse) **3 h** ; **timeout par commande 30 s** ; sessions concurrentes **selon le plan**.

**Réserves** : **sens unique** (pas de retour vers la CLI) ; uniquement depuis un dépôt GitHub avec branche extraite ; **les sessions cloud tournent sur Mistral Medium 3.5** quel que soit le modèle local. Également disponible depuis l'extension VS Code (`/teleport`).

### 3.19 Support des terminaux

**Terminaux recommandés** (les plus testés) : macOS et Linux → **Ghostty**, **Kitty** ; Windows → **Windows Terminal**. Liste non exhaustive.

| Fonction terminal | Usage par Vibe | Repli si absente |
|---|---|---|
| Rapport clavier étendu (protocole clavier Kitty) | Distinguer `Shift+Enter`, `Cmd` et touches modifiées | `Shift+Enter` envoie ; utiliser `Ctrl+J` |
| Rapport souris | Clic d'options/liens, défilement, scrollbar, sélection | Clavier + `Shift+Up/Down` |
| Presse-papiers | Copie de sélection et `/copy` : `pbcopy` (macOS), `clip` (Windows), `wl-copy`/`xclip`/`xsel` (Linux), **OSC 52** via SSH | Copie échoue ; sélection native du terminal |
| Rapport de focus | Cloche/titre uniquement hors focus ; pause du clignotement | Pas de notifications cloche |
| Requête couleur de fond (OSC 11) | Choix clair/sombre avec `theme = "auto"` | Préférence OS ; `/theme` |
| Couleur 24 bits | Thèmes et coloration syntaxique ; activée si `COLORTERM` = `truecolor`/`24bit`, toujours sous Windows | Palette 256 couleurs |
| Collage « bracketed paste » | Coller du multiligne en un seul message | Chaque ligne peut partir séparément ; sous Windows (non disponible), regroupement des frappes rapides |

**Notes par environnement** : macOS Terminal / iTerm2 et WezTerm (par défaut) sans clavier étendu → `Ctrl+J` ; iTerm2 : `Option` + glisser pour la sélection native. GNOME Terminal / VTE : installer `wl-copy`, `xclip` ou `xsel` ; ignorent OSC 52 (copie via SSH impossible, utiliser `Shift` + glisser). Windows : Windows Terminal ; mintty (Git Bash) peut ne pas gérer toutes les touches ; collage d'image et `/paste-image` macOS uniquement. tmux/screen/Zellij : Vibe utilise l'écran alternatif (scrollback du multiplexeur vide) ; détection de fond ignorée ; `set -g set-clipboard on` dans `~/.tmux.conf` pour OSC 52 ; `COLORTERM=truecolor` si couleurs délavées ; certaines touches modifiées non transmises. SSH : copie via OSC 52 (le terminal local doit le supporter). Terminaux intégrés aux IDE (VS Code, Cursor, JetBrains) : certains raccourcis captés par l'éditeur.

**Sélection/copie** : Vibe capture la souris ; sélection native en maintenant `Shift` (Ghostty, Kitty, WezTerm, GNOME Terminal, Windows Terminal) ou `Option` (iTerm2) ; clic droit-coller peut ne pas marcher → `Cmd+V` / `Ctrl+Shift+V`.

**Signaler un problème** : issue sur `github.com/mistralai/mistral-vibe` avec nom/version du terminal, OS, multiplexeur/SSH/IDE, sortie de `vibe --version`.

### 3.20 Configuration admin (managed config)

**Nature** : mécanisme de **distribution** de réglages pour la CLI **et** l'extension VS Code, défini une fois dans l'Admin Panel. **Encadré info (doc)** : **Pas un contrôle de sécurité** : un utilisateur maîtrisant son environnement local peut le contourner ; tout ce qui doit être interdit requiert un contrôle côté serveur (permissions de clé API ou de Workspace).

**Fonctionnement** : non édité sur la machine ; récupéré **en HTTP au démarrage de session** avec la clé API Mistral de l'utilisateur (attente de quelques secondes max), copie de secours dans `~/.vibe/managed_config_cache.json`, jamais écrit dans `config.toml`. `/reload` le re-télécharge. Une fois actif, il prime sur toutes les autres sources dès le premier message (agent de départ, connecteurs, MCP, outils).

**Portées** :
- **Organisation** : **Admin Panel › Vibe › Preferences** (https://admin.mistral.ai/vibe/preferences) — champ TOML `Vibe Code Clients managed config`.
- **Workspace** : **Admin Panel › Administration › Workspaces** (https://admin.mistral.ai/organization/workspaces) → Workspace → `Settings`.

Pas de fusion serveur : chaque utilisateur reçoit **une seule** config, choisie par son Workspace.

| Config Workspace | Reçu par les utilisateurs du Workspace |
|---|---|
| Non définie ou « inherit » | Config Organisation |
| Activée | Config Workspace **seule** (les réglages définis uniquement au niveau Organisation ne s'appliquent pas) |
| Désactivée | Aucune admin config, même si l'Organisation en a une |

**Versions minimales** : CLI **`2.24.2`**, extension VS Code **`1.16`** (les clients antérieurs ignorent l'admin config). `enable_mcp = false` requiert CLI **3.0+** ; `enable_auto_approve = false` requiert CLI **3.0.1+**.

**Permissions** : RBAC **`manage_code_config`** au niveau Organisation (délégable sans droits admin complets) ; les admins de Workspace gèrent la config de leur Workspace.

**Activation par type de déploiement** : **Serverless** → rien à faire ; **Dedicated (private cloud)** → via l'équipe compte (feature flag / config de déploiement) ; **Self-hosted** → sur demande, via le **chart Helm**. Dédié et auto-hébergé exigent que `/whoami` renvoie les bons domaines Vibe et API. Recommandation : valider dans une **organisation de test** avant diffusion.

**Ce qu'on peut définir** : la plupart des clés de `config.toml` — modèle actif, modèles, fournisseurs ; serveurs MCP et autorisation MCP ; autorisation auto-approve ; connecteurs, outils/agents/skills activés/désactivés ; agent de départ ; télémétrie, update checks, notifications.

| Besoin | Réglage |
|---|---|
| Modèles prêts à l'emploi d'entreprise | `[[providers]]` (ex. `acme-enterprise`, `backend = "mistral"`, `api_base = "https://mistral.acme.internal/v1"`, `api_key_env_var = "ACME_MISTRAL_API_KEY"`, `[providers.extra_headers]`), `[[models]]` (ex. `mistral-large-2411` alias `mistral-large-enterprise`), `active_model`. La clé reste fournie localement par variable d'env. |
| Restreindre les modèles | `allowed_models` (exact, glob `mistral-vibe-cli-*`, regex `re:^mistral-(large\|medium)-`) appliqué au **nom canonique** (`name`), pas à l'alias ; vaut pour CLI et VS Code ; liste vide = sans effet. **Si aucun modèle ne correspond → toute l'admin config est rejetée.** Ne restreint pas l'accès API. |
| Bloquer MCP | `enable_mcp = false` (une liste `mcp_servers` vide ne retire **pas** les serveurs ajoutés par l'utilisateur) : refus d'ajouter/retirer/activer/désactiver (`vibe mcp`, `/mcp`), de se connecter/déconnecter OAuth, aucun outil MCP chargé (y compris plugins) ; message « administrateur a désactivé ». |
| Bloquer connecteurs | `enable_connectors = false` (tous, recherche web incluse) ; un connecteur : `[[connectors]] name = "web_search" disabled = true` ; certains outils : `disabled_tools = ["weather_search"]` ; ou top-level `disabled_tools = ["connector_web_search_*"]`, `[tools.connector_web_search_weather_search] permission = "ask"`. |
| Agent de départ | `default_agent = "ask"`, `disabled_agents = ["auto-approve"]` / `enabled_agents` ; un agent exclu demandé (`--agent`) → démarrage sur `default_agent`. |
| Bloquer auto-approve | `enable_auto_approve = false` : masque `auto-approve` et agents `safety = "yolo"` ; ignore `--auto-approve`, `--yolo` (avec avertissement « approval prompts stay on ») et `bypass_tool_permissions = true`. Les permissions par outil (`always`, `allowlist`) **s'appliquent toujours**. |

**Secrets** : jamais de secret littéral ; les champs d'identifiant doivent référencer une variable d'env ; clés/jetons/mots de passe littéraux **rejetés côté serveur**.

**Côté utilisateur** : réglages admin en lecture seule dans `/config` (panneau **Where it's set** listant l'administrateur) ; **aucune bannière ni indicateur global** ; démarrage qui attend la config (quelques secondes max) ; échec de récupération → dernière config reçue **dans les 7 derniers jours**, sinon sans admin config ; `/reload` re-télécharge (changements d'agent de départ et de connecteurs effectifs à la **session suivante**) ; sans clé API Mistral → admin config ignorée ; config inapplicable (ex. `[[models]]` dont le `provider` n'existe pas, `system_prompt_id` absent du projet) → essai de la dernière reçue, puis config locale ; message : `Your administrator-managed configuration could not be applied: <reason>`.

**Arrêter** : soumettre une **configuration vide** ; les utilisateurs hors ligne gardent la dernière jusqu'à 7 jours.

**Dépannage dédié/auto-hébergé** : vérifier `<console_base_url>/api/vibe/whoami` (renvoie `vibe_base` et `api_base`) et `<vibe_base_url>/api/v1/code/managed-config` avec `Authorization: Bearer ${MISTRAL_API_KEY}` (défauts SaaS : `https://console.mistral.ai`, `https://chat.mistral.ai`). Échec de connexion → DNS/TLS/réseau ; `401`/`403` → clé et accès ; succès → contrôler les domaines. Le client stocke `vibe_base` valide comme `vibe_base_url` dans le `config.toml` utilisateur. Domaine erroné → support Mistral. Livraison des correctifs : Serverless (release plateforme), Dedicated (redéploiement de l'instance), Self-hosted (mise à jour de release ; hotfix possible pour critique).

### 3.21 Sécurité, approbations et permissions

**Contrôles en couches** : (1) **agents** (définissent ce qui est auto-approuvé, et plus largement prompt, compaction, modèle, outils) ; (2) **dossiers de confiance** (chargement de la config projet) ; (3) **permissions par outil**.

**Garde-fous transverses** :
- Confirmation exigée pour toute lecture/écriture/commande **hors du répertoire de travail** et des répertoires `--add-dir`, sauf si tout est auto-approuvé (`auto-approve` ou `--auto-approve`).
- Confirmation avant qu'un outil lise ou édite **`.env` et `.envrc`**, **même si la permission de l'outil est `always`**.
- Un chemin présent dans l'`allowlist` de l'outil **saute ces deux contrôles**.

**Smart approve** (déploiement progressif ; si absent du cycle `Shift+Tab`, lancer `vibe --agent smart-approve`, `vibe --smart-approve` ou `default_agent = "smart-approve"`). Pour chaque appel nécessitant approbation, dans l'ordre :
1. **Règles de permission** d'abord (allowlist → exécuté sans contrôle ; denylist → bloqué).
2. **Réutilisation** des approbations déjà données pour le même appel dans la session.
3. **Classification** par un modèle à partir de la demande et des arguments ; appels sûrs exécutés immédiatement **avec une note expliquant l'approbation**.
4. **Rétention des appels risqués** : la raison est renvoyée à l'agent pour qu'il tente une approche plus sûre ; l'utilisateur est sollicité si l'agent répète des appels risqués, relance le même appel, ou si le classifieur ne conclut pas.

Un appel jugé risqué **ne s'exécute jamais sans confirmation** ; en programmatique il est refusé. **Avertissement (doc)** : Classifieur, pas sandbox : un appel jugé sûr a les droits du compte utilisateur ; pour code non fiable ou identifiants sensibles, préférer `ask` ou un environnement isolé.

**Modèle du classifieur** : 1) `[utility_models] smart_approve` (alias d'un `[[models]]`, ou `active`) ; 2) sinon petit modèle Mistral rapide si disponible ; 3) sinon modèle de session (plus coûteux). Exemple : alias `classifier` → `mistral-small-latest`. Petit modèle = moins de latence/coût ; grand = meilleure précision. Alias invalide ou exclu par `allowed_models` → avertissement + sélection auto.

**Dossiers de confiance** — contenu « approuvable » détecté dans le dossier ou ses ancêtres : `.vibe/` avec `config.toml` ou sous-dossier `agents/`, `skills/`, `prompts/`, `plugins/`, `tools/` ; `.agents/skills/` ; `AGENTS.md`.
- Session interactive dans un dossier non approuvé contenant ce type de contenu → **dialogue de confiance** listant les fichiers détectés (sans les analyser) : **Trust folder**, **Trust full repo** (si lancé dans un sous-dossier d'un dépôt git), **Don't trust** (redemandé la fois suivante).
- Mémorisation : `~/.vibe/trusted_folders.toml`. Refus/non-approbation → config projet ignorée + avertissement ; config utilisateur `~/.vibe/` toujours appliquée.
- La confiance s'applique en interactif **et** en programmatique, mais l'invite n'apparaît qu'en interactif. `vibe --trust` = confiance **temporaire** (non persistée) ; `--worktree` approuve son worktree ; `--add-dir` charge la config projet **sans demander**.

**Permissions par outil** (s'appliquent aux outils intégrés, MCP et connecteurs) : `enabled_tools`/`disabled_tools` (exact, glob, regex) ; `[tools.<nom>] permission = "always" | "ask" | "never"` ; pour `bash`, `allowlist`/`denylist` par **préfixe de commande** (certaines commandes lecture seule — `ls`, `pwd`, `cat`, `git status`… — auto-autorisées par défaut ; chaque liste **remplace** sa liste par défaut, réinclure ce qu'on veut garder). Outils renommés : `read` → `read_file`, `search_replace` → `edit` (migration automatique des anciens noms).

**Modèle d'approbation par surface** (annoncé cohérent entre surfaces) :

| Surface | Interaction |
|---|---|
| CLI | Invite en bas du terminal : `1`/`y` autoriser une fois ; `2` pour la session ; `3` toujours ; `4`/`n`/`Escape` refuser ; `Up`/`Down` naviguer ; `Enter` valider ; clic possible. **Couleur de bordure de l'input = agent actif.** |
| VS Code | Invites dans le panneau latéral : `Mod+Y` approuver ; `Mod+Alt+Y` option alternative ; `Mod+Shift+Y` permission plus large (ex. toujours) ; `Mod+Alt+N` rejeter ; `Escape` annuler/quitter l'input (`Mod` = `Cmd` macOS, `Ctrl` Windows/Linux). Pas encore d'UI dédiée aux permissions par outil → `config.toml`. |
| Vibe Code Web | Approbations dans l'interface navigateur ; actions de dépôt (branches, push, PR) régies par les permissions GitHub accordées. |

**Bonnes pratiques (doc)** : démarrer en `ask` ou avec un agent plan sur code inconnu ; **committer avant les runs risqués** (`git reset --hard` comme rollback) ; `accept-edits` pour refactors cadrés + revue du diff ; `smart-approve` pour réduire les invites (pas un sandbox) ; `auto-approve` réservé aux environnements jetables (conteneurs, runners CI, VM éphémères), **jamais** sur une machine avec clés SSH, identifiants cloud ou accès production ; approuver délibérément (relire `.vibe/` à chaque changement, notamment MCP et permissions) ; outils MCP/connecteurs touchant des systèmes externes en `permission = "ask"` même sous `accept-edits` ; versionner `.vibe/` ; révoquer les accès inutiles (GitHub de Vibe Code Web, identifiants MCP, autorisations de connecteurs).

### 3.22 Extension VS Code

**Identité** : « **Mistral Vibe for VS Code** », éditeur **Mistral AI** (publisher ID `mistralai`), Marketplace `itemName=mistralai.mistral-vibe-code`. Agent Vibe **embarqué** : **aucune installation de CLI requise**. Le panneau est une **webview** ; l'agent **Vibe ACP** embarqué tourne en arrière-plan.

**Prérequis** : VS Code **1.94.0+** ; compte Mistral (pour créer/gérer les clés) ; plan Mistral ou clé API gérée soi-même (limites selon plan, usage inclus et pay-as-you-go).

**Installation** : vue Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`) → rechercher `Mistral Vibe` → sélectionner l'extension de **Mistral AI** → `Install`. Si invisible : **Developer: Reload Window** ou redémarrer. Installation **VSIX** possible (Extensions › More Actions › Install from VSIX...) pour des builds reçus avant publication — **uniquement depuis un canal de distribution Mistral approuvé**.

**Ouverture** : icône **Mistral Vibe** de la barre d'activité ; commande **Mistral Vibe: Open Mistral Vibe** ; action du titre de l'éditeur quand l'icône est disponible pour le fichier actif.

**Authentification** : au premier besoin, **flux de setup en terminal** : lancer depuis l'extension → coller la clé dans le terminal **Mistral Vibe Setup** → attendre le retour à l'état prêt. Le flux exécute l'agent embarqué avec `--setup` ; stockage dans le trousseau de l'OS, sinon `~/.vibe/.env`. **Encadré info (doc)** : la **connexion par navigateur** est « en cours d'activation » pour l'agent embarqué ; en attendant, flux terminal.

**Vérification** : panneau sans invite d'authentification ; envoi d'un prompt possible ; accès au workspace et au contexte éditeur. Prompt d'essai : « Explain the currently open file. »

**Contexte éditeur automatique**

| Contexte | Transmis à Vibe |
|---|---|
| Fichier actif | Une « workspace mention » du fichier actif. |
| Lignes sélectionnées | La mention du fichier avec lignes de début et de fin. |
| Texte sélectionné | Le texte, si la sélection contient assez de caractères non blancs et reste sous la **limite de taille de sélection** (valeur non précisée). |

**Revue** : contrôles d'approbation dans la webview ; inspecter les changements via les vues diff et source control de VS Code avant commit/PR.

**Commandes slash exposées (sous-ensemble)**

| Commande | Indice de saisie | Rôle |
|---|---|---|
| `/help` | | Commandes et raccourcis. |
| `/compact` | instructions de résumé optionnelles | Compacte l'historique. |
| `/reload` | | Recharge config, instructions, skills. |
| `/log` | | Chemin du **répertoire** de logs de la session. |
| `/proxy-setup` | `KEY value`, `KEY`, ou vide pour l'aide | Proxy et certificats SSL. |
| `/leanstall` / `/unleanstall` | | Agent Lean 4 `leanstral`. |
| `/data-retention` | | Rétention des données. |
| `/mcp` | `status`, `login <alias>`, `logout <alias>` | Statut de connexion MCP, connexion/déconnexion OAuth. |
| `/retry` | instructions optionnelles | Reprend une réponse interrompue. |
| `/teleport` | | Envoie la session vers Vibe Code Web. |

Les skills qui l'acceptent (`user-invocable`) apparaissent dans le même sélecteur.

**Raccourcis du panneau** : `Mod+Y` approuver ; `Mod+Alt+Y` approuver une alternative ; `Mod+Shift+Y` approuver avec permission plus large ; `Mod+Alt+N` rejeter ; **`Mod+N` nouvelle conversation** ; `Escape` annuler/quitter ; `Shift+Tab` « cycle the active input mode » (= cycle des agents selon la page Agents).

**Parité avec la CLI** : `/model` et `/thinking` absents en slash → réglables dans l'UI de l'extension ; `/resume` absent → sessions précédentes chargeables depuis l'UI du panneau ; `/rename` → équivalent UI ; **réservés à la CLI** : `/rewind`, `/loop`, `/voice`, ajout/parcours des serveurs MCP via `/mcp`. **Pas de mode programmatique** (utiliser `vibe --prompt`).

**Commandes de la palette** : **Mistral Vibe: Open Mistral Vibe** (focalise le panneau) ; **Mistral Vibe: Show Logs** (sortie de logs). Aucun raccourci VS Code par défaut déclaré (à ajouter dans `keybindings.json`).

**Réglages** : panneau de réglages dédié « en cours » ; tout le comportement provient de l'agent embarqué et du modèle de configuration de la CLI (fichiers, variables d'env, surcharges projet). **Télémétrie** : envoyée seulement si `telemetry.telemetryLevel` de VS Code l'autorise **et** si `enable_telemetry` (`~/.vibe/config.toml`) est actif — désactiver l'un des deux suffit.

**Agents** : mêmes agents que la CLI, libellés `Ask`, `Accept Edits`, `Smart Approve`, `Auto Approve` ; **sélecteur d'agent en bas du panneau** (liste intégrés + personnalisés de `~/.vibe/agents/` et `./.vibe/agents/`) ; `Shift+Tab` pour faire défiler ; défaut = `default_agent` (`Accept Edits` sinon) ; sélection persistante pour la session.

**Partage** : configuration, agents, skills, serveurs MCP, profils **et session active / historique** partagés avec la CLI.

### 3.23 Migration depuis Mistral Code Enterprise

- Les deux extensions (**Mistral Code** et **Mistral Vibe**) peuvent **coexister**.
- Migration type : installer Vibe, s'authentifier, désinstaller éventuellement Mistral Code. **Aucun transfert automatique** de réglages ni de sessions (Mistral Code exigeait plusieurs modèles spécialisés ; Vibe un seul).
- **Différences clés** : un agent adossé à **un seul modèle** (fin de la sélection multi-modèles de Mistral Code) ; session partagée CLI ↔ extension ; configuration dans `~/.vibe/` et `.vibe/` ; **plans distincts** — Mistral Code Enterprise et Vibe Code sont facturés sur des plans différents (contacter l'équipe compte pour ajouter Vibe).
- **Étapes** : 1) sauvegarder les réglages Mistral Code à garder (préférences de modèles, prompts) ; 2) désinstaller/désactiver Mistral Code ; 3) installer Mistral Vibe ; 4) s'authentifier (clé existante ou setup) ; 5) recréer agents, skills, MCP dans `~/.vibe/config.toml`.
- **Non repris** : préférences par modèle, réglages de l'extension Mistral Code, historique de chat.
- Côté JetBrains : le plugin **Mistral Code Enterprise** est **déprécié**, pas d'extension Mistral autonome pour JetBrains → passer par ACP (cf. 3.27).

### 3.24 Vibe Code Web : concepts, projets, sessions

**Positionnement** : « plan de contrôle pour agents de code distants » : lancer une tâche depuis le web, superviser l'agent, relire la branche/PR produite. Même moteur que la CLI, dans un **sandbox cloud géré** accessible depuis tout navigateur. Statut : Public Preview (cf. 3.18) ; lancement de référence « **May 28** ».

**Capacités** : projets à partir d'un ou plusieurs dépôts GitHub **du même propriétaire** ; sessions distantes depuis le web ; envoi d'un prompt depuis la CLI (`&`) ou téléportation ; agents en sandbox géré ; production de branches et PR GitHub ; revue finale dans GitHub. Adapté aux tâches qui tournent sans fichiers/services/secrets locaux, qui sont longues, et qui aboutissent à une branche ou PR.

**Trois entités** : **project** (espace de travail listé dans la barre latérale, 1+ dépôts d'un même owner — utilisateur ou organisation ; à l'ouverture, configuration limitée au choix des dépôts et au nom), **repository** (dépôt cloné, lu, édité, commité, cible des PR ; plusieurs owners → projets séparés), **session** (une exécution de l'agent : *Spawn* → *Run* → *Follow* → *Review* ; consultable après coup mais **non reprenable** une fois le sandbox déprovisionné).

**Quickstart web** : onglet **Code** de Vibe → créer un projet et connecter des dépôts → **New session** + prompt ciblé (fichier, test en échec, stack trace, comportement attendu) → observer clone/inspection/commandes → ouvrir la branche/PR dans GitHub. **Quickstart CLI** : `& fix the failing auth tests` ; exige CLI à jour, compte avec accès à Vibe Code Web, Mistral GitHub App installée.

**Projets**
- **Créer** : bouton **+** en tête de la liste **Projects** (barre latérale gauche) → sélectionner les dépôts (même owner) → **Continue** → nom → **Create Project**.
- **Lancer une session** : taper un prompt dans l'input en bas de la vue projet (session créée automatiquement) ou **+ New session**. Sessions listées sous le projet dans la barre latérale comme un historique de chat (la barre montre toutes les sessions ; sélectionner un projet filtre).
- **Gérer les sessions** : rouvrir une session passée (activity stream, fichiers modifiés, branche, PR) en **lecture seule** ; **supprimer** une session de l'historique (impossible si active ; **définitive** ; branches/commits/PR conservés dans GitHub).
- **Modifier** : **View project details** → renommer, **détacher** un dépôt, **ajouter** un dépôt du même owner ; effet **sur les nouvelles sessions uniquement**.
- **Supprimer** : **View project details** › **Danger zone** → saisir le **nom complet** du projet → supprimer ; impossible avec des sessions actives ; définitif (projet + historique) ; GitHub intact.

**Sessions**
- **Entrées** : web (**New session**), CLI (`&`), téléportation (`/teleport`, reprise depuis un résumé + état de branche, changements non commités inclus — « la façon la plus propre de sortir d'une session locale devenue trop longue »).
- **Sandbox** : isolé, **mono-locataire** pendant la session, shell à portée limitée, accès lecture/écriture aux dépôts sélectionnés via le **user access token**, politique d'egress réseau ; supprimé en fin de session.
- **Checkout** : clone des dépôts du projet sur la **branche choisie à la création** ; Git via le user access token de la Mistral GitHub App → commits/branches/push **attribués à l'utilisateur**.
- **Boucle d'agent** : **Read** → **Plan** → **Edit / run a command** (shell, tests, build) → **Report** → **Ask** (puis attente de réponse) ; continue jusqu'à un point d'arrêt naturel, une question ou une limite.
- **Vue de session** : **Activity stream** (commandes + sorties chronologiques, journal d'audit), **File changes** (fichiers touchés), **Branch state** (branche de commit courante), **Pull request** (lien GitHub), **Prompt input** (réponses et relances).
- **Sortie** : une **branche** avec les commits de l'agent + une **PR** contre la branche de base avec une description résumant le travail (la page Teleport parle de **draft PR**). Protections de branche, revues obligatoires, `CODEOWNERS`, checks requis s'appliquent. Revue détaillée, commentaires, checks et merge **se font dans GitHub**.
- **Itération après PR** : la PR ne clôt pas la session ; tant que session et sandbox sont actifs, on peut relancer (prompt de suivi, commentaire de reviewer collé, sortie CI en échec collée) ; même sandbox, même branche, contexte conservé. Sandbox déprovisionné → **nouvelle session** obligatoire.

### 3.25 Vibe Code Web : sandbox, GitHub, limites, cycle de vie, sécurité

**Sandbox — isolation** : un sandbox par session, mono-locataire, aucune donnée partagée avec d'autres sessions/utilisateurs, supprimé en fin de session ; **ne peut pas atteindre la machine locale**.

**Image par défaut** (Linux, maintenue par Mistral, mise à jour périodiquement, versions susceptibles de changer) : shell POSIX ; Git configuré avec les identifiants de la Mistral GitHub App ; runtimes de langages courants et leurs gestionnaires de paquets ; utilitaires CLI standards. Outils manquants installés par l'agent pendant la session ; **configuration de sandbox personnalisée = capacité ultérieure**.

**Réseau** : accès **sortant** à internet **géré par Mistral** (installer des dépendances, lire une doc, appeler une API publique), soumis à des **limites de débit** évolutives ; **aucun accès entrant** (impossible d'exposer un serveur public). Allowlists internet configurables par l'utilisateur : **pas encore disponibles**.

**Identifiants** : accès au **user access token** de la Mistral GitHub App et à quelques variables gérées (ID de session, URL du dépôt, nom de branche). **Pas d'accès** à la machine/au FS/au shell local, aux dépôts non autorisés, aux sessions d'autres utilisateurs, aux services internes Mistral au-delà du nécessaire. Conseil : traiter le sandbox **comme un job CI** (identifiants de test/moindre privilège, aucun secret de production).

**Persistance** : dépôt cloné conservé entre itérations d'une même session, perdu à la fin ; artefacts de build et fichiers temporaires supprimés avec le sandbox sauf commit. **La branche ou la PR est la seule sortie durable.**

**Ressources** : calcul/stockage dimensionnés pour des tâches de code typiques ; quotas CPU/mémoire/disque variables selon plan et déploiement (non chiffrés) ; hors périmètre : calcul long, entraînement de gros modèles, pipelines de build lourds.

**GitHub — modèle d'authentification (Mistral GitHub App)**

| Jeton | Usage | Portée effective |
|---|---|---|
| **User access token** | Travail lecture/écriture pour l'utilisateur : clone, branche, commit, push, PR | Intersection des permissions GitHub de l'utilisateur sur le dépôt **et** des scopes accordés à l'App (« la plus étroite gagne ») |
| **Installation access token** | Actions au niveau App/bot, « quand elles seront actives » | Scopes accordés à l'installation, dépôts couverts par l'installation |

**Attribution** : auteur du commit = utilisateur GitHub (jeton + config Git locale au moment du commit) ; committer peut différer selon la config Git ; auteur de la PR = utilisateur.

**Connexion** : à la première création de projet, installer et autoriser l'App : 1) ouvrir le flux depuis Vibe Code Web ; 2) choisir le compte/organisation ; 3) **All repositories** ou **Only select repositories** (recommandé : le plus étroit ; modifiable ensuite dans GitHub) ; 4) confirmer ; 5) autoriser l'App sur le compte utilisateur. À répéter par organisation ; les **owners d'organisation** peuvent devoir approuver l'installation. Lien d'installation : https://github.com/apps/mistralai/installations/new.

**Peut / ne peut pas** : peut cloner un dépôt autorisé, lire, créer des branches, éditer, lancer shell/tests/builds dans le sandbox, committer et pousser, ouvrir des PR. Ne peut pas : accéder à la machine locale, lire/modifier des dépôts non autorisés, **contourner** protections de branche, revues obligatoires, `CODEOWNERS`, checks requis, persister des fichiers hors dépôt après suppression du sandbox.

**Révocation** : accès dépôts → https://github.com/settings/installations ; autorisation du compte → https://github.com/settings/applications (révoquer l'entrée Mistral) ; organisation → réglages GitHub App de l'organisation. La révocation bloque les **nouvelles** sessions ; branches/commits/PR déjà poussés restent.

**Problèmes d'accès fréquents** : dépôt absent (App non installée ou dépôt non sélectionné) ; dépôt d'organisation inaccessible (approbation owner en attente) ; owner différent (projet séparé) ; push/PR en échec (protections, revues, checks, droit d'écriture) ; App autorisée mais pushes en échec (pas de droit d'écriture) ; mauvais auteur (e-mail exposé du compte GitHub et config Git).

**Cycle de vie — phases** : **Start** (création du sandbox) → **Clone** (dépôt + branche) → **Run** → **Review** → **End** (sandbox supprimé à l'arrêt, au timeout ou en erreur).

| État actif | Signification |
|---|---|
| **Active** | L'agent exécute, édite ou réfléchit. |
| **Waiting for input** | Question posée, en pause jusqu'à réponse. |
| **Idle** | Étape terminée, attend une instruction. |
| **Stopped** | Session terminée (voir état de fin). |

| État de fin | Cause |
|---|---|
| **Completed** | Point d'arrêt naturel. |
| **Timed out** | Limite de durée ou d'inactivité atteinte. |
| **Error** | Échec du setup du sandbox ou de l'exécution. |

Branches et PR déjà créées restent dans tous les cas. **Annulation, interruption, arrêt manuel : pas encore disponibles.** Toutes les sessions actives sont visibles dans la barre latérale.

**Modèle** : Vibe Code Web → **Mistral Medium 3.5** ; CLI avec modèle Mistral → Mistral Medium 3.5 ; CLI avec modèle non-Mistral → téléportation impossible.

**Persistance après session** : fichiers du sandbox et artefacts supprimés ; branches, commits, PR conservés ; **historique de session** conservé selon le plan et la politique de rétention applicable.

**Visibilité** : sessions **personnelles** (visibles du seul créateur) ; collaboration via la branche/PR GitHub.

**Capacités prévues après le lancement du 28 mai** :

| Domaine | Capacité prévue |
|---|---|
| Déclencheurs | Démarrer une session depuis **Slack** ou des **événements GitHub** |
| Mobilité | Téléporter une session distante **vers la CLI locale** |
| Contrôle de session | **Approbations pour actions sensibles**, annulation, interruption, pilotage (steering) |
| Visibilité | Notifications, UI riche de diff et de revue in-app |
| Personnalisation du sandbox | Config custom, scripts de setup, **secrets projet**, variables d'environnement |

**Problèmes courants** : session « bloquée » (en attente d'input, timeout ou perte d'accès GitHub) ; clone lent (gros dépôts ; réessayer ou réduire le périmètre) ; commandes en échec (services locaux, outillage OS, GPU, dépendances privées absents) ; autorisation GitHub révoquée/expirée (reconnecter via settings/installations) ; approbation owner en attente ; dépôt non sélectionné ; owner différent ; session inactive non reprenable.

**Sécurité — prompt injection** : tout contenu extérieur au prompt (fichier du dépôt, sortie de commande, URL récupérée, commentaire de PR, corps d'issue) est traité comme donnée mais peut tenter de détourner l'agent. Vecteurs : fichiers du dépôt (README, docs, workflows `.github/`, données d'exemple), sorties shell, pages/API web, commentaires de revue/issues collés en relance. **Mitigations appliquées** : visibilité totale dans l'activity stream ; protections GitHub toujours actives sur ce que pousse l'agent. **À faire** : suivre l'activity stream, cadrer étroitement les tâches, relire le code dans GitHub avant merge, s'appuyer sur protections/revues/checks/`CODEOWNERS`.

**Traitement des données** : fichiers du sandbox et sorties traités le temps de la session ; sandbox supprimé en fin de session ; l'activité de session (prompts, messages de l'agent, sorties de commandes, historique des changements) est **conservée selon le plan et la politique de données Mistral** (spécificités par plan ; renvoi à la politique de confidentialité).

### 3.26 Vibe Code Web pour Slack

**Encadré info (doc)** : **Contenu généré par IA** : sorties possiblement inexactes ; ne pas s'y fier comme conseil factuel, juridique, médical, financier ou professionnel.

**Principe** : démarrer des sessions de code distantes **depuis un fil Slack** ; l'agent lit le contexte du fil, travaille en sandbox isolé et ouvre une PR GitHub sans quitter Slack.

**Configuration (admin d'Organisation Mistral requis)** :
1. Ouvrir **Admin Settings** (https://admin.mistral.ai/organization/connectors).
2. Vérifier l'organisation : **une organisation Mistral ne peut être connectée qu'à un seul workspace Slack**.
3. Section **App Connections** → **Connect to Slack**.
4. Terminer le flux OAuth (un non-owner Slack peut devoir demander l'installation à un owner).
5. L'app **Mistral Vibe** est installée dans le workspace Slack.

**Utiliser le Slack MCP (côté Vibe Work)** : ouvrir **Vibe Work** (https://chat.mistral.ai/connections) → **Slack Connector** → **Connect** → OAuth vers le bon workspace → **New Chat** (lien avec paramètre `integrations=019cfb41-5e8a-7350-b162-b2b80604fe5a`).

**Démarrer une session depuis Slack** — **Avertissement (doc)** : **déploiement progressif**, « bientôt disponible ».
1. Trouver un fil avec assez de contexte (dépôt/projet, bug ou test en échec ou comportement voulu, liens logs/PR/issues/captures, contraintes).
2. Mentionner l'app : `@Vibe investigate the issue described in this thread and open a PR if there is a clear fix.`
3. Répondre dans le fil aux questions (quel dépôt ? quelle branche ? PR ou investigation ? sûr de modifier ou résumé d'abord ?).
4. Ouvrir le lien de session Vibe Code Web posté par l'app (progression, sorties, **pilotage**, branche/PR).
5. Relire dans GitHub (source de vérité pour revue, checks, commentaires, approbations, merge).

**Ce qui se passe** : lecture du fil → mapping vers un projet Vibe Code Web et un dépôt GitHub → demande de choix si ambigu → création de la session + lien posté dans Slack → travail en sandbox → branche ou PR si un changement de code est approprié.

**Cas adaptés** : fils d'incident/astreinte, notifications CI/alertes, escalades client/support, discussions produit/ingénierie, revue de code résumée dans Slack, petite décision d'implémentation déjà actée. **Exemples de prompts** : test en échec (« smallest safe change »), bug client, alerte (« summary first, PR only if low risk »), changement produit acté, test de régression, docs seules, petit refactor (« keep behavior unchanged and run tests »).

**Gabarit de prompt** : `@Vibe [task]` + `Repo/project:` + `Goal:` + `Constraints:` + `Validation:` + `Output: open a PR / investigate only / summarize first`.

**À éviter** : réécritures larges sans owner, tâches dépendant de services/secrets/matériel/réseaux privés locaux, prompts vagues (« fix this »), travail multi-owner GitHub sans mapping clair, changements à concevoir manuellement. **Ne jamais coller de secrets** dans Slack ou le prompt.

**Données** : le contenu des fils partagé avec l'app est traité pour répondre et **n'est pas utilisé pour entraîner les modèles Mistral** ; renvoi à la politique de confidentialité et au trust center (trust.mistral.ai).

### 3.27 Vibe dans d'autres IDE (ACP)

- Vibe implémente l'**Agent Client Protocol** et est publié dans le **registre ACP** (`agentclientprotocol/registry`, entrée `mistral-vibe`) : il tourne comme agent dans le chat natif de tout client ACP (JetBrains IntelliJ IDEA, PyCharm, WebStorm, GoLand ; Zed ; annuaire des clients sur agentclientprotocol.com), avec le même moteur, la même config et la même personnalisation (agents, skills, MCP, profils dans `~/.vibe/` et `.vibe/`).
- **Prérequis** : client compatible ACP ; compte Mistral ; plan Mistral ou clé API.
- **Flux générique** : ajouter Vibe comme agent ACP depuis le registre/les réglages du client → sélectionner **Mistral Vibe** dans le chat → se connecter (compte ou clé). Client **sans registre** : installer la CLI et pointer vers la commande **`vibe-acp`** (Zed : sous `agent_servers` dans les settings).
- **JetBrains AI Assistant** : IDE **2025.3.2+** (registre ACP disponible à partir de cette version) ; plugin **AI Assistant** (icône `AI Chat` › `Install Plugin`, ou `Settings > Plugins`). Puis `Settings` (`Cmd+,` / `Ctrl+Alt+S`) › `Tools > AI Assistant > Agents` › `Search agents` : `Mistral Vibe` › `Install` (l'IDE télécharge l'agent et le runtime requis) › fenêtre `AI Chat` › sélecteur d'agent en bas de l'input : `Mistral Vibe`.
- **Authentification** : au premier besoin, **Sign in through Mistral AI Studio** (navigateur) ou, si le client le propose, enregistrement de la clé dans un terminal ; stockage trousseau OS ou `~/.vibe/.env` ; si la CLI ou l'extension VS Code est déjà authentifiée sur la machine, configuration et identifiants sont réutilisés.
- **Prêt quand** : `Mistral Vibe` est disponible dans le chat, un prompt reçoit une réponse, Vibe utilise le projet et le contexte éditeur actifs.
- **Avertissement (doc)** : **Ne pas utiliser le plugin JetBrains Mistral Code Enterprise** (déprécié) ; aucune extension Mistral autonome pour JetBrains.

## 4. Interface utilisateur

### 4.1 Écrans et routes web (Mistral)

| Chemin / écran | URL | Contenu |
|---|---|---|
| **Code › Vibe CLI** | https://chat.mistral.ai/code/extensions | Création de clé API pour la CLI (clé valable en Free, plan payant, pay-as-you-go). |
| **Admin Panel › Vibe › Preferences** | https://admin.mistral.ai/vibe/preferences | Admin config de niveau Organisation : champ TOML `Vibe Code Clients managed config`. |
| **Admin Panel › Administration › Workspaces** › (Workspace) › `Settings` | https://admin.mistral.ai/organization/workspaces | Admin config de niveau Workspace : hériter / remplacer / désactiver. |
| **Admin Settings › App Connections › Connect to Slack** | https://admin.mistral.ai/organization/connectors | Connexion Organisation ↔ workspace Slack (OAuth ; un seul workspace par organisation). |
| **Vibe Work › Connections › Slack Connector › Connect** | https://chat.mistral.ai/connections | Connexion du Slack MCP pour Vibe Work ; puis **New Chat** (`/chat?integrations=…`). |
| **Vibe › onglet Code** → Vibe Code Web | (non précisée) | Barre latérale **Projects** (bouton **+**), sessions par projet, sessions actives de tous les projets. |
| Création de projet | | Sélection des dépôts (même owner) → **Continue** → nom → **Create Project**. |
| Vue projet | | Input de prompt en bas (crée une session), **+ New session**, liste des sessions, **View project details** (renommer, détacher/ajouter dépôt, **Danger zone** : suppression par saisie du nom complet). |
| Vue session | | **Activity stream**, **File changes**, **Branch state**, **Pull request**, **Prompt input** ; états Active / Waiting for input / Idle / Stopped. |
| Connexion de la CLI navigateur | | **Launch browser** / **Other** (domaine console dédié) / **Use an API key**. |
| Connexion ACP | | **Sign in through Mistral AI Studio**. |

### 4.2 Écrans GitHub

| Action | URL |
|---|---|
| Installer la Mistral GitHub App | https://github.com/apps/mistralai/installations/new |
| Gérer l'accès aux dépôts | https://github.com/settings/installations |
| Révoquer l'autorisation du compte | https://github.com/settings/applications |
| Organisation | Réglages GitHub App de l'organisation (owners) |

### 4.3 TUI de la CLI

- **Assistant de setup** (premier lancement, `vibe --setup`) : choix de thème, **Launch browser** / **Use an API key**, saisie de la clé.
- **Dialogue de confiance** : liste des fichiers « approuvables » détectés ; **Trust folder** / **Trust full repo** / **Don't trust**.
- **Invite d'approbation** en bas de l'écran (options 1–4, clic possible) ; **bordure de l'input colorée selon l'agent** (`safety`).
- **Éditeur `/config`** : **Save to** (utilisateur / projet / session), panneau **Where it's set** (sources, dont l'administrateur ; réglages admin en lecture seule).
- **Sélecteur `/model`** (groupes : admin, expériences, catalogue, config perso ; `Enter` = sauvegarder, `s` = session) ; idem `/thinking`.
- **Sélecteur `/resume`** (`d` ×2 pour supprimer).
- **`/plugins`** (détails, digest épinglé, **Not loaded** ; `/`, `r`).
- **`/connectors` / `/mcp`** (touches `Enter`, `e`, `d`, `r`, `/`, `Escape`).
- Panneaux : **todo list** (`Cmd+\`/`Alt+\`), **console de debug** (`Ctrl+\`, `/debug`), **liste des sous-agents actifs** au-dessus du prompt (`show_subagent_status_list`), vue de sortie des outils (`Ctrl+O`).
- Notifications : cloche + titre du terminal quand une tâche finit ou qu'une approbation attend (hors focus).
- Mode voix (`/voice`, `Ctrl+R`) + narrateur expérimental.

### 4.4 Extension VS Code

- Icône **Mistral Vibe** de la barre d'activité ; action de titre d'éditeur ; panneau **webview** de chat.
- **Sélecteur d'agent** en bas du panneau ; contrôles de modèle et de niveau de réflexion dans l'UI ; chargement des sessions précédentes ; renommage de session.
- Contrôles d'approbation dans la webview.
- Terminal **Mistral Vibe Setup** pour l'authentification.
- Palette : **Mistral Vibe: Open Mistral Vibe**, **Mistral Vibe: Show Logs** ; **Developer: Reload Window** si l'extension n'apparaît pas.
- **Extensions › More Actions › Install from VSIX...**

### 4.5 JetBrains

`Settings` › `Tools > AI Assistant > Agents` › `Search agents` › `Mistral Vibe` › `Install` ; fenêtre `AI Chat` ; sélecteur d'agent en bas de l'input.

### 4.6 Slack

Mention `@Vibe` dans un fil ; questions de clarification dans le fil ; lien vers la session Vibe Code Web posté par l'app.

## 5. API et SDK (interfaces programmatiques)

Les pages assignées ne documentent **aucune API REST publique pour piloter des sessions Vibe Code** ni de SDK Python/TS dédié (inférence : l'automatisation passe par la CLI en mode programmatique). Interfaces relevées :

### 5.1 Commandes et flags de la CLI

| Commande / flag | Rôle |
|---|---|
| `vibe [PROMPT]` | Session interactive (prompt initial optionnel). |
| `vibe --prompt/-p TEXT`, `--prompt-file PATH`, `-p` + stdin | Mode programmatique. |
| `--agent NAME`, `--smart-approve` | Agent de départ. |
| `--auto-approve` / `--yolo` | Approuve tous les appels (ignoré si `enable_auto_approve = false`). |
| `--trust` | Confiance temporaire au répertoire de travail. |
| `--workdir DIR`, `--add-dir DIR` (répétable) | Projet cible ; répertoires additionnels approuvés pour la session. |
| `--worktree [NAME]` | Session dans un git worktree. |
| `--continue/-c`, `--resume [SESSION_ID]` | Reprise. |
| `--max-turns`, `--max-tokens`, `--time-limit`, `--max-price` | Bornes d'exécution. |
| `--enabled-tools`, `--disabled-tools` (répétables) | Filtrage d'outils. |
| `--output text\|json\|streaming`, `--output-dir DIR` | Format de sortie ; export `export.json` + copie de session. |
| `--setup` | Assistant d'authentification. |
| `--version`, `--check-upgrade` | Version ; vérification de mise à jour. |
| `vibe update` | Mise à jour. |
| `vibe mcp add NAME --url URL [--no-login] [--scope S]… [--api-key-env VAR] [--header H]… [--transport stdio --command CMD --arg A… --env K=V…]` | Ajout de serveur MCP. |
| `vibe mcp remove NAME` | Suppression (+ jetons OAuth). |
| `vibe-acp` | Serveur ACP pour clients tiers. |

**Codes de sortie** : `0` terminé, `1` démarrage impossible, `2` échec API/runtime, `3` arrêt avant fin (limite, stop, refus du modèle).

**Sorties** : `json` = tableau des messages de session à la fin ; `streaming` = un objet JSON par message ; `export.json` = version de Vibe, config effective, usage tokens, coût, raison d'arrêt, issue, sous-agents (statut, modèle, tokens, coût, étapes) + sessions copiées.

### 5.2 Endpoints internes utilisés par les clients (admin config)

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `<console_base_url>/api/vibe/whoami` | Renvoie les domaines du tenant : `vibe_base`, `api_base`. |
| GET | `<vibe_base_url>/api/v1/code/managed-config` | Renvoie l'admin config applicable. |

Auth : `Authorization: Bearer <MISTRAL_API_KEY>`. Erreurs signalées : échec de connexion (DNS/TLS/réseau), `401`/`403` (clé ou accès). Défauts SaaS : console `https://console.mistral.ai`, Vibe `https://chat.mistral.ai`.

### 5.3 Contrats de fichiers et formats

- **Hooks** : JSON stdin (`session_id`, `parent_session_id`, `transcript_path`, `cwd`, `hook_event_name`, + `tool_name`, `tool_call_id`, `tool_input`, `tool_status`, `tool_output`, `tool_output_text`, `tool_error`, `duration_ms`) ; JSON stdout (`system_message`, `decision`, `reason`, `hook_specific_output.tool_input` | `.additional_context`) — cf. 3.14.
- **Plugins** : `plugin.json` (schéma `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`), `mcp.json` (`…/mcp.schema.json`, clé `mcpServers`), `libraries.json`, `connectors.json` (`schemaVersion: 1`), `KNOWLEDGE.md`, sous-agents TOML snake_case — cf. 3.15.
- **Skills** : `SKILL.md` (frontmatter Agent Skills).
- **Config** : `config.toml`, `hooks.toml`, `trusted_folders.toml`, agents TOML.

### 5.4 Nommage des outils (référence croisée)

| Contexte | Forme |
|---|---|
| Outils intégrés (permissions, filtres) | `read_file`, `write_file`, `edit`, `bash`, `grep`, `skill`, `ask_user_question`, `process_start` (commandes en arrière-plan) |
| Outils intégrés vus par un hook `pre_tool` | Nom complet `file_system.bash` (court `bash` accepté par `match`) |
| MCP (permissions, filtres) | `{server_name}_{tool_name}` |
| MCP vus par un hook | `<server>.<tool>` |
| Connecteurs (permissions, filtres) | `connector_{connector}_{tool}` |
| Connecteurs dans les logs de session | `connector_<connector>.<tool>` (avec point — **ne fonctionne pas** dans les règles) |
| Plugins | `<namespace>:<skill>`, `<namespace>:<knowledge>`, `<namespace>:<subagent>`, hooks `<plugin-name>:<hook>` |

### 5.5 Endpoints d'analytique Vibe Code (spec OpenAPI locale, hors pages assignées)

Vérification dans `openapi.yaml` — tag **`beta.admin.vibe-code-analytics`**, sécurité `AdminApiKey` :

| Méthode | Chemin | Paramètres | Réponse |
|---|---|---|---|
| GET | `/v1/admin/analytics/vibe/code/usage/by_workspace` | `start_time`, `end_time` (Unix s, requis), `workspace_id` (optionnel) | `VibeWorkspaceStatsOUT` : séries journalières `sessions` (`nb_sessions`, `nb_sessions_cli`, `nb_sessions_acp`, `nb_sessions_programmatic`), `user_prompts` (`nb_prompts_total`/`_cli`/`_acp`/`_programmatic`), `active_users` (idem), `consumed_tokens` (`model`, `input_tokens`, `output_tokens`, `cached_tokens`), `tool_calls` (`total`, `status_success`/`failure`/`skipped`, `approval_ask`/`always`/`never`), `tool_calls_by_name` (`tool_name`, `count`), `session_durations` (`total_duration_hours`) |
| GET | `/v1/admin/analytics/vibe/code/usage/by_organization` | `start_time`, `end_time` | `VibeOrganizationStatsOUT` : `next_edit_suggestions` (`total_suggestions`, `outcome_accepted`/`rejected`/`timeout`/`aborted`/`dismissed`, `force_generated_true`/`false`), `next_edit_active_users`, `next_edit_modified_loc` (`lines_inserted`/`deleted`/`unchanged`/`total`) |

Ces métriques segmentent l'usage par surface (**CLI / ACP / programmatique**) et révèlent une fonctionnalité **« Next Edit »** (suggestions d'édition) absente des pages assignées (cf. §8).

## 6. Limites, quotas, tarifs, disponibilité

### 6.1 Plans et facturation

- L'**usage mensuel inclus** des plans Mistral est **partagé entre Studio, l'API et Vibe Code** ; Vibe Code le consomme avant tout pay-as-you-go.
- Usage inclus épuisé : **pay-as-you-go désactivé** (défaut) → Vibe Code peut s'arrêter jusqu'à la période suivante ; **activé** → consommation des **crédits prépayés**, arrêt à solde nul.
- Certains plans **Pro achetés via partenaires** (Google, Apple, Free Mobile, Orange) ne peuvent pas activer le pay-as-you-go → arrêt à épuisement.
- Une clé de **Code › Vibe CLI** fonctionne en Free, payant ou pay-as-you-go.
- **Mistral Code Enterprise** et **Vibe Code** : plans **séparés**.
- Coût affiché en programmatique (`--max-price`, `input_price`/`output_price`/`cached_input_price`) **indicatif**.

### 6.2 Vibe Code Web / Teleport

| Limite | Valeur |
|---|---|
| Plans pour téléporter | Pro, Team, Enterprise (clé API liée) |
| Durée max de session | 24 h |
| Inactivité (attente de réponse) | 3 h |
| Timeout par commande (page Teleport) | 30 s |
| Sessions concurrentes par utilisateur | Selon le plan |
| Quota journalier — Free | 2 sessions/jour, « là où l'accès est activé » |
| Quota journalier — payant | 100 sessions/jour |
| Modèle | Mistral Medium 3.5 (imposé) |
| Ressources sandbox | Non chiffrées ; selon plan et déploiement |
| Réseau sortant | Géré par Mistral, limité en débit ; pas d'entrant |
| Projet | Dépôts d'un seul owner GitHub |
| Slack | Une organisation Mistral ↔ un workspace Slack ; admin d'organisation requis |
| Statut | Public Preview ; lancement « May 28 » ; démarrage depuis Slack en déploiement progressif |

### 6.3 Plugins

| Élément | Limite |
|---|---|
| Nom de plugin | 1–64 caractères |
| `displayName` | 1–100 caractères |
| Knowledge folders | ≤ 100 par plugin ; `KNOWLEDGE.md` ≤ 256 Ko ; `description` 5–300 car. ; `name` ≤ 64 |
| Sous-agents | ≤ 128 fichiers, ≤ 64 Ko chacun ; `description` 1–300 car. |
| Hooks | ≤ 128 hooks, fichier ≤ 64 Ko |

### 6.4 Valeurs par défaut et bornes CLI notables

`description` de skill ≤ 1 024 car. ; `startup_timeout_sec` 10 s ; `tool_timeout_sec` 60 s ; `timeout` de hook 60 s ; 3 relances `post_agent` par tour ; `output_limit_retries` 6 ; `compaction_max_output_tokens` 80 000 ; `compaction_reasoning_limit_tokens` 32 000 ; compaction auto à 80 % du contexte (ou 200 000 tokens) ; `output_token_reserve` 4 096 ; `temperature` 0,2 ; `worktree_limit` 15 ; cache admin config 7 jours ; vérification de mise à jour 1×/jour.

### 6.5 Versions et plateformes

| Élément | Exigence |
|---|---|
| Python (install manuelle) | ≥ 3.12 (3.14 pour Vibe 3.0.0 uniquement) |
| OS | macOS, Linux (principaux) ; Windows supporté |
| VS Code | ≥ 1.94.0 |
| JetBrains | ≥ 2025.3.2 + plugin AI Assistant |
| Admin config | CLI ≥ 2.24.2 ; extension VS Code ≥ 1.16 ; `enable_mcp=false` CLI ≥ 3.0 ; `enable_auto_approve=false` CLI ≥ 3.0.1 |
| Reprise de sessions | Sessions Vibe ≥ 2.0 reprenables par Vibe 3.0 (pas 1.x) |
| Modèle local Mistral Small 4 | ≥ 1 H100 80 Go en FP8 |

### 6.6 Déploiements

- **Serverless** (SaaS) : admin config disponible pour toutes les organisations.
- **Dedicated (private cloud)** : activation via l'équipe compte ; correctifs par redéploiement.
- **Self-hosted** : activation sur demande via chart Helm ; correctifs par release (hotfix pour critique).
- Connexion CLI à un déploiement dédié/auto-hébergé : **Launch browser › Other** + domaine console.

### 6.7 Données, télémétrie, rétention

- Télémétrie CLI anonyme (usage, erreurs ; ni prompts, ni fichiers, ni sorties) activée par défaut ; extension : soumise aussi à `telemetry.telemetryLevel`.
- `/data-retention` affiche les informations de rétention (CLI et VS Code).
- Vibe Code Web : sandbox supprimé en fin de session ; activité retenue selon plan et politique Mistral.
- Slack : contenu des fils **non utilisé pour l'entraînement**.

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Configuration**
- Dans un TOML, `active_model` doit être **au-dessus de la première table `[[...]]`**, sinon il est rattaché à cette table.
- `allowlist`/`denylist` **remplacent** les listes par défaut (réinclure `ls`, `git status`…).
- `allowed_models` s'applique au **nom API** (`name`), pas à l'alias ; aucun modèle correspondant → **admin config entière rejetée**.
- Une entrée `[[providers]]` en admin config **remplace entièrement** le fournisseur intégré du même nom : ne pas redéfinir `mistral` sans `backend = "mistral"` et un `api_base` finissant par `/v1`.
- Une liste `mcp_servers` vide en admin config ne retire pas les serveurs utilisateur : utiliser `enable_mcp = false`.
- Admin config : secrets littéraux rejetés ; config non appliquée sans clé API Mistral ; pas de bannière d'information ; changements d'agent de départ/connecteurs pris en compte à la session suivante après `/reload`.
- Précédence : les **réglages de l'agent actif passent avant les flags CLI** (seule l'admin config est au-dessus).
- `VIBE_<KEY>` : `__` pour les clés imbriquées ; valeur non parsable ignorée.
- Clés sans effet : `displayed_workdir`, `context_warnings`, `raise_on_compaction_failure`, `enable_auto_update`.
- Vibe 3.0 : validation TLS plus stricte (CA privées) → `enable_system_trust_store`.
- `~/.vibe/config.toml` n'existe pas tant qu'aucun réglage n'est sauvegardé.

**Agents / approbations**
- `accept-edits` n'auto-approuve que les éditions **dans le répertoire de travail**.
- `.env` / `.envrc` et chemins hors workdir demandent confirmation même avec `always` (sauf `allowlist` ou auto-approve total).
- `safety` est purement visuel (sauf masquage `yolo`).
- Prompt d'un agent custom pris en compte seulement s'il est choisi avant le 1er message (sinon après `/clear`).
- Session reprise = agent d'origine, quels que soient `--agent`/`default_agent`.
- Agent `plan` supprimé en 3.0 (repli `ask`) ; `ask` s'appelait `default` ; outils renommés `read` → `read_file`, `search_replace` → `edit` (migration auto).
- Sous-agents : modèle de session imposé, pas d'outils MCP/connecteurs/plugins, pas de questions.
- Programmatique : approbations impossibles → refus ; pas d'invite de confiance (utiliser `--trust`) ; attend les sous-agents actifs avant de quitter.
- `--add-dir` charge `.vibe/`, `AGENTS.md` et plugins **sans demander confiance**.
- `--worktree` lit l'argument suivant comme nom : placer le prompt avant.

**Hooks**
- Les commandes d'arrière-plan passent par `process_start` → `match = "re:bash|process_start"`.
- `duration_ms` toujours `0`.
- `post_tool` ne se déclenche pas si l'outil n'a pas tourné.
- Plugin hooks : **validés, listés, jamais exécutés** (actuellement).
- Réécriture `tool_input` = remplacement complet, revalidé.

**Plugins**
- `/reload` ne recharge pas les plugins (`/reload-plugins`) ; plugins épinglés par session ; MCP et connecteurs non épinglés.
- `mcp.json` de Claude Code sans `$schema` → aucun serveur chargé ; `sse` non supporté.
- `toolOverrides` n'affecte que l'affichage `/plugins`.
- Collision de nom avec un MCP de `config.toml` → serveur du plugin désactivé.
- Doublons de nom/namespace/import → rien n'est chargé ; namespaces réservés.
- Clés snake_case pour les sous-agents de plugin ; `always` → `ask` si `allowlist`/`denylist` présentes.

**MCP / connecteurs**
- Dans les règles, `connector_web_search_weather_search` (underscore) — la forme avec point des logs ne correspond à rien.
- `vibe mcp remove` supprime aussi les jetons OAuth.
- Ne pas combiner les champs d'auth de premier niveau d'un `[[mcp_servers]]` avec `[mcp_servers.auth]`.
- Clé « connecteurs partagés uniquement » → régénérer une clé via `vibe --setup` pour les connecteurs personnels.

**Sessions / CLI**
- `--continue`, `--resume` sans ID et le sélecteur ne listent que les sessions du **répertoire courant**.
- `/branch` ne modifie pas la session courante.
- `--max-price` non fiable pour un budget strict.
- `Shift+Enter` envoie le message dans macOS Terminal, iTerm2, WezTerm (défaut) → `Ctrl+J`.
- Collage d'images et `/paste-image` : macOS seulement.
- Dans tmux, le scrollback du multiplexeur ne contient pas la conversation.

**Vibe Code Web**
- Téléportation **à sens unique** ; impossible depuis un `HEAD` détaché, un dépôt sans remote GitHub ou un modèle non-Mistral ; inclut les changements non commités ; peut pousser la branche (après confirmation).
- Modèle imposé Mistral Medium 3.5.
- Pas d'annulation/interruption/arrêt manuel ; session non reprenable après déprovisionnement ; session active non supprimable ; projet avec sessions actives non supprimable ; modifications de projet effectives pour les nouvelles sessions seulement.
- Un projet = un seul owner GitHub.
- La portée effective du user access token = intersection droits utilisateur ∩ scopes App.
- Sessions personnelles, non partageables (partager la PR).
- Révocation GitHub : n'affecte que les nouvelles sessions.

**VS Code**
- Pas de mode programmatique ; pas de `/rewind`, `/loop`, `/voice`, ni d'ajout MCP ; pas d'UI de permissions par outil (passer par `config.toml`) ; pas de keybindings par défaut.
- Connexion navigateur pas encore disponible dans l'extension.
- Migration Mistral Code : rien n'est transféré.

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **« Profils »** : un commentaire TODO de la page « API keys and profiles » reconnaît que la CLI **n'a pas de concept explicite de profil** et suggère de renommer la page (« API keys and credentials »).
2. **Connecteurs** : TODO interne demandant la liste de lancement, le modèle d'authentification (OAuth vs compte vs par outil), la différence UI `/connectors` vs `/mcp`, la portée par projet et le flux de révocation — non documentés. L'exemple `/connectors fetch_server` réutilise un nom de serveur MCP.
3. **Statut de Teleport** : TODO « confirmer si Teleport est toujours en Public Preview au lancement ». Libellé facturation également marqué TODO (« confirm plan/billing wording »).
4. **Approbations sur le web** : la page Sécurité affirme que le modèle d'approbation est cohérent sur les trois surfaces et que « les approbations apparaissent dans l'UI navigateur », alors que « Limits and lifecycle » liste les **approbations pour actions sensibles** parmi les capacités **à venir**.
5. **Slack** : « Limits and lifecycle » présente le démarrage depuis Slack comme une capacité future, alors qu'une page Slack dédiée existe (avec avertissement de déploiement progressif). La date « May 28 » est donnée sans année.
6. **Plans pour Vibe Code Web** : Teleport exige Pro/Team/Enterprise, mais les quotas mentionnent « Free users : 2 sessions per day, where access is enabled ».
7. **Timeout de commande 30 s** : uniquement sur la page Teleport, absent de « Limits and lifecycle » (paraît très court pour des tests/builds — à confirmer).
8. **PR draft ou non** : Teleport annonce une « draft pull request » ; la page Sessions parle d'une PR ouverte contre la branche de base sans préciser.
9. **Nom du modèle intégré** : alias `mistral-medium-3.5` (avec point) vs IDs `mistral-medium-latest` / `mistral-medium-3-5` (avec tirets) ; l'exemple `allowed_models` utilise `mistral-vibe-cli-latest` / `mistral-vibe-cli-*`, un ID absent du tableau des modèles (inférence : modèle propre à Vibe CLI).
10. **« Un seul modèle »** : la page de migration affirme que Vibe « ships a single agent backed by a single model », alors que le reste de la doc décrit plusieurs agents et de nombreux modèles/fournisseurs.
11. **`safety`** : valeurs `safe`, `neutral`, `destructive`, `smart`, `yolo` pour les agents, mais la liste des sous-agents de plugin omet `smart`.
12. **`Shift+Tab` dans VS Code** : « cycle the active input mode » (page commandes) vs « cycle through agents » (page agents).
13. **`/log`** : « chemin du fichier de log d'interaction » (CLI) vs « chemin du répertoire de logs de session » (extension).
14. **`/mcp` dans VS Code** : exposé avec `status`/`login`/`logout`, mais la section parité renvoie à la CLI pour « adding or browsing MCP servers with `/mcp` ».
15. **`enable_auto_approve`** : la doc dit « the Vibe Code CLI hides… » ; l'effet exact dans l'extension VS Code (qui applique l'admin config) n'est pas précisé ; la page Agents VS Code ne mentionne pas la désactivation admin.
16. **`bypass_tool_permissions`** : cité comme ignoré par `enable_auto_approve = false` mais absent de la référence de configuration.
17. **Types `table`** de `compaction_model` et `vision_model` : structure attendue non décrite.
18. **Noms d'outils** : deux conventions (`{server}_{tool}` pour les permissions, `<server>.<tool>` / `file_system.bash` pour les hooks) ; la liste complète des outils intégrés n'est pas fournie.
19. **Limite de taille de sélection** dans VS Code : non chiffrée. **Quotas CPU/mémoire/disque** du sandbox : non chiffrés.
20. **Installation access token** : usages « when those actions are live » — non précisés.
21. **Next Edit** : la spec OpenAPI expose des métriques `next_edit_*` (suggestions acceptées/rejetées, lignes modifiées) pour Vibe Code au niveau Organisation, sans aucune page assignée décrivant cette fonctionnalité (probablement dans l'extension IDE — inférence).
22. **Narrateur expérimental** (`/voice`) et **catalogue de modèles curé** (`experimental_enable_model_catalog`, « experiments » qui assignent un modèle) : mentionnés sans documentation détaillée.
23. **`/loop`** : planification récurrente en langage naturel, sans détails de persistance ni de limites.
24. **Commentaires TODO** de captures d'écran manquantes dans les pages VS Code (setup, panneau, invite d'approbation).

## Annexe — Couverture

| # | Fichier | Statut | Source |
|---|---|---|---|
| 1 | `vibe/code/overview.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/overview.md |
| 2 | `vibe/code/choose-cli-vscode-web-sessions.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/choose-cli-vscode-web-sessions.md |
| 3 | `vibe/code/safety-approvals-permissions.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/safety-approvals-permissions.md |
| 4 | `vibe/code/use-vibe-in-other-ides.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/use-vibe-in-other-ides.md |
| 5 | `vibe/code/cli/install-setup.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/install-setup.md |
| 6 | `vibe/code/cli/work-with-cli.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/work-with-cli.md |
| 7 | `vibe/code/cli/commands-shortcuts.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/commands-shortcuts.md |
| 8 | `vibe/code/cli/configuration.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/configuration.md |
| 9 | `vibe/code/cli/configuration-reference.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/configuration-reference.md |
| 10 | `vibe/code/cli/admin-config.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/admin-config.md |
| 11 | `vibe/code/cli/agents.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/agents.md |
| 12 | `vibe/code/cli/api-keys-profiles.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/api-keys-profiles.md |
| 13 | `vibe/code/cli/plugins.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/plugins.md |
| 14 | `vibe/code/cli/hooks.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/hooks.md |
| 15 | `vibe/code/cli/mcp-servers.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/mcp-servers.md |
| 16 | `vibe/code/cli/connectors.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/connectors.md |
| 17 | `vibe/code/cli/skills.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/skills.md |
| 18 | `vibe/code/cli/offline-models.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/offline-models.md |
| 19 | `vibe/code/cli/teleport-cli-web.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/teleport-cli-web.md |
| 20 | `vibe/code/cli/terminal-support.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/cli/terminal-support.md |
| 21 | `vibe/code/vs-code-extension/install-authenticate.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vs-code-extension/install-authenticate.md |
| 22 | `vibe/code/vs-code-extension/work-with-extension.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vs-code-extension/work-with-extension.md |
| 23 | `vibe/code/vs-code-extension/commands-slash-commands.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vs-code-extension/commands-slash-commands.md |
| 24 | `vibe/code/vs-code-extension/settings.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vs-code-extension/settings.md |
| 25 | `vibe/code/vs-code-extension/agents.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vs-code-extension/agents.md |
| 26 | `vibe/code/vs-code-extension/migration-mistral-code-enterprise.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vs-code-extension/migration-mistral-code-enterprise.md |
| 27 | `vibe/code/vibe-code-web/get-started.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/get-started.md |
| 28 | `vibe/code/vibe-code-web/sessions.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/sessions.md |
| 29 | `vibe/code/vibe-code-web/projects.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/projects.md |
| 30 | `vibe/code/vibe-code-web/sandbox-environment.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/sandbox-environment.md |
| 31 | `vibe/code/vibe-code-web/github-repositories-permissions.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/github-repositories-permissions.md |
| 32 | `vibe/code/vibe-code-web/limits-and-lifecycle.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/limits-and-lifecycle.md |
| 33 | `vibe/code/vibe-code-web/security.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/security.md |
| 34 | `vibe/code/vibe-code-web/slack-integration.md` | ✅ lu en entier | https://docs.mistral.ai/vibe/code/vibe-code-web/slack-integration.md |

Complément : grep ciblé dans `openapi.yaml` (endpoints `/v1/admin/analytics/vibe/code/usage/*` et schémas `Vibe*Stat`), signalé en §5.5.
