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

## Extraire des données

Nexora lit une facture, un devis, un bon de commande ou une note de frais et en renvoie les champs (numéro, date, fournisseur, montants…) en JSON vérifié, prêt à ranger dans une table. Il faut un modèle **Vision / OCR** (il lit les scans et les images) et un modèle de **discussion** (il remplit les champs ; le modèle par défaut de l'instance si vous n'en choisissez pas d'autre).

### Depuis l'accueil

Dans **Capturer**, la carte **Extraire des données** (visible quand les deux modèles existent) demande :
- le **type de document** : Facture, Devis, Bon de commande ou Note de frais ;
- **Ranger chaque document dans une table** (activé par défaut) : Nexora crée la table « Factures » (ou « Devis », « Bons_de_commande », « Notes_de_frais »), avec une colonne par champ plus `a_verifier` et `motifs`. Si une table de ce nom a déjà ces colonnes, elle est réutilisée ; sinon une nouvelle table est créée (« Factures_2 »…).

Le workflow créé enchaîne **Start** (un fichier `document`) → **Extraire des données** → **Table** (insérer une ligne). Lancez-le avec un PDF ou une image : une ligne s'ajoute à la table par document.

### Le bloc « Extraire des données »

| Réglage | Ce qu'il fait |
|---|---|
| **Document** | un PDF (numérique ou scanné) ou une image (PNG, JPEG, WebP), 50 Mo au plus |
| **Champs à extraire** | un modèle prêt, ou **Mes propres champs** : une ligne par champ, avec son **nom** (lettres, chiffres et `_`, pour devenir une colonne de table), son **type** (texte, nombre, booléen, objet, liste) et sa **description** (ce que le modèle doit chercher ; c'est elle qui guide l'extraction). La **valeur** sert d'exemple facultatif. Pour une date, écrivez « date au format AAAA-MM-JJ » dans la description |
| **Consignes** | facultatif : ce qu'il faut savoir de ces documents (« les montants sont en euros », « le fournisseur est l'émetteur, pas le client ») |
| **Modèle de lecture**, **Modèle d'extraction**, **Pages** | en mode avancé : un autre modèle Vision / OCR ou de discussion de Réglages › Modèles, et les pages à lire (à partir de 0) |

Les modèles prêts :

| Modèle | Champs (les obligatoires en gras) |
|---|---|
| Facture | **numero**, **date**, **fournisseur**, client, **total_ht**, **total_tva**, **total_ttc**, date_echeance, devise |
| Devis | **numero**, **date**, **fournisseur**, client, objet, **total_ht**, total_tva, total_ttc, date_validite |
| Bon de commande | **numero**, **date**, **acheteur**, **fournisseur**, total_ht, total_ttc, date_livraison, adresse_livraison |
| Note de frais | **date**, **commercant**, **categorie**, **montant_ttc**, montant_tva, devise, moyen_paiement |

Le bloc renvoie :
- `data` : un champ par clé, `null` quand le document ne le donne pas ; les montants en nombres (« 1 234,56 € » devient `1234.56`), les dates en `AAAA-MM-JJ` (« 15/03/2026 », « 15 mars 2026 ») ;
- `toVerify` (« à vérifier ») : vrai quand un champ obligatoire manque, qu'une valeur est illisible (un montant qui n'est pas un nombre, une date impossible), que HT + TVA ne fait pas le TTC (à 2 centimes près) ou que le modèle n'a pas répondu de données lisibles ; `issues` en donne les raisons. Le bloc **ne s'arrête pas** dans ces cas : le document est rangé, marqué à vérifier, pour qu'une personne le relise ;
- `row` : `data` plus `a_verifier` et `motifs`, à donner tel quel à un bloc Table (« insérer une ligne ») ;
- `markdown` : le document tel qu'il a été lu, tableaux compris.

### Comment le document est lu

- Un **PDF numérique** (avec du texte sélectionnable) est lu **par Nexora API elle-même**, sans modèle : texte dans l'ordre de lecture, titres, et **tableaux à filets restitués en tableaux Markdown**. C'est immédiat, et rien ne part vers un modèle à cette étape.
- Une **image** ou un **PDF scanné** est lu page par page par le modèle Vision / OCR (environ une minute par page avec `qwen2.5vl:3b` sur un serveur sans carte graphique), **10 pages scannées au plus** par extraction : au-delà, choisissez les pages (champ **Pages**).
- Le texte lu est ensuite donné au modèle de discussion avec le schéma des champs (format JSON imposé quand le serveur de modèles le permet) ; la réflexion d'un modèle à raisonnement est écartée. Avec GLM 5.3, comptez quelques secondes ; avec `qwen2.5:7b` sur CPU, 15 à 30 secondes par document.

Un tableau sans filets (sans bordures tracées) n'est pas reconnu comme tableau : son texte reste lu ligne à ligne, ce qui suffit en général à l'extraction.

### Par l'API de Nexora API

`POST /v1/ocr` de Nexora API accepte, comme celle de Mistral, `document_annotation_format` (`{"type": "json_schema", "json_schema": {"name": …, "schema": {…}}}`) et `document_annotation_prompt`, et renvoie le JSON dans `document_annotation` (une chaîne). Sont aussi acceptés `table_format` (`markdown` ou `html` : tableaux à part dans `pages[].tables`, avec un renvoi `[tbl-0.md](tbl-0.md)` dans le Markdown) et `pages` (`[0, 2]` ou `"0-2"`). Extensions Nexora : `annotation_model` (le modèle de discussion qui remplit le schéma, `nexora-default` par défaut) et, en réponse, `document_annotation_error` quand le modèle n'a pas rendu de JSON. Avec un modèle Mistral OCR, l'annotation est faite par Mistral.

```bash
curl -s http://127.0.0.1:8000/v1/ocr -H "Authorization: Bearer $CLE" -H 'Content-Type: application/json' -d '{
  "model": "qwen2.5vl:3b",
  "document": {"type": "document_url", "document_url": "data:application/pdf;base64,…"},
  "document_annotation_format": {"type": "json_schema", "json_schema": {"name": "facture", "schema": {
    "type": "object", "properties": {"numero": {"type": ["string", "null"]}, "total_ttc": {"type": ["number", "null"]}},
    "required": ["numero", "total_ttc"], "additionalProperties": false}}}
}'
```

Cette route n'est pas encore relayée par l'API développeur de WorkStudio (`<instance>/v1`, clés `sk-nexora-…`) : elle s'appelle sur Nexora API, avec une clé de Nexora API.

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
| Bloc Extraire des données | 10 pages scannées par extraction (un PDF numérique n'a pas cette limite) ; 100 champs |
| Enregistrement (blocs et bases) | transcrit par morceaux (10 minutes dans un bloc, 3 minutes dans une base) ; au-delà de **3 heures**, il est refusé : découpez le fichier |
| Page ou morceau lu dans une base | doit tenir dans une étape de traitement (environ 8 minutes) ; sinon le document échoue avec « Page (ou morceau) trop long pour ce serveur » |
| Image envoyée au modèle | réduite à 1 568 pixels de côté et 5 Mo |

Sur un serveur sans carte graphique, comptez environ une minute par page lue avec `qwen2.5vl:3b` (300 pages ≈ 5 heures), et quelques minutes par tranche de dix minutes d'enregistrement.
