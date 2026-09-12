/**
 * The exposure write, the day gate that bounds it, and - from slice 7d - the
 * RENDERED-SLOT gate that bounds it (slice 7a, section 9 R3).
 *
 * WHAT THIS SUITE EXISTS FOR is two ordering claims that neither a screenshot
 * nor a type can show.
 *
 * ONE: THE DAY GATE IS EVALUATED BEFORE THE WRITE. Home re-resolves the journey
 * on every focus, so a write-then-gate implementation would spend the whole
 * three-exposure budget in an afternoon of tab switches and look completely
 * normal doing it. THE SECOND-RENDER TEST IS THE ONE THAT MATTERS: rendering
 * once and asserting one write proves nothing, because a broken implementation
 * also writes once on the first render. The re-render with the freshly written
 * date is what separates them.
 *
 * TWO (SLICE 7d): THE EXPOSURE IS SPENT ON THE SLOT, NOT ON ELIGIBILITY. The
 * gate used to read `placement === 'today'`, which only says the offer is
 * ALLOWED on Today. Capture beats adjust beats advance, so an eligible offer
 * behind either of them spent an exposure on a card that never drew - observed
 * twice on device during 7b's walk. The tests that would have caught it are
 * `renderSlot`'s: they run the real `journeyActionFor` between the two hooks,
 * exactly as DashboardScreen does, and assert the write by what OCCUPIES the
 * slot rather than by what qualified for it.
 *
 * THE SLOT HARNESS RUNS THE REAL PRECEDENCE FUNCTION, deliberately. Stubbing
 * the action would let these tests pass against a `journeyActionFor` that had
 * been changed underneath them, which is the whole failure mode 7d is about.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAdvanceExposure, useAdvanceOffer } from '../useAdvanceOffer';
import { journeyActionFor } from '../../journey/journeyAction';
import type { OfferPlacement } from '../../journey/offerPlacement';
import type { PhaseContext } from '../../journey/resolveJourney';

const mockRecordExposure = jest.fn(async () => {});
const mockRecordDeclined = jest.fn(async () => {});
const mockLogEvent = jest.fn();

jest.mock('../../services/firebase/journeyState.service', () => ({
  recordAdvanceExposure: (...a: any[]) => mockRecordExposure(...(a as [])),
  recordAdvanceDeclined: (...a: any[]) => mockRecordDeclined(...(a as [])),
}));
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...(a as [])),
}));

const TODAY = '2026-09-10';

/** A phase entered long enough ago that the ceiling is open. */
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
  adjustArmedFromIso: null,
  adjustDeclines: 0,
  adjustOffered: false,
  ...over,
});

/** The offer hook alone: placement, door, dismiss. It writes nothing. */
const render = (over: Partial<PhaseContext> = {}, consistentDays = 0) =>
  renderHook(
    ({ p, c }: { p: PhaseContext | null; c: number }) =>
      useAdvanceOffer({ uid: 'u1', phase: p, consistentDays: c, todayIso: TODAY }),
    { initialProps: { p: phase(over), c: consistentDays } }
  );

/**
 * What the other two offers are doing, for the slot harness.
 *
 * DEFAULTS ARE "ADVANCE WINS": the capture is done, adjust is not due, and the
 * weekly read has settled. Every test varies one of them, so a test that says
 * nothing about capture is asserting the uncontested case on purpose.
 */
interface Slot {
  hasRemoveCapture?: boolean;
  adjustPlacement?: OfferPlacement;
  adjustSettled?: boolean;
}

interface SlotProps {
  p: PhaseContext | null;
  c: number;
  t: string;
  s: Slot;
}

/**
 * Both hooks with the real `journeyActionFor` between them, wired the way
 * DashboardScreen wires them - INCLUDING the input-side settled gate, which is
 * the whole of 7d's answer to the first-frame race.
 */
const renderSlot = (
  over: Partial<PhaseContext> = {},
  consistentDays = 0,
  slot: Slot = {}
) =>
  renderHook(
    ({ p, c, t, s }: SlotProps) => {
      const offer = useAdvanceOffer({
        uid: 'u1',
        phase: p,
        consistentDays: c,
        todayIso: t,
      });
      const action = (s.adjustSettled ?? true)
        ? journeyActionFor({
            phaseKey: p?.phaseKey ?? null,
            hasRemoveCapture: s.hasRemoveCapture ?? true,
            captureDismissed: false,
            adjustPlacement: s.adjustPlacement ?? 'hidden',
            advancePlacement: offer.placement,
          })
        : null;
      useAdvanceExposure({
        uid: 'u1',
        action,
        door: offer.door,
        phase: p,
        todayIso: t,
      });
      return { ...offer, action };
    },
    { initialProps: { p: phase(over), c: consistentDays, t: TODAY, s: slot } }
  );

beforeEach(() => {
  mockRecordExposure.mockClear();
  mockRecordDeclined.mockClear();
  mockLogEvent.mockClear();
});

