/**
 * Every user-facing string in the weekly-loop screens, in one file.
 *
 * THE ON-SCREEN MARKERS ARE GONE. This file used to prefix its strings with
 * [COPY GAP] and [Jen] and render those prefixes to the user, so a walkthrough
 * build could never be mistaken for finished product. That convention is
 * retired: docs/brand/Vara_Brand_Voice_Copy_Guidelines.md is now the approved
 * copy standard, and no marker text of any kind may reach the UI.
 *
 * Tracking moved into comments, which is strictly weaker: it is visible to
 * whoever opens the file and to nobody else. A string here is one of two things
 * and only the comment says which:
 *
 *   (no comment)  taken verbatim from the guidelines doc. Approved.
 *   COPY: draft   written against the doc's rules and examples rather than
 *                 lifted from it, or predating the doc entirely. NOT approved,
 *                 and grep-able as `COPY: draft` across the tree.
 *
 * Strings the spec supplies but Jen still owns the wording of are called out
 * individually below.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */


export const FLOOR_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  // Spec 10.1, verbatim prompt.
  prompt: "Name the one thing you'll do even on your worst week.",
  // COPY: draft, not from guidelines doc - pending Jen
  helper: 'One line, in your own words.',
  // COPY: draft, not from guidelines doc - pending Jen
  placeholder: 'Ten minutes outside',
  // COPY: draft, not from guidelines doc - pending Jen
  save: 'Save',
  // COPY: draft, not from guidelines doc - pending Jen
  // Shown when the field is empty; the button is disabled, this says why.
  required: 'Write one line to continue.',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Check your connection and try again.',
} as const;

export const ENTRY_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  loading: 'One moment.',
  // COPY: draft, not from guidelines doc - pending Jen
  failed: 'We could not load your week. Try again.',
  // COPY: draft, not from guidelines doc - pending Jen
  retry: 'Try again',
  // COPY: draft, not from guidelines doc - pending Jen
  signedOut: 'Sign in to open your week.',
} as const;

/**
 * Outcome labels are NOT placeholders and carry no marker. These four names are
 * the locked taxonomy (spec 5): the same vocabulary across the weekly open, the
 * Practices filters and the content tags. Renaming one is a spec change, not a
 * copy pass.
 */
export const OUTCOME_LABELS = {
  focus: 'Focus',
  stress: 'Stress',
  routines: 'Routines',
  energy: 'Energy',
} as const;

export const OPEN_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  // Spec 6.1 step 1, verbatim.
  outcomeQuestion: "What's your focus this week?",
  // COPY: draft, not from guidelines doc - pending Jen
  // Spec 6.1 step 2, verbatim.
  capacityQuestion: "What's your capacity this week?",
  // COPY: draft, not from guidelines doc - pending Jen
  // Spec 6.1 step 3 (calendar forecast) is DEFERRED, not hidden behind a
  // disabled control. There is no string for it here because there is no
  // affordance for it on screen.
  confirmHeading: 'Your week',
  // COPY: draft, not from guidelines doc - pending Jen
  confirm: 'Start this week',
  // COPY: draft, not from guidelines doc - pending Jen
  back: 'Back',
  // COPY: draft, not from guidelines doc - pending Jen
  // The week-start step, shown ONLY to a user who has never chosen one. Asked
  // here rather than in Settings because every user reaches the weekly open,
  // and nobody goes looking in Settings for a question they have not been asked.
  weekStartQuestion: 'When does your week start?',
  // COPY: draft, not from guidelines doc - pending Jen
  weekStartHelp: 'From now on your week will run seven days from this day. This first one may be shorter.',
  weekStartSkip: 'Not now',
  // COPY: draft, not from guidelines doc - pending Jen
  perDay: 'About {minutes} min a day',
  // COPY: draft, not from guidelines doc - pending Jen
  whyHeading: 'Why this works',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Check your connection and try again.',
} as const;

/**
 * The adjustment options offered at the close (spec 8.4).
 *
 * THE IDS ARE PERSISTED AND THE LABELS ARE NOT. `adjustmentSelected` on the
 * weekly cycle stores an ID from this list, so an ID may never change once a
 * user has closed a week against it: a rename would orphan every stored row.
 * The labels below are placeholders and are expected to be rewritten; that
 * rewrite must not touch the keys.
 *
 * Spec 8.4 says the app offers exactly ONE adjustment for next week, hard
 * enforced. This slice offers a small fixed set and enforces a single choice in
 * the UI. The app PROPOSING the one adjustment from the user's own note is the
 * AI Coach mechanic (spec 14), a later slice.
 */
