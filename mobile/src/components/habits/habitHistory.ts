// Habit detail history — pure logic (no React, no RN).
//
// Everything the detail screen says about a habit's past is computed here, and
// every rule below exists to keep a number from becoming a score.
//
// The governing test (Accountability Amendment): CAN THIS NUMBER BE FAILED?
//   - A cumulative total only ever grows. It cannot be failed. It ships.
//   - A typical rate describes what happened. It names no target. It ships.
//   - A fraction against a target, a percentage, a completion rate, or a streak
//     can all be failed. None of them are computed here, at all.
//
// The second rule is that a habit too new for a line does not get a zero, a
// placeholder, or an empty state — it gets no line. Nobody is greeted with
// their own absence of history.

import { localDateKey } from '../dashboard/habitWeekState';
import type { Habit } from '../../types/models';

/**
 * How many past weeks the "Since you started" view shows. FIXED, permanently.
 * It must not grow with habit age and must not scroll horizontally — longer
 * history belongs in Look Back. A habit two years old renders exactly these
 * four rows, same as a habit five weeks old.
 */
export const HISTORY_WEEKS = 4;

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
 * Full weekday names in COLUMN order for a week starting at `weekStartsOn`, so
 * the four-week view's columns line up with the week strip's day letters
 * without either one re-deriving the locale's week start.
 */
export function weekdayNames(weekStartsOn: number): string[] {
  return Array.from({ length: 7 }, (_, i) => DAY_NAMES[(weekStartsOn + i) % 7]);
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
];

// ── dates ────────────────────────────────────────────────────────────

/**
 * Firestore Timestamp | Date | epoch ms | date string → Date, or null.
 * `createdAt` is a Timestamp on a loaded habit but a sentinel on one that was
 * just written locally, so this never assumes `.toDate()` is there.
 */
