// Focus rhythms recall — the read side. Pure functions, hour injected, so every
// window and every boundary is directly testable with no clock mocking.

import {
  RHYTHM_INVITATION,
  RHYTHM_VARIES_SUMMARY,
  activeRhythm,
  isRhythmActiveNow,
  rhythmSummary,
} from '../rhythmRecall';

describe('activeRhythm', () => {
  it('maps each window to its own hours', () => {
    expect(activeRhythm(5)).toBe('early_morning');
    expect(activeRhythm(8)).toBe('early_morning');
    expect(activeRhythm(9)).toBe('mid_morning');
    expect(activeRhythm(11)).toBe('mid_morning');
    expect(activeRhythm(12)).toBe('afternoon');
    expect(activeRhythm(16)).toBe('afternoon');
    expect(activeRhythm(17)).toBe('evening');
    expect(activeRhythm(21)).toBe('evening');
  });

  it('flips from evening to late night at 22:00', () => {
    expect(activeRhythm(21)).toBe('evening');
    expect(activeRhythm(22)).toBe('late_night');
  });

  it('wraps late night across midnight', () => {
    expect(activeRhythm(22)).toBe('late_night');
    expect(activeRhythm(23)).toBe('late_night');
    expect(activeRhythm(0)).toBe('late_night');
    expect(activeRhythm(1)).toBe('late_night');
  });

  it('leaves the small hours in no window at all', () => {
    // Deliberate silence, not a gap to fill.
    expect(activeRhythm(2)).toBeNull();
    expect(activeRhythm(3)).toBeNull();
    expect(activeRhythm(4)).toBeNull();
  });

  it('never returns the varies key, since it is not a time', () => {
    for (let h = 0; h < 24; h += 1) {
      expect(activeRhythm(h)).not.toBe('varies');
    }
  });

  it('covers every hour except the small hours', () => {
    const unmatched: number[] = [];
    for (let h = 0; h < 24; h += 1) {
      if (activeRhythm(h) === null) unmatched.push(h);
    }
    expect(unmatched).toEqual([2, 3, 4]);
  });
});

describe('rhythmSummary', () => {
  it('returns null with no windows, so the caller keeps the invitation', () => {
    expect(rhythmSummary([])).toBeNull();
    expect(RHYTHM_INVITATION).toBe('Notice when focus comes easiest for you.');
  });

  it('reflects a single window', () => {
    expect(rhythmSummary(['afternoon'])).toBe(
      'Focus tends to come easiest for you in the afternoon.'
    );
  });

  it('drops the article for late night so the sentence stays grammatical', () => {
    expect(rhythmSummary(['late_night'])).toBe(
      'Focus tends to come easiest for you late at night.'
    );
  });

  it('joins two windows with "and"', () => {
    expect(rhythmSummary(['early_morning', 'evening'])).toBe(
      'Focus tends to come easiest for you in the early morning and in the evening.'
    );
  });

  it('joins three windows', () => {
    expect(rhythmSummary(['mid_morning', 'afternoon', 'late_night'])).toBe(
      'Focus tends to come easiest for you in the mid-morning and in the afternoon and late at night.'
    );
  });

  it('handles all five timed windows', () => {
    expect(
      rhythmSummary([
        'early_morning',
        'mid_morning',
        'afternoon',
        'evening',
        'late_night',
      ])
    ).toBe(
      'Focus tends to come easiest for you in the early morning and in the mid-morning and in the afternoon and in the evening and late at night.'
    );
  });

  it('orders windows canonically, not by the order they were tapped', () => {
    expect(rhythmSummary(['evening', 'early_morning'])).toBe(
      rhythmSummary(['early_morning', 'evening'])
    );
  });

  it('gives "varies" alone its own sentence, never the invitation', () => {
    expect(rhythmSummary(['varies'])).toBe(RHYTHM_VARIES_SUMMARY);
    expect(rhythmSummary(['varies'])).toBe("Your focus doesn't follow one fixed time.");
  });

  it('ignores "varies" when real windows are also set', () => {
    expect(rhythmSummary(['varies', 'afternoon'])).toBe(
      'Focus tends to come easiest for you in the afternoon.'
    );
    expect(rhythmSummary(['afternoon', 'varies', 'evening'])).toBe(
      'Focus tends to come easiest for you in the afternoon and in the evening.'
    );
  });

  it('ignores unknown keys without crashing', () => {
    expect(rhythmSummary(['not_a_key'])).toBeNull();
    expect(rhythmSummary(['not_a_key', 'evening'])).toBe(
      'Focus tends to come easiest for you in the evening.'
    );
  });

  it('never emits a count, score, or streak', () => {
    const all = rhythmSummary([
      'early_morning',
      'mid_morning',
      'afternoon',
      'evening',
      'late_night',
    ]);
    expect(all).not.toMatch(/\d/);
    expect(all).not.toMatch(/streak|best|%|score/i);
  });
});

describe('isRhythmActiveNow', () => {
  it('matches in-window for each real window', () => {
    expect(isRhythmActiveNow(['early_morning'], 6)).toBe(true);
    expect(isRhythmActiveNow(['mid_morning'], 10)).toBe(true);
    expect(isRhythmActiveNow(['afternoon'], 14)).toBe(true);
    expect(isRhythmActiveNow(['evening'], 19)).toBe(true);
    expect(isRhythmActiveNow(['late_night'], 23)).toBe(true);
  });

  it('does not match out-of-window for each real window', () => {
    expect(isRhythmActiveNow(['early_morning'], 14)).toBe(false);
    expect(isRhythmActiveNow(['mid_morning'], 6)).toBe(false);
    expect(isRhythmActiveNow(['afternoon'], 23)).toBe(false);
    expect(isRhythmActiveNow(['evening'], 10)).toBe(false);
    expect(isRhythmActiveNow(['late_night'], 14)).toBe(false);
  });

  it('handles the late-night wrap on both sides of midnight', () => {
    // 23:30 and 00:30 are both inside the window the user set.
    expect(isRhythmActiveNow(['late_night'], 23)).toBe(true);
    expect(isRhythmActiveNow(['late_night'], 0)).toBe(true);
    // 03:00 is not: the summary still shows, but the line stays silent.
    expect(isRhythmActiveNow(['late_night'], 3)).toBe(false);
    expect(rhythmSummary(['late_night'])).not.toBeNull();
  });

  it('respects the evening / late-night boundary', () => {
    expect(isRhythmActiveNow(['evening'], 21)).toBe(true);
    expect(isRhythmActiveNow(['evening'], 22)).toBe(false);
    expect(isRhythmActiveNow(['late_night'], 22)).toBe(true);
    expect(isRhythmActiveNow(['late_night'], 21)).toBe(false);
  });

  it('never fires for "varies", at any hour', () => {
    for (let h = 0; h < 24; h += 1) {
      expect(isRhythmActiveNow(['varies'], h)).toBe(false);
    }
  });

  it('still fires for a real window set alongside "varies"', () => {
    expect(isRhythmActiveNow(['varies', 'afternoon'], 14)).toBe(true);
    expect(isRhythmActiveNow(['varies', 'afternoon'], 6)).toBe(false);
  });

  it('never fires with no windows set', () => {
    for (let h = 0; h < 24; h += 1) {
      expect(isRhythmActiveNow([], h)).toBe(false);
    }
  });
});
