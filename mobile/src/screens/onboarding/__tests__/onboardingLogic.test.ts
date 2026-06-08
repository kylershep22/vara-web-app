/**
 * Pure-logic coverage for the re-check shift and the Reflect what-to-expect
 * line — the brand-critical bits: the shift line is valence-coherent (a
 * positive arrival is never told to "recover"), and an early exit never claims
 * the protocol's nominal duration.
 */
import {
  computeShift,
  classifyShiftBucket,
  shiftLine,
  improvedShiftLine,
  shiftOutcome,
  brainLine,
  BRAIN_LINE_ACTIVATED,
  BRAIN_LINE_POSITIVE,
} from '../onboardingShift';
import type { ShiftBucket } from '../onboardingShift';
import { onboardingWhatToExpectLine } from '../resolveOnboardingProtocol';
import type { BrainState } from '../../../types/models';

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

describe('classifyShiftBucket — full 25-cell valence map', () => {
  // before → after → expected bucket. activated = wired/foggy; positive =
  // steady/clear/alive. "moved" = upward into a positive state (only bucket
  // with the before→after arrow).
  const MAP: Record<BrainState, Record<BrainState, ShiftBucket>> = {
    wired: { wired: 'activated', foggy: 'activated', steady: 'moved', clear: 'moved', alive: 'moved' },
    foggy: { wired: 'activated', foggy: 'activated', steady: 'moved', clear: 'moved', alive: 'moved' },
    steady: { wired: 'positive_dip', foggy: 'positive_dip', steady: 'positive_hold', clear: 'moved', alive: 'moved' },
    clear: { wired: 'positive_dip', foggy: 'positive_dip', steady: 'positive_hold', clear: 'positive_hold', alive: 'moved' },
    alive: { wired: 'positive_dip', foggy: 'positive_dip', steady: 'positive_hold', clear: 'positive_hold', alive: 'positive_hold' },
  };

  (Object.keys(MAP) as BrainState[]).forEach((before) => {
    (Object.keys(MAP[before]) as BrainState[]).forEach((after) => {
      test(`${before} → ${after} = ${MAP[before][after]}`, () => {
        expect(classifyShiftBucket(before, after)).toBe(MAP[before][after]);
      });
    });
  });
});

describe('shiftLine — valence-coherent, never shaming', () => {
  test('moved (Wired → Steady, 2 min actual) names the duration', () => {
    expect(shiftLine('wired', 'steady', 120)).toBe('You moved from Wired to Steady in two minutes.');
  });
  test('moved (upward positive→positive, Steady → Clear, 5 min) names the duration', () => {
    expect(shiftLine('steady', 'clear', 300)).toBe('You moved from Steady to Clear in five minutes.');
  });
  test('moved with a short early exit drops the claim ("just now")', () => {
    expect(shiftLine('wired', 'clear', 40)).toBe('You moved from Wired to Clear just now.');
  });
  test('activated→activated stays the compassionate line', () => {
    expect(shiftLine('wired', 'wired', 0)).toBe(ACTIVATED_RIL);
    expect(shiftLine('wired', 'foggy', 0)).toBe(ACTIVATED_RIL);
  });
  test('positive hold (Alive → Alive) affirms instead of consoling', () => {
    expect(shiftLine('alive', 'alive', 0)).toBe(POSITIVE_HOLD);
    expect(shiftLine('clear', 'steady', 0)).toBe(POSITIVE_HOLD); // dip within good
  });
  test('positive dip (Clear → Wired) names the catch, not a failure', () => {
    expect(shiftLine('clear', 'wired', 0)).toBe(POSITIVE_DIP);
    expect(shiftLine('clear', 'wired', 0).toLowerCase()).not.toMatch(/wrong|fail|penalty/);
  });
});

describe('improvedShiftLine — actual-duration phrasing + graceful fallback', () => {
  test('120s renders "in two minutes"', () => {
    expect(improvedShiftLine('wired', 'steady', 120)).toBe('You moved from Wired to Steady in two minutes.');
  });
  test('300s renders "in five minutes"', () => {
    expect(improvedShiftLine('foggy', 'clear', 300)).toBe('You moved from Foggy to Clear in five minutes.');
  });
  test('unresolved duration (null) drops the claim with "just now"', () => {
    expect(improvedShiftLine('wired', 'steady', null)).toBe('You moved from Wired to Steady just now.');
  });
  test('zero duration falls back to "just now"', () => {
    expect(improvedShiftLine('wired', 'steady', 0)).toBe('You moved from Wired to Steady just now.');
  });
  test('sub-two-minute duration falls back to "just now" (no "one minutes")', () => {
    expect(improvedShiftLine('wired', 'steady', 80)).toBe('You moved from Wired to Steady just now.');
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
  test('Wired (2-min Cyclic Sighing) names "about two minutes"', () => {
    expect(onboardingWhatToExpectLine('wired')).toBe(
      "It's about two minutes, fully guided, so there's nothing to figure out. Just follow along."
    );
  });
  test('Steady (5-min protocol) names "about five minutes"', () => {
    expect(onboardingWhatToExpectLine('steady')).toBe(
      "It's about five minutes, fully guided, so there's nothing to figure out. Just follow along."
    );
  });
  test('unresolved state → null (screen omits the line)', () => {
    expect(onboardingWhatToExpectLine(null)).toBeNull();
  });
});
