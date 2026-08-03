import { resolveWeeklyEntry } from '../weeklyEntry';

const TODAY = '2026-08-03';

describe('resolveWeeklyEntry', () => {
  describe('the floor guard (the null-guard branch)', () => {
    test('no floor commitment sends the user to capture, even with a live cycle', () => {
      // The floor is captured while the user is calm (spec 10.1). It comes
      // before the weekly open regardless of what else is already true.
      expect(
        resolveWeeklyEntry({
          floorCommitment: null,
          latestCycleWeekStart: TODAY,
          todayIso: TODAY,
        })
      ).toBe('floor');
    });

    test('no floor and no cycle also sends the user to capture', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment: null,
          latestCycleWeekStart: null,
          todayIso: TODAY,
        })
      ).toBe('floor');
    });

    test('an empty-string floor counts as missing, not as captured', () => {
      // getFloorCommitment already collapses whitespace-only values to null;
      // this asserts the rule does not treat a falsy string as a commitment
      // if one ever reaches it another way.
      expect(
        resolveWeeklyEntry({
          floorCommitment: '',
          latestCycleWeekStart: null,
          todayIso: TODAY,
        })
      ).toBe('floor');
    });
  });

  describe('with a floor captured', () => {
    const floorCommitment = 'ten minutes outside';

    test('no cycle at all opens a week', () => {
      expect(
        resolveWeeklyEntry({ floorCommitment, latestCycleWeekStart: null, todayIso: TODAY })
      ).toBe('open');
    });

    test('a cycle opened today lands on Today', () => {
      expect(
        resolveWeeklyEntry({ floorCommitment, latestCycleWeekStart: TODAY, todayIso: TODAY })
      ).toBe('today');
    });

    test('a cycle six days old is still the current week', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycleWeekStart: '2026-07-28',
          todayIso: TODAY,
        })
      ).toBe('today');
    });

    test('a cycle exactly seven days old opens a fresh week', () => {
      // Day 7 is the boundary the decision turns on: strictly under seven days
      // is current, seven is not.
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycleWeekStart: '2026-07-27',
          todayIso: TODAY,
        })
      ).toBe('open');
    });

    test('a long-abandoned cycle opens a fresh week', () => {
      expect(
        resolveWeeklyEntry({
          floorCommitment,
          latestCycleWeekStart: '2026-01-05',
          todayIso: TODAY,
        })
      ).toBe('open');
    });
  });
});
