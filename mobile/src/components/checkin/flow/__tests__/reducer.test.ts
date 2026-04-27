import { flowReducer, initFlow } from '../reducer';
import type {
  FlowAction,
  FlowState,
  RecommendationStep,
  ReCheckStep,
  ResponseStep,
  RunningStep,
  StatePickStep,
  TimePickStep,
} from '../types';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import type { Protocol } from '../../../../types/models';

// Helper — guaranteed-present protocols from the launch library.
function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) {
    throw new Error(`test fixture: protocol "${id}" not in library`);
  }
  return p;
}

const CYCLIC_SIGHING = getProtocol('cyclic-sighing-2');

// Constructed states (avoids walking the reducer every test). Return
// the specific variant type so per-step fields are accessible without
// narrowing in every assertion.
function statePickState(): StatePickStep {
  return { step: 'state_pick', entrySource: 'standard' };
}

function timePickState(): TimePickStep {
  return {
    step: 'time_pick',
    entrySource: 'standard',
    stateBefore: 'wired',
  };
}

function recommendationState(): RecommendationStep {
  return {
    step: 'recommendation',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: getProtocol('cyclic-sighing-2'),
  };
}

function runningState(sessionStartedAt = 1_000_000): RunningStep {
  return {
    step: 'running',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: getProtocol('cyclic-sighing-2'),
    sessionStartedAt,
  };
}

function reCheckState(): ReCheckStep {
  return {
    step: 're_check',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: getProtocol('cyclic-sighing-2'),
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
  };
}

function responseState(): ResponseStep {
  return {
    step: 'response',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: getProtocol('cyclic-sighing-2'),
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
    stateAfter: 'steady',
    outcome: 'shifted',
  };
}

describe('initFlow', () => {
  it('standard entry initializes at state_pick', () => {
    const state = initFlow({ entrySource: 'standard' });
    expect(state).toEqual({ step: 'state_pick', entrySource: 'standard' });
  });

  it('overwhelm entry initializes directly at running with wired/2/caller-protocol', () => {
    const state = initFlow({
      entrySource: 'overwhelm_safety_card',
      protocol: CYCLIC_SIGHING,
      nowMs: 5_000_000,
    });
    expect(state).toEqual({
      step: 'running',
      entrySource: 'overwhelm_safety_card',
      stateBefore: 'wired',
      timeWindow: 2,
      protocol: CYCLIC_SIGHING,
      sessionStartedAt: 5_000_000,
    });
  });

  it('state_preselected entry initializes at time_pick with the caller-provided stateBefore', () => {
    // Sub-step 2.5 entry source — used by the dashboard chip-tap
    // migration. Skips state_pick; the caller-provided stateBefore
    // is captured immediately so the user lands on time_pick.
    const state = initFlow({
      entrySource: 'state_preselected',
      stateBefore: 'foggy',
    });
    expect(state).toEqual({
      step: 'time_pick',
      entrySource: 'state_preselected',
      stateBefore: 'foggy',
    });
  });
});

describe('flowReducer — state_pick → time_pick', () => {
  it('state_selected advances to time_pick with stateBefore captured', () => {
    const result = flowReducer(statePickState(), {
      type: 'state_selected',
      state: 'foggy',
    });
    expect(result).toEqual({
      step: 'time_pick',
      entrySource: 'standard',
      stateBefore: 'foggy',
    });
  });

  it('back from state_pick is a no-op', () => {
    const start = statePickState();
    const result = flowReducer(start, { type: 'back' });
    expect(result).toBe(start);
  });

  it('unrelated actions are no-ops on state_pick', () => {
    const start = statePickState();
    expect(flowReducer(start, { type: 'protocol_begin', nowMs: 1 })).toBe(start);
    expect(flowReducer(start, { type: 'time_selected', timeWindow: 5 })).toBe(start);
  });
});

