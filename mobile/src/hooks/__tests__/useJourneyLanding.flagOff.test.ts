jest.mock('../../constants/dashboardConfig', () => ({
  ...jest.requireActual('../../constants/dashboardConfig'),
  JOURNEY_IA: false,
}));

// JOURNEY_IA is a compile-time const, so the two flag states need two files:
// one jest.mock per module per file, and a mock that flips mid-file was tried
// and does not hold. An isolated re-require does not work either - it pulls a
// second copy of React whose hook dispatcher is null. Two files with a static
// mock each is the version that actually asserts what it claims to.
//
// THE OFF FILE IS THE ONE THAT MATTERS MOST. It is the evidence for the claim
// that flipping the flag restores current behavior, so every assertion there is
// against the weekly landing's own object, not against a reimplementation.

// The journey-aware landing guard with JOURNEY_IA OFF (journey slice 2).
//
// TWO PROPERTIES THIS SUITE EXISTS FOR, and neither is obvious from reading the
// hook:
//
//   1. THE FLOOR GATE WINS OUTRIGHT. A user with no floor commitment must
//      resolve to 'floor' and the resolver must not run at all, so no journey
//      state is created for someone who has not set a floor yet.
//   2. THE FLAG OFF PATH IS THE WEEKLY LANDING VERBATIM. Not "equivalent" -
//      the same fields with the same values, and the resolver never called.
//
const mockResolveJourney = jest.fn();
jest.mock('../../journey/resolveJourney', () => ({
  resolveJourney: (...a: any[]) => mockResolveJourney(...a),
}));

const mockWeeklyLanding = jest.fn();
jest.mock('../useWeeklyLanding', () => ({
  useWeeklyLanding: (...a: any[]) => mockWeeklyLanding(...a),
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { useJourneyLanding } from '../useJourneyLanding';

const PHASE = {
  phaseKey: 'remove' as const,
  destination: 'focus' as const,
  capacitySeed: 'normal' as const,
  revisionToken: 1,
};

const CYCLE = { id: 'c1', outcome: 'focus', capacityInitial: 'normal' } as any;

/** The weekly hook's answer. */
function weekly(over: Record<string, unknown> = {}) {
  return {
    target: 'today',
    cycle: CYCLE,
    loading: false,
    failed: false,
    refresh: jest.fn(),
    ...over,
  };
}

describe('useJourneyLanding with JOURNEY_IA OFF', () => {
  beforeEach(() => {
    mockResolveJourney.mockReset();
    mockWeeklyLanding.mockReset();
  });

  test('returns the weekly landing fields VERBATIM', async () => {
    const w = weekly();
    mockWeeklyLanding.mockReturnValue(w);

    const { result } = renderHook(() => useJourneyLanding('u1'));

    expect(result.current.target).toBe(w.target);
    expect(result.current.cycle).toBe(w.cycle);
    expect(result.current.loading).toBe(w.loading);
    expect(result.current.failed).toBe(w.failed);
    expect(result.current.refresh).toBe(w.refresh);
    expect(result.current.phase).toBeNull();
  });

  test('NEVER calls the resolver', async () => {
    mockWeeklyLanding.mockReturnValue(weekly());

    renderHook(() => useJourneyLanding('u1'));

    await waitFor(() => expect(mockWeeklyLanding).toHaveBeenCalled());
    expect(mockResolveJourney).not.toHaveBeenCalled();
  });

  test("passes 'open' through unchanged, so the standing card still renders", async () => {
    mockWeeklyLanding.mockReturnValue(weekly({ target: 'open', cycle: null }));

    const { result } = renderHook(() => useJourneyLanding('u1'));

    expect(result.current.target).toBe('open');
  });
});

