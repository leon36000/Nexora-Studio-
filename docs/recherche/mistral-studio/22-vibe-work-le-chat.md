# 22 — Vibe Work et Le Chat (legacy)

> **Périmètre** : Vibe (vue d'ensemble, choix Work / Code / Chat legacy), toutes les fonctionnalités de Vibe Work, les fonctionnalités héritées de l'onglet Chat (Agents, Code Interpreter, Deep Research, Memories, Think mode) et les passerelles Vibe ↔ Studio ↔ Admin · **Sources** : 26 pages de docs.mistral.ai (copie du 21/10/2026), complétées par des recherches ciblées dans la spec OpenAPI locale (signalées « spec OpenAPI ») · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Vibe, l'agent unifié (modes, fusion Chat/Work, toggle fast/think, Temporary Chat)
   - 3.2 Choisir entre Work, Code et Chat (legacy)
   - 3.3 Démarrer avec Work (ouverture, prompt, todos, revue)
   - 3.4 Projects
   - 3.5 Libraries
   - 3.6 Knowledge Base
   - 3.7 Connectors « featured »
   - 3.8 MCP Connectors (annuaire et serveurs personnalisés)
   - 3.9 Skills
   - 3.10 Scheduled tasks (tâches planifiées)
   - 3.11 Workflows
   - 3.12 Mini apps
   - 3.13 Files et Canvas
   - 3.14 Spreadsheets (tableurs)
   - 3.15 Code Interpreter (Work)
   - 3.16 Génération d'images
   - 3.17 Web search et Open URL
   - 3.18 Voice mode
   - 3.19 Custom instructions
   - 3.20 Sécurité et approbations
   - 3.21 Changer d'organisation / de workspace
   - 3.22 Chat legacy — Agents
   - 3.23 Chat legacy — Code Interpreter
   - 3.24 Chat legacy — Deep Research
   - 3.25 Chat legacy — Memories
   - 3.26 Chat legacy — Think mode
   - 3.27 Passerelles Vibe ↔ Studio ↔ Admin (synthèse)
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Vibe** est présenté comme l'« agent unifié » de Mistral pour la productivité et le code, destiné à un usage professionnel, disponible sur le web, sur mobile (iOS, Android), dans l'éditeur de code et dans le terminal.
- Deux **modes** : **Work** (apps web et mobile Vibe : conversations rapides *et* tâches professionnelles multi-étapes) et **Code** (terminal/CLI, extension VS Code, sessions distantes dans le cloud).
- **Chat et Work ont fusionné** « depuis le 22 septembre » (année non précisée ; 2026 par inférence vu la date de la copie) : un seul espace, un **toggle fast/think** règle la profondeur (réponse conversationnelle rapide vs workflow agentique) au lieu d'un choix d'onglet. `chat.mistral.ai` reste le point d'entrée ; plan, historique et réglages sont conservés.
- **Migration progressive** : comptes self-serve Free, Pro et Teams d'abord ; les organisations Enterprise ont une **fenêtre de six mois**, l'administrateur choisit la date de migration dans le panneau d'administration ou déclenche la fusion immédiatement. Des modales d'onboarding expliquent les changements à la première ouverture.
- **Work = délégation supervisée** : l'utilisateur décrit un résultat, Work collecte le contexte (prompt, fichiers, outils connectés, web), planifie, appelle des outils, affiche un panneau de **todos**, ses résumés de raisonnement et chaque appel d'outil, et **demande une approbation** avant toute action sensible (envoi, modification, suppression).
- **Contexte réutilisable** : Custom instructions (compte), Projects (groupes de chats avec ton/instructions/fichiers), Libraries (bases documentaires indexées, partageables), Knowledge Base (mémoire persistante, successeur de Memories), Skills (standard ouvert *Agent Skills*, `SKILL.md`), Connectors (12 « featured » en OAuth + MCP), Workflows (codés et publiés depuis **Studio**), Scheduled tasks (**Public Preview**).
- **Production d'artefacts** : Canvas (éditeur versionné : texte, code, données, HTML, React, Mermaid, Marp), mini apps React partageables, tableurs multi-feuilles (plans payants), Code Interpreter sandboxé Python/TypeScript (plans payants), génération/édition d'images (modèles **Black Forest Labs**), web search (avec actualités **AFP** et **AP**) et Open URL, Voice mode (13 langues).
- **Chat (legacy)** : Agents → remplacés par les **Skills** ; Think mode → **toggle fast/think** ; Deep Research → **Skill `deep-research`** ; Code Interpreter → **Code Interpreter natif de Work** (payant) ; Memories → **Knowledge Base**. Ces fonctions continuent de marcher tant que l'accès à l'onglet Chat subsiste.
- **Liens avec Studio** : Workflows construits dans Studio puis publiés comme « chat-compatible assistants » (sortie `ChatAssistantWorkflowOutput`) ; Skills créés dans Studio publiables via `Publish to Vibe` ; Agents Studio déployables dans Chat (champ API `deployment_chat`) ; Workspaces communs à Vibe, Studio et Admin Panel ; Document AI et Speech to Text de Studio cités comme solutions « à l'échelle ».
- **Statuts** : seules les Scheduled tasks sont explicitement en **Public Preview** ; les cinq fonctions Chat sont **legacy / en retrait** ; Spreadsheets et Code Interpreter sont réservés aux **plans payants**.

---

## 2. Concepts et vocabulaire

| Terme original | Définition |
|---|---|
| **Vibe** | Agent unifié de Mistral (productivité + code) ; nouveau nom de l'expérience grand public/pro anciennement « Le Chat » (l'app mobile s'appelle encore `le-chat-by-mistral-ai` dans l'URL App Store). |
| **Work** | Mode de Vibe pour conversations et tâches multi-étapes, dans les apps web et mobile. |
| **Code** | Mode développeur de Vibe : CLI, extension VS Code, sessions distantes (sandbox cloud sur un dépôt GitHub). |
| **Chat (legacy)** | Ancien onglet de conversation au tour par tour, porteur d'Agents, Think mode, Deep Research, Code Interpreter, Memories ; en cours de suppression. |
| **fast/think toggle** | Bascule de profondeur dans l'expérience unifiée : `fast` = réponse conversationnelle rapide, `think` = raisonnement/workflow agentique approfondi. |
| **Temporary Chat** | Conversation non enregistrée dans l'historique, exclue de la recherche, de la mémoire et de l'entraînement ; seul le fait qu'elle a eu lieu est journalisé. |
| **Task** | Unité de travail confiée à Work (un prompt et son exécution). |
| **Todos panel** | Liste de contrôle vivante (panneau de droite) des étapes faites/à venir pendant une tâche longue. |
| **Reasoning summary** | Résumé du raisonnement affiché pour chaque étape pendant l'exécution. |
| **Clarifying / follow-up questions** | Questions posées par Work avant d'agir si le prompt est ambigu, avec réponses proposées cliquables. |
| **Approval** | Demande de confirmation avant une action sensible ; options `Continue`, `Always allow`, `Decline`. |
| **Connector** | Pont sécurisé entre Work et un service externe (lecture et action). |
| **Featured Connector** | Connecteur intégré à flux OAuth direct (Gmail, Slack, Notion…). |
| **MCP Connector** | Connecteur vers un serveur Model Context Protocol : issu de l'annuaire pré-configuré ou personnalisé (`Custom MCP Connector`). |
| **Function (de Connector)** | Outil individuel exposé par un connecteur ; classé **Interactive** (écriture) ou **Read-only** (lecture). |
| **Always allow** | Pré-autorisation d'une fonction (au niveau de la session dans la boîte d'approbation, ou par fonction et par utilisateur dans l'onglet `Functions`). |
| **Project** | Collection de chats avec ton, instructions et fichiers partagés propres. |
| **Library** | Base de connaissances persistante (documents + pages web indexés), interrogée en temps réel, avec citations. |
| **Knowledge Base / Knowledge** | Mémoire persistante des faits et préférences issus des conversations ; successeur de Memories ; organisée en « topics » et « entries ». |
| **read / write pill** | Pastilles affichées dans le chat quand Vibe consulte (`read`) ou enregistre (`write`) une entrée de Knowledge Base. |
| **Sensitive data in Knowledge** | Réglage autorisant l'enregistrement de certaines données sensibles (santé, opinions…). |
| **Skill** | Dossier contenant un `SKILL.md` (instructions + métadonnées) et des fichiers annexes ; standard ouvert *Agent Skills*. |
| **Progressive disclosure** | Chargement en trois temps des Skills : découverte (nom + description), activation (`SKILL.md` complet), exécution (fichiers référencés). |
| **Built-in / Personal / Workspace Skill** | Skill fourni par Mistral / créé pour soi / partagé avec tout le workspace. |
| **Force-enabled Skill** | Skill imposé par un admin de workspace, toujours actif, non désactivable par l'utilisateur. |
| **Scheduled task** | Prompt exécuté automatiquement à une date ou selon une récurrence (Public Preview). |
| **Workflow** | Processus codé, construit dans Studio par des développeurs et publié comme « Chat-compatible assistant » appelable dans Work. |
| **Canvas** | Éditeur intégré (texte, code, données, présentations) avec versions, suivi des modifications et prévisualisation. |
| **Mini app** | Application React autonome générée et exécutée dans le Canvas. |
| **Code Interpreter** | Sandbox isolée sans Internet exécutant Python/TypeScript. |
| **Open URL** | Lecture par Work d'une page (ou d'un fichier en ligne) dont l'utilisateur fournit l'URL. |
| **Autosend** | Réglage du Voice mode : envoi automatique de la transcription ou dépôt dans la zone de saisie. |
| **Custom instructions** | Préférences persistantes au niveau du compte (Tone + texte). |
| **Organization / Workspace** | Organisation = entité de rattachement ; Workspace = **frontière d'isolation** (pas un conteneur de gestion d'équipe), partagée entre Vibe, Studio et Admin Panel. |
| **Default Workspace** | Nom du workspace quand l'organisation n'en a qu'un. |
| **Agent (Chat legacy)** | Assistant spécialisé configuré une fois (instructions, ton, garde-fous, outils, connaissances) ; non utilisable par API. |
| **Studio Agent** | Agent créé dans Studio / via l'API, déployable dans Chat (section dédiée de la liste d'agents). |
| **Research mode** | Mode Deep Research de l'onglet Chat legacy (`Research` vs `Fast`). |
| **Think mode** | Mode de raisonnement Chat legacy, propulsé par les modèles **Magistral** (chain-of-thought visible). |
| **Memories** | Mémoire Chat legacy (onglet `Memories` sous `Intelligence`). |

---

## 3. Fonctionnalités en détail

### 3.1 Vibe, l'agent unifié

**Modes**

| Mode | Surfaces | Usage |
|---|---|---|
| Work | Apps web et mobile Vibe | Conversations rapides et tâches pro multi-étapes (recherche, brouillons, synthèses, exécutions planifiées) ; toggle fast/think. |
| Code | Terminal (CLI), VS Code, sessions distantes cloud | Développement (hors périmètre de ce chapitre). |

**Fusion Chat + Work (encadré `:::info`)**
- Avant : deux onglets distincts, **Chat** (conversations rapides) et **Work** (travail agentique multi-étapes) — il fallait choisir la surface avant de commencer.
- Depuis le 22 septembre : une expérience unique ; le toggle fast/think fixe la profondeur, « pas l'onglet ».
- `chat.mistral.ai` reste l'URL d'entrée ; plan, historique et réglages préservés.
- Déploiement progressif : self-serve **Free, Pro, Teams** d'abord ; **Enterprise** : fenêtre de migration de **six mois**, date choisie par l'administrateur dans l'admin panel, ou fusion immédiate.
- Consigne explicite : « si vous utilisiez les Agents, utilisez les Skills ; invoquez-les avec `@` » (voir incohérence `@` vs `/` en §8).
- Des **modales d'onboarding** présentent les changements à la première ouverture.

**Fonctionnement commun à tous les modes** (« mêmes modèles Mistral, mêmes patterns, même contrôle ») :
1. L'utilisateur décrit le résultat souhaité en langage naturel.
2. Vibe collecte le contexte : prompt, fichiers joints, outils connectés, web.
3. Vibe planifie et agit : découpe en étapes, appelle les bons outils, montre sa progression en temps réel.
4. L'utilisateur relit et réutilise : sorties inspectables, éditables, réutilisables d'une session à l'autre.

Contrôle : approbation avant les actions sensibles, affichage de chaque appel d'outil, possibilité de réorienter ou d'arrêter à tout moment.

**Temporary Chat** (`:::info`) : conversation non sauvegardée dans l'historique et non utilisée pour l'entraînement ; Mistral ne journalise **que l'existence** d'un Temporary Chat, pas son contenu ; des données peuvent être conservées si la loi l'exige. La page de choix de mode précise : exclue de l'historique, de la **recherche**, de la **mémoire** et de l'entraînement.

**Mobile** : apps iOS (App Store id `6740410176`, slug `le-chat-by-mistral-ai`) et Android (package `ai.mistral.chat`) pour utiliser Work en mobilité.

**Points d'entrée documentés** : guide Work (`/vibe/work/get-started`), guide Code (`/vibe/code/overview`), déploiement admin (`/admin` : workspaces, plans, permissions).

### 3.2 Choisir entre Work, Code et Chat (legacy)

| | Work | Code | Chat (legacy) |
|---|---|---|---|
| Quand | Tâches multi-étapes, plusieurs sources, actions dans des outils connectés, besoin de relire avant usage ; aussi les conversations simples (toggle `fast`) | Tâche dépendant d'une base de code, d'un terminal, d'un IDE ou d'une session de code | Conversations au tour par tour + fonctions antérieures à l'unification |
| Surfaces | Web + mobile, interface de chat | CLI, extension VS Code, sessions web distantes | Onglet `Chat` |
| Apports clés | Connecteurs « en nombre illimité » (Gmail, Outlook, Slack, Notion, Linear, GitHub, Atlassian, Google Drive, SharePoint, Stripe) ; progression et appels d'outils visibles ; questions de clarification ; approbations avant actions sensibles ; Skills et Projects ; Scheduled tasks (once/daily/weekly/monthly/yearly) ; Temporary Chat | CLI scriptable (repos locaux, automatisation) ; extension VS Code (aide inline, édition, chat) ; sessions distantes lançables depuis web, mobile, desktop, IDE, CLI sur un dépôt GitHub | Agents, Think mode, Deep Research, Code Interpreter, Memories |
| Statut | Expérience cible | Actif | Retrait progressif (Enterprise : fenêtre de 6 mois) |

