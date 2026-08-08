/**
 * Every user-facing string in the weekly-loop screens, in one file.
 *
 * NONE OF THIS IS SHIPPABLE COPY. Two markers, and the distinction matters:
 *
 *   [Jen]      the spec supplies this line; Jen owns the final wording.
 *   [COPY GAP] the spec supplies nothing and a string was structurally
 *              required. The placeholder below was written to be replaced, not
 *              to be approved. Every one of these is reported as a copy gap.
 *
 * Both markers are rendered ON SCREEN, not stripped at build time, so nobody
 * can mistake a walkthrough build for finished product. Removing a marker is a
 * copy decision and belongs to Jen.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */

/** Prefix for a string the spec supplies. */
const jen = (text: string) => `[Jen] ${text}`;
/** Prefix for a string the spec does not supply. */
const gap = (text: string) => `[COPY GAP] ${text}`;

export const FLOOR_COPY = {
  // Spec 10.1, verbatim prompt.
  prompt: jen("Name the one thing you'll do even on your worst week."),
  helper: gap('One line, in your own words.'),
  placeholder: gap('Ten minutes outside'),
  save: gap('Save'),
  // Shown when the field is empty; the button is disabled, this says why.
  required: gap('Write one line to continue.'),
  saveFailed: gap('That did not save. Check your connection and try again.'),
} as const;

