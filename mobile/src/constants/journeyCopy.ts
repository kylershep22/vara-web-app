/**
 * A2, the route explanation. SHARED VOCABULARY, which is why it lives in
 * constants/ rather than beside either screen that renders it.
 *
 * TWO SURFACES SAY THE SAME THING. Onboarding step 3 shows it to a new user
 * after they pick a destination; Home shows it once to a beta user the resolver
 * has just migrated onto the journey. Those are the same explanation delivered
 * at the same moment in each user's life, so they are the same strings. A
 * second copy for the migration path is how one gets revised and the other does
 * not.
 *
 * WHERE IT COULD NOT LIVE. Not in screens/onboarding/v3/copy.ts, because the
 * Home surface is a component and components/ must not import from screens/.
 * Not in constants/journey.ts, whose header says no copy, only keys and
 * numbers. Same reasoning that put CAPACITY_LABELS in constants/capacityCopy.ts
 * in slice 0.
 *
 * CONTENT PACK V1 SECTION A2, VERBATIM AND APPROVED. No `COPY: draft` markers
 * and the copy sentinel does not increment for these, per the pack header.
 *
 * A1 IS NOT HERE. The destination pick has exactly one surface, so it stays in
 * the onboarding copy module where it belongs.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */
import type { DestinationKey } from '../types/models';

export const A2_COPY = {
  sharedTitle: "We won't start by giving you more to do.",
  primary: 'Start there',
} as const;

/**
 * One body per destination. The ONLY part that varies, and it varies only in
 * the destination language: every one of the four makes the same promise in the
 * same shape, which is what stops the four reading as four different products.
 */
export const A2_BODIES: Record<DestinationKey, string> = {
  focus:
    "Before we ask more of your attention, we'll start with what's pulling at it. You'll make one small change there today, then we'll build from what that gives back.",
  calm:
    "Before we add another way to relax, we'll start with what's keeping your mind switched on. You'll make one small change there today, then we'll build from what that gives back.",
  routines:
    "Before we build another routine, we'll start with what's knocking the day off course. You'll make one small change there today, then we'll build from what that gives back.",
  energy:
    "Before we ask you to do more, we'll start with what's draining you. You'll make one small change there today, then we'll build from what that gives back.",
};
