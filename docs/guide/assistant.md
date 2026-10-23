# L'Assistant

L'**Assistant** est le chat interne de vos équipes : chaque membre de l'espace y discute avec les agents publiés de l'entreprise, sans quitter Nexora WorkStudio et sans autre compte.

Ouvrez **Assistant** dans la barre latérale (ou la carte *Assistant* de l'Accueil).

## Choisir un agent

- **Nouvelle conversation** ouvre une discussion ; choisissez l'agent dans la liste en haut à droite avant d'écrire le premier message. L'agent d'une conversation ne change plus ensuite : pour parler à un autre agent, ouvrez une nouvelle conversation.
- La liste propose l'**Assistant général** en premier, puis les agents publiés de l'espace : ceux du dossier « Agents », publiés avec un chat **réservé aux membres de l'espace** ou **accessible sans compte**. Un agent dont le chat demande un mot de passe, un code par e-mail ou une connexion SSO n'y figure pas.
- Si un agent est dépublié ou supprimé, ses conversations restent lisibles mais vous ne pouvez plus lui écrire.

## L'Assistant général

L'**Assistant général** est un agent fourni avec Nexora : il répond en français avec le modèle par défaut de l'instance, se souvient de la conversation en cours et cherche dans les bases de connaissances de l'espace. Il est créé et publié automatiquement la première fois qu'un membre ouvre l'Assistant ; s'il est supprimé ou dépublié, il revient à l'ouverture suivante.

Les bases de connaissances qu'il consulte sont celles qui existaient à sa création : une base ajoutée ensuite n'y entre pas d'elle-même (ouvrez l'agent dans [Les agents](agents.md) pour l'ajouter).

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

- Une conversation n'est visible que de **son auteur** : les autres membres, administrateurs compris, ne la voient pas dans leur Assistant. Supprimer une conversation supprime ses messages et la mémoire que l'agent en gardait.
- La mémoire d'un agent est propre à chaque personne : un membre ne peut pas lire la mémoire d'une conversation d'un autre, même en connaissant son identifiant.
- Chaque message exécute l'agent ; l'exécution apparaît dans [Les journaux](journaux.md) de l'espace, mais **le contenu échangé** (question, réponse, détail des étapes) n'y est visible que de la personne qui a discuté et des **administrateurs de l'espace**. Les autres membres voient seulement qu'une exécution a eu lieu, son statut et sa durée. Il en va de même pour l'export des journaux et l'API des journaux.

## Les chats réservés aux membres

Les agents sont publiés par défaut avec un chat **réservé aux membres de l'espace** : il faut être connecté à Nexora et membre de l'espace de l'agent, ce qui est vérifié à chaque message. C'est ce mode qui permet à l'Assistant de parler à l'agent avec votre session, et c'est lui qui protège les connaissances internes de l'agent : quelqu'un qui obtiendrait le lien sans être membre ne peut pas s'en servir.

Les règles de confidentialité ci-dessus (mémoire propre à chacun, contenu des journaux réservé à l'auteur et aux administrateurs) s'appliquent à tous les chats réservés aux membres, qu'on les utilise depuis l'Assistant ou par leur lien. Un chat **accessible sans compte** (lien public) est un choix explicite, pour un usage externe (support client sur votre site, par exemple) : ses conversations ne sont pas liées à une personne et leur contenu reste visible des membres dans les journaux.
