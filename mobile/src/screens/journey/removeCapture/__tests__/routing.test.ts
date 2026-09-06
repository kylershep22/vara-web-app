/**
 * The capture routing table (journey slices 3c-i and 3c-ii).
 *
 * THE WHOLE TABLE IN ONE FILE, asserted as data rather than discovered by
 * walking five screens. The routes are the product decision; the screens just
 * obey them.
 */
import {
  familyForClarifyChip,
  legForIdentifyChip,
  legForSleepChip,
  replacementSlotFor,
  timingForChip,
  timingTitleFor,
} from '../routing';
import {
  IDENTIFY_CHIPS,
  SLEEP_CHIPS,
  CLARIFY_CHIPS,
  TIMING_CHIPS,
  REPLACEMENT_MENUS,
} from '../copy';
import type { RemoveFamily, RemoveTiming } from '../../../../types/models';

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

describe('the 3c-ii replacement fork', () => {
  test.each([
    ['morning', 'morning'],
    ['day', 'day'],
    ['evening', 'evening'],
  ] as const)('a behavioral capture timed %s gets the %s menu', (timing, slot) => {
    expect(replacementSlotFor('behavioral', timing)).toBe(slot);
  });

  test("'It varies' NEVER gets a menu, whatever the family", () => {
    // The Sept 2 decision (roadmap section 13): varies routes scaffold-only,
    // because a replacement anchored to a time the user does not have is worse
    // than none.
    for (const family of ['behavioral', 'mental', 'interpersonal'] as const) {
      expect(replacementSlotFor(family, 'varies')).toBeNull();
    }
  });

  test('a non-behavioral capture NEVER gets a menu, whatever the timing', () => {
    // A thought you cannot switch off and a person do not vacate a slot, so
    // "what would you rather do with that time" is not a question they answer.
    for (const family of ['mental', 'interpersonal'] as const) {
      for (const timing of ['morning', 'day', 'evening', 'varies'] as const) {
        expect(replacementSlotFor(family, timing)).toBeNull();
      }
    }
  });

  test('absent family or absent timing gets no menu', () => {
    expect(replacementSlotFor(null, 'morning')).toBeNull();
    expect(replacementSlotFor(undefined, 'morning')).toBeNull();
    expect(replacementSlotFor('behavioral', null)).toBeNull();
    expect(replacementSlotFor('behavioral', undefined)).toBeNull();
  });

  test('EXHAUSTIVE over every family and timing pair, so the menu set cannot widen unnoticed', () => {
    // Anti-vacuity: pins the qualifying set to exactly three of the sixteen
    // combinations. A test that only asserted the positives would stay green if
    // the predicate started returning a slot for mental captures too.
    const families: (RemoveFamily | null)[] = [
      'behavioral',
      'mental',
      'interpersonal',
      null,
    ];
    const timings: (RemoveTiming | null)[] = ['morning', 'day', 'evening', 'varies', null];
    const qualifying: string[] = [];
    for (const family of families) {
      for (const timing of timings) {
        const slot = replacementSlotFor(family, timing);
        if (slot) qualifying.push(`${family}/${timing}->${slot}`);
      }
    }
    expect(qualifying.sort()).toEqual([
      'behavioral/day->day',
      'behavioral/evening->evening',
      'behavioral/morning->morning',
    ]);
  });

  test('EVERY slot the predicate can return has a menu, so no pick can dead-end', () => {
    for (const timing of ['morning', 'day', 'evening'] as const) {
      const slot = replacementSlotFor('behavioral', timing);
      expect(slot).not.toBeNull();
      expect(REPLACEMENT_MENUS[slot!]).toHaveLength(6);
    }
  });

  test('THE FREE-TEXT PATH CANNOT REACH A MENU, by construction', () => {
    // Screen B goes straight to the first move and never asks timing, so every
    // free-text capture arrives with timing null. That is the structural half
    // of the curated-strings-only rule: the user's own words cannot appear on
    // the replacement screen because that screen is unreachable from the path
    // that collects them.
    expect(legForIdentifyChip('other').next).toBe('clarify');
    for (const chip of CLARIFY_CHIPS) {
      const family = familyForClarifyChip(chip.id);
      // The clarify screen sets no timing at all; null is what the context holds.
      expect(replacementSlotFor(family, null)).toBeNull();
    }
  });

  test('the sleep chips split exactly as the family rule predicts', () => {
    // Three of the four sleep options are behavioral and land on evening, so
    // they qualify; "my mind won't switch off" is mental and keeps the scaffold.
    const qualifying = SLEEP_CHIPS.filter((c) => {
      const leg = legForSleepChip(c.id);
      return replacementSlotFor(leg.family ?? null, leg.timing ?? null) !== null;
    }).map((c) => c.id);
    expect(qualifying).toEqual(['sleep_phone', 'sleep_late', 'sleep_unsure']);
  });
});
