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
 * THE ARC ASKS FOR A DESTINATION NOW, NOT AN OUTCOME (journey slice 4).
 * OUTCOME_LABELS is no longer re-exported from here. It has not been deleted:
 * it still labels `weeklyCycles.outcome` on TodayHeroCard and CloseWeekEntry,
 * which are not this arc's surfaces. What changed is that onboarding stopped
 * being one of its readers. DestinationKey is `focus | calm | routines |
 * energy` and OutcomeKey is `focus | stress | routines | energy`; the two
 * unions are NOT interchangeable and must never index each other's tables.
 *
 * DESTINATION_LABELS below is Jen's, from the pack, and is deliberately not a
 * second spelling of OUTCOME_LABELS: those are one-word taxonomy tags, these
 * are first-person phrases the user picks between. Different job, different
 * strings, no lock broken.
 *
 * The capacity labels, glosses and question live in
 * src/constants/capacityCopy.ts because more than one surface reads them.
 */

export { CAPACITY_LABELS, CAPACITY_GLOSSES } from '../../../constants/capacityCopy';


export const COLD_OPEN_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'Welcome to Vara',
  // COPY: draft, not from guidelines doc - pending Jen
  subtitle: 'A few questions to set up your first week. Nothing here is a test, and you can change any of it later.',
  // COPY: draft, not from guidelines doc - pending Jen
  primary: 'Get started',
} as const;

/**
 * A1, the destination pick. Content Pack v1 section A1, verbatim and approved.
 *
 * NO SUBTITLE, and its absence is a decision rather than an omission. The
 * shipped one read "Pick one to start. You can switch outcomes any week.",
 * which is false twice under the journey model: a destination is not switched
 * weekly, and outcome is the vocabulary this arc just stopped using. Dropped by
 * Kyle on 2026-09-06 rather than redrafted, because the pack's title already
 * carries the whole question. Do not reinstate one without Jen.
 */
export const A1_COPY = {
  title: 'What would make the biggest difference right now?',
  primary: 'Continue',
} as const;

/**
 * The four destinations as the user meets them. Content Pack v1 section A1.
 *
 * KEYED BY DestinationKey. `routines` reads "Have steadier days" per roadmap
 * section 9 item 9, resolved: steadier days is the outcome the user wants,
 * routines are the mechanism. That decision governs THIS label; the Practices
 * hub card is a separate string and is unaffected.
 */
export const DESTINATION_LABELS = {
  focus: 'Focus better',
  calm: 'Switch off more easily',
  routines: 'Have steadier days',
  energy: 'Have more energy left',
} as const;

/** One first-person line under each destination. Content Pack v1 section A1. */
export const DESTINATION_BLURBS = {
  focus: 'I want to focus without getting pulled away so easily.',
  calm: "I want my mind to stop carrying the day after it's over.",
  routines: 'I want to feel like I have a better grip on my day.',
  energy: "I want to stop feeling like I'm running on empty.",
} as const;

/**
 * A2, the route explanation. Content Pack v1 section A2, verbatim and approved.
 *
 * THE BAIT-AND-SWITCH MITIGATION FOR THE WHOLE JOURNEY (roadmap section 6 item
 * 4). The user has just said what they want; the next thing the app does is
 * start somewhere else. This screen is where that is explained, and it sits at
 * step 3 immediately after the pick rather than at step 5, per section 9 item 1
 * resolved: waiting weakens the connection between the promise and the reason.
 *
 * One shared title, one body per destination, one primary. The body is the only
 * part that varies, and it varies only in the destination language.
 */
export const A2_COPY = {
  sharedTitle: "We won't start by giving you more to do.",
  primary: 'Start there',
} as const;

export const A2_BODIES = {
  focus:
    "Before we ask more of your attention, we'll start with what's pulling at it. You'll make one small change there today, then we'll build from what that gives back.",
  calm:
    "Before we add another way to relax, we'll start with what's keeping your mind switched on. You'll make one small change there today, then we'll build from what that gives back.",
  routines:
    "Before we build another routine, we'll start with what's knocking the day off course. You'll make one small change there today, then we'll build from what that gives back.",
  energy:
    "Before we ask you to do more, we'll start with what's draining you. You'll make one small change there today, then we'll build from what that gives back.",
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

/**
 * The capacity step.
 *
 * THE TITLE IS NOT DEFINED HERE. It is CAPACITY_QUESTION, the same string the
 * daily picker asks, imported from constants/capacityCopy.ts. The question the
 * arc used to ask ("How much room does this week have?") was scoped to a week,
 * which capacity stopped being when it became a daily read (roadmap 3b-i), and
 * it taught the user a question the app never asks again. Asking the daily
 * question here instead is what makes the seed and the daily pick the same
 * question at two scopes.
 *
 * The subtitle is a REDRAFT, not the shipped one. The old line ended "you can
 * change it mid-week", wrong on both halves: the answer is not weekly, and it
 * is changed daily rather than mid-week.
 */
export const CAPACITY_COPY = {
  // COPY: draft, not from guidelines doc - pending Kyle
  subtitle: 'Be honest rather than ambitious. This sets the size of the daily action, and you can change it any day.',
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
