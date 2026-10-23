# Documents et voix

Nexora lit les documents scannés et les images (**Vision / OCR**) et transcrit les enregistrements (**Transcription**) avec des modèles de votre instance : dans vos workflows et dans vos bases de connaissances. Avec un modèle local, aucun fichier ne sort de votre serveur.

## Ce qu'il faut d'abord : un modèle par usage

Les deux usages se règlent dans **Réglages › Modèles** (administrateurs), comme les modèles de discussion (voir [Les modèles](modeles.md)).

- **Vision / OCR** : bouton **Ajouter un modèle**, usage **Vision / OCR**, puis
  - **Modèle local** : `qwen2.5vl:3b` (3,2 Go, 6 Go de mémoire conseillés) ou `qwen2.5vl:7b` (6 Go, 10 Go de mémoire, meilleure lecture) ;
  - ou **Mistral AI** : `mistral-ocr-latest`, avec votre clé API (les documents partent alors chez Mistral AI).
- **Transcription** (facultative) :
  - **en local** : à l'installation, répondez oui à « Activer la transcription vocale locale ? ». Nexora ajoute un serveur Whisper sur votre machine (profil `voice`, environ 1,5 Go avec son modèle `small` multilingue) et l'inscrit dans Réglages › Modèles sous le nom `whisper-small`. Le modèle est téléchargé une seule fois, au premier démarrage ; ensuite le serveur fonctionne hors ligne (aucun appel à Hugging Face). Il n'utilise qu'une partie des cœurs du serveur (`NEXORA_WHISPER_THREADS`). Si vous désactivez ensuite la transcription locale, `whisper-small` reste dans Réglages › Modèles jusqu'à ce qu'un administrateur le supprime ;
  - ou **Mistral AI** : `voxtral-mini-latest` ;
  - ou un **service compatible OpenAI** (un autre serveur Whisper). Ollama ne transcrit pas la voix.

**Tester** vérifie le modèle : lecture d'une image d'exemple pour Vision / OCR, d'une seconde de silence pour la Transcription.

Tant qu'un usage n'a aucun modèle :
- l'accueil n'affiche pas la carte « Capturer » correspondante (un administrateur voit à la place un lien vers Réglages › Modèles) ;
- dans un bloc réglé sur le fournisseur **Nexora**, un message rouge sous « Modèle Nexora » prévient que l'exécution échouera.

## Depuis l'accueil : « Capturer »

Pour les membres qui peuvent modifier l'espace, la section **Capturer** de l'accueil propose :
- **Lire un document** (si un modèle Vision / OCR existe) : crée un workflow « Start → Analyse de document (OCR) ». Le Start demande un fichier `document` (PDF, même scanné, ou image) ; le bloc renvoie son texte en Markdown.
- **Transcrire un enregistrement** (si un modèle de Transcription existe) : crée un workflow « Start → Transcription ». Le Start demande un fichier `enregistrement` (audio ou vidéo) ; la langue est réglée sur le français.

