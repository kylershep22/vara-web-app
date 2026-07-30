// Focus rhythms → habit time-of-day slot. Pure mapping, no clock anywhere, so
// every window combination is directly testable.
//
// The distinction these tests protect: this maps a STORED pattern onto a slot
// for a recurring habit. It is not the hub's "is now inside a window" check.
// If someone ever wires this to the current hour, the habit's schedule would
// depend on what time the user happened to open the create sheet.

import {
  TIME_OF_DAY_LABELS,
  mappedTimeOfDaySlots,
  rhythmNudgeAcceptLabel,
  rhythmNudgeSentence,
  suggestedTimeOfDayFromRhythms,
} from '../rhythmTimeOfDay';
import { TIMED_RHYTHM_KEYS_IN_ORDER } from '../focusRhythms';

describe('suggestedTimeOfDayFromRhythms — one window at a time', () => {
  it.each([
    ['early_morning', 'morning'],
    ['mid_morning', 'morning'],
    ['afternoon', 'afternoon'],
    ['evening', 'evening'],
  ])('%s suggests %s', (window, slot) => {
    expect(suggestedTimeOfDayFromRhythms([window])).toBe(slot);
  });

  it('late_night suggests nothing', () => {
    // Deliberate: the brand does not steer focus work into the small hours.
    expect(suggestedTimeOfDayFromRhythms(['late_night'])).toBeNull();
  });

  it('varies suggests nothing', () => {
    expect(suggestedTimeOfDayFromRhythms(['varies'])).toBeNull();
  });

  it('no windows at all suggests nothing', () => {
    expect(suggestedTimeOfDayFromRhythms([])).toBeNull();
  });

  it('an unrecognised window suggests nothing', () => {
    expect(suggestedTimeOfDayFromRhythms(['brunch'])).toBeNull();
  });

  it('never suggests "anytime", which is the absence of an aim', () => {
    for (const key of [...TIMED_RHYTHM_KEYS_IN_ORDER, 'varies', 'brunch']) {
      expect(suggestedTimeOfDayFromRhythms([key])).not.toBe('anytime');
    }
  });
});

describe('suggestedTimeOfDayFromRhythms — several windows', () => {
  it('takes the first in the day, not the first the user tapped', () => {
    expect(suggestedTimeOfDayFromRhythms(['evening', 'early_morning'])).toBe('morning');
    expect(suggestedTimeOfDayFromRhythms(['early_morning', 'evening'])).toBe('morning');
  });

  it('is order-independent for the same set', () => {
    const a = suggestedTimeOfDayFromRhythms(['evening', 'afternoon', 'mid_morning']);
    const b = suggestedTimeOfDayFromRhythms(['mid_morning', 'evening', 'afternoon']);
    expect(a).toBe(b);
    expect(a).toBe('morning');
  });

  it('skips an unmappable window without silencing a later one', () => {
    // late_night contributes nothing but must not stop the walk.
    expect(suggestedTimeOfDayFromRhythms(['afternoon', 'late_night'])).toBe('afternoon');
    expect(suggestedTimeOfDayFromRhythms(['late_night', 'evening'])).toBe('evening');
  });

  it('ignores varies alongside real windows', () => {
    expect(suggestedTimeOfDayFromRhythms(['varies', 'afternoon'])).toBe('afternoon');
  });

  it('suggests nothing when every window is unmappable', () => {
    expect(suggestedTimeOfDayFromRhythms(['late_night', 'varies'])).toBeNull();
  });
});

describe('mappedTimeOfDaySlots — the dedupe and ordering rule', () => {
  it('collapses both morning windows into one Morning', () => {
    expect(mappedTimeOfDaySlots(['early_morning', 'mid_morning'])).toEqual(['morning']);
  });

  it('returns every distinct slot, in canonical day order', () => {
    expect(
      mappedTimeOfDaySlots(['evening', 'mid_morning', 'afternoon', 'early_morning'])
    ).toEqual(['morning', 'afternoon', 'evening']);
  });

  it('drops late_night and varies from the set entirely', () => {
    expect(mappedTimeOfDaySlots(['late_night', 'varies', 'evening'])).toEqual(['evening']);
  });

  it('is empty when nothing maps', () => {
    expect(mappedTimeOfDaySlots(['late_night'])).toEqual([]);
    expect(mappedTimeOfDaySlots(['varies'])).toEqual([]);
    expect(mappedTimeOfDaySlots([])).toEqual([]);
  });

  it('agrees with the suggestion, which is just its first entry', () => {
    const windows = ['evening', 'afternoon'];
    expect(suggestedTimeOfDayFromRhythms(windows)).toBe(mappedTimeOfDaySlots(windows)[0]);
  });
});

describe('the mapping reads no clock', () => {
  it('returns the same answer at every hour of the day', () => {
    // Injected-hour independence, proven by moving the system clock: this
    // function takes no hour and must never start reading one.
    const windows = ['afternoon'];
    const answers = new Set<string | null>();
    for (let hour = 0; hour < 24; hour += 1) {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
      answers.add(suggestedTimeOfDayFromRhythms(windows));
    }
    jest.restoreAllMocks();
    expect([...answers]).toEqual(['afternoon']);
  });
});

describe('nudge copy', () => {
  it.each([
    ['morning', 'You said focus comes easiest for you in the morning.'],
    ['afternoon', 'You said focus comes easiest for you in the afternoon.'],
    ['evening', 'You said focus comes easiest for you in the evening.'],
  ])('%s reads rationale-first', (slot, sentence) => {
    expect(rhythmNudgeSentence(slot as any)).toBe(sentence);
  });

  it('carries no ranking or optimiser framing', () => {
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      const text = `${rhythmNudgeSentence(slot)} ${rhythmNudgeAcceptLabel(slot)}`;
      // "you focus best" is banned by rhythmRecall's own contract, alongside
      // the optimiser register.
      expect(text).not.toMatch(/\bbest\b|peak|optimi[sz]|most productive|prime time/i);
      expect(text).not.toMatch(/don't miss|should|need to|make the most/i);
    }
  });

  it('offers rather than instructs', () => {
    expect(rhythmNudgeAcceptLabel('morning')).toBe('Aim this for Morning');
    expect(rhythmNudgeAcceptLabel('evening')).toBe('Aim this for Evening');
  });

  it('labels every slot, including anytime for the chips', () => {
    expect(TIME_OF_DAY_LABELS).toEqual({
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
      anytime: 'Anytime',
    });
  });
});
