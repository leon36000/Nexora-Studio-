"""Nexora: fetches the voice models once, before the speech server starts offline.

The server runs with HF_HUB_OFFLINE=1 so that loading a model (after every idle period) never
contacts Hugging Face. This script runs online just before it, and only downloads the models that
are not already in the volume: the transcription model (NEXORA_WHISPER_MODEL) and the voice for
speech synthesis (NEXORA_TTS_MODEL). It never stops the server from starting (the bootstrap then
reports a missing model).
"""

import os
import sys

import huggingface_hub

# The files the server reads, as its own download endpoint fetches them (README: the model card).
# Whisper models carry `model.bin`; Piper voices carry `model.onnx`.
FILES = ["config.json", "preprocessor_config.json", "model.bin", "model.onnx", "tokenizer.json", "vocabulary.*", "README.md"]
VARIABLES = ["NEXORA_WHISPER_MODEL", "NEXORA_TTS_MODEL"]


def fetch(model: str) -> None:
    try:
        huggingface_hub.snapshot_download(repo_id=model, repo_type="model", allow_patterns=FILES, local_files_only=True)
        return
    except Exception:  # noqa: BLE001 — not in the volume yet
        pass
    print(f"nexora: downloading the voice model {model} (once)", file=sys.stderr)
    try:
        huggingface_hub.snapshot_download(repo_id=model, repo_type="model", allow_patterns=FILES)
    except Exception as error:  # noqa: BLE001 — offline server: the bootstrap reports the missing model
        print(f"nexora: voice model download failed: {error}", file=sys.stderr)


def main() -> int:
    for variable in VARIABLES:
        model = (os.environ.get(variable) or "").strip()
        if model:
            fetch(model)
    return 0


if __name__ == "__main__":
    sys.exit(main())
