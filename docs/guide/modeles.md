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

     Un modèle local lit jusqu'à 16 384 jetons à la fois, conversation et documents joints compris (réglage `NEXORA_OLLAMA_CONTEXT_LENGTH` dans `deploy/.env`) : plus de contexte demande plus de mémoire.
   - Pour Mistral AI ou un service compatible : le nom exact du modèle. Mistral AI propose d'office `mistral-small-latest` (Discussion), `mistral-ocr-latest` (Vision / OCR) et `voxtral-mini-latest` (Transcription).
3. **Confirmation**
   - Un modèle local est téléchargé (barre de progression). Il est limité à la moitié des cœurs du serveur, pour ne pas ralentir le reste.
   - Nexora vérifie ensuite que le modèle répond avant de l'enregistrer.

## Brancher un modèle via une passerelle LiteLLM

Une passerelle [LiteLLM](https://docs.litellm.ai/) expose sous une seule adresse compatible OpenAI des modèles hébergés ailleurs (GLM, Mistral, modèles d'un fournisseur cloud…). Pour en utiliser un :

1. **Ajouter un modèle** › usage **Discussion** › **Service compatible OpenAI**.
2. **Adresse** : celle de la passerelle, **sans** `/v1` (par exemple `http://passerelle.interne:4000`). Elle doit être joignable depuis le conteneur Nexora API : une passerelle sur la machine hôte s'écrit `http://host.docker.internal:<port>`.
3. **Nom du modèle** : le nom du modèle tel que la passerelle le publie (`model_name` de sa configuration, par exemple `cloud-glm-5-3`), et la **clé** de la passerelle.
4. Nexora vérifie que le modèle répond avant de l'enregistrer. **Tester** remplit ensuite sa fiche (voir plus bas).

Un modèle servi par une passerelle **sort de votre serveur** : sa fiche affiche **Hors instance** tant que vous n'avez pas déclaré où il est hébergé. Ne le définissez par défaut qu'en connaissance de cause : tout ce que reçoivent les agents réglés sur `nexora-default` lui est alors envoyé.

## Les modèles à raisonnement

Certains modèles (GLM 5.3, DeepSeek R1, Qwen 3…) **réfléchissent avant de répondre**. Leur réflexion arrive à part — dans un champ `reasoning_content` ou `reasoning`, ou entre balises `<think>…</think>` au début de la réponse pour les modèles Ollama de type qwen3 ou deepseek-r1. Nexora la lit sous ces trois formes et la tient toujours **à l'écart de la réponse** :
- **Playground**, **Assistant** et chats d'agents réservés aux membres : un volet **Réflexion** repliable s'affiche en direct au-dessus de la réponse, puis se replie quand la réponse commence ;
- sortie `content` d'un bloc, plans du **Copilote**, texte de **Générer avec l'IA** : la réflexion n'y figure jamais ;
- elle reste consultable dans les traces d'exécution (Journaux).

Ce que cela change :
- **La réponse arrive plus tard** : le premier mot de la réponse peut attendre que la réflexion soit finie. Ce n'est pas une panne ; le Playground et l'Assistant montrent la réflexion pendant ce temps.
- **Les jetons comptent** : la réflexion consomme des jetons de sortie. Une **longueur maximale** trop basse peut être entièrement prise par la réflexion : la réponse est alors vide. Laissez de la marge (1 024 jetons au moins).
- **Effort de raisonnement** (Playground, formulaire d'agent, bloc Agent en mode avancé) : *Faible*, *Moyen* ou *Élevé* sont transmis au modèle (`reasoning_effort`). Un modèle qui refuse ce réglage répond quand même, avec son effort par défaut ; le Playground le signale. *Par défaut* n'envoie rien.
- Dans un chat publié, la réflexion n'est transmise qu'aux **membres de l'espace connectés** à un agent réservé aux membres (c'est ainsi que l'Assistant la reçoit), et seulement aux clients qui la demandent (en-tête `X-Sim-Stream-Protocol: agent-events-v1`). Un visiteur d'un agent public, ou d'un chat protégé par mot de passe ou par e-mail, ne la reçoit jamais, même avec l'en-tête — sauf si le propriétaire active explicitement « Inclure le raisonnement » dans la fenêtre de déploiement du chat, dans l'éditeur.

## Fiche d'un modèle

Chaque modèle de la liste porte des **badges** :
- **Raisonnement** et **Outils** : détectés par **Tester** (le modèle a réfléchi ; il accepte des outils) ;
- **Vision** : un modèle de l'usage Vision / OCR ;
- **Contexte** : la longueur de contexte, quand vous l'avez déclarée ;
- **Localisation des données** :
  - **Sur ce serveur** : un modèle local (Ollama fourni avec Nexora), ou un service de l'instance elle-même (comme le serveur Whisper) ;
  - **Hébergé UE** : Mistral AI ;
  - **Hors instance** : par défaut pour tout service compatible OpenAI (passerelle LiteLLM, fournisseur cloud, tunnel vers une autre machine).

**Modifier la fiche** (menu de la ligne) permet de déclarer la longueur de contexte (de 1 000 à 10 000 000 jetons) et, pour un service compatible OpenAI, sa localisation : *Sur ce serveur*, *Hébergé UE* ou *Hors instance*. La localisation d'un modèle local ou de Mistral AI ne se modifie pas.

## Transcription locale (Whisper)

À l'installation, la question « Activer la transcription vocale locale ? » ajoute un serveur Whisper sur votre machine (profil `voice`, environ 1,5 Go avec son modèle `small` multilingue). Au premier démarrage, le serveur télécharge son modèle (une seule fois, il fonctionne ensuite hors ligne), puis Nexora l'ajoute ici sous le nom `whisper-small` (usage Transcription). Il n'utilise qu'une partie des cœurs du serveur (`NEXORA_WHISPER_THREADS`). Si vous désactivez ensuite la transcription locale, supprimez `whisper-small` ici : il y reste sinon, sans serveur pour répondre.

Un enregistrement de plus de dix minutes est transcrit par morceaux de dix minutes ; au-delà de trois heures, le bloc refuse et demande de découper le fichier.

## Tester, retirer

- **Tester** pose une question courte à un modèle de Discussion, lit une image d'exemple avec un modèle Vision / OCR, ou transcrit une seconde de silence avec un modèle de Transcription, et affiche la réponse et son temps. Pour un modèle de Discussion, il laisse au modèle de quoi réfléchir avant de répondre (1 024 jetons), affiche la réponse **sans** la réflexion et met à jour les badges **Raisonnement** et **Outils** de la fiche. Si le modèle a réfléchi sans arriver à la réponse, le test l'indique (« modèle à raisonnement : réponse tronquée ») au lieu d'une réponse vide.
- **Définir par défaut** n'existe que pour les modèles de Discussion.
- **Retirer** supprime le modèle. Le modèle par défaut ne peut pas être retiré : choisissez d'abord un autre modèle par défaut.
- Un modèle local retiré libère aussi sa place disque, sauf si un autre modèle l'utilise. Le modèle des connaissances (`bge-m3`) n'est jamais supprimé.

## Et `deploy/.env` ?

Le modèle choisi à l'installation est inscrit dans `deploy/.env` (`NEXORA_UPSTREAM_*`).
- Un redémarrage **ne défait pas** les choix faits dans Réglages › Modèles.
- Si vous **modifiez** ces lignes puis lancez `nexora restart`, le modèle du `.env` est ajouté (ou mis à jour) et devient le modèle par défaut. Les autres modèles restent disponibles.

## Si l'écran indique « indisponible »

L'administration des modèles passe par Nexora API. Vérifiez que la plateforme tourne (`nexora status`), puis relancez-la (`nexora restart`) : l'amorçage remet à WorkStudio sa clé d'administration.
