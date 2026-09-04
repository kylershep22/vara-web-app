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
 * This file is DATA, not logic. Every user-facing string below is a
 * PLACEHOLDER [Jen]: draft daily actions come from spec 6.2, and names,
 * estimated minutes, and rationale are build-and-test stand-ins. Jen owns the
 * final content, which drops in here without any code change. Do not ship
 * placeholder copy.
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
 * RE-TAGGED, NOT REWRITTEN (journey roadmap 3.2). The twelve authored rows are
 * character-for-character the ones that shipped; only the cell they sit in
 * changed:
 *
 *   focus              -> refocus   (3 rows, one per capacity)
 *   stress + energy    -> recover   (6 rows)
 *   routines           -> recover   (3 rows; routines are recovery
 *                                    infrastructure, per Jen section 5)
 *
 * `recover` therefore holds THREE variants per capacity tier, which is the
 * first time a cell has held more than one. Some of them share a time class,
 * so `pickVariant` can no longer assume the class it finds is the only
 * candidate; `orderForDestination` is what decides which of them leads.
 *
 * `remove` and `rewire` ARE NET-NEW AND HOLD PLACEHOLDERS. This reverses the
 * rule the previous version of this comment stated, and the reversal is
 * deliberate rather than an oversight: every user is in `remove` under
 * JOURNEY_IA, so an empty remove cell is not a gap that falls back, it is a
 * blank card. The placeholders exist so the surface can be walked end to end
 * before Jen's content lands.
 *
 * THEY MUST NOT SHIP. Every one carries `placeholder: true` and a title
 * prefixed "[PLACEHOLDER] ", and
 * `__tests__/protocolMatrix.removeCellsAuthored.test.ts` FAILS while any of
 * them is still in a remove cell. That failing test is this slice's merge gate.
 * Rewire placeholders may outlive the gate: no user reaches rewire until
 * slice 5.
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
        name: 'Exhale and unplug', // PLACEHOLDER [Jen]
        dailyAction: '10-min extended exhale, plus an afternoon device-free break', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 15, // PLACEHOLDER [Jen]
        whyItWorks:
          'Breathing out for longer than you breathe in engages the parasympathetic branch and lowers arousal, and an afternoon break stops stress stacking through the day.', // PLACEHOLDER [Jen]
      }),
      protocol('recover', 'normal', {
        name: 'Three-step anchor', // PLACEHOLDER [Jen]
        dailyAction: 'One 3-step anchor routine, same order daily', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 10, // PLACEHOLDER [Jen]
        whyItWorks:
          'Running the same steps in the same order lets each step cue the next, so the sequence needs less deliberate effort over time.', // PLACEHOLDER [Jen]
      }),
      protocol('recover', 'normal', {
        name: 'Light, movement, steady wake', // PLACEHOLDER [Jen]
        dailyAction:
          'Morning light within 30 min of waking, plus movement and a consistent wake time', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 20, // PLACEHOLDER [Jen]
        whyItWorks:
          'Early daylight and a steady wake time are the strongest signals for the body clock, and morning movement reinforces the same timing.', // PLACEHOLDER [Jen]
      }),
    ],
    limited: [
      protocol('recover', 'limited', {
        name: 'Exhale and a break', // PLACEHOLDER [Jen]
        dailyAction: '5-min extended exhale, plus a break', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 10, // PLACEHOLDER [Jen]
        whyItWorks:
          'A shorter exhale practice still shifts arousal down, and pairing it with a break gives the effect somewhere to land.', // PLACEHOLDER [Jen]
      }),
      protocol('recover', 'limited', {
        name: 'Two-step anchor', // PLACEHOLDER [Jen]
        dailyAction: 'A 2-step anchor routine', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 6, // PLACEHOLDER [Jen]
        whyItWorks:
          'Two steps is short enough to survive a busy week and still long enough to form a sequence.', // PLACEHOLDER [Jen]
      }),
      protocol('recover', 'limited', {
        name: 'Light and steady wake', // PLACEHOLDER [Jen]
        dailyAction: 'Morning light, plus a consistent wake time', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 10, // PLACEHOLDER [Jen]
        whyItWorks:
          'Light exposure and wake timing carry most of the effect, so they are what stays when movement drops off.', // PLACEHOLDER [Jen]
      }),
    ],
    slammed: [
      protocol('recover', 'slammed', {
        name: 'Five-minute exhale', // PLACEHOLDER [Jen]
        dailyAction: '5-min extended exhale', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 5, // PLACEHOLDER [Jen]
        whyItWorks:
          'Extending the exhale works within minutes, which is why it holds up on the weeks nothing else does.', // PLACEHOLDER [Jen]
      }),
      protocol('recover', 'slammed', {
        name: 'One anchor cue', // PLACEHOLDER [Jen]
        dailyAction: 'One anchor cue at the same time daily', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 2, // PLACEHOLDER [Jen]
        whyItWorks:
          'Holding the timing steady keeps the cue in place, which is the part a routine is rebuilt from later.', // PLACEHOLDER [Jen]
      }),
      protocol('recover', 'slammed', {
        name: 'Morning light', // PLACEHOLDER [Jen]
        dailyAction: 'Morning light only', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 5, // PLACEHOLDER [Jen]
        whyItWorks:
          'Getting outside shortly after waking is a few minutes of effort for the single largest timing signal available.', // PLACEHOLDER [Jen]
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
        name: 'Deep work block', // PLACEHOLDER [Jen]
        dailyAction: 'One 25-min single-task block, then a device-free break', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 30, // PLACEHOLDER [Jen]
        whyItWorks:
          'Sustained attention on one task avoids the switching cost of juggling several, and a break without a screen lets attention recover before the next block.', // PLACEHOLDER [Jen]
      }),
    ],
    limited: [
      protocol('refocus', 'limited', {
        name: 'Short focus block', // PLACEHOLDER [Jen]
        dailyAction: 'One 15-min single-task block', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 15, // PLACEHOLDER [Jen]
        whyItWorks:
          'A shorter block keeps the same single-task structure at a length that still fits a full day.', // PLACEHOLDER [Jen]
      }),
    ],
    slammed: [
      protocol('refocus', 'slammed', {
        name: 'One thing, five minutes', // PLACEHOLDER [Jen]
        dailyAction: '5 min on one thing, every other tab closed', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 5, // PLACEHOLDER [Jen]
        whyItWorks:
          'Closing the other tabs removes the cues that pull attention away, so five minutes is enough to get one thing moving.', // PLACEHOLDER [Jen]
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
