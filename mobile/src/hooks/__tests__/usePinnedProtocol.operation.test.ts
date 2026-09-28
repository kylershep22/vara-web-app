// usePinnedProtocol: PIN-AT-OPEN AND THE OPERATION'S OWN BOOKKEEPING (slice
// 9.1b). A plain live object drives the hook here, because nothing below
// depends on the staleness flags' lifecycle; the cases that do run against the
// real useTodayCard in usePinnedProtocol.test.ts. Split from that suite to keep
// both under the max-lines limit.
//
// THE OPERATION IS CALLED DIRECTLY, not through a rendered press. The UI half
// is covered by ProtocolSheet.test.tsx and DashboardScreen.protocolSheet.test.tsx.

const mockUpsertDailyLog = jest.fn();
jest.mock('../../services/firebase/dailyLog.service', () => ({
  upsertDailyLog: (...a: unknown[]) => mockUpsertDailyLog(...a),
}));
jest.mock('../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePinnedProtocol, type LiveToday } from '../usePinnedProtocol';
import type { TodayCard } from '../useTodayCard';
import { PROTOCOL_MATRIX, selectProtocol } from '../../protocolEngine';

const MONDAY = '2026-08-10';
const TUESDAY = '2026-08-11';
const RECOVER_NORMAL = selectProtocol('recover', 'normal', 'medium', 'focus', undefined, null);

const PROTOCOL = { ...PROTOCOL_MATRIX.remove.normal[0], quickWinActive: false };

function live(over: Partial<LiveToday> = {}): LiveToday {
  return {
    protocol: PROTOCOL,
    todayIso: MONDAY,
    completed: false,
    consistentDays: 0,
    staleDate: false,
    variantStale: false,
    ...over,
  };
}

function renderPinned(initial: LiveToday) {
  return renderHook(({ l }: { l: LiveToday }) => usePinnedProtocol('u1', l), {
    initialProps: { l: initial },
  });
}

describe('pin at open', () => {
  beforeEach(() => {
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
  });

  test('refuses while staleDate is true', () => {
    const { result } = renderPinned(live({ staleDate: true }));
    act(() => result.current.open());
    expect(result.current.snapshot).toBeNull();
  });

  test('refuses while variantStale is true', () => {
    const { result } = renderPinned(live({ variantStale: true }));
    act(() => result.current.open());
    expect(result.current.snapshot).toBeNull();
  });

  test('refuses with no protocol', () => {
    const { result } = renderPinned(live({ protocol: null }));
    act(() => result.current.open());
    expect(result.current.snapshot).toBeNull();
  });

  test('pins the protocol, the date, the completion and the count it opened on', () => {
    const { result } = renderPinned(live({ completed: true, consistentDays: 3 }));
    act(() => result.current.open());
    expect(result.current.snapshot).toEqual({
      protocol: PROTOCOL,
      iso: MONDAY,
      completedAtOpen: true,
      consistentDays: 3,
    });
  });

  test('close clears the pin', () => {
    const { result } = renderPinned(live());
    act(() => result.current.open());
    act(() => result.current.close());
    expect(result.current.snapshot).toBeNull();
  });
});

describe('the completion operation', () => {
  beforeEach(() => {
    mockUpsertDailyLog.mockReset().mockResolvedValue(undefined);
  });

  test('same day, same variant: writes today and marks the overlay for today', async () => {
    const { result } = renderPinned(live());
    act(() => result.current.open());
    act(() => result.current.complete());

    expect(result.current.done).toBe(true);
    expect(result.current.completedIso).toBe(MONDAY);
    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(mockUpsertDailyLog.mock.calls[0][1]).toBe(MONDAY);
  });

  test('a second tap while saving writes once', async () => {
    const { result } = renderPinned(live());
    act(() => result.current.open());
    act(() => {
      result.current.complete();
      result.current.complete();
    });
    await waitFor(() => expect(result.current.saving).toBe(false));
    expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1);
  });

  test('a failed write reverts: not done, no overlay, and the failure shows', async () => {
    mockUpsertDailyLog.mockRejectedValueOnce(new Error('offline'));
    const { result } = renderPinned(live());
    act(() => result.current.open());
    act(() => result.current.complete());

    await waitFor(() => expect(result.current.saveFailed).toBe(true));
    expect(result.current.done).toBe(false);
    expect(result.current.completedIso).toBeNull();
    expect(result.current.saving).toBe(false);
    expect(result.current.completable).toBe(true);
  });

  test('the overlay survives the sheet closing', async () => {
    const { result } = renderPinned(live());
    act(() => result.current.open());
    act(() => result.current.complete());
    await waitFor(() => expect(result.current.saving).toBe(false));
    act(() => result.current.close());
    expect(result.current.completedIso).toBe(MONDAY);
  });

  test('a variant with no family writes no family key', async () => {
    const recover = { ...RECOVER_NORMAL, quickWinActive: false };
    expect(recover.family).toBeUndefined();
    const { result } = renderPinned(live({ protocol: recover }));
    act(() => result.current.open());
    act(() => result.current.complete());
    await waitFor(() => expect(mockUpsertDailyLog).toHaveBeenCalledTimes(1));
    const patch = mockUpsertDailyLog.mock.calls[0][2];
    // ignoreUndefinedProperties is false: present-and-undefined would throw.
    expect('protocolFamily' in patch).toBe(false);
    expect(patch.protocolCellId).toBe(recover.id);
  });

  test('the divergence latches: crossing midnight does not re-open completion', () => {
    const view = renderPinned(live());
    act(() => view.result.current.open());
    view.rerender({ l: live({ protocol: { ...RECOVER_NORMAL, quickWinActive: false } }) });
    expect(view.result.current.diverged).toBe(true);

    // The live day moves on. Without the latch, `sameDay` goes false and the
    // pin would look like an honest Monday completion again.
    view.rerender({
      l: live({ todayIso: TUESDAY, protocol: { ...RECOVER_NORMAL, quickWinActive: false } }),
    });
    expect(view.result.current.diverged).toBe(true);
    expect(view.result.current.completable).toBe(false);
    act(() => view.result.current.complete());
    expect(mockUpsertDailyLog).not.toHaveBeenCalled();
  });

  test('same day with the live protocol gone: not completable, and not called diverged', () => {
    const view = renderPinned(live());
    act(() => view.result.current.open());
    view.rerender({ l: live({ protocol: null }) });
    expect(view.result.current.completable).toBe(false);
    expect(view.result.current.diverged).toBe(false);
  });
});

// Type-level: the live slice is a projection of TodayCard, so Home passes the
// card itself and no adapter can drift from it.
const _projection: LiveToday = {} as TodayCard;
void _projection;
