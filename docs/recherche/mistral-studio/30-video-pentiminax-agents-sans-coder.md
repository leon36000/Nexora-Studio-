# 30 — Vidéo : Créer des agents IA avec Mistral AI Studio (Pentiminax)

> **Périmètre** : tutoriel vidéo YouTube en français montrant la création d'agents dans Mistral AI Studio (console `console.mistral.ai`) puis leur déploiement dans Vibe · **Sources** : 1 vidéo (18:52) « regardée » par 138 images dédoublonnées + 566 images brutes (1 toutes les 2 s) + transcription automatique FR ; vérifications ponctuelles dans la spec OpenAPI locale · **Rédaction** : agent de recherche pour Nexora Studio

**Avertissement de datation** : la vidéo date du **03/07/2026** ; la copie de la doc utilisée par les autres chapitres date du 21/10/2026. L'interface décrite ici est celle de début juillet 2026 et a pu évoluer depuis.

## Sommaire
- 0. Fiche de la vidéo
- 1. En bref (résumé)
- 2. Concepts et vocabulaire
- 3. Chronologie détaillée
- 4. Interface Studio : inventaire exhaustif
- 5. API et SDK visibles dans la vidéo
- 6. Écrans hors Studio montrés (docs, site, Vibe) : modèles, tarifs, limites
- 7. Conseils, bonnes pratiques, limites et erreurs rencontrées
- 8. Ce que la vidéo révèle de l'organisation de Studio
- 9. Questions ouvertes / incohérences relevées
- Annexe A : images de référence copiées
- Annexe B : couverture (138 images examinées)

---

## 0. Fiche de la vidéo

| Champ | Valeur |
|---|---|
| Titre | « Créer des agents IA avec Mistral AI Studio (Sans Coder) » |
| Chaîne / auteur | Pentiminax (`UCO6P25qG9O4f6Bk9UKMLAjw`, ~29 400 abonnés) ; compte affiché à l'écran : « Tanguy », initiales `TL` |
| Publication | 03/07/2026 (horodatage meta `1783087228` = 16:00 CEST) |
| Durée | 18:52 (1 132 s) |
| URL | https://www.youtube.com/watch?v=0esChgVuxSc |
| Vues / likes / commentaires (au moment du téléchargement) | 1 713 / 33 / 9 |
| Catégorie / tags | Science & Technology ; `mistral ai tutorial`, `Mistral ai`, `Mistral ai studio`, `Créer agent ia`, `Ai agents mistral` |
| Langue | fr-FR (transcription automatique) |
| Description (résumé) | Créer rapidement un premier agent dans Mistral AI Studio : choix du modèle, instructions, température, max tokens, top_p, outils intégrés, effort de raisonnement, fonctions personnalisées, format de réponse ; « passer d'un simple prompt à un véritable agent IA ». Lien donné : https://mistral.ai/fr/ |
| Environnement de tournage | macOS, Chrome en français, onglets ouverts : « Model Selection Guide », « Modèles de langage, assistan… » (mistral.ai/fr), « AI Studio - Mistral AI », « Studio \| Mistral Docs » |
| Compte | Organisation « Personnel », workspace « Default Workspace », Vibe en plan « Free » |

Structure : ~6 min de diapositives générées avec **NotebookLM** (filigrane visible), puis ~12 min de démonstration en direct dans Studio et Vibe.

---

## 1. En bref (résumé)

