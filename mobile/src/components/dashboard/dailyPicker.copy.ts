/**
 * Every user-facing string on the DAILY surface: the picker sheet, the pre-pick
 * prompt, and the Home cards that render the day.
 *
 * Moved verbatim out of screens/weekly/copy.ts by journey slice 0. The weekly
 * outcome loop is being retired in later slices and the daily capacity loop is
 * not, so the daily strings needed to stop living inside the weekly copy
 * module. Nothing changed but the file they sit in.
 *
 * CAPACITY_LABELS / CAPACITY_GLOSSES ARE NOT HERE. They are shared vocabulary
 * (weekly open, V3 onboarding, and this surface all read them) and live in
 * src/constants/capacityCopy.ts. Files under screens/ must never import copy
 * from components/, so anything with a non-daily reader belongs there instead.
 *
 * Tracking convention, unchanged from the weekly module this came out of:
 *
 *   (no comment)  taken verbatim from the guidelines doc. Approved.
 *   COPY: draft   written against the doc's rules and examples rather than
 *                 lifted from it, or predating the doc entirely. NOT approved,
 *                 and grep-able as `COPY: draft` across the tree.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */

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
 *
 * APPROVED AS-IS BY KYLE FOR v1, 2026-09-04. Unlike the other approvals in this
 * file these were reviewed in the form the user actually meets them: the
 * VoiceOver walk on 2026-09-03 heard the spoken output on device, "[window].
 * [gloss]", and passed it. That is the only place these strings surface, since
 * TIME_CHIP_LABELS is what gets painted.
 *
 * REVISE THE PAIR TOGETHER, ALWAYS. TIME_LABELS is the accessibility label on
 * each chip and TIME_CHIP_LABELS is its visible text, so they are two halves of
 * one control. Changing one alone makes the app say different things to two
 * users looking at the same chip, and the voice pass would be the half nobody
 * notices is wrong.
 */
export const TIME_LABELS = {
  short: '5 minutes or less',
  medium: '10 to 15 minutes',
  long: '15 minutes or more',
} as const;

/**
 * The SAME three windows as TIME_LABELS, compressed to fit a horizontal chip
 * row (journey slice: daily-picker time chips).
 *
 * A COMPRESSION, NOT A REWRITE. Each one is its TIME_LABELS twin with the words
 * shortened and nothing else changed, because the two must never disagree about
 * what a window is: TIME_LABELS remains the accessibility label on every chip,
 * so a screen reader still hears the full phrasing while sighted users read the
 * short one. If these ever diverge in meaning, the short form is the bug.
 *
 * WHY SHORT AT ALL. Three chips share one row inside a modal roughly 313pt wide,
 * which is about 83pt of text per chip at 12pt. The full labels do not fit and
 * wrap to two lines each, which is what made the time question fall below the
 * fold in the first place.
 *
 * APPROVED AS-IS BY KYLE FOR v1, 2026-09-04, on his own authority rather than
 * Jen's. They landed drafted and were counted at 195.
 *
 * REVISE THE PAIR TOGETHER, ALWAYS. See the note on TIME_LABELS above: these two
 * are the visible and the spoken half of one control, and changing either alone
 * makes the chip say different things to two users looking at it.
 */
export const TIME_CHIP_LABELS = {
  short: '5 min or less',
  medium: '10 to 15 min',
  long: '15 min or more',
} as const;

export const TIME_GLOSSES = {
  // COPY: draft, not from guidelines doc - pending Jen
  short: 'A short window today',
  // COPY: draft, not from guidelines doc - pending Jen
  medium: 'Some room today',
  // COPY: draft, not from guidelines doc - pending Jen
  long: 'A good stretch today',
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
  // COPY: draft, not from guidelines doc - pending Jen
  promptCta: "Set today's capacity",
  // COPY: draft, not from guidelines doc - pending Jen
  title: 'Today',
  // COPY: draft, not from guidelines doc - pending Jen
  capacityQuestion: 'How much are you up for today?',
  timeQuestion: 'How much time can you realistically give this?',
  // COPY: draft, not from guidelines doc - pending Jen
  confirm: 'Confirm',
  /**
   * SKIP, not "Close". The distinction is the point: closing implies the task
   * is still pending somewhere, skipping is a complete answer that happens to
   * be "not now". It writes nothing and returns to the resting state.
   */
  skip: 'Not now',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Try again.',
} as const;

/**
 * The Today surface, which is HOME. There is no standalone Today screen: these
 * strings are read by the dashboard components (TodayHeroCard, ContinuityCard,
 * CloseWeekEntry) and, as of journey slice 0, they live beside those components
 * rather than in the weekly copy module.
 *
 * SOME OF THESE ARE WEEKLY STRINGS ON A DAILY SURFACE. `closeEntry`,
 * `weekClosed`, `nextWeekStarts`, `runsThrough` and the three continuity keys
 * describe the weekly loop. They moved here because every reader is a dashboard
 * component, not because they outlive the weekly loop. Expect the slice that
 * retires it to take them and leave the daily keys behind.
 *
 * Three keys were deleted with that screen: `weekHeading`, `loadFailed` and
 * `retry`. Home has no section heading above the week summary, and it renders
 * nothing rather than an error-with-retry when the read fails, so none of the
 * three has a surface to appear on any more.
 */
export const TODAY_COPY = {
  actionHeading: "Here's where to start.",
  // COPY: draft, not from guidelines doc - pending Jen
  floorHeading: 'Your floor',
  // COPY: draft, not from guidelines doc - pending Jen
  quickWinHeading: 'Plus, once today',
  // COPY: draft, not from guidelines doc - pending Jen
  // The week-1 quick-win practice (spec 6.3) has no catalogue entry and so no
  // display name. Showing the raw practice id would be worse than showing the
  // gap, so this stands in until the practice exists.
  quickWinPractice: 'week-1 quick-win practice, not yet named',

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
  //
  // OPEN FOR JEN, deliberately not resolved here. Guidelines 0.5's own examples
  // stay declarative, pairing a fact with a plain reaction. The two count lines
  // below append an evaluation instead ("That's real progress." / "Nice work.")
  // to a number that is already below the fold. That may be one beat more than
  // this surface needs, and the quieter alternative is to let the count stand
  // on its own. A voice call, not a correctness one.
  // COPY: draft, not from guidelines doc - pending Jen
  continuityHeading: "What you've kept going",
  continuityCount: "{count} weeks holding your floor. That's real progress.",
  continuityCountOne: '1 week holding your floor. Nice work.',

  // COPY: draft, not from guidelines doc - pending Jen
  // Entry to the weekly close (spec 8), on Home. The real trigger is an elapsed
  // week, and wiring that into the entry guard is a tracked follow-up.
  closeEntry: 'Close out this week',

  // COPY: draft, not from guidelines doc - pending Jen
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
  weekClosed: 'This week is closed.',
  // COPY: draft, not from guidelines doc - pending Jen
  // CALM ORIENTATION, NEVER A COUNTDOWN. This says when the week ends, not how
  // little of it is left: "3 days left" turns a container into a deadline, and
  // the weekly model exists to remove that pressure rather than add it. Appended
  // to the week-summary line, so it must read as a clause and not a sentence.
  runsThrough: 'runs through {day}',
  // COPY: draft, not from guidelines doc - pending Jen
  // The closed card. Same rule: where the next week begins, not a countdown to
  // it, and never an instruction to go and open it.
  nextWeekStarts: 'Next week starts {day}.',
} as const;
