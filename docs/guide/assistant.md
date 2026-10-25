# L'Assistant

L'**Assistant** est le chat interne de vos équipes : chaque membre de l'espace y discute avec les agents publiés de l'entreprise, sans quitter Nexora WorkStudio et sans autre compte.

Ouvrez **Assistant** dans la barre latérale (ou la carte *Assistant* de l'Accueil).

## Choisir un agent

- **Nouvelle conversation** ouvre une discussion ; choisissez l'agent dans la liste en haut à droite avant d'écrire le premier message. L'agent d'une conversation ne change plus ensuite : pour parler à un autre agent, ouvrez une nouvelle conversation.
- La liste propose l'**Assistant général** en premier, puis les agents publiés de l'espace : ceux du dossier « Agents », publiés avec un chat **réservé aux membres de l'espace** ou **accessible sans compte**. Un agent dont le chat demande un mot de passe, un code par e-mail ou une connexion SSO n'y figure pas.
- Si un agent est dépublié ou supprimé, ses conversations restent lisibles mais vous ne pouvez plus lui écrire.

## L'Assistant général

L'**Assistant général** est un agent fourni avec Nexora : il répond en français avec le modèle par défaut de l'instance, se souvient de la conversation en cours et cherche dans les bases de connaissances de l'espace. Il est créé et publié automatiquement la première fois qu'un membre ouvre l'Assistant ; s'il est supprimé ou dépublié, il revient à l'ouverture suivante.

Il sait aussi **exécuter du code Python** pour analyser un fichier joint et tracer un graphique, quand l'interpréteur est autorisé par un administrateur. Les Assistants créés avant cette possibilité la reçoivent automatiquement à la première ouverture suivante, sauf si un administrateur a retiré l'outil de l'agent.

Les bases de connaissances qu'il consulte sont celles qui existaient à sa création : une base ajoutée ensuite n'y entre pas d'elle-même (ouvrez l'agent dans [Les agents](agents.md) pour l'ajouter).

## Calculer, tracer, citer, demander

- **Tableurs et graphiques.** Joignez un classeur Excel ou un CSV et demandez « fais un graphique par mois » : l'Assistant exécute du Python, affiche le **graphique** sous sa réponse (avec un bouton de téléchargement) et donne des totaux calculés, pas estimés. Les fichiers produits (PNG, CSV, XLSX) restent affichés quand vous rouvrez la conversation. Disponible quand un administrateur a installé l'interpréteur et l'a autorisé : [L'interpréteur de code](interpreteur.md).
- **Sources.** Une réponse tirée des bases de connaissances cite ses sources : sous la réponse, **Sources [1] [2]** ouvre le document (ou la page d'origine).
- **Autoriser ou refuser.** Si un agent doit agir pour vous (envoyer un e-mail, par exemple), une carte **Autoriser cette action ?** montre ce qu'il va faire. **Refuser** n'exécute rien ; l'action n'a pas lieu non plus si vous ne répondez pas.

## Aller plus loin : projets, workflows, tâches, connexions

Ces possibilités s'ouvrent depuis la colonne de gauche de l'Assistant (**Projets**, **Tâches planifiées**, **Lancer un workflow**, **Mes connexions**).

### Les projets

Un **projet** réunit des **consignes** et des **fichiers** communs à plusieurs conversations : le dossier d'un client, une offre, un règlement intérieur. Ouvrez **Projets**, créez-en un, écrivez ses consignes et ajoutez ses fichiers (texte, PDF, Word, tableur… jusqu'à 10 fichiers et 5 Mo par fichier ; les fichiers que Nexora ne sait pas lire, comme un exécutable, sont refusés avec la raison). Au départ d'une **Nouvelle conversation**, choisissez le projet à côté de l'agent : l'agent reçoit alors les consignes et le texte des fichiers avec la première question, puis de nouveau quand le projet a changé (jusqu'à 16 000 caractères par envoi : au-delà, la fin est coupée et le dit).

- Un projet n'est visible que de **son auteur** : un autre membre, administrateur compris, reçoit « introuvable », y compris en connaissant l'identifiant.
- Supprimer un projet supprime ses fichiers ; ses conversations restent, sans projet.
- Le projet conserve **le texte** de ses fichiers, pas les fichiers eux-mêmes.

### Lancer un workflow depuis l'Assistant

Un rédacteur publie un workflow pour l'Assistant avec **Gérer les workflows publiés** : un interrupteur par workflow ; publier un workflow qui n'est pas déployé le **déploie** (les membres lancent la version déployée). Tout le monde voit ensuite le workflow sous **Lancer un workflow** : le **formulaire** est fabriqué à partir des champs de son déclencheur (texte, nombre, oui/non, ou JSON pour une liste ou un objet). **Lancer** exécute le workflow et le résultat s'affiche dans la conversation, dans une carte.

- Un workflow qui demande des **fichiers** ne se lance pas depuis le formulaire : la carte le dit, lancez-le depuis l'éditeur.
- Si le workflow contient une **validation humaine**, la carte pose la question (oui ou non, commentaire) : **Approuver** ou **Refuser** reprend l'exécution et la carte affiche la suite. La reprise exige le droit d'écriture de l'espace : un lecteur voit « En attente de validation par un rédacteur », sans boutons.
- Le lien **Ouvrir dans l'éditeur**, en haut d'une conversation, n'apparaît que pour les rédacteurs.

### Les tâches planifiées

