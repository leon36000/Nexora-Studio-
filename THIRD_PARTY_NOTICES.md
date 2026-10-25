# Notices de tiers

Nexora intègre et modifie les logiciels open source suivants. Leurs licences et notices d'origine sont conservées dans chaque dossier.

| Composant Nexora | Dossier | Logiciel d'origine | Licence | Notices conservées |
|---|---|---|---|---|
| Nexora WorkStudio | `workstudio/` | Sim (simstudioai/sim) v0.9.31 | Apache-2.0 | `workstudio/LICENSE`, `workstudio/NOTICE`, `workstudio/UPSTREAM.md` |
| Nexora API | `services/nexora-api/` | OpenGateLLM (etalab-ia/OpenGateLLM) 0.9.1 | MIT | `services/nexora-api/LICENSE`, `services/nexora-api/UPSTREAM.md` |
| Nexora Connect | `services/nexora-connect/` | OpenConnector (oomol-lab/open-connector) | Apache-2.0 | `services/nexora-connect/LICENSE.txt`, `services/nexora-connect/NOTICE.md`, `services/nexora-connect/UPSTREAM.md` |

## Ressources ajoutées par Nexora

| Ressource | Emplacement | Origine | Licence |
|---|---|---|---|
| Police Inter (variable, sous-ensemble latin ; statique 500 et 700) | `workstudio/apps/sim/app/_styles/fonts/season/`, `workstudio/apps/sim/public/brand/fonts/` ; tracés du logo dans `workstudio/packages/emcn/src/components/sim-wordmark/paths.ts` et les images de `workstudio/apps/sim/public/` | The Inter Project Authors (rsms/inter), paquets npm `@fontsource-variable/inter` et `@fontsource/inter` 5.2.8 | SIL Open Font License 1.1 (`OFL.txt` à côté des fichiers) |

Les polices commerciales livrées par le projet d'origine (Season Sans, Söhne) ont été retirées : leur licence n'est pas l'Apache-2.0 du code.

Les dépendances de ces composants (paquets npm et PyPI) gardent leurs propres licences, déclarées dans leurs fichiers de verrouillage (`bun.lock`, `package-lock.json`, `uv.lock`).

Lecture des PDF numériques par Nexora API (v3, K4) : pdfplumber 0.11.10 et pdfminer.six (MIT), pypdfium2 5.14.0 (Apache-2.0 ou BSD-3-Clause ; il embarque PDFium, BSD-3-Clause), Pillow 12.3.0 (MIT-CMU), et leurs dépendances cryptography (Apache-2.0 ou BSD-3-Clause), cffi (MIT) et charset-normalizer (MIT). Docling (MIT) a été écarté : ses dépendances (PyTorch et des bibliothèques CUDA sous licence propriétaire NVIDIA, environ 3,4 Go de paquets) ne conviennent pas au serveur visé.

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

Les noms et marques des services tiers cités par les intégrations (Slack, Google, etc.) restent la propriété de leurs titulaires. Ils ne sont utilisés que pour identifier ces intégrations.
