import {
  WEEK_LENGTH_DAYS,
  daysBetweenIso,
  isCurrentWeek,
  toIsoDate,
} from '../weekStart';

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

describe('isCurrentWeek', () => {
  test('the day it was opened is current', () => {
    expect(isCurrentWeek('2026-08-03', '2026-08-03')).toBe(true);
  });

  test('day six is current', () => {
    expect(isCurrentWeek('2026-08-03', '2026-08-09')).toBe(true);
  });

  test('day seven is not current, so a fresh week opens', () => {
    expect(isCurrentWeek('2026-08-03', '2026-08-10')).toBe(false);
  });

  test('a future weekStart counts as current', () => {
    // Only reachable through clock or timezone skew. Treating it as stale
    // would open a second cycle for a week the user has already opened.
    expect(isCurrentWeek('2026-08-05', '2026-08-03')).toBe(true);
  });

  test('the boundary is WEEK_LENGTH_DAYS, not a hardcoded 7 in the assertion', () => {
    const weekStart = '2026-08-03';
    const lastCurrentDay = new Date(Date.UTC(2026, 7, 3 + WEEK_LENGTH_DAYS - 1));
    const firstStaleDay = new Date(Date.UTC(2026, 7, 3 + WEEK_LENGTH_DAYS));
    expect(isCurrentWeek(weekStart, lastCurrentDay.toISOString().slice(0, 10))).toBe(true);
    expect(isCurrentWeek(weekStart, firstStaleDay.toISOString().slice(0, 10))).toBe(false);
  });
});
