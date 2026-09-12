/**
 * Protocol matrix — 4 outcomes x 3 capacities, each cell an ORDERED SET of
 * time variants (spec 6.2, reshaped per roadmap 3b-ii-a).
 *
 * NAMING: this module is called the "weekly" engine for historical reasons.
 * The content here is the DAILY protocol — the behavioural action the user does
 * and marks done. Capacity stopped being weekly in 3b-i. A rename is tracked
 * separately; do not do it here.
 *
 * WHY A CELL IS AN ARRAY. Time is now its own question, and a cell has to be
 * able to answer it. An array was chosen over explicit time keys
 * (`Record<TimeClass, ProtocolVariant>`) because that shape leaves exactly ONE
 * protocol after the time filter, and the "see other options" rotation that
 * follows in 3b-iii would have nothing to rotate through. An array supports two
 * or more variants sharing a time class, which is what rotation needs, and it
 * carries its own order, which an object does not.
 *
 * WHAT THAT COSTS. The old shape was total by construction: one protocol per
 * cell, so a lookup could not miss. An array can be missing the class the caller
 * asks for, so totality is now a RULE IN `selectProtocol` rather than a property
 * of the type, and a test holds it there. That is a weaker guarantee and it is
 * stated plainly rather than assumed.
 *
 * This file is DATA, not logic. Every user-facing string below is AUTHORED
 * CONTENT owned and approved by Jen, and it drops in here without any code
 * change. The one exception is `rewire`, whose three build-walk stand-ins carry
 * `placeholder: true` and a "[PLACEHOLDER] " title prefix; no user reaches that
 * phase until slice 5. Do not ship placeholder copy.
 *
 * PROVENANCE. Remove's nine came from slices 3a and 3c-i. Recover's nine and
 * Refocus's three landed in slice 7i from Content Pack v1 `§protocol-copy`,
 * replacing the `PLACEHOLDER [Jen]` stand-ins that had stood since the re-tag.
 * Every `whyItWorks` string is therefore authored and clinically reviewed, and
 * none of the 21 is rendered on any surface a user reaches today: the slice 9
 * behavioral screen is what they are held for.
 *
 * ESTIMATED MINUTES ARE NOT CORROBORATED BY THE COPY, and that is new. The old
 * stand-ins stated their duration in the text ("10-min extended exhale"); none
 * of Jen's does. `estMinutes` is now the only place a duration lives, so a
 * number that stops matching the action it sits beside will not be visible in
 * the string. Change one and read the other.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */
import type { CapacityTier, OutcomeKey, TimeClass, ProtocolVariant } from './types';
import type { PhaseKey, RemoveFamily } from '../types/models';
// PHASE_ORDER is the ONE definition of phase order (journey slice 1). Imported
// rather than restated: a second list here is exactly how the engine and the
// journey service start disagreeing about what comes after 'remove'.
// constants/journey has no runtime imports of its own, so this edge is a leaf.
import { PHASE_ORDER } from '../constants/journey';

/**
 * Placeholder quick-win practice: the short extended exhale appended to every
 * week-1 protocol (spec 6.3).
 *
 * Points at a REAL catalog id. It previously read `exhale-90s`, which no
 * practice has ever had, so the reference resolved to nothing anywhere it was
 * followed. `extended-exhale-2` is the shipped 120-second version in
 * `constants/brainStateProtocols`. This is a plain string, so naming it here
 * creates no import and the engine separation documented in `types.ts` holds.
 */
export const DEFAULT_QUICK_WIN_PRACTICE_ID = 'extended-exhale-2';

/**
 * Time-class order, SHORTEST FIRST, and the single place that order lives.
 *
 * Mirrors `CAPACITY_TIERS` below and exists for the same reason: the fallback in
 * `selectProtocol` walks toward shorter variants, and a second hard-coded order
 * is the failure mode that would let the two disagree. Reordering this array
 * re-derives the fallback.
 */
export const TIME_CLASSES: readonly TimeClass[] = ['short', 'medium', 'long'];

