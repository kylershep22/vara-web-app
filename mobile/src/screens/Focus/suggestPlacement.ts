// suggestPlacement — turns the user's stored focus rhythms into a proposed
// placement for a day block (TB-1a, the Time-Blocking spine).
//
// THIS FUNCTION ONLY EVER PROPOSES. It never forbids, never ranks a time as
// bad, and never names a window the user missed. A block at any hour is legal;
// the rhythm is an invitation, which is why the suggestion is a zone RANGE the
// caller places inside rather than a single imposed clock time.
//
// SIBLING OF rhythmRecall.ts, and deliberately separate from it: that module is
// the READ side (what the user told us, reflected back as prose). This one is
// the WRITE side's input (where a new block could go). They share the same
// constants and must never disagree about zone order, which is why both read it
// from constants/focusRhythms rather than from each other.
//
// Pure. The clock is always injected, never read here, so every case is
// directly testable.
//
// WHAT THIS DOES NOT DO, and must not start doing: it does not build a
// Timestamp, and the zone key it returns is PROVENANCE ONLY. A DayBlock stores
// a real startAt plus durationMinutes so Phase 2 calendar export needs no
// re-derivation; a zone key must never be persisted as a block's time.

import {
  FOCUS_RHYTHM_HOURS,
  TIMED_RHYTHM_KEYS_IN_ORDER,
  VARIES_KEY,
  type RhythmHourRange,
  type TimedRhythmKey,
} from '../../constants/focusRhythms';

/**
 * Which day the proposed window falls on.
 *
 * NOT part of the originally sketched return shape, and load-bearing: the zone
 * key is identical whether the next mid-morning is in three hours or in
 * fifteen, so without this field the today/tomorrow rollover is invisible to
 * the caller and TB-1b would have to re-derive the date it was told to stop
 * re-deriving. See the note in the report.
 */
export type PlacementDay = 'today' | 'tomorrow';

/**
 * A proposed placement, or the reason there is not one.
 *
 * The reason codes are load-bearing rather than cosmetic: TB-1b shows
 * materially different copy per state. `no-rhythms` becomes an invitation to
 * set them; `varies` must NOT, because that user answered deliberately and
 * telling them to answer would be wrong.
 */
export type PlacementSuggestion =
  | {
      kind: 'ok';
      zoneKey: TimedRhythmKey;
      /** Inclusive hour range of the zone. Wraps midnight when start > end. */
      startHour: number;
      endHour: number;
      day: PlacementDay;
    }
  | { kind: 'no-rhythms' }
  | { kind: 'varies' };

/** Whether `hour` falls inside the range, honouring a midnight wrap. */
function isActive(range: RhythmHourRange, hour: number): boolean {
  const { startHour, endHour } = range;
  return startHour <= endHour
    ? hour >= startHour && hour <= endHour
    : // Wrapped (late night): match either side of midnight.
      hour >= startHour || hour <= endHour;
}

/**
 * Whether the zone is still available today: either it is running now, or it
 * has not opened yet.
 *
 * The two checks are separate because of the wrap. At 23:00 late_night is
 * active even though 23 is past its 22:00 start, so a start-hour comparison
 * alone would call it passed.
 */
function availableToday(range: RhythmHourRange, hour: number): boolean {
  return isActive(range, hour) || hour < range.startHour;
}

/**
 * Propose where the user's next block could go.
 *
 * `windows` is the raw stored array from `users/{uid}.focusRhythms.windows` —
 * plain strings, possibly empty, possibly containing keys this build does not
 * know. Unknown keys are ignored rather than trusted: intersecting against
 * TIMED_RHYTHM_KEYS_IN_ORDER is what stops a retired key becoming an `ok`
 * suggestion pointing at a zone with no hour range.
 *
 * Zone order comes from the constants export, NOT from the local duplicate in
 * rhythmRecall.ts, so a suggestion can never contradict the summary the Focus
 * hub already showed the user.
 */
export function suggestPlacement(
  windows: string[],
  now: Date
): PlacementSuggestion {
  const timed = TIMED_RHYTHM_KEYS_IN_ORDER.filter((key) => windows.includes(key));

  if (timed.length === 0) {
    // `varies` alone is an answer, not an absence. Anything else — empty, or
    // only keys we do not recognise — is an absence.
    return windows.includes(VARIES_KEY) ? { kind: 'varies' } : { kind: 'no-rhythms' };
  }

  const hour = now.getHours();

  // Chronological, never tap order: the first of the user's zones that has not
  // finished today.
  const todayZone = timed.find((key) => availableToday(FOCUS_RHYTHM_HOURS[key], hour));

  // Every zone has passed, so the day rolls over and the earliest one wins —
  // tomorrow starts at the top of the day, not wherever today left off.
  const zoneKey = todayZone ?? timed[0];
  const day: PlacementDay = todayZone ? 'today' : 'tomorrow';
  const { startHour, endHour } = FOCUS_RHYTHM_HOURS[zoneKey];

  return { kind: 'ok', zoneKey, startHour, endHour, day };
}
