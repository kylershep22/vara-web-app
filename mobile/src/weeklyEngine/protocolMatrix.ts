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
  outcome: OutcomeKey,
  capacity: CapacityTier,
  fields: Pick<ProtocolVariant, 'name' | 'dailyAction' | 'estMinutes' | 'whyItWorks'> &
    Partial<Pick<ProtocolVariant, 'quickWinPracticeId' | 'supportingPracticeIds'>>
): ProtocolVariant => {
  // Derived, never passed in: a hand-written class could disagree with the
  // minutes beside it, and the whole point of the class is to describe them.
  const timeClass = timeClassForMinutes(fields.estMinutes);
  return {
    id: `${outcome}-${capacity}`,
    variantKey: `${outcome}-${capacity}-${timeClass}`,
    outcome,
    capacity,
    timeClass,
    quickWinPracticeId: DEFAULT_QUICK_WIN_PRACTICE_ID,
    supportingPracticeIds: [],
    ...fields,
  };
};

export type ProtocolVariantMatrix = Record<
  OutcomeKey,
  Record<CapacityTier, ProtocolVariant[]>
>;

/**
 * THE AUTHORED CONTENT SITS ON THE DIAGONAL, and that is the honest state of it.
 *
 * These 12 rows were written when capacity WAS the time proxy, so each one is
 * simultaneously a readiness level and a duration: the normal-capacity focus
 * protocol is also the long one, the slammed-capacity focus protocol is also the
 * short one. Re-indexing them onto the time axis therefore gives every cell
 * exactly ONE variant, whose class is whatever its minutes imply.
 *
 * The off-diagonal cells (high readiness with five minutes; slammed with forty)
 * are genuinely unauthored. They are NOT filled with copies of a neighbour,
 * because smearing the same twelve actions across thirty-six slots would report
 * a full grid to the one person who most needs to see the gaps. They are also
 * NOT filled with placeholder variants, because a placeholder that wins the time
 * filter renders "[COPY GAP]" onto a real user's card. Instead the cell stays
 * short, `selectProtocol` falls back, and `unauthoredVariants()` below names
 * every missing triple so the gap is legible without being shippable.
 *
 * Consequence worth stating: until the off-diagonal is written, the time
 * question cannot change what a given cell serves. The picker in 3b-ii-b will
 * ask it and the answer will resolve to the same protocol.
 */
