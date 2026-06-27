import {
  reflectionSetFor,
  reflectionDisplayChips,
  isStrongPositiveReflection,
} from '../reflection';

describe('reflectionSetFor — set chosen by (pillar, direction)', () => {
  it('focus → Stayed with it / Drifted some / Kept slipping', () => {
    const set = reflectionSetFor('focus', 'neutral');
    expect(set.chips.map((c) => c.label)).toEqual([
      'Stayed with it',
      'Drifted some',
      'Kept slipping',
    ]);
    // Persisted ids and the strong-positive marker are UNCHANGED — only the
    // user-facing wording moves (outcome classification keys on these ids).
    expect(set.chips.map((c) => c.id)).toEqual(['settled', 'some', 'still_busy']);
    expect(set.strongPositiveId).toBe('settled');
  });

  it('focus rendered chips carry the new labels on the stable ids', () => {
    const chips = reflectionDisplayChips('focus', 'neutral');
    expect(chips).toEqual([
      { id: 'settled', label: 'Stayed with it' },
      { id: 'some', label: 'Drifted some' },
      { id: 'still_busy', label: 'Kept slipping' },
    ]);
  });

  it('energy + settle → Calmer / A little calmer / Still wound up', () => {
    const set = reflectionSetFor('energy', 'settle');
    expect(set.chips.map((c) => c.label)).toEqual([
      'Calmer',
      'A little calmer',
      'Still wound up',
    ]);
    expect(set.strongPositiveId).toBe('calmer');
  });

  it('energy + energize → More with it / A little more / Still flat', () => {
    const set = reflectionSetFor('energy', 'energize');
    expect(set.chips.map((c) => c.label)).toEqual([
      'More with it',
      'A little more',
      'Still flat',
    ]);
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