/**
 * The class assumed when nobody has answered the time question.
 *
 * THE SEAM FOR 3b-ii-b. Until the picker ships there is no stored time, so the
 * Today card passes this. It is the middle class deliberately: falling back from
 * medium reaches short, so a cell authored at either end still resolves without
 * overrunning, and no cell is served something longer than a real answer could
 * have asked for.
 *
 * When the picker lands, the stored answer replaces this at the call site. It
 * survives as the pre-pick default and as the day-one value.
 */
export const DEFAULT_TIME_CLASS: TimeClass = 'medium';

/**
 * The inclusive upper bound of each class, in minutes. A variant belongs to the
 * FIRST class whose bound it fits under, which makes the classes exclusive of
 * one another and gives every `estMinutes` exactly one home.
 *
 * The picker's user-facing labels ("10-15", "15+") are approximations of these
 * for a human reading a sheet. These numbers are the contract.
 */
export const TIME_CLASS_MAX_MINUTES: Record<TimeClass, number> = {
  short: 5,
  medium: 15,
  long: Number.POSITIVE_INFINITY,
};

/** The class a duration belongs to. The single mapping from minutes to bucket. */
export function timeClassForMinutes(minutes: number): TimeClass {
  return (
    TIME_CLASSES.find((c) => minutes <= TIME_CLASS_MAX_MINUTES[c]) ??
    TIME_CLASSES[TIME_CLASSES.length - 1]
  );
}

const protocol = (
  phase: PhaseKey,
  capacity: CapacityTier,
  fields: Pick<ProtocolVariant, 'name' | 'dailyAction' | 'estMinutes' | 'whyItWorks'> &
    Partial<
      Pick<
        ProtocolVariant,
        | 'quickWinPracticeId'
        | 'supportingPracticeIds'
        | 'destinationWeight'
        | 'placeholder'
        | 'family'
        | 'acknowledgment'
      >
    >
): ProtocolVariant => {
  // Derived, never passed in: a hand-written class could disagree with the
  // minutes beside it, and the whole point of the class is to describe them.
  const timeClass = timeClassForMinutes(fields.estMinutes);
  // The "[PLACEHOLDER] " prefix is applied HERE rather than typed into every
  // stand-in title, so the marker cannot drift from the `placeholder` flag that
  // the merge gate reads. One fact, one place.
  const name = fields.placeholder ? `[PLACEHOLDER] ${fields.name}` : fields.name;
  return {
    id: `${phase}-${capacity}`,
    variantKey: `${phase}-${capacity}-${timeClass}`,
    phase,
    capacity,
    timeClass,
    quickWinPracticeId: DEFAULT_QUICK_WIN_PRACTICE_ID,
    // EMPTY ON EVERY VARIANT, AND THAT IS THE CURRENT STATE OF THE BRIDGE.
    //
    // TWO SEPARATE CONTENT SYSTEMS (Content Pack v1, decisions section 2,
    // approved 2026-09-05). They are not interchangeable and they share no id
    // space:
    //
    //   1. The RUNNABLE PRACTICE CATALOG, constants/brainStateProtocols.ts:
    //      14 variants across 10 families. Guided, timed, has a player.
    //   2. The DAILY PROTOCOL GRID, this file. Behavioural actions the user
    //      reads and marks done. Never runnable, no player, no audio.
    //
    // THE RULE: Recover must NOT reference runnable-practice IDs until the
    // mapping is explicitly authored. Titles that look alike do NOT mean the
    // systems are connected. "One anchor cue", "Morning light", "Exhale and
    // unplug" and the rest of the recover rows are GRID content with no catalog
    // counterpart, and reading them as catalog practices is the specific
    // mistake this note exists to prevent.
    //
    // The intended shape is `daily protocol -> optional supporting runnable
    // practice`: a Recover protocol can ask the user to take two minutes to
    // bring things down and then launch `extended-exhale-2` as its support.
    // Populate this array deliberately, per variant, as part of authoring that
    // integration. Do not bulk-fill it by title match.
    //
    // NOT SLICE 5, AND NOT ENGINEERING'S TO AUTHOR AT ALL (Kyle, 2026-09-09;
    // journey roadmap section 5, the 2026-09-09 amendment). Which runnable
    // practice supports which daily protocol is a CLINICAL JUDGMENT. It belongs
    // to Jen, arrives as a delivered table, and is built as its own small slice
    // against that table. Slice 5 was named as the owner here and no longer is;
    // an engineer choosing the pairings is unauthored content entering the app
    // through an engineering decision, which is the thing the content gates
    // exist to stop.
    //
    // SO THIS STAYS EMPTY, AND THE EMPTINESS IS THE DOCUMENTED STATE RATHER
    // THAN AN OUTSTANDING TASK. The bridge is empty, the daily serve launches
    // nothing, and no surface reads this field. Anyone finding it empty has
    // found the recorded state, not a gap to close. The two-systems rule above
    // is what makes that safe rather than merely empty.
    supportingPracticeIds: [],
    ...fields,
    name,
  };
};

