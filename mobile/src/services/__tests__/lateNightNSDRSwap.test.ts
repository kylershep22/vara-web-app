import {
  getLateNightNSDRSwap,
  type LateNightNSDROverride,
} from '../lateNightNSDRSwap';
import type { BrainState } from '../../types/models';

const ALL_STATES: ReadonlyArray<BrainState> = [
  'wired',
  'foggy',
  'steady',
  'clear',
  'alive',
];

describe('getLateNightNSDRSwap — hour boundaries (state=wired)', () => {
  // The override fires for hours 22, 23, 0, 1, 2, 3 (six hours
  // total). Hours 4–21 (eighteen hours) return null. Boundary
  // tests verify both inclusive ends of the late-night window.
  it.each([
    ['boundary-low-out: 21 → null', 21, null],
    ['boundary-low-in: 22 → override', 22, { protocolId: 'nsdr-20' }],
    ['midnight: 0 → override', 0, { protocolId: 'nsdr-20' }],
    ['pre-dawn: 3 → override', 3, { protocolId: 'nsdr-20' }],
    ['boundary-high-out: 4 → null', 4, null],
    ['daytime: 14 → null', 14, null],
    ['evening: 19 → null', 19, null],
    ['mid-morning: 9 → null', 9, null],
  ] as ReadonlyArray<[string, number, LateNightNSDROverride | null]>)(
    '%s',
    (_label, hour, expected) => {
      expect(getLateNightNSDRSwap('wired', hour)).toEqual(expected);
    }
  );
});

describe('getLateNightNSDRSwap — state filter (hour=23, late-night)', () => {
  // Even at peak late-night hour, only Wired triggers the override.
  // The other four states return null regardless of hour.
  it.each(ALL_STATES)('state=%s at hour=23 returns null unless wired', (state) => {
    const result = getLateNightNSDRSwap(state, 23);
    if (state === 'wired') {
      expect(result).toEqual({ protocolId: 'nsdr-20' });
    } else {
      expect(result).toBeNull();
    }
  });
});

describe('getLateNightNSDRSwap — purity', () => {
  it('returns the same result on repeated calls with the same input', () => {
    const a = getLateNightNSDRSwap('wired', 23);
    const b = getLateNightNSDRSwap('wired', 23);
    const c = getLateNightNSDRSwap('wired', 23);
    expect(a).toEqual(b);
    expect(b).toEqual(c);
  });
});

describe('getLateNightNSDRSwap — exhaustive (state, hour) sweep', () => {
  // 5 states × 24 hours = 120 cells. Mirrors the outcomeClassifier
  // matrix-test discipline: catches a regression that splits hour
  // logic from state logic in unintended ways.
  const expected = (state: BrainState, hour: number): LateNightNSDROverride | null => {
    const lateNight = hour >= 22 || hour < 4;
    if (state === 'wired' && lateNight) return { protocolId: 'nsdr-20' };
    return null;
  };

  it('matches the closed-form expectation for every (state, hour) pair', () => {
    for (const state of ALL_STATES) {
      for (let hour = 0; hour < 24; hour++) {
        expect(getLateNightNSDRSwap(state, hour)).toEqual(expected(state, hour));
      }
    }
  });
});