export function toDateSafe(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof (value as any).toDate === 'function') {
    try {
      const d = (value as any).toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** "12 July". No year: the year is noise on a surface about recent months. */
export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// ── metadata labels ──────────────────────────────────────────────────

/**
 * "Every day" / "Mon · Wed · Fri" / "Flexible", or null when the habit does not
 * record a schedule.
 *
 * A legacy habit (no `frequencyType` — the wizard writes type + frequency only)
 * returns NULL rather than a guess. habitWeekState refuses to infer 'daily'
 * from type/frequency because a wrong guess paints false gaps; a chip that
 * states the wrong schedule is the same lie in words, so it is omitted too.
 */
export function scheduleLabel(habit: Pick<Habit, 'frequencyType' | 'specificDays'>): string | null {
  switch (habit.frequencyType) {
    case 'daily':
      return 'Every day';
    case 'flexible':
      return 'Flexible';
    case 'specific_days': {
      const days = [...(habit.specificDays ?? [])]
        .filter((d) => d >= 0 && d <= 6)
        .sort((a, b) => a - b);
      if (days.length === 0) return null;
      return days.map((d) => DAY_ABBREVIATIONS[d]).join(' · ');
    }
    default:
      return null;
  }
}

/** "Morning" / "Afternoon" / "Evening". 'anytime' is not a time of day. */
export function timeOfDayLabel(habit: Pick<Habit, 'timeOfDay'>): string | null {
  switch (habit.timeOfDay) {
    case 'morning':
      return 'Morning';
    case 'afternoon':
      return 'Afternoon';
    case 'evening':
      return 'Evening';
    default:
      return null;
  }
}

/** "Since 12 July", or null when the habit carries no usable start date. */
export function sinceLabel(startDate: Date | null): string | null {
  return startDate ? `Since ${formatDayMonth(startDate)}` : null;
}

/**
 * One qualitative noticing for the week card (Voice & Tone §2.3). No number.
 *
 * This ECHOES the time of day the user themselves set on the habit. It does not
 * infer a pattern from completion timestamps — completions record a date, not a
 * clock time, so any claim about when they "reach for this" would be invented.
 * No declared slot, no line.
 */
export function qualitativeNoticing(habit: Pick<Habit, 'timeOfDay'>): string | null {
  switch (habit.timeOfDay) {
    case 'morning':
      return 'Mornings are usually when you reach for this.';
    case 'afternoon':
      return 'Afternoons are usually when you reach for this.';
    case 'evening':
      return 'Evenings are usually when you reach for this.';
    default:
      return null;
  }
}

// ── the four-week view ───────────────────────────────────────────────

export interface HistoryWeek {
  /** "4 wks ago" … "Last week". */
  label: string;
  /** Seven local YYYY-MM-DD keys, in the same column order as the week strip. */
  dateKeys: string[];
}

/**
 * The `HISTORY_WEEKS` COMPLETE weeks before the current one, oldest first.
 *
 * The current week is deliberately absent: it is the "This week" card directly
 * above, and drawing it twice would double-count the same days by eye.
 */
export function pastWeeks(
  today: Date,
  weekStartsOn: number,
  count: number = HISTORY_WEEKS
): HistoryWeek[] {
  const currentWeekStart = new Date(today);
  currentWeekStart.setHours(0, 0, 0, 0);
  currentWeekStart.setDate(
    currentWeekStart.getDate() - ((currentWeekStart.getDay() - weekStartsOn + 7) % 7)
  );

  return Array.from({ length: count }, (_, row) => {
    // row 0 is the oldest: `count` weeks back. row `count - 1` is last week.
    const weeksBack = count - row;
    const start = addDays(currentWeekStart, -7 * weeksBack);

    return {
      label: weeksBack === 1 ? 'Last week' : `${weeksBack} wks ago`,
      dateKeys: Array.from({ length: 7 }, (_, i) => localDateKey(addDays(start, i))),
    };
  });
}

// ── reporting lines ──────────────────────────────────────────────────

/**
 * A descriptive sentence. `emphasis` renders in teal, `rest` in muted sage —
 * a sentence with a value emphasised inside it, never a large numeral standing
 * alone in a stat row.
 */
export interface ReportingLine {
  id: 'total' | 'typical' | 'steadiest';
  emphasis: string;
  rest: string;
}

/**
 * The habit's own unit, when the user told us when they do it. Otherwise the
 * neutral "completions" — never a unit inferred from the habit's NAME, which
 * would guess wrong on "Evening pages" done at lunch.
 */
export function completionUnit(habit: Pick<Habit, 'timeOfDay'>, count: number): string {
  const plural = count === 1 ? '' : 's';
  switch (habit.timeOfDay) {
    case 'morning':
      return `morning${plural}`;
    case 'afternoon':
      return `afternoon${plural}`;
    case 'evening':
      return `evening${plural}`;
    default:
      return count === 1 ? 'completion' : 'completions';
  }
}

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

/** Weeks of history required before "most weeks…" describes anything. */
const TYPICAL_MIN_WEEKS = 3;
/** Days of history required before "steadiest…" can name a stretch. */
const STEADIEST_MIN_DAYS = 28;
/** A stretch nobody would call steady is not worth naming. */
const STEADIEST_MIN_COMPLETIONS = 3;
/** The window "steadiest" describes. */
const STEADIEST_WINDOW_DAYS = 14;

/**
 * Median completions per COMPLETE week, over the weeks since the habit started.
 * The current partial week is excluded: a week two days old would drag the
 * typical value down and read as a decline that has not happened.
 */
function medianCompletionsPerWeek(
  completionDates: Date[],
  start: Date,
  today: Date
): { median: number; weeks: number } {
  const completeWeeks = Math.floor(daysBetween(start, today) / 7);
  if (completeWeeks < 1) return { median: 0, weeks: completeWeeks };

  const buckets = new Array(completeWeeks).fill(0);
  completionDates.forEach((d) => {
    const offset = daysBetween(start, d);
    if (offset < 0) return;
    const bucket = Math.floor(offset / 7);
    if (bucket < completeWeeks) buckets[bucket] += 1;
  });

  const sorted = [...buckets].sort((a, b) => a - b);
  return { median: sorted[Math.floor(sorted.length / 2)], weeks: completeWeeks };
}

/**
 * The best contiguous 14-day window, as a two-pointer sweep over the completion
 * dates. Returns the window's start date and how many completions it holds.
 */
function steadiestWindow(
  completionDates: Date[]
): { start: Date; end: Date; count: number } | null {
  if (completionDates.length === 0) return null;

  let bestStart = 0;
  let bestCount = 0;
  let left = 0;

  for (let right = 0; right < completionDates.length; right++) {
    while (daysBetween(completionDates[left], completionDates[right]) >= STEADIEST_WINDOW_DAYS) {
      left++;
    }
    const count = right - left + 1;
    if (count > bestCount) {
      bestCount = count;
      bestStart = left;
    }
  }

  const start = completionDates[bestStart];
  return { start, end: addDays(start, STEADIEST_WINDOW_DAYS - 1), count: bestCount };
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

/**
 * Name a fortnight the way a person would. Within one month it is "the first /
 * last two weeks of July"; otherwise an explicit range. Never "your best
 * stretch" — the phrasing describes a period, not a performance to hold.
 */
export function describeStretch(start: Date, end: Date): string {
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    if (start.getDate() <= 4) {
      return `the first two weeks of ${MONTH_NAMES[start.getMonth()]}`;
    }
    if (end.getDate() >= daysInMonth(end) - 3) {
      return `the last two weeks of ${MONTH_NAMES[end.getMonth()]}`;
    }
    // En dash for a numeric range: the brand guard bans the EM dash, and
    // explicitly permits en dashes in ranges.
    return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]}`;
  }

  return `${formatDayMonth(start)} to ${formatDayMonth(end)}`;
}

/**
 * The descriptive lines under the four-week view. Any line the habit is too new
 * to support is OMITTED — never rendered as a zero or a placeholder.
 */
export function reportingLines({
  habit,
  completionDateKeys,
  startDate,
  today,
}: {
  habit: Pick<Habit, 'timeOfDay'>;
  /** Every completion date key for this habit, any order. */
  completionDateKeys: string[];
  /** The habit's start date; null when it carries no usable createdAt. */
  startDate: Date | null;
  today: Date;
}): ReportingLine[] {
  const lines: ReportingLine[] = [];

  const dates = [...new Set(completionDateKeys)]
    .map((key) => {
      const [y, m, d] = key.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    })
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  // 1. The cumulative total. Only ever grows, so it cannot be failed. A habit
  //    with no completions yet gets no line rather than a zero.
  if (dates.length > 0 && startDate) {
    lines.push({
      id: 'total',
      emphasis: `${dates.length} ${completionUnit(habit, dates.length)}`,
      rest: ` since ${formatDayMonth(startDate)}.`,
    });
  }

  if (!startDate) return lines;

  const span = daysBetween(startDate, today);

  // 2. The typical week. Needs enough complete weeks to have a typical value at
  //    all; a median of zero is not reported, because "most weeks land around
  //    zero" is a verdict, not a description.
  const { median, weeks } = medianCompletionsPerWeek(dates, startDate, today);
  if (weeks >= TYPICAL_MIN_WEEKS && median > 0) {
    lines.push({
      id: 'typical',
      emphasis: 'Most weeks',
      rest: ` land around ${numberWord(median)}.`,
    });
  }

  // 3. The steadiest stretch. Needs a month of history and a fortnight worth
  //    naming; below that it would be pointing at noise.
  if (span >= STEADIEST_MIN_DAYS) {
    const best = steadiestWindow(dates);
    if (best && best.count >= STEADIEST_MIN_COMPLETIONS) {
      lines.push({
        id: 'steadiest',
        emphasis: 'Steadiest',
        rest: ` was ${describeStretch(best.start, best.end)}.`,
      });
    }
  }

  return lines;
}
