// Focus rhythms (Four-Pillar IA Phase B-3c). A quiet, opt-in capture of when
// focus tends to come most easily for the user. Stored as time-of-day keys on
// the user doc; nothing here is scored, counted, or tracked. Downstream use
// (nudge / anchor timing) is intentionally out of scope for this slice.

export type FocusRhythmKey =
  | 'early_morning'
  | 'mid_morning'
  | 'afternoon'
  | 'evening'
  | 'late_night'
  | 'varies';

/** The one key that means "no fixed pattern". Never maps to a clock range. */
export const VARIES_KEY = 'varies';

/** The keys that DO map to a clock range, in canonical order. */
export type TimedRhythmKey = Exclude<FocusRhythmKey, typeof VARIES_KEY>;

export interface FocusRhythmOption {
  key: FocusRhythmKey;
  /** Standalone title-case label, for the selection list. */
  label: string;
  /**
   * Lowercase sentence fragment for recall copy, carrying whatever preposition
   * and article the sentence needs so templates never hardcode "the".
   *
   * Null for `varies`: it is not a time, so it is never joined into the
   * "Focus tends to come easiest for you ..." sentence. It gets its own fixed
   * sentence instead.
   */
  phrase: string | null;
}

export const FOCUS_RHYTHM_OPTIONS: FocusRhythmOption[] = [
  { key: 'early_morning', label: 'Early morning', phrase: 'in the early morning' },
  { key: 'mid_morning', label: 'Mid-morning', phrase: 'in the mid-morning' },
  { key: 'afternoon', label: 'Afternoon', phrase: 'in the afternoon' },
  { key: 'evening', label: 'Evening', phrase: 'in the evening' },
  // No article: "late at night" is already adverbial, so "in the late at
  // night" would be ungrammatical.
  { key: 'late_night', label: 'Late at night', phrase: 'late at night' },
  { key: 'varies', label: 'It varies', phrase: null },
];

export const FOCUS_RHYTHM_KEYS = FOCUS_RHYTHM_OPTIONS.map((o) => o.key);

/**
 * The timed keys in canonical day order, `varies` removed.
 *
 * This is the order every surface must read windows in, so a suggestion can
 * never contradict the reflection the Focus hub already showed the user.
 */
export const TIMED_RHYTHM_KEYS_IN_ORDER = FOCUS_RHYTHM_OPTIONS.map((o) => o.key).filter(
  (key): key is TimedRhythmKey => key !== VARIES_KEY
);

/** Inclusive hour range on a 24h clock. Wraps midnight when start > end. */
export interface RhythmHourRange {
  startHour: number;
  endHour: number;
}

/**
 * Clock ranges for the timed rhythm keys, defined once here so the matcher
 * carries no magic numbers.
 *
 * Deliberately NOT unified with the four other day-part helpers in the app
 * (dashboard/suggestedAction, dashboard/completionAcknowledgment,
 * BreathworkScreen, notificationScheduler). Those disagree with each other on
 * when evening starts and none of them models a midnight wrap; reconciling them
 * would mean touching the dashboard and engine/clock.ts, which is out of scope.
 *
 * Hours 2, 3 and 4 intentionally belong to NO window. A user who set
 * `late_night` still sees their reflected summary at 3am, but the in-window
 * line does not fire. That silence is the intended behaviour, not a gap.
 */
export const FOCUS_RHYTHM_HOURS: Record<TimedRhythmKey, RhythmHourRange> = {
  early_morning: { startHour: 5, endHour: 8 },
  mid_morning: { startHour: 9, endHour: 11 },
  afternoon: { startHour: 12, endHour: 16 },
  evening: { startHour: 17, endHour: 21 },
  // Wraps midnight: 22, 23, 0, 1.
  late_night: { startHour: 22, endHour: 1 },
};