export const ENTRY_COPY = {
  loading: gap('One moment.'),
  failed: gap('We could not load your week. Try again.'),
  retry: gap('Try again'),
  signedOut: gap('Sign in to open your week.'),
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

/**
 * Capacity labels. The tier names and the two glosses the spec supplies
 * (normal = "full time and resources", slammed = "minimal") are spec 6.1;
 * `limited` is given no gloss there, so it has one copy gap of its own.
 */
export const CAPACITY_LABELS = {
  normal: 'Normal',
  limited: 'Limited',
  slammed: 'Slammed',
} as const;

export const CAPACITY_GLOSSES = {
  normal: jen('Full time and resources'),
  limited: gap('Less room than usual'),
  slammed: jen('Minimal'),
} as const;

export const OPEN_COPY = {
  // Spec 6.1 step 1, verbatim.
  outcomeQuestion: jen("What's your focus this week?"),
  // Spec 6.1 step 2, verbatim.
  capacityQuestion: jen("What's your capacity this week?"),
  // Spec 6.1 step 3 (calendar forecast) is DEFERRED, not hidden behind a
  // disabled control. There is no string for it here because there is no
  // affordance for it on screen.
  confirmHeading: gap('Your week'),
  confirm: gap('Start this week'),
  back: gap('Back'),
  perDay: gap('About {minutes} min a day'),
  whyHeading: gap('Why this works'),
  saveFailed: gap('That did not save. Check your connection and try again.'),
} as const;

export const TODAY_COPY = {
  actionHeading: gap('Today'),
  weekHeading: gap('This week'),
  floorHeading: gap('Your floor'),
  quickWinHeading: gap('Plus, once today'),
  // The week-1 quick-win practice (spec 6.3) has no catalogue entry and so no
  // display name. Showing the raw practice id would be worse than showing the
  // gap, so this stands in until the practice exists.
  quickWinPractice: gap('week-1 quick-win practice, not yet named'),
  loadFailed: gap('We could not load your week. Try again.'),
  retry: gap('Try again'),

  // The dynamic in-week re-set (spec 7). Spec 7 names the control but supplies
  // none of its labels, so every string below is a gap rather than a [Jen]
  // line. Two constraints Jen should know when replacing them:
  //
  //   1. The two actions are ONE TAP with no confirmation, so a label has to
  //      read as the thing that happens, not as a question.
  //   2. Neither direction is a failure or a reward. Down is not "giving up"
  //      and up is not "earning" anything, because continuity is measured
  //      against the floor commitment and never against the tier. A label that
  //      implies otherwise would contradict the mechanic underneath it.
  resetHeading: gap('This week changed'),
  resetDown: gap('I have less time than I thought'),
  resetUp: gap('I have more time than I thought'),
  // Shown in place of the missing direction at either end of the ladder, so the
  // absence reads as a state rather than a missing button.
  resetAtLowest: gap('This is already the lightest version.'),
  resetAtHighest: gap('This is already the fullest version.'),
  resetFailed: gap('That did not save. Your week is unchanged. Try again.'),

  // Continuity (spec 1, surfaced below the fold per spec 9). A COUNT of
  // unbroken weeks. Never a percentage, never a bar, never a fraction of a
  // target, and nothing red: the number can only go up or start again, and no
  // phrasing here may imply a user is behind. Nothing renders at all when the
  // count is zero, so there is no string for "0 weeks".
  continuityHeading: gap('Unbroken'),
  continuityCount: gap('{count} weeks holding your floor'),
  continuityCountOne: gap('1 week holding your floor'),

  // Entry to the weekly close (spec 8). Reachable from Today, which itself is
  // dev-only this slice; the real trigger is an elapsed week, and wiring that
  // into the entry guard is a tracked follow-up.
  closeEntry: gap('Close out this week'),

  // Shown IN PLACE OF the entry above once the week has been closed, so the
  // close reads as something that finished rather than a loop with no end.
  //
  // Two constraints for whoever replaces this line:
  //
  //   1. IT IS A STATEMENT, NOT A REWARD. A week closed with the floor missed
  //      is closed exactly as much as one where it held, and this line is shown
  //      identically in both cases. No congratulation, no "streak saved", no
  //      score, nothing that would read as praise the user has to earn.
  //   2. It is not tappable and must not become an instruction to do anything.
  //      The one action on this surface is today's completion control.
  weekClosed: gap('This week is closed.'),
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
  'smaller-daily-action': gap('Make the daily action smaller'),
  'same-again': gap('Keep everything the same'),
  'different-time': gap('Do it at a different time of day'),
  'different-outcome': gap('Focus on something else'),
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
  heading: gap('Your week'),

  // Spec 8.2. Weekly, never daily.
  ratingsHeading: gap('How did the week feel?'),
  ratingHint: gap('One tap each. There is no right answer.'),
  ratingFocus: gap('Focus'),
  ratingRecovery: gap('Recovery'),
  ratingEnergy: gap('Energy'),
  // The ends of the 1-5 scale, so the numbers mean something without implying
  // that 5 is a pass and 1 is a failure.
  ratingLow: gap('Low'),
  ratingHigh: gap('High'),

  // The floor question (spec 10.1 commitment, open item #10 Option A). Asked
  // plainly, answered either way, and never framed as pass or fail.
  floorHeading: gap('Your floor'),
  floorQuestion: gap("Did you do the one thing you named, even on this week's hardest days?"),
  floorYes: gap('Yes, I did that'),
  floorNo: gap('No, not this week'),
  // Shown under the no option so the answer carries no penalty.
  floorNoReassurance: gap('Either answer is fine. This is the only thing the count follows.'),

  // Spec 8.3, the brief Jen owns. The highest-value qualitative data in the
  // product, and the one free-text field in the close.
  noteQuestion: jen('What was the load like on the days it did not happen?'),
  notePlaceholder: gap('A line, if you want to'),
  noteSkip: gap('You can leave this blank.'),

  // Spec 8.4. Exactly one, hard enforced.
  adjustmentHeading: gap('One change for next week'),
  adjustmentHint: gap('Pick one.'),

  save: gap('Save and close the week'),
  // Shown while the button is disabled, so the reason is on screen rather than
  // implied by a greyed control.
  required: gap('Answer the three ratings, the floor question and pick one change.'),
  saveFailed: gap('That did not save. Your week is unchanged. Try again.'),
} as const;