Dites ce que vous voulez répéter : « **Tous les matins à 8 h, résume mes e-mails** », « chaque lundi à 9 h, envoie-moi le point des ventes ». L'Assistant reconnaît la phrase (une répétition, sans point d'interrogation) et propose **Planifier cette tâche ?**. **Planifier** demande au **Copilote** ([Le Copilote](copilote.md)) d'écrire le workflow : vous relisez le plan (quand, quoi, ce qui manque) puis **Créer la tâche**. Le workflow est créé dans le dossier **Tâches planifiées**, déployé et planifié à votre nom ; une carte l'annonce dans la conversation. Créer une tâche demande le droit d'écriture.

**Tâches planifiées** liste les vôtres : leur rythme (« Tous les jours à 8 h »), leur prochaine exécution, un interrupteur pour les **désactiver** ou les réactiver, **Supprimer** (avec confirmation), et leurs **dernières exécutions** avec le résultat. Les tâches ne sont visibles et modifiables que de leur auteur.

- Le planificateur lance la tâche à l'heure dite ; une tâche qui échoue le reste dans les [Journaux](journaux.md).
- La tâche peut utiliser **vos** connexions personnelles (ci-dessous), et seulement quand elle est lancée par le planificateur ou par vous : un collègue qui la lance à la main depuis l'éditeur n'utilise jamais votre boîte.
- Si la phrase ne dit pas quand la tâche doit s'exécuter, l'Assistant le dit : précisez l'horaire.

### Mes connexions : votre boîte, pas celle de l'espace

**Mes connexions** ouvre le catalogue de [Connecteurs](connecteurs.md) en mode personnel : connectez **votre** Gmail, **votre** Outlook ou un compte IMAP/SMTP. Une connexion personnelle est utilisée **uniquement dans vos conversations** (et vos tâches planifiées) : quand vous demandez « lis mes derniers e-mails », l'agent agit avec votre boîte ; pour vos collègues, il agit avec la leur, ou avec la connexion de l'espace s'ils n'en ont pas de personnelle pour ce service. Vos identifiants ne sont jamais affichés, ni à un autre membre, ni à un administrateur, ni dans les journaux.

### La recherche sur le web

Quand l'administrateur a installé la recherche web (profil `search`, voir [Installation](installation.md)), l'**Assistant général** peut chercher sur le web : ses requêtes **quittent l'instance**. L'outil lui est ajouté à l'ouverture suivante de l'Assistant ; un administrateur qui retire l'outil « Recherche web » de l'agent ([Les agents](agents.md)) le garde retiré.

## Discuter

- La réponse s'affiche au fil de l'eau, mise en forme (titres, listes, tableaux, code). **Arrêter** interrompt l'envoi à tout moment, y compris pendant la lecture des fichiers joints : rien n'est enregistré si la question n'est pas encore partie.
- **Copier** copie une réponse ; **Régénérer** repose la dernière question à l'agent.
- Le titre d'une conversation reprend le début du premier message ; renommez-la ou supprimez-la depuis le menu de la liste.
- Si le premier message d'une nouvelle conversation ne peut pas être envoyé, la conversation vide est supprimée et votre texte vous est rendu.
- Dans une réponse, seules les images de Nexora (et les images incluses dans le texte) s'affichent ; une image venant d'un autre site devient un lien, pour qu'une réponse ne puisse pas faire contacter un site tiers à votre insu.

## Fichiers joints et limites

- Joignez jusqu'à **5 fichiers** par message, de **10 Mo** au plus chacun : documents (PDF, Word, tableurs, texte…), images, audio et vidéo. Les exécutables et les archives sont refusés.
- Les fichiers sont transmis à l'agent avec la question ; l'Assistant n'en garde **que le nom, le type et la taille**, pour les afficher dans la conversation. Ils ne sont pas copiés dans les fichiers de l'espace.
- Conséquence : après un rechargement de la page, **Régénérer** une question qui avait des fichiers joints n'est plus possible tel quel. Un message vous le signale ; envoyez de nouveau la question avec ses fichiers.

## Confidentialité

- Une conversation, un projet et une tâche planifiée ne sont visibles que de **leur auteur** : les autres membres, administrateurs compris, ne les voient pas dans leur Assistant. Supprimer une conversation supprime ses messages et la mémoire que l'agent en gardait.
- La mémoire d'un agent est propre à chaque personne : un membre ne peut pas lire la mémoire d'une conversation d'un autre, même en connaissant son identifiant.
- Chaque message exécute l'agent ; l'exécution apparaît dans [Les journaux](journaux.md) de l'espace, mais **le contenu échangé** (question, réponse, détail des étapes) n'y est visible que de la personne qui a discuté et des **administrateurs de l'espace**. Les autres membres voient seulement qu'une exécution a eu lieu, son statut et sa durée. Il en va de même pour l'export des journaux et l'API des journaux.

## Les chats réservés aux membres

Les agents sont publiés par défaut avec un chat **réservé aux membres de l'espace** : il faut être connecté à Nexora et membre de l'espace de l'agent, ce qui est vérifié à chaque message. C'est ce mode qui permet à l'Assistant de parler à l'agent avec votre session, et c'est lui qui protège les connaissances internes de l'agent : quelqu'un qui obtiendrait le lien sans être membre ne peut pas s'en servir.

Les règles de confidentialité ci-dessus (mémoire propre à chacun, contenu des journaux réservé à l'auteur et aux administrateurs) s'appliquent à tous les chats réservés aux membres, qu'on les utilise depuis l'Assistant ou par leur lien. Un chat **accessible sans compte** (lien public) est un choix explicite, pour un usage externe (support client sur votre site, par exemple) : ses conversations ne sont pas liées à une personne et leur contenu reste visible des membres dans les journaux.
