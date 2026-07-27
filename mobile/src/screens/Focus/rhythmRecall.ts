// Focus rhythms — the READ side. Turns the user's stored focus-rhythm windows
// back into plain language on the Focus hub.
//
// This is RECALL of a stable preference the user deliberately set and can edit,
// not a readback of ephemeral check-in state. No scores, counts, percentages,
// streaks or targets; no "you focus best" ranking. Just what they told us, plus
// one present-tense observation when the clock happens to agree.
//
// Present, never past. Offer, never guilt. Nothing here names a time as bad,
// references a window the user missed, or fires a notification.
//
// Named "rhythm" throughout, deliberately: components/brain/FocusWindowIndicator
// already owns the term "focus window" for an unrelated (and currently
// unreachable) wake-time concept.
//
// Pure functions only — the hour is always injected, never read from the system
// clock here, so every case below is directly testable.

import {
  FOCUS_RHYTHM_HOURS,
  FOCUS_RHYTHM_OPTIONS,
  VARIES_KEY,
  type TimedRhythmKey,
} from '../../constants/focusRhythms';

/** Shown when the user has not set any rhythms yet. */
export const RHYTHM_INVITATION = 'Notice when focus comes easiest for you.';

/** Shown when the user chose "It varies" and nothing else. */
export const RHYTHM_VARIES_SUMMARY = "Your focus doesn't follow one fixed time.";

/** The quiet present-tense line, shown only inside a stored window. */
export const RHYTHM_IN_WINDOW_LINE =
  'Focus usually comes a little easier for you around now.';

/** Canonical display order, so a summary never depends on tap order. */
const TIMED_KEYS_IN_ORDER = FOCUS_RHYTHM_OPTIONS.map((o) => o.key).filter(
  (key): key is TimedRhythmKey => key !== VARIES_KEY
);

const PHRASE_BY_KEY = new Map(
  FOCUS_RHYTHM_OPTIONS.map((o) => [o.key, o.phrase] as const)
);

/**
 * Which rhythm window the given hour falls in, or null when it falls in none.
 *
 * Hours 2 to 4 deliberately match nothing. `varies` can never be returned: it
 * is not a time, so it can never make the in-window line fire.
 */
export function activeRhythm(hour: number): TimedRhythmKey | null {
  for (const key of TIMED_KEYS_IN_ORDER) {
    const { startHour, endHour } = FOCUS_RHYTHM_HOURS[key];
    const matches =
      startHour <= endHour
        ? hour >= startHour && hour <= endHour
        : // Wrapped range (late night): match either side of midnight.
          hour >= startHour || hour <= endHour;
    if (matches) return key;
  }
  return null;
}

/**
 * The reflected summary for the rhythms card body, or null when there is
 * nothing to reflect and the caller should keep the invitation copy.
 *
 * `varies` alone gets its own sentence — the user answered deliberately, and
 * showing the invitation would tell them they had not. `varies` alongside real
 * windows is ignored in favour of the real ones.
 */
export function rhythmSummary(windows: string[]): string | null {
  const timed = TIMED_KEYS_IN_ORDER.filter((key) => windows.includes(key));

  if (timed.length === 0) {
    return windows.includes(VARIES_KEY) ? RHYTHM_VARIES_SUMMARY : null;
  }

  const phrases = timed
    .map((key) => PHRASE_BY_KEY.get(key))
    .filter((phrase): phrase is string => !!phrase);

  return `Focus tends to come easiest for you ${phrases.join(' and ')}.`;
}

/** Whether the given hour falls inside one of the user's stored windows. */
export function isRhythmActiveNow(windows: string[], hour: number): boolean {
  const active = activeRhythm(hour);
  return active !== null && windows.includes(active);
}
