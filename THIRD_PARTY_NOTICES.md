# Notices de tiers

Nexora intègre et modifie les logiciels open source suivants. Leurs licences et notices d'origine sont conservées dans chaque dossier.

| Composant Nexora | Dossier | Logiciel d'origine | Licence | Notices conservées |
|---|---|---|---|---|
| Nexora WorkStudio | `workstudio/` | Sim (simstudioai/sim) v0.9.31 | Apache-2.0 | `workstudio/LICENSE`, `workstudio/NOTICE`, `workstudio/UPSTREAM.md` |
| Nexora API | `services/nexora-api/` | OpenGateLLM (etalab-ia/OpenGateLLM) 0.9.1 | MIT | `services/nexora-api/LICENSE`, `services/nexora-api/UPSTREAM.md` |
| Nexora Connect | `services/nexora-connect/` | OpenConnector (oomol-lab/open-connector) | Apache-2.0 | `services/nexora-connect/LICENSE.txt`, `services/nexora-connect/NOTICE.md`, `services/nexora-connect/UPSTREAM.md` |

## Ressources ajoutées par Nexora AI

| Ressource | Emplacement | Origine | Licence |
|---|---|---|---|
| Police Inter (variable, sous-ensemble latin ; statique 500 et 700) | `workstudio/apps/sim/app/_styles/fonts/season/`, `workstudio/apps/sim/public/brand/fonts/` ; tracés du logo dans `workstudio/packages/emcn/src/components/sim-wordmark/paths.ts` et les images de `workstudio/apps/sim/public/` | The Inter Project Authors (rsms/inter), paquets npm `@fontsource-variable/inter` et `@fontsource/inter` 5.2.8 | SIL Open Font License 1.1 (`OFL.txt` à côté des fichiers) |

Les polices commerciales livrées par le projet d'origine (Season Sans, Söhne) ont été retirées : leur licence n'est pas l'Apache-2.0 du code.

Les dépendances de ces composants (paquets npm et PyPI) gardent leurs propres licences, déclarées dans leurs fichiers de verrouillage (`bun.lock`, `package-lock.json`, `uv.lock`).

Lecture des PDF numériques par Nexora API (v3, K4) : pdfplumber 0.11.10 et pdfminer.six (MIT), pypdfium2 5.14.0 (Apache-2.0 ou BSD-3-Clause ; il embarque PDFium, BSD-3-Clause), Pillow 12.3.0 (MIT-CMU), et leurs dépendances cryptography (Apache-2.0 ou BSD-3-Clause), cffi (MIT) et charset-normalizer (MIT). Docling (MIT) a été écarté : ses dépendances (PyTorch et des bibliothèques CUDA sous licence propriétaire NVIDIA, environ 3,4 Go de paquets) ne conviennent pas au serveur visé.

Interpréteur de code (v3, K5, image `nexora/code` construite depuis `deploy/code/`, profil « code ») : Python 3.12 (image officielle `python:3.12-slim-bookworm`, PSF License ; Debian bookworm et ses paquets sous leurs licences respectives), pandas 3.0.6 (BSD-3-Clause), numpy 2.5.4 (BSD-3-Clause), matplotlib 3.11.2 (licence Matplotlib, de type PSF), openpyxl 3.1.5 et et-xmlfile 2.0.0 (MIT), contourpy 1.4.0 (BSD-3-Clause), cycler 0.12.1 (BSD-3-Clause), fonttools 4.67.0 (MIT), kiwisolver 1.5.1 (BSD-3-Clause), packaging 26.3 (Apache-2.0 ou BSD-2-Clause), pillow 13.0.0 (MIT-CMU), pyparsing 3.3.3 (MIT), python-dateutil 2.9.0.post0 (Apache-2.0 ou BSD-3-Clause), six 1.17.0 (MIT) ; versions et empreintes dans `deploy/code/requirements.txt`. Le contrôleur `deploy/code/sandbox.py` et `runner.py` sont du code Nexora (bibliothèque standard seulement).

