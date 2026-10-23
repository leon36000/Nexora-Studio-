# Nexora WorkStudio v2 — conception

> **Statut** : décisions de l'architecte, 23/10/2026. Le fondateur a délégué toutes les décisions : « tu es l'architecte en chef du projet et tu dois faire le plus abouti des projets, ainsi que simplifier, faciliter, mais en aucune façon le rendre moins puissant, bien au contraire ; commence et ne t'arrête plus ». Rien ici n'a été validé point par point par lui ; chaque choix est un choix de l'architecte.
>
> **Sources** : analyse d'écart du 23/10/2026 (code de la v1 face à la base de connaissances `docs/recherche/mistral-studio/`), synthèse `00-synthese.md`, ledger v1.

## 1. Intention

Nexora vend aux PME françaises l'équivalent de Mistral Studio (construire, déployer, observer, gouverner des agents et des automatisations), mais **installé chez elles, en français, sans code et sans fichier de configuration à éditer**. La v1 a livré la base : WorkStudio (fork de Sim) traduit et rebaptisé, Nexora API, Nexora Connect, installation en une commande.

La v2 transforme cette base en **produit qu'un dirigeant de PME prend en main seul en une heure**, sans perdre aucune puissance : tout ce qui est possible dans l'éditeur reste possible, mais les parcours courants deviennent des formulaires guidés.

**Ce que les clients reprochent à Mistral** (base de connaissances, chapitre 37) est notre cahier des charges : quotas et limites opaques, facturation incompréhensible, pas d'interface pour les workflows, pas de no-code, pas de documentation en français pour non-développeurs. Notre argument reste la **souveraineté** : tout tourne chez le client, sur ses modèles.

## 2. Objectifs, non-objectifs, anti-objectifs

**Objectifs**
1. Tout ce qui est visible dans l'interface **fonctionne** sur une installation neuve, sans clé tierce.
2. **Aucun réglage courant** ne demande d'éditer `deploy/.env` ni d'ouvrir une console séparée : modèles, e-mail, connexion unique, connecteurs, équipe se règlent dans WorkStudio.
3. Les parcours de Mistral Studio existent en mieux : **Accueil**, **Playground**, **Agents** sans code, **Modèles**, **Clés API**, **Connecteurs**, **Consommation**, **Assistant** pour les salariés.
4. **100 % français** partout où un utilisateur ou un client final regarde, e-mails compris.
5. Aucune régression de la v1 : tests, audits, contrôles du dépôt, test de fumée restent verts.

