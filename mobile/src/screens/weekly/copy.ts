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
 * FOUR STRINGS HERE ARE KYLE'S OWN AND CARRY NO MARKER, WHICH IS A DECISION
 * RATHER THAN AN OMISSION (2026-09-10). `screenTitle`, `heading`, `save` and
 * `noteQuestion` and `required` were not drafted by CC and then signed off:
 * Kyle wrote the words that ship. They enter flat for the same reason
 * DESTINATION_SUMMARY_LABELS' four entries do, and that map's own header makes
 * the same statement for the same reason: an unmarked string in a file where
 * every neighbour carries a marker should read as weighed, not as forgotten.
 *
 * The arithmetic case is the 5b-i rider's, not an approval. Kyle REPLACED the
 * drafted text rather than approving it, which costs the same -1 per string and
 * is a different fact about how much review the copy has had. The sentinel
 * cannot tell those apart; this comment can.
 *
 * WHAT IS STILL DRAFTED HERE, so the mix is legible: `notePlaceholder`,
 * `noteSkip` and `saveFailed`, all pending Jen, plus the whole of FLOOR_COPY
 * and ENTRY_COPY above.
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
  // KYLE'S, 2026-09-10. THE NAVIGATOR TITLE, AND IT LIVES HERE RATHER THAN IN
  // AppNavigator BECAUSE USER-FACING COPY DOES NOT LIVE IN THE NAVIGATOR. It
  // sat inline at AppNavigator.tsx as a hardcoded literal from the day the
  // close shipped, which meant it was outside the sentinel's reach: unmarked
  // not because anyone had cleared it but because nobody had ever looked. That
  // is a hole in the gate's coverage, not an approval, and moving the string is
  // what closes it.
  //
  // "CLOSE YOUR WEEK" IS GONE BECAUSE THE SCREEN NO LONGER CLOSES ANYTHING.
  // Slice 6 decision 2 made the read PRESENT TENSE about the live stretch
  // rather than a retrospective on the week that ended, so "close" taught the
  // wrong mental model: it framed a forward-looking check-in as a filing
  // action on something finished.
  //
  // "RESET" COLLIDES WITH PRACTICE VOCABULARY AND WAS CHOSEN ANYWAY. The word
  // already means something in this app: small resets, the guided reset, and
  // Jen's Recover lanes all use it for a thing you DO in a few minutes. This
  // is a weekly instrument, met once a week from Home, in a stack header, with
  // no practice in sight. The contexts are far enough apart that the collision
  // is acceptable. Recorded as a considered choice so a later reader does not
  // "fix" it, and so the alternative is re-argued rather than assumed.
  screenTitle: 'Weekly reset',

  // KYLE'S, 2026-09-10. It read 'Your week', which named the subject without
  // saying what the screen wanted. It also duplicated the Insights route's
  // navigator title exactly (AppNavigator.tsx), so two different screens
  // announced themselves with the same three words; this one now says what it
  // is for and that collision is gone.
  heading: 'Check in on your week',

  // KYLE'S, 2026-09-10. Twice-rewritten, and the first rewrite is why the
  // second was needed. The original read "What was the load like on the days it
  // did not happen?", which only parsed underneath the floor question that
  // asked whether the user held their commitment; that question retired with
  // continuity, so the note referred to something nobody had been asked. CC's
  // replacement, "Anything you want to note about the week?", fixed the
  // reference and invited nothing: an open prompt that points nowhere collects
  // blanks. This one asks for something a person can actually retrieve.
  noteQuestion: 'Anything from this week you want to remember?',
  // COPY: draft, not from guidelines doc - pending Jen
  notePlaceholder: 'A line, if you want to',
  // COPY: draft, not from guidelines doc - pending Jen
  noteSkip: 'You can leave this blank.',

  // KYLE'S, 2026-09-10. It read 'Save and close the week', wrong twice over:
  // "close" for the reason at screenTitle, and "save" because it foregrounds
  // data persistence, which is not what the user came here to do. A button
  // names the action from the user's side, and from theirs this is the end of
  // a short weekly check-in.
  save: 'Finish',
  // KYLE'S, 2026-09-10. It named the three ratings, the floor question and the
  // adjustment, none of which the screen asks any more; CC's replacement,
  // "Answer the question above to continue.", pointed at a position rather than
  // at a thing and read flatter than everything around it. This one names what
  // is being asked for.
  //
  // IT APPEARS TWICE and has to work in both: as a line under the disabled
  // button, and as that button's accessibilityHint while disabled.
  required: 'Choose how this feels to continue.',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Your week is unchanged. Try again.',
} as const;
