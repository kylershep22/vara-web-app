/**
 * useTimer Hook
 * Generic countdown timer logic with state machine
 *
 * State machine:
 * IDLE → (start) → RUNNING → (complete) → SESSION_COMPLETE
 * SESSION_COMPLETE → (startBreak) → BREAK_RUNNING → (complete) → BREAK_COMPLETE
 * BREAK_COMPLETE → (beginAnother) → RUNNING
 * BREAK_COMPLETE → (reset) → IDLE
 * Any state → (reset) → IDLE
 * RUNNING → (pause) → PAUSED → (resume) → RUNNING
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';

export type TimerState =
  | 'idle'
  | 'running'
  | 'paused'
  | 'session_complete'
  | 'break_running'
  | 'break_complete';

interface UseTimerOptions {
  /** Duration in minutes */
  durationMinutes: number;
  /** Break duration in minutes */
  breakDurationMinutes?: number;
  /** Callback when session completes */
  onSessionComplete?: () => void;
  /** Callback when break completes */
  onBreakComplete?: () => void;
  /** Callback on each tick (for progress updates) */
  onTick?: (remainingSeconds: number) => void;
}

interface UseTimerReturn {
  /** Current timer state */
  state: TimerState;
  /** Remaining time in seconds */
  remainingSeconds: number;
  /** Total duration in seconds */
  totalSeconds: number;
  /**
   * Epoch ms the current running phase is scheduled to hit 0, or null when not
   * in a running phase. The timestamp source of truth (see foreground
   * reconciliation); exposed so the caller can persist it / schedule a
   * completion notification keyed to it.
   */
  endsAt: number | null;
  /** Progress from 0 to 1 */
  progress: number;
  /** Formatted time string (MM:SS) */
  formattedTime: string;
  /** Start the timer */
  start: () => void;
  /** Pause the timer */
  pause: () => void;
  /** Resume the timer */
  resume: () => void;
  /** Reset to idle */
  reset: () => void;
  /** Start break timer (from session_complete state) */
  startBreak: () => void;
  /** Begin another session (from break_complete state) */
  beginAnother: () => void;
  /** Check if timer is in a break state */
  isBreak: boolean;
  /** Check if timer is active (running or break_running) */
  isActive: boolean;
  /** Current break duration in minutes */
  breakDurationMinutes: number;
  /** Set break duration (clamped 1-15 minutes) */
  setBreakDuration: (minutes: number) => void;
}