describe('useAdvanceOffer - placement', () => {
  test('a due offer lands on Today and names its door', async () => {
    const { result } = render({ enteredAtIso: '2026-08-01' });
    await waitFor(() => expect(result.current.placement).toBe('today'));
    expect(result.current.door).toBe('ceiling');
  });

  test('eight completed days reads as the consistency door', async () => {
    const { result } = render({ enteredAtIso: TODAY }, 8);
    await waitFor(() => expect(result.current.door).toBe('consistency'));
  });

  test('nothing is due in a phase entered today with no completed days', async () => {
    const { result } = render({ enteredAtIso: TODAY }, 0);
    expect(result.current.placement).toBe('hidden');
    expect(result.current.door).toBeNull();
  });

  test('a null phase is hidden', async () => {
    const { result } = renderHook(() =>
      useAdvanceOffer({ uid: 'u1', phase: null, consistentDays: 99, todayIso: TODAY })
    );
    expect(result.current.placement).toBe('hidden');
  });

  test('THE OFFER HOOK WRITES NOTHING AT ALL (slice 7d)', async () => {
    // The split's own assertion. `useAdvanceOffer` used to own the exposure
    // write; if it still did, this fully-due phase would spend one here with
    // no slot having been resolved by anybody.
    render();
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
  });
});

describe('useAdvanceExposure - the day gate precedes the write', () => {
  test('records one exposure on arrival', async () => {
    renderSlot();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
    expect(mockRecordExposure).toHaveBeenCalledWith('u1', TODAY, null);
  });

  test('a SECOND render on the same day records NOTHING MORE', async () => {
    // The ordering assertion. The rerender simulates what Home actually does on
    // every focus: hand down a fresh PhaseContext carrying the state the last
    // write produced. A write-then-gate implementation writes again here.
    const { rerender } = renderSlot();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));

    rerender({
      p: phase({
        advanceExposures: 1,
        advanceFirstOfferedOn: TODAY,
        advanceLastExposedOn: TODAY,
      }),
      c: 0,
      t: TODAY,
      s: {},
    });
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
  });

  test('four focuses in one day still spend exactly one exposure', async () => {
    // The failure this guards is not theoretical: Home calls refresh() from a
    // useFocusEffect, so a user moving between tabs re-resolves repeatedly.
    const { rerender } = renderSlot();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));

    const settled = phase({
      advanceExposures: 1,
      advanceFirstOfferedOn: TODAY,
      advanceLastExposedOn: TODAY,
    });
    for (let i = 0; i < 3; i += 1) {
      rerender({ p: { ...settled, revisionToken: 10 + i }, c: 0, t: TODAY, s: {} });
    }
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
  });

  test('the next calendar day spends the next exposure', async () => {
    const spent = phase({
      advanceExposures: 1,
      advanceFirstOfferedOn: '2026-09-09',
      advanceLastExposedOn: '2026-09-09',
    });
    const { rerender } = renderSlot();
    mockRecordExposure.mockClear();

    rerender({ p: spent, c: 0, t: '2026-09-09', s: {} });
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());

    rerender({ p: spent, c: 0, t: TODAY, s: {} });
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
    // The anchor is carried, not re-stamped.
    expect(mockRecordExposure).toHaveBeenCalledWith('u1', TODAY, '2026-09-09');
  });

  test('a demoted offer spends nothing', async () => {
    renderSlot({
      advanceExposures: 3,
      advanceFirstOfferedOn: '2026-09-08',
      advanceLastExposedOn: '2026-09-09',
    });
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
  });

  test('an offer that is not due spends nothing', async () => {
    renderSlot({ enteredAtIso: TODAY }, 0);
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
  });
});

