# 19 — Audio (2/2) : synthèse vocale et agents vocaux

> **Périmètre** : synthèse vocale (Text to Speech, TTS) avec Voxtral TTS 3 — génération, streaming, catalogue de voix, gestion et clonage de voix, balises d'émotion/rythme/disfluences, instructions de style, prononciation personnalisée, dépannage — et agents vocaux (Voice Agents SDK) — pipeline, configuration, agents sauvegardés et versions, sessions et événements, outils, webhooks, téléphonie SIP, navigateur, interface audio. Les anciennes pages `studio/audio/deprecated/` sont parcourues pour relever ce qui a changé. · **Sources** : 29 pages de docs.mistral.ai (copie du 21/10/2026), plus vérifications ponctuelles dans la spec OpenAPI locale · **Rédaction** : agent de recherche pour Nexora Studio

> **Avertissement de lecture** : la documentation audio est en pleine refonte (projet interne « DOC-610 », pages datées « Oct 7 / Oct 9 » dans les commentaires MDX). Beaucoup de pages contiennent des **cellules vides, phrases tronquées et commentaires internes** (tests, décisions, questions ouvertes). Ces commentaires ne sont pas visibles sur le site publié mais sont présents dans la copie locale ; ils sont exploités ici et signalés par « (commentaire interne) ».

## Sommaire

1. En bref
2. Concepts et vocabulaire
3. Fonctionnalités en détail
   - 3.1 Modes et modèles TTS
   - 3.2 Génération de parole (`POST /v1/audio/speech`)
   - 3.3 Expressivité (`expressiveness`)
   - 3.4 TTS contextuel (`conversation_history`)
   - 3.5 Streaming de la parole (SSE)
   - 3.6 Catalogue de voix préréglées
   - 3.7 Gestion des voix (CRUD, partage, rétention)
   - 3.8 Clonage de voix
   - 3.9 Balises d'émotion, de rythme et disfluences
   - 3.10 Instructions de style (non disponibles)
   - 3.11 Prononciation personnalisée (`phoneme_hints`)
   - 3.12 Dépannage TTS
   - 3.13 Agents vocaux : vue d'ensemble et pipeline
   - 3.14 Agent vs session
   - 3.15 Configuration (`sessions.init()`)
   - 3.16 Agents sauvegardés et versions
   - 3.17 Sessions : cycle de vie, événements, erreurs
   - 3.18 Outils (serveur, client, fillers)
   - 3.19 Webhooks
   - 3.20 Téléphonie (SIP)
   - 3.21 Navigateur (TypeScript)
   - 3.22 Interface audio et audio personnalisé
4. Interface utilisateur
5. API et SDK
6. Limites, quotas, tarifs, disponibilité
7. Détails fins, pièges, cas particuliers, dépréciations
8. Questions ouvertes / incohérences relevées dans la doc
Annexe — Couverture

---

## 1. En bref

