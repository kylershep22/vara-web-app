import {
  browseRunReducer,
  initBrowseRunFlow,
  mapBrowseTerminalToPayload,
} from '../browseRunReducer';
import type {
  BrowseRunFlowState,
  BrowseAbandonedStep,
  BrowseFlowCompleteStep,
  BrowseReCheckStep,
  BrowseRunningStep,
} from '../browseRunTypes';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import type { Protocol } from '../../../../types/models';

function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`fixture: ${id} missing`);
  return p;
}

const NSDR_20 = getProtocol('nsdr-20');

function runningState(sessionStartedAt = 1_000_000): BrowseRunningStep {
  return {
    step: 'running',
    protocol: NSDR_20,
    sessionStartedAt,
  };
}

function reCheckState(): BrowseReCheckStep {
  return {
    step: 're_check',
    protocol: NSDR_20,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_000_000 + 20 * 60 * 1000,
    durationActualSeconds: 20 * 60,
  };
}

describe('initBrowseRunFlow', () => {
  it('initializes at running with the caller-provided protocol and nowMs', () => {
    const state = initBrowseRunFlow({ protocol: NSDR_20, nowMs: 5_000_000 });
    expect(state).toEqual({
      step: 'running',
      protocol: NSDR_20,
      sessionStartedAt: 5_000_000,
    });
  });
});

describe('browseRunReducer — running → re_check (completed) or abandoned (ended_early)', () => {
  it('player_exit { completed } advances to re_check with computed duration', () => {
    const start = runningState(1_000_000);
    const result = browseRunReducer(start, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_000_000 + 1_200_000, // 1200s = 20 min
    });
    expect(result.step).toBe('re_check');
    if (result.step === 're_check') {
      expect(result.durationActualSeconds).toBe(1200);
      expect(result.protocol).toBe(NSDR_20);
    }
  });

  it('player_exit { ended_early } short-circuits to abandoned (no re-check)', () => {
    const start = runningState(1_000_000);
    const result = browseRunReducer(start, {
      type: 'player_exit',
      reason: 'ended_early',
      nowMs: 1_030_000,
    });
    expect(result.step).toBe('abandoned');
    if (result.step === 'abandoned') {
      expect(result.durationActualSeconds).toBe(30);
      // No stateAfter on the abandoned terminal — re-check never ran.
      expect('stateAfter' in result).toBe(false);
    }
  });

  it('duration is clamped to 0 on clock weirdness', () => {
    const start = runningState(1_000_000);
    const result = browseRunReducer(start, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 999_000,
    });
    if (result.step === 're_check') {
      expect(result.durationActualSeconds).toBe(0);
    }
  });

  it('unrelated actions on running are no-ops', () => {
    const start = runningState();
    const result = browseRunReducer(start, {
      type: 'state_after_selected',
      stateAfter: 'steady',
    });
    expect(result).toBe(start);
  });
});

describe('browseRunReducer — re_check → flow_complete', () => {
  it('state_after_selected advances to flow_complete carrying stateAfter', () => {
    const result = browseRunReducer(reCheckState(), {
      type: 'state_after_selected',
      stateAfter: 'clear',
    });
    expect(result.step).toBe('flow_complete');
    if (result.step === 'flow_complete') {
      expect(result.stateAfter).toBe('clear');
      expect(result.protocol).toBe(NSDR_20);
      expect(result.durationActualSeconds).toBe(1200);
    }
  });

  it('player_exit on re_check is a no-op (player already exited)', () => {
    const start = reCheckState();
    const result = browseRunReducer(start, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 9_999_999,
    });
    expect(result).toBe(start);
  });
});

