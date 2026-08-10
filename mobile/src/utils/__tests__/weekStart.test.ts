import {
  WEEK_LENGTH_DAYS,
  addDaysIso,
  daysBetweenIso,
  isWithinWeek,
  isoWeekday,
  mostRecentWeekStartOnOrBefore,
  nextWeekStartAfter,
  planWeek,
  resolveWeekEnd,
  toIsoDate,
} from '../weekStart';

// Calendar anchors used throughout, stated once so the assertions below read as
// weekdays rather than as numbers. 2026-08-12 is a WEDNESDAY, which makes it the
// mid-week setup day in the stub scenario; 2026-08-16 is the Sunday after it.
const WED = '2026-08-12';
const THU = '2026-08-13';
const FRI = '2026-08-14';
const SAT = '2026-08-15';
const SUN = '2026-08-16';
const SUNDAY = 0;
const MONDAY = 1;

describe('toIsoDate', () => {
  test('formats a date as YYYY-MM-DD', () => {
    expect(toIsoDate(new Date(2026, 7, 3, 9, 30))).toBe('2026-08-03');
  });

  test('zero-pads month and day', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });

  test('uses the LOCAL date, not the UTC one', () => {
    // 23:30 local. toISOString() would roll this into the next day for any
    // timezone ahead of UTC, which would open the user's week on the wrong
    // calendar day. Constructed from local parts, so the local date is 08-03
    // whatever the machine's zone is.
    expect(toIsoDate(new Date(2026, 7, 3, 23, 30))).toBe('2026-08-03');
  });
});

describe('daysBetweenIso', () => {
  test('counts whole days forward', () => {
    expect(daysBetweenIso('2026-08-03', '2026-08-10')).toBe(7);
  });

  test('is zero for the same day', () => {
    expect(daysBetweenIso('2026-08-03', '2026-08-03')).toBe(0);
  });

  test('is negative when the target is earlier', () => {
    expect(daysBetweenIso('2026-08-10', '2026-08-03')).toBe(-7);
  });

  test('spans month and year boundaries', () => {
    expect(daysBetweenIso('2025-12-30', '2026-01-02')).toBe(3);
  });

  test('is exact across a daylight-saving transition', () => {
    // US DST ends 2026-11-01. Local-midnight arithmetic would give 6.958 days
    // here and round wrong at the boundary; UTC midnights cannot.
    expect(daysBetweenIso('2026-10-28', '2026-11-04')).toBe(7);
  });
});

describe('addDaysIso', () => {
  test('moves forward within a month', () => {
    expect(addDaysIso('2026-08-12', 3)).toBe('2026-08-15');
  });

  test('moves backward', () => {
    expect(addDaysIso('2026-08-16', -1)).toBe('2026-08-15');
  });

  test('crosses a month boundary', () => {
    expect(addDaysIso('2026-08-30', 3)).toBe('2026-09-02');
  });

  test('crosses a year boundary', () => {
    expect(addDaysIso('2025-12-30', 3)).toBe('2026-01-02');
  });

  test('is exact across a daylight-saving transition', () => {
    // Same reasoning as daysBetweenIso: local-midnight arithmetic drifts an
    // hour here, UTC midnights cannot.
    expect(addDaysIso('2026-10-28', 7)).toBe('2026-11-04');
  });
});

describe('isoWeekday', () => {
  test('reads Sunday as 0, matching Date#getDay', () => {
    expect(isoWeekday(SUN)).toBe(SUNDAY);
  });

  test('reads Wednesday as 3', () => {
    expect(isoWeekday(WED)).toBe(3);
  });

  test('reads Saturday as 6', () => {
    expect(isoWeekday(SAT)).toBe(6);
  });
});

describe('nextWeekStartAfter', () => {
  test('finds the next start day from mid-week', () => {
    expect(nextWeekStartAfter(WED, SUNDAY)).toBe(SUN);
  });

  test('is STRICTLY after, so a date already on the start day moves a full week', () => {
    // This is what makes a setup ON the start day a full seven days rather than
    // a zero-day stub: the stub runs to the day before the NEXT start day.
    expect(nextWeekStartAfter(SUN, SUNDAY)).toBe('2026-08-23');
  });

  test('works for a non-Sunday start day', () => {
    expect(nextWeekStartAfter(WED, MONDAY)).toBe('2026-08-17');
  });

  test('crosses a month boundary', () => {
    expect(nextWeekStartAfter('2026-08-30', MONDAY)).toBe('2026-08-31');
  });
});

