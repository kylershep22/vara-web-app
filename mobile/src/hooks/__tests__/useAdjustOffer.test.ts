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
 *   1b. AND IT IS GATED ON THE RENDERED SLOT (slice 7d). `adjustOfferedAt` is
 *      the phase page's qualification key, so a stamp made while the CAPTURE
 *      card held the slot unlocked "Try a different approach" for a user who
 *      had never been shown C2. The write moved to `useAdjustDoorStamp`, below
 *      `journeyActionFor`, and `renderSlot` runs the real precedence function
 *      between the two so the gate cannot be proved against a stub.
 *
 *   1c. `settled` DISTINGUISHES "NOT DUE" FROM "NOT READ YET". The weekly read
 *      is async and `placement` is 'hidden' for both, which is what let the
 *      advancement card win the slot for one frame on a cold open.
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

import { useAdjustDoorStamp, useAdjustOffer } from '../useAdjustOffer';
import { journeyActionFor } from '../../journey/journeyAction';
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

/** The offer hook alone: placement, body, decline, settled. It writes nothing. */
const render = (over: Partial<PhaseContext> = {}) =>
  renderHook(
    ({ p }: { p: PhaseContext | null }) =>
      useAdjustOffer({ uid: 'u1', phase: p, todayIso: TODAY }),
    { initialProps: { p: over === null ? null : phase(over) } }
  );

/**
 * Both hooks with the real `journeyActionFor` between them, wired the way
 * DashboardScreen wires them - including the input-side settled gate.
 *
 * `hasRemoveCapture` IS THE ONLY SLOT VARIABLE THAT MATTERS HERE, because
 * capture is the only action that outranks adjust. Advance is passed 'hidden'
 * throughout: it loses to adjust by the ordering 7a pinned, so varying it
 * could not change an assertion in this file.
 */
