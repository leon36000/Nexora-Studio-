# Les connaissances

Une **base de connaissances** rassemble vos documents (PDF, Word, texte, pages web…) pour que vos agents répondent à partir de **vos** informations.

## Créer une base

1. **Connaissances › Nouvelle base**.
2. Déposez vos documents, ou branchez une source synchronisée (Google Drive, Notion, site web…).
3. Nexora découpe les documents et calcule leurs **embeddings** avec le modèle `bge-m3`, sur votre serveur : aucun document ne sort de l'instance.

Le premier calcul peut prendre quelques minutes, le temps que le modèle soit prêt.

## Utiliser une base

- Bloc **Connaissances** : recherche des passages pertinents pour une question.
- Bloc **Agent** : ajoutez l'outil « Connaissances » ; l'agent cherche lui-même dans la base.

## En cas d'erreur

Un document « En échec » affiche la raison au survol. « Modèle d'embeddings en cours de téléchargement » : réessayez quelques minutes plus tard. « Aucun modèle d'embeddings » : l'administrateur vérifie le service Ollama (`nexora status`).
