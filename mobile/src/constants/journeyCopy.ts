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
import type { PhaseState } from './journey';
import type {
  AdjustChoiceId,
  DestinationKey,
  PhaseKey,
  PhaseRead,
} from '../types/models';

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
 * user wants steadier days, routines are the mechanism. Approved via Content
 * Pack v1 part one section 3, decision 2.
 *
 * FULLY APPROVED, AND THE MAP NO LONGER MIXES TWO STATES. It landed in slice 4b
 * with three drafted entries and one approved one, which was worth flagging at
 * the time and is now closed: **'Focus', 'Calm' and 'Energy' were approved by
 * Kyle on device on 2026-09-07**, during the 4b walk, read in the position they
 * actually occupy rather than off a list. "Steadier days" was already flat from
 * the pack. No entry here carries a marker and the sentinel does not count any
 * of them.
 *
 * THE FOUR ARE REVISED TOGETHER OR NOT AT ALL. They are one control's worth of
 * vocabulary: three one-word labels and one two-word label that only reads
 * right beside them. Changing one alone is how a set like this drifts into
 * looking accidental.
 */
export const DESTINATION_SUMMARY_LABELS: Record<DestinationKey, string> = {
  focus: 'Focus',
  calm: 'Calm',
  routines: 'Steadier days',
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

/**
 * The four words the journey map puts on a row (roadmap section 1: DONE /
 * WHERE YOU ARE / AHEAD / SKIPPED).
 *
 * WRITTEN IN-HOUSE AND APPROVED, OWNER KYLE, 2026-09-09. These are NOT pack
 * content. Roadmap section 1 writes them in capitals as prose about what the
 * map shows; the Content Pack delivers 16 titles, 16 glosses and 16 shorts and
 * no state vocabulary at all. Sentence case here because they are UI labels
 * rather than a spec's shouted list.
 *
 * APPROVED ON DEVICE, READ IN SITU. All four were signed off during the slice
 * 5a walk, on the map rows they occupy rather than off a list, and their
 * `COPY: draft` markers were cleared in the same rider that records it. The
 * absence of a marker here means they were weighed, not that nobody asked.
 *
 * WORDS, NOT COUNTS. "Where you are" is the whole position report: no ordinal,
 * no "step 2", no "1 of 4" (UI Standards 10.7, roadmap section 8).
 *
 * "Ahead" IS NOT "Locked", and the word was chosen for that. Section 8 says
 * every practice is runnable at all times and AHEAD opens; a word like "Later"
 * or "Not yet" would imply a door the app does not have.
 *
 * "Skipped" IS NEUTRAL AND STAYS NEUTRAL. It records what the user chose, and
 * the user is allowed to have chosen it. Nothing here may acquire a nudge, a
 * consequence, or a way back that reads as a correction.
 *
 * A2 DOES NOT USE THIS MAP. Its current row says "Starting here", which lives
 * at the route strip: same position, different moment, different sentence.
 *
 * DELIBERATELY NOT COLLAPSED WITH `JOURNEY_LINE_LABEL` BELOW, WHICH HOLDS THE
 * SAME THREE WORDS AS `current` TODAY (Kyle, 2026-09-10, slice 7a rider). The
 * full argument is at that constant; the half that matters HERE is that THIS
 * MAP IS THE ONE LIKELIER TO BE REVISED. These four labels have to work as a
 * SET - Complete, Where you are, Ahead, Skipped - and a revision that makes
 * `current` sit better beside its three siblings need not make sense above a
 * phase name on Today, where there are no siblings at all.
 *
 * So: revise these four freely. Today's journey line does not follow, and that
 * independence is the reason the two constants exist rather than one.
 *
 * `done` READS "Complete", NOT "Done" (Kyle, 2026-09-09, slice 5b-i). A
 * SUBSTITUTION OF ONE APPROVED STRING BY ANOTHER: both were his, the second
 * replaces the first on the same day, and the sentinel does not move in either
 * direction. It is not a new draft and not an approval, so do not count it as
 * one. "Done" was the only one of the four that could read as achievement
 * rather than as description, which is a register the rest of the map avoids;
 * the key stays `done` because the key is vocabulary and the label is copy.
 */
export const PHASE_STATE_LABELS: Record<PhaseState, string> = {
  done: 'Complete',
  current: 'Where you are',
  ahead: 'Ahead',
  skipped: 'Skipped',
};

/**
 * What each stretch is doing, one short body per phase (slice 5b-i).
 *
 * WRITTEN AND APPROVED BY KYLE, 2026-09-09, ON DEVICE. Not pack content: Content
 * Pack v1 delivers 16 titles, 16 glosses and 16 shorts, and neither it nor the
 * roadmap specifies what a phase page says in its own voice.
 *
 * AUTHORED, NOT DRAFTED-THEN-APPROVED, and the difference is worth the sentence.
 * These five shipped to the branch as Claude drafts and Kyle REPLACED THE TEXT
 * during the walk, reading each one on the page it occupies. What is here is his
 * wording, not a sign-off on someone else's. The absence of markers means the
 * strings were weighed, not that nobody questioned them. Same reading as
 * DESTINATION_SUMMARY_LABELS above.
 *
 * PER PHASE, NOT PER CELL, AND THAT IS DELIBERATE. `PHASE_DISPLAY` already says
 * what this phase means for THIS destination, in Jen's words, twice over (title
 * and gloss). A sixteen-cell body would say the same thing a third time and
 * would be sixteen more strings to keep in agreement with hers. The body answers
 * the question the destination language cannot: why the journey has this stretch
 * at all, and why it sits where it sits.
 *
 * THE FOUR ARE STATE-AGNOSTIC ON PURPOSE. The same body reads correctly whether
 * the user is standing in the phase, has finished it, skipped it, or has not
 * reached it, so an unreached phase needs no second version and no empty state.
 * A body that changed with position would be four more strings and would make
 * the page about the user's progress rather than about the stretch.
 *
 * NOTHING HERE PROMISES CONTENT. The rewire body in particular says what the
 * stretch is for and stops: its three protocol variants are the only ones in the
 * matrix carrying `placeholder: true`, and a body that described practices
 * nobody has authored would be the placeholder leaking out through the copy.
 *
 * NO EM DASHES, NO COUNTS, NO SEQUENCE NUMBERS. "It comes later" is position;
 * "it is the third stretch" would be a counter (UI Standards 10.7).
 */
export const PHASE_PAGE_BODIES: Record<PhaseKey, string> = {
  remove:
    "Whatever brought you here, we start by making a little room. Before adding anything new, you'll work on one thing that's been taking too much from you.",
  recover:
    "This stretch is about finding your way back after the day takes something out of you. You'll try small resets and notice which ones actually help.",
  rewire:
    'This stretch is about making what helps easier to come back to. It lands better once you have some room to work with.',
  refocus:
    "This stretch is where you use the room you've made on the things you wanted more of, instead of whatever is asking the loudest.",
};

/**
 * The one line the remove page adds when a replacement intention is stored.
 *
 * RENDERS ONLY BESIDE A CURATED LABEL, never alone and never with the user's own
 * words. `removeTargetText` is not echoed on any phase page (Kyle, 2026-09-09):
 * its single echo point stays at the capture confirmation, because reflecting a
 * person's own sentence back at them days later is a different act from showing
 * it to them as they type it.
 *
 * KYLE'S, APPROVED ON DEVICE 2026-09-09, on the same terms as the bodies above:
 * read in the position it occupies, beside a real stored pick.
 */
export const PHASE_PAGE_COPY = {
  replacementLeadIn: 'What you chose instead',
} as const;

/**
 * The weekly reset's felt read (C1, slice 6).
 *
 * JEN'S, APPROVED ON DELIVERY. `Content Pack v1 section C1`, landing FLAT under
 * the pack's own rule: pack strings carry no `COPY: draft` marker and the
 * sentinel does not count them.
 *
 * ONE QUESTION PER DESTINATION, AND ONLY THE DESTINATION LANGUAGE VARIES. The
 * pack's instruction is exact: "Keep the structure identical and change only
 * the destination language." All four ask the same thing in the same shape,
 * which is what stops the four reading as four different products. Same
 * discipline as A2_BODIES above, and the same "routines reads Steadier days"
 * mapping DESTINATION_SUMMARY_LABELS uses.
 *
 * NOT A SCORE AND NOT A SCALE. Three answers, no numbers, no midpoint that
 * reads as a pass mark. The screen that renders these had three 1-to-5 rating
 * rows until this slice; they are gone, and nothing here may reintroduce a
 * measurement.
 */
export const RESET_QUESTIONS: Record<DestinationKey, string> = {
  focus: "Does this feel like it's moving you toward better focus?",
  calm: "Does this feel like it's helping you switch off more easily?",
  routines: "Does this feel like it's moving you toward steadier days?",
  energy: "Does this feel like it's helping you have a little more energy left?",
};

/**
 * The three answers, in the order the pack lists them.
 *
 * THE ORDER IS THE PACK'S AND IS NOT A RANKING. "Hard to tell" sits last
 * because it is the answer about the user's own confidence rather than about
 * the journey, not because it is the worst one. Nothing in the render may imply
 * a best answer: no numbers, no colour that reads as good or bad, and the
 * confirmation below is identical whichever is tapped.
 *
 * `value` IS THE PERSISTED PhaseRead AND THE LABEL IS NOT. The mapping is the
 * engine contract at `Content Pack v1 decisions section 1`, carried in full at
 * `journey/derive.ts`. A label rewrite must never touch a value: the values are
 * stored on weeklyCycles and feed the adjustment threshold.
 */
export const RESET_ANSWERS: ReadonlyArray<{ value: PhaseRead; label: string }> = [
  { value: 'moving', label: 'Yes, I can feel a difference' },
  { value: 'not_moving', label: 'Not really yet' },
  { value: 'unclear', label: 'Hard to tell' },
];

/**
 * What the app says back, once.
 *
 * IT NEVER VARIES BY ANSWER. The pack says so in its own words: "Do not change
 * the confirmation depending on the answer. The purpose of this screen is to
 * listen, not reward or reassure." A confirmation that brightened for 'moving'
 * would turn the question into a test with a right answer, and a false 'moving'
 * makes the one signal the adjustment offer reads a lie.
 *
 * IT IS ALSO THE REGISTER OF THE WHOLE INSTRUMENT: the app heard, and nothing
 * dramatic follows. That is why it has a surface at all rather than being
 * dropped for want of one.
 */
export const RESET_CONFIRMATION = "Got it. We'll keep that in mind this week.";

/**
 * The advancement offer, B2 (slice 7a).
 *
 * JEN'S, APPROVED ON DELIVERY. `Content Pack v1 section B2`, landing FLAT under
 * the pack's own rule: pack strings carry no `COPY: draft` marker and the
 * sentinel does not count them. Both variants arrived early; they were marked
 * "not on her list yet" and were delivered anyway in the Sept 5 pack.
 *
 * TWO VARIANTS BECAUSE TWO DOORS OPEN THE OFFER, and they are not
 * interchangeable. `consistency` fires when the user has actually been coming
 * back and can therefore say so. `ceiling` fires on elapsed time with too few
 * completed days to describe the behaviour as regular, so it deliberately names
 * NOTHING about what the user did. Serving the consistency line to a ceiling
 * user would tell them they had been consistent when the reason they are seeing
 * a card at all is that they were not. `deriveAdvanceDoor` is what chooses.
 *
 * RECOGNIZE -> OFFER -> PRESERVE CHOICE (roadmap section 9 R2). Never achieve ->
 * unlock -> reward. Neither body says what the next phase CONTAINS, and that
 * withholding is the decision rather than an omission: a list of contents is a
 * pitch, and a pitch has to be sold. The user chooses to look, and the preview
 * page is where looking happens.
 *
 * NOTHING HERE MAY EVER IMPLY EARNED PERMISSION. Every practice is runnable at
 * all times (section 8), so permission was never Vara's to grant, and copy that
 * implied otherwise would invent a lock the product does not have. This is a
 * standing rule for every future advancement state, not this card's alone.
 *
 * NO NUMBERS. Neither variant may name the eight, the fourteen, the exposures
 * or the days remaining.
 *
 * `secondary` IS ONE STRING FOR BOTH VARIANTS, AND THAT IS A CHANGE. The pack
 * ships "Keep working here" on variant one and "Stay here" on variant two, and
 * section 8 carries a third wording, "stay a while longer". Three wordings for
 * one action across two cards a user may see in sequence is how a decline starts
 * looking like three different doors. KYLE'S WORDING, landing flat on the
 * PHASE_PAGE_BODIES precedent above: authored by the owner, not a sign-off on
 * someone else's draft.
 */
export const ADVANCEMENT_COPY = {
  consistency: {
    title: "There's something to build on here.",
    body: "You've been coming back to this regularly. Want to see what Vara can build from it next?",
  },
  ceiling: {
    title: 'Ready to try the next part?',
    body: "You've spent some time working here. You can keep going, or see what comes next and decide if it feels right.",
  },
  primary: "See what's next",
  secondary: 'Keep going here',
} as const;

/**
 * The advancement preview page's two controls, and its one failure line.
 *
 * PREVIEW BEFORE COMMIT (slice 7a decision 4). "See what's next" promises a
 * look and must not mutate anything, so the offer's primary opens the next
 * phase's page and the commitment happens there, in front of the thing being
 * committed to. That also disposes of B2's missing accept-confirmation: the
 * resulting state is visible immediately on return, so there is nothing for a
 * toast to announce.
 *
 * `startThis` AND `notYet` ARE KYLE'S WORDING, flat on the PHASE_PAGE_BODIES
 * precedent. The pack has nothing for a screen it did not know about.
 *
 * "Start this", NOT "Start this phase" OR "Begin". The framework words never
 * reach a user (section 8), and "begin" reads as ceremony on a page whose whole
 * argument is that this is an ordinary next step.
 *
 * `failed` IS APPROVED, AND IT SHIPPED AS A NAMED DEVIATION BEFORE IT WAS.
 * Slice 7a's Step 0 listed the copy the slice needed and Kyle approved two new
 * drafts; this third string was not among them and was added anyway, because the
 * commit control needs an error state for UI Standards 18 and the only existing
 * candidate was TodayHeroCard's local `saveFailed`, which is Jen's and drafted.
 * It landed marked, at a declared +1, flagged in the slice report rather than
 * absorbed into the approved pair.
 *
 * Kyle cleared it on device on 2026-09-10, during walk section I, READ IN THE
 * FAILURE STATE IT OCCUPIES rather than off a list: airplane mode, "Start this",
 * the line under the two controls. That is the strongest form this gate's
 * approval takes, and it is why the marker is gone rather than carried forward.
 */
export const ADVANCE_PREVIEW_COPY = {
  startThis: 'Start this',
  notYet: 'Not yet',
  failed: 'That did not go through. Try again.',
} as const;

/**
 * The label above Today's journey line (D1, slice 7a, roadmap section 9 R6).
 *
 * THE LABEL IS REQUIRED, NOT DECORATIVE, and that is the reason this constant
 * exists at all. The line renders `PHASE_DISPLAY[phase][destination].short`, and
 * several of those sixteen approved strings are imperative-shaped: "Come down a
 * notch", "Clear the distractions". Standing alone above the hero, an imperative
 * reads as TODAY'S INSTRUCTION rather than as journey context, which would put a
 * second thing that looks like an action above the one real action on the
 * screen. The label is what makes the line answer "where am I" instead.
 *
 * ABOVE THE HERO, because the order of the two questions is "where am I" then
 * "what should I do today". A journey line below the day's action would be a
 * footnote to it.
 *
 * NOT A CARD, NOT A CTA, NO STAGE WORD, NO NUMBER. Section 8 keeps the three
 * card ceiling and this is a text row inside it. Stage words were rejected
 * outright at R6: "Stretch 2" and "Stage B" are implementation concepts wearing
 * UX clothes, meaningless without a legend, and a legend on Today is a second
 * thing to read before the daily action.
 *
 * DELIBERATELY NOT COLLAPSED WITH `PHASE_STATE_LABELS.current`, WHICH HOLDS THE
 * SAME THREE WORDS TODAY (Kyle, 2026-09-10). This is a decision, not an
 * oversight, and it is written at BOTH declarations so whoever notices the
 * duplication finds the reason rather than "fixing" it.
 *
 * THEY ANSWER DIFFERENT QUESTIONS ON DIFFERENT SURFACES. `PHASE_STATE_LABELS`
 * is the map's state vocabulary: it labels ONE ROW among four, and its job is to
 * distinguish that row from the Complete, Ahead and Skipped rows beside it. This
 * label introduces a SINGLE LINE on Today, where there is nothing to
 * distinguish it from and its job is to stop an imperative-shaped `short`
 * reading as today's instruction.
 *
 * WHAT COLLAPSING WOULD COST: a future revision to the map's state vocabulary
 * would silently change the Today line. The map has four labels that have to
 * work as a set, so it is the one likelier to be revised, and the revision that
 * makes sense beside Complete and Ahead need not make sense above a phase name
 * on Today. TWO CONSTANTS SHARING A VALUE IS CHEAPER THAN ONE CONSTANT SERVING
 * TWO MEANINGS. The shared value is not the coupling; a shared symbol would be.
 *
 * Sharing the words is itself deliberate while they do share them: one
 * vocabulary across two surfaces is worth more than a second phrasing invented
 * to avoid looking duplicated. They are free to diverge, which is the point.
 */
// COPY: draft, not from guidelines doc - pending Kyle
export const JOURNEY_LINE_LABEL = 'Where you are';

/**
 * The one line under Today's Start here row.
 *
 * A PROP AT THE MOUNT, NOT A SHARED CONSTANT, is the shape slice 5c chose and
 * this honours it: both surfaces call the row the same thing, so
 * `START_HERE_LABEL` is shared, but each surface's video explains a DIFFERENT
 * thing (roadmap section 6 item 9 - the map on Practices, what drives results
 * and why the order on Today), so the gloss belongs to the mount. It lives here
 * rather than inline in DashboardScreen because a user-facing string in a screen
 * body is a string outside the sentinel's habitual reach, which is the trap the
 * slice 6 rider caught with the navigator title.
 *
 * IT DESCRIBES THE VIDEO, NOT THE JOURNEY. The row is an explainer, and a gloss
 * that promised an outcome would make a short video carry a claim.
 */
// COPY: draft, not from guidelines doc - pending Kyle
export const TODAY_START_HERE_GLOSS =
  'A short video on what actually helps, and why the order matters.';

/**
 * The adjustment offer, C2 (slice 7b, roadmap section 9 R5).
 *
 * BUILT FROM `Content Pack v1 decisions section 4`, NEVER FROM `section C2`'s
 * OWN BODY. The pack ships C2 twice and the first one is struck through in the
 * pack itself: "This hasn't felt very useful lately" was revised out by Jen in
 * the same-day decisions addendum for overstating what Vara knows. The title is
 * unchanged between the two versions; the body is not. Anyone who reaches for
 * section 5's body is reading the superseded delivery.
 *
 * THE CARD MUST NEVER NARRATE THE TRIGGER, and the pack says so in its own
 * words: "Do not tell the user that two negative weekly responses triggered
 * this." Two not_moving reads tell us the user does not currently feel
 * movement. They do not tell us the practices were useless, and nothing here
 * may say or imply either. The prohibition survived the revision and applies to
 * both versions.
 *
 * NO NUMBERS, NO COUNTERS, NO FRAMEWORK WORDS on any of these surfaces. Not the
 * two reads, not the two offers, not which offer this is.
 *
 * TWO BODIES, ONE WORD APART, AND THAT WORD IS THE WHOLE OF R5's CONTINUITY.
 * R5 REJECTED the copy clause it was leaning toward: "copy acknowledges the
 * prior choice" reads as a case file, and being quoted back to yourself is the
 * opposite of the peer posture section 8 requires of a decline. What survived
 * is the word "still" and nothing more. `adjustDeclines` picks between them;
 * neither body knows or says how many times the user has been asked.
 *
 * OWNERSHIP, string by string. TWO SOURCES, Jen and Kyle, and the four bullets
 * below group the strings by how they were authored. They do NOT match the
 * five-way partition in copyDraftSentinel.test.ts, which splits the same
 * thirty-two strings by ROUTE TO FLAT and has to sum; that ledger is the
 * arithmetic and this list is the provenance.
 *
 *   - `title` and `confirmation` are JEN'S, pack section C2, landing FLAT under
 *     the pack's own rule: pack strings carry no `COPY: draft` marker and the
 *     sentinel does not count them.
 *   - `bodyFirst` is JEN'S, `decisions section 4` final C2 copy, VERBATIM. Also
 *     flat, also pack.
 *   - `decline`, `primary`, `alternativesIntro` and `failed` are KYLE'S,
 *     authored 2026-09-10, landing flat on the PHASE_PAGE_BODIES precedent:
 *     written by the owner rather than signed off on someone else's draft.
 *     `decline` REPLACES existing wording and is recorded as such below.
 *   - `bodySecond` is KYLE'S TOO but is a different case and is logged as one:
 *     a NEW in-house draft on a C2 surface, cleared by owner sign-off rather
 *     than by replacement, and PENDING JEN REVIEW. See its declaration.
 *
 * `confirmation` SHIPS INERT AND THAT IS DELIBERATE. It is shown when a choice
 * is recorded, and as of 7b recording is all that happens: the protocol serving
 * path does not read `adjustChoice` until slice 7c. "We'll work it this way for
 * now" is a promise about what comes next, which is exactly what a recorded
 * choice is; it does not claim anything has already changed.
 *
 * ---
 *
 * AMENDED 2026-09-12 (slice 7h). JEN REVISED BOTH BODIES AS A PAIR AND HER
 * SIGN-OFF SUPERSEDES KYLE'S ON BOTH. Everything above is left unedited: it is
 * the true record of what was warranted on 2026-09-10 and 2026-09-11, and
 * rewriting it would launder the history this comment exists to hold. This
 * block is the correction and it is the current state.
 *
 * "feeling like it's moving" BECAME "helping" IN BOTH BODIES, and the reason is
 * not cosmetic. The replaced phrasing borrowed the weekly check-in's OWN
 * vocabulary - `moving` / `not_moving` is the C1 answer set - so the card was
 * quietly echoing the user's logged answer back at them. That is the narration
 * `decisions section 4` rejected in the first place, arriving by a route that
 * comment did not anticipate. "helping" makes the same conditional offer
 * without referencing what they told us, and it is what a person actually says
 * about whether something is working.
 *
 * THE OWNERSHIP BULLET FOR `bodySecond` ABOVE IS SUPERSEDED. It is no longer
 * "KYLE'S ... a NEW in-house draft ... PENDING JEN REVIEW". Both bodies are now
 * JEN'S, from the dated 2026-09-12 amendment block appended to
 * `decisions section 4` in the canonical pack, verbatim. Two pack strings, both
 * flat, both landing under the pack's own rule.
 *
 * THE SENTINEL DOES NOT MOVE AND THE ZERO IS THE ENTRY: two approved strings
 * replaced by two approved strings, nothing drafted in either direction. What
 * changed is the ROUTE TO FLAT for `bodySecond` and the strength of its
 * warrant, not the count. The five-way partition in copyDraftSentinel.test.ts
 * is restated there and still sums to thirty-two.
 *
 * `decline`, "Keep going for now", IS APPROVED UNCHANGED and was not touched.
 * `title` and `confirmation` are likewise unchanged.
 */
export const ADJUST_COPY = {
  title: "Let's try a different angle.",
  /**
   * The first proactive offer. `decisions section 4`, verbatim.
   *
   * CONDITIONAL, NOT DECLARATIVE, and Jen's note on why is worth keeping: it
   * "stays conditional rather than declaring an internal state, explains why
   * the card exists", and does not say you failed, the practices did not work,
   * we detected a pattern, or you answered negatively twice.
   *
   * AMENDED 2026-09-12 (slice 7h). The wording is Jen's revision, from the
   * dated amendment block on `decisions section 4`, verbatim. The paragraph
   * above still describes this string exactly - the offer is still conditional
   * and still narrates nothing - so it is kept rather than rewritten. What
   * moved is the phrase: "feeling like it's moving" was the check-in's own
   * answer vocabulary and read as the user being quoted back to themselves.
   *
   * SHE REVISED AN ALREADY-APPROVED STRING, DELIBERATELY, rather than preserve
   * it for provenance. That choice is hers to make and is recorded here so a
   * later reader does not treat the change as drift.
   */
  bodyFirst:
    "If this isn't helping yet, we can change the approach without starting over.",
  /**
   * The second proactive offer. KYLE'S, 2026-09-10.
   *
   * A NEW IN-HOUSE DRAFT, NOT A REPLACEMENT, AND IT IS PENDING JEN REVIEW.
   * The pack writes no second-offer body, so there is no earlier wording for
   * this to supersede: superseding an absence is not superseding anything. It
   * landed as a new drafted string on a C2 surface and Kyle signed it off as
   * owner in the same commit, which is why it carries no marker and why the
   * sentinel did not move. C2 body copy is Jen's, so that sign-off is the
   * WEAKER of the two warrants the sentinel contract recognises. The full
   * entry is in copyDraftSentinel.test.ts.
   *
   * WHAT JEN IS BEING ASKED. Not whether the sentence is good in isolation,
   * but whether the one-word continuity is the right amount. R5 permits
   * exactly this much and rejected more; if she revises `bodyFirst` in
   * `decisions section 4`, this string moves with it rather than drifting.
   *
   * ONE WORD FROM THE FIRST, AND THE WORD IS "still". That is the entire
   * continuity R5 permits: it acknowledges that the user has told us this
   * before without narrating when, how often, or what they chose last time.
   *
   * "yet" DROPS WHEN "still" ARRIVES. Keeping both would read as a correction
   * of the user's own account of their week.
   *
   * ---
   *
   * AMENDED 2026-09-12 (slice 7h). THE FORWARD CLAUSE FOUR PARAGRAPHS UP -
   * "if she revises `bodyFirst` in `decisions section 4`, this string moves
   * with it rather than drifting" - IS NOW DISCHARGED. She did, and it did.
   * The paragraphs above are left unedited as the record of what was true on
   * 2026-09-10; this block is the current state.
   *
   * **"PENDING JEN REVIEW" IS CLOSED.** She reviewed on 2026-09-12 and revised
   * both bodies as a pair. This string is no longer a new in-house draft
   * cleared by an owner sign-off: it is JEN'S, from the dated amendment block
   * on `decisions section 4`, verbatim, exactly like `bodyFirst`.
   *
   * HER SIGN-OFF SUPERSEDES KYLE'S, AND THAT IS A STRENGTHENING RATHER THAN A
   * SWAP. The 2026-09-11 entry recorded his warrant as the WEAKER of the two
   * the sentinel contract recognises, because C2 body copy is Jen's. That
   * weaker warrant no longer applies to this string at all. The +1/-1 route it
   * took to flat is HISTORY, not the live accounting; the live accounting is
   * "pack content, flat, like every other pack string".
   *
   * THE ONE-WORD CONTINUITY SURVIVED THE REVISION INTACT. "still" is still the
   * whole of it, "yet" still drops when "still" arrives, and the two bodies are
   * still exactly one word apart - which is what R5 permits and what
   * `journeyCopy.adjust.test.ts` holds as arithmetic. Jen revising the shared
   * phrasing did not touch the clause that makes them a pair.
   */
  bodySecond:
    "If this still isn't helping, we can change the approach without starting over.",
  /**
   * The primary, on the card and on the phase page's door alike. ONE STRING FOR
   * ONE ACTION: both open the same three alternatives, and two wordings for one
   * door is how a door starts looking like two.
   *
   * KYLE'S, 2026-09-10. Roadmap section 9 R5 writes these words as prose about
   * what stays available; they are not pack content, and this is the same
   * reading `PHASE_STATE_LABELS` took of section 1's prose.
   */
  primary: 'Try a different approach',
  /**
   * The decline. KYLE'S, 2026-09-10, and a REPLACEMENT BY OWNER: it retires the
   * "keep going as is" gloss that roadmap sections 3.1 and 8 both use for this
   * control. That gloss was never copy, it was the roadmap describing the
   * control in passing, and shipping it would have put a description where a
   * label belongs.
   *
   * "for now" IS THE RE-ARM, SAID IN THE USER'S TERMS. A decline answers this
   * week, not the practice (R5), and the label says so without narrating
   * anything about what happens next.
   */
  decline: 'Keep going for now',
  /**
   * The line above the three alternatives on the phase page. KYLE'S, 2026-09-10.
   *
   * IT NAMES THE SHAPE OF THE CHOICE AND NOTHING ELSE. Without it the three
   * options read as three loose controls under a body about the stretch. With
   * it they read as one question with three answers.
   *
   * "for this stretch" IS THE PHASE, IN THE USER'S TERMS. The framework words
   * never reach a user (section 8), and "stretch" is the word the phase page
   * bodies already use.
   */
  alternativesIntro: 'Three ways to change the approach for this stretch.',
  confirmation: "Okay. We'll work it this way for now.",
  /**
   * The failure line, when recording a choice does not land. KYLE'S,
   * 2026-09-10, authored at the point of need rather than after the fact: UI
   * Standards 18 requires an error state for every control that writes, and
   * slice 7a's `ADVANCE_PREVIEW_COPY.failed` is the precedent for what one
   * sounds like here.
   *
   * SUPPORTIVE AND SPECIFIC, AND IT NAMES THE RECOVERY. "when ready" is there
   * because nothing about the user's day has gone wrong and nothing is urgent.
   */
  failed: "That didn't save. Try again when ready.",
} as const;

/** One in-phase alternative: what it is called and what it does. */
export interface AdjustAlternative {
  id: AdjustChoiceId;
  label: string;
  body: string;
}

/**
 * The twelve in-phase alternatives, KEYED BY PHASE (slice 7b).
 *
 * JEN'S, `Content Pack v1 section 5`, adjustment sets, landing FLAT under the
 * pack's rule. Twelve labels and twelve bodies, verbatim.
 *
 * KEYED, NEVER ORDINAL, AND THAT IS THE DECISION THIS CONSTANT EXISTS TO MAKE.
 * The pack names its four sets "first phase", "second phase", "third phase" and
 * "fourth phase". That mapping onto remove/recover/rewire/refocus is inferable
 * from PHASE_ORDER, and inferable is precisely what breaks on a reorder:
 * reordering PHASE_ORDER is a product decision the roadmap explicitly allows
 * ("a product decision that rewrites every user's path"), and an ordinal
 * mapping would silently re-attach the recover set to whichever phase landed
 * second. The ordinal-to-key mapping is asserted once by test and then never
 * relied on again at runtime.
 *
 * THREE PER PHASE, AND THE THREE ARE A SET. The pack's own framing is
 * "constrained in-phase alternatives": every option keeps the user working on
 * the same stretch and changes how. None of them is a way out of the phase, and
 * none may become one. Advancing is B2's job and it is a different offer.
 *
 * NO OPTION IS RECOMMENDED, DEFAULTED OR ORDERED BY QUALITY. The pack's order
 * is the pack's; nothing renders a first choice differently from a third.
 */
export const ADJUST_ALTERNATIVES: Record<PhaseKey, readonly AdjustAlternative[]> = {
  remove: [
    {
      id: 'make_it_smaller',
      label: 'Make it smaller',
      body: "Keep working on the same thing, but make today's move easier.",
    },
    {
      id: 'try_another_way',
      label: 'Try another way',
      body: 'Keep the same target and approach it differently.',
    },
    {
      id: 'work_on_something_else',
      label: 'Work on something else',
      body: "Choose a different thing that's taking up too much room.",
    },
  ],
  recover: [
    {
      id: 'help_me_come_down',
      label: 'Help me come down',
      body: 'Try practices that reduce input and help you leave some of the day behind.',
    },
    {
      id: 'help_me_get_something_back',
      label: 'Help me get something back',
      body: 'Lean toward rest, light, movement, and other small ways to restore some capacity.',
    },
    {
      id: 'help_me_get_re_oriented',
      label: 'Help me get re-oriented',
      body: 'Use simple resets that help you find your footing when the day feels scattered.',
    },
  ],
  rewire: [
    {
      id: 'make_it_easier',
      label: 'Make it easier',
      body: 'Shrink the practice until it fits more kinds of days.',
    },
    {
      id: 'put_it_somewhere_better',
      label: 'Put it somewhere better',
      body: 'Move it to a point in the day where it has a better chance of happening.',
    },
    {
      id: 'give_it_a_stronger_cue',
      label: 'Give it a stronger cue',
      body: 'Connect it to something that already happens without much thought.',
    },
  ],
  refocus: [
    {
      id: 'narrow_what_matters',
      label: 'Narrow what matters',
      body: 'Choose one thing that deserves more of your attention or energy right now.',
    },
    {
      id: 'give_it_some_room',
      label: 'Give it some room',
      body: 'Protect a clear place in the day for it.',
    },
    {
      id: 'come_back_to_why',
      label: 'Come back to why',
      body: 'Reconnect this work to what you wanted to change when you started.',
    },
  ],
};
