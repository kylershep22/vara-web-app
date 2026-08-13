// suggestPlacement — the rhythm-to-placement proposal (TB-1a).
//
// Sibling of rhythmRecall.test.ts and tested the same way: the clock is always
// injected, so every case below is deterministic and none of them touch Date.now.

import {
  suggestPlacement,
  type PlacementSuggestion,
} from '../suggestPlacement';
import { FOCUS_RHYTHM_HOURS } from '../../../constants/focusRhythms';

/** A Date fixed at the given hour. The date itself is never asserted on. */
const at = (hour: number) => new Date(2026, 7, 13, hour, 0, 0);

/** Narrow to the ok variant, failing loudly rather than silently skipping. */
function expectOk(result: PlacementSuggestion) {
  if (result.kind !== 'ok') {
    throw new Error(`expected an 'ok' suggestion, got '${result.kind}'`);
  }
  return result;
}

describe('suggestPlacement — the three kinds', () => {
  it("returns 'no-rhythms' when the user has set nothing", () => {
    // [] is the COMMON case, not an edge case: the capture is opt-in and its
    // route was dark for a whole cohort. TB-1b turns this into an invitation.
    expect(suggestPlacement([], at(10))).toEqual({ kind: 'no-rhythms' });
  });

  it("returns 'varies' when the user deliberately chose 'It varies'", () => {
    // Distinct from no-rhythms: the user ANSWERED. Showing them the
    // set-your-rhythms invitation would tell them they had not.
    expect(suggestPlacement(['varies'], at(10))).toEqual({ kind: 'varies' });
  });

  it("returns 'ok' with the zone and its canonical hour range", () => {
    const result = expectOk(suggestPlacement(['afternoon'], at(14)));

    expect(result.zoneKey).toBe('afternoon');
    expect(result.startHour).toBe(FOCUS_RHYTHM_HOURS.afternoon.startHour);
    expect(result.endHour).toBe(FOCUS_RHYTHM_HOURS.afternoon.endHour);
  });

  it("ignores unknown keys, treating them as no rhythms at all", () => {
    // Stored windows are plain strings; a retired or misspelled key must not
    // become an 'ok' suggestion pointing at a zone with no hour range.
    expect(suggestPlacement(['not_a_zone'], at(10))).toEqual({ kind: 'no-rhythms' });
  });
});

describe('suggestPlacement — today vs tomorrow', () => {
  it('proposes a window that is still ahead today', () => {
    const result = expectOk(suggestPlacement(['evening'], at(14)));

    expect(result.zoneKey).toBe('evening');
    expect(result.day).toBe('today');
  });

  it('proposes a window that is active right now', () => {
    const result = expectOk(suggestPlacement(['afternoon'], at(14)));

    expect(result.day).toBe('today');
  });

  it('rolls over to tomorrow once every window has passed', () => {
    // 23:00, and mid-morning is long gone. The zone is unchanged; only `day`
    // records the rollover, and it is the ONLY thing that does — without it
    // TB-1b cannot build a real startAt without re-deriving the date.
    const result = expectOk(suggestPlacement(['mid_morning'], at(23)));

    expect(result.zoneKey).toBe('mid_morning');
    expect(result.day).toBe('tomorrow');
  });

  it('picks the EARLIEST window when rolling over to tomorrow', () => {
    const result = expectOk(
      suggestPlacement(['evening', 'early_morning'], at(23))
    );

    // Not 'evening' (the first one the user happened to tap): tomorrow starts
    // at the top of the day, so the earliest zone wins.
    expect(result.zoneKey).toBe('early_morning');
    expect(result.day).toBe('tomorrow');
  });

  it('picks the next window chronologically, never the tap order', () => {
    // Stored tap-order puts evening first; at 06:00 the honest next window is
    // still mid_morning. Reading order comes from TIMED_RHYTHM_KEYS_IN_ORDER.
    const result = expectOk(
      suggestPlacement(['evening', 'mid_morning'], at(6))
    );

    expect(result.zoneKey).toBe('mid_morning');
    expect(result.day).toBe('today');
  });
});

describe('suggestPlacement — the late_night midnight wrap (22-1)', () => {
  it('treats 23:00 as inside the late-night window', () => {
    const result = expectOk(suggestPlacement(['late_night'], at(23)));

    expect(result.zoneKey).toBe('late_night');
    expect(result.day).toBe('today');
  });

  it('treats 00:30 as still inside the wrapped window', () => {
    const midnightHalf = new Date(2026, 7, 13, 0, 30, 0);
    const result = expectOk(suggestPlacement(['late_night'], midnightHalf));

    expect(result.zoneKey).toBe('late_night');
    expect(result.day).toBe('today');
  });

  it('proposes late-night later today from the afternoon', () => {
    const result = expectOk(suggestPlacement(['late_night'], at(14)));

    expect(result.day).toBe('today');
    expect(result.startHour).toBe(22);
    expect(result.endHour).toBe(1);
  });
});

describe('suggestPlacement — the 2-4am hole', () => {
  // Hours 2, 3 and 4 belong to NO window by design (constants/focusRhythms.ts).
  // The hole must affect NOTHING here: this function only ever proposes, and a
  // block at any hour is legal.
  it.each([2, 3, 4])('still proposes a window at %i:00', (hour) => {
    const result = expectOk(suggestPlacement(['mid_morning'], at(hour)));

    expect(result.zoneKey).toBe('mid_morning');
    expect(result.day).toBe('today');
  });

  it('proposes tonight, not tomorrow, for late_night inside the hole', () => {
    // 03:00 is past the wrapped window's end (01:00) but well before its
    // 22:00 start, so tonight is still ahead.
    const result = expectOk(suggestPlacement(['late_night'], at(3)));

    expect(result.day).toBe('today');
  });
});

describe('suggestPlacement — mixed varies and timed', () => {
  it("uses the timed keys and ignores 'varies' alongside them", () => {
    const result = expectOk(suggestPlacement(['varies', 'evening'], at(10)));

    expect(result.zoneKey).toBe('evening');
    expect(result.day).toBe('today');
  });

  it("does not let 'varies' win the rollover either", () => {
    const result = expectOk(suggestPlacement(['varies', 'mid_morning'], at(23)));

    expect(result.kind).toBe('ok');
    expect(result.zoneKey).toBe('mid_morning');
    expect(result.day).toBe('tomorrow');
  });
});

describe('suggestPlacement — purity', () => {
  it('answers from the injected hour, not the system clock', () => {
    // If the function reached for `new Date()` of its own accord, these two
    // calls would agree; they must not. This is what makes every fixed-hour
    // assertion above meaningful no matter what time the suite runs at.
    const earlyInDay = expectOk(suggestPlacement(['mid_morning'], at(6)));
    const lateInDay = expectOk(suggestPlacement(['mid_morning'], at(23)));

    expect(earlyInDay.day).toBe('today');
    expect(lateInDay.day).toBe('tomorrow');
  });

  it('does not mutate the windows array it is given', () => {
    const windows = ['varies', 'evening'];

    suggestPlacement(windows, at(10));

    expect(windows).toEqual(['varies', 'evening']);
  });
});
