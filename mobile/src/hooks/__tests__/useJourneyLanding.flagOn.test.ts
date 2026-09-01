jest.mock('../../constants/dashboardConfig', () => ({
  ...jest.requireActual('../../constants/dashboardConfig'),
  JOURNEY_IA: true,
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

// The journey-aware landing guard with JOURNEY_IA ON (journey slice 2).
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

describe('useJourneyLanding with JOURNEY_IA ON', () => {
  beforeEach(() => {
    mockResolveJourney.mockReset();
    mockWeeklyLanding.mockReset();
  });

  test("THE FLOOR GATE WINS and the resolver never runs", async () => {
    // A user who has not set a floor must not be migrated onto a journey. The
    // floor screen comes first, exactly as it does today.
    mockWeeklyLanding.mockReturnValue(weekly({ target: 'floor', cycle: null }));

    const { result } = renderHook(() => useJourneyLanding('u1'));

    expect(result.current.target).toBe('floor');
    expect(result.current.phase).toBeNull();
    await waitFor(() => expect(mockWeeklyLanding).toHaveBeenCalled());
    expect(mockResolveJourney).not.toHaveBeenCalled();
  });

  test("a resolved journey reports 'today' with the phase", async () => {
    mockWeeklyLanding.mockReturnValue(weekly());
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });

    const { result } = renderHook(() => useJourneyLanding('u1'));

    await waitFor(() => expect(result.current.target).toBe('today'));
    expect(result.current.phase).toEqual(PHASE);
  });

  test('CARRIES THE CYCLE THROUGH for the close entry and the summary line', async () => {
    mockWeeklyLanding.mockReturnValue(weekly());
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });

    const { result } = renderHook(() => useJourneyLanding('u1'));

    await waitFor(() => expect(result.current.target).toBe('today'));
    expect(result.current.cycle).toBe(CYCLE);
  });

  test("'open' IS NOT EMITTED: an expired week still lands on Today", async () => {
    // The one place behavior genuinely differs under the flag. A journey user
    // whose week ran out stays on Today rather than being pushed into the
    // weekly open, because the journey is now what says where they are.
    mockWeeklyLanding.mockReturnValue(weekly({ target: 'open', cycle: null }));
    mockResolveJourney.mockResolvedValue({ target: 'today', phase: PHASE });

    const { result } = renderHook(() => useJourneyLanding('u1'));

    await waitFor(() => expect(result.current.target).toBe('today'));
    expect(result.current.cycle).toBeNull();
  });

  test("a 'legacy' resolution falls back to the weekly answer, 'open' included", async () => {
    mockWeeklyLanding.mockReturnValue(weekly({ target: 'open', cycle: null }));
    mockResolveJourney.mockResolvedValue({ target: 'legacy' });

    const { result } = renderHook(() => useJourneyLanding('u1'));

    await waitFor(() => expect(result.current.target).toBe('open'));
    expect(result.current.phase).toBeNull();
  });

  test('reports loading rather than a target while the resolver is in flight', async () => {
    // Never 'legacy' for a frame: that would flash the weekly surface at a
    // journey user before the resolver answered.
    mockWeeklyLanding.mockReturnValue(weekly());
    mockResolveJourney.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useJourneyLanding('u1'));

    expect(result.current.target).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  test('does not resolve before the weekly guard has answered', async () => {
    mockWeeklyLanding.mockReturnValue(weekly({ target: null, cycle: null, loading: true }));

    renderHook(() => useJourneyLanding('u1'));

    await waitFor(() => expect(mockWeeklyLanding).toHaveBeenCalled());
    expect(mockResolveJourney).not.toHaveBeenCalled();
  });

  test('does not resolve without a uid', async () => {
    mockWeeklyLanding.mockReturnValue(weekly({ target: null, cycle: null }));

    renderHook(() => useJourneyLanding(undefined));

    await waitFor(() => expect(mockWeeklyLanding).toHaveBeenCalled());
    expect(mockResolveJourney).not.toHaveBeenCalled();
  });
});
