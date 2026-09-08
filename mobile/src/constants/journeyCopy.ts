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

/**
 * The destination named in ONE WORD (or two), for the positions that used to
 * name the week's outcome: the Home hero's summary line and the closed-week
 * detail line.
 *
 * NOT `DESTINATION_LABELS` FROM THE ONBOARDING COPY MODULE, and the two must
 * not be merged. Those are A1's first-person options the user chooses between
 * ("Switch off more easily"); these are the same four destinations named in
 * the register a summary line needs. Different job, different length, different
 * grammatical person.
 *
 * NOT `OUTCOME_LABELS` EITHER, and this is the seam worth being careful about.
 * That map is keyed `focus | stress | routines | energy`; this one is keyed
 * `focus | calm | routines | energy`. Three keys are spelled the same and one
 * is not, which is exactly the shape that makes a cast look right. Each render
 * site reads whichever map matches the value it holds, and neither map is ever
 * indexed with the other union's key.
 *
 * `routines` READS "Steadier days" per roadmap section 9 item 9, resolved: the
 * user wants steadier days, routines are the mechanism. That string is approved
 * (Content Pack v1 part one section 3, decision 2) and carries no marker. The
 * other three are drafted.
 */
export const DESTINATION_SUMMARY_LABELS: Record<DestinationKey, string> = {
  // COPY: draft, not from guidelines doc - pending Kyle
  focus: 'Focus',
  // COPY: draft, not from guidelines doc - pending Kyle
  calm: 'Calm',
  routines: 'Steadier days',
  // COPY: draft, not from guidelines doc - pending Kyle
  energy: 'Energy',
};

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
