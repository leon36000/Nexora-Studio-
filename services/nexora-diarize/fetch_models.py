"""Image build step: downloads the two diarization models once, checks their SHA-256 and lays them out in /models.

The running service never contacts the network: everything it needs is baked into the image here.
"""

import hashlib
import shutil
import sys
import tarfile
import tempfile
import urllib.request
from pathlib import Path

RELEASES = "https://github.com/k2-fsa/sherpa-onnx/releases/download"
# Segmentation: pyannote segmentation 3.0 exported to ONNX by k2-fsa (MIT, Copyright CNRS), with its LICENSE file.
SEGMENTATION = (
    f"{RELEASES}/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2",
    "24615ee884c897d9d2ba09bb4d30da6bb1b15e685065962db5b02e76e4996488",
)
# Voice prints: ERes2Net trained on VoxCeleb (3D-Speaker, Apache-2.0).
EMBEDDING = (
    f"{RELEASES}/speaker-recongition-models/3dspeaker_speech_eres2net_sv_en_voxceleb_16k.onnx",
    "c59158379255ad66e161679cca6af8d52d51e389e3224ab7d7a7baae295c2db5",
)


def download(url: str, expected: str, target: Path) -> None:
    digest = hashlib.sha256()
    with urllib.request.urlopen(url, timeout=300) as response, target.open("wb") as out:
        while chunk := response.read(1 << 20):
            digest.update(chunk)
            out.write(chunk)
    if digest.hexdigest() != expected:
        raise SystemExit(f"unexpected SHA-256 for {url}: {digest.hexdigest()}")


def main(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as work:
        archive = Path(work) / "segmentation.tar.bz2"
        download(*SEGMENTATION, archive)
        with tarfile.open(archive) as tar:
            tar.extractall(work, filter="data")
        folder = Path(work) / "sherpa-onnx-pyannote-segmentation-3-0"
        shutil.copy(folder / "model.onnx", destination / "segmentation.onnx")
        shutil.copy(folder / "LICENSE", destination / "LICENSE-pyannote-segmentation-3.0.txt")
    download(*EMBEDDING, destination / "embedding.onnx")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "/models"))
