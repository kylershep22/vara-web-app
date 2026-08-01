/**
 * habitReminderPlan — the weekday conversion and the "can this habit have a
 * reminder at all" decision.
 *
 * The weekday conversion gets explicit per-day coverage because it fails
 * SILENTLY. An off-by-one throws nothing and logs nothing; the reminder simply
 * arrives on the wrong day, which a user experiences as the app being flaky
 * rather than as a bug. Every one of the seven days is pinned by name.
 */

import {
  toExpoWeekday,
  habitReminderPlan,
  canHabitHaveReminder,
  habitReminderIdentifier,
  habitReminderPrefix,
  isIdentifierForHabit,
} from '../habitReminderPlan';
import { scheduleLabel } from '../../components/habits/habitHistory';

describe('toExpoWeekday — Habit 0-6 (0=Sun) to expo 1-7 (1=Sun)', () => {
  // Named rather than computed: a table written as `day + 1` would pass even
  // if the implementation were wrong in the same direction.
  test.each([
    ['Sunday', 0, 1],
    ['Monday', 1, 2],
    ['Tuesday', 2, 3],
    ['Wednesday', 3, 4],
    ['Thursday', 4, 5],
    ['Friday', 5, 6],
    ['Saturday', 6, 7],
  ])('%s: specificDays %i -> expo weekday %i', (_name, day, expected) => {
    expect(toExpoWeekday(day)).toBe(expected);
  });

  test('covers the whole week with no gaps or collisions', () => {
    const mapped = [0, 1, 2, 3, 4, 5, 6].map(toExpoWeekday);
    expect(mapped).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(new Set(mapped).size).toBe(7);
  });
});

describe('habitReminderPlan', () => {
  test('daily habits get one DAILY trigger', () => {
    expect(habitReminderPlan({ frequencyType: 'daily' })).toEqual({ kind: 'daily' });
  });

  test('flexible habits get a DAILY trigger — they carry no day information', () => {
    expect(habitReminderPlan({ frequencyType: 'flexible' })).toEqual({ kind: 'daily' });
  });

  test('specific-days habits get one WEEKLY trigger per chosen day, converted', () => {
    // Mon / Wed / Fri
    expect(habitReminderPlan({ frequencyType: 'specific_days', specificDays: [1, 3, 5] })).toEqual({
      kind: 'weekly',
      weekdays: [2, 4, 6],
    });
  });

  test('orders weekdays regardless of the order the user tapped them', () => {
    expect(habitReminderPlan({ frequencyType: 'specific_days', specificDays: [5, 0, 3] })).toEqual({
      kind: 'weekly',
      weekdays: [1, 4, 6],
    });
  });

  test('a whole week of specific days is seven triggers', () => {
    const plan = habitReminderPlan({
      frequencyType: 'specific_days',
      specificDays: [0, 1, 2, 3, 4, 5, 6],
    });
    expect(plan).toEqual({ kind: 'weekly', weekdays: [1, 2, 3, 4, 5, 6, 7] });
  });

  test('discards out-of-range day values rather than scheduling a bad weekday', () => {
    expect(habitReminderPlan({ frequencyType: 'specific_days', specificDays: [1, 9, -2] })).toEqual({
      kind: 'weekly',
      weekdays: [2],
    });
  });
});

describe('habits that cannot carry a reminder', () => {
  test('a legacy habit with no frequencyType gets no plan', () => {
    expect(habitReminderPlan({})).toBeNull();
    expect(canHabitHaveReminder({})).toBe(false);
  });

  test('specific_days with nothing picked gets no plan', () => {
    expect(habitReminderPlan({ frequencyType: 'specific_days', specificDays: [] })).toBeNull();
    expect(habitReminderPlan({ frequencyType: 'specific_days' })).toBeNull();
  });

  test('never falls back to daily — an uninvented cadence beats a wrong one', () => {
    expect(habitReminderPlan({ frequencyType: 'specific_days', specificDays: [] })).not.toEqual({
      kind: 'daily',
    });
  });
});

describe('the plan agrees with the day summary the UI shows beside it', () => {
  // The control is hidden when scheduleLabel returns null, so if these two ever
  // disagree the UI would offer a reminder it cannot schedule, or hide one it
  // could. Pinned rather than assumed.
  const cases = [
    { frequencyType: 'daily' as const },
    { frequencyType: 'flexible' as const },
    { frequencyType: 'specific_days' as const, specificDays: [1, 3, 5] },
    { frequencyType: 'specific_days' as const, specificDays: [] },
    {},
  ];

  test.each(cases)('scheduleLabel null <-> plan null for %o', (habit) => {
    expect(habitReminderPlan(habit) === null).toBe(scheduleLabel(habit) === null);
  });
});

describe('identifiers', () => {
  test('daily uses the bare prefix; weekly appends the weekday', () => {
    expect(habitReminderIdentifier('h1')).toBe('habit-reminder-h1');
    expect(habitReminderIdentifier('h1', 4)).toBe('habit-reminder-h1-4');
  });

  test('every identifier for a habit is recognised as its own', () => {
    expect(isIdentifierForHabit('habit-reminder-h1', 'h1')).toBe(true);
    expect(isIdentifierForHabit('habit-reminder-h1-2', 'h1')).toBe(true);
  });

  test('does not claim a different habit whose id merely starts the same', () => {
    // A bare startsWith would wrongly match, and deleting h1 would cancel h12.
    expect(isIdentifierForHabit('habit-reminder-h12', 'h1')).toBe(false);
    expect(isIdentifierForHabit('habit-reminder-h12-3', 'h1')).toBe(false);
  });

  test('does not claim other notification types', () => {
    expect(isIdentifierForHabit('routine-reminder-h1', 'h1')).toBe(false);
    expect(isIdentifierForHabit(habitReminderPrefix('other'), 'h1')).toBe(false);
  });
});
