// Pure reducer for the Phase 2 multi-step check-in flow.
//
// State machine: state_pick → time_pick → recommendation → running →
//                re_check → response → flow_complete (terminal)
//                                  or → abandoned       (terminal)
//
// Locked decisions enforced here (full rationale in
// `docs/PHASE_NOTES.md` "Sub-step 2.2 entry — locked decisions"):
//
//   A. GuidedSessionPlayer is OPAQUE. The reducer observes only the
//      single `player_exit` action carrying `reason` ('completed' or
//      'ended_early').
//
//   B. Back navigation is enabled from state_pick / time_pick /
//      recommendation only. The `back` action is a no-op from
//      running, re_check, response, abandoned, and flow_complete.
//      Once a protocol starts, the only exits are End early (→
//      abandoned) or natural Complete (→ re_check → response).
//
//   C. Abandoned short-circuits. `player_exit { reason: 'ended_early' }`
//      transitions running → abandoned, skipping re_check entirely.
//      stateAfter is never asked. ResponseStep / FlowCompleteStep are
//      unreachable along this path.
//
//   D. Overwhelm Safety Card entry skips state_pick AND time_pick AND
//      recommendation. `init({ entrySource: 'overwhelm_safety_card', ...})`
//      lands directly on RunningStep.
//
// PURITY NOTE — selectProtocol called from within this reducer:
//
//   The recommender (`selectProtocol`) runs synchronously on the
//   time→recommendation transition. In `__DEV__`, `selectProtocol`
//   throws when no protocol matches the (state, timeWindow) pair —
//   commit 90a5da9. Future maintainers may read this and wonder
//   whether the reducer is "impure" because it can throw or because
//   its behavior depends on `__DEV__`.
//
//   It isn't:
//     - `__DEV__` is a build-time constant, not a runtime side
//       effect. Its value is fixed before the reducer ever runs;
//       within a single build it's deterministic.
//     - Throwing from a pure function is fine. Pure means "no side
//       effects on the world AND output is determined by inputs."
//       A thrown exception is part of the function's output domain
//       under either of those framings.
//     - The reducer reads no clocks, no random, no globals beyond
//       `__DEV__`. Given the same state and action it produces the
//       same next state (or throws the same error). That's pure.
//
//   Resist the urge to "fix" this by catching the throw or moving
//   selectProtocol into a useEffect. The throw is contract
//   enforcement (sub-step 2.1's whole point). Catching would
//   re-introduce the silent-fallback hazard the fix-forward removed.

import {
  selectProtocol,
} from '../../../services/protocolSelector.service';
import { classifyOutcome } from '../../../services/outcomeClassifier';
import type {
  FlowAction,
  FlowInit,
  FlowState,
} from './types';

// ────────────────────────────────────────────────────────────
// Initialization
// ────────────────────────────────────────────────────────────

export function initFlow(init: FlowInit): FlowState {
  switch (init.entrySource) {
    case 'standard':
      return {
        step: 'state_pick',
        entrySource: 'standard',
      };
    case 'overwhelm_safety_card':
      return {
        step: 'running',
        entrySource: 'overwhelm_safety_card',
        stateBefore: 'wired',
        timeWindow: 2,
        protocol: init.protocol,
        sessionStartedAt: init.nowMs,
      };
  }
}

// ────────────────────────────────────────────────────────────
// Reducer
// ────────────────────────────────────────────────────────────

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (state.step) {
    case 'state_pick':
      return reduceStatePick(state, action);
    case 'time_pick':
      return reduceTimePick(state, action);
    case 'recommendation':
      return reduceRecommendation(state, action);
    case 'running':
      return reduceRunning(state, action);
    case 're_check':
      return reduceReCheck(state, action);
    case 'response':
      return reduceResponse(state, action);
    case 'abandoned':
    case 'flow_complete':
      // Terminal states. Parent unmounts on entry; no further
      // transitions are valid. Return state unchanged for any action
      // that arrives during the unmount race.
      return state;
  }
}

