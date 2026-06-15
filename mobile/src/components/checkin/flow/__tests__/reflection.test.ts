import { reflectionSetFor, isStrongPositiveReflection } from '../reflection';

describe('reflectionSetFor — set chosen by (pillar, direction)', () => {
  it('focus → Settled / Some / Still busy', () => {
    const set = reflectionSetFor('focus', 'neutral');
    expect(set.chips.map((c) => c.label)).toEqual(['Settled', 'Some', 'Still busy']);
    expect(set.strongPositiveId).toBe('settled');
  });

  it('energy + settle → Calmer / A little / Still wound up', () => {
    const set = reflectionSetFor('energy', 'settle');
    expect(set.chips.map((c) => c.label)).toEqual(['Calmer', 'A little', 'Still wound up']);
    expect(set.strongPositiveId).toBe('calmer');
  });

  it('energy + energize → More with it / A little / Still flat', () => {
    const set = reflectionSetFor('energy', 'energize');
    expect(set.chips.map((c) => c.label)).toEqual(['More with it', 'A little', 'Still flat']);
    expect(set.strongPositiveId).toBe('more_with_it');
  });

  it('time → Clearer / A little / Still scattered', () => {
    const set = reflectionSetFor('time', 'neutral');
    expect(set.chips.map((c) => c.label)).toEqual(['Clearer', 'A little', 'Still scattered']);
    expect(set.strongPositiveId).toBe('clearer');
  });

  it('energy with `both`/`neutral` slot direction falls back to the settle set', () => {
    expect(reflectionSetFor('energy', 'neutral').strongPositiveId).toBe('calmer');
  });
});

describe('isStrongPositiveReflection — only the first chip qualifies', () => {
  it('true for the strong-positive chip', () => {
    expect(isStrongPositiveReflection('energy', 'settle', 'calmer')).toBe(true);
  });
  it('false for the middle and negative chips', () => {
    expect(isStrongPositiveReflection('energy', 'settle', 'a_little')).toBe(false);
    expect(isStrongPositiveReflection('energy', 'settle', 'still_wound_up')).toBe(false);
  });
});
