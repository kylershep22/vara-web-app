/**
 * Journey vocabulary and thresholds (Journey Architecture Roadmap v3,
 * Sections 1 and 3.1).
 *
 * SHARED VOCABULARY, so it lives in constants/ rather than beside the service
 * or the derivations. Rules tests, the service, the pure derivations and (from
 * slice 2) the screens all read the same lists from here; a second copy of the
 * phase order is exactly the divergence this file exists to prevent.
 *
 * NO COPY HERE. These are keys and numbers, never user-facing strings.
 */
import type { DestinationKey, PhaseKey } from '../types/models';

/**
 * The phase sequence. THE ONE DEFINITION OF ORDER.
 *
 * PhaseKey is a union and a union has no order, so every advance, skip and
 * step-back reads its next/previous from this array. Reordering it is a
 * product decision that rewrites every user's path, not a tidy-up.
 */
export const PHASE_ORDER: readonly PhaseKey[] = [
  'remove',
  'recover',
  'rewire',
  'refocus',
] as const;

/**
 * The four journey destinations.
 *
 * NOT the weekly loop's OutcomeKey, despite three of four keys matching. See
 * DestinationKey in types/models.ts for why the two stay apart until slice 3.
 */
export const DESTINATION_KEYS: readonly DestinationKey[] = [
  'focus',
  'calm',
  'routines',
  'energy',
] as const;

/**
 * Advancement thresholds (Section 1). EITHER is sufficient, never both.
 *
 * The two exist to catch different users. The consistency door opens for
 * someone who is actually doing the work; the calendar ceiling opens for
 * someone who is not, so a phase can never become a place to be stuck. Neither
 * is a deadline and neither is shown as a countdown: they decide when the app
 * OFFERS to move on, and the user always answers.
 */
export const ADVANCE_MIN_CONSISTENT_DAYS = 8;
export const ADVANCE_CALENDAR_CEILING_DAYS = 14;

/**
 * How many consecutive weekly 'not_moving' reads offer an adjustment
 * (Section 1).
 *
 * TWO, not one. A single flat week is normal and offering to change course on
 * it would be noise; two in a row is a signal. The reads must be CONSECUTIVE,
 * so a 'same' or 'moving' week in between resets the run.
 */
export const ADJUST_CONSECUTIVE_NOT_MOVING = 2;
