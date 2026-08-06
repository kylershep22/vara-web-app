/**
 * Every user-facing string in the progressive onboarding arc (V3), in one file.
 *
 * NONE OF THIS IS SHIPPABLE COPY. It follows the marker convention already
 * established in screens/weekly/copy.ts:
 *
 *   [COPY GAP] the spec supplies nothing and a string was structurally
 *              required. The placeholder below was written to be replaced, not
 *              to be approved.
 *
 * The marker is rendered ON SCREEN, not stripped at build time, so nobody can
 * mistake a walkthrough build for finished product. Removing a marker is a copy
 * decision and belongs to Jen.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 *
 * THE FOUR OUTCOMES ARE NOT PLACEHOLDERS. OUTCOME_LABELS is imported from the
 * weekly copy module rather than restated here: those four names are the locked
 * taxonomy (spec 5), shared by the weekly open, the Practices filters and the
 * content tags. A second set of labels for the same OutcomeKey union is exactly
 * the divergence that vocabulary lock exists to prevent. Same reasoning for the
 * capacity labels and glosses.
 */

export {
  OUTCOME_LABELS,
  CAPACITY_LABELS,
  CAPACITY_GLOSSES,
} from '../../weekly/copy';

/** Prefix for a string the spec does not supply. */
const gap = (text: string) => `[COPY GAP] ${text}`;

export const COLD_OPEN_COPY = {
  title: gap('Welcome to Vara'),
  subtitle: gap(
    'A few questions to set up your first week. Nothing here is a test, and you can change any of it later.'
  ),
  primary: gap('Get started'),
} as const;

export const OUTCOME_COPY = {
  title: gap("What do you want more of?"),
  subtitle: gap('Pick one to start. You can switch outcomes any week.'),
  primary: gap('Continue'),
} as const;

/**
 * One line under each outcome label. The LABELS are locked taxonomy; only these
 * supporting lines are placeholder.
 */
export const OUTCOME_BLURBS = {
  focus: gap('Attention that holds for the work that matters.'),
  stress: gap('A nervous system that settles when the day does not.'),
  routines: gap('Days with a shape you can rely on.'),
  energy: gap('Enough in the tank to get to the evening.'),
} as const;

export const WHY_COPY = {
  title: gap('Why this one?'),
  subtitle: gap(
    'In your own words. We show this back to you on the weeks it gets hard, and nobody else ever sees it.'
  ),
  placeholder: gap('Because I want to be present with my kids at dinner'),
  primary: gap('Continue'),
} as const;

export const CAPACITY_COPY = {
  title: gap('How much room does this week have?'),
  subtitle: gap(
    'Be honest rather than ambitious. This sets the size of the daily action, and you can change it mid-week.'
  ),
  primary: gap('Continue'),
} as const;

export const FLOOR_COPY = {
  title: gap('What is your floor?'),
  subtitle: gap(
    'The smallest version you would still do on your worst week. This is never scored and never shown as a target.'
  ),
  /** Display-only sentence stem rendered above the input. */
  stem: gap('Even on my worst week, I will'),
  placeholder: gap('step outside for ten minutes'),
  primary: gap('Continue'),
} as const;

export const FIRST_WIN_COPY = {
  title: gap('Try one now'),
  subtitle: gap(
    'Two minutes, fully guided. Nothing to figure out, and you can stop whenever you want.'
  ),
  primary: gap('Start'),
  /** Shown if the pinned practice is somehow missing from the library. */
  unavailable: gap('That practice is not available right now.'),
} as const;

export const REMINDER_COPY = {
  title: gap('When should we check in?'),
  subtitle: gap(
    'One nudge a day at a time you pick. It is an invitation, not an obligation, and you can turn it off anytime.'
  ),
  /** Label above the display-only echo of the floor the user just wrote. */
  floorEchoLabel: gap('We will nudge you toward:'),
  primary: gap('Continue'),
} as const;

export const DONE_COPY = {
  title: gap('Your first week is set'),
  subtitle: gap(
    'That is everything we needed. You can change any of it from Settings whenever you want.'
  ),
  primary: gap('Go to Vara'),
} as const;
