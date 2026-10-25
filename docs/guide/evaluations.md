# Les évaluations

Une **évaluation** répond à une question simple : *cet agent, ce prompt ou ce modèle répond-il bien ?* Vous écrivez (ou importez) des questions avec les réponses attendues, un **juge** décide si chaque réponse est bonne, et une **campagne** fait passer toutes les questions à ce que vous voulez comparer. Vous lisez ensuite le taux de réussite, la vitesse, les jetons et l’empreinte carbone de chaque cible, ligne à ligne si besoin.

L’écran **Évaluations** est dans la barre latérale de chaque espace. Tous les membres lisent ; créer un jeu de tests, un juge, lancer une campagne ou une planification demande le droit **Modifier** sur l’espace.

## Les jeux de tests

Un jeu de tests est une liste de lignes. Chaque ligne a une **question**, et peut avoir :

- une **réponse attendue** (ce que doit dire une bonne réponse) ;
- une **consigne de notation**, propre à cette question ;
- une **réponse annotée** avec votre **verdict** (réussi ou échec) et sa **justification** : c’est ce qui sert à vérifier qu’un juge pense comme vous (voir plus bas).

**Nouveau jeu de tests** propose cinq sources :

| Source | Ce qui est importé |
|---|---|
| **Fichier** | Un CSV (séparateurs `,` `;` tabulation `|` reconnus) ou un JSONL, 25 Mo au plus. Colonnes reconnues : `question`, `attendu`, `consigne`, `réponse`, `verdict`, `justification` (ou leurs équivalents anglais `input`, `expected`, `guidance`, `candidate`). Un JSONL au format de conversation (`{"messages": [...]}`) donne la dernière question et la dernière réponse. |
| **Table** | Une table de l’espace : choisissez-la, les colonnes de même nom sont reprises. |
| **Traces** | Des traces que vous pouvez lire : la question posée et la réponse obtenue. Une trace privée d’un autre membre (Assistant, Playground…) n’est jamais proposée. |
| **Conversations** | **Vos** conversations avec l’Assistant, après que vous avez coché votre accord : un échange (question suivie de sa réponse) devient une ligne. Les conversations des autres membres ne sont jamais importables. |
| **Vide** | Vous ajoutez les lignes à la main. |

Un jeu contient **10 000 lignes** au plus. Les lignes sont **copiées** : modifier la table d’origine ensuite ne change pas le jeu, et une campagne garde sa propre copie des lignes qu’elle a utilisées.

## Les juges

Un juge décide si une réponse est bonne. Il y en a six types :

| Type | Fonctionnement |
|---|---|
| **Modèle qui classe** | Un modèle de l’instance lit la question, la réponse attendue, la consigne et la réponse, puis choisit une étiquette (par exemple *correct* ou *incorrect*). Vous dites quelles étiquettes valent une réussite. |
| **Modèle qui note** | Même principe, avec une note (par exemple de 1 à 10) et un seuil de réussite. |
| **Règle : contient** | La réponse contient un texte fixe, ou la réponse attendue de la ligne. |
| **Règle : expression régulière** | La réponse correspond au motif. Le motif s’exécute en temps linéaire : les assertions (`(?=…)`, `(?<=…)`) et les références arrière ne sont pas acceptées. |
| **Règle : JSON valide** | La réponse est un JSON valide (une clôture Markdown est tolérée), avec les clés obligatoires que vous indiquez. |
| **Proximité sémantique** | Le cosinus des embeddings de la réponse et de la réponse attendue atteint le seuil. Les embeddings sont calculés par le modèle local de l’instance (celui des bases de connaissances) : rien ne sort de l’instance. |

Un modèle qui juge répond à température 0. Quand sa réponse n’a pas le format demandé, le verdict est **Erreur** et la note garde ce que le modèle a dit : un juge ne décide jamais « réussi » par défaut.

### Essayer, et mesurer l’accord

Dans la fenêtre d’un juge, **Essayer sur 10 lignes** fait passer le juge sur dix lignes du jeu choisi, en commençant par celles que vous avez annotées. Chaque ligne affiche le verdict du juge et le vôtre, et l’écran indique l’**accord avec vos annotations** (par exemple « 8 sur 10 (80 %) »). Un verdict *Erreur* compte comme un désaccord. Visez au moins 80 % avant de faire confiance à un juge ; en dessous, précisez ses consignes. Une ligne sans réponse annotée est essayée sur sa réponse attendue (marquée « réponse attendue »).

## Les campagnes

**Nouvelle campagne** croise un **jeu de tests**, un **juge** et jusqu’à huit **cibles** :