describe('mostRecentWeekStartOnOrBefore', () => {
  test('walks back to the previous start day', () => {
    expect(mostRecentWeekStartOnOrBefore(WED, SUNDAY)).toBe('2026-08-09');
  });

  test('is ON-OR-BEFORE, so a date already on the start day returns itself', () => {
    expect(mostRecentWeekStartOnOrBefore(SUN, SUNDAY)).toBe(SUN);
  });

  test('works for a non-Sunday start day', () => {
    expect(mostRecentWeekStartOnOrBefore(WED, MONDAY)).toBe('2026-08-10');
  });
});

describe('resolveWeekEnd — the legacy fallback', () => {
  test('uses the stored boundary when the cycle has one', () => {
    expect(resolveWeekEnd(WED, SAT)).toBe(SAT);
  });

  test('falls back to weekStart + 6 when the cycle predates stored boundaries', () => {
    // Every cycle written before this slice has no weekEnd, and this fallback
    // is what reproduces their existing behavior exactly. Without it they would
    // read as expired the moment the guard stopped counting days.
    expect(resolveWeekEnd('2026-08-03', undefined)).toBe('2026-08-09');
  });

  test('treats null the same as absent', () => {
    expect(resolveWeekEnd('2026-08-03', null)).toBe('2026-08-09');
  });

  test('the fallback length is WEEK_LENGTH_DAYS, not a hardcoded 7', () => {
    const weekStart = '2026-08-03';
    expect(resolveWeekEnd(weekStart, undefined)).toBe(
      addDaysIso(weekStart, WEEK_LENGTH_DAYS - 1)
    );
  });
});

describe('isWithinWeek', () => {
  test('the last day of the week is still within it', () => {
    // Inclusive: weekEnd is the final day the cycle is live, not the boundary
    // it has already crossed.
    expect(isWithinWeek(SAT, SAT)).toBe(true);
  });

  test('the day after weekEnd is not', () => {
    expect(isWithinWeek(SAT, SUN)).toBe(false);
  });

  test('a day well before weekEnd is within it', () => {
    expect(isWithinWeek(SAT, WED)).toBe(true);
  });

  test('a long-abandoned week is not', () => {
    expect(isWithinWeek('2026-01-10', '2026-08-12')).toBe(false);
  });

  test('a future weekEnd counts as within, preserving the clock-skew guard', () => {
    // Carried over from the fixed-length predicate: a cycle whose boundary is
    // ahead of today is live, so clock or timezone skew cannot make the app
    // open a second cycle for a week the user already has.
    expect(isWithinWeek('2026-08-22', WED)).toBe(true);
  });

  describe('the 4-day stub, day by day (the transition Step-0 called the crux)', () => {
    // Setup Wednesday, start day Sunday. Cycle 1 runs Wed-Sat inclusive, and
    // the first FULL week begins Sunday. Under the retired age < 7 predicate
    // Sunday/Monday/Tuesday all read as still-current; here they do not.
    const stubEnd = SAT;

    test.each([WED, THU, FRI, SAT])('%s is within the stub', (day) => {
      expect(isWithinWeek(stubEnd, day)).toBe(true);
    });

    test.each([SUN, '2026-08-17', '2026-08-18'])(
      '%s is NOT within the stub, so the first full week can open',
      (day) => {
        expect(isWithinWeek(stubEnd, day)).toBe(false);
      }
    );
  });
});