- **TTS (Text to Speech)** : transforme un texte complet en audio via un seul endpoint, `POST /v1/audio/speech`, avec le modèle **Voxtral TTS 3** (`voxtral-mini-tts-3-0`). Réponse JSON avec l'audio en base64 (`audio_data`) ou, avec `stream: true`, flux SSE d'événements `speech.audio.delta` / `speech.audio.done`.
- **Voix** : 36 voix « Voxtral 3 » à identifiants opaques (`voice_478`…), couvrant 21 langues, plus 30 voix héritées « Voxtral 2 » (`gb_jane_neutral`…, une variante par émotion), plus les **voix personnalisées** clonées et sauvegardées dans l'espace de travail (ID UUID, rétention 1–365 jours, partage privé/workspace).
- **Contrôle de la diction** : balises inline `[emotion=…]` (34 valeurs), `[pace=…]`, disfluences (`[laugh]`, `[sigh]`…), paramètre `expressiveness` (1.0–5.0), **prononciation par phonèmes IPA** (`phoneme_hints`, 50 phonèmes), **TTS contextuel** conditionné par l'historique audio de la conversation (`conversation_history`). Les **instructions de style** (`instruction`) sont documentées mais **non disponibles au lancement**.
- **Clonage zero-shot** : un enregistrement MP3/WAV en base64, soit ponctuel (`ref_audio`), soit sauvegardé comme voix (`voices.create`) puis réutilisé par `voice_id`. Le **clonage professionnel** (30 min à 3 h d'audio) est mentionné avec des recommandations d'enregistrement.
- **Un mode « Realtime » TTS** (`voxtral-mini-tts-realtime-3-0`, texte envoyé au fil de l'eau via WebSocket) est annoncé, mais sa section est **vide** : non publié à la date de la copie (commentaire interne : « TTS Realtime 3 not released »).
- **Agents vocaux** : le **Voice Agents SDK** (inclus dans `mistralai` Python via l'extra `[voice-agents]`, et dans `@mistralai/mistralai` TypeScript) exécute tout le pipeline micro → transcription (Voxtral realtime) → LLM → synthèse → haut-parleur, au-dessus du transport temps réel **LiveKit**. Interruption de l'agent par l'utilisateur, outils serveur (web search, bibliothèques de documents, connecteurs) et outils client (fonctions de l'application), « fillers » vocaux pendant les appels d'outils.
- **Agent = configuration sauvegardée et versionnée** (`client.audio.agents.*`) ; **session = une conversation** (`client.audio.sessions.init()` / `create()` / `close()`, `POST`/`DELETE /v1/audio/sessions`). Événements de session côté code, **webhooks signés HMAC** (`call_started`, `call_ended`, `call_failed`) côté backend.
- **Trois surfaces** : SDK local (Python/Node.js, micro et haut-parleurs de la machine), **navigateur** (TypeScript, session créée par le serveur, jeton de participant), **téléphonie SIP** (entrant uniquement, **réservée aux clients entreprise, non self-serve**).
- **Statuts** : TTS 3 et SDK annoncés pour le lancement d'octobre (commentaire interne : « SDK ships live with the October launch ») ; la surface du SDK « n'est pas figée » ; pas de référence d'API publique pour agents/sessions/webhooks à la date de la copie ; pas de chiffres de latence publiés (commentaire interne : pas sous 1 s par tour aujourd'hui).
- **Dépréciations** : l'ancien modèle **Voxtral TTS** (`voxtral-mini-tts-2603`, « Voxtral 2 ») et ses pages ; l'endpoint de liste `GET /v1/audio/voices` (pagination par offset), déprécié le 2026-09-07, extinction prévue le 2027-03-31, remplacé par `GET /v2/audio/voices` (curseur).

## 2. Concepts et vocabulaire

| Terme original | Définition |
| --- | --- |
| Text to Speech (TTS) | Synthèse vocale : génération d'audio parlé à partir d'un texte. |
| Offline (mode) | Le texte complet est envoyé en une requête ; l'audio revient en un fichier ou en flux. Modèle `voxtral-mini-tts-3-0`. |
| Realtime (mode) | Texte envoyé pendant qu'il s'écrit (ex. réponse d'un LLM), ou conversation pilotée par un agent vocal. Modèle `voxtral-mini-tts-realtime-3-0` (non publié). |
| Speech generation | Requête TTS unique renvoyant un fichier audio complet (base64). |
| Stream speech / streamed response | Même requête avec `stream: true` : l'audio revient par morceaux en SSE ; le texte reste complet à l'envoi. |
| Voxtral 3 voices | Voix préréglées « acteurs » du modèle Voxtral TTS 3, ID `voice_NNN`, une voix = une personne ; l'émotion se règle par balises. |
| Voxtral 2 preset voices | Voix héritées (`en_paul_*`, `gb_jane_*`, `gb_oliver_*`, `fr_marie_*`), une variante d'ID par émotion ; toujours acceptées par Voxtral 3. |
| Preset / custom (`type`) | Voix préréglée du catalogue vs voix sauvegardée dans l'espace de travail. |
| Saved voice | Voix créée par clonage d'un enregistrement et stockée dans l'espace de travail ; référencée par son ID (UUID, pas de slug). |
| Slug | Identifiant lisible d'une voix préréglée (`gb_jane_neutral`, `voice_478`) ; `null` pour les voix sauvegardées. |
| Zero-shot cloning | Reproduction d'une voix à partir d'un court enregistrement, sans entraînement. |
| `ref_audio` | Enregistrement base64 passé dans la requête pour cloner une voix pour cette seule requête. |
| Professional voice cloning (PVC) | Clonage à partir de 30 min à 3 h d'audio propre ; le schéma API distingue `kind: ivc` (instant) et `pvc` (professionnel). |
| `retention_notice` | Durée de rétention (jours) d'une voix sauvegardée : défaut 30, min 1, max 365. |
| `sharing_scope` | Portée de partage d'une voix : `private`, `workspace` ou `global`. |
| Emotion tag | Balise inline `[emotion=<valeur>]` qui colore la diction de la suite du texte. |
| Pace tag | Balise inline `[pace=<valeur>]` qui règle le débit. |
| Disfluency | Son non verbal inline (`[um]`, `[laugh]`, `[breath]`…). |
| Style instruction (`instruction`) | Description en langage naturel de la diction de toute la requête (non disponible au lancement). |
| `expressiveness` | Nombre (1.0–5.0) réglant à quel point la parole suit la voix, le texte et les balises ; anciennement `cfg` (classifier-free guidance). |
| Contextual TTS (`conversation_history`) | Conditionnement de la diction sur les tours audio précédents d'une conversation. |
| `phoneme_hints` / custom pronunciation | Dictionnaire mot → liste de phonèmes IPA, par requête. |
| IPA phoneme (`IPAPhoneme`) | Symbole de l'inventaire fermé de 50 phonèmes accepté par l'API. |
| Time to first audio (TTFA) | Délai entre l'envoi de la requête et le premier son. |
| Voice agent | Agent conversationnel vocal temps réel, bidirectionnel, interruptible. |
| Voice Agents SDK | Partie des SDK `mistralai` (Python, extra `voice-agents`) et `@mistralai/mistralai` (TS, sous-chemins `extra/voice-agents`) qui gère tout le pipeline. |
| Agent (voice) | Configuration sauvegardée et versionnée : instructions, modèles par étape, voix, déclarations d'outils, message d'accueil, interruptions. |
| Session (`VoiceAgentSession`) | Une conversation live exécutant une configuration (inline ou d'un agent sauvegardé). |
| Agent options / session options | Options de `init()` enregistrables sur un agent vs options propres à la session ouverte. |
| Turn / turn detection | Tour de parole ; détection de fin de tour par le modèle de transcription Voxtral 3 realtime. |
| Eager end | Fin de tour « probable » détectée tôt (seuil `eager_end_threshold`). |
| Interruption (barge-in) | L'utilisateur parle par-dessus l'agent (`allow_interruptions`). |
| Inactivity reminders | Relances vocales quand l'utilisateur reste silencieux (`turn.inactivity`). |
| Welcome message | Phrase dite par l'agent à la connexion de la session. |
| Server-side tools | Outils exécutés chez Mistral : `web_search`, `document_library`, `connector`. |
| Client-side tools | Fonctions de l'application déclarées au modèle ; le handler s'exécute dans le code de l'application. |
| Unhandled tool | Outil client déclaré (ex. sur un agent sauvegardé) sans handler dans l'application courante. |
| Filler | Courte phrase dite dans la voix de l'agent pendant l'exécution d'un outil (`StaticToolFiller`). |
| Audio interface | Objet qui capture l'audio utilisateur et joue l'audio de l'agent (`DefaultAudioInterface` ou implémentation de `AudioInterface`). |
| Manual audio | Mode sans interface : `send_audio()` + événement `audio`. |
| Preflight | Vérification de l'interface audio avant la création de la session. |
| Webhook endpoint / subscription | URL réceptrice + secret de signature / rattachement d'un endpoint à un agent pour des types d'événements. |
| `x-mistral-signature` | En-tête HMAC-SHA256 du corps brut, préfixé `hmac-sha256=`. |
| SIP | Protocole de téléphonie IP : l'opérateur, l'IPBX ou le centre de contact de l'entreprise transfère l'appel vers un endpoint SIP Mistral. |
| LiveKit | Couche de transport audio temps réel sur laquelle le SDK est construit (rooms, participant token). |
| `participantToken` / `serverUrl` | Identifiants de connexion renvoyés par `sessions.create()`, transmis au navigateur. |

## 3. Fonctionnalités en détail

### 3.1 Modes et modèles TTS

**Choix du mode selon le texte disponible** (page Overview) :

| Ce que vous avez | Mode | Page |
| --- | --- | --- |
| Texte complet (script, article, message) | Offline | Speech generation |
| Texte complet + auditeur qui attend | Offline, audio streamé pendant la génération | Stream speech |
| Texte encore en cours d'écriture (réponse d'un modèle) | *(cellules vides dans la doc)* | — |
| Conversation où l'application répond à la voix | Realtime, piloté par un agent vocal | Voice agents |

**Modèles** :

| Modèle | ID | Mode | Usage |
| --- | --- | --- | --- |
| Voxtral TTS 3 | `voxtral-mini-tts-3-0` | Offline | Texte complet, voix préréglées ou clonées, balises émotion/rythme, prononciation personnalisée, streaming de l'audio. |
| Voxtral TTS Realtime 3 | `voxtral-mini-tts-realtime-3-0` | Realtime | *(description vide)* |

- Les langues et dialectes par modèle sont renvoyés vers une page « Languages » (`/studio/audio/specs-and-limits/languages`, hors périmètre).
- Section « Deprecated models » : renvoie à « Migrate from Voxtral 2 » (`/studio/audio/migrate-from-voxtral-2`, hors périmètre) ; la phrase d'introduction est absente.
- Dans la configuration des agents vocaux, les IDs TTS diffèrent : `voxtral-mini-tts-3` (Voxtral TTS 3, recommandé) et `voxtral-mini-tts-2603` (Voxtral TTS 2). Voir §8.

**Fonctionnalités par mode (Offline)** :

| Fonctionnalité | Offline | Rôle |
| --- | --- | --- |
| Voix préréglées | Oui | Choisir une voix par ID. |
| Clonage zero-shot | Oui | Reproduire une voix depuis un court enregistrement ; la sauvegarder pour réutilisation. |
| Balises émotion et rythme | Oui : 34 émotions, rythmes `slow` et `fast` | Diriger la diction inline, mot à mot. |
| Instructions de style | Non (pas disponible au lancement) | Décrire la diction de toute la requête. |
| Prononciation personnalisée | Oui | Phonèmes d'un nom ou terme. |
| Expressivité | Nombre ≥ 1.0, défaut fixé par le service | Force avec laquelle la parole suit voix, texte et balises. |
| Réponse streamée | Oui | Lecture avant la fin du fichier. |
| TTS contextuel | Oui | Conditionner la diction sur l'audio de la conversation précédente. |
| Formats de sortie | `mp3`, `wav`, `pcm`, `flac`, `opus` | — |

(Commentaire interne : le tableau a été validé par tests du 7 octobre sur `voxtral-mini-tts-3-0` ; « Conversation history left out on purpose: accepted only with Voxtral 3 voices and the audio looped in 9 of 14 runs » — alors que la ligne « Contextual TTS » figure bien dans le tableau publié.)

### 3.2 Génération de parole — `POST /v1/audio/speech`

**Comportement** : une requête `POST` avec le texte et une voix ; la réponse JSON porte l'audio encodé en base64 dans `audio_data`, à décoder et enregistrer. Format par défaut : `mp3`.

**Champs de requête** (ceux qui changent le résultat, selon la page ; la spec OpenAPI complète est donnée en §5) :

| Champ | Type | Défaut | Valeurs | Effet |
| --- | --- | --- | --- | --- |
| `model` | string | — | `voxtral-mini-tts-3-0` (doc actuelle) | Modèle de synthèse. |
| `input` | string (requis) | — | texte, peut contenir des balises `[emotion=…]`, `[pace=…]`, disfluences | Texte à dire. |
| `voice_id` | string | — | slug préréglé (`gb_jane_neutral`, `voice_478`) ou UUID d'une voix sauvegardée | Voix utilisée ; ID inconnu → 404. |
| `ref_audio` | string base64 | — | MP3 ou WAV encodé, pas d'URL | Clone une voix pour cette requête seulement, à la place de `voice_id`. |
| `response_format` | enum | `mp3` | `mp3`, `wav`, `pcm`, `flac`, `opus` | Format audio. |
| `expressiveness` | number | fixé par le service | `1.0` à `5.0` | Voir §3.3. |
| `instruction` | string | — | phrase en langage naturel | Instructions de style — **non disponibles au lancement** (400). |
| `phoneme_hints` | objet mot → liste de phonèmes | — | 50 phonèmes IPA | Prononciation personnalisée (§3.11). |
| `stream` | boolean | `false` | `true` | Audio en morceaux SSE (§3.5). |
| `conversation_history` | array | — | tours `user`/`assistant` | TTS contextuel (§3.4). |

**Réponse** : `{"audio_data": "<base64>"}` (spec OpenAPI : objet `SpeechResponse`, `audio_data` requis, `additionalProperties: false`).

**Exemple minimal (curl)** :
```bash
curl -s https://api.mistral.ai/v1/audio/speech \
  -H "Authorization: Bearer $MISTRAL_API_KEY" -H "Content-Type: application/json" \
  -d '{"model": "voxtral-mini-tts-3-0", "input": "Your order shipped this morning.",
       "voice_id": "gb_jane_neutral", "response_format": "mp3"}' \
  | jq -r '.audio_data' | base64 --decode > order_update.mp3
```
SDK : Python `client.audio.speech.complete(model=..., input=..., voice_id=..., response_format=...)` → `response.audio_data` ; TypeScript `client.audio.speech.complete({ model, input, voiceId, responseFormat })` → `response.audioData`.

**Quickstart TTS** : installer `pip install mistralai sounddevice soundfile` (Python, lecture immédiate) ou `npm install @mistralai/mistralai play-sound` (TS, sauvegarde puis lecture) ; la variante curl utilise `jq` pour décoder. Exemple : voix `gb_jane_neutral`, format `wav`, lecture `afplay` (macOS) / `aplay` (Linux).

**Erreurs fréquentes** (page Speech generation) :

| Symptôme | Cause | Correctif |
| --- | --- | --- |
| `404`, type `invalid_voice` : `Voice 'x' not found.` | Slug/ID absent du catalogue ou de l'espace de travail | Lister les voix, copier le slug ou l'ID exact. |
| `400` : `Either ref_audio or voice must be provided.` | Aucune voix dans la requête | Ajouter `voice_id`. |
| Nom, marque ou acronyme mal prononcé | La voix devine la lecture à partir de l'orthographe | `phoneme_hints`. |

(Commentaires internes : `404 invalid_voice` porte le code `1902` ; la RFC-555 annonçait un 400 ; envoyer `voice` et `voice_id` ensemble renvoie un **500** — bug interne non publié ; points à vérifier : nom définitif du champ voix (`voice` ou `voice_id`), statut de `ref_audio` au lancement, **limite de longueur de `input`** inconnue.)

### 3.3 Expressivité — `expressiveness`

- Plage `1.0` à `5.0`. Une valeur plus haute **échange similarité et stabilité de la voix contre une diction plus marquée**. Conseil : partir du défaut, monter si l'émotion ne passe pas, baisser si la parole sonne forcée.
- Anciennement `cfg` (classifier-free guidance ; `1.0` = pas de guidage supplémentaire). Commentaires internes : le 7 octobre l'API acceptait encore `cfg` (< 1.0 → 422 ; 1.0 à 10.0 acceptés) ; le 9 octobre, `expressiveness` renvoyait **422 `extra_forbidden`** (renommage pas encore déployé).
- Côté agents vocaux, `tts.expressiveness` est marqué « Voxtral TTS 3 only » et **« Not available yet: this option is disabled for now »**.
- La spec OpenAPI locale de `SpeechRequest` ne contient ni `expressiveness` ni `cfg` (le schéma accepte des propriétés additionnelles).

### 3.4 TTS contextuel — `conversation_history`

- **But** : adapter ton, rythme et emphase de la réponse au fil de la conversation. `voice_id` fixe la voix et l'accent ; l'historique influence seulement la façon de dire. Sans historique, la réponse est générée « à l'aveugle » (adapté aux annonces, prompts, lecture d'article).
- **Forme** : tableau de tours, du plus ancien au plus récent :
  - tour `user` : `{"role": "user", "audio": {"data": "<base64>"}}` ;
  - tour `assistant` : `{"role": "assistant", "text": "...", "audio": {"data": "<base64>"}}` (`text` obligatoire).
- **Règles** : historique non vide, alternance stricte `user`/`assistant`, **dernier tour = `user`** ; le nouvel `input` est la réponse de l'assistant à ce dernier tour.
- **Contraintes** : exige une **voix préréglée Voxtral 3** (`voice_id`) ; **incompatible avec `ref_audio`, `instruction` et `realtime_context`** (ce dernier champ n'est documenté nulle part ailleurs).
- **SDK** : en Python, passé via `additional_properties={"conversation_history": [...]}` (pas de paramètre typé) ; en TypeScript, la clé `conversation_history` (snake_case) est passée telle quelle dans l'objet de `speech.complete`. Exemple avec `voice_592` (Marie, française) sur un texte anglais.

### 3.5 Streaming de la parole (SSE)

- Requête identique avec `stream: true`. Le **texte reste envoyé en entier** ; seul l'audio revient en morceaux, en **server-sent events**. Streamer ne fait pas de la requête une session temps réel.

| Événement | Champs | Action de l'application |
| --- | --- | --- |
| `speech.audio.delta` | `audio_data` : morceau base64 | Décoder, passer au lecteur ou ajouter au fichier. |
| `speech.audio.done` | `usage` | Fin de l'audio. |

- Les morceaux arrivent **dans l'ordre** ; concaténés, ils forment un fichier unique au `response_format` demandé (identique à une requête non streamée).
- SDK Python : `with client.audio.speech.complete(..., stream=True) as stream: for event in stream:` puis `event.event == "speech.audio.delta"` et `event.data.audio_data`. TypeScript : `for await (const event of stream)` avec test sur `event.data.type` et lecture de `event.data.audioData` / `event.data.usage`.
- **Tampon du lecteur** : plus petit → premier son plus tôt mais risque de trous ; plus grand → lecture fluide mais attente plus longue. Conseil : garder le tampon par défaut, ne le réduire que si le premier son arrive trop tard ; tester sur le réseau réel des utilisateurs.
- **Mesurer le TTFA** à deux endroits : (1) envoi → premier `speech.audio.delta` (API + réseau) ; (2) envoi → premier son dans le lecteur (ajoute le tampon ; c'est ce que perçoit l'auditeur). Mesurer sur de nombreuses requêtes et surveiller les plus lentes (phrase partiellement tronquée dans la doc).
- **Section « Stream text as it's written » vide** : la session WebSocket temps réel (texte envoyé au fil de l'eau) est « parquée en brouillon » jusqu'à la sortie de TTS Realtime 3 (commentaire interne ; la RFC-555 prévoit que `ref_audio` soit **retiré en offline mais conservé en streaming realtime**).
- Mesures internes (7 octobre, non publiées) : 10 morceaux, premier audio à ~0,48 s, total 1,34 s pour ~12,5 s de MP3 ; `usage.completion_tokens` = 203 520 puis 195 840 pour 12,5 s d'audio, jugé anormal (question ouverte).
- **Problèmes fréquents** : rien ne joue avant la fin (le client lit toute la réponse avant de la transmettre → lire les événements au fil de l'eau) ; trous/bégaiements (tampon épuisé → l'augmenter ou vérifier le réseau) ; fichier illisible (morceaux désordonnés ou perdus → décoder chaque delta et écrire dans l'ordre d'arrivée).

### 3.6 Catalogue de voix préréglées

**Voxtral 3 voices** (36 voix ; genre donné par la page Agent configuration) :

| Voix | `voice_id` | Langue | Genre |
| --- | --- | --- | --- |
| Sheila | `voice_478` | English (US) | F |
| Margaret | `voice_447` | English (US) | F |
| Rob | `voice_485` | English (US) | M |
| James | `voice_3150` | English (US) | M |
| Mary | `voice_1787` | English (UK) | F |
| Sky | `voice_1786` | English (UK) | F |
| David | `voice_1788` | English (UK) | M |
| Harriet | `voice_590` | English (UK) | F |
| Fred | `voice_591` | English (UK) | M |
| Hugo | `voice_3149` | English (UK) | M |
| Howard | `voice_3147` | English (UK) | M |
| Marie | `voice_592` | French | F |
| Manon | `voice_3137` | French | F |
| Lea | `voice_589` | French | F |
| Camille | `voice_3141` | French | F |
| Elena | `voice_483` | Spanish | F |
| Heidi | `voice_481` | German | F |
| Lorenzo | `voice_482` | Italian | M |
| Gabriela | `voice_480` | Portuguese | F |
| Maryam | `voice_479` | Arabic | F |
| Jordi | `voice_3143` | Catalan | M |
| Ananya | `voice_3139` | Hindi | F |
| Himanshu | `voice_3153` | Hindi | M |
| Olivia | `voice_3146` | Hungarian | F |
| Haruto | `voice_3133` | Japanese | M |
| Sung | `voice_3136` | Korean | M |
| Jin | `voice_3135` | Korean | M |
| Lotte | `voice_3145` | Dutch | F |
| Lars | `voice_3134` | Norwegian | M |
| Leon | `voice_3154` | Polish | M |
| Irina | `voice_3155` | Romanian | F |
| Tatiana | `voice_3132` | Russian | F |
| Oran | `voice_3138` | Turkish | M |
| Taras | `voice_3140` | Ukrainian | M |
| Huong | `voice_3144` | Vietnamese | F |
| Mei | `voice_3142` | Chinese | F |

**Voxtral 2 preset voices** (30 IDs ; « Voxtral 3 still accepts these presets » ; une variante par émotion) :

| Locuteur | Langue | Voice IDs |
| --- | --- | --- |
| Paul | English US (`en_us`) | `en_paul_neutral`, `en_paul_happy`, `en_paul_cheerful`, `en_paul_excited`, `en_paul_confident`, `en_paul_sad`, `en_paul_frustrated`, `en_paul_angry` |
| Jane | English UK (`en_gb`) | `gb_jane_neutral`, `gb_jane_confident`, `gb_jane_curious`, `gb_jane_confused`, `gb_jane_sarcasm`, `gb_jane_sad`, `gb_jane_shameful`, `gb_jane_jealousy`, `gb_jane_frustrated` |
| Oliver | English UK (`en_gb`) | `gb_oliver_neutral`, `gb_oliver_cheerful`, `gb_oliver_excited`, `gb_oliver_confident`, `gb_oliver_curious`, `gb_oliver_sad`, `gb_oliver_angry` |
| Marie | French (`fr_fr`) | `fr_marie_neutral`, `fr_marie_happy`, `fr_marie_excited`, `fr_marie_curious`, `fr_marie_sad`, `fr_marie_angry` |

- Astuce de la doc : avec les voix Voxtral 3, on garde **une seule voix** et on règle l'émotion inline par balises.
- Commentaires internes : pas de drapeau de dépréciation sur les presets Voxtral 2 ; « current checkpoints have some issues with them » ; les balises de rythme changent la durée sur les voix Voxtral 3 mais à peine sur `gb_jane_neutral`. L'API renvoie aussi un champ `gender` pour chaque preset (colonne non affichée sur la page Voices, affichée sur Agent configuration).
- **Utiliser une voix** : passer son ID dans `voice_id`. Preset → slug ; voix sauvegardée → pas de slug, utiliser l'ID (UUID) renvoyé à la création. ID inconnu → 404.

### 3.7 Gestion des voix (CRUD, partage, rétention)

| Opération | Méthode SDK (Python, mistralai 3.x) | S'applique à |
| --- | --- | --- |
| Lister | `voices.search` | Presets et voix sauvegardées ; champ `type` = `preset` ou `custom`. |
| Écouter | `voices.get_sample_audio` | *(cellule vide)* — en pratique presets Voxtral 2 et voix sauvegardées (voir ci-dessous) |
| Créer | `voices.create` | Nouvelle voix sauvegardée, clonée depuis un enregistrement |
| Lire, renommer, supprimer | `voices.get`, `voices.update`, `voices.delete` | Voix sauvegardées |

- **Lister** (Python) : `page = client.audio.voices.search(page_size=50)` puis boucle `page.result.data` / `page = page.next()`. Champs affichés : `slug or id`, `name`, `type`, `languages`.
- **TypeScript** : le SDK TS 2.7.0 **n'a pas `voices.search`** et son `voices.list` utilise l'endpoint v1 en perdant le champ `type` ; l'exemple TS appelle donc `GET https://api.mistral.ai/v2/audio/voices?page_size=50&page_token=…` avec `fetch` (réponse `data` + `next_page_token`).
- `voices.list` est **marqué déprécié** dans le SDK (DeprecationWarning « Use GET /v2/audio/voices »). Spec : `GET /v1/audio/voices` (offset) `deprecated: true`, `x-deprecation-date: 2026-09-07`, `x-sunset-date: 2027-03-31`.
- **Écouter un échantillon** : Python `client.audio.voices.get_sample_audio(voice_id="gb_jane_neutral")` renvoie un objet réponse (`.read()`, `.close()`, `.headers['content-type']`) ; TS `client.audio.voices.getSampleAudio({ voiceId })` renvoie un flux. Tests internes : `audio/wav` pour presets Voxtral 2 et voix sauvegardées, mais **404 « Voice not found or no sample available »** pour les voix Voxtral 3 testées.
- **Créer** : `client.audio.voices.create(name="Support agent", sample_audio=<base64>, sample_filename="voice_sample.mp3", languages=["en"])` → `voice.id` ; TS `{ name, sampleAudio, sampleFilename, languages }`.
- **Lire / mettre à jour / supprimer** : `voices.get(voice_id=…)`, `voices.update(voice_id=…, name="Support agent (EU)")` (TS : `update({ voiceId, voiceUpdateRequest: { name } })`), `voices.delete(voice_id=…)`.
- **Rétention** : chaque voix sauvegardée porte `retention_notice` (jours) — **défaut 30, min 1, max 365** — réglable à la création ou la mise à jour via l'API ; les voix créées depuis l'interface **AI Studio** ont 30 jours par défaut.
- **Partage** : les voix sauvegardées peuvent être partagées dans l'espace de travail. Le partage se gère **dans l'interface AI Studio** : les **administrateurs du workspace** décident si une voix est privée ou partagée. Le champ `sharing_scope` de la liste indique `private`, `workspace` ou `global`. Les endpoints de partage sont **internes** pour l'instant. (Le schéma `VoiceResponse` de la spec locale ne contient pas `sharing_scope`.)
- Tests internes : la liste du 7 octobre renvoyait 42 voix (9 presets Voxtral 3, 30 presets Voxtral 2, 3 voix custom avec `slug: null`) ; les IDs de voix sauvegardées sont des UUID acceptés comme `voice_id`.

### 3.8 Clonage de voix

**Préparer le clip de référence** :
- **Format** : fichier MP3 ou WAV.
- **Encodage** : l'audio lui-même encodé en base64 ; **une URL n'est pas acceptée** (→ 400, code `3291`, « Failed to load audio file. Verify that the given file is valid mp3 or wav. »).
- **Contenu** : *(laissé vide dans la doc)*. Les sources internes citent des durées contradictoires : PRD 2–3 s, RFC-600 3–30 s (obsolète), test réel 11 s ; l'ancienne doc demandait 3–25 s (§7).

**Clonage pour une requête** : passer `ref_audio` (base64) ; la voix n'est pas sauvegardée. Python `ref_audio=base64...` ; TS `refAudio`. En curl, l'exemple construit le JSON avec `jq -n --arg ref_audio "$(base64 < voice_sample.mp3 | tr -d '\n')"`.

**Sauvegarder une voix clonée** : `voices.create(...)` puis `voice_id=voice.id` dans `speech.complete`. Gestion via §3.7.

**Utilisation dans d'autres langues** : une voix clonée n'est pas limitée à la langue de son enregistrement (le reste de la phrase est tronqué ; renvoi vers la page Languages).

**Clonage professionnel (PVC)** : recommandé 30 min à 3 h d'audio propre et de haute qualité, **un seul locuteur** ; pièce calme, peu d'écho ; même micro, même distance, même installation tout du long (« la cohérence compte plus que la durée ») ; parler naturellement dans le style visé ; inclure une gamme d'émotions selon l'usage (un ton plat uniforme rend la voix robotique) ; éviter bruit de fond, musique, longues pauses, traitement lourd (réduction de bruit, effets). Aucune procédure ni endpoint pour commander un PVC n'est documenté (le schéma de voix distingue `kind: ivc|pvc`).

**Pièges** : envoyer `ref_audio` **et** `voice_id` ensemble renvoie 200 sans qu'on sache lequel l'emporte (commentaire interne) ; la RFC-555 annonce la suppression de `ref_audio` en offline, alors qu'il fonctionnait encore le 7 octobre.

**Dépannage clonage** : un clone copie aussi les conditions d'enregistrement et l'humeur (→ enregistrer un clip propre, un locuteur, dans le style voulu) ; la voix varie d'une requête à l'autre parce que chaque requête clone depuis le clip reçu (→ sauvegarder la voix et passer son ID).

### 3.9 Balises d'émotion, de rythme et disfluences

**Syntaxe commune** :

| Règle | Détail |
| --- | --- |
| Format | `[emotion=<valeur>]` ou `[pace=<valeur>]` |
| Position | Dans `input`, avant le texte visé : en début ou au milieu d'une phrase |
| Prononcée ? | Non, la balise n'est pas lue |
| Combinaison | Une balise émotion et une balise rythme à la suite : `[emotion=calm][pace=slow]` |
| Limite | Pas plus d'une balise du même type sur la même portion de texte |
| Portée | De la position de la balise jusqu'à la balise suivante ou la fin de l'input |

**34 émotions acceptées** : `amused`, `angry`, `anxious`, `apologetic`, `appreciative`, `assertive`, `bored`, `calm`, `confident`, `confused`, `critical`, `curious`, `determined`, `disappointed`, `disgusted`, `excited`, `frustrated`, `grateful`, `happy`, `hopeful`, `playful`, `proud`, `reflective`, `resigned`, `sad`, `sarcastic`, `skeptical`, `somber`, `surprised`, `tense`, `tired`, `urgent`, `warm`, `wistful`.

**Rythmes (pace)** — tableau publié :

| Valeur | Effet |
| --- | --- |
| `very-slow` | Beaucoup plus lent que le débit normal |
| `slow` | Plus lent |
| `moderate` | Débit modéré |
| `fast` | Plus rapide |
| `very-fast` | Beaucoup plus rapide |

⚠️ Contradiction : la page Overview annonce « les rythmes `slow` et `fast` » seulement, et un commentaire interne (9 octobre) indique que seuls `slow`/`fast` existent (`medium` retiré). Mesure interne sur `voice_478` : slow 2,72 s, medium 2,40 s, fast 2,08 s pour la même phrase.

**Valeurs non supportées** : l'API **ne rejette pas** une valeur hors liste (`[emotion=ecstatic]`, `[pace=turbo]`) : réponse normale, balise non prononcée, sans effet audible.

**Disfluences** (liste non exhaustive, même syntaxe `[...]` inline) : `[um]`, `[uh]`, `[laugh]`, `[breath]`, `[sigh]`, `[gasp]`, `[sniff]`, `[cough]`, `[throat clearing]`, `[yawn]`, `[chuckle]`, `[laugh hard]`, `[gasping]`, `[rire]`.

**Langues** : émotions, rythmes et disfluences fonctionnent en anglais ; **non testés mais attendus** en français, allemand, espagnol, italien, portugais et hindi.

**Combinaison avec une instruction de style** : section renvoyant au fait que les instructions ne sont pas disponibles.

**Défaut qualité connu** : sur les voix Voxtral 3, une balise devant une phrase à deux propositions séparées par une virgule coupe souvent l'audio après la première proposition (ex. 6 cas sur 6 avec `[emotion=sad]`, voix `voice_478` et `voice_485` ; pas sur `gb_jane_neutral`). La page Troubleshooting le publie : « A tag before a long sentence can end the audio early, at a comma » → garder les phrases balisées courtes ou couper la phrase.

### 3.10 Instructions de style — `instruction` (non disponibles)

- Bandeau `:::caution` : **« Style instructions are not available at launch. The `instruction` parameter is not supported on the current Voxtral TTS 3 checkpoint »** ; la page décrit le comportement prévu.
- Usage prévu : champ `instruction` (singulier), une courte phrase (ex. « A calm, slow delivery. ») qui fixe une diction unique pour **tout** l'input ; ne change ni le texte ni la voix (continuer à choisir la voix avec `voice_id`). Pour une portion du texte, utiliser les balises.

| Réglage | S'applique à |
| --- | --- |
| `instruction` | Tout l'input |
| Balises émotion/rythme | Une partie du texte |
| `expressiveness` | Intensité globale (similarité/stabilité vs diction marquée) |

- **Erreurs** : `422 Extra inputs are not permitted` si le champ est mal orthographié (`instructions`) ; `422` type `string_type` si la valeur n'est pas une chaîne ; **400 code `3051` « instruction is not supported for this model. »** sur le checkpoint actuel (commentaire interne) ; une limite de longueur (sans troncature automatique) et un refus « modèle non compatible » sont prévus mais leurs messages sont remplacés par « Style instructions are not available at launch. » dans les tableaux.
- Les exemples Python/TS passent par `httpx`/`fetch` car `mistralai` 3.0.0 et 3.1.0 n'ont pas de paramètre `instruction`.

### 3.11 Prononciation personnalisée — `phoneme_hints`

- **Forme** : objet qui associe un mot de `input` à la **liste ordonnée** de ses phonèmes, chaque phonème étant une chaîne : `"phoneme_hints": {"tomato": ["t", "ə", "m", "ɑ", "t", "oʊ"]}`. Le reste de la phrase est lu normalement.
- **Règles** : une clé par mot à corriger (autant de mots que nécessaire) ; **par requête** (à renvoyer à chaque requête contenant le mot ; aucun lexique sauvegardé) ; clés multi-mots acceptées (« Le Chat », test interne) ; acceptées sur voix Voxtral 3 et presets Voxtral 2 ; voix clonées non testées. Spec OpenAPI : mot **sensible à la casse** (« (case-sensitive) word »). Côté agents vocaux : « Words are case-sensitive. Only English phonemes are supported ».
- **Inventaire accepté (50 phonèmes, enum `IPAPhoneme`)** :

| Groupe | Phonèmes |
| --- | --- |
| Voyelles (15) | `a` `e` `i` `o` `u` `æ` `ɑ` `ɔ` `ə` `ɚ` `ɛ` `ɜ` `ɪ` `ʊ` `ʌ` |
| Diphtongues (5) | `aɪ` `aʊ` `eɪ` `oʊ` `ɔɪ` |
| Consonnes (30) | `b` `d` `dʒ` `f` `g` `h` `j` `k` `l` `m` `n` `p` `s` `t` `tʃ` `v` `w` `z` `ð` `ŋ` `ɖ` `ɱ` `ɹ` `ɾ` `ʃ` `ʈ` `ʋ` `ʒ` `ʔ` `θ` |

- **Pièges** : r anglais = `ɹ` (la lettre `r` est refusée) ; taper `g` ASCII, pas le caractère IPA `ɡ` ; diphtongues et affriquées (`oʊ`, `tʃ`, `dʒ`) en **une seule entrée** ; pas de marques d'accent ni de longueur (`ˈ`, `ː`) ; pas de sons d'autres langues comme le `ʁ` français ou les voyelles nasales.
- **Erreur** : un seul phonème invalide fait rejeter **toute** la requête avec un `422` (type `enum`) dont le message liste les phonèmes acceptés. En agent vocal, le rejet survient à la création de la session ou à l'enregistrement de l'agent.
- La spec qualifie l'enum d'« append-only » (nouveaux phonèmes ajoutés à la fin, par ex. pour de futures langues).
- `mistralai` 3.1.0 type le champ `phoneme_hints: Dict[str, List[IPAPhoneme]]` ; les exemples publiés utilisent `httpx` / `fetch`.
- Questions ouvertes internes : support realtime, lexique réutilisable, mots non anglais, nombre maximal d'entrées, sensibilité à la casse, caractère définitif de la liste.

### 3.12 Dépannage TTS

**Forme des erreurs** :
```json
{"object": "error", "message": "Voice '01a0f6db-…' not found.", "type": "invalid_voice",
 "param": null, "code": "1902", "raw_status_code": 404}
```
Un `422` de validation porte l'explication dans `message.detail` (liste d'objets avec `type`, `loc`, `msg`, `input`), `type: invalid_request_error`, `code: null`.

