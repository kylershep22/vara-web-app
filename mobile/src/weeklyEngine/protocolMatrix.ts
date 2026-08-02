/**
 * Weekly protocol matrix — 4 outcomes x 3 capacities = 12 (spec 6.2).
 *
 * This file is DATA, not logic. Every user-facing string below is a
 * PLACEHOLDER [Jen]: draft daily actions come from spec 6.2, and names,
 * estimated minutes, and rationale are build-and-test stand-ins. Jen owns the
 * final content, which drops in here without any code change. Do not ship
 * placeholder copy.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */
import type { CapacityTier, OutcomeKey, WeeklyProtocol } from './types';

/**
 * Placeholder quick-win practice: the 90-second extended exhale appended to
 * every week-1 protocol (spec 6.3). The practice need not exist in the catalog
 * yet; this is a reference only.
 */
export const DEFAULT_QUICK_WIN_PRACTICE_ID = 'exhale-90s';

const protocol = (
  outcome: OutcomeKey,
  capacity: CapacityTier,
  fields: Pick<WeeklyProtocol, 'name' | 'dailyAction' | 'estMinutes' | 'whyItWorks'> &
    Partial<Pick<WeeklyProtocol, 'quickWinPracticeId' | 'supportingPracticeIds'>>
): WeeklyProtocol => ({
  id: `${outcome}-${capacity}`,
  outcome,
  capacity,
  quickWinPracticeId: DEFAULT_QUICK_WIN_PRACTICE_ID,
  supportingPracticeIds: [],
  ...fields,
});

export type WeeklyProtocolMatrix = Record<OutcomeKey, Record<CapacityTier, WeeklyProtocol>>;

export const PROTOCOL_MATRIX: WeeklyProtocolMatrix = {
  focus: {
    normal: protocol('focus', 'normal', {
      name: 'Deep work block', // PLACEHOLDER [Jen]
      dailyAction: 'One 25-min single-task block, then a device-free break', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 30, // PLACEHOLDER [Jen]
      whyItWorks:
        'Sustained attention on one task avoids the switching cost of juggling several, and a break without a screen lets attention recover before the next block.', // PLACEHOLDER [Jen]
    }),
    limited: protocol('focus', 'limited', {
      name: 'Short focus block', // PLACEHOLDER [Jen]
      dailyAction: 'One 15-min single-task block', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 15, // PLACEHOLDER [Jen]
      whyItWorks:
        'A shorter block keeps the same single-task structure at a length that still fits a full day.', // PLACEHOLDER [Jen]
    }),
    slammed: protocol('focus', 'slammed', {
      name: 'One thing, five minutes', // PLACEHOLDER [Jen]
      dailyAction: '5 min on one thing, every other tab closed', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 5, // PLACEHOLDER [Jen]
      whyItWorks:
        'Closing the other tabs removes the cues that pull attention away, so five minutes is enough to get one thing moving.', // PLACEHOLDER [Jen]
    }),
  },
  stress: {
    normal: protocol('stress', 'normal', {
      name: 'Exhale and unplug', // PLACEHOLDER [Jen]
      dailyAction: '10-min extended exhale, plus an afternoon device-free break', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 15, // PLACEHOLDER [Jen]
      whyItWorks:
        'Breathing out for longer than you breathe in engages the parasympathetic branch and lowers arousal, and an afternoon break stops stress stacking through the day.', // PLACEHOLDER [Jen]
    }),
    limited: protocol('stress', 'limited', {
      name: 'Exhale and a break', // PLACEHOLDER [Jen]
      dailyAction: '5-min extended exhale, plus a break', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 10, // PLACEHOLDER [Jen]
      whyItWorks:
        'A shorter exhale practice still shifts arousal down, and pairing it with a break gives the effect somewhere to land.', // PLACEHOLDER [Jen]
    }),
    slammed: protocol('stress', 'slammed', {
      name: 'Five-minute exhale', // PLACEHOLDER [Jen]
      dailyAction: '5-min extended exhale', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 5, // PLACEHOLDER [Jen]
      whyItWorks:
        'Extending the exhale works within minutes, which is why it holds up on the weeks nothing else does.', // PLACEHOLDER [Jen]
    }),
  },
  routines: {
    normal: protocol('routines', 'normal', {
      name: 'Three-step anchor', // PLACEHOLDER [Jen]
      dailyAction: 'One 3-step anchor routine, same order daily', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 10, // PLACEHOLDER [Jen]
      whyItWorks:
        'Running the same steps in the same order lets each step cue the next, so the sequence needs less deliberate effort over time.', // PLACEHOLDER [Jen]
    }),
    limited: protocol('routines', 'limited', {
      name: 'Two-step anchor', // PLACEHOLDER [Jen]
      dailyAction: 'A 2-step anchor routine', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 6, // PLACEHOLDER [Jen]
      whyItWorks:
        'Two steps is short enough to survive a busy week and still long enough to form a sequence.', // PLACEHOLDER [Jen]
    }),
    slammed: protocol('routines', 'slammed', {
      name: 'One anchor cue', // PLACEHOLDER [Jen]
      dailyAction: 'One anchor cue at the same time daily', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 2, // PLACEHOLDER [Jen]
      whyItWorks:
        'Holding the timing steady keeps the cue in place, which is the part a routine is rebuilt from later.', // PLACEHOLDER [Jen]
    }),
  },
  energy: {
    normal: protocol('energy', 'normal', {
      name: 'Light, movement, steady wake', // PLACEHOLDER [Jen]
      dailyAction:
        'Morning light within 30 min of waking, plus movement and a consistent wake time', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 20, // PLACEHOLDER [Jen]
      whyItWorks:
        'Early daylight and a steady wake time are the strongest signals for the body clock, and morning movement reinforces the same timing.', // PLACEHOLDER [Jen]
    }),
    limited: protocol('energy', 'limited', {
      name: 'Light and steady wake', // PLACEHOLDER [Jen]
      dailyAction: 'Morning light, plus a consistent wake time', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 10, // PLACEHOLDER [Jen]
      whyItWorks:
        'Light exposure and wake timing carry most of the effect, so they are what stays when movement drops off.', // PLACEHOLDER [Jen]
    }),
    slammed: protocol('energy', 'slammed', {
      name: 'Morning light', // PLACEHOLDER [Jen]
      dailyAction: 'Morning light only', // PLACEHOLDER [Jen], draft per spec 6.2
      estMinutes: 5, // PLACEHOLDER [Jen]
      whyItWorks:
        'Getting outside shortly after waking is a few minutes of effort for the single largest timing signal available.', // PLACEHOLDER [Jen]
    }),
  },
};

export const OUTCOME_KEYS: readonly OutcomeKey[] = ['focus', 'stress', 'routines', 'energy'];
export const CAPACITY_TIERS: readonly CapacityTier[] = ['normal', 'limited', 'slammed'];

/** All 12 protocols, outcome-major then capacity order. */
export function allProtocols(): WeeklyProtocol[] {
  return OUTCOME_KEYS.flatMap((outcome) =>
    CAPACITY_TIERS.map((capacity) => PROTOCOL_MATRIX[outcome][capacity])
  );
}
