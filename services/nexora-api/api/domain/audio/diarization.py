from api.domain import BaseModel
from api.domain.audio.entities import Segment, TimedWord

# A word further than this from every turn (in seconds) takes the speaker of the word before it.
MAX_DISTANCE_TO_TURN = 1.5
# A silence longer than this inside one speaker's words starts a new segment.
MAX_SILENCE_IN_SEGMENT = 0.8


class SpeakerTurn(BaseModel):
    start: float
    end: float
    speaker: int


def assign_speakers(words: list[TimedWord], turns: list[SpeakerTurn]) -> list[Segment]:
    """Segments of consecutive words of the same speaker, labelled `speaker_1…speaker_N` in order of appearance.

    The diarizer's own numbers mean nothing outside its answer, so they are renumbered: the first voice heard
    is always `speaker_1`. A word belongs to the turn that covers most of it; outside every turn it takes the
    nearest turn within 1.5 s, else the speaker of the word before it, so no word is left without a speaker.
    """
    if not words:
        return []

    ordered_turns = sorted(turns, key=lambda turn: turn.start)
    raw_speakers: list[int | None] = []
    first = 0
    for word in words:
        while first < len(ordered_turns) and ordered_turns[first].end < word.start - MAX_DISTANCE_TO_TURN:
            first += 1
        raw_speakers.append(_speaker_of(word, ordered_turns, first))

    previous = next((speaker for speaker in raw_speakers if speaker is not None), 0)
    speakers: list[int] = []
    for speaker in raw_speakers:
        previous = previous if speaker is None else speaker
        speakers.append(previous)

    label_of: dict[int, str] = {}
    groups: list[tuple[str, list[TimedWord]]] = []
    for word, speaker in zip(words, speakers, strict=True):
        label = label_of.setdefault(speaker, f"speaker_{len(label_of) + 1}")
        if groups and groups[-1][0] == label and word.start - groups[-1][1][-1].end <= MAX_SILENCE_IN_SEGMENT:
            groups[-1][1].append(word)
        else:
            groups.append((label, [word]))

    joiner = "" if any(word.word.startswith(" ") for word in words) else " "
    return [
        Segment(
            id=index,
            text=joiner.join(word.word for word in group).strip(),
            start=group[0].start,
            end=group[-1].end,
            speaker=label,
        )
        for index, (label, group) in enumerate(groups)
    ]


def _speaker_of(word: TimedWord, turns: list[SpeakerTurn], first: int) -> int | None:
    best_overlap, best_speaker = 0.0, None
    nearest_distance, nearest_speaker = float("inf"), None
    for turn in turns[first:]:
        if turn.start > word.end + MAX_DISTANCE_TO_TURN:
            break
        overlap = min(word.end, turn.end) - max(word.start, turn.start)
        if overlap > best_overlap:
            best_overlap, best_speaker = overlap, turn.speaker
        distance = max(turn.start - word.end, word.start - turn.end, 0.0)
        if distance < nearest_distance:
            nearest_distance, nearest_speaker = distance, turn.speaker

    if best_speaker is not None:
        return best_speaker
    return nearest_speaker
