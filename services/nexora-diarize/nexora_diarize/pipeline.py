"""Who speaks when: sherpa-onnx (Apache-2.0) on the CPU.

Three steps, all offline: a pyannote 3.0 segmentation model (MIT) cuts the recording into speech
stretches, an ERes2Net model (Apache-2.0) turns each stretch into a voice print, and an
agglomerative clustering groups the stretches by voice. The clustering threshold decides how
different two voices must be to count as two speakers; it is fixed by measurement (see the
ledger), and `num_speakers` overrides it when the caller knows the count.
"""

from dataclasses import dataclass
import logging
from pathlib import Path
import threading

import numpy as np
import sherpa_onnx

logger = logging.getLogger(__name__)

SAMPLE_RATE = 16000
SEGMENTATION_MODEL = "segmentation.onnx"
EMBEDDING_MODEL = "embedding.onnx"


@dataclass(frozen=True)
class Turn:
    start: float
    end: float
    speaker: int


class Diarizer:
    def __init__(self, models_dir: Path, threads: int = 2, threshold: float = 0.85):
        self.models_dir = models_dir
        self.threads = threads
        self.threshold = threshold
        # One recording at a time: the work is CPU-bound, and the models take memory per run.
        self._lock = threading.Lock()
        missing = [name for name in (SEGMENTATION_MODEL, EMBEDDING_MODEL) if not (models_dir / name).is_file()]
        if missing:
            raise FileNotFoundError(f"missing diarization models in {models_dir}: {', '.join(missing)}")

    def diarize(self, samples: np.ndarray, num_speakers: int | None) -> list[Turn]:
        """Speaker turns of 16 kHz mono float32 samples, sorted by start; `speaker` counts from 0."""
        if len(samples) < SAMPLE_RATE // 2:
            return []
        config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
            segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
                pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(self.models_dir / SEGMENTATION_MODEL)),
                num_threads=self.threads,
            ),
            embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(self.models_dir / EMBEDDING_MODEL), num_threads=self.threads),
            clustering=sherpa_onnx.FastClusteringConfig(num_clusters=num_speakers or -1, threshold=self.threshold),
            min_duration_on=0.3,
            min_duration_off=0.5,
        )
        with self._lock:
            result = sherpa_onnx.OfflineSpeakerDiarization(config).process(np.ascontiguousarray(samples, dtype=np.float32)).sort_by_start_time()
        return [Turn(start=round(item.start, 3), end=round(item.end, 3), speaker=int(item.speaker)) for item in result]
