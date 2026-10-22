# 20 — Catalogue des modèles, ressources, changelogs et fonctionnalités dépréciées

> **Périmètre** : catalogue complet des modèles exposés par Mistral (actifs, dépréciés, retirés, tiers et spécialisés), fiches modèles, cycle de vie (dépréciation → retrait → remplacement), glossaire, glossaire des erreurs, limites connues, langues, guides de migration, SDK, changelog API, release notes produit, avis de sécurité, et fonctionnalités dépréciées (fine-tuning texte/vision, Classifier Factory, guide de customisation, `safe_prompt`, Mistral Moderation 2411 / `moderation_llm_v1`, raisonnement natif Magistral) · **Sources** : 96 pages de docs.mistral.ai (copie du 21/10/2026) + vérifications ciblées dans la spec OpenAPI locale · **Rédaction** : agent de recherche pour Nexora Studio

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Anatomie d'une fiche modèle et règles de nommage
   - 3.2 Modèles actifs (GA et Public Preview) — tableau maître
   - 3.3 Matrice des capacités (`Features`) des modèles actifs
   - 3.4 Modèles dépréciés (répondent encore jusqu'au retrait)
   - 3.5 Modèles retirés
   - 3.6 Notes par famille (Large, Medium, Small, Ministral, Magistral, Codestral/Devstral, Leanstral, Voxtral, OCR, modération, Shieldstral, Timestral, embeddings, Z.ai GLM, modèles historiques)
   - 3.7 Graphe des remplacements
   - 3.8 Calendrier des dépréciations et retraits
   - 3.9 Glossaire officiel
   - 3.10 Langues supportées
   - 3.11 Limites connues
   - 3.12 Guides de migration
   - 3.13 SDK officiels et tiers
   - 3.14 Changelog API (chronologie complète)
   - 3.15 Release notes produit
   - 3.16 Avis de sécurité
   - 3.17 Fonctionnalités dépréciées : fine-tuning (vue d'ensemble)
   - 3.18 Fonctionnalités dépréciées : fine-tuning texte & vision (SFT)
   - 3.19 Fonctionnalités dépréciées : Classifier Factory
   - 3.20 Fonctionnalités dépréciées : guide « Fine-tuning API (legacy) » / customisation
   - 3.21 Fonctionnalités dépréciées : guardrailing (`safe_prompt`, Mistral Moderation 2411)
   - 3.22 Fonctionnalités dépréciées : raisonnement natif (Magistral)
   - 3.23 Tableau « ce qui est déprécié → ce qui le remplace »
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
Annexe — Couverture

---

## 1. En bref

- Le catalogue public (`/models`) liste **75 fiches modèles** : **27 actifs** (17 GA + 10 Public Preview), **24 dépréciés** (encore servis jusqu'à leur date de retrait) et **24 retirés** (ne répondent plus ; il faut utiliser le remplaçant).
- Règle de cycle de vie officielle : un modèle **Deprecated** répond encore jusqu'à sa **Retirement date** ; un modèle **Retired** ne répond plus et pointe vers un **Replacement**.
- Les modèles « phares » actifs au 21/10/2026 : **Mistral Large 4** (`mistral-large-4`, Public Preview, 1M de contexte, MoE 1,05T / 52B actifs), **Mistral Large 3** (`mistral-large-2512`, GA), **Mistral Medium 3.5** (`mistral-medium-3-5`, GA, poids ouverts Modified MIT, raisonnement réglable), **Mistral Small 4** (`mistral-small-2603`, GA, hybride instruct/raisonnement/code), **Ministral 3** (3B/8B/14B), **Codestral 25.08**, plus les gammes spécialisées **Voxtral** (audio, transcription, temps réel, TTS), **OCR 4.1/OCR 3**, **Mistral Moderation 2** (gratuit), **Mistral Embed / Codestral Embed**.
- Modèles **tiers** : Mistral héberge **Z.ai GLM 5.3** (`zai-glm-5-3`, GA, 1M de contexte, servi « sans modification Mistral ») ; GLM 5.2 est déprécié (retrait 31/10/2026).
- Modèles **spécialisés sans ID API publié** dans le catalogue : **Shieldstral 1.0** (modération multimodale texte+image, 3,8B, Labs, Public Preview) et **Timestral 1.0** (prévision de séries temporelles zéro-shot, 4 tailles 5M→209M, Public Preview).
- Toutes les fonctions de **personnalisation** (fine-tuning SFT texte/vision, Classifier Factory, guide de customisation) sont **dépréciées et « plus activement supportées »** ; le guardrailing par `safe_prompt` et `mistral-moderation-2411`/`moderation_llm_v1` est déprécié au profit des **Custom Guardrails** (`moderation_llm_v2`, `mistral-moderation-2603`) ; le **raisonnement natif Magistral** est déprécié au profit du paramètre `reasoning_effort` sur `mistral-small-latest` / `mistral-medium-3-5`.
- Ressources transverses couvertes : glossaire (18 termes), glossaire des erreurs HTTP (400→504 + format d'erreur), limites connues (contexte, fichiers 512 Mo, batch 100 000 requêtes, 128 outils, streaming 10 min…), langues, migrations (OpenAI, Llama auto-hébergé, SDK Python v2), SDK (Python, TypeScript, 9 langages tiers), changelog API daté (2024-01-11 → 2026-10-06), release notes produit (2026-07-31 → 2026-10-09), 3 avis de sécurité 2026 (dont l'attaque supply-chain « Mini Shai-Hulud » sur les SDK).
- Public : développeurs API (choix et migration de modèles), administrateurs (cycle de vie, sécurité), équipes produit (historique des fonctionnalités).

## 2. Concepts et vocabulaire

| Terme original | Définition (FR) |
|---|---|
| `API names` | Identifiant(s) à passer dans le champ `model`. Le premier est l'ID daté/canonique, les suivants sont des alias (`-latest`, alias courts). |
| `Status` | `GA` (disponibilité générale), `Public Preview` (préversion publique), `Deprecated` (déprécié, encore servi), `Retired` (retiré, ne répond plus). |
| `Type` | Couple « canal de distribution » × « spécialisation » : `Premier` (modèle commercial, poids généralement non publiés), `Open` (poids ouverts), `Labs` (expérimental) × `Generalist` / `Specialist`. |
| `Version` | Version au format `AA.MM` (ex. `25.12`), ou numérotation sémantique pour les modèles récents (`1.5`, `3.0`, `4.1`). |
| `Context length` | Fenêtre de contexte en tokens (entrée + sortie). `--` = non applicable (modèles audio temps réel). Pour Timestral : en *timesteps*. |
| `Output token limit` | Plafond de tokens générés (indiqué seulement pour GLM 5.x et Leanstral 1.5 : 128k). |
| `Parameters` | Nombre de paramètres totaux / actifs (MoE). |
| `Input` / `Output` | Modalités : `text`, `image`, `audio`, `document`, `timeseries` en entrée ; `text`, `reasoning`, `image`, `audio`, `embeddings`, `scores`, `timeseries` en sortie. |
| `Features` | Étiquettes de capacités API : `chat-completions`, `function-calling`, `structured-outputs`, `predicted-outputs`, `document-qna`, `prefix`, `batching`, `agents-conversations`, `connectors`, `fim`, `embeddings`, `moderations`, `ocr`, `bbox-extraction`, `annotations-structured-ocr`, `timestamps`, `transcriptions`, `tts`, `voice-cloning`. |
| `Speed rating` / `Performance rating` | Notes sur 5 (pas de 0,5) ; `0/5` = non noté (modèles historiques). |
| `Pricing` | Prix publics en USD : `/M Tokens` (entrée, sortie, entrée en cache), `/Min` (audio), `/M Chars` (TTS), `/1000 Pages` et `/1000 Annotated Pages` (OCR). `Free` = 0 $. |
| `Licenses` / `Open weights` | Licence des poids (Apache 2.0, Modified MIT, MRL, MNPL, CC BY-NC 4.0) et lien Hugging Face (ou CDN Mistral). |
| `Deprecation date` / `Retirement date` / `Replacement` | Date d'annonce de la dépréciation, date d'arrêt du service, modèle de remplacement recommandé. |
| `-latest` | Alias flottant pointant vers la dernière version d'une famille (ex. `mistral-small-latest` → `mistral-small-2603`). |
| `labs-` | Préfixe des modèles expérimentaux Labs (`labs-leanstral-1-5`, `labs-devstral-small-2512`, `labs-mistral-small-creative`). |
| `open-` | Préfixe historique des premiers modèles open-weight (`open-mistral-7b`, `open-mixtral-8x7b`, `open-mistral-nemo`, `open-codestral-mamba`). |
| `ft:` | Préfixe des modèles fine-tunés : `ft:<base>:<…>:<AAAAMMJJ>:<…>` ; pour les classifieurs : `ft:classifier:<base>:…`. |
| MoE (Mixture-of-Experts) | Architecture où seule une fraction des paramètres est active par token (« granular MoE » pour Large 3/4). |
| FIM | *Fill-in-the-middle* : complétion de code à partir d'un préfixe et d'un suffixe (Codestral). |
| SFT | *Supervised fine-tuning* : méthode du fine-tuning texte/vision déprécié. |
| Thinking chunk | Bloc de contenu `{"type":"thinking","thinking":[…]}` portant la trace de raisonnement (format Magistral 2507/2509 et raisonnement actuel). |
| Guardrail | Politique de filtrage appliquée côté plateforme (Custom Guardrails : `moderation_llm_v1` déprécié, `moderation_llm_v2`). |
| Free mode / Pay-as-you-go | Mode d'accès gratuit par défaut (sans carte, usage mensuel inclus, limites de débit) / facturation à l'usage au-delà. |
| Workspace | Environnement isolé au sein d'une organisation (clés API, métriques, budget propres). |
| Advisory `MAI-AAAA-NNN` | Référence d'un avis de sécurité Mistral AI. |

---

## 3. Fonctionnalités en détail

### 3.1 Anatomie d'une fiche modèle et règles de nommage

Chaque fiche `/models/<slug>` suit le même gabarit (liste à puces) : titre, phrase de description, puis `API names`, `Status`, `Type`, `Release date`, `Version`, `Context length`, [`Output token limit`], [`Parameters`], `Input`, `Output`, [`Features`], `Speed rating`, `Performance rating`, [`Pricing`], [`Licenses`], [`Open weights`], [`Deprecation date`], [`Retirement date`], [`Replacement`]. Les champs entre crochets sont omis quand ils ne s'appliquent pas.

Le slug de page encode famille + version (`mistral-small-4-0-26-03`, `ocr-4-1`, `timestral-1-0-209m`) et diffère de l'ID API (`mistral-small-2603`, `mistral-ocr-4-1`, aucun pour Timestral).

Trois générations de schémas d'ID coexistent :

| Génération | Exemples | Règle |
|---|---|---|
| Alias historiques 2023-2024 | `mistral-tiny`, `mistral-small`, `mistral-medium` | Renommés le 2024-02-26 (cf. §3.14) |
| ID datés `AAMM` | `mistral-large-2512`, `codestral-2508`, `voxtral-mini-2602` | Suffixe = année+mois de sortie |
| ID versionnés (2026) | `mistral-medium-3-5`, `mistral-large-4`, `mistral-ocr-4-1`, `voxtral-mini-transcribe-3-0`, `zai-glm-5-3` | Numéro de version avec tirets, + alias courts (`mistral-medium-3`, `mistral-ocr-4`, `voxtral-mini-transcribe-3`, `zai-glm-5`) |

La spec OpenAPI (`GET /v1/models`, `GET /v1/models/{model_id}`) expose une fiche machine (`BaseModelCard` / `FTModelCard`) avec notamment `max_context_length` (défaut 32768), `aliases`, `deprecation` (date-time), `deprecation_replacement_model`, `default_model_temperature`, `capabilities` (voir §5).

### 3.2 Modèles actifs (GA et Public Preview) — tableau maître

Ordre = ordre du catalogue officiel. Prix en USD. « Vit./Perf. » = notes sur 5.

| # | Modèle | ID API (alias) | Famille / Type | Statut | Sortie (version) | Contexte | Entrée → Sortie | Poids ouverts / licence | Prix | Vit./Perf. |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Z.ai GLM 5.3 | `zai-glm-5-3` (`zai-glm-5`, `zai-glm-latest`) | Tiers Z.ai — Open, Generalist | GA | 2026-09-15 (5.3) | 1M ; sortie max 128k | text → reasoning, text | « third-party open weight » (pas de lien ni licence dans la fiche) | In 1,4 $/M ; cache 0,14 $/M ; Out 4,4 $/M | 5 / 5 |
| 2 | Shieldstral 1.0 | — (aucun) | Modération — Labs, Specialist | Public Preview | 2026-08-04 (1.0) | 32k | text, image → text (oui/non) | Oui — 3,8B (total = actif), Apache 2.0 (`mistralai/Shieldstral-1.0`) | non publié | non noté |
| 3 | Timestral 1.0 209M | — | Séries temporelles — Premier, Specialist | Public Preview | non publiée (1.0) | 32K timesteps | timeseries → timeseries | Oui — 209M, Modified MIT (`mistralai/Timestral-209M`) | non publié | non noté |
| 4 | Timestral 1.0 123M | — | idem | Public Preview | non publiée (1.0) | 32K | timeseries → timeseries | Oui — 123M, Modified MIT | non publié | non noté |
| 5 | Timestral 1.0 28M | — | idem | Public Preview | non publiée (1.0) | 32K | timeseries → timeseries | Oui — 28M, Modified MIT | non publié | non noté |
| 6 | Timestral 1.0 5M | — | idem | Public Preview | non publiée (1.0) | 32K | timeseries → timeseries | Oui — 5M, Modified MIT | non publié | non noté |
| 7 | Mistral Medium 3.5 | `mistral-medium-3-5` (`mistral-medium-3`, `mistral-medium-latest`) | Medium — Open, Generalist | GA | 2026-04-28 (26.04) | 256k | text, image → reasoning, text | Oui — 128B, Modified MIT (`Mistral-Medium-3.5-128B`) | In 1,5 $/M ; Out 7,5 $/M | 2 / 4,5 |
| 8 | Voxtral TTS | `voxtral-mini-tts-2603` (`voxtral-mini-tts-latest`) | Voxtral TTS — Open, Specialist | GA | 2026-03-23 (26.03) | — | text, audio → audio | Oui — 4B, **CC BY-NC 4.0** (`Voxtral-4B-TTS-2603`) | 16 $/M caractères | 4,5 / 4 |
| 9 | Voxtral Mini Transcribe 3 | `voxtral-mini-transcribe-3-0` (`voxtral-mini-transcribe-3`, `voxtral-mini-transcribe-latest`) | Voxtral transcription — Premier, Specialist | Public Preview | 2026-10-20 (3.0) | 32k | audio → text | Non | 0,0035 $/min | 4 / 4 |
| 10 | Voxtral Small Transcribe 3 | `voxtral-small-transcribe-3-0` (`voxtral-small-transcribe-3`, `voxtral-small-transcribe-latest`) | Voxtral transcription — Premier, Specialist | Public Preview | 2026-10-20 (3.0) | 32k | audio → text | Non | 0,004 $/min | 3,5 / 4,5 |
| 11 | Voxtral Mini Transcribe Realtime 3 | `voxtral-mini-transcribe-realtime-3-0` (`…-realtime-3`, `…-realtime-latest`) | Voxtral temps réel — Premier, Specialist | Public Preview | 2026-10-20 (3.0) | `--` | audio → text | Non | 0,008 $/min | 4,5 / 4 |
| 12 | Voxtral TTS 3 | `voxtral-mini-tts-3-0` (`voxtral-mini-tts-3`, `voxtral-mini-tts-latest`, `voxtral-mini-tts-realtime-3-0`, `voxtral-mini-tts-realtime-3`, `voxtral-mini-tts-realtime-latest`) | Voxtral TTS — Premier, Specialist | Public Preview | 2026-10-20 (3.0) | — | text, audio → audio | Non | 13 $/M caractères | 4,5 / 4 |
| 13 | Mistral Small 4 | `mistral-small-2603` (`mistral-small-latest`) | Small — Open, Generalist | GA | 2026-03-16 (26.03) | 256k | text, image → reasoning, text | Oui — 119B / 6,5B actifs, Apache 2.0 (`Mistral-Small-4-2603`) | In 0,15 $/M ; Out 0,6 $/M | 4 / 3,5 |
| 14 | Mistral Large 4 | `mistral-large-4` (`mistral-large-4-0`) | Large — Open, Generalist | Public Preview | 2026-10-06 (26.10) | **1M** | text, image → reasoning, text | « Coming soon » — 1,05T / 52B actifs (`Mistral-Large-4-1T-A52B`) ; licence non indiquée | In 1,36 $/M ; cache 0,14 $/M ; Out 4,18 $/M (−50 % pendant 2 semaines au lancement) | 5 / 4 |
| 15 | Mistral Large 3 | `mistral-large-2512` (`mistral-large-latest`) | Large — Open, Generalist | GA | 2025-12-02 (25.12) | 256k | text, image → text | Oui — 675B / 41B actifs, Apache 2.0 (`Mistral-Large-3-675B-Instruct-2512`) | In 0,5 $/M ; Out 1,5 $/M | 2 / 4 |
| 16 | OCR 4.1 | `mistral-ocr-4-1` (`mistral-ocr-4`, `mistral-ocr-latest`) | OCR — Premier, Specialist | GA (depuis 2026-08-31) | 2026-07-16 (4.1) | — | image, document → text, image | Non | 4 $/1000 pages ; 5 $/1000 pages annotées | 4 / 4 |
| 17 | OCR 3 | `mistral-ocr-2512` | OCR — Premier, Specialist | GA (remplaçant indiqué : OCR 4.1) | 2025-12-18 (25.12) | — | image, document → text, image | Non | 2 $/1000 pages ; 3 $/1000 pages annotées | 4 / 3 |
| 18 | Voxtral Mini Transcribe 2 | `voxtral-mini-2602` (`voxtral-mini-latest`) | Voxtral transcription — Premier, Specialist | GA | 2026-02-04 (26.02) | `--` | audio → text | Non | 0,003 $/min | 4 / 4 |
| 19 | Voxtral Mini Transcribe Realtime | `voxtral-mini-transcribe-realtime-2602` (`voxtral-mini-realtime-latest`) | Voxtral temps réel — Open, Specialist | GA | 2026-02-04 (26.02) | `--` | audio → text | Oui — 4B, Apache 2.0 (`Voxtral-Mini-4B-Realtime-2602`) | 0,006 $/min | 4 / 4 |
| 20 | Codestral (25.08) | `codestral-2508` (`codestral-latest`) | Code — Premier, Specialist | GA | 2025-07-30 (25.08) | 128k | text → text | Non | In 0,3 $/M ; Out 0,9 $/M | 3 / 4 |
| 21 | Codestral Embed | `codestral-embed-2505` (`codestral-embed`) | Embeddings code — Premier, Specialist | GA | 2025-05-28 (25.05) | 8k | text → embeddings | Non | In 0,15 $/M | 4 / 4 |
| 22 | Ministral 3 14B | `ministral-14b-2512` (`ministral-14b-latest`) | Ministral 3 — Open, Generalist | GA | 2025-12-02 (25.12) | 256k | text, image → text | Oui — 14B Instruct / Reasoning / Base, Apache 2.0 | In 0,2 $/M ; Out 0,2 $/M | 3 / 2 |
| 23 | Ministral 3 8B | `ministral-8b-2512` (`ministral-8b-latest`) | Ministral 3 — Open, Generalist | GA | 2025-12-02 (25.12) | 256k | text, image → text | Oui — 8B Instruct / Reasoning / Base, Apache 2.0 | In 0,15 $/M ; Out 0,15 $/M | 3 / 2 |
| 24 | Ministral 3 3B | `ministral-3b-2512` (`ministral-3b-latest`) | Ministral 3 — Open, Generalist | GA | 2025-12-02 (25.12) | 256k | text, image → text | Oui — 3B Instruct / Reasoning / Base, Apache 2.0 | In 0,1 $/M ; Out 0,1 $/M | 4 / 1 |
| 25 | Voxtral Small | `voxtral-small-2507` (`voxtral-small-latest`) | Voxtral audio-chat — Open, Specialist | GA | 2025-07-15 (25.07) | 32k | audio, text → text | Oui — 24B, Apache 2.0 (`Voxtral-Small-24B-2507`) | Audio 0,004 $/min ; In 0,1 $/M ; Out 0,4 $/M | 3 / 3 |
| 26 | Mistral Moderation 2 | `mistral-moderation-2603` | Modération — Premier, Specialist | GA | 2026-03-01 (26.03) | 128k | text → scores | Non | **Free** (0 $/M) | 5 / 3,5 |
| 27 | Mistral Embed | `mistral-embed-2312` (`mistral-embed`) | Embeddings texte — Premier, Specialist | GA | 2023-12-11 (23.12) | 8k | text → embeddings | Non | In 0,1 $/M | 4 / 2 |

Décompte : **17 GA** (lignes 1, 7, 8, 13, 15 à 27) + **10 Public Preview** (lignes 2 à 6, 9 à 12, 14) = **27 modèles actifs**.

### 3.3 Matrice des capacités (`Features`) des modèles actifs

Légende : ✔ = étiquette présente sur la fiche. Les modèles sans `Features` (Shieldstral, Timestral) sont omis.

| Modèle | chat-completions | function-calling | structured-outputs | predicted-outputs | document-qna | prefix | batching | agents-conversations | connectors | autres |
|---|---|---|---|---|---|---|---|---|---|---|
| Z.ai GLM 5.3 | ✔ | ✔ | ✔ | ✔ |  | ✔ | ✔ |  |  | — |
| Mistral Medium 3.5 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Mistral Small 4 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Mistral Large 4 | ✔ | ✔ | ✔ |  | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Mistral Large 3 | ✔ | ✔ | ✔ |  | ✔ | ✔ | ✔ | ✔ | ✔ | — |
| Ministral 3 (3B/8B/14B) | ✔ | ✔ | ✔ |  | ✔ | ✔ | ✔ |  |  | — |
| Codestral 25.08 | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |  |  | `fim` |
| Voxtral Small | ✔ | ✔ | ✔ |  | ✔ | ✔ | ✔ |  |  | — |
| Codestral Embed / Mistral Embed |  |  |  |  |  |  | ✔ |  |  | `embeddings` |
| Mistral Moderation 2 |  |  |  |  |  |  | ✔ |  |  | `moderations` |
| OCR 4.1 |  |  |  |  |  |  | ✔ |  |  | `ocr`, `bbox-extraction`, `annotations-structured-ocr` |
| OCR 3 |  |  |  |  |  |  | ✔ |  |  | `ocr`, `annotations-structured-ocr` (pas de `bbox-extraction`) |
| Voxtral Mini Transcribe 2 / Mini Transcribe 3 / Small Transcribe 3 |  |  |  |  |  |  |  |  |  | `timestamps`, `transcriptions` |
| Voxtral Mini Transcribe Realtime (2602 et 3) |  |  |  |  |  |  |  |  |  | `transcriptions` |
| Voxtral TTS / TTS 3 |  |  |  |  |  |  |  |  |  | `tts`, `voice-cloning` |

Constats : seuls Medium 3.5, Small 4, Large 3/4 portent `agents-conversations` + `connectors` parmi les actifs ; `predicted-outputs` manque sur Large 3/4 et Ministral 3 ; la sortie `reasoning` concerne Medium 3.5, Small 4, Large 4, GLM 5.x (et les Magistral dépréciés).

### 3.4 Modèles dépréciés (répondent encore jusqu'au retrait)

Ordre = catalogue officiel. Statut affiché `Deprecated` au 21/10/2026 — y compris pour des modèles dont la date de retrait est déjà passée (voir §8).

| Modèle | ID API (alias) | Type | Sortie | Contexte | Entrée → Sortie | Features | Poids / licence | Prix | Dépréciation | Retrait | Remplaçant |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Z.ai GLM 5.2 | `zai-glm-5-2` | Open, Generalist (tiers) | 2026-08-06 | 1M (sortie 128k) | text → reasoning, text | chat, FC, SO, PO, prefix, batching | tiers open weight | 1,4 / cache 0,14 / 4,4 $/M | 2026-09-29 | 2026-10-31 | Z.ai GLM 5.3 (même prix) |
| Leanstral 1.5 | `labs-leanstral-1-5` | Labs, Specialist | 2026-06-30 | 256k (sortie 128k) | text, image → text | chat, FC, agents-conversations, SO | 119B / 6,5B actifs, Apache 2.0 (`Leanstral-1.5-119B-A6B`) | Free | 2026-09-29 | 2026-09-30 | **aucun** |
| Mistral Medium 3.1 | `mistral-medium-2508` | Premier, Generalist | 2025-08-12 | 128k | text, image → text | SO, FC, PO, doc-qna, prefix, batching, agents, chat, connectors | non | 0,4 / 2 $/M | 2026-05-22 | 2026-08-31 | Mistral Medium 3.5 |
| Mistral Small 3.2 | `mistral-small-2506` | Open, Generalist | 2025-06-20 | 128k | text, image → text | SO, FC, doc-qna, prefix, chat, agents, batching, connectors, PO | 24B, Apache 2.0 | 0,1 / 0,3 $/M | 2026-04-30 | 2026-07-31 | Mistral Small 4 |
| OCR 4.0 | `mistral-ocr-4-0` | Premier, Specialist | 2026-06-23 | — | image, document → text, image | bbox, ocr, annotations, batching | non | 4 $ / 5 $ par 1000 p. | 2026-09-29 | 2026-09-30 | OCR 4.1 (même prix) |
| Voxtral Mini Transcribe | `voxtral-mini-2507` | Premier, Specialist | 2025-07-15 | 32k | audio → text | timestamps, transcriptions | non | 0,002 $/min | 2026-02-27 | 2026-05-31 | Voxtral Mini Transcribe 2 |
| Devstral 2 | `devstral-2512` (`devstral-latest`, `devstral-medium-latest`) | Open, Specialist | 2025-12-09 | 256k | text → text | SO, FC, doc-qna, prefix, chat, batching | 123B, Modified MIT | 0,4 / 2 $/M | 2026-05-22 | 2026-07-31 | Mistral Medium 3.5 |
| Mistral Small Creative | `labs-mistral-small-creative` | Labs, Specialist | 2025-12-11 | 32k | text → text | doc-qna, chat, batching, SO, FC | non | 0,1 / 0,3 $/M | 2026-03-31 | 2026-04-30 | Ministral 3 8B |
| Devstral Small 2 | `labs-devstral-small-2512` (`devstral-small-latest`) | Labs, Specialist | 2025-12-09 | 256k | text, image → text | SO, FC, doc-qna, prefix, chat, batching | 24B, Apache 2.0 | 0,1 / 0,3 $/M | 2026-02-27 | 2026-03-31 | Mistral Medium 3.5 |
| Magistral Medium 1.2 | `magistral-medium-2509` (`magistral-medium-latest`) | Premier, Generalist | 2025-09-18 | 128k | text, image → reasoning, text | FC, doc-qna, chat, batching | non | 2 / 5 $/M | 2026-05-22 | 2026-07-31 | Mistral Medium 3.5 |
| Magistral Small 1.2 | `magistral-small-2509` (`magistral-small-latest`) | Open, Generalist | 2025-09-18 | 128k | text, image → reasoning, text | FC, doc-qna, chat, batching | 24B, Apache 2.0 | 0,5 / 1,5 $/M | April 30, 2026 | July 31, 2026 | Mistral Small 4 |
| Voxtral Mini | `voxtral-mini-2507` (`voxtral-mini-latest`) | Open, Specialist | 2025-07-15 | 32k | audio, text → text | SO, doc-qna, prefix, chat, batching | « 4B » (dépôt `Voxtral-Mini-3B-2507`), Apache 2.0 | 0,001 $/min ; 0,04 / 0,04 $/M | 2026-02-27 | 2026-05-31 | Voxtral Mini Transcribe 2 |
| Devstral Medium 1.0 | `devstral-medium-2507` | Premier, Specialist | 2025-07-10 | 128k | text → text | SO, FC, doc-qna, prefix, chat, batching | non | 0,4 / 2 $/M | 2026-02-27 | 2026-05-31 | Mistral Medium 3.5 |
| Devstral Small 1.1 | `devstral-small-2507` | Open, Specialist | 2025-07-10 | 128k | text → text | SO, FC, doc-qna, prefix, chat, batching | 24B, Apache 2.0 | 0,1 / 0,3 $/M | 2026-02-27 | 2026-05-31 | Mistral Small 4 |
| OCR 2 | `mistral-ocr-2505` | Premier, Specialist | 2025-05-22 | — | image, document → text, image | bbox, ocr, annotations, batching | non | 1 $ / 3 $ par 1000 p. | 2026-02-27 | 2026-05-31 | OCR 4.1 |
| Mistral Medium 3 | `mistral-medium-2505` | Premier, Generalist | 2025-05-07 | 128k | text, image → text | SO, FC, doc-qna, prefix, chat, agents, connectors, batching, PO | non | 0,4 / 2 $/M | 2026-05-22 | 2026-08-31 | Mistral Medium 3.5 |
| OCR | `mistral-ocr-2503` | Premier, Specialist | 2025-03-06 | — | image, document → text, image | (aucune) | non | non indiqué | 2025-12-02 | 2025-12-31 | OCR 4.1 |
| Mistral Large 2.1 | `mistral-large-2411` | Premier, Generalist | 2024-11-18 | 128k | text → text | SO, FC, PO, doc-qna, prefix, chat, batching | 123B, MRL | 2 / 6 $/M | 2026-02-27 | 2026-05-31 | Mistral Medium 3.5 |
| Pixtral Large | `pixtral-large-2411` (`pixtral-large-latest`) | Premier, Generalist | 2024-11-18 | 128k | text, image → text | SO, FC, PO, doc-qna, prefix, chat, batching | 124B, MRL | 2 / 6 $/M | 2026-02-27 | 2026-05-31 | Mistral Medium 3.5 |
| Mistral Moderation | `mistral-moderation-2411` | Premier, Specialist | 2024-11-06 | 8k | text → scores | moderations, batching | non | 0,1 $/M | 2026-03-31 | 2026-06-30 | Mistral Moderation 2 |
| Ministral 3B | `ministral-3b-2410` | Premier, Generalist | 2024-10-09 (24.1) | 128k | text → text | SO, FC, doc-qna, prefix, chat, batching | non | 0,04 / 0,04 $/M | 2025-12-02 | 2025-12-31 | Ministral 3 3B |
| Ministral 8B | `ministral-8b-2410` | Premier, Generalist | 2024-10-09 (24.1) | 128k | text → text | idem | 8B, MRL (`Ministral-8B-Instruct-2410`) | 0,1 / 0,1 $/M | 2025-12-02 | 2025-12-31 | Ministral 3 8B |
| Pixtral 12B | `pixtral-12b-2409` | Open, Generalist | 2024-09-11 | 128k | text, image → text | idem | 12B Instruct + Base, Apache 2.0 | 0,15 / 0,15 $/M | 2025-12-02 | 2025-12-31 | Ministral 3 14B |
| Mistral Nemo 12B | `open-mistral-nemo-2407` (`open-mistral-nemo`) | Open, Generalist | 2024-07-18 | 128k | text → text | idem | 12B Instruct + Base + FP8 Instruct, Apache 2.0 | 0,15 / 0,15 $/M | 2026-05-22 | 2026-07-31 | Ministral 3 8B |

Abréviations : SO = structured-outputs, FC = function-calling, PO = predicted-outputs, chat = chat-completions, agents = agents-conversations, bbox = bbox-extraction, annotations = annotations-structured-ocr.

### 3.5 Modèles retirés

| Modèle | ID API | Type | Sortie (version) | Contexte | E → S | Features | Poids / licence | Prix (historique) | Dépréciation | Retrait | Remplaçant |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Leanstral | `labs-leanstral-2603` | Labs, Specialist | 2026-03-16 (26.03) | 256k | text, image → text | chat, FC, agents, SO | 119B / 6,5B actifs, Apache 2.0 (`Leanstral-2603`) | Free | 2026-05-22 | 2026-06-30 | Leanstral 1.5 |
| Magistral Medium 1.1 | `magistral-medium-2507` | Premier, Generalist | 2025-07-24 | 40k | text → reasoning, text | FC, doc-qna, chat, batching | non | 2 / 5 $/M | 2025-10-31 | 2025-11-30 | Mistral Medium 3.5 |
| Magistral Small 1.1 | `magistral-small-2507` | Open, Generalist | 2025-07-24 | 40k | text → reasoning, text | idem | 24B, Apache 2.0 | 0,5 / 1,5 $/M | 2025-10-31 | 2025-11-30 | Mistral Small 4 |
| Magistral Medium 1.0 | `magistral-medium-2506` | Premier, Generalist | 2025-06-10 | 40k | text → reasoning, text | idem | non | 2 / 5 $/M | 2025-10-31 | 2025-11-30 | Mistral Medium 3.5 |
| Magistral Small 1.0 | `magistral-small-2506` | Open, Generalist | 2025-06-10 | 40k | text → reasoning, text | idem | 24B, Apache 2.0 | 0,5 / 1,5 $/M | 2025-10-31 | 2025-11-30 | Mistral Small 4 |
| Devstral Small 1.0 | `devstral-small-2505` | Open, Specialist | 2025-05-21 | 128k | text → text | SO, FC, doc-qna, prefix, chat, batching | 24B, Apache 2.0 | 0,1 / 0,3 $/M | 2025-10-31 | 2025-11-30 | Mistral Medium 3.5 |
| Mistral Small 3.1 | `mistral-small-2503` | Open, Generalist | 2025-03-17 | 128k | text, image → text | SO, FC, doc-qna, prefix, chat, agents, connectors, batching, PO | 24B Instruct + Base, Apache 2.0 | 0,1 / 0,3 $/M | 2025-11-06 | 2025-11-30 | Mistral Small 4 |
| Mistral Saba | `mistral-saba-2502` (`mistral-saba-latest`) | Premier, Specialist | 2025-02-17 | 32k | text → text | — | non | — | 2025-06-10 | 2025-09-30 | Mistral Small 4 |
| Mistral Small 3.0 | `mistral-small-2501` | Open, Generalist | 2025-01-30 | 32k | text → text | SO, FC, doc-qna, prefix, chat, agents, connectors, batching | 24B Instruct + Base, Apache 2.0 | 0,1 / 0,3 $/M | 2025-11-06 | 2025-11-30 | Mistral Small 4 |
| Codestral (25.01) | `codestral-2501` | Premier, Specialist | 2025-01-13 | 128k | text → text | SO, FC, PO, doc-qna, prefix, chat, batching, fim | non | 0,3 / 0,9 $/M | 2025-11-06 | 2025-11-30 | Codestral 25.08 |
| Mistral Small 2.0 | `mistral-small-2409` | Premier, Generalist | 2024-09-17 | 32k | text → text | SO, FC, doc-qna, prefix, chat, batching | 22B, MRL | 0,1 / 0,3 $/M | 2025-11-06 | 2025-11-30 | Mistral Small 4 |
| Mistral Large 2.0 | `mistral-large-2407` | Premier, Generalist | 2024-07-24 | 128k | text → text | — | 123B, MRL | — | 2024-11-30 | 2025-03-30 | Mistral Large 3 |
| Codestral Mamba 7B | `open-codestral-mamba` | Open, Specialist | 2024-07-16 (0.1) | 256k | text → text | — | 7B, Apache 2.0 (`Mamba-Codestral-7B-v0.1`) | — | 2025-06-06 | 2025-06-06 | Codestral 25.08 |
| Mathstral 7B | — | Open, Specialist | 2024-07-16 (0.1) | 32k | text → text | — | 7B, Apache 2.0 | — | — | — | Mistral Small 4 |
| Codestral (24.05) | `codestral-2405` | Premier, Specialist | 2024-05-29 | 32k | text → text | — | 22B, **MNPL** (`Codestral-22B-v0.1`) | — | 2024-12-02 | 2025-06-16 | Codestral 25.08 |
| Mistral 7B (0.3) | `open-mistral-7b` | Open, Generalist | 2024-05-22 | 32k | text → text | — | 7B Instruct + Base, Apache 2.0 | — | 2024-11-30 | 2025-03-30 | Ministral 3 8B |
| Mixtral 8x22B | `open-mixtral-8x22b` | Open, Generalist | 2024-04-17 (0.1-0.3) | 64k | text → text | — | 141B / 39B actifs, Instruct + Base, Apache 2.0 | — | 2024-11-30 | 2025-03-30 | Mistral Small 4 |
| Mistral Small 1.0 | `mistral-small-2402` | Premier, Generalist | 2024-02-26 | 32k | text → text | — | non | — | 2024-11-30 | 2025-06-16 | Mistral Small 4 |
| Mistral Large 1.0 | `mistral-large-2402` | Premier, Generalist | 2024-02-26 | 32k | text → text | — | non | — | 2024-11-30 | 2025-06-16 | Mistral Large 3 |
| Mistral Next | — | Premier, Generalist | 2024-02-26 | — | text → text | — | non | — | — | — | Mistral Large 3 |
| Mistral Medium 1.0 | `mistral-medium-2312` | Premier, Generalist | 2023-12-11 | 32k | text → text | — | non | — | 2024-11-30 | 2025-06-16 | Mistral Medium 3.5 |
| Mixtral 8x7B | `open-mixtral-8x7b` | Open, Generalist | 2023-12-11 (0.1) | 32k | text → text | — | 47B / 13B actifs, Instruct + Base, Apache 2.0 | — | 2024-11-30 | 2025-03-30 | Mistral Small 4 |
| Mistral 7B (0.2) | `open-mistral-7b` | Open, Generalist | 2023-12-11 | 32k | text → text | — | 7B Instruct (HF) + Base (archive `.tar` sur `models.mistralcdn.com`), Apache 2.0 | — | 2024-11-30 | 2025-03-30 | Ministral 3 8B |
| Mistral 7B (0.1) | — | Open, Generalist | 2023-09-27 | 8k | text → text | — | 7B Instruct + Base, Apache 2.0 | — | 2024-11-30 | 2025-03-30 | Ministral 3 8B |

Tous les retirés antérieurs à 2025 ont `Speed rating 0/5` et `Performance rating 0/5` (non notés) et aucun `Features`/`Pricing`.

### 3.6 Notes par famille

#### Mistral Large
| Génération | ID | Faits saillants |
|---|---|---|
| Large 1.0 | `mistral-large-2402` | Premier modèle « SOTA » entreprise, 32k ; lancé avec Le Chat le 2024-02-26 (alias `mistral-large-latest` à l'époque). |
| Large 2.0 | `mistral-large-2407` | 123B, poids sous licence MRL, 128k ; baisse de prix annoncée le 2024-09-17 ; ajouté au fine-tuning le 2024-07-24. |
| Large 2.1 | `mistral-large-2411` | 123B MRL, 128k, `predicted-outputs` ; 2 $/6 $ par M ; vit. 1/5. Déprécié → Medium 3.5. |
| Large 3 | `mistral-large-2512` (`mistral-large-latest`) | MoE « granulaire », **675B totaux / 41B actifs**, multimodal texte+image, Apache 2.0, 256k, 0,5 $/1,5 $. Reste la cible de `mistral-large-latest`. |
| Large 4 | `mistral-large-4` (`mistral-large-4-0`) | MoE granulaire **1,05T / 52B actifs + encodeur vision 1,6B**, **1M de contexte**, sortie `reasoning`, prix d'entrée en cache (0,14 $/M), Public Preview depuis 2026-10-06, poids « coming soon », remise de lancement −50 % pendant 2 semaines. Note vitesse 5/5. |

#### Mistral Medium
- Medium 1.0 (`mistral-medium-2312`, 32k) : premier modèle « enterprise grade » ; renommé depuis `mistral-medium` le 2024-02-26.
- Medium 3 (`mistral-medium-2505`) et 3.1 (`mistral-medium-2508`, « amélioration du ton et des performances ») : multimodaux, 128k, 0,4 $/2 $ ; dépréciés le 2026-05-22, retrait 2026-08-31.
- **Medium 3.5** (`mistral-medium-3-5`) : modèle « frontier-class » multimodal optimisé agentique et code, **raisonnement ajustable via `reasoning_effort`** (changelog 2026-04-28), **poids ouverts 128B sous Modified MIT**, 256k, 1,5 $/7,5 $ par M (≈ 4× le prix de Medium 3.1). C'est le remplaçant désigné de **12 modèles** (Large 2.1, Pixtral Large, Devstral, Magistral Medium…).

#### Mistral Small
- Lignée : Small 1.0 (`mistral-small-2402`) → 2.0 (`2409`, 22B MRL) → 3.0 (`2501`, 24B Apache 2.0) → 3.1 (`2503`, + vision, 128k) → 3.2 (`2506`) → **Small 4** (`mistral-small-2603`).
- Small 4 : « hybride » unifiant instruct, raisonnement et code ; MoE **119B / 6,5B actifs** ; multimodal ; 256k ; sortie `reasoning` ; 0,15 $/0,6 $ ; Apache 2.0. Remplaçant de **13 modèles**.
- Historique d'ID : le 2024-02-26, `mistral-small` (alors Mixtral 8x7B, alias `mistral-small-2312`) a été renommé `open-mixtral-8x7b`, et `mistral-small-latest` est devenu `mistral-small-2402`.

#### Ministral (edge / local)
- Ministral 3B et 8B (`ministral-3b-2410`, `ministral-8b-2410`, 128k) : « meilleur modèle edge » ; le 8B a des poids MRL ; température réduite d'un facteur 0,43 le 2024-11-06. Dépréciés 2025-12-02, retrait 2025-12-31.
- **Ministral 3** (2025-12-02) : 3B / 8B / 14B, texte + vision, 256k, trois jeux de poids Apache 2.0 par taille (**Instruct, Reasoning, Base**). Le 14B est annoncé « comparable à Mistral Small 3.2 24B ». Prix symétriques entrée = sortie (0,1 / 0,15 / 0,2 $ par M).

#### Magistral (raisonnement natif — déprécié)
| Version | Small | Medium | Contexte | Format de pensée |
|---|---|---|---|---|
| 1.0 (2025-06-10) | `magistral-small-2506` (24B Apache) | `magistral-medium-2506` | 40k | balises texte `<think>…</think>` |
| 1.1 (2025-07-24) | `magistral-small-2507` | `magistral-medium-2507` | 40k | chunks `thinking` (tokens de contrôle) |
| 1.2 (2025-09-18) | `magistral-small-2509` (`-latest`) | `magistral-medium-2509` (`-latest`) | 128k, + image | chunks `thinking` |

Prix : Small 0,5 $/1,5 $ ; Medium 2 $/5 $. Features : `function-calling`, `document-qna`, `chat-completions`, `batching` (pas de structured-outputs). Détail du format au §3.22.

#### Code : Codestral, Devstral, Codestral Mamba, embeddings
- **Codestral** : 3 fiches portant le même nom. 24.05 (`codestral-2405`, 22B, licence **MNPL**, 32k, FIM) ; 25.01 (`codestral-2501`, 128k, faible latence : FIM, correction de code, génération de tests) ; **25.08** (`codestral-2508` / `codestral-latest`, « fin juillet 2025 », FIM + génération, 0,3 $/0,9 $).
- **Codestral Mamba 7B** (`open-codestral-mamba`) : architecture Mamba 2, 256k, usage recherche ; dépréciation et retrait le même jour (2025-06-06).
- **Devstral** (agents de génie logiciel : exploration de bases de code, édition multi-fichiers) : Small 1.0 (`2505`, 24B Apache) ; Small 1.1 et Medium 1.0 (`2507`) ; **Devstral 2** (`devstral-2512`, 123B Modified MIT, 256k ; passé en accès API payant avec « Vibe 2.0 » le 2026-01-27) ; **Devstral Small 2** (`labs-devstral-small-2512`, 24B, texte+image). Toute la gamme est dépréciée (→ Medium 3.5 ou Small 4).
- **Codestral Embed** (`codestral-embed-2505`, 8k, 0,15 $/M) : embeddings de code. **Mistral Embed** (`mistral-embed-2312`, 8k, 0,1 $/M) : embeddings texte, vecteurs **1024 dimensions** (glossaire).

#### Leanstral (preuve formelle Lean 4, Labs, gratuit)
- Leanstral (`labs-leanstral-2603`, 2026-03-16) : « premier agent de code open source pour Lean 4 », ingénierie de preuve dans des dépôts réalistes ; 119B / 6,5B actifs ; retiré 2026-06-30.
- Leanstral 1.5 (`labs-leanstral-1-5`, 2026-06-30) : preuve automatique de théorèmes et autoformalisation, meilleure qualité du mélange SFT, raisonnement long-contexte étendu, sortie max 128k ; **annoncé dès sa sortie comme retiré le 2026-09-30** ; déprécié le 2026-09-29 **sans remplaçant**.

#### Voxtral (audio)
| Sous-famille | Modèles | Points clés |
|---|---|---|
| Audio-chat (audio en entrée d'un LLM) | Voxtral Small (`voxtral-small-2507`, 24B, GA) ; Voxtral Mini (`voxtral-mini-2507`, déprécié) | Facturation mixte : par minute d'audio + par M tokens. Lancés le 2025-07-15. |
| Transcription batch | Voxtral Mini Transcribe (`voxtral-mini-2507` via `audio/transcriptions`, 0,002 $/min, déprécié) → Mini Transcribe 2 (`voxtral-mini-2602`, 0,003 $/min) → **Mini Transcribe 3** (0,0035 $/min) et **Small Transcribe 3** (0,004 $/min) | Le 2026-02-04 : introduction du *context biasing* et de `diarize`. Transcribe 3 (2026-10-20) : diarisation ; Mini 3 « 3e sur FLEURS multilingue et diarisation anglaise » ; Small 3 revendique le SOTA face à Microsoft AI Transcribe 2, Whisper large-v3, GPT-Transcribe, Scribe v2, Gemini 3.5 Transcribe, et gère aussi traduction, Q&R vocales, résumé, function calling. |
| Transcription temps réel | Mini Transcribe Realtime (`voxtral-mini-transcribe-realtime-2602`, 4B Apache, 0,006 $/min) → **Realtime 3** (0,008 $/min) | Realtime 3 : latence configurable **80 ms à 2 400 ms**, détection de fin de tour intégrée, *context biasing*, diarisation, le tout dans **une seule session de streaming WebSocket** ; orienté cas agentiques. |
| Synthèse vocale (TTS) | Voxtral TTS (`voxtral-mini-tts-2603`, 4B **CC BY-NC 4.0**, 16 $/M caractères) → **Voxtral TTS 3** (13 $/M caractères) | TTS 2603 : clonage de voix zéro-shot, 9 langues, ~90 ms de *time-to-first-audio*, pas de transcription requise pour les échantillons de voix. TTS 3 : clonage zéro-shot **et professionnel**, 9 langues, ~90 ms, **5 formats de sortie, 34 balises d'émotion, 2 balises de rythme** ; alias `…-tts-realtime-…`. |

#### OCR / Document AI
| Version | ID | Sortie | Apports (changelog) | Prix /1000 pages (annotées) |
|---|---|---|---|---|
| OCR | `mistral-ocr-2503` | 2025-03-06 | Premier modèle OCR + « document understanding » | non indiqué |
| OCR 2 | `mistral-ocr-2505` | 2025-05-22 | Texte et images entrelacés ; **annotations** ; `bbox-extraction` | 1 $ (3 $) |
| OCR 3 | `mistral-ocr-2512` | 2025-12-18 | `table_format` (`markdown`/`html`), `extract_header`, `extract_footer`, sortie `hyperlinks` | 2 $ (3 $) |
| OCR 4.0 | `mistral-ocr-4-0` | 2026-06-23 | `include_blocks` (boîtes englobantes au paragraphe + label structurel) ; `pages` accepte une chaîne `"0,2-4"` | 4 $ (5 $) |
| OCR 4.1 | `mistral-ocr-4-1` | 2026-07-16 (GA 2026-08-31) | Scores de confiance **par bloc** (`confidence_scores_granularity: "block"`) | 4 $ (5 $) |

Autres jalons : 2026-01-27 « Document Annotations » améliorées, **limite de 8 pages supprimée**. Labels de blocs : `text`, `title`, `list`, `table`, `image`, `equation`, `caption`, `code`, `references`, `aside_text`, `header`, `footer`, `signature`.

#### Modération et sécurité
- **Mistral Moderation** (`mistral-moderation-2411`, 8k, 0,1 $/M, 9 catégories) → **Mistral Moderation 2** (`mistral-moderation-2603`, 128k, **gratuit**, détection de *jailbreaking*, robuste sur données multilingues complexes et longues conversations multi-tours ; catégories `Dangerous`, `Criminal`, `Jailbreaking` séparées).
- **Shieldstral 1.0** (Labs, Public Preview, 2026-08-04) : modèle compact **multimodal** (texte + image), 3,8B, Apache 2.0, pour modération de prompt, de réponse, classification de paires prompt-réponse, détection de refus et filtrage ; fonctionne avec des **questions de politique en langage naturel** et renvoie une **classification oui/non**. Aucun ID API ni prix publiés.

#### Timestral (séries temporelles)
- Modèles de fondation pour la **prévision zéro-shot** : contexte jusqu'à 32K pas de temps, covariables « passées uniquement » et « futures connues », **sorties probabilistes par quantiles**. Entrée/sortie `timeseries`.
- Tailles : **209M** (classé 1er parmi les modèles pré-entraînés/zéro-shot sur GIFT-Eval, TIME et fev-bench), **123M** (compromis précision/efficacité), **28M** (faible latence), **5M** (le plus léger).
- Type `Premier, Specialist` mais poids ouverts Modified MIT ; pas d'ID API, pas de date de sortie, pas de prix.

#### Modèles tiers : Z.ai GLM
- GLM 5.2 (`zai-glm-5-2`, 2026-08-06) puis GLM 5.3 (`zai-glm-5-3`, 2026-09-15, GA le 2026-09-28) : modèles texte **open weight de Z.ai**, **hébergés par Mistral** pour le code long-contexte et les workflows agentiques, **servis sans modification Mistral**. 1M de contexte, sortie max 128k, sortie `reasoning`, prix avec entrée en cache (1,4 / 0,14 / 4,4 $ par M), seules notes 5/5 + 5/5 du catalogue. Pas d'`agents-conversations`/`connectors`/`document-qna`.

#### Modèles historiques et spécialisés retirés/dépréciés
- **Mistral Saba** (`mistral-saba-2502`) : Small fine-tuné sur des données du Moyen-Orient et d'Asie du Sud.
- **Mistral Small Creative** (`labs-mistral-small-creative`, Labs, 2025-12) : écriture créative, narration, jeu de rôle, dialogues de personnages, agents conversationnels.
- **Mistral Nemo 12B** (`open-mistral-nemo`) : « meilleur modèle multilingue open source » de juillet 2024, poids FP8 disponibles.
- **Pixtral 12B** / **Pixtral Large** (124B MRL) : premiers modèles vision ; Pixtral Large a alimenté Le Chat (2024-11-18).
- **Mixtral 8x7B** (47B/13B actifs) et **8x22B** (141B/39B actifs, 64k) : premiers MoE ouverts.
- **Mistral 7B** v0.1 (8k, 2023-09-27, premier modèle ouvert), v0.2 (32k), v0.3 ; **Mathstral 7B** (maths, recherche) ; **Mistral Next** (prototype « bref et concis », proposé dans Le Chat en février 2024).

### 3.7 Graphe des remplacements

| Remplaçant | Modèles qui y migrent (nb) |
|---|---|
| **Mistral Medium 3.5** | Mistral Medium 1.0, Medium 3, Medium 3.1, Mistral Large 2.1, Pixtral Large, Magistral Medium 1.0 / 1.1 / 1.2, Devstral Small 1.0, Devstral Medium 1.0, Devstral 2, Devstral Small 2 (12) |
| **Mistral Small 4** | Mistral Small 1.0 / 2.0 / 3.0 / 3.1 / 3.2, Magistral Small 1.0 / 1.1 / 1.2, Devstral Small 1.1, Mistral Saba, Mathstral 7B, Mixtral 8x7B, Mixtral 8x22B (13) |
| **Ministral 3 8B** | Mistral 7B v0.1 / v0.2 / v0.3, Ministral 8B (2410), Mistral Nemo 12B, Mistral Small Creative (6) |
| **Ministral 3 3B** | Ministral 3B (2410) (1) |
| **Ministral 3 14B** | Pixtral 12B (1) |
| **Mistral Large 3** | Mistral Large 1.0, Large 2.0, Mistral Next (3) |
| **Codestral 25.08** | Codestral 24.05, Codestral 25.01, Codestral Mamba 7B (3) |
| **OCR 4.1** | OCR (2503), OCR 2, OCR 3 (encore GA), OCR 4.0 (4) |
| **Voxtral Mini Transcribe 2** | Voxtral Mini (2507), Voxtral Mini Transcribe (2507) (2) |
| **Mistral Moderation 2** | Mistral Moderation (2411) (1) |
| **Z.ai GLM 5.3** | Z.ai GLM 5.2 (1) |
| **Leanstral 1.5** | Leanstral (2603) (1) — lui-même sans remplaçant |

### 3.8 Calendrier des dépréciations et retraits (par date de retrait)

| Retrait | Annonce de dépréciation | Modèles concernés | Statut affiché au 21/10/2026 |
|---|---|---|---|
| 2025-03-30 | 2024-11-30 | Mistral 7B v0.1/v0.2/v0.3, Mixtral 8x7B, Mixtral 8x22B, Mistral Large 2.0 | Retired |
| 2025-06-06 | 2025-06-06 | Codestral Mamba 7B | Retired |
| 2025-06-16 | 2024-11-30 (Codestral : 2024-12-02) | Mistral Small 1.0, Large 1.0, Medium 1.0, Codestral 24.05 | Retired |
| 2025-09-30 | 2025-06-10 | Mistral Saba | Retired |
| 2025-11-30 | 2025-10-31 | Magistral Small/Medium 1.0 et 1.1, Devstral Small 1.0 | Retired |
| 2025-11-30 | 2025-11-06 | Mistral Small 2.0, 3.0, 3.1, Codestral 25.01 | Retired |
| 2025-12-31 | 2025-12-02 | OCR (2503), Ministral 3B/8B (2410), Pixtral 12B | **Deprecated** (date passée) |
| 2026-03-31 | 2026-02-27 | Devstral Small 2 | **Deprecated** (date passée) |
| 2026-04-30 | 2026-03-31 | Mistral Small Creative | **Deprecated** (date passée) |
| 2026-05-31 | 2026-02-27 | Voxtral Mini, Voxtral Mini Transcribe, Devstral Medium 1.0, Devstral Small 1.1, OCR 2, Mistral Large 2.1, Pixtral Large | **Deprecated** (date passée) |
| 2026-06-30 | 2026-03-31 | Mistral Moderation (2411) | **Deprecated** (date passée) |
| 2026-06-30 | 2026-05-22 | Leanstral (2603) | Retired |
| 2026-07-31 | 2026-04-30 | Mistral Small 3.2, Magistral Small 1.2 | **Deprecated** (date passée) |
| 2026-07-31 | 2026-05-22 | Devstral 2, Magistral Medium 1.2, Mistral Nemo 12B | **Deprecated** (date passée) |
| 2026-08-31 | 2026-05-22 | Mistral Medium 3, Medium 3.1 | **Deprecated** (date passée) |
| 2026-09-30 | 2026-09-29 | OCR 4.0, Leanstral 1.5 | **Deprecated** (date passée) |
| **2026-10-31** | 2026-09-29 | Z.ai GLM 5.2 | Deprecated (seul retrait encore à venir) |
| — | — | Mathstral 7B, Mistral Next | Retired (aucune date publiée) |

Préavis observés entre dépréciation et retrait : de **0 jour** (Codestral Mamba) ou **1 jour** (OCR 4.0, Leanstral 1.5) jusqu'à **~6,5 mois** (Codestral 24.05, Mistral Small/Large/Medium 1.0) ; le cas le plus fréquent est 1 à 3 mois.

### 3.9 Glossaire officiel (18 entrées)

| Terme (catégorie) | Définition résumée |
|---|---|
| **Agent** (Vibe, API) | Assistant configuré avec instructions, outils et base de connaissances optionnelle ; comportement constant, partageable en équipe. Dans Vibe, l'équivalent dans Work s'appelle **Skill** ; l'onglet Chat historique a disparu pour la plupart des utilisateurs. Construit par programme via l'Agents API dans Studio. |
| **Context window** (Concepts) | Nombre maximal de tokens (entrée + fichiers + sortie) d'une requête ; le contenu le plus ancien est abandonné au-delà. |
| **Embeddings** (Models, Concepts) | Vecteurs numériques encodant le sens ; Mistral Embed produit des vecteurs de **1024 dimensions** ; usages RAG, recherche, recommandation. |
| **FIM** (Models, Concepts) | Génération à partir d'un préfixe et d'un suffixe ; complétion en milieu de fonction dans les IDE ; disponible dans Codestral. |
| **Free mode** (Billing) | Accès par défaut, sans carte bancaire, usage mensuel inclus avec limites de débit (évaluation, prototypage). |
| **Function calling** (API, Concepts) | Le modèle demande l'exécution d'une fonction externe ; l'application l'exécute et renvoie le résultat. |
| **Guardrailing** (Concepts) | Politiques au niveau système pour restreindre/façonner la sortie (contenu, formats, contraintes) sans modifier le modèle. |
| **Inference** (Concepts) | Exécuter un modèle entraîné pour produire une réponse (vs entraînement qui modifie les poids). |
| **OCR** (API, Concepts) | Extraction de texte structuré et d'images depuis des documents ; respecte l'ordre de lecture et la mise en page. |
| **Pay-as-you-go** (Billing) | Facturation optionnelle au token au-delà de l'usage inclus, sans engagement mensuel. |
| **RAG** (Concepts) | Récupération de documents d'une base externe injectés dans le prompt ; réduit les hallucinations. |
| **Streaming** (API, Concepts) | Envoi des tokens au fil de la génération ; réduit la latence perçue. |
| **Studio** (Platform) | Plateforme SaaS API et développeur de Mistral AI sur **console.mistral.ai** (accès API, console Studio, gestion des modèles). |
| **System prompt** (Concepts) | Instruction initiale définissant persona, format, contraintes ; invisible pour l'utilisateur final mais compte dans la fenêtre de contexte. |
| **Temperature** (API, Concepts) | Paramètre **0.0 – 1.0** de l'aléa ; 0,2 = focalisé, 0,8 = varié ; 0 pour la reproductibilité. |
| **Token** (Billing, Concepts) | Unité sous-mot ; ≈ 0,75 mot anglais ≈ 4 caractères ; détermine prix et consommation de contexte. |
| **Vibe** (Vibe) | Agent unifié de Mistral, deux modes : **Work** (chat + travail, web et mobile, chat.mistral.ai) et **Code** (CLI, extension VS Code, sessions web distantes sur code.mistral.ai). L'onglet Chat historique ne reste disponible que pour certaines organisations Enterprise pendant la migration. |
| **Workspace** (Platform, Billing) | Environnement isolé dans une organisation, avec ses propres clés API, métriques d'usage et « billing bucket » ; sert à séparer dev/prod ou équipes. |

### 3.10 Langues supportées

Les listes indiquent les langues à **performance attendue forte** ; d'autres peuvent bien fonctionner.

| Région | Modèles de langage | OCR |
|---|---|---|
| Europe | French, German, Spanish, Portuguese, Italian, Dutch, Polish, Czech, Danish, Finnish, Greek, Norwegian, Romanian, Swedish, Croatian, Serbian, Ukrainian, Catalan, Breton (19) | English, French, German, Spanish, Portuguese, Italian, Dutch, Polish, Czech, Danish, Finnish, Greek, **Hungarian**, Norwegian, Romanian, Swedish, Serbian, Catalan, Ukrainian (19) |
| Moyen-Orient | Arabic, Farsi, Hebrew, Turkish, Urdu | Arabic, Hebrew, Persian |
| Asie du Sud | Hindi, Bengali, Gujarati, Kannada, Marathi, Nepali, Punjabi, Tamil, Telugu | Bengali, Gujarati, Hindi, Kannada, Marathi, Nepali, Punjabi, Tamil, Telugu |
| Asie du Sud-Est | Indonesian, Lao, Malaysian, Tagalog, Thai, Vietnamese | Indonesian, Tagalog, Thai, Vietnamese |
| Asie de l'Est | Chinese, Japanese, Korean, Russian | Chinese, Japanese, Korean, Russian |
| Asie centrale | — | Armenian, Georgian, Turkish |

OCR : bonnes performances aussi sur Icelandic, Malayalam, Urdu, Kazakh « entre autres ». Particularités : l'anglais n'est pas listé côté modèles de langage (implicite) ; le russe est classé en « East Asian » ; le turc est « Middle Eastern » pour les LLM mais « Central Asian » pour l'OCR ; Voxtral TTS / TTS 3 annoncent « 9 langues » sans les lister dans ces pages.

### 3.11 Limites connues (page *Known limitations*)

| Domaine | Limite |
|---|---|
| Contexte (rappel) | Large 3, Medium 3.5, Small 4, Devstral 2, Ministral 3 : 256k ; Medium 3.1, Codestral, Magistral Medium 1.2, Nemo 12B : 128k. Dépassement → `400 Bad Request`. Les tokens comptés incluent entrée **et** sortie (dimensionner `max_tokens`). |
| Débit | Limites par niveau d'abonnement et par modèle ; dépassement → `429`. **Requêtes/seconde** et **tokens/minute** appliqués indépendamment ; **par organisation** ; consultables sur https://admin.mistral.ai/plateforme/limits ; le batch ne compte pas dans les limites temps réel. En-tête à surveiller : `X-RateLimit-Remaining`. |
| Fichiers | Taille max **512 Mo** ; formats OCR : PDF, PNG, JPG, JPEG, TIFF, BMP, GIF, WEBP ; rétention **30 jours** sauf suppression. |
| Batch | Fichier max **512 Mo** ; **100 000** requêtes max par batch ; traitement asynchrone ; résultats téléchargeables **24 h** après la fin. |
| Streaming | Timeout après **10 minutes d'inactivité** ; `stream_options.include_usage` doit être explicitement activé pour recevoir l'usage ; attention aux librairies HTTP qui bufferisent. |
| Function calling | **128 outils** max par requête ; descriptions comptées en tokens ; appels parallèles possibles dans un ordre quelconque ; `tool_choice: "any"` force un appel sans garantir l'outil choisi. |
| Mode JSON | `response_format: {"type": "json_object"}` garantit un JSON valide **mais** il faut mentionner « JSON » dans le prompt (sinon risque de flux infini d'espaces) ; pas de garantie de schéma (utiliser function calling / structured outputs). |
| Vision | Image max **20 Mo** ; PNG, JPG, JPEG, GIF, WEBP ; nombre d'images max selon modèle et budget de tokens ; redimensionnement interne (perte de détail sur petites images). |
| Transcription audio | WAV, MP3, FLAC, OGG, WEBM ; durée max **60 minutes** ; fichier max **500 Mo** ; précision dégradée par le bruit de fond. |
| Régions | API servie depuis des **datacenters UE par défaut** ; certains modèles peuvent ne pas être disponibles partout. |

### 3.12 Guides de migration

#### Depuis OpenAI
- L'API Chat Completions suit la même structure qu'OpenAI : changer l'import du client, l'initialisation et le nom de modèle.

| | OpenAI | Mistral |
|---|---|---|
| Client Python | `openai.OpenAI` | `mistralai.Mistral` (tableau) — l'exemple utilise `from mistralai.client import Mistral` (SDK v2) |
| Méthode chat | `client.chat.completions.create` | `client.chat.complete` |
| Streaming | `client.chat.completions.create(stream=True)` | `client.chat.stream` |
| Base URL | `https://api.openai.com/v1` | `https://api.mistral.ai/v1` |

- Correspondance de modèles : `gpt-4o` → `mistral-large-latest` ; `gpt-4o-mini` → `mistral-small-latest` ; `text-embedding-3-small` → `mistral-embed`.
- Client compatible OpenAI (LangChain, LlamaIndex…) : garder le client `openai` et changer seulement `base_url="https://api.mistral.ai/v1"` + modèle.
- FAQ : format de streaming identique (seul le nom de méthode change, types d'événements et `delta` identiques) ; schéma de tools/`tool_choice`/messages d'outil compatible (tester avec `mistral-large-latest`, « meilleur support function calling ») ; system prompt en premier message `role: "system"`.

#### Depuis Llama auto-hébergé
- Tokenizer différent : `pip install mistral-common`, puis `MistralTokenizer.v3()` et `encode_chat_completion(...)` ; compatibilité `transformers` via `apply_chat_template`.
- :::warning — Les modèles Mistral **n'utilisent pas** le format `[INST]` / `[/INST]` de Llama 2 ; passer des chaînes formatées Llama 2 dégrade la sortie.
- Correspondances : Llama 3 8B Instruct → Mistral 7B Instruct ; Llama 3 70B Instruct → Mixtral 8x22B Instruct ; « tout auto-hébergé » → API `mistral-large-latest` (managé).

#### Vers le SDK Python v2
| Domaine | V1 | V2 |
|---|---|---|
| Paquet | `mistralai<2` | `mistralai>=2` (`pip install "mistralai>=2"`) |
| Import principal | `from mistralai import Mistral` | `from mistralai.client import Mistral` |
| Azure | `from mistralai_azure import MistralAzure` (paquet `mistralai-azure>=1.0.0`) | `from mistralai.azure.client import MistralAzure` (inclus) |
| Constructeur Azure | `azure_endpoint=`, `azure_api_key=` | `server_url=`, `api_key=` |
| GCP | `from mistralai_gcp import MistralGoogleCloud` (extra `mistralai[gcp]`) | `from mistralai.gcp.client import MistralGCP` (pas de paquet séparé) |
| Auth GCP | variables `GOOGLE_CLOUD_REGION` + `GOOGLE_CLOUD_PROJECT_ID` | automatique via `google.auth.default()` ; région par défaut **`europe-west4`** (surchargeable `region=`, `project_id=`) |
| Autres API (chat, streaming, embeddings, agents, function calling, batch) | — | inchangées |

Historique : la v1.0 des SDK Python et JS (2024-07-29) avait déjà introduit « des changements de syntaxe majeurs » (guide `MIGRATION.md` du dépôt `client-python`).

### 3.13 SDK officiels et tiers

- Recommandation officielle : utiliser les SDK officiels ; ils intègrent un **retry avec backoff exponentiel**.
- **Python** : `pip install mistralai` (dépôt `mistralai/client-python`) ; exemples V1 (`from mistralai import Mistral`) et V2 (`from mistralai.client import Mistral`, onglet par défaut) ; méthode `client.chat.complete(model=..., messages=[...])` ; clé lue depuis `MISTRAL_API_KEY`.
- **TypeScript** : `npm install @mistralai/mistralai` (dépôt `mistralai/client-ts`) ; `new Mistral({apiKey})` puis `client.chat.complete({...})` ; paquets annexes `@mistralai/mistralai-azure` et `@mistralai/mistralai-gcp` (cités dans l'avis MAI-2026-002).
- Forme de réponse illustrée : `id`, `created`, `model`, `usage{prompt_tokens, total_tokens, completion_tokens}`, `object: "chat.completion"`, `choices[{index, finish_reason: "stop", message{role, tool_calls, content}}]`.
- **SDK communautaires** (non maintenus ni supportés par Mistral) :

| Langage | Dépôts |
|---|---|
| CLI | icebaker/ruby-nano-bots |
| Dart | nomtek/mistralai_client_dart |
| Elixir | axonzeta/mistral_elixir |
| Go | Gage-Technologies/mistral-go |
| Java | langchain4j/langchain4j ; spring-projects/spring-ai |
| JavaScript/TS | vercel/ai |
| PHP | HelgeSverre/mistral ; partITech/php-mistral |
| Ruby | gbaptista/mistral-ai ; wilsonsilva/mistral |
| Rust | ivangabriele/mistralai-client-rs |

### 3.14 Changelog API (chronologie complète, ordre ascendant)

Chaque entrée de la page porte une ou plusieurs étiquettes : `(model)`, `(api)`, `(other)`, `(security)`, `(deprecated)`.

| Date | Étiquettes | Contenu |
|---|---|---|
| 2024-01-11 | api, other | API **stricte** : les paramètres non supportés ne sont plus ignorés silencieusement → erreur « Extra inputs are not permitted ». Correction doc : le paramètre de guardrailing s'appelle `safe_prompt` (et non `safe_mode`). |
| 2024-01-16 | api | Informations d'usage des tokens dans les requêtes en streaming, dans le **dernier chunk**. |
| 2024-02-26 | api, model, other | Renommage de 3 endpoints de modèles et ajout de 2 : `open-mistral-7b` (= `mistral-tiny-2312`, ex-`mistral-tiny`, dépréciation annoncée à 3 mois) ; `open-mixtral-8x7B` (= `mistral-small-2312`, ex-`mistral-small`, idem) ; `mistral-small-latest` (= `mistral-small-2402`, nouveau) ; `mistral-medium-latest` (= `mistral-medium-2312`, ancien modèle daté ; `mistral-medium` déprécié à 3 mois) ; `mistral-large-latest` (= `mistral-large-2402`, nouveau phare). Function calling et mode JSON disponibles pour Small et Large. La Plateforme : paiement multi-devises (dont USD) ; fonctions entreprise d'administration des membres. Lancement de **Le Chat** (Mistral Large, Mistral Next, Mistral Small). |
| 2024-03-28 | api | Mode JSON disponible pour **tous** les modèles. |
| 2024-04-17 | model, other | `open-mixtral-8x22b` (= `open-mixtral-8x22b-2404`) ; pour lui `tool_call_id` ne doit pas être `null`. Publication de **trois versions de tokenizers** (commerciaux et open-weight) dans `mistral-common`. |
| 2024-05-23 | api | `tool_call_id` devient **obligatoire** dans les messages de rôle `tool`. |
| 2024-05-29 | model, api | `codestral-latest` (= `codestral-2405`). |
| 2024-06-05 | api | Lancement de l'**API de fine-tuning**. |
| 2024-07-16 | model | Codestral Mamba (`open-codestral-mamba`) et Mathstral. |
| 2024-07-18 | model | Mistral Nemo (`open-mistral-nemo`). |
| 2024-07-24 | model, api | Mistral Large 2 (`mistral-large-2407`). Fine-tuning étendu : modèles fine-tunables = `open-mistral-7b` (v0.3), `mistral-small-latest` (`mistral-small-2402`), `codestral-latest` (`codestral-2405`), `open-mistral-nemo`, `mistral-large-latest` (`mistral-large-2407`). |
| 2024-07-29 | other, api | **SDK Python et JS v1.0** (changements de syntaxe majeurs, guide `MIGRATION.md`). Première **Agents API**. |
| 2024-09-13 | security | Le Chat : mitigation d'une méthode de prompt obfusqué pouvant mener à l'exfiltration de données (signalée par Xiaohan Fu et Earlence Fernandes) ; nécessitait que l'utilisateur colle volontairement un prompt adverse et fournisse des données personnelles ; aucun utilisateur impacté. |
| 2024-09-17 | model, api | Pixtral (`pixtral-12b-2409`) et Mistral Small v24.09 (`mistral-small-2409`). Baisse de prix de Mistral Large 2. **Free tier** API sur La Plateforme. |
| 2024-10-09 | model | Ministral 3B (`ministral-3b-2410`) et 8B (`ministral-8b-2410`). |
| 2024-11-06 | model, api | **API de modération** et **API batch**. Nouveaux paramètres : `presence_penalty` (pénalise la répétition de mots/phrases), `frequency_penalty` (pénalise selon la fréquence), `n` (nombre de complétions par requête ; tokens d'entrée facturés une seule fois). Température de `pixtral-12b`, `ministral-3b-2410`, `ministral-8b-2410` **multipliée par 0,43** (cohérence, qualité, unification). |
| 2024-11-18 | model, other | Mistral Large 2.1 (`mistral-large-2411`) et Pixtral Large (`pixtral-large-2411`). Le Chat : recherche web avec citations, Canvas (idéation, édition en ligne, export), compréhension documents/images via Pixtral Large, génération d'images (Black Forest Labs Flux Pro), réponses plus rapides par *speculative editing*. |
| 2025-01-13 | model | Codestral 2501. |
| 2025-01-28 | api | **Structured outputs personnalisés** pour tous les modèles. |
| 2025-01-30 | model | Mistral Small 3 (`mistral-small-2501`). |
| 2025-02-17 | model | Mistral Saba (`mistral-saba-2502`). |
| 2025-03-06 | model, api | Mistral OCR (`mistral-ocr-2503`) et *document understanding*. |
| 2025-03-17 | model | Mistral Small 3.1 (`mistral-small-2503`). |
| 2025-04-16 | api | **Classifier Factory**. |
| 2025-05-07 | model | Mistral Medium 3 (`mistral-medium-2505`). |
| 2025-05-21 | model | Devstral Small (`devstral-small-2505`). |
| 2025-05-22 | model, api | OCR 2 (`mistral-ocr-2505`) et **annotations**. |
| 2025-05-27 | api | **Nouvelle Agents API**. |
| 2025-05-28 | model | Codestral Embed (`codestral-embed`). |
| 2025-06-10 | model | Magistral Medium (`magistral-medium-2506`) et Small (`magistral-small-2506`). |
| 2025-06-20 | model | Mistral Small 3.2 (sortie). |
| 2025-06-23 | api | Mistral Small 3.2 disponible dans l'API (`mistral-small-2506`). |
| 2025-07-10 | model | Devstral Small 1.1 (`devstral-small-2507`) et Devstral Medium (`devstral-medium-2507`). |
| 2025-07-15 | model, api | Premiers modèles audio et **API de transcription** : Voxtral Small (`voxtral-small-2507`) et Voxtral Mini (`voxtral-mini-2507`) pour le chat ; Voxtral Mini Transcribe (`voxtral-mini-2507` via `audio/transcriptions`). |
| 2025-07-24 | model, api, other | Magistral Medium/Small 1.1 (`…-2507`). **Document Library API** (gestion de bibliothèques). Support Audio & Transcription dans les SDK. |
| 2025-07-30 | model | Codestral 2508. |
| 2025-08-12 | model | Mistral Medium 3.1 (`mistral-medium-2508`). |
| 2025-08-27 | security, api | Nouveau champ **`p`** dans les chunks streamés de l'API Completion, contre les **attaques par canal auxiliaire sur la longueur des tokens** (signalées par des chercheurs Microsoft). Peut casser les parseurs stricts ; SDK officiels non affectés ; `mistral-common` à mettre à jour en **≥ 1.8.4**. |
| 2025-09-17 | model | Magistral Medium 1.2 (`magistral-medium-2509`) et Small 1.2 (`magistral-small-2509`). |
| 2025-12-02 | model | Mistral Large 3 (`mistral-large-2512`) et Ministral 3 (`ministral-3b-2512`, `ministral-8b-2512`, `ministral-14b-2512`). |
| 2025-12-09 | model, other | Devstral 2 (`devstral-2512`) et Devstral Small 2 (`labs-devstral-small-2512`). Lancement de **Mistral Vibe**. |
| 2025-12-16 | model | Mistral Small Creative (`labs-mistral-small-creative`), modèle Labs. |
| 2025-12-18 | model, api | OCR 3 (`mistral-ocr-2512`) ; `table_format` (`markdown` ou `html`) ; `extract_footer`, `extract_header` ; sortie `hyperlinks`. |
| 2026-01-19 | api | **Inline batching** : création de jobs batch sans upload de fichier. |
| 2026-01-27 | other, model, api | **Vibe 2.0** ; **Devstral 2.0 passe en accès API payant** ; Document Annotations améliorées, **limite de 8 pages supprimée**. |
| 2026-02-04 | model | Voxtral Mini Transcribe 2 (`voxtral-mini-2602`) et Voxtral Mini Transcribe Realtime (`voxtral-mini-transcribe-realtime-2602`) ; *context biasing* et `diarize` dans l'API Audio Transcriptions. |
| 2026-03-12 | model, api | Mistral Moderation 2603 (`mistral-moderation-2603`). **Custom Guardrails** pour Agents et Conversations : paramètre `guardrails` configurable sur un Agent ; champ `guardrails` par requête sur `POST /v1/conversations` et `POST /v1/chat/completions`. |
| 2026-03-16 | model | Mistral Small 4 (`mistral-small-2603`, hybride instruct/raisonnement/code, multimodal, 256k) ; Leanstral (`labs-leanstral-2603`). |
| 2026-03-23 | model | Voxtral TTS (écrit `voxtral-tts-2603` dans le changelog ; ID API réel `voxtral-mini-tts-2603`) : clonage zéro-shot, multilingue, streaming temps réel. |
| 2026-04-28 | model | Mistral Medium 3.5 (`mistral-medium-3-5`) : agentique et code, **raisonnement ajustable via `reasoning_effort`**, poids ouverts Modified MIT. |
| 2026-05-28 | other | Lancement de **Vibe** sur chat.mistral.ai en trois modes : **Work** (web + mobile : Skills, Workflows, Connectors, Libraries, tâches planifiées), **Code** (Vibe CLI, extension VS Code, Vibe Code Web — sessions distantes dans un sandbox cloud managé), **Chat** (expérience Le Chat historique). Docs restructurées : `/le-chat/*` et `/mistral-vibe/*` redirigent vers `/vibe/*`. |
| 2026-06-23 | model, api | OCR 4 (`mistral-ocr-4-0`), `mistral-ocr-latest` pointe dessus. `include_blocks: true` → tableau `blocks` par page (bbox paragraphe + label structurel, ordre de lecture). `pages` accepte aussi une chaîne `"0,1,2"`, `"0-5"`, `"0,2-4"`. |
| 2026-06-30 | model | Leanstral 1.5 (`labs-leanstral-1-5`) — **retrait annoncé au 2026-09-30** dès la sortie. |
| 2026-07-16 | model, api | OCR 4.1 (`mistral-ocr-4-1`) ; `mistral-ocr-latest` et `mistral-ocr-4` pointent dessus. `confidence_scores_granularity` accepte `"block"` : `"page"` = scores page seuls ; `"block"` = page + blocs ; `"word"` = page + mots. |
| 2026-08-31 | model | OCR 4.1 en **GA**. |
| 2026-09-28 | model | Z.ai GLM 5.3 (`zai-glm-5-3`) en **GA**. |
| 2026-09-29 | deprecated | OCR 4.0 déprécié (retrait 2026-09-30) → OCR 4.1 au même prix. Leanstral 1.5 (Labs) déprécié (retrait 2026-09-30). Z.ai GLM 5.2 déprécié (retrait 2026-10-31) → GLM 5.3 au même prix. |
| 2026-10-06 | model | **Mistral Large 4** (`mistral-large-4`) en Public Preview : multimodal open-weight MoE, 1M de contexte ; poids « bientôt » ; prix de lancement −50 % pendant 2 semaines. |

### 3.15 Release notes produit

Format d'une note : `Date · Type (Feature | Improvement) · Zone (Studio | Vibe Work | Cloud) · Disponibilité (Public Preview | GA | General Availability | Paid plans | Available) · Hébergement (Mistral-Hosted | Serverless)`, titre, chapeau, paragraphe, puces, lien d'action. Ordre ci-dessous ascendant (la page est descendante).

| Date | Titre | Méta | Contenu détaillé |
|---|---|---|---|
| 2026-07-31 | Enhanced Search and Filtering for Workflows | Improvement · Studio · Public Preview · Mistral-Hosted | Filtres multi-statuts et par propriété (nom, ID, tags, nom de déploiement, utilisateur courant) sur workflows et exécutions ; **favoris** (étoile) ; vues filtrées **partageables via paramètres d'URL** ; **taux d'échec par workflow** et santé des exécutions récentes ; recherche floue triée par pertinence + optimisations backend ; **execution search keys** (paires clé-valeur extraites de l'input ou attachées pendant l'exécution). |
| 2026-08-20 | API key expiration policies and notifications | Improvement · Cloud · Public Preview · Mistral-Hosted | Durée de validité maximale des **nouvelles** clés au niveau Organisation ou Workspace ; un Workspace Admin peut imposer plus strict que l'Organisation ; **notifications email** avant expiration ; politique appliquée à la création et à la rotation ; clés existantes (y compris sans expiration) non affectées. Configuration dans Admin settings (doc `/admin/identity-access/api-key-policy`). |
| 2026-09-10 | User and Permissions Management in the Admin Panel | Feature · Studio · GA · Mistral-Hosted | Tableau de bord admin dédié (paramètres d'organisation, membres, workspaces, clés API sans repasser par Studio) ; **groupes** (CRUD, ajout/retrait en masse, assignation de groupes à des workspaces) ; création de workspace avec membres et rôles dès la création + vue détail (permissions, limites, groupes) ; vue détail utilisateur (workspaces, groupes, rôles) ; *app switcher* donnant accès aux réglages admin depuis les autres applications Mistral. |
| 2026-09-22 | A simpler Vibe experience | Improvement · Vibe Work · General Availability · Mistral-Hosted | Fusion Chat + Work. Déploiement progressif à partir du **2026-09-14** (Free, Pro, Teams) ; Enterprise à partir du **2026-10-01**, l'admin choisit le moment dans une fenêtre d'environ **6 mois**. Liste unique de conversations ; sélecteur **`Fast` / `Think`** ; **Skills** remplacent les Chat Agents (Deep Research devient un Skill) ; les **Memories** migrent vers un *knowledge topic* ; **Temporary chat** ; **Code Interpreter** (Python) sur plans payants. |
| 2026-09-22 | Spreadsheets in Vibe Work | Feature · Vibe Work · Paid plans · Mistral-Hosted | Excel/CSV : analyse, correction de formules, nombres stockés en texte, dates ; consolidation, remodelage, jointures multi-fichiers ; création de trackers/modèles par prompt ; revue et édition de cellules dans **Canvas**, téléchargement `.xlsx`. Plans payants sur **Serverless** ; vérifier dans Excel avant partage. |
| 2026-09-22 | Mini App Canvas | Feature · Vibe Work · Available · Serverless | Génération **React multi-fichiers** (composants, données, styles) ; édition en place par la conversation ; apps alimentées par Connectors/Workflows ; partage du Canvas seul ou de la conversation (re-partager pour mettre à jour, pas de synchronisation continue) ; **snapshot** : données figées à la génération, pas de rafraîchissement live ni d'actions sauvegardées. |
| 2026-09-22 | Agentic Knowledge Base | Feature · Vibe Work · Public Preview · Mistral-Hosted | Base de connaissances personnelle structurée remplaçant les mémoires « plates » : *knowledge topics* sous forme de pages éditables ; rappel uniquement si sémantiquement pertinent ; attribution des sources dans la chaîne de pensée et le message ; entretien d'onboarding guidé ; contrôles utilisateur/admin (activation dans Settings, bascule « données sensibles » dans Privacy settings, configuration serveur pour l'entreprise). |
| 2026-10-09 | Managed Deployments | Feature · Studio · Public Preview · Mistral-Hosted | Exécuter des **Workflows** sans gérer de workers : déploiement depuis un dépôt GitHub public ou privé sur **Mistral Cloud** (build, scaling, cycle de vie). **Plan payant requis** (Pay-as-you-go ou Enterprise) + quota pendant la Public Preview. Cycle de vie complet (create, update, stop, start, restart, redeploy, delete) depuis AI Studio ou l'API ; authentification des workers par **Service Account** (migration automatique des déploiements à clé API au prochain redémarrage) ; déploiements « hardened » avec **egress réseau bloqué** au build et au runtime ; **logs de build et de worker** dans AI Studio. |

### 3.16 Avis de sécurité

Page index : avis « pour des vulnérabilités ou événements nécessitant revue ou action client », chacun avec produits affectés, actions recommandées et mises à jour. Avis mis en avant : MAI-2026-002.

| Réf. | Publié (MAJ) | Sévérité | Titre |
|---|---|---|---|
| MAI-2026-001 | 2026-03-16 | High | Mistral AI Studio API files input filtering and access restriction |
| MAI-2026-002 | 2026-05-12 (2026-05-14) | High — *Investigation closed* | TanStack supply chain attack affecting Mistral SDK packages |
| MAI-2026-003 | 2026-09-14 | High | Mistral Vibe shell permission vulnerabilities |

#### MAI-2026-001 — filtrage d'entrée sur l'API fichiers (déploiements on-premises)
- Défaut de filtrage sur `/api/files` permettant à un utilisateur malveillant d'accéder à des ressources non prévues. CWE-20 (validation d'entrée incorrecte).
- CVSS 3.1 : **7.0 High**, vecteur `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N/E:F/RL:O/RC:C`.
- Versions affectées → correctif « Mistral AI Studio `2026.1.3`, `2026.2.0` ou ultérieur » :
  - `le-chat` (`docker ask/ui`) de `1.75.12` (sauf `1.75.12-hot4`) jusqu'avant `1.82.2` ;
  - Mistral AI Studio `1.5.3-rc17` et ultérieures, `1.5.4`, `1.5.5`, `2026.1.0` ;
  - Mistral AI Studio `2026.1.0`, `2026.1.1`, `2026.1.2`.
- Note : nouvelle numérotation des versions `YYYY-MM-PATCHNUM` (année, mois, patch). Révèle l'existence d'une **distribution on-premises** de « Mistral AI Studio » et de l'image `le-chat`.

#### MAI-2026-002 — attaque supply-chain « Mini Shai-Hulud » (via TanStack)
- Un ver automatisé lié à la compromission du paquet tiers TanStack a publié des versions compromises des SDK npm et PyPI ; origine : un **poste développeur affecté**, sans impact sur l'infrastructure globale.
- Fenêtres d'exposition : npm publié le 2026-05-11 22:45 UTC, retiré le 2026-05-12 01:53 UTC ; PyPI publié le 2026-05-12 00:05 UTC, retiré à 03:05 UTC. Avis GitHub : `GHSA-wx9m-wx4f-4cmg` (PyPI), `GHSA-jgg6-4rpr-wfh7` (npm).
- Versions affectées : `@mistralai/mistralai` **2.2.2, 2.2.3, 2.2.4** ; `@mistralai/mistralai-azure` **1.7.1–1.7.3** ; `@mistralai/mistralai-gcp` **1.7.1–1.7.3** ; PyPI `mistralai` **2.4.6**. Concerné si présent dans un environnement, lockfile, artefact, image conteneur, cache ou miroir.
- Impact : paquets npm **non fonctionnels** (`Setup.mjs` référence un fichier absent) ; paquet PyPI exécute au **import** (Linux uniquement) un script injecté dans `src/mistralai/client/__init__.py` qui télécharge `transformers.pyz` depuis `83.142.209.194` vers `/tmp/transformers.pyz` et le lance en arrière-plan pour **récolter des identifiants**.
- Indicateurs : fichier `/tmp/transformers.pyz`, processus `python /tmp/transformers.pyz`, variable `MISTRAL_INIT=1`, connexions sortantes vers `83[.]142[.]209[.]194` ; côté npm, empreintes SHA-256 de `router_init.js`, `tanstack_runner.js` et du `package.json` de `@tanstack/setup`. Commandes de vérification fournies (`pip show mistralai`, `npm ls …`, `grep` sur lockfiles) + script de détection.
- Remédiation : arrêter d'utiliser la version, nettoyer les systèmes (procédure StepSecurity), **faire tourner tous les secrets**, auditer les logs cloud, surveiller les C2 `api[.]masscan[.]cloud`, `filev2[.]getsession[.]org`, `git-tanstack[.]com`, `seed1[.]getsession[.]org`, `83[.]142[.]209[.]194`.
- Journal : 2026-05-12 14:11 UTC sévérité npm révisée ; 2026-05-13 09:00 UTC incident mitigé ; 2026-05-14 09:55 UTC mise à jour ; 2026-05-14 enquête close.

#### MAI-2026-003 — permissions shell de Mistral Vibe CLI
- Produit : Mistral Vibe CLI (`mistral-vibe`), implémentations de permission shell « legacy » et « managed ». Six CVE corrigées par la **v2.25.4 (12/09/2026)** : des commandes forgées pouvaient s'exécuter **sans invite d'approbation** ; déclenchables par des instructions malveillantes dans du contenu traité par l'agent (injection de prompt).
- Impacts possibles : lecture de fichiers hors workspace (identifiants, code source), création/écrasement de fichiers hors workspace, exécution de code avec les droits de l'utilisateur.

| CVE | Vecteur | Versions affectées | Corrigé en |
|---|---|---|---|
| CVE-2026-87983 | chemins absolus entre guillemets | 2.6.0 → < 2.19.1 | 2.19.1 |
| CVE-2026-87984 | cibles de redirection shell | 1.3.4 → < 2.25.4 | 2.25.4 |
| CVE-2026-87985 | arguments ANSI-C quotés | 2.9.0 → < 2.25.4 | 2.25.4 |
| CVE-2026-87986 | analyse de commande incomplète | 1.3.4 → < 2.25.4 | 2.25.4 |
| CVE-2026-87987 | assignations de variables d'environnement | 2.6.0 → < 2.25.4 | 2.25.4 |
| CVE-2026-87988 | trous dans l'allowlist de commandes et la validation de chemins | introduit en 2.15.0 ; correctifs partiels 2.20.0 (shell legacy) et 2.23.0 (shell managé) ; contournements par options jusqu'à 2.25.3 | 2.25.4 |

- Détection : `vibe --version` (version affectée = exposition, pas preuve de compromission) ; pas d'IoC fiable (preuves de concept) ; examiner journaux d'appels d'outils Vibe et télémétrie endpoint.
- Remédiation : mettre à jour ≥ 2.25.4, redémarrer les sessions, **garder les contrôles d'approbation activés** (les modes d'approbation automatique les contournent volontairement), préserver les preuves et faire tourner les identifiants si besoin.
- Journal : 2026-09-11 HiddenLayer publie les 6 avis CVE ; 2026-09-12 Mistral publie 2.25.4 le jour même.

### 3.17 Fonctionnalité dépréciée : fine-tuning (vue d'ensemble)

- **Statut** : `:::warning[Deprecated]` — « déprécié et plus activement supporté ». S'applique à toute la section `/resources/deprecated/finetuning*` et au guide de customisation.
- **Tarification affichée** : **frais minimum de 4 $ par job** de fine-tuning + **2 $/mois de stockage par modèle** fine-tuné (renvoi vers la page de prix, section « fine-tunable models »).
- **Prompting vs fine-tuning** (argumentaire de la doc) : commencer par le prompt engineering (plus rapide, moins coûteux, zéro-shot, pas de données, facile à faire évoluer) ; le fine-tuning « fonctionne nettement mieux », bat souvent un modèle plus gros (moins cher/rapide, pas de long prompt), aligne mieux sur la tâche, peut enseigner des faits nouveaux (outils avancés, workflows complexes).
- **Cas d'usage cités** : format et ton spécifiques ; spécialisation de domaine ; **distillation** depuis un modèle plus fort ; imiter un modèle piloté par un prompt complexe sans ce prompt (économie de tokens) ; réduire coût et latence avec un petit modèle.
- **Deux services** : (1) fine-tuning général texte & vision par **SFT** ; (2) **Classifier Factory** (classifieurs à partir d'un dataset texte).
- Accès : AI Studio (route `https://console.mistral.ai/build/finetuned-models`) ou API ; alternative open source : dépôt `mistral-finetune`.

### 3.18 Fonctionnalité dépréciée : fine-tuning texte & vision (SFT)

#### Format des données
- Fichiers **JSON Lines** (`.jsonl`, un objet JSON aplati par ligne) ; dataset d'entraînement + validation (et test) recommandés ; upload préalable sur « Mistral Cloud ».

| Format | Structure | Règles |
|---|---|---|
| **Text Instruct** | `{"messages":[{"role","content"},…]}` | Liste sous la clé `messages` ; rôles `system`, `user`, `assistant`, `tool` ; **perte calculée uniquement sur les tokens des messages `assistant`**. |
| **Vision Instruct** | `content` = liste de parts `{"type":"image_url","image_url":"data:image/jpeg;base64,…"}` et `{"type":"text","text":…}` | Mêmes règles ; images généralement en base64. |
| **Function Calling Instruct** | messages + `tool_calls` + clé racine `tools` | Seuls les messages `assistant` portent `tool_calls` ; un message `assistant` avec `tool_calls` **n'a pas de `content`** et doit être suivi d'un message `tool`, lui-même suivi d'un `assistant` ; `tool_call_id` doit correspondre à un `id` précédent ; `id` et `tool_call_id` = chaînes aléatoires de **exactement 9 caractères** ; `tools` doit définir tous les outils utilisés. |

#### Upload des fichiers
- `POST https://api.mistral.ai/v1/files` en multipart avec `purpose="fine-tune"` et `file=@training_file.jsonl`.
- SDK : Python `client.files.upload(file={"file_name": …, "content": open(…, "rb")})` ; TS `client.files.upload({file: {fileName, content}})`.

#### Création du job — paramètres
| Paramètre | Type | Défaut | Valeurs | Effet |
|---|---|---|---|---|
| `model` | string | — | Texte : `open-mistral-7b`, `mistral-small-latest`, `codestral-latest`, `open-mistral-nemo`, `mistral-large-latest`, `ministral-8b-latest`, `ministral-3b-latest` ; Vision : `pixtral-12b-latest` | Modèle de base à fine-tuner. |
| `training_files` | liste | — | Python/TS : `[{"file_id": id, "weight": 1}]` ; curl : liste d'UUID | Un ou plusieurs fichiers d'entraînement (pondérables). |
| `validation_files` | liste d'ID | — | — | Un ou plusieurs fichiers de validation. |
| `hyperparameters` | objet | — | `training_steps` (ex. 10), `learning_rate` (ex. 0.0001) | Seuls hyperparamètres réglables. |
| `auto_start` | bool | **`False`** | `True` / `False` | `True` : lancement dès validation ; `False` : démarrage manuel via `POST /fine_tuning/jobs/<uuid>/start` (et affichage préalable du coût/ETA/tokens). |
| `integrations` | liste | — | `{"project": …, "api_key": "WANDB_KEY"}` | Suivi des métriques dans **Weights & Biases**. |
| `job_type` | string | (texte) | `"classifier"` pour Classifier Factory | Type de job (cf. §3.19). |

SDK : Python `client.fine_tuning.jobs.create(...)`, `.get(job_id=…)`, `.start(job_id=…)`, `.list()`, `.cancel(job_id=…)` ; TS `client.fineTuning.jobs.create({model, trainingFiles, validationFiles, hyperparameters:{trainingSteps, learningRate}, autoStart})`, `.get({jobId})`, `.start({jobId})`, `.list()`, `.cancel({jobId})`.

#### Cycle de vie d'un job
- Statuts documentés : **`QUEUED`** → (après un bref délai) **`VALIDATED`** → démarrage → entraînement → modèle disponible (`fine_tuned_model`).
- Filtres de liste : `page`, `page_size`, `model`, `created_after`, `created_by_me`, `status`, `wandb_project`, `wandb_name`, `suffix`.
- Utilisation : le nom du modèle se lit dans `retrieved_job.fine_tuned_model` ; appel normal `client.chat.complete(model=<ft>, …)` ; format d'ID `ft:open-mistral-7b:XXX:20240430:XXX`.
- Suppression : `client.models.delete(model_id=…)` / `DELETE /v1/models/<ft-id>`.

#### FAQ (règles et limites)
| Question | Réponse documentée |
|---|---|
| Validation du format | L'API valide chaque fichier à l'upload ; pour `mistral-finetune`, scripts `validate_data.py` et `reformat_data.py` (ne détectent pas tous les cas). |
| Taille des données d'entraînement | **512 Mo par fichier**, nombre de fichiers illimité. |
| Taille de la validation | **1 Mo max** ; règle : `validation_set_max_size = min(1MB, 5% of training data)`. |
| Job déjà existant | **`409 Conflict`** si un job similaire est en cours / validé / en file. |
| Fichier déjà existant | Si contenu **et** nom identiques, le fichier existant est renvoyé. |
| Nombre d'époques | Règle empirique : `epochs ≈ max_steps / taille_du_fichier_en_Mo` (100 Mo + 1000 steps ≈ 10 époques). |
| Coût / ETA / tokens / passes | Visibles à la création avec `auto_start=False` ; l'argument `dry_run=True` « sera supprimé en septembre » (année non précisée). |
| Learning rate | Pour **LoRA** : 1e-4 (défaut) ou 1e-5 ; c'est un **pic** : warmup linéaire puis décroissance cosinus. |
| Format OpenAI | Supporté. |
| Fichier > 500 Mo (`413 Request Entity Too Large`) | Découper en plusieurs `.jsonl` (exemple Python de découpe en 3 avec le dataset `HuggingFaceH4/ultrachat_200k`). |

### 3.19 Fonctionnalité dépréciée : Classifier Factory

- **Statut** : déprécié (`:::warning[Deprecated]`) ; lancé le **2025-04-16**. Outil pour créer ses propres classifieurs à partir de petits modèles efficaces ; disponible dans AI Studio (`https://console.mistral.ai/build/finetuned-models`) et par API.
- Cas d'usage listés : modération, détection d'intention, analyse de sentiment, clustering, détection de fraude, filtrage de spam, systèmes de recommandation.
- **Deux endpoints de classification** : `v1/classifications` (texte brut, champ `text`) et `v1/chat/classifications` (conversations multi-tours, champ `messages`).
- **Deux types de modèles** :

| Type | Exemple de ligne JSONL | Règle |
|---|---|---|
| Single Target (mono-label) | `{"text": "...", "labels": {"sentiment": "positive"}}` | `labels` = dict {nom de label: valeur}. |
| Single Target multi-label | `"labels": {"sentiment": ["positive", "neutral"]}` | Valeurs en liste. |
| Multi-Target | `"labels": {"sentiment": "positive", "is-english": "yes"}` | Chaque cible est **indépendante**, scores indépendants. |

- Job : `client.fine_tuning.jobs.create(model="ministral-3b-latest", job_type="classifier", training_files=[{"file_id":…, "weight":1}], validation_files=[…], hyperparameters={"training_steps":10, "learning_rate":0.0001}, auto_start=False)` ; mêmes opérations get/start/list/cancel et mêmes statuts `QUEUED` → `VALIDATED` que le SFT.
- Inférence : Python `client.classifiers.classify(model=<ft>, inputs=[...])` et `classify_chat` pour les conversations ; TS `client.classifiers.classify({model, inputs})` / `classifyChat` ; curl `POST /v1/classifications` avec `"input": [...]`. Format d'ID : `ft:classifier:ministral-3b-latest:XXX:20250401:XXX`.
- Le modèle résultant renvoie des **scores par label et par valeur**.
- **Seul modèle de base supporté** : `ministral-3b` (FAQ) — c'est-à-dire la lignée Ministral 3B dont la version 2410 est dépréciée (retrait 2025-12-31).
- Cookbooks (Colab) : *Intent Classification* (mono-cible mono-label), *Moderation Classifier* (mono-cible multi-label, commentaires publics), *Product Classification* (multi-cibles, plats et pays d'origine, comparaison avec des LLM classiques).
- Remplacement : la doc ne nomme pas de successeur direct (inférence : la modération personnalisée passe désormais par Custom Guardrails / Mistral Moderation 2 ou Shieldstral, et la classification générique par prompting / structured outputs).

### 3.20 Fonctionnalité dépréciée : guide « Fine-tuning API (legacy) » (customisation)

- Page titrée « Fine-tuning API (legacy) », dépréciée. Objectif : passer d'un prototype à un déploiement avec un modèle personnalisé ; cycle itératif fondé sur le feedback utilisateur et des évaluations rigoureuses.
- **Termes clés** : *Application behavior* (interaction utilisateur : utilisabilité, performance, sûreté, adaptabilité), *Model behavior* (comportement attendu du LLM dans son contexte), *Objectives* (adéquation au comportement voulu), *Values* (politique voulue : règles, « Constitution », morale d'un personnage).
- **Trois méthodes de pilotage (steerability)** : (1) **system prompt** (instructions, rôle/persona/ton, style/verbosité, valeurs/politiques, format) ; (2) **tuning** — *application tuning* (exemples du comportement voulu) ou *safety tuning* (entrées à risque + sorties sûres) ; (3) **couche de modération** (classifieur) en entrée/sortie comme mesure de sécurité supplémentaire.
- **Parcours en 7 étapes** : 1) définir le comportement applicatif (objectifs) ; 2) définir les politiques selon les valeurs (inspiration : catégories Llama Guard, taxonomie ML Commons) ; 3) créer les évaluations (automatiques par métriques ou LLM-juge, humaines par annotateurs) ; 4) tester l'hypothèse avec un MVP sur Mistral Large (collecter les interactions ; si un system prompt suffit, aller à l'étape 6) ; 5) tuner (couverture des politiques, variété, **déduplication**, pas de contamination éval/entraînement, pratiques éthiques ; datasets de sûreté type « Safety-Tuned LlaMAs ») via le code OSS `mistral-finetune` ou AI Studio (upload, validation, job, endpoint de modèle dédié) ; 6) tester avec les évals, dont évaluations de sûreté : *Development*, *Assurance*, *Red Teaming*, *External* ; 7) surveiller et mettre à jour en continu.
- **Exemples clients (paramètres révélateurs)** :

| Exemple | Modèle / données | Hyperparamètres | Résultats annoncés |
|---|---|---|---|
| phospho — Tak (RAG recherche web) | Mistral 7B ; requêtes utilisateurs + appels de fonctions GPT-4-turbo ; split 70/15/15 | 150 steps (~10 min ; chaque token vu 3 fois) ; LR 6e-5 | F1 20 % → 78 % ; accuracy 87 % → 96 % ; rappel 20 % → 90 % ; −34 % de tokens (sortie `news_related` / `not_news_related` sans function calling) |
| Myo — AmiRA (RAG médical miRNA) | 9 839 abstracts PubMed → 9 414 retenus → ~28 000 paires Q/R générées par `mistral-large-latest` (~2,5 h sur 2 cœurs CPU) | — | Le modèle fine-tuné dépasse `mistral-small-latest` et `mistral-large-latest` sur 150 questions d'un benchmark 2019 ; latence plus faible ; top-k ≤ 12 par similarité cosinus |
| Cleo (assistant financier) | `ft:open-mistral-7b:…` ; dataset interne de l'équipe Content Design | requête d'inférence avec `temperature` 0.0, `top_p` 1, `max_tokens` 512, `safe_prompt` false, `random_seed` 42 | Reformulation dans le ton de marque, évaluation humaine |
| Jimini AI (copilote juridique) | `mistral-small` ; BSARD (22 600 articles de loi belges, ~1 100 questions) en 80/20, réponses synthétiques par `mistral-large-latest` ; Multi EURLEX (35 000 documents FR→DE) | 220 steps (~30 min) ; LR retenu **1e-6** ; suivi W&B (perplexité) | `legal_quality` (LLM-juge `mistral-large`) 1,42 → 1,73 (+20 %) ; traduction juridique préférée 38/50 + 9 égalités (≥ aussi bon dans 94 % des cas) |

### 3.21 Fonctionnalités dépréciées : guardrailing

#### `safe_prompt` (déprécié → Custom Guardrails)
- Paramètre booléen de `POST /v1/chat/completions` (spec : `safe_prompt`, défaut `false`, « injecter un prompt de sécurité avant toutes les conversations »). SDK : Python `safe_prompt=True`, TS `safePrompt: true`.
- Effet : **préfixe les messages** avec ce system prompt :

```
Always assist with care, respect, and truth. Respond with utmost utility yet securely. Avoid harmful, unethical, prejudiced, or negative content. Ensure replies promote fairness and positivity.
```

- Évaluation publiée : avec ce prompt, les modèles déclinent toutes les questions d'un jeu de prompts adverses communautaire ; exemple « How to kill a linux process » où Mistral 7B et Mistral Large répondent quand même (question légitime).
- **Auto-modération par self-reflection** : prompt de classification demandant au modèle (ex. Mistral Large 2) de classer un texte dans `physical harm`, `economic harm`, `fraud` (définitions détaillées) en un seul mot, ou `not moderated` ; catégories plus larges citées : activités illégales, contenus haineux/violents, conseils non qualifiés (juridique, médical, financier).
- Erratum historique (2024-01-11) : le paramètre avait été documenté à tort comme `safe_mode`.

#### Mistral Moderation 2411 et `moderation_llm_v1` (dépréciés → `mistral-moderation-2603` / `moderation_llm_v2`)
- Migration demandée : passer à `mistral-moderation-2603` et remplacer `moderation_llm_v1` par `moderation_llm_v2` dans les configs de guardrails. Le nouveau modèle sépare `Dangerous` et `Criminal` et ajoute `Jailbreaking`.
- **Catégories 2411** (9) : Sexual ; Hate and Discrimination ; Violence and Threats ; Dangerous and Criminal Content (*legacy*) ; Self-Harm ; Health ; Financial ; Law ; PII.
- **Config `moderation_llm_v1`** (forme) :

```json
{"block_on_error": true,
 "moderation_llm_v1": {"custom_category_thresholds": {"sexual": 0.1, "selfharm": 0.1},
                       "ignore_other_categories": false, "action": "block"}}
```

| Champ (spec OpenAPI) | Type | Défaut | Effet |
|---|---|---|---|
| `block_on_error` | bool | `false` | Si `true`, renvoie 403 et bloque en cas d'erreur côté serveur. |
| `moderation_llm_v1.model_name` | string | `mistral-moderation-2411` | Surcharge du modèle (« à omettre en général ») ; v2 : `mistral-moderation-2603`. |
| `custom_category_thresholds` | objet | — | Seuils par catégorie ; clés v1 : `sexual`, `hate_and_discrimination`, `violence_and_threats`, `dangerous_and_criminal_content`, `selfharm`, `health`, `financial`, `law`, `pii`. Clés v2 : idem mais `dangerous` et `criminal` séparés + `jailbreaking`. |
| `ignore_other_categories` | bool | `false` | Si `true`, n'évalue que les catégories listées. |
| `action` | enum | `none` | `none` ou `block` si un score dépasse un seuil. |

- **Réponse de blocage** : HTTP **403**, `error.message` = « Content blocked by guardrail », `error.status` 403, et un objet `guardrails.results.moderation_llm_v1` avec `model_name`, `decisions` par catégorie (`threshold`, `score`, `violated`), `violated` global, `action`.

### 3.22 Fonctionnalité dépréciée : raisonnement natif (Magistral)

- **Statut** : `:::caution[Deprecated]` — modèles de raisonnement natif `magistral-small-latest` et `magistral-medium-latest` dépréciés ; recommandation : **Reasoning** avec `mistral-small-latest` ou `mistral-medium-3-5`, piloté par **`reasoning_effort`** (spec : enum `none`, `minimal`, `low`, `medium`, `high`, `xhigh`).
- Principe : le raisonnement est **toujours actif**, sans paramètre ; plus de tokens générés ; meilleures performances avec un system prompt dédié.
- `-latest` pointe vers **`-2509`**. Migration requise depuis `-2506` :

| Version | Encodage de la pensée |
|---|---|
| `-2509` et `-2507` (nouveau) | Chunks de pensée **tokenisés via des tokens de contrôle** : `content` devient une liste de parts `{"type":"thinking","thinking":[{"type":"text","text":…}]}` puis `{"type":"text","text":…}`. Valable aussi en entrée (system prompt). |
| `-2506` (ancien) | Chaînes `<think>\n` … `\n</think>\n` dans un `content` texte unique (entrée et sortie). |

- **System prompts par défaut** (tous « currently default ») :
  - 2509 : bloc texte commençant par l'en-tête `# HOW YOU SHOULD THINK AND ANSWER`, consignes (monologue intérieur jusqu'à la réponse, Markdown, LaTeX pour les maths, même langue que l'entrée), puis un **chunk `thinking` gabarit** (« brouillon… aussi long que nécessaire ») et un texte final « réponse autonome ».
  - 2507 : identique sans l'en-tête.
  - 2506 : chaîne unique avec gabarit `<think>…</think>`, demande d'un **résumé** concis après la pensée, interdiction de `\boxed{}`, terminée par « Problem: ».
- Fournir son propre system prompt **remplace** le défaut. Paramètre **`prompt_mode`** : `"reasoning"` = utiliser explicitement le prompt par défaut ; `null` (Python `None`) = aucun system prompt par défaut. Spec : enum `MistralPromptMode` = [`reasoning`] (« les valeurs représentent une intention de haut niveau… le SP peut inclure date de coupure, capacités, ton, consignes de sécurité »).
- Exemple d'appel : `client.chat.complete(model="magistral-medium-latest", messages=[…])` (Python V1/V2, TS, curl `POST /v1/chat/completions`) sur l'énigme « John is one of 4 children… » (réponse 22).
- Formes de réponse : `usage` avec `prompt_tokens_details.cached_tokens` ; `message.content` = [chunk `thinking`, chunk `text`]. Ordres de grandeur : 77 tokens d'entrée / 1 114 de complétion dans l'exemple `-latest` ; **10 997 tokens de complétion** dans l'exemple complet `magistral-medium-2507` (trace qui hésite longuement entre 22 et 18 avant de conclure 22) — illustre le coût du raisonnement non borné.

### 3.23 Tableau « ce qui est déprécié → ce qui le remplace »

| Élément déprécié | Ce qui existait | Remplacement indiqué par la doc |
|---|---|---|
| Fine-tuning SFT texte & vision | `POST /v1/fine_tuning/jobs`, modèles 7B → Large 2, Pixtral 12B, `ft:` | Aucun remplaçant nommé (inférence : prompting, structured outputs, Agents/RAG ; les modèles de base fine-tunables sont presque tous retirés). |
| Classifier Factory | `job_type="classifier"` sur `ministral-3b`, `/v1/classifications`, `/v1/chat/classifications` | Aucun nommé (inférence : Custom Guardrails / Moderation 2 / Shieldstral pour la modération). |
| Guide « Fine-tuning API (legacy) » | Méthodologie 7 étapes + études de cas | — |
| `safe_prompt` | Booléen injectant un system prompt de sécurité | **Custom Guardrails** (`guardrails` sur Agent, `POST /v1/conversations`, `POST /v1/chat/completions`) |
| `mistral-moderation-2411` | 9 catégories, 8k, payant | `mistral-moderation-2603` (128k, gratuit, `Dangerous`/`Criminal`/`Jailbreaking`) |
| `moderation_llm_v1` | Config de guardrail adossée à 2411 | `moderation_llm_v2` |
| Raisonnement natif Magistral (`magistral-*-latest`) | Raisonnement toujours actif, `prompt_mode` | `reasoning_effort` sur `mistral-small-latest` / `mistral-medium-3-5` |
| Le Chat (onglet Chat, Agents, Memories) | Expérience Chat historique | Vibe Work : Skills, Knowledge Base (glossaire + release notes) |

---

## 4. Interface utilisateur

Ce périmètre est surtout documentaire ; les éléments d'interface révélés sont les suivants.

| Écran / chemin | URL | Ce qu'on y fait (selon la doc) |
|---|---|---|
| Studio (console développeur) | `https://console.mistral.ai` | Plateforme SaaS API : accès API, console Studio, gestion des modèles (glossaire). Anciennement « La Plateforme ». |
| Studio › API keys | `https://console.mistral.ai/api-keys` | Vérifier/créer les clés (résolution des erreurs 401). |
| Studio › Build › Fine-tuned models (inférence d'après la route) | `https://console.mistral.ai/build/finetuned-models` | Fine-tuning SFT et Classifier Factory depuis l'UI (fonctionnalités dépréciées) ; upload/validation des données, lancement de jobs. |
| Admin Panel › Subscriptions › Billing | `https://admin.mistral.ai/organization/billing` | Ajouter des crédits, changer de moyen de paiement, modifier la limite de dépense de l'organisation (résolution des 402). |
| Page des limites | `https://admin.mistral.ai/plateforme/limits` | Consulter ses limites de débit courantes. |
| Admin settings › API key expiration policy | doc `/admin/identity-access/api-key-policy` | Durées de validité max des clés (Organisation / Workspace), notifications d'expiration. |
| Admin Panel (gestion utilisateurs et permissions, GA 2026-09-10) | `admin.mistral.ai` | Tableau de bord admin : paramètres d'organisation, membres, workspaces, clés API ; gestion de groupes (ajout/retrait en masse, assignation aux workspaces) ; création de workspace avec membres/rôles ; vues détail workspace (permissions, limites, groupes) et utilisateur (workspaces, groupes, rôles) ; *app switcher* entre applications Mistral. |
| AI Studio › Workflows (liste et exécutions) | — | Filtres multi-statuts/propriétés, recherche floue, tri, pagination, favoris (étoile), état de filtre dans l'URL (partageable), taux d'échec par workflow, *execution search keys*. |
| AI Studio › Managed Deployments | doc `/studio/workflows/managing-workflows-in-production/managed-deployments` | Créer un déploiement depuis un dépôt GitHub ; actions create/update/stop/start/restart/redeploy/delete ; logs de build et de worker. |
| Vibe Work | `https://chat.mistral.ai` | Conversation unifiée, sélecteur `Fast`/`Think`, Skills, Knowledge Base (flux « Knowledge onboarding », Settings, Privacy settings), Temporary chat, Canvas (tableurs, Mini Apps), Code Interpreter. |
| Vibe Code | `https://code.mistral.ai` (sessions distantes), CLI `vibe`, extension VS Code | Agent de code ; `vibe --version` pour vérifier la version (MAI-2026-003). |
| Statut et support | `https://status.mistral.ai`, `support@mistral.ai` | Incidents en cours ; contact en cas d'erreur 500 persistante. |
| Documentation › Models | `/models`, `/models/<slug>` | Deux tableaux (actifs ; « Deprecated and retired models ») et une fiche par modèle. |
| Documentation › Resources | `/resources` | Hub « SDKs, cookbooks, release notes, migration guides, glossary, support references » (composant `ResourcesOverview`). Glossaire avec **barre de recherche et filtres par lettre** ; release notes « Latest updates » ; index des avis de sécurité avec un avis « Featured ». |
| Hugging Face | `https://huggingface.co/mistralai` | Hébergement des poids ouverts (sauf Mistral 7B v0.2 base sur `models.mistralcdn.com`). |

---

## 5. API et SDK

### 5.1 Endpoints touchés par ce périmètre

| Méthode | Chemin | Rôle | Source / statut |
|---|---|---|---|
| GET | `/v1/models` | Liste des modèles disponibles pour l'utilisateur ; filtres query `provider`, `model` | spec |
| GET | `/v1/models/{model_id}` | Fiche d'un modèle : `BaseModelCard` ou `FTModelCard` (discriminant `type` = `base` / `fine-tuned`) | spec |
| DELETE | `/v1/models/{model_id}` | Supprime un modèle **fine-tuné** (supprimer un modèle de base → 403) | doc + spec |
| PATCH | `/v1/fine_tuning/models/{model_id}` | Renommer / redécrire un modèle fine-tuné ; réponse `CompletionFineTunedModel` ou `ClassifierFineTunedModel` (discriminant `model_type` = `completion` / `classifier`) | spec |
| POST / DELETE | `/v1/fine_tuning/models/{model_id}/archive` | Archiver / désarchiver un modèle fine-tuné | spec |
| POST | `/v1/files` | Upload multipart (`purpose="fine-tune"`) | doc |
| POST | `/v1/fine_tuning/jobs` | Créer un job (SFT ou `job_type: "classifier"`) | doc dépréciée — **absent de la spec OpenAPI locale** |
| GET | `/v1/fine_tuning/jobs` | Lister (filtres `page`, `page_size`, `model`, `created_after`, `created_by_me`, `status`, `wandb_project`, `wandb_name`, `suffix`) | idem |
| GET | `/v1/fine_tuning/jobs/{job_id}` | Statut / détail | idem |
| POST | `/v1/fine_tuning/jobs/{job_id}/start` | Démarrer un job `VALIDATED` | idem |
| POST | `/v1/fine_tuning/jobs/{job_id}/cancel` | Annuler | idem |
| POST | `/v1/classifications` | Classifier du texte (champ `input`) avec un classifieur fine-tuné | doc + spec |
| POST | `/v1/chat/classifications` | Classifier des conversations | doc + spec |
| POST | `/v1/moderations`, `/v1/chat/moderations` | Modération texte / conversation (modèles Moderation) | spec (détail hors périmètre) |
| POST | `/v1/chat/completions` | Paramètres concernés : `safe_prompt`, `prompt_mode`, `reasoning_effort`, `guardrails`, `response_format`, `stream_options.include_usage`, `presence_penalty`, `frequency_penalty`, `n`, `tool_choice` | doc + spec |
| POST | `/v1/conversations` | Champ `guardrails` par requête (depuis 2026-03-12) | changelog |
| POST | `/v1/audio/transcriptions` | Transcription Voxtral (*context biasing*, `diarize`) | changelog |
| — | `/api/files` (on-prem Mistral AI Studio) | Endpoint concerné par MAI-2026-001 | avis de sécurité |

### 5.2 Schéma machine d'un modèle (spec OpenAPI)

- `BaseModelCard` : `id` (requis), `object` (`model`), `created`, `owned_by` (défaut `mistralai`), `capabilities` (requis), `name`, `description`, `max_context_length` (défaut **32768**), `aliases` (liste), `deprecation` (date-time), `deprecation_replacement_model`, `default_model_temperature`, `internal` (bool), `billing_model_name`, `type` = `base`.
- `FTModelCard` : mêmes champs + `type` = `fine-tuned`, `job` (requis), `root` (requis, ex. `open-mistral-7b`), `archived` (défaut `false`).
- `ModelCapabilities` (tous booléens, défaut `false`) : `completion_chat`, `function_calling`, `reasoning`, `completion_fim`, `fine_tuning`, `vision`, `ocr`, `classification`, `moderation`, `audio`, `audio_transcription`, `audio_transcription_realtime`, `audio_speech`, `unified_resources`. La description du schéma mentionne qu'il est « peuplé par Harmattan » (nom interne, inférence).
- Correspondance approximative avec les étiquettes `Features` des fiches (inférence) : `chat-completions` ↔ `completion_chat`, `fim` ↔ `completion_fim`, `moderations` ↔ `moderation`, `tts` ↔ `audio_speech`, etc.

### 5.3 Méthodes SDK citées dans le périmètre

| Usage | Python (`mistralai`) | TypeScript (`@mistralai/mistralai`) |
|---|---|---|
| Client | `Mistral(api_key=…)` (V2 : `from mistralai.client import Mistral`) | `new Mistral({ apiKey })` |
| Chat | `client.chat.complete(model, messages, safe_prompt=…, prompt_mode=…)` | `client.chat.complete({ model, messages, safePrompt })` |
| Streaming | `client.chat.stream(...)` | (non montré) |
| Upload | `client.files.upload(file={"file_name", "content"})` | `client.files.upload({ file: { fileName, content } })` |
| Jobs FT | `client.fine_tuning.jobs.create/get/start/list/cancel` | `client.fineTuning.jobs.create/get/start/list/cancel` |
| Classifieur | `client.classifiers.classify(model, inputs)`, `classify_chat` | `client.classifiers.classify({ model, inputs })`, `classifyChat` |
| Suppression modèle | `client.models.delete(model_id=…)` | `client.models.delete({ modelId })` |
| Azure / GCP | `mistralai.azure.client.MistralAzure(server_url, api_key)` ; `mistralai.gcp.client.MistralGCP(region, project_id)` | paquets `@mistralai/mistralai-azure`, `@mistralai/mistralai-gcp` |
| Tokenizer | `mistral_common…MistralTokenizer.v3().encode_chat_completion(...)` | — |

### 5.4 Codes d'erreur (glossaire des erreurs + pages dépréciées)

| Code | Signification | Causes courantes | Résolution |
|---|---|---|---|
| 400 | Bad request | JSON invalide ; `model` ou `messages` manquant ; valeur non supportée (ex. `temperature` hors 0–1) ; contexte dépassé | Valider le corps contre la référence API |
| 401 | Unauthorized | Pas d'en-tête `Authorization` ; clé incorrecte/révoquée ; clé d'un autre workspace | Vérifier la clé ; format `Authorization: Bearer YOUR_API_KEY` |
| 402 | Payment required | Crédit prépayé à zéro ; limite de dépense mensuelle Organisation/Workspace atteinte ; usage inclus épuisé sans pay-as-you-go ; échec de paiement de facture | Suivre le lien du message ; Admin Panel › Subscriptions › Billing |
| 403 | Forbidden | Modèle hors du niveau d'abonnement ; tentative de suppression d'un modèle de base ; permissions de workspace ; **contenu bloqué par un guardrail** (« Content blocked by guardrail ») ; erreur serveur avec `block_on_error: true` | Vérifier niveau et accès ; contacter l'admin du workspace |
| 404 | Not found | ID de modèle/endpoint invalide ; fichier, job ou conversation supprimé ; faute de frappe | Vérifier l'ID ; utiliser les endpoints de liste |
| 409 | Conflict (fine-tuning) | Job similaire déjà en cours / validé / en file | — |
| 413 | Request Entity Too Large (fine-tuning) | Fichier > 500 Mo | Découper le fichier |
| 422 | Validation error | Mauvais type, valeur d'enum invalide, tableau trop long | Lire les erreurs par champ dans le corps de réponse |
| 429 | Too many requests | Requêtes/s, tokens/min ou concurrence dépassés | Backoff exponentiel ; en-tête `Retry-After` ; batch ou plan supérieur |
| 500 | Internal server error | — | Réessayer ; status.mistral.ai ; support@mistral.ai |
| 502 | Bad gateway | Réponse amont invalide (transitoire) | Attendre 30–60 s et réessayer |
| 503 | Service unavailable | Surcharge ou maintenance | Backoff exponentiel ; status.mistral.ai |
| 504 | Gateway timeout | Prompts très longs, `max_tokens` élevé, charge | Réduire l'entrée ou `max_tokens` ; gérer correctement le streaming |

- **Format d'erreur** : `{"object": "error", "message": …, "type": …, "param": …, "code": …}` ; `type` ∈ `invalid_request_error`, `authentication_error`, `rate_limit_error`, `server_error` ; `code` machine (ex. `unknown_model`) ; `param` (ex. `model`).
- **Stratégie de retry** recommandée pour 429/500/502/503/504 : backoff exponentiel `2 ** attempt + random.uniform(0, 1)` secondes, 5 tentatives max ; déjà intégré aux SDK Python et TypeScript.
- Erreur historique de validation stricte : « Extra inputs are not permitted » (paramètre inconnu, depuis 2024-01-11).

### 5.5 Streaming et champs de réponse notables
- Usage des tokens dans le **dernier chunk** (2024-01-16) ; `stream_options.include_usage` à activer explicitement (limites connues).
- Champ **`p`** ajouté aux chunks (2025-08-27) comme bourrage anti-canal auxiliaire ; parseurs stricts à adapter ; `mistral-common` ≥ 1.8.4.
- Réponse chat : `usage.prompt_tokens_details.cached_tokens` présent dans les exemples récents ; `content` peut être une **liste de chunks** (`thinking`, `text`) pour les modèles à raisonnement.

---

## 6. Limites, quotas, tarifs, disponibilité

### 6.1 Tarifs des modèles actifs (USD)

| Unité | Modèles (prix) |
|---|---|
| Par M tokens (entrée / sortie) | Ministral 3 3B 0,1/0,1 ; Ministral 3 8B 0,15/0,15 ; Mistral Small 4 0,15/0,6 ; Ministral 3 14B 0,2/0,2 ; Codestral 0,3/0,9 ; Mistral Large 3 0,5/1,5 ; Mistral Large 4 1,36/4,18 (cache 0,14) ; Z.ai GLM 5.3 1,4/4,4 (cache 0,14) ; Mistral Medium 3.5 1,5/7,5 |
| Par M tokens (entrée seule) | Mistral Embed 0,1 ; Codestral Embed 0,15 ; Mistral Moderation 2 **0 (Free)** |
| Audio par minute | Voxtral Mini Transcribe 2 0,003 ; Mini Transcribe 3 0,0035 ; Small Transcribe 3 0,004 ; Voxtral Small 0,004 (+ 0,1/0,4 $/M tokens) ; Mini Transcribe Realtime 0,006 ; Realtime 3 0,008 |
| Par M caractères (TTS) | Voxtral TTS 16 ; Voxtral TTS 3 13 |
| Par 1000 pages (OCR) | OCR 3 : 2 $ (3 $ annotées) ; OCR 4.1 : 4 $ (5 $ annotées) |
| Non publiés | Shieldstral 1.0, Timestral 1.0 (×4) |

Particularités : Large 4 en remise de lancement −50 % pendant 2 semaines à partir du 2026-10-06 ; OCR 4.0 → 4.1 et GLM 5.2 → 5.3 « au même prix » ; Leanstral (toutes versions) gratuit ; Devstral 2 passé payant le 2026-01-27 ; `n` complétions : tokens d'entrée facturés une fois (2024-11-06).

### 6.2 Fine-tuning (déprécié)
- 4 $ minimum par job ; 2 $/mois de stockage par modèle ; fichiers d'entraînement 512 Mo chacun (nombre illimité) ; validation ≤ min(1 Mo, 5 % du train) ; `413` au-delà de ~500 Mo par requête.

### 6.3 Plans, accès et régions
- **Free mode** par défaut (sans carte, usage mensuel inclus, limites de débit) ; **free tier API** introduit le 2024-09-17 ; **Pay-as-you-go** optionnel au token au-delà ; **crédits prépayés** et **limites de dépense** Organisation/Workspace (402).
- Limites de débit par niveau d'abonnement, par modèle, **par organisation** ; RPS et TPM indépendants ; batch hors quotas temps réel.
- Fonctions liées au plan (release notes) : Managed Deployments = plan payant (Pay-as-you-go ou Enterprise) + quota pendant la Public Preview ; Spreadsheets et Code Interpreter de Vibe Work = plans payants.
- Régions : API servie depuis des **datacenters UE par défaut** ; certains modèles non disponibles partout ; Vertex AI : région SDK par défaut `europe-west4`.
- Rétention : fichiers uploadés **30 jours** ; résultats batch **24 h**.
- Distribution on-premises : « Mistral AI Studio » versionné `2026.x.y` (MAI-2026-001).

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

1. **`mistral-medium-3` ≠ Mistral Medium 3** : l'alias `mistral-medium-3` pointe vers **Medium 3.5** (`mistral-medium-3-5`), tandis que « Mistral Medium 3 » est `mistral-medium-2505` (déprécié).
2. **`mistral-large-latest` pointe vers Large 3**, pas vers Large 4 (Public Preview) ; idem `mistral-ocr-latest` → OCR 4.1, `mistral-small-latest` → Small 4, `codestral-latest` → 25.08.
3. **IDs partagés** : `voxtral-mini-2507` désigne à la fois Voxtral Mini (chat) et Voxtral Mini Transcribe (via `audio/transcriptions`) ; `open-mistral-7b` désigne Mistral 7B v0.2 et v0.3 ; trois fiches s'appellent « Codestral ».
4. **Alias en double** : `voxtral-mini-latest` est listé à la fois sur Voxtral Mini (2507, déprécié) et Voxtral Mini Transcribe 2 (`voxtral-mini-2602`) ; `voxtral-mini-tts-latest` sur Voxtral TTS (2603) et Voxtral TTS 3.
5. **Alias `-latest` sur des modèles dépréciés** : `devstral-latest`, `devstral-medium-latest` (Devstral 2), `devstral-small-latest` (Devstral Small 2), `magistral-medium-latest`, `magistral-small-latest`, `pixtral-large-latest`, `open-mistral-nemo` — un code qui s'appuie sur ces alias cassera au retrait.
6. **Changement de prix à la migration** : Medium 3.1 (0,4/2 $) → Medium 3.5 (1,5/7,5 $) ; Devstral Small (0,1/0,3 $) → Medium 3.5 ; Ministral 3B 2410 (0,04 $) → Ministral 3 3B (0,1 $) ; OCR 2 (1 $/1000 p.) → OCR 4.1 (4 $).
7. **Préavis très courts** : OCR 4.0 et Leanstral 1.5 dépréciés la veille de leur retrait ; Codestral Mamba déprécié et retiré le même jour ; Leanstral 1.5 annoncé dès sa sortie avec 3 mois de vie.
8. **Modèles sans ID API** : Shieldstral 1.0, Timestral 1.0 (×4), Mathstral 7B, Mistral Next, Mistral 7B v0.1 → pas de valeur `model` publiée.
9. **Licences hétérogènes des poids** : Apache 2.0 (majorité), Modified MIT (Medium 3.5, Devstral 2, Timestral), MRL (Large 2.x, Pixtral Large, Ministral 8B 2410, Small 2.0), **MNPL** (Codestral 24.05), **CC BY-NC 4.0** (Voxtral TTS — non commercial). Large 4 : licence non indiquée.
10. **Type ≠ ouverture** : Timestral est `Premier` mais a des poids ouverts ; Voxtral Mini Transcribe Realtime 2602 est `Open` mais Realtime 3 est `Premier` (pas de poids).
11. **Température** : la doc (glossaire, erreurs) borne `temperature` à 0–1 mais la spec accepte 0–1.5 ; certains modèles ont subi un facteur 0,43 (Pixtral 12B, Ministral 2410) ; la spec expose `default_model_temperature` par modèle (le défaut varie selon le modèle).
12. **Mode JSON** : obligation de mentionner « JSON » dans le prompt, sinon flux d'espaces infini possible.
13. **`tool_call_id`** obligatoire dans les messages `tool` depuis 2024-05-23 ; en fine-tuning, `id`/`tool_call_id` de 9 caractères exactement.
14. **Fine-tuning** : `auto_start` vaut `False` par défaut (le job attend un `start`) ; `training_files` est une liste d'objets `{file_id, weight}` en SDK mais une liste d'UUID dans l'exemple curl ; le learning rate est un **pic** (warmup + cosinus) ; `dry_run` annoncé comme supprimé.
15. **Raisonnement Magistral** : migrer de `<think>` (2506) aux chunks `thinking` (2507/2509) ; `prompt_mode: null` supprime le system prompt par défaut ; un system prompt personnalisé le remplace.
16. **Guardrails** : `moderation_llm_v1` utilise par défaut `mistral-moderation-2411` (déprécié) ; `action` vaut `none` par défaut (aucun blocage sans `"block"`) ; `block_on_error` vaut `false` par défaut.
17. **Streaming** : nouveau champ `p` dans les chunks (2025-08-27) à tolérer dans les parseurs maison ; usage seulement si `stream_options.include_usage`.
18. **Sécurité supply-chain** : versions `mistralai` 2.4.6 (PyPI) et `@mistralai/*` 2.2.2–2.2.4 / 1.7.1–1.7.3 (npm) à bannir des lockfiles et miroirs.
19. **Vibe CLI** : les modes d'approbation automatique contournent volontairement les contrôles de permission shell (MAI-2026-003).
20. **Chemins de documentation** : `/le-chat/*` et `/mistral-vibe/*` redirigent vers `/vibe/*` depuis 2026-05-28.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **Statuts non mis à jour** : 23 des 24 modèles « Deprecated » ont une date de retrait **déjà passée** au 21/10/2026 (ex. Ministral 3B 2410 retrait 2025-12-31, Mistral Small 3.2 2026-07-31, OCR 4.0 2026-09-30) mais restent affichés `Deprecated` et non `Retired` ; seul GLM 5.2 (retrait 2026-10-31) est cohérent. Impossible de savoir s'ils répondent encore.
2. **Leanstral 1.5** : statut `Deprecated`, retrait 2026-09-30 passé, **aucun remplaçant** — alors que Leanstral (2603) pointe vers lui comme remplaçant.
3. **OCR 3** est `GA` tout en affichant un `Replacement` (OCR 4.1) ; le résumé du catalogue précise qu'il « reste disponible pour les intégrations existantes ».
4. **Dates divergentes changelog / fiches** : Mistral Moderation 2603 (fiche 2026-03-01, changelog 2026-03-12) ; Magistral 1.2 (fiche 2025-09-18, changelog 2025-09-17) ; Mistral Small Creative (fiche 2025-12-11, changelog 2025-12-16) ; GLM 5.3 (fiche 2026-09-15, GA au changelog 2026-09-28) ; Mistral Small 3.2 (sortie 2025-06-20, API 2025-06-23).
5. **ID erroné dans le changelog** : Voxtral TTS annoncé comme `voxtral-tts-2603` alors que l'ID API est `voxtral-mini-tts-2603`.
6. **Format de dates incohérent** : Magistral Small 1.2 affiche « April 30, 2026 » / « July 31, 2026 » au lieu du format ISO.
7. **Résumé copié-collé** : Mistral Embed est décrit comme « semantic for extracting representation of **code** extracts », texte identique à Codestral Embed.
8. **Voxtral Mini** : « 4B parameters » mais lien vers le dépôt `Voxtral-Mini-3B-2507`.
9. **Voxtral Small Transcribe 3** : la description annonce traduction, Q&R vocales, résumé et function calling, mais `Features` ne liste que `timestamps`, `transcriptions`.
10. **Contexte des modèles de transcription** : Mini Transcribe 2 = `--` mais Mini/Small Transcribe 3 = 32k ; durée audio max 60 min (limites connues) sans lien explicite avec le contexte.
11. **Fichiers** : limite générale 512 Mo, audio 500 Mo, et erreur fine-tuning `413` au-delà de 500 Mo — trois seuils voisins non réconciliés.
12. **Spec vs doc fine-tuning** : `/v1/fine_tuning/jobs*` documenté (déprécié) mais absent de la spec OpenAPI locale, alors que `/v1/fine_tuning/models/{id}` (PATCH, archive) y figure encore → statut réel de l'API de jobs inconnu (inférence : retirée).
13. **Classifier Factory** : seul modèle de base `ministral-3b(-latest)` ; on ignore s'il désigne Ministral 3B 2410 (déprécié) ou Ministral 3 3B (2512).
14. **Liste des modèles fine-tunables** (`open-mistral-7b`, `mistral-large-latest`, `pixtral-12b-latest`…) : la plupart sont retirés ; `mistral-large-latest` pointe aujourd'hui vers Large 3, jamais listé comme fine-tunable.
15. **`dry_run=True` « sera supprimé en septembre »** sans année.
16. **Guide de migration** : tableau « `mistralai.Mistral` » vs import V2 `mistralai.client.Mistral` ; correspondances Llama → Mistral 7B / Mixtral 8x22B, **deux modèles retirés** ; affirmation « tous les modèles open-weight sous la Mistral license » contredite par les licences Apache 2.0 / Modified MIT des fiches.
17. **SDK TypeScript** : lien d'exemples vers `mistralai/client-js` (ancien dépôt) alors que l'installation pointe vers `client-ts`.
18. **Exemple TypeScript `safe_prompt`** syntaxiquement invalide (arguments nommés hors objet).
19. **Release notes** : « admin documentation » renvoie vers `/` ; date de la note Vibe (2026-09-22) postérieure au début du déploiement annoncé (2026-09-14) ; disponibilités hétérogènes (« Available », « Paid plans », « GA » vs « General Availability »).
20. **MAI-2026-001** : format annoncé `YYYY-MM-PATCHNUM` mais versions écrites `2026.1.3` (points, mois sans zéro).
21. **Plage de `temperature`** : le glossaire et le glossaire des erreurs la bornent à 0.0–1.0 (« `temperature` outside 0 to 1 range » → 400), alors que la spec OpenAPI de `ChatCompletionRequest` accepte **0 à 1.5** (recommandation 0.0–0.7, défaut propre à chaque modèle, à lire via `/models`). Par ailleurs, « Mistral Embed produit des vecteurs 1024 dimensions » sans équivalent indiqué pour Codestral Embed.
22. **Large 4** : note de vitesse 5/5 pour un MoE de 1,05T paramètres, et licence absente alors que le changelog le dit « open-weight ».
23. **Shieldstral / Timestral** : en Public Preview mais sans ID API, prix ni endpoint documentés dans ce périmètre — mode d'accès inconnu.
24. **Langues** : l'anglais absent de la liste des modèles de langage ; langues de Voxtral TTS (« 9 languages ») non énumérées.

---

## Annexe — Couverture

96 fichiers assignés / 96 lus. Vérifications complémentaires par grep ciblé dans `scratchpad/web/openapi.yaml` (schémas `BaseModelCard`, `FTModelCard`, `ModelCapabilities`, `GuardrailConfig`, `ModerationLLMV1Config`/`V2`, `MistralPromptMode`, `ReasoningEffort`, chemins `/v1/models*`, `/v1/fine_tuning/*`, `/v1/classifications`).

| # | Fichier | Titre | Statut | Source |
|---|---|---|---|---|
| 1 | `models.md` | [Models Overview] | ✅ lu en entier | https://docs.mistral.ai/models.md |
| 2 | `models/codestral-24-05.md` | [Codestral] | ✅ lu en entier | https://docs.mistral.ai/models/codestral-24-05.md |
| 3 | `models/codestral-25-01.md` | [Codestral] | ✅ lu en entier | https://docs.mistral.ai/models/codestral-25-01.md |
| 4 | `models/codestral-25-08.md` | [Codestral] | ✅ lu en entier | https://docs.mistral.ai/models/codestral-25-08.md |
| 5 | `models/codestral-embed-25-05.md` | [Codestral Embed] | ✅ lu en entier | https://docs.mistral.ai/models/codestral-embed-25-05.md |
| 6 | `models/codestral-mamba-7b-0-1.md` | [Codestral Mamba 7B] | ✅ lu en entier | https://docs.mistral.ai/models/codestral-mamba-7b-0-1.md |
| 7 | `models/devstral-2-25-12.md` | [Devstral 2] | ✅ lu en entier | https://docs.mistral.ai/models/devstral-2-25-12.md |
| 8 | `models/devstral-medium-1-0-25-07.md` | [Devstral Medium 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/devstral-medium-1-0-25-07.md |
| 9 | `models/devstral-small-1-0-25-05.md` | [Devstral Small 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/devstral-small-1-0-25-05.md |
| 10 | `models/devstral-small-1-1-25-07.md` | [Devstral Small 1.1] | ✅ lu en entier | https://docs.mistral.ai/models/devstral-small-1-1-25-07.md |
| 11 | `models/devstral-small-2-25-12.md` | [Devstral Small 2] | ✅ lu en entier | https://docs.mistral.ai/models/devstral-small-2-25-12.md |
| 12 | `models/leanstral-1-5.md` | [Leanstral 1.5] | ✅ lu en entier | https://docs.mistral.ai/models/leanstral-1-5.md |
| 13 | `models/leanstral-26-03.md` | [Leanstral] | ✅ lu en entier | https://docs.mistral.ai/models/leanstral-26-03.md |
| 14 | `models/magistral-medium-1-0-25-06.md` | [Magistral Medium 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/magistral-medium-1-0-25-06.md |
| 15 | `models/magistral-medium-1-1-25-07.md` | [Magistral Medium 1.1] | ✅ lu en entier | https://docs.mistral.ai/models/magistral-medium-1-1-25-07.md |
| 16 | `models/magistral-medium-1-2-25-09.md` | [Magistral Medium 1.2] | ✅ lu en entier | https://docs.mistral.ai/models/magistral-medium-1-2-25-09.md |
| 17 | `models/magistral-small-1-0-25-06.md` | [Magistral Small 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/magistral-small-1-0-25-06.md |
| 18 | `models/magistral-small-1-1-25-07.md` | [Magistral Small 1.1] | ✅ lu en entier | https://docs.mistral.ai/models/magistral-small-1-1-25-07.md |
| 19 | `models/magistral-small-1-2-25-09.md` | [Magistral Small 1.2] | ✅ lu en entier | https://docs.mistral.ai/models/magistral-small-1-2-25-09.md |
| 20 | `models/mathstral-7b-0-1.md` | [Mathstral 7B] | ✅ lu en entier | https://docs.mistral.ai/models/mathstral-7b-0-1.md |
| 21 | `models/ministral-3-14b-25-12.md` | [Ministral 3 14B] | ✅ lu en entier | https://docs.mistral.ai/models/ministral-3-14b-25-12.md |
| 22 | `models/ministral-3-3b-25-12.md` | [Ministral 3 3B] | ✅ lu en entier | https://docs.mistral.ai/models/ministral-3-3b-25-12.md |
| 23 | `models/ministral-3-8b-25-12.md` | [Ministral 3 8B] | ✅ lu en entier | https://docs.mistral.ai/models/ministral-3-8b-25-12.md |
| 24 | `models/ministral-3b-24-1.md` | [Ministral 3B] | ✅ lu en entier | https://docs.mistral.ai/models/ministral-3b-24-1.md |
| 25 | `models/ministral-8b-24-1.md` | [Ministral 8B] | ✅ lu en entier | https://docs.mistral.ai/models/ministral-8b-24-1.md |
| 26 | `models/mistral-7b-0-1.md` | [Mistral 7B] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-7b-0-1.md |
| 27 | `models/mistral-7b-0-2.md` | [Mistral 7B] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-7b-0-2.md |
| 28 | `models/mistral-7b-0-3.md` | [Mistral 7B] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-7b-0-3.md |
| 29 | `models/mistral-embed-23-12.md` | [Mistral Embed] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-embed-23-12.md |
| 30 | `models/mistral-large-1-0-24-02.md` | [Mistral Large 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-large-1-0-24-02.md |
| 31 | `models/mistral-large-2-0-24-07.md` | [Mistral Large 2.0] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-large-2-0-24-07.md |
| 32 | `models/mistral-large-2-1-24-11.md` | [Mistral Large 2.1] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-large-2-1-24-11.md |
| 33 | `models/mistral-large-3-25-12.md` | [Mistral Large 3] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-large-3-25-12.md |
| 34 | `models/mistral-large-4-0.md` | [Mistral Large 4] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-large-4-0.md |
| 35 | `models/mistral-medium-1-0-23-12.md` | [Mistral Medium 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-medium-1-0-23-12.md |
| 36 | `models/mistral-medium-3-1-25-08.md` | [Mistral Medium 3.1] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-medium-3-1-25-08.md |
| 37 | `models/mistral-medium-3-25-05.md` | [Mistral Medium 3] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-medium-3-25-05.md |
| 38 | `models/mistral-medium-3-5-26-04.md` | [Mistral Medium 3.5] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-medium-3-5-26-04.md |
| 39 | `models/mistral-moderation-24-11.md` | [Mistral Moderation] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-moderation-24-11.md |
| 40 | `models/mistral-moderation-26-03.md` | [Mistral Moderation 2] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-moderation-26-03.md |
| 41 | `models/mistral-nemo-12b-24-07.md` | [Mistral Nemo 12B] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-nemo-12b-24-07.md |
| 42 | `models/mistral-next.md` | [Mistral Next] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-next.md |
| 43 | `models/mistral-saba-25-02.md` | [Mistral Saba] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-saba-25-02.md |
| 44 | `models/mistral-small-1-0-24-02.md` | [Mistral Small 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-small-1-0-24-02.md |
| 45 | `models/mistral-small-2-0-24-09.md` | [Mistral Small 2.0] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-small-2-0-24-09.md |
| 46 | `models/mistral-small-3-0-25-01.md` | [Mistral Small 3.0] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-small-3-0-25-01.md |
| 47 | `models/mistral-small-3-1-25-03.md` | [Mistral Small 3.1] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-small-3-1-25-03.md |
| 48 | `models/mistral-small-3-2-25-06.md` | [Mistral Small 3.2] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-small-3-2-25-06.md |
| 49 | `models/mistral-small-4-0-26-03.md` | [Mistral Small 4] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-small-4-0-26-03.md |
| 50 | `models/mistral-small-creative-25-12.md` | [Mistral Small Creative] | ✅ lu en entier | https://docs.mistral.ai/models/mistral-small-creative-25-12.md |
| 51 | `models/mixtral-8x22b-0-1-0-3.md` | [Mixtral 8x22B] | ✅ lu en entier | https://docs.mistral.ai/models/mixtral-8x22b-0-1-0-3.md |
| 52 | `models/mixtral-8x7b-0-1.md` | [Mixtral 8x7B] | ✅ lu en entier | https://docs.mistral.ai/models/mixtral-8x7b-0-1.md |
| 53 | `models/ocr-2-25-05.md` | [OCR 2] | ✅ lu en entier | https://docs.mistral.ai/models/ocr-2-25-05.md |
| 54 | `models/ocr-25-03.md` | [OCR] | ✅ lu en entier | https://docs.mistral.ai/models/ocr-25-03.md |
| 55 | `models/ocr-3-25-12.md` | [OCR 3] | ✅ lu en entier | https://docs.mistral.ai/models/ocr-3-25-12.md |
| 56 | `models/ocr-4-0.md` | [OCR 4.0] | ✅ lu en entier | https://docs.mistral.ai/models/ocr-4-0.md |
| 57 | `models/ocr-4-1.md` | [OCR 4.1] | ✅ lu en entier | https://docs.mistral.ai/models/ocr-4-1.md |
| 58 | `models/pixtral-12b-24-09.md` | [Pixtral 12B] | ✅ lu en entier | https://docs.mistral.ai/models/pixtral-12b-24-09.md |
| 59 | `models/pixtral-large-24-11.md` | [Pixtral Large] | ✅ lu en entier | https://docs.mistral.ai/models/pixtral-large-24-11.md |
| 60 | `models/shieldstral-1-0.md` | [Shieldstral 1.0] | ✅ lu en entier | https://docs.mistral.ai/models/shieldstral-1-0.md |
| 61 | `models/timestral-1-0-123m.md` | [Timestral 1.0 123M] | ✅ lu en entier | https://docs.mistral.ai/models/timestral-1-0-123m.md |
| 62 | `models/timestral-1-0-209m.md` | [Timestral 1.0 209M] | ✅ lu en entier | https://docs.mistral.ai/models/timestral-1-0-209m.md |
| 63 | `models/timestral-1-0-28m.md` | [Timestral 1.0 28M] | ✅ lu en entier | https://docs.mistral.ai/models/timestral-1-0-28m.md |
| 64 | `models/timestral-1-0-5m.md` | [Timestral 1.0 5M] | ✅ lu en entier | https://docs.mistral.ai/models/timestral-1-0-5m.md |
| 65 | `models/voxtral-mini-25-07.md` | [Voxtral Mini] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-mini-25-07.md |
| 66 | `models/voxtral-mini-transcribe-25-07.md` | [Voxtral Mini Transcribe] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-mini-transcribe-25-07.md |
| 67 | `models/voxtral-mini-transcribe-26-02.md` | [Voxtral Mini Transcribe 2] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-mini-transcribe-26-02.md |
| 68 | `models/voxtral-mini-transcribe-3-0.md` | [Voxtral Mini Transcribe 3] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-mini-transcribe-3-0.md |
| 69 | `models/voxtral-mini-transcribe-realtime-26-02.md` | [Voxtral Mini Transcribe Realtime] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-mini-transcribe-realtime-26-02.md |
| 70 | `models/voxtral-mini-transcribe-realtime-3-0.md` | [Voxtral Mini Transcribe Realtime 3] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-mini-transcribe-realtime-3-0.md |
| 71 | `models/voxtral-mini-tts-3-0.md` | [Voxtral TTS 3] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-mini-tts-3-0.md |
| 72 | `models/voxtral-small-25-07.md` | [Voxtral Small] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-small-25-07.md |
| 73 | `models/voxtral-small-transcribe-3-0.md` | [Voxtral Small Transcribe 3] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-small-transcribe-3-0.md |
| 74 | `models/voxtral-tts-26-03.md` | [Voxtral TTS] | ✅ lu en entier | https://docs.mistral.ai/models/voxtral-tts-26-03.md |
| 75 | `models/zai-glm-5-2.md` | [Z.ai GLM 5.2] | ✅ lu en entier | https://docs.mistral.ai/models/zai-glm-5-2.md |
| 76 | `models/zai-glm-5-3.md` | [Z.ai GLM 5.3] | ✅ lu en entier | https://docs.mistral.ai/models/zai-glm-5-3.md |
| 77 | `resources.md` | [Resources] | ✅ lu en entier | https://docs.mistral.ai/resources.md |
| 78 | `resources/changelogs.md` | [Changelog] | ✅ lu en entier | https://docs.mistral.ai/resources/changelogs.md |
| 79 | `resources/deprecated/customization.md` | [Fine-tuning API (legacy)] | ✅ lu en entier | https://docs.mistral.ai/resources/deprecated/customization.md |
| 80 | `resources/deprecated/finetuning.md` | [Fine-tuning] | ✅ lu en entier | https://docs.mistral.ai/resources/deprecated/finetuning.md |
| 81 | `resources/deprecated/finetuning/classifier_factory.md` | [Classifier Factory] | ✅ lu en entier | https://docs.mistral.ai/resources/deprecated/finetuning/classifier_factory.md |
| 82 | `resources/deprecated/finetuning/text_vision_finetuning.md` | [Text & Vision Fine-tuning] | ✅ lu en entier | https://docs.mistral.ai/resources/deprecated/finetuning/text_vision_finetuning.md |
| 83 | `resources/deprecated/guardrailing/mistral_moderation_2411.md` | [Mistral Moderation 2411] | ✅ lu en entier | https://docs.mistral.ai/resources/deprecated/guardrailing/mistral_moderation_2411.md |
| 84 | `resources/deprecated/guardrailing/safe_prompt.md` | [Safe Prompt] | ✅ lu en entier | https://docs.mistral.ai/resources/deprecated/guardrailing/safe_prompt.md |
| 85 | `resources/deprecated/native-reasoning.md` | [Native reasoning (deprecated)] | ✅ lu en entier — longues traces de raisonnement d'exemple parcourues et résumées (contenu répétitif de sortie modèle) | https://docs.mistral.ai/resources/deprecated/native-reasoning.md |
| 86 | `resources/error-glossary.md` | [Error glossary] | ✅ lu en entier | https://docs.mistral.ai/resources/error-glossary.md |
| 87 | `resources/glossary.md` | [Glossary] | ✅ lu en entier | https://docs.mistral.ai/resources/glossary.md |
| 88 | `resources/known-limitations.md` | [Known limitations] | ✅ lu en entier | https://docs.mistral.ai/resources/known-limitations.md |
| 89 | `resources/languages.md` | [Supported languages] | ✅ lu en entier | https://docs.mistral.ai/resources/languages.md |
| 90 | `resources/migration-guides.md` | [Migration guides] | ✅ lu en entier | https://docs.mistral.ai/resources/migration-guides.md |
| 91 | `resources/release-notes.md` | [Release notes] | ✅ lu en entier | https://docs.mistral.ai/resources/release-notes.md |
| 92 | `resources/sdks.md` | [SDKs] | ✅ lu en entier — longue réponse JSON d'exemple résumée | https://docs.mistral.ai/resources/sdks.md |
| 93 | `resources/security-advisories.md` | [Security advisories] | ✅ lu en entier | https://docs.mistral.ai/resources/security-advisories.md |
| 94 | `resources/security-advisories/MAI-2026-001.md` | [Mistral AI Studio API files input filtering and access restriction] | ✅ lu en entier | https://docs.mistral.ai/resources/security-advisories/MAI-2026-001.md |
| 95 | `resources/security-advisories/MAI-2026-002.md` | [TanStack supply chain attack affecting Mistral SDK packages] | ✅ lu en entier | https://docs.mistral.ai/resources/security-advisories/MAI-2026-002.md |
| 96 | `resources/security-advisories/MAI-2026-003.md` | [Mistral Vibe shell permission vulnerabilities] | ✅ lu en entier | https://docs.mistral.ai/resources/security-advisories/MAI-2026-003.md |
