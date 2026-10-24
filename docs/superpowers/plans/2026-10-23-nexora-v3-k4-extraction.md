# K4 — Document AI : extraction structurée et tableaux — plan d'implémentation

> **Pour les agents :** sous-compétence requise : superpowers:executing-plans (exécution par le sous-agent K4 lui-même). Les étapes se cochent (`- [x]`) au fil de l'eau.

**But :** extraire d'une facture, d'un devis, d'un bon de commande ou d'une note de frais (PDF numérique, PDF scanné ou image) un JSON validé, avec un indicateur « à vérifier », et le ranger dans une table ; servir la même extraction par `/v1/ocr` de Nexora API au format de Mistral (`document_annotation_format` ⇒ `document_annotation`).

**Architecture :** une seule chaîne d'extraction, dans Nexora API. `/v1/ocr` lit lui-même un PDF numérique (pdfplumber : ordre de lecture, titres, tableaux en Markdown ou HTML), fait lire les pages scannées (au plus 10 par requête) par le modèle de vision de la requête (`qwen2.5vl:3b`), puis, si `document_annotation_format` est fourni, fait remplir le schéma par un modèle de discussion (`annotation_model`, extension Nexora, par défaut `nexora-default`) avec `response_format` JSON Schema, réflexion retirée et JSON extrait de façon robuste. WorkStudio appelle `/v1/ocr` une fois (bloc « Extraire des données »), valide et convertit les valeurs (nombres français, dates), lève « à vérifier » avec ses motifs, et produit une ligne prête pour une table ; la carte « Capturer » crée la table et le workflow Start → Extraction → Table (insérer une ligne).