**Erreurs de requête** :

| Erreur | Cause | Correctif |
| --- | --- | --- |
| 404 `Voice 'x' not found.` | `voice_id` inconnu (preset ou voix du workspace) | Lister les voix, copier slug/ID exact |
| 400 `Either ref_audio or voice must be provided.` | Pas de voix | Ajouter `voice_id` |
| 422 `Extra inputs are not permitted` | Champ mal nommé ou inconnu (ex. `instructions`) | Corriger le nom |
| *(message vide)* | `expressiveness` hors plage | Valeur de `1.0` à `5.0` |
| 422, message listant les phonèmes | Phonème hors liste dans `phoneme_hints` | Remplacer |
| 422 type `string_type` | `instruction` n'est pas une chaîne | Envoyer du texte |
| *(« not available at launch »)* | Instruction trop longue / modèle sans support | Raccourcir / autre modèle |
| 400 `Failed to load audio file. Verify that the given file is valid mp3 or wav.` | `ref_audio` est une URL ou pas un MP3/WAV | Envoyer l'enregistrement en base64 |

Non publiés volontairement (commentaires internes) : `voice` + `voice_id` → 500 « Service unavailable. » ; `GET /v2/audio/voices` avec une taille de page > 100 → 422 « Input should be less than or equal to 100 ».

