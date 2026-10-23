# Les modèles

**Réglages › Modèles** (administrateurs de l'organisation) : choisissez les modèles d'IA qu'utilisent vos workflows, sans toucher à la configuration du serveur.

## Les usages

Chaque modèle sert un **usage**, affiché dans la liste :
- **Discussion** : les blocs Agent, Routeur, Évaluateur, Garde-fous… et « Générer avec l'IA » ;
- **Vision / OCR** : les blocs Vision et Analyse de document (OCR) avec le fournisseur **Nexora** ;
- **Transcription** : le bloc Transcription vocale avec le fournisseur **Nexora**.

Dans les blocs Vision, Analyse de document et Transcription vocale, le fournisseur **Nexora** est choisi d'office : sans champ « Modèle Nexora », le bloc prend le premier modèle de l'usage. S'il n'y en a aucun, l'exécution l'indique : ajoutez-en un ici.

## Le modèle par défaut

Un modèle porte la mention **Par défaut**. C'est lui qu'utilisent :
- les blocs réglés sur `nexora-default` (le choix proposé d'office dans les blocs Agent, Routeur, Évaluateur, Garde-fous) ;
- les modèles PME et « Générer avec l'IA ».

**Définir par défaut** un autre modèle bascule tous ces usages d'un coup. Un bloc où vous avez choisi un modèle précis (par exemple `mistral-small-latest`) ne change pas.

Les autres modèles apparaissent dans la liste des modèles de chaque bloc.

## Ajouter un modèle

Bouton **Ajouter un modèle**, puis trois étapes.

1. **Usage et source**
   - L'usage : Discussion (proposé d'office), Vision / OCR ou Transcription.
   - **Modèle local** : il tourne sur votre serveur (Ollama, fourni avec Nexora). Vos données ne sortent pas.
   - **Mistral AI** : les modèles de Mistral, avec votre clé API (console.mistral.ai).
   - **Service compatible OpenAI** : vLLM, un autre Ollama, un fournisseur compatible… Adresse **sans** `/v1`, nom du modèle, clé si le service en demande une.
   - Ollama ne transcrit pas la voix : pour la Transcription, choisissez Mistral AI ou un service compatible OpenAI (un serveur Whisper).
2. **Modèle**
   - Pour un modèle local, un catalogue recommandé pour le français, avec la place disque et la mémoire conseillée :

     | Modèle | Disque | Mémoire conseillée | Pour |
     |---|---|---|---|
     | `qwen2.5:3b` | 1,9 Go | 4 Go | petites machines, réponses rapides |
     | `qwen2.5:7b` | 4,7 Go | 8 Go | bon équilibre (recommandé) |
     | `qwen2.5:14b` | 9 Go | 16 Go | meilleure qualité |
     | `mistral:7b` | 4,1 Go | 8 Go | modèle français de Mistral AI |
     | `mistral-nemo:12b` | 7,1 Go | 12 Go | Mistral, contexte long |
     | `llama3.1:8b` | 4,9 Go | 8 Go | polyvalent |
     | `gemma2:9b` | 5,4 Go | 10 Go | rédaction soignée |
     | `qwen2.5vl:3b` | 3,2 Go | 6 Go | Vision / OCR : images, documents scannés |
     | `qwen2.5vl:7b` | 6 Go | 10 Go | Vision / OCR, meilleure lecture |

     Le catalogue affiché suit l'usage choisi.

     Vous pouvez aussi saisir le nom de tout autre modèle Ollama.
   - Pour Mistral AI ou un service compatible : le nom exact du modèle. Mistral AI propose d'office `mistral-small-latest` (Discussion), `mistral-ocr-latest` (Vision / OCR) et `voxtral-mini-latest` (Transcription).
3. **Confirmation**
   - Un modèle local est téléchargé (barre de progression). Il est limité à la moitié des cœurs du serveur, pour ne pas ralentir le reste.
   - Nexora vérifie ensuite que le modèle répond avant de l'enregistrer.

## Transcription locale (Whisper)

À l'installation, la question « Activer la transcription vocale locale ? » ajoute un serveur Whisper sur votre machine (profil `voice`, environ 1,5 Go avec son modèle `small` multilingue). Au démarrage, Nexora télécharge son modèle puis l'ajoute ici sous le nom `whisper-small` (usage Transcription). Il n'utilise qu'une partie des cœurs du serveur (`NEXORA_WHISPER_THREADS`).

Un enregistrement de plus de dix minutes est transcrit par morceaux de dix minutes ; au-delà de trois heures, le bloc refuse et demande de découper le fichier.

## Tester, retirer

- **Tester** pose une question courte à un modèle de Discussion, lit une image d'exemple avec un modèle Vision / OCR, ou transcrit une seconde de silence avec un modèle de Transcription, et affiche la réponse et son temps.
- **Définir par défaut** n'existe que pour les modèles de Discussion.
- **Retirer** supprime le modèle. Le modèle par défaut ne peut pas être retiré : choisissez d'abord un autre modèle par défaut.
- Un modèle local retiré libère aussi sa place disque, sauf si un autre modèle l'utilise. Le modèle des connaissances (`bge-m3`) n'est jamais supprimé.

## Et `deploy/.env` ?

Le modèle choisi à l'installation est inscrit dans `deploy/.env` (`NEXORA_UPSTREAM_*`).
- Un redémarrage **ne défait pas** les choix faits dans Réglages › Modèles.
- Si vous **modifiez** ces lignes puis lancez `nexora restart`, le modèle du `.env` est ajouté (ou mis à jour) et devient le modèle par défaut. Les autres modèles restent disponibles.

## Si l'écran indique « indisponible »

L'administration des modèles passe par Nexora API. Vérifiez que la plateforme tourne (`nexora status`), puis relancez-la (`nexora restart`) : l'amorçage remet à WorkStudio sa clé d'administration.
