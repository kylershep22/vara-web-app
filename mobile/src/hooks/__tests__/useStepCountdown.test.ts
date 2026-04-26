import { act, renderHook } from '@testing-library/react-native';
import { useStepCountdown } from '../useStepCountdown';

// Modern fake timers fake setInterval/setTimeout AND Date, so Date.now()
// advances when we call jest.advanceTimersByTime(N).
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useStepCountdown', () => {
  describe('initial state', () => {
    it('reports remainingMs equal to durationMs before any tick', () => {
      const { result } = renderHook(() =>
        useStepCountdown({
          durationMs: 5_000,
          isActive: true,
          onComplete: jest.fn(),
        })
      );
      expect(result.current.remainingMs).toBe(5_000);
      expect(result.current.elapsedMs).toBe(0);
    });

    it('does not advance while isActive=false', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useStepCountdown({
          durationMs: 5_000,
          isActive: false,
          onComplete,
        })
      );
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      expect(result.current.remainingMs).toBe(5_000);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('active countdown', () => {
    it('decreases remainingMs as time advances while active', () => {
      const { result } = renderHook(() =>
        useStepCountdown({
          durationMs: 5_000,
          isActive: true,
          onComplete: jest.fn(),
        })
      );
      act(() => {
        jest.advanceTimersByTime(1_000);
      });
      expect(result.current.remainingMs).toBeLessThanOrEqual(4_000);
      expect(result.current.elapsedMs).toBeGreaterThanOrEqual(1_000);
    });

    it('reaches zero and fires onComplete exactly once when durationMs elapses', () => {
      const onComplete = jest.fn();
      const { result } = renderHook(() =>
        useStepCountdown({
          durationMs: 3_000,
          isActive: true,
          onComplete,
          tickIntervalMs: 250,
        })
      );
      act(() => {
        jest.advanceTimersByTime(3_500); // safely past completion
      });
      expect(result.current.remainingMs).toBe(0);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does not fire onComplete again on continued ticks past completion', () => {
      const onComplete = jest.fn();
      renderHook(() =>
        useStepCountdown({
          durationMs: 1_000,
          isActive: true,
          onComplete,
          tickIntervalMs: 100,
        })
      );
      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('pause and resume', () => {
    it('freezes remainingMs when isActive flips to false', () => {
      const { result, rerender } = renderHook(
        ({ isActive }: { isActive: boolean }) =>
          useStepCountdown({
            durationMs: 10_000,
            isActive,
            onComplete: jest.fn(),
            tickIntervalMs: 100,
          }),
        { initialProps: { isActive: true } }
      );
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      const remainingAtPause = result.current.remainingMs;
      expect(remainingAtPause).toBeLessThan(10_000);

      rerender({ isActive: false });

      act(() => {
        jest.advanceTimersByTime(5_000);
      });
      // After the rerender, isActive=false ticks shouldn't advance
      // the counter further.
      expect(result.current.remainingMs).toBe(remainingAtPause);
    });

    it('resumes the countdown from the paused position when reactivated', () => {
      const onComplete = jest.fn();
      const { result, rerender } = renderHook(
        ({ isActive }: { isActive: boolean }) =>
          useStepCountdown({
            durationMs: 5_000,
            isActive,
            onComplete,
            tickIntervalMs: 100,
          }),
        { initialProps: { isActive: true } }
      );
      // Run for 2s
      act(() => {
        jest.advanceTimersByTime(2_000);
      });
      // Pause for 10s of wall-clock
      rerender({ isActive: false });
      act(() => {
        jest.advanceTimersByTime(10_000);
      });
      // Resume — should still need ~3s more to complete
      rerender({ isActive: true });
      act(() => {
        jest.advanceTimersByTime(2_500);
      });
      expect(onComplete).not.toHaveBeenCalled();
      act(() => {
        jest.advanceTimersByTime(700);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('durationMs change', () => {
    it('resets remainingMs when durationMs changes', () => {
      const { result, rerender } = renderHook(
        ({ d }: { d: number }) =>
          useStepCountdown({
            durationMs: d,
            isActive: true,
            onComplete: jest.fn(),
            tickIntervalMs: 100,
          }),
        { initialProps: { d: 3_000 } }
      );
      act(() => {
        jest.advanceTimersByTime(1_500);
      });
      expect(result.current.remainingMs).toBeLessThanOrEqual(1_500);

      rerender({ d: 10_000 });
      expect(result.current.remainingMs).toBe(10_000);
    });

    it('clears completion guard when durationMs changes', () => {
      const onComplete = jest.fn();
      const { rerender } = renderHook(
        ({ d }: { d: number }) =>
          useStepCountdown({
            durationMs: d,
            isActive: true,
            onComplete,
            tickIntervalMs: 100,
          }),
        { initialProps: { d: 1_000 } }
      );
      act(() => {
        jest.advanceTimersByTime(1_500);
      });
      expect(onComplete).toHaveBeenCalledTimes(1);

      // New step duration → reset → can fire again. Must be a
      // different numeric value to trigger the reset effect.
      rerender({ d: 2_000 });
      act(() => {
        jest.advanceTimersByTime(2_500);
      });
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });

  describe('callback identity stability', () => {
    it('handles inline-arrow onComplete without re-running the tick effect', () => {
      // Regression test for the BreathPacer infinite-loop class of
      // bug. If the hook listed onComplete in the tick effect's deps,
      // a parent that creates a fresh callback per render would cause
      // the effect to re-run on every render, restarting the timer.
      // The latest-callback-ref pattern means renders don't disturb
      // the running tick.
      let callCount = 0;
      // Use explicit (unused) props so rerender({}) is callable — the
      // hook itself takes no props but renderHook's rerender signature
      // requires an argument matching the callback's parameter type.
      const { rerender } = renderHook(
        (_props: Record<string, never>) =>
          useStepCountdown({
            durationMs: 2_000,
            isActive: true,
            onComplete: () => {
              callCount += 1;
            },
            tickIntervalMs: 100,
          }),
        { initialProps: {} }
      );
      // Force several re-renders mid-countdown
      for (let i = 0; i < 5; i++) {
        rerender({});
      }
      act(() => {
        jest.advanceTimersByTime(2_500);
      });
      expect(callCount).toBe(1);
    });
  });
});