**Symptômes de diction** : parole plate → ajouter une balise d'émotion puis monter `expressiveness` ; parole forcée → baisser `expressiveness` ; balise sans effet → valeur hors liste ; audio coupé après la première partie d'une phrase balisée → phrases courtes.
**Premier son lent** : la requête non streamée attend tout l'audio → streamer (le temps total reste le même) ; rien ne joue malgré le streaming → lire les événements au fil de l'eau ; TTFA variable → mesurer sur beaucoup de requêtes, depuis l'endroit où tourne l'application.
**Voix clonées** : voir §3.8.

Dérive relevée en interne le 9 octobre (non publiée) : `GET /v2/audio/voices` listait 33 voix (30 presets Voxtral 2 + 3 custom) **sans aucune voix Voxtral 3**, et une requête avec `voice_478` renvoyait 404.

### 3.13 Agents vocaux : vue d'ensemble et pipeline

- **Ce que fait le SDK** : capte la voix, la transcrit, génère une réponse avec un modèle, la synthétise et la joue. Le développeur écrit l'application autour : ce que sait l'agent, ses outils, ce qui se passe en fin d'appel. L'utilisateur peut **interrompre l'agent en pleine phrase** ; l'agent peut chercher sur le web, interroger des bibliothèques de documents, appeler des connecteurs du workspace ou exécuter des fonctions de l'application.
- **Un tour de pipeline** (diagramme `voice_agent_pipeline.svg`) : voie haute = application (micro, haut-parleur, outils client) ; voie basse = Mistral (transcription, modèle, synthèse, outils serveur). Les boîtes en pointillé ne s'exécutent que si le modèle appelle un outil.

