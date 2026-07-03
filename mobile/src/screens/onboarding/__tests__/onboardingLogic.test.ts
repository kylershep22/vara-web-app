/**
 * Pure-logic coverage for the re-check shift and the Reflect what-to-expect
 * line — the brand-critical bits: the shift line is valence-coherent (a
 * positive arrival is never told to "recover"), and an early exit never claims
 * the protocol's nominal duration.
 */
import {
  computeShift,
  classifyQuadrantShift,
  quadrantShiftLine,
  easedShiftLine,
  quadrantForBrainState,
  shiftOutcome,
  brainLine,
  BRAIN_LINE_ACTIVATED,
  BRAIN_LINE_POSITIVE,
} from '../onboardingShift';
import type { QuadrantShiftBucket } from '../onboardingShift';
import { onboardingWhatToExpectLine } from '../resolveOnboardingProtocol';
import type { BrainState } from '../../../types/models';
import type { Quadrant } from '../../../engine/types';

const POSITIVE_HOLD =
  "You're in a good place. Showing up when you already feel good matters just as much as when things are hard.";
const POSITIVE_DIP =
  "States move through the day, and noticing the shift is its own kind of skill. You're in a tougher spot than when you started, and that's exactly what these check-ins help you catch.";
const ACTIVATED_RIL =
  "Recovery isn't linear. Some days the shift is quiet. Showing up is the part that compounds.";

describe('computeShift (drives the unchanged protocolSession.outcome)', () => {
  test('toward regulation → improved', () => {
    expect(computeShift('wired', 'steady')).toBe('improved');
  });
  test('same state → flat', () => {
    expect(computeShift('steady', 'steady')).toBe('flat');
  });
  test('away from regulation → worse', () => {
    expect(computeShift('clear', 'wired')).toBe('worse');
  });
});

describe('quadrantForBrainState — bridged five-state reads back to its quadrant', () => {
  const CASES: [BrainState, Quadrant][] = [
    ['wired', 'Tense'],
    ['alive', 'Activated'],
    ['foggy', 'Depleted'],
    ['steady', 'Calm'],
    ['clear', 'Calm'], // clear collapses to Calm (never produced by the two-tap)
  ];
  CASES.forEach(([state, quadrant]) => {
    test(`${state} → ${quadrant}`, () => {
      expect(quadrantForBrainState(state)).toBe(quadrant);
    });
  });
});

describe('classifyQuadrantShift — full 16-cell circumplex map', () => {
  // A settle practice is the goal, so reaching Calm is the win (eased); staying
  // revved after a hard start is honest ("charge_remains"), never overclaimed.
  const MAP: Record<Quadrant, Record<Quadrant, QuadrantShiftBucket>> = {
    Tense: { Tense: 'quiet', Activated: 'charge_remains', Depleted: 'quiet', Calm: 'eased' },
    Depleted: { Tense: 'quiet', Activated: 'charge_remains', Depleted: 'quiet', Calm: 'eased' },
    Activated: { Tense: 'dipped', Activated: 'held_good', Depleted: 'dipped', Calm: 'eased' },
    Calm: { Tense: 'dipped', Activated: 'held_good', Depleted: 'dipped', Calm: 'held_calm' },
  };
  (Object.keys(MAP) as Quadrant[]).forEach((before) => {
    (Object.keys(MAP[before]) as Quadrant[]).forEach((after) => {
      test(`${before} → ${after} = ${MAP[before][after]}`, () => {
        expect(classifyQuadrantShift(before, after)).toBe(MAP[before][after]);
      });
    });
  });
});

