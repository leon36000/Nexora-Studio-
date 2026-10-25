# Service de diarisation Nexora

Dit **qui parle quand** dans un enregistrement : `POST /diarize` (formulaire `file`, `num_speakers` facultatif) répond `{"duration", "speakers", "turns": [{"start", "end", "speaker"}]}`. Nexora API l'interroge pour `response_format=diarized_json` et fusionne les tours avec les mots horodatés de Whisper.

- **Brique** : [sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) (Apache-2.0), sur CPU, hors ligne.
- **Modèles** (cuits dans l'image, vérifiés par SHA-256, voir `fetch_models.py`) :
  - segmentation `pyannote/segmentation-3.0`, exportée en ONNX par k2-fsa, licence **MIT** (© CNRS), distribuée avec son fichier de licence ;
  - empreintes de voix **ERes2Net** (3D-Speaker, entraîné sur VoxCeleb), licence **Apache-2.0**.
- **Réglages** : `NEXORA_DIARIZE_THREADS` (2), `NEXORA_DIARIZE_THRESHOLD` (0,85 : plus il est bas, plus le service sépare de voix), `NEXORA_DIARIZE_MAX_SECONDS` (7 200).
- **Mesure** : voir la section K12 de `docs/superpowers/plans/2026-10-23-nexora-v3-ledger.md`.

Développement : `pip install -e ".[dev]"`, puis `NEXORA_DIARIZE_MODELS=<dossier avec segmentation.onnx et embedding.onnx> pytest`.