Le workflow s'ouvre dans l'éditeur : lancez-le avec votre fichier, puis complétez-le à votre guise (un bloc Agent qui résume le texte, une table qui l'enregistre…).

## Dans vos workflows : les trois blocs

Dans l'édition Nexora, ces blocs démarrent sur le fournisseur **Nexora** : pas de clé à saisir.

| Bloc | Usage | Ce qu'il lit |
|---|---|---|
| **Vision** | Vision / OCR | une image, avec votre consigne (« Décrivez… », « Relevez le montant… ») |
| **Analyse de document (OCR)** | Vision / OCR | un PDF (même scanné) ou une image ; texte en Markdown, texte brut ou JSON |
| **Transcription vocale** | Transcription | un fichier audio ou vidéo |

- **Modèle Nexora** : laissez vide pour prendre le premier modèle de l'usage, ou saisissez le nom d'un modèle de Réglages › Modèles.
- Une image trop grande est réduite avant l'envoi (1 568 pixels de côté, 5 Mo au plus).
- Avec Mistral OCR, le PDF est lu d'un seul tenant. Un modèle de vision ne lit que des images : Nexora lui envoie alors le PDF page par page, 50 pages au plus par exécution.
- Les autres fournisseurs (OpenAI, Deepgram…) restent disponibles avec leur propre clé API.

## Dans vos bases de connaissances

Une base accepte, en plus des documents habituels :
- les **PDF scannés** et les **images** (PNG, JPEG, WebP…) : quand le texte extrait est presque vide (moins de 100 caractères par page), Nexora lit le document avec le modèle Vision / OCR, si le serveur n'a pas d'OCR externe configuré ;
- les **enregistrements** (MP3, WAV, M4A, OGG, WebM) : ils sont transcrits, puis le texte est indexé.

Un fichier envoyé sans type précis (`application/octet-stream`, fréquent selon les navigateurs) est reconnu par son nom, ou à défaut par son contenu.

Les gros documents sont traités par étapes, en arrière-plan :
- un PDF scanné est lu **page par page**, chaque page étant enregistrée avant la suivante ; après un redémarrage, la lecture **reprend** à la page suivante, sans relire les pages déjà lues ;
- un enregistrement est transcrit par **morceaux de trois minutes**, avec la même reprise.

Pendant ce temps, la liste des documents de la base affiche l'avancement : « Lecture : 12 / 300 pages », « Transcription : 3 / 20 morceaux ».

Comptez, sur un serveur sans carte graphique, **environ une minute par page** avec `qwen2.5vl:3b` (davantage pour une page dense ou avec `qwen2.5vl:7b`) : un scan de **300 pages prend environ 5 heures**. Une carte graphique divise ce temps par dix ou plus. La transcription locale (`whisper-small`) prend en général moins de temps que la durée de l'enregistrement.

Si une seule page (ou un seul morceau) demande plus de temps que le serveur n'en accorde à une étape (environ 8 minutes), deux fois de suite, le document passe « En échec » avec la raison « Page (ou morceau) trop long pour ce serveur » : choisissez un modèle plus petit, ou un serveur plus puissant, puis relancez le traitement.

Si Nexora API ne répond pas (ou refuse momentanément la clé de WorkStudio, ou limite le débit), le document est remis à plus tard plutôt que mis en échec. S'il n'y a aucun modèle de l'usage — ou si le modèle a été retiré de Réglages › Modèles —, le document passe « En échec » avec la raison (« Aucun modèle de lecture (OCR) », « Aucun modèle de transcription ») : ajoutez le modèle, puis relancez le traitement du document.

Quand le modèle de vision s'arrête à la longueur maximale de sa réponse sur une page très dense, le texte lu est gardé, et l'arrêt est signalé dans les journaux du serveur.

## Changer le modèle d'embeddings d'une base

Les passages d'une base sont indexés avec un modèle d'embeddings (`bge-m3` par défaut). Pour en changer : dans le menu de la base, **Modèle d'embeddings**, choisissez un autre modèle installé sur l'Ollama de l'instance, puis confirmez **Réindexer**.

- Tous les passages sont **recalculés en arrière-plan** ; un bandeau affiche la progression (pourcentage et nombre de passages).
- Une recherche qui porte sur **plusieurs bases à la fois** (un bloc ou un agent relié à plusieurs bases) exige qu'elles utilisent le même modèle : après la bascule, réindexez aussi les autres bases concernées.
- Pendant ce temps, la recherche continue sur **l'index actuel** : la base reste interrogeable.
- À la fin, la base bascule **d'un seul coup** sur le nouvel index. Jamais de mélange entre vecteurs de deux modèles.
- Si le serveur de modèles (Ollama) ne répond plus ou répond trop lentement, la réindexation **attend** qu'il revienne, jusqu'à 45 minutes, sans échouer.
- En cas d'échec (modèle indisponible, passage trop long pour ce modèle…), **l'ancien index reste actif** et le bandeau donne la raison. Une réindexation interrompue (redémarrage) reprend où elle en était ; si elle ne progresse plus, le bandeau propose de la relancer, et continue de vérifier de temps en temps si elle repart. Relancée vers le **même modèle**, elle **réutilise les passages déjà recalculés**.

## Limites

| Où | Limite |
|---|---|
| Bloc Analyse de document avec un modèle de vision (PDF lu page par page) | 50 pages par exécution : au-delà, le bloc refuse ; choisissez des pages (champ « Pages ») ou ajoutez le document à une base de connaissances |
| Fichier envoyé au bloc Analyse de document | 50 Mo |
| Enregistrement (blocs et bases) | transcrit par morceaux (10 minutes dans un bloc, 3 minutes dans une base) ; au-delà de **3 heures**, il est refusé : découpez le fichier |
| Page ou morceau lu dans une base | doit tenir dans une étape de traitement (environ 8 minutes) ; sinon le document échoue avec « Page (ou morceau) trop long pour ce serveur » |
| Image envoyée au modèle | réduite à 1 568 pixels de côté et 5 Mo |

Sur un serveur sans carte graphique, comptez environ une minute par page lue avec `qwen2.5vl:3b` (300 pages ≈ 5 heures), et quelques minutes par tranche de dix minutes d'enregistrement.