/** The prefix every placeholder title carries. The merge gate greps for it. */
export const PLACEHOLDER_TITLE_PREFIX = '[PLACEHOLDER] ';

export type ProtocolVariantMatrix = Record<
  PhaseKey,
  Record<CapacityTier, ProtocolVariant[]>
>;

/**
 * WHICH CELL EACH ROW SITS IN (journey roadmap 3.2). Slice 3a re-tagged twelve
 * rows without editing them; slice 7i then REPLACED all twelve with Jen's
 * authored copy. The cells are unchanged since the re-tag:
 *
 *   focus              -> refocus   (3 rows, one per capacity)
 *   stress + energy    -> recover   (6 rows)
 *   routines           -> recover   (3 rows; routines are recovery
 *                                    infrastructure, per Jen section 5)
 *
 * `retagParity.test.ts` used to pin those twelve strings character-for-
 * character as proof the 3a move was a move. 7i deleted it, on the lifetime its
 * own header declared: once the strings are legitimately gone, a fixture
 * restating them asserts the absence of the wrong thing. Its three live
 * invariants moved to `selectProtocol.test.ts` first.
 *
 * `recover` therefore holds THREE variants per capacity tier, which is the
 * first time a cell has held more than one. Some of them share a time class,
 * so `pickVariant` can no longer assume the class it finds is the only
 * candidate; `orderForDestination` is what decides which of them leads.
 *
 * `rewire` IS THE ONLY PHASE STILL HOLDING PLACEHOLDERS, and after slice 7i it
 * holds all three that remain in the matrix. Its stand-ins carry
 * `placeholder: true` and a title prefixed "[PLACEHOLDER] ", they exist so the
 * surface can be walked end to end, and no user reaches the phase until slice
 * 5. `remove` held placeholders too until slice 3a authored it.
 *
 * THEY MUST NOT SHIP. Two tests hold that, and they hold different halves of
 * it. `__tests__/protocolMatrix.removeCellsAuthored.test.ts` fails while any
 * placeholder sits in a `remove` cell, which was slice 3a's merge gate. Since
 * 7i, `__tests__/selectProtocol.test.ts` additionally asserts that no variant
 * in `recover` or `refocus` carries the flag either. The remove gate says
 * NOTHING about those two phases and never did: the twelve strings 7i replaced
 * carried a source annotation, not the flag, so that gate was green before and
 * after them.
 *
 * The off-diagonal time slots remain genuinely unauthored, and are still NOT
 * filled with copies of a neighbour: smearing the same actions across the grid
 * would report a full matrix to the one person who most needs to see the gaps.
 * `unauthoredVariants()` below names every missing triple.
 */
