import { nextTierDown, nextTierUp } from '../tierSteps';
import { CAPACITY_TIERS } from '../protocolMatrix';
import type { CapacityTier } from '../types';

describe('tier stepping (spec 7, the in-week re-set)', () => {
  describe('nextTierDown', () => {
    test('normal steps down to limited', () => {
      expect(nextTierDown('normal')).toBe('limited');
    });

    test('limited steps down to slammed', () => {
      expect(nextTierDown('limited')).toBe('slammed');
    });

    test('slammed is the floor of the ladder and has nothing below it', () => {
      expect(nextTierDown('slammed')).toBeNull();
    });
  });

  describe('nextTierUp', () => {
    test('slammed steps up to limited', () => {
      expect(nextTierUp('slammed')).toBe('limited');
    });

    test('limited steps up to normal', () => {
      expect(nextTierUp('limited')).toBe('normal');
    });

    test('normal is the top of the ladder and has nothing above it', () => {
      expect(nextTierUp('normal')).toBeNull();
    });
  });

  describe('the two directions agree with each other', () => {
    test.each(CAPACITY_TIERS)('stepping %s down and back up returns to it', (tier) => {
      const down = nextTierDown(tier);
      if (down === null) return; // the bottom rung has no round trip
      expect(nextTierUp(down)).toBe(tier);
    });

    test.each(CAPACITY_TIERS)('stepping %s up and back down returns to it', (tier) => {
      const up = nextTierUp(tier);
      if (up === null) return; // the top rung has no round trip
      expect(nextTierDown(up)).toBe(tier);
    });
  });

  describe('CAPACITY_TIERS is the only ordering source', () => {
    // These are the tests that go red if someone restates the tier order
    // somewhere else and the two copies drift apart. They read the array rather
    // than naming tiers, so reordering CAPACITY_TIERS re-derives them.
    test('exactly one tier has no step down, and it is the last of the array', () => {
      const bottom = CAPACITY_TIERS.filter((t) => nextTierDown(t) === null);
      expect(bottom).toEqual([CAPACITY_TIERS[CAPACITY_TIERS.length - 1]]);
    });

    test('exactly one tier has no step up, and it is the first of the array', () => {
      const top = CAPACITY_TIERS.filter((t) => nextTierUp(t) === null);
      expect(top).toEqual([CAPACITY_TIERS[0]]);
    });

    test('stepping down walks the array forwards (the array is capacity-descending)', () => {
      CAPACITY_TIERS.forEach((tier, i) => {
        expect(nextTierDown(tier)).toBe(CAPACITY_TIERS[i + 1] ?? null);
      });
    });

    test('stepping up walks the array backwards', () => {
      CAPACITY_TIERS.forEach((tier, i) => {
        expect(nextTierUp(tier)).toBe(i === 0 ? null : CAPACITY_TIERS[i - 1]);
      });
    });
  });

  describe('an unknown tier cannot silently produce a neighbour', () => {
    test('a value outside the ladder steps nowhere in either direction', () => {
      // Defensive: a tier read back from an older document, or a widened union,
      // must not resolve to index -1 and hand back the wrong end of the array.
      const bogus = 'ludicrous' as CapacityTier;
      expect(nextTierDown(bogus)).toBeNull();
      expect(nextTierUp(bogus)).toBeNull();
    });
  });
});
