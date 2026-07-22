// Weekly habit grid — pure logic.
//
// The headline test is "a non-daily habit in a perfect week renders zero
// missed-state cells": the whole point of the scheduled/unscheduled split is
// that a Mon/Wed/Fri habit with all three days done is not drawn as 3-of-7.

import {
  MISSED_STATE,
  cellAccessibilityLabel,
  cellState,
  currentWeek,
  isTappable,
  localDateKey,
  scheduledWeekdays,
  type CellState,
  type WeekDay,
} from '../weeklyHabitGrid';

// Sunday-start week containing Thu 2026-07-16: Sun 12 … Sat 18.
const THURSDAY = new Date(2026, 6, 16, 9, 0, 0);
const SUNDAY_START = 0;

/** Resolve a whole week for one habit, the way the component does. */
function weekStates(
  habit: Parameters<typeof scheduledWeekdays>[0],
  completedKeys: string[],
  today: Date = THURSDAY
): CellState[] {
  const days = currentWeek(today, SUNDAY_START);
  const scheduled = scheduledWeekdays(habit);
  const done = new Set(completedKeys);
  return days.map((d) =>
    cellState({
      scheduled: scheduled.has(d.weekday),
      completed: done.has(d.dateKey),
      tense: d.tense,
    })
  );
}

describe('scheduledWeekdays', () => {
  it('daily schedules every weekday', () => {
    expect([...scheduledWeekdays({ frequencyType: 'daily' })].sort()).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });

  it('specific_days schedules exactly the listed days', () => {
    const days = scheduledWeekdays({
      frequencyType: 'specific_days',
      specificDays: [1, 3, 5],
    });
    expect([...days].sort()).toEqual([1, 3, 5]);
  });

  it('flexible schedules no days (no specific day is ever owed)', () => {
    expect(scheduledWeekdays({ frequencyType: 'flexible' }).size).toBe(0);
  });

  it('an undefined frequencyType schedules no days — never inferred as daily', () => {
    // Wizard-created habits carry type + frequency only. Inferring 'daily' here
    // would manufacture gaps for a schedule we do not actually know.
    expect(scheduledWeekdays({}).size).toBe(0);
    expect(scheduledWeekdays({ specificDays: [1, 2] }).size).toBe(0);
  });

  it('specific_days with a missing array schedules no days rather than throwing', () => {
    expect(scheduledWeekdays({ frequencyType: 'specific_days' }).size).toBe(0);
  });
});

describe('a perfect week never renders a missed state', () => {
  it('Mon/Wed/Fri habit with all three scheduled days done has zero gap cells', () => {
    // Mon 13, Wed 15 are past; Fri 17 is still ahead. "Perfect so far" =
    // every scheduled day that has already happened is done.
    const states = weekStates(
      { frequencyType: 'specific_days', specificDays: [1, 3, 5] },
      ['2026-07-13', '2026-07-15']
    );

    expect(states).not.toContain(MISSED_STATE);
    // The four unscheduled days are structurally their own thing, not empties.
    // Today (Thu) is one of them and takes the tappable off-schedule variant.
    const notScheduled = states.filter(
      (s) => s === 'unscheduled' || s === 'today_unscheduled'
    );
    expect(notScheduled.length).toBe(4);
    expect(states.filter((s) => s === 'today_unscheduled').length).toBe(1);
  });

  it('a fully-elapsed perfect Mon/Wed/Fri week has zero gap cells', () => {
    // Stand at Saturday so all three scheduled days are in the past.
    const saturday = new Date(2026, 6, 18, 9, 0, 0);
    const states = weekStates(
      { frequencyType: 'specific_days', specificDays: [1, 3, 5] },
      ['2026-07-13', '2026-07-15', '2026-07-17'],
      saturday
    );

    expect(states).not.toContain(MISSED_STATE);
    expect(states.filter((s) => s === 'completed').length).toBe(3);
  });

  it('a flexible habit can never produce a gap, whatever it did', () => {
    expect(weekStates({ frequencyType: 'flexible' }, [])).not.toContain(MISSED_STATE);
    expect(
      weekStates({ frequencyType: 'flexible' }, ['2026-07-13', '2026-07-14'])
    ).not.toContain(MISSED_STATE);
  });

  it('an honest gap IS shown when a scheduled past day was not done', () => {
    // The guardrail permits accountability; it does not delete the information.
    const states = weekStates(
      { frequencyType: 'specific_days', specificDays: [1, 3, 5] },
      ['2026-07-15']
    );
    expect(states).toContain(MISSED_STATE);
    expect(states.filter((s) => s === MISSED_STATE).length).toBe(1); // Mon only
  });
});