export const useTimer = ({
  durationMinutes,
  breakDurationMinutes: initialBreakMinutes = 5,
  onSessionComplete,
  onBreakComplete,
  onTick,
}: UseTimerOptions): UseTimerReturn => {
  const [state, setState] = useState<TimerState>('idle');
  const [remainingSeconds, setRemainingSeconds] = useState(durationMinutes * 60);
  const [totalSeconds, setTotalSeconds] = useState(durationMinutes * 60);
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Epoch-ms timestamp the current running phase should hit 0. This is the
  // SOURCE OF TRUTH for time elapsed: the visible JS interval is only for a
  // smooth display and is frozen by iOS while backgrounded, so on returning to
  // the foreground we reconcile remaining from Date.now() vs endsAt. Null
  // whenever the timer is not in a running phase.
  const endsAtRef = useRef<number | null>(null);

  // Mirror of remainingSeconds for fresh reads inside callbacks/handlers
  // (useCallback closures and the AppState handler would otherwise see a stale
  // value). Kept in sync below.
  const remainingRef = useRef(remainingSeconds);
  useEffect(() => {
    remainingRef.current = remainingSeconds;
  }, [remainingSeconds]);

  // Latest-callback refs so the foreground-reconciliation effect can complete a
  // phase without listing the (often inline) callbacks in its deps.
  const onSessionCompleteRef = useRef(onSessionComplete);
  const onBreakCompleteRef = useRef(onBreakComplete);
  useEffect(() => {
    onSessionCompleteRef.current = onSessionComplete;
    onBreakCompleteRef.current = onBreakComplete;
  });

  // Clear interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update duration when prop changes (only in idle state)
  useEffect(() => {
    if (state === 'idle') {
      const seconds = durationMinutes * 60;
      setRemainingSeconds(seconds);
      setTotalSeconds(seconds);
    }
  }, [durationMinutes, state]);

  // Timer tick logic
  useEffect(() => {
    if (state === 'running' || state === 'break_running') {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          const newValue = prev - 1;

          if (newValue <= 0) {
            clearInterval(intervalRef.current!);
            endsAtRef.current = null;

            if (state === 'running') {
              // Session complete
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setState('session_complete');
              onSessionComplete?.();
            } else {
              // Break complete
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setState('break_complete');
              onBreakComplete?.();
            }

            return 0;
          }

          onTick?.(newValue);
          return newValue;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, onSessionComplete, onBreakComplete, onTick]);

  // Foreground reconciliation. iOS suspends the JS interval while backgrounded,
  // so on returning to 'active' we recompute remaining from the wall clock. If
  // endsAt has already passed, transition to completion via the SAME path the
  // interval would have taken (so the completion surface + row write happen);
  // otherwise correct the displayed remaining for the elapsed background time.
  useEffect(() => {
    const reconcile = (next: AppStateStatus) => {
      if (next !== 'active') return;
      if (state !== 'running' && state !== 'break_running') return;
      if (endsAtRef.current == null) return;

      const remainingMs = endsAtRef.current - Date.now();
      if (remainingMs <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        endsAtRef.current = null;
        setRemainingSeconds(0);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (state === 'running') {
          setState('session_complete');
          onSessionCompleteRef.current?.();
        } else {
          setState('break_complete');
          onBreakCompleteRef.current?.();
        }
      } else {
        setRemainingSeconds(Math.ceil(remainingMs / 1000));
      }
    };

    const subscription = AppState.addEventListener('change', reconcile);
    return () => subscription.remove();
  }, [state]);

  const start = useCallback(() => {
    if (state === 'idle') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      endsAtRef.current = Date.now() + remainingRef.current * 1000;
      setState('running');
    }
  }, [state]);

  const pause = useCallback(() => {
    if (state === 'running' || state === 'break_running') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Freeze: remaining is preserved in state; endsAt is re-derived on resume.
      endsAtRef.current = null;
      setState('paused');
    }
  }, [state]);

  const resume = useCallback(() => {
    if (state === 'paused') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      endsAtRef.current = Date.now() + remainingRef.current * 1000;
      // Resume to the previous active state
      setState('running'); // Simplified - could track previous state
    }
  }, [state]);

  const reset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    endsAtRef.current = null;
    const seconds = durationMinutes * 60;
    setRemainingSeconds(seconds);
    setTotalSeconds(seconds);
    setState('idle');
  }, [durationMinutes]);

  const startBreak = useCallback(() => {
    if (state === 'session_complete') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const breakSeconds = breakMinutes * 60;
      setRemainingSeconds(breakSeconds);
      setTotalSeconds(breakSeconds);
      endsAtRef.current = Date.now() + breakSeconds * 1000;
      setState('break_running');
    }
  }, [state, breakMinutes]);

  const setBreakDuration = useCallback((minutes: number) => {
    const clamped = Math.max(1, Math.min(15, minutes));
    setBreakMinutes(clamped);
  }, []);

  const beginAnother = useCallback(() => {
    if (state === 'break_complete') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const seconds = durationMinutes * 60;
      setRemainingSeconds(seconds);
      setTotalSeconds(seconds);
      endsAtRef.current = Date.now() + seconds * 1000;
      setState('running');
    }
  }, [state, durationMinutes]);

  // Calculate progress (0 to 1)
  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return {
    state,
    remainingSeconds,
    totalSeconds,
    endsAt: endsAtRef.current,
    progress,
    formattedTime: formatTime(remainingSeconds),
    start,
    pause,
    resume,
    reset,
    startBreak,
    beginAnother,
    isBreak: state === 'break_running' || state === 'break_complete',
    isActive: state === 'running' || state === 'break_running',
    breakDurationMinutes: breakMinutes,
    setBreakDuration,
  };
};

export default useTimer;