| Étape | Rôle | Référence |
| --- | --- | --- |
| Transcription | Transcrit la parole pendant qu'elle est prononcée et **détecte la fin du tour** | Turns and turn-taking |
| Modèle | Lit la conversation, écrit la réponse, appelle des outils (serveur chez Mistral, client dans l'application) | Tools |
| Speech | Dit la réponse dans la voix de l'agent | Voices |

- Les étapes forment une chaîne : chacune ajoute à l'attente de l'utilisateur (renvoi vers le concept Latency). Commentaire interne : **pas de chiffre de latence par tour** ; l'équipe SDK confirme que ce n'est **pas sous 1 s aujourd'hui**. Commentaire interne : la transcription utilise par défaut `voxtral-mini-realtime-latest`.
- **Au téléphone**, le téléphone de l'appelant remplace micro et haut-parleur, aucun code de l'application ne tourne : les outils client échouent, il faut des outils serveur.
- **Transport** : le SDK s'appuie sur **LiveKit** pour l'audio temps réel et ajoute les bindings Python/TypeScript et le pont vers les modèles Mistral ; « pas besoin de connaître LiveKit ».
- **Choisir son parcours** :

| Besoin | Construire avec | À savoir |
| --- | --- | --- |
| Agent sur sa machine ou son serveur | SDK Python ou Node.js | Pipeline complet, micro et haut-parleurs de la machine (quickstart) |
| Voix dans une web app | SDK navigateur (TypeScript) | Le serveur crée la session (clé jamais dans le navigateur), la page se connecte avec les identifiants renvoyés |
| Agent qui répond au téléphone | Téléphonie (SIP) | Clients entreprise au lancement, via l'account team |
| Contrôle total de chaque étape | Pipeline maison : transcription realtime + modèle de chat + TTS streamé | On possède transport, latence et gestion des tours |

- **Problème fréquent** : SDK installé mais aucun son capté/joué → installer les outils audio natifs (PortAudio pour Python ; SoX et FFmpeg pour Node.js).
- Commentaires internes : les pages sont la documentation canonique du SDK ; la surface du SDK **n'est pas figée** (mises à jour attendues avant la sortie) ; la conception RFC-391 (namespace `client.audio.agent`, package dédié `mistralai-voice-agents` / `@mistralai/voice-agents`, classe `MistralVoiceAgent`, SDK React) est **abandonnée** ; des pages de référence REST sont prévues pour sessions, agents, endpoints et abonnements webhooks ; les **numéros de téléphone** restent enterprise-only sans référence publique.

**Quickstart (« Build a voice agent »)** :
- Prérequis : clé API, micro, haut-parleurs, Python ou Node.js.
- Python : `PyAudio` (donc PortAudio) — macOS `brew install portaudio` ; Linux `sudo apt install libportaudio2 libportaudiocpp0 portaudio19-dev libasound-dev libsndfile1-dev -y` ; puis `pip install "mistralai[voice-agents]"` (l'extra tire PyAudio, LiveKit, NumPy).
- TypeScript : `brew install sox ffmpeg` / `sudo apt install sox ffmpeg` ; `npm install @mistralai/mistralai`.
- Code minimal (Python) :
```python
from mistralai.client import Mistral
from mistralai.extra.voice_agents import DefaultAudioInterface

async with Mistral(api_key=MISTRAL_API_KEY) as client:
    session = await client.audio.sessions.init(
        audio_interface=DefaultAudioInterface(),
        instructions="Please respond to me in the most dramatic way possible.")
    session.on("transcript", lambda e: print(f"{e.role}: {e.content}"))
    async with session:
        await session.wait()
```
- TypeScript : `import { DefaultAudioInterface } from "@mistralai/mistralai/extra/voice-agents/audio/node"` ; `await using session = await client.audio.sessions.init({ audioInterface: new DefaultAudioInterface(), instructions })` ; `session.on("transcript", …)` ; `await session.wait()`.
- Résultat : les paroles s'affichent préfixées `user:` / `assistant:` ; l'agent répond à la pause ; Ctrl+C pour arrêter. Pour changer de voix : `tts={"voice_id": "fr_marie_neutral"}` (TS `tts: { voiceId: … }`).

### 3.14 Agent vs session

| | Agent | Session |
| --- | --- | --- |
| Nature | Configuration sauvegardée et **versionnée** | Une conversation live |
| Durée de vie | Jusqu'à sa suppression | De la connexion jusqu'à la fermeture par l'application ou une erreur fatale |
| Contenu | Comportement : instructions, modèles, voix, **déclarations** d'outils, message d'accueil, interruptibilité | Spécifique à la conversation : interface audio, **handlers** des outils client, options surchargées |
| Combien | Un par usage (ex. une ligne support) | Une par conversation, depuis un agent sauvegardé ou une configuration passée à la connexion |
| Modifier | Créer une nouvelle version | Surcharger des options à la connexion, pour cette session seulement |

**Quand sauvegarder un agent** : une session peut tourner sans agent sauvegardé (configuration complète passée à la connexion — idéal pour expérimenter). Sauvegarder quand la configuration doit survivre à un script : **réutilisation** (SDK, navigateur et ligne téléphonique démarrent du même agent), **changements sûrs** (chaque changement = nouvelle version ; sessions sur la dernière par défaut, épinglage possible), **rattachement de numéros de téléphone et de webhooks** (phrase tronquée dans la doc).

**Déroulé d'une session** :

| Phase | Ce qui se passe | Ce que reçoit l'application |
| --- | --- | --- |
| Start | L'application ouvre la session (ou le serveur pour une page web) ; l'agent peut saluer avec son welcome message | Événement de connexion |
| Conversation | Tours de parole : écoute, réflexion, parole, appels d'outils | Transcriptions, changements d'état de l'agent, appels d'outils |
| End | Fermeture par l'application ou erreur fatale | Événement de déconnexion, avec la raison si ce n'est pas une fermeture normale |

Les **événements de session** atteignent le code qui exécute la session (mise à jour de l'UI) ; les **webhooks** atteignent le backend au début, à la fin ou en cas d'échec d'un appel (archive de l'appel, stockage du transcript).

### 3.15 Configuration — `client.audio.sessions.init()`

Les tables utilisent les noms Python ; en TypeScript, camelCase (`api_key` → `apiKey`, `turn.allow_interruptions` → `turn.allowInterruptions`).

**Le client** (`Mistral`, général, construit une fois, sessions multiples) :

| Paramètre | Type | Défaut | Description |
| --- | --- | --- | --- |
| `api_key` | `str` | requis | Clé API Mistral |
| `server_url` | `str` | `"https://api.mistral.ai"` | URL de base (TS : `serverURL` dans le code, `serverUrl` dans la note) |
| `timeout_ms` | `int` | `60000` | Timeout des requêtes de création et fermeture de session |

**Inline ou sauvegardé** : options d'agent passées à chaque `init()`, ou sauvegardées une fois puis `agent_id`. Avec `agent_id`, la config sauvegardée est la base et toute option d'agent passée à `init()` la **surcharge pour cette session seulement** (l'agent n'est pas modifié). Les options de session s'appliquent toujours. Dans le navigateur, le serveur appelle `client.audio.sessions.create()` qui prend les mêmes options.

**Options d'agent** (enregistrables sur un agent) :

| Option | Type | Défaut | Description |
| --- | --- | --- | --- |
| `llm` | mapping | `mistral-small-latest` | Modèle qui génère les réponses (forme `{"model": …}`) |
| `stt` | mapping | *(vide dans la doc)* | Modèle de transcription + `language` (ISO 639-1, ex. `"fr"`), `context_bias` (termes à favoriser), `target_streaming_delay_ms` (**80 à 1200, défaut 240**), `turn_detection`. `language`, `context_bias` et `turn_detection` exigent un **modèle realtime Voxtral 3**, sinon **422** |
| `tts` | mapping | *(vide)* | Modèle TTS et voix (`voice_id`), `phoneme_hints`, `expressiveness` |
| `instructions` | `str` | None | Prompt système |
| `tools` | liste | None | Outils (§3.18) |
| `welcome_message` | `str` | None | Phrase dite à la connexion |
| `turn` | mapping | `allow_interruptions=True` | Gestion des tours, interruptions, inactivité |

**Options de session** :

| Option | Type | Défaut | Description |
| --- | --- | --- | --- |
| `agent_id` | `str` | None | Démarrer depuis un agent sauvegardé |
| `agent_version` | `int` | dernière | Épingler une version de `agent_id` |
| `audio_interface` | `AudioInterface` | None | Entrée/sortie audio ; l'omettre pour gérer l'audio soi-même |
| `http_headers` | mapping `str`→`str` | None | En-têtes supplémentaires pour la requête de création de session |

**Détection de fin de tour** (`stt.turn_detection`, modèle Voxtral 3 realtime ; sans elle, détection par défaut du modèle ; `{}` = défauts serveur) :

| Champ | Plage | Défaut serveur | Effet |
| --- | --- | --- | --- |
| `start_threshold` | 0–1 | 0.5 | Début/reprise de parole ; monter si les tours démarrent trop facilement (bruit) |
| `eager_end_threshold` | 0–1 | 0.5 | L'utilisateur a peut-être fini ; baisser si les « eager ends » se déclenchent trop |
| `end_threshold` | 0–1 | 0.33 | L'utilisateur a fini ; baisser pour moins couper la parole, au prix d'une réponse plus tardive |
| `min_silence_ms` | ≥ 0 | 500 | Pause minimale avant fin de tour ; augmenter pour moins de fins prématurées |
| `end_timeout_ms` | ≥ 0 | 3000 | Pause maximale avant fin de tour forcée ; diminuer pour plafonner l'attente |

Exemple : `stt={"model": "voxtral-mini-transcribe-realtime-3", "turn_detection": {"min_silence_ms": 300}}`. Un preset « Aggressive » plus rapide est mentionné (page STT Turn detection, hors périmètre). Commentaire interne : alias intérimaire `voxtral-transcribe-realtime-3` remplacé par l'ID final `voxtral-mini-transcribe-realtime-3`.

**Text-to-speech (`tts`)** :

| Champ | Disponibilité | Description |
| --- | --- | --- |
| `model` | Tous | `voxtral-mini-tts-3` (Voxtral TTS 3, recommandé) ou `voxtral-mini-tts-2603` (Voxtral TTS 2) |
| `voice_id` | Tous | Voix selon le modèle |
| `phoneme_hints` | Voxtral TTS 3 only | Mot (sensible à la casse) → liste de phonèmes IPA ; **phonèmes anglais uniquement** ; phonème invalide rejeté à la création de session ou à l'enregistrement de l'agent |
| `expressiveness` | Voxtral TTS 3 only | **Pas encore disponible, désactivée** ; réglera l'expressivité de 1.0 à 5.0 |

Exemple : `tts={"model": "voxtral-mini-tts-3", "voice_id": "voice_447", "phoneme_hints": {"Mistral": ["m","ɪ","s","t","ɹ","ɑ","l"]}}`.
Voix : Voxtral TTS 3 = voix Voxtral TTS 2 **plus** les 36 voix « acteurs » (§3.6, avec genre) ; Voxtral TTS 2 = 4 locuteurs à variantes (`en_paul_{neutral,sad,happy,frustrated,excited,confident,cheerful,angry}`, `gb_oliver_{…}`, `gb_jane_{…}`, `fr_marie_{…}`) et **« instant voice cloning »** pour créer une voix depuis un échantillon.

**Turn-taking (`turn`)** :

| Champ | Type | Défaut | Description |
| --- | --- | --- | --- |
| `allow_interruptions` | bool | `True` | L'utilisateur peut interrompre l'agent |
| `inactivity.timeout_ms` | int | `10000` | Silence avant la première relance |
| `inactivity.max_reminders` | int | `2` | Nombre max de relances **avant la fin de la session** |
| `inactivity.messages` | liste de str | `["Are you still there?"]` | Phrases de relance |

`instructions`, `tools` et `turn` peuvent être **modifiés sur une session en cours** (lien vers une section « Update a live session » de la page Sessions… absente de cette page).

### 3.16 Agents sauvegardés et versions

- **Créer** : `client.audio.agents.create(name="Support bot", description="…", configuration={"llm": {"model": "mistral-small-latest"}, "tts": {"voice_id": "fr_marie_neutral"}, "turn": {"allow_interruptions": False}, "instructions": "…"})`.
- **Démarrer une session** : `client.audio.sessions.init(agent_id=agent.id, tts={"voice_id": "gb_oliver_excited"}, audio_interface=DefaultAudioInterface())` — ici surcharge de voix pour la session seulement.
- **Versions** : chaque changement de configuration crée une nouvelle version ; sessions sur la **dernière version par défaut** ; épinglage par `agent_version`. `update(agent_id, name, configuration, description?)` sauvegarde une nouvelle version (exemple : passage à `mistral-medium-latest`) ; l'objet renvoyé expose `agent.version`.
- Les réglages d'interruption sauvegardés s'appliquent aussi aux **appels téléphoniques** rattachés à l'agent.

| Méthode (`client.audio.agents`) | Description |
| --- | --- |
| `create(name, description?, configuration?)` | Crée un agent, éventuellement avec une première version de configuration |
| `list(page_size=10, page_token=None)` | Liste paginée par curseur : `data`, `next_page_token` |
| `get(agent_id)` | Un agent |
| `update(agent_id, name, configuration, description?)` | Nouvelle version |
| `delete(agent_id)` | Supprime ; l'agent n'apparaît plus dans `list`/`get` |
| `list_versions(agent_id, page_size=10, page_token=None)` | Versions de configuration, curseur |
| `list_sessions(agent_id, page_size=10, page_token=None)` | Sessions démarrées depuis l'agent, curseur |

TS : camelCase (`listVersions`, `listSessions`, `agentId`, `agentVersion`).
**Outils client sur un agent** : seule la **déclaration** (nom, description, paramètres) est sauvegardée ; le handler reste dans le code et doit être repassé à `init()` ; sinon événement `unhandled_tool`.

### 3.17 Sessions : cycle de vie, événements, erreurs

- `init()` renvoie un **`VoiceAgentSession`** (dans le navigateur, `initSession()` renvoie le même objet). Abonnement aux événements, mute/unmute, attente de fin, fermeture.
- **Cycle de vie** : `init()` crée la session côté backend **sans connecter le WebSocket** (on peut enregistrer les handlers avant le début) ; `connect()` — ou `async with session` (Python) / `await using session` (TS) — rejoint la **room temps réel** et démarre l'échange audio ; `close()` quitte la room et **supprime la session côté serveur** (« should always be called »).
- Méthodes : `set_input_enabled(False/True)` (TS `setInputEnabled`) pour couper/rétablir le micro ; `wait()` bloque jusqu'à la déconnexion ; `close()`.
- **REST sous-jacent** : `init()` → `POST /v1/audio/sessions` ; `close()` → `DELETE /v1/audio/sessions/{id}`. Appel direct : `client.audio.sessions.create(...)` et `client.audio.sessions.close(session_id)`.

**Événements** (`session.on(event, handler)`) :

| Événement | Payload | Usage |
| --- | --- | --- |
| `connected` | `session_id` | Session prête |
| `disconnected` | `session_id`, `reason` | Arrêter l'audio, nettoyer |
| `transcript` | `id`, `role`, `content`, `final` | Transcripts partiels (`final` false) en direct, garder les finaux |
| `audio` | bytes | Jouer l'audio de l'agent soi-même (mode manuel) |
| `audio_track` | `track`, `source` | Navigateur : attacher la piste média |
| `agent_state_changed` | `state` (`listening`, `thinking`, `speaking`, « and more ») | Mettre à jour l'UI |
| `tool_call_started` | `id`, `name` | L'agent travaille (arguments pas encore connus) |
| `tool_call_ended` | `id`, `name`, `arguments`, `result` | Afficher le résultat |
| `unhandled_tool` | `name`, `arguments` | Journaliser : outil client sans handler |
| `error` | `message`, `fatal`, `code`, `source` | Signaler ; si `fatal`, la session se ferme |

- **Raisons de déconnexion** : aucune après une fermeture normale ; sinon `user_interrupt`, `start_failed`, `audio_input_error`, `audio_output_error` ou `error`.
- Classes Python (`mistralai.extra.voice_agents`) : `VoiceAgentErrorEvent`, `VoiceAgentStateChangedEvent`, `VoiceAgentToolCallEndedEvent`, `VoiceAgentToolCallStartedEvent`, `VoiceAgentTranscriptEvent` ; types TS identiques depuis `@mistralai/mistralai/extra/voice-agents`.
- `session.on()` **renvoie une fonction de désabonnement** ; `session.off(event, handler)` équivalent.
- **Erreurs** : chaque erreur porte `fatal`. Non fatale → session ouverte (journaliser, continuer). Fatale → session fermée, `wait()` rend la main, audio arrêté ; les **échecs de démarrage et déconnexions inattendues sont fatals**. Sans handler `error`, le SDK journalise (Python `logging`, `console.error` en Node.js) : jamais d'erreur silencieuse. Un échec de démarrage lève aussi **`VoiceAgentConnectionException`** (erreur dans `error_event` / `errorEvent`). Toujours appeler `close()` dans un `finally`.
- Commentaire interne : la liste des codes d'erreur (lesquels sont fatals) est en cours côté SDK (R170).

### 3.18 Outils (serveur, client, fillers)

**Outils serveur** (exécutés chez Mistral : outils intégrés des agents et connecteurs du workspace ; les connecteurs à authentification doivent déjà être authentifiés dans le workspace — l'agent les utilise « on your behalf ») :

| Classe | Rôle | Forme dictionnaire |
| --- | --- | --- |
| `WebSearchTool` | Recherche web | `{"type": "web_search"}` |
| `DocumentLibraryTool` | Interroge des bibliothèques de documents | `{"type": "document_library", "library_ids": ["id1", …]}` |
| `ConnectorTool` | Appelle un connecteur du workspace | `{"type": "connector", "connector_id": "my-connector"}` |

Python : `from mistralai.client.models import WebSearchTool` ; mélange possible d'objets et de dictionnaires. TS : type `Tool` depuis `@mistralai/mistralai/extra/voice-agents`, clés `libraryIds`, `connectorId`.

**Outils client** : le SDK envoie la déclaration (nom, description, paramètres) ; quand le modèle appelle l'outil, le SDK exécute le handler dans le code de l'application et renvoie le résultat au modèle. Usages : état de l'interface, localisation de l'utilisateur, appel authentifié au backend.
- Python : décorateur `@function_tool` (schéma depuis les annotations de type, description depuis la docstring) ; surcharge `@function_tool(name="getWeather", description="…")`. Handler synchrone ou asynchrone, peut renvoyer une valeur.
- TS : `functionTool({ name, description, parameters: z.object({...}), handler })` avec un schéma **zod** (le type de l'argument du handler en découle).
- Les handlers tournent **sur la même boucle d'événements que l'audio** : rendre asynchrone tout handler qui fait des E/S, sinon la conversation se fige.

**Sauvegarde sur un agent** : passer le même objet outil dans `configuration.tools` de `audio.agents.create` ; seule la déclaration est stockée ; repasser l'outil à `init(agent_id=…, tools=[get_weather])` ; le SDK **associe par nom**.
**Outils non gérés** : événement `unhandled_tool` et appel signalé en échec à l'agent (pas de blocage).
**Avertissement** : les outils client ne fonctionnent que là où le code tourne ; depuis une surface sans handlers (**appel téléphonique, test dans le dashboard**), ils échouent. Utiliser des outils serveur pour tout ce qui doit marcher partout.

**Fillers** : un clip court joué au début d'un appel d'outil et arrêté dès l'arrivée du résultat ; c'est du **texte** dit dans la voix de l'agent ; préparé **à la connexion** (premier appel non retardé) ; outil sans filler = silence ; l'utilisateur peut parler par-dessus. Python : `WebSearchTool(filler=StaticToolFiller(text="Searching the web…"))`, `@function_tool(filler=StaticToolFiller(text="Checking your order…"))` ; TS : `{ type: "web_search", filler: { text: "…" } }`, `functionTool({ …, filler: { text: "…" } })`. À combiner avec `tool_call_started` / `tool_call_ended`.
Commentaire interne : la doc fournisseur couvre aussi un mode « fire-and-forget » non repris dans la page publiée.

### 3.19 Webhooks

- **But** : notifier le backend au début, à la fin ou à l'échec d'un appel, sans polling (CRM, entrepôt de transcripts, alertes, durée pour facturation). Archive côté serveur ; pour réagir pendant la conversation, utiliser les événements de session.
- **Livraison** : `POST`, `content-type: application/json`, enveloppe commune :

| Champ | Type | Description |
| --- | --- | --- |
| `event` | string | Type d'événement |
| `created_at` | string | Horodatage ISO 8601 UTC d'émission |
| `data` | object | Payload |

- **Configuration par agent**, dans la console Mistral ou via l'API : (1) créer un **endpoint** (URL + nom ; la plateforme génère un **secret de signature**) ; (2) créer un **abonnement** (rattacher l'endpoint à un agent et choisir les types d'événements). Un endpoint peut servir plusieurs agents ; un agent peut avoir plusieurs abonnements.
- **Secret** : généré une seule fois, **non rotatif** ; en cas de fuite, supprimer l'endpoint, en recréer un, mettre à jour le code de vérification.
- **Signature** : en-tête `x-mistral-signature: hmac-sha256=<hex_digest>` = HMAC-SHA256 du **corps brut** avec le secret de l'endpoint. Vérification : lire le corps brut avant tout parsing JSON, calculer `HMAC-SHA256(secret, raw_body)`, comparer en **temps constant** (`hmac.compare_digest`, `timingSafeEqual`). Ne jamais vérifier un JSON resérialisé (espaces/ordre des clés).
- **Récepteur sûr** : vérifier, répondre 200 immédiatement, traiter ensuite (exemples FastAPI — 401 si signature invalide — et Express avec `express.raw({ type: "application/json" })`). **Dédupliquer** par (`session_id`, `event`).

| Événement | Envoyé quand | Champs de `data` |
| --- | --- | --- |
| `call_started` | Session créée et pipeline vocal prêt | `session_id`, `agent_id`, `model`, `started_at` (Unix s) |
| `call_ended` | Fin normale | + `duration_seconds`, `started_at`, `ended_at`, `transcript` (tableau de `{role: user|assistant, content}` ou `null`) |
| `call_failed` | Échec au démarrage (ex. infrastructure) ou erreur fatale en cours d'appel | + `error` : `token_error`, `db_error`, `livekit_error`, ou une raison de déconnexion |

Exemples d'identifiants : `session_id` `RM_a1b2c3d4e5f6`, `agent_id` `ag_01234567-89ab-cdef-…`. Le **transcript est « best effort »** : s'il n'est pas prêt à temps, `transcript` vaut `null` ; le reste du payload est complet.

| Comportement | Détail |
| --- | --- |
| Timeout | Réponse attendue sous **10 s** |
| Succès | Tout code 2xx |
| Retries | Sur 5xx ou 429 : **3 tentatives au total**, backoff exponentiel (2 s puis 4 s) |
| Non retentés | 4xx autres que 429 |
| Erreurs transport | DNS, TLS, reset de connexion : même calendrier de retry |

Bonnes pratiques : 200 immédiat + traitement asynchrone ; handler idempotent ; HTTPS (l'API accepte aussi des URL HTTP) ; secret protégé. Test local : exposer le serveur via un outil de tunnel HTTP et enregistrer l'URL obtenue.

### 3.20 Téléphonie (SIP)

- `:::note` : **réservée aux clients entreprise, non self-serve** ; activation via l'account team ou https://mistral.ai/contact.
- **Appels entrants** : (1) l'appelant compose le numéro ; (2) le système SIP du client (opérateur, IPBX, plateforme de centre de contact) transfère l'appel vers **l'endpoint SIP Mistral** du client ; (3) Mistral démarre une session depuis **l'agent sauvegardé rattaché à ce numéro**, qui répond (diagramme `audio_telephony_inbound_flow.svg`).
- Prérequis : créer et sauvegarder l'agent avant la demande d'accès. Le numéro et le système SIP sont configurés **avec l'équipe Mistral** : aucune étape de configuration côté client dans la console ou l'API.
- **Concevoir pour le téléphone** :

| Au téléphone | À faire |
| --- | --- |
| Outils client en échec (pas d'application) | Outils serveur (bibliothèque de documents, connecteur) |
| **Pas de transfert vers un humain** | Dire dans les instructions quoi répondre hors périmètre (ex. un collègue rappellera) et gérer le suivi dans ses systèmes |
| Pas d'écran | Réponses courtes, fillers sur les outils lents |

- Conseil : tester l'agent en session navigateur/SDK avant, et retirer tout outil client.
- Cas d'usage : support de premier niveau (questions courantes, vérifier une commande, ouvrir un ticket), prise de rendez-vous via connecteur au système de planification, couverture hors horaires (résumé pour le lendemain).
- **Sécurité** : rubriques « Transport », « Authentication », « Network » **vides**.
- **Limites** : **entrant uniquement** (l'agent ne peut pas passer d'appels) ; deux puces vides ; **pas d'outils client**.
- Commentaires internes : date de lancement en backlog « due Oct 31 » ; noms d'opérateurs compatibles (Twilio, Telnyx) volontairement omis ; rien sur tarifs, numéros ou configuration SIP ; sortant hors périmètre (RFC Telephony V0) ; pas de contrôle d'appel.

### 3.21 Navigateur (TypeScript)

- Principe : la clé API ne doit jamais atteindre le navigateur → le **serveur crée la session** ; la page se connecte avec les identifiants renvoyés ; le navigateur capte/joue l'audio lui-même (`getUserMedia()`), rien à installer.
- **Flux** : (1) la page demande une session au serveur ; (2) le serveur la crée avec sa clé ; (3) il renvoie l'ID de session et les identifiants de connexion ; (4) la page se connecte et streame l'audio directement avec Mistral ; en fin de conversation, la page demande au serveur de fermer la session.
- **Prérequis** : SDK navigateur **TypeScript uniquement** ; un serveur (ou route serverless) détenant la clé ; **contexte sécurisé** (HTTPS ou `localhost`) pour l'accès au micro.
- **Côté serveur** (route Next.js) : `POST` → `client.audio.sessions.create({ instructions, llm, stt, tts, tools })` puis renvoi de `{ id: session.id, participantToken: session.participantToken, serverUrl: session.serverUrl }` ; `DELETE ?sessionId=…` → `client.audio.sessions.close(sessionId)` puis 204.
- **Côté page** : `initSession({ createSession, deleteSession, tools? })` importé de `@mistralai/mistralai/extra/voice-agents/browser` ; `createSession` appelle la route POST, `deleteSession(sessionId)` la route DELETE ; renvoie le même `VoiceAgentSession` (`on`, `wait`, `close`). `close()` **arrête la piste micro, quitte la room, puis appelle `deleteSession`**.
- `:::warning` : garder la clé côté serveur ne suffit pas — la route de création de session est publique pour quiconque atteint la page : la protéger par l'authentification de l'application ; ne pas se fier à un handler d'outil côté navigateur pour autoriser quoi que ce soit.
- **Outils client** : définis dans la page avec `functionTool` ; `initSession()` passe leurs **déclarations** au callback `createSession(tools)`, que le serveur relaie à `sessions.create()` ; le handler s'exécute dans le navigateur.
- **Pistes audio** : `session.localTrack` (piste micro, `MediaStreamTrack`, disponible dès la connexion) ; piste de l'agent via l'événement `audio_track` avec `source: "remote"` (asynchrone). Usages : visualisation, enregistrement, traitement.
- Commentaire interne : page renommée depuis « React SDK » — **il n'existe pas de package React** ; la doc fournisseur parlait de `connectSession` et `clientTool` (noms différents des noms publiés).

### 3.22 Interface audio et audio personnalisé

S'applique à Python et Node.js (dans le navigateur, le SDK gère l'audio). Le SDK ne fait que **déplacer l'audio** ; transcription, modèle et synthèse tournent chez Mistral.

**Séquence pilotée par le SDK** :
1. **Avant la création de la session** : `preflight` de l'interface (un périphérique ou une librairie manquants échouent avant que Mistral n'alloue une session).
2. **À la connexion** : `start()`.
3. **Quand l'agent rejoint** : lecture de `input_audio()` et envoi de chaque morceau ; micro coupé (`set_input_enabled(False)`) → le SDK continue de lire mais **jette** les morceaux.
4. **Quand l'agent parle** : `output_audio()` morceau par morceau.
5. **À la fermeture** : `stop()`.

**Format audio du SDK (dans les deux sens)** : PCM signé 16 bits little-endian, **mono, 48 kHz** ; l'interface par défaut capte des trames de **20 ms = 960 échantillons = 1 920 octets**. Le SDK **ne rééchantillonne ni ne convertit** : convertir au préalable (ex. audio téléphonique 8 kHz ou stéréo). Ce format est celui du SDK, pas celui des endpoints STT/TTS.

| Besoin | Intégration |
| --- | --- |
| Micro et haut-parleurs de l'ordinateur | Interface par défaut |
| Autre source (WebSocket, pont téléphonique, fichier), le SDK pilotant l'échange | Interface personnalisée |
| Pousser l'audio et recevoir celui de l'agent soi-même (ex. banc de test) | Audio manuel, sans interface |

**`DefaultAudioInterface`** : micro et haut-parleurs par défaut ; Python via PyAudio (PortAudio), Node.js via SoX. Traitement en entrée : **annulation d'écho**, réduction de bruit, égalisation du volume ; en sortie : tampon et lecture à rythme régulier ; si le tampon déborde, **l'audio le plus ancien est jeté**. Paramètres Python :

| Paramètre | Défaut | Description |
| --- | --- | --- |
| `echo_cancellation` | `True` | Retire la voix de l'agent de l'entrée micro |
| `noise_suppression` | `True` | Réduit le bruit de fond |
| `high_pass_filter` | `True` | Retire les basses fréquences (ronflement) |
| `auto_gain_control` | `True` | Normalise le volume micro |
| `output_buffer_size_ms` | `300` | Audio max en attente de lecture (ms) |
| `frames_per_buffer` | 960 (20 ms) | Échantillons lus à la fois |
| `echo_cancellation_delay_ms` | mesuré | Délai fixe lecture/capture ; à régler seulement si la mesure est fausse |

Garder l'annulation d'écho avec des haut-parleurs (sinon l'agent s'entend et se répond).

**Interface personnalisée** : sous-classer `AudioInterface` (Python) / l'implémenter (TS) :

| Méthode | Appelée | À faire |
| --- | --- | --- |
| `start()` | À la connexion | Ouvrir périphériques, sockets, fichiers |
| `input_audio()` (TS `inputAudio`) | Dès que l'agent rejoint, toute la session | Produire (yield) l'audio utilisateur en morceaux PCM |
| `output_audio(audio)` (TS `outputAudio`) | Pour chaque morceau de l'agent | Jouer/transmettre ; **rendre la main vite** (la session attend avant l'événement suivant) |
| `stop()` | À la fermeture | Libérer les ressources |

Python : surcharge possible de `preflight()` ; pour ne changer qu'une partie du comportement, sous-classer l'interface par défaut. **Erreurs** : exception dans `start()` → raison `start_failed` ; dans `input_audio()` → `audio_input_error` ; dans `output_audio()` → `audio_output_error` ; échec de `stop()` → événement `error` non fatal et fermeture quand même.

**Audio manuel** : sans interface, la session n'enregistre ni ne joue rien ; envoyer l'audio avec `send_audio()` / `sendAudio()` (même format, une fois connecté) et recevoir l'audio de l'agent par l'événement `audio`.

## 4. Interface utilisateur

Les pages de ce périmètre sont orientées API/SDK et ne contiennent **aucune balise `AppLink`** ; les éléments d'interface cités sont :

| Élément | Chemin / URL | Ce qui s'y fait |
| --- | --- | --- |
| Studio (console) | https://console.mistral.ai | Point d'entrée |
| Clés API | https://console.mistral.ai/home?profile_dialog=api-keys (« API keys section », dialogue de profil) | Créer une clé, à placer dans `MISTRAL_API_KEY` |
| Création de voix « AI Studio UI » | *(pas d'URL)* | Créer une voix clonée ; rétention par défaut 30 jours |
| Partage des voix « AI Studio interface » | *(pas d'URL)* | Les administrateurs du workspace rendent une voix privée ou partagée avec le workspace (API de partage interne) |
| Webhooks des agents vocaux | « Mistral console » *(pas d'URL)* | Créer endpoints (URL, nom, secret généré) et abonnements (agent + types d'événements) ; aussi faisable par API |
| Test d'un agent dans le dashboard | *(mentionné dans l'avertissement des outils client)* | Tester un agent sauvegardé ; les outils client y échouent (inférence : un écran de test d'agent vocal existe dans la console) |
| Téléphonie | — | Aucune configuration côté client dans la console ; mise en place avec l'équipe Mistral |
| Anciens playgrounds (page dépréciée) | https://console.mistral.ai/build/audio/speech-to-text et https://console.mistral.ai/build/audio/text-to-speech | Tester transcription, génération et clonage de voix |

## 5. API et SDK

### 5.1 Endpoints

| Méthode | Chemin | Rôle | Statut / source |
| --- | --- | --- | --- |
| POST | `/v1/audio/speech` | Génération de parole (JSON `audio_data` ou SSE si `stream: true`) | Spec + doc |
| GET | `/v2/audio/voices` | Liste des voix, pagination curseur (`page_size` 1–100 déf. 10, `page_token`), filtres `type` (`all`/`custom`/`preset`), `gender` (≤ 3 parmi `female`/`male`/`neutral`), `language` (≤ 16 codes de ≤ 12 car.), `query` (nom, insensible à la casse, ≤ 100 car.) → `VoiceListPage {data, next_page_token}` | Spec + doc |
| GET | `/v1/audio/voices` | Liste offset (`limit` 1–100 déf. 10, `offset`, `type`) → `{items,total,page,page_size,total_pages}` | **Déprécié** 2026-09-07, sunset 2027-03-31 |
| POST | `/v1/audio/voices` | Créer une voix (échantillon base64) | Spec + doc |
| GET | `/v1/audio/voices/{voice_id}` | Détails d'une voix (sans échantillon) | Spec |
| PATCH | `/v1/audio/voices/{voice_id}` | Mise à jour partielle (name, gender, languages, age, tags, description, retention notice) | Spec |
| DELETE | `/v1/audio/voices/{voice_id}` | Supprimer une voix custom (`voice_id` UUID) ; renvoie l'objet voix | Spec |
| GET | `/v1/audio/voices/{voice_id}/sample` | Échantillon audio (`audio/wav`) | Spec + doc |
| POST | `/v1/audio/sessions` | Créer une session d'agent vocal (appelé par `sessions.init()`/`create()`) | Doc uniquement (absent de la spec locale) |
| DELETE | `/v1/audio/sessions/{id}` | Fermer/supprimer une session | Doc uniquement |
| — | API agents vocaux (`client.audio.agents.*`), endpoints et abonnements webhooks | CRUD annoncés « via l'API », chemins REST non documentés | Référence REST « à venir » |
| — | Endpoint SIP Mistral | Point d'entrée des appels transférés | Enterprise, non public |
| POST | `/v1/client/sessions` | (page dépréciée STT) Jetons éphémères `rt_*` pour WebSocket navigateur | Spec + doc dépréciée |

### 5.2 Schéma `SpeechRequest` (spec OpenAPI locale)

| Champ | Type | Défaut | Note |
| --- | --- | --- | --- |
| `model` | string \| null | — | |
| `metadata` | `MetadataDict` \| null | — | Non documenté dans les pages |
| `stream` | boolean | `false` | |
| `prompt_cache_key` | string \| null | — | Non documenté dans les pages |
| `voice_id` | string \| null | — | « preset or custom voice » |
| `ref_audio` | string (base64/binaire) \| null | — | |
| `input` | string | **requis** | |
| `phoneme_hints` | objet → tableau de `IPAPhoneme` \| null | — | Mot sensible à la casse |
| `response_format` | `SpeechOutputFormat` (`pcm`, `wav`, `mp3`, `flac`, `opus`) | `mp3` | |

`additionalProperties: true` (ce qui explique le passage de `conversation_history` via `additional_properties` en Python). `instruction`, `expressiveness`, `conversation_history`, `realtime_context` n'apparaissent pas dans le schéma.
**Réponse SSE** : `event` ∈ `SpeechStreamEventTypes` (`speech.audio.delta`, `speech.audio.done`) ; `data` discriminé par `type` : `SpeechStreamAudioDelta {type, audio_data}` / `SpeechStreamDone {type, usage}` (usage : `prompt_tokens`, `completion_tokens`, `total_tokens`, `prompt_audio_seconds`, `request_count`…).

### 5.3 Schémas de voix (spec OpenAPI locale)

| Schéma | Champs |
| --- | --- |
| `VoiceCreateRequest` | `name` (requis), `slug`, `languages` (déf. `[]`), `gender`, `age`, `tags`, `color`, `description` (≤ 500), `retention_notice` (1–365, déf. 30), `sample_audio` (base64), `sample_filename` (détection d'extension) |
| `VoiceUpdateRequest` | `name`, `languages`, `gender`, `age`, `tags`, `description`, `retention_notice` (1–365) — mise à jour partielle |
| `VoiceResponse` | les champs ci-dessus + `id` (UUID), `created_at`, `user_id`, `trimmed_seconds`, `kind` (`ivc` instant / `pvc` professionnel, déf. `ivc`), `type` (`preset`/`custom`, lecture seule) |
| `VoiceGender` | `female`, `male`, `neutral` |
| `VoiceListPage` | `data`, `next_page_token` (null en dernière page) |

### 5.4 Méthodes SDK

**TTS** :

| Python (`mistralai` 3.x, `from mistralai.client import Mistral`) | TypeScript (`@mistralai/mistralai`) |
| --- | --- |
| `client.audio.speech.complete(model, input, voice_id, ref_audio, response_format, stream, additional_properties)` | `client.audio.speech.complete({ model, input, voiceId, refAudio, responseFormat, stream })` |
| `client.audio.voices.search(page_size=…)` → `.result.data`, `.next()` | *(absent en 2.7.0 ; utiliser `fetch` sur `/v2/audio/voices`)* |
| `client.audio.voices.list(...)` *(déprécié)* | `client.audio.voices.list(...)` (v1, sans `type`) |
| `client.audio.voices.create(name, sample_audio, sample_filename, languages, …)` | `client.audio.voices.create({ name, sampleAudio, sampleFilename, languages })` |
| `client.audio.voices.get(voice_id)` / `update(voice_id, name=…)` / `delete(voice_id)` | `get({ voiceId })` / `update({ voiceId, voiceUpdateRequest })` / `delete({ voiceId })` |
| `client.audio.voices.get_sample_audio(voice_id)` → réponse binaire | `client.audio.voices.getSampleAudio({ voiceId })` → flux |

`instruction` et `phoneme_hints` : exemples en `httpx`/`fetch` (absents de `mistralai` 3.0.0 ; `phoneme_hints` typé dans 3.1.0).

**Agents vocaux** :

| Élément | Python | TypeScript |
| --- | --- | --- |
| Installation | `pip install "mistralai[voice-agents]"` | `npm install @mistralai/mistralai` (+ `zod` pour les outils) |
| Imports | `mistralai.extra.voice_agents` (`DefaultAudioInterface`, `AudioInterface`, `function_tool`, `StaticToolFiller`, classes d'événements) ; `mistralai.client.models.WebSearchTool` | `@mistralai/mistralai/extra/voice-agents` (types, `functionTool`, `Tool`, `AudioTrackEvent`) ; `…/extra/voice-agents/audio/node` (`DefaultAudioInterface`) ; `…/extra/voice-agents/browser` (`initSession`) |
| Session locale | `await client.audio.sessions.init(**options)` | `await client.audio.sessions.init({...})` |
| Session serveur | `client.audio.sessions.create(...)`, `client.audio.sessions.close(session_id)` | `client.audio.sessions.create({...})` → `id`, `participantToken`, `serverUrl` ; `close(sessionId)` |
| Session navigateur | — | `initSession({ createSession, deleteSession, tools })` |
| Méthodes de session | `connect()`, `async with`, `on()`, `off()`, `set_input_enabled()`, `send_audio()`, `wait()`, `close()` | `connect()`, `await using`, `on()`, `off()`, `setInputEnabled()`, `sendAudio()`, `wait()`, `close()`, `localTrack` |
| Agents | `client.audio.agents.create/list/get/update/delete/list_versions/list_sessions` | idem en camelCase |
| Exception | `VoiceAgentConnectionException` (`error_event`) | idem (`errorEvent`) |

### 5.5 Événements

- **TTS SSE** : `speech.audio.delta` (`audio_data`), `speech.audio.done` (`usage`).
- **Session d'agent vocal** : `connected`, `disconnected`, `transcript`, `audio`, `audio_track`, `agent_state_changed`, `tool_call_started`, `tool_call_ended`, `unhandled_tool`, `error` (détails §3.17) ; raisons de déconnexion `user_interrupt`, `start_failed`, `audio_input_error`, `audio_output_error`, `error`.
- **Webhooks** : `call_started`, `call_ended`, `call_failed` (détails §3.19).

### 5.6 Codes d'erreur relevés

| Statut | Type / code | Message | Contexte |
| --- | --- | --- | --- |
| 404 | `invalid_voice` / `1902` | `Voice '<id>' not found.` | Voix inconnue |
| 400 | — | `Either ref_audio or voice must be provided.` | Pas de voix |
| 400 | code `3291` | `Failed to load audio file. Verify that the given file is valid mp3 or wav.` | `ref_audio` invalide (URL, format) |
| 400 | code `3051` | `instruction is not supported for this model.` | `instruction` sur le checkpoint actuel (commentaire interne) |
| 422 | `extra_forbidden` | `Extra inputs are not permitted` | Champ inconnu (`instructions`, `expressiveness` au 9 oct.) |
| 422 | `string_type` | — | `instruction` non chaîne |
| 422 | `enum` | liste des 50 phonèmes | Phonème invalide |
| 422 | — | `Input should be less than or equal to 100` | `page_size`/`limit` > 100 |
| 422 | — | — | `stt.language`/`context_bias`/`turn_detection` sans modèle Voxtral 3 realtime |
| 500 | — | `Service unavailable.` | `voice` + `voice_id` ensemble (bug, non publié) |
| 404 | — | `Voice not found or no sample available` | Échantillon d'une voix Voxtral 3 |
| 403 | — | — | Modération de contenu TTS (page dépréciée uniquement) |
| 401 | — | `Invalid signature` | Renvoyé **par le récepteur** de webhooks (exemples) |

## 6. Limites, quotas, tarifs, disponibilité

| Sujet | Valeur |
| --- | --- |
| Formats de sortie TTS | `mp3` (défaut), `wav`, `pcm`, `flac`, `opus` |
| `expressiveness` | 1.0 à 5.0 (défaut fixé par le service) ; désactivé dans les agents vocaux |
| Émotions | 34 valeurs ; rythmes : 5 publiés (`very-slow`…`very-fast`) ou 2 (`slow`, `fast`) selon la page |
| Phonèmes | 50 (inventaire fermé, anglais) |
| Langues des balises | Anglais ; FR, DE, ES, IT, PT, HI non testés mais attendus |
| Clip de clonage | MP3 ou WAV en base64, pas d'URL ; durée non publiée |
| Clonage professionnel | 30 min à 3 h d'audio recommandés |
| Rétention des voix sauvegardées | 30 j par défaut, 1–365 j (`retention_notice`) |
| Liste des voix | ≤ 100 par page |
| Longueur max de `input` / de `instruction` | Non publiée (« verify at the end » interne) |
| Voix Voxtral 3 | 36 voix, 21 langues (anglais US/UK, français, espagnol, allemand, italien, portugais, arabe, catalan, hindi, hongrois, japonais, coréen, néerlandais, norvégien, polonais, roumain, russe, turc, ukrainien, vietnamien, chinois) |
| Instructions de style | Non disponibles au lancement |
| TTS Realtime 3 | Non publié |
| SDK audio agent | PCM 16 bits LE mono 48 kHz, trames 20 ms ; pas de rééchantillonnage |
| `target_streaming_delay_ms` (STT agent) | 80 à 1200 ms, défaut 240 |
| Détection de tour | seuils 0.5 / 0.5 / 0.33 ; `min_silence_ms` 500 ; `end_timeout_ms` 3000 |
| Inactivité | 10 000 ms, 2 relances puis fin de session |
| Timeout client SDK | 60 000 ms (création/fermeture de session) |
| Tampon de sortie par défaut | 300 ms |
| Webhooks | réponse < 10 s ; 3 tentatives (backoff 2 s, 4 s) sur 5xx/429/erreurs réseau ; secret non rotatif |
| Téléphonie | Clients entreprise uniquement, non self-serve ; entrant uniquement ; pas d'outils client ; pas de transfert vers un humain |
| Navigateur | TypeScript uniquement ; HTTPS ou `localhost` |
| Latence | Aucun chiffre publié (interne : pas sous 1 s par tour pour les agents ; ~0,5 s de premier audio TTS mesuré en test) |
| Tarifs | **Aucune information tarifaire** dans ces pages (la page dépréciée renvoie aux fiches modèles) |
| Régions / ZDR | Non abordés dans ces pages |
| Conformité | Seule la page dépréciée STT affirme un support RGPD/HIPAA via déploiements on-premise/cloud privé (affirmation marquée « FLAGGED FOR REVIEW ») |

## 7. Détails fins, pièges, cas particuliers, dépréciations

### 7.1 Pièges TTS
- **Champ voix** : utiliser `voice_id` ; un champ `voice` existe implicitement (message « Either ref_audio or voice… », 500 si les deux sont envoyés).
- **`ref_audio` + `voice_id`** acceptés ensemble (200) sans règle de priorité connue.
- **Balise + phrase à virgule** sur voix Voxtral 3 : troncature fréquente après la première proposition.
- **Balises hors liste** silencieusement ignorées : aucune validation côté API, donc aucune erreur pour une faute de frappe (`[emotion=hapy]`).
- **Pace sur presets Voxtral 2** : quasi sans effet sur `gb_jane_neutral` (tests internes).
- **Échantillons** : `get_sample_audio` ne fonctionne pas pour les voix Voxtral 3 testées (404).
- **TypeScript** : pas de `voices.search` en 2.7.0 ; `voices.list` (v1) perd `type` ; en streaming, le type d'événement se lit dans `event.data.type` (ancienne doc : `event.event`).
- **`conversation_history`** : passé hors typage (`additional_properties` en Python, clé snake_case en TS) ; résultats instables en test interne (audio qui boucle dans 9 cas sur 14).
- **Usage SSE** : `completion_tokens` très élevés (~200 000 pour 12,5 s) jugés suspects.
- **Phonèmes** : `r` refusé (utiliser `ɹ`), `ɡ` IPA refusé (utiliser `g`), pas d'accent tonique.
- **Coquille dans le quickstart** : la phrase entendue annoncée (« Hello! This is Voxtral, Mistral's text-to-speech model. ») ne correspond pas à l'`input` envoyé (« Hi there! You are listening to Voxtral. »).

### 7.2 Pièges agents vocaux
- **Outils client** : ne fonctionnent ni au téléphone ni dans le test du dashboard ; seule la déclaration est sauvegardée sur l'agent ; association handler ↔ déclaration **par nom**.
- **Handlers bloquants** : partagent la boucle d'événements de l'audio → figent la conversation.
- **`output_audio()` lent** : bloque le traitement des événements suivants.
- **Format audio** : 48 kHz mono obligatoire, aucune conversion par le SDK (pièges : audio téléphonique 8 kHz, stéréo).
- **Micro coupé** : les morceaux continuent d'être lus puis jetés.
- **Annulation d'écho** à garder avec des haut-parleurs, sinon l'agent se répond.
- **Toujours `close()`** (dans un `finally`) : sinon la session serveur n'est pas supprimée.
- **Sécurité navigateur** : la route de création de session doit être protégée par l'authentification de l'app.
- **Webhooks** : vérifier la signature sur les octets bruts ; dédupliquer par `session_id` + `event` ; `transcript` peut être `null`.
- **Surcharges de session** : n'altèrent jamais l'agent sauvegardé ; `agent_version` pour figer la production.
- **Inactivité** : après `max_reminders` relances sans réponse, la session **se termine**.

### 7.3 Ce qui a changé par rapport aux pages dépréciées (`studio/audio/deprecated/`)

| Sujet | Ancienne doc (dépréciée) | Doc actuelle |
| --- | --- | --- |
| Modèle TTS | **Voxtral TTS** `voxtral-mini-tts-2603` (fiche `voxtral-tts-26-03`), GA | **Voxtral TTS 3** `voxtral-mini-tts-3-0` (ou `voxtral-mini-tts-3` dans les agents) ; guide « Migrate from Voxtral 2 » |
| Philosophie d'expressivité | « Voice-as-an-instruction » : la voix de référence dicte intonation et émotion, **pas de balises de prosodie/émotion** | Balises inline d'émotion/rythme/disfluences, `expressiveness`, instructions de style (à venir) |
| Langues TTS | 9 : EN, FR, ES, PT, IT, NL, DE, HI, AR ; clonage cross-lingue et code-mixing | 36 voix préréglées sur 21 langues ; liste par modèle dans la page Languages |
| Clonage | « à partir de 2–3 s » d'audio ; consignes `ref_audio` : **3–25 s**, un locuteur, enregistrement propre, prosodie neutre (pas de pauses/disfluences excessives), hauteur expressive | Exigences de contenu laissées vides ; clonage professionnel ajouté (30 min–3 h) ; statut de `ref_audio` offline incertain |
| Politique d'usage du clonage | Avertissement explicite : pas d'usurpation, **consentement explicite**, divulgation des contenus générés par IA quand la loi l'exige | Absent des nouvelles pages (commentaire interne : formulation de consentement en attente de validation) |
| Latence | ~90 ms de traitement modèle ; TTFA ~0,8 s (`pcm`) / ~3 s (`mp3`) sur une page, ~0,7 s / ~2 s sur une autre ; `pcm` recommandé pour le streaming | Aucun chiffre ; renvoi au concept Latency |
| Format `pcm` | « Raw float32 LE samples » | Renvoi à la page Audio formats (non détaillé ici) |
| Bonnes pratiques de texte | Même langue voix/texte ; voix FR + texte EN = anglais accentué ; verbaliser nombres (`one thousand two hundred thirty four`) ; pas de markdown/emojis ; épeler les sigles (`F-B-I`) ; < 300 mots ; **modération → 403** | Non reprises ; prononciation via `phoneme_hints` |
| Voices : création | Paramètres `name`, `sample_audio`, `sample_filename`, `slug`, `languages`, `gender`, `age`, `tags` | + `retention_notice`, `description`, `color` ; partage `sharing_scope` |
| Voices : liste | `GET /v1/audio/voices?limit&offset`, réponse `items/total/page/page_size/total_pages` | `GET /v2/audio/voices` curseur (`voices.search`) ; v1 dépréciée |
| Voices : échantillon | `get_sample_audio` renvoie directement des octets | Renvoie un objet réponse (Python) / un flux (TS) |
| SDK | Onglets V1/V2 : TTS « Not available in the V1 SDK (mistralai 1.x) », exige `mistralai>=2` | Exemples `mistralai` 3.x |
| Pipeline voix-à-voix | À assembler soi-même : Voxtral Realtime + LLM + Voxtral TTS | Voice Agents SDK géré de bout en bout (le pipeline maison reste une option) |
| STT (hors périmètre, pour mémoire) | Voxtral Mini Transcribe 2 (`voxtral-mini-2602`, via `voxtral-mini-latest`, ≤ 3 h, 13 langues, diarisation, `context_bias` ≤ 100 termes, `timestamp_granularities` `segment`/`word` incompatible avec `language`) ; Voxtral Realtime `voxtral-mini-transcribe-realtime-2602` (WebSocket `wss://api.mistral.ai/v1/audio/transcriptions/realtime?model=…`, `pip install mistralai[realtime]`, `client.audio.realtime.transcribe_stream`, `target_streaming_delay_ms`, exemple « dual delay » 240 ms / 2400 ms, incompatible avec `diarize`, 4B open weights Apache 2.0) ; jetons navigateur `rt_*` via `POST /v1/client/sessions` (`purpose: realtime`, ~900 s, un seul modèle, réutilisable jusqu'à expiration, passés en `Sec-WebSocket-Protocol` `["realtime", token]`) ; compatibilité SDK OpenAI ; limites ≈20 min (chat audio), ≈15 min (anciens modèles), ≈3 h (Transcribe 2) ; Voxtral Small `voxtral-small-2507` (32k) | Traité dans le chapitre Audio (1/2) |

## 8. Questions ouvertes / incohérences relevées dans la doc

1. **ID du modèle TTS** : `voxtral-mini-tts-3-0` (pages TTS) vs `voxtral-mini-tts-3` (configuration des agents vocaux). Idem Voxtral 2 : présenté comme déprécié côté TTS, mais `voxtral-mini-tts-2603` est proposé comme option `tts.model` des agents.
2. **Rythmes** : 5 valeurs publiées (`very-slow`, `slow`, `moderate`, `fast`, `very-fast`) vs « `slow` et `fast` » dans l'Overview et un commentaire interne (`medium` retiré).
3. **Catalogue Voxtral 3** : le tableau publié (36 voix nommées Sheila, Margaret…) ne correspond pas aux observations internes (9 presets nommés Sarah, Yael, Esmeralda, Andrea, Fiona, Marina, Linda, Eric, Jesse le 7 octobre ; aucune voix Voxtral 3 listée et `voice_478` en 404 le 9 octobre).
4. **TTS contextuel** : publié dans le tableau des fonctionnalités, alors qu'un commentaire dit l'avoir « laissé de côté volontairement » (audio qui boucle) ; il mentionne un champ `realtime_context` non documenté ; absent de la spec.
5. **`expressiveness`** : documenté (1.0–5.0) mais rejeté en 422 le 9 octobre, désactivé dans les agents, absent de la spec ; « défaut fixé par le service » sans valeur.
6. **Instructions de style** : page entière pour une fonctionnalité indisponible ; messages d'erreur remplacés par « Style instructions are not available at launch. » ; tableau des modes en dit « No (not available at launch) ».
7. **Sensibilité à la casse des `phoneme_hints`** : listée comme question ouverte côté TTS, mais affirmée (« case-sensitive ») dans la spec et la page de configuration des agents ; restriction « phonèmes anglais uniquement » seulement côté agents.
8. **Puce hors sujet** dans Custom pronunciation : une règle sur le *context biasing* de la transcription (« ChatGippiti ») s'est glissée dans les règles des `phoneme_hints`.
9. **`sharing_scope`** décrit dans la doc mais absent du schéma `VoiceResponse` de la spec ; la valeur `global` n'est pas expliquée.
10. **Cellules/sections vides** : description du modèle TTS Realtime 3 ; ligne « texte en cours d'écriture » du tableau des modes ; section « Stream text as it's written » ; contenu du clip de référence ; phrase sur le clonage cross-lingue ; colonne « Applies to » de l'écoute d'échantillon ; défauts de `stt` et `tts` ; sécurité et deux limites de la téléphonie ; fin de la puce « Attach phone numbers and webhooks » ; phrase d'intro « Deprecated models ».
11. **Durée du clip de clonage** : PRD 2–3 s, RFC-600 3–30 s, ancienne doc 3–25 s, test 11 s — rien de publié.
12. **Statut de `ref_audio` offline** : RFC-555 le supprime, il fonctionne encore en test ; la page Voice cloning le documente.
13. **Contradiction de cycle de vie** : « `init()` ne connecte pas encore le WebSocket » vs « `init()` démarre la session avant de rendre la main » (justifiant `VoiceAgentConnectionException` au démarrage).
14. **Liens/ancres cassés** : `sessions#update-a-live-session` (section absente — la mise à jour d'une session live n'est documentée nulle part) ; `sessions#disconnect-reasons` ; `/studio/audio/voice-agents/quickstart#install-the-sdk` (la page s'appelle `quickstarts/build-a-voice-agent`) ; `quickstart#talk-to-your-agent` (section intitulée « Chat with your agent », et le quickstart n'utilise pas de `finally`).
15. **Chemins d'import TS divergents** : `@mistralai/mistralai/extra/voiceAgents` (Audio interface) vs `@mistralai/mistralai/extra/voice-agents` (partout ailleurs). Signature Python de `input_audio` : `async def` (Audio interface) vs `def` (Custom audio).
16. **Nom de l'option TS** : la note dit `server_url` → `serverUrl`, le code montre `serverURL`.
17. **Pages dupliquées** : « Audio interface » et « Custom audio interfaces » couvrent le même sujet avec des variantes.
18. **API REST agents/sessions/webhooks** : annoncée mais non publiée ; `POST`/`DELETE /v1/audio/sessions` absents de la spec locale ; chemins des endpoints webhooks inconnus.
19. **Statut d'accès au SDK au lancement** (privé ou public) non tranché (R174) ; liste des codes d'erreur de session en cours (R170).
20. **Mode « fire-and-forget » des outils** présent dans la doc fournisseur du SDK mais non publié.
21. **`usage` du streaming** : sémantique non documentée ; valeurs de `completion_tokens` suspectes.
22. **Formulation des états d'agent** : `listening`, `thinking`, `speaking` « and more » — liste complète non fournie.
23. **Webhooks** : pas de documentation des chemins API d'abonnement, ni des événements au-delà des trois types ; « l'API accepte des URL HTTP ».
24. **Téléphonie** : date de lancement, sécurité, tarifs et opérateurs compatibles non publiés.

## Annexe — Couverture

| Fichier | Statut | Source |
| --- | --- | --- |
| text-to-speech/overview.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/overview.md |
| text-to-speech/quickstarts/generate-speech.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/quickstarts/generate-speech.md |
| text-to-speech/generate-speech.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/generate-speech.md |
| text-to-speech/stream-speech.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/stream-speech.md |
| text-to-speech/voices.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/voices.md |
| text-to-speech/voice-cloning.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/voice-cloning.md |
| text-to-speech/emotion-tags.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/emotion-tags.md |
| text-to-speech/style-instructions.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/style-instructions.md |
| text-to-speech/custom-pronunciation.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/custom-pronunciation.md |
| text-to-speech/troubleshooting.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/text-to-speech/troubleshooting.md |
| voice-agents/overview.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/overview.md |
| voice-agents/quickstarts/build-a-voice-agent.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/quickstarts/build-a-voice-agent.md |
| voice-agents/configuration.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/configuration.md |
| voice-agents/sessions.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/sessions.md |
| voice-agents/agents.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/agents.md |
| voice-agents/tools.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/tools.md |
| voice-agents/webhooks.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/webhooks.md |
| voice-agents/telephony.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/telephony.md |
| voice-agents/browser.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/browser.md |
| voice-agents/audio-interface.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/audio-interface.md |
| voice-agents/custom-audio.md | ✅ lu en entier | https://docs.mistral.ai/studio/audio/voice-agents/custom-audio.md |
| deprecated/overview.md | ⚠️ « parcouru » (lu en entier, ancienne API, résumé en §7.3 seulement) | https://docs.mistral.ai/studio/audio/deprecated/overview.md |
| deprecated/text_to_speech.md | ⚠️ « parcouru » (lu en entier, résumé en §7.3) | https://docs.mistral.ai/studio/audio/deprecated/text_to_speech.md |
| deprecated/text_to_speech/speech.md | ⚠️ « parcouru » (lu en entier, résumé en §7.3) | https://docs.mistral.ai/studio/audio/deprecated/text_to_speech/speech.md |
| deprecated/text_to_speech/voices.md | ⚠️ « parcouru » (lu en entier, résumé en §7.3) | https://docs.mistral.ai/studio/audio/deprecated/text_to_speech/voices.md |
| deprecated/speech_to_text.md | ⚠️ « parcouru » (lu en entier ; STT hors périmètre, résumé en §7.3) | https://docs.mistral.ai/studio/audio/deprecated/speech_to_text.md |
| deprecated/speech_to_text/offline_transcription.md | ⚠️ « parcouru » (titres, paramètres, compatibilité OpenAI et FAQ lus ; exemples de code non lus ; STT hors périmètre) | https://docs.mistral.ai/studio/audio/deprecated/speech_to_text/offline_transcription.md |
| deprecated/speech_to_text/realtime_transcription.md | ⚠️ « parcouru » (endpoint, usage de base, target delay, dual delay lus ; longs exemples non lus ; STT hors périmètre) | https://docs.mistral.ai/studio/audio/deprecated/speech_to_text/realtime_transcription.md |
| deprecated/speech_to_text/realtime_transcription/client_auth.md | ⚠️ « parcouru » (lu en entier ; résumé en §7.3) | https://docs.mistral.ai/studio/audio/deprecated/speech_to_text/realtime_transcription/client_auth.md |

Vérifications complémentaires dans la spec OpenAPI locale : `/v1/audio/speech`, `SpeechRequest`, `SpeechOutputFormat`, `IPAPhoneme`, événements SSE, `/v1/audio/voices*`, `/v2/audio/voices`, `VoiceCreateRequest`, `VoiceUpdateRequest`, `VoiceResponse`, `VoiceGender`, `VoiceKind`, `VoiceListPage`, `/v1/client/sessions` ; absence constatée de tout endpoint `audio/sessions`, `audio/agents` ou webhooks d'agents vocaux.