**Pile :** Python 3.12, FastAPI, pydantic, pdfplumber 0.11.10 (MIT) + pdfminer.six (MIT) + pypdfium2 (Apache-2.0/BSD-3) + Pillow (MIT-CMU) ; TypeScript, Next.js, next-intl, Vitest.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` ; contenu et « Terminé quand » : `docs/recherche/ecart-mistral-studio-v2.md` §3.2 (K4) et §1.10 ; format Mistral : `docs/recherche/mistral-studio/16-document-ai-ocr.md` §3.4–3.10.

## Contraintes globales

- Aucun code `ee/` d'origine ; tout texte visible par next-intl (`messages/{fr,en}`), anglais = texte source ; marque Nexora ; `check-i18n/brand/no-ee/licenses` verts.
- Matériel visé : 8 cœurs, 32 Go, 100 Go, GPU facultatif ⇒ pas de dépendance lourde (torch) dans l'image Nexora API.
- Rien ne sort de l'instance sans action d'un administrateur : le PDF numérique est lu dans Nexora API, sans modèle ; les modèles appelés sont ceux de Réglages › Modèles.
- Double vérification : GLM 5.3 (`cloud-glm-5-3`, raisonnement) **et** `qwen2.5:7b` sur CPU pour la structuration.
- TDD : chaque test rouge avant le code ; tests Python + `ruff` pour Nexora API.
- Ne pas toucher `lib/nexora/developer-api/**`, `publish-section.tsx`, `general-agent.ts`, `lib/workspaces/lifecycle.ts`, `proxy.ts`, `app/layout.tsx`, `lib/permission-groups/capabilities.ts`, `lib/nexora/model-admin.ts`, `model-cards.ts`, `audit-labels.ts`, calendrier emcn (travaux concurrents).

## Décisions (rulings)

| # | Décision | Coût si faux |
|---|---|---|
| R1 | **pdfplumber au lieu de Docling.** Docling 2.142 tire 122 paquets, 3,35 Go de roues (torch 454 Mo + bibliothèques CUDA propriétaires NVIDIA ~2,5 Go), des poids de modèles téléchargés depuis Hugging Face au premier usage, et 1 à plusieurs s/page de CPU (mise en page + TableFormer). pdfplumber + pdfminer.six + pypdfium2 + Pillow : ~15 Mo, licences MIT/Apache/BSD, millisecondes par page. | Tableaux sans filets et mises en page à plusieurs colonnes moins bien rendus que Docling ; Docling reste possible plus tard en profil facultatif. |
| R2 | Tableaux détectés par leurs **filets** (stratégie `lines`) ; un tableau sans filets sort en lignes de texte dans l'ordre de lecture. | Un tableau sans bordure n'est pas restitué en tableau Markdown (le modèle de structuration lit quand même les valeurs). |
| R3 | Un PDF est lu par Nexora API (et non refusé « images only ») quand le modèle de la requête est un modèle de vision servi par chat (`openai`, `vllm`). Pages à couche de texte ⇒ lues localement ; pages scannées (moins de 20 caractères et au moins une image) ⇒ rendues (1 568 px) et lues par le modèle de vision, **au plus 10 par requête** ; au-delà, le refus 422 « reads images only » d'avant est conservé, et les appelants (bloc OCR, bases de connaissances) continuent page par page. | Un appel API sur un scan de plus de 10 pages doit envoyer les pages en images (comme en v2). |
| R4 | Annotation : `annotation_model` (extension Nexora) ou, à défaut, l'alias `nexora-default`, appelé par le cas d'usage de discussion (droits, débit, consommation comptés sur ce modèle). Un modèle Mistral OCR reçoit `document_annotation_format` tel quel (annotation native). `response_format` JSON Schema, puis `json_object`, puis rien, sur un 400/422 ; réflexion `<think>` retirée ; premier objet JSON équilibré retenu. Échec ⇒ `document_annotation: null` et `document_annotation_error` (extension). | Deux appels de modèle comptés séparément dans la consommation. |
| R5 | La structuration **ne vit que dans Nexora API** ; WorkStudio ne fait que valider/convertir (nombres français, dates, totaux HT + TVA = TTC à 0,02 près, champs obligatoires) et lever « à vérifier ». | Une seule invite à régler ; WorkStudio dépend de la nouvelle image Nexora API. |
| R6 | Extraction limitée à **10 pages scannées** (champ « Pages » pour choisir) et exige un modèle Vision / OCR (comme « Lire un document ») ; la carte n'apparaît que si les usages Discussion et Vision ont un modèle. | Sans modèle de vision, même un PDF numérique ne s'extrait pas. |
| R7 | L'écriture dans une table est un **bloc Table (insérer une ligne)** placé après l'extraction par la carte, qui crée la table (« Factures »…) ; le bloc d'extraction produit `row` (champs + `a_verifier` + `motifs`). Aucune nouvelle opération protégée. | L'écriture est un bloc visible de plus sur le canevas, pas un interrupteur du bloc. |
| R8 | Pas de relais `/v1/ocr` dans la passerelle K3 dans ce jalon : `lib/nexora/developer-api/**` est en cours de correction par un autre agent. À ajouter par la session principale (même forme que `/v1/embeddings`). | Les clés `sk-nexora-…` n'atteignent pas encore l'extraction ; vérification API faite sur Nexora API directement. |
| R9 | Schéma visuel = sous-bloc `input-format` (nom, type, description, valeur = exemple facultatif) ; `file[]` traité comme texte ; les modèles prêts ajoutent le type `date`. | Pas de type « date » dans l'éditeur visuel (description « AAAA-MM-JJ » à la place). |

## Fichiers

**Nexora API (`services/nexora-api/`)**
- Modifier `pyproject.toml`, `uv.lock` : `pdfplumber==0.11.10` dans l'extra `api` (et `test` via l'environnement).
- Créer `api/infrastructure/documents/__init__.py`, `api/infrastructure/documents/_pdfreader.py` : lecture locale (`read_pdf(data, pages, table_format) -> PdfReading`).
- Modifier `api/domain/ocr/entities.py`, `api/infrastructure/fastapi/schemas/ocr.py` : champs Mistral (`document_annotation_format`, `table_format`, `pages`) + `annotation_model`, `tables`, `document_annotation_error`.
- Modifier `api/use_cases/_providerrequestforwardingusecase.py` : `_send_request` découpé en `_select_provider` + `_send_to_provider`.
- Modifier `api/use_cases/ocr/_createocrusecase.py` : chemin PDF local / pages scannées.
- Créer `api/use_cases/ocr/_annotatedocumentusecase.py` : annotation par un modèle de discussion.
- Modifier `api/infrastructure/fastapi/endpoints/ocr.py`, `api/dependencies.py`, adaptateurs OCR `openai` et `mistral`.
- Tests : `api/tests/unit/infrastructure/documents/test_pdfreader.py`, `api/tests/unit/use_case/ocr/test_createocrusecase.py`, `api/tests/unit/use_case/ocr/test_annotatedocumentusecase.py`, `api/tests/unit/infrastructure/http/adapters/test_ocradapter.py`.

**WorkStudio (`workstudio/apps/sim/`)**
- Créer `lib/nexora/document-ai/extraction.ts` (+ `extraction.test.ts`) : champs, modèles prêts, format d'annotation, appel, validation.
- Modifier `lib/internal/nexora-document-ai/schema.ts`, `execute-tool.ts` ; `lib/internal/tool-operations/registry.server.ts` (id `nexora_extract`).
- Créer `tools/nexora/extract.ts` ; enregistrer dans `tools/registry.ts` (+ fichiers générés).
- Créer `blocks/blocks/nexora_extract.ts` ; enregistrer dans `blocks/registry-maps.ts` ; icône existante.
- Modifier `lib/nexora/capture-templates.ts` (+ test) et `app/workspace/[workspaceId]/home/nexora-home/capture-cards.tsx` (+ fenêtre de choix).
- Messages : `messages/{fr,en}/blocks.json` (`nexora_extract`), `home.json` (carte), `errors.json` (`extraction.*`).
- `lib/i18n/blocks-coverage.test.ts` : `nexora_extract` dans la liste couverte.

**Racine**
- `docs/guide/documents-et-voix.md` : section « Extraire des données ».
- `scripts/smoke.py` : contrôle « Extraction » (facture PDF numérique + scan).
- `docs/verification/k4-factures/` : `generer.py`, 10 factures, `attendu.json`, `mesurer.py`, rapport.
- `THIRD_PARTY_NOTICES.md` : pdfplumber et dépendances.

## Points de vigilance (Review Focus)

- PDF chiffré, corrompu ou pas un PDF dans `data:application/pdf` ⇒ 422 clair, jamais 500 (test `test_should_refuse_a_broken_pdf`).
- Nombres français « 1 234,56 € », « 1.234,56 », espaces insécables ⇒ 1234.56 ; « 12,5 % » n'est pas un montant mal lu (test `parses French amounts`).
- Modèle de raisonnement qui répond `<think>…</think>` puis du JSON clôturé ```json ⇒ JSON retenu (test `test_should_keep_the_json_after_the_reasoning`).
- `pages` hors du document ou chaîne « 0-2 » ⇒ pages filtrées / comprises, pas d'exception (test `test_should_read_only_the_requested_pages`).
- Modèle qui ignore le schéma (clé manquante, montant en texte) ⇒ « à vérifier » avec le motif, jamais d'échec du bloc (test `flags a missing required field`).

---

### Tâche 1 : lecture locale des PDF numériques (Nexora API)

**Fichiers :** `pyproject.toml`, `uv.lock`, `api/infrastructure/documents/*`, test `api/tests/unit/infrastructure/documents/test_pdfreader.py`.

**Interfaces :**
- Produit : `read_pdf(data: bytes, pages: list[int] | str | None, table_format: Literal["markdown","html"] | None) -> PdfReading` ; `PdfReading.pages: list[PdfPage]` avec `PdfPage(index: int, markdown: str | None, tables: list[OCRTableObject-like dict], needs_vision: bool, render_png() -> bytes)` ; lève `UnreadablePdfError` (PDF illisible ou chiffré).

- [x] Écrire les tests (PDF générés dans le test : texte + tableau à filets, page scannée = image seule, page blanche) : `test_should_read_the_text_layer_in_reading_order`, `test_should_render_a_ruled_table_as_markdown_inline`, `test_should_extract_tables_apart_with_placeholders` (`[tbl-0.md](tbl-0.md)` / html), `test_should_mark_a_page_without_text_but_with_an_image_as_needing_vision`, `test_should_not_mark_a_blank_page`, `test_should_read_only_the_requested_pages` (liste, « 0-1 », hors bornes ignorées), `test_should_refuse_a_broken_pdf`, `test_should_render_a_page_at_most_1568_px`.
- [x] Lancer : rouge (module absent).
- [x] Ajouter pdfplumber (venv + `uv.lock` via l'image `ghcr.io/astral-sh/uv`), implémenter `read_pdf` (titres `#` quand la taille de police ≥ 1,3 × la médiane).
- [x] Lancer : vert ; `ruff check` + `ruff format --check`.

### Tâche 2 : `/v1/ocr` lit les PDF et accepte `document_annotation_format` (Nexora API)

**Fichiers :** entités/schémas OCR, cas d'usage de transfert, `CreateOCRUseCase`, `AnnotateDocumentUseCase`, point d'entrée, dépendances, adaptateurs OCR ; tests associés.

**Interfaces :**
- Consomme : `read_pdf` (tâche 1).
- Produit (corps) : `document_annotation_format: {type: "json_schema", json_schema: {name, schema, strict?, description?}}`, `document_annotation_prompt`, `annotation_model` (Nexora), `table_format`, `pages`. Réponse : `pages[].tables`, `document_annotation` (chaîne JSON), `document_annotation_error` (Nexora).
- `AnnotateDocumentUseCase.execute(AnnotateDocumentCommand(markdown, response_format, prompt, model, authenticated_user, authenticated_key)) -> AnnotateDocumentSuccess(annotation: str) | AnnotationFailed(reason: str) | ProviderRequestForwardingUseCaseError`.
- `extract_json_object(answer: str) -> dict | None` (réflexion retirée, clôture retirée, premier objet équilibré).

- [x] Tests rouges : `test_should_read_a_digital_pdf_without_calling_the_model` (aucun `forward`), `test_should_read_scanned_pages_with_the_vision_model` (un `forward` image par page scannée, jetons additionnés), `test_should_refuse_more_than_ten_scanned_pages_as_images_only`, `test_should_forward_a_pdf_to_mistral_as_is` ; `test_should_ask_the_chat_model_with_the_json_schema`, `test_should_retry_without_response_format_when_refused`, `test_should_keep_the_json_after_the_reasoning`, `test_should_report_an_answer_without_json` ; adaptateurs : `test_should_transcribe_when_an_annotation_format_is_given` (la consigne devient une consigne d'annotation, pas une question au modèle de vision), `test_should_forward_the_annotation_format_to_mistral` et `annotation_model` retiré.
- [x] Implémenter ; `_send_request` découpé sans changer le comportement (tests existants verts).
- [x] Point d'entrée : après l'OCR, annotation si `document_annotation_format` et pas d'annotation native ; PDF illisible ⇒ 422.
- [x] `pytest api/tests/unit -q` vert, `ruff` vert.
- [x] Essai réel avec un Nexora API jetable (Postgres/Redis jetables, Ollama de la pile, GLM via le Nexora API de la pile) : PDF numérique ⇒ tableau Markdown ; schéma ⇒ JSON attendu ; scan PNG ⇒ JSON attendu.

### Tâche 3 : extraction et validation (WorkStudio)

**Fichiers :** `lib/nexora/document-ai/extraction.ts`, `extraction.test.ts`, `messages/{fr,en}/errors.json`.

**Interfaces :**
- Produit : `type ExtractionFieldType = 'string'|'number'|'boolean'|'date'|'array'|'object'` ; `interface ExtractionField { name: string; type: ExtractionFieldType; description?: string; example?: string; required?: boolean }` ; `EXTRACTION_TEMPLATES: Record<ExtractionTemplateId, ExtractionField[]>` avec `ExtractionTemplateId = 'invoice'|'quote'|'purchase_order'|'expense_report'` ; `toExtractionFields(raw: unknown): ExtractionField[]` (depuis `input-format`) ; `annotationFormat(fields)` ; `validateExtraction(raw: unknown, fields): ExtractionValidation { data: Record<string, unknown>; toVerify: boolean; issues: string[] }` ; `extractDocumentData(input: { file: Buffer; mimeType: string; fields: ExtractionField[]; instructions?: string; visionModel?: string|null; model?: string|null; pages?: number[] }, options?: NexoraApiOptions): Promise<ExtractionOutput>` avec `ExtractionOutput = ExtractionValidation & { row: Record<string, unknown>; markdown: string; model: string; visionModel: string }`.
- Facture : `numero`, `date` (date), `fournisseur`, `client`, `total_ht`, `total_tva`, `total_ttc` (nombres), `date_echeance` (date), `devise` ; obligatoires : `numero`, `date`, `fournisseur`, `total_ht`, `total_tva`, `total_ttc`.

- [x] Tests rouges : `parses French amounts` (« 1 234,56 € », « 1.234,56 », « 1,234.56 », « 1250 », nombre), `normalises dates` (« 15/03/2026 », « 15 mars 2026 », « 2026-03-15 », « 31/02/2026 » refusée), `flags a missing required field`, `flags totals that do not add up` (HT + TVA ≠ TTC à 0,02 près), `flags an answer that is not JSON`, `keeps optional fields empty without flagging`, `builds a strict JSON schema with every field nullable`, `sends one OCR request with the format and the default model` (corps de `/ocr` : `document_annotation_format`, `annotation_model: 'nexora-default'`, PDF en `document_url`), `the row carries a_verifier and motifs`.
- [x] Implémenter (motifs en français par `createTranslator`, zone `errors.extraction`).
- [x] Vitest vert.

### Tâche 4 : outil et bloc « Extraire des données »

**Fichiers :** `tools/nexora/extract.ts`, `tools/registry.ts`, générés, `lib/internal/nexora-document-ai/{schema,execute-tool}.ts`, `lib/internal/tool-operations/registry.server.ts`, `blocks/blocks/nexora_extract.ts`, `blocks/registry-maps.ts`, `messages/{fr,en}/blocks.json`, `lib/i18n/blocks-coverage.test.ts`.

**Interfaces :**
- Consomme : `extractDocumentData`, `toExtractionFields`, `EXTRACTION_TEMPLATES`.
- Produit : outil `nexora_extract` (paramètres `file`, `template`, `fields`, `instructions`, `visionModel`, `model`, `pages`) ; bloc `nexora_extract` (sous-blocs `fileUpload`/`fileReference` ⇒ `file`, `template`, `fields` (`input-format`, si `custom`), `instructions`, `visionModel`, `model`, `pages`) ; sorties `data`, `toVerify`, `issues`, `row`, `markdown`, `model`.

- [x] `blocks-coverage` rouge avec `nexora_extract` ajouté ; ajouter les messages ⇒ vert.
- [x] Bloc, outil, exécuteur ; `bun run apps/sim/scripts/generate-*` si les fichiers générés l'exigent ; tests de blocs verts.

### Tâche 5 : carte « Capturer › Extraire des données »

**Fichiers :** `lib/nexora/capture-templates.ts` (+ test), `capture-cards.tsx`, fenêtre `extract-capture-modal.tsx`, `messages/{fr,en}/home.json`.

**Interfaces :**
- Produit : `buildExtractionWorkflow(template: ExtractionTemplateId, tableId: string | null)` (Start `document` ⇒ bloc `nexora_extract` « Extraction » ⇒ bloc `table_v2` insérer `<extraction.row>`) ; `extractionTableColumns(template)` (colonnes typées + `a_verifier` booléen + `motifs` texte) ; `EXTRACTION_TABLE_NAMES` (`Factures`, `Devis`, `Bons_de_commande`, `Notes_de_frais`) ; `availableCaptureKinds` renvoie `extraction` si `vision` et `chat`.

- [x] Tests rouges : le workflow passe `parseWorkflowJson`, sous-blocs déclarés, références `<start.document>` et `<extraction.row>`, colonnes = champs du modèle + `a_verifier` + `motifs`, noms valides (`NAME_PATTERN`) ; carte absente sans modèle de discussion.
- [x] Implémenter la carte (choix du modèle, « Enregistrer dans une table », table réutilisée si elle a déjà les colonnes, sinon suffixe `_2`…).
- [x] Vitest vert.

### Tâche 6 : guide, fumée, jeu de 10 factures

- [x] `docs/guide/documents-et-voix.md` : section « Extraire des données » (carte, bloc, schéma, modèles prêts, « à vérifier », table, API `/v1/ocr`, limites).
- [x] `scripts/smoke.py` : `text_png` étendu (police 5×7 complète), contrôle « Extraction » : facture PDF numérique (`text_pdf`) et scannée (`text_png`), six champs vérifiés, « à vérifier » faux.
- [x] `docs/verification/k4-factures/generer.py` (5 PDF numériques à tableau à filets, 5 scans : 3 images JPEG/PNG bruitées et inclinées, 2 PDF image seule), `attendu.json`, `mesurer.py` (appel `/v1/ocr` + schéma, exactitude par champ, rapport JSON).
- [x] Mesure réelle : GLM 5.3 et `qwen2.5:7b` (≥ 90 % visé), rapport versionné.

### Tâche 7 : vérifications

- [x] biome, `bun run type-check`, `check:audits`, `check:test-types`, `check:api-validation:strict`, vitest ciblé, pytest + ruff Nexora API, `check-i18n/brand/no-ee/licenses`.
- [x] Ledger v3 : section K4 (preuves, rulings, ce que la session principale doit vérifier après déploiement).