describe('browseRunReducer — terminal absorbing-state behavior', () => {
  const abandoned: BrowseAbandonedStep = {
    step: 'abandoned',
    protocol: NSDR_20,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_030_000,
    durationActualSeconds: 30,
  };

  const flowComplete: BrowseFlowCompleteStep = {
    step: 'flow_complete',
    protocol: NSDR_20,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_000_000 + 1_200_000,
    durationActualSeconds: 1200,
    stateAfter: 'clear',
  };

  it('any action on abandoned returns the same state', () => {
    expect(
      browseRunReducer(abandoned, {
        type: 'state_after_selected',
        stateAfter: 'clear',
      })
    ).toBe(abandoned);
    expect(
      browseRunReducer(abandoned, {
        type: 'player_exit',
        reason: 'completed',
        nowMs: 9,
      })
    ).toBe(abandoned);
  });

  it('any action on flow_complete returns the same state', () => {
    expect(
      browseRunReducer(flowComplete, {
        type: 'state_after_selected',
        stateAfter: 'wired',
      })
    ).toBe(flowComplete);
  });
});

describe('browseRunReducer — full happy path', () => {
  it('init → player completed → state_after_selected → flow_complete', () => {
    let state: BrowseRunFlowState = initBrowseRunFlow({
      protocol: NSDR_20,
      nowMs: 1_000_000,
    });
    expect(state.step).toBe('running');

    state = browseRunReducer(state, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_000_000 + 1_200_000,
    });
    expect(state.step).toBe('re_check');

    state = browseRunReducer(state, {
      type: 'state_after_selected',
      stateAfter: 'clear',
    });
    expect(state.step).toBe('flow_complete');
    if (state.step === 'flow_complete') {
      expect(state.stateAfter).toBe('clear');
      expect(state.protocol).toBe(NSDR_20);
    }
  });

  it('init → player ended_early → abandoned (no re-check, no stateAfter)', () => {
    let state: BrowseRunFlowState = initBrowseRunFlow({
      protocol: NSDR_20,
      nowMs: 1_000_000,
    });
    state = browseRunReducer(state, {
      type: 'player_exit',
      reason: 'ended_early',
      nowMs: 1_015_000,
    });
    expect(state.step).toBe('abandoned');
    if (state.step === 'abandoned') {
      expect(state.durationActualSeconds).toBe(15);
    }
  });
});

describe('mapBrowseTerminalToPayload — Case 4 schema mapping', () => {
  it('flow_complete → outcome="browse_launched", stateBefore=null, stateAfter=captured', () => {
    const terminal: BrowseFlowCompleteStep = {
      step: 'flow_complete',
      protocol: NSDR_20,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_000_000 + 1_200_000,
      durationActualSeconds: 1200,
      stateAfter: 'clear',
    };
    const payload = mapBrowseTerminalToPayload(terminal, 'default');
    expect(payload).toEqual({
      protocolId: 'nsdr-20',
      stateBefore: null,
      stateAfter: 'clear',
      timeWindowSelected: NSDR_20.timeWindow,
      durationActualSeconds: 1200,
      outcome: 'browse_launched',
      userChosenNextStep: null,
      intentPath: 'default',
      sessionStartedAt: 1_000_000,
    });
  });

  it('abandoned → outcome="abandoned", stateBefore=null, stateAfter=null', () => {
    const terminal: BrowseAbandonedStep = {
      step: 'abandoned',
      protocol: NSDR_20,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_030_000,
      durationActualSeconds: 30,
    };
    const payload = mapBrowseTerminalToPayload(terminal, 'default');
    expect(payload.outcome).toBe('abandoned');
    expect(payload.stateBefore).toBeNull();
    expect(payload.stateAfter).toBeNull();
    expect(payload.userChosenNextStep).toBeNull();
  });

  it('intentPath is forwarded (Phase 3 wiring point)', () => {
    const terminal: BrowseFlowCompleteStep = {
      step: 'flow_complete',
      protocol: NSDR_20,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_000_000 + 1_200_000,
      durationActualSeconds: 1200,
      stateAfter: 'clear',
    };
    const payload = mapBrowseTerminalToPayload(terminal, 'sleep');
    expect(payload.intentPath).toBe('sleep');
  });
});
