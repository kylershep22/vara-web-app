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
import type { DailyLog, PhaseKey, PhaseRead, WeeklyCycle } from '../../types/models';

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

/**
 * A cycle whose week starts and ends on the same day.
 *
 * DEGENERATE ON PURPOSE, and it stays that way for every case where the span
 * does not matter: it keeps the weekEnd-keyed cases readable. Where the
 * DIFFERENCE between weekStart and weekEnd is the thing under test - which is
 * every re-arm floor case - use `week()` below, which takes both.
 */
const cycle = (
  weekEnd: string,
  phaseRead?: PhaseRead,
  phaseKeyAtRead: PhaseKey = 'remove'
): WeeklyCycle =>
  ({
    id: 'c-' + weekEnd,
    userId: 'alice',
    weekStart: weekEnd,
    weekEnd,
    phaseRead,
    // Slice 6 writes the read and the phase together or not at all, so a cycle
    // WITH a read always has one. Absent when there is no read, matching what
    // closeWeeklyCycle actually stores.
    ...(phaseRead ? { phaseKeyAtRead } : {}),
  }) as unknown as WeeklyCycle;

/** A cycle with a real seven-day span. The floor compares against weekStart. */
const week = (
  weekStart: string,
  weekEnd: string,
  phaseRead?: PhaseRead,
  phaseKeyAtRead: PhaseKey = 'remove'
): WeeklyCycle =>
  ({
    id: 'c-' + weekStart,
    userId: 'alice',
    weekStart,
    weekEnd,
    phaseRead,
    ...(phaseRead ? { phaseKeyAtRead } : {}),
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
  // Every case below reads the SAME phase, so `phaseKeyAtRead` matches unless a
  // test says otherwise, and starts with no floor. The two arguments that are
  // not the cycles are spelled out at each call rather than defaulted in a
  // helper: they are the two rules this slice added, and hiding them behind a
  // default is how a test stops asserting the thing it is named for.
  const due = (
    cyclesOldestFirst: WeeklyCycle[],
    armedFromIso: string | null = null,
    phaseKey: PhaseKey = 'remove'
  ) => deriveAdjustDue({ cyclesOldestFirst, phaseKey, armedFromIso });

  test('is NOT due on a single not_moving read', () => {
    expect(due([cycle('2026-08-16', 'not_moving')])).toBe(false);
  });

  test('IS due on two consecutive not_moving reads', () => {
    expect(
      due([cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'not_moving')])
    ).toBe(true);
  });

  test("an 'unclear' read between two not_moving weeks breaks the run", () => {
    // WAS 'same' UNTIL SLICE 6, and the middle state changed meaning rather
    // than spelling: 'same' was "no change", 'unclear' is "cannot tell". The
    // assertion is the same because the behaviour is: only explicit not_moving
    // accumulates, so anything else IN THE WINDOW fails the run.
    expect(
      due([
        cycle('2026-08-09', 'not_moving'),
        cycle('2026-08-16', 'unclear'),
        cycle('2026-08-23', 'not_moving'),
      ])
    ).toBe(false);
  });

  test("an 'unclear' read is NEUTRAL: it breaks a run without accumulating", () => {
    // The two halves of neutrality, asserted together because either alone
    // would pass for the wrong reason. It must not be read as 'moving' and it
    // must not be read as 'not_moving'.
    expect(
      due([cycle('2026-08-16', 'unclear'), cycle('2026-08-23', 'unclear')])
    ).toBe(false);
    expect(
      due([cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'unclear')])
    ).toBe(false);
  });

  test("a 'moving' read as the most recent week breaks the run", () => {
    expect(
      due([cycle('2026-08-16', 'not_moving'), cycle('2026-08-23', 'moving')])
    ).toBe(false);
  });

  // -------------------------------------------------------------------------
  // THE WINDOW IS READS, NOT WEEKS (slice 7b amendment 4).
  //
  // This pair REPLACES two slice-1 tests that asserted the opposite rule: that
  // an unanswered week broke a run exactly as a 'moving' read would, and that
  // 'unclear' and silence were indistinguishable to the threshold. Both were
  // true of the old derivation and both are deliberately false now. They are
  // called out rather than quietly deleted because a reader who remembers them
  // should find the decision, not a gap.
  // -------------------------------------------------------------------------
  test('an UNANSWERED week does not occupy a slot in the window', () => {
    // The rollover case, and the reason the rule changed. The next week's
    // cycle is created before Home renders and carries no phaseRead, so under
    // the old rule it displaced one of the two reads and withdrew a live offer
    // from a user who had not been asked anything yet.
    expect(
      due([
        cycle('2026-08-16', 'not_moving'),
        cycle('2026-08-23', 'not_moving'),
        cycle('2026-08-30', undefined),
      ])
    ).toBe(true);
  });

  test("'unclear' and an unanswered week are NO LONGER indistinguishable", () => {
    // Uncertainty is an answer about the user's own confidence; absence is no
    // answer at all. Asserted as an inequality, so a change that collapsed the
    // two back together would have to break this deliberately.
    const withUnclear = due([
      cycle('2026-08-16', 'not_moving'),
      cycle('2026-08-23', 'not_moving'),
      cycle('2026-08-30', 'unclear'),
    ]);
    const withSilence = due([
      cycle('2026-08-16', 'not_moving'),
      cycle('2026-08-23', 'not_moving'),
      cycle('2026-08-30', undefined),
    ]);
    expect(withUnclear).toBe(false);
    expect(withSilence).toBe(true);
    expect(withUnclear).not.toBe(withSilence);
  });

  test('silence still never ACCUMULATES toward the threshold', () => {
    // The half of the old rule that survives. Excluding silence from the
    // window must not have turned it into a read: two unanswered weeks are not
    // a complaint, and one not_moving beside any number of them is still one.
    expect(due([cycle('2026-08-16', undefined), cycle('2026-08-23', undefined)])).toBe(
      false
    );
    expect(
      due([
        cycle('2026-08-09', 'not_moving'),
        cycle('2026-08-16', undefined),
        cycle('2026-08-23', undefined),
      ])
    ).toBe(false);
  });

  // -------------------------------------------------------------------------
  // THE SERVICE OWNS THE ORDERING (slice 7b).
  // -------------------------------------------------------------------------
  test('CONSUMES the caller ordering and does not re-sort', () => {
    // The contract with getWeeklyCyclesSince, asserted as a behaviour rather
    // than trusted as a comment. The array below is in an order NO sort would
    // produce from its own weekEnds: if this function re-established order it
    // would read the 'moving' week as most recent and return false. Reading the
    // array as given, the last two are the two not_moving weeks.
    expect(
      due([
        cycle('2026-08-30', 'moving'),
        cycle('2026-08-09', 'not_moving'),
        cycle('2026-08-16', 'not_moving'),
      ])
    ).toBe(true);
  });

  test('a row with NO weekEnd is ordered by the caller, not re-sorted to the front', () => {
    // The live disagreement Step 0 caught. `weekEnd` became a stored field
    // partway through, so rows without one exist and they are the OLDEST.
    // getWeeklyCyclesSince resolves them from weekStart and may place one LAST;
    // the old sort here read `weekEnd ?? ''` and placed it FIRST. Two
    // definitions of "newest", and the wrong two weeks read with nothing
    // failing. Here the legacy row is the most recent and it is 'moving', so a
    // re-sort would hide it and wrongly return true.
    const legacy = {
      id: 'legacy',
      userId: 'alice',
      weekStart: '2026-08-24',
      phaseRead: 'moving' as PhaseRead,
      phaseKeyAtRead: 'remove' as PhaseKey,
    } as unknown as WeeklyCycle;
    expect(
      due([cycle('2026-08-10', 'not_moving'), cycle('2026-08-17', 'not_moving'), legacy])
    ).toBe(false);
  });

  test('is not due with fewer than two reads', () => {
    expect(due([])).toBe(false);
  });

  // -------------------------------------------------------------------------
  // READS ABOUT THIS PHASE ONLY (slice 7b).
  // -------------------------------------------------------------------------
  test('reads given about a DIFFERENT phase do not qualify', () => {
    // Day one of a new phase, with two not_moving reads about the stretch the
    // user has just left. They are a true account of that stretch and say
    // nothing about this one, so offering to adjust this one on its first day
    // would be acting on evidence about something else.
    expect(
      due(
        [
          cycle('2026-08-16', 'not_moving', 'remove'),
          cycle('2026-08-23', 'not_moving', 'remove'),
        ],
        null,
        'recover'
      )
    ).toBe(false);
  });

  test('a read with NO phase attached is excluded rather than assumed', () => {
    const orphan = {
      id: 'orphan',
      userId: 'alice',
      weekStart: '2026-08-23',
      weekEnd: '2026-08-23',
      phaseRead: 'not_moving' as PhaseRead,
    } as unknown as WeeklyCycle;
    expect(due([cycle('2026-08-16', 'not_moving'), orphan])).toBe(false);
  });

  // -------------------------------------------------------------------------
  // THE RE-ARM FLOOR (slice 7b, section 9 R5).
  // -------------------------------------------------------------------------
  test('a decline excludes the weeks that triggered it, INCLUDING the live one', () => {
    // THE CASE THE FLOOR EXISTS FOR, and the one a weekEnd floor would fail.
    // The offer can only be on Today when the newest read is not_moving, and
    // the newest read always belongs to the LIVE week, whose weekEnd is today
    // or later. A decline on 2026-08-25 therefore sits INSIDE the week ending
    // 2026-08-30: a `weekEnd > decline` floor keeps that week and the same two
    // reads re-trigger on the next render. Its weekStart is 2026-08-24, so a
    // weekStart floor excludes it.
    const triggering = [
      cycle('2026-08-23', 'not_moving'),
      week('2026-08-24', '2026-08-30', 'not_moving'),
    ];
    expect(due(triggering)).toBe(true);
    expect(due(triggering, '2026-08-25')).toBe(false);
  });

  test("the floor is STRICT, so a decline on a week's first day still excludes it", () => {
    expect(
      due([cycle('2026-08-23', 'not_moving'), week('2026-08-24', '2026-08-30', 'not_moving')],
        '2026-08-24')
    ).toBe(false);
  });

  test('TWO FURTHER consecutive not_moving reads offer again', () => {
    // R5's re-arm, end to end. The two weeks that triggered the first offer are
    // below the floor; the two after it are above it and both not_moving.
    expect(
      due(
        [
          cycle('2026-08-23', 'not_moving'),
          week('2026-08-24', '2026-08-30', 'not_moving'),
          week('2026-08-31', '2026-09-06', 'not_moving'),
          week('2026-09-07', '2026-09-13', 'not_moving'),
        ],
        '2026-08-25'
      )
    ).toBe(true);
  });

  test('ONE further not_moving read is not enough to re-arm', () => {
    expect(
      due(
        [
          cycle('2026-08-23', 'not_moving'),
          week('2026-08-24', '2026-08-30', 'not_moving'),
          week('2026-08-31', '2026-09-06', 'not_moving'),
        ],
        '2026-08-25'
      )
    ).toBe(false);
  });

  test('not_moving -> unclear -> not_moving does NOT re-arm', () => {
    // The consecutiveness rule, applied to the re-armed window specifically.
    // Three reads above the floor, two of them not_moving, and they are not
    // adjacent: the two most recent are unclear and not_moving.
    expect(
      due(
        [
          week('2026-08-24', '2026-08-30', 'not_moving'),
          week('2026-08-31', '2026-09-06', 'not_moving'),
          week('2026-09-07', '2026-09-13', 'unclear'),
          week('2026-09-14', '2026-09-20', 'not_moving'),
        ],
        '2026-08-25'
      )
    ).toBe(false);
  });
});
