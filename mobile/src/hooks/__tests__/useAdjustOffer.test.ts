/**
 * The adjustment offer's runtime (slice 7b, section 9 R5).
 *
 * WHAT THIS SUITE EXISTS FOR, in order of how easily each would ship broken:
 *
 *   1. THE DOOR-OPENING WRITE IS GATED AND DOES NOT LOOP. `recordAdjustOffered`
 *      stamps the field the phase page reads, and the write bumps `updatedAt`,
 *      which feeds `revisionToken`, which re-runs this hook's effects. Without
 *      the `adjustOffered` gate that is a write on every focus for as long as
 *      the card is up, each one triggering another resolve. Rendering once and
 *      asserting one write proves nothing; the re-render carrying the freshly
 *      resolved flag is what separates a gated implementation from an ungated
 *      one. Same shape as the exposure test in useAdvanceOffer.
 *
 *   2. THE HOOK DOES NOT RE-SORT. It hands the service's array straight to the
 *      derivation, and the assertion is that a deliberately unsorted array
 *      produces the answer the ARRAY ORDER implies rather than the answer a
 *      re-sort would produce.
 *
 *   3. THE SECOND BODY IS CHOSEN BY THE DECLINE COUNT, and the count itself
 *      never leaves the hook.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAdjustOffer } from '../useAdjustOffer';
import type { PhaseContext } from '../../journey/resolveJourney';
import type { PhaseKey, PhaseRead, WeeklyCycle } from '../../types/models';

const mockRecordOffered = jest.fn(async () => {});
const mockRecordDeclined = jest.fn(async () => {});
const mockGetCycles = jest.fn(async () => [] as WeeklyCycle[]);
const mockLogEvent = jest.fn();

jest.mock('../../services/firebase/journeyState.service', () => ({
  recordAdjustOffered: (...a: any[]) => mockRecordOffered(...(a as [])),
  recordAdjustDeclined: (...a: any[]) => mockRecordDeclined(...(a as [])),
}));
jest.mock('../../services/firebase/weeklyCycle.service', () => ({
  getWeeklyCyclesSince: (...a: any[]) => mockGetCycles(...(a as [])),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...(a as [])),
}));

const TODAY = '2026-09-10';

const phase = (over: Partial<PhaseContext> = {}): PhaseContext => ({
  phaseKey: 'remove',
  destination: 'focus',
  capacitySeed: 'normal',
  revisionToken: 1,
  enteredAtIso: '2026-08-01',
  hasRemoveCapture: true,
  advanceDeclined: false,
  advanceExposures: 0,
  advanceFirstOfferedOn: null,
  advanceLastExposedOn: null,
  adjustArmedFromIso: '2026-08-01',
  adjustDeclines: 0,
  adjustOffered: false,
  ...over,
});

const week = (
  weekStart: string,
  weekEnd: string,
  phaseRead?: PhaseRead,
  phaseKeyAtRead: PhaseKey = 'remove'
): WeeklyCycle =>
  ({
    id: 'c-' + weekStart,
    userId: 'u1',
    weekStart,
    weekEnd,
    phaseRead,
    ...(phaseRead ? { phaseKeyAtRead } : {}),
  }) as unknown as WeeklyCycle;

/** Two consecutive not_moving reads: the offer is due. */
const DUE = [
  week('2026-08-24', '2026-08-30', 'not_moving'),
  week('2026-08-31', '2026-09-06', 'not_moving'),
];

const render = (over: Partial<PhaseContext> = {}) =>
  renderHook(
    ({ p }: { p: PhaseContext | null }) =>
      useAdjustOffer({ uid: 'u1', phase: p, todayIso: TODAY }),
    { initialProps: { p: over === null ? null : phase(over) } }
  );

beforeEach(() => {
  mockRecordOffered.mockClear();
  mockRecordDeclined.mockClear();
  mockLogEvent.mockClear();
  mockGetCycles.mockReset();
  mockGetCycles.mockResolvedValue([]);
});

