# 18 — Audio (1/2) : vue d'ensemble, concepts et transcription

> **Périmètre** : hub Audio de Mistral AI Studio (gamme Voxtral 3), audio dans les chat completions, les six pages « Concepts » (vocabulaire personnalisé, latence, offline/temps réel, locuteurs et diarisation, tours de parole, voix), les trois pages « Specs and limits » (formats, langues, limites), la migration depuis Voxtral 2, et toute la section Speech to Text (vue d'ensemble, deux quickstarts, transcription de fichiers, temps réel, biais de contexte, diarisation, détection de tours, dépannage). Le TTS et les agents vocaux ne sont couverts ici que dans la mesure où les pages assignées en parlent (inférence : la partie 2/2 les détaille). · **Sources** : 21 pages de docs.mistral.ai (copie du 21/10/2026) + vérifications ciblées dans la spec OpenAPI locale · **Rédaction** : agent de recherche pour Nexora Studio

> **Avertissement de lecture** : la copie locale contient de nombreux commentaires éditoriaux MDX (`{/* ... */}`) laissés par l'équipe de documentation (projet interne « DOC-610 », RFC-555, RFC-618, tests datés des 7 et 9 octobre 2026). Ils ne s'affichent pas sur le site mais révèlent l'état réel de l'API (IDs non encore renommés, fonctionnalités refusées en test, valeurs non confirmées). Ils sont signalés ci-dessous par **[commentaire interne]**. Plusieurs cellules de tableaux et paragraphes de la doc publiée sont **vides** (placeholders « Draft » retirés) : c'est signalé par **[vide dans la doc]**.

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 La gamme Voxtral 3 (modèles, IDs, alias, rôles)
   - 3.2 Choisir un mode : offline, temps réel, agents vocaux
   - 3.3 Transcription de fichiers (offline)
   - 3.4 Transcription temps réel (protocole WebSocket)
   - 3.5 Biais de contexte et vocabulaire personnalisé
   - 3.6 Diarisation et références de locuteurs
   - 3.7 Détection de tours de parole
   - 3.8 Audio dans les chat completions
   - 3.9 Latence (concept et méthode de mesure)
   - 3.10 Voix et synthèse vocale (ce qu'en disent les pages assignées)
   - 3.11 Agents vocaux (ce qu'en disent les pages assignées)
   - 3.12 Dépannage Speech to Text
   - 3.13 Migration depuis Voxtral 2
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
- Annexe — Couverture

---

## 1. En bref

- **Trois métiers audio** : (1) parole → texte (transcription de fichiers et de flux live), (2) texte → parole (voix prédéfinies ou clonées, dirigées par des balises d'émotion et de rythme), (3) les deux à la fois dans des conversations live (**agents vocaux** qui répondent en temps réel). En plus : envoyer de l'audio à un **modèle de chat** pour résumer, interroger, traduire ou extraire des données structurées d'un enregistrement.
- **Gamme Voxtral 3 = 5 modèles** : 3 de transcription (Mini Transcribe 3, Mini Transcribe Realtime 3, Small Transcribe 3) et 2 de synthèse (TTS 3, TTS Realtime 3). La doc « audio » ne couvre que Voxtral 3 ; Voxtral 2 est déprécié et dispose d'une page de migration.
- **Deux modes transverses** : *offline* (l'entrée existe entièrement avant l'appel ; une requête HTTP, réponse complète ou streamée en SSE) et *realtime* (l'entrée est en cours de production ; une session WebSocket, résultats incrémentaux et événements). Le choix du mode précède le choix du modèle.
- **Fonctionnalités STT** : étiquettes de locuteurs (diarisation) offline et temps réel, références de locuteurs (clips nommés), horodatage **par segment uniquement** (plus de timestamps par mot en V3), biais de contexte (mots-clés multi-mots ou description libre), langue fixée ou auto-détectée, détection de fin de tour (temps réel seulement), délai de streaming réglable de 80 à 1 200 ms ou 2 400 ms.
- **Contraintes structurantes** : en temps réel, la configuration est **verrouillée dès le premier chunk audio** ; diarisation et détection de tours sont **mutuellement exclusives** dans une même session ; le biais de contexte partage la fenêtre de contexte (65 536 tokens) avec l'audio, sans troncature (erreur 400).
- **Audio dans le chat** : partie de message `input_audio` (base64) dans `POST /v1/chat/completions` ; au lancement il faut utiliser `voxtral-small-latest` (un modèle **Voxtral 2**), Small Transcribe 3 étant « transcription seulement » au lancement.
- **Public visé** : développeurs intégrant l'audio via API et SDK, et équipes produit évaluant Voxtral. Les non-développeurs sont renvoyés vers le « Voice mode » de Vibe Work ou l'upload d'un enregistrement dans un chat.
- **Statut** : Voxtral 3 est présenté comme la version courante (GA ou imminente : « within a month of GA » pour un alias). Plusieurs éléments sont explicitement **non disponibles au lancement** (style instructions TTS) ou **non supportés dans cette version** (parole superposée). D'après les commentaires internes, au 9 octobre les IDs finaux `-3-0` des modèles Mini renvoyaient encore 400/403 (renommage en attente) et les exemples tournaient sur des alias intérimaires.
- **SDK** : Python `mistralai` (extra `realtime` pour le WebSocket), TypeScript `@mistralai/mistralai` (client temps réel séparé `RealtimeTranscription`), plus des SDK dédiés aux agents vocaux (`mistralai-voice-agents`, `@mistralai/voice-agents`). Plusieurs options temps réel (diarisation, références, détection de tours, biais) **ne passent pas par les SDK** et exigent un client WebSocket brut.

---

## 2. Concepts et vocabulaire

| Terme original | Définition (FR) |
| --- | --- |
| Voxtral 3 / Voxtral 2 | Génération courante / précédente (dépréciée) des modèles audio Mistral. |
| Speech to text (STT) | Transcription : audio → texte. |
| Text to speech (TTS) | Synthèse vocale : texte → audio. |
| Offline (mode) | L'entrée complète existe avant l'appel (enregistrement, script). Une requête, un résultat complet (éventuellement streamé). |
| Realtime (mode) | L'entrée est produite en direct (micro, ligne téléphonique, texte généré par un LLM). Session WebSocket ouverte, envoi par petits morceaux (ex. 100 ms d'audio), résultats incrémentaux. |
| Streaming response (offline) | Option `stream` d'une requête offline : l'entrée est complète, seul le *résultat* arrive par morceaux (SSE). **Ce n'est pas le mode realtime.** |
| Session | Une connexion WebSocket de transcription temps réel, avec 4 étapes : Open, Configure, Stream, Finish. |
| Chunk | Morceau d'audio PCM encodé en base64 envoyé via `input_audio.append`. |
| Delta (`transcription.text.delta`) | Fragment de texte nouvellement transcrit ; append-only, jamais corrigé, final dès réception. |
| Transcript of record | Le texte de `transcription.done`, à conserver comme transcription de référence. |
| Streaming delay (`target_streaming_delay_ms`) | Temps que le modèle temps réel attend pour « entendre la suite » avant d'écrire un mot ; plus court = plus rapide mais moins précis. |
| Model latency | Temps passé par le modèle côté serveur, hors réseau et application. |
| End-to-end latency | Du geste de l'application jusqu'à ce que l'utilisateur voie/entende le résultat ; toujours plus long que la latence modèle. |
| Time to the complete result | Métrique offline : de l'envoi à la réception du résultat complet. |
| Time to first transcript | Métrique STT temps réel : du mot prononcé à son texte reçu. |
| Time to first audio | Métrique TTS : de l'envoi du texte au premier son entendu. |
| Per-turn latency | Métrique agent vocal : de la fin de parole de l'utilisateur au début de la réponse de l'agent. |
| Custom vocabulary | Page-concept regroupant les deux « indices » pour mots rares : biais de contexte (STT) et prononciation personnalisée (TTS). |
| Context biasing (`context_bias`) | Liste d'entrées (mots-clés ou description libre) qui oriente l'orthographe des termes attendus en transcription. Favorise, ne force pas. |
| Keyphrase | Entrée de `context_bias` = un terme devant être bien orthographié ; peut contenir plusieurs mots (« Alder Creek Design »). |
| Free-form context | Entrée de `context_bias` = phrase/paragraphe décrivant l'enregistrement (sujet, personnes, noms, outils). |
| Custom pronunciation (`phoneme_hints`) | TTS : prononciation d'un mot donnée en phonèmes (liste fermée de 50 phonèmes). |
| Diarization (`diarize`) | Regroupement des passages d'une même voix sous une étiquette (`speaker_1`, `speaker_2`…). Dit « qui a parlé quand », pas « qui est-ce ». |
| Speaker label / `speaker_id` | Étiquette de locuteur ; cohérente dans une transcription/session seulement. |
| Speaker references (`speaker_references`) | Clips de référence nommés (3–15 s, ≤ 8) ; le nom devient le `speaker_id`. Nécessite `diarize`. |
| Overlapping speech | Parole superposée (deux locuteurs simultanés) — « non supportée dans cette version ». |
| Turn | Tour de parole ; se termine quand le locuteur « passe la main ». |
| End-of-turn detection / Turn detection (`turn_detection`) | Détection, intégrée au modèle temps réel, du début et de la fin des tours. |
| Eager end (`turn.eager_end`) | Signal précoce « le tour est probablement fini » ; annulable par `turn.resume`. |
| Resume (`turn.resume`) | Le locuteur reprend après un eager end ; annule celui-ci. |
| `end_reason` | Cause de `turn.end` : `threshold` (score) ou `timeout` (délai max). |
| Preset / configuration (Default, Aggressive) | Jeux de valeurs de seuils documentés ; **pas** un champ de l'API (on recopie les valeurs). |
| Interruptions / barge-in (`turn.allow_interruptions`) | Agents vocaux : l'utilisateur peut couper la parole à l'agent (activé par défaut). |
| Filler | Agents vocaux : court clip joué pendant un appel d'outil pour masquer l'attente (n'en raccourcit pas la durée). |
| Voice (preset / cloned / saved) | Identité de locuteur référencée par ID. Preset = fournie par Mistral ; cloned = clip envoyé avec la requête (une seule requête) ; saved = clone stocké dans le workspace. |
| Zero-shot cloning | Clonage à partir d'un court enregistrement, sans entraînement. |
| Professional voice cloning (PVC) | Voix construite à partir d'une collection d'enregistrements (30 min à 3 h recommandées), référencée par `voice_id` ; « workflow recommandé pour les voix personnalisées ». |
| Emotion tags / pace tags | Balises en ligne dans `input` TTS : `[emotion=...]` (34 valeurs), rythme `slow` / `fast`. |
| Expressiveness (`expressiveness`) | Nombre ≥ 1.0 réglant l'expressivité ; plus haut = moins de similarité/stabilité de voix, diction plus marquée ; défaut fixé par le service. |
| Style instructions | Instructions de style TTS sur tout l'input — **non disponibles au lancement**. |
| Segment (`transcription_segment`) | Unité de la transcription horodatée offline : `text`, `start`, `end`, `speaker_id`. |
| SSE | Server-sent events : format du streaming offline (`event:` + `data:`). |
| `rt_*` token / client session | Jeton éphémère pour navigateur (documenté seulement dans une page Voxtral 2 dépréciée et dans l'OpenAPI ; voir 3.4.3). |

---

## 3. Fonctionnalités en détail

### 3.1 La gamme Voxtral 3 (modèles, IDs, alias, rôles)

| Modèle | ID (« Model ID ») | Alias | Remplace (Voxtral 2) | Usage | Chiffres clés (hub) |
| --- | --- | --- | --- | --- | --- |
| Voxtral Mini Transcribe 3 | `voxtral-mini-transcribe-3-0` | `voxtral-mini-transcribe-3`, `voxtral-mini-transcribe-latest` | `voxtral-mini-2602` | Transcrire des fichiers, avec étiquettes de locuteurs, timestamps de segment, vocabulaire personnalisé. « Supporte toutes les fonctionnalités offline. Commencez par lui. » | Contexte de 65 536 tokens partagé par l'audio et la liste de vocabulaire |
| Voxtral Mini Transcribe Realtime 3 | `voxtral-mini-transcribe-realtime-3-0` | `voxtral-mini-transcribe-realtime-3` (2ᵉ alias **[vide dans la doc]**) | `voxtral-mini-transcribe-realtime-2602` | Transcrire de l'audio live (sous-titres, agents vocaux), avec détection de tours | Délai de streaming de 80 à 1 200 ms, ou 2 400 ms, fixé par session |
| Voxtral Small Transcribe 3 | `voxtral-small-transcribe-3-0` (hub, page STT) ; la table de migration indique `voxtral-small-transcribe-latest` comme « Model ID » | `voxtral-small-transcribe-3`, `voxtral-small-transcribe-latest` | `voxtral-small-2507` | Transcrire des fichiers en meilleure qualité (modèle plus grand). À choisir quand le vocabulaire personnalisé ne corrige pas les erreurs restantes. | « Transcription only at launch » |
| Voxtral TTS 3 | `voxtral-mini-tts-3-0` | `voxtral-mini-tts-3` ; `voxtral-mini-tts-latest` « pointera vers Voxtral 3 dans le mois suivant la GA » | `voxtral-mini-tts-2603` | Générer de la parole, voix prédéfinies ou clonées | 5 formats de sortie, WAV à 24 kHz ; 34 balises d'émotion et 2 de rythme |
| Voxtral TTS Realtime 3 | `voxtral-mini-tts-realtime-3-0` | — | — | Streamer de la parole pour conversations live | **[vide dans la doc]** |

Modèle « audio in chat » au lancement : `voxtral-small-latest` (Voxtral 2), selon la page STT overview.

**Règle de choix (page STT overview)** : temps réel → un seul modèle (Mini Transcribe Realtime 3 : sessions, détection de tours, délai réglable) ; offline → deux modèles (Mini par défaut, Small pour plus de qualité) ; questions sur un enregistrement → audio dans le chat.

**[commentaire interne]** :
- Au 9/10, les IDs finaux Mini `voxtral-mini-transcribe-3-0` renvoyaient `400 "Invalid model"` et `voxtral-mini-transcribe-realtime-3-0` était refusé au handshake WebSocket (HTTP 403, corps vide) ; l'API servait les alias intérimaires `voxtral-transcribe-3`, `voxtral-transcribe-realtime-3` / `-3-0` (checkpoint servi : `voxtral-transcribe-realtime-3-0-1`), « à renommer avant le lancement ». Le champ `model` de la réponse renvoie l'ID demandé.
- Small Transcribe 3 : transcription seulement (400 sur le chat). `voxtral-mini-tts-latest` → encore 2603. TTS Realtime → 403 (non exposé).
- Les liens de fiches modèles `/models/voxtral-mini-transcribe-3-0`, etc. renvoient 404 tant que les fiches ne sont pas ajoutées au registre.
- Comptes de langues non stabilisés entre sources internes (voir §6 et §8). Aucun chiffre de latence publié : règle interne = tout chiffre doit être « scopé » (inférence modèle seule) et annoté.

### 3.2 Choisir un mode : offline, temps réel, agents vocaux

**Arbre de décision** (diagramme `audio_offline_or_realtime.svg`) : l'entrée est-elle complète avant l'envoi ? → *offline* (File transcription). Sinon, l'application répond-elle par la voix ? → *voice agents*. Sinon → *realtime* (Realtime transcription). Recommandation : commencer offline quand c'est possible (plus simple, le modèle entend tout avant de répondre).

**Différences entre modes**

| | Offline | Realtime |
| --- | --- | --- |
| Entrée | Complète, envoyée en une requête | Live, envoyée par morceaux pendant une session |
| Connexion | Une requête HTTP | Une session WebSocket qui reste ouverte |
| Résultat | Un résultat complet, ou le même résultat streamé par morceaux | Résultats incrémentaux et événements pendant la session |
| Vitesse à surveiller | Temps jusqu'au résultat complet (croît avec la longueur de l'entrée) | Délai entre l'entrée et son résultat (réglable) |
| Exclusif à ce mode | — | Détection de tours |
| Modèles | Un modèle par capacité | Un modèle temps réel dédié par capacité |

**Par capacité**

| Capacité | Offline | Realtime |
| --- | --- | --- |
| Speech to text | Transcrire un fichier (File transcription) | Transcrire du live, détection de fin de tour intégrée (Realtime transcription) |
| Text to speech | Générer la parole d'un texte complet, option de streaming de l'audio (Speech generation) | **[vide dans la doc]** + lien « Stream speech » |
| Voice agents | Non applicable | Toujours temps réel : la session enchaîne transcription temps réel, modèle et synthèse |

**Fonctionnalités STT par mode (page STT overview)**

| Fonctionnalité | Offline | Realtime |
| --- | --- | --- |
| Étiquettes de locuteurs (diarisation) | Oui, avec timestamps de segment | Oui |
| Références de locuteurs | **[vide dans la doc]** (voir §8) | Oui, avec diarisation |
| Biais de contexte | Oui | Oui |
| Langue | Fixée ou détectée | Fixée dans la configuration de session, ou détectée |
| Timestamps de segment | Oui, par segment ; pas de timestamps par mot | Non : les segments temps réel portent un locuteur mais pas de début/fin. On peut déduire la fin par l'alignement des trames (mot émis à 480 ms avec un délai de 240 ms → terminé à 240 ms) |
| Détection de tours | Non | Oui |
| Réponse streamée | Oui (le texte d'un fichier complet arrive par morceaux) | Non applicable (résultats toujours en événements) |

**[commentaire interne]** : les combinaisons diarize/turn_detection + context_bias + language n'ont pas été testées ensemble.

### 3.3 Transcription de fichiers (offline)

Endpoint : **`POST https://api.mistral.ai/v1/audio/transcriptions`** (multipart/form-data). Référence API : `/api/endpoint/audio/transcriptions#operation-audio_api_v1_transcriptions_post`.

#### 3.3.1 Trois façons d'envoyer l'audio (une seule par requête)

| Entrée | Champ | Quand |
| --- | --- | --- |
| Fichier audio | `file` (upload multipart, ex. `-F file=@obama.mp3`) | Enregistrement sur votre machine/serveur |
| URL audio | `file_url` (≤ 2 083 caractères, format URI) | Enregistrement déjà hébergé à une URL joignable |
| Fichier uploadé | `file_id` | Fichier uploadé via `POST /v1/files` avec `purpose=audio`, p. ex. pour le transcrire plusieurs fois |

Conseil : supprimer un fichier devenu inutile via `DELETE /v1/files/{file_id}`. Formats acceptés et taille max : renvoyés vers « Audio formats » et « Limits », où la cellule des formats et la taille max `file_id` sont **[vides dans la doc]** (un commentaire interne cite 512 Mo, limite générale de l'API Files dans l'OpenAPI).

#### 3.3.2 Champs de requête utiles

| Champ | Type | Défaut | Valeurs | Effet |
| --- | --- | --- | --- | --- |
| `model` | string | requis | `voxtral-mini-transcribe-3` ou `voxtral-small-transcribe-3` (alias utilisés dans tous les exemples) | Modèle |
| `file` / `file_url` / `file_id` | binaire / URI / string | — | exactement un | Audio à transcrire |
| `language` | string, 2 lettres ISO 639-1 (`^\w{2}$` dans l'OpenAPI) | absent → auto-détection | `fr`, `en`… | Fixe la langue ; « peut améliorer la précision ». Autre valeur → `422 Invalid language alpha2 code` |
| `timestamp_granularities` | array | absent → texte seul | `segment` uniquement (`word` → 400) | Remplit `segments` avec début/fin |
| `diarize` | booléen | `false` | `true` | Étiquette chaque segment ; **exige** `timestamp_granularities=segment` (sinon 422) |
| `context_bias` | array de strings | aucun contexte | une entrée par champ multipart répété (`-F context_bias=...` ; `context_bias[]` fonctionne aussi selon un commentaire) ; en Python, une liste | Biais de vocabulaire (§3.5) |
| `stream` | booléen | `false` | `true` | Réponse en SSE |
| `return_language` | booléen | — | `true` | Renvoie la langue détectée dans la réponse quand elle n'est pas fixée (mentionné dans le texte ; absent de l'OpenAPI) |

Non documentés en page mais présents dans l'OpenAPI : `temperature` (number|null, défaut null). **[commentaire interne]** : `temperature` et `verbatim` « laissés de côté (Draft) ». Le champ `turn_detection` est refusé offline (400, voir §3.7). Les références de locuteurs offline : voir §3.6.

#### 3.3.3 Réponse

Exemple (appel support de 34 s, modèle `voxtral-mini-transcribe-3`) :

```json
{ "model": "voxtral-mini-transcribe-3", "text": "Thanks for calling Northwind Support. ...",
  "language": null, "segments": [],
  "usage": { "prompt_audio_seconds": 34, "prompt_tokens": 3, "total_tokens": 879,
             "completion_tokens": 126,
             "prompt_tokens_details": { "cached_tokens": 1, "audio_tokens": 750 },
             "service_tier": "standard" },
  "finish_reason": null }
```

- `text` : transcription complète (sans étiquettes de locuteurs).
- `segments` : vide sauf si timestamps demandés.
- `language` : **toujours `null`**, même si la langue est fixée ; pour obtenir la langue détectée, `return_language=true` (quand on ne la fixe pas).
- `usage.prompt_audio_seconds` : durée d'audio traitée, en secondes (entier). `usage.service_tier` : `standard` ou `priority` (OpenAPI).
- Observation (inférence) : `total_tokens` = `audio_tokens` + `prompt_tokens` + `completion_tokens` dans les deux exemples (750+3+126 = 879 ; 375+3+19 = 397) ; les tokens audio sont donc facturés/comptés comme tokens de prompt. Le ratio tokens/seconde diffère entre les deux exemples (≈ 22/s vs ≈ 54/s), sans explication dans la doc.

Python affiche via `transcription.model_dump_json(indent=2)`, TS via `JSON.stringify(transcription, null, 2)`.

#### 3.3.4 Timestamps de segment

`-F timestamp_granularities=segment` → `segments[]` d'objets :

| Champ | Contenu |
| --- | --- |
| `type` | `"transcription_segment"` |
| `text` | Mots du segment, **avec l'espace initial conservé** (concaténer les segments redonne le texte complet) |
| `start`, `end` | Secondes dans l'enregistrement (ex. 0.0 → 1.6) |
| `speaker_id` | `null` sans `diarize` |

Le schéma OpenAPI prévoit aussi `score` (number|null) ; **[commentaire interne]** : jamais renvoyé en test, contrairement à l'exemple de la RFC-555. Timestamps par mot : indisponibles (400).

#### 3.3.5 Fixer la langue

`-F language=fr`. Par défaut détection automatique ; fixer la langue « peut améliorer la précision » ; la laisser vide si la langue varie d'un enregistrement à l'autre. Code invalide (`zz`) → `422 "Invalid language alpha2 code"` (et non le 400 listant les codes valides décrit dans la RFC-555, selon un commentaire).

#### 3.3.6 Streamer la réponse (SSE)

`stream=true` (curl : `curl -N ... -F stream=true`). L'OpenAPI modélise une opération distincte `audio_api_v1_transcriptions_post_stream` (« Create Streaming Transcription (SSE) », même chemin, schéma `AudioTranscriptionRequestStream` avec `stream` const `true`, réponse `text/event-stream`).

Flux observé :

```text
event: transcription.text.delta
data: {"type":"transcription.text.delta","text":"Thanks"}
...
event: transcription.done
data: {"model":"voxtral-mini-transcribe-3","text":"...","language":null,"segments":[],"usage":{...},"finish_reason":null,"type":"transcription.done"}
```

Consommation : concaténer `text` de chaque `transcription.text.delta` ; à `transcription.done`, utiliser la charge utile comme résultat final (mêmes champs qu'une réponse non streamée, `usage` inclus). Types d'événements listés par la référence API : `transcription.language` (champ `audio_language`), `transcription.segment.delta` selon la page (le schéma OpenAPI le nomme `transcription.segment`, avec `text`, `start`, `end`, `speaker_id`), `transcription.text.delta`, `transcription.done`. **[commentaire interne]** : aucun événement `transcription.language` observé.

SDK : Python `client.audio.transcriptions.stream(...)` en context manager, événements avec `.event` (nom) et `.data` (charge typée) ; TS `await client.audio.transcriptions.stream({...})` puis `for await`, test sur `event.data.type`, `event.data.usage.promptAudioSeconds`.

Le streaming **n'accélère pas** la transcription et n'est pas du temps réel : tout l'enregistrement est envoyé d'abord.

#### 3.3.7 Erreurs courantes (offline)

| Erreur | Cause | Correction |
| --- | --- | --- |
| 400 `Word-level segments are not enabled for this model` | `timestamp_granularities=word` | Utiliser `segment` |
| 422 `When diarize is set to True and streaming is disabled, the timestamp granularity must be set to ['segment']` | `diarize` sans timestamps de segment | Ajouter `timestamp_granularities=segment` |
| 422 `Invalid language alpha2 code` | `language` pas un code à 2 lettres | Utiliser `en`, `fr`… |
| 400 `maximum context length` (type `invalid_request_prompt_too_long`, code 3059) | Audio + `context_bias` dépassent le contexte ; rien n'est tronqué | Raccourcir `context_bias` |
| 400 `Invalid model: <model>` (code 1500, type `invalid_model` selon commentaire) | Modèle non utilisable | Utiliser un modèle de transcription |
| 422 `Speaker references require diarization` | Références sans `diarize=true` | Activer `diarize` |
| 400 `turn_detection is only supported on the realtime transcription endpoint.` | `turn_detection` offline | Passer en temps réel |

#### 3.3.8 Mini-exemples SDK

```python
transcription = client.audio.transcriptions.complete(
    model="voxtral-mini-transcribe-3",
    file={"file_name": "obama.mp3", "content": audio},
    diarize=True, timestamp_granularities=["segment"],
    context_bias=["Northwind", "Alder Creek Design"],
)
```

TS : `client.audio.transcriptions.complete({ model, file: { fileName, content }, diarize: true, timestampGranularities: ["segment"], contextBias })`, segments en camelCase (`segment.speakerId`).

### 3.4 Transcription temps réel (protocole WebSocket)

#### 3.4.1 Cycle de vie d'une session (4 étapes, toujours dans cet ordre)

| Étape | Vous envoyez | Vous recevez | Action de l'application |
| --- | --- | --- | --- |
| Open | Connexion avec le modèle et la clé API | `session.created` (réglages par défaut) | Attendre avant d'envoyer quoi que ce soit |
| Configure | `session.update` (vos réglages) | `session.updated` (réglages appliqués, en écho) | Vérifier les valeurs ; elles sont **figées dès le premier chunk audio** |
| Stream | `input_audio.append` (un chunk à la fois) | `transcription.text.delta` | Ajouter chaque morceau à la fin du texte affiché |
| Finish | `input_audio.end` | `transcription.done` (transcription complète) | Sauvegarder puis fermer la connexion |

En cas de rejet d'un message : événement `error` à l'étape concernée. Diagramme : `audio_realtime_session_lifecycle.svg`.

#### 3.4.2 Connexion

```text
wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=voxtral-mini-transcribe-realtime-3
Authorization: Bearer $MISTRAL_API_KEY
```

- Modèle dans la query string, clé API dans l'en-tête `Authorization`.
- SDK Python : `async with await client.audio.realtime.connect(model=...) as connection:` — retourne une fois `session.created` reçu ; `connection.session` n'expose que `request_id`, `model`, `audio_format`, `target_streaming_delay_ms` (alors que le `session.created` brut contient aussi `diarize`, `context_bias`, `language`, `speaker_references`, `turn_detection`).
- SDK TS (v2.7.0 testée) : `new RealtimeTranscription({ apiKey })` importé de `@mistralai/mistralai/extra/realtime` (le client `Mistral` n'a **pas** de `audio.realtime`) ; `await client.connect("voxtral-mini-transcribe-realtime-3")` ; `connection.session` ; `await connection.close()`.
- Exemple de `session.created` (quickstart) : `{"type":"session.created","session":{"request_id":"ws-01a1…","model":"voxtral-mini-transcribe-realtime-3","audio_format":{"encoding":"pcm_s16le","sample_rate":16000},"target_streaming_delay_ms":null,"diarize":false,"context_bias":[],"language":null,"speaker_references":null,"turn_detection":null}}`. Le `request_id` est préfixé `ws-`.

#### 3.4.3 Authentification côté client (navigateur)

- **Pages assignées** : seule la méthode `Authorization: Bearer <clé API>` est documentée. **[commentaire interne]** : « l'authentification navigateur (jeton éphémère passé en sous-protocole, RFC-555 §7.2) n'a pas été testée ». Les échecs d'authentification (clé manquante/expirée) n'ont pas été testés en temps réel (pas de ligne dans le dépannage).
- **Hors périmètre assigné, pour complétude** (page Voxtral 2 dépréciée `/studio/audio/deprecated/speech_to_text/realtime_transcription/client_auth.md` présente dans la copie llms-full, et spec OpenAPI) : un backend appelle **`POST /v1/client/sessions`** (opération `create_client_session_v1_client_sessions_post`, tag `realtime.sessions`, permission requise `create_client_session`) avec `{"purpose": "realtime", "model": "..."}` (+ `ttl_seconds` facultatif dans l'OpenAPI : entier > 0 ou `null`) → `201` `{"object":"client.session","purpose":"realtime","expires_at":…,"client_secret":{"value":"rt_...","expires_at":…}}`. Le navigateur ouvre le WebSocket en passant `["realtime", token]` comme sous-protocoles (`Sec-WebSocket-Protocol`), seul transport supporté pour les `rt_*` (un navigateur ne peut pas poser d'en-tête `Authorization` sur un WebSocket). Propriétés : préfixe `rt_`, durée ≈ 900 s, portée = un seul modèle (rejeté sur un autre modèle), réutilisable jusqu'à expiration ; conseil de le générer juste avant la connexion. L'applicabilité à Voxtral 3 n'est pas confirmée par les pages assignées.

#### 3.4.4 Configurer la session (`session.update`)

```json
{ "type": "session.update",
  "session": { "audio_format": { "encoding": "pcm_s16le", "sample_rate": 24000 },
               "target_streaming_delay_ms": 480, "language": "en",
               "context_bias": ["Northwind", "Quillara", "Alder Creek Design", "Rotterdam"] } }
```

Champs (n'envoyer que ceux à changer ; les autres gardent le défaut de `session.created`) :

| Champ | Type | Défaut | Valeurs / contraintes | Effet |
| --- | --- | --- | --- | --- |
| `audio_format` | objet `encoding`, `sample_rate` | `pcm_s16le` à `16000` Hz | PCM 16 bits signé little-endian, mono, à la fréquence de la source (16 et 24 kHz testés) | Décrit l'audio envoyé. « Le format est inféré automatiquement du payload PCM s'il n'est pas fixé. » |
| `target_streaming_delay_ms` | entier | « 480 ms (point de départ recommandé) » ; `null` dans `session.created` | Tout entier de 80 à 1 200, ou 2 400 | Compromis vitesse/précision |
| `language` | string ISO 639-1 (`"en"`) | non fixé | 2 lettres | Fixe la langue, sinon détection |
| `context_bias` | array de strings | `[]` | mots-clés ou descriptions | Biais de vocabulaire |
| `diarize` | booléen | `false` | | Étiquette chaque morceau de texte par locuteur |
| `speaker_references` | objet `{nom: base64 clip}` | non fixé | ≤ 8 clips de 3–15 s ; exige `diarize` | Nomme les locuteurs connus ; `session.updated` renvoie la liste des noms |
| `turn_detection` | objet | non fixé | voir §3.7 | Événements de début/fin de tour |

Règles : envoyer la configuration **avant** le premier `input_audio.append` ; un `session.update` ultérieur → `error` `Session fields cannot be changed after audio has started.` ; pour changer, ouvrir une nouvelle session. `diarize` + `turn_detection` → `error` `Diarization is not compatible with turn detection.`

Note SDK : le Voice Agents SDK envoie `language`, `context_bias`, `turn_detection` via la config `stt` ; pour les sessions WebSocket brutes, utiliser `websockets` (Python, installé par `mistralai[realtime]`) ou `ws` (TS, installé par `@mistralai/mistralai`). Le SDK Python `mistralai` 3.0.0 (`update_session()`) ne prend que `audio_format` et `target_streaming_delay_ms` ; le SDK TS 2.7.0 (`RealtimeConnection.updateSession()`) ne prend que `audioFormat`. Les turn events arrivent dans le SDK Python comme `UnknownRealtimeEvent` **[commentaire interne]**.

#### 3.4.5 Messages client → serveur

| Message | Charge | Rôle |
| --- | --- | --- |
| `session.update` | `{"type":"session.update","session":{...}}` | Configurer (avant tout audio) |
| `input_audio.append` | `{"type":"input_audio.append","audio":"<base64 PCM>"}` | Envoyer un chunk (100 ms dans tous les exemples : `framerate // 10` trames ; en TS `(sampleRate / 10) * 2` octets) |
| `input_audio.end` | `{"type":"input_audio.end"}` | Signaler la fin de l'audio |
| `input_audio.flush` | — | Cité uniquement dans un commentaire interne (scripts de sonde) ; non documenté en page |

#### 3.4.6 Événements serveur → client

| Événement | Champs | Envoyé quand |
| --- | --- | --- |
| `session.created` | `session` | Ouverture, réglages par défaut |
| `session.updated` | `session` | Après chaque `session.update`, réglages appliqués |
| `transcription.text.delta` | `text` | Nouveau texte prêt |
| `transcription.segment` | `text`, `speaker_id`, `start`, `end` | Avec `diarize`, **à la place** de `transcription.text.delta` (`start`/`end` = `null`) |
| `turn.start`, `turn.eager_end`, `turn.resume`, `turn.end` | `time_s` ; `end_reason` sur `turn.end` | Avec `turn_detection` |
| `transcription.done` | `text`, `segments`, `language`, `model`, `usage` | Après `input_audio.end`, tout l'audio transcrit |
| `error` | `error.message`, `error.code` | Message ou réglage rejeté (forme `{"type":"error","error":{"message":…,"code":3051}}`) |

**Affichage des deltas** : afficher dès réception (final), ajouter tel quel (les deltas portent leurs espaces et ponctuation, p. ex. `" for"`, `"."` — ne pas ajouter de séparateur), sauvegarder `transcription.done.text` comme référence. Un delta ne corrige jamais le texte précédent. **[commentaire interne]** : sur 13 sessions, `done.text` = concaténation des deltas ; `transcription.done.language` toujours `null` même avec `language` fixé ; `usage.prompt_audio_seconds` bloqué à 3 quelle que soit la durée (« bug probable »).

**Fin** : envoyer `input_audio.end` → derniers deltas → `transcription.done` → fermer.

#### 3.4.7 Contrôle de la latence

`target_streaming_delay_ms` fixe l'attente du modèle avant d'écrire un mot : plus court = plus tôt mais moins précis ; plus long = plus de contexte, plus précis, plus tard. Valeurs : entier 80–1 200 ou 2 400 ; toute autre valeur → `error` `target_streaming_delay_ms must be one of the trained values: ['80-1200', '2400'] (got 1300).` (123, 480, 2 400 acceptés en test). Le SDK Python le règle via `update_session()`. Les événements de tour n'attendent pas ce délai (le texte arrive après, voir §3.7).

**Taux de transcription variable** (section « Variable transcription rate ») : la page dit qu'afficher un texte rapide puis le remplacer par un texte plus précis nécessite **deux sessions sur le même audio** (une à délai court, une à délai long) ; « les lecteurs voient les mots tout de suite et le texte qu'ils gardent est le plus précis » ; utile pour sous-titres et prise de notes. Le corps de la section est tronqué **[vide dans la doc]** ; un commentaire indique que le « dual delay » vient de l'ancienne doc Voxtral 2.

#### 3.4.8 SDK — script complet (forme)

```python
async for event in client.audio.realtime.transcribe_stream(
    read_chunks(AUDIO_FILE),                       # générateur async de bytes PCM
    model="voxtral-mini-transcribe-realtime-3",
    audio_format=AudioFormat(encoding="pcm_s16le", sample_rate=sample_rate),
):
    if isinstance(event, TranscriptionStreamTextDelta): print(event.text, end="")
    elif isinstance(event, TranscriptionStreamDone): print(event.text)
    elif isinstance(event, RealtimeTranscriptionError): print(event.error.message)
```

Classes importées de `mistralai.client.models` : `AudioFormat`, `RealtimeTranscriptionError`, `TranscriptionStreamDone`, `TranscriptionStreamTextDelta`. TS : `client.transcribeStream(readChunks(), "voxtral-mini-transcribe-realtime-3", { audioFormat: { encoding: AudioEncoding.PcmS16le, sampleRate } })`, test de `event.type` (`transcription.text.delta`, `transcription.done`, `error`). Les exemples simulent un micro en envoyant 100 ms d'audio toutes les 100 ms (`asyncio.sleep(0.1)`). Une exception `RealtimeTranscriptionException` (« server rejected WebSocket connection: HTTP 403 ») est levée si le handshake est refusé **[commentaire interne]**.

#### 3.4.9 Erreurs propres au temps réel

| Erreur ou symptôme | Cause | Correction |
| --- | --- | --- |
| HTTP 403 au handshake WebSocket | Modèle de l'URL non utilisable en temps réel | Utiliser `voxtral-mini-transcribe-realtime-3` |
| `Session fields cannot be changed after audio has started.` | `session.update` après le premier chunk | Tout envoyer avant ; nouvelle session pour changer |
| `target_streaming_delay_ms must be one of the trained values: ['80-1200', '2400'] (got <value>).` | Délai hors plage | 80–1 200 ou 2 400 |
| `Diarization is not compatible with turn detection.` | Les deux dans la même session | En garder un |
| `Speaker references require diarization, set diarize=true.` | Références sans `diarize` | `diarize: true` |
| Message contenant `Invalid language alpha2 code` | Langue invalide | Code 2 lettres |
| Message contenant `Expected start_threshold >= eager_end_threshold > end_threshold` | Seuils de tour mal ordonnés | Respecter l'ordre |
| Message contenant `Expected end_timeout_ms to be greater than or equal to min_silence_ms` | Timeout < silence min | Ajuster |
| Message contenant `Extra inputs are not permitted` | Champ non accepté (ex. `turn_detection.preset`, `emit_probabilities`) | Retirer le champ |
| Latence mesurée sur fichier ≠ usage live | Fichier envoyé plus vite que le temps réel | Envoyer au rythme de l'audio (100 ms toutes les 100 ms) |

Tous les événements d'erreur capturés avaient `code` 3051 **[commentaire interne]**.

Pièges d'environnement **[commentaire interne]** : sur macOS avec Python uv/python.org, le handshake TLS peut échouer (`CERTIFICATE_VERIFY_FAILED`) tant que `SSL_CERT_FILE` ne pointe pas vers un bundle CA (certifi).

### 3.5 Biais de contexte et vocabulaire personnalisé

#### 3.5.1 Le concept : deux indices, un par direction

| | Transcription (STT) | Synthèse (TTS) |
| --- | --- | --- |
| Ce qui se trompe | L'orthographe du mot | La façon dont il sonne |
| L'indice | Biais de contexte : termes attendus ou description de l'enregistrement | Prononciation personnalisée : sons du mot en phonèmes |
| Ce qu'on fournit | Du texte | Des phonèmes |
| Où ça marche | Transcription fichier et temps réel, et réglages de transcription des agents vocaux | Requêtes de génération ; en agents vocaux, `phoneme_hints` dans la config `tts` de `client.audio.sessions.init()` |
| Page de réglages | Bias context and vocabulary | Custom pronunciation |

Aucun indice ne fonctionne dans l'autre direction. Pour une application qui écoute et parle (agent vocal), donner les deux : le nom écrit en contexte `stt`, ses phonèmes en `tts`.

**Pourquoi les noms rares échouent** : le modèle entend des sons, pas des orthographes ; quand un nom rare ressemble à des mots familiers, la version familière gagne (nom de famille rare → nom courant ; médicament → mot courant ; nom de produit → deux mots). Conseil : transcrire d'abord quelques enregistrements sans contexte pour repérer les termes fautifs ; corriger après coup par rechercher-remplacer est fragile (un nom mal entendu ne sort pas toujours pareil).

**Ce que le biais fait / ne fait pas** :
- Il **favorise** vos termes sans les **forcer** : un terme listé peut encore sortir faux ; vérifier sur de vrais enregistrements.
- Il s'applique à **une requête ou une session** : à renvoyer avec chaque fichier, ou au début de chaque session (avant l'audio) ; non modifiable une fois l'audio commencé.
- Il **partage la place avec l'audio** : une très longue liste sur un long enregistrement peut dépasser le contexte → erreur ; l'API ne raccourcit pas la liste.

**Prononciation (TTS)** : par requête ; liste fixe de phonèmes (tout autre symbole → rejet) ; change les mots, pas la diction (pour le ton : balises ou style instructions). Paramètre lié : fixer la langue (`language`) agit à un autre niveau (quelle langue, pas quels mots).

#### 3.5.2 Deux types d'entrées dans la même liste

| | Keyphrases | Free-form context |
| --- | --- | --- |
| Ce qu'on donne | Les termes devant sortir justes, un par entrée (noms, acronymes, codes produit) ; une entrée peut contenir plusieurs mots (« Customer Success Platform ») | Une phrase ou un paragraphe décrivant l'enregistrement : sujet, personnes, noms et outils |
| Exemple (consultation médicale) | Dr. Nakamura, metformin, HbA1c | « Follow-up consultation with Dr. Nakamura about a patient's diabetes treatment: the metformin dose and the latest HbA1c results. » |
| Convient quand | On connaît le vocabulaire | On connaît la situation sans pouvoir tout lister |

Règle : chaque terme critique dans sa propre entrée ; ajouter une phrase descriptive si le sujet est clair. **En temps réel, s'appuyer sur les keyphrases** : une description seule peut ne pas corriger ce qu'un keyphrase corrige (**[commentaire interne]** : en test temps réel, une phrase seule n'a corrigé ni « Voxtral » ni « Kyutai », les keyphrases oui).

#### 3.5.3 Requêtes

- Offline : répéter le champ multipart, `-F context_bias=Northwind -F context_bias=Quillara -F "context_bias=Alder Creek Design"` ; Python `context_bias=[...]` ; TS `contextBias: [...]`. Phrase libre : `-F "context_bias=Support call for Northwind about an order of Quillara headsets ..."`.
- Temps réel : `"context_bias": [...]` (array JSON) dans `session.update`, avant le premier chunk ; s'applique à toute la session.
- Démonstration documentée : sans biais « Quilliera » et « Older Creek Design » ; avec biais « Quillara » et « Alder Creek Design » (Northwind et Rotterdam corrects dans les deux cas). En temps réel sans biais : « Quilera ».
- Encadré : le SDK Python envoie `context_bias`, `language` et `turn_detection` dans la config `stt` de `client.audio.sessions.init()` (Voice Agents SDK) ; **[commentaire interne]** `mistralai` 3.0.0 ne peut pas envoyer `context_bias` en temps réel, et `stt.context_bias` des agents vocaux exige un modèle temps réel Voxtral 3.

#### 3.5.4 Format des entrées

| | Transcription fichier | Session temps réel |
| --- | --- | --- |
| Envoi | Champ `context_bias` répété (une entrée par champ) ; liste en Python | Array de strings dans `session.update` |
| Une entrée | Un terme, un nom multi-mots, ou une description | Idem |
| Caractères | Espaces, virgules et autre ponctuation acceptés | Idem |
| Défaut | Aucun contexte | Aucun contexte (`[]`) |
| Portée | La requête | Toute la session, fixée avant le premier chunk |
| Modèles | `voxtral-mini-transcribe-3`, `voxtral-small-transcribe-3` | `voxtral-mini-transcribe-realtime-3` |

#### 3.5.5 Limites et erreurs

Pas de budget propre : les entrées comptent dans la fenêtre de contexte avec l'audio (65 536 tokens selon les pages Limits et hub). Pas de nombre maximal d'entrées fixe (Voxtral 2 : « jusqu'à 100 mots ou phrases », entrées sans espace avec underscores).

| Situation | Mode | Résultat |
| --- | --- | --- |
| Audio + contexte > fenêtre | Fichier | `400` de type `invalid_request_prompt_too_long`, message indiquant taille et maximum (ex. interne : « Prompt 38268 > 32768 maximum context length », code 3059) |
| `session.update` après le premier chunk | Temps réel | `error` : `Session fields cannot be changed after audio has started.` |

### 3.6 Diarisation et références de locuteurs

#### 3.6.1 Concept

- La diarisation regroupe les passages d'une même voix sous une étiquette (`speaker_1`, `speaker_2`…). Elle dit **qui a parlé quand**, pas **qui** parle.
- Étiquettes cohérentes **dans une transcription**, sans signification d'un enregistrement à l'autre (`speaker_1` d'un appel ≠ `speaker_1` du suivant). Pour suivre une personne entre enregistrements : clips de référence.
- Offline : étiquettes sur chaque segment (avec début/fin) → dossiers étiquetés, sous-titres, résumés par locuteur. Temps réel : étiquettes sur chaque morceau de texte → sous-titres live indiquant qui parle.

#### 3.6.2 Activation

- **Offline** : `diarize=true` **et** `timestamp_granularities=segment` (sinon 422). Python `diarize=True, timestamp_granularities=["segment"]` ; TS `diarize: true, timestampGranularities: ["segment"]`. Réponse : `segments[]` avec `speaker_id` (`speaker_1`…). Rendu du script exemple : `[  0.0s -   1.6s] speaker_1: Thanks for calling Northwind Support.` **[commentaire interne]** : Mini a produit 15 segments, Small 7 segments plus longs sur le même appel.
- **Temps réel** : `"diarize": true` dans `session.update` avant le premier chunk ; la session envoie des **`transcription.segment`** (quelques mots + `speaker_id`, `start`/`end` à `null`) au lieu des `transcription.text.delta`. `transcription.done` contient le texte entier et la liste de segments étiquetés.
- Le Voice Agents SDK **n'envoie pas** `diarize` ni `speaker_references` dans sa config `stt` : pour la diarisation temps réel avec références, utiliser un WebSocket brut. La config STT des agents vocaux n'a pas d'option `diarize` (commentaire).

#### 3.6.3 Lecture des étiquettes

| | Offline | Temps réel |
| --- | --- | --- |
| Emplacement | `speaker_id` de chaque élément de `segments` | `speaker_id` de chaque événement `transcription.segment` |
| Un élément contient | Un segment d'une ou plusieurs phrases | Quelques mots, dès transcription |
| Timestamps | `start`, `end` en secondes | `start`, `end` = `null` |
| Transcription complète | `text` (sans étiquettes) | `transcription.done` (texte + segments étiquetés) |
| Valeurs | `speaker_1`, `speaker_2`… ou noms des clips de référence | Idem |

Rendu en tours : ouvrir un nouveau tour à chaque changement de `speaker_id`, y concaténer les éléments suivants.

#### 3.6.4 Parole superposée

« Overlapping speech (two speakers talking at the same time) is not supported in this version. » La doc conseille néanmoins, si l'interface trace des segments (timeline, fil de chat) : ne pas supposer qu'un segment finit avant le suivant ; trier par `start` et garder les deux segments qui se chevauchent ; afficher deux locuteurs actifs (pistes séparées) plutôt que couper ; ne fusionner les segments consécutifs d'un même locuteur que s'ils ne chevauchent pas un autre locuteur. **[commentaire interne]** : le chevauchement provient de la RFC-555 et n'a pas été reproduit.

#### 3.6.5 Références de locuteurs (clips nommés)

| Règle | Valeur |
| --- | --- |
| Nombre de clips | Jusqu'à 8. Total de locuteurs (références + prédits) ≤ 10 |
| Durée de chaque clip | 3 à 15 secondes |
| Taux de parole | ≥ 85 % du clip doit être de la parole ; éviter les longs silences |
| Format | WAV, Opus, MP3 ou FLAC, encodé base64 ; WAV et formats sans perte donnent les meilleurs résultats (page Audio formats : « l'encodage base64 d'un fichier audio, indexé par un nom de locuteur ») |
| Nom | La clé de chaque clip ; devient le `speaker_id` |
| Diarisation | Requise (`diarize: true` dans la même requête/session) |
| Modes | Offline et temps réel (mais voir §8 : refusé offline en test) |
| Conditions | Plus les conditions acoustiques et de parole sont proches de l'audio transcrit, meilleure est la correspondance (même micro/ligne) |

Comportements : il faut **la même personne** (une voix ressemblante n'est pas associée) ; un locuteur sans référence garde une étiquette générique, numérotée **après** les références (ex. `speaker_3`, `speaker_4` avec deux références, **[commentaire interne]**). Format temps réel : `"speaker_references": {"agent": "<base64 de agent_reference.wav>", "customer": "<base64 ...>"}` (fichiers WAV entiers encodés). Rendu du script : `agent: Thanks for calling Northwind Support...` / `customer: Hi, Daniel...`. L'onglet « Offline » de l'exemple est **[vide dans la doc]**.

#### 3.6.6 Diarisation et détection de tours

Exclusives dans une session temps réel (`Diarization is not compatible with turn detection.`, code 3051). La détection de tours n'existant qu'en temps réel, l'offline n'est pas concerné. Astuce : pour répondre en direct **et** garder un enregistrement étiqueté, faire la session live avec détection de tours, conserver l'audio, puis le diariser offline.

#### 3.6.7 Erreurs de diarisation

| Message | Mode | Cause | Correction |
| --- | --- | --- | --- |
| `When diarize is set to True and streaming is disabled, the timestamp granularity must be set to ['segment']` (422) | Offline | `diarize` sans segments | `timestamp_granularities=segment` |
| `Speaker references require diarization` (422 offline ; `error` en temps réel, texte complet `..., set diarize=true.`) | Les deux | Références sans `diarize` | `diarize: true` |
| `Diarization is not compatible with turn detection.` | Temps réel | Les deux options | En retirer une |
| 400 « At most 8 speaker references are supported, got {n} » | Les deux | Plus de 8 clips, **ou** clip < 3 s ou > 15 s (selon la table) | Réduire/retailler |
| **[vide dans la doc]** | Offline | Le modèle n'accepte pas les clips de référence | Utiliser un modèle qui les supporte |

Message offline complet capturé (commentaire) : « Assertion failed, Speaker references require diarization, set `diarize=True`. » ; offline sur Mini/Small le 7/10 : 400 « does not support speaker references ».

### 3.7 Détection de tours de parole

#### 3.7.1 Concept

- Le silence ne suffit pas : on s'arrête pour respirer, chercher un mot, dicter un numéro chiffre par chiffre. Silence court → on coupe les gens ; silence long → réponses tardives. Une bonne décision tient compte de ce qui est dit et de comment.
- Détection **intégrée au modèle de transcription temps réel** (n'existe qu'en session temps réel). Pendant la transcription, le modèle estime de 0 à 1 la probabilité que l'utilisateur soit dans un segment de parole « sémantiquement actif » ; le serveur compare ce score aux seuils et fait évoluer une machine à 3 états (Waiting → User speaking → Probably finished), chaque transition émettant un événement.
- Compromis inévitable : finir les tours plus tôt = réponses plus rapides mais plus de coupures ; plus tard = moins de coupures, réponses plus lentes.

**Dans quel sens pencher**

| Application | Pencher vers | Pourquoi |
| --- | --- | --- |
| Commandes courtes, menu vocal | Finir plus tôt | Requêtes courtes et complètes ; la lenteur se remarque |
| Échanges rapides | Finir plus tôt | Tours courts ; les blancs rendent la conversation raide |
| Collecte d'informations (adresses, numéros de commande, symptômes) | Finir plus tard | Pauses de lecture/mémoire ; une coupure fait recommencer |
| Utilisateurs qui pensent à voix haute (entretien, tutorat, conseil) | Finir plus tard | Les pauses font partie de la réponse |

En cas de mélange, partir de la ligne où l'erreur coûte le plus.

#### 3.7.2 Activation

Ajouter `"turn_detection": {}` (objet vide = valeurs par défaut) dans `session.update`, avant le premier chunk. Offline → 400 `turn_detection is only supported on the realtime transcription endpoint.` ; avec `diarize` → `error`. Le Voice Agents SDK passe `turn_detection` via la config `stt` ; sinon WebSocket brut (`websockets`/`ws`) — le SDK TS 2.7.0 et `mistralai` 3.0.0 ne savent pas l'envoyer (commentaire).

Sortie type (appel de 34,9 s) :

```text
turn_detection: {'start_threshold': 0.5, 'eager_end_threshold': 0.5, 'end_threshold': 0.33, 'min_silence_ms': 500, 'end_timeout_ms': 3000}
  0.00s  turn.start
  1.36s  turn.eager_end
  1.44s  turn.resume
 ...
 35.12s  turn.end  threshold
```

#### 3.7.3 Événements et ordre

| Événement | Champs | Envoyé quand | L'application peut |
| --- | --- | --- | --- |
| `turn.start` | `time_s` | L'utilisateur commence à parler | Marquer le début (indicateur « parle ») |
| `turn.eager_end` | `time_s` | L'utilisateur a probablement fini | Lancer un travail jetable (préparer une réponse) |
| `turn.resume` | `time_s` | Reprise après un eager end | Abandonner le travail lancé |
| `turn.end` | `time_s`, `end_reason` | Tour terminé | Agir : répondre, exécuter la commande, clore la ligne de sous-titre |

- `time_s` = position dans le flux audio en secondes depuis le début du flux (pas l'horloge locale). Forme : `{"type": "turn.start", "time_s": 0.0}`. Noms sur le fil : `turn.*`, **pas** `transcription.turn.*`.
- `end_reason` : `threshold` (le score a fini le tour) ou `timeout` (le délai max ; non reproduit en test selon commentaire).
- Ordre garanti : un tour s'ouvre toujours par `turn.start` ; un `turn.resume` annule l'eager end précédent ; après `turn.end`, le `turn.start` suivant ouvre un nouveau tour. (Une puce de la liste est **[vide dans la doc]**.)
- Les bornes temporelles : le tour ne peut pas finir avant que la pause atteigne `min_silence_ms`, même si le modèle est confiant ; à `end_timeout_ms`, il finit même si le modèle n'est pas confiant (`end_reason: timeout`).
- Les eager ends sont fréquents (la plupart des pauses entre phrases) : attendre `turn.end` avant toute action irréversible (envoyer un message, réserver, outil qui modifie des données). **[commentaire interne]** : 16 eager_end et 15 resume sur un appel de 35 s.

#### 3.7.4 Le texte arrive après l'événement de tour

Le transcript est en retard sur les événements de tour (de l'ordre du délai de streaming, selon la RFC citée en commentaire) : à `turn.end`, les derniers mots peuvent encore arriver dans les `transcription.text.delta` suivants, et les deltas ne portent pas de temps. Procédure : (1) continuer d'ajouter les deltas au tour courant après `turn.end` ; (2) clore le texte du tour une fois le délai de streaming écoulé après l'événement, ou à l'arrivée du `turn.start` suivant ; (3) agir sur le texte complet. Sur `turn.eager_end`, le texte reçu suffit pour préparer une réponse ; vérifier au `turn.end` que les mots arrivés entre-temps ne changent pas la demande.

#### 3.7.5 Seuils réglables

| Paramètre | Type | Défaut | Effet | Quand le bouger |
| --- | --- | --- | --- | --- |
| `start_threshold` | nombre 0–1 | `0.5` | Seuil pour décider que l'utilisateur commence/reprend | Le monter si les tours démarrent trop facilement (bruit de fond) |
| `eager_end_threshold` | nombre 0–1 | `0.5` | Seuil d'arrêt probable (émet un eager end) | Le baisser si trop d'eager ends |
| `end_threshold` | nombre 0–1 | `0.33` | Seuil d'arrêt (termine le tour) | Le baisser pour moins couper (réponse plus tardive) |
| `min_silence_ms` | entier ms | `500` | Pause minimale avant fin de tour | L'augmenter pour moins de fins prématurées (réponse plus tardive) |
| `end_timeout_ms` | entier ms | `3000` | Pause maximale avant fin forcée | Le diminuer pour plafonner l'attente |

Contraintes : `start_threshold >= eager_end_threshold > end_threshold` et `end_timeout_ms >= min_silence_ms`, sinon `error` (code 3051). Champs inconnus refusés (`extra_forbidden`) : `preset`, `emit_probabilities` (pas de flux de probabilités de débogage, pas d'événement VAD). Sens de réglage pour finir plus tôt : silence min plus court, `end_threshold` plus haut, timeout plus court (et inversement).

#### 3.7.6 Configurations types (presets)

| Configuration | `start_threshold` | `eager_end_threshold` | `end_threshold` | `min_silence_ms` | `end_timeout_ms` | Usage |
| --- | --- | --- | --- | --- | --- | --- |
| Default | 0.5 | 0.5 | 0.33 | 500 | 3000 | Point de départ général ; obtenu avec un objet vide |
| Aggressive | 0.5 | 0.4 | 0.33 | 300 | 2500 | Échanges rapides ; fin de tour plus tôt, plus de coupures |

Aucun champ ne sélectionne un preset par nom : recopier les valeurs. **[commentaire interne]** : Aggressive a terminé un tour sur une pause de 0,4 s que Default n'a pas coupée ; les valeurs d'exemple de la RFC-555 (0.8 / 0.4 / 0.2 / 5600) **ne sont pas** les défauts ; un 3ᵉ preset est en attente.

#### 3.7.7 Interruptions dans les agents vocaux

Par défaut l'utilisateur peut interrompre l'agent : quand il parle pendant que l'agent parle, l'agent s'arrête et écoute. Réglage `turn.allow_interruptions` (défaut : activé), modifiable dans la configuration de l'agent (`/studio/audio/voice-agents/configuration#agent-options`).

| | Interruptions activées | Désactivées |
| --- | --- | --- |
| L'utilisateur peut | Arrêter l'agent à tout moment | Parler seulement quand l'agent a fini |
| Convient à | La plupart des conversations | Messages à entendre en entier (mention légale, confirmation à relire) |
| Attention | **[vide dans la doc]** | Frustration si l'utilisateur ne peut arrêter une réponse longue ou fausse |

Pour afficher qui a la parole (indicateur micro, animation), suivre l'état de l'agent (événements de `/studio/audio/voice-agents/sessions#events` ; commentaire : `agent_state_changed` avec `listening`, `thinking`, `speaking`…). Le Voice Agents SDK gère la détection de tours en interne et **n'expose pas** `turn.eager_end` ni `turn.resume`.

### 3.8 Audio dans les chat completions

Endpoint : **`POST /v1/chat/completions`** (référence `/api/endpoint/chat#operation-chat_completion_v1_chat_completions_post`). Usage : faire **écouter** un enregistrement à un modèle de chat qui répond en **texte** (résumé, réponse à une question, traduction, données structurées). Pour un mot-à-mot, utiliser la transcription de fichiers.

**Forme de la requête** : un message `user` dont `content` contient une partie `{"type": "input_audio", "input_audio": "<base64 du fichier>"}` et une partie `{"type": "text", "text": "<instruction>"}`. TS : `{ type: "input_audio", inputAudio: audioBase64 }`. La forme objet de l'API OpenAI (`data` + `format`) est aussi acceptée. Schéma OpenAPI `AudioChunk` : `type` const `input_audio`, `input_audio` string ou binaire. Modèle des exemples : `voxtral-small-latest` (le hub utilise `voxtral-small-transcribe-3`, voir §8).

| Tâche | Comment formuler l'instruction |
| --- | --- |
| Résumer | Décrire le résumé voulu : longueur, format, lecteur. Ex. « Summarize this support call in three bullet points: the problem, what was checked, and the outcome. » |
| Questionner | Mettre la question à la place de l'instruction de résumé. Ex. « Which order number does the customer give, and what does the agent promise to send? » |
| Traduire | Nommer la langue source et la langue cible ; la réponse est du texte (pour l'entendre, l'envoyer à la synthèse vocale). Pour avoir original + traduction : demander deux sections étiquetées `ORIGINAL:` et `TRANSLATION:` « exactement », sans commentaire. Les sections n'ont pas de timestamps. Les paires de langues supportées renvoient à Languages#translation, où aucune liste n'est donnée. |
| Extraire des données | Function calling : définir une fonction dans `tools` (ex. `record_action_items` avec `items[]` {`owner`, `task`, `due`} et `order_id`), `tool_choice="any"` (TS `toolChoice: "any"`) pour forcer l'appel. Le modèle remplit les arguments, l'application exécute. Lire `response.choices[0].message.tool_calls[0].function.arguments` (JSON string ; en TS peut déjà être un objet). |

**Problèmes courants**

| Symptôme | Cause | Correction |
| --- | --- | --- |
| La réponse reformule au lieu de citer | Un modèle de chat répond à l'instruction ; pas de mot-à-mot | Transcription de fichiers |
| `429`, `Rate limit exceeded` sur une requête avec audio | **[vide dans la doc]** (limite de taille du corps, cf. Limits) | Clip plus court, ou WAV à 8 ou 16 kHz |
| **[vide dans la doc]** | Une partie du MP3 n'est pas lue | Envoyer en WAV |

**[commentaire interne]** : une partie `{"type": "file", "file_id": ...}` est acceptée par le chat mais l'audio n'est pas lu (aucun token audio, transcription inventée) — jamais documentée. Résultat d'extraction testé : `order_id "4417"`, deux items (agent : « Send tracking link », due today ; billing : « Issue invoice », due Friday), non publié tant que le modèle de lancement ne tourne pas.

### 3.9 Latence (concept et méthode de mesure)

**Deux nombres à distinguer** : latence modèle (serveur, hors réseau/app ; sert à comparer des modèles) vs latence de bout en bout (ce que l'utilisateur attend ; seule une mesure depuis l'application la prédit).

**Métrique par mode** : temps jusqu'au résultat complet (offline, batch) ; temps jusqu'au premier texte (STT temps réel, sous-titres, saisie vocale) ; temps jusqu'au premier son (TTS) ; latence par tour (agents vocaux, perçue comme réactivité).

| Mode | Ce que couvre la latence bout en bout | D'où vient le délai | Où régler |
| --- | --- | --- | --- |
| Transcription offline | Transcription complète, ou ses premiers mots si streamée | Envoi du fichier, puis traitement croissant avec la durée | File transcription |
| Transcription temps réel | Le texte de chaque mot, peu après sa prononciation | Délai de streaming choisi, puis réseau | Realtime transcription |
| Synthèse vocale | Le premier son | Génération du premier chunk, puis buffer du lecteur | Stream speech |
| Agents vocaux | La réponse après la fin de parole | Détection de fin de tour, transcription, modèle, outils, synthèse, en série | End-of-turn detection et fillers |

Points clés : chaque requête traverse deux fois le réseau ; la part réseau dépend des distances (utilisateurs ↔ vos serveurs ↔ API) — mesurer depuis l'endroit où tourne l'application et où sont les utilisateurs. Offline : le travail commence une fois l'entrée entièrement envoyée ; streamer ne réduit pas le total mais avance les premiers mots. Détection de fin de tour : son attente précède tout le reste et compte entièrement dans la latence par tour ; l'eager end permet de préparer la réponse en avance. TTS : ce qui compte est le premier son ; un buffer de lecteur plus petit démarre plus tôt avec plus de risque de trous. Agents : l'étape la plus lente impose le rythme ; les appels d'outils sont souvent les plus longs ; un filler couvre l'attente sans la raccourcir.

**Vitesse vs qualité**

| On raccourcit | L'utilisateur obtient | Le coût |
| --- | --- | --- |
| Le délai de streaming | Texte plus tôt | Texte moins précis |
| Le silence de fin de tour | Réponses plus tôt | Coupures plus fréquentes |
| Le buffer du lecteur | Son plus tôt | Plus de risque de trous |
| Le silence pendant un appel d'outil (filler) | Premier son plus tôt | Rien : la réponse utile arrive au même moment |

**Mesurer étape par étape**

| Étape | Début | Fin |
| --- | --- | --- |
| Connexion | Ouverture de la session | Session prête à recevoir |
| Transcription | L'utilisateur dit un mot | Son texte arrive |
| Détection de fin de tour | L'utilisateur s'arrête | Le tour se termine |
| Modèle | Transcription finale prête | Première partie de la réponse |
| Outils | Début de l'appel | Résultat reçu |
| Synthèse | Texte envoyé | Premier chunk audio |
| Lecture | Premier chunk reçu | L'utilisateur l'entend |

Méthode : compter la connexion à part (une fois par session) ; pour les étapes qui commencent par la voix, prendre l'horodatage dans l'audio (les événements de tour portent la position dans le flux, alignable avec l'instant d'envoi) ; répéter le scénario et regarder **médiane** et **95ᵉ percentile** ; changer une chose à la fois ; mêmes réseau, région, audio ; envoyer l'audio au rythme de la parole ; tester avec de vraies conversations (enregistrements contrôlés, puis vrais utilisateurs avec accents/micros/bruit, puis conversations complètes avec interruptions) ; vérifier la précision et les interruptions après chaque changement ; mesurer séparément « premier son entendu » et « réponse utile entendue » (les fillers peuvent masquer un outil lent).

Aucun chiffre de latence Mistral n'est publié. **[commentaire interne]** : des ordres de grandeur d'un concurrent (ElevenLabs : ~75 ms d'inférence TTS « Flash », 20–200 ms de réseau, buffer lecteur ~500 ms courant) sont notés « référence seulement, ne jamais publier comme nôtres ».

### 3.10 Voix et synthèse vocale (ce qu'en disent les pages assignées)

- **Voix** = identité de locuteur référencée par ID ; fixe timbre et accent, stable entre requêtes. Tout le reste vient avec chaque requête (texte, diction, prononciation).

| Type | Origine | Durée d'usage |
| --- | --- | --- |
| Preset | Fournie par Mistral ; Voxtral 3 a ses voix, les presets Voxtral 2 restent acceptés | Toute requête, par `voice_id` |
| Cloned | Enregistrement envoyé avec la requête (zero-shot, sans entraînement) | Cette requête seulement |
| Saved | Clone stocké dans le workspace | Toute requête, par ID, jusqu'à suppression |

- Un clone copie aussi la diction (émotion, rythme) et la prise de son (bruit, micro) du clip : enregistrer dans le style voulu.
- **PVC** : voix construite à partir d'une collection d'enregistrements (30 min à 3 h recommandées), référencée par voice ID ; « workflow recommandé pour les voix personnalisées ».
- **Contrôles** : balises d'émotion et de rythme (partie du texte) ; style instructions (« non disponibles au lancement », tout l'input) ; prononciation personnalisée (mots listés) ; expressiveness (toute la requête ; plus haut = moins de similarité/stabilité, diction plus forte).
- **Émotion V2 vs V3** : en V2, l'émotion vient de la voix (une variante par émotion, `gb_jane_neutral`, `gb_jane_sad`) ; en V3, une voix + balises `[emotion=...]` en ligne.
- **Langues des voix** : chaque preset a une langue/un accent (Jane = anglais britannique, Marie = français).
- **Requête minimale** : `POST https://api.mistral.ai/v1/audio/speech` JSON `{"model": "voxtral-mini-tts-3-0", "input": "...", "voice_id": "gb_jane_neutral", "response_format": "wav"}` → JSON dont `audio_data` est l'audio en base64. SDK : Python `client.audio.speech.complete(model=..., input=..., voice_id=..., response_format=...)` → `response.audio_data` ; TS `client.audio.speech.complete({ model, input, voiceId, responseFormat })` → `response.audioData`.
- **Formats de sortie** (`response_format`) : `mp3` (défaut), `opus`, `wav`, `flac`, `pcm` ; sortie mono 24 kHz.
- **Clonage** : `ref_audio` (clonage pour une requête, toujours accepté) ; fichier MP3 ou WAV en base64, URL refusée (400, code 3291) ; de quelques secondes à quelques minutes. Voix sauvegardée réutilisée via `voice_id`.
- Section « Cloning and consent » **[vide dans la doc]**.

### 3.11 Agents vocaux (ce qu'en disent les pages assignées)

- Un agent vocal enchaîne transcription temps réel → modèle → synthèse dans une session ; toujours temps réel.
- Installation : Python `brew install portaudio` (Linux : `libportaudio2 portaudio19-dev`) puis `pip install "mistralai-voice-agents[default-audio]"` ; TS `brew install sox ffmpeg` (Linux : `sox ffmpeg`) puis `npm install @mistralai/voice-agents`.
- API (Python) : `MistralVoiceAgent(api_key=...)` ; `await client.connect(llm=AudioLLMConfig(model="mistral-small-latest"), tts=AudioTTSConfig(voice_id="fr_marie_neutral"), instructions="...", audio_interface=DefaultAudioInterface())` ; `session.on("transcript", cb)` avec `TranscriptEvent` (`event.role`, `event.content`) ; `await session.wait()` ; `await session.close()`. Modules : `mistralai.voice.agents`, `.audio`, `.models`. TS : `@mistralai/voice-agents`, `@mistralai/voice-agents/audio/node` (`DefaultAudioInterface`), `@mistralai/voice-agents/types`.
- Un avertissement LiveKit sur un data channel fermé peut apparaître à l'ouverture/fermeture : inoffensif (inférence : le transport sous-jacent est LiveKit).
- Autres mentions : config `stt` (`context_bias`, `language`, `turn_detection`) et `tts` (`phoneme_hints`) de `client.audio.sessions.init()` ; `turn.allow_interruptions` ; fillers ; webhooks (réponse sous 10 s, jusqu'à 3 tentatives sur 5xx, 429 et erreurs réseau) ; format audio SDK : PCM 16 bits signé mono **48 kHz** pour une interface audio personnalisée ; dans le navigateur, les pistes média de la page (aucun format à gérer).

### 3.12 Dépannage Speech to Text

**Enveloppes d'erreur**

- Fichier (HTTP) : `{"object":"error","message":"Word-level segments are not enabled for this model","type":"invalid_request_invalid_args","param":null,"code":"3051","raw_status_code":400}`.
- 422 de validation : explication dans `message.detail`, liste d'items avec `msg` (forme interne : `{"object":"error","message":{"detail":[{"type","loc","msg","input"}]},"type":"invalid_request_error"}`).
- Temps réel : événement `{"type":"error","error":{"message":"...","code":3051}}` sur la connexion ouverte.

Les tables d'erreurs fichier et temps réel sont reprises en §3.3.7, §3.4.9, §3.6.7.

**Résultat incomplet**

| Symptôme | Mode | Cause | Correction |
| --- | --- | --- | --- |
| `segments` vide | Fichier | Timestamps non demandés | `timestamp_granularities=segment` |
| `speaker_id` `null` partout | Fichier | Diarisation inactive | `diarize=true` |
| Aucun `transcription.text.delta` | Temps réel | Avec diarisation, le texte arrive en `transcription.segment` | Lire `transcription.segment` |
| Aucun événement `turn.*` | Temps réel | `turn_detection` absent | Ajouter l'objet |
| **[vide dans la doc]** | Temps réel | `audio_format` ne correspond pas à l'audio (encodage ou fréquence) | Déclarer encodage et fréquence réels |
| **[vide dans la doc]** | Temps réel | Pas de `input_audio.end` après le dernier chunk | L'envoyer |
| `text` vide | Fichier | Pas de parole, ou format illisible | Vérifier lecture et format |

**Mauvais mots** : termes mal orthographiés → keyphrases ; terme encore faux en temps réel avec seulement une description → l'ajouter en keyphrase ; mauvaise langue (détection erronée) → fixer `language` ; trop d'erreurs en temps réel → augmenter `target_streaming_delay_ms`.

**Étiquettes** : locuteur avec clip mais étiquette générique (`speaker_3`) → clip d'une autre personne ressemblante, utiliser la même personne ; même personne, étiquettes différentes entre enregistrements → clip de référence à chaque requête ; parole superposée → non supportée.

**Lenteur** : texte temps réel trop tardif → baisser le délai ; attente du transcript complet d'un long fichier → streamer la réponse (total inchangé) ; agent qui répond tard → baisser `min_silence_ms` ou partir d'Aggressive.

**Détection de tours** : coupe pendant une pause → baisser `end_threshold` ou augmenter `min_silence_ms` ; fin trop tardive après une longue pause → baisser `end_timeout_ms` ; tours déclenchés par le bruit → monter `start_threshold` ; trop d'eager ends → baisser `eager_end_threshold` (un eager_end suivi d'un resume à chaque pause est normal) ; derniers mots après `turn.end` → continuer d'ajouter le texte.

### 3.13 Migration depuis Voxtral 2

**Correspondance des modèles** : voir tableau §3.1 (colonne « Remplace »).

**Changements STT (cassants d'abord)**

| Changement | Casse le code ? | Action |
| --- | --- | --- |
| Timestamps par mot supprimés : `timestamp_granularities` n'accepte que `segment`, `word` → 400 | Oui si vous demandez des timestamps par mot | Passer aux segments |
| Une session temps réel verrouille ses réglages au premier chunk ; un `session.update` ultérieur → `error` | **[vide dans la doc]** | Tout envoyer dans le premier `session.update` |
| **[vide dans la doc]** (segments qui se chevauchent, d'après la colonne Action) | Oui si l'affichage suppose qu'ils ne se chevauchent jamais | Garder les deux segments |
| Les entrées `context_bias` peuvent contenir des espaces (nom complet), et une phrase libre fonctionne offline | Non | — |
| `context_bias` sans nombre fixe d'entrées | Non | Garder la liste courte (fenêtre partagée, 400 au-delà) |
| Plus de langues en transcription | Non | Omettre `language` pour détection auto, ou le fixer |
| Nouveau : diarisation temps réel, références de locuteurs, détection de tours en temps réel | Non | Activer au besoin |

**Changements TTS**

| Changement | Casse ? | Action |
| --- | --- | --- |
| L'émotion passe de la voix aux balises `[emotion=...]` dans `input` (V2 : une variante par émotion, ex. `gb_jane_sad`) | Non, presets V2 acceptés | Utiliser les balises pour varier l'émotion d'une voix |
| Clonage pour une requête avec `ref_audio` | Non, toujours accepté | Pour réutiliser : sauvegarder la voix et passer son ID en `voice_id` |
| Nouveau : voix V3, balises de rythme, prononciation personnalisée, ~~style instructions~~ (pas au lancement), expressiveness (≥ 1.0, défaut fixé par le service) | Non | Activer au besoin |

**Calendrier de dépréciation** : section **[vide dans la doc]**.

**Checklist** : (1) remplacer chaque ID ; (2) passer des timestamps mot aux segments ; (3) en temps réel, tout envoyer avant le premier chunk ; (4) si diarisation, gérer les segments chevauchants ; (5) revoir `context_bias` (termes multi-mots avec espaces) ; (6) générer quelques échantillons avec vos voix, migrer les variantes d'émotion vers les balises ; (7) re-mesurer la latence depuis l'application.

**[commentaire interne]** : compatibilité SDK OpenAI volontairement non couverte (question ouverte) ; aucune date inventée (dates à fournir).

---

## 4. Interface utilisateur

Les pages assignées sont orientées API ; elles ne décrivent **aucun écran audio** dans la console (pas de balise `AppLink`, pas de playground audio décrit). Éléments d'interface mentionnés :

| Élément | Chemin / URL | Détails |
| --- | --- | --- |
| Création de clé API | Studio (`https://console.mistral.ai`) › section API keys : `https://console.mistral.ai/home?profile_dialog=api-keys` (la route révèle une **boîte de dialogue de profil** `profile_dialog=api-keys` sur la page d'accueil) | Bouton `Create new key` ; saisir un nom et une **date d'expiration** ; la clé n'est affichée **qu'une fois** ; la stocker dans `MISTRAL_API_KEY`. Captures et options complètes : `/getting-started/quickstarts/studio/activate-and-generate-api-key`. Gestion centralisée : `/admin/identity-access/api-keys` (docs Admin). |
| Usage sans code | Vibe › Work › Voice mode (`/vibe/work/voice-mode`) | « Dicter des prompts et parler avec Work » ; ou analyser un enregistrement en l'uploadant dans un chat. |
| Limites de débit | Admin › Workspaces › Usage limits (`/admin/workspaces/usage-limits#rate-limits`) | Débits et quotas mensuels par workspace, partagés par toutes ses clés. |

**Structure de la documentation Audio** (reflète le découpage produit) :
- `/studio/audio/overview` (hub : Get started en 3 étapes — clé, SDK, premier appel avec 5 onglets « Transcribe a file », « Transcribe in realtime », « Generate speech », « Build a voice agent », « Ask about audio » ; Meet the models ; Understand the concepts ; What you can build **[vide dans la doc]**).
- Concepts : `offline-and-realtime`, `latency`, `turns`, `custom-vocabulary`, `speakers-and-diarization`, `voices`.
- Specs and limits : `audio-formats`, `languages`, `limits`.
- Speech to text : `overview`, `quickstarts/transcribe-a-file`, `quickstarts/transcribe-in-realtime`, `transcribe-files`, `transcribe-in-realtime`, `bias-context-and-vocabulary`, `diarize-speakers`, `turn-detection`, `troubleshooting`.
- Hors périmètre de ce chapitre mais liés : `text-to-speech/*` (voices, voice-cloning, emotion-tags, custom-pronunciation, style-instructions, generate-speech, stream-speech, troubleshooting), `voice-agents/*` (overview, configuration, tools#fillers, sessions#events, webhooks, custom-audio, browser, quickstarts/build-a-voice-agent), `audio-in-chat`, `migrate-from-voxtral-2`, et une section `deprecated/` (Voxtral 2).
- Diagrammes cités : `audio_latency_by_mode.svg`, `voice_agent_turn_latency.svg`, `audio_offline_or_realtime.svg`, `audio_turn_timeline.svg`, `audio_turn_state_machine.svg`, `audio_realtime_session_lifecycle.svg`.
- Fichiers d'exemple publics : `https://docs.mistral.ai/audio/obama.mp3`, `https://docs.mistral.ai/audio/chat.wav`, `https://docs.mistral.ai/audio/bcn_weather.mp3`. Autres fichiers utilisés dans les exemples (non téléchargeables d'après les pages) : `customer_call.wav` (appel Northwind de 34,9 s synthétisé avec les presets `en_paul_neutral` et `gb_jane_neutral`), `support_call.wav`, `support_call_8k.wav`, `meeting_fr.wav`, `agent_reference.wav`, `customer_reference.wav`.

---

## 5. API et SDK

### 5.1 Endpoints

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| POST | `/v1/audio/transcriptions` | Transcription de fichier (multipart) ; opération `audio_api_v1_transcriptions_post` |
| POST | `/v1/audio/transcriptions` avec `stream=true` | Transcription streamée SSE ; opération OpenAPI distincte `audio_api_v1_transcriptions_post_stream` (`/v1/audio/transcriptions#stream`) |
| WSS | `/v1/audio/transcriptions/realtime?model=<id>` | Session de transcription temps réel (en-tête `Authorization: Bearer`) |
| POST | `/v1/files` (`purpose=audio`) | Upload d'un enregistrement réutilisable par `file_id` |
| DELETE | `/v1/files/{file_id}` | Suppression d'un enregistrement uploadé |
| POST | `/v1/chat/completions` | Audio dans le chat (`input_audio`) |
| POST | `/v1/audio/speech` | Synthèse vocale (réponse JSON avec `audio_data` base64 ; SSE `speech.audio.delta` en streaming selon un commentaire) |
| POST | `/v1/client/sessions` | Jeton client éphémère `rt_*` (OpenAPI + page Voxtral 2 dépréciée ; non mentionné dans les pages assignées) |
| GET | `/v1/audio/voices` (+ `/v1/audio/voices/{voice_id}`, `/v1/audio/voices/{voice_id}/sample` dans l'OpenAPI ; commentaire : aussi `/v2`) | Catalogue de voix (hors périmètre, cité en commentaire) |

### 5.2 Objets et schémas clés (OpenAPI locale)

- `AudioTranscriptionRequest` : `model` (requis), `file` (binaire), `file_url` (URI, 1–2 083 car.), `file_id`, `language` (`^\w{2}$`), `temperature` (number|null), `stream` (const `false`), `diarize` (défaut `false`), `context_bias` (array, items pattern `^[^,\s]+$`, défaut `[]`), `timestamp_granularities` (enum `segment` | `word`). Exemples de modèles obsolètes dans la spec : `voxtral-mini-latest`, `voxtral-mini-2507`. Absents de la spec mais documentés : `return_language`, `speaker_references` offline, `turn_detection` (refusé de toute façon).
- `TranscriptionResponse` : `model`, `text`, `language` (2 lettres|null), `segments[]`, `usage` (requis : `model`, `text`, `language`, `usage` ; `additionalProperties: false`).
- `TranscriptionSegmentChunk` : `type` const `transcription_segment`, `text`, `start`, `end`, `score` (number|null), `speaker_id` (string|null).
- `UsageInfo` : `prompt_tokens`, `completion_tokens`, `total_tokens`, `prompt_audio_seconds` (int|null), `service_tier` (`standard` ou `priority`). Les exemples de la doc montrent en plus `prompt_tokens_details.{cached_tokens, audio_tokens}` et un champ racine `finish_reason`.
- Événements SSE (`TranscriptionStreamEventTypes`) : `transcription.language` (`audio_language`), `transcription.segment` (`text`, `start`, `end`, `speaker_id`), `transcription.text.delta` (`text`), `transcription.done` (réponse complète + `type`). Enveloppe `{event, data}`.
- `AudioChunk` (chat) : `type` const `input_audio`, `input_audio` (string ou binaire).
- `CreateRealtimeSessionRequest` : `purpose` const `realtime`, `model` (requis), `ttl_seconds` (int > 0 | null). `CreateRealtimeSessionResponse` : `object` const `client.session`, `purpose`, `expires_at`, `client_secret` {`value`, `expires_at`}. Permission requise : `create_client_session`.
- `ModelCapabilities` contient des drapeaux `audio`, `audio_transcription`, `audio_transcription_realtime`, `audio_speech` (utiles pour filtrer les modèles audio).

### 5.3 Méthodes SDK

| Usage | Python (`mistralai`) | TypeScript (`@mistralai/mistralai`) |
| --- | --- | --- |
| Client | `from mistralai.client import Mistral` ; `Mistral(api_key=...)` | `new Mistral({ apiKey })` |
| Transcription fichier | `client.audio.transcriptions.complete(model=, file={"file_name", "content"}, language=, diarize=, timestamp_granularities=[...], context_bias=[...])` | `client.audio.transcriptions.complete({ model, file: { fileName, content }, diarize, timestampGranularities, contextBias })` |
| Transcription streamée | `with client.audio.transcriptions.stream(...) as events:` ; `event.event`, `event.data` | `await client.audio.transcriptions.stream({...})` ; `event.data.type` |
| Temps réel, flux | `client.audio.realtime.transcribe_stream(chunks, model=, audio_format=AudioFormat(encoding="pcm_s16le", sample_rate=))` (installer `mistralai[realtime]`) | `new RealtimeTranscription({ apiKey })` (de `@mistralai/mistralai/extra/realtime`) ; `client.transcribeStream(chunks, model, { audioFormat: { encoding: AudioEncoding.PcmS16le, sampleRate } })` |
| Temps réel, connexion | `async with await client.audio.realtime.connect(model=) as connection:` ; `connection.session` ; `update_session()` (format audio + délai seulement) | `await client.connect(model)` ; `connection.session` ; `updateSession()` (audioFormat seulement) ; `connection.close()` |
| Types temps réel | `AudioFormat`, `TranscriptionStreamTextDelta`, `TranscriptionStreamDone`, `RealtimeTranscriptionError` ; exception `RealtimeTranscriptionException` ; événements non typés `UnknownRealtimeEvent` | `event.type` : `transcription.text.delta`, `transcription.done`, `error` |
| Chat avec audio | `client.chat.complete(model=, messages=[...], tools=, tool_choice="any")` | `client.chat.complete({ model, messages, tools, toolChoice: "any" })`, `message.toolCalls` |
| TTS | `client.audio.speech.complete(model=, input=, voice_id=, response_format=)` → `audio_data` | `client.audio.speech.complete({ model, input, voiceId, responseFormat })` → `audioData` |
| Agents vocaux | `mistralai-voice-agents` : `MistralVoiceAgent`, `DefaultAudioInterface`, `AudioLLMConfig`, `AudioTTSConfig`, `TranscriptEvent` ; mention de `client.audio.sessions.init()` (config `stt`/`tts`) | `@mistralai/voice-agents` : `MistralVoiceAgent`, `DefaultAudioInterface` (`/audio/node`), `TranscriptEvent` (`/types`) |

Versions citées en commentaire : `mistralai` 3.0.0 (Python), `@mistralai/mistralai` 2.7.0 (TS, Node 26), `ws` 8.22.

### 5.4 Protocole WebSocket temps réel (récapitulatif)

- Client → serveur : `session.update`, `input_audio.append` (`audio` base64), `input_audio.end` (+ `input_audio.flush` cité en commentaire).
- Serveur → client : `session.created`, `session.updated`, `transcription.text.delta`, `transcription.segment`, `turn.start`, `turn.eager_end`, `turn.resume`, `turn.end`, `transcription.done`, `error`.
- Détails des champs : §3.4.4 à §3.4.6 et §3.7.3.

### 5.5 Codes et enveloppes d'erreur

| Statut / code | Contexte |
| --- | --- |
| HTTP 400, `type` `invalid_request_invalid_args`, `code` `"3051"` | Arguments invalides (timestamps mot, `turn_detection` offline…) |
| HTTP 400, `invalid_request_prompt_too_long`, code 3059 | Audio + `context_bias` > contexte |
| HTTP 400, `invalid_model`, code 1500 (commentaire) | Modèle invalide |
| HTTP 400, code 3291 (commentaire) | Clip de clonage TTS en URL / format non MP3-WAV |
| HTTP 422, `message.detail[].msg` | Validation (langue, `diarize` sans segment, références sans diarisation, phonèmes/`expressiveness` côté TTS) |
| HTTP 429 `Rate limit exceeded` | Corps de requête chat trop gros avec `input_audio` |
| HTTP 403 au handshake | Modèle temps réel non utilisable |
| Événement `error`, code 3051 | Toutes les erreurs de session temps réel observées |

---

## 6. Limites, quotas, tarifs, disponibilité

### 6.1 Limites chiffrées

| Limite | Valeur | Au-delà |
| --- | --- | --- |
| Longueur de `file_url` | 2 083 caractères | Erreur de validation |
| Fichier uploadé (`file_id`) | **[vide dans la doc]** (512 Mo = limite générale de `/v1/files` dans l'OpenAPI, cité en commentaire) | Upload rejeté |
| Fenêtre de contexte (audio + `context_bias`) | 65 536 tokens | `400`, rien n'est tronqué |
| Timestamps | Par segment uniquement | `word` → `400` |
| Références de locuteurs | ≤ 8 clips, 3–15 s chacun, `diarize=true` ; ≥ 85 % de parole ; total locuteurs ≤ 10 | `400` « At most 8 speaker references are supported, got {n} » |
| `target_streaming_delay_ms` | Entier 80–1 200, ou 2 400 | Événement `error` |
| Chunk audio temps réel (pratique documentée) | 100 ms | — |
| `expressiveness` (TTS) | ≥ 1.0 (page migration) ; plage **[vide dans la doc]** | `422` |
| `phoneme_hints` (TTS) | Liste fermée de 50 phonèmes | `422` listant les phonèmes acceptés |
| Balises d'émotion (TTS) | 34 valeurs | Pas d'erreur : balise non prononcée, sans effet documenté |
| Balises de rythme (TTS) | `slow` ou `fast` | Idem (ex. `[pace=medium]`, `[pace=turbo]` en commentaire) |
| Clip de clonage (TTS) | Quelques secondes à quelques minutes, MP3 ou WAV | `400` si autre format |
| Corps chat avec `input_audio` | **[vide dans la doc]** | `429` `Rate limit exceeded` |
| Webhooks agents vocaux | Réponse sous 10 s ; ≤ 3 tentatives (5xx, 429, erreurs réseau) | — |
| Jeton `rt_*` (page V2 dépréciée) | ≈ 900 s, un modèle | Rejet |

### 6.2 Formats audio

| Usage | Format |
| --- | --- |
| Transcription fichier | `file` / `file_url` / `file_id` ; liste des formats **[vide dans la doc]** (exemples : MP3, WAV) |
| Transcription temps réel | Chunks base64 de `pcm_s16le` (PCM 16 bits signé little-endian, mono), décrits par `audio_format` ; défaut 16 000 Hz (16 et 24 kHz testés ; stéréo non testé) |
| Sortie TTS | `mp3` (défaut ; lecture navigateur/app, taille), `opus` (streaming, faible bande passante), `wav` (édition, non compressé), `flac` (archivage sans perte), `pcm` (pipelines bruts, passerelles téléphoniques, sans en-tête) ; mono 24 kHz |
| Références de diarisation | base64 d'un fichier audio (WAV, Opus, MP3, FLAC), indexé par nom |
| Clonage de voix | MP3 ou WAV en base64 ; URL refusée |
| Audio dans le chat | Partie `input_audio` base64 ; formats **[vide dans la doc]** ; MP3 parfois partiellement lu → préférer WAV (8 ou 16 kHz pour limiter la taille) |
| Voice Agents SDK | PCM 16 bits signé mono 48 kHz (interface audio personnalisée ou envoi manuel) ; navigateur : pistes média de la page |

### 6.3 Langues

| Capacité | Réglage de la langue | Sans langue |
| --- | --- | --- |
| Transcription fichier | `language`, code ISO 639-1 à 2 lettres ; autre valeur → `422` | Détection automatique |
| Transcription temps réel | `language` dans `session.update` | Détection automatique (testée sur un seul clip français) |
| Synthèse vocale | Écrire `input` dans la langue voulue ; chaque preset a sa langue/son accent ; clone utilisable dans d'autres langues | — |
| Traduction | Instruction d'une requête audio-in-chat (« Translate this call into French ») ; sortie texte | — |

| Modèle | Capacité | Langues |
| --- | --- | --- |
| `voxtral-mini-transcribe-3-0` | Fichier | 50 langues |
| `voxtral-small-transcribe-3-0` | Fichier | 50 langues |
| `voxtral-mini-transcribe-realtime-3-0` | Temps réel | 45 langues et dialectes |
| `voxtral-mini-tts-3-0` | Synthèse | 35 langues, 50+ dialectes |

Voix prédéfinies TTS par langue (22 langues, 35 voix au total d'après la table) : arabe `ar` 1, catalan `ca` 1, chinois `zh` 1, néerlandais `nl` 1, anglais UK `en_GB` 6, anglais US `en_us` 4, français `fr` 4, allemand `de` 1, hindi `hi` 2, hongrois `hu` 1, italien `it` 1, japonais `ja` 1, coréen `ko` 2, norvégien `no` 1, polonais `pl` 1, portugais `pt` 1, roumain `ro` 1, russe `ru` 1, espagnol `es` 1, turc `tr` 1, ukrainien `uk` 1, vietnamien `vi` 1. Pour une langue sans preset : clonage avec un enregistrement dans la langue cible. Aucune liste nominative des 50 langues STT n'est donnée.

### 6.4 Quotas, tarifs, régions, rétention

- Débits et quotas mensuels : **par workspace**, partagés par toutes les clés API (renvoi vers Admin › Workspace usage and limits).
- `usage.service_tier` : `standard` ou `priority` (OpenAPI) ; exemples en `standard`.
- Facturation : les exemples de `usage` montrent des `audio_tokens` inclus dans `total_tokens` et `prompt_audio_seconds` ; **aucun tarif** n'est donné dans les pages assignées.
- Régions, ZDR, rétention des fichiers audio : **non traités** dans les pages assignées (seule consigne : supprimer les fichiers uploadés devenus inutiles).
- Plans requis : non mentionnés.

---

## 7. Détails fins, pièges, cas particuliers, dépréciations

- **Verrouillage de session** : tout réglage temps réel doit être dans `session.update` **avant** le premier `input_audio.append` ; aucune reconfiguration à chaud (nouvelle session obligatoire). Nouveau en Voxtral 3.
- **Exclusivité** diarisation ↔ détection de tours dans une session ; contournement documenté : détection live + diarisation offline de l'enregistrement.
- **Diarisation temps réel change le type d'événement** : plus aucun `transcription.text.delta`, seulement des `transcription.segment` (sans timestamps).
- **`language` toujours `null`** dans les réponses (offline et `transcription.done` temps réel), même si fixé ; utiliser `return_language=true` offline pour obtenir la langue détectée.
- **Texte en retard sur les tours** : les derniers mots d'un tour arrivent après `turn.end` ; les deltas n'ont pas d'horodatage.
- **Eager ends fréquents** : à presque chaque pause ; ne jamais déclencher d'action irréversible dessus.
- **Seuils ordonnés** : `start_threshold >= eager_end_threshold > end_threshold` ; `end_timeout_ms >= min_silence_ms`. Les presets ne sont pas un champ.
- **Segments avec espace initial** : concaténer sans séparateur ; idem pour les deltas temps réel.
- **Étiquettes locales** : `speaker_1` n'a pas de sens inter-enregistrements ; les locuteurs non appariés sont numérotés après les références.
- **Biais ≠ forçage** ; un biais trop long sur un long audio → 400 (pas de troncature). Le pattern OpenAPI `^[^,\s]+$` est contredit par la doc (espaces/virgules acceptés).
- **Streaming offline ≠ temps réel** ; ne réduit pas le temps total.
- **Mesure de latence** : envoyer un fichier plus vite que le temps réel fausse la latence ; les scripts testés de la doc envoient le fichier le plus vite possible (bon pour un transcript, pas pour du timing) — sauf les quickstarts qui temporisent à 100 ms.
- **Audio dans le chat** : réponse reformulée (pas de verbatim), 429 sur gros corps, MP3 partiellement lu ; au lancement `voxtral-small-latest` (Voxtral 2) ; la partie `file`/`file_id` est acceptée mais l'audio n'est pas lu (transcription inventée, commentaire).
- **SDK incomplets** : Python 3.0.0 et TS 2.7.0 ne savent pas envoyer `diarize`, `speaker_references`, `turn_detection`, `context_bias`, `language` en temps réel → WebSocket brut. Le Voice Agents SDK n'expose pas `diarize`/`speaker_references` ni les événements `turn.eager_end`/`turn.resume`.
- **TLS macOS** : `SSL_CERT_FILE` vers certifi si `CERTIFICATE_VERIFY_FAILED` (commentaire).
- **Balises TTS inconnues** silencieusement ignorées (200, non prononcées).
- **Dépréciations** : Voxtral 2 (`voxtral-mini-2602`, `voxtral-mini-transcribe-realtime-2602`, `voxtral-small-2507`, `voxtral-mini-tts-2603`) ; timestamps par mot supprimés ; presets V2 et `ref_audio` toujours acceptés ; calendrier de dépréciation non publié ; l'information de dépréciation « canonique » est censée vivre dans les sections Deprecated models des overviews STT/TTS (commentaire), absente de l'overview STT fournie (l'encadré « caution » y est tronqué).
- **Non disponible au lancement** : style instructions TTS (400 code 3051 en test) ; Small Transcribe 3 en chat ; TTS Realtime (403 en test).
- **Parole superposée** non supportée « dans cette version », mais la doc demande de gérer des segments qui se chevauchent.

---

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **ID de Small Transcribe 3** : `voxtral-small-transcribe-3-0` (hub, STT overview, Languages) vs « Model ID » `voxtral-small-transcribe-latest` dans la table de migration (qui liste aussi `voxtral-small-transcribe-latest` comme alias : doublon).
2. **Alias manquant** : la 2ᵉ case d'alias de Mini Transcribe Realtime 3 est vide.
3. **IDs finaux vs alias** : tous les exemples utilisent des alias (`voxtral-mini-transcribe-3`, `voxtral-mini-transcribe-realtime-3`) ; selon les commentaires, les IDs finaux `-3-0` des modèles Mini étaient refusés (400/403) au 9/10 et l'API servait des alias intérimaires (`voxtral-transcribe-3`…). Statut réel au 21/10 inconnu.
4. **Fenêtre de contexte** : 65 536 tokens (hub, Limits) vs 32 768 tokens dans plusieurs commentaires de source et dans le message d'erreur testé (« Prompt 38268 > 32768 maximum context length »).
5. **Modèle pour l'audio dans le chat** : le hub (« Ask about audio ») utilise `voxtral-small-transcribe-3` alors que le hub lui-même dit Small Transcribe 3 « transcription only at launch » et que la page STT overview prescrit `voxtral-small-latest` (Voxtral 2). Un commentaire d'audio-in-chat dit aussi que « le `voxtral-small-latest` documenté renvoie 400 Invalid model », en contradiction avec les tests qui l'utilisent.
6. **Références de locuteurs offline** : page-concept et Limits disent « offline et temps réel » ; tableau STT overview (cellule offline vide), onglet Offline vide, ligne d'erreur vide « le modèle n'accepte pas les clips », et commentaire de test : 400 « does not support speaker references » sur Mini et Small le 7/10.
7. **Erreur de limite des références** : le même message « At most 8 speaker references… got {n} » est indiqué pour un clip hors 3–15 s, ce qui paraît improbable (inférence).
8. **Nom de l'événement SSE de segment** : `transcription.segment.delta` (page File transcription) vs `transcription.segment` (OpenAPI, et événement temps réel).
9. **Schéma de réponse** : la doc montre `finish_reason` et `usage.prompt_tokens_details` (`cached_tokens`, `audio_tokens`) absents de `TranscriptionResponse`/`UsageInfo` (déclarés `additionalProperties: false`) ; inversement `score` est dans le schéma mais jamais renvoyé.
10. **Champs non alignés OpenAPI ↔ doc** : `return_language` documenté mais absent de l'OpenAPI ; `temperature` présent dans l'OpenAPI mais non documenté ; enum `timestamp_granularities` inclut `word` (refusé) ; `FilePurpose` de l'OpenAPI (`fine-tune`, `batch`, `ocr`, `agentic_safety`) n'inclut pas `audio`, pourtant requis pour `file_id`.
11. **Pattern `context_bias`** : OpenAPI `^[^,\s]+$` (pas d'espace ni de virgule) vs doc « espaces, virgules et ponctuation acceptés ».
12. **Défaut de `target_streaming_delay_ms`** : table « 480 ms (point de départ recommandé) » vs `null` dans `session.created`.
13. **`audio_format`** : défaut `pcm_s16le` 16 000 Hz **et** « inféré automatiquement du payload PCM » si non fixé — deux affirmations difficilement compatibles (un flux PCM brut ne porte pas sa fréquence).
14. **Comptes de langues** non stabilisés selon les commentaires (STT : 58 / 50 / « 13 L1 + ~45 » ; temps réel : L1 seulement vs 50 ; TTS : 35 + ~50 dialectes vs 36 + 53). La page Languages publie 50 / 50 / 45 / 35+50, sans liste. Codes de voix hétérogènes : `en_GB` vs `en_us`.
15. **Catalogue de voix** : table de 35 presets sur 22 langues vs commentaire « 9 voix Voxtral 3 listées par `GET /v1/audio/voices` le 7/10 » (inférence : la table mélange presets V2 et V3).
16. **Phonèmes dans les agents vocaux** : page Custom vocabulary dit `phoneme_hints` dans la config `tts` de `client.audio.sessions.init()` ; son commentaire de source dit « pas de champ phonème dans les réglages tts ». Par ailleurs l'exemple d'agent vocal du hub utilise `MistralVoiceAgent.connect(...)`, pas `client.audio.sessions.init()`.
17. **Biais via SDK** : une page dit que « le SDK Python envoie `context_bias`, `language`, `turn_detection` dans la config `stt` de `client.audio.sessions.init()` », une autre (commentaire) que `mistralai` 3.0.0 ne peut pas envoyer `context_bias` en temps réel.
18. **Installation** : hub `pip install "mistralai[realtime]"` vs quickstart fichier `pip install mistralai` ; quickstart temps réel avec section « Get an API key » vide et utilisant `support_call.wav` (non téléchargeable) au lieu de `chat.wav` (commentaire : « à aligner »).
19. **Sortie du quickstart fichier** : le fichier `obama.mp3` produit selon la page « I'm recording some speech now for testing. Et on peut aussi parler français ! » (7 s), alors que l'exemple OpenAPI pour un fichier Obama est un discours de 203 s (inférence : sortie non représentative du fichier).
20. **Ratio tokens audio / secondes** : 375 tokens pour 7 s vs 750 tokens pour 34 s — non expliqué.
21. **Bugs signalés en commentaire** : `usage.prompt_audio_seconds` bloqué à 3 en temps réel ; `language` toujours null.
22. **Paragraphes et cellules vides** : « What you can build », « Deprecation timeline », « Cloning and consent », « Variable transcription rate » (fragment), paragraphes temps réel de la page Latency, une puce de l'ordre des tours, lignes « Watch out for » (interruptions activées), causes 429/MP3 de l'audio-in-chat, formats de fichiers transcription et audio-in-chat, taille max `file_id`, plage d'`expressiveness`, chiffres TTS Realtime, nom de voix manquant dans le hub (« Every example uses the  voice »).
23. **Parole superposée** : « non supportée dans cette version » mais conseils détaillés pour afficher des segments chevauchants et ligne de migration « cassante » associée (commentaire : issu de la RFC-555, non reproduit).
24. **Authentification navigateur pour Voxtral 3** : non documentée dans les pages courantes ; seule la page V2 dépréciée décrit `POST /v1/client/sessions` + sous-protocole `["realtime", token]`.
25. **`input_audio.flush`** : message existant d'après les scripts de sonde, jamais documenté.
26. **Événement `transcription.language`** listé dans l'API mais jamais observé.
27. **3ᵉ preset de détection de tours** et `end_reason: timeout` : annoncés/possibles mais non confirmés en test.
28. **Fiches modèles** `/models/voxtral-*-3-0` : 404 selon commentaire.

---

## Annexe — Couverture

| # | Fichier | Statut | Source |
| --- | --- | --- | --- |
| 1 | `audio/audio-in-chat.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/audio-in-chat.md |
| 2 | `audio/concepts/custom-vocabulary.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/concepts/custom-vocabulary.md |
| 3 | `audio/concepts/latency.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/concepts/latency.md |
| 4 | `audio/concepts/offline-and-realtime.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/concepts/offline-and-realtime.md |
| 5 | `audio/concepts/speakers-and-diarization.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/concepts/speakers-and-diarization.md |
| 6 | `audio/concepts/turns.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/concepts/turns.md |
| 7 | `audio/concepts/voices.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/concepts/voices.md |
| 8 | `audio/migrate-from-voxtral-2.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/migrate-from-voxtral-2.md |
| 9 | `audio/overview.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/overview.md |
| 10 | `audio/specs-and-limits/audio-formats.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/specs-and-limits/audio-formats.md |
| 11 | `audio/specs-and-limits/languages.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/specs-and-limits/languages.md |
| 12 | `audio/specs-and-limits/limits.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/specs-and-limits/limits.md |
| 13 | `audio/speech-to-text/bias-context-and-vocabulary.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/bias-context-and-vocabulary.md |
| 14 | `audio/speech-to-text/diarize-speakers.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/diarize-speakers.md |
| 15 | `audio/speech-to-text/overview.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/overview.md |
| 16 | `audio/speech-to-text/quickstarts/transcribe-a-file.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/quickstarts/transcribe-a-file.md |
| 17 | `audio/speech-to-text/quickstarts/transcribe-in-realtime.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/quickstarts/transcribe-in-realtime.md |
| 18 | `audio/speech-to-text/transcribe-files.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/transcribe-files.md |
| 19 | `audio/speech-to-text/transcribe-in-realtime.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/transcribe-in-realtime.md |
| 20 | `audio/speech-to-text/troubleshooting.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/troubleshooting.md |
| 21 | `audio/speech-to-text/turn-detection.md` | ✅ lu en entier | https://docs.mistral.ai/studio/audio/speech-to-text/turn-detection.md |

Sources complémentaires consultées par grep ciblé (hors liste assignée) : spec OpenAPI locale (`/v1/audio/transcriptions`, schémas `AudioTranscriptionRequest*`, `TranscriptionResponse`, `TranscriptionSegmentChunk`, `UsageInfo`, `TranscriptionStream*`, `AudioChunk`, `FilePurpose`, `/v1/files`, `/v1/client/sessions`, `CreateRealtimeSession*`, `ClientSecret`, `ModelCapabilities`) ; page dépréciée « Client authentication » (https://docs.mistral.ai/studio/audio/deprecated/speech_to_text/realtime_transcription/client_auth.md) dans la copie llms-full, uniquement pour le point « authentification client ».