Exemples de tâches Work cités : rattrapage hebdo sur un Project « Q4 launch », synthèse d'un contrat de 80 pages avec risques de renouvellement, brouillons de réponses aux e-mails non lus de l'équipe juridique, brief d'une page sur 5 concurrents, regroupement par thème des retours clients dans Notion puis génération d'un deck.

Exemples Code : expliquer l'authentification d'un repo, refactorer `src/api/handlers/`, ajouter des tests pour `parseInvoice`, lancer la suite de tests, corriger et ouvrir une PR, reprendre sur le web une session commencée en CLI.

**Table de correspondance Chat → expérience unifiée**

| Fonction Chat | Équivalent unifié |
|---|---|
| Agents (assistants spécialisés avec outils et instructions propres) | **Skills**, invoqués avec `@` (selon cette page) |
| Think mode (raisonnement étendu) | **Toggle fast/think** |
| Deep Research (recherche multi-sources, rapport cité) | **Skill Deep Research** (`deep-research`) dans Work |
| Code Interpreter (sandbox graphiques/analyse) | **Code Interpreter natif** de Work, mêmes capacités, **plans payants** |
| Memories (faits et préférences long terme) | **Knowledge Base** (« connaissance persistante qui s'adapte au contexte et aux projets ») |

### 3.3 Démarrer avec Work

**Ouvrir Work**
1. Ouvrir `Work` → <https://chat.mistral.ai/work>.
2. Si la barre latérale est fermée : icône tiroir, ou raccourci `Cmd+Shift+B` (macOS) / `Ctrl+Shift+B` (Windows, Linux).
3. Dans la barre latérale, choisir **Work** dans le sélecteur de mode.
4. Lancer la tâche.

Vibe **mémorise le dernier onglet** sélectionné : si **Code** s'ouvre par défaut, re-sélectionner Work. (Un TODO de la doc prévoit une capture des onglets `Work` / `Code` dans la barre latérale.)

**Bon premier prompt** : le résultat voulu ; les sources ou outils à considérer ; l'audience ; les contraintes (longueur, ton, format, échéance). Exemples : « Research this topic and create a one-page brief… », « Summarize this PDF and extract owners, deadlines, and action items », « Compare these two documents… », « Create a draft response based on this source material ».

**Conversations rapides** : dans le même espace, en basculant le toggle sur **fast** (`:::note`).

**Sources de contexte que Work mobilise** (sélection automatique depuis le prompt, ou désignation explicite) : Connectors, Libraries, Skills, Files and Canvas, Web search et Open URL. Work peut **demander de connecter/authentifier un outil manquant en cours de tâche** ; les réglages d'organisation peuvent restreindre les outils disponibles.

**Suivi** : panneau **todos** à droite pour les tâches longues ; questions de suivi si ambiguïté ; affichage de la progression, des appels d'outils et des sorties intermédiaires. Points de contrôle : suivre les todos, approuver/refuser les actions sensibles, **bouton stop (carré noir)**, réorienter par message de suivi. Actions déclenchant une approbation : envoi d'e-mail, publication de message, création d'événement, suppression d'issue, modification de données dans un outil externe.

**Revue avant usage** : considérer la sortie comme un brouillon ; lire le résumé final ; relire le contenu dans Canvas ou les fichiers ; vérifier faits, tableaux, dates, noms, responsables, références ; recouper avec la source ; demander une révision si audience/ton/structure/faits incorrects ; n'approuver/partager qu'après relecture.

**Rendre le travail répétable**

| Besoin | Fonctionnalité |
|---|---|
| Préférences stables (ton, format, langue, contraintes récurrentes) | Custom instructions |
| Travail lié à une même équipe/client/initiative | Projects |
| Procédures répétables, consignes spécifiques | Skills |
| Processus prédéfinis (« si votre workspace les supporte ») | Workflows |
| Exécuter un prompt selon un calendrier (one-off, daily, weekly, monthly, yearly) | Scheduled tasks |

### 3.4 Projects

**Rôle** : regrouper des chats en collections distinctes, chacune avec **son ton, ses instructions et ses fichiers partagés**, pour passer d'un engagement client à un plan de lancement sans re-prompter ni re-téléverser.

**Disponibilité** (`:::info`) : **tous les plans** ; des limites peuvent s'appliquer au **nombre de Projects** et au **nombre de chats par Project** (renvoi à la page de tarifs, chiffres non donnés).

**Création** : bouton `New Project` à côté de l'en-tête `Projects` de la barre latérale → nom + **icône** → `Create`. Le Project apparaît dans la barre latérale.

**Réglages d'un Project**

| Réglage | Valeurs / action | Effet |
|---|---|---|
| **Tone** | Un ton au choix, ou `Default (Global)` | `Default (Global)` hérite du ton des Custom instructions du compte. |
| **Instructions** | Bouton `Customize` | Instructions propres au Project (règles de format, consignes métier, contexte persistant) appliquées à **chaque chat** du Project. |
| **Additional context › Files** | Bouton `Upload files` (documents, tableurs, PDF, images) | Fichiers référencables par tous les chats du Project sans re-téléversement. |
| **Additional context › Other chats** | Toggle `Include other projects' chats as context` | Permet à Work de s'appuyer sur les autres chats **de ce Project** pour planifier (voir incohérence de libellé §8). |

**Gestion des chats** : page d'aperçu du Project en vue **liste** ou **grille**.
- Ajouter : glisser-déposer le chat depuis la barre latérale sur le nom du Project ; ou ouvrir le chat → **icône dossier** dans l'en-tête → choisir un Project.
- Déplacer : icône dossier → autre Project (déplacement automatique).
- Retirer : menu trois points de la carte → `Remove from project` ; ou icône dossier → désélectionner le Project. Retirer ne supprime pas : le chat reste dans l'historique principal.
- **Un chat n'appartient qu'à un seul Project à la fois** (`:::note`).

**Suppression** : menu trois points en haut à droite → `Delete` → confirmer. **Définitive** (`:::caution`) ; les chats ne sont pas supprimés, ils retournent dans l'historique principal.

**Portée** : les Projects sont **propres à chaque Workspace** (cf. §3.21).

### 3.5 Libraries

**Rôle** : bases de connaissances **persistantes** construites à partir de documents et de pages web ; attachées à une tâche, elles sont **interrogées en temps réel** et les réponses renvoient aux sources. Différence avec les fichiers téléversés (`:::info`) : un upload vaut pour un seul chat ; une Library persiste entre sessions (« upload once, use everywhere »).

**Cas d'usage** : documentation interne (handbook, politiques IT, RH), specs produit et release notes, études et rapports, connaissance client/projet (une Library par client), onboarding.

**Création** : page `Libraries` (barre latérale) → `New Library` → nom descriptif (visible des destinataires en cas de partage ; ex. `Q1 product specs`, `Engineering onboarding`).

**Alimentation**

| Méthode | Détail | Limites |
|---|---|---|
| Upload de fichiers | Glisser-déposer ou bouton `Upload` | **100 fichiers par envoi**, **100 Mo par fichier** ; indicateur d'état de traitement (secondes à quelques minutes pour quelques Mo, plus pour les gros fichiers complexes) |
| Pages web | Bouton `Webpage` → une ou plusieurs URL → `Index` | **Texte seul** indexé : pas de pages enfants, ni images, ni graphiques ; pour le visuel, télécharger la page et l'importer en fichier (`:::note`) |

**Formats acceptés** (identiques aux uploads de fichiers)

| Catégorie | Formats |
|---|---|
| Documents | PDF, Word (`.docx`, `.doc`), PowerPoint (`.pptx`, `.ppt`), ODT, EPUB, RTF |
| Tableurs | Excel (`.xlsx`, `.xls`), CSV, ODS, Numbers |
| Images | PNG, JPEG, WebP, GIF |
| Texte et balisage | TXT, Markdown, RST, LaTeX |
| Données | JSON, JSONL, XML, YAML |
| Code | Python, JavaScript/TypeScript, Java, Go, Rust, C/C++, Ruby, PHP, SQL, « and more » |
| E-mail | EML, MSG |

**Utilisation dans une tâche**
- Attacher : bouton `+` → `Libraries` → rechercher une Library **ou en créer une** ; **plusieurs Libraries** par chat possibles.
- Interroger en langage naturel (« What does our refund policy say about international orders? »…) ; Work cherche dans tous les documents de la Library.
- Cibler **un seul document** : `+` → `Upload Files` → choisir la Library → choisir le document ; ou nommer le document dans le prompt (`:::tip`).
- **Vérification des sources** : **notes de bas de page numérotées** cliquables menant au passage source ; bouton `Sources` en bas du message listant toutes les références.

**Partage et permissions** (par défaut : **privée**)

| Mode | Parcours | Niveaux |
|---|---|---|
| Personnes ciblées | `Libraries` → sélectionner → `Share` → recherche par nom ou e-mail | **Collaborator** : utiliser, téléverser/supprimer des documents, modifier les réglages · **Viewer** : utiliser dans ses propres chats, sans modifier |
| Toute l'organisation | Même modale, toggle `Entire organization` + choix Collaborator ou Viewer | idem |

Les destinataires peuvent devoir **rafraîchir la page** pour voir une Library nouvellement partagée.

**Gestion** : clic sur un document → panneau droit avec **contenu traité** et **résumé auto-généré** ; `Download` (ou menu trois points) pour l'original ; renommage depuis les réglages (visible de tous, rafraîchissement possiblement nécessaire) ; suppression depuis la page `Libraries` — **définitive pour tout le monde**, documents supprimés des systèmes (`:::caution`).

**Limites et traitement**
- **Aucune limite** au nombre de Libraries.
- 100 fichiers par envoi ; 100 Mo par fichier.
- Chaque document consomme une **capacité de traitement** proportionnelle à sa taille ; **allocation mensuelle** réinitialisée automatiquement, **partagée entre toutes les Libraries** de l'utilisateur.
- Allocation épuisée : **nouveaux uploads en pause** jusqu'à la réinitialisation ; les Libraries existantes restent utilisables (`:::info`).

**Données** : stockage dans l'infrastructure cloud **européenne** ; conservation tant que la Library existe dans un compte actif ; suppression de la Library ou du compte = effacement définitif ; politique d'entraînement **dépendante du plan**, opt-out possible à tout moment.

**Portée** : par défaut **par Workspace** ; l'admin d'organisation peut autoriser le **partage au niveau Org** pour qu'une Library soit visible dans tous les Workspaces (cf. §3.21).

### 3.6 Knowledge Base

**Rôle** : enregistrer ce qui compte dans les conversations pour le rappeler ensuite (préférences, projets, contexte), et permettre de **retrouver un fait** par recherche sans parcourir les anciens chats.

**Statut** (`:::info`) : successeur de Memories ; disponible dans **Vibe Work uniquement** « pour l'instant » ; les Memories existantes **migrent comme un « knowledge topic »** ; les Memories Chat restent disponibles jusqu'à la fin de la migration.

**Mécanismes d'enregistrement**

| Mode | Déclencheur | Remarque |
|---|---|---|
| Explicite | Mots-clés « remember », « save » (« Remember that I work with TypeScript », « Save that my team uses Linear… ») | Mode le plus fiable |
| Implicite | Vibe détecte des détails récurrents utiles (formats préférés, outils) | Automatique |

**Récupération** : à **chaque tour**, Vibe passe en revue la connaissance et choisit les entrées pertinentes ; récupération **non déterministe** (utilisée seulement si elle correspond à la demande). Pastilles inline **`read`** (consultation) et **`write`** (nouvelle entrée). Contenu supporté : markdown et texte. **Aucune API** pour les entrées de connaissance : tout passe par l'interface de chat (`:::info`).

**Activation** : **activée par défaut**. Première configuration : barre latérale `Context` → `Knowledge` → bouton `Get Started` (conversation de test). Ensuite elle tourne en arrière-plan, sans activation par conversation.

**Gestion** (section `Knowledge`)

| Action | Comment |
|---|---|
| Lister | Section `Knowledge` : chaque entrée avec **titre** et **description** |
| Modifier | **Pas d'édition directe du texte** : surligner l'information et demander au modèle de l'affiner (« Make this more specific », « Add that I now use PostgreSQL ») |
| Supprimer un topic | `...` en haut à droite de la page → option de suppression |
| Supprimer une entrée | Le demander dans la conversation (« Forget that I mentioned my location ») |
| Tout supprimer | Bouton d'action en haut à droite de la page Knowledge ou dans `Settings` (`Delete all knowledge`) ; **irréversible** |
| Exporter | Depuis `Settings` (« copie vivante » des données) |
| Activer | Bouton d'action en haut à droite de la page ou `Settings` |

**Désactivation (utilisateur)** : nom de l'organisation en bas à gauche → `Privacy` → section `Personalization` → désactiver `Knowledge` (« Allow Vibe to automatically save and organize key insights from your chats. ») ; ou depuis la page `Knowledge`. Les entrées restent visibles mais **n'influencent plus** les réponses. Désactiver **ne supprime pas** (`:::caution`) : utiliser `Delete all knowledge` avant.

**Principes de confidentialité**
- Données sensibles **désactivées par défaut** ; données « hautement sensibles » jamais enregistrées ; les Memories migrées restent telles quelles.
- Transparence : tout ajout est signalé comme entrée de Knowledge Base.
- **Pas d'inférence** : ne crée pas d'information, simple source de contexte (pas une étape de raisonnement séparée).
- **Pas d'action autonome** : reste soumis aux permissions des Connectors et aux mêmes approbations.
- **Contrôle organisationnel** : console admin `admin.mistral.ai/vibe/preferences` → section `Tools` → désactiver `Knowledge` (« Allow users to save and use personal Knowledge across conversations in Work mode ») ; indisponible alors pour tous les membres.

**Sensitive data in Knowledge** (réglage utilisateur : organisation en bas à gauche → `Privacy` → `Sensitive data in Knowledge`) — visible **uniquement si Knowledge est activé**, ne s'applique qu'aux informations enregistrées **après** activation.

| Enregistré si le réglage est activé | Jamais enregistré |
|---|---|
| Origine raciale ou ethnique | Identifiants publics (sécurité sociale, passeport, identité nationale, numéro fiscal) |
| Opinions politiques | Casier judiciaire |
| Convictions religieuses ou philosophiques | Numéros de comptes financiers, informations bancaires, données de paiement |
| Appartenance syndicale | Mots de passe, secrets, identifiants, tokens |
| Données génétiques et biométriques | Informations sensibles sur **d'autres personnes** |
| Santé et données médicales | |
| Vie sexuelle ou orientation sexuelle | |

Comportement : réglage activé → enregistrement selon les règles habituelles (sur demande, ou information manifestement durable) ; Vibe **signale chaque enregistrement sensible sans répéter la valeur** ; n'infère jamais une donnée sensible non partagée. Réglage désactivé → rien n'est enregistré même sur demande ; à la **première** donnée sensible partagée, Vibe indique qu'elle n'a pas été enregistrée et renvoie au réglage ; la discussion reste libre. Désactiver le réglage **ne supprime pas** les entrées déjà enregistrées.

**Contrôles admin du réglage sensible** : quand un admin le désactive, il reste désactivé pour les membres concernés, qui ne peuvent pas le réactiver et **voient quel admin l'a désactivé**.
- Organisation : `admin.mistral.ai/vibe/privacy` → `Sensitive data in Knowledge`.
- Workspace : réglages du workspace → `Chat Settings` → `Sensitive data in Knowledge`.
- **Le réglage d'organisation prime** sur celui du workspace.

### 3.7 Connectors « featured »

**Rôle** : « ponts sécurisés » pour récupérer, analyser et agir sur les données de services externes au sein d'une tâche ; Work choisit le connecteur, demande l'authentification si absente et l'approbation avant les actions sensibles.

**Catalogue featured** (flux **OAuth direct**, bouton `Connect` sur la carte ; les admins peuvent désactiver un connecteur donné pour toute l'organisation)

| Connector | Capacités annoncées |
|---|---|
| Atlassian | Confluence et Jira : recherche, synthèse, actions projet |
| Box | Recherche, analyse, insights sur les fichiers Box |
| GitHub App | Recherche de dépôts, revue d'issues, gestion de pull requests |
| Gmail | Inclure ses e-mails dans les chats |
| Google Calendar | Inclure son agenda |
| Linear | Recherche, synthèse, gestion d'issues et projets |
| Notion | Recherche, synthèse, rédaction de contenu |
| Outlook | Lire et envoyer des e-mails |
| Outlook Calendar | Rechercher des événements, planifier/supprimer des réunions, accepter/refuser des invitations |
| SharePoint Search API | Rechercher et ouvrir du contenu SharePoint via Microsoft Graph API |
| Slack | Rechercher des messages, lire des canaux, envoyer des messages, gérer des canvases |
| Stripe | Paiements, clients, transactions |

(La page de choix de mode cite aussi **Google Drive** parmi les connecteurs de Work, absent du tableau featured ; cf. §8.)

**Connexion** : page `Connectors` → carte → `Connect` → authentification (généralement **OAuth 2.0** ; le mot de passe n'est jamais transmis à Mistral) → indicateur vert `Connected`. Déconnexion possible à tout moment depuis la même page.

**Utilisation** : usage automatique quand pertinent ; ou activation explicite pour une tâche : `+` (ou `/`) → `Tools` → activer le connecteur. Exemples : réunions de demain, deck Q3 dans Google Drive → résumé d'une page, création d'un événement vendredi 14 h, brouillons de réponses aux e-mails du juridique.

**Approbations** : toute action pour le compte de l'utilisateur (envoi, création d'événement, modification de fichier) exige une approbation (`Continue`, `Always allow`, `Decline`) ; pré-autorisation par fonction possible (cf. §3.20).

**Données** : les connecteurs featured récupèrent les données **en temps réel** pour la requête, **sans stockage** côté Mistral ; la déconnexion révoque l'accès immédiatement. **Entraînement** : données accédées via connecteurs **jamais utilisées pour entraîner ou fine-tuner, quel que soit le plan** ; les conversations qui y font référence suivent la politique de données du plan (contenu utilisateur ordinaire).

**Portée** : les **authentifications de connecteurs sont propres à chaque Workspace**.

### 3.8 MCP Connectors

**Principe** (`:::info`) : brancher Work sur tout service exposant un serveur **Model Context Protocol** (tiers ou interne). Deux voies : **annuaire pré-configuré** ou **serveur personnalisé**. **Les deux exigent un administrateur.** Sur les plans **Free, Pro et Student**, le **propriétaire du compte est administrateur** par défaut (`:::note`).

**Avertissement** (`:::warning`) : les MCP Connectors ne sont pas des produits Mistral ; Mistral ne contrôle pas les serveurs tiers ni leur traitement des données ; ne connecter que des serveurs de confiance.

**Annuaire** (collection **curée** de connecteurs tiers pré-configurés) : `Connectors` → `+ Add Connector` → parcourir/rechercher → ouvrir un connecteur → l'ajouter à l'organisation → authentification si requise. Certains demandent une configuration supplémentaire (URL personnalisée ou clé API) pendant l'installation.

**Connecteur personnalisé** : `Connectors` → `+ Add Connector` → onglet `Custom MCP Connector`.

| Champ | Obligatoire | Contrainte / effet |
|---|---|---|
| `Connector name` | Oui | Identifiant **unique**, **sans espaces ni caractères spéciaux** |
| `Server URL` | Oui | URL complète du serveur MCP |
| `Description` | Non | Courte explication |

Puis `Connect` : la plateforme **détecte automatiquement** la méthode d'authentification ; compléter le flux si demandé.

**Méthodes d'authentification auto-détectées**

| Méthode | Usage |
|---|---|
| No authentication | Serveurs publics ou internes de confiance |
| HTTP Bearer Token / Basic Auth | Identifiants dans l'en-tête `Authorization` |
| OAuth 2.1 avec **dynamic client registration** | Accès délégué standard ; flux de consentement guidé |

**Permissions par fonction** (chaque utilisateur, après l'installation) : `Connectors` → onglet `My Connectors` → carte → onglet `Functions` → toggle `Always allow` par fonction. Deux types : **Read functions** (lister, rechercher, obtenir — risque faible) et **Write functions** (envoyer, créer, modifier — risque élevé). Conseil : pré-autoriser les lectures fréquentes, garder les écritures en approbation manuelle.

**Bonnes pratiques de sécurité** : vérifier chaque serveur (éditeur, documentation, finalité) ; surveiller les changements (les développeurs du serveur peuvent modifier les outils à tout moment) ; se prémunir contre l'**injection de prompt** (protections intégrées à Work, mais relire entrées/sorties) ; n'accorder que le nécessaire. Signaler un serveur malveillant au support.

**Limitations actuelles des MCP personnalisés** (support prévu ultérieurement) :
- *Dynamic tool discovery* (spec MCP 2025-06-18, tools) ;
- *Resources* ;
- *Automatic prompt templates* (prompts).

**Dépannage** — message « MCP connection requires additional information or is invalid » :

| Vérification | Attendu |
|---|---|
| Endpoint | Bon chemin (certains serveurs utilisent `/mcp` ou `/sse`) ; **Streamable HTTP** est le standard actuel |
| Joignabilité | HTTPS avec certificat TLS valide |
| Authentification | Serveur OAuth : renvoie `401` avec en-tête `WWW-Authenticate` ; serveur à clé API : `200` sur requête valide |
| Handshake | Réponse correcte à l'appel JSON-RPC `initialize` |

Outil conseillé : **MCP Inspector**. Vérifications curl documentées : `curl -I <url>/mcp` (joignabilité), `curl -H "Authorization: Bearer …"` (clé API), et le handshake :

```bash
curl -X POST https://your-server.example.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{}}}'
```

Succès = réponse contenant `"result"` avec les capacités du serveur ; erreur ou timeout = problème de configuration côté serveur.

**Contrôle organisationnel** : les admins d'organisation peuvent activer/désactiver les MCP Connectors par workspace (cf. §3.20).

### 3.9 Skills

**Rôle** : instructions et ressources réutilisables donnant à Work des capacités spécialisées (méthode connue, checklist, template, format de sortie, procédure métier) appliquées de façon constante.

**Standard** (`:::info`) : suit le standard ouvert **Agent Skills** (agentskills.io), « développé à l'origine par Anthropic et adopté par plusieurs clients agentiques ». Un Skill = un **dossier** contenant un `SKILL.md` (instructions + métadonnées) et des fichiers annexes (références, templates, exemples, données).

**Progressive disclosure (3 étapes)**

| Étape | Ce qui est chargé |
|---|---|
| 1. Discovery | Au démarrage de session : **nom + description** de chaque Skill (~**100 tokens** chacun) |
| 2. Activation | Si la tâche correspond à la description : le `SKILL.md` complet entre dans le contexte |
| 3. Execution | Work suit les instructions, charge au besoin les fichiers référencés ou exécute des exemples |

Conséquence : beaucoup de Skills peuvent être activés sans saturer le contexte. **La description détermine l'activation** : la rédiger comme un déclencheur (« Use when reviewing customer contracts for renewal risks ») plutôt que comme une fonction (« Helps with contracts »).

**Skills intégrés (built-in)** — visibles avec les Skills personnels et de workspace, activation automatique ou explicite par `/{skill-name}`, désactivables dans `Context` > `Skills` :

| Skill | Se déclenche sur |
|---|---|
| `challenge-my-thinking` | Mettre un plan à l'épreuve, avocat du diable, « qu'est-ce que je rate », revue de risques |
| `data-analysis` | Inspecter, nettoyer, transformer, agréger des données (`.csv`, `.json`, tables, métriques, anomalies) |
| `deep-research` | Recherche approfondie, synthèse sourcée, paysage marché/technique |
| `doc-coauthoring` | Co-rédaction de propositions, specs techniques, docs de décision, RFC |
| `document-review` | Revue de complétude, conformité, cohérence, qualité |
| `internal-comms` | Rapports d'état, updates direction, « 3P updates », FAQ, rapports d'incident |
| `meeting-prep` | Préparer des réunions, brief sur des éléments d'agenda |
| `research-synthesis` | Synthétiser plusieurs sources/notes/fichiers en brief structuré |
| `skill-creator` | Créer, mettre à jour, supprimer des Skills (chargé **avant toute édition** de Skill) |
| `stakeholder-translator` | Reformuler pour une autre audience (exec, ingénierie, direction) |
| `structured-extraction` | Extraire des données structurées (tables, JSON) d'e-mails, PDF, texte libre |
| `vibe-work-onboarding` | Visite guidée des capacités de Vibe Work pour les nouveaux |

Exemple : `/deep-research What are the main approaches to long-context LLMs in 2026?` → Work planifie, lance plusieurs requêtes web, synthétise et renvoie un brief structuré **avec citations**, ouvert dans **Canvas**.

**Sections de `Context` > `Skills`** : built-in, **Personal** (visibles de soi seul), **Workspace** (utilisables par tout le workspace). Toggle on/off par Skill pour contrôler ce qui est chargé.

**Lien Studio** : un Skill créé ou édité **dans Studio** se partage via le bouton `Share` de sa page de détails (privé ou tout le workspace) ; pour le rendre disponible dans Vibe Work, cliquer **`Publish to Vibe`** sur la page de détails du Skill.

**Force-enable** (`:::note`) : les admins de workspace peuvent **forcer l'activation** de Skills pour tout le workspace (ex. Skills métier d'une équipe finance) ; non désactivables individuellement.

**Invocation**
- Automatique quand la tâche correspond à la description.
- **Slash command** : `/` puis choix dans la liste, ou `/{skill-name}` directement.
- **Référence naturelle** : « Use the contract-review Skill on this PDF ».
- Work **affiche dans le chat** le Skill appliqué.

**Création**

| Méthode | Étapes |
|---|---|
| Éditeur | `Context` > `Skills` → `New Skill` → **Title** (ex. `Brand voice copywriting`), **Description** (quand l'utiliser — lue à la découverte), **SKILL.md** (instructions complètes : ton, format, étapes, exemples) → (option) fichiers ou **dossiers** joints → `Create Skill` |
| Depuis une tâche (**recommandé**) | Affiner une approche dans une tâche réelle → demander « turn this into a Skill » / « save this as a Skill » → Work génère un brouillon `SKILL.md`, liste le contenu et le propose en revue → éditer puis sauvegarder |

**Gestion** : éditer titre/description/`SKILL.md`/fichiers ; désactiver sans supprimer ; supprimer un Skill personnel (Skills de workspace : permission requise) ; partager ou garder privé depuis la page de détails. **Versionnement implicite côté chat** : une modification vaut pour les **nouveaux chats** ; les chats actifs gardent l'ancienne version.

**Bonnes pratiques** : partir de tâches réelles ; descriptions en « Use when… » ; un Skill = un job ; éviter les quasi-doublons (confusion + inflation de contexte) ; regrouper les fichiers de support (soumis à une **limite de nombre de fichiers**, valeur non donnée) ; itérer.

**Priorité** : un Skill actif **prime sur les Custom instructions**.

**Portée** : Skills personnels et publiés au workspace sont **propres à chaque Workspace**.

### 3.10 Scheduled tasks (tâches planifiées)

**Statut** : **Public Preview** (`:::note`) — UI, nommage et options susceptibles d'évoluer.

**Principe** : exécuter un prompt automatiquement à une date future ou de façon récurrente ; Work le traite comme une tâche ordinaire et **notifie** quand le résultat est prêt.

**Infrastructure** (`:::info`) : **Work mode uniquement** ; s'appuie **sur l'infrastructure des Workflows** ; accès à toutes les capacités Work (Skills, Connectors inline, Web search, Libraries, Projects). Déclencheurs **uniquement temporels** pour l'instant ; déclencheurs **événementiels** « pourraient suivre ».

**Cas d'usage** : digest du lundi (e-mails + Slack non lus), résumé de release du vendredi (Linear, Notion, Slack), briefing quotidien de 9 h pour la première réunion, veille concurrentielle hebdomadaire, rappel unique (« draft a follow-up next Tuesday »).

**Création**

| Voie | Étapes |
|---|---|
| Page dédiée | Barre latérale `Scheduled` → `New Task` → rédiger le prompt → `Schedule` → fréquence → heure → `Schedule` (confirmer) ou `Cancel`. Une **carte de confirmation** résume le calendrier en langage naturel (ex. « Every Monday at 9:00 »). |
| Depuis un chat | « Schedule this to run every Monday at 9am », « Run this every weekday morning », « Remind me with this prompt next Tuesday at 14:00 » → Work propose un calendrier → confirmation → ajout à la page des tâches. |

Des **suggestions de planification** peuvent apparaître, basées sur les conversations récentes et les outils connectés.

**Fréquences**

| Valeur | Paramètres à choisir |
|---|---|
| `Once` | Une date + une heure |
| `Daily` | Une heure (tous les jours) |
| `Weekly` | Un ou plusieurs jours de la semaine + une heure |
| `Monthly` | Un jour du mois + une heure |
| `Yearly` | Un jour et un mois + une heure |

**Approbations en exécution non surveillée** : une action sensible déclencherait normalement une demande de confirmation ; pour qu'une tâche aboutisse sans présence, **pré-autoriser** les fonctions concernées via `Always allow` du connecteur. Conseil : prompts **lecture seule** (résumer, briefer, surveiller) pour l'automatique ; actions d'écriture réservées aux prompts relus avant pré-autorisation.

**Résultats** : apparaissent dans la barre latérale avec un **point « non lu »** comme toute conversation ; on peut relire, poser des questions de suivi, ouvrir le **chat associé** pour affiner le prompt du prochain run.

**Gestion** (page `Scheduled`) : **Edit** (prompt, fréquence, prochaine date), **Pause** (suspend les runs futurs sans perdre le calendrier ; reprise possible), **Delete** (définitif ; les résultats passés restent dans l'historique).

**Limites** : nombre de tâches planifiées **simultanées** dépendant du **plan** (chiffres sur la page de tarifs) ; à la limite : mettre en pause/supprimer une tâche ou changer de plan.

**Portée** : propres à chaque Workspace.

### 3.11 Workflows

**Principe** : appeler depuis Work une **automatisation interne** construite par l'équipe (pipeline de données, générateur de rapports, flux de ticketing) — sélection dans le menu `+`, prompt naturel, résultat dans le chat ; « pas de CLI, pas d'appel API ».

**Origine Studio** (`:::info`) : les Workflows **ne se construisent pas dans Work** ; ils sont construits dans **Studio** par des développeurs puis **publiés comme « Chat-compatible assistants »** qui apparaissent dans Work. Documentation développeur : *Conversational Workflows*.

**Fonctionnement**
- Les développeurs publient ; l'utilisateur voit les Workflows dans le menu d'outils, attachables à n'importe quel chat.
- Une fois attaché, Work appelle le Workflow **comme un outil** dans son raisonnement ; son nom est affiché.
- Le Workflow gère **ses propres entrées, sa logique et son format de sortie** ; Work route le prompt et rend le résultat.

**Utilisation** : `+` → `Workflows` → choisir dans la liste → le nom apparaît comme **tag dans la zone de saisie** → envoyer : Work appelle le Workflow immédiatement, avec son « thinking chunk ». Après exécution, le tag apparaît **au-dessus du message** dans l'historique (traçabilité étape par étape).

**Affichage pendant un run**

| Élément | Signification |
|---|---|
| Thinking chunk | Work raisonne sur les arguments à passer au Workflow |
| `Workflow started: {workflow-name}` | Invocation confirmée |
| Sortie du Workflow | Rendue dans le chat ; certains Workflows rendent **inline**, d'autres **ouvrent Canvas** |
| `Workflow failed: {workflow-name}` | Échec (accès manquant, entrée invalide, restriction de tier) ; Work reformule l'erreur en langage clair |

Exemple d'échec documenté : `Workflow started: vibe-nuage` → « Your account tier (free) does not have access to this feature » → `Workflow failed: vibe-nuage`.

**Skills vs Workflows**

| | Skills | Workflows |
|---|---|---|
| Nature | Instructions + ressources (`SKILL.md` + fichiers) | Processus **codé** construit dans Studio |
| Créateur | Tout utilisateur, souvent depuis un chat | Développeurs, dans Studio |
| Effet | Dit à Work **comment** aborder une tâche | Exécute une logique **déterministe** et renvoie une sortie **structurée** |
| Idéal pour | Style, procédure, checklist, méthode | Pipelines, automatisations, intégrations aux systèmes internes |
| Déclenchement | Auto-match sur la description, slash command, mention | **Sélection explicite** `+` > `Workflows` uniquement |

**Limites et disponibilité** : doivent être **publiés dans le workspace** par un développeur de l'organisation (sinon menu vide → demander au développeur Studio ou à l'admin) ; certains sont **restreints par tier de compte ou plan d'organisation** ; **jamais déclenchés automatiquement**.

**Pour les développeurs** (pages Studio référencées) : *Conversational Workflows* (API et concepts) ; *Publish in Vibe* — exigence : le workflow doit **retourner un `ChatAssistantWorkflowOutput`** ; *Forms and confirmations*, *Progress tracking*, *Canvas* pour une UX riche dans le chat.

### 3.12 Mini apps

**Principe** : Work génère des **applications React autonomes** (« self-contained ») exécutées directement dans le panneau **Canvas** ; description en langage naturel → code généré → rendu en direct.

Exemples de prompts : convertisseur d'unités (longueur, poids, température), minuteur Pomodoro (start, pause, reset), quiz de 5 questions sur les capitales, générateur de palettes (teinte, saturation).

**Comportement** : l'app apparaît **inline** dans le chat comme panneau de prévisualisation, interactive immédiatement ; bouton `Expand` en bas du panneau → vue Canvas latérale.

**Deux vues** (icônes en haut à gauche) : **Preview** (icône œil, vue par défaut, app en exécution) et **Code** (icône `<>` : liste de fichiers à gauche, clic → éditeur).

**Itération** : par la conversation (« Add a dark mode toggle », « Change the button colors to match our brand », « Add a reset button… ») → Work met à jour le code et re-rend ; ou **édition directe** des fichiers dans la vue code.

**Téléchargement** : icône de téléchargement en haut à droite → **archive ZIP** des sources (`index.js`, `styles.css` et autres fichiers créés), ouvrable dans un éditeur ou déployable sur un **hébergeur statique**.

**Partage public** : `Share` (haut droite) → toggle `Link accessible to anyone` → `Copy link`, ou boutons `Share to` (e-mail, X, LinkedIn, Reddit, WhatsApp). Toute personne disposant du lien peut **voir et utiliser** l'app ; **les messages du chat ne sont pas partagés**. Arrêt : désactiver le toggle.

Disponibilité par plan : non précisée dans la page.

### 3.13 Files et Canvas

**Disponibilité** (`:::info`) : **tous les plans**, sans configuration ; limites d'usage selon le plan.

#### Files (apporter de la matière source)

- **Upload** : glisser-déposer dans la fenêtre de chat, ou `+` → `Upload Files`. Plusieurs fichiers à la fois, **voire un dossier**. Les fichiers restent en contexte **pour tout le chat** (questions de suivi sans re-téléversement). Conseil : noms de fichiers descriptifs.
- **Formats** : mêmes catégories que les Libraries (Documents, Tableurs, Images, Texte/balisage, Données, Code, E-mail) **plus une ligne « Audio »** (sans formats listés ; cf. §8).

| Type d'entrée | Capacités | Alternative « lourde » côté Studio |
|---|---|---|
| Documents texte (PDF, Word, présentations) | Réponses tirées **du contenu téléversé**, pas des connaissances générales : synthèse ciblée, extraction (dates, parties, obligations), constats d'audit, comparaison de slides ; suivi, approfondissement, traduction | — |
| Images | Photos, diagrammes, captures, pages scannées : **extraction de texte** (y compris manuscrit, formulaires, tableaux blancs photographiés), interprétation de diagrammes, analyse de captures d'erreur | **Document AI** de Studio pour l'extraction structurée de PDF scannés, formulaires multipages, manuscrit en volume |
| Audio | Réunion, mémo vocal, appel : Work **transcrit** puis répond depuis la transcription (citer, résumer, traduire, retrouver un détail) | **Speech to Text** de Studio pour la transcription à l'échelle, **labels de locuteurs**, **timestamps**, **vocabulaire personnalisé** |
| Tableurs (CSV, Excel) | Questions, synthèses, extraction directe (ventes région Nord, panier moyen par trimestre, top 10 clients) | Pour statistiques, graphiques, transformations : **Code Interpreter** (plans payants) |

#### Canvas (relire, éditer, itérer)

**Activation** : `+` ou `/` → `Tools` → activer `Canvas`. Ensuite Canvas **s'ouvre automatiquement** quand Work le juge utile ; déclenchement manuel par `/canvas` ou en demandant « open in Canvas ». Exemples : plan de présentation des résultats Q3, CSV affiché en tableau, script Python de parsing de logs JSON.

**Fonctions de Canvas**

| Onglet de la doc | Fonction | Détail |
|---|---|---|
| Editing | Édition directe | Texte, code ou données à la main (typo, renommage de colonne, réécriture) |
| Editing | **Multiple Canvases** | Plusieurs Canvases par chat, chacun en **onglet** |
| Editing | **Version control** | Flèches de navigation entre versions ; vue **change-tracking** ; **restauration** de toute version antérieure |
| AI assistance | **Inline prompts** | Sélectionner un passage → champ `Ask Work` → la modification ne s'applique **qu'à la sélection** |
| AI assistance | **Quick actions** | Icône étincelle : raccourcis contextuels (traduire, optimiser, visualiser) selon le type de contenu |
| AI assistance | **Preview mode** | Icône œil : bascule brut / rendu ; supporte **HTML**, **composants React**, diagrammes **Mermaid**, présentations **Marp** |
| Export and sharing | **Export** | Fichier : deck → **PowerPoint**, tableau → **CSV/Excel** |
| Export and sharing | **Share** | Partage du chat complet, **contenu Canvas inclus** |
| Export and sharing | **Copy** | Contenu brut vers le presse-papiers |

**Cas d'usage listés** : rapports trimestriels, briefs projet, revue de contrats, exploration de données, analyse d'images, présentations Marp, prototypage de code (Python, React), brouillons d'e-mails.

**Exemple chaîné « des données aux slides »** :
1. Uploader un CSV → « Analyze the attached CSV and open it in Canvas. » → tableau éditable (corriger en-têtes, renommer colonnes, supprimer lignes vides). Si mauvais format : « Show this as a table ».
2. « Transform this table into a concise executive summary. » → rédaction éditable.
3. « Create slide-ready bullet points… » → slides en syntaxe **Marp** → prévisualisation (œil) → **export PowerPoint**.

**Conseils** : être spécifique (« pour un compliance officer »), verbes d'action, citer le nom de fichier et la page (« In `AnnualReport_2024.pdf`, page 14… »), itérer, vérifier avant partage.

### 3.14 Spreadsheets (tableurs)

**Disponibilité** (`:::note`) : **plans payants uniquement**, « until further notice ».

**Principe** : Work crée des tableurs **multi-feuilles avec formules** et données formatées, **sans compte Google ni Microsoft** ; résultat dans le panneau **Canvas** (voir, éditer, exporter, partager sans quitter le chat).

Exemples : modèle de projection financière sur 3 ans (compte de résultat, flux de trésorerie, bilan), suivi de projet (tâche, responsable, statut, échéance, priorité), budget mensuel.

**Interface** : une feuille = un **onglet** en bas du panneau ; `Expand` (bas du panneau) → vue Canvas ; `Edit` (haut droite de la vue Canvas) → bascule lecture/édition.

**Édition** : clic sur une cellule (contenu ou **formule**) ; ou demande en chat (« Add a dashboard sheet that summarizes the key metrics », « Update the tax rate to 30% »).

**Sorties**

| Action | Bouton | Détail |
|---|---|---|
| Export Excel | Icône de téléchargement (haut droite) | Fichier `.xlsx` (Excel, Numbers, LibreOffice…) |
| Ouvrir dans Google Sheets | `Open in Google Sheets` (haut droite) | Nouvel onglet Google Sheets ; **modifications non synchronisées** vers Canvas |
| Partage public | `Share` → `Link accessible to anyone` → `Copy link` ou `Share to` (e-mail, X, LinkedIn, Reddit, WhatsApp) | Lecture seule du tableur ; **messages du chat non partagés** ; désactivation par le même toggle |

### 3.15 Code Interpreter (Work)

**Disponibilité** (`:::note`) : **plans payants uniquement** ; usage soumis à des **rate limits** selon le plan.

**Principe** : exécution de code **dans Vibe Work** via une **sandbox native** supportant **Python et TypeScript** ; remplace le Code Interpreter du Chat legacy « avec les mêmes capacités ». L'utilisateur peut décrire en langage naturel ; Work écrit et exécute.

**Environnement** (`:::info`) : isolé, **sans accès Internet**, sans accès au système de l'utilisateur ni aux services externes ; paquets préinstallés : **pandas, numpy, matplotlib** (Python) et « chart libraries » (TypeScript) ; fichiers téléversés disponibles **pour la conversation en cours uniquement**.

**Cas d'usage** : analyse de données (CSV, XLSX, JSON : synthèse, filtres, outliers, valeurs manquantes) ; graphiques (lignes, barres, camemberts…) ; calculs (formules, modèles financiers, conversions) ; transformations de fichiers (conversion, fusion, export téléchargeable).

**Exécution** : ex. « Load this CSV and show the top 5 rows, then plot sales by month. » → tableaux, figures ou fichiers rendus **inline** ; suivi pour affiner ou faire expliquer le code.

**Limite** (`:::info`) : **ne peut pas récupérer de fichiers depuis une URL** ; télécharger puis téléverser, ou activer Web search et demander à Work de récupérer les données avant d'exécuter.

**Fichiers** : upload via `+` ; mêmes formats que Files (sans ligne Audio dans cette page).

**Conseils** : préciser colonnes/filtres/format ; « Explain the steps and show the code » ; itérer (« add a rolling average and label the axes ») ; **prototyper sur un échantillon** si limite atteinte ; ne jamais partager de clés API ou identifiants.

**Recommandation croisée** : pour graphiques et visualisations de données, utiliser Code Interpreter plutôt que la génération d'images (précision sur données réelles).

### 3.16 Génération d'images

**Modèles** (`:::note`) : Work utilise des modèles **Black Forest Labs**.

**Activation** : `+` ou `/` → `Tools` → `Image generation` ; reste active **pour la session** ; combinable avec d'autres outils.

**Limites** (`:::info`) : **limites quotidiennes de génération** selon le plan.

**Création** : langage naturel, pas de syntaxe spéciale ; inclure **sujet**, **style** (illustration, photoréaliste, diagramme, flat design…), **contraintes** (ratio / orientation). Ex. « Create a flat illustration of a modern office interior with natural light and plants. »

**Édition**
- Dans le même chat : décrire les changements dans un message de suivi (Work comprend qu'il s'agit de l'image précédente) — ex. « Add a whiteboard on the back wall. Keep the lighting and color palette unchanged. »
- Dans un nouveau chat : uploader une image (`+` → `Upload Files`) et décrire les modifications → nouvelle version (utile pour reprendre un résultat antérieur ou une image externe).

**Templates de prompts**

| Type | Gabarit |
|---|---|
| Scene | Sujet, style (flat/minimal), composition, ratio |
| Photographic | Sujet, style photoréaliste, type d'éclairage, objectif, ratio |
| Product mockup | Sujet, prise studio, fond, composition, ratio |
| Diagram | Sujet, traits nets, libellés lisibles, couleurs accessibles, ratio |
| Presentation visual | Sujet, composition adaptée aux slides, couleurs de marque, texte minimal, ratio |
| Marketing material | Sujet, ton du public cible, style, charte, ratio |

**Cas d'usage** : visuels de decks, assets marketing, mockups produit, communication interne, exploration de concepts, diagrammes conceptuels, visuels provisoires.

**Bonnes pratiques** : spécificité, itération, finitions dans un logiciel dédié (recadrage précis, colorimétrie, overlays de marque), bouton de **téléchargement** sur chaque image.

**Limitations** : prompts ou images au contenu protégé par le droit d'auteur ou inapproprié **potentiellement bloqués par des filtres de sécurité** ; détails fins (petit texte, motifs complexes) parfois perdus ou altérés à l'édition.

### 3.17 Web search et Open URL

**Raison d'être** (`:::info`) : dépasser la **date de coupure des connaissances** du modèle avec des sources vérifiables et à jour. Pour la recherche multi-sources avec rapport cité et **export PDF**, renvoi à Deep Research, « désormais disponible comme Skill dans Work » (`:::note`).

**Web search**
- Activation : `+` ou `/` → `Tools` → `Web search`.
- Work cherche quand la question exige de l'information récente et intègre les résultats.
- Lecture des résultats : **icône globe** à côté de la réponse ; **liens inline** vers les sources ; bouton `Sources` en bas ouvrant un panneau listant toutes les références.
- **News search** : pour l'actualité, partenaires **Agence France-Presse (AFP)** et **Associated Press (AP)** ; une **icône news** s'ajoute à l'icône globe ; liens directs vers les dépêches.

**Open URL**
1. **Prérequis : Web Search activé** (`+`/`/` → `Tools` → `Web Search`) — sans lui, Work ne peut pas naviguer.
2. Coller l'URL dans le message avec la question.
3. Envoyer : Work récupère la page. Confirmation : **icône lien** et mention `Opened Page`.

Fonctionne aussi avec des **fichiers en ligne** (PDF, documents). **Plusieurs URL** dans un même chat sont conservées en contexte (comparaison possible, ex. deux pages produit concurrentes).

**Quel outil choisir**

| Besoin | Outil |
|---|---|
| Réponse rapide, à jour, sourcée | Web search |
| Analyser une page précise dont on a le lien | Open URL |
| Rapport structuré cité multi-sources | Skill Deep Research |
| Documents internes de confiance | Libraries |
| Données vivantes d'un outil connecté | Connectors |

**Limitations** : Open URL ne lit **que la page indiquée** (pas de crawl ni de suivi de liens) ; pages derrière **login ou paywall** inaccessibles (télécharger et uploader) ; sites très interactifs parfois incomplets ; résultats web potentiellement obsolètes ou incomplets selon ce que la page expose.

### 3.18 Voice mode

**Principe** : démarrer une tâche à la voix ; la parole est **transcrite en texte** relisible, éditable et envoyable. Disponible sur le **web** et les apps **iOS/Android**, **pour tous les plans**.

**Modèle** (`:::info`) : « powered by , a speech-to-text model we developed » — **le nom du modèle est vide dans la copie** (vraisemblablement une variable non rendue ; probablement Voxtral, par inférence).

**Utilisation** : icône **micro** en bas à droite → autoriser le micro → parler.

| `Autosend` | Comportement |
|---|---|
| ON | Transcription envoyée automatiquement à Work |
| OFF | Transcription déposée dans la zone de saisie : relire, corriger, joindre du contexte (Connectors, Libraries, Skills, fichiers), puis `Send` |

Annuler un enregistrement : icône d'annulation avant envoi. Si l'accès micro a été refusé : le réactiver dans les réglages du site / de l'app.

**Section « Talk with Work in conversation mode »** : titre présent, **contenu vide** dans la copie (fonction non documentée).

**Langues supportées (13)** : anglais, français, espagnol, allemand, russe, chinois, japonais, italien, portugais, néerlandais, arabe, hindi, coréen.

**Confidentialité**

| Plans | Usage des messages vocaux pour l'entraînement |
|---|---|
| Free, Pro, Student | Soumis aux politiques d'entraînement ; **opt-out** possible à tout moment |
| Team, Enterprise | **Non utilisés par défaut** ; opt-in explicite de l'organisation nécessaire |

**Dépannage** : parler clairement, réduire le bruit, vérifier les permissions, relire la transcription (noms exacts, liens, chemins, nombres).

### 3.19 Custom instructions

**Principe** : préférences **persistantes** (rôle, domaine, style de sortie) appliquées à **chaque tâche** ; pour les équipes, standardisation des conventions, de la terminologie et du formatage.

**Configuration** : barre latérale `Context` → `Instructions` → pop-up « Custom instructions » → choisir un **Tone** + saisir les instructions → sauvegarder. Effet sur **les nouvelles tâches uniquement** (les tâches existantes ne sont pas affectées).

**Place dans le contexte** (`:::info`) : incluses dans le contexte de planification et d'exécution, aux côtés du prompt, des fichiers, Connectors, Libraries et Skills.

**Priorités**

| Interaction | Règle |
|---|---|
| Skills | Un Skill actif **prime** sur les Custom instructions |
| Projects | Les deux s'appliquent **ensemble** ; le ton du Project peut être `Default (Global)` (hérité du compte) |
| Tools | N'affectent pas l'exécution des outils (un connecteur interroge les mêmes données) |
| Agents (legacy) | Un Agent actif **prime** sur les Custom instructions |

**Exemples** : rôle/domaine (compliance officer bancaire européen → MiFID II, RGPD ; ingénieur Python/TypeScript ; « assume PostgreSQL ») ; format (sections Problem/Analysis/Solution/Next Steps, deux décimales + symbole monétaire, puces) ; langue et ton (« Always respond in French… », anglais britannique, formel/informel) ; contraintes (pas de disclaimers hors médical/juridique/financier ; gestion d'erreurs et annotations de types dans le code).

**À éviter** : s'en servir comme brief de projet (utiliser le prompt ou les Projects) ; contredire ses prompts ; textes longs (quelques phrases ciblées) ; **secrets ou identifiants** (persistants, appliqués partout).

**Portée** : propres à chaque Workspace.

### 3.20 Sécurité et approbations

**Philosophie** : « délégation avec supervision » — rien d'important ne se produit dans un outil connecté sans validation.

**Actions soumises à approbation** : tout ce qui **crée, modifie, envoie, publie ou supprime** dans un système externe — envoi d'e-mail (Gmail, Outlook), message ou canvas Slack, création/mise à jour/suppression d'issue (Linear, GitHub), création d'événement ou acceptation d'invitation, modification d'une page Notion ou d'un fichier SharePoint.

**Options de la boîte d'approbation**

| Option | Comportement |
|---|---|
| `Continue` | Approuve **cette action seulement** ; Work redemandera la prochaine fois |
| `Always allow` | Pré-autorise **cette fonction pour la session** |
| `Decline` | Annule ; Work saute l'étape ou demande comment procéder |

**Mise en garde** (`:::caution`) : lire ce que Work va faire (destinataires, objet, contenu, destination) ; le bouton **stop** peut tenter d'interrompre une action en cours **sans garantie** : si l'action a atteint le système externe, la considérer comme faite.

**Permissions par fonction de connecteur**
- Accès : `Connectors` → `My Connectors` → carte → onglet `Functions` : toutes les fonctions **groupées par type**, avec description et toggle `Always allow` ; bouton `Refresh tools` pour recharger la liste (après une mise à jour du connecteur).
- Groupes : **Interactive tools** (créer, mettre à jour, supprimer, envoyer, publier — approbation manuelle recommandée) et **Read-only tools** (get, list, search — généralement sûrs à pré-autoriser).
- Exemple Linear (« des dizaines » de fonctions) : Interactive = `Save Issue`, `Save Comment`, `Delete Customer`, `Save Project`, `Create Attachment`, `Save Status Update`… ; Read-only = `Get Issue`, `List Comments`, `List Projects`, `Get Diff`, `List Users`, `Search Documentation`…
- Conseils : pré-autoriser les lectures fréquentes (`List Issues`, `Get Issue`, `List Projects`) ; garder en manuel les suppressions (`Delete Attachment`, `Delete Comment`) et les écritures larges (`Save Issue` sans périmètre) ; réviser périodiquement.
- **Permissions par utilisateur** (`:::note`) : les choix `Always allow` n'affectent pas les coéquipiers.

**Questions de clarification** : pour les tâches non triviales, Work pose des questions avant d'agir (quel Project, une page ou un rapport complet, quel connecteur Notion ou Google Drive) ; on choisit une **réponse proposée** dans le chat ; réorientation possible en réécrivant le prompt.

**Panneau todos** : checklist vivante à droite pour les tâches longues ; **pas de plan à approuver en amont** — Work démarre immédiatement ; contrôle par suivi, **stop** (carré noir) puis message de redirection, ou demande de correction de cap (prise en compte aux étapes suivantes). Les tâches courtes (résumé, traduction, recherche unique) n'ont pas de panneau todos.

**Résumé de raisonnement en temps réel** : pour chaque étape, ce que Work lit, compare, décide, écarte ; objectifs : confiance, correction précoce, apprentissage (et matière à Skill). Encadré : pour le raisonnement pur sans outil, renvoi au **Think mode du Chat** (legacy ; cf. §8).

**Transparence des appels d'outils** : chaque appel (web search, lecture de fichier, fonction de connecteur, génération d'image) est affiché avec **l'outil** (ex. `Linear: Get Issue`, `Web Search`, `Gmail: List Messages`), **les entrées**, **les sorties**, **le statut** (`pending`, `succeeded`, `failed`) ; dépliable pour vérifier le bon connecteur (Notion vs Confluence, Gmail vs Outlook), le bon Project/dépôt/espace, la cohérence des données.

**Périmètre organisationnel**

| Rôle | Pouvoirs |
|---|---|
| **Workspace admins** | Désactiver des Connectors pour tout le workspace ; **forcer l'activation** de Skills |
| **Organization admins** | Activer/désactiver des fonctionnalités entières **par workspace** (Skills, Connectors spécifiques, MCP Connectors) |

**Checklist avant partage** : Work a-t-il suivi ses todos ? Les outils/connecteurs sont-ils ceux attendus ? Faits, noms, dates, chiffres, citations exacts ? Lu intégralement si destiné à un client, collègue ou tiers ?

### 3.21 Changer d'organisation / de workspace

**Modèle** : un compte Mistral appartient à une ou plusieurs **Organizations**, chacune contenant un ou plusieurs **Workspaces**. Un Workspace est une **frontière d'isolation** (départements, projets, environnements), **pas un conteneur de gestion d'équipe**.

**Entité partagée** (`:::info`) : les Workspaces sont **les mêmes entités dans Vibe, Studio et l'Admin Panel** ; dans Vibe Work, changer de Workspace change le périmètre de travail.

**Changer** : cliquer sur le **nom de l'organisation** en bas à gauche (à côté des initiales) → popover : Workspace courant (**`Default Workspace`** si un seul), autres Workspaces de l'organisation, autres Organizations. Choisir un Workspace = bascule directe ; choisir une Organization = arrivée sur **son workspace par défaut**. Si l'accès se limite à un Workspace, **le sélecteur est masqué**.

**Avertissement** (`:::warning`) : changer de Workspace **bascule tous les onglets ouverts** (**une seule session par utilisateur**) ; utiliser des **profils de navigateur** distincts pour travailler dans deux Workspaces simultanément.

**Ressources cloisonnées par Workspace** (non partagées, à recréer ailleurs) : historique des chats, Projects, Skills (personnels et publiés au workspace), Scheduled tasks, Custom instructions, **authentifications de connecteurs**. **Libraries** : par Workspace **par défaut**, mais l'admin d'organisation peut autoriser le **partage au niveau Org** (visibles dans tous les Workspaces).

**Réglages par Workspace (admins d'organisation)** : outils et connecteurs Vibe Work disponibles ; accès utilisateurs et rôles ; **métriques d'usage par Workspace**. Différences de comportement entre Workspaces généralement dues à ces réglages.

**Feuille de route** (`:::tip`) : partage plus granulaire de ressources individuelles avec des utilisateurs ou groupes, sans changer de Workspace.

### 3.22 Chat legacy — Agents

**Statut** (`:::warning`) : fonctionnalité **legacy** ; l'onglet Chat est retiré progressivement (Enterprise : fenêtre de 6 mois). Remplacement : **Skills**.

**Principe** : assistant **spécialisé** configuré une fois et réutilisé (instructions, outils, sources de connaissance). Signal d'usage : répéter les mêmes prompts, fichiers ou outils à chaque conversation.

**Cas d'usage** : éditeur de ton de marque ; vérificateur de clauses juridiques adossé à une Library de politique interne ; assistant de préparation de réunion ; FAQ technique sur Library de documentation, partagée à l'équipe ; traduction respectant un glossaire (Library).

**Création** (accessible à tous) : onglet **Chat** → `Agents` (barre latérale) → `Create Agent` (de zéro) ou **template pré-construit** (résumeurs, traducteurs, assistants de code) → configurer → tester dans le **panneau de prévisualisation** à droite. **Sauvegarde automatique**, pas de bouton Save.

**Configuration**

| Groupe | Champ | Obligatoire | Effet |
|---|---|---|---|
| Main settings | **Name** | Oui | Nom clair (ex. `Customer Support Triage`, `Sales Brief Generator`) |
| Main settings | **Description** | Non | Visible dans le sélecteur d'agents |
| Main settings | **Avatar** | Non | Presets ou génération d'un avatar personnalisé |
| Main settings | **Instructions** | Oui (implicite) | Rôle, périmètre, format de sortie ; taper `/` pour **référencer inline** outils et sources |
| Guardrails and tone | **Guardrails** | Non | Limites (« Always use metric units », « Don't share pricing information outside the approved rate card ») |
| Guardrails and tone | **Tone** (à déplier) | Non | Style de communication |
| Tools | Web search, **Code Interpreter** (Python), **Canvas**, **Image generation** | Non | Outils pré-configurés |
| Knowledge | **Libraries** (une ou plusieurs), **Connectors** (Google Drive, GitHub, Notion…) | Non | Sources de connaissance |

**Utilisation** : onglet Chat → `+` → `Agents` ou `/` dans la zone de saisie (TODO de la doc : « c'est encore `@` dans l'ancienne UI ») → choisir l'agent (son nom s'affiche en haut de la zone de saisie) → envoyer. **Un seul agent actif à la fois** par conversation (`:::info`). Changer : flèche à côté du nom. Revenir au modèle par défaut : **croix** à côté du nom, ou nouveau chat (toujours avec le modèle par défaut).

**Rédiger de bonnes instructions** : définir le rôle ; préciser le format (avec exemple) ; poser des limites explicites ; référencer les outils inline via `/` ; itérer par petits pas avec la prévisualisation. Renvoi au guide de prompt engineering (`/inference/prompting`).

**Partage** (défaut : **privé**) : carte de l'agent → libellé d'état (`Private`, `Organization`, `x people`) → recherche d'**utilisateurs ou de groupes** → **Collaborator** (utiliser, éditer, **supprimer**) ou **Viewer** (utiliser, sans éditer/supprimer). Toggle `Entire organization` pour tout le monde. Sauvegarde automatique. **Aucune notification** n'est envoyée aux destinataires.

**Gestion** : menu `⠇` → `Duplicate my Agent` (copie indépendante dont on devient propriétaire) — **contournement pour transférer un agent** : le partager en Collaborator, le collègue le duplique, puis supprimer l'original. Suppression : `⠇` → `Delete` → confirmer ; **définitive**, l'agent devient indisponible pour tous.

**Plans** (`:::note`) : agents disponibles sur **tous les plans** ; en cas de changement/résiliation d'abonnement, agents et partages **préservés**, mais certains outils ou sources peuvent devenir indisponibles sur les plans inférieurs.

**Agents et API** : les agents créés dans Chat sont **non utilisables par programmation**. Pour l'API : créer les agents dans Studio (`console.mistral.ai/build/agents`, chemin « Agents ») ou via l'API REST (`beta.agents`). **Les Studio Agents peuvent être déployés dans Chat** et apparaissent dans une **section dédiée** de la liste d'agents.

**Priorité** : un agent actif **prime** sur les Custom instructions.

### 3.23 Chat legacy — Code Interpreter

**Statut** (`:::warning`) : legacy ; remplacé par le Code Interpreter natif de Work (**utilisateurs payants**, mêmes capacités).

- Annonce : exécuter **Python et TypeScript** dans Vibe (mais le reste de la page ne parle que de Python/Matplotlib ; cf. §8).
- Environnement : isolé, sans Internet, sans accès système/services externes ; **pandas, numpy, matplotlib** préinstallés ; fichiers limités à la conversation courante.
- Cas d'usage : analyse de données, graphiques (« any Matplotlib visualization »), calculs, transformations de fichiers.
- **Activation obligatoire** : onglet Chat → `+` ou `/` → `Tools` → `Code Interpreter`. L'outil reste actif **pour la conversation et les chats suivants** (persistance de l'activation).
- **Rate limits** selon le plan.
- Pas de récupération par URL (même contournement via Web search).
- Mêmes formats de fichiers et mêmes conseils que la version Work.

### 3.24 Chat legacy — Deep Research

**Statut** (`:::warning`) : legacy ; équivalent = **Skill Deep Research** dans Work, qui **fonctionne avec Connectors et Canvas**.

**Principe** : recherche web **multi-étapes automatisée** (décomposer, chercher plusieurs sources, évaluer, rapport structuré cité) — « des heures réduites à des minutes ». Usages : paysage concurrentiel, revues réglementaires, tendances sectorielles.

**Trois étapes** : 1) **plan de recherche** ; 2) navigation web multi-sources ; 3) synthèse en **rapport** structuré et cité. Si la requête est trop large, Vibe demande **plus de contexte** avant de démarrer.

**Lancement** : onglet Chat → option `Research` sous la zone de saisie (`Fast` par défaut) → question → envoi. (`:::note`) En mode Research, **Libraries, Connectors et Agents sont temporairement désactivés** ; ils reviennent au retour en chat standard.

**Plan modifiable** avant exécution : `Edit` (ajouter, supprimer, réordonner des étapes), réponse en langage naturel, puis `Start research`.

**Suivi** : exécution en **tâche de fond** ; **widget de progression** (mises à jour, résumés de recherche, raisonnement) ; on peut ouvrir d'autres conversations et revenir ; arrêt : `Cancel` dans le widget + confirmation.

**Résultat** : **Summary** (en tête), **Full report** (analyse, données, citations inline), **Sources** (liste complète). Export `Save as PDF` ; partage via le partage standard de conversation.

**Conseils** : requête spécifique (région, période, secteur, angle), éditer le plan, briefs détaillés.

### 3.25 Chat legacy — Memories

**Statut** (`:::warning`) : legacy ; équivalent = **Knowledge Base** (« stocke une gamme plus large d'informations »).

**Principe** : se souvenir des préférences, intérêts et contexte de travail à partir des interactions passées.

**Enregistrement** : **explicite** (« Remember that I prefer concise answers ») ou **automatique** (détails récurrents). Rappel automatique quand pertinent. (`:::info`) Ne stocke que ce qui a été **explicitement inclus** dans les prompts, n'infère rien ; conçu pour **ne pas mémoriser** des données sensibles comme numéros de sécurité sociale ou informations bancaires.

**Activation** : onglet Chat → bouton `Enable Memories` dans la pop-up de **première connexion** ; ou onglet `Memories` sous le menu `Intelligence` (gauche) → `...` → toggle `Memories in Vibe`. Message de confirmation.

**Gestion** (onglet `Memories`, du plus récent au plus ancien)

| Action | Comment |
|---|---|
| Voir | Onglet `Memories` |
| Modifier | **Icône crayon** → popup → confirmer (édition directe possible, contrairement à Knowledge Base) |
| Supprimer une | **Icône corbeille** → confirmer |
| Tout supprimer | `...` en haut à droite → `Clear all Memories` → confirmer (**irréversible**) |
| Oublier en conversation | « Forget that I mentioned my location » |

**Désactivation** : toggle dans l'onglet `Memories` ; **ne supprime pas** les souvenirs (utiliser `Clear all Memories` avant).

**Confidentialité** : privées au compte, jamais partagées ni vendues ; conservées **pendant la durée de l'abonnement** ; Free/Pro/Student : prompts incluant des Memories **potentiellement utilisés pour l'entraînement** (opt-out dans les réglages) ; Team/Enterprise : **opt-out par défaut** ; pas d'usage publicitaire ni de revente.

### 3.26 Chat legacy — Think mode

**Statut** (`:::warning`) : legacy ; équivalent = **toggle fast/think** de l'expérience unifiée.

**Principe** : raisonnement sur problèmes complexes, propulsé par les modèles **Magistral** ; décompose la question, traite chaque étape, donne la réponse **avec le chemin de raisonnement complet** (chain-of-thought ; référence à l'article arXiv 2201.11903).

**Utilisation** : onglet Chat → sélectionner `Think` à droite de la fenêtre de chat (`Fast` par défaut) → envoyer → raisonnement affiché **en temps réel** → réponse finale. Le mode reste actif jusqu'à changement ; **basculable à tout moment** dans un chat existant.

**Quand l'utiliser** : planification/stratégie, débogage de production, décisions multicritères, maths/quantitatif, revue de code complexe. Pas utile pour les recherches factuelles simples ou la génération rapide (le chat standard est « plus rapide et aussi précis »).

**Conseils** : prompt précis ; réutiliser le raisonnement comme documentation (copier dans Canvas, partager la conversation) ; **combinable** avec web search, uploads et Libraries.

### 3.27 Passerelles Vibe ↔ Studio ↔ Admin (synthèse)

| Objet | Côté Studio / API | Côté Vibe | Source |
|---|---|---|---|
| **Workflows** | Construits par des développeurs dans Studio ; publiés comme « Chat-compatible assistants » ; doivent retourner un `ChatAssistantWorkflowOutput` ; UX enrichie (forms & confirmations, progress tracking, canvas) | Menu `+` > `Workflows`, invocation explicite ; affichage started/failed ; rendu inline ou Canvas ; peuvent être restreints par tier/plan | Doc Workflows (Vibe) |
| Workflows (API) | Champs `available_in_chat_assistant` (Workflow, défaut `false`) et `compatible_with_chat_assistant` (WorkflowRegistration, défaut `false`) ; filtre `available_in_chat_assistant` sur `GET /v1/workflows` et `GET /v1/workflows/registrations` | — | spec OpenAPI |
| **Scheduled tasks** | Reposent sur « l'infrastructure des Workflows » | Page `Scheduled` | Doc Scheduled tasks |
| **Skills** | Création/édition possibles dans Studio ; `Share` (privé / workspace) ; bouton `Publish to Vibe` ; API `beta.skills` sous `/v2/skills` (versions, aliases, `sharingScope` = `private`/`workspace`, `workspaceRelation` = `reader`/`writer`) | `Context` > `Skills` (Personal / Workspace / built-in) | Doc Skills + spec OpenAPI |
| **Agents** | Studio Agents (`console.mistral.ai/build/agents`, API `beta.agents`) **déployables dans Chat** ; champ booléen `deployment_chat` sur l'objet `Agent` (requis en lecture), modifiable via `UpdateAgentRequest`, filtre `deployment_chat` sur `GET /v1/agents` et `GET /v1/agents/pages` | Section dédiée de la liste d'agents du Chat legacy ; agents Chat **non accessibles par API** | Doc Agents legacy + spec OpenAPI |
| **Libraries** | (Les Libraries existent aussi côté Studio — inférence : même objet ? non confirmé par les pages lues) | Page `Libraries`, `+` > `Libraries` ; partage Collaborator/Viewer ; Org-level sharing autorisable par l'admin | Doc Libraries + §8 |
| **Workspaces** | Même entité dans Vibe, Studio et Admin Panel | Sélecteur en bas à gauche ; ressources cloisonnées | Doc Switch workspace |
| **Document AI / Speech to Text** | Produits Studio pour l'extraction documentaire lourde et la transcription à l'échelle (labels de locuteurs, timestamps, vocabulaire) | Files : analyse d'images et d'audio « légère » | Doc Files and Canvas |
| **Admin** | `admin.mistral.ai/vibe/preferences` (section `Tools` : toggle `Knowledge`), `admin.mistral.ai/vibe/privacy` (`Sensitive data in Knowledge`), réglages workspace `Chat Settings` ; date de migration Chat → unifié (Enterprise) ; désactivation de connecteurs, force-enable de Skills, activation de fonctionnalités par workspace | — | Docs Knowledge, Safety, Vibe |
| **Analytics admin** | `GET /v1/admin/analytics/vibe/work/usage/by_user_stats`, `…/by_agent_stats`, `…/by_time_stats` (tag `beta.admin.vibe-work-analytics`) | Mesure de l'usage de Vibe Work | spec OpenAPI |
| **Facturation** | `UsageType` inclut `vibe`, `vibe_connectors`, `vibe_ocr`, `vibe_audio_seconds`, `vibe_audio_characters` (et `workflow_executions`, `connectors`, `libraries_*`…) | — | spec OpenAPI |

---

## 4. Interface utilisateur

### 4.1 URLs et routes

| URL / route | Rôle |
|---|---|
| `https://chat.mistral.ai` | Point d'entrée de Vibe (inchangé après la fusion Chat/Work) |
| `https://chat.mistral.ai/work` | Ouverture directe de Work (AppLink « Work ») |
| `admin.mistral.ai/vibe/preferences` | Console admin Vibe, section `Tools` (toggle org `Knowledge`) |
| `admin.mistral.ai/vibe/privacy` | Console admin Vibe, toggle org `Sensitive data in Knowledge` |
| `https://console.mistral.ai/build/agents` | Studio › Agents (création d'agents utilisables par API, déployables dans Chat) |
| App Store `apps.apple.com/us/app/le-chat-by-mistral-ai/id6740410176` · Google Play `ai.mistral.chat` | Apps mobiles Vibe |

### 4.2 Carte de la barre latérale (expérience unifiée)

| Élément | Contenu / sous-éléments |
|---|---|
| Sélecteur de mode | `Work` / `Code` (le dernier choisi est mémorisé) |
| `Projects` | Bouton `New Project` à côté de l'en-tête ; liste des Projects (cible du glisser-déposer de chats) |
| `Libraries` | Page des Libraries (`New Library`, `Share`…) |
| `Connectors` | Cartes featured (`Connect` / `Connected`), `+ Add Connector`, onglet `My Connectors` |
| `Scheduled` | Page des tâches planifiées (`New Task`) |
| `Context` | `Knowledge` · `Skills` · `Instructions` |
| Historique | Conversations, avec **point non lu** pour les résultats de tâches planifiées |
| Bas gauche : nom de l'organisation + initiales | Sélecteur Organization/Workspace ; accès `Privacy` (section `Personalization`) et `Settings` |
| (Legacy) onglet `Chat` | `Agents` ; menu `Intelligence` › `Memories` |

Raccourci : `Cmd+Shift+B` (macOS) / `Ctrl+Shift+B` (Windows, Linux) pour ouvrir/fermer la barre latérale.

### 4.3 Zone de saisie et menus

| Contrôle | Contenu |
|---|---|
| Bouton `+` | `Upload Files` (y compris choix d'un document d'une Library) · `Libraries` · `Tools` · `Workflows` · (legacy) `Agents` |
| `/` (slash) | Même accès aux `Tools` ; liste des Skills ; `/{skill-name}` ; `/canvas` ; (legacy) sélection d'agent |
| `Tools` | Connecteurs individuels · `Canvas` · `Image generation` · `Web search` · (legacy) `Code Interpreter` |
| Toggle **fast/think** | Profondeur de la réponse (expérience unifiée) |
| (Legacy) sélecteur de mode | `Fast` (défaut) · `Think` (à droite) · `Research` (sous la zone de saisie) |
| Icône micro (bas droite) | Voice mode ; réglage `Autosend` ; icône d'annulation |
| Tag Workflow | Nom du Workflow attaché, affiché dans la zone de saisie puis au-dessus du message envoyé |
| Bouton **stop** (carré noir) | Interrompre une tâche |
| Icône dossier (en-tête de chat) | Assigner/déplacer/retirer le chat d'un Project |

### 4.4 Éléments affichés pendant et après une tâche

| Élément | Signification |
|---|---|
| Panneau **todos** (droite) | Étapes cochées en direct (tâches longues seulement) |
| **Reasoning summary** | Raisonnement par étape |
| Carte d'appel d'outil | Nom (`Linear: Get Issue`, `Web Search`, `Gmail: List Messages`…), entrées, sorties, statut `pending`/`succeeded`/`failed`, dépliable |
| Boîte d'approbation | `Continue` · `Always allow` · `Decline` |
| Question de clarification | Réponses proposées cliquables |
| Pastilles `read` / `write` | Consultation / écriture de Knowledge Base |
| Icône globe / icône news | Données web / dépêches AFP-AP utilisées |
| Icône lien + `Opened Page` | Open URL a lu la page |
| Notes numérotées + bouton `Sources` | Citations (web, Libraries) |
| `Workflow started: …` / `Workflow failed: …` | Cycle de vie d'un Workflow |
| Mention du Skill actif | Skill appliqué à la tâche |
| Bouton de téléchargement d'image | Sauvegarde locale des images générées |

### 4.5 Canvas (texte, données, code, mini apps, tableurs)

Onglets de Canvases multiples ; flèches de versions ; vue change-tracking ; restauration ; champ `Ask Work` sur sélection ; icône étincelle (quick actions) ; icône œil (Preview) / `<>` (Code, liste de fichiers à gauche) ; icône de téléchargement (ZIP pour mini apps, `.xlsx` pour tableurs) ; `Share` → `Link accessible to anyone` → `Copy link` / `Share to` (e-mail, X, LinkedIn, Reddit, WhatsApp) ; `Open in Google Sheets` ; `Expand` (bas du panneau inline) ; `Edit` (bascule lecture/édition du tableur) ; onglets de feuilles en bas.

### 4.6 Écrans de gestion et parcours

| Écran | Champs / boutons |
|---|---|
| Project | Tone (`Default (Global)`…), `Customize` (instructions), `Upload files`, toggle `Include other projects' chats as context`, vue liste/grille, menu `...` › `Remove from project`, menu haut droite › `Delete` |
| Library | `New Library`, `Upload`, `Webpage` › `Index`, liste de documents (panneau : contenu traité, résumé auto, `Download`), `Share` (recherche nom/e-mail, Collaborator/Viewer, `Entire organization`), réglages (renommage), suppression |
| Knowledge | `Get Started`, liste d'entrées (titre, description), `...` (suppression de topic), bouton d'action haut droite (activer / tout supprimer) |
| Skills | Sections built-in / Personal / Workspace, toggles, `New Skill` (Title, Description, SKILL.md, fichiers/dossiers) › `Create Skill` ; page de détails (Studio) : `Share`, `Publish to Vibe` |
| Connectors | Cartes, `Connect`, indicateur `Connected`, `+ Add Connector` (annuaire + onglet `Custom MCP Connector` : `Connector name`, `Server URL`, `Description`, `Connect`), `My Connectors` › carte › onglet `Functions` (toggles `Always allow`, `Refresh tools`) |
| Scheduled | `New Task`, prompt, `Schedule` (fréquence `Once`/`Daily`/`Weekly`/`Monthly`/`Yearly` + heure), `Cancel`, carte de confirmation, Edit/Pause/Delete |
| Instructions | Pop-up « Custom instructions » : Tone + texte |
| Privacy (via nom d'org) | Section `Personalization` : `Knowledge` ; `Sensitive data in Knowledge` (si Knowledge actif) |
| Settings | Export des données, suppression de toute la Knowledge |
| Workspace switcher | Workspace courant (`Default Workspace`), autres Workspaces, autres Organizations |
| (Legacy) Agents | `Create Agent` / templates, formulaire (Name, Description, Avatar, Instructions, Guardrails, Tone, Tools, Knowledge), panneau de preview, libellé de partage (`Private` / `Organization` / `x people`), menu `⠇` (`Duplicate my Agent`, `Delete`) |
| (Legacy) Deep Research | Option `Research`, plan (`Edit`, `Start research`), widget de progression (`Cancel`), rapport (Summary, Full report, Sources), `Save as PDF` |
| (Legacy) Memories | Pop-up `Enable Memories`, `Intelligence` › `Memories`, `...` › toggle `Memories in Vibe`, crayon, corbeille, `Clear all Memories` |

---

## 5. API et SDK

**Constat général** : les pages lues décrivent Vibe Work comme une surface **exclusivement interactive**. Explicitement : pas d'API pour les entrées de Knowledge Base ; agents créés dans Chat non utilisables par API ; Workflows appelés « sans CLI ni appel API » côté utilisateur. Les points d'accroche programmatiques sont **côté Studio** (vérifiés dans la spec OpenAPI locale, hors pages assignées) :

| Méthode | Chemin | Rôle (lien avec Vibe) |
|---|---|---|
| GET | `/v1/agents` | Liste des agents ; filtre de requête `deployment_chat` (booléen) |
| GET | `/v1/agents/pages` | Liste paginée ; même filtre `deployment_chat` |
| PATCH | `/v1/agents/{agent_id}` | Mise à jour (`UpdateAgentRequest`, champ `deployment_chat` nullable) — sert à déployer un agent Studio dans Chat (inférence : le champ n'apparaît pas dans la requête de création) |
| GET | `/v1/workflows` | Liste des workflows ; filtre `available_in_chat_assistant` |
| GET | `/v1/workflows/registrations` | Liste des enregistrements ; filtre `available_in_chat_assistant` ; objet `WorkflowRegistration.compatible_with_chat_assistant` |
| GET / POST | `/v2/skills` | `ListSkills` / `CreateSkill` (tag `beta.skills`) |
| GET / PATCH / DELETE | `/v2/skills/{skill_id}` | `GetSkill` / `UpdateSkill` / `DeleteSkill` |
| GET / POST | `/v2/skills/{skill_id}/versions` | `ListSkillVersions` / `CreateSkillVersion` |
| GET / PATCH | `/v2/skills/{skill_id}/versions/{version}` | `GetSkillVersion` / `UpdateSkillVersionMetadata` |
| GET | `/v1/admin/analytics/vibe/work/usage/by_user_stats` | Usage Vibe Work par utilisateur (`start_time`, `end_time` en secondes Unix) |
| GET | `/v1/admin/analytics/vibe/work/usage/by_agent_stats` | Usage Vibe Work par agent |
| GET | `/v1/admin/analytics/vibe/work/usage/by_time_stats` | Usage dans le temps ; `granularity` ∈ `hour`, `day` (défaut), `week`, `month` |

**Objets clés (spec OpenAPI)**
- `Agent.deployment_chat` : booléen **requis** dans l'objet Agent.
- `Workflow.available_in_chat_assistant` : booléen, défaut `false` (« whether the workflow is available in chat assistant ») ; `WorkflowRegistration.compatible_with_chat_assistant` : booléen, défaut `false`.
- Skill : `name`, `definition` (`SkillDefinition` = `description` « model-facing trigger », `body`, `assets` = fichiers additionnels), `version`, `latestVersion`, `aliases`, `notes`, `sharingScope` (`RegistrySharingScope` : `sharing_scope_unspecified`, `private`, `workspace`), `workspaceRelation` (`ShareRelation` : `reader`, `writer` ; défaut `writer`, rejeté si `sharingScope` ≠ `workspace`). Correspondance avec l'UI : `Description` ↔ `definition.description`, `SKILL.md` ↔ `definition.body`, fichiers joints ↔ `definition.assets` (inférence). Aucun champ « publish to Vibe » repéré dans la spec.
- Statistiques Vibe Work (`VibeWorkByUserStat`, `VibeWorkByAgentStat`, `VibeWorkByTimeStat`) : `messages_count`, `files_count`, `images_count`, `spreadsheets_count`, `unique_conversations_count`, plus selon le cas `user_id`, `agent_id`, `time_bucket`, `last_message_at`, `unique_users_count`, `unique_agents_count`, `messages_to_agents_count`.
- `UsageType` (facturation) : `vibe`, `vibe_connectors`, `vibe_ocr`, `vibe_audio_seconds`, `vibe_audio_characters`, à côté de `workflow_executions` (enregistré mais non reporté à la facturation selon la description), `connectors`, `document_library`, `libraries_pages`, `libraries_tokens`, `libraries_audio`, `chat`…
- `ChatAssistantWorkflowOutput` : type de sortie exigé pour publier un workflow dans Vibe ; **absent de la spec OpenAPI** (inférence : type du SDK Workflows, documenté dans les pages Studio *Publish in Vibe*).

**Protocole MCP (connecteurs personnalisés)** : transport **Streamable HTTP** recommandé (chemins usuels `/mcp` ou `/sse`) ; HTTPS + TLS valide ; handshake JSON-RPC `initialize` avec `protocolVersion` `2025-06-18` ; auth OAuth 2.1 (DCR) signalée par `401` + `WWW-Authenticate`, ou en-tête `Authorization` (Bearer/Basic).

**Messages d'erreur documentés**

| Message | Contexte |
|---|---|
| « MCP connection requires additional information or is invalid » | Configuration de connecteur MCP invalide |
| `Workflow failed: {workflow-name}` | Échec d'un Workflow (accès, entrée invalide, tier) |
| « Your account tier (free) does not have access to this feature » | Exemple de restriction de tier sur le Workflow `vibe-nuage` |

---

## 6. Limites, quotas, tarifs, disponibilité

**Par fonctionnalité**

| Fonctionnalité | Plans | Limites / quotas | Statut |
|---|---|---|---|
| Work (expérience unifiée) | Tous ; migration self-serve d'abord, Enterprise sous 6 mois | — | GA (inférence : pas de mention beta) |
| Projects | Tous | Nombre de Projects et de chats par Project limité selon plan (non chiffré) | — |
| Libraries | Non précisé (tous, inférence) | Nb de Libraries illimité ; 100 fichiers par envoi ; 100 Mo/fichier ; allocation mensuelle de traitement partagée entre Libraries | — |
| Knowledge Base | Work uniquement ; activée par défaut | Désactivable par l'admin org | Successeur de Memories |
| Connectors featured | Tous (inférence) | Désactivables par l'admin au cas par cas | — |
| MCP Connectors | Ajout réservé aux admins (propriétaire = admin sur Free/Pro/Student) | Pas de dynamic tool discovery, resources, prompt templates | — |
| Skills | Tous (inférence) | Limite de nombre de fichiers annexes (non chiffrée) ; ~100 tokens par Skill à la découverte | — |
| Scheduled tasks | Work uniquement | Nb de tâches simultanées selon le plan (non chiffré) | **Public Preview** |
| Workflows | Selon publication ; certains restreints par tier/plan | Invocation explicite uniquement | — |
| Files et Canvas | **Tous**, sans configuration | Limites d'usage selon plan | — |
| Mini apps | Non précisé | — | — |
| Spreadsheets | **Payants uniquement** (« until further notice ») | — | — |
| Code Interpreter (Work) | **Payants uniquement** | Rate limits selon plan ; pas d'Internet ; fichiers limités à la conversation | Remplace le legacy |
| Image generation | Non précisé | **Limites quotidiennes** selon plan | Modèles Black Forest Labs |
| Web search / Open URL | Non précisé | Une page par URL ; pas de login/paywall | Actualités AFP + AP |
| Voice mode | **Tous** ; web + iOS + Android | 13 langues | — |
| Agents (legacy) | Tous ; conservés en cas de downgrade (outils possiblement indisponibles) | 1 agent actif par conversation | Legacy |
| Code Interpreter (legacy) | Selon plan (rate limits) | — | Legacy |
| Deep Research / Think / Memories (legacy) | Non précisé | — | Legacy |

**Données, rétention, entraînement**

| Objet | Stockage / rétention | Entraînement |
|---|---|---|
| Temporary Chat | Non sauvegardé ; seule l'existence est journalisée ; rétention légale possible | Exclu |
| Libraries | Cloud **européen** ; tant que la Library existe dans un compte actif ; suppression définitive à la suppression de la Library/du compte | Selon plan ; opt-out possible |
| Connectors featured | Données récupérées en temps réel, **non stockées** ; déconnexion = révocation immédiate | **Jamais**, quel que soit le plan |
| Voice | — | Free/Pro/Student : oui sauf opt-out ; Team/Enterprise : non sauf opt-in org |
| Memories (legacy) | Durée de l'abonnement ; privées | Free/Pro/Student : possible sauf opt-out ; Team/Enterprise : opt-out par défaut |
| Knowledge Base | Jusqu'à suppression ; export dans `Settings` | Non précisé |

Les chiffres de quotas (Projects, tâches planifiées, images/jour, rate limits) sont tous renvoyés à `mistral.ai/pricing` ; aucun n'est donné dans les pages.

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

**Fusion et legacy**
- La fusion Chat/Work date du « 22 septembre » ; les Enterprise peuvent encore voir l'onglet Chat pendant 6 mois ; les fonctions legacy « continuent de fonctionner comme avant » tant que l'accès existe.
- Les Memories migrent dans Knowledge Base comme **un seul « knowledge topic »** et gardent leur statut (y compris si elles contiennent des données sensibles : « Memories migrated from Chat stay as they are »).
- Deep Research legacy **désactive temporairement** Libraries, Connectors et Agents ; le Skill `deep-research` de Work, lui, « fonctionne avec Connectors et Canvas ».
- Le Code Interpreter legacy reste activé **pour les chats suivants** une fois activé ; celui de Work ne mentionne pas d'activation via `Tools` (inférence : natif/automatique).
- Think mode legacy est basé sur **Magistral** ; le modèle derrière le toggle `think` de l'expérience unifiée n'est pas nommé.

**Comportements à connaître**
- **Deux portées distinctes pour `Always allow`** : dans la boîte d'approbation, pré-autorisation **pour la session** ; dans l'onglet `Functions` d'un connecteur, pré-autorisation **persistante, par utilisateur et par fonction**. Les tâches planifiées s'appuient sur la seconde.
- Pas de plan à valider avant exécution dans Work (todos en direct, démarrage immédiat) — contrairement à Deep Research legacy (plan éditable puis `Start research`).
- Le bouton stop **ne garantit pas** l'annulation d'une action déjà transmise à un système externe.
- **Knowledge Base non éditable directement** (modification via le modèle) alors que les Memories legacy étaient éditables au crayon.
- Récupération Knowledge **non déterministe** ; seul l'enregistrement explicite (« remember », « save ») est présenté comme fiable.
- Le réglage `Sensitive data in Knowledge` n'est **pas rétroactif** dans les deux sens (ni enregistrement des données passées, ni suppression à la désactivation).
- La modification d'un Skill ne s'applique **qu'aux nouveaux chats** ; idem pour Custom instructions (nouvelles tâches).
- **Hiérarchie de contexte** : Skill actif > Custom instructions ; Agent actif (legacy) > Custom instructions ; Project + Custom instructions cumulés ; ton de Project `Default (Global)` = hérité.
- Les Workflows ne sont **jamais auto-déclenchés** (les Skills le sont).
- Les Scheduled tasks utilisent l'infrastructure Workflows mais restent créables par tout utilisateur (pas besoin de Studio).
- Open URL **exige l'activation de Web search**.
- Code Interpreter **ne lit pas d'URL** ; contournement via Web search.
- Pour les graphiques, préférer Code Interpreter à la génération d'images.
- Google Sheets : ouverture **sans synchronisation retour** vers Canvas.
- Partage public (mini apps, tableurs) : seul l'artefact est exposé, **pas les messages** ; à l'inverse, `Share` dans Canvas « distribue le chat complet, contenu Canvas inclus ».
- Un chat = **un seul Project**. Supprimer un Project ne supprime pas ses chats.
- Supprimer une Library la supprime **pour tous** les utilisateurs partagés.
- Agents legacy : pas de transfert de propriété natif (contournement par duplication) ; pas de notification de partage.
- **Une session par utilisateur** : changer de Workspace affecte tous les onglets ; profils navigateur distincts nécessaires pour deux Workspaces.
- Le Workspace est explicitement **une frontière d'isolation, pas une équipe**.
- MCP : `Connector name` sans espaces ni caractères spéciaux ; le serveur peut changer ses outils à tout moment (`Refresh tools` pour recharger) ; risque d'injection de prompt explicitement signalé.
- Featured connectors en **OAuth 2.0**, MCP personnalisés en **OAuth 2.1 + DCR**.
- Libraries : les pages web indexées n'incluent ni pages enfants, ni images, ni graphiques ; quota de traitement mensuel épuisé = **uploads en pause** mais Libraries utilisables.
- Les Libraries sont partageables avec l'« Entire organization » alors qu'elles sont par défaut cloisonnées par Workspace (le partage cross-workspace dépend d'une autorisation admin).
- Le panneau todos n'apparaît pas pour les tâches courtes.
- Nom de l'app mobile et des identifiants de store encore « le-chat » / `ai.mistral.chat`.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Invocation des Skills : `@` ou `/` ?** Les pages Vibe, Choose Work or Code et (indirectement) Get started disent d'invoquer les Skills avec `@` ; la page Skills ne documente que `/` (`/{skill-name}`) et la mention naturelle. La page Agents legacy contient un TODO « It's still @ in the older UI ».
2. **Année de la fusion** : « Since September 22 » sans année (2026 supposé).
3. **Nom du modèle de Voice mode vide** (« powered by , a speech-to-text model ») et section **« Talk with Work in conversation mode » vide** : fonction de conversation vocale non documentée.
4. **Ligne « Audio » vide** dans le tableau des formats de Files (aucune extension listée) ; absente des tableaux de Libraries et Code Interpreter.
5. **Libellé du toggle Project** `Include other projects' chats as context` vs description « draw on the other chats **in this Project** » : portée réelle ambiguë (autres Projects ou même Project ?).
6. **Think mode présenté comme surface dédiée** dans la page Safety (« Think mode in Chat is the dedicated surface ») alors que Chat est en retrait et que l'équivalent est le toggle fast/think.
7. **Liens Deep Research** : la page Web search renvoie vers la page legacy tout en parlant du Skill de Work.
8. **Code Interpreter legacy** : annonce « Python et TypeScript » mais le reste de la page (et la page Agents) ne parle que de Python/Matplotlib.
9. **Terminologie des fonctions de connecteurs** : « Read functions / Write functions » (page MCP) vs « Read-only tools / Interactive tools » (page Safety).
10. **Google Drive** cité comme connecteur de Work (pages Choose, Get started, Connectors, Agents) mais **absent du tableau des connecteurs featured** ; idem pour SharePoint (seul « SharePoint Search API » y figure).
11. **Noms de plans incohérents** : « Free, Pro, and Teams » (migration self-serve) vs « Team and Enterprise » (Voice, Memories) vs « Free, Pro, and Student » ; « Student » n'apparaît pas dans la liste de migration.
12. **Nom de la page des tâches planifiées** : « From the Tasks page » mais l'entrée de barre latérale s'appelle `Scheduled` ; « Tasks page » réapparaît pour la création depuis le chat.
13. **Libraries Vibe vs Libraries Studio** : les pages lues ne disent pas si ce sont les mêmes objets (même stockage, même API `document_library`) ; la spec contient des `UsageType` `libraries_*` et `document_library` sans lien explicite.
14. **« Publish to Vibe »** pour les Skills Studio : bouton documenté, mais aucun champ correspondant dans l'objet Skill de la spec (seulement `sharingScope`/`workspaceRelation`) ; mécanisme non décrit.
15. **Agents Studio dans Vibe unifié** : la page Agents legacy dit qu'ils apparaissent dans Chat ; rien n'indique leur sort après la suppression de l'onglet Chat (les analytics Vibe Work comptent pourtant des messages « to agents » et un `by_agent_stats`).
16. **Plan requis non précisé** pour mini apps, image generation, web search, Libraries, Skills.
17. **Rétention de la Knowledge Base et usage pour l'entraînement** non précisés (contrairement à Memories).
18. **Nombre de Knowledge topics** : seul le topic issu de la migration des Memories est mentionné ; la façon dont les topics sont créés/organisés n'est pas décrite.
19. **`Always allow` en boîte d'approbation « for the session »** : on ignore si cela persiste au-delà de la conversation ou se reflète dans l'onglet `Functions`.
20. **TODO internes visibles** dans la copie : capture d'écran manquante des onglets Work/Code ; articles de prompt engineering à ajouter (Get started).
21. **« Agentic work across an unbounded number of Connectors »** : formulation marketing, non étayée par une limite chiffrée.

---

## Annexe — Couverture

| # | Fichier | Source | Statut |
|---|---|---|---|
| 1 | `vibe.md` | https://docs.mistral.ai/vibe.md | ✅ lu en entier |
| 2 | `vibe/choose-chat-work-code.md` | https://docs.mistral.ai/vibe/choose-chat-work-code.md | ✅ lu en entier |
| 3 | `vibe/work/get-started.md` | https://docs.mistral.ai/vibe/work/get-started.md | ✅ lu en entier |
| 4 | `vibe/work/projects.md` | https://docs.mistral.ai/vibe/work/projects.md | ✅ lu en entier |
| 5 | `vibe/work/libraries.md` | https://docs.mistral.ai/vibe/work/libraries.md | ✅ lu en entier |
| 6 | `vibe/work/knowledge.md` | https://docs.mistral.ai/vibe/work/knowledge.md | ✅ lu en entier |
| 7 | `vibe/work/connectors.md` | https://docs.mistral.ai/vibe/work/connectors.md | ✅ lu en entier |
| 8 | `vibe/work/connectors/mcp-connectors.md` | https://docs.mistral.ai/vibe/work/connectors/mcp-connectors.md | ✅ lu en entier |
| 9 | `vibe/work/skills.md` | https://docs.mistral.ai/vibe/work/skills.md | ✅ lu en entier |
| 10 | `vibe/work/scheduled-tasks.md` | https://docs.mistral.ai/vibe/work/scheduled-tasks.md | ✅ lu en entier |
| 11 | `vibe/work/workflows.md` | https://docs.mistral.ai/vibe/work/workflows.md | ✅ lu en entier |
| 12 | `vibe/work/mini-apps.md` | https://docs.mistral.ai/vibe/work/mini-apps.md | ✅ lu en entier |
| 13 | `vibe/work/files-and-canvas.md` | https://docs.mistral.ai/vibe/work/files-and-canvas.md | ✅ lu en entier |
| 14 | `vibe/work/spreadsheets.md` | https://docs.mistral.ai/vibe/work/spreadsheets.md | ✅ lu en entier |
| 15 | `vibe/work/code-interpreter.md` | https://docs.mistral.ai/vibe/work/code-interpreter.md | ✅ lu en entier |
| 16 | `vibe/work/image-generation.md` | https://docs.mistral.ai/vibe/work/image-generation.md | ✅ lu en entier |
| 17 | `vibe/work/web-search-open-url.md` | https://docs.mistral.ai/vibe/work/web-search-open-url.md | ✅ lu en entier |
| 18 | `vibe/work/voice-mode.md` | https://docs.mistral.ai/vibe/work/voice-mode.md | ✅ lu en entier (nom de modèle et une section vides dans la source) |
| 19 | `vibe/work/custom-instructions.md` | https://docs.mistral.ai/vibe/work/custom-instructions.md | ✅ lu en entier |
| 20 | `vibe/work/safety-and-approvals.md` | https://docs.mistral.ai/vibe/work/safety-and-approvals.md | ✅ lu en entier |
| 21 | `vibe/work/switch-organization-workspace.md` | https://docs.mistral.ai/vibe/work/switch-organization-workspace.md | ✅ lu en entier |
| 22 | `vibe/chat-legacy/agents.md` | https://docs.mistral.ai/vibe/chat-legacy/agents.md | ✅ lu en entier |
| 23 | `vibe/chat-legacy/code-interpreter.md` | https://docs.mistral.ai/vibe/chat-legacy/code-interpreter.md | ✅ lu en entier |
| 24 | `vibe/chat-legacy/deep-research.md` | https://docs.mistral.ai/vibe/chat-legacy/deep-research.md | ✅ lu en entier |
| 25 | `vibe/chat-legacy/memories.md` | https://docs.mistral.ai/vibe/chat-legacy/memories.md | ✅ lu en entier |
| 26 | `vibe/chat-legacy/think-mode.md` | https://docs.mistral.ai/vibe/chat-legacy/think-mode.md | ✅ lu en entier |

Compléments hors fichiers assignés : greps ciblés dans la spec OpenAPI locale (`/v2/skills`, `deployment_chat`, `available_in_chat_assistant`, `compatible_with_chat_assistant`, `/v1/admin/analytics/vibe/work/*`, `UsageType`, `RegistrySharingScope`, `ShareRelation`) — utilisés uniquement en §3.27, §5 et §8.