export const ADJUSTMENT_KEYS = [
  'smaller-daily-action',
  'same-again',
  'different-time',
  'different-outcome',
] as const;

export type AdjustmentKey = (typeof ADJUSTMENT_KEYS)[number];

export const ADJUSTMENT_LABELS: Record<AdjustmentKey, string> = {
  'smaller-daily-action': 'Make the daily action smaller',
  'same-again': 'Keep everything the same',
  'different-time': 'Do it at a different time of day',
  'different-outcome': 'Focus on something else',
};

/**
 * The weekly close (spec 8). Target under 90 seconds, so every question is one
 * tap except the note, which is skippable.
 *
 * Three constraints for whoever replaces these strings:
 *
 *   1. NOTHING HERE IS A GRADE. The ratings are a reading, not a score; the
 *      floor question is not a pass or a fail. No percentage, no total out of
 *      five, no "you managed", no red.
 *   2. THE FLOOR QUESTION IS THE ONE THAT FEEDS CONTINUITY, and a user who
 *      answers no has to feel able to say so. Phrasing that makes no the wrong
 *      answer produces a false yes, and a false yes is worse than a broken run:
 *      it makes the one number in the product a lie.
 *   3. What held, as a count of days completed (spec 8.1), is NOT on this
 *      screen. Nothing writes daily completion yet, so the count would be zero
 *      for everyone. Spec 8's own rule says to suppress a debrief with no data
 *      rather than show an empty one. It returns with the completion CTA.
 */
export const CLOSE_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  heading: 'Your week',

  // COPY: draft, not from guidelines doc - pending Jen
  // Spec 8.2. Weekly, never daily.
  ratingsHeading: 'How did the week feel?',
  // COPY: draft, not from guidelines doc - pending Jen
  ratingHint: 'One tap each. There is no right answer.',
  // COPY: draft, not from guidelines doc - pending Jen
  ratingFocus: 'Focus',
  // COPY: draft, not from guidelines doc - pending Jen
  ratingRecovery: 'Recovery',
  // COPY: draft, not from guidelines doc - pending Jen
  ratingEnergy: 'Energy',
  // COPY: draft, not from guidelines doc - pending Jen
  // The ends of the 1-5 scale, so the numbers mean something without implying
  // that 5 is a pass and 1 is a failure.
  ratingLow: 'Low',
  // COPY: draft, not from guidelines doc - pending Jen
  ratingHigh: 'High',

  // COPY: draft, not from guidelines doc - pending Jen
  // The floor question (spec 10.1 commitment, open item #10 Option A). Asked
  // plainly, answered either way, and never framed as pass or fail.
  floorHeading: 'Your floor',
  // COPY: draft, not from guidelines doc - pending Jen
  floorQuestion: "Did you do the one thing you named, even on this week's hardest days?",
  // COPY: draft, not from guidelines doc - pending Jen
  floorYes: 'Yes, I did that',
  // COPY: draft, not from guidelines doc - pending Jen
  floorNo: 'No, not this week',
  // Shown under the no option so the answer carries no penalty. Derived from
  // guidelines 0.5's stated pattern ("Missing a day does not erase previous
  // progress"), which is a rule for this slot rather than a string for it.
  // COPY: draft, not from guidelines doc - pending Jen
  floorNoReassurance: "Either answer is fine. A hard week doesn't undo the ones before it.",

  // COPY: draft, not from guidelines doc - pending Jen
  // Spec 8.3, the brief Jen owns. The highest-value qualitative data in the
  // product, and the one free-text field in the close.
  noteQuestion: 'What was the load like on the days it did not happen?',
  // COPY: draft, not from guidelines doc - pending Jen
  notePlaceholder: 'A line, if you want to',
  // COPY: draft, not from guidelines doc - pending Jen
  noteSkip: 'You can leave this blank.',

  // COPY: draft, not from guidelines doc - pending Jen
  // Spec 8.4. Exactly one, hard enforced.
  adjustmentHeading: 'One change for next week',
  // COPY: draft, not from guidelines doc - pending Jen
  adjustmentHint: 'Pick one.',

  // COPY: draft, not from guidelines doc - pending Jen
  save: 'Save and close the week',
  // COPY: draft, not from guidelines doc - pending Jen
  // Shown while the button is disabled, so the reason is on screen rather than
  // implied by a greyed control.
  required: 'Answer the three ratings, the floor question and pick one change.',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Your week is unchanged. Try again.',
} as const;