// ── per-step handlers ──────────────────────────────────────

function reduceStatePick(
  state: Extract<FlowState, { step: 'state_pick' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'state_selected') {
    return {
      step: 'time_pick',
      entrySource: state.entrySource,
      stateBefore: action.state,
    };
  }
  // `back` from state_pick is a no-op — the parent handles
  // dismissal of the flow itself via its close affordance.
  return state;
}

function reduceTimePick(
  state: Extract<FlowState, { step: 'time_pick' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'time_selected') {
    // Sync recommender call. Pure function (modulo __DEV__ throw on
    // no-match — see PURITY NOTE at file top).
    const protocol = selectProtocol({
      state: state.stateBefore,
      timeWindow: action.timeWindow,
    });
    return {
      step: 'recommendation',
      entrySource: state.entrySource,
      stateBefore: state.stateBefore,
      timeWindow: action.timeWindow,
      protocol,
    };
  }
  if (action.type === 'back') {
    return {
      step: 'state_pick',
      entrySource: state.entrySource,
    };
  }
  return state;
}

function reduceRecommendation(
  state: Extract<FlowState, { step: 'recommendation' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'protocol_begin') {
    return {
      step: 'running',
      entrySource: state.entrySource,
      stateBefore: state.stateBefore,
      timeWindow: state.timeWindow,
      protocol: state.protocol,
      sessionStartedAt: action.nowMs,
    };
  }
  if (action.type === 'back') {
    return {
      step: 'time_pick',
      entrySource: state.entrySource,
      stateBefore: state.stateBefore,
    };
  }
  return state;
}

function reduceRunning(
  state: Extract<FlowState, { step: 'running' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'player_exit') {
    const sessionEndedAt = action.nowMs;
    const durationActualSeconds = Math.max(
      0,
      Math.round((sessionEndedAt - state.sessionStartedAt) / 1000)
    );
    if (action.reason === 'ended_early') {
      // Locked decision C — short-circuit. No re-check, no
      // ResponseStep, parent writes outcome='abandoned'.
      return {
        step: 'abandoned',
        entrySource: state.entrySource,
        stateBefore: state.stateBefore,
        timeWindow: state.timeWindow,
        protocol: state.protocol,
        sessionStartedAt: state.sessionStartedAt,
        sessionEndedAt,
        durationActualSeconds,
      };
    }
    return {
      step: 're_check',
      entrySource: state.entrySource,
      stateBefore: state.stateBefore,
      timeWindow: state.timeWindow,
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt,
      durationActualSeconds,
      playerExitReason: 'completed',
    };
  }
  // `back` from running is a no-op (locked decision B).
  return state;
}

function reduceReCheck(
  state: Extract<FlowState, { step: 're_check' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'state_after_selected') {
    const outcome = classifyOutcome(state.stateBefore, action.stateAfter);
    return {
      step: 'response',
      entrySource: state.entrySource,
      stateBefore: state.stateBefore,
      timeWindow: state.timeWindow,
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt: state.sessionEndedAt,
      durationActualSeconds: state.durationActualSeconds,
      playerExitReason: state.playerExitReason,
      stateAfter: action.stateAfter,
      outcome,
    };
  }
  // `back` from re_check is a no-op (locked decision B).
  return state;
}

function reduceResponse(
  state: Extract<FlowState, { step: 'response' }>,
  action: FlowAction
): FlowState {
  if (action.type === 'next_step_chosen') {
    return {
      step: 'flow_complete',
      entrySource: state.entrySource,
      stateBefore: state.stateBefore,
      timeWindow: state.timeWindow,
      protocol: state.protocol,
      sessionStartedAt: state.sessionStartedAt,
      sessionEndedAt: state.sessionEndedAt,
      durationActualSeconds: state.durationActualSeconds,
      playerExitReason: state.playerExitReason,
      stateAfter: state.stateAfter,
      outcome: state.outcome,
      userChosenNextStep: action.choice,
    };
  }
  // `back` from response is a no-op (locked decision B).
  return state;
}
