# 16 — Document AI : OCR, annotations et Document QnA

> **Périmètre** : Mistral Document AI (processeur OCR, annotations structurées bbox/document, Document QnA via chat), gestion des fichiers pour l'OCR, structure exacte des requêtes et réponses · **Sources** : 4 pages de docs.mistral.ai (copie du 21/10/2026), complétées par des vérifications ciblées dans la spec OpenAPI locale (signalées « spec ») · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Vue d'ensemble Document AI
   - 3.2 Modèles OCR
   - 3.3 Entrées : types de documents et modes de transmission
   - 3.4 Paramètres de la requête OCR
   - 3.5 Structure de la réponse OCR
   - 3.6 Tableaux (`table_format`)
   - 3.7 En-têtes et pieds de page
   - 3.8 Extraction de blocs (`include_blocks`)
   - 3.9 Scores de confiance (`confidence_scores_granularity`)
   - 3.10 Annotations (bbox et document)
   - 3.11 Document QnA
   - 3.12 Gestion des fichiers pour l'OCR / QnA
   - 3.13 OCR à grande échelle, cookbooks
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Document AI** est l'offre de traitement documentaire de Mistral, présentée comme « enterprise-level » : elle combine l'OCR et l'extraction de données structurées, avec support multilingue (plus de 40 langues), annotations et workflows adaptables à tous types de documents.
- **Trois services** sont regroupés sous ce nom : **OCR Processor** (extraction de texte/structure), **Annotations** (extraction JSON structurée selon un schéma fourni), **Document QnA** (questions en langage naturel sur un document).
- **Point d'entrée unique pour l'OCR et les annotations** : `POST https://api.mistral.ai/v1/ocr` (SDK : `client.ocr.process`). Document QnA passe, lui, par l'API de chat (`POST /v1/chat/completions`, `client.chat.complete`) avec un bloc de contenu `document_url`.
- **Modèle** : l'alias `mistral-ocr-latest` pointe vers le dernier modèle OCR. Les exemples font apparaître plusieurs générations (`mistral-ocr-2505-completion`, `mistral-ocr-2512`, `mistral-ocr-4-1`) ; certaines fonctions exigent une génération minimale (OCR 2512 pour tableaux séparés et en-têtes/pieds de page, OCR 4 pour les blocs).
- **Entrées** : PDF et documents bureautiques (`document_url` : URL publique, data URL base64, ou URL signée d'un fichier uploadé avec `purpose="ocr"`) et images (`image_url` : URL publique ou data URL base64). Une trentaine de formats listés (PDF, DOCX, PPTX, XLSX, EPUB, LaTeX, JPEG, PNG, HEIC, etc.).
- **Sortie** : JSON paginé ; chaque page porte un `markdown` (sortie principale), les `images` (avec coordonnées de boîte, base64 optionnel, annotation optionnelle), les `tables`, les `hyperlinks`, `header`/`footer`, `dimensions`, et optionnellement `confidence_scores` et `blocks` (blocs structurels en ordre de lecture). Plus `model`, `document_annotation` et `usage_info` (`pages_processed`, `doc_size_bytes`).
- **Limites documentées** : fichier ≤ 50 Mo et ≤ 1 000 pages (OCR, annotations, QnA) ; l'annotation de document n'exploite au plus que 8 boîtes d'image.
- **Volumétrie** : pour les gros volumes, Mistral renvoie vers le service **Batch Inference** (`/v1/ocr` figure parmi les endpoints acceptés par le batch, spec).
- **Statut** : aucune mention beta/dépréciation dans ces pages ; aucun prix, aucune région, aucune politique de rétention ou ZDR n'y est indiqué.
- **Interface** : ces pages ne décrivent aucun écran de la console (usage 100 % API/SDK).

---

## 2. Concepts et vocabulaire

| Terme original | Définition en français |
|---|---|
| Document AI | Nom commercial de la brique de traitement documentaire de Mistral (OCR + extraction structurée + QnA). |
| OCR Processor | Service d'OCR qui transforme PDF/images/documents en Markdown structuré page par page. |
| `mistral-ocr-latest` | Alias de modèle pointant vers le dernier modèle OCR. |
| OCR 2512 / OCR 4 | Générations de modèle OCR citées comme prérequis de fonctionnalités (« OCR 2512 or newer », « OCR 4 or newer »). |
| `document_url` | Type de bloc d'entrée pour les documents (PDF, DOCX, PPTX…) : URL publique, data URL base64 ou URL signée. |
| `image_url` | Type de bloc d'entrée pour les images : URL publique directe ou data URL base64. |
| `file` / `file_id` | Type de bloc d'entrée référant à un fichier uploadé par son UUID (présent dans la spec seulement, non illustré dans les pages). |
| Signed URL | URL temporaire (Azure Blob) donnant accès en lecture à un fichier uploadé ; durée paramétrable via `expiry` (heures). |
| Placeholder | Lien inséré dans le Markdown à l'emplacement d'une image (`![img-0.jpeg](img-0.jpeg)`) ou d'un tableau extrait (`[tbl-3.html](tbl-3.html)`). |
| BBox (bounding box) | Boîte englobante d'un élément détecté (image, bloc), exprimée en pixels de l'image de page via `top_left_x/y`, `bottom_right_x/y`. |
| Block | Région de contenu de niveau paragraphe (titre, texte, liste, tableau, image, équation…) avec type, bbox et contenu, renvoyée en ordre de lecture. |
| Reading order | Ordre de lecture logique dans lequel les blocs sont renvoyés. |
| Confidence score | Score de 0 à 1 estimant la qualité de reconnaissance, au niveau page, bloc ou mot. |
| Annotation | Extraction structurée (JSON conforme à un schéma fourni) réalisée par un LLM vision après l'OCR. |
| `bbox_annotation` | Annotation appliquée individuellement à chaque boîte/image extraite (ex. décrire une figure). |
| `document_annotation` | Annotation appliquée au document entier (Markdown OCR + 8 premières images). |
| `document_annotation_prompt` | Prompt système de haut niveau optionnel guidant l'annotation de document. |
| Response format / JSON schema | Objet `{"type": "json_schema", "json_schema": {...}}` décrivant la structure attendue ; seul `json_schema` est valide pour les annotations (spec). |
| Document QnA | Questions-réponses en langage naturel sur un document : OCR puis compréhension par un LLM, via l'API de chat. |
| `usage_info` | Bloc de consommation de la réponse OCR : pages traitées et taille du document. |
| DPI | Résolution (points par pouce) de l'image de page utilisée pour l'OCR ; 200 dans tous les exemples. |

---

## 3. Fonctionnalités en détail

### 3.1 Vue d'ensemble Document AI

- La page d'accueil (« Document Processing ») présente Document AI comme un traitement documentaire de niveau entreprise combinant OCR et extraction structurée avancée, avec support multilingue, annotations et « adaptable workflows for all document types ».
- Liste des langues : renvoi vers `/resources/languages#ocr` (non fourni ici).
- Accès : `client.ocr.process` dans les SDK, ou endpoint `https://api.mistral.ai/v1/ocr`, pour les trois services :
  - **OCR Processor** (`/studio/document-processing/basic_ocr`) — le modèle OCR et ses capacités ;
  - **Annotations** (`/studio/document-processing/annotations`) — extraction via sorties structurées intégrées ;
  - **Document QnA** (`/studio/document-processing/document_qna`) — combinaison modèles + OCR pour le question-answering.
- Nuance : en pratique, les exemples QnA utilisent `client.chat.complete` / `/v1/chat/completions`, pas `/v1/ocr` (voir §8).

### 3.2 Modèles OCR

| Identifiant (tel qu'observé) | Où il apparaît | Ce qu'on en apprend |
|---|---|---|
| `mistral-ocr-latest` | Toutes les requêtes d'exemple | Alias vers le dernier modèle OCR. Le champ `model` de la réponse renvoie l'ID résolu. |
| `mistral-ocr-2512` | Réponses des exemples PDF (URL, base64, fichier uploadé) avec `table_format="html"` | Correspond vraisemblablement à « OCR 2512 » (inférence) : supporte `tables`, `hyperlinks`, `header`, `footer`. |
| `mistral-ocr-2505-completion` | Réponses des exemples image et des exemples d'annotations | Ancienne génération : réponses sans clés `tables`/`hyperlinks`/`header`/`footer` ; tableaux rendus inline en Markdown. |
| `mistral-ocr-4-1` | Réponses des exemples `include_blocks` et `confidence_scores_granularity` | Génération « OCR 4 » (inférence sur la correspondance de nom) : blocs et scores de confiance. |
| `mistral-ocr-2503-completion` | Exemple de réponse de la spec OpenAPI uniquement | Génération plus ancienne encore (spec). |

Prérequis de génération (encadré `:::info`) :
- **Formatage des tableaux** et **extraction en-tête/pied de page** : uniquement OCR 2512 ou plus récent.
- **Extraction de blocs** (`include_blocks`) : uniquement OCR 4 ou plus récent. Les modèles plus anciens **acceptent** le paramètre mais renvoient un tableau vide.

Le modèle de capacités de la spec contient un booléen `ocr` (défaut `false`) parmi les capacités d'un modèle (à côté de `vision`, `function_calling`, etc.), ce qui permet d'identifier les modèles OCR via l'API des modèles (spec).

### 3.3 Entrées : types de documents et modes de transmission

#### Types de blocs `document`

| `type` | Champ principal | Usage | Remarques |
|---|---|---|---|
| `document_url` | `document_url` (string) ; optionnel `document_name` (spec) | PDF, PPTX, DOCX et autres documents | Accepte URL publique, data URL `data:application/pdf;base64,<…>`, ou URL signée. `type` a pour défaut `document_url` (spec) : les exemples curl d'annotations l'omettent. |
| `image_url` | `image_url` : string, ou objet `{url, detail}` avec `detail` ∈ `low`/`auto`/`high` (spec) | PNG, JPEG/JPG, AVIF et autres images | URL publique directe ou data URL `data:image/jpeg;base64,<…>`. |
| `file` | `file_id` (UUID) | Fichier déjà uploadé | **Spec uniquement** ; les pages passent toujours par une URL signée. |

#### Modes de transmission documentés

| Mode | Documents (PDF…) | Images | Exigence |
|---|---|---|---|
| URL publique | ✅ (« OCR with a PDF Url ») | ✅ (« OCR with an Image URL ») | L'URL doit être **publique** et accessible par l'API ; pour les images, une URL directe. |
| Base64 (data URL) | ✅ `data:application/pdf;base64,…` | ✅ `data:image/jpeg;base64,…` | Méthode recommandée pour des fichiers locaux sans upload. |
| Fichier uploadé + URL signée | ✅ (« OCR with an Uploaded PDF ») | non illustré | Upload `purpose="ocr"` → URL signée → OCR → suppression optionnelle (voir §3.12). |

#### Formats supportés (FAQ)

| Documents | Images |
|---|---|
| PDF (.pdf) | JPEG (.jpg, .jpeg) |
| Word (.docx, .doc) | PNG (.png) |
| PowerPoint (.pptx, .ppt) | AVIF (.avif) |
| Excel (.xlsx, .csv) | TIFF (.tiff) |
| Texte (.txt) | GIF (.gif) |
| EPUB (.epub) | HEIC/HEIF (.heic, .heif) |
| XML/DocBook (.xml) | BMP (.bmp) |
| RTF (.rtf) | WebP (.webp) |
| OpenDocument Text (.odt) | |
| BibTeX/BibLaTeX (.bib) | |
| FictionBook (.fb2) | |
| Jupyter Notebooks (.ipynb) | |
| JATS XML (.xml) | |
| LaTeX (.tex) | |
| OPML (.opml) | |
| Troff (.1, .man) | |

La page Annotations précise que l'OCR fonctionne « même à partir de sources de faible qualité ou manuscrites », et cite aussi les scans, DOCX, PPTX.

### 3.4 Paramètres de la requête OCR (`OCRRequest`)

Colonne « Source » : D = documenté dans les pages ; S = spec OpenAPI seulement. La spec déclare `additionalProperties: false` (tout champ inconnu est refusé) et `required: [document, model]`.

| Paramètre (JSON / TS) | Type | Défaut | Valeurs | Effet | Source |
|---|---|---|---|---|---|
| `model` / `model` | string (nullable dans la spec) | — (requis) | ex. `mistral-ocr-latest` | Modèle OCR utilisé. | D, S |
| `document` / `document` | objet `document_url` \| `image_url` \| `file` | — (requis) | voir §3.3 | Document à traiter. | D, S |
| `pages` / `pages` | liste d'entiers, ou chaîne, ou null | null (toutes les pages) | ex. `[0,1,2]`, `"0,1,2"`, `"0-5"`, `"0,2-4"` | Restreint les pages traitées ; **numérotation à partir de 0**. | D (exemples `list(range(8))`), S (format chaîne) |
| `include_image_base64` / `includeImageBase64` | bool | null/false (non précisé) | `true`/`false` | Inclut chaque image extraite en data URI (`data:image/jpeg;base64,…`) dans `images[].image_base64` ; sinon `null`. | D, S |
| `image_limit` / — | int | null | — | « Max images to extract ». | S |
| `image_min_size` / — | int | null | — | Hauteur et largeur minimales d'une image pour qu'elle soit extraite. | S |
| `table_format` / `tableFormat` | string \| null | `None`/`null` | `null`, `markdown`, `html` | `null` : tableaux inline en Markdown dans la page ; `markdown`/`html` : tableaux extraits à part dans `tables` avec placeholder dans le Markdown. OCR 2512+. | D, S |
| `extract_header` / `extractHeader` | bool | `false` | — | Extrait l'en-tête de page dans `header` et le **retire** du Markdown (spec). OCR 2512+. | D, S |
| `extract_footer` / `extractFooter` | bool | `false` | — | Idem pour le pied de page → `footer`. OCR 2512+. | D, S |
| `include_blocks` / `includeBlocks` | bool | doc : opt-in (`True` pour activer) ; **spec : `true`** | — | Ajoute `blocks` (bbox niveau paragraphe, type, contenu, ordre de lecture) sur chaque page. OCR 4+. | D, S |
| `confidence_scores_granularity` / `confidenceScoresGranularity` | string \| null | null (aucun score, « pour garder la réponse légère ») | `page`, `block`, `word` | Active les scores de confiance (§3.9). | D, S |
| `bbox_annotation_format` / `bboxAnnotationFormat` | ResponseFormat \| null | null | `json_schema` uniquement | Schéma appliqué à chaque bbox/image extraite → `images[].image_annotation`. | D, S |
| `document_annotation_format` / `documentAnnotationFormat` | ResponseFormat \| null | null | `json_schema` uniquement | Schéma appliqué au document entier → `document_annotation`. | D, S |
| `document_annotation_prompt` / `documentAnnotationPrompt` | string \| null | null | texte libre | Prompt système de haut niveau pour l'annotation de document ; exige `document_annotation_format` (spec). | D, S |

Forme minimale d'une requête (curl, extrait) :

```json
{
  "model": "mistral-ocr-latest",
  "document": {"type": "document_url", "document_url": "https://arxiv.org/pdf/2201.04234"},
  "table_format": "html",
  "extract_header": true,
  "include_image_base64": true,
  "confidence_scores_granularity": "page"
}
```

### 3.5 Structure de la réponse OCR (`OCRResponse`)

#### Niveau racine

| Champ | Type | Requis (spec) | Contenu |
|---|---|---|---|
| `pages` | liste de `OCRPageObject` | oui | Une entrée par page traitée. |
| `model` | string | oui | Modèle effectivement utilisé (ID résolu, ex. `mistral-ocr-2512`). |
| `document_annotation` | string (JSON sérialisé) \| null | non | Résultat de l'annotation de document si `document_annotation_format` fourni ; sinon `null`. |
| `usage_info` | `OCRUsageInfo` | oui | `pages_processed` (int, requis) et `doc_size_bytes` (int \| null). |

#### Page (`OCRPageObject`)

| Champ | Type | Requis (spec) | Contenu |
|---|---|---|---|
| `index` | int ≥ 0 | oui | Index de la page dans le document, **à partir de 0**. |
| `markdown` | string | oui | Sortie principale : Markdown brut de la page (titres `#`, gras/italique, LaTeX `$…$`, placeholders d'images/tableaux). |
| `images` | liste de `OCRImageObject` | oui | Images extraites de la page. |
| `tables` | liste de `OCRTableObject` | non | Tableaux extraits quand `table_format` = `html` ou `markdown`. |
| `hyperlinks` | liste de strings | non | Liens détectés (y compris `mailto:` encodés, ex. `mailto:sgarg2%40andrew.cmu.edu`). |
| `header` | string \| null | non | En-tête si `extract_header=True`. |
| `footer` | string \| null | non | Pied de page si `extract_footer=True`. |
| `dimensions` | `OCRPageDimensions` \| null | oui | `dpi`, `height`, `width` (pixels) de l'image de la page. |
| `confidence_scores` | `OCRPageConfidenceScores` \| null | non | Si `confidence_scores_granularity` est défini. |
| `blocks` | liste de blocs \| null | non | Si `include_blocks=True` (§3.8). |

#### Image (`OCRImageObject`)

| Champ | Type | Contenu |
|---|---|---|
| `id` | string | Identifiant, ex. `img-0.jpeg` ; correspond au placeholder `![img-0.jpeg](img-0.jpeg)` du Markdown. La numérotation est continue sur tout le document (ex. `img-6.jpeg` sur la page 7). |
| `top_left_x`, `top_left_y`, `bottom_right_x`, `bottom_right_y` | int ≥ 0 \| null | Coordonnées de la boîte en pixels de l'image de page. |
| `image_base64` | string \| null | Data URI de l'image si `include_image_base64=True`, sinon `null`. |
| `image_annotation` | string \| null | JSON sérialisé de l'annotation bbox si `bbox_annotation_format` fourni. |

#### Tableau (`OCRTableObject`)

| Champ | Type | Contenu |
|---|---|---|
| `id` | string | ex. `tbl-3.html` ; correspond au placeholder `[tbl-3.html](tbl-3.html)` dans le Markdown (lien simple, sans `!`). |
| `content` | string | Contenu du tableau dans le format demandé (HTML avec `rowspan`/`colspan` dans l'exemple). |
| `format` | `markdown` \| `html` | Format du tableau. |
| `word_confidence_scores` | liste \| null | Scores par mot du contenu du tableau si granularité `word` (spec ; la doc le mentionne aussi). |

#### Dimensions et usage observés dans les exemples

| Exemple | `dimensions` | `usage_info` |
|---|---|---|
| PDF arXiv 2201.04234 (29 pages) | `dpi` 200, `height` 2200, `width` 1700 | `pages_processed` 29, `doc_size_bytes` 3 002 783 (= taille du fichier uploadé) |
| Image ticket de parking (receipt.png) | `dpi` 200, `height` 3210, `width` 1806 | `pages_processed` 1, `doc_size_bytes` 3 110 191 |
| PDF Pixtral (arXiv 2410.07073), annotations bbox | 200 / 2200 / 1700 | 24 pages, 12 640 953 octets |
| Même PDF, `pages` 0–7 | 200 / 2200 / 1700 | `pages_processed` 8 |
| Exemples blocs / confiance | 200 / 2200 / 1700 | 1 page, 102 400 octets |

Une page A4/Letter rendue à 200 dpi donne 1700 × 2200 px : les coordonnées des bbox sont donc exprimées dans ce repère (inférence cohérente avec la description « dimensions of the PDF Page's screenshot image » de la spec).

#### Résumé des sorties d'exemple

- **PDF par URL / base64 / URL signée** (sorties identiques) : 4 pages montrées (index 0, 1, 27, 28). Page 0 : titre `#`, auteurs, `###### Abstract`, `## 1 Introduction`, 6 hyperliens. Page 1 : texte « Published as a conference paper at ICLR 2022 » resté dans le Markdown (en-tête non extrait car `extract_header` non activé), placeholders `img-0.jpeg` et `img-1.jpeg` mais une seule entrée `images` montrée (bbox 294,222 → 943,635, `image_annotation: null`). Pages 27 et 28 : placeholders `[tbl-3.html]`/`[tbl-4.html]` et objets `tables` avec un tableau HTML complexe (`format: "html"`). `header`/`footer` à `null`, `document_annotation: null`.
- **Image** : Markdown en texte brut avec sauts de ligne (lignes du ticket : date d'expiration, montant, numéro de ticket, carte masquée…). Clés `tables`, `hyperlinks`, `header`, `footer` absentes (modèle `mistral-ocr-2505-completion`).

Placeholders (encadré `:::note`) : quand l'OCR extrait images et tableaux, le Markdown contient des placeholders ; on utilise `images` et `tables` pour les relier à l'élément extrait.

### 3.6 Tableaux (`table_format`)

| Valeur | Comportement |
|---|---|
| `null` (défaut) | Tableaux renvoyés **inline** dans le Markdown de la page, en syntaxe Markdown (ex. lignes `| … |` avec alignements `:--:`). `tables` vide. |
| `markdown` | Tableaux extraits **séparément** dans `tables` au format Markdown ; placeholder dans la page. |
| `html` | Tableaux extraits séparément au format HTML (`<table><tr><td rowspan=…>`) ; placeholder `[tbl-N.html](tbl-N.html)`. |

- Réservé aux modèles OCR 2512+.
- Dans les exemples d'annotations (modèle 2505), un tableau complexe est rendu inline en Markdown, avec cellules fusionnées aplaties (`<br>` dans les en-têtes, valeurs en `$\mathbf{…}$`).

### 3.7 En-têtes et pieds de page

- Par défaut, l'OCR traite en-têtes et pieds de page comme du **contenu principal** (ils restent dans `markdown`).
- `extract_header=True` / `extract_footer=True` : le contenu est placé dans `header` / `footer` et retiré du Markdown (spec).
- Valeurs par défaut `False` ; OCR 2512+.
- Indépendamment, l'extraction de blocs peut produire des blocs de type `header`/`footer` (l'exemple de blocs contient un bloc `footer` sans que `extract_footer` soit activé).

### 3.8 Extraction de blocs (`include_blocks`)

- Avec `include_blocks=True`, chaque page reçoit un tableau `blocks` : une entrée par région de contenu, **en ordre de lecture**.
- Champs de chaque bloc : `type`, `top_left_x`, `top_left_y`, `bottom_right_x`, `bottom_right_y`, `content` (texte/Markdown/HTML), plus `confidence_scores` si granularité `block`. Champs additionnels : `image_id` pour `image` (requis), `table_id` pour `table` (si tableaux extraits).
- Dans la spec, `blocks` est une union discriminée par `type` (`OCRTextBlock`, `OCRTitleBlock`, etc.).
- OCR 4+ uniquement ; modèles antérieurs → tableau vide.

| `type` | Description |
|---|---|
| `text` | Paragraphe de texte courant. |
| `title` | Titre de document ou de section. |
| `list` | Liste à puces ou numérotée (contenu en Markdown `- …`). |
| `table` | Région de tableau ; `table_id` renvoie à l'entrée de `tables` quand les tableaux sont extraits. |
| `image` | Région d'image ; `image_id` renvoie à l'entrée de `images`. `content` vide. |
| `equation` | Équation mathématique (contenu LaTeX `$…$`). |
| `caption` | Légende associée à une figure ou un tableau. |
| `code` | Bloc de code. |
| `references` | Bibliographie / références. |
| `aside_text` | Encadré, note latérale, texte marginal. |
| `header` | En-tête de page. |
| `footer` | Pied de page. |
| `signature` | Zone de signature ; `content` = nom transcrit si lisible, sinon chaîne vide. |

Exemple (résumé) : requête sur arXiv 2201.04234 avec `include_blocks=True` et `confidence_scores_granularity="block"`, réponse `mistral-ocr-4-1` ; la page 0 contient 7 blocs : `title`, `image` (`image_id: "img-0.jpeg"`, bbox identique à celle de `images[0]`, scores de contenu `null`), `caption`, `text`, `equation`, `list`, `footer`. `image_base64` est `null` (option non demandée).

### 3.9 Scores de confiance (`confidence_scores_granularity`)

| Valeur | Ce qui est renvoyé |
|---|---|
| `"page"` | Objet `confidence_scores` par page avec `average_page_confidence_score` et `minimum_page_confidence_score`. |
| `"block"` | Tout `"page"` + `confidence_scores` sur chaque bloc (nécessite `include_blocks=true`). |
| `"word"` | Tout `"page"` + tableau `word_confidence_scores` par page **et** par entrée de `tables`. |
| `null` (défaut) | Aucun score. |

- **Scores de bloc** : `average_content_confidence_score`, `minimum_content_confidence_score`, `block_type_confidence_score` (confiance dans le type détecté). Les scores de contenu peuvent être `null` pour un bloc sans texte (ex. image) ; la spec précise que tous les champs sont `null` si le bloc n'a pas pu être évalué.
- **Score par mot** (`OCRConfidenceScore`) : `text` (le mot ou segment, espace initial compris, ou séparateur `\n\n`), `confidence` (0–1), `start_index` (position dans la chaîne `markdown` de la page).
- **Méthode de calcul (spec)** : pour `page` et `block`, moyenne/minimum calculés à partir des `exp(logprob)` par token ; pour `word`, confiance d'un mot = `exp(moyenne des logprobs de ses sous-tokens)` (moyenne géométrique), et les stats de page sont dérivées des mots. Une granularité `token` existe en interne (non exposée dans l'enum publique).
- Exemple (résumé) : page « # Mistral OCR / Extracting text with confidence. », moyenne 0,9946, minimum 0,9823 (égal au score du mot « text »), 8 entrées de mots.

### 3.10 Annotations (bbox et document)

#### Principe

Fonctionnalité ajoutée à l'OCR de base pour extraire des informations dans un **format JSON fourni par l'utilisateur**. Deux types, utilisables séparément ou ensemble :

| Type | Paramètre | Portée | Pipeline (« How it Works ») | Résultat |
|---|---|---|---|---|
| BBox annotation | `bbox_annotation_format` | Chaque bbox extraite (graphiques, figures…) | Une fois l'OCR terminé, un LLM vision est appelé **pour chaque bbox individuellement** avec le format fourni. | `pages[].images[].image_annotation` (string JSON) |
| Document annotation | `document_annotation_format` (+ `document_annotation_prompt` optionnel) | Document entier | L'OCR est exécuté, puis le **texte Markdown** et les **8 premières boîtes d'image extraites** sont envoyés à un LMM vision avec le format fourni. | `document_annotation` (string JSON, racine) |

Capacités annoncées : étiquetage/annotation de données ; extraction et structuration d'informations dans un JSON prédéfini ; automatisation de la saisie (moins d'erreurs) ; traitement de gros volumes pour l'entreprise.

Cas d'usage cités : analyse de formulaires, classification de documents, traitement d'images (texte, graphiques, signatures) ; conversion de graphiques en tableaux, extraction des petits caractères de figures, types d'images personnalisés ; reçus (marchand, montants) pour notes de frais ; factures (fournisseur, montants) pour comptabilité automatisée ; clauses et termes clés de contrats.

Formats acceptés : PDF, images (même de faible qualité ou manuscrites), scans, DOCX, PPTX…

#### Définition du schéma

- SDK : modèles **Pydantic** (Python) ou **Zod** (TypeScript) ; curl : **JSON schema** brut. Objets imbriqués, tableaux, enums acceptés.
- Les **descriptions de champs** (`Field(..., description=…)`, `.describe(…)`, `"description"`) servent d'instructions détaillées lors de l'annotation.
- Conversion SDK : `response_format_from_pydantic_model(Model)` (`mistralai.extra`) ; `responseFormatFromZodObject(Schema)` (`@mistralai/mistralai/extra/structChat.js`).
- Enveloppe JSON (curl) :

```json
{
  "type": "json_schema",
  "json_schema": {
    "name": "document_annotation",
    "strict": true,
    "schema": {"type": "object", "title": "DocumentAnnotation", "additionalProperties": false,
               "properties": {"language": {"title": "Language", "type": "string"}},
               "required": ["language"]}
  }
}
```

- Objet `json_schema` (spec `JsonSchema`) : `name` (requis), `description` (optionnel), `schema` (requis, objet libre), `strict` (bool, défaut `false`). `type` du `ResponseFormat` ∈ `text`/`json_object`/`json_schema`, mais **seul `json_schema` est valide** pour les deux champs d'annotation (spec).

Schémas d'exemple :
- BBox : `Image { image_type: str, short_description: str, summary: str }` (descriptions : type d'image, description courte en anglais, résumé).
- Document : `Document { language: str, chapter_titles: list[str], urls: list[str] }`.

#### `document_annotation_prompt`

- Prompt utilisé comme **prompt système de haut niveau** de l'étape d'annotation, pour donner contexte et consignes (ex. : extraire la langue, tous les titres de chapitres/sections, toutes les URL, « exact matches » uniquement).
- La doc conseille, en production, de contextualiser le cas d'usage et d'affiner les consignes si la sortie ne correspond pas.
- Exige un `document_annotation_format` (spec).
- La doc ne prévoit pas de prompt équivalent pour les annotations bbox.

#### Exemples (résumés)

- **BBox** sur arXiv 2410.07073 (Pixtral 12B, 24 pages, `include_image_base64=True`) : chaque image reçoit un `image_annotation` sous forme de chaîne JSON. Ex. `img-0` → type « Logo » (logo 3D « Mistral AI » en dégradé orange-jaune) ; `img-1` → « scatter plot » (deux nuages de points performance/coût) ; `img-2` → « diagram » (architecture Pixtral-ViT). `document_annotation: null`.
- **Document** sur le même PDF avec `pages=list(range(8))` : `pages_processed` 8 ; `image_annotation: null` sur les images ; `document_annotation` = chaîne JSON avec `language: "English"`, 12 titres de sections (Abstract → 4.4 Vision Encoder Ablations) et 4 URL (blog Mistral, GitHub mistral-inference et mistral-evals, dataset HF MM-MT-Bench).
- **BBox + document** : les deux paramètres dans la même requête ; résultats combinés (annotation par image + annotation globale).

#### Limites

- Document annotation : **au plus 8 bboxes d'image** par annotation ; Mistral recommande l'annotation de document pour les **documents à dominante textuelle**.
- Limites générales de l'API Document AI : ≤ 50 Mo, ≤ 1 000 pages.

### 3.11 Document QnA

- **Principe** : workflow en 2 étapes — (1) Document AI/OCR extrait texte, structure et mise en forme pour produire une version lisible par machine ; (2) un LLM analyse ce contenu et répond aux questions en langage naturel en tenant compte du contexte et des relations internes au document.
- **Capacités** : réponses sur un contenu précis ; extraction d'informations et résumé ; analyse et insights ; **requêtes et comparaisons multi-documents** ; réponses tenant compte du document entier.
- **Cas d'usage** : articles de recherche et documents techniques ; documents métier ; documents juridiques et contrats ; applications de Q&A documentaire ; automatisation de workflows documentaires.
- **Prérequis conseillé** (encadré `:::tip`) : lire la doc Chat Completions (`/studio/conversations/chat-completion`).
- **Mécanique** : appel standard `client.chat.complete` / `POST /v1/chat/completions` avec un message `user` dont `content` est une liste de blocs : un bloc `{"type": "text", "text": "<question>"}` et un bloc `{"type": "document_url", "document_url": "<URL publique | data URL base64 | URL signée>"}` (TS : `documentUrl`).
- **Modèle d'exemple** : `mistral-small-latest` ; la doc indique qu'on peut « interroger n'importe quel LLM » avec l'URL signée.
- **Trois variantes** documentées : PDF par URL publique, PDF en base64, PDF uploadé (même procédure de fichiers que l'OCR, « Document QnA is under the umbrella OCR » : `purpose="ocr"`).
- **Exemple** : arXiv 1805.04770, question « what is the last sentence in the document » → réponse = la dernière référence bibliographique (Zaremba, Sutskever, Vinyals 2014). Réponse `chat.completion` standard : `finish_reason: "stop"`, `tool_calls: null`, usage `prompt_tokens` 13 707, `completion_tokens` 57, `total_tokens` 13 764 — le texte OCR du document est donc facturé/compté comme tokens de prompt (inférence).
- **Limites** : ≤ 50 Mo et ≤ 1 000 pages (FAQ).
- La spec montre que `DocumentURLChunk` est accepté dans les contenus de messages (chat et Conversations) et que `FileChunk` (`file_id`) figure dans `ContentChunk` (spec ; usage QnA par `file_id` non documenté dans la page).

### 3.12 Gestion des fichiers pour l'OCR / QnA

Parcours « Uploaded PDF » : le fichier est stocké dans le cloud Mistral, « accessible uniquement via une clé API ».

| Étape | Python | TypeScript | HTTP | Réponse |
|---|---|---|---|---|
| Upload | `client.files.upload(file={"file_name": …, "content": open(…, "rb")}, purpose="ocr")` | `client.files.upload({file: {fileName, content}, purpose: "ocr"})` | `POST /v1/files` (multipart `-F purpose="ocr" -F file="@…"`) | `id` (UUID), `object: "file"`, `bytes`, `created_at`, `filename`, `purpose: "ocr"`, `sample_type: "ocr_input"`, `num_lines: 0`, `mimetype: "application/pdf"`, `source: "upload"`, `signature` |
| Récupération | `client.files.retrieve(file_id=…)` | `client.files.retrieve({fileId})` | `GET /v1/files/{id}` | Mêmes champs + `deleted: false` |
| URL signée | `client.files.get_signed_url(file_id=…)` | `client.files.getSignedUrl({fileId})` | `GET /v1/files/{id}/url?expiry=24` | `{ "url": "https://mistralaifilesapiprodswe.blob.core.windows.net/fine-tune/…/<id>.pdf?se=…&sp=r&sv=…&sr=b&sig=…" }` |
| OCR / QnA | `client.ocr.process(…document_url=signed_url.url…)` ou `client.chat.complete(…)` | idem | `POST /v1/ocr` / `POST /v1/chat/completions` | voir §3.5 / §3.11 |
| Suppression (optionnelle) | `client.files.delete(file_id=…)` | `client.files.delete(…)` | `DELETE /v1/files/{id}` | `{id, object: "file", deleted: true}` |

- `expiry` : nombre d'heures avant expiration ; spec : défaut 24 h, entre 1 h et 168 h. Les exemples confirment ~24 h (`created_at` 29/08/2025 10:53:01 UTC → `se=2025-08-30T10:53:22Z`).
- L'URL signée pointe vers un conteneur Azure Blob Storage nommé `fine-tune` sur le compte `mistralaifilesapiprodswe` (« swe » évoque la région Azure Sweden — inférence), avec `sp=r` (lecture seule).
- `FilePurpose` (spec) : `fine-tune`, `batch`, `ocr`, `agentic_safety` (la description mentionne aussi `audio`).

### 3.13 OCR à grande échelle, cookbooks

- Gros volumes : **Batch Inference** (`/studio/batch-processing`) pour traiter des documents en parallèle ; `/v1/ocr` fait partie de l'enum `ApiEndpoint` du batch (spec). Pour les sorties structurées : Annotations.
- Cookbooks cités : « Tool Use » (`/resources/cookbooks/mistral-ocr-tool_usage`), « Batch OCR » (`/resources/cookbooks/mistral-ocr-batch_ocr`), « Data Extraction with Structured Outputs » (Colab `mistral/ocr/data_extraction.ipynb`), « Document QnA Cookbook » (Colab `mistral/ocr/document_understanding.ipynb`).

---

## 4. Interface utilisateur

- Aucune des 4 pages ne contient de balise `AppLink`, de chemin « Studio › … » ni d'URL de console : Document AI y est décrit exclusivement comme une API/SDK.
- Seuls éléments visuels mentionnés : schémas d'illustration (`document_ai_overview.png`, `basic_ocr_graph.png`, `ocr_annotations_explanation.png`, `ocr_annotations_workflow.png`, `document_qna.png`, en versions claire/sombre).

---

## 5. API et SDK

### Endpoints

| Méthode | Chemin | Rôle |
|---|---|---|
| POST | `/v1/ocr` | OCR + annotations (operationId `ocr_v1_ocr_post`, tag `ocr`). 200 → `OCRResponse` ; 422 → `HTTPValidationError`. |
| POST | `/v1/chat/completions` | Document QnA (bloc `document_url` dans un message). |
| POST | `/v1/files` | Upload d'un document avec `purpose="ocr"`. |
| GET | `/v1/files/{file_id}` | Métadonnées du fichier. |
| GET | `/v1/files/{file_id}/url` | URL signée (`expiry` en heures, 1–168, défaut 24 — spec). |
| DELETE | `/v1/files/{file_id}` | Suppression du fichier. |
| (batch) | `/v1/ocr` comme `endpoint` d'un job batch | Traitement massif (spec + renvoi doc). |

Authentification : en-tête `Authorization: Bearer ${MISTRAL_API_KEY}` ; `Content-Type: application/json` pour `/v1/ocr`.

### Méthodes et helpers SDK

| Fonction | Python (V2) | TypeScript |
|---|---|---|
| OCR | `client.ocr.process(model=…, document=…, …)` | `client.ocr.process({model, document, …})` |
| Chat (QnA) | `client.chat.complete(model=…, messages=…)` | `client.chat.complete({model, messages})` |
| Fichiers | `client.files.upload / retrieve / get_signed_url / delete` | `client.files.upload / retrieve / getSignedUrl / delete` |
| Schéma → ResponseFormat | `from mistralai.extra import response_format_from_pydantic_model` | `import { responseFormatFromZodObject } from '@mistralai/mistralai/extra/structChat.js'` |
| Classes d'entrée | `DocumentURLChunk(document_url=…)`, `ImageURLChunk`, `ResponseFormat` | objets littéraux `{type: "document_url", documentUrl}` / `{type: "image_url", imageUrl}` |

Correspondance de nommage TS (camelCase) : `documentUrl`, `imageUrl`, `tableFormat`, `extractHeader`, `extractFooter`, `includeImageBase64`, `includeBlocks`, `confidenceScoresGranularity`, `bboxAnnotationFormat`, `documentAnnotationFormat`, `documentAnnotationPrompt`, `fileId`, `fileName`.

### Versions du SDK Python

- V2 : `pip install "mistralai>=2"`, import `from mistralai.client import Mistral` (et `from mistralai.client import Mistral, DocumentURLChunk, ImageURLChunk, ResponseFormat`).
- V1 (`mistralai 1.x`) : `from mistralai import Mistral`.
- Les exemples **OCR de PDF par URL et par base64** portent la mention « Not available in the V1 SDK (mistralai 1.x) » avec renvoi au guide de migration (`/resources/migration-guides`) ; les exemples d'OCR d'image, d'upload de fichier, d'annotations et de QnA ont encore un onglet V1. Les exemples blocs/confiance n'ont qu'un onglet Python unique en V2.

### Schémas clés (spec)

`OCRRequest`, `OCRResponse`, `OCRPageObject`, `OCRImageObject`, `OCRTableObject`, `OCRPageDimensions`, `OCRUsageInfo`, `OCRPageConfidenceScores`, `OCRConfidenceScore`, `OCRBlockConfidenceScores`, 13 schémas de blocs (`OCRTextBlock`, `OCRTitleBlock`, `OCRListBlock`, `OCRTableBlock`, `OCRImageBlock`, `OCREquationBlock`, `OCRCaptionBlock`, `OCRCodeBlock`, `OCRReferencesBlock`, `OCRAsideTextBlock`, `OCRHeaderBlock`, `OCRFooterBlock`, `OCRSignatureBlock`), `DocumentURLChunk`, `ImageURLChunk`, `FileChunk`, `ResponseFormat`, `JsonSchema`. Coordonnées de blocs : entiers ≥ 0, requises (contrairement à `OCRImageObject` où elles sont nullable).

Pas de streaming documenté pour l'OCR.

---

## 6. Limites, quotas, tarifs, disponibilité

| Élément | Valeur | Source |
|---|---|---|
| Taille max d'un fichier | 50 Mo | FAQ OCR, Annotations, QnA |
| Nombre max de pages | 1 000 | FAQ OCR, Annotations, QnA |
| Images prises en compte par l'annotation de document | 8 premières bboxes | Annotations (How it Works + FAQ) |
| Langues | « plus de 40 » (liste sur `/resources/languages#ocr`) | OCR |
| Durée de l'URL signée | défaut 24 h, 1–168 h | spec (doc : « after n hours ») |
| Tableaux séparés, en-têtes/pieds | modèles OCR 2512+ | OCR (`:::info`) |
| Blocs | modèles OCR 4+ | OCR (`:::info`) |
| Volume | Batch Inference recommandé | OCR (« OCR at scale ») |

- **Tarification** : aucune information de prix dans ces pages (ni par page, ni pour les annotations, ni pour le batch). `usage_info.pages_processed` et `doc_size_bytes` sont les seules métriques de consommation renvoyées par l'OCR ; le QnA renvoie un `usage` en tokens.
- **Plans, régions, ZDR, rétention** : non mentionnés. Le fichier uploadé reste stocké jusqu'à sa suppression explicite (« optionally delete … unless you wish to reuse it later »).

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

- **Indexation** : `index` de page et paramètre `pages` commencent à **0**.
- **`pages` en chaîne** : la spec accepte `"0-5"` ou `"0,2-4"` en plus d'une liste d'entiers ; la doc ne montre que des listes.
- **Placeholders** : images en syntaxe image Markdown (`![id](id)`), tableaux en simple lien (`[id](id)`) ; un Markdown peut contenir un placeholder sans entrée correspondante visible dans l'exemple (page 1 : `img-1.jpeg` dans le texte, une seule image listée — probablement un exemple tronqué, inférence).
- **Identifiants d'images globaux** : `img-N` est numéroté sur tout le document (ex. `img-6.jpeg` sur la page d'index 7).
- **Comportement par défaut des en-têtes** : sans `extract_header`, les en-têtes répétés (« Published as a conference paper at ICLR 2022 ») polluent le Markdown de chaque page.
- **Modèles anciens et nouveaux paramètres** : `include_blocks` sur un modèle < OCR 4 est accepté mais renvoie un tableau vide (pas d'erreur). Avec un modèle 2505, la réponse peut omettre `tables`, `hyperlinks`, `header`, `footer`.
- **`image_base64`** : `null` si `include_image_base64` n'est pas activé, même si l'image est détectée (bbox renseignée).
- **Annotations en chaînes JSON** : `image_annotation` et `document_annotation` sont des **strings** à parser (`json.loads`), pas des objets.
- **Type du schéma = forme de la sortie** : dans les exemples curl, `chapter_titles` et `urls` sont typés `string` ; la sortie brute renvoie alors des listes séparées par des virgules dans une chaîne, alors que le modèle Pydantic (`list[str]`) produit de vrais tableaux.
- **BBox annotation = un appel LLM vision par image** : le coût/latence croît avec le nombre d'images (inférence) ; `image_limit` et `image_min_size` (spec) permettent de borner l'extraction d'images (inférence sur l'interaction avec les annotations).
- **Document annotation limité à 8 images** : pour un document riche en figures, seules les 8 premières sont vues par le LMM ; l'exemple restreint d'ailleurs l'annotation aux pages 0–7.
- **`document_annotation_prompt` sans format** : invalide selon la spec (exige `document_annotation_format`).
- **`additionalProperties: false`** sur `OCRRequest` : un paramètre mal orthographié provoque une erreur de validation (422) plutôt que d'être ignoré.
- **Champ `type` du document** : facultatif en pratique (défaut `document_url`/`image_url` dans la spec) ; les exemples curl d'annotations l'omettent.
- **Confiance `block` sans `include_blocks`** : n'ajoute rien au-delà des stats de page ; il faut `include_blocks=true`.
- **Confiance `word`** : les « mots » incluent l'espace initial et les séparateurs (`"\n\n"`) ; `start_index` permet de surligner dans le Markdown.
- **Exemple de blocs** : avec granularité `block`, les blocs `equation`, `list` et `footer` de l'exemple n'ont pas de `confidence_scores` (peut-être non évaluables, ou exemple abrégé — inférence).
- **URL publique** : l'URL d'un document ou d'une image doit être accessible par l'API (pas d'auth) ; sinon, utiliser base64 ou upload + URL signée.
- **QnA** : le document entier transite comme contexte du LLM (13 707 tokens de prompt pour un article arXiv) ; pas de paramètres OCR (pages, tableaux…) exposés dans cette voie.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Défaut de `include_blocks`** : la doc présente l'option comme opt-in (« Set `include_blocks=True` »), la spec déclare `default: true`.
2. **Document QnA et `/v1/ocr`** : la page d'aperçu affirme que les trois services (dont QnA) s'utilisent via `client.ocr.process` / `/v1/ocr`, alors que QnA utilise `client.chat.complete` / `/v1/chat/completions`.
3. **Noms de champs incohérents (annotations bbox)** : schéma Pydantic/Zod avec `image_type`, schéma JSON curl avec `document_type` ; la sortie montre `image_type`.
4. **Nom du schéma bbox** : `"name": "document_annotation"` utilisé pour le format bbox dans plusieurs exemples curl (un seul exemple utilise `"bbox_annotation"`).
5. **Types de schéma document** : `chapter_titles`/`urls` = `list[str]` (Pydantic/Zod) vs `string` (JSON curl) ; la « Example Output » montre des tableaux alors que la sortie brute montre des chaînes séparées par virgules.
6. **`sample_type: "ocr_input"`** renvoyé par l'upload n'apparaît pas dans l'enum `SampleType` de la spec (`pretrain`, `instruct`, `batch_request`, `batch_result`, `batch_error`).
7. **Exemple d'upload QnA** : le code uploade `2201.04234v3.pdf`, la sortie affiche `1805.04770v2.pdf` (560 027 octets) ; l'exemple curl de chat utilise l'URL signée d'un autre fichier (`22e2e88f…`, celui de la page OCR).
8. **Snippets de suppression** : `client.files.delete(file_id=file.id)` référence une variable `file` non définie ; la version TS `client.files.delete(fileId=file.id)` n'est pas une syntaxe valide (objet attendu).
9. **Commentaires TS** : `// extractHeader: False` utilise la casse Python (`False`).
10. **Onglet base64 image** : le texte d'introduction (« any public available image as long as a direct url is available ») est un copier-coller de l'onglet URL.
11. **Ancres cassées probables** : la page Annotations renvoie vers `basic_ocr#ocr-with-pdf` et `basic_ocr#ocr-with-image`, alors que les titres de la page OCR sont « OCR with images and PDFs », « PDFs », « Images » (inférence).
12. **Support V1 du SDK** : l'OCR de PDF est déclaré « Not available in the V1 SDK », mais l'OCR d'image et les annotations (qui traitent aussi un PDF via `DocumentURLChunk`) ont des exemples V1 — la frontière exacte (probablement liée à `table_format`/`extract_*`, inférence) n'est pas expliquée.
13. **Paramètres non documentés** : `image_limit`, `image_min_size`, l'entrée `file` (`file_id`) et `document_name` n'existent que dans la spec.
14. **Correspondance modèles ↔ générations** : « OCR 2512 » et « OCR 4 » ne sont pas reliés explicitement aux IDs (`mistral-ocr-2512`, `mistral-ocr-4-1`) ; aucune liste officielle des modèles OCR, de leurs dates ni de leur statut de dépréciation dans ces pages.
15. **Formats** : la FAQ classe `.csv` sous « Excel » et liste `.doc`/`.ppt`, alors que la section « Key features » ne cite que PDF/PPTX/DOCX ; le comportement OCR sur des formats textuels (.txt, .tex, .bib) n'est pas décrit.
16. **Annotations de document et pages** : rien n'indique si l'annotation de document voit tout le Markdown d'un document de 1 000 pages ou s'il existe une limite de contexte ; l'exemple se limite à 8 pages sans l'expliquer.
17. **Tarification** des pages OCR, des annotations (appels LLM vision supplémentaires) et du batch : absente.

---

## Annexe — Couverture

| Fichier | Statut | Source |
|---|---|---|
| `overview.md` | ✅ lu en entier | https://docs.mistral.ai/studio/document-processing/overview.md |
| `basic_ocr.md` | ✅ lu en entier (lignes 1–1553 ; longues valeurs JSON `markdown`/`content` d'exemple parcourues et résumées) | https://docs.mistral.ai/studio/document-processing/basic_ocr.md |
| `annotations.md` | ✅ lu en entier (lignes 1–1394 ; sorties d'exemple résumées) | https://docs.mistral.ai/studio/document-processing/annotations.md |
| `document_qna.md` | ✅ lu en entier (lignes 1–773) | https://docs.mistral.ai/studio/document-processing/document_qna.md |

Vérifications complémentaires dans la spec OpenAPI locale : `/v1/ocr`, `OCRRequest`, `OCRResponse`, `OCRPageObject`, `OCRImageObject`, `OCRTableObject`, `OCRUsageInfo`, `OCRPageDimensions`, schémas de blocs et de confiance, `FileChunk`, `DocumentURLChunk`, `ImageURLChunk`, `ResponseFormat`, `JsonSchema`, `/v1/files/{file_id}/url`, `FilePurpose`, `SampleType`, `ApiEndpoint` (batch), `ContentChunk`, capacité `ocr` des modèles.
