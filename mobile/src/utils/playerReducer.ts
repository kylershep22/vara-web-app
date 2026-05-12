// Pure reducer for the GuidedSessionPlayer state machine.
//
// Sub-step 4.1 of Phase 1. Side effects (audio control, AsyncStorage
// marker, timers, callbacks) live in the player component (sub-step
// 4.3) and watch the state this reducer produces. Keeping the reducer
// pure and pre-built lets sub-step 4.2 (leaf components) and sub-step
// 4.3 (player composition) build against a state machine that has
// already been verified by tests.
//
// Design notes:
//   - Discriminated `PlayerStatus` carries only the fields meaningful
//     to that variant (no optional grab-bags). Session-durable data
//     (sessionStartedAtMs, stepsCompleted) lives on `PlayerState`.
//   - The reducer doesn't know the protocol's total step count.
//     Callers dispatch ADVANCE_STEP when more steps remain or COMPLETE
//     when the last step finishes. This keeps the reducer ignorant of
//     protocol shape — easy to test, easy to reason about.
//   - Every action that depends on "now" carries `nowMs` in its
//     payload. Reducer never reads the clock. Component dispatchers
//     call Date.now() at dispatch time. This makes every transition
//     deterministic in tests.
//   - Invalid transitions (e.g. PAUSE while idle) return state
//     unchanged. We don't throw — the player should stay alive even
//     if a stale dispatch arrives.

// ----- PlayerStatus: discriminated union -----

// Pre-start. Shown briefly before the user taps Start (sub-step 4.3
// renders an orientation card here for first-time runs).
interface IdleStatus {
  kind: 'idle';
}

// Active session, current step playing.
//   stepStartedAtMs    — wall-clock time when the current step began.
//                        Used to compute elapsed-in-step (now - this).
//   breathScheduleIndex — only meaningful for breath steps. Tracked
//                        here so PAUSE can capture it and RESUME can
//                        hand it back to BreathPacer's
//                        startAtScheduleIndex.
interface RunningStatus {
  kind: 'running';
  stepIndex: number;
  stepStartedAtMs: number;
  breathScheduleIndex?: number;
}

// User has paused. We capture how far into the current step they got
// so RESUME can offset the new stepStartedAtMs by that amount.
interface PausedStatus {
  kind: 'paused';
  stepIndex: number;
  elapsedInStepMs: number;
  breathScheduleIndex?: number;
}

// Natural completion — user finished every step.
interface CompletedStatus {
  kind: 'completed';
  completedAtMs: number;
}

// Abandonment. `reason` differentiates the abandonment cause:
//   user_exit   — explicit End early via transport bar.
//   audio_error — user chose End early from the audio-error transport
//                 state (audio failure was the context, but they
//                 still actively chose to leave).
//   force_quit  — constructed from an AsyncStorage marker on the next
//                 player mount; never produced by this reducer
//                 directly. Players construct the recovered summary
//                 outside the reducer and fire onRecoveredSession.
interface AbandonedStatus {
  kind: 'abandoned';
  reason: 'user_exit' | 'audio_error' | 'force_quit';
  abandonedAtMs: number;
}

export type PlayerStatus =
  | IdleStatus
  | RunningStatus
  | PausedStatus
  | CompletedStatus
  | AbandonedStatus;

// ----- PlayerState: status + session-durable fields -----

export interface PlayerState {
  status: PlayerStatus;
  // Wall-clock at the moment the user first started the session.
  // null while idle; set on START; preserved across pause/resume and
  // through completion/abandonment for the summary's `startedAt`.
  sessionStartedAtMs: number | null;
  // Count of steps the user actually finished. Incremented on
  // ADVANCE_STEP and on COMPLETE (the last step's finish).
  stepsCompleted: number;
}

export const initialPlayerState: PlayerState = {
  status: { kind: 'idle' },
  sessionStartedAtMs: null,
  stepsCompleted: 0,
};

// ----- PlayerAction -----

