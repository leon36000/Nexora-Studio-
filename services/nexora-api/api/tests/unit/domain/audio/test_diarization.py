from api.domain.audio.diarization import SpeakerTurn, TimedWord, assign_speakers


def _words(*items: tuple[float, float, str]) -> list[TimedWord]:
    return [TimedWord(start=start, end=end, word=word) for start, end, word in items]


class TestAssignSpeakers:
    def test_groups_the_words_of_each_turn_into_one_segment(self):
        # Arrange
        words = _words((0.0, 0.4, " Bonjour"), (0.4, 0.8, " à"), (0.8, 1.2, " tous."), (2.0, 2.4, " Salut"), (2.4, 2.8, " Marie."))
        turns = [SpeakerTurn(start=0.0, end=1.3, speaker=4), SpeakerTurn(start=1.9, end=3.0, speaker=7)]

        # Act
        segments = assign_speakers(words, turns)

        # Assert
        assert [(s.speaker, s.text, s.start, s.end) for s in segments] == [
            ("speaker_1", "Bonjour à tous.", 0.0, 1.2),
            ("speaker_2", "Salut Marie.", 2.0, 2.8),
        ]
        assert [s.id for s in segments] == [0, 1]

    def test_numbers_the_speakers_in_order_of_appearance_not_by_the_diarizer_label(self):
        # Arrange: the diarizer calls the first voice 5 and the second 0
        words = _words((0.0, 0.5, " un"), (3.0, 3.5, " deux"), (6.0, 6.5, " trois"))
        turns = [SpeakerTurn(start=0.0, end=1.0, speaker=5), SpeakerTurn(start=3.0, end=4.0, speaker=0), SpeakerTurn(start=6.0, end=7.0, speaker=5)]

        # Act
        segments = assign_speakers(words, turns)

        # Assert
        assert [s.speaker for s in segments] == ["speaker_1", "speaker_2", "speaker_1"]

    def test_a_single_turn_gives_a_single_speaker(self):
        # Arrange
        words = _words((0.0, 0.5, " Je"), (0.5, 1.0, " dicte"), (1.0, 1.6, " un"), (1.6, 2.2, " texte."))

        # Act
        segments = assign_speakers(words, [SpeakerTurn(start=0.0, end=2.3, speaker=0)])

        # Assert
        assert [(s.speaker, s.text) for s in segments] == [("speaker_1", "Je dicte un texte.")]

    def test_no_turn_at_all_gives_the_first_speaker_everywhere(self):
        # Arrange / Act
        segments = assign_speakers(_words((0.0, 0.5, " Bonjour"), (0.5, 1.0, " tout")), [])

        # Assert
        assert [s.speaker for s in segments] == ["speaker_1"]

    def test_a_word_outside_every_turn_takes_the_nearest_turn_within_a_second_and_a_half(self):
        # Arrange: "voilà" starts 0.5 s after the first turn ended and 3 s before the second begins
        words = _words((0.0, 0.5, " Oui"), (0.9, 1.4, " c'est"), (1.8, 2.3, " et"), (2.9, 3.0, " puis"), (3.5, 3.9, " voilà"), (6.5, 7.0, " Non"))
        turns = [SpeakerTurn(start=0.0, end=3.0, speaker=1), SpeakerTurn(start=6.5, end=7.5, speaker=2)]

        # Act
        segments = assign_speakers(words, turns)

        # Assert
        assert [(s.speaker, s.text) for s in segments] == [("speaker_1", "Oui c'est et puis voilà"), ("speaker_2", "Non")]

    def test_a_word_far_from_any_turn_keeps_the_previous_speaker_never_none(self):
        # Arrange
        words = _words((0.0, 0.5, " Début"), (9.0, 9.5, " seul"))
        turns = [SpeakerTurn(start=0.0, end=1.0, speaker=1), SpeakerTurn(start=20.0, end=21.0, speaker=2)]

        # Act
        segments = assign_speakers(words, turns)

        # Assert
        assert [(s.speaker, s.text) for s in segments] == [("speaker_1", "Début"), ("speaker_1", "seul")]

    def test_leading_words_before_any_turn_take_the_first_known_speaker(self):
        # Arrange
        words = _words((0.0, 0.3, " Euh"), (5.0, 5.5, " Bonjour"))
        turns = [SpeakerTurn(start=5.0, end=6.0, speaker=3)]

        # Act
        segments = assign_speakers(words, turns)

        # Assert
        assert [(s.speaker, s.text) for s in segments] == [("speaker_1", "Euh"), ("speaker_1", "Bonjour")]

    def test_a_long_silence_inside_one_speaker_starts_a_new_segment(self):
        # Arrange
        words = _words((0.0, 0.5, " Premier"), (0.5, 1.0, " point."), (6.0, 6.5, " Second"), (6.5, 7.0, " point."))
        turns = [SpeakerTurn(start=0.0, end=7.0, speaker=0)]

        # Act
        segments = assign_speakers(words, turns)

        # Assert
        assert [(s.speaker, s.text) for s in segments] == [("speaker_1", "Premier point."), ("speaker_1", "Second point.")]

    def test_overlapping_turns_give_the_word_to_the_voice_that_covers_most_of_it(self):
        # Arrange: "Attends" is covered 0.2 s by the first voice and 0.9 s by the second
        words = _words((0.0, 0.5, " Salut"), (1.0, 2.0, " Attends"))
        turns = [SpeakerTurn(start=0.0, end=1.2, speaker=1), SpeakerTurn(start=1.1, end=3.0, speaker=2)]

        # Act
        segments = assign_speakers(words, turns)

        # Assert
        assert [(s.speaker, s.text) for s in segments] == [("speaker_1", "Salut"), ("speaker_2", "Attends")]

    def test_no_word_gives_no_segment(self):
        assert assign_speakers([], [SpeakerTurn(start=0.0, end=1.0, speaker=0)]) == []

    def test_words_without_leading_space_are_joined_with_spaces(self):
        # Arrange: some providers return bare words
        words = _words((0.0, 0.4, "Bonjour"), (0.4, 0.8, "tout"), (0.8, 1.2, "le"), (1.2, 1.6, "monde"))

        # Act
        segments = assign_speakers(words, [SpeakerTurn(start=0.0, end=2.0, speaker=0)])

        # Assert
        assert segments[0].text == "Bonjour tout le monde"
