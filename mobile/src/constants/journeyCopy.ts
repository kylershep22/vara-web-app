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
import type { DestinationKey, PhaseKey } from '../types/models';

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
 * DRAFTED IN-HOUSE, OWNER KYLE, AND THE SENTINEL MOVES FOR ALL FIVE STRINGS IN
 * THIS BLOCK. Not pack content: Content Pack v1 delivers 16 titles, 16 glosses
 * and 16 shorts, and the roadmap never specifies a phase page's body.
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
  // COPY: draft, not from guidelines doc - pending Kyle
  remove:
    'Every journey starts here, whatever you came for. Before anything gets added, one thing that keeps taking from you gets smaller. It is the quickest way to get something back.',
  // COPY: draft, not from guidelines doc - pending Kyle
  recover:
    'This stretch is about coming back after the day takes something out of you. You find which small resets actually give you usable room again, so a hard day costs you less than it used to.',
  // COPY: draft, not from guidelines doc - pending Kyle
  rewire:
    'This stretch is about the patterns underneath the day rather than the day itself. It comes later on purpose: it asks more of you than the stretches before it, and it lands better once you have room to work with.',
  // COPY: draft, not from guidelines doc - pending Kyle
  refocus:
    'This stretch is where the room you made gets spent. It goes to the things you wanted more of, rather than to whatever asks loudest.',
};

/**
 * The one line the remove page adds when a replacement intention is stored.
 *
 * RENDERS ONLY BESIDE A CURATED LABEL, never alone and never with the user's own
 * words. `removeTargetText` is not echoed on any phase page (Kyle, 2026-09-09):
 * its single echo point stays at the capture confirmation, because reflecting a
 * person's own sentence back at them days later is a different act from showing
 * it to them as they type it.
 */
export const PHASE_PAGE_COPY = {
  // COPY: draft, not from guidelines doc - pending Kyle
  replacementLeadIn: 'What you chose instead',
} as const;
