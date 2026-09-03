/**
 * The capture routing table (journey slice 3c-i).
 *
 * THE WHOLE TABLE IN ONE FILE, asserted as data rather than discovered by
 * walking five screens. The routes are the product decision; the screens just
 * obey them.
 */
import {
  familyForClarifyChip,
  legForIdentifyChip,
  legForSleepChip,
  timingForChip,
  timingTitleFor,
} from '../routing';
import { IDENTIFY_CHIPS, SLEEP_CHIPS, CLARIFY_CHIPS, TIMING_CHIPS } from '../copy';

describe('screen A routes every chip', () => {
  test.each([
    ['scroll', 'timing', 'behavioral'],
    ['thoughts', 'timing', 'mental'],
    ['sleep', 'sleep', undefined],
    ['relationship', 'firstMove', 'interpersonal'],
    ['other', 'clarify', undefined],
  ] as const)('%s goes to %s', (chip, next, family) => {
    const leg = legForIdentifyChip(chip);
    expect(leg.next).toBe(next);
    expect(leg.family).toBe(family);
  });

  test('every rendered chip has a route, so none can dead-end', () => {
    // Guards the copy list and the routing table against drifting apart: a chip
    // added to one and not the other is a screen with a button that goes
    // nowhere.
    for (const chip of IDENTIFY_CHIPS) {
      expect(legForIdentifyChip(chip.id).next).toBeDefined();
    }
  });

  test('the relationship path SKIPS timing', () => {
    expect(legForIdentifyChip('relationship').next).toBe('firstMove');
    expect(legForIdentifyChip('relationship').timing).toBeUndefined();
  });
});

describe('screen C, the sleep sub-question', () => {
  test.each([
    ['sleep_phone', 'behavioral'],
    ['sleep_late', 'behavioral'],
    ['sleep_mind', 'mental'],
    ['sleep_unsure', 'behavioral'],
  ] as const)('%s resolves family %s', (chip, family) => {
    expect(legForSleepChip(chip).family).toBe(family);
  });

  test('EVERY sleep option sets evening and skips the timing screen', () => {
    for (const chip of SLEEP_CHIPS) {
      const leg = legForSleepChip(chip.id);
      expect(leg.timing).toBe('evening');
      expect(leg.next).toBe('firstMove');
    }
  });
});

describe('screen B, clarify', () => {
  test.each([
    ['do', 'behavioral'],
    ['loop', 'mental'],
    ['person', 'interpersonal'],
  ] as const)('%s is family %s', (chip, family) => {
    expect(familyForClarifyChip(chip)).toBe(family);
  });

  test('every rendered clarify chip maps to a family', () => {
    for (const chip of CLARIFY_CHIPS) {
      expect(familyForClarifyChip(chip.id)).toBeTruthy();
    }
  });
});

describe('screen D, timing', () => {
  test('every rendered timing chip maps to the stored union', () => {
    for (const chip of TIMING_CHIPS) {
      expect(timingForChip(chip.id)).toBe(chip.id);
    }
  });

  test('an unknown answer falls back to varies, which promises least', () => {
    expect(timingForChip('whenever')).toBe('varies');
  });

  test('the heading follows the family', () => {
    expect(timingTitleFor('mental')).toBe('mental');
    expect(timingTitleFor('behavioral')).toBe('behavioral');
    expect(timingTitleFor('interpersonal')).toBe('behavioral');
    expect(timingTitleFor(undefined)).toBe('behavioral');
  });
});

describe('the chips path is complete without the free-text path', () => {
  test('four of five opening chips reach a capture without clarify', () => {
    // The separability requirement: if the free-text path were disabled
    // tomorrow, these four routes would still complete end to end.
    const withoutClarify = IDENTIFY_CHIPS.filter(
      (c) => legForIdentifyChip(c.id).next !== 'clarify'
    );
    expect(withoutClarify).toHaveLength(4);
  });
});