describe('cellState', () => {
  it('a completion on an unscheduled day is an ordinary completion', () => {
    expect(
      cellState({ scheduled: false, completed: true, tense: 'past' })
    ).toBe('completed');
    expect(
      cellState({ scheduled: false, completed: true, tense: 'today' })
    ).toBe('completed');
    // Identical to the scheduled case — no deviation marker.
    expect(cellState({ scheduled: true, completed: true, tense: 'past' })).toBe(
      'completed'
    );
  });

  it('separates scheduled-and-missed from never-scheduled in the past', () => {
    expect(cellState({ scheduled: true, completed: false, tense: 'past' })).toBe('gap');
    expect(cellState({ scheduled: false, completed: false, tense: 'past' })).toBe(
      'unscheduled'
    );
  });

  it('today splits by schedule so the off-schedule affordance can differ', () => {
    expect(cellState({ scheduled: true, completed: false, tense: 'today' })).toBe(
      'today_scheduled'
    );
    expect(cellState({ scheduled: false, completed: false, tense: 'today' })).toBe(
      'today_unscheduled'
    );
  });

  it('future scheduled days are upcoming, not missed', () => {
    expect(cellState({ scheduled: true, completed: false, tense: 'future' })).toBe(
      'upcoming'
    );
    expect(cellState({ scheduled: false, completed: false, tense: 'future' })).toBe(
      'unscheduled'
    );
  });
});

describe('isTappable', () => {
  it('is true only for today', () => {
    expect(isTappable('today')).toBe(true);
    expect(isTappable('past')).toBe(false);
    expect(isTappable('future')).toBe(false);
  });
});

describe('currentWeek', () => {
  it('returns seven consecutive days starting at the locale week start', () => {
    const days = currentWeek(THURSDAY, SUNDAY_START);
    expect(days.map((d) => d.dateKey)).toEqual([
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
    ]);
    expect(days[0].weekday).toBe(0);
  });

  it('honours a Monday week start', () => {
    const days = currentWeek(THURSDAY, 1);
    expect(days[0].dateKey).toBe('2026-07-13');
    expect(days[0].weekday).toBe(1);
    expect(days[6].dateKey).toBe('2026-07-19');
  });

  it('tags exactly one day as today, with past before and future after', () => {
    const days = currentWeek(THURSDAY, SUNDAY_START);
    expect(days.filter((d) => d.tense === 'today').length).toBe(1);
    expect(days.filter((d) => d.tense === 'past').length).toBe(4);
    expect(days.filter((d) => d.tense === 'future').length).toBe(2);
  });

  it('treats the week-start day itself as today when it is today', () => {
    const sunday = new Date(2026, 6, 12, 23, 30, 0);
    const days = currentWeek(sunday, SUNDAY_START);
    expect(days[0].tense).toBe('today');
    expect(days.filter((d) => d.tense === 'past').length).toBe(0);
  });

  it('uses local dates, not UTC (a late-evening date does not slip a day)', () => {
    // toISOString() would report the 17th for a UTC-negative device here.
    const lateEvening = new Date(2026, 6, 16, 23, 45, 0);
    expect(localDateKey(lateEvening)).toBe('2026-07-16');
  });
});

describe('cellAccessibilityLabel', () => {
  const day = (over: Partial<WeekDay> = {}): WeekDay => ({
    dateKey: '2026-07-13',
    weekday: 1,
    tense: 'past',
    dayName: 'Monday',
    ...over,
  });

  it('says "not scheduled" — never "missed"', () => {
    const label = cellAccessibilityLabel(day(), 'unscheduled');
    expect(label).toBe('Monday, not scheduled');
    expect(label).not.toMatch(/miss/i);
  });

  it('distinguishes a gap from a not-scheduled day in words', () => {
    expect(cellAccessibilityLabel(day(), 'gap')).toBe('Monday, not completed');
    expect(cellAccessibilityLabel(day(), 'unscheduled')).toBe('Monday, not scheduled');
  });

  it('prompts on today, both on and off schedule', () => {
    const today = day({ tense: 'today', dayName: 'Thursday' });
    expect(cellAccessibilityLabel(today, 'today_scheduled')).toBe(
      'Today, not completed, double tap to complete'
    );
    expect(cellAccessibilityLabel(today, 'today_unscheduled')).toBe(
      'Today, not scheduled, double tap to complete'
    );
  });

  it('never says "missed" in any state', () => {
    const states: CellState[] = [
      'completed',
      'gap',
      'today_scheduled',
      'upcoming',
      'today_unscheduled',
      'unscheduled',
    ];
    for (const s of states) {
      expect(cellAccessibilityLabel(day(), s)).not.toMatch(/miss/i);
    }
  });
});
