import {
  stateAcknowledgment,
  NEUTRAL_ACKNOWLEDGMENT,
} from '../stateAcknowledgment';
import type { Quadrant, Situation } from '../../../engine';

describe('stateAcknowledgment', () => {
  it('maps each quadrant to its launch phrase', () => {
    const cases: Record<Quadrant, string> = {
      Tense: 'A bit wound up',
      Activated: 'Plenty of energy',
      Depleted: 'Running low',
      Calm: 'Settled',
    };
    (Object.keys(cases) as Quadrant[]).forEach((q) => {
      expect(stateAcknowledgment(q)).toBe(cases[q]);
    });
  });

  it('returns the neutral line for null quadrant (never empty, never guessed)', () => {
    expect(stateAcknowledgment(null)).toBe(NEUTRAL_ACKNOWLEDGMENT);
    expect(NEUTRAL_ACKNOWLEDGMENT.length).toBeGreaterThan(0);
  });

  it('ignores the situation param at launch (dormant seam — same output with or without it)', () => {
    const situations: Situation[] = [
      'get_through_hard',
      'quiet_mind',
      'find_energy',
      'wind_down',
      'grip_on_day',
      'just_reset',
    ];
    situations.forEach((s) => {
      expect(stateAcknowledgment('Calm', s)).toBe(stateAcknowledgment('Calm'));
    });
  });
});
