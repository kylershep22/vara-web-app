/**
 * The exposure write and the day gate that bounds it (slice 7a, section 9 R3).
 *
 * WHAT THIS SUITE EXISTS FOR is one ordering claim: the gate is evaluated
 * BEFORE the write. That is not visible in a screenshot and it is not visible in
 * a type. Home re-resolves the journey on every focus, so a write-then-gate
 * implementation would spend the whole three-exposure budget in an afternoon of
 * tab switches and look completely normal doing it.
 *
 * THE SECOND-RENDER TEST IS THE ONE THAT MATTERS. Rendering once and asserting
 * one write proves nothing: a broken implementation also writes once on the
 * first render. The re-render with the freshly written date is what separates
 * them.
 */
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAdvanceOffer } from '../useAdvanceOffer';
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

const render = (over: Partial<PhaseContext> = {}, consistentDays = 0) =>
  renderHook(
    ({ p, c }: { p: PhaseContext | null; c: number }) =>
      useAdvanceOffer({ uid: 'u1', phase: p, consistentDays: c, todayIso: TODAY }),
    { initialProps: { p: phase(over), c: consistentDays } }
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

  test('a null phase is hidden and writes nothing', async () => {
    const { result } = renderHook(() =>
      useAdvanceOffer({ uid: 'u1', phase: null, consistentDays: 99, todayIso: TODAY })
    );
    expect(result.current.placement).toBe('hidden');
    expect(mockRecordExposure).not.toHaveBeenCalled();
  });
});

describe('useAdvanceOffer - the day gate precedes the write', () => {
  test('records one exposure on arrival', async () => {
    render();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
    expect(mockRecordExposure).toHaveBeenCalledWith('u1', TODAY, null);
  });

  test('a SECOND render on the same day records NOTHING MORE', async () => {
    // The ordering assertion. The rerender simulates what Home actually does on
    // every focus: hand down a fresh PhaseContext carrying the state the last
    // write produced. A write-then-gate implementation writes again here.
    const { rerender } = render();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));

    rerender({ p: phase({ advanceExposures: 1, advanceFirstOfferedOn: TODAY, advanceLastExposedOn: TODAY }), c: 0 });
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
  });

  test('four focuses in one day still spend exactly one exposure', async () => {
    // The failure this guards is not theoretical: Home calls refresh() from a
    // useFocusEffect, so a user moving between tabs re-resolves repeatedly.
    const { rerender } = render();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));

    const settled = phase({
      advanceExposures: 1,
      advanceFirstOfferedOn: TODAY,
      advanceLastExposedOn: TODAY,
    });
    for (let i = 0; i < 3; i += 1) {
      rerender({ p: { ...settled, revisionToken: 10 + i }, c: 0 });
    }
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
  });

  test('the next calendar day spends the next exposure', async () => {
    const { rerender } = renderHook(
      ({ p, t }: { p: PhaseContext; t: string }) =>
        useAdvanceOffer({ uid: 'u1', phase: p, consistentDays: 0, todayIso: t }),
      {
        initialProps: {
          p: phase({
            advanceExposures: 1,
            advanceFirstOfferedOn: '2026-09-09',
            advanceLastExposedOn: '2026-09-09',
          }),
          t: '2026-09-09',
        },
      }
    );
    expect(mockRecordExposure).not.toHaveBeenCalled();

    rerender({
      p: phase({
        advanceExposures: 1,
        advanceFirstOfferedOn: '2026-09-09',
        advanceLastExposedOn: '2026-09-09',
      }),
      t: TODAY,
    });
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));
    // The anchor is carried, not re-stamped.
    expect(mockRecordExposure).toHaveBeenCalledWith('u1', TODAY, '2026-09-09');
  });

  test('a demoted offer spends nothing', async () => {
    render({ advanceExposures: 3, advanceFirstOfferedOn: '2026-09-08', advanceLastExposedOn: '2026-09-09' });
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
  });

  test('an offer that is not due spends nothing', async () => {
    render({ enteredAtIso: TODAY }, 0);
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
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
    const { result } = render();
    await waitFor(() => expect(mockRecordExposure).toHaveBeenCalledTimes(1));

    act(() => result.current.dismiss());
    await waitFor(() => expect(result.current.placement).toBe('journey'));
    expect(mockRecordExposure).toHaveBeenCalledTimes(1);
  });
});

describe('useAdvanceOffer - analytics', () => {
  test('the offered event carries the door that opened it', async () => {
    render({ enteredAtIso: TODAY }, 8);
    await waitFor(() =>
      expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_advance_offered', {
        door: 'consistency',
      })
    );
  });

  test('no offered event when nothing is due', async () => {
    render({ enteredAtIso: TODAY }, 0);
    await waitFor(() => expect(mockRecordExposure).not.toHaveBeenCalled());
    expect(mockLogEvent).not.toHaveBeenCalled();
  });
});