describe('useAdjustOffer - placement', () => {
  test('two not_moving reads put the offer on Today', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render();
    await waitFor(() => expect(result.current.placement).toBe('today'));
  });

  test('nothing is due with no reads at all', async () => {
    const { result } = render();
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalled());
    expect(result.current.placement).toBe('hidden');
  });

  test('a null phase is hidden, reads nothing and writes nothing', async () => {
    // Every legacy path and every JOURNEY_IA-off render arrives here as null.
    const { result } = renderHook(() =>
      useAdjustOffer({ uid: 'u1', phase: null, todayIso: TODAY })
    );
    expect(result.current.placement).toBe('hidden');
    expect(mockGetCycles).not.toHaveBeenCalled();
    expect(mockRecordOffered).not.toHaveBeenCalled();
  });

  test('an unresolved phase entry date reads nothing', async () => {
    // `enteredAtIso` is '' until the server resolves `enteredAt`. Reading
    // "since the empty string" would be a window stretching back to the epoch.
    render({ enteredAtIso: '' });
    await new Promise((r) => setTimeout(r, 0));
    expect(mockGetCycles).not.toHaveBeenCalled();
  });

  test('reads SINCE the phase entry, not since forever', async () => {
    render({ enteredAtIso: '2026-08-15' });
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalledWith('u1', '2026-08-15'));
  });

  test('the cap demotes to the journey, never to hidden', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render({ adjustDeclines: 2 });
    await waitFor(() => expect(result.current.placement).toBe('journey'));
  });
});

describe('useAdjustOffer - the ordering contract', () => {
  test('CONSUMES the service order and does not re-sort', async () => {
    // The array below is in an order no sort would produce. Read as given, the
    // last two are not_moving and the offer is due. Re-sorted by week, the
    // most recent would be the 'moving' week and it would not be.
    mockGetCycles.mockResolvedValue([
      week('2026-09-07', '2026-09-13', 'moving'),
      week('2026-08-24', '2026-08-30', 'not_moving'),
      week('2026-08-31', '2026-09-06', 'not_moving'),
    ]);
    const { result } = render();
    await waitFor(() => expect(result.current.placement).toBe('today'));
  });

  test('a failed read costs the offer, never the screen', async () => {
    mockGetCycles.mockRejectedValue(new Error('offline'));
    const { result } = render();
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalled());
    expect(result.current.placement).toBe('hidden');
  });
});

describe('useAdjustOffer - the door-opening write', () => {
  test('stamps adjustOfferedAt when the offer first reaches Today', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    render();
    await waitFor(() => expect(mockRecordOffered).toHaveBeenCalledWith('u1'));
    await waitFor(() =>
      expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_adjust_offered', {})
    );
  });

  test('DOES NOT WRITE AGAIN once the resolver reports it stamped', async () => {
    // THE TEST THAT MATTERS. A broken implementation also writes once on the
    // first render; what separates it is the re-render carrying the freshly
    // resolved `adjustOffered`. Without the gate this writes on every focus,
    // and every write bumps revisionToken and triggers another resolve.
    mockGetCycles.mockResolvedValue(DUE);
    const { rerender } = render();
    await waitFor(() => expect(mockRecordOffered).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ adjustOffered: true, revisionToken: 2 }) });
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalledTimes(2));
    expect(mockRecordOffered).toHaveBeenCalledTimes(1);
  });

  test('writes nothing for an offer that is not on Today', async () => {
    // A demoted or hidden offer has not been made, so the door it would open
    // has not been earned.
    mockGetCycles.mockResolvedValue(DUE);
    render({ adjustDeclines: 2 });
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalled());
    expect(mockRecordOffered).not.toHaveBeenCalled();
  });
});

describe('useAdjustOffer - declining', () => {
  test('records the decline and takes the card off Today at once', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render();
    await waitFor(() => expect(result.current.placement).toBe('today'));

    act(() => result.current.decline());

    expect(mockRecordDeclined).toHaveBeenCalledWith('u1');
    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_adjust_declined', {});
    // Local demotion, so the answer lands on this render rather than waiting
    // for the re-read. A card left up after a tap re-asks a user who has just
    // answered.
    await waitFor(() => expect(result.current.placement).toBe('journey'));
  });

  test('the decline still demotes when the write fails', async () => {
    mockRecordDeclined.mockRejectedValueOnce(new Error('offline'));
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render();
    await waitFor(() => expect(result.current.placement).toBe('today'));
    act(() => result.current.decline());
    await waitFor(() => expect(result.current.placement).toBe('journey'));
  });
});

describe('useAdjustOffer - which body', () => {
  test('zero declines is the first offer', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render({ adjustDeclines: 0 });
    await waitFor(() => expect(result.current.placement).toBe('today'));
    expect(result.current.isSecondOffer).toBe(false);
  });

  test('one decline is the second offer', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render({ adjustDeclines: 1 });
    await waitFor(() => expect(result.current.placement).toBe('today'));
    expect(result.current.isSecondOffer).toBe(true);
  });

  test('the COUNT never leaves the hook', async () => {
    // A boolean crosses the boundary, never the number. Section 8 bans the
    // counter, and holding that at the interface means no card could render one
    // even by accident.
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render({ adjustDeclines: 2 });
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalled());
    expect(Object.keys(result.current).sort()).toEqual([
      'decline',
      'isSecondOffer',
      'placement',
    ]);
  });
});
