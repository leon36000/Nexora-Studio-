# K12 — Voix : réunions, synthèse vocale, dictée — Plan d'implémentation

> **Pour les agents :** sous-compétence requise : `superpowers:executing-plans` (exécution en ligne, par la session qui a écrit ce plan). Les étapes utilisent des cases `- [ ]`, cochées au fur et à mesure.

**Objectif :** Nexora sait parler (`/v1/audio/speech`, bloc Synthèse vocale, « Lire à voix haute »), écouter (dictée au micro dans l'Assistant, lexique de l'entreprise) et distinguer les intervenants d'une réunion (« Intervenant 1 / 2 / 3 »), le tout sur CPU, sans qu'aucune donnée ne sorte de l'instance.

**Architecture :**
- **Nexora API** gagne un type de routeur `text-to-speech` (route `POST /v1/audio/speech`, transmise à speaches, réponse binaire) et une vraie `diarized_json` : les segments et les mots horodatés de Whisper (`verbose_json`) sont fusionnés avec les tours de parole rendus par un **service de diarisation** facultatif (profil compose `voice`) ; le fusionneur est une fonction pure du domaine.
- **Service `nexora-diarize`** (nouveau, `services/nexora-diarize/`) : FastAPI + **sherpa-onnx** (Apache-2.0) — segmentation pyannote 3.0 (MIT) + empreintes de locuteurs ERes2Net (Apache-2.0) + regroupement, sur CPU, modèles cuits dans l'image (aucun téléchargement au démarrage).
- **WorkStudio** : usage de modèle « Synthèse vocale » (`speech`), fournisseur Nexora du bloc Synthèse vocale (`tts_nexora`), intervenants et lexique dans le bloc de transcription, relais `/v1/audio/speech` de la passerelle K3, routes de l'Assistant (dictée, lecture à voix haute), modèle PME « Compte rendu de réunion » enrichi (enregistrement → transcription par intervenant → résumé → validation → e-mail).

**Pile technique :** Python 3.12 (FastAPI, pytest, ruff, sherpa-onnx, PyAV), TypeScript (Next.js, vitest, next-intl, React Query), speaches 0.8.3 (Piper `fr_FR-siwis-medium`, Whisper `small`), compose.

**Spec :** `docs/superpowers/specs/2026-10-23-nexora-v3-design.md` §3 (matériel 8 cœurs / 32 Go, GPU facultatif ; diarisation seulement avec une brique de licence permissive qui tourne sur CPU) et `docs/recherche/ecart-mistral-studio-v2.md` §3.2 K12 (contenu et « Terminé quand », contraignants), matrice §1.11.

## Contraintes globales