- **Partie théorique (00:00–06:15)** : LLM = « cerveau » isolé (pas d'accès web, connaissance figée) ; un **agent** = modèle + instructions (system prompt / rôle) + outils. Les « trois piliers » de l'architecture Mistral : **Agents**, **Conversations**, **Entries**. Anatomie d'un agent (`model`, `name`, `description`, `instructions`, `tools`, `completion_args`) et « boîte à outils » (`web_search`/`web_search_premium`, `code_interpreter`, `image_generation`, Document Library, `function`, connecteurs MCP).
- **Démo 1 (06:15–15:37)** : depuis l'accueil de la console, « Créer un agent » → modale (nom, description, métadonnées) → modale « Agent créé avec succès » avec l'ID `ag_…` et du code Python/TypeScript/cURL → réglage `temperature` 0.5, `max_tokens` 700, `top_p` 0.9 → activation de l'outil « Recherche » → ajout d'une fonction `escalate_to_support` (schéma JSON) → instructions → enregistrement en **v1** (écran de diff) → test dans le panneau d'aperçu → appel de fonction déclenché par « Escalade le support », avec résultat simulé.
- **Digression modèles (13:32–15:00)** : prix affichés dans le sélecteur de modèles, Model Selection Guide et fiche modèle de docs.mistral.ai.
- **Démo 2 (15:37–18:28)** : agent préexistant « GitHub Issue Assistant » ; pour l'utiliser dans **Vibe** (chat.mistral.ai), il faut cocher « Disponible dans Vibe », ce qui est **impossible tant que l'agent a une fonction personnalisée** ; l'auteur supprime la fonction, enregistre (v3), déploie, puis invoque l'agent dans Vibe avec `@GitHub Issue Assistant` sur une issue GitHub.
- **Message central de l'auteur** : un agent spécialisé (une seule tâche, instructions précises) répond mieux qu'un LLM généraliste ; Studio permet de le configurer **sans coder**, sauf l'exécution réelle des fonctions personnalisées, qui demande un programme.
- **Statuts observés** : badges `New` sur « Prompts », « Skills », « Bibliothèques » ; l'API Conversations est appelée via `client.beta.conversations` (préfixe **beta** dans les SDK).

---

## 2. Concepts et vocabulaire

| Terme (tel qu'affiché ou dit) | Définition / explication donnée (auteur, diapositives ou UI) |
|---|---|
| LLM / « grand modèle de langage » | « Cerveau » de l'IA ; sans système externe, il répond seulement à partir de ses connaissances d'entraînement (exemple cité : GPT‑3.5, connaissances arrêtées au 1er janvier 2023). Diapositive : LLM « figés dans le temps », « isolés du monde », « amnésiques », « théoriques » (écrivent du code sans pouvoir l'exécuter). |
| Monde « agentique » | On fournit des **outils** au modèle, qui décide lui-même de les appeler « lorsqu'il l'aura jugé nécessaire ». |
| Agent IA | Diapositive : « système autonome capable de planifier et d'agir pour atteindre des objectifs spécifiques » combinant **Le Modèle (Le Cerveau)**, **Les Instructions (Le Rôle)** = system prompt, **Les Outils (Les Mains)** = connecteurs d'action (« The Agent Trinity »). |
| Instructions / system prompt / rôle | Directives de haut niveau qui définissent la mission et le comportement. UI : champ « Instructions ». |
| Outils / connecteurs | Actions concrètes : recherche web, création d'image, interaction avec GitHub… On peut en créer soi-même (« des dizaines ») ; « des marketplaces exposent les outils les plus populaires ». |
| Les trois piliers (diapositive) | **1. Agents** : entité configurée (paramètres présélectionnés : outils, instructions, modèle). **2. Conversations** : historique persistant des interactions avec un assistant, un modèle ou un agent. **3. Entries (Entrées)** : unité atomique d'action (message utilisateur, réponse de l'assistant, exécution d'outil). |
| Entries | Auteur : messages système, messages utilisateur stockés ; « l'exécution d'un outil aussi est une entrée ». |
| Anatomie d'un agent (diapositive « Le panneau de configuration ») | `model` (moteur de raisonnement, ex. `mistral-large-latest`) ; `name` & `description` (identité, mission) ; `instructions` (optionnel) ; `tools` (optionnel : web, code, RAG…) ; `completion_args` (optionnel : paramètres d'échantillonnage, température, `top_p`). « Note d'atelier » : la création génère un `agent_id` unique, « clé de voûte » de toute orchestration. |
| Identité | L'auteur relie la notion d'identité (nom + description) à une tendance « survenue depuis Open Claw » (sic, transcription). |
| `completion_args` | Paramètres d'échantillonnage (température, `top_p`…). |
| Température | Auteur : 0 = minimum, 1 = maximum ; à 1, deux générations identiques donnent des résultats « complètement différents » ; proche de 0, résultats souvent identiques. Infobulle UI en §4.9. |
| `top_p` | Auteur : contrôle « la diversité » (il lit l'infobulle). |
| `max_tokens` | Auteur : « le nombre de mots » maximal de la réponse (approximation ; l'infobulle UI précise : 1 token ≈ 4 caractères, 100 tokens ≈ 75 mots). |
| Effort de raisonnement | « Aucun » ou « Élevé » ; élevé = le modèle « réfléchit d'abord », répond plus lentement mais plus précisément ; aucun = plus rapide, parfois moins précis. |
| Fonction personnalisée / Function Calling | « Fonctions sur mesure » pour communiquer avec des sites ou API externes ; s'exécutent **localement** (diapositive : environnement « Local ») ; il faut un programme pour les exécuter, l'interface web ne les exécute pas. |
| MCP / Connecteurs | Serveur MCP fourni par un service tiers (GitHub, Canva…), auprès duquel on s'authentifie ; l'agent fait ensuite ses requêtes via ce serveur. Diapositive : « découverte/utilisation auto d'outils via serveurs gérés », exécution sur « Serveur externe ». |
| Outils intégrés (built-in) | Exécutés dans le « Cloud Mistral » : Web Search (`web_search` / `web_search_premium`), Code Interpreter (`code_interpreter`), Image Generation (`image_generation`), Document Library (RAG sur vos documents). |
| `tool_reference` | Diapositive : `web_search` renvoie des chunks de type `tool_reference` pour sourcer chaque affirmation (« RAG natif »). |
| `file_id` | Diapositive : `image_generation` renvoie un `file_id` (PNG) téléchargeable via l'endpoint Files. |
| `message.output` / `tool.execution` | Diapositive Code Interpreter : cycle d'une Entry = 1) `message.output` (l'assistant décide d'écrire du code), 2) `tool.execution` (exécution, métadonnées et résultats capturés), 3) `message.output` (réponse finale). |
| `agent_id` / « ID API » | Identifiant `ag_` + 32 hex ; sert à appeler l'agent depuis du code et à rattacher les conversations multi-tours. |
| `agent_version` | Numéro de version entier (0 à la création ; +1 à chaque enregistrement). |
| Version « Dernière » | Badge `vN • Dernière` : version la plus récente de l'agent. |
| Strict | Interrupteur de la modale fonction : « Garantit que la réponse du modèle suit toujours ce schéma. » |
| Vibe | Assistant conversationnel de Mistral (chat.mistral.ai ; résultat Google : « Vibe (anciennement Le Chat) »). Un agent Studio peut y être « déployé ». |
| « Disponible dans Vibe » | Case du menu ⋮ d'un agent ; déploie l'agent pour « tous les membres de votre organisation ». |
| Source (colonne) | Origine d'un agent dans la liste ; valeur observée : « Playground ». |

---

## 3. Chronologie détaillée

| Temps | Ce qui est dit | Ce qui est montré à l'écran |
|---|---|---|
| 00:00–00:28 | Mistral fournit une plateforme complète pour créer et gérer des agents ; plan : LLM, agent IA, « démystifier l'architecture de Mistral AI Studio », bonnes pratiques. | Diapositive titre (NotebookLM) « Créer et Diriger des Agents avec Mistral AI Studio — Un guide architectural pour construire des systèmes autonomes ». |
| 00:28–01:12 | Un LLM (GPT‑3.5, « Claude 4.5, Claude 5, Opus, Sonnet ») est le cerveau ; sans système externe, pas de recherche web ; date de coupure des connaissances. | Diapositive « Au-delà du texte statique » : 4 limites (figés dans le temps, isolés du monde, amnésiques, théoriques) ; schéma « ISOLATION ENCLOSURE (STATIC MODEL) ». |
| 01:12–02:05 | Monde agentique ; agent = modèle + system prompt/rôle + outils/connecteurs (web, image, GitHub) ; outils créables, marketplaces. | Diapositive « Qu'est-ce qu'un Agent IA ? » (Modèle / Instructions / Outils = Agent IA). |
| 02:05–02:57 | Piliers « que l'on retrouve plus ou moins partout » : agent, interactions stockées dans un historique persistant « pour être meilleur au fur et à mesure », entries. | Diapositive « Les trois piliers de l'architecture Mistral » (Agents → Conversations → Entries). [`t02m14s`](sources/video-pentiminax/t02m14s.jpg) |
| 02:57–03:54 | Anatomie : nom, description (identité), instructions, outils, `completion_args` ; température 0–1. | Diapositive « L'anatomie d'un Agent ». [`t02m58s`](sources/video-pentiminax/t02m58s.jpg) |
| 03:54–05:57 | Boîte à outils : 4 outils cloud (Web Search « gratuit… avec une certaine limite », Code Interpreter « la plupart du temps du Python », Image Generation, Document Library pour PDF/fichiers) ; Function Calling (programme requis, non exécutable « comme ça » depuis Studio) ; MCP (GitHub, Canva, authentification). | Diapositive tableau « La boîte à outils Mistral ». [`t04m06s`](sources/video-pentiminax/t04m06s.jpg) |
| 05:48–06:15 | Outils intégrés : la recherche web retourne sources et citations, l'image retourne une image, le code s'exécute « de façon sécurisée dans plusieurs conteneurs cloud ». | Diapositives « Outils intégrés : l'information et la création à la volée » et « Code Interpreter : le moteur analytique sécurisé ». |
| 06:15–06:52 | Accès : chercher « Mistral AI » sur Google → site → en haut à droite « Commencer » → « Studio » ; il faut créer un compte. | Accueil `console.mistral.ai/home`, menu Développeurs de mistral.ai/fr (Documentation, Référence d'API, Cookbooks), suggestions de la barre d'adresse, résultat Google (liens « Essayez Mistral Vibe », « Mistral Studio — AI registry. A unified catalog for models, agents, datasets… », « Pricing »), menu « Commencez » (Studio, Vibe, Vibe for Code). |
| 06:52–07:08 | « Énormément de fonctionnalités » ; démarrage rapide « Créer un agent ». | Accueil défilé : Démarrage rapide (survol de « Créer un Agent » → `https://console.mistral.ai/build/agents/new`) ; modale « Créer un agent » sur `/build/playground?isCreateAgent=true&from=agents` ; furtivement le Playground nu (valeurs par défaut). [`t06m58s`](sources/video-pentiminax/t06m58s.jpg) [`t07m02s`](sources/video-pentiminax/t07m02s.jpg) [`t07m04s`](sources/video-pentiminax/t07m04s.jpg) |
| 07:08–07:30 | Nom « Support Produit », description « Répondre aux questions d'un utilisateur sur un produit, une documentation ou une FAQ » ; métadonnées inutiles ici ; un identifiant unique est assigné. | Modale remplie puis « Agent créé avec succès » (onglet cURL). [`t07m30s`](sources/video-pentiminax/t07m30s.jpg) |
| 07:30–08:02 | L'ID sert à récupérer l'agent dans du code et à **stocker les conversations multi-tours**. | Onglets TypeScript / Python ; ID sélectionné. [`t07m42s`](sources/video-pentiminax/t07m42s.jpg) |
| 08:02–08:19 | À gauche la configuration du modèle, à droite la prévisualisation pour tester. | Éditeur `Agents / Support Produit` `v0 • Dernière`, temperature 0.7, max_tokens 2048, top_p 1. |
| 08:19–09:30 | `top_p` = diversité ; réglage à 0.9 (« Mince, mon clavier marche pas ») ; `max_tokens` 700 plutôt que 3400 pour des réponses de support courtes ; température 0.5 « naturelles mais contrôlées ». | Popover des curseurs, infobulles top_p, max_tokens, temperature ; bouton « Enregistrer les modifications de l'agent » devenu actif (orange). [`t08m38s`](sources/video-pentiminax/t08m38s.jpg) [`t09m06s`](sources/video-pentiminax/t09m06s.jpg) |
| 09:30–10:52 | « Fonctionnalités › Ajouter » : outils intégrés ; « Recherche Premium » (lit l'infobulle) ; « on peut activer soit l'un, soit l'autre » ; image peu utile sauf schémas ; code utile pour un produit technique ; effort de raisonnement : seulement « Aucun » ou « Élevé ». | Panneau Fonctionnalités déplié ; activation de « Recherche » ; infobulles des boutons. [`t09m44s`](sources/video-pentiminax/t09m44s.jpg) |
| 10:52–11:46 | Fonction `escalate_to_support` (syntaxe à underscores) ; la description aide l'agent à savoir quand l'utiliser ; paramètres `user_question`, `reason`, `priority` (low/medium/high) remplis par le LLM ; « il faut exactement que ça ressemble à ça ». | Modale « Ajouter une fonction » vide, puis erreur JSON, puis schéma collé ; fonction listée et cochée. [`t11m02s`](sources/video-pentiminax/t11m02s.jpg) [`t11m30s`](sources/video-pentiminax/t11m30s.jpg) |
| 11:46–12:07 | Format de réponse : texte (réponse humaine) ou JSON pour intégrer dans un autre programme. | Liste déroulante Texte / JSON / JSON-Schema, infobulles ; réouverture de la fonction (JSON reformaté). [`t11m58s`](sources/video-pentiminax/t11m58s.jpg) |
| 12:07–12:41 | Instructions = system prompt : définir qui est l'agent, son rôle, ce qu'il a le droit de faire, comment répondre ; éventuellement un livrable ; « le prompt engineering peut être très vaste ». | Saisie d'un prompt de 10 lignes (voir §4.13). |
| 12:41–12:57 | Enregistrer « pour faire la version 1 ». | Modale « Vérifiez vos modifications » (diff v0 → v1), toast « Agent mis à jour avec succès », badge `v1 • Dernière`. [`t12m48s`](sources/video-pentiminax/t12m48s.jpg) |
| 12:57–13:32 | Test : « Je n'arrive pas à me connecter à mon compte Facebook » ; réponse « étape par étape », conforme à l'instruction « guide l'utilisateur étape par étape ». | Nouvelle URL avec `conversationId=conv_…` ; réponse Markdown en streaming ; métriques 21.74s / ↑478 / ↓509. [`t13m34s`](sources/video-pentiminax/t13m34s.jpg) |
| 13:32–14:07 | Mistral Medium utilisé ; « vous avez ici les prix » ; Small beaucoup moins cher, Tiny encore plus ; Medium « assez cher ». Pour choisir : Model Selection Guide, via « Aide et ressources › Modèles ». | Sélecteur de modèles avec cartes de prix et alias ; menu « Aide et ressources ». [`t13m50s`](sources/video-pentiminax/t13m50s.jpg) [`t14m10s`](sources/video-pentiminax/t14m10s.jpg) |
| 14:07–15:01 | Comparaison Medium vs Small : Small « beaucoup plus rapide », « un peu moins performant », entrée texte + image, sortie texte ; « Learn more about this model » ; on peut aussi demander à une IA quel modèle choisir. | docs.mistral.ai : Models Overview, Model Selection Guide (« Compare Models »), fiche « Mistral Small 4 ». |
| 15:01–15:37 | « Escalade le support » : le modèle appelle `escalate_to_support` avec les trois arguments. | Bloc « Appel De Fonction » + « Résultat De Fonction » (TODO simulé) ; métriques 4.91s / ↑994 / ↓76. [`t15m18s`](sources/video-pentiminax/t15m18s.jpg) |
| 15:37–16:02 | Agent préparé avant : « GitHub issue assistant », pour analyser des issues ; intérêt : l'utiliser dans le chat Mistral. | Liste des agents (chargement), éditeur « GitHub Issue Assistant » `v2` ; détours par daily.dev, packagist, puis mistral.ai (EN) « Start building › Vibe ». |
| 16:02–16:22 | Dans Vibe : « / », puis « + › Agent », « Nous n'avons trouvé aucun… » → il faut l'assigner à Vibe. | chat.mistral.ai « Bienvenue, Tanguy » ; menu « + » ; onglet Partagés vide. |
| 16:22–16:54 | Retour Studio ; impossible de rendre l'agent disponible dans Vibe tant qu'il a une fonction personnalisée ; suppression, enregistrement, puis « rendre disponible dans Vibe ». | Liste des agents ; menu ⋮ (« Disponible dans Vibe » grisé) ; modale « Supprimer la fonction ? » ; diff v2 → v3 ; modale « Déployer l'agent sur Vibe » ; toast « Agent ajouté avec succès à Vibe. » ; encadré « Les fonctions personnalisées ne sont pas disponibles… ». [`t16m28s`](sources/video-pentiminax/t16m28s.jpg) [`t16m40s`](sources/video-pentiminax/t16m40s.jpg) [`t16m46s`](sources/video-pentiminax/t16m46s.jpg) [`t16m48s`](sources/video-pentiminax/t16m48s.jpg) [`t16m50s`](sources/video-pentiminax/t16m50s.jpg) |
| 16:54–17:39 | « + agent » dans Vibe : l'agent est là, on peut le mentionner ; rappel de ses instructions ; colle le lien d'une issue ; mode « rapide » ou « réflexion » ; l'agent a la recherche web, il peut ouvrir le lien. | Vibe : sous-menu Agents › Partagés › « GitHub Issue Assistant » ; bandeau `@GitHub Issue Assistant` ; dépôt et issues GitHub `pentiminax/ux-datatables` ; menu des modes. [`t16m54s`](sources/video-pentiminax/t16m54s.jpg) |
| 17:39–18:28 | Résumé, solution proposée, réponse du mainteneur, piste technique : « exactement ce qu'il y a dans mon system prompt » ; intérêt d'agents mono-tâche plutôt que de LLM généralistes. | Réponse Vibe structurée (« Résumé de l'Issue #135 : Conflit de nom avec Omines »…) ; retour ponctuel sur les instructions dans Studio. |
| 18:28–18:52 | Conclusion ; série à venir sur « chaque élément de Mistral AI Studio » ; « pas assez de contenu sur YouTube ». | Liste des agents ; menu latéral avec Audio et Connaissances dépliés. |

---

## 4. Interface Studio : inventaire exhaustif

Les libellés sont recopiés tels qu'affichés (UI en français, avec des restes d'anglais). « (inférence) » signale une déduction.

### 4.1 Cadre global (barre supérieure noire)

| Élément (gauche → droite) | Détail |
|---|---|
| Logo carré bleu « M » + **« Studio »** + chevron ▾ | Sélecteur de produit (inférence : bascule entre produits Mistral) ; jamais ouvert dans la vidéo. |
| Icône de repli du menu latéral | Panneau (toggle sidebar). |
| **« P Personnel »** | Organisation courante (pastille avec initiale). |
| **« D Default Workspace »** + ⇕ | Sélecteur de workspace. |
| **« Retours »** | Bouton de feedback. |
| **« Rechercher ⌘K »** | Recherche / palette de commandes. |
| Avatar **« TL »** | Menu utilisateur (non ouvert). |

Titres d'onglet du navigateur : « AI Studio - Mistral AI » (accueil, playground), « Agents - AI Studio - Mistral AI » (liste des agents).

### 4.2 Menu latéral (ordre exact)

| # | Groupe | Entrée | Sous-entrées vues | Badge |
|---|---|---|---|---|
| 1 | — | Accueil (maison) | — | — |
| 2 | — | Clés API (clé) | — | — |
| 3 | **Créer** | Agents › | **Liste**, **Playground** (élément actif signalé par une barre rouge à gauche) | — |
| 4 | Créer | Audio › | **Reconnaissance voc…** (tronqué, « Reconnaissance vocale »), **Synthèse vocale** (dépliées à 18:28) | — |
| 5 | Créer | Batches | — | — |
| 6 | Créer | Document AI | — | — |
| 7 | Créer | Workflows › | non dépliées | — |
| 8 | **Contexte** | Connecteurs | — | — |
| 9 | Contexte | Connaissances › | **Fichiers**, **Bibliothèques** `New` (dépliées à 18:28) | — |
| 10 | Contexte | Prompts | — | `New` |
| 11 | Contexte | Skills | — | `New` |
| bas | — | Carte de consommation : **« 0% »**, lien **« Limites ⧉ »**, barre de progression, **« Réinitialisé dans 29 jours »** | — | — |
| bas | — | **« Activer Pay-per-use »** + pictogramme en dégradé jaune-orange-rouge | — | — |
| bas | — | **« Aide et ressources »** (?) → menu (§4.19) | — | — |

Aucune entrée « Observabilité », « Admin », « Facturation » ou « Fine-tuning » n'est visible dans ce menu (inférence : ces fonctions sont ailleurs, par exemple sous l'avatar ou le sélecteur « Studio ▾», ou absentes du plan gratuit).

### 4.3 Accueil — `console.mistral.ai/home`

[`t06m58s`](sources/video-pentiminax/t06m58s.jpg)
- Titre **« Mistral Studio »** ; sous-titre « Votre espace de travail pour créer, tester et gérer des applications alimentées par l'IA. » ; liens à droite **« Discord »** et **« Centre d'aide »**.
- Carte **« Créer »** (icône pixel-art) : « Utilisez une IA de pointe dans votre application, ouverte et personnalisable selon vos besoins. » → liens fléchés **Playground**, **Workflows**, **Créer une clé API**.
- Carte **« Capturer »** (icône haut-parleur) : « Analyse de documents, génération et réplication vocale qui capture la personnalité. » → **OCR**, **Reconnaissance vocale**, **Synthèse vocale**.
- **« Démarrage rapide »** : « Créer un Agent — Concevez et déployez un agent IA en quelques minutes. » (lien `https://console.mistral.ai/build/agents/new`) ; « Tester les modèles audio — Testez les modèles de conversion de la parole en texte et du texte en parole. » ; « Requêtes API — Effectuez vos premières requêtes API de Chat completion. » (lien `https://docs.mistral.ai/api`) ; « Déployer les modèles — Téléchargez les modèles et déployez-les localement. »
- **« Documentation »** + lien rouge « Voir toute la documentation » : « Document AI — Traitez et analysez des documents avec l'IA » ; « Génération de texte et de conversations — Générez du texte, complétez des invites et créez des chatbots. » ; « Agents — Créez, personnalisez et gérez des agents IA. » ; « Workflows — Automatisez des tâches multi-étapes avec des pipelines IA. »

### 4.4 Playground sans agent — `/build/playground?from=agents`

[`t07m04s`](sources/video-pentiminax/t07m04s.jpg) — **valeurs par défaut** :

| Zone | Contenu par défaut |
|---|---|
| Titre de page | « Playground » |
| Boutons en haut à droite | **« <> Code »** (contour), **« + Créer un agent »** (noir) |
| Modèle (?) | « Mistral Medium / `mistral-medium-latest` » ▾ |
| Ligne de résumé | `temperature: 0.7  max_tokens: 2048  top_p: 1` (valeurs en rouge, cliquables) |
| Fonctionnalités (?) | bouton **« Ajouter + »** (rien d'activé) |
| Format de réponse (?) | **« Texte »** ▾ |
| Instructions (?) | zone vide ; placeholder « Décrivez le comportement souhaité du modèle (ton, utilisation d'outils, style de réponse) » |
| Panneau droit | icône horloge, bouton « Nouvelle conversation » (grisé), texte central « Démarrer une nouvelle conversation », champ « Saisissez un message… » + bouton ↑ |

### 4.5 Modale « Créer un agent »

[`t07m02s`](sources/video-pentiminax/t07m02s.jpg) — ouverte sur `/build/playground?isCreateAgent=true&from=agents` (le lien du démarrage rapide pointe vers `/build/agents/new` ; inférence : redirection vers le playground avec `isCreateAgent=true`).

| Élément | Détail |
|---|---|
| Titre | icône agent + « Créer un agent » ; croix de fermeture |
| Sous-titre | « Créer un nouvel agent avec les paramètres actuels » (l'agent capture la configuration courante du playground) |
| Nom de l'agent | champ texte, placeholder « Saisir le nom de l'agent » |
| Description | zone redimensionnable, placeholder « Saisir la description de l'agent » |
| Métadonnées (Facultatif) ▾ | section repliable ; une ligne « Clé » / « Valeur » + bouton ✕ ; bouton pleine largeur « + Ajouter des métadonnées » |
| Boutons | « Annuler » ; « Créer un agent » (noir) |

Valeurs saisies : `Support Produit` ; « Répondre aux questions d'un utilisateur sur un produit, une documentation ou une FAQ. »

### 4.6 Modale « Agent créé avec succès » (panneau de code)

[`t07m30s`](sources/video-pentiminax/t07m30s.jpg) [`t07m42s`](sources/video-pentiminax/t07m42s.jpg)
- Titre « Agent créé avec succès » ; sous-titre « Votre agent a été créé. Voici comment l'utiliser : ».
- Encadré contenant l'ID `ag_019f23bde8eb750f8f131e870c939a4c` + bouton copier.
- Onglets **Python | TypeScript | cURL** (cURL actif à la première image après création) ; bloc de code sombre avec bouton copier. Contenu en §5.
- L'URL devient `/build/playground?from=agents&agentId=ag_…`.

### 4.7 Éditeur d'agent — en-tête et actions

[`t09m44s`](sources/video-pentiminax/t09m44s.jpg)

| Élément | Détail / états |
|---|---|
| Fil d'Ariane | « Agents / **Support Produit** » |
| Badge de version | `v0 • Dernière` → `v1 • Dernière` après enregistrement (GitHub Issue Assistant : `v2 • Dernière` → `v3 • Dernière`) |
| Bouton « + » à droite du badge | rôle non montré (inférence : nouvel onglet ou comparaison) |
| **« Enregistrer les modifications de l'agent »** | grisé sans modification ; **orange-rouge** dès qu'un paramètre change ; ouvre la modale de revue (§4.14) |
| **« Réinitialiser les modifications »** | annule les modifications non enregistrées (actif dès qu'il y a une modification) |
| **« Rétablir cette version »** (↺) | grisé sur la dernière version (inférence : actif quand on consulte une version antérieure) |
| **⋮** | menu de l'agent (§4.16) |
| Mise en page | deux colonnes : configuration à gauche (défilante), aperçu et conversation à droite |

### 4.8 Sélecteur de modèle

[`t13m50s`](sources/video-pentiminax/t13m50s.jpg) — bouton « Nom affiché / id » ▾ ; liste avec champ **« Rechercher des modèles… »** ; chaque ligne = nom + identifiant ; la ligne courante porte le badge **« Sélectionné »** ; le survol affiche une carte (identifiant, description, **Entrée / Sortie en € / 1M tokens**, **Alias** en pastilles).

| Section | Nom affiché | Identifiant | Carte de survol (description · Entrée · Sortie · Alias) |
|---|---|---|---|
| (principale) | Codestral | `codestral-latest` | « Our cutting-edge language model for coding released August 2025. » · 0,26 € · 0,77 € · `codestral-2508`, `mistral-code-latest`, `mistral-code-fim-latest` |
| | Devstral Medium | `devstral-medium-latest` | « Official devstral-2512 Mistral AI model » · prix non visibles · `devstral-2512`, `devstral-latest`, `mistral-code-agent-latest` |
| | Magistral Medium | `magistral-medium-latest` | non survolé |
| | Ministral 14b | `ministral-14b-latest` | non survolé |
| | Ministral 3b | `ministral-3b-latest` | « Ministral 3 (a.k.a. Tinystral) 3B Instruct. » · 0,08 € · 0,08 € · `ministral-3b-2512` |
| | Ministral 8b | `ministral-8b-latest` | « Ministral 3 (a.k.a. Tinystral) 8B Instruct. » · 0,13 € · 0,13 € · `ministral-8b-2512` |
| | Mistral Large | `mistral-large-latest` | « Official mistral-large-2512 Mistral AI model » · 0,43 € · 1,28 € · `mistral-large-2512` |
| | Mistral Medium **(Sélectionné)** | `mistral-medium-latest` | « Official mistral-medium-latest Mistral AI model » · 2,30 € · 6,89 € · `mistral-medium`, `mistral-medium-3-5`, `mistral-medium-3.5`, `mistral-medium-3`, `mistral-medium-2604`, `mistral-vibe-cli-latest`, `mistral-vibe-cli-with-tools` |
| | Mistral Small | `mistral-small-latest` | « Mistral Small 4. » · 0,13 € · 0,51 € · `mistral-small-2603`, `mistral-vibe-cli-fast`, `magistral-small-latest` |
| | Mistral Tiny | `mistral-tiny-latest` | « Our best multilingual open source model released July 2024. » · 0,13 € · 0,13 € · `open-mistral-nemo`, `open-mistral-nemo-2407`, `mistral-tiny-2407` |
| **« Plus »** | Mistral Medium 2505 | `mistral-medium-2505` | — |
| | Mistral Medium 2508 | `mistral-medium-2508` | — |
| | Labs Leanstral 1 5 1 | `labs-leanstral-1-5-1` | — |
| **« Anciens »** | Magistral Small 2509 | `magistral-small-2509` | — (la liste continue au-delà, non montrée) |

Constats : les alias `-latest` sont regroupés en tête, les versions datées sous « Plus », les modèles « Labs » aussi sous « Plus », les modèles hérités sous « Anciens » ; les alias `mistral-vibe-cli-*` révèlent que les modèles servent aussi l'agent de code Vibe.

### 4.9 Paramètres d'échantillonnage (popover)

Clic sur la ligne `temperature: … max_tokens: … top_p: …` → popover de trois lignes (icône dans une pastille rose, nom, valeur éditable, curseur rouge). [`t08m38s`](sources/video-pentiminax/t08m38s.jpg) [`t09m06s`](sources/video-pentiminax/t09m06s.jpg)

| Paramètre | Défaut | Valeurs démo | Bornes | Infobulle (au survol du nom) |
|---|---|---|---|---|
| `temperature` | 0.7 | 0.5 (passé par 0,53 en glissant) | 0–1 (géométrie du curseur, cohérente avec l'auteur et la spec OpenAPI `CompletionArgs.temperature` min 0 / max 1) | « Contrôle l'aléatoire : une valeur plus basse tend à rendre les résultats plus ciblés et déterministes, une valeur plus élevée tend à rendre les résultats plus créatifs et aléatoires. » |
| `max_tokens` | 2048 | 700 (saisi au clavier) | min non lu ; max ≈ 4096 (inférence : 2048 place le curseur à mi-course) | « Nombre maximum de tokens à générer. Un token représente environ 4 caractères. 100 tokens correspondent à peu près à 75 mots. » |
| `top_p` | 1 | 0.85 puis 0.9 | 0–1 (curseur en butée droite à 1) | « Contrôle la diversité via l'échantillonnage par noyau : une valeur plus basse tend à rendre les résultats plus ciblés, une valeur plus élevée tend à rendre les résultats plus créatifs. » |

Comportements : la valeur est affichée avec une **virgule décimale** dans le popover (`0,7`) mais un **point** dans la ligne de résumé (`0.7`) ; un clic sur la valeur la rend éditable (champ encadré) ; une icône **↺ (réinitialiser)** apparaît à côté d'un paramètre modifié ; toute modification active « Enregistrer… ». Aucun autre argument (`stop`, `presence_penalty`, `frequency_penalty`, `random_seed`…) n'est exposé dans ce popover, alors que la spec `CompletionArgs` les contient.

### 4.10 Fonctionnalités

Section repliable « Fonctionnalités (?) ». Repliée et vide : bouton « Ajouter + ». Dépliée : trois sous-cartes. Repliée avec des éléments actifs : **pictogrammes compacts** (ex. agent GitHub : `<>` + globe [Code + Recherche], cerveau [raisonnement], pastille fonction « 1 » + bouton « + » ; infobulle « Fonctions — 1 fonction personnalisée »).

**a) « Outils intégrés (?) »** — infobulle : « Activez des outils préconfigurés comme la recherche web, l'interpréteur de code et la génération d'images pour étendre les capacités du modèle. » Quatre boutons-bascules (contour pointillé quand inactif, fond bleu quand actif) :

| Bouton | Icône | Infobulle | Correspondance API (inférence, d'après la diapositive outils) |
|---|---|---|---|
| **Code** | `<>` | non capturée | `code_interpreter` |
| **Image** | image | « Permettre au modèle de générer des images. » | `image_generation` |
| **Recherche** | globe | « Permettre au modèle de rechercher sur le web. » | `web_search` |
| **Recherche Premium** | journal | « Permet au modèle d'effectuer des recherches sur le web et d'accéder à des articles d'actualité vérifiés via une vérification intégrée des fournisseurs d'informations pour une récupération d'informations optimisée. » | `web_search_premium` |

Aucun bouton « Document Library » / bibliothèque ni « Connecteur » dans cette carte (voir §9).

**b) « Effort de raisonnement (?) »** — infobulle : « Contrôlez la quantité de raisonnement que le modèle effectue avant de répondre. » Deux boutons exclusifs : **« Aucun »** (sélectionné par défaut) et **« Élevé »** (icône cerveau ; infobulle « Le modèle réfléchira plus longuement avant de répondre. »). La spec OpenAPI `ReasoningEffort` liste 5 valeurs (`none`, `minimal`, `low`, `medium`, `high`) : l'UI n'en expose que deux (inférence : `none` et `high`).

**c) « Fonctions (?) »** + bouton « + Ajouter » → modale (§4.11). Chaque fonction ajoutée apparaît en ligne : icône + nom (`escalate_to_support`) + **case cochée rouge** (inférence : activer ou désactiver sans supprimer). Un clic sur la ligne rouvre la modale en édition. Sur un agent déployé dans Vibe, la carte affiche à la place l'encadré ⓘ « Les fonctions personnalisées ne sont pas disponibles pour les agents déployés sur Vibe. » et le bouton « Ajouter » disparaît. [`t16m50s`](sources/video-pentiminax/t16m50s.jpg)

### 4.11 Modale « Ajouter une fonction »

[`t11m02s`](sources/video-pentiminax/t11m02s.jpg) [`t11m30s`](sources/video-pentiminax/t11m30s.jpg)

| Élément | Détail |
|---|---|
| Titre / aide | « Ajouter une fonction » ; « Définissez des fonctions que le modèle peut appeler pour effectuer des tâches spécifiques basées sur le contexte de la conversation. » + lien « En savoir plus » |
| « Exemples ▾ » | liste déroulante d'exemples (en haut à droite ; non ouverte) |
| Nom | placeholder « ex., get_weather » |
| Description | placeholder « ex., Obtenir la météo actuelle pour un lieu » ; mention « Optionnel » |
| **Strict** | interrupteur **activé (vert) par défaut** ; « Garantit que la réponse du modèle suit toujours ce schéma. » |
| Paramètres (schéma JSON) | grande zone de code (redimensionnable) ; placeholder grisé = exemple `get_weather` (`location`, « La ville et l'état, ex. San Francisco, CA », `required: ["location"]`) |
| Validation | bouton ✓ noir ; en édition, s'ajoute un bouton **corbeille rouge** (supprimer) |
| Erreur | zone bordée de rouge + « Les paramètres doivent être en JSON valide: Unexpected end of JSON input » (le placeholder n'est pas une valeur : champ vide) |

Schéma saisi par l'auteur (forme exacte) :
```json
{"type":"object",
 "properties":{"user_question":{"type":"string"},
               "reason":{"type":"string"},
               "priority":{"type":"string","enum":["low","medium","high"]}},
 "required":["user_question","reason","priority"]}
```
À la réouverture, le JSON est **reformaté** (une clé par ligne) et l'ordre des clés est normalisé (`required` avant `properties` dans une réouverture ultérieure ; inférence : re-sérialisation côté serveur). La spec OpenAPI `Function` = `name` (requis), `description` (défaut `''`), `strict` (**défaut `false`**), `parameters` (requis, objet libre).

Suppression : modale « **Supprimer la fonction ?** » — « Êtes-vous sûr de vouloir supprimer la fonction "create_github_issue_comment" ? Cette action est irréversible. » — « Annuler » / « Supprimer » (rouge).

### 4.12 Format de réponse

[`t11m58s`](sources/video-pentiminax/t11m58s.jpg) Liste déroulante « Format de réponse (?) » (défaut « Texte ») ; l'option courante est cochée ✓ ; infobulle latérale au survol :

| Option | Infobulle | Valeur API (spec `ResponseFormats`) |
|---|---|---|
| **Texte** | « Le modèle déterminera librement comment répondre sous forme de texte, sans attentes particulières sur le format de sortie. » | `text` |
| **JSON** | « Le modèle tentera toujours de produire un objet JSON valide mais déterminera librement la structure de cet objet JSON valide. » | `json_object` |
| **JSON-Schema** | non capturée ; option non sélectionnée (l'éditeur de schéma n'est pas montré) | `json_schema` |

### 4.13 Instructions

Zone de texte libre (placeholder §4.4). Prompt saisi pour « Support Produit » (v1) : « Tu es un assistant support produit. / Ton rôle : / - répondre aux questions utilisateur / - expliquer simplement les fonctionnalités / - guider l'utilisateur étape par étape / - indiquer clairement quand une information manque / Réponds avec un ton clair, pédagogique et direct. / Si tu n'es pas sûr, dis-le. »
Prompt de « GitHub Issue Assistant » : « Tu es un assistant GitHub pour développeurs. Ton rôle : analyser une issue GitHub, résumer le problème, identifier les informations manquantes, proposer une réponse claire au mainteneur, suggérer une piste technique si possible. Réponds de manière concise, structurée et professionnelle. Ne propose pas de solution inventée si les informations sont insuffisantes. »

### 4.14 Enregistrement et versionnage — modale « Vérifiez vos modifications »

[`t12m48s`](sources/video-pentiminax/t12m48s.jpg)
- Sous-titre « Cela créera une nouvelle version de votre agent. » ; pastilles **« Version actuelle : v0 »** → **« Nouvelle version : v1 »**.
- Onglets **« Instructions »** et **« Configuration »**, chacun suivi d'un point rouge s'il est modifié ; vue **diff côte à côte numérotée** (lignes ajoutées en vert préfixées `+`). Pour une version sans changement d'instructions : « Aucune modification. » (cas v2 → v3, seul l'onglet Configuration est marqué). Le contenu de l'onglet Configuration n'est jamais affiché.
- Champ « Décrivez cette version (facultatif) », placeholder « ex. Mise à jour du ton pour le rendre plus convivial ».
- Boutons « Annuler » / « Enregistrer les modifications de l'agent » (noir).
- Après validation : toast en bas à droite ✓ « **Agent mis à jour avec succès** », badge `v1 • Dernière`, bouton Enregistrer de nouveau grisé.

### 4.15 Panneau d'aperçu / conversation de test

[`t13m34s`](sources/video-pentiminax/t13m34s.jpg) [`t15m18s`](sources/video-pentiminax/t15m18s.jpg)

| Élément | Détail |
|---|---|
| Barre d'outils | icône **horloge** (inférence : historique des conversations), **« Nouvelle conversation »**, puis **⋮** une fois une conversation ouverte |
| État vide | « Prévisualisez votre agent ici » (agent) / « Démarrer une nouvelle conversation » (playground nu) |
| Saisie | « Saisissez un message… » ; bouton ↑ (noir quand du texte est saisi) ; devient un **carré (stop)** pendant le streaming |
| URL | ajout de `&conversationId=conv_019f23c3274774c3a7aff42dc04fd42a` dès le premier message |
| Messages | blocs étiquetés **« User »** et **« Assistant »** ; rendu Markdown (titres numérotés, gras, puces imbriquées, liens) ; streaming visible (artefacts `**5. Contact` avant rendu) |
| Métriques sous chaque réponse | trois pastilles : **⏱ 21.74s**, **↑ 478**, **↓ 509** (1er échange) ; **4.91s**, **↑ 994**, **↓ 76** (appel de fonction) ; inférence : durée, tokens d'entrée (historique compris), tokens de sortie |
| Actions au survol d'un message | crayon (modifier), copier, **régénérer ↻**, corbeille |
| **« Appel De Fonction »** | badge `escalate_to_support` ; à droite « ID ⧉ qbF8...3hAr » (identifiant d'appel tronqué) ; sous-titre « Arguments » ; JSON des arguments (copiable) |
| **« Résultat De Fonction »** | même ID ; contenu pré-rempli `{ "TODO": "[Généré automatiquement] Simulez la sortie de la fonction ici en modifiant ce message, puis cliquez sur Régénérer pour continuer." }` : **le playground n'exécute pas la fonction, il propose d'en simuler la sortie** |

Arguments produits par le modèle : `user_question` = « Je n'arrive pas à me connecter à mon compte Facebook » ; `reason` = « Problème de connexion non résolu après vérification des identifiants, du navigateur et des messages d'erreur. L'utilisateur a besoin d'une assistance technique approfondie. » ; `priority` = `high`.
Remarque : pendant l'escalade, l'URL porte un **autre** `conversationId` (`conv_019f23c4ef97748b80d6c6ed04390f66`) alors que le fil affiché contient toujours le premier échange (voir §9).

### 4.16 Menu ⋮ de l'agent

[`t16m46s`](sources/video-pentiminax/t16m46s.jpg)

| Entrée | Icône | État observé |
|---|---|---|
| Modifier les métadonnées de l'agent | crayon | — |
| Copier l'ID de l'agent | copier | — |
| Historique des versions | horloge | — |
| *(séparateur)* | | |
| Code | `<>` | (inférence : rouvre le panneau de code §4.6) |
| **Disponible dans Vibe** | case à cocher | **grisé/désactivé** tant que l'agent a une fonction personnalisée ; activable ensuite ; une fois cochée (rouge), une icône ⧉ apparaît à droite |
| Supprimer l'agent | corbeille rouge | — |

### 4.17 Déploiement sur Vibe

[`t16m48s`](sources/video-pentiminax/t16m48s.jpg) Modale **« Déployer l'agent sur Vibe »** : « Déployez votre agent sur Vibe afin que tous les membres de votre organisation puissent l'utiliser. » / « L'utilisation de cet Agent dans Vibe sera gratuite et ne sera pas facturée comme les appels API. » ; boutons « Annuler » et un bouton de confirmation (libellé illisible : spinner pendant le chargement). Toast : ✓ « **Agent ajouté avec succès à Vibe.** ». Ensuite, encadré « fonctions non disponibles » (§4.10 c).

### 4.18 Liste des agents — `/build/agents`

[`t16m28s`](sources/video-pentiminax/t16m28s.jpg)

| Élément | Détail |
|---|---|
| En-tête | « Agents » ; « Assistants IA spécialisés pour gérer des tâches et des cas d'utilisation spécifiques. » ; bouton **« + Créer un agent »** (noir) |
| Filtres | pastilles **« + Source »**, **« + Métadonnées »** |
| Outils | **« Colonnes 6 »** (choix des colonnes), champ **« Rechercher »** |
| Colonnes (triables ⇅) | **Nom de l'agent** (nom + description en gris ou « Aucune description »), **Source**, **Modèle**, **Créé le**, **ID API**, **Métadonnées** |
| Ligne 1 | Support Produit · `Playground` · `mistral-medium-latest` (pastille rouge) · « il y a 9 minutes » · `ag_0...9a4c` (copier) · `-` |
| Ligne 2 | GitHub Issue Assistant · `Playground` · `mistral-medium-latest` · « il y a 2 heures » · `ag_0...522c` · `-` |
| Chargement | squelettes gris animés |

### 4.19 Menu « Aide et ressources »

[`t14m10s`](sources/video-pentiminax/t14m10s.jpg)

| Section | Entrées (↗ = lien externe) |
|---|---|
| Documentation | Documentation ↗ ; **Modèles** ↗ (`https://docs.mistral.ai/getting-started/models`, qui aboutit sur `docs.mistral.ai/models/overview`) ; Documentation de l'API ↗ ; Guides pratiques ↗ ; Centre d'aide ↗ |
| Contact | Communauté Discord ↗ ; Nous contacter |
| Conditions et confidentialité | Conditions d'utilisation ↗ ; Politique de confidentialité ↗ |

### 4.20 Messages, toasts, erreurs et textes d'état

| Type | Texte exact | Contexte |
|---|---|---|
| Succès (modale) | « Agent créé avec succès » / « Votre agent a été créé. Voici comment l'utiliser : » | création |
| Toast | « Agent mis à jour avec succès » | enregistrement d'une version |
| Toast | « Agent ajouté avec succès à Vibe. » | déploiement |
| Erreur de validation | « Les paramètres doivent être en JSON valide: Unexpected end of JSON input » | schéma de fonction vide |
| Confirmation destructive | « Supprimer la fonction ? … Cette action est irréversible. » | suppression de fonction |
| Info | « Les fonctions personnalisées ne sont pas disponibles pour les agents déployés sur Vibe. » | agent déployé |
| Revue | « Cela créera une nouvelle version de votre agent. » ; « Aucune modification. » | modale de diff |
| Placeholder fonction | « [Généré automatiquement] Simulez la sortie de la fonction ici… puis cliquez sur Régénérer pour continuer. » | résultat de fonction |
| Quota | « 0% » · « Réinitialisé dans 29 jours » | carte du menu latéral |
| Vibe | « Nous n'avons trouvé aucun résultat pour votre recherche. » | agents partagés avant déploiement |

### 4.21 URLs et routes observées

| URL | Écran |
|---|---|
| `https://console.mistral.ai/home` | Accueil |
| `https://console.mistral.ai/build/agents` | Liste des agents |
| `https://console.mistral.ai/build/agents/new` | lien « Créer un Agent » (démarrage rapide) |
| `/build/playground?isCreateAgent=true&from=agents` | Playground + modale de création |
| `/build/playground?from=agents` | Playground sans agent |
| `/build/playground?from=agents&agentId=ag_…` (ou `?agentId=…&from=agents`) | Éditeur d'un agent |
| `…&conversationId=conv_…` | Conversation de test ouverte |
| `https://docs.mistral.ai/api` | lien « Requêtes API » |
| `https://docs.mistral.ai/getting-started/models` | lien « Aide et ressources › Modèles » |

Formats d'identifiants : `ag_` + 32 caractères hexadécimaux ; `conv_` + 32 hex ; les deux commencent par `019f23…` (inférence : UUIDv7 horodatés, triables par date). ID d'appel d'outil alphanumérique court (`qbF8…3hAr`).

---

## 5. API et SDK visibles dans la vidéo

**Endpoint montré** (onglet cURL de la modale de création) :
```bash
curl https://api.mistral.ai/v1/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MISTRAL_API_KEY" \
  -d '{"agent_id": "ag_019f23bde8eb750f8f131e870c939a4c",
       "agent_version": 0,
       "inputs": [{"role":"user","content":"Hello!"}]}'
```
**Python** (paquet `mistralai`) : `import os` ; `from mistralai.client import Mistral` ; `client = Mistral(api_key=os.environ.get("MISTRAL_API_KEY"))` ; `client.beta.conversations.start(agent_id=…, agent_version=0, inputs=inputs)` ; `print(response)`.
**TypeScript** (paquets `@mistralai/mistralai` et `dotenv`) : `dotenv.config()` ; `new Mistral({ apiKey: process.env.MISTRAL_API_KEY })` ; `await client.beta.conversations.start({ agentId, agentVersion: 0, inputs: messages })` ; `console.log(response)`.

Points notables : l'extrait **épingle la version** (`agent_version: 0`) au lieu de viser la dernière ; méthodes sous l'espace **`beta`** ; variable d'environnement standard `MISTRAL_API_KEY`.

**Correspondance UI → objet agent** (inférence, d'après la diapositive « anatomie » et la spec OpenAPI locale) :

| UI | Champ API probable |
|---|---|
| Nom / Description / Métadonnées | `name` / `description` / `metadata` |
| Modèle | `model` |
| temperature / max_tokens / top_p | `completion_args.temperature` / `.max_tokens` / `.top_p` |
| Effort de raisonnement | `completion_args.reasoning_effort` (enum `none`/`minimal`/`low`/`medium`/`high`) |
| Format de réponse | `completion_args.response_format` (`text` / `json_object` / `json_schema`) |
| Outils intégrés | `tools[]` de type `code_interpreter`, `image_generation`, `web_search`, `web_search_premium` |
| Fonctions | `tools[]` de type `function` → `function{name, description, strict, parameters}` |
| Instructions | `instructions` |
| Version | `agent_version` (entier) |

**Endpoints listés sur la fiche modèle « Mistral Small 4 »** (docs) : Chat Completions `/v1/chat/completions` ; Function Calling `/v1/chat/completions`, `/v1/conversations` ; Agents & Conversations `/v1/agents`, `/v1/conversations` ; Built-In Tools `/v1/agents`, `/v1/conversations` ; Structured Outputs, Predicted Outputs, Prefix, Document QnA `/v1/chat/completions`, `/v1/conversations` ; OCR, Annotations - Structured, BBox Extraction `/v1/ocr` ; FIM `/v1/fim/completions` ; Embeddings `/v1/embeddings` ; Moderations `/v1/moderations` ; Chat Moderations `/v1/chat/moderations` ; Transcriptions et Timestamps `/v1/audio/transcriptions` ; Text to Speech `/v1/audio/speech` ; Batching `/v1/batch` (en grisé : fonctions non prises en charge par ce modèle ; seuls Batching et les fonctions chat/agents sont actifs pour Small 4).

---

## 6. Écrans hors Studio montrés : modèles, tarifs, limites

### 6.1 docs.mistral.ai (version de juillet 2026)
- En-tête « Docs & API ▾ » ; onglets **Getting Started | Models | Products | Developers | Admin | API** ; « SEARCH DOCS ⌘K », globe (langue), thème clair/sombre, « Reach out », **« Try Studio → »**.
- **Models** (barre latérale) : HOME ; MODELS : Overview, Model Selection Guide, Best Practices (Prompting, Sampling), Deployment (Cloud ›, Self-Deployment ›), Labs.
- **Models Overview** : « A list of all our available models… » ; FEATURED MODELS : Mistral Medium 3.5, Mistral Small 4, Voxtral Mini Transcribe Realtime, Voxtral TTS (« zero-shot voice cloning »), OCR 4, Devstral 2 ; section « FRONTIER MODELS › Generalist ».
- **Model Selection Guide › « Compare Models »** : 3 sélecteurs (liste : Mistral Medium 3.5, Voxtral TTS, Mistral Small 4, Leanstral 1.5, Mistral Large 3, OCR 4, OCR 3, Voxtral Mini Transcribe 2, Voxtral Mini Transcribe Realtime…) ; cartes avec version (OCR 4 `v4.0`, Mistral Medium 3.5 `v26.04`, Mistral Small 4 `v26.03`), boutons « Learn more » et « Try in Playground » ; SPEED (OCR 4/4, Medium 2/4, Small 4/4), PERFORMANCE (OCR 4/4, Medium 4/4, Small 3/4) ; INPUT/OUTPUT par icônes ; prix : OCR 4 `$4/1000 Pages`, `$5/1000 Annotated Pages` ; Medium 3.5 `$1.5/M` entrée, `$7.5/M` sortie ; Small 4 `$0.15/M`, `$0.6/M` ; tableau FEATURES (✓ / grisé) ; ADDITIONAL INFO : IDS `mistral-ocr-4-0`, `mistral-medium-3-5`, `mistral-small-2603` ; LICENSE Modified MIT (Medium 3.5), Apache 2.0 (Small 4) ; PARAMETERS 128B / 119B ; ACTIVE 128B / 6.5B ; GPU RAM (GB) 256 - 64 / 238 - 60 ; liens « Learn more about this model ».
- **Fiche « Mistral Small 4 »** (`/models/model-cards/mistral-small-4-0-26-03`) : 16 mars 2026, badge OPEN, `v26.03` ; « hybrid model unifying instruct, reasoning, and coding… 119B parameters with 6.5B active » ; ID `mistral-small-2603` (+1 alias) ; boutons Compare / Legal ; CONTEXT **256k** ; PRICE $0.15 → $0.6 /M tokens ; onglets FEATURES / WEIGHTS ; « TRY IN PLAYGROUND ↗ ».
- **Products › Studio › Overview** (`/studio-api/overview`) : « Studio is Mistral's developer platform for AI applications. Use the API to build conversational AI, autonomous agents, document intelligence, and RAG applications. Use the console to manage reusable building blocks, manage keys, test models, and monitor usage. » ; tuiles STUDIO CAPABILITIES : Core API, Agent Tools, Document AI, Audio, RAG & Embeddings, Libraries, Connectors, Safety & Moderation, Batch processing ; GETTING STARTED : créer une clé API dans la console ou via la page API keys de **Admin**. Barre latérale STUDIO : Overview, Conversations ›, Agents (Agents Introduction, Agents & Conversations, Agent Tools ›, Handoffs), Connectors ›, Libraries, Document AI ›, Search Toolkit ›, Audio ›, Observability ›, Workflows ›, Moderation & Guardrailing, Batch Processing, RAG & Embeddings ›. Section VIBE : Overview, Choose Chat, Work, or Code, Work ›, Chat ›, Code ›.

### 6.2 Site mistral.ai
- FR : menu « Produits, Solutions, Modèles, Développeurs, Blog, Clients, Entreprise » ; **« Commencez ▾ »** → Studio, Vibe ›, Vibe for Code › ; « Contact › » ; accroche « L'IA de pointe. Sous votre contrôle. » ; menu Développeurs : Documentation, Référence d'API, Cookbooks ; actualité « Introducing Mistral OCR 4 ».
- EN : « Start building ▾ » (Studio, Vibe → `https://chat.mistral.ai`, Vibe for Code), « Contact sales », « Frontier AI. In your hands. »

### 6.3 Vibe (chat.mistral.ai) — côté consommateur de l'agent
- Barre latérale : « Vibe ▾ », onglets **Chat | Work | Code**, « Nouveau chat », « Agents », « Contexte », « Projets + », « Chats », pied « Personnel · Free », « Passez à Pro ».
- Champ « Tapez / pour un accès rapide » ; bouton « + » ; compteur d'outils « 3/4 » ; sélecteur de mode **Rapide** (« Idéal pour les tâches quotidiennes »), **Réflexion** (« Raisonnement approfondi »), **Recherche** (« Analyse approfondie avec plusieurs sources » ; « 5 sur 5 recherches restantes pour ce mois » en plan gratuit) ; micro.
- Menu « + » : Télécharger des fichiers, Connecteurs ›, Outils ›, Projets ›, Bibliothèques ›, Workflows ›, **Agents ›**, Réinitialiser l'entrée. Sous-menu Agents : « Rechercher », « + Nouvel Agent », filtres **Tous / Les miens / Partagés** ; l'agent Studio déployé apparaît sous **Partagés**.
- Agent sélectionné : bandeau orange « @GitHub Issue Assistant ▾ » + ✕ au-dessus du champ ; en-tête de réponse « Génération de la réponse » puis « Travail effectué pendant 1s » ; bouton flottant « Poser une question » sur sélection de texte ; mention « Vibe peut faire des erreurs. Vérifiez les réponses. En savoir plus ».

### 6.4 Limites et tarifs constatés
- Compte Studio : consommation **0 %** des limites, remise à zéro « dans 29 jours » (cycle mensuel, inférence), bouton « Activer Pay-per-use » (inférence : plan gratuit plafonné, passage au paiement à l'usage optionnel).
- Prix console en **€ / 1M tokens** (§4.8) ; prix docs en **$ / M tokens** (§6.1).
- Usage d'un agent dans Vibe : « gratuite et ne sera pas facturée comme les appels API ».
- Auteur : Web Search « gratuit… avec une certaine limite » (non vérifié à l'écran).

---

## 7. Conseils, bonnes pratiques, limites et erreurs rencontrées

**Conseils de l'auteur**
- Décrire précisément chaque fonction : la description sert à l'agent pour savoir **quand** l'appeler et améliore la précision.
- Nommer les fonctions en `snake_case` (`escalate_to_support`).
- Pour un support : `max_tokens` bas (700 plutôt que 3400) pour des réponses courtes, « simple, clair et concis » ; température 0.5 pour des réponses « naturelles mais contrôlées ».
- Activer la génération de code si le produit est technique ; l'image seulement pour des schémas.
- Format JSON quand la sortie alimente un autre programme.
- Instructions : définir l'identité (« Tu es… »), le rôle, ce qu'il a le droit de faire, le style de réponse ; éventuellement un livrable (rapport).
- Choix de modèle : comparer coût et vitesse (Medium cher ; Small et Tiny moins chers) via le Model Selection Guide, ou demander conseil à une IA.
- Préférer des agents spécialisés mono-tâche aux LLM généralistes.

**Limites et erreurs rencontrées**
1. **JSON invalide** : valider la modale fonction avec le placeholder en place déclenche « Unexpected end of JSON input » (le placeholder n'est pas pré-rempli).
2. **Fonctions non exécutées dans Studio** : l'appel est généré mais le résultat est un « TODO » à simuler à la main, puis « Régénérer » ; l'exécution réelle demande un programme côté client.
3. **Agent introuvable dans Vibe** tant qu'il n'est pas marqué « Disponible dans Vibe ».
4. **Incompatibilité Vibe / fonctions personnalisées** : l'option est désactivée tant qu'une fonction existe ; il faut supprimer la fonction (action irréversible), enregistrer une nouvelle version, puis déployer.
5. **Effort de raisonnement** limité à deux niveaux dans l'UI.
6. Petits accidents de démo : clavier qui ne répond pas lors de la saisie de `top_p` ; lapsus « le prix est beaucoup plus cher » à propos de Small, alors qu'il est moins cher.
7. Imprécisions de l'auteur : `max_tokens` présenté comme un « nombre de mots » ; « Recherche » et « Recherche Premium » présentées comme exclusives (« soit l'un, soit l'autre ») sans démonstration.

---

## 8. Ce que la vidéo révèle de l'organisation de Studio

- **Deux niveaux de rattachement** : Organisation (« Personnel ») › Workspace (« Default Workspace »), sélectionnables dans la barre supérieure ; les agents sont donc rattachés à un workspace (inférence).
- **Menu en deux familles** : **« Créer »** (Agents, Audio, Batches, Document AI, Workflows : ce qui produit) et **« Contexte »** (Connecteurs, Connaissances, Prompts, Skills : ce qui alimente les agents). Prompts, Skills et Bibliothèques sont des ajouts récents (`New`).
- **Espace de routes `/build/…`** pour les objets de construction (`/build/agents`, `/build/playground`) ; les paramètres de requête (`from`, `agentId`, `conversationId`, `isCreateAgent`) pilotent l'état du playground (inférence : application monopage à état dans l'URL).
- **Playground = éditeur d'agent** : un agent est une **configuration du playground figée et nommée** (« Créer un nouvel agent avec les paramètres actuels ») ; la même page sert à l'essai libre et à l'édition (inférence).
- **Versionnage immuable** : chaque enregistrement crée une version entière (v0 à la création), avec diff Instructions / Configuration, description de version facultative, historique, « Rétablir cette version », badge « Dernière ». Le code fourni épingle la version (inférence : l'API permet de cibler une version précise ou la dernière).
- **Origine des agents** : colonne « Source » = « Playground » (inférence : d'autres sources existent, par exemple l'API ou Vibe).
- **Conversations de test persistées** côté serveur (`conv_…` dans l'URL, icône d'historique) : cohérent avec les « Conversations » présentées comme pilier (inférence).
- **Studio → Vibe** : publication d'un agent pour toute l'organisation ; dans Vibe, il apparaît sous « Partagés » ; usage non facturé ; les fonctions personnalisées sont exclues, faute d'exécuteur côté Vibe (inférence) ; les outils intégrés (Code, Recherche) et l'effort de raisonnement restent.
- **Catalogue de modèles** organisé par alias `-latest` (principal), versions datées et Labs (« Plus »), modèles hérités (« Anciens ») ; prix et alias affichés au survol directement dans le sélecteur.
- **Monétisation** : carte de quota mensuel dans le menu, « Activer Pay-per-use » ; tarifs du sélecteur en euros.
- **Localisation partielle** : interface en français, mais « Playground », « Batches », « Workflows », « Skills », « Code », « JSON-Schema », « New », descriptions de modèles en anglais ; casse anglaise « Appel De Fonction » / « Résultat De Fonction » (inférence : traduction automatique ou partielle).
- Ce qui n'apparaît pas dans l'éditeur d'agent : choix d'une **bibliothèque** (Document Library), de **connecteurs** MCP, de **handoffs**, de `tool_choice` et des autres `completion_args` (inférence : réglables ailleurs ou seulement par API à cette date).

---

## 9. Questions ouvertes / incohérences relevées

1. **Prix incohérents** entre console et docs : Medium 2,30 € / 6,89 € (console) contre $1.5 / $7.5 (docs) ; Small 0,13 € / 0,51 € contre $0.15 / $0.6 (conversion plausible pour Small, pas pour Medium).
2. **Alias de `mistral-medium-latest`** : regroupe `mistral-medium-3`, `mistral-medium-3-5`, `mistral-medium-3.5` et `mistral-medium-2604` ; ambiguïté sur la version réellement servie.
3. **`strict` activé par défaut dans l'UI** alors que la spec OpenAPI `Function.strict` a pour défaut `false`.
4. **Effort de raisonnement** : 2 valeurs dans l'UI contre 5 dans l'enum API ; correspondance exacte d'« Élevé » non confirmée.
5. **Changement de `conversationId`** (`conv_…fd42a` → `conv_…0f66`) entre le premier échange et l'escalade, alors que le fil affiché est continu : branchement ou redémarrage de conversation ? (non expliqué).
6. **Bornes de `max_tokens`** non lues (≈ 4096 déduit de la position du curseur) ; minimum de `temperature`/`top_p` supposé à 0.
7. **Document Library et connecteurs** présentés dans les diapositives comme outils d'agent, mais absents de la carte « Outils intégrés » de l'éditeur.
8. **Exclusivité Recherche / Recherche Premium** affirmée par l'auteur, non démontrée.
9. **Contenu de l'onglet « Configuration »** de la modale de diff jamais affiché (format JSON ? champs ?).
10. Rôle du **« + »** à côté du badge de version, du sélecteur **« Studio ▾ »**, du menu **« Exemples »** de la modale fonction et de la **case** à côté de chaque fonction : non montrés.
11. Libellé du bouton de confirmation de la modale « Déployer l'agent sur Vibe » illisible (spinner).
12. Import Python affiché `from mistralai.client import Mistral` : à confronter au chemin documenté du SDK.
13. Diapositives générées par NotebookLM : leur contenu (noms d'outils, `tool_reference`, `file_id`, `message.output`/`tool.execution`) provient d'une synthèse automatique et doit être recoupé avec la doc (chapitres API).

---

## Annexe A — Images de référence copiées (25)

Dossier `sources/video-pentiminax/` (les noms donnent l'horodatage ; celles marquées * viennent des images brutes, renommées selon leur horodatage).

| Image | Contenu |
|---|---|
| [`t02m14s.jpg`](sources/video-pentiminax/t02m14s.jpg) | Diapositive « Les trois piliers » (Agents, Conversations, Entries) |
| [`t02m58s.jpg`](sources/video-pentiminax/t02m58s.jpg) | Diapositive « Anatomie d'un agent » (`model`, `name`, `instructions`, `tools`, `completion_args`) |
| [`t04m06s.jpg`](sources/video-pentiminax/t04m06s.jpg) | Diapositive « Boîte à outils » (noms d'outils, environnement d'exécution) |
| [`t06m58s.jpg`](sources/video-pentiminax/t06m58s.jpg) | Accueil console, menu latéral complet, carte de quota |
| [`t07m02s.jpg`](sources/video-pentiminax/t07m02s.jpg) | Modale « Créer un agent » |
| [`t07m04s.jpg`](sources/video-pentiminax/t07m04s.jpg) | Playground nu, valeurs par défaut, boutons Code / Créer un agent |
| [`t07m30s.jpg`](sources/video-pentiminax/t07m30s.jpg) | « Agent créé avec succès » : ID + cURL |
| [`t07m42s.jpg`](sources/video-pentiminax/t07m42s.jpg) | Même modale, onglet Python |
| [`t08m38s.jpg`](sources/video-pentiminax/t08m38s.jpg) | Popover des curseurs + infobulle `top_p` |
| [`t09m06s.jpg`](sources/video-pentiminax/t09m06s.jpg)* | Infobulle `max_tokens`, icônes ↺ |
| [`t09m44s.jpg`](sources/video-pentiminax/t09m44s.jpg) | Fonctionnalités dépliées (outils, raisonnement, fonctions) |
| [`t11m02s.jpg`](sources/video-pentiminax/t11m02s.jpg) | Modale « Ajouter une fonction » (Strict, schéma JSON) |
| [`t11m30s.jpg`](sources/video-pentiminax/t11m30s.jpg) | Erreur « Unexpected end of JSON input » |
| [`t11m58s.jpg`](sources/video-pentiminax/t11m58s.jpg)* | Format de réponse Texte / JSON / JSON-Schema + infobulle JSON |
| [`t12m48s.jpg`](sources/video-pentiminax/t12m48s.jpg) | « Vérifiez vos modifications » (diff v0 → v1) |
| [`t13m34s.jpg`](sources/video-pentiminax/t13m34s.jpg) | Réponse de l'agent + métriques durée/tokens |
| [`t13m50s.jpg`](sources/video-pentiminax/t13m50s.jpg)* | Sélecteur de modèles, carte prix et alias de `mistral-medium-latest` |
| [`t14m10s.jpg`](sources/video-pentiminax/t14m10s.jpg)* | Menu « Aide et ressources » |
| [`t15m18s.jpg`](sources/video-pentiminax/t15m18s.jpg)* | Appel de fonction, arguments, résultat simulé « TODO » |
| [`t16m28s.jpg`](sources/video-pentiminax/t16m28s.jpg) | Liste des agents (colonnes, filtres) |
| [`t16m40s.jpg`](sources/video-pentiminax/t16m40s.jpg) | Agent GitHub : Code + Recherche, effort Élevé, fonction `create_github_issue_comment` |
| [`t16m46s.jpg`](sources/video-pentiminax/t16m46s.jpg) | Menu ⋮ de l'agent (Historique des versions, Code, Disponible dans Vibe…) |
| [`t16m48s.jpg`](sources/video-pentiminax/t16m48s.jpg) | Modale « Déployer l'agent sur Vibe » |
| [`t16m50s.jpg`](sources/video-pentiminax/t16m50s.jpg) | Toast de déploiement + « fonctions non disponibles » |
| [`t16m54s.jpg`](sources/video-pentiminax/t16m54s.jpg) | Vibe : menu « + › Agents › Partagés » |

## Annexe B — Couverture : les 138 images examinées

Toutes les images de `frames/` ont été ouvertes ✅ dans l'ordre chronologique et croisées avec la transcription. En complément, des **planches de contact des images brutes** (`raw/`) ont servi à capter les états fugaces (infobulles, listes déroulantes, cartes de prix des modèles, menu ⋮, menu d'aide, modes Vibe) ; un balayage automatique par différence d'images a repéré 45 images brutes mal représentées par le dédoublonnage, toutes vérifiées. Recadrages agrandis dans `video/zoom/` du scratchpad.

| Images | Contenu |
|---|---|
| t00m00s | Diapositive titre NotebookLM |
| t00m28s | Transition vers la diapositive 2 |
| t00m30s, t01m16s | « Au-delà du texte statique » (4 limites des LLM) |
| t01m34s | Transition |
| t01m36s | « Qu'est-ce qu'un Agent IA ? » |
| t02m14s | « Les trois piliers de l'architecture Mistral » |
| t02m58s, t03m44s | « L'anatomie d'un Agent » |
| t04m06s, t04m52s, t05m38s | « La boîte à outils Mistral » (tableau) |
| t05m48s | Transition |
| t05m50s | « Outils intégrés : l'information et la création à la volée » |
| t06m12s | « Code Interpreter : le moteur analytique sécurisé » |
| t06m28s | Accueil console (Agents replié) |
| t06m32s | mistral.ai/fr, menu Développeurs, encart Vibe |
| t06m34s | Suggestions de la barre d'adresse (URLs console, mistral-vibe CLI) |
| t06m36s | Recherche Google « mistral ai » |
| t06m40s | mistral.ai/fr, menu « Commencez » |
| t06m42s | Console en chargement |
| t06m44s | Accueil console |
| t06m52s | Accueil défilé (Démarrage rapide, Documentation) |
| t06m58s | Accueil, haut de page |
| t07m02s, t07m06s, t07m08s | Modale « Créer un agent » (vide) |
| t07m04s | Playground nu (valeurs par défaut) |
| t07m30s | « Agent créé avec succès », onglet cURL |
| t07m40s, t07m44s | Onglet TypeScript |
| t07m42s, t07m46s | Onglet Python (ID surligné en t07m46s) |
| t07m54s | Éditeur v0 (vide) |
| t08m38s | Popover des curseurs + infobulle top_p |
| t08m52s | top_p 0,85, bouton Enregistrer actif |
| t09m38s | 0,5 / 700 / 0,9 + infobulle temperature |
| t09m44s | Fonctionnalités dépliées |
| t10m18s | Recherche activée, infobulle Image |
| t10m22s, t10m26s | Fonctionnalités (Recherche active) |
| t11m02s | Modale « Ajouter une fonction » vide |
| t11m30s | Nom et description saisis, erreur JSON |
| t11m32s | Schéma JSON collé |
| t11m46s | Fonction `escalate_to_support` listée |
| t11m50s | Liste déroulante Format de réponse |
| t12m04s | Réouverture de la fonction (JSON reformaté, corbeille) |
| t12m06s | Retour à l'éditeur, instructions vides |
| t12m48s | Modale « Vérifiez vos modifications » v0 → v1 |
| t12m52s | Toast « Agent mis à jour avec succès » |
| t13m02s | Badge v1 • Dernière |
| t13m14s | Premier message, conversationId dans l'URL, streaming |
| t13m20s, t13m22s, t13m24s, t13m26s, t13m28s, t13m30s, t13m32s | Streaming de la réponse Markdown |
| t13m34s | Réponse complète + métriques |
| t14m00s | mistral.ai/fr, menu « Commencez » |
| t14m02s | Model Selection Guide (Compare Models) |
| t14m04s | Sélecteur de modèles ouvert (début de liste) |
| t14m12s | Models Overview (Featured Models) |
| t14m14s, t14m22s, t14m24s | Guide : prix et caractéristiques |
| t14m32s, t14m36s, t14m40s | Guide : tableau FEATURES |
| t14m34s | Menu contextuel Chrome sur une icône |
| t14m42s, t14m52s | Guide : ADDITIONAL INFO, « Learn more about this model » |
| t14m44s, t14m50s | Fiche modèle Mistral Small 4 (features, endpoints) |
| t14m54s | Guide, haut de page |
| t15m00s, t15m02s, t15m04s | Conversation (actions au survol d'un message) |
| t15m10s | « Escalade le support » envoyé, chargement |
| t15m12s | Appel de fonction en streaming + résultat TODO |
| t15m22s | Modale de la fonction rouverte (clés réordonnées) |
| t15m26s | Arguments complets + métriques |
| t15m32s, t15m34s | Défilement de la conversation complète |
| t15m38s | Liste des agents (chargement) |
| t15m42s | Éditeur GitHub Issue Assistant v2 (vue compacte) |
| t15m46s | Nouvel onglet daily.dev (hors sujet) |
| t15m48s | Packagist pentiminax/ux-datatables (hors sujet) |
| t15m50s, t15m56s | Éditeur GitHub (URL sélectionnée) |
| t15m58s, t16m00s | mistral.ai (EN), « Start building » |
| t16m02s | Vibe, accueil |
| t16m18s | Docs « Studio » (Products › Studio › Overview) |
| t16m20s | Docs Model Selection Guide (changement d'onglet) |
| t16m22s | Console en chargement |
| t16m24s | Accueil console |
| t16m26s | Liste des agents (squelette) |
| t16m28s | Liste des agents |
| t16m30s | Infobulle « Fonctions — 1 fonction personnalisée » |
| t16m40s | Fonctionnalités GitHub dépliées, infobulle Élevé |
| t16m42s | Modale « Supprimer la fonction ? » |
| t16m44s | Diff v2 → v3 (« Aucune modification. ») |
| t16m46s | Menu ⋮, toast, v3 |
| t16m48s | Modale « Déployer l'agent sur Vibe » |
| t16m50s | Toast Vibe + encadré fonctions |
| t16m54s | Vibe, menu « + › Agents › Partagés » |
| t17m00s | Vibe, bandeau @GitHub Issue Assistant |
| t17m04s | Éditeur GitHub v3 |
| t17m14s | Dépôt GitHub ux-datatables (hors Studio) |
| t17m16s | Issues GitHub (hors Studio) |
| t17m22s | Vibe, saisie |
| t17m28s | Vibe, lien de l'issue envoyé |
| t17m30s | Vibe, génération |
| t17m34s | Éditeur GitHub (instructions) |
| t17m38s | Vibe, réponse (résumé de l'issue) |
| t17m42s, t17m50s | Éditeur GitHub (outils, encadré fonctions) |
| t17m46s | Vibe, « Solution proposée », bouton « Poser une question » |
| t17m48s, t17m54s, t17m56s, t17m58s, t18m00s, t18m02s, t18m04s, t18m06s, t18m08s, t18m10s, t18m12s, t18m14s, t18m16s, t18m18s, t18m20s, t18m22s, t18m24s | Vibe, défilement de la réponse (réponse du mainteneur, informations manquantes, piste technique, réponse suggérée) |
| t18m28s | Liste des agents, menu latéral Audio / Connaissances déplié |
