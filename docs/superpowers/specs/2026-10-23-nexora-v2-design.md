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

## 9. Ce qui est laissé à l'exécutant

Le découpage en tâches, les noms de fichiers et de composants, la forme exacte des contrats d'API, les tests, et tout choix qui ne change pas le comportement décrit ici, en respectant les conventions du dépôt.