- Jamais de code `ee/` d'origine de Sim ; `check-no-ee.sh` vert.
- Tout texte visible passe par next-intl (`messages/{fr,en}/…`) ; `check-i18n.sh` vert ; marque « Nexora » (`check-brand.sh`).
- Licences : tout composant livré est MIT/Apache/BSD, ou un modèle CC-BY avec attribution dans `THIRD_PARTY_NOTICES.md` ; `check-licenses.sh` vert. Aucun modèle soumis à des conditions Hugging Face n'est téléchargé à l'installation.
- Rien ne sort de l'instance : le service de diarisation et la voix tournent dans le réseau interne de compose ; aucun appel externe à l'exécution (modèles cuits dans l'image ou récupérés une fois, `HF_HUB_OFFLINE=1` ensuite).
- Matériel visé : 8 cœurs, 32 Go ; `NEXORA_WHISPER_THREADS` borne déjà les fils de Whisper ; la diarisation en prend au plus 2 (`NEXORA_DIARIZE_THREADS`).
- Toute modification de `deploy/` met à jour `scripts/tests/test-compose-env.sh` ; on lance `bash scripts/tests/test-*.sh`.
- Migration : Nexora API (Alembic, valeur d'énumération `TEXT_TO_SPEECH`). Aucune migration Drizzle n'est prévue ; s'il en fallait une : numéro **0447**, `when` supérieur à celui de la dernière entrée du journal.
- Nexora API : une convention (`services/nexora-api/AGENTS.md`) — architecture propre, tests unitaires de chaque branche du cas d'usage, `ForwardScenario` pour une capacité qui appelle un fournisseur.
- Protégé : règles `sim-api-contracts`, `sim-components`, `sim-ui-copy`, `sim-testing` ; contrats dans `lib/api/contracts/` ; `check:audits`, `check:api-validation:strict`, `check:test-types`.

## Points de vigilance (Review Focus)

1. **Un seul intervenant** (monologue, dictée) : la sortie diarisée porte « Intervenant 1 » partout, jamais de faux second intervenant. Test : fusionneur avec un seul tour.
2. **Parole sans tour** (silence au début, bruit, segment hors de tout tour) : le segment prend le tour le plus proche à moins de 1,5 s, sinon l'intervenant précédent, jamais `null` au milieu d'une réunion. Test : fusionneur, segment hors tour.
3. **Service de diarisation absent ou en panne** alors que `diarized_json` est demandé : réponse 4xx/5xx explicite en français côté WorkStudio (« les intervenants ne sont pas disponibles »), la transcription simple reste possible. Test : cas d'usage, erreur du diariseur ; bloc : repli sur le texte sans intervenants.
4. **Texte de synthèse vide, trop long ou avec balisage Markdown** (réponses de l'Assistant) : `/audio/speech` refuse > 4 096 caractères ; « Lire à voix haute » retire le Markdown et découpe en phrases. Test : `speechText()`.
5. **Micro refusé ou enregistrement vide** (dictée) : message en français, le texte déjà tapé n'est jamais perdu. Test : hook de dictée.
6. **Lexique trop long** : tronqué à 224 jetons de Whisper côté API ? non — côté WorkStudio, 100 termes / 800 caractères au plus. Test : `buildTranscriptionPrompt`.
7. **Enregistrement de plus d'une heure** avec intervenants : refus clair (limite mesurée, §ledger), pas de coupure silencieuse en tranches aux étiquettes incohérentes. Test : `transcribeMeeting`.

---

## Tâche 0 : Brique de diarisation, licences et mesure (fait avant ce plan)

**Fichiers :** `scripts/verification/k12_reunion_script.py`, `k12_reunion.py`, `k12_der.py` (fabrication de la réunion de test et mesure du DER).

- [x] Fabriquer la réunion de test de 10 min 06 s à 3 voix Piper (siwis, gilles, upmc), 89 répliques, référence exacte (`.nexora-work/k12/`).
- [x] Mesurer sherpa-onnx (segmentation pyannote 3.0 + empreintes) sur CPU : modèle d'empreinte × seuil de regroupement ; consigner le tableau dans le ledger (tâche 14).
- [x] Vérifier les licences : sherpa-onnx Apache-2.0 ; segmentation pyannote 3.0 MIT (CNRS, redistribuée par k2-fsa avec son fichier MIT) ; ERes2Net EN VoxCeleb Apache-2.0 (ModelScope) ; WeSpeaker/titanet-large CC-BY-4.0 ; titanet-small : licence non vérifiable ⇒ écarté.

## Tâche 1 : Nexora API — synthèse vocale `POST /v1/audio/speech`

**Fichiers :**
- Modifier : `services/nexora-api/api/domain/router/entities.py` (`RouterType.TEXT_TO_SPEECH = "text-to-speech"`), `api/domain/provider/entities.py` (`ProviderEndpoint.AUDIO_SPEECH = "/audio/speech"`, types compatibles openai/vllm, `ProviderResponse.audio: bytes | None`), `api/domain/audio/entities.py` (`CreateAudioSpeechForm`, `AudioSpeechResponseFormat`), `api/infrastructure/http/_httpproviderresponse.py` et `_httpproviderclient.py` (octets bruts), `api/infrastructure/http/_httpprovideradapterbuilder.py`, `api/infrastructure/fastapi/routes.py` (`EndpointRoute.AUDIO_SPEECH`), `schemas/usage.py` (`EndpointUsage.AUDIO_SPEECH`), `api/dependencies.py`, `endpoints/audio.py`, `use_cases/audio/__init__.py`.
- Créer : `api/infrastructure/http/adapters/audio/_audiospeechadapter.py` (+ `openai/`, `vllm/`), `api/use_cases/audio/_createaudiospeechusecase.py`, `api/infrastructure/fastapi/schemas/audio.py` (corps `CreateAudioSpeechBody`), migration Alembic `2026_10_25_…_add_text_to_speech_router_type.py`.
- Tests : `api/tests/unit/domain/audio/test_audioentities.py`, `unit/infrastructure/http/adapters/test_audiospeechadapter.py`, `unit/use_case/audio/test_createaudiospeechusecase.py`, `integration/endpoints/test_audiospeech.py`, `ForwardScenario` dans `integration/postgres/test_autocommitsession.py`.

**Interfaces :**
- Produit : `CreateAudioSpeechForm(ForwardablePayload)` : `model: str`, `input: str` (1 à 4 096 caractères), `voice: str = "default"`, `response_format: AudioSpeechResponseFormat = MP3` (`mp3|wav|flac|pcm`), `speed: float = 1.0` (0,25 à 4). `CreateAudioSpeechUseCase.execute(CreateAudioSpeechCommand) -> CreateAudioSpeechUseCaseSuccess(audio: bytes, media_type: str, headers) | ProviderRequestForwardingUseCaseError`. `get_prompts() -> [input]` (le jeton compte l'entrée ; aucun jeton de sortie).
- Consomme : `ProviderRequestForwardingUseCase` (hooks `_build_success`).

- [ ] Écrire les tests rouges : entité (`input` vide refusé, > 4 096 refusé, format inconnu refusé) ; adaptateur (`to_http_request` : URL `/v1/audio/speech`, corps JSON `{model: <nom du fournisseur>, input, voice, response_format, speed}` ; `to_provider_response` : octets conservés, type média lu de l'en-tête) ; cas d'usage (succès WAV, mauvais type de routeur ⇒ `RouterHasWrongTypeError`, fournisseur indisponible ⇒ erreur propagée) ; endpoint (200 `audio/wav`, 404 modèle inconnu, 403 modèle d'un autre type, 401 sans clé).
- [ ] Vérifier qu'ils échouent : `.nexora-work/napi-venv/bin/pytest services/nexora-api/api/tests/unit -k "speech" -q`.
- [ ] Implémenter, dans cet ordre : énumérations et formulaire, octets bruts dans le client HTTP (`HttpProviderResponse.content: bytes | None`, `.media_type`), adaptateurs openai/vllm, cas d'usage (`_build_success` renvoie les octets, `get_completions()` ⇒ `[]` pour l'audio), route et schéma, fabrique d'injection (session sans transaction), migration `ALTER TYPE routertype ADD VALUE IF NOT EXISTS 'TEXT_TO_SPEECH'`.
- [ ] Faire passer : pytest unitaire + `ruff check` et `ruff format --check` sur les fichiers touchés.
- [ ] Intégration sur un Postgres/Redis jetables (conteneurs `k12-pg`, `k12-redis`) : migrations rejouées de bout en bout (montée et descente), tests d'intégration `audiospeech` et `autocommitsession`.
- [ ] Commit : `feat(k12): synthèse vocale /v1/audio/speech dans Nexora API`.

## Tâche 2 : Nexora API — `diarized_json` (segments, mots, intervenants)

**Fichiers :**
- Créer : `api/domain/audio/_audiodiarizer.py` (port), `api/domain/audio/diarization.py` (fusionneur pur), `api/infrastructure/http/_httpaudiodiarizer.py`.
- Modifier : `domain/audio/entities.py` (`AudioTranscriptions.segments`, `CreateAudioTranscriptionsForm.num_speakers`), `domain/audio/errors.py` (`AudioDiarizationUnavailableError`), `infrastructure/http/adapters/audio/_audiotranscriptionsadapter.py` (`diarized_json` ⇒ `verbose_json` + `timestamp_granularities[]=word`), `infrastructure/configuration.py` (`audio_diarization_url`, `audio_diarization_timeout`), `use_cases/audio/_createaudiotranscriptionsusecase.py` (surcharge de `_send_request`), `dependencies.py`, `endpoints/audio.py`, `schemas/audio.py` (champ `num_speakers`).
- Tests : `unit/domain/audio/test_diarization.py`, `unit/use_case/audio/test_createaudiotranscriptionsusecase.py` (étendu), `unit/infrastructure/http/adapters/test_audiotranscriptionsadapter.py` (étendu), `integration/http/test_httpaudiodiarizer.py` (`respx`), `integration/endpoints/test_audiotranscriptions.py` (étendu).

**Interfaces :**
- Produit : `SpeakerTurn(start: float, end: float, speaker: int)` ; `AudioDiarizer.diarize(file, num_speakers: int | None) -> list[SpeakerTurn] | AudioDiarizationUnavailableError` ; `assign_speakers(words: list[TimedWord], turns: list[SpeakerTurn]) -> list[Segment]` (un segment par suite de mots du même intervenant, étiquettes `speaker_1…speaker_N` dans l'ordre d'apparition, `Segment.id` consécutifs, texte recollé).
- Contrat de l'API : `response_format=diarized_json` ⇒ `{id, model, text, segments: [{id, type, text, start, end, speaker}], usage}` ; sans service de diarisation configuré ⇒ 501 `Les intervenants ne sont pas disponibles sur cette instance` ; `num_speakers` (extension Nexora, 1 à 20) fixe le nombre d'intervenants.

- [ ] Tests rouges du fusionneur : trois tours/neuf mots ⇒ trois segments dans l'ordre ; deux mots consécutifs du même intervenant ⇒ un segment ; **un seul tour** ⇒ « speaker_1 » partout ; mot hors de tout tour ⇒ tour le plus proche à ≤ 1,5 s, sinon intervenant précédent ; intervenants renumérotés par ordre d'apparition (le tour d'étiquette 2 qui parle en premier devient `speaker_1`) ; aucun mot ⇒ liste vide ; ponctuation collée au mot précédent.
- [ ] Tests rouges du cas d'usage : `diarized_json` sans diariseur ⇒ `AudioDiarizationUnavailableError` **avant** tout appel au fournisseur Whisper ; diariseur en erreur ⇒ idem ; succès ⇒ segments avec intervenants ; `json`/`text` inchangés (le diariseur n'est pas appelé).
- [ ] Implémenter le fusionneur, le port, l'adaptateur HTTP (multipart `file`, `num_speakers`, délai réglable, défaut 900 s), la surcharge de `_send_request` (diariser d'abord, puis transmettre, puis fusionner ; le fichier est relu depuis le début entre les deux), l'adaptateur de transcription (mots), la configuration, l'endpoint (501 en français).
- [ ] Vérifier : pytest unitaire + intégration ciblée, `ruff`.
- [ ] Commit : `feat(k12): diarisation et horodatage par segment dans /v1/audio/transcriptions`.

## Tâche 3 : Service `nexora-diarize`

**Fichiers :** créer `services/nexora-diarize/{Dockerfile,pyproject.toml,README.md,nexora_diarize/{__init__.py,app.py,pipeline.py,audio.py},tests/{test_pipeline.py,test_app.py}}`, `THIRD_PARTY_NOTICES.md` (sherpa-onnx, pyannote segmentation 3.0, ERes2Net, Piper `siwis`), `scripts/check-licenses.sh` si la liste des composants y est tenue.

**Interfaces :** `POST /diarize` (multipart : `file`, `num_speakers` facultatif) ⇒ `{"duration": s, "speakers": n, "turns": [{"start","end","speaker"}]}` ; `GET /health` ; `diarize_samples(samples: np.ndarray, num_speakers: int | None) -> list[Turn]`. Décodage de tout format par PyAV (wav, mp3, m4a, ogg, webm/opus) en 16 kHz mono ; refus au-delà de 3 h ; seuil de regroupement 0,8 réglé par la mesure (tâche 0), `NEXORA_DIARIZE_THRESHOLD` pour l'ajuster.

- [ ] Tests rouges : pipeline (silence ⇒ aucun tour ; deux voix synthétiques ⇒ 2 intervenants ; `num_speakers=1` ⇒ un seul ; tours triés, sans chevauchement du même intervenant) ; application (fichier non audio ⇒ 422 ; absence de `file` ⇒ 422 ; `/health` 200 une fois les modèles chargés).
- [ ] Implémenter ; Dockerfile : `python:3.12-slim`, utilisateur non-root, modèles téléchargés **au build** (somme SHA-256 vérifiée) dans `/models`, `OMP_NUM_THREADS` ← `NEXORA_DIARIZE_THREADS`.
- [ ] `docker build` de `nexora/diarize:k12` (image jetable, jamais le tag de la pile) ; lancer `k12-diarize` sur un port libre ; `curl` de la réunion de test ⇒ tours cohérents.
- [ ] Commit : `feat(k12): service de diarisation sherpa-onnx (CPU)`.

## Tâche 4 : Déploiement — compose, amorçage, installateur

**Fichiers :** `deploy/compose.yml` (service `diarize` du profil `voice`, `NEXORA_DIARIZE_URL`, `NEXORA_TTS_MODEL`), `deploy/nexora-api/config.yml` (`audio_diarization_url`), `deploy/whisper/fetch-whisper-model.py` (plusieurs modèles : `NEXORA_WHISPER_MODEL` et `NEXORA_TTS_MODEL`), `deploy/bootstrap/bootstrap.py` + `test_bootstrap.py` (enregistrement du modèle de synthèse), `install.sh` (texte de la question, « voix locale »), `scripts/tests/test-compose-env.sh`, `scripts/tests/test-install.sh`.

- [ ] Tests rouges : `test-compose-env.sh` (service `diarize` : image épinglée par construction locale, aucun port publié, fils bornés, hors profil par défaut, dépendance de `nexora-api` à `NEXORA_DIARIZE_URL` ; téléchargement des deux modèles avant le serveur hors ligne) ; `test_bootstrap.py` (le routeur `text-to-speech` est créé une fois, son fournisseur `openai` pointe vers speaches avec le modèle `speaches-ai/piper-fr_FR-siwis-medium`, un routeur existant est laissé tel quel, un téléchargement refusé échoue clairement).
- [ ] Implémenter ; `bash scripts/tests/test-*.sh` et `python3 -m pytest deploy/bootstrap` verts.
- [ ] Commit : `feat(k12): service diarize, modèle de voix et amorçage dans le déploiement`.

## Tâche 5 : WorkStudio — usage « Synthèse vocale », client, lexique

**Fichiers :** `lib/nexora/model-ids.ts` (`speech` ⇒ `text-to-speech`), `lib/nexora/document-ai/client.ts` (`nexoraSpeak`, `nexoraTranscribeDiarized`), nouveau `lib/nexora/voice/{lexicon.ts,speech-text.ts,meeting.ts}`, les `Record<NexoraModelUsage, …>` que le compilateur signale (`model-admin.ts`, `model-cards.ts`, `models.ts`, `capture-templates.ts`, `hooks/queries/nexora-home.ts`, `add-model-modal.tsx`, `nexora-usage-notice.tsx`), messages `fr`/`en`.

**Interfaces :**
- `nexoraSpeak({text, model, voice?, format?}, options): Promise<{audio: Buffer; mimeType: string}>`.
- `buildTranscriptionPrompt(lexicon: string[], userPrompt?: string): string | undefined` (« Vocabulaire : a, b, c. » + consigne ; 100 termes et 800 caractères au plus).
- `speechText(markdown: string): string` (retire titres, gras, listes, liens, tableaux ; 4 000 caractères au plus, coupe à une phrase).
- `formatSpeakerTranscript(segments): string` (« Intervenant 1 : … » une ligne par prise de parole ; `speaker_n` ⇒ « Intervenant n »).
- `transcribeMeeting(input, steps): Promise<{transcript; segments; speakers; duration}>` : un seul envoi pour une durée ≤ 60 min, au-delà `NexoraDocumentAiError('too-long')`.

- [ ] Tests rouges (`lexicon`, `speech-text`, `meeting`, `client`) avec les cas du Review Focus 4, 6, 7.
- [ ] Ajouter l'usage `speech` partout où le typage l'exige ; l'ajout d'un modèle de synthèse se fait par « compatible OpenAI » (Ollama ne synthétise pas).
- [ ] Vérifier : vitest ciblé, `bun run type-check`. Commit : `feat(k12): usage Synthèse vocale, client Nexora API voix et lexique`.

## Tâche 6 : Lexique de l'entreprise réglable

**Fichiers :** `lib/nexora/voice/lexicon-store.ts` (lecture/écriture dans les métadonnées de l'organisation d'instance, clé `nexoraVoice`, cache LRU 30 s), contrat `lib/api/contracts/nexora-voice.ts`, cas d'usage `lib/nexora/voice/application/`, route `app/api/nexora/voice/lexicon/route.ts`, carte « Lexique de l'entreprise » dans Réglages › Modèles, hook React Query, messages.

- [ ] Tests rouges : la lecture rend `[]` par défaut ; l'écriture refuse un non-administrateur d'instance (403) ; normalise (espaces, doublons, 100 termes) ; invalide le cache.
- [ ] Implémenter en suivant `budgets` (même garde `requireInstanceAdmin`) ; brancher le lexique dans `transcribeWithNexora` (prompt initial de Whisper, sans écraser le prompt du bloc).
- [ ] Commit : `feat(k12): lexique de l'entreprise (prompt initial de Whisper)`.

## Tâche 7 : Bloc Synthèse vocale et bloc de transcription

**Fichiers :** `tools/tts/nexora.ts` (`tts_nexora`), `tools/tts/index.ts`, `tools/registry.ts`, `tools/generated/*` (régénérés par le script du dépôt), `blocks/blocks/tts.ts` (fournisseur « Nexora », modèle, voix, vitesse), `lib/internal/tts/execute-tool.ts` + `operations.ts` (`executeNexoraTts`), `lib/internal/tool-operations/registry.server.ts`, `tools/stt/nexora.ts` + `blocks/blocks/stt.ts` (case « Distinguer les intervenants », nombre d'intervenants ; sorties `segments`, `speakers`, `transcriptBySpeaker`), `lib/internal/nexora-document-ai/{schema.ts,execute-tool.ts}`.

- [ ] Tests rouges : exécuteur TTS (texte vide refusé, aucun modèle ⇒ message « Aucun modèle de synthèse vocale », succès ⇒ fichier stocké WAV/MP3 dans l'exécution) ; exécuteur STT (intervenants ⇒ `transcriptBySpeaker` en lignes « Intervenant n : » ; repli sur le texte si le service est absent, avec avertissement dans `warnings`).
- [ ] Implémenter ; régénérer les artefacts d'outils ; `check:audits` ciblés (`tool-registry-boundary`, `block-registry`).
- [ ] Commit : `feat(k12): fournisseur Nexora du bloc Synthèse vocale et intervenants dans la transcription`.

## Tâche 8 : Passerelle développeur K3 — `/v1/audio/speech`

**Fichiers :** `app/api/nexora/v1/audio/speech/route.ts`, `lib/api/contracts/nexora-openai.ts` (`nexoraSpeechContract`), `lib/nexora/developer-api/models.ts` (`relaySpeech`), `openapi.ts`, `errors.ts` (liste des points d'accès), `proxy.ts`/`proxy.test.ts` (`/v1/audio/speech` non tamponné), tests des routes.

- [ ] Tests rouges : relais (modèle inconnu 404, modèle d'un autre type refusé, octets relayés avec le bon `Content-Type`, jetons comptés au nom du routeur, texte > 4 096 ⇒ 400 en français) ; description OpenAPI ; point d'accès inconnu liste `/v1/audio/speech`.
- [ ] Implémenter sur le modèle de `relayTranscription` ; Commit : `feat(k12): relais /v1/audio/speech dans la passerelle développeur`.

## Tâche 9 : Assistant — « Lire à voix haute » et dictée

**Fichiers :** routes `app/api/nexora/assistant/voice/speak/route.ts` et `…/voice/transcribe/route.ts`, contrats (`nexora-voice.ts`), `assistant/hooks/use-read-aloud.ts`, `assistant/hooks/use-dictation.ts`, `assistant/components/{composer.tsx,message-item.tsx}`, état de disponibilité (modèles de synthèse/transcription via `/api/nexora/home` `modelUsages`), messages `assistant.json` fr/en.

- [ ] Tests rouges : routes (401 sans session, 403 hors espace, 400 texte vide/enregistrement vide, 413 enregistrement > 25 Mo, 503 « aucun modèle » en français, succès) ; `use-dictation` (micro refusé ⇒ message, enregistrement vide ⇒ message, succès ⇒ texte inséré à la position du curseur sans effacer le brouillon) ; `use-read-aloud` (un seul son à la fois, arrêt au démontage, Markdown retiré).
- [ ] Implémenter ; boutons masqués quand le navigateur n'a pas de micro ou que l'usage n'a pas de modèle ; accessibilité (`aria-pressed`, étiquettes).
- [ ] Commit : `feat(k12): Assistant — lecture à voix haute et dictée au micro`.

## Tâche 10 : Modèle PME « Compte rendu de réunion » et fumée

**Fichiers :** `lib/nexora/templates.ts` (constructeur étendu : blocs `stt`, `agent`, `human_in_the_loop_v2`, `smtp` ; champ de départ de type fichier), `templates.test.ts`, `seed-templates.test.ts`, `scripts/smoke.py` (contrôles « Synthèse vocale » et « Réunion », entrée du modèle mise à jour), `docs/verification/k12-reunion/reunion-courte.mp3` (extrait de 45 s, 3 voix), `scripts/verification/fumee-pc6.sh`.

- [ ] Tests rouges : le modèle produit Start(fichier `enregistrement`, texte `participants`, `destinataire`) → Transcription (Nexora, intervenants) → Agent (résumé : décisions, actions) → Validation humaine → E-mail ; les liens `<transcription.transcriptBySpeaker>` et `<résumé.content>` existent ; les autres modèles sont inchangés.
- [ ] Implémenter ; `check:test-types`.
- [ ] Fumée « Synthèse vocale » : voix ⇒ WAV audible (durée > 1 s, transcrit en retour par Whisper), via l'API de l'Assistant **et** l'API développeur avec une clé ; fumée « Réunion » : l'extrait de 3 voix ⇒ au moins 2 intervenants, résumé non vide, pause de validation reprise par l'API, e-mail reçu dans Mailpit.
- [ ] Commit : `feat(k12): modèle « Compte rendu de réunion » avec intervenants et fumée`.

## Tâche 11 : Vérification réelle sur pc6 (conteneurs jetables, aucun appel externe)

- [ ] Image `nexora/api:k12` construite depuis le worktree, lancée avec Postgres/Redis jetables (`k12-*`) et speaches `k12-speaches` (déjà lancé) + `k12-diarize` ; amorçage du modèle de voix et de Whisper (avec le script `bootstrap.py` de ce worktree).
- [ ] Réunion de 10 min 3 voix : transcription diarisée par Nexora API ; **DER mesuré et consigné** (`k12_der.py`), temps de traitement, intervenants cohérents ; puis par le modèle PME dans `next dev` (127.0.0.1:3218) avec GLM 5.3 et avec `qwen2.5:7b`.
- [ ] Assistant au navigateur : « Lire à voix haute » (octets WAV valides, durée > 1 s, lecture démarrée) ; dictée avec un vrai `MediaRecorder` alimenté par un fichier audio ; capture d'écran dans `docs/verification/k12-voix/`.
- [ ] Mesurer la mémoire et le temps de la diarisation sous charge (8 cœurs visés : `docker update --cpus 8`).

## Tâche 12 : Documentation, ledger, licences

- [ ] `docs/guide/documents-et-voix.md` : synthèse vocale, intervenants, lexique, dictée, modèle de réunion, limites et durées mesurées ; `THIRD_PARTY_NOTICES.md` ; section **K12** à la fin du ledger (décisions « Ruling : … — pourquoi — coût si faux », preuves, tableau du balayage, DER).
- [ ] Commit : `docs(k12): guide voix, licences et ledger`.

## Tâche 13 : Fin

- [ ] `git merge main`, résoudre les conflits.
- [ ] biome sur mes fichiers ; `bun run type-check` ; `check:audits`, `check:test-types`, `check:api-validation:strict` ; pytest + ruff de Nexora API et de `nexora-diarize` ; `bash scripts/tests/test-*.sh` ; `LANG=en_US.UTF-8 bun run --cwd workstudio/apps/sim test` ; `check-i18n/brand/no-ee/licenses`.
- [ ] Arrêter `next dev` et supprimer `.next/dev` ; supprimer les conteneurs `k12-*` ; commit final.
