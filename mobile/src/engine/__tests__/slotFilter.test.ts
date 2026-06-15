import { getAllProtocols } from '../../constants/brainStateProtocols';
import type { Slot } from '../types';
import {
  directionMatches,
  eligiblePractices,
  slotModalities,
} from '../slotFilter';
import { settleBreathSlot, energizeSlot, nsdrSlot } from '../planMap';

const catalog = getAllProtocols();
const ids = (slot: Slot, budget: 'short' | 'medium' | 'long', evening = false) =>
  eligiblePractices(slot, catalog, budget, evening).map((p) => p.id).sort();

describe('directionMatches (§5)', () => {
  it('settle accepts settle and both, not energize', () => {
    expect(directionMatches('settle', 'settle')).toBe(true);
    expect(directionMatches('settle', 'both')).toBe(true);
    expect(directionMatches('settle', 'energize')).toBe(false);
  });
  it('energize accepts energize and both, not settle', () => {
    expect(directionMatches('energize', 'energize')).toBe(true);
    expect(directionMatches('energize', 'both')).toBe(true);
    expect(directionMatches('energize', 'settle')).toBe(false);
  });
});

describe('length-class matching (edge: short includes the length-2 breaths)', () => {
  it('a short settle-breath slot is eligible for the length-2 catalog breaths', () => {
    const eligible = ids(settleBreathSlot('mandatory', ['short']), 'long');
    // short = {2, 5}: the three length-2 breaths must be eligible, not just length-5.
    expect(eligible).toEqual(
      expect.arrayContaining(['box-breathing-2', 'cyclic-sighing-2', 'extended-exhale-2'])
    );
    expect(eligible).toContain('coherence-breathing-5');
    // every candidate is a settle breath in the short class
    for (const p of eligiblePractices(settleBreathSlot('mandatory', ['short']), catalog, 'long', false)) {
      expect(p.modality).toBe('breath');
      expect(['settle', 'both']).toContain(p.regulationDirection);
      expect(p.timeWindow).toBeLessThanOrEqual(5);
    }
  });
});

describe('direction "both" acceptance (edge: cold-water-reset is both)', () => {
  // No map cell emits a cold slot (cold-water-reset stays browse-only,
  // resolution #5); the both-direction acceptance is asserted at the filter
  // level with synthesized cold slots.
  const coldSettle: Slot = {
    pillar: 'energy', direction: 'settle', type: 'cold', lengthClasses: ['short'], mode: 'mandatory',
  };
  const coldEnergize: Slot = { ...coldSettle, direction: 'energize' };

  it('a settle cold slot accepts the both-tagged cold-water-reset', () => {
    expect(ids(coldSettle, 'long')).toContain('cold-water-reset-5');
  });
  it('an energize cold slot accepts the both-tagged cold-water-reset', () => {
    expect(ids(coldEnergize, 'long')).toContain('cold-water-reset-5');
  });
});

describe('bright-light evening suppression (§8, edge 6)', () => {
  // energize slot widened to include medium so bright-light-10 (10 min) qualifies.
  const slot = energizeSlot('mandatory', ['short', 'medium']);

  it('daytime energize slot includes bright-light', () => {
    const day = ids(slot, 'long', false);
    expect(day).toContain('bright-light-10');
    expect(day).toContain('brief-movement-5');
  });
  it('evening energize slot excludes bright-light but keeps other energizers', () => {
    const evening = ids(slot, 'long', true);
    expect(evening).not.toContain('bright-light-10');
    expect(evening).not.toContain('bright-light-20');
    expect(evening).toContain('brief-movement-5');
  });
});

describe('time-budget cap (edge 7, filter level)', () => {
  it('a short budget excludes longer practices', () => {
    expect(ids(nsdrSlot('mandatory', ['medium', 'long']), 'short')).toEqual([]);
  });
  it('a long budget admits both nsdr lengths', () => {
    expect(ids(nsdrSlot('mandatory', ['medium', 'long']), 'long')).toEqual(['nsdr-10', 'nsdr-20']);
  });
});

describe('slotModalities override (resolution #2)', () => {
  it('uses the explicit override when present', () => {
    const slot: Slot = {
      pillar: 'energy', direction: 'settle', type: 'settle',
      lengthClasses: ['short'], mode: 'mandatory', modalities: ['breath', 'sensory'],
    };
    expect(slotModalities(slot)).toEqual(['breath', 'sensory']);
  });
  it('falls back to the slot-type modality set when absent', () => {
    const slot: Slot = {
      pillar: 'energy', direction: 'settle', type: 'grounding',
      lengthClasses: ['short'], mode: 'mandatory',
    };
    expect(slotModalities(slot)).toEqual(['sensory']);
  });
});