export const PROTOCOL_MATRIX: ProtocolVariantMatrix = {
  remove: {
    normal: [
      protocol('remove', 'normal', {
        name: 'Make it harder to reach',
        dailyAction:
          'Pick one piece of friction and put it in place today. Charger out of the bedroom, app off the home screen, remote in a drawer. Small is fine.',
        estMinutes: 20,
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          "Automatic habits are easier to interrupt when the environment changes first. Make the usual choice slightly harder now, so you're not relying on willpower later.",
        family: 'behavioral',
        acknowledgment: 'Nice. That\'s in place.',
      }),
      protocol('remove', 'normal', {
        family: 'mental',
        name: 'Give the thought a time',
        dailyAction:
          'When it shows up, write one line: what it is, and when you\'ll deal with it. Then put the pen down. You\'ve answered it.',
        estMinutes: 20,
        acknowledgment: "It's on paper now, not on you.",
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          "A thought keeps replaying when it has nowhere to go. A written plan can quiet it in a way pushing it away doesn't.",
      }),
      protocol('remove', 'normal', {
        family: 'interpersonal',
        name: 'Decide one boundary',
        dailyAction:
          'Pick one small limit and put it in place today. A shorter call, a topic you won\'t pick up, a reply that waits until tomorrow.',
        estMinutes: 20,
        acknowledgment: 'Good. You made some room.',
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          "A draining interaction costs less when you've decided its shape in advance. One boundary, chosen ahead of time, does the work in the moment.",
      }),
    ],
    limited: [
      protocol('remove', 'limited', {
        name: 'Catch the moment it starts',
        dailyAction:
          'Just notice it once today. The reach, the tap, the time on the clock. One line to yourself: "It starts when..." That\'s the whole practice.',
        estMinutes: 10,
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          "You can't change a pattern you never catch. Noticing where it starts gives you something specific to work with.",
        family: 'behavioral',
        acknowledgment: 'You caught it. That\'s useful.',
      }),
      protocol('remove', 'limited', {
        family: 'mental',
        name: 'Name it once',
        dailyAction:
          'When the loop starts today, say what it\'s actually about, in one line, out loud or on paper. Nothing else required.',
        estMinutes: 10,
        acknowledgment: 'You caught it. That\'s useful.',
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          'Naming a thought can put a little distance between you and it. The volume tends to come down from there.',
      }),
      protocol('remove', 'limited', {
        family: 'interpersonal',
        name: 'Notice what it costs',
        dailyAction:
          'After the next interaction, take one breath and notice where it landed. Shoulders, jaw, mood.',
        estMinutes: 10,
        acknowledgment: 'You caught it. That\'s useful.',
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          'Seeing the cost clearly is the first boundary. The next one tends to be easier to draw.',
      }),
    ],
    slammed: [
      protocol('remove', 'slammed', {
        name: 'Interrupt it once',
        dailyAction:
          'When you notice it today, make one small break in the pattern. Put the phone down, step away, silence one thing. Even two minutes counts.',
        estMinutes: 5,
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          'A pattern loosens a little every time it gets interrupted. One small break is enough on a day like this.',
        family: 'behavioral',
        acknowledgment: 'That\'s time you took back.',
      }),
      protocol('remove', 'slammed', {
        family: 'mental',
        name: 'Two minutes somewhere else',
        dailyAction:
          'When it starts, change what your body is doing. Stand up, change rooms, run cold water over your hands.',
        estMinutes: 5,
        acknowledgment: 'That\'s time you took back.',
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          "When thoughts won't move, the body is the better lever. A change of place can break the grip for a moment, and a moment is enough today.",
      }),
      protocol('remove', 'slammed', {
        family: 'interpersonal',
        name: 'Take one exit',
        dailyAction:
          'Give yourself one out today. End a conversation a few minutes early, step outside, let a message sit.',
        estMinutes: 5,
        acknowledgment: 'Good. You made some room.',
        // `whyItWorks` IS NOT RENDERED ON ANY SURFACE A JOURNEY USER REACHES.
        // Its one call site WAS WeeklyOpenScreen, which is DELETED (journey
        // slice 3b). RETAINED DELIBERATELY, not stranded: this is authored
        // content, it is held for the Practices phase detail pages (roadmap §5
        // row 5), and deleting it to satisfy a dead-code sweep would mean
        // re-authoring it. Unrendered today, rendered from the slice 9
        // behavioral screen.
        whyItWorks:
          'On a low day, the boundary is the exit. Taking it once is enough.',
      }),
    ],
  },
  recover: {
    normal: [
      protocol('recover', 'normal', {
        name: 'Downshift, then unplug',
        dailyAction:
          'Use a slower, longer exhale to bring the pace down, then take one part of the afternoon fully off-screen. Put the phone out of reach and let the break be a break.',
        estMinutes: 15,
        whyItWorks:
          'Slowing the breath can help you settle, and a real break gives your attention fewer demands to keep processing.',
      }),
      protocol('recover', 'normal', {
        name: 'Build a recovery anchor',
        dailyAction:
          'Choose three small actions and do them in the same order when you need to reset. Water, a few slow breaths, a short walk. Keep the sequence simple enough to repeat.',
        estMinutes: 10,
        whyItWorks:
          'Repeating the same sequence reduces the decisions required to start recovering and makes the routine easier to return to.',
      }),
      protocol('recover', 'normal', {
        name: 'Set the morning signal',
        dailyAction:
          'Get outside soon after waking, move your body a little, and keep your wake time steady. The goal is a repeatable start, not a perfect morning.',
        estMinutes: 20,
        whyItWorks:
          'Daylight, movement, and a consistent wake time reinforce the cues that help your body know when to be alert and when to wind down.',
      }),
    ],
    limited: [
      protocol('recover', 'limited', {
        name: 'Exhale, then step away',
        dailyAction:
          "Spend a few minutes slowing the exhale, then step away from screens or demands for a real break. Nothing to catch up on while you're there.",
        estMinutes: 10,
        whyItWorks:
          'Pairing a physical downshift with fewer incoming demands gives both body and attention a chance to reset.',
      }),
      protocol('recover', 'limited', {
        name: 'Use a two-part reset',
        dailyAction:
          'Choose two small actions and repeat them in the same order when you need a reset. Water then a stretch. A few slow breaths then a walk. Keep it easy to start.',
        estMinutes: 6,
        whyItWorks:
          'A short, repeatable sequence gives you a reliable way to shift state without deciding what to do each time.',
      }),
      protocol('recover', 'limited', {
        name: 'Start with light',
        dailyAction:
          "Get outside after you wake and spend a little time in daylight. Before bed, set tomorrow's wake time close to today's. That's enough for today.",
        estMinutes: 10,
        whyItWorks:
          'Morning light and a steadier wake time strengthen the daily timing cues that support energy and sleep.',
      }),
    ],
    slammed: [
      protocol('recover', 'slammed', {
        name: 'Lengthen the exhale',
        dailyAction:
          "For a few minutes, let each exhale run a little longer than the inhale. Don't force a deep breath; just slow the pace.",
        estMinutes: 5,
        whyItWorks:
          'A longer exhale can help shift the body out of a keyed-up state without asking much from you.',
      }),
      protocol('recover', 'slammed', {
        name: 'Use one recovery cue',
        dailyAction:
          'Pick one small action and tie it to something that already happens every day. Step outside after coffee. Take a slow breath when you close the laptop. One cue is enough.',
        estMinutes: 2,
        whyItWorks:
          'Attaching a reset to an existing cue makes it easier to remember and easier to repeat when your capacity is low.',
      }),
      protocol('recover', 'slammed', {
        name: 'Get some morning light',
        dailyAction:
          "Step outside after you wake and spend a few minutes in daylight. That's the whole practice today.",
        estMinutes: 5,
        whyItWorks:
          'Morning daylight gives your body a clear daytime signal with almost no decision-making required.',
      }),
    ],
  },
  rewire: {
    normal: [
      protocol('rewire', 'normal', {
        // PLACEHOLDER, not shippable. See the merge gate in
        // __tests__/protocolMatrix.removeCellsAuthored.test.ts.
        name: 'Build-walk stand-in, normal capacity',
        dailyAction: 'Mark today done when you have done one thing that fits.',
        estMinutes: 20,
        whyItWorks:
          'Stand-in rationale so the card renders end to end during the build walk. Jen authors the real one.',
        placeholder: true,
      }),
    ],
    limited: [
      protocol('rewire', 'limited', {
        // PLACEHOLDER, not shippable. See the merge gate in
        // __tests__/protocolMatrix.removeCellsAuthored.test.ts.
        name: 'Build-walk stand-in, limited capacity',
        dailyAction: 'Mark today done when you have done one thing that fits.',
        estMinutes: 10,
        whyItWorks:
          'Stand-in rationale so the card renders end to end during the build walk. Jen authors the real one.',
        placeholder: true,
      }),
    ],
    slammed: [
      protocol('rewire', 'slammed', {
        // PLACEHOLDER, not shippable. See the merge gate in
        // __tests__/protocolMatrix.removeCellsAuthored.test.ts.
        name: 'Build-walk stand-in, slammed capacity',
        dailyAction: 'Mark today done when you have done one thing that fits.',
        estMinutes: 5,
        whyItWorks:
          'Stand-in rationale so the card renders end to end during the build walk. Jen authors the real one.',
        placeholder: true,
      }),
    ],
  },
  refocus: {
    normal: [
      protocol('refocus', 'normal', {
        name: 'Protect one focus block',
        dailyAction:
          "Choose one thing that matters, close everything that doesn't serve it, and work on only that until the block ends. Then get away from the screen before you decide what's next.",
        estMinutes: 30,
        whyItWorks:
          'Removing task-switching gives your attention a better chance to stay with one problem long enough to make meaningful progress.',
      }),
    ],
    limited: [
      protocol('refocus', 'limited', {
        name: 'Clear the lane',
        dailyAction:
          "Pick one task and give it your full attention for one short block. Close the extra tabs, silence the pings, and leave the rest alone until you're done.",
        estMinutes: 15,
        whyItWorks:
          'Reducing competing cues makes it easier to hold the task in mind and lowers the cost of switching.',
      }),
    ],
    slammed: [
      protocol('refocus', 'slammed', {
        name: 'Give one thing a start',
        dailyAction:
          "Choose one task and work only on the first piece of it. Close the extra tabs and stop when the block ends, even if there's more to do.",
        estMinutes: 5,
        whyItWorks:
          'A small, defined start lowers the effort required to begin and gives scattered attention one place to land.',
      }),
    ],
  },
};
/**
 * LEGACY. The four weekly outcomes, in the order the weekly open renders them.
 *
 * NO LONGER A MATRIX AXIS. Two live consumers remain and both are scheduled:
 * Onboarding V3
 * step 2 (rekeys to DestinationKey in slice 4). Do not add a third.
 */
