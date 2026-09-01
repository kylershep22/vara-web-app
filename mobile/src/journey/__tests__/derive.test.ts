/**
 * The journey derivations at their exact boundaries.
 *
 * THE THRESHOLDS ARE THE PRODUCT (Section 1), so the cases below are written
 * as pairs straddling each one: 7 against 8, 13 against 14, one not_moving
 * against two. An off-by-one here does not crash anything; it silently offers
 * advancement a day early or a week late to every user, which is exactly the
 * kind of bug a green suite hides.
 *
 * No mocks anywhere. These functions take arguments and return values.
 */
import {
  deriveAdjustDue,
  deriveAdvanceDue,
  deriveCalendarDays,
  deriveConsistentDays,
} from '../derive';
import {
  ADJUST_CONSECUTIVE_NOT_MOVING,
  ADVANCE_CALENDAR_CEILING_DAYS,
  ADVANCE_MIN_CONSISTENT_DAYS,
} from '../../constants/journey';
import type { DailyLog, PhaseRead, WeeklyCycle } from '../../types/models';

const ENTERED = '2026-08-10';

/** A day's log. Only `date` and `protocolCompleted` are read by the derivation. */
const log = (date: string, protocolCompleted: boolean): DailyLog =>
  ({
    id: 'alice_' + date,
    userId: 'alice',
    date,
    protocolCompleted,
    practiceIds: [],
  }) as unknown as DailyLog;

/** `n` completed days running from `from`. */
function completedRun(from: string, n: number): DailyLog[] {
  const out: DailyLog[] = [];
  const d = new Date(from + 'T00:00:00Z');
  for (let i = 0; i < n; i += 1) {
    out.push(log(d.toISOString().slice(0, 10), true));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const cycle = (weekEnd: string, phaseRead?: PhaseRead): WeeklyCycle =>
  ({
    id: 'c-' + weekEnd,
    userId: 'alice',
    weekStart: weekEnd,
    weekEnd,
    phaseRead,
  }) as unknown as WeeklyCycle;

describe('the thresholds are the ones Section 1 specifies', () => {
  // Guards against a test file that would still pass if someone retuned the
  // product by editing the constants. If these change, that is a product
  // decision and this test is where it gets noticed.
  test('8 consistent days, 14 calendar days, 2 not_moving reads', () => {
    expect(ADVANCE_MIN_CONSISTENT_DAYS).toBe(8);
    expect(ADVANCE_CALENDAR_CEILING_DAYS).toBe(14);
    expect(ADJUST_CONSECUTIVE_NOT_MOVING).toBe(2);
  });
});

describe('deriveConsistentDays', () => {
  test('counts only completed days', () => {
    expect(
      deriveConsistentDays(
        [log('2026-08-10', true), log('2026-08-11', false), log('2026-08-12', true)],
        ENTERED
      )
    ).toBe(2);
  });

  test('EXCLUDES logs from before the phase was entered', () => {
    // The whole point of the enteredAt argument. A user with months of history
    // must not enter a phase already past its threshold.
    const logs = [
      log('2026-08-08', true),
      log('2026-08-09', true),
      log('2026-08-10', true),
    ];
    expect(deriveConsistentDays(logs, ENTERED)).toBe(1);
  });

  test('the entry day itself COUNTS, so the boundary is inclusive', () => {
    expect(deriveConsistentDays([log(ENTERED, true)], ENTERED)).toBe(1);
  });

  test('is cumulative, not a streak: a missed day does not reset', () => {
    const logs = [
      log('2026-08-10', true),
      log('2026-08-11', false),
      log('2026-08-12', true),
      log('2026-08-13', true),
    ];
    expect(deriveConsistentDays(logs, ENTERED)).toBe(3);
  });

  test('is 0 for no logs at all', () => {
    expect(deriveConsistentDays([], ENTERED)).toBe(0);
  });
});

describe('deriveCalendarDays', () => {
  test('is 0 on the day the phase was entered', () => {
    expect(deriveCalendarDays(ENTERED, ENTERED)).toBe(0);
  });

  test('counts whole days forward', () => {
    expect(deriveCalendarDays(ENTERED, '2026-08-11')).toBe(1);
    expect(deriveCalendarDays(ENTERED, '2026-08-24')).toBe(14);
  });

  test('crosses a month boundary correctly', () => {
    expect(deriveCalendarDays('2026-08-28', '2026-09-04')).toBe(7);
  });

  test('is 0 rather than negative when today precedes entry', () => {
    // A clock moved backwards or a date was corrected. Neither is a reason to
    // report negative time in a phase.
    expect(deriveCalendarDays(ENTERED, '2026-08-01')).toBe(0);
  });
});

describe('deriveAdvanceDue - the consistency door', () => {
  test('is NOT due at 7 consistent days', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 7, calendarDays: 7, advanceDeclinedAt: null })
    ).toBe(false);
  });

  test('IS due at 8 consistent days', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 8, calendarDays: 8, advanceDeclinedAt: null })
    ).toBe(true);
  });
});

