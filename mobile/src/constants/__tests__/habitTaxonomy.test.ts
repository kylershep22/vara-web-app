// Habit taxonomy — the nine controlled keys and what the backend derives from
// them. Pure data plus three lookups, so every case is directly testable.
//
// The point of these tests is that the MAPPING is pinned. Downstream features
// (rhythm-aware suggestions, habit grouping) read focusDemand and pillar rather
// than re-deriving them, so a silent edit here would change behaviour on a
// screen far from this file.

import {
  HABIT_CATEGORY_KEYS,
  HABIT_CATEGORY_LABELS,
  HABIT_CATEGORY_MAPPING,
  getHabitCategoryMapping,
  habitBenefitsFromFocusWindow,
  habitCategoryLabel,
  habitPillar,
  type HabitCategoryKey,
} from '../habitTaxonomy';

describe('the nine keys', () => {
  it('is exactly nine, with no duplicates', () => {
    expect(HABIT_CATEGORY_KEYS).toHaveLength(9);
    expect(new Set(HABIT_CATEGORY_KEYS).size).toBe(9);
  });

  it('offers them in the agreed order, with "other" last', () => {
    expect([...HABIT_CATEGORY_KEYS]).toEqual([
      'movement',
      'sleep_rest',
      'focus_work',
      'mindfulness',
      'learning_growth',
      'health',
      'connection',
      'finances',
      'other',
    ]);
    expect(HABIT_CATEGORY_KEYS[HABIT_CATEGORY_KEYS.length - 1]).toBe('other');
  });

  it('has a lay-language label for every key, never the raw key', () => {
    for (const key of HABIT_CATEGORY_KEYS) {
      const label = HABIT_CATEGORY_LABELS[key];
      expect(label).toBeTruthy();
      expect(label).not.toBe(key);
      expect(label).not.toMatch(/_/);
    }
  });

  // The em-dash check that used to live here is gone: habitTaxonomy.ts is now
  // in brandCopyGuard's COPY_SOURCES, which scans the whole file rather than
  // just these label values, and which picks up new brand rules as they are
  // added. A local copy would have frozen coverage at today's rules.
});

describe('the mapping table', () => {
  // NOTE: the "omitting a key fails to compile" guarantee is a TYPE-LEVEL one.
  // HABIT_CATEGORY_MAPPING is Record<HabitCategoryKey, ...>, so removing an
  // entry is a tsc error, not a runtime failure a test could catch. This test
  // covers the runtime half: every key currently resolves.
  it('maps every key, with no key left undefined', () => {
    for (const key of HABIT_CATEGORY_KEYS) {
      expect(HABIT_CATEGORY_MAPPING[key]).toBeDefined();
    }
    expect(Object.keys(HABIT_CATEGORY_MAPPING).sort()).toEqual([...HABIT_CATEGORY_KEYS].sort());
  });

  it.each([
    ['movement', 'energy', false],
    ['sleep_rest', 'energy', false],
    ['focus_work', 'focus', true],
    ['mindfulness', 'energy', false],
    ['learning_growth', 'focus', true],
    ['health', null, false],
    ['connection', 'community', false],
    // Provisional per the mapping brief; flipping it is a one-line change here.
    ['finances', null, false],
    ['other', null, false],
  ])('%s maps to pillar %s and focusDemand %s', (key, pillar, focusDemand) => {
    expect(HABIT_CATEGORY_MAPPING[key as HabitCategoryKey]).toEqual({
      pillar,
      focusDemand,
    });
  });

  it('marks exactly the two focus-demanding kinds', () => {
    const demanding = HABIT_CATEGORY_KEYS.filter(
      (key) => HABIT_CATEGORY_MAPPING[key].focusDemand
    );
    expect(demanding).toEqual(['focus_work', 'learning_growth']);
  });

  it('leaves health, finances and other without a pillar', () => {
    const pillarless = HABIT_CATEGORY_KEYS.filter(
      (key) => HABIT_CATEGORY_MAPPING[key].pillar === null
    );
    expect(pillarless).toEqual(['health', 'finances', 'other']);
  });
});

describe('getHabitCategoryMapping', () => {
  it('returns the mapping for a known key', () => {
    expect(getHabitCategoryMapping('focus_work')).toEqual({
      pillar: 'focus',
      focusDemand: true,
    });
  });

  it('returns null for a pre-feature habit (null / undefined)', () => {
    expect(getHabitCategoryMapping(null)).toBeNull();
    expect(getHabitCategoryMapping(undefined)).toBeNull();
  });

  it('returns null for a value that is not one of the nine', () => {
    // A legacy free-text category must never resolve through this table.
    expect(getHabitCategoryMapping('Mindfulness' as any)).toBeNull();
    expect(getHabitCategoryMapping('Brain Health' as any)).toBeNull();
    expect(getHabitCategoryMapping('' as any)).toBeNull();
  });
});

describe('habitBenefitsFromFocusWindow', () => {
  it('is true only for the focus-demanding kinds', () => {
    expect(habitBenefitsFromFocusWindow('focus_work')).toBe(true);
    expect(habitBenefitsFromFocusWindow('learning_growth')).toBe(true);
  });

  it('is false for every other key', () => {
    const rest = HABIT_CATEGORY_KEYS.filter(
      (key) => key !== 'focus_work' && key !== 'learning_growth'
    );
    for (const key of rest) {
      expect(habitBenefitsFromFocusWindow(key)).toBe(false);
    }
  });

  it('is false, not undefined, for pre-feature and unknown habits', () => {
    // Absence of a signal must never read as a positive one.
    expect(habitBenefitsFromFocusWindow(null)).toBe(false);
    expect(habitBenefitsFromFocusWindow(undefined)).toBe(false);
    expect(habitBenefitsFromFocusWindow('Fitness' as any)).toBe(false);
  });
});

describe('habitCategoryLabel', () => {
  it.each([
    ['movement', 'Movement'],
    ['sleep_rest', 'Sleep & rest'],
    ['focus_work', 'Focus & work'],
    ['mindfulness', 'Mindfulness'],
    ['learning_growth', 'Learning & growth'],
    ['health', 'Health'],
    ['connection', 'Connection'],
    ['finances', 'Finances'],
    ['other', 'Other'],
  ])('renders %s as "%s"', (key, label) => {
    expect(habitCategoryLabel(key as HabitCategoryKey)).toBe(label);
  });

  it('returns null for a pre-feature habit, so surfaces render nothing', () => {
    expect(habitCategoryLabel(null)).toBeNull();
    expect(habitCategoryLabel(undefined)).toBeNull();
  });

  it('returns null for an unknown value, never the raw input', () => {
    expect(habitCategoryLabel('Mindfulness' as any)).toBeNull();
    expect(habitCategoryLabel('' as any)).toBeNull();
  });

  it('never leaks the stored key or the pillar as a label', () => {
    for (const key of HABIT_CATEGORY_KEYS) {
      const label = habitCategoryLabel(key);
      expect(label).not.toBe(key);
      expect(label).not.toBe(HABIT_CATEGORY_MAPPING[key].pillar);
    }
  });
});

describe('habitPillar', () => {
  it('returns the pillar for keys that have one', () => {
    expect(habitPillar('movement')).toBe('energy');
    expect(habitPillar('focus_work')).toBe('focus');
    expect(habitPillar('connection')).toBe('community');
  });

  it('returns null for pillarless, pre-feature and unknown habits', () => {
    expect(habitPillar('health')).toBeNull();
    expect(habitPillar('other')).toBeNull();
    expect(habitPillar(null)).toBeNull();
    expect(habitPillar('Connection' as any)).toBeNull();
  });
});
