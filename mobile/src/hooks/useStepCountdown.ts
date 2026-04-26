// Shared countdown hook for InstructionStepView and TimerStepView.
//
// Both leaves track elapsed time across a single step's duration,
// pause when the player pauses (isActive=false), resume from where
// they left off, and fire onComplete exactly once when the duration
// elapses. The hook encapsulates this so the two leaves don't
// duplicate the math.
//
// AudioStepView does not use this hook — its progress is driven by
// expo-av's onPlaybackStatusUpdate, not a wall-clock countdown.
//
// Latest-callback-ref pattern protects against the
// inline-arrow-callback render loop documented in BreathPacer.

import { useEffect, useRef, useState } from 'react';

interface UseStepCountdownOpts {
  durationMs: number;
  isActive: boolean;
  onComplete: () => void;
  // Tick interval. Default 250ms — fine-grained enough for smooth
  // numeric countdowns at 1Hz display. Tests override to 50ms or
  // smaller for faster simulated runs.
  tickIntervalMs?: number;
}

interface UseStepCountdownReturn {
  // Milliseconds remaining in the current step. 0 once complete.
  remainingMs: number;
  // Convenience: durationMs - remainingMs.
  elapsedMs: number;
}

export function useStepCountdown(
  opts: UseStepCountdownOpts
): UseStepCountdownReturn {
  const { durationMs, isActive, onComplete, tickIntervalMs = 250 } = opts;

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  // Cumulative elapsed across pause cycles. Reset on durationMs change.
  const elapsedAtPauseRef = useRef(0);
  // Wall-clock when the current run started; null when paused/idle.
  const runStartRef = useRef<number | null>(null);
  // Guards onComplete against double-fire and re-entry after completion.
  const completedRef = useRef(false);

  const [remainingMs, setRemainingMs] = useState(durationMs);

  // Reset when the duration changes (parent swapped to a new step).
  useEffect(() => {
    elapsedAtPauseRef.current = 0;
    runStartRef.current = null;
    completedRef.current = false;
    setRemainingMs(durationMs);
  }, [durationMs]);

  useEffect(() => {
    if (completedRef.current) {
      // Already complete — don't restart the tick on isActive toggles
      // post-completion.
      return;
    }

    if (!isActive) {
      // Pause: capture elapsed, do not start a new tick.
      if (runStartRef.current !== null) {
        elapsedAtPauseRef.current += Date.now() - runStartRef.current;
        runStartRef.current = null;
      }
      return;
    }

    // Active: start ticking.
    runStartRef.current = Date.now();

    const tick = () => {
      if (completedRef.current) return;
      const now = Date.now();
      const totalElapsed =
        elapsedAtPauseRef.current +
        (runStartRef.current !== null ? now - runStartRef.current : 0);
      const remaining = Math.max(0, durationMs - totalElapsed);
      setRemainingMs(remaining);
      if (remaining <= 0) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };

    const intervalId = setInterval(tick, tickIntervalMs);

    return () => {
      clearInterval(intervalId);
      // If we're being torn down while running, capture elapsed so a
      // subsequent re-activation resumes correctly. (Unmount discards
      // this — but pause→resume relies on it.)
      if (runStartRef.current !== null) {
        elapsedAtPauseRef.current += Date.now() - runStartRef.current;
        runStartRef.current = null;
      }
    };
  }, [isActive, durationMs, tickIntervalMs]);

  return {
    remainingMs,
    elapsedMs: durationMs - remainingMs,
  };
}
