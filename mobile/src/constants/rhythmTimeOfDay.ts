// Focus rhythms → habit scheduling. Maps the user's STORED focus-rhythm windows
// onto the time-of-day slot a recurring habit can be aimed at.
//
// NOT CLOCK-BASED, and deliberately not related to the Focus hub's in-window
// check. rhythmRecall's activeRhythm / isRhythmActiveNow answer "is NOW inside
// one of their windows", which is a question about this moment. This file
// answers "which slot does their stated pattern point at", which is a question
// about a habit that repeats. Reusing the clock path here would tie a recurring
// habit's schedule to whatever time the user happened to be creating it.
//
// The output is a SUGGESTION. Nothing here selects, assigns or persists
// anything; the caller offers it and the user decides.

// Note what is NOT imported: FOCUS_RHYTHM_HOURS. This file maps stored windows
// to a slot and never touches a clock range.
import { TIMED_RHYTHM_KEYS_IN_ORDER, type TimedRhythmKey } from './focusRhythms';
import type { HabitTimeOfDay } from '../types/models';

/**
 * A slot that can actually be suggested. `anytime` is excluded at the type
 * level: it is the absence of an aim, so it is never something to offer.
 */
export type SuggestedSlot = Exclude<HabitTimeOfDay, 'anytime'>;

/**
 * Which slot each rhythm window points at.
 *
 * Five windows collapse onto three slots, because the habit control offers
 * fewer buckets than the rhythms picker does:
 *   - early_morning and mid_morning both land on `morning`
 *   - late_night maps to NOTHING, on purpose. The brand does not steer focus
 *     work into the small hours, which is the same reasoning that keeps the hub
 *     silent between 2am and 4am. It is not a gap waiting to be filled.
 *
 * `anytime` is never a target: it is the absence of an aim, so suggesting it
 * would be suggesting nothing.
 */
const SLOT_BY_RHYTHM: Record<TimedRhythmKey, SuggestedSlot | null> = {
  early_morning: 'morning',
  mid_morning: 'morning',
  afternoon: 'afternoon',
  evening: 'evening',
  late_night: null,
};

/**
 * Every slot the user's windows point at, in canonical day order, deduped.
 *
 * Exported mostly so the rule is directly testable: the suggestion itself is
 * just the first entry.
 */
export function mappedTimeOfDaySlots(windows: string[]): SuggestedSlot[] {
  const slots: SuggestedSlot[] = [];

  // Iterate the canonical order rather than the user's tap order, so the same
  // set of windows always yields the same answer, and always the earliest one.
  for (const key of TIMED_RHYTHM_KEYS_IN_ORDER) {
    if (!windows.includes(key)) continue;
    const slot = SLOT_BY_RHYTHM[key];
    // An unmappable window (late_night) contributes nothing but must not stop
    // the walk: [afternoon, late_night] still suggests Afternoon.
    if (!slot) continue;
    // Dedupe: early_morning + mid_morning are one Morning, not two.
    if (!slots.includes(slot)) slots.push(slot);
  }

  return slots;
}

/**
 * The slot to offer for a habit, or null when there is nothing to offer.
 *
 * Null for: no windows set, `varies` only (it is not a time, and it never
 * appears in the canonical timed order anyway), `late_night` only, and any set
 * that maps to nothing. Callers must treat null as "show no nudge at all" —
 * there is no fallback slot and no deficit message.
 *
 * When several windows map, the FIRST IN THE DAY wins. That keeps the offer
 * consistent with the order the Focus hub reads their rhythms back in, so the
 * two surfaces can never appear to disagree.
 */
export function suggestedTimeOfDayFromRhythms(windows: string[]): SuggestedSlot | null {
  return mappedTimeOfDaySlots(windows)[0] ?? null;
}

/** Display labels for the slots, matching the create sheet's own chip labels. */
export const TIME_OF_DAY_LABELS: Record<HabitTimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  anytime: 'Anytime',
};

/**
 * The lowercase fragment used inside the nudge sentence ("comes easiest for you
 * in the morning").
 */
const SLOT_PHRASE: Record<SuggestedSlot, string> = {
  morning: 'in the morning',
  afternoon: 'in the afternoon',
  evening: 'in the evening',
};

/**
 * The nudge copy for a slot: rationale first, then the offer.
 *
 * Deliberately NOT "you focus best in the morning". rhythmRecall's contract is
 * explicit that this feature carries "no 'you focus best' ranking", and best
 * implies the other times are worse. This echoes what the user themselves told
 * us, in the same words the hub reflects back, and then asks.
 */
export function rhythmNudgeSentence(slot: SuggestedSlot): string {
  return `You said focus comes easiest for you ${SLOT_PHRASE[slot]}.`;
}

/** The accept affordance's label. An offer, phrased as one. */
export function rhythmNudgeAcceptLabel(slot: SuggestedSlot): string {
  return `Aim this for ${TIME_OF_DAY_LABELS[slot]}`;
}
