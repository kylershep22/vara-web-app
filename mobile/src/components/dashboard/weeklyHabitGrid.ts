// Weekly habit grid — pure logic (no React, no RN).
//
// The grid answers one question for the user: "am I actually doing this?" It is
// accountability, not surveillance and not shame (Voice & Tone v2.2 §3.4). The
// governing test for every rule below: does an honest gap read as INFORMATION,
// or as FAILURE? Information ships; failure does not.
//
// The crux is non-daily habits. A Mon/Wed/Fri habit in a PERFECT week has three
// completions and four days it was never asked about. If those four render as
// empty cells the week reads as 3-of-7 — a perfect week drawn as failure. So
// days the habit was never scheduled for are a structurally different thing
// from days it was scheduled and missed, and they carry their own cell state
// here rather than falling through to the missed state.

/** Cell states. Exactly one applies to each (habit, day) pair. */
export type CellState =
  /** Completed. Same state on a scheduled OR unscheduled day — see below. */
  | 'completed'
  /** Scheduled, past, not completed. The honest gap. */
  | 'gap'
  /** Scheduled, today, not completed. Tappable. */
  | 'today_scheduled'
  /** Scheduled, future, not completed. */
  | 'upcoming'
  /** Not scheduled, today, not completed. Tappable (off-schedule is allowed). */
  | 'today_unscheduled'
  /** Not scheduled, past or future. Never a dot — never reads as a missed day. */
  | 'unscheduled';

/**
 * The only state that says "you were asked and it didn't happen". Tests assert
 * a perfect non-daily week produces NONE of these.
 */
export const MISSED_STATE: CellState = 'gap';

export type Tense = 'past' | 'today' | 'future';

/** The scheduling fields we read off a Habit. Structural so tests need no full Habit. */
export interface HabitScheduleFields {
  frequencyType?: 'daily' | 'specific_days' | 'flexible';
  specificDays?: number[];
}

const EVERY_WEEKDAY: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

/**
 * Which weekdays (0=Sun … 6=Sat) this habit is scheduled for.
 *
 * Two shapes deliberately resolve to NO scheduled days:
 *
 *   'flexible'  — "3 times a week, any days". No specific day is scheduled, and
 *                 the stored frequency is 0 (useHabitsScreen.ts), so there is
 *                 not even a target to draw against. Every day renders as
 *                 not-scheduled; today stays tappable; completions still show.
 *                 A flexible habit therefore CANNOT produce a gap, which is
 *                 correct — it can never be behind on a specific day.
 *
 *   undefined   — legacy / wizard-created habits (the wizard writes type +
 *                 frequency only, never frequencyType). We do NOT infer 'daily'
 *                 from type/frequency: inferring would paint up to six gaps on a
 *                 habit whose schedule we do not actually know. Manufacturing a
 *                 false gap is worse than omitting a true one.
 */
export function scheduledWeekdays(habit: HabitScheduleFields): ReadonlySet<number> {
  switch (habit.frequencyType) {
    case 'daily':
      return new Set(EVERY_WEEKDAY);
    case 'specific_days':
      return new Set(habit.specificDays ?? []);
    case 'flexible':
      return new Set();
    default:
      return new Set();
  }
}

/**
 * Resolve a cell.
 *
 * Note the first branch: a completion renders as 'completed' whether or not the
 * day was scheduled. The user did the thing. Marking an off-schedule completion
 * as a deviation would be the app noting non-compliance, which is judgment.
 */
export function cellState({
  scheduled,
  completed,
  tense,
}: {
  scheduled: boolean;
  completed: boolean;
  tense: Tense;
}): CellState {
  if (completed) return 'completed';

  if (!scheduled) {
    return tense === 'today' ? 'today_unscheduled' : 'unscheduled';
  }

  switch (tense) {
    case 'past':
      return 'gap';
    case 'today':
      return 'today_scheduled';
    case 'future':
      return 'upcoming';
  }
}

/**
 * Only today is interactive. Past cells are inert because the grid never hands
 * a past date to the completion handler at all (not because the UI guards a
 * handler that would otherwise accept one), and future cells cannot be done yet.
 */
export function isTappable(tense: Tense): boolean {
  return tense === 'today';
}

/**
 * Local-timezone YYYY-MM-DD. Matches useDashboard's `today` and the document id
 * markHabitComplete writes. Deliberately NOT toISOString().split('T')[0], which
 * is UTC and lands on the wrong day for users behind UTC after ~5pm.
 */
export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * First day of the week for the device locale, as 0=Sun … 6=Sat.
 *
 * Intl.Locale.weekInfo is the only locale-aware source available without a new
 * dependency, and Hermes does not always expose it. Falls back to Sunday, which
 * matches how habit schedules are already indexed everywhere else in the app
 * (specificDays uses 0=Sun, as does the create sheet's day picker).
 */
export function resolveWeekStart(): number {
  try {
    const locale = new Intl.DateTimeFormat().resolvedOptions().locale;
    const info = (new (Intl as any).Locale(locale) as any)?.weekInfo;
    const firstDay = info?.firstDay;
    // weekInfo uses ISO numbering: 1=Mon … 7=Sun. Convert to 0=Sun … 6=Sat.
    if (typeof firstDay === 'number' && firstDay >= 1 && firstDay <= 7) {
      return firstDay === 7 ? 0 : firstDay;
    }
  } catch {
    // Intl.Locale or weekInfo unavailable — fall through.
  }
  return 0;
}

export interface WeekDay {
  /** YYYY-MM-DD, local. */
  dateKey: string;
  /** 0=Sun … 6=Sat. */
  weekday: number;
  tense: Tense;
  /** Full weekday name, for screen readers only — never rendered as text. */
  dayName: string;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * The seven days of the CURRENT week containing `today`, starting at
 * `weekStartsOn`. Current week only: habit schedules live on the mutable habit
 * document with no history, so a schedule edit silently rewrites how earlier
 * weeks would render. Staying inside the current week bounds that damage.
 */
export function currentWeek(today: Date, weekStartsOn: number): WeekDay[] {
  const todayKey = localDateKey(today);

  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const offset = (start.getDay() - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - offset);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateKey = localDateKey(date);

    // YYYY-MM-DD compares correctly as a string.
    const tense: Tense =
      dateKey === todayKey ? 'today' : dateKey < todayKey ? 'past' : 'future';

    return {
      dateKey,
      weekday: date.getDay(),
      tense,
      dayName: DAY_NAMES[date.getDay()],
    };
  });
}

/**
 * Screen-reader label. These states are not distinguishable by color, so the
 * words carry them. "not scheduled" is the important one and is never spoken as
 * "missed" — the user was not asked on that day.
 */
export function cellAccessibilityLabel(day: WeekDay, state: CellState): string {
  const when = day.tense === 'today' ? 'Today' : day.dayName;

  switch (state) {
    case 'completed':
      return day.tense === 'today'
        ? 'Today, completed, double tap to undo'
        : `${when}, completed`;
    case 'gap':
    case 'upcoming':
      return `${when}, not completed`;
    case 'today_scheduled':
      return 'Today, not completed, double tap to complete';
    case 'today_unscheduled':
      return 'Today, not scheduled, double tap to complete';
    case 'unscheduled':
      return `${when}, not scheduled`;
  }
}
