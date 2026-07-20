import { getProtocolById } from '../../constants/brainStateProtocols';
import type { Protocol } from '../../types/models';
import { defaultRanker } from '../ranker';
import type { RankContext } from '../types';

function byId(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`missing fixture ${id}`);
  return p;
}

const ctx = (over: Partial<RankContext> = {}): RankContext => ({
  lengthClasses: [],
  budgetClass: 'long',
  clockTime: { hour: 12 },
  ...over,
});

const ids = (ps: Protocol[]) => ps.map((p) => p.id);

describe('defaultRanker (§9.4)', () => {
  it('prefers the practice closest to the time budget (use the window you have)', () => {
    const candidates = [byId('nsdr-10'), byId('nsdr-20')];
    expect(ids(defaultRanker(candidates, ctx({ budgetClass: 'long' })))[0]).toBe('nsdr-20');
    expect(ids(defaultRanker(candidates, ctx({ budgetClass: 'medium' })))[0]).toBe('nsdr-10');
  });

  it('is deterministic — same inputs, same order', () => {
    const candidates = [byId('extended-exhale-2'), byId('box-breathing-2'), byId('cyclic-sighing-2')];
    const a = ids(defaultRanker(candidates, ctx({ budgetClass: 'short' })));
    const b = ids(defaultRanker(candidates, ctx({ budgetClass: 'short' })));
    expect(a).toEqual(b);
  });

  it('respects the global lead preference when no slot override is given', () => {
    // PRACTICE_LEAD_PREFERENCE lists extended-exhale-2 ahead of box-breathing-2,
    // so it leads at an equal budget-closeness (both are short) with no history.
    const candidates = [byId('box-breathing-2'), byId('extended-exhale-2')];
    expect(ids(defaultRanker(candidates, ctx({ budgetClass: 'short' })))[0]).toBe(
      'extended-exhale-2'
    );
  });

  it('falls back to alphabetical id for ids absent from every preference list', () => {
    // Neither id appears in PRACTICE_LEAD_PREFERENCE (nor a slot override), both
    // are short, so the alphabetical tiebreak decides: cold-... < sensory-...
    const candidates = [byId('sensory-reset-2'), byId('cold-water-reset-5')];
    expect(ids(defaultRanker(candidates, ctx({ budgetClass: 'short' })))[0]).toBe(
      'cold-water-reset-5'
    );
  });

  it('a slot-level lead preference overrides the global default', () => {
    // Global orders extended-exhale-2 before box-breathing-2; a slot override
    // listing box-breathing-2 first flips the lead for that cell only.
    const candidates = [byId('box-breathing-2'), byId('extended-exhale-2')];
    const over = defaultRanker(
      candidates,
      ctx({ budgetClass: 'short', leadPreference: ['box-breathing-2', 'extended-exhale-2'] })
    );
    expect(ids(over)[0]).toBe('box-breathing-2');
  });

  it('applies a recency penalty by family (recent family ranked later)', () => {
    const candidates = [byId('box-breathing-2'), byId('cyclic-sighing-2')];
    // No history: global preference orders cyclic-sighing ahead of box-breathing.
    expect(ids(defaultRanker(candidates, ctx({ budgetClass: 'short' })))[0]).toBe(
      'cyclic-sighing-2'
    );
    // cyclic-sighing recently used → recency (a higher-priority tiebreak than
    // preference) drops it below box-breathing.
    const withHistory = defaultRanker(
      candidates,
      ctx({ budgetClass: 'short', history: { recentFamilies: ['cyclic-sighing'] } })
    );
    expect(ids(withHistory)[0]).toBe('box-breathing-2');
  });
});