const renderSlot = (over: Partial<PhaseContext> = {}, hasRemoveCapture = true) =>
  renderHook(
    ({ p, cap }: { p: PhaseContext | null; cap: boolean }) => {
      const offer = useAdjustOffer({ uid: 'u1', phase: p, todayIso: TODAY });
      const action = offer.settled
        ? journeyActionFor({
            phaseKey: p?.phaseKey ?? null,
            hasRemoveCapture: cap,
            captureDismissed: false,
            adjustPlacement: offer.placement,
            advancePlacement: 'hidden',
          })
        : null;
      useAdjustDoorStamp({
        uid: 'u1',
        action,
        alreadyOffered: p?.adjustOffered ?? false,
      });
      return { ...offer, action };
    },
    { initialProps: { p: phase(over), cap: hasRemoveCapture } }
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

  test('a null phase is hidden, reads nothing, and is SETTLED', async () => {
    // Every legacy path and every JOURNEY_IA-off render arrives here as null.
    // Settled matters as much as hidden: with no phase there is no weekly
    // question coming, and a pending answer would gate Home's whole
    // journey-action slot on a read that never runs.
    const { result } = renderHook(() =>
      useAdjustOffer({ uid: 'u1', phase: null, todayIso: TODAY })
    );
    expect(result.current.placement).toBe('hidden');
    expect(result.current.settled).toBe(true);
    expect(mockGetCycles).not.toHaveBeenCalled();
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

describe('useAdjustOffer - settled', () => {
  test('is FALSE until the weekly read answers', async () => {
    // The frame the advancement card used to win. `placement` is 'hidden' here
    // and it means "I do not know yet", which is why Home cannot read it.
    let release: (rows: WeeklyCycle[]) => void = () => {};
    mockGetCycles.mockReturnValue(
      new Promise<WeeklyCycle[]>((resolve) => {
        release = resolve;
      })
    );
    const { result } = render();
    expect(result.current.settled).toBe(false);
    expect(result.current.placement).toBe('hidden');

    await act(async () => {
      release(DUE);
    });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.placement).toBe('today');
  });

  test('SETTLES ON A FAILED READ, so one dropped request does not blank the slot', async () => {
    // Home gates its journey-action slot on this flag. Leaving it false after a
    // rejection would withhold the capture card and C2 for the rest of the
    // session from a user whose network hiccupped once.
    mockGetCycles.mockRejectedValue(new Error('offline'));
    const { result } = render();
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(result.current.placement).toBe('hidden');
  });

  test('SETTLES when there is no entry date to read since', async () => {
    // The effect bails without reading, and a bail is an answer.
    const { result } = render({ enteredAtIso: '' });
    await waitFor(() => expect(result.current.settled).toBe(true));
    expect(mockGetCycles).not.toHaveBeenCalled();
  });

  test('NEVER GOES BACK once true, across a re-read', async () => {
    // The read effect re-runs on `revisionToken`, and a flag that reset would
    // blank Today's slot on every write to the journey document.
    mockGetCycles.mockResolvedValue(DUE);
    const { rerender, result } = render();
    await waitFor(() => expect(result.current.settled).toBe(true));

    rerender({ p: phase({ revisionToken: 2 }) });
    expect(result.current.settled).toBe(true);
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalledTimes(2));
    expect(result.current.settled).toBe(true);
  });
});

describe('useAdjustDoorStamp - the door-opening write', () => {
  test('stamps adjustOfferedAt when the C2 card first draws', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    renderSlot();
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
    const { rerender } = renderSlot();
    await waitFor(() => expect(mockRecordOffered).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ adjustOffered: true, revisionToken: 2 }), cap: true });
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalledTimes(2));
    expect(mockRecordOffered).toHaveBeenCalledTimes(1);
  });

  test('writes nothing for an offer that is not on Today', async () => {
    // A demoted or hidden offer has not been made, so the door it would open
    // has not been earned.
    mockGetCycles.mockResolvedValue(DUE);
    renderSlot({ adjustDeclines: 2 });
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalled());
    expect(mockRecordOffered).not.toHaveBeenCalled();
  });

  test('THE OFFER HOOK ALONE WRITES NOTHING (slice 7d)', async () => {
    // The split's own assertion. `useAdjustOffer` used to own this write; if it
    // still did, a due offer would stamp the door with no slot resolved.
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render();
    await waitFor(() => expect(result.current.placement).toBe('today'));
    expect(mockRecordOffered).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // SLICE 7d. The door is the phase page's qualification key, so stamping it
  // on eligibility handed "Try a different approach" to users who were never
  // asked. Every test below has a DUE offer - the placement is 'today'
  // throughout - and something else on the slot.
  // -------------------------------------------------------------------------
  test('NOTHING is stamped while the capture card holds the slot', async () => {
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = renderSlot({ hasRemoveCapture: false }, false);
    await waitFor(() => expect(result.current.action).toBe('capture'));
    // Eligible, and outranked. Both halves matter: without the first this
    // would pass on an offer that was simply not due.
    expect(result.current.placement).toBe('today');
    expect(mockRecordOffered).not.toHaveBeenCalled();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test('NOTHING is stamped on the frame before the weekly read answers', async () => {
    let release: (rows: WeeklyCycle[]) => void = () => {};
    mockGetCycles.mockReturnValue(
      new Promise<WeeklyCycle[]>((resolve) => {
        release = resolve;
      })
    );
    const { result } = renderSlot();
    expect(result.current.action).toBeNull();
    expect(mockRecordOffered).not.toHaveBeenCalled();

    await act(async () => {
      release(DUE);
    });
    await waitFor(() => expect(result.current.action).toBe('adjust'));
    expect(mockRecordOffered).toHaveBeenCalledTimes(1);
  });

  test('a capture completed later unlocks the door THEN, and exactly once', async () => {
    // The door is deferred, never forfeited: the user who captures at noon is
    // offered C2 in the afternoon and the door opens on that drawing.
    mockGetCycles.mockResolvedValue(DUE);
    const { rerender, result } = renderSlot({ hasRemoveCapture: false }, false);
    await waitFor(() => expect(result.current.action).toBe('capture'));
    expect(mockRecordOffered).not.toHaveBeenCalled();

    rerender({ p: phase({ hasRemoveCapture: true }), cap: true });
    await waitFor(() => expect(mockRecordOffered).toHaveBeenCalledTimes(1));
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
    //
    // AN EXHAUSTIVE LIST, NOT A SPOT CHECK, and it is meant to fail when the
    // surface grows: a new key here is a decision about what the card can see.
    // `settled` was added by slice 7d and is the only key admitted since - a
    // loading bit about this hook's own read, carrying nothing about the user.
    mockGetCycles.mockResolvedValue(DUE);
    const { result } = render({ adjustDeclines: 2 });
    await waitFor(() => expect(mockGetCycles).toHaveBeenCalled());
    expect(Object.keys(result.current).sort()).toEqual([
      'decline',
      'isSecondOffer',
      'placement',
      'settled',
    ]);
  });
});
