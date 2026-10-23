"""Nexora: fetches the transcription model once, before the Whisper server starts offline.

The server runs with HF_HUB_OFFLINE=1 so that loading its model (after every idle period) never
contacts Hugging Face. This script runs online just before it, and only downloads when the model
is not already in the volume; it never stops the server from starting (the bootstrap then reports
the missing model).
"""

import os
import sys

import huggingface_hub

# The files the server reads, as its own download endpoint fetches them (README: the model card).
FILES = ["config.json", "preprocessor_config.json", "model.bin", "tokenizer.json", "vocabulary.*", "README.md"]


def main() -> int:
    model = (os.environ.get("NEXORA_WHISPER_MODEL") or "").strip()
    if not model:
        return 0
    try:
        huggingface_hub.snapshot_download(repo_id=model, repo_type="model", allow_patterns=FILES, local_files_only=True)
        return 0
    except Exception:  # noqa: BLE001 — not in the volume yet
        pass
    print(f"nexora: downloading the transcription model {model} (once)", file=sys.stderr)
    try:
        huggingface_hub.snapshot_download(repo_id=model, repo_type="model", allow_patterns=FILES)
    except Exception as error:  # noqa: BLE001 — offline server: the bootstrap reports the missing model
        print(f"nexora: transcription model download failed: {error}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