Voix locale (v3, K12), profil `voice` de `deploy/compose.yml` — aucun de ces composants n'est copié dans le dépôt, ils sont tirés à l'installation ou à la construction de l'image :

| Composant | Rôle | Licence | Remarque |
|---|---|---|---|
| speaches 0.8.3 (speaches-ai/speaches) | serveur de transcription (faster-whisper, modèle `Systran/faster-whisper-small`, MIT) et de synthèse vocale compatible OpenAI | MIT | image officielle tirée par le client, non redistribuée par Nexora. Elle embarque piper-tts et piper-phonemize (MIT), qui lient espeak-ng (GPL-3.0) : service séparé, joint par HTTP, sans lien avec le code de Nexora |
| Voix `speaches-ai/piper-fr_FR-siwis-medium` | voix française par défaut de la synthèse vocale | CC-BY-4.0 (jeu de données SIWIS, Université d'Édimbourg) | usage commercial permis avec attribution : « Voix siwis, SIWIS French Speech Synthesis Database, Université d'Édimbourg, CC-BY-4.0 » |
| sherpa-onnx 1.12.40 (k2-fsa/sherpa-onnx) | service `nexora-diarize` : segmentation, empreintes de voix et regroupement des intervenants, sur CPU | Apache-2.0 | |
| pyannote/segmentation-3.0, exporté en ONNX par k2-fsa | segmentation en tours de parole (service `nexora-diarize`) | MIT (© CNRS), fichier de licence livré avec le modèle | distribué par k2-fsa sur GitHub, sans condition d'accès Hugging Face |
| ERes2Net (3D-Speaker, `3dspeaker_speech_eres2net_sv_en_voxceleb_16k`) | empreintes de voix (service `nexora-diarize`) | Apache-2.0 | |
| PyAV 19 (PyAV-Org/PyAV) | décodage des enregistrements (service `nexora-diarize`) | BSD-3-Clause ; FFmpeg embarqué en LGPL-2.1 | |

Écartés : pyannote.audio avec ses modèles d'empreintes (accès conditionné par un formulaire Hugging Face), NVIDIA NeMo TitaNet-small (licence du modèle non vérifiable), Reverb diarization de Rev.com (licence propre), piper1-gpl (GPL-3.0).

Détection locale des données personnelles (v3, K14), profil `pii` de `deploy/compose.yml` — le code du service est celui du cœur (`workstudio/apps/pii`, Apache-2.0) ; les composants suivants sont tirés à la construction de l'image, jamais copiés dans le dépôt :

| Composant | Rôle | Licence | Remarque |
|---|---|---|---|
| Presidio analyzer et anonymizer 2.2.362 (microsoft/presidio) | reconnaissance et masquage des données personnelles | MIT | |
| spaCy 3.8.14 (explosion/spaCy) | analyse du texte (entités nommées) | MIT | |
| `en_core_web_sm` 3.8.0 | modèle anglais | MIT | somme SHA-256 vérifiée à la construction (`workstudio/docker/pii-models.sha256`) |
| `fr_core_news_sm` 3.8.0 | modèle français : reconnaît les noms de personnes | LGPL-LR (Lesser General Public License For Linguistic Resources ; corpus UD French Sequoia et WikiNER) | **n'est pas une licence permissive.** Ressource de données utilisée telle quelle par un service séparé, tirée à la construction de l'image, non modifiée et non redistribuée par Nexora. Pour s'en passer : construire avec `--build-arg SPACY_MODELS="en_core_web_sm-3.8.0" --build-arg PII_SPACY_MODELS="en:en_core_web_sm"` (les motifs et sommes de contrôle — IBAN, e-mail, carte, téléphone, numéro de sécurité sociale — restent actifs, les noms ne sont plus reconnus en français) |
| phonenumbers, tldextract, regex, FastAPI, uvicorn | dépendances de Presidio et du service | Apache-2.0, BSD-3-Clause, Apache-2.0, MIT, BSD-3-Clause | |

Les noms et marques des services tiers cités par les intégrations (Slack, Google, etc.) restent la propriété de leurs titulaires. Ils ne sont utilisés que pour identifier ces intégrations.