describe('flowReducer — time_pick → recommendation', () => {
  it('time_selected advances to recommendation with selectProtocol output', () => {
    const result = flowReducer(timePickState(), {
      type: 'time_selected',
      timeWindow: 5,
    });
    expect(result.step).toBe('recommendation');
    if (result.step === 'recommendation') {
      expect(result.stateBefore).toBe('wired');
      expect(result.timeWindow).toBe(5);
      expect(result.protocol).toBeDefined();
      // Stub recommender is first-match deterministic; wired+5min
      // includes wired+2min protocols. Just assert the protocol is
      // suitable for the requested state.
      expect(result.protocol.suitableForStates).toContain('wired');
      expect(result.protocol.timeWindow).toBeLessThanOrEqual(5);
    }
  });

  it('back from time_pick returns to state_pick (preserves entrySource)', () => {
    const result = flowReducer(timePickState(), { type: 'back' });
    expect(result).toEqual({ step: 'state_pick', entrySource: 'standard' });
  });

  it('unrelated actions are no-ops on time_pick', () => {
    const start = timePickState();
    expect(flowReducer(start, { type: 'state_selected', state: 'clear' })).toBe(start);
  });

  it('time_selected with no-match input throws in __DEV__ (selectProtocol contract)', () => {
    // Foggy + 2 min has no matching protocol; selectProtocol throws
    // in __DEV__ per sub-step 2.1 fix-forward. The reducer
    // intentionally does NOT catch — see PURITY NOTE in reducer.ts.
    const foggy2: FlowState = {
      step: 'time_pick',
      entrySource: 'standard',
      stateBefore: 'foggy',
    };
    expect(() =>
      flowReducer(foggy2, { type: 'time_selected', timeWindow: 2 })
    ).toThrow(/no protocol matched/i);
  });
});

describe('flowReducer — recommendation → running', () => {
  it('protocol_begin advances to running with sessionStartedAt from action', () => {
    const result = flowReducer(recommendationState(), {
      type: 'protocol_begin',
      nowMs: 9_999_999,
    });
    expect(result.step).toBe('running');
    if (result.step === 'running') {
      expect(result.sessionStartedAt).toBe(9_999_999);
      expect(result.stateBefore).toBe('wired');
      expect(result.timeWindow).toBe(5);
    }
  });

  it('back from recommendation returns to time_pick (preserves stateBefore)', () => {
    const result = flowReducer(recommendationState(), { type: 'back' });
    expect(result).toEqual({
      step: 'time_pick',
      entrySource: 'standard',
      stateBefore: 'wired',
    });
  });
});

describe('flowReducer — running → re_check (completed) or abandoned (ended_early)', () => {
  it('player_exit { completed } advances to re_check with computed duration', () => {
    const start = runningState(1_000_000);
    const result = flowReducer(start, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_125_500, // 125.5 seconds later → rounds to 126
    });
    expect(result.step).toBe('re_check');
    if (result.step === 're_check') {
      expect(result.sessionStartedAt).toBe(1_000_000);
      expect(result.sessionEndedAt).toBe(1_125_500);
      expect(result.durationActualSeconds).toBe(126);
      expect(result.playerExitReason).toBe('completed');
    }
  });

  it('player_exit { ended_early } short-circuits to abandoned (locked decision C)', () => {
    const start = runningState(1_000_000);
    const result = flowReducer(start, {
      type: 'player_exit',
      reason: 'ended_early',
      nowMs: 1_030_000,
    });
    expect(result.step).toBe('abandoned');
    if (result.step === 'abandoned') {
      expect(result.sessionStartedAt).toBe(1_000_000);
      expect(result.sessionEndedAt).toBe(1_030_000);
      expect(result.durationActualSeconds).toBe(30);
      // No stateAfter on AbandonedStep — parent writes outcome=
      // 'abandoned' with stateAfter=null.
      expect('stateAfter' in result).toBe(false);
    }
  });

  it('duration is clamped to 0 if endedAt < startedAt (clock weirdness)', () => {
    const start = runningState(1_000_000);
    const result = flowReducer(start, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 999_000,
    });
    if (result.step === 're_check') {
      expect(result.durationActualSeconds).toBe(0);
    }
  });

  it('back from running is a no-op (locked decision B)', () => {
    const start = runningState();
    const result = flowReducer(start, { type: 'back' });
    expect(result).toBe(start);
  });
});

describe('flowReducer — re_check → response (with classifier)', () => {
  it('state_after_selected wired→steady classifies as shifted', () => {
    const result = flowReducer(reCheckState(), {
      type: 'state_after_selected',
      stateAfter: 'steady',
    });
    expect(result.step).toBe('response');
    if (result.step === 'response') {
      expect(result.stateAfter).toBe('steady');
      expect(result.outcome).toBe('shifted');
    }
  });

  it('state_after_selected wired→foggy classifies as partial_shift', () => {
    const result = flowReducer(reCheckState(), {
      type: 'state_after_selected',
      stateAfter: 'foggy',
    });
    if (result.step === 'response') {
      expect(result.outcome).toBe('partial_shift');
    }
  });

  it('state_after_selected wired→wired classifies as not_shifted', () => {
    const result = flowReducer(reCheckState(), {
      type: 'state_after_selected',
      stateAfter: 'wired',
    });
    if (result.step === 'response') {
      expect(result.outcome).toBe('not_shifted');
    }
  });

  it('back from re_check is a no-op (locked decision B)', () => {
    const start = reCheckState();
    const result = flowReducer(start, { type: 'back' });
    expect(result).toBe(start);
  });

  it('response carries forward the full session record', () => {
    const start = reCheckState();
    const result = flowReducer(start, {
      type: 'state_after_selected',
      stateAfter: 'clear',
    });
    if (result.step === 'response') {
      expect(result.sessionStartedAt).toBe(start.sessionStartedAt);
      expect(result.sessionEndedAt).toBe(start.sessionEndedAt);
      expect(result.durationActualSeconds).toBe(start.durationActualSeconds);
      expect(result.protocol).toBe(start.protocol);
      expect(result.timeWindow).toBe(start.timeWindow);
      expect(result.playerExitReason).toBe('completed');
    }
  });
});