// ---------------------------------------------------------------------------
// SLICE 7d. The four tests that would have caught the exposure-on-eligibility
// defect. Every one of them has an advancement offer that IS eligible - the
// placement is 'today' throughout - and in every one of them something else
// owns the slot.
// ---------------------------------------------------------------------------
describe('useAdvanceExposure - the exposure is spent on the RENDERED slot', () => {
  test('NOTHING is spent while the capture card holds the slot', async () => {
    // Observed on device during 7b's walk: advanceOfferedAt stamped at 13:30:39
    // while the capture card was on screen at 13:41.
    const { result } = renderSlot({ hasRemoveCapture: false }, 0, {
      hasRemoveCapture: false,
    });
    await waitFor(() => expect(result.current.action).toBe('capture'));
    // Eligible, and outranked. Both halves matter: without the first the test
    // would pass on an offer that was simply not due.
    expect(result.current.placement).toBe('today');
    expect(mockRecordExposure).not.toHaveBeenCalled();
  });

  test('NOTHING is spent while C2 holds the slot', async () => {
    // The half 7b widened: adjust outranks advance, so the budget drained
    // behind the adjustment card too.
    const { result } = renderSlot({}, 0, { adjustPlacement: 'today' });
    await waitFor(() => expect(result.current.action).toBe('adjust'));
    expect(result.current.placement).toBe('today');
    expect(mockRecordExposure).not.toHaveBeenCalled();
  });

  test('NOTHING is spent on the frame where the weekly read has not answered', async () => {
    // The first-frame race, which is the case a slot gate alone does not close:
    // adjust's placement is 'hidden' here only because its cycles are unloaded,
    // so `journeyActionFor` would answer 'advance' on a frame where C2 wins the
    // slot a render later. Home withholds the question until adjust settles.
    const { result } = renderSlot({}, 0, {
      adjustSettled: false,
      adjustPlacement: 'today',
    });
    await waitFor(() => expect(result.current.placement).toBe('today'));
    expect(result.current.action).toBeNull();
    expect(mockRecordExposure).not.toHaveBeenCalled();
  });

  test('ONE is spent, once the read settles and advancement actually draws', async () => {
    // The other side of the same frame. The exposure is not lost, only
    // deferred to the render on which the card is the thing on screen.
    const { rerender, result } = renderSlot({}, 0, { adjustSettled: false });
    await waitFor(() => expect(result.current.action).toBeNull());
    expect(mockRecordExposure).not.toHaveBeenCalled();

    rerender({ p: phase(), c: 0, t: TODAY, s: { adjustSettled: true } });
    await waitFor(() => expect(result.current.action).toBe('advance'));
    expect(mockRecordExposure).toHaveBeenCalledTimes(1);
  });

  test('a capture completed later in the day spends the exposure then', async () => {
    // The budget is deferred, never forfeited. A user who captures at noon
    // meets the advancement offer in the afternoon and it costs one exposure,
    // not zero and not two.
    const { rerender, result } = renderSlot({ hasRemoveCapture: false }, 0, {
      hasRemoveCapture: false,
    });
    await waitFor(() => expect(result.current.action).toBe('capture'));
    expect(mockRecordExposure).not.toHaveBeenCalled();

    rerender({ p: phase(), c: 0, t: TODAY, s: { hasRemoveCapture: true } });
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
  });
});

describe('useAdvanceOffer - demotion', () => {
  test('three exposures demote to the journey, not to hidden', async () => {
    const { result } = render({
      advanceExposures: 3,
      advanceFirstOfferedOn: '2026-09-08',
      advanceLastExposedOn: '2026-09-09',
    });
    await waitFor(() => expect(result.current.placement).toBe('journey'));
  });

  test('seven calendar days demote with exposures still unspent', async () => {
    const { result } = render({
      advanceExposures: 1,
      advanceFirstOfferedOn: '2026-09-03',
      advanceLastExposedOn: '2026-09-03',
    });
    await waitFor(() => expect(result.current.placement).toBe('journey'));
  });

  test('a stored decline demotes on arrival', async () => {
    const { result } = render({ advanceDeclined: true });
    expect(result.current.placement).toBe('journey');
  });
});

describe('useAdvanceOffer - dismiss', () => {
  test('demotes on the current render, without waiting for a re-resolve', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.placement).toBe('today'));

    act(() => result.current.dismiss());
    await waitFor(() => expect(result.current.placement).toBe('journey'));
  });

  test('writes the decline and records it as coming from the card', async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.placement).toBe('today'));

    act(() => result.current.dismiss());
    await waitFor(() => expect(mockRecordDeclined).toHaveBeenCalledWith('u1'));
    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_advance_declined', {
      from: 'card',
    });
  });

  test('dismissing does NOT spend another exposure', async () => {
    const { result } = renderSlot();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));

    act(() => result.current.dismiss());
    await waitFor(() => expect(result.current.placement).toBe('journey'));
    expect(mockRecordExposure).toHaveBeenCalledTimes(1);
  });
});

describe('useAdvanceExposure - analytics', () => {
  test('the offered event carries the door that opened it, and the definition version', async () => {
    // `definition_version: 2` says this row counts a RENDERED offer, not an
    // eligible one (slice 7h; the gate moved in 7d). toHaveBeenCalledWith is an
    // exact payload match, so this pins the field's presence AND its value -
    // dropping it at the call site fails here rather than quietly emitting rows
    // that a dashboard cannot tell apart from the pre-7d ones.
    renderSlot({ enteredAtIso: TODAY }, 8);
    await waitFor(() =>
      expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_advance_offered', {
        door: 'consistency',
        definition_version: 2,
      })
    );
  });

  test('no offered event when nothing is due', async () => {
    renderSlot({ enteredAtIso: TODAY }, 0);
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test('NO offered event while another card holds the slot (slice 7d)', async () => {
    // The event shares the exposure's gate, so the analytics row count and the
    // budget are the same fact. Before 7d both counted the wrong occasions.
    renderSlot({ enteredAtIso: TODAY, hasRemoveCapture: false }, 8, {
      hasRemoveCapture: false,
    });
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
    expect(mockLogEvent).not.toHaveBeenCalled();
  });
});