- un **modèle**, avec des consignes facultatives ;
- un **prompt** (page *Prompts*) à une version précise : `@production`, `@test`, *dernière version* ou un numéro. La version désignée par l’étiquette est **figée au lancement** : déplacer l’étiquette pendant la campagne ne la change pas ;
- un **agent publié** de l’espace, exécuté tel qu’il est déployé.

La campagne tourne **en arrière-plan** : vous pouvez fermer la page. Elle passe chaque question à chaque cible, fait juger la réponse, et enregistre la réponse, le verdict, la latence, les jetons et le CO₂.

- **Concurrence** : 2 questions en parallèle par défaut (jusqu’à 8). Toutes les campagnes de l’instance ensemble ne font jamais plus de 4 appels de modèle à la fois, et une campagne **cède la place** quand quelqu’un attend une exécution (l’Assistant, un chat, l’éditeur) : un élément attend au plus 30 secondes que la voie se libère.
- **Budget** : le budget mensuel de l’espace est vérifié avant chaque élément. S’il est atteint, la campagne s’arrête **Interrompue** (les éléments restants ne sont pas comptés en échec).
- **Redémarrage** : si le serveur s’arrête, la campagne reprend toute seule dans les minutes qui suivent (le service de tâches planifiées de l’instance la reprend) ; un élément interrompu trois fois est abandonné.
- **Annulation** : **Annuler la campagne** interrompt les appels en cours et n’en démarre plus.
- Les appels de modèle suivent les mêmes chemins que le reste de l’instance : ils apparaissent dans **Traces** (nommés « Évaluation : … ») et dans la consommation.

Plafonds : 5 000 éléments (lignes × cibles) par campagne, réponses conservées jusqu’à 20 000 caractères.

### Lire une campagne

La page d’une campagne montre la progression, puis les **statistiques par cible** : **taux de réussite**, note moyenne (juges qui notent), **latence p50 et p95**, **jetons**, **CO₂** et erreurs. Une erreur (la cible n’a pas répondu, le juge n’a pas su décider) compte comme **non réussie** dans le taux : une cible qui plante ne paraît pas bonne. Le CO₂ est celui que Nexora API mesure pour le modèle ; un modèle non mesuré affiche « — » (jamais 0). Les jetons et le CO₂ sont ceux de la cible : les appels du juge sont dans la consommation.

Plus bas, chaque question avec la réponse, le verdict et la note du juge pour chaque cible ; **Échecs et erreurs** ne garde que les lignes à regarder.

## Comparer

Sur la page d’une campagne, **Comparer deux séries** met en regard deux cibles, de la même campagne ou de deux campagnes (avant et après un changement de prompt, un nouveau modèle…). La page de comparaison apparie les lignes par question et classe chacune : **amélioration** (seule la série B réussit), **régression** (seule la série A réussit), **identique**, ou absente d’un côté. L’adresse de la page garde les deux séries : copiez-la pour partager la comparaison.

## Seuils d’alerte et planification

Une campagne peut avoir un **seuil d’alerte** (par exemple 80 %). À la fin, chaque cible qui réussit **moins** que le seuil lève une alerte : un **bandeau** en haut de l’écran Évaluations, jusqu’à ce qu’un membre l’acquitte, et un **e-mail** aux administrateurs de l’instance et à l’auteur de la campagne **si le serveur d’e-mail est configuré** (comme les alertes de budget). Une campagne interrompue (budget atteint) ou en échec lève aussi une alerte.

**Nouvelle planification** lance une campagne à une échéance : *chaque nuit à 3 h*, *chaque lundi*, *chaque heure*, ou une expression cron à cinq champs, dans le fuseau horaire de votre choix (heure d’été comprise). Une échéance manquée (serveur éteint) ne lance **qu’une** campagne au retour du serveur. Une planification qui ne peut pas démarrer (jeu vide, prompt supprimé) le dit : une campagne « en échec » et son alerte apparaissent. **Lancer maintenant** la déclenche sans toucher à son calendrier. Un prompt choisi par étiquette (`@production`) est relu à chaque lancement : la nuit mesure ce qui est en production *ce soir-là*.

## Limites

- Un jeu de tests, un juge ou une planification utilisé(e) par une campagne ne peut pas être supprimé(e) : supprimez d’abord la campagne ou la planification.
- Les lignes importées depuis des traces sont celles que la trace a conservées (masquées, coupées) : relisez-les avant de vous en servir.
- Un modèle qui juge peut se tromper : mesurez son accord avec vos annotations, et relisez les lignes en désaccord.
- Un modèle local sur processeur est lent : gardez la concurrence basse et comparez les latences, pas seulement les taux.