describe('flowReducer — response → flow_complete', () => {
  it.each(['try_longer', 'rest_later', 'dismissed', 'auto_dismissed'] as const)(
    'next_step_chosen { choice: %s } advances to flow_complete',
    (choice) => {
      const result = flowReducer(responseState(), {
        type: 'next_step_chosen',
        choice,
      });
      expect(result.step).toBe('flow_complete');
      if (result.step === 'flow_complete') {
        expect(result.userChosenNextStep).toBe(choice);
      }
    }
  );

  it('flow_complete carries the full session record forward', () => {
    const start = responseState();
    const result = flowReducer(start, {
      type: 'next_step_chosen',
      choice: 'dismissed',
    });
    if (result.step === 'flow_complete') {
      expect(result.stateBefore).toBe(start.stateBefore);
      expect(result.stateAfter).toBe(start.stateAfter);
      expect(result.outcome).toBe(start.outcome);
      expect(result.protocol).toBe(start.protocol);
      expect(result.durationActualSeconds).toBe(start.durationActualSeconds);
    }
  });

  it('back from response is a no-op (locked decision B)', () => {
    const start = responseState();
    const result = flowReducer(start, { type: 'back' });
    expect(result).toBe(start);
  });
});

describe('flowReducer — terminal states are absorbing', () => {
  const abandoned: FlowState = {
    step: 'abandoned',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: CYCLIC_SIGHING,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_030_000,
    durationActualSeconds: 30,
  };

  const flowComplete: FlowState = {
    step: 'flow_complete',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: CYCLIC_SIGHING,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
    stateAfter: 'steady',
    outcome: 'shifted',
    userChosenNextStep: 'dismissed',
  };

  it('any action on abandoned returns the same state (parent unmounts)', () => {
    expect(flowReducer(abandoned, { type: 'back' })).toBe(abandoned);
    expect(flowReducer(abandoned, { type: 'state_selected', state: 'clear' })).toBe(abandoned);
    expect(
      flowReducer(abandoned, {
        type: 'next_step_chosen',
        choice: 'dismissed',
      })
    ).toBe(abandoned);
  });

  it('any action on flow_complete returns the same state', () => {
    expect(flowReducer(flowComplete, { type: 'back' })).toBe(flowComplete);
    expect(
      flowReducer(flowComplete, {
        type: 'next_step_chosen',
        choice: 'dismissed',
      })
    ).toBe(flowComplete);
  });
});

describe('flowReducer — overwhelm-entry happy path (full traversal from running)', () => {
  // Verifies the reducer can drive an Overwhelm-initialized flow
  // through to flow_complete without any state_pick / time_pick /
  // recommendation states. Catches accidental coupling of those
  // steps to the running→re_check→response→flow_complete spine.
  it('overwhelm entry → completed → wired→steady → dismissed', () => {
    const init = initFlow({
      entrySource: 'overwhelm_safety_card',
      protocol: CYCLIC_SIGHING,
      nowMs: 1_000_000,
    });
    expect(init.step).toBe('running');

    const afterPlayer = flowReducer(init, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_120_000,
    });
    expect(afterPlayer.step).toBe('re_check');

    const afterReCheck = flowReducer(afterPlayer, {
      type: 'state_after_selected',
      stateAfter: 'steady',
    });
    expect(afterReCheck.step).toBe('response');
    if (afterReCheck.step === 'response') {
      expect(afterReCheck.outcome).toBe('shifted');
      expect(afterReCheck.entrySource).toBe('overwhelm_safety_card');
    }

    const final = flowReducer(afterReCheck, {
      type: 'next_step_chosen',
      choice: 'dismissed',
    });
    expect(final.step).toBe('flow_complete');
    if (final.step === 'flow_complete') {
      expect(final.entrySource).toBe('overwhelm_safety_card');
      expect(final.timeWindow).toBe(2);
    }
  });

  it('overwhelm entry → ended_early → abandoned terminal', () => {
    const init = initFlow({
      entrySource: 'overwhelm_safety_card',
      protocol: CYCLIC_SIGHING,
      nowMs: 1_000_000,
    });
    const result = flowReducer(init, {
      type: 'player_exit',
      reason: 'ended_early',
      nowMs: 1_015_000,
    });
    expect(result.step).toBe('abandoned');
    if (result.step === 'abandoned') {
      expect(result.entrySource).toBe('overwhelm_safety_card');
      expect(result.durationActualSeconds).toBe(15);
    }
  });
});