describe('quadrantShiftLine — circumplex, honest, never shaming', () => {
  test('eased (Tense → Calm, 2 min) names the felt win + duration', () => {
    expect(quadrantShiftLine('Tense', 'Calm', 120)).toBe(
      'You went from wound up to settled in two minutes.'
    );
  });
  test('eased (Depleted → Calm, 5 min)', () => {
    expect(quadrantShiftLine('Depleted', 'Calm', 300)).toBe(
      'You went from running low to settled in five minutes.'
    );
  });
  test('eased with a short early exit drops the claim ("just now")', () => {
    expect(quadrantShiftLine('Activated', 'Calm', 40)).toBe(
      'You went from charged up to settled just now.'
    );
  });
  test('charge_remains (Tense → Activated) is honest, never a false win', () => {
    const line = quadrantShiftLine('Tense', 'Activated', 120);
    expect(line).toBe(
      "Still some charge there, and that's okay. A couple more minutes can help it settle."
    );
    // Must NOT claim a settle that didn't happen.
    expect(line).not.toMatch(/settled/);
    expect(line).not.toMatch(/working with you/);
  });
  test('quiet (Tense → Tense) stays the compassionate line', () => {
    expect(quadrantShiftLine('Tense', 'Tense', 0)).toBe(ACTIVATED_RIL);
    expect(quadrantShiftLine('Tense', 'Depleted', 0)).toBe(ACTIVATED_RIL);
  });
  test('held_calm (Calm → Calm) affirms staying with it', () => {
    expect(quadrantShiftLine('Calm', 'Calm', 0)).toBe(
      "You're settled, and staying with it is the whole practice."
    );
  });
  test('held_good (Activated → Activated) affirms instead of consoling', () => {
    expect(quadrantShiftLine('Activated', 'Activated', 0)).toBe(POSITIVE_HOLD);
  });
  test('dipped (Calm → Tense) names the catch, not a failure', () => {
    expect(quadrantShiftLine('Calm', 'Tense', 0)).toBe(POSITIVE_DIP);
    expect(quadrantShiftLine('Calm', 'Tense', 0).toLowerCase()).not.toMatch(/wrong|fail|penalty/);
  });
});

describe('easedShiftLine — actual-duration phrasing + graceful fallback', () => {
  test('120s renders "in two minutes"', () => {
    expect(easedShiftLine('Tense', 120)).toBe('You went from wound up to settled in two minutes.');
  });
  test('300s renders "in five minutes"', () => {
    expect(easedShiftLine('Depleted', 300)).toBe(
      'You went from running low to settled in five minutes.'
    );
  });
  test('unresolved duration (null) drops the claim with "just now"', () => {
    expect(easedShiftLine('Tense', null)).toBe('You went from wound up to settled just now.');
  });
  test('zero duration falls back to "just now"', () => {
    expect(easedShiftLine('Tense', 0)).toBe('You went from wound up to settled just now.');
  });
  test('sub-two-minute duration falls back to "just now" (no "one minutes")', () => {
    expect(easedShiftLine('Tense', 80)).toBe('You went from wound up to settled just now.');
  });
});

describe('brainLine — branches on initial-state valence', () => {
  test('activated initial → stress-recovery framing', () => {
    expect(brainLine('wired')).toBe(BRAIN_LINE_ACTIVATED);
    expect(brainLine('foggy')).toBe(BRAIN_LINE_ACTIVATED);
  });
  test('positive initial → resilience framing', () => {
    expect(brainLine('steady')).toBe(BRAIN_LINE_POSITIVE);
    expect(brainLine('clear')).toBe(BRAIN_LINE_POSITIVE);
    expect(brainLine('alive')).toBe(BRAIN_LINE_POSITIVE);
  });
});

describe('shiftOutcome — maps shift to a ProtocolSessionOutcome (unchanged)', () => {
  test('improved → shifted', () => expect(shiftOutcome('improved')).toBe('shifted'));
  test('flat → maintenance', () => expect(shiftOutcome('flat')).toBe('maintenance'));
  test('worse → not_shifted', () => expect(shiftOutcome('worse')).toBe('not_shifted'));
});

describe('onboardingWhatToExpectLine — generic, duration-sized, null-safe', () => {
  // Post-rehost the onboarding practice comes from the circumplex engine over a
  // phone-only catalog at the just_reset situation, so every state resolves to a
  // short (2-min) settle/grounding practice (Tense/Depleted/Calm → box breathing,
  // Activated → sensory reset). The copy is duration-sized to that.
  test('Wired (2-min settle breath) names "about two minutes"', () => {
    expect(onboardingWhatToExpectLine('wired')).toBe(
      "It's about two minutes, fully guided, so there's nothing to figure out. Just follow along."
    );
  });
  test('Steady (2-min settle breath) names "about two minutes"', () => {
    expect(onboardingWhatToExpectLine('steady')).toBe(
      "It's about two minutes, fully guided, so there's nothing to figure out. Just follow along."
    );
  });
  test('unresolved state → null (screen omits the line)', () => {
    expect(onboardingWhatToExpectLine(null)).toBeNull();
  });
});