export const PROTOCOL_MATRIX: ProtocolVariantMatrix = {
  focus: {
    normal: [
      protocol('focus', 'normal', {
        name: 'Deep work block', // PLACEHOLDER [Jen]
        dailyAction: 'One 25-min single-task block, then a device-free break', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 30, // PLACEHOLDER [Jen]
        whyItWorks:
          'Sustained attention on one task avoids the switching cost of juggling several, and a break without a screen lets attention recover before the next block.', // PLACEHOLDER [Jen]
      }),
    ],
    limited: [
      protocol('focus', 'limited', {
        name: 'Short focus block', // PLACEHOLDER [Jen]
        dailyAction: 'One 15-min single-task block', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 15, // PLACEHOLDER [Jen]
        whyItWorks:
          'A shorter block keeps the same single-task structure at a length that still fits a full day.', // PLACEHOLDER [Jen]
      }),
    ],
    slammed: [
      protocol('focus', 'slammed', {
        name: 'One thing, five minutes', // PLACEHOLDER [Jen]
        dailyAction: '5 min on one thing, every other tab closed', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 5, // PLACEHOLDER [Jen]
        whyItWorks:
          'Closing the other tabs removes the cues that pull attention away, so five minutes is enough to get one thing moving.', // PLACEHOLDER [Jen]
      }),
    ],
  },
  stress: {
    normal: [
      protocol('stress', 'normal', {
        name: 'Exhale and unplug', // PLACEHOLDER [Jen]
        dailyAction: '10-min extended exhale, plus an afternoon device-free break', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 15, // PLACEHOLDER [Jen]
        whyItWorks:
          'Breathing out for longer than you breathe in engages the parasympathetic branch and lowers arousal, and an afternoon break stops stress stacking through the day.', // PLACEHOLDER [Jen]
      }),
    ],
    limited: [
      protocol('stress', 'limited', {
        name: 'Exhale and a break', // PLACEHOLDER [Jen]
        dailyAction: '5-min extended exhale, plus a break', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 10, // PLACEHOLDER [Jen]
        whyItWorks:
          'A shorter exhale practice still shifts arousal down, and pairing it with a break gives the effect somewhere to land.', // PLACEHOLDER [Jen]
      }),
    ],
    slammed: [
      protocol('stress', 'slammed', {
        name: 'Five-minute exhale', // PLACEHOLDER [Jen]
        dailyAction: '5-min extended exhale', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 5, // PLACEHOLDER [Jen]
        whyItWorks:
          'Extending the exhale works within minutes, which is why it holds up on the weeks nothing else does.', // PLACEHOLDER [Jen]
      }),
    ],
  },
  routines: {
    normal: [
      protocol('routines', 'normal', {
        name: 'Three-step anchor', // PLACEHOLDER [Jen]
        dailyAction: 'One 3-step anchor routine, same order daily', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 10, // PLACEHOLDER [Jen]
        whyItWorks:
          'Running the same steps in the same order lets each step cue the next, so the sequence needs less deliberate effort over time.', // PLACEHOLDER [Jen]
      }),
    ],
    limited: [
      // Six minutes rounds UP into medium: the classes are exclusive, and the
      // gap between five and ten is not a bucket the picker offers. Worth Jen's
      // attention, because a "6 min" action offered to someone who said they had
      // 10-15 reads as under-serving them.
      protocol('routines', 'limited', {
        name: 'Two-step anchor', // PLACEHOLDER [Jen]
        dailyAction: 'A 2-step anchor routine', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 6, // PLACEHOLDER [Jen]
        whyItWorks:
          'Two steps is short enough to survive a busy week and still long enough to form a sequence.', // PLACEHOLDER [Jen]
      }),
    ],
    slammed: [
      protocol('routines', 'slammed', {
        name: 'One anchor cue', // PLACEHOLDER [Jen]
        dailyAction: 'One anchor cue at the same time daily', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 2, // PLACEHOLDER [Jen]
        whyItWorks:
          'Holding the timing steady keeps the cue in place, which is the part a routine is rebuilt from later.', // PLACEHOLDER [Jen]
      }),
    ],
  },
  energy: {
    normal: [
      protocol('energy', 'normal', {
        name: 'Light, movement, steady wake', // PLACEHOLDER [Jen]
        dailyAction:
          'Morning light within 30 min of waking, plus movement and a consistent wake time', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 20, // PLACEHOLDER [Jen]
        whyItWorks:
          'Early daylight and a steady wake time are the strongest signals for the body clock, and morning movement reinforces the same timing.', // PLACEHOLDER [Jen]
      }),
    ],
    limited: [
      protocol('energy', 'limited', {
        name: 'Light and steady wake', // PLACEHOLDER [Jen]
        dailyAction: 'Morning light, plus a consistent wake time', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 10, // PLACEHOLDER [Jen]
        whyItWorks:
          'Light exposure and wake timing carry most of the effect, so they are what stays when movement drops off.', // PLACEHOLDER [Jen]
      }),
    ],
    slammed: [
      protocol('energy', 'slammed', {
        name: 'Morning light', // PLACEHOLDER [Jen]
        dailyAction: 'Morning light only', // PLACEHOLDER [Jen], draft per spec 6.2
        estMinutes: 5, // PLACEHOLDER [Jen]
        whyItWorks:
          'Getting outside shortly after waking is a few minutes of effort for the single largest timing signal available.', // PLACEHOLDER [Jen]
      }),
    ],
  },
};

export const OUTCOME_KEYS: readonly OutcomeKey[] = ['focus', 'stress', 'routines', 'energy'];
export const CAPACITY_TIERS: readonly CapacityTier[] = ['normal', 'limited', 'slammed'];

/** Every variant in the matrix, outcome-major then capacity then time order. */
export function allProtocols(): ProtocolVariant[] {
  return OUTCOME_KEYS.flatMap((outcome) =>
    CAPACITY_TIERS.flatMap((capacity) => PROTOCOL_MATRIX[outcome][capacity])
  );
}

/** One unwritten slot in the outcome x capacity x time grid. */
export interface UnauthoredVariant {
  outcome: OutcomeKey;
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
  return OUTCOME_KEYS.flatMap((outcome) =>
    CAPACITY_TIERS.flatMap((capacity) =>
      TIME_CLASSES.filter(
        (timeClass) =>
          !PROTOCOL_MATRIX[outcome][capacity].some((v) => v.timeClass === timeClass)
      ).map((timeClass) => ({ outcome, capacity, timeClass }))
    )
  );
}
