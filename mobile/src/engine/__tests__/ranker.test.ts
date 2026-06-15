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

  it('breaks ties alphabetically by id when no history', () => {
    const candidates = [byId('extended-exhale-2'), byId('box-breathing-2')];
    expect(ids(defaultRanker(candidates, ctx({ budgetClass: 'short' })))[0]).toBe('box-breathing-2');
  });

  it('applies a recency penalty by family (recent family ranked later)', () => {
    const candidates = [byId('box-breathing-2'), byId('cyclic-sighing-2')];
    // No history: alphabetical → box-breathing first.
    expect(ids(defaultRanker(candidates, ctx({ budgetClass: 'short' })))[0]).toBe('box-breathing-2');
    // box-breathing recently used → it drops below cyclic-sighing.
    const withHistory = defaultRanker(
      candidates,
      ctx({ budgetClass: 'short', history: { recentFamilies: ['box-breathing'] } })
    );
    expect(ids(withHistory)[0]).toBe('cyclic-sighing-2');
  });
});