describe('flowReducer — state-preselected-entry happy path', () => {
  // Verifies state_preselected lands on time_pick and progresses
  // normally through the rest of the flow. Catches accidental
  // coupling that would force state_preselected through state_pick
  // unintentionally.
  it('state_preselected entry → time_selected → recommendation → ... → flow_complete', () => {
    let state = initFlow({
      entrySource: 'state_preselected',
      stateBefore: 'wired',
    });
    expect(state.step).toBe('time_pick');
    if (state.step !== 'time_pick') return;
    expect(state.stateBefore).toBe('wired');

    state = flowReducer(state, { type: 'time_selected', timeWindow: 5 });
    expect(state.step).toBe('recommendation');

    state = flowReducer(state, { type: 'protocol_begin', nowMs: 1_000_000 });
    expect(state.step).toBe('running');

    state = flowReducer(state, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_120_000,
    });
    expect(state.step).toBe('re_check');

    state = flowReducer(state, {
      type: 'state_after_selected',
      stateAfter: 'steady',
    });
    expect(state.step).toBe('response');

    state = flowReducer(state, {
      type: 'next_step_chosen',
      choice: 'dismissed',
    });
    expect(state.step).toBe('flow_complete');
    if (state.step === 'flow_complete') {
      // Entry source carries through the full flow.
      expect(state.entrySource).toBe('state_preselected');
      expect(state.stateBefore).toBe('wired');
      expect(state.stateAfter).toBe('steady');
    }
  });

  it('back from time_pick on state_preselected entry returns to state_pick (intentional fallthrough — user can reconsider)', () => {
    // Note: the reducer's back handler treats every time_pick the
    // same way regardless of entry source. From state_preselected,
    // tapping back DOES land on state_pick — giving the user a way
    // to reconsider the chip they tapped on the dashboard. This is
    // intentional: state_preselected is a routing optimization, not
    // a constraint.
    const start = initFlow({
      entrySource: 'state_preselected',
      stateBefore: 'wired',
    });
    const result = flowReducer(start, { type: 'back' });
    expect(result).toEqual({
      step: 'state_pick',
      entrySource: 'state_preselected',
    });
  });
});

describe('flowReducer — standard-entry happy path (full traversal)', () => {
  it('state→time→reco→running→completed→reCheck→response→flow_complete', () => {
    let state = initFlow({ entrySource: 'standard' });
    expect(state.step).toBe('state_pick');

    state = flowReducer(state, { type: 'state_selected', state: 'wired' });
    expect(state.step).toBe('time_pick');

    state = flowReducer(state, { type: 'time_selected', timeWindow: 5 });
    expect(state.step).toBe('recommendation');

    state = flowReducer(state, { type: 'protocol_begin', nowMs: 1_000_000 });
    expect(state.step).toBe('running');

    state = flowReducer(state, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_300_000,
    });
    expect(state.step).toBe('re_check');
    if (state.step === 're_check') {
      expect(state.durationActualSeconds).toBe(300);
    }

    state = flowReducer(state, {
      type: 'state_after_selected',
      stateAfter: 'clear',
    });
    expect(state.step).toBe('response');
    if (state.step === 'response') {
      expect(state.outcome).toBe('shifted');
    }

    state = flowReducer(state, {
      type: 'next_step_chosen',
      choice: 'dismissed',
    });
    expect(state.step).toBe('flow_complete');
  });
});

const _TYPECHECK: FlowAction[] = [
  { type: 'state_selected', state: 'wired' },
  { type: 'time_selected', timeWindow: 2 },
  { type: 'protocol_begin', nowMs: 0 },
  { type: 'player_exit', reason: 'completed', nowMs: 0 },
  { type: 'player_exit', reason: 'ended_early', nowMs: 0 },
  { type: 'state_after_selected', stateAfter: 'steady' },
  { type: 'next_step_chosen', choice: 'dismissed' },
  { type: 'next_step_chosen', choice: 'auto_dismissed' },
  { type: 'back' },
];
void _TYPECHECK;