**Non-objectifs (v2)** : fine-tuning (Mistral l'a lui-même déprécié), batch à −50 %, agents vocaux temps réel (SIP, LiveKit), facturation et paiement en ligne (Nexora ne fixe pas encore de prix), Temporal / workflows en code Python.

**Anti-objectifs** — la v2 échoue si :
- une fonction devient **moins puissante** pour simplifier (on ajoute des parcours guidés, on ne retire rien de l'éditeur) ;
- une donnée client sort de l'installation sans action explicite (clé tierce saisie par l'admin) ;
- on réintroduit du code `ee/` d'origine de Sim ;
- l'installation cesse de tenir en une commande.

## 3. Contraintes (inchangées depuis la v1)

- Jamais de code `apps/sim/ee/` d'origine : modules en salle blanche seulement (`scripts/check-no-ee.sh`).
- next-intl, français par défaut, `scripts/check-i18n.sh` étendu à chaque nouveau dossier.
- Marque Nexora (`scripts/check-brand.sh`), licences (`scripts/check-licenses.sh`).
- Conventions du dépôt Sim (`workstudio/CLAUDE.md`, `.claude/rules/*`) : contrats d'API, React Query, emcn, imports absolus, audits.
- Pas de secret dans Git. Envoi sur GitHub des travaux vérifiés (`main`), sans redemander.
- Images multi-architecture ; sur pc6 : arm64, CPU (pas de GPU dans Docker).

## 4. Feuille de route

Chaque jalon est livrable seul, testé, poussé, et ajoute ses contrôles au test de fumée. L'ordre suit le levier pour un client qui découvre le produit.

| Jalon | Contenu | Taille |
|---|---|---|
| **J1 — Tout marche** | cron, embeddings et reranking souverains, Nexora par défaut partout, bac à sable Python local, recherche web sans clé, SMTP, liens morts, restes d'anglais | M |
| **J2 — Modèles** | écran Réglages › Modèles sur l'API d'admin de Nexora API : ajouter Mistral / compatible OpenAI / Ollama (téléchargement depuis l'interface), modèle par usage (chat, embeddings, vision/OCR, transcription), test | M |
| **J3 — Accueil et premier lancement** | page d'Accueil façon Studio (Créer / Capturer / Démarrages rapides), assistant de premier lancement (organisation, modèle, équipe, outils, premier modèle PME) | M |
| **J4 — Playground et Agents** | Playground (modèle, paramètres, comparaison) ; constructeur d'agent sans code (formulaire → workflow), versions et diff, test, publication | M-G |
| **J5 — Connecteurs en un clic** | catalogue Nexora Connect dans WorkStudio, connexions par utilisateur / espace, OAuth par applications de l'opérateur, clés API | G |
| **J6 — Assistant Nexora** | chat interne des salariés (équivalent Vibe Work) : agents et workflows publiés, conversations, fichiers, connaissances | G |
| **J7 — Copilote** | « décrivez votre automatisation » → workflow généré par le modèle Nexora, éditable | G |
| **J8 — Consommation, budgets, CO2** | ventilation utilisateur / espace / modèle, plafonds, empreinte carbone affichée | M |
| **J9 — Gouvernance dans l'interface** | contrôle d'accès (groupes de permissions sur le moteur existant), SSO et e-mail réglables dans l'interface | M |
| **J10 — Document AI et voix** | fournisseur « Nexora » pour OCR (modèle vision) et transcription dans les blocs et les connaissances | M |
| **J11 — Exploitation** | HTTPS automatique (Caddy), sauvegarde et restauration dans `nexora`, mise à jour sûre | M |

Les jalons J1 à J3 sont décrits en détail ci-dessous ; les suivants recevront leur conception détaillée (dans ce même fichier, section 8) au moment de les commencer.

## 5. J1 — Tout marche

**But** : sur une installation neuve, chaque bloc et chaque écran visible fonctionne sans clé tierce.

1. **Cron.** Ajouter le service planificateur au compose (`nexora/cron`, construit depuis le Dockerfile cron de Sim s'il existe, sinon une image minimale `supercronic` + `workstudio/docker/crontab`), avec `CRON_SECRET` déjà généré par `init-env.sh`. Effet : planifications, polling (Gmail, Outlook, IMAP), reprise des blocs Attente / validation humaine, outbox, synchronisation des connaissances. Test de fumée : un workflow planifié chaque minute s'exécute.
2. **Embeddings et reranking souverains.**
   - Nexora API : deuxième routeur `nexora-embed` (type embeddings). Choix « local » : modèle `bge-m3` (1024 dimensions) servi par l'Ollama de Nexora ; choix « Mistral » : `mistral-embed` (1024) ; choix « autre » : `NEXORA_EMBED_*` facultatif, sinon `bge-m3` local si Ollama est présent.
   - WorkStudio : fournisseur d'embeddings « Nexora » dans `lib/embeddings/catalog.ts` (OpenAI-compatible, base `VLLM_BASE_URL`, clé de l'amorçage), **par défaut** pour les nouvelles bases de connaissances ; colonne `embedding_1024` existante. Reranking : via Nexora API si un modèle de rerank est configuré, sinon désactivé proprement (pas d'erreur).
   - L'amorçage donne au rôle `workstudio` l'accès illimité au nouveau routeur (déjà générique).
   - Test de fumée : créer une base de connaissances, y déposer un texte, retrouver un passage.
3. **Nexora par défaut partout.** Router, Evaluator, Guardrails (hallucination), « Générer avec l'IA » (`app/api/wand`), titres et résumés automatiques : modèle Nexora par défaut et appel via Nexora API. Règle générale : tout appel de modèle interne passe par un utilitaire unique `resolveNexoraModel()` quand `NEXORA_ONLY_MODELS` est actif.
4. **Bac à sable Python et Shell locaux.** Les blocs Function (Python, Shell) exigent E2B ou Daytona. Choix de l'architecte : un service `sandbox` local optionnel n'est **pas** dans le périmètre J1 (risque sécurité, isolation à concevoir) ; en J1 les langages indisponibles sont **masqués ou signalés en français** avec la raison, JavaScript reste (isolated-vm). Bac à sable local : jalon ultérieur (section 8).
5. **Recherche web sans clé.** Le bloc Search (Exa, payant) est masqué si aucune clé ; recherche web via un service **SearXNG** optionnel (profil compose `search`) exposé comme outil et comme fournisseur du bloc Search. Choix de l'architecte : SearXNG proposé par l'installateur, désactivé par défaut (voir 8bis.6).
6. **E-mail.** Exposer le fournisseur SMTP existant (`lib/messaging/email/providers/smtp.ts`) : variables `NEXORA_SMTP_*` dans `.env.example` et le compose ; question facultative de l'installateur. (Réglage dans l'interface : J9.)
7. **Liens morts et restes d'anglais.** Supprimer ou corriger « Clés gérées » (self-host), traduire chat public, invitation, reprise, e-mails, titres Skills, libellés des blocs (ajout de `blocks/` à `i18n-covered-dirs.txt` avec un mécanisme de traduction des métadonnées de blocs), messages `ee/_nexora/disabled.ts`, descriptions d'audit.
8. **Aide en français.** `docsUrl()` renvoie vers des pages précises du guide (et non l'index) pour les écrans principaux ; le guide gagne une page par écran principal.

**Terminé quand** : test de fumée étendu (planification, base de connaissances, Router/Evaluator, e-mail via un serveur SMTP de test, recherche web) vert sur pc6 ; `check-i18n` couvre blocs, chat, e-mails ; tous les contrôles v1 verts.

## 6. J2 — Modèles

**But** : choisir et changer ses modèles dans l'interface, comme dans le sélecteur de Mistral Studio, sans toucher `deploy/.env`.

- **Écran Réglages › Modèles** (organisation, admins seulement) :
  - liste des modèles Nexora (routeurs Nexora API) avec usage (Discussion, Embeddings, Vision/OCR, Transcription), fournisseur, état (test en direct), consommation du mois ;
  - **Ajouter un modèle** : assistant en 3 étapes — source (Mistral AI avec clé ; service compatible OpenAI ; **modèle local** Ollama) → modèle (liste récupérée chez le fournisseur ; pour Ollama, catalogue de modèles recommandés pour PME en français avec taille et mémoire nécessaire, téléchargement avec progression) → nom affiché et usage ;
  - **Modèle par défaut** par usage ; changer le modèle d'un routeur sans casser les workflows (le nom Nexora reste, le fournisseur change).
- **Backend** : routes WorkStudio `/api/nexora/models/*` (contrats, `require` admin d'organisation d'instance) qui appellent l'API d'admin de Nexora API (`/v1/admin/routers`, `/v1/admin/providers`) avec un **jeton admin dédié** remis par l'amorçage dans un fichier séparé (lisible par WorkStudio seulement) ; téléchargement Ollama via l'API d'Ollama (`/api/pull` en flux) exposée à WorkStudio sur le réseau interne.
- **Liste des modèles dans les blocs** : construite dynamiquement depuis Nexora API (plus seulement `nexora-default`).
- La source de vérité devient Nexora API ; l'amorçage ne réécrit le fournisseur que si `deploy/.env` change (comportement v1 conservé, empreinte).

**Terminé quand** : depuis l'interface, ajouter un second modèle Ollama, le tester, l'utiliser dans un bloc Agent, définir un modèle d'embeddings ; tests unitaires des routes et du client admin ; test de fumée étendu.

## 7. J3 — Accueil et premier lancement

- **Accueil** (`/workspace/[id]/home` devient la page d'arrivée) : cartes **Créer** (Agent, Workflow, Assistant), **Capturer** (Document, Transcription — actives quand J10 livré, sinon masquées), **Démarrages rapides** (les modèles PME, inviter l'équipe, connecter un outil), état de la plateforme (modèle actif, consommation du mois, dernières exécutions).
- **Premier lancement** (propriétaire, une fois) : 5 étapes passables — nom et logo de l'organisation, modèle (raccourci vers J2), inviter l'équipe (e-mails, domaine), connecter un premier outil (raccourci vers Nexora Connect), choisir un premier modèle PME et le lancer. Progression mémorisée par organisation.
- **Aide contextuelle** : chaque écran principal a un bouton « Aide » vers la page du guide correspondante.

**Terminé quand** : un compte neuf atterrit sur l'Accueil, le premier lancement mène à une exécution réussie d'un modèle PME ; tests de composants et test de fumée (la page d'accueil répond et contient les cartes).

## 8. Jalons suivants (conception détaillée à venir)

À détailler ici au démarrage de chaque jalon, avec la même structure (but, parcours, backend, terminé quand). Éléments déjà décidés :
- **J4** : un « Agent » est un workflow gabarit (déclencheur Chat + bloc Agent + outils + connaissances) édité par formulaire ; versions = déploiements existants ; « Ouvrir dans l'éditeur » garde toute la puissance.
- **J6** : l'Assistant s'appuie sur l'infrastructure de chat déployé de Sim (et non sur LibreChat) pour rester dans une seule application et une seule session ; il liste les agents et workflows publiés de l'espace.
- **J7** : le copilote d'origine de Sim dépend d'un service fermé ; le nôtre génère un workflow (JSON du format d'import de Sim) avec le modèle Nexora en sortie structurée, validé par le schéma des blocs, puis l'importe.
- **Bac à sable local** (Python/Shell) : conteneur dédié sans réseau, ressources limitées, à concevoir avec soin (sécurité).

## 8bis. Décisions complémentaires (relecture « constructeur », 23/10/2026)

Questions soulevées par un relecteur chargé de planifier ; tranchées par l'architecte (délégation du fondateur). Elles priment sur les sections 5 à 7.

1. **Ollama est un service permanent** du compose (plus un profil) sur toute installation : il sert l'embedding local et la source « modèle local » de J2. L'installateur (et `nexora update`) télécharge `bge-m3` en plus du modèle de discussion local éventuel ; les threads sont limités comme en v1. Un Ollama de l'hôte atteint par le choix « compatible OpenAI » n'est qu'un fournisseur comme un autre : J2 gère l'Ollama fourni. Les connaissances ont donc toujours un modèle d'embeddings ; le cas « aucun embedding » n'existe plus.
2. **Un modèle d'embeddings = un routeur Nexora API dédié et stable** (ex. `nexora-embed-bge-m3`, `nexora-embed-mistral`). Une base de connaissances reste liée au routeur de sa création ; le « modèle d'embeddings par défaut » ne s'applique qu'aux nouvelles bases. J2 **refuse** de changer le fournisseur d'un routeur d'embeddings utilisé par une base (message en français), pour ne jamais mélanger des vecteurs incompatibles de même dimension. La réindexation complète d'une base vers un autre modèle est un jalon ultérieur.
3. **Traduction des blocs en J1** : textes complets (titre, description, libellés, aides) des blocs cœur — Agent, Router, Evaluator, Condition, Function, API, Réponse, déclencheurs (manuel, chat, API, planification, webhook), Attente, Validation humaine, Boucle, Parallèle, Connaissances, Mémoire, Guardrails, Variables, Workflow, Table, Fichier, Search, Thinking — couverts par `check-i18n` ; pour les ~370 blocs d'intégration, **titre et description seulement** (traduits par lot, relus par échantillon) ; leurs paramètres restent en anglais en J1 et sont exclus de `check-i18n` par une liste explicite, à résorber par lots ensuite.
4. **Modèle par défaut = alias.** `nexora-default` devient un **alias** Nexora API (champ `aliases` des routeurs), porté par le routeur de discussion choisi comme défaut. J2 « modèle par défaut » déplace l'alias : les blocs et workflows qui utilisent `nexora-default` suivent ; un modèle choisi explicitement dans un bloc reste fixé. Source de vérité : Nexora API. `NEXORA_DEFAULT_MODEL` ne sert plus qu'à l'amorçage initial. `resolveNexoraModel(usage)` (J1) renvoie `nexora-default` pour la discussion et le routeur d'embeddings par défaut pour les embeddings ; J2 l'étend sans changer son contrat.
5. **J3, étape « équipe »** : invitations seulement (e-mail si un service d'e-mail est configuré, sinon lien d'invitation à copier). Les domaines autorisés réglables dans l'interface sont reportés à J9.
6. **SearXNG est désactivé par défaut** : l'installateur le propose (question, « non » par défaut ; `NEXORA_WEB_SEARCH=1` en mode `--yes`) en expliquant que les requêtes partent vers des moteurs de recherche publics. Le bloc Search sans fournisseur est masqué. Choix motivé par l'anti-objectif de souveraineté.

Points que l'exécutant tranche sans revenir à l'architecte (constatés par le relecteur) : reranking désactivé proprement (Nexora API ne reranke que via TEI/vLLM/Albert) ; renommer l'organisation d'instance ne change que le nom affiché (le slug la retrouve) ; l'Accueil remplace la page `/home` actuelle (chat d'origine masqué) ; la carte « Assistant » est masquée jusqu'à J6, comme « Capturer » jusqu'à J10.

## 8ter. J2 — conception détaillée (23/10/2026, architecte)

Précise la section 6 et 8bis.4 ; ces décisions priment.

**Modèle par défaut = alias (8bis.4 confirmé).** Nexora API ne renvoie jamais la clé d'un fournisseur : on ne peut donc pas « recopier » un fournisseur dans `nexora-default`. Chaque modèle est un routeur nommé d'après son modèle (ex. `qwen2.5:7b`, `mistral-small-latest`) ; le modèle par défaut est celui qui porte l'**alias** `nexora-default`. « Définir par défaut » retire l'alias de l'ancien routeur puis l'ajoute au nouveau (en cas d'échec du second appel, l'alias est rendu à l'ancien). Les requêtes adressées à `nexora-default` (blocs, wand, modèles PME) suivent ; un bloc fixé sur un modèle précis ne bouge pas.

**Migration à l'amorçage.** Nexora API crée au premier démarrage un routeur *nommé* `nexora-default` (config.yml). À chaque exécution, l'amorçage renomme un routeur nommé `nexora-default` d'après le `model_name` de son fournisseur (suffixe ` (2)`, ` (3)`… si le nom est pris) et lui donne l'alias `nexora-default`. Le reste du code ne connaît que l'alias.

**`deploy/.env` contre l'interface.** L'amorçage applique `NEXORA_UPSTREAM_*` au routeur qui porte l'alias seulement lorsque ces valeurs **changent** (empreinte différente de `upstream.sha256`) ; empreinte identique : il ne touche à rien, pour respecter un choix fait dans l'interface. Pas d'empreinte enregistrée et fournisseur conforme : l'empreinte est enregistrée sans modification.

**Liste des modèles dans les blocs.** `/v1/models` donne le nom de chaque routeur et ses alias ; la liste de WorkStudio inclut aussi les alias, pour que `nexora-default` reste proposé.

**Modèles supplémentaires.** Ajouter un modèle = un routeur `text-generation` + un fournisseur `openai` : Ollama fourni (`http://ollama:11434`, clé `none`), Mistral AI (`https://api.mistral.ai` + clé) ou service compatible OpenAI (adresse sans `/v1`, modèle, clé facultative). Nexora API vérifie que le fournisseur répond avant de l'enregistrer : son refus est montré en français (« le service ne répond pas »). Le routeur créé reçoit ensuite des limites illimitées dans le rôle `workstudio` (une limite absente bloquerait la clé de WorkStudio). Les paramètres du catalogue (milliards) renseignent `model_total_params`, pour l'empreinte carbone (J8).

**Accès administrateur à Nexora API.** L'amorçage crée une **clé d'administration dédiée** (`nexora-workstudio-admin`, détenue par l'administrateur de Nexora API) et l'écrit dans `/bootstrap/nexora-admin.env` (`NEXORA_API_ADMIN_KEY`), lu par le seul conteneur WorkStudio ; le mot de passe administrateur n'entre jamais dans WorkStudio. Clé invalide ou révoquée : l'amorçage en crée une nouvelle.

**Modèles locaux (Ollama).** WorkStudio parle à l'Ollama fourni (`OLLAMA_URL`) : modèles présents (`/api/tags`), téléchargement avec progression (`/api/pull`, relayé en flux), suppression du fichier quand on retire un modèle local qu'aucun autre routeur n'utilise (jamais `bge-m3`). Les threads sont limités comme dans l'installateur (`num_thread` = moitié des cœurs) en créant le modèle au téléchargement. Catalogue recommandé (constante versionnée), avec taille disque, mémoire conseillée et paramètres : `qwen2.5:3b`, `qwen2.5:7b`, `qwen2.5:14b`, `mistral:7b`, `mistral-nemo:12b`, `llama3.1:8b`, `gemma2:9b`. Saisie libre d'un autre nom possible.

**Écran Réglages › Modèles** (organisation, admins de l'organisation d'instance) : tableau (nom, source, défaut, consommation du mois) ; actions : **Ajouter** (assistant : source → modèle → confirmation), **Tester** (une question courte, temps de réponse affiché), **Définir par défaut**, **Retirer** (refusé pour le modèle par défaut). Tout en français, conventions `add-settings-page`.

**Embeddings dans l'interface : reportés.** Le modèle d'embeddings reste réglé par `NEXORA_EMBED_MODEL` (Ollama direct) ; le choisir à chaud demande la réindexation des bases, prévue avec J10. La partie « définir un modèle d'embeddings » du « Terminé quand » de la section 6 passe à J10.

**Terminé quand** (remplace celui de la section 6) : sur pc6, depuis l'interface, ajouter un modèle Ollama (téléchargement visible), le tester, l'utiliser dans un bloc Agent, le définir par défaut puis revenir au précédent ; ajouter un modèle « compatible OpenAI » ; `nexora restart` ne défait pas ces choix ; tests (amorçage, client d'administration, routes) et contrôle de fumée « Modèles » (liste, ajout compatible OpenAI, test, défaut aller-retour, suppression).

## 8quater. J3 — conception détaillée (23/10/2026, architecte)

Précise la section 7 ; ces décisions priment.

**Page d'arrivée.** Dans l'édition Nexora (le chat d'origine est désactivé faute de backend copilote), `/workspace/[id]` mène à `/workspace/[id]/home`, qui affiche l'**Accueil** Nexora au lieu de rediriger ; l'entrée « Accueil » de la barre latérale y mène toujours. Le chat d'origine reste servi tel quel si `NEXT_PUBLIC_CHAT_ENABLED` est actif (comportement amont inchangé).

**Contenu de l'Accueil** (tous les membres de l'espace) :
- **Créer** : *Workflow* (nouveau workflow vide, ouvert dans l'éditeur) ; *Agent* (en attendant J4 : nouveau workflow pré-rempli « déclencheur Chat → bloc Agent sur `nexora-default` → Réponse », ouvert dans l'éditeur ; J4 remplace cette carte par l'éditeur d'agent). *Assistant* masquée jusqu'à J6, *Capturer* (Document, Transcription) masquée jusqu'à J10.
- **Démarrages rapides** : les modèles PME de l'espace (dossier « Modèles PME » ; ouvrir), *Inviter l'équipe* (Réglages › Membres), *Connecter un outil* (Nexora Connect).
- **État** : modèle par défaut (nom, via une route légère lisible par tout membre qui lit `/v1/models` avec la clé de WorkStudio, sans droits d'administration) ; consommation du mois (admins seulement, route existante) ; cinq dernières exécutions de l'espace (journaux existants), chacune ouvrable.

**Premier lancement** (propriétaire ou admin de l'organisation d'instance ; une fois par organisation) : panneau sur l'Accueil, 5 étapes passables, progression dans `organization.metadata.nexoraOnboarding = { completed: string[], dismissed: boolean }` (pas de migration) :
1. *Votre organisation* — nom (et logo facultatif) via la route d'organisation existante ;
2. *Votre modèle* — modèle par défaut affiché, bouton « Tester », lien vers Réglages › Modèles ;
3. *Votre équipe* — invitations par e-mail (si un service d'e-mail est configuré) sinon lien d'invitation à copier (8bis.5) ;
4. *Vos outils* — lien vers Nexora Connect ;
5. *Premier résultat* — exécuter le modèle PME « Devis client » avec ses valeurs d'exemple et afficher le résultat.
« Plus tard » masque le panneau (rouvrable depuis l'Accueil) ; l'étape 5 réussie le termine.

**Aide** : chaque écran principal a déjà son lien « Aide » (J1) ; l'Accueil pointe vers `docs/guide/prise-en-main.md`.

**Terminé quand** (remplace celui de la section 7) : sur pc6, un compte neuf atterrit sur l'Accueil ; l'administrateur suit les 5 étapes et obtient le devis ; un membre simple voit l'Accueil sans le panneau ni la consommation ; tests des routes (état, progression) et contrôle de fumée « Accueil » (la page répond en français avec ses cartes, la route d'état répond).

## 8quinquies. J4 — conception détaillée (23/10/2026, architecte)

**Playground** (`/workspace/[id]/playground`, entrée de barre latérale, tous les membres) : choisir 1 à 3 modèles parmi ceux de Nexora API (liste des blocs), consignes système, message, température et longueur maximale ; réponses en flux côte à côte, avec temps de réponse et jetons ; « Enregistrer comme agent » crée un agent avec ces consignes et le premier modèle. Backend : route `POST /api/nexora/playground` (session et appartenance à l'espace) qui relaie `/v1/chat/completions` de Nexora API en flux avec la clé de WorkStudio (consommation mesurée comme le reste). Pas d'historique enregistré.

**Agents** (`/workspace/[id]/agents`, entrée de barre latérale) : un agent est un **workflow** du dossier « Agents » de l'espace (créé au besoin), de forme fixe : déclencheur Chat → bloc Agent → Réponse. Le formulaire édite : nom, description, consignes, modèle (dont `nexora-default`), outils (outils Nexora Connect, autres workflows de l'espace), connaissances (bases de l'espace, via l'outil de recherche dans les connaissances), mémoire de conversation (oui/non), message d'accueil du chat. Deux fonctions pures font le lien : `buildAgentWorkflow(config)` et `readAgentWorkflow(state) → config | null` ; quand le workflow a été modifié dans l'éditeur au-delà de cette forme, `null` : la page l'indique et propose seulement « Ouvrir dans l'éditeur » (toute la puissance reste disponible, rien n'est écrasé).
- **Tester** : volet de discussion qui exécute le brouillon (exécution existante, `useDraftState`).
- **Publier** : déploiement existant + chat déployé existant (lien à partager) ; **Versions** : liste des déploiements (existants), activer une version antérieure, **diff** champ par champ entre deux versions (calculé sur `readAgentWorkflow` de chaque version ; « non comparable » si une version sort de la forme).
- La carte « Agent » de l'Accueil (J3) ouvre ce formulaire au lieu de l'éditeur.

**Terminé quand** : sur pc6, comparer deux modèles dans le Playground ; créer un agent par le formulaire (consignes, modèle, un outil Nexora Connect, une base de connaissances), le tester, le publier, ouvrir son chat public, modifier les consignes, publier une 2ᵉ version, voir le diff, revenir à la version 1 ; tests des fonctions pures (aller-retour config ↔ workflow, forme non reconnue) et de la route Playground ; contrôle de fumée « Playground » et « Agent ».

## 8sexies. J5 — conception détaillée (23/10/2026, architecte)

**Cloisonnement par espace.** Nexora Connect (fork d'OpenConnector) n'a qu'une identité d'administration, mais il sait (a) tenir plusieurs **connexions nommées** par service et (b) émettre des **jetons d'exécution persistants** limités à une liste de connexions (`allowedConnections`). Donc :
- une connexion d'espace s'appelle `ws-<workspaceId>` pour son service ;
- chaque espace reçoit son propre jeton d'exécution (créé à la première connexion, mis à jour à chaque connexion ajoutée ou retirée), limité à ses connexions ; le serveur MCP « Nexora Connect » de l'espace utilise ce jeton au lieu du jeton global ; les connexions sans authentification restent accessibles ;
- les connexions **personnelles** (`u-<userId>`, jeton par utilisateur) arrivent avec l'Assistant (J6), seul endroit où une exécution agit au nom d'une personne ; J5 livre les connexions d'espace.

**Catalogue dans WorkStudio** (`/workspace/[id]/connecteurs`, remplace le lien vers la console Connect) : recherche et catégories sur le catalogue de Nexora Connect, fiche par service (actions disponibles, type d'authentification, état de la connexion de l'espace). WorkStudio appelle l'API d'administration de Connect côté serveur avec `NEXORA_CONNECT_ADMIN_TOKEN` (variable serveur, jamais exposée).

**Connexion en un clic** :
- *clé API / identifiants* : formulaire construit depuis `GET /v1/providers/:service/setup`, envoyé à `POST /v1/connections/:service/connect/api-key|custom-credential` avec `connectionName: ws-<id>` ;
- *OAuth* : `POST /v1/connections/:service/connect` (`returnUri` = la fiche du service), suivi de la demande jusqu'à « active » ; il faut l'application OAuth de l'opérateur (Google, Microsoft…), saisie une fois par un admin d'instance dans Réglages › Connecteurs (identifiant et secret transmis à `/api/oauth/configs/:service`, jamais stockés par WorkStudio) ; l'adresse de retour (`NEXORA_CONNECT_ORIGIN/oauth/callback`) est affichée pour l'enregistrer chez le fournisseur ; sans origine publique, OAuth est indiqué comme indisponible.
- *déconnexion* : suppression de la connexion `ws-<id>` et mise à jour du jeton.

**Droits** : voir le catalogue = tout membre ; connecter/déconnecter = membres avec droit d'écriture sur l'espace ; applications OAuth = admins d'instance.

**Précisions après relevé de l'API de Nexora Connect (23/10/2026).**
- *Connexion implicite* : un jeton limité exige aujourd'hui `connectionName` à chaque appel. Notre fork ajoute une règle : si l'appel ne nomme pas de connexion et que le jeton n'autorise qu'une connexion pour ce service, c'est elle qui sert (MCP `execute_action`, `get_action_guide`, HTTP `/v1/actions`). Les modèles n'ont donc rien à savoir du cloisonnement.
- *Clé API nommée* : `PUT /api/connections/:service` (`authType`, `connectionName`, `values`) ; *suppression* : `DELETE /api/connections/:service` avec `connectionName` ; un remplacement garde l'identifiant, une suppression puis recréation en change (le jeton est alors mis à jour).
- *OAuth nommé* : `POST /api/oauth/connection-requests` (`service`, `connectionName`) ouvert dans une fenêtre, puis interrogation de `GET /v1/connection-requests/:id` jusqu'à `connected` ; une seule demande OAuth à la fois par service sur l'instance (la suivante remplace la précédente) : message clair si cela arrive.
- *Catalogue* : `GET /api/providers` (lourd, ~7 Mo, ETag) mis en cache côté serveur WorkStudio et réduit aux champs affichés ; icônes rares, repli sur l'icône du site du service.
- *Jeton d'espace* : secret rendu une seule fois à la création ; WorkStudio le range dans l'en-tête chiffré du serveur MCP « Nexora Connect » de l'espace et retrouve le jeton par son nom `ws-<id>` pour le mettre à jour.

**Terminé quand** : sur pc6, dans deux espaces, connecter un service à clé API (ex. Brevo ou un service sans OAuth) dans l'espace A, l'utiliser depuis un bloc Agent de A ; vérifier que l'espace B ne voit pas cette connexion (discovery MCP filtrée) ; déconnecter ; tests (nommage, mise à jour du jeton, droits, refus inter-espaces) et contrôle de fumée « Connecteurs ».

## 8septies. J6 — conception détaillée (23/10/2026, architecte)

**But** : l'« Assistant Nexora » est le chat interne des salariés, dans WorkStudio (une seule application, une seule session), qui donne accès aux agents publiés de l'espace — l'équivalent de Vibe Work / Le Chat entreprise.

**Parcours** (`/workspace/[id]/assistant`, entrée de barre latérale, tous les membres) :
- à gauche, les **conversations** de la personne (titre généré à partir du premier message, renommer, supprimer), et le bouton « Nouvelle conversation » ;
- choix de l'**agent** pour une nouvelle conversation : les agents publiés de l'espace (dossier « Agents », déployés) plus « Assistant général » (agent fourni : consignes générales en français sur `nexora-default`, recherche dans toutes les bases de connaissances de l'espace) ;
- zone de discussion en flux, rendu Markdown, copier une réponse, régénérer ; **fichiers joints** (PDF, images, texte) transmis à l'agent par les fichiers du bloc Start ;
- les outils et connaissances de l'agent s'appliquent tels quels (connexions de l'espace, J5).

**Backend** :
- deux tables (migration Drizzle par la procédure `db-migrate`) : `nexora_assistant_conversation` (id, workspaceId, userId, workflowId, title, timestamps) et `nexora_assistant_message` (id, conversationId, role, content, fichiers joints en références, usage, timestamps) ; une conversation n'est visible que de son auteur ; supprimée avec l'espace ;
- route `POST /api/nexora/assistant/conversations/[id]/messages` : vérifie l'auteur et l'accès à l'espace, exécute le workflow de l'agent (version **déployée**) en flux avec `input`, `conversationId` (mémoire de l'agent) et les fichiers, enregistre la question et la réponse ; routes de liste, création, renommage, suppression ;
- « Assistant général » : workflow fourni (dossier « Agents »), créé au premier usage avec `buildAgentWorkflow`, publié automatiquement.

**Chats réservés aux membres** (décision de l'architecte, 23/10) : un chat publié peut être « réservé aux membres de l'espace » (nouveau mode d'accès `workspace` : session WorkStudio et appartenance à l'espace du workflow, vérifiées à chaque message). C'est le mode **par défaut** des agents (J4) et celui de l'Assistant : sans lui, le lien d'un agent interne exposerait ses connaissances à quiconque l'obtient. Le mode « public » reste un choix explicite (support client sur un site).

**Hors J6** (décision de l'architecte) : les connexions **personnelles** (`u-<userId>`) annoncées en §8sexies passent à un jalon ultérieur : elles exigent un jeton par personne transmis à chaque exécution, que le moteur MCP partagé de l'espace ne permet pas encore proprement ; J6 utilise les connexions de l'espace.

**Terminé quand** : sur pc6, un membre ouvre l'Assistant, discute avec l'« Assistant général » (réponse en flux, en français), joint un PDF et obtient une réponse qui s'en sert, change d'agent (un agent publié en J4), retrouve ses conversations après rechargement ; un autre membre ne voit pas ces conversations ; tests des routes (auteur seulement, espace étranger refusé, version déployée exécutée) et contrôle de fumée « Assistant ».

## 8octies. J7 — conception détaillée (23/10/2026, architecte)

**But** : « Décrivez votre automatisation » → un workflow prêt à exécuter, généré par le modèle Nexora, modifiable ensuite dans l'éditeur.

**Pourquoi un plan intermédiaire** : un modèle local de 7 milliards de paramètres ne produit pas de façon fiable l'état complet d'un workflow (centaines de champs) ; il produit bien un **plan** court et typé. Le modèle écrit donc un plan JSON dans un petit langage d'étapes ; un **compilateur déterministe** (comme `buildAgentWorkflow` et les modèles PME) le transforme en workflow, validé par `parseWorkflowJson` avant import.

**Le plan** (validé par zod ; au plus 12 étapes) : un déclencheur (`manuel` avec champs d'entrée, `planification` avec fréquence, `webhook`, `chat`) puis des étapes parmi `agent` (consignes, outils Nexora Connect par nom de service, bases de connaissances par nom, sortie structurée facultative), `condition` (une règle simple sur une sortie précédente, deux branches), `api` (méthode, adresse), `attente` (durée), `validation_humaine` (message), `reponse` (ce que le workflow renvoie). Les références entre étapes s'écrivent `{{nom_etape.champ}}` et sont traduites en `<bloc.sortie>`.

**Génération** : route `POST /api/nexora/copilot/plan` (membres avec droit d'écriture) : description (et plan courant pour « modifier »), catalogue court en français des étapes, des services connectés de l'espace (J5) et des bases de l'espace ; appel à `nexora-default` en mode JSON (sortie structurée si le modèle la permet, sinon extraction du premier objet JSON) ; validation ; en cas d'erreur, **une** relance avec le message d'erreur ; renvoie le plan et son résumé en français. `POST /api/nexora/copilot/create` compile et importe dans le dossier choisi (opération applicative), puis ouvre l'éditeur.

**Interface** : carte « Décrire une automatisation » sur l'Accueil (section Créer) et bouton « Avec l'IA » à côté de « Nouveau workflow » ; fenêtre : zone de description + exemples cliquables, aperçu du plan en étapes lisibles (icône, nom, ce que fait l'étape), « Modifier » (nouvelle consigne en langage naturel), « Créer le workflow ».

**Terminé quand** : sur pc6 avec `qwen2.5:7b`, cinq descriptions types produisent chacune un workflow valide qui s'exécute (relance de factures chaque lundi ; tri d'e-mails reçus par webhook avec condition urgent/non urgent ; réponse à une question avec une base de connaissances ; compte rendu de réunion avec validation humaine ; appel d'API puis résumé) ; tests du compilateur (chaque type d'étape, références, branches) et de la validation (plan invalide ⇒ relance puis erreur en français) ; contrôle de fumée « Copilote ».

## 8nonies. J8 — conception détaillée (23/10/2026, architecte)

**But** : savoir qui consomme quoi, avec quel impact, et pouvoir plafonner.

**Sources** :
- *par modèle* (requêtes, jetons, kWh, kgCO2eq) : Nexora API, `/v1/me/usage?model=<routeur>` pour chaque modèle (clé de WorkStudio) — chiffres exacts, empreinte calculée par Nexora API (EcoLogits, zone d'hébergement et taille du modèle renseignées en J2) ;
- *par espace et par personne* (exécutions, jetons) : les journaux d'exécution de WorkStudio (jetons par exécution, espace, déclencheur, auteur) ; l'empreinte y est **estimée** au prorata des jetons par modèle (indiqué « estimation » à l'écran).

**Écran Réglages › Consommation** (admins d'instance ; existe depuis la v1) : période (7, 30, 90 jours), totaux (requêtes, jetons, kWh, kgCO2eq + équivalent parlant, ex. « km en voiture »), courbes par jour, tableaux par modèle, par espace, par personne (top 20), export CSV.

**Budgets** : un plafond mensuel de jetons pour l'instance et, au choix, par espace ; seuil d'alerte (80 % par défaut) — bandeau pour les admins et e-mail si un service d'e-mail est configuré ; à 100 %, les **nouvelles** exécutions de l'espace sont refusées avec un message français (« Budget mensuel atteint : contactez votre administrateur »), sauf pour les admins qui peuvent relever le plafond. Stockage dans `organization.metadata.nexoraBudgets` / table légère si nécessaire ; contrôle au point d'entrée commun des exécutions.

**Terminé quand** : sur pc6, l'écran montre les ventilations et le CO2 cohérents avec Nexora API ; un budget d'espace bas déclenche l'alerte puis le refus d'une exécution, levé en relevant le plafond ; tests (calcul des agrégats, seuils, refus, droits) et contrôle de fumée « Budgets ».

## 8decies. J9 — conception détaillée (23/10/2026, architecte)

**But** : gouverner l'instance depuis l'interface, sans éditer `deploy/.env`.

- **Groupes d'accès** (Réglages › Contrôle d'accès, admins d'instance) : interface propre à Nexora (clean-room) sur le moteur et l'API existants des groupes de permissions (`/api/organizations/[id]/permission-groups`, capacités déjà appliquées côté serveur) : créer un groupe, choisir ses membres, cocher ce qu'il peut faire (blocs et intégrations autorisés, outils MCP, déploiement public des chats, secrets, etc.) avec des libellés français ; modèles de groupes prêts à l'emploi (« Lecture seule », « Créateurs », « Administrateurs »).
- **Connexion unique (SSO)** (Réglages › Sécurité) : émetteur OpenID Connect, identifiant et secret client (chiffré en base), nom du bouton, connexion obligatoire ou non, domaines autorisés à l'inscription ; « Tester la configuration » (découverte OIDC) ; « Appliquer » enregistre puis redémarre proprement WorkStudio (le conteneur repart seul, ~20 s, message d'attente) car la configuration d'authentification est lue au démarrage. Les variables `NEXORA_OIDC_*` du `.env` restent prioritaires si elles sont définies (indiqué à l'écran).
- **E-mail** (Réglages › E-mail) : serveur SMTP (hôte, port, utilisateur, mot de passe chiffré, expéditeur), « Envoyer un e-mail de test » ; lu à chaud par le service d'envoi (pas de redémarrage), le `.env` restant prioritaire.
- **Domaines autorisés** (8bis.5) : liste de domaines dont les adresses peuvent s'inscrire seules ; les autres doivent être invitées.

**Terminé quand** : sur pc6, un groupe « Lecture seule » empêche un membre de modifier un workflow (refus côté serveur) ; un SMTP de test (conteneur local de capture d'e-mails lancé pour l'occasion) reçoit l'e-mail de test et une invitation ; une configuration OIDC vers un fournisseur de test (Keycloak local déjà prévu dans `scripts/dev`) permet de se connecter après « Appliquer » ; tests (chiffrement, priorité du `.env`, droits) et contrôles de fumée « Gouvernance ».

## 9. Ce qui est laissé à l'exécutant

Le découpage en tâches, les noms de fichiers et de composants, la forme exacte des contrats d'API, les tests, et tout choix qui ne change pas le comportement décrit ici, en respectant les conventions du dépôt.