export const OUTCOME_KEYS: readonly OutcomeKey[] = ['focus', 'stress', 'routines', 'energy'];
export const CAPACITY_TIERS: readonly CapacityTier[] = ['normal', 'limited', 'slammed'];

/** Every variant in the matrix, phase-major then capacity then time order. */
export function allProtocols(): ProtocolVariant[] {
  return PHASE_ORDER.flatMap((phase) =>
    CAPACITY_TIERS.flatMap((capacity) => PROTOCOL_MATRIX[phase][capacity])
  );
}

/** One unwritten slot in the phase x capacity x time grid. */
export interface UnauthoredVariant {
  phase: PhaseKey;
  capacity: CapacityTier;
  timeClass: TimeClass;
}

/**
 * Every grid slot with no variant of its own, which the fallback covers.
 *
 * THIS IS THE CONTENT BRIEF, and it is a function rather than a comment so it
 * cannot drift from the matrix it describes. Adding a variant removes its slot
 * from this list automatically; a test pins the current count so the gap cannot
 * quietly widen either.
 *
 * Deliberately not rendered anywhere. It reports what is missing to the people
 * writing it, and never stands in for content on a user's card.
 */
export function unauthoredVariants(): UnauthoredVariant[] {
  return PHASE_ORDER.flatMap((phase) =>
    CAPACITY_TIERS.flatMap((capacity) =>
      TIME_CLASSES.filter(
        (timeClass) =>
          !PROTOCOL_MATRIX[phase][capacity].some((v) => v.timeClass === timeClass)
      ).map((timeClass) => ({ phase, capacity, timeClass }))
    )
  );
}
