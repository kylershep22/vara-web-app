import { selectProtocol } from '../selectProtocol';
import { PROTOCOL_MATRIX, allProtocols } from '../protocolMatrix';
import type { OutcomeKey, CapacityTier } from '../types';

const OUTCOMES: OutcomeKey[] = ['focus', 'stress', 'routines', 'energy'];
const CAPACITIES: CapacityTier[] = ['normal', 'limited', 'slammed'];

describe('selectProtocol (spec 6.2)', () => {
  it.each(OUTCOMES)('returns a protocol for every capacity of outcome %s', (outcome) => {
    for (const capacity of CAPACITIES) {
      const protocol = selectProtocol(outcome, capacity);
      expect(protocol.outcome).toBe(outcome);
      expect(protocol.capacity).toBe(capacity);
    }
  });

  it('covers all 12 outcome x capacity cells with distinct ids', () => {
    const ids = OUTCOMES.flatMap((outcome) =>
      CAPACITIES.map((capacity) => selectProtocol(outcome, capacity).id)
    );
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it('uses the outcome-capacity id convention so content swaps cannot shift a cell', () => {
    for (const outcome of OUTCOMES) {
      for (const capacity of CAPACITIES) {
        expect(selectProtocol(outcome, capacity).id).toBe(`${outcome}-${capacity}`);
      }
    }
  });

  it('reads straight from the matrix rather than copying it', () => {
    expect(selectProtocol('focus', 'normal')).toBe(PROTOCOL_MATRIX.focus.normal);
    expect(selectProtocol('energy', 'slammed')).toBe(PROTOCOL_MATRIX.energy.slammed);
  });

  it('is pure: the same call returns the same object every time', () => {
    expect(selectProtocol('stress', 'limited')).toBe(selectProtocol('stress', 'limited'));
  });
});

describe('protocol matrix content integrity', () => {
  it('exposes exactly 12 protocols', () => {
    expect(allProtocols()).toHaveLength(12);
  });

  it('gives every protocol the fields the Today screen needs', () => {
    for (const protocol of allProtocols()) {
      expect(protocol.name.length).toBeGreaterThan(0);
      expect(protocol.dailyAction.length).toBeGreaterThan(0);
      expect(protocol.whyItWorks.length).toBeGreaterThan(0);
      expect(protocol.estMinutes).toBeGreaterThan(0);
      expect(protocol.quickWinPracticeId.length).toBeGreaterThan(0);
      expect(Array.isArray(protocol.supportingPracticeIds)).toBe(true);
    }
  });

  it('never asks for more minutes as capacity drops', () => {
    for (const outcome of OUTCOMES) {
      const { normal, limited, slammed } = PROTOCOL_MATRIX[outcome];
      expect(normal.estMinutes).toBeGreaterThanOrEqual(limited.estMinutes);
      expect(limited.estMinutes).toBeGreaterThanOrEqual(slammed.estMinutes);
    }
  });

  it('keeps every user-facing string free of em dashes (principle 8)', () => {
    for (const protocol of allProtocols()) {
      for (const copy of [protocol.name, protocol.dailyAction, protocol.whyItWorks]) {
        expect(copy).not.toMatch(/[—–]/);
      }
    }
  });
});
