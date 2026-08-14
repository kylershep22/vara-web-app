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
 * Capacity labels. The tier names are spec 6.1.
 *
 * The three glosses are APPROVED COPY, authored by the brand voice guidelines
 * §1.2, and carry no marker. They previously carried [Jen] (normal, slammed) and
 * [COPY GAP] (limited) markers on the reading that the spec owned this wording;
 * §1.2 supersedes that. Meaning is READINESS, not time: slammed is the gentler
 * week, never merely the shorter one.
 */
export const CAPACITY_LABELS = {
  normal: 'Normal',
  limited: 'Limited',
  slammed: 'Slammed',
} as const;

export const CAPACITY_GLOSSES = {
  normal: 'Ready to make some progress.',
  limited: 'Some room, so be selective.',
  slammed: 'Very little room. Keep the bar realistic.',
} as const;

/**
 * Time-window labels for the daily picker (roadmap 3b-ii-b).
 *
 * These describe what the USER HAS, which is why they read as windows rather
 * than as durations: the matching `TIME_CLASS_MAX_MINUTES` in the engine
 * describes what a PROTOCOL COSTS, and the two are different questions.
 *
 * The glosses deliberately say nothing about what will be served. Time is
 * collected and stored but does not change the protocol until the off-diagonal
 * content exists, and copy that promised otherwise would be a lie the app
 * cannot currently keep.
 */
export const TIME_LABELS = {
  short: gap('5 minutes or less'),
  medium: gap('10 to 15 minutes'),
  long: gap('15 minutes or more'),
} as const;

export const TIME_GLOSSES = {
  short: gap('A short window today'),
  medium: gap('Some room today'),
  long: gap('A good stretch today'),
} as const;

/**
 * The daily picker (roadmap 3b-ii-b). Two questions, one confirm.
 *
 * THE PROMPT COPY IS AN ALL-DAY RESTING STATE, not a pre-modal flash. Skipping
 * is a first-class answer ("not now"), so the pre-pick hero can sit on Home
 * from morning to bedtime. It therefore has to read the same at 4pm as it does
 * at 8am: a standing invitation, never an outstanding task.
 *
 * WHAT THAT RULES OUT, concretely, because each was in the first draft:
 *   - "Set today" as a heading. An imperative reads as a to-do left undone.
 *     The heading is a QUESTION, which reads the same at 4pm as at 8am and
 *     asks for nothing back. It no longer matches the answered hero word for
 *     word: guidelines §1.1 and §1.4 author the two states as distinct lines,
 *     which supersedes the earlier same-word rule. What carries over is the
 *     constraint that produced it, that neither state may read as a chore.
 *   - "Two quick questions and today is ready." It says today is NOT ready,
 *     which is a status report on the user's inaction. By the afternoon that
 *     is a nag.
 * Nothing here counts, hurries, or notices a gap. There is no streak to break
 * by not answering, and the copy may never imply one.
 */
export const PICKER_COPY = {
  promptHeading: 'Where are you starting from today?',
  promptBody: 'Quick check-in, then Vara will suggest a good place to start.',
  promptCta: gap("Set today's capacity"),
  title: gap('Today'),
  capacityQuestion: gap('How much are you up for today?'),
  timeQuestion: 'How much time can you realistically give this?',
  confirm: gap('Confirm'),
  /**
   * SKIP, not "Close". The distinction is the point: closing implies the task
   * is still pending somewhere, skipping is a complete answer that happens to
   * be "not now". It writes nothing and returns to the resting state.
   */
  skip: 'Not now',
  saveFailed: gap('That did not save. Try again.'),
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
  // The week-start step, shown ONLY to a user who has never chosen one. Asked
  // here rather than in Settings because every user reaches the weekly open,
  // and nobody goes looking in Settings for a question they have not been asked.
  weekStartQuestion: gap('When does your week start?'),
  weekStartHelp: gap(
    'From now on your week will run seven days from this day. This first one may be shorter.'
  ),
  weekStartSkip: 'Not now',
  perDay: gap('About {minutes} min a day'),
  whyHeading: gap('Why this works'),
  saveFailed: gap('That did not save. Check your connection and try again.'),
} as const;

/**
 * The Today surface, which is HOME. There is no standalone Today screen: these
 * strings are read by the dashboard components (TodayHeroCard, ContinuityCard,
 * CloseWeekEntry) and they live here rather than beside those components so the
 * weekly-loop copy stays in one file for the copy pass.
 *
 * Three keys were deleted with that screen: `weekHeading`, `loadFailed` and
 * `retry`. Home has no section heading above the week summary, and it renders
 * nothing rather than an error-with-retry when the read fails, so none of the
 * three has a surface to appear on any more.
 */
export const TODAY_COPY = {
  actionHeading: "Here's where to start.",
  floorHeading: gap('Your floor'),
  quickWinHeading: gap('Plus, once today'),
  // The week-1 quick-win practice (spec 6.3) has no catalogue entry and so no
  // display name. Showing the raw practice id would be worse than showing the
  // gap, so this stands in until the practice exists.
  quickWinPractice: gap('week-1 quick-win practice, not yet named'),

  // The in-week capacity re-set copy that lived here is RETIRED (roadmap
  // 3b-i): capacity is answered per day now, so there is no weekly tier to
  // re-plan and no ladder to sit at the end of.

  // Continuity (spec 1, surfaced below the fold per spec 9). A COUNT of
  // unbroken weeks. Never a percentage, never a bar, never a fraction of a
  // target, and nothing red: the number can only go up or start again, and no
  // phrasing here may imply a user is behind. Nothing renders at all when the
  // count is zero, so there is no string for "0 weeks".
  // TWO TOKENS ARE LOAD-BEARING AND NEITHER IS OBVIOUS FROM THIS FILE.
  // `{count}` is substituted by ContinuityCard, so dropping it silently drops
  // the number. And ContinuityCard's test asserts the singular branch by the
  // literal "1 week ", so the numeral has to survive here: "First full week"
  // reads better and fails that test, which is a copy constraint worth knowing
  // before the next pass rewrites these.
  continuityHeading: "What you've kept going",
  continuityCount: "{count} weeks holding your floor. That's real progress.",
  continuityCountOne: '1 week holding your floor. Nice work.',

  // Entry to the weekly close (spec 8), on Home. The real trigger is an elapsed
  // week, and wiring that into the entry guard is a tracked follow-up.
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
  // CALM ORIENTATION, NEVER A COUNTDOWN. This says when the week ends, not how
  // little of it is left: "3 days left" turns a container into a deadline, and
  // the weekly model exists to remove that pressure rather than add it. Appended
  // to the week-summary line, so it must read as a clause and not a sentence.
  runsThrough: gap('runs through {day}'),
  // The closed card. Same rule: where the next week begins, not a countdown to
  // it, and never an instruction to go and open it.
  nextWeekStarts: gap('Next week starts {day}.'),
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
  floorNoReassurance: "Either answer is fine. A hard week doesn't undo the ones before it.",

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