describe('planWeek', () => {
  describe('no weekStartDay — the current, pre-picker state', () => {
    test('anchors to the open date and runs a full week, exactly as today', () => {
      expect(planWeek({ todayIso: WED, weekStartDay: null, priorWeekEnd: null })).toEqual({
        weekStart: WED,
        weekEnd: '2026-08-18',
      });
    });

    test('undefined is treated the same as null', () => {
      expect(
        planWeek({ todayIso: WED, weekStartDay: undefined, priorWeekEnd: null })
      ).toEqual({ weekStart: WED, weekEnd: '2026-08-18' });
    });

    test('an expired prior week still anchors to today — the reachable path is unchanged', () => {
      // Every path reachable before this slice arrives here with an expired
      // prior week, and this asserts the plan is byte-identical to what the old
      // toIsoDate(new Date()) write produced.
      expect(
        planWeek({ todayIso: WED, weekStartDay: null, priorWeekEnd: '2026-08-11' })
      ).toEqual({ weekStart: WED, weekEnd: '2026-08-18' });
    });

    test('a still-live prior week is not overlapped', () => {
      // Newly reachable: closing a week early routes to the open. Starting the
      // replacement on top of the week it replaces would put two cycles on the
      // same days.
      expect(
        planWeek({ todayIso: WED, weekStartDay: null, priorWeekEnd: SAT })
      ).toEqual({ weekStart: SUN, weekEnd: '2026-08-22' });
    });
  });

  describe('setup with a chosen start day — the stub', () => {
    test('a mid-week setup runs to the day before the next start day', () => {
      expect(
        planWeek({ todayIso: WED, weekStartDay: SUNDAY, priorWeekEnd: null })
      ).toEqual({ weekStart: WED, weekEnd: SAT });
    });

    test('the stub keeps the setup day as its weekStart, not a backdated anchor', () => {
      // Backdating to the previous Sunday would give the same usable window but
      // a weekStart the user never acted on, and it is not what the semantics
      // say cycle 1 is.
      const { weekStart } = planWeek({
        todayIso: WED,
        weekStartDay: SUNDAY,
        priorWeekEnd: null,
      });
      expect(weekStart).toBe(WED);
    });

    test('a setup ON the start day is a full week, not a zero-day stub', () => {
      expect(
        planWeek({ todayIso: SUN, weekStartDay: SUNDAY, priorWeekEnd: null })
      ).toEqual({ weekStart: SUN, weekEnd: '2026-08-22' });
    });

    test('a setup the day before the start day is a one-day stub', () => {
      expect(
        planWeek({ todayIso: SAT, weekStartDay: SUNDAY, priorWeekEnd: null })
      ).toEqual({ weekStart: SAT, weekEnd: SAT });
    });
  });

  describe('recurring weeks — the anchor holds', () => {
    test('opening ON the start day after a stub starts the first full week', () => {
      expect(
        planWeek({ todayIso: SUN, weekStartDay: SUNDAY, priorWeekEnd: SAT })
      ).toEqual({ weekStart: SUN, weekEnd: '2026-08-22' });
    });

    test('opening LATE still anchors back to the start day', () => {
      // THE DEFECT 2 REGRESSION TEST. The old write path stamped whatever day
      // the user happened to open on, so the anchor drifted permanently. A
      // Tuesday open belongs to the week that began Sunday.
      expect(
        planWeek({ todayIso: '2026-08-18', weekStartDay: SUNDAY, priorWeekEnd: SAT })
      ).toEqual({ weekStart: SUN, weekEnd: '2026-08-22' });
    });

    test('skipping a whole week anchors to the most recent start day', () => {
      expect(
        planWeek({ todayIso: '2026-08-27', weekStartDay: SUNDAY, priorWeekEnd: SAT })
      ).toEqual({ weekStart: '2026-08-23', weekEnd: '2026-08-29' });
    });

    test('closing early opens the NEXT anchored week, never one overlapping the last', () => {
      expect(
        planWeek({ todayIso: WED, weekStartDay: SUNDAY, priorWeekEnd: SAT })
      ).toEqual({ weekStart: SUN, weekEnd: '2026-08-22' });
    });

    test('a legacy prior week whose boundary is not an anchor still lands on the start day', () => {
      // A cycle written before this slice ends on weekStart + 6, which can be
      // any weekday. Snapping to priorWeekEnd + 1 would inherit that arbitrary
      // day and drift forever; snapping to the next start day after it fixes
      // the anchor on the first recurring week.
      const { weekStart } = planWeek({
        todayIso: '2026-08-19',
        weekStartDay: SUNDAY,
        priorWeekEnd: '2026-08-18',
      });
      expect(weekStart).toBe('2026-08-23');
      expect(isoWeekday(weekStart)).toBe(SUNDAY);
    });

    test('every recurring weekStart falls on the chosen start day', () => {
      // The invariant that closes Defect 2, asserted over a month of opens
      // rather than at one convenient date.
      for (let offset = 0; offset < 30; offset++) {
        const today = addDaysIso(SUN, offset);
        const { weekStart, weekEnd } = planWeek({
          todayIso: today,
          weekStartDay: SUNDAY,
          priorWeekEnd: SAT,
        });
        expect(isoWeekday(weekStart)).toBe(SUNDAY);
        expect(daysBetweenIso(weekStart, weekEnd)).toBe(WEEK_LENGTH_DAYS - 1);
      }
    });
  });
});
