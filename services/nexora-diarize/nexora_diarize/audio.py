"""Any recording (wav, mp3, m4a, ogg, webm/opus…) as 16 kHz mono float32 samples, decoded by PyAV."""

import io

import av
import numpy as np

SAMPLE_RATE = 16000


class DiarizeError(Exception):
    """A request the service refuses, with the reason the caller shows."""


def decode_audio(data: bytes) -> np.ndarray:
    try:
        container = av.open(io.BytesIO(data))
    except (av.error.FFmpegError, ValueError, OSError) as error:
        raise DiarizeError("the file is not a readable recording") from error
    with container:
        if not container.streams.audio:
            raise DiarizeError("the file has no audio track")
        resampler = av.AudioResampler(format="flt", layout="mono", rate=SAMPLE_RATE)
        chunks: list[np.ndarray] = []
        try:
            for frame in container.decode(audio=0):
                for resampled in resampler.resample(frame):
                    chunks.append(resampled.to_ndarray().reshape(-1))
            for resampled in resampler.resample(None):
                chunks.append(resampled.to_ndarray().reshape(-1))
        except (av.error.FFmpegError, ValueError) as error:
            raise DiarizeError("the recording is damaged and cannot be decoded") from error
    return np.concatenate(chunks).astype(np.float32) if chunks else np.zeros(0, dtype=np.float32)
