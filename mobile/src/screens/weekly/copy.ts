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

/**
 * OPEN_COPY STOOD HERE and is deleted with WeeklyOpenScreen (journey slice 3b).
 *
 * Ten drafted strings went with it, none of which had ever been approved and
 * none of which has a surface any more: the weekly open asked for an outcome, a
 * capacity and a week start, and the journey model answers all three without
 * asking. OUTCOME_LABELS above SURVIVES and is unrelated; it is read by
 * CloseWeekEntry, TodayHeroCard and the V3 onboarding outcome step.
 */

/**
 * ADJUSTMENT_KEYS AND ADJUSTMENT_LABELS STOOD HERE and are deleted with the
 * question they answered (journey slice 6).
 *
 * The close offered exactly one adjustment for next week (spec 8.4). Slice 3b
 * stopped STORING the choice and slice 6 stops ASKING for it: the weekly
 * surface is one felt read and a note, and "what should change next week" is
 * the C2 adjust screen's job, offered when two consecutive not_moving reads
 * say the approach is not working. An always-on menu asked every user to
 * re-plan every week whether or not anything was wrong.
 *
 * THE IDS WENT WITH THE LABELS, and that is safe only because nothing stores
 * them. The old header here warned that an id may never change once a user has
 * closed a week against it, which was true while `adjustmentSelected` was
 * written; 3b retired that write (roadmap section 3.4) and no row written since
 * carries one. Rows written BEFORE 3b still hold their string values, unread
 * and untouched: `WeeklyCycle.adjustmentSelected` stays on the model as an
 * optional legacy field so those documents keep parsing.
 *
 * `ADJUSTMENT_IDS` in types/analyticsEvents.ts was the redeclared twin of this
 * list, pinned to it by types/__tests__/analyticsEvents.test.ts. Both sides are
 * deleted in this slice, because the event no longer carries the field.
 */

/**
 * The weekly reset (spec 8, repurposed by journey slice 6). One felt read, one
 * optional note, and an acknowledgment. Every answer is one tap.
 *
 * THE QUESTION AND ITS ANSWERS ARE NOT IN THIS FILE. They are Jen's, approved,
 * and they live in constants/journeyCopy.ts as RESET_QUESTIONS, RESET_ANSWERS
 * and RESET_CONFIRMATION, because the question varies by DESTINATION and the
 * destination vocabulary already lives there beside A2_BODIES. What is left
 * here is the chrome around them.
 *
 * WHAT LEFT WITH SLICE 6, so a later reader does not go looking:
 *
 *   - THE THREE 1-TO-5 RATINGS (spec 8.2). Nothing ever read them. 3b stopped
 *     storing them and left the questions on screen for one slice, documented
 *     as a real gap; this is the slice that stops asking. A weekly instrument
 *     with a rating scale on it is a score whatever the copy says, and the
 *     felt read replaces all three with one direction.
 *   - THE FLOOR QUESTION and its four strings. It was the only input to
 *     continuity, continuity is retired (roadmap section 9 R4), and section
 *     3.4's "floorMet survives only if continuity ships" resolves to no. This
 *     is NOT the floor commitment: UserPrivate.floorCommitment and
 *     FLOOR_COPY above are untouched and still gate the weekly entry.
 *   - THE ADJUSTMENT MENU. See the block above.
 *
 * Two constraints for whoever replaces the strings below:
 *
 *   1. NOTHING HERE IS A GRADE. There is no total, no scale, and no right
 *      answer. The acknowledgment is identical whichever answer was given.
 *   2. THE NOTE IS THE ONE FREE-TEXT FIELD and it is genuinely skippable. It
 *      is also permanently barred from analytics: types/analyticsEvents.ts is
 *      the guard, not reviewer discipline.
 */
export const CLOSE_COPY = {
  // COPY: draft, not from guidelines doc - pending Jen
  heading: 'Your week',

  // COPY: draft, not from guidelines doc - pending Jen
  // REWRITTEN IN SLICE 6. It read "What was the load like on the days it did
  // not happen?", which only made sense underneath the floor question that
  // asked whether the user held their commitment. That question is retired, so
  // the note had to stop referring to it. Open and unleading on purpose: this
  // is the highest-value qualitative field in the product (spec 8.3) and a
  // prompt that names a problem collects answers about that problem.
  noteQuestion: 'Anything you want to note about the week?',
  // COPY: draft, not from guidelines doc - pending Jen
  notePlaceholder: 'A line, if you want to',
  // COPY: draft, not from guidelines doc - pending Jen
  noteSkip: 'You can leave this blank.',

  // COPY: draft, not from guidelines doc - pending Jen
  save: 'Save and close the week',
  // COPY: draft, not from guidelines doc - pending Jen
  // REWRITTEN IN SLICE 6. It named the three ratings, the floor question and
  // the adjustment. One answer is required now. Shown while the button is
  // disabled, so the reason is on screen rather than implied by a greyed
  // control.
  required: 'Answer the question above to continue.',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Your week is unchanged. Try again.',
} as const;
