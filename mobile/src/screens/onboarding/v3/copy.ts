/**
 * Every user-facing string in the progressive onboarding arc (V3), in one file.
 *
 * NONE OF THIS IS APPROVED COPY, and every string carries the `COPY: draft`
 * sentinel to say so. It used to render an on-screen [COPY GAP] prefix instead;
 * that convention is retired and no marker text may reach the UI.
 *
 * ONBOARDING IS UNDER A HOLD in docs/brand/Vara_Brand_Voice_Copy_Guidelines.md.
 * Section 4 describes a five-question flow, and this arc is eight screens, so
 * the doc marks it not-to-be-written-from until it is re-specced against what
 * actually ships. Nothing here may be rewritten from section 4 in the meantime.
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


export const COLD_OPEN_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'Welcome to Vara',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'A few questions to set up your first week. Nothing here is a test, and you can change any of it later.',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Get started',
} as const;

export const OUTCOME_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: "What do you want more of?",
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'Pick one to start. You can switch outcomes any week.',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Continue',
} as const;

/**
 * One line under each outcome label. The LABELS are locked taxonomy; only these
 * supporting lines are placeholder.
 */
export const OUTCOME_BLURBS = {
  // COPY: draft, not from guidelines doc - pending Jen
  focus: 'Attention that holds for the work that matters.',
  // COPY: draft, not from guidelines doc - pending Jen
  stress: 'A nervous system that settles when the day does not.',
  // COPY: draft, not from guidelines doc - pending Jen
  routines: 'Days with a shape you can rely on.',
  // COPY: draft, not from guidelines doc - pending Jen
  energy: 'Enough in the tank to get to the evening.',
} as const;

export const WHY_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'Why this one?',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'In your own words. We show this back to you on the weeks it gets hard, and nobody else ever sees it.',
  // COPY: draft, not from guidelines doc - pending Jen
  placeholder: 'Because I want to be present with my kids at dinner',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Continue',
} as const;

export const CAPACITY_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'How much room does this week have?',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'Be honest rather than ambitious. This sets the size of the daily action, and you can change it mid-week.',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Continue',
} as const;

export const FLOOR_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'What is your floor?',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'The smallest version you would still do on your worst week. This is never scored and never shown as a target.',
  // COPY: draft, not from guidelines doc - pending Jen
  /** Display-only sentence stem rendered above the input. */
  stem: 'Even on my worst week, I will',
  // COPY: draft, not from guidelines doc - pending Jen
  placeholder: 'step outside for ten minutes',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Continue',
} as const;

export const WEEK_START_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'When does your week start?',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'Your week runs seven days from this day. Pick the one that already feels like a fresh start.',
  // COPY: draft, not from guidelines doc - pending Jen
  // SKIPPABLE. Without an answer the week simply starts on the day the user
  // opens it, which is what the app did before this question existed, so
  // skipping costs the user nothing and the label should not imply otherwise.
  primary: 'Continue',
} as const;

export const FIRST_WIN_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'Try one now',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'Two minutes, fully guided. Nothing to figure out, and you can stop whenever you want.',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Start',
  // COPY: draft, not from guidelines doc - pending Jen
  /** Shown if the pinned practice is somehow missing from the library. */
  unavailable: 'That practice is not available right now.',
} as const;

export const REMINDER_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'When should we check in?',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'One nudge a day at a time you pick. It is an invitation, not an obligation, and you can turn it off anytime.',
  // COPY: draft, not from guidelines doc - pending Jen
  /** Label above the display-only echo of the floor the user just wrote. */
  floorEchoLabel: 'We will nudge you toward:',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Continue',
  // COPY: draft, not from guidelines doc - pending Jen
  /** Shown once when the system permission sheet is declined. No penalty framing. */
  permissionDenied: 'Your time is saved. You can turn reminders on anytime in Settings.',
} as const;

export const DONE_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'Your first week is set',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'That is everything we needed. You can change any of it from Settings whenever you want.',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Go to Vara',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Check your connection and try again.',
} as const;
