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
  deriveAdvanceDoor,
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
      deriveAdvanceDue({ consistentDays: 7, calendarDays: 7 })
    ).toBe(false);
  });

  test('IS due at 8 consistent days', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 8, calendarDays: 8 })
    ).toBe(true);
  });
});

describe('deriveAdvanceDue - the calendar ceiling', () => {
  test('is NOT due at 13 calendar days with too few consistent days', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 0, calendarDays: 13 })
    ).toBe(false);
  });

  test('IS due at 14 calendar days even with zero consistent days', () => {
    // The ceiling exists precisely for the user who is NOT doing the work, so
    // a phase can never become a place to be stuck.
    expect(
      deriveAdvanceDue({ consistentDays: 0, calendarDays: 14 })
    ).toBe(true);
  });

  test('either door alone is enough; neither requires the other', () => {
    expect(
      deriveAdvanceDue({ consistentDays: 8, calendarDays: 0 })
    ).toBe(true);
    expect(
      deriveAdvanceDue({ consistentDays: 0, calendarDays: 14 })
    ).toBe(true);
  });
});

// THE DECLINE-SUPPRESSION BLOCK THAT STOOD HERE HAS MOVED, NOT BEEN DELETED.
// It asserted that `advanceDeclinedAt` made this return false, which slice 7a
// established was wrong: a false here hid the offer from the MAP as well as
// from Today, and section 9 R3 demotes a dismissed offer to the map rather than
// withdrawing it. Decline is a PLACEMENT question now and its boundaries are
// asserted in journey/__tests__/offerPlacement.test.ts. Recorded here so a
// reader diffing the two slices sees a move rather than lost coverage.

describe('deriveAdvanceDue - eligibility knows nothing about placement', () => {
  test('a user who is due stays due no matter how long ago they declined', () => {
    // The guard on the split. `AdvanceDueInput` has no field that could carry a
    // decline, so this is really a type-level assertion given a runtime voice:
    // if someone reintroduces suppression here, they have to add the field
    // back first, and this test names why they should not.
    expect(deriveAdvanceDue({ consistentDays: 30, calendarDays: 60 })).toBe(true);
  });
});

describe('deriveAdvanceDoor - which door, and which copy', () => {
  test('neither door is open below both thresholds', () => {
    expect(deriveAdvanceDoor({ consistentDays: 7, calendarDays: 13 })).toBeNull();
  });

  test('the consistency door opens at 8 completed days', () => {
    expect(deriveAdvanceDoor({ consistentDays: 8, calendarDays: 0 })).toBe(
      'consistency'
    );
  });

  test('the ceiling opens at 14 calendar days with no completed days', () => {
    expect(deriveAdvanceDoor({ consistentDays: 0, calendarDays: 14 })).toBe(
      'ceiling'
    );
  });

  test('consistency WINS when both are open', () => {
    // The copy-bearing case, and the reason this returns a discriminant. A user
    // at both thresholds HAS been coming back, and Jen's ceiling body is
    // written for someone who has not: serving it here would tell a consistent
    // user there was nothing to name about what they did.
    expect(deriveAdvanceDoor({ consistentDays: 8, calendarDays: 14 })).toBe(
      'consistency'
    );
  });

  test('due is exactly "some door opened", with no second comparison', () => {
    // Pins the definition rather than the value: deriveAdvanceDue is defined in
    // terms of deriveAdvanceDoor so the two can never disagree about whether an
    // offer exists. A reimplementation with its own comparisons would pass the
    // cases above and fail here the first time a threshold changed.
    for (const consistentDays of [0, 7, 8, 30]) {
      for (const calendarDays of [0, 13, 14, 60]) {
        expect(deriveAdvanceDue({ consistentDays, calendarDays })).toBe(
          deriveAdvanceDoor({ consistentDays, calendarDays }) !== null
        );
      }
    }
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

  test("an 'unclear' read between two not_moving weeks breaks the run", () => {
    // WAS 'same' UNTIL SLICE 6, and the middle state changed meaning rather
    // than spelling: 'same' was "no change", 'unclear' is "cannot tell". The
    // assertion is the same because the behaviour is: only explicit not_moving
    // accumulates, so anything else in the window fails the run.
    expect(
      deriveAdjustDue(
        [
          cycle('2026-08-09', 'not_moving'),
          cycle('2026-08-16', 'unclear'),
          cycle('2026-08-23', 'not_moving'),
        ],
        null
      )
    ).toBe(false);
  });

  test("an 'unclear' read is NEUTRAL: it breaks a run without accumulating", () => {
    // The two halves of neutrality, asserted together because either alone
    // would pass for the wrong reason. It must not be read as 'moving' and it
    // must not be read as 'not_moving': a pair of unclear weeks is not an
    // adjustment signal, and neither is an unclear week following a not_moving
    // one. It behaves exactly as an unanswered week does (see below).
    expect(
      deriveAdjustDue(
        [cycle('2026-08-16', 'unclear'), cycle('2026-08-23', 'unclear')],
        null
      )
    ).toBe(false);
    expect(
      deriveAdjustDue(
        [cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'unclear')],
        null
      )
    ).toBe(false);
  });

  test("'unclear' and an unanswered week are indistinguishable to the threshold", () => {
    // The contract's own words: "It behaves exactly as an unanswered week
    // does." Asserted as an equality rather than as two separate falses, so a
    // future change that made uncertainty count would have to break this
    // deliberately rather than slip past two independent assertions.
    const withUnclear = deriveAdjustDue(
      [cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'unclear')],
      null
    );
    const withSilence = deriveAdjustDue(
      [cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', undefined)],
      null
    );
    expect(withUnclear).toBe(withSilence);
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
