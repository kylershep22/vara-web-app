/**
 * useTimer — timestamp + foreground reconciliation (B-3c.2, commit 1).
 *
 * The visible JS interval drives a smooth countdown, but `endsAt` (epoch ms,
 * set when a running phase begins) is the source of truth. iOS suspends JS
 * timers while backgrounded, so on returning to the foreground the timer must
 * recompute remaining from `Date.now()` vs `endsAt` — and, if `endsAt` already
 * passed, transition to completion (firing the same onSessionComplete path so
 * the row write + completion surface still happen).
 *
 * Backgrounding is simulated by advancing the SYSTEM clock (jest.setSystemTime)
 * WITHOUT running the interval — i.e. the wall clock moves while the frozen JS
 * interval does not tick. Foregrounding is simulated by firing the captured
 * AppState 'active' handler.
 */

import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import { useTimer } from '../useTimer';

let appStateHandlers: Array<(s: AppStateStatus) => void> = [];

beforeEach(() => {
  jest.useFakeTimers();
  appStateHandlers = [];
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, handler) => {
      appStateHandlers.push(handler as (s: AppStateStatus) => void);
      // Honor remove() so only the latest (current-closure) handler survives —
      // mirrors the effect cleanup re-subscribing on each state transition.
      return {
        remove: () => {
          appStateHandlers = appStateHandlers.filter(
            (h) => h !== (handler as (s: AppStateStatus) => void)
          );
        },
      } as never;
    });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Simulate the app returning to the foreground. */
function foreground() {
  act(() => {
    appStateHandlers.forEach((h) => h('active' as AppStateStatus));
  });
}

describe('useTimer — foreground reconciliation', () => {
  it('completes the session when returning to foreground after endsAt passed', () => {
    const onSessionComplete = jest.fn();
    const { result } = renderHook(() =>
      useTimer({ durationMinutes: 1, onSessionComplete })
    );

    act(() => {
      result.current.start();
    });
    expect(result.current.state).toBe('running');

    // App backgrounded for longer than the 1-min block (interval frozen).
    act(() => {
      jest.setSystemTime(Date.now() + 61_000);
    });
    foreground();

    expect(result.current.state).toBe('session_complete');
    expect(result.current.remainingSeconds).toBe(0);
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
  });

  it('recomputes remaining from the timestamp when foregrounded mid-block', () => {
    const { result } = renderHook(() => useTimer({ durationMinutes: 5 }));

    act(() => {
      result.current.start();
    });

    // 90s elapse while backgrounded (interval frozen, wall clock advances).
    act(() => {
      jest.setSystemTime(Date.now() + 90_000);
    });
    foreground();

    // 5:00 - 1:30 = 3:30 = 210s remaining.
    expect(result.current.remainingSeconds).toBe(210);
    expect(result.current.state).toBe('running');
  });

  it('does not complete or drift while paused across a wall-clock gap', () => {
    const { result } = renderHook(() => useTimer({ durationMinutes: 5 }));

    act(() => {
      result.current.start();
    });
    // Run 10s via the live interval.
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(290);

    act(() => {
      result.current.pause();
    });
    // 10 min of wall clock pass while paused.
    act(() => {
      jest.setSystemTime(Date.now() + 600_000);
    });
    foreground();

    expect(result.current.state).toBe('paused');
    expect(result.current.remainingSeconds).toBe(290);
  });

  it('completeNow() shows the completion surface without re-writing a row', () => {
    // Cold-launch deep link: the row was already finalized by the launch
    // handler, so entering session_complete must NOT fire onSessionComplete
    // (which would write a duplicate).
    const onSessionComplete = jest.fn();
    const { result } = renderHook(() =>
      useTimer({ durationMinutes: 25, onSessionComplete })
    );

    act(() => {
      result.current.completeNow();
    });

    expect(result.current.state).toBe('session_complete');
    expect(result.current.remainingSeconds).toBe(0);
    expect(onSessionComplete).not.toHaveBeenCalled();
  });

  it('re-derives endsAt on resume so a later foreground reconciles correctly', () => {
    const { result } = renderHook(() => useTimer({ durationMinutes: 5 }));

    act(() => {
      result.current.start();
    });
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(result.current.remainingSeconds).toBe(290);

    act(() => {
      result.current.pause();
    });
    // Long pause, then resume.
    act(() => {
      jest.setSystemTime(Date.now() + 600_000);
    });
    act(() => {
      result.current.resume();
    });
    expect(result.current.state).toBe('running');

    // 30s of background after resume → 290 - 30 = 260 remaining.
    act(() => {
      jest.setSystemTime(Date.now() + 30_000);
    });
    foreground();
    expect(result.current.remainingSeconds).toBe(260);
  });
});
