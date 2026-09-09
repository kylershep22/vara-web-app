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

/**
 * Where one phase sits relative to the user, for the journey map's row states
 * (roadmap section 1: DONE / WHERE YOU ARE / AHEAD / SKIPPED).
 *
 * A KEY, NOT A LABEL. The four words the user reads live in
 * constants/journeyCopy.ts; this union is what the derivation returns and what
 * the path component switches on. Same separation as PhaseKey and
 * PHASE_DISPLAY.
 *
 * DERIVED AT READ TIME, NEVER STORED. journeyStates holds phase, history and
 * skipped; which of these four states a row is in falls out of those three and
 * out of PHASE_ORDER. A stored copy would be the counter problem again in a
 * different shape.
 *
 * 'ahead' IS NOT 'locked'. Roadmap section 8: every practice is runnable at all
 * times and nothing in the UI may read as a closed door. The word marks
 * position, not permission.
 */
export type PhaseState = 'done' | 'current' | 'ahead' | 'skipped';

/** One phase-destination pair's three lengths of display copy. */
export interface PhaseDisplayCopy {
  /** The map card. */
  title: string;
  /** The route strip and the Today journey line. */
  short: string;
  /** The one line under the title. */
  gloss: string;
}

/**
 * The 48 display strings: 16 phase-destination cells x title / short / gloss.
 *
 * ALL 48 ARE JEN'S, ALL APPROVED, ALL LANDING FLAT. Titles and glosses come
 * from Content Pack v1 section display-strings; the shorts from section
 * short-labels, which slice 4 is the first to need. Per the pack header they
 * carry no `COPY: draft` markers and the copy sentinel does not increment for
 * them.
 *
 * REPLACES A THROWING PROXY. Until this slice the constant was declared and
 * deliberately unpopulated, so that reading it failed loudly rather than
 * rendering `undefined` behind a total type. The strings exist now, so the
 * proxy has done its job and is gone.
 *
 * SLICE 4 RENDERS ONLY `short`, on the A2 route strip. `title` and `gloss` are
 * populated here and rendered nowhere: slice 5 owns the journey map and the
 * phase detail pages. Held-but-unrendered rather than withheld, because a
 * second partial-population pass is how two halves of one delivery drift.
 *
 * FIVE CELLS HAVE `short` IDENTICAL TO `title`, BY DESIGN AND NOT BY MISTAKE:
 * focus/recover, calm/rewire, routines/recover, energy/remove and
 * energy/recover. Where a title is already short enough to carry the strip,
 * Jen repeats it rather than inventing a second phrasing of the same idea. A
 * test that asserts all 16 pairs differ would fail correctly; pin the five as
 * expected duplicates instead. See the editorial note at the pack anchor.
 *
 * THE FOUR FRAMEWORK WORDS ARE KEYS HERE, NEVER VALUES (roadmap section 8).
 * `remove | recover | rewire | refocus` are internal vocabulary; what the user
 * reads is the title/short/gloss. brandCopyGuard enforces that separation.
 */
export const PHASE_DISPLAY: Record<
  PhaseKey,
  Record<DestinationKey, PhaseDisplayCopy>
> = {
  remove: {
    focus: {
      title: "Clear what's pulling at your attention",
      short: "Clear the distractions",
      gloss: "Start with the things that keep using up the attention you need elsewhere.",
    },
    calm: {
      title: "Clear what keeps your mind running",
      short: "Clear what's keeping you on",
      gloss: "Start with the things that keep following you long after they need to.",
    },
    routines: {
      title: "Clear what keeps knocking the day off course",
      short: "Clear what's throwing you off",
      gloss: "Start with the patterns that make the day harder to hold together.",
    },
    energy: {
      title: "Clear what's draining you",
      short: "Clear what's draining you",
      gloss: "Start with what seems to take more from the day than it gives back.",
    },
  },
  recover: {
    focus: {
      title: "Get some headroom back",
      short: "Get some headroom back",
      gloss: "Find a few ways to reset when your attention has been stretched too far.",
    },
    calm: {
      title: "Learn how to come down",
      short: "Come down a notch",
      gloss: "Find a few reliable ways to leave the noise and pressure of the day behind.",
    },
    routines: {
      title: "Find your way back",
      short: "Find your way back",
      gloss: "Practice a few simple resets for when the day gets away from you.",
    },
    energy: {
      title: "Get some energy back",
      short: "Get some energy back",
      gloss: "Find the things that help you recover when you're running low.",
    },
  },
  rewire: {
    focus: {
      title: "Make focus easier to return to",
      short: "Make focus easier",
      gloss: "Build simple patterns that help you start, stay with something, and come back when you get pulled away.",
    },
    calm: {
      title: "Make switching off easier",
      short: "Make switching off easier",
      gloss: "Build a few cues that help your mind recognize when it is time to stop carrying the day.",
    },
    routines: {
      title: "Build a few anchors that hold",
      short: "Build anchors that hold",
      gloss: "Put simple cues around the parts of the day you want to happen more reliably.",
    },
    energy: {
      title: "Build a steadier baseline",
      short: "Build steadier energy",
      gloss: "Make the things that support your energy easier to come back to.",
    },
  },
  refocus: {
    focus: {
      title: "Put your attention where it matters",
      short: "Focus on what matters",
      gloss: "Use the room you've made on the things you actually want more attention for.",
    },
    calm: {
      title: "Protect more of your off time",
      short: "Protect your off time",
      gloss: "Use the room you've made to be more present when the work is done.",
    },
    routines: {
      title: "Shape the day around what matters",
      short: "Shape the day around you",
      gloss: "Give your time more structure without packing more into it.",
    },
    energy: {
      title: "Use your energy where you want it",
      short: "Use energy where it matters",
      gloss: "Put more of what you have toward the parts of life that matter most.",
    },
  },
};
