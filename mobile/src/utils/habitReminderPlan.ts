/**
 * What a habit's reminder should actually schedule.
 *
 * ONE source of truth, deliberately shared by two callers that must never
 * disagree:
 *   - reminderScheduler decides what triggers to write from it;
 *   - the create sheet and detail screen hide the reminder control entirely
 *     when it returns null.
 *
 * The reminder's days are NOT a stored field. They are derived from the habit's
 * own frequency every time, so a habit scheduled Mon/Wed/Fri cannot end up with
 * a Tuesday reminder, and editing the habit's days moves the reminder with them
 * without a second thing to keep in sync.
 */

import { Habit } from '../types';

/**
 * Weekly triggers repeat on a weekday; daily triggers repeat every day.
 * `null` means this habit cannot carry a reminder at all — see reminderPlan.
 */
export type HabitReminderPlan =
  | { kind: 'daily' }
  | { kind: 'weekly'; weekdays: number[] };

/**
 * Convert a Habit.specificDays value to an expo-notifications weekday.
 *
 * Habit.specificDays is 0-6 with 0 = Sunday.
 * expo-notifications WeeklyTriggerInput.weekday is 1-7 with 1 = Sunday.
 *
 * So: weekday = day + 1. This is a one-line function on purpose — it gets a
 * name and a test because getting it wrong fails SILENTLY. There is no error
 * and no crash; the reminder simply arrives on the wrong day, which reads to a
 * user as the app being unreliable rather than as a bug worth reporting.
 */
export function toExpoWeekday(specificDay: number): number {
  return specificDay + 1;
}

/** The subset of Habit this module reads. */
type ReminderRelevantHabit = Pick<Habit, 'frequencyType' | 'specificDays'>;

/**
 * The trigger shape for this habit's reminder, or null when it must not have
 * one.
 *
 * Null cases — deliberately NOT defaulted to daily, because a reminder needs a
 * cadence and inventing one the user never chose is worse than offering no
 * reminder:
 *   - no `frequencyType` at all (habits created by the retired wizard, which
 *     wrote only type + frequency);
 *   - `specific_days` with no days actually picked (reachable: the create sheet
 *     does not require a dot, and only persists the array when non-empty).
 *
 * These are exactly the cases where scheduleLabel() also returns null, so the
 * UI can show the inherited day summary and the control together or not at
 * all. A test pins that agreement.
 *
 * `flexible` gets a DAILY trigger: it carries no day information, and a daily
 * nudge is the only coherent reading of "whenever I can" once the user has
 * explicitly asked to be reminded.
 */
export function habitReminderPlan(habit: ReminderRelevantHabit): HabitReminderPlan | null {
  switch (habit.frequencyType) {
    case 'daily':
    case 'flexible':
      return { kind: 'daily' };
    case 'specific_days': {
      const weekdays = [...(habit.specificDays ?? [])]
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .sort((a, b) => a - b)
        .map(toExpoWeekday);
      if (weekdays.length === 0) return null;
      return { kind: 'weekly', weekdays };
    }
    default:
      return null;
  }
}

/** Whether the reminder control should be offered for this habit at all. */
export function canHabitHaveReminder(habit: ReminderRelevantHabit): boolean {
  return habitReminderPlan(habit) !== null;
}

// ─── Notification identifiers ─────────────────────────────────────

/**
 * Every identifier for a habit's reminders shares this prefix, so the whole set
 * can be found and cancelled without knowing how many triggers it has.
 */
export function habitReminderPrefix(habitId: string): string {
  return `habit-reminder-${habitId}`;
}

/**
 * Daily reminders use the bare prefix; weekly reminders append the weekday, so
 * one habit owns up to seven identifiers.
 */
export function habitReminderIdentifier(habitId: string, weekday?: number): string {
  const prefix = habitReminderPrefix(habitId);
  return weekday === undefined ? prefix : `${prefix}-${weekday}`;
}

/**
 * Whether an identifier belongs to this habit.
 *
 * Matches the bare prefix and `${prefix}-${weekday}`, but NOT a different
 * habit whose id merely starts with the same characters — hence the explicit
 * dash check rather than a bare startsWith.
 */
export function isIdentifierForHabit(identifier: string, habitId: string): boolean {
  const prefix = habitReminderPrefix(habitId);
  return identifier === prefix || identifier.startsWith(`${prefix}-`);
}