export type PlayerAction =
  // idle → running
  | { type: 'START'; nowMs: number }
  // running → paused (captures elapsedInStepMs)
  | { type: 'PAUSE'; nowMs: number }
  // paused → running (recovers stepStartedAtMs from elapsedInStepMs)
  | { type: 'RESUME'; nowMs: number }
  // running → running (next step). Caller dispatches when more steps
  // remain. Increments stepsCompleted (the step we just finished).
  | { type: 'ADVANCE_STEP'; nowMs: number }
  // running → completed. Caller dispatches when the last step
  // finishes. Increments stepsCompleted.
  | { type: 'COMPLETE'; nowMs: number }
  // running | paused — update the breath pacer's schedule index so
  // PAUSE can preserve it for RESUME.
  | { type: 'UPDATE_BREATH_INDEX'; index: number }
  // running | paused → abandoned. `reason` is REQUIRED — every call
  // site decides explicitly between user_exit (normal End early) and
  // audio_error (End early from the audio-error transport state).
  // No default value: forces explicitness and prevents silent
  // miscategorization on future call sites.
  | { type: 'END_EARLY'; nowMs: number; reason: 'user_exit' | 'audio_error' };

// ----- Reducer -----

export function playerReducer(
  state: PlayerState,
  action: PlayerAction
): PlayerState {
  switch (action.type) {
    case 'START': {
      if (state.status.kind !== 'idle') return state;
      return {
        status: {
          kind: 'running',
          stepIndex: 0,
          stepStartedAtMs: action.nowMs,
        },
        sessionStartedAtMs: action.nowMs,
        stepsCompleted: 0,
      };
    }

    case 'PAUSE': {
      if (state.status.kind !== 'running') return state;
      const elapsedInStepMs = action.nowMs - state.status.stepStartedAtMs;
      return {
        ...state,
        status: {
          kind: 'paused',
          stepIndex: state.status.stepIndex,
          elapsedInStepMs,
          breathScheduleIndex: state.status.breathScheduleIndex,
        },
      };
    }

    case 'RESUME': {
      if (state.status.kind !== 'paused') return state;
      // Reconstruct stepStartedAtMs by subtracting elapsedInStepMs
      // from now. This makes (now - stepStartedAtMs) === elapsedInStepMs
      // immediately on resume, so the step's running clock continues
      // from where the pause left off.
      return {
        ...state,
        status: {
          kind: 'running',
          stepIndex: state.status.stepIndex,
          stepStartedAtMs: action.nowMs - state.status.elapsedInStepMs,
          breathScheduleIndex: state.status.breathScheduleIndex,
        },
      };
    }

    case 'ADVANCE_STEP': {
      if (state.status.kind !== 'running') return state;
      return {
        ...state,
        status: {
          kind: 'running',
          stepIndex: state.status.stepIndex + 1,
          stepStartedAtMs: action.nowMs,
          // breathScheduleIndex is intentionally undefined for the
          // new step — consumers must dispatch UPDATE_BREATH_INDEX as
          // the new BreathPacer reports phases.
        },
        stepsCompleted: state.stepsCompleted + 1,
      };
    }

    case 'COMPLETE': {
      if (state.status.kind !== 'running') return state;
      return {
        ...state,
        status: {
          kind: 'completed',
          completedAtMs: action.nowMs,
        },
        stepsCompleted: state.stepsCompleted + 1,
      };
    }

    case 'UPDATE_BREATH_INDEX': {
      if (state.status.kind === 'running') {
        return {
          ...state,
          status: { ...state.status, breathScheduleIndex: action.index },
        };
      }
      if (state.status.kind === 'paused') {
        return {
          ...state,
          status: { ...state.status, breathScheduleIndex: action.index },
        };
      }
      return state;
    }

    case 'END_EARLY': {
      if (
        state.status.kind !== 'running' &&
        state.status.kind !== 'paused'
      ) {
        return state;
      }
      return {
        ...state,
        status: {
          kind: 'abandoned',
          reason: action.reason,
          abandonedAtMs: action.nowMs,
        },
      };
    }

    default:
      // Exhaustiveness check. Adding a new PlayerAction variant
      // without a case here is a compile error.
      return assertNever(action);
  }
}

// ----- Helpers -----

function assertNever(x: never): never {
  throw new Error(
    `playerReducer: unhandled action ${JSON.stringify(x)}`
  );
}

// Convenience type guards used by the player and by tests. Cheap to
// inline at call sites, but expressing them once keeps "what counts as
// a terminal status" in one place.
export function isTerminal(
  status: PlayerStatus
): status is CompletedStatus | AbandonedStatus {
  return status.kind === 'completed' || status.kind === 'abandoned';
}

export function isActive(
  status: PlayerStatus
): status is RunningStatus | PausedStatus {
  return status.kind === 'running' || status.kind === 'paused';
}