describe('deriveAdvanceDue - the calendar ceiling', () => {
  test('is NOT due at 13 calendar days with too few consistent days', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 0, calendarDays: 13, advanceDeclinedAt: null })
    ).toBe(false);
  });

  test('IS due at 14 calendar days even with zero consistent days', () => {
    // The ceiling exists precisely for the user who is NOT doing the work, so
    // a phase can never become a place to be stuck.
    expect(
      deriveAdvanceDue({ consistentDays: 0, calendarDays: 14, advanceDeclinedAt: null })
    ).toBe(true);
  });

  test('either door alone is enough; neither requires the other', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 8, calendarDays: 0, advanceDeclinedAt: null })
    ).toBe(true);
    expect(
      deriveAdvanceDue({ consistentDays: 0, calendarDays: 14, advanceDeclinedAt: null })
    ).toBe(true);
  });
});

describe('deriveAdvanceDue - decline suppression', () => {
  test('a decline suppresses an otherwise-due offer', () => {
    expect(
      deriveAdvanceDue({
        consistentDays: 30,
        calendarDays: 60,
        advanceDeclinedAt: { seconds: 1 },
      })
    ).toBe(false);
  });

  test('undefined is treated as declined-not-recorded, same as null', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 8, calendarDays: 0, advanceDeclinedAt: undefined })
    ).toBe(true);
  });
});

describe('deriveAdjustDue', () => {
  test('is NOT due on a single not_moving read', () => {
    expect(deriveAdjustDue([cycle('2026-08-16', 'not_moving')], null)).toBe(false);
  });

  test('IS due on two consecutive not_moving reads', () => {
    expect(
      deriveAdjustDue(
        [cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'not_moving')],
        null
      )
    ).toBe(true);
  });

  test("a 'same' read between two not_moving weeks breaks the run", () => {
    expect(
      deriveAdjustDue(
        [
          cycle('2026-08-09', 'not_moving'),
          cycle('2026-08-16', 'same'),
          cycle('2026-08-23', 'not_moving'),
        ],
        null
      )
    ).toBe(false);
  });

  test("a 'moving' read as the most recent week breaks the run", () => {
    expect(
      deriveAdjustDue(
        [cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'moving')],
        null
      )
    ).toBe(false);
  });

  test('an UNANSWERED week is not a not_moving week', () => {
    // phaseRead is absent on every cycle written before slice 6. Silence is
    // not a complaint, and must not accumulate toward the threshold.
    expect(
      deriveAdjustDue(
        [cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', undefined)],
        null
      )
    ).toBe(false);
  });

  test('reads the two most recent by weekEnd, NOT by array order', () => {
    // The caller hands these over in whatever order the query returned. An
    // unsorted input silently reading the wrong two weeks is the failure the
    // sort exists to prevent, so the input here is deliberately shuffled.
    expect(
      deriveAdjustDue(
        [
          cycle('2026-08-23', 'not_moving'),
          cycle('2026-08-09', 'moving'),
          cycle('2026-08-16', 'not_moving'),
        ],
        null
      )
    ).toBe(true);
  });

  test('is not due with fewer than two cycles', () => {
    expect(deriveAdjustDue([], null)).toBe(false);
  });

  test('a decline suppresses an otherwise-due offer', () => {
    expect(
      deriveAdjustDue(
        [cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'not_moving')],
        { seconds: 1 }
      )
    ).toBe(false);
  });
});
