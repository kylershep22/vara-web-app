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
    checkInFlowContext: null,
  };
}

function reCheckState(): BrowseReCheckStep {
  return {
    step: 're_check',
    protocol: NSDR_20,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_000_000 + 20 * 60 * 1000,
    durationActualSeconds: 20 * 60,
    checkInFlowContext: null,
  };
}

describe('initBrowseRunFlow', () => {
  it('initializes at running with the caller-provided protocol and nowMs', () => {
    const state = initBrowseRunFlow({ protocol: NSDR_20, nowMs: 5_000_000 });
    expect(state).toEqual({
      step: 'running',
      protocol: NSDR_20,
      sessionStartedAt: 5_000_000,
      checkInFlowContext: null,
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
    checkInFlowContext: null,
  };

  const flowComplete: BrowseFlowCompleteStep = {
    step: 'flow_complete',
    protocol: NSDR_20,
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_000_000 + 1_200_000,
    durationActualSeconds: 1200,
    stateAfter: 'clear',
    checkInFlowContext: null,
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

describe('mapBrowseTerminalToPayload — Case 4 schema mapping (no context)', () => {
  it('flow_complete → outcome="browse_launched", stateBefore=null, stateAfter=captured', () => {
    const terminal: BrowseFlowCompleteStep = {
      step: 'flow_complete',
      protocol: NSDR_20,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_000_000 + 1_200_000,
      durationActualSeconds: 1200,
      stateAfter: 'clear',
      checkInFlowContext: null,
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
      checkInFlowContext: null,
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
      checkInFlowContext: null,
    };
    const payload = mapBrowseTerminalToPayload(terminal, 'sleep');
    expect(payload.intentPath).toBe('sleep');
  });
});

// Sub-step 2.7 round 5 (Bug B fix) — context-present mapping. When a
// BrowseRunFlow session originates from CheckInFlow, the terminal
// payload must use the standard outcome classifier (not browse_launched)
// and reflect the captured stateBefore + chosen timeWindow.
describe('mapBrowseTerminalToPayload — context-present (Bug B fix)', () => {
  const ctxFoggy10: NonNullable<BrowseFlowCompleteStep['checkInFlowContext']> =
    {
      state: 'foggy',
      timeWindow: 10,
      intentPath: 'default',
    };

  const ctxWired20: NonNullable<BrowseFlowCompleteStep['checkInFlowContext']> =
    {
      state: 'wired',
      timeWindow: 20,
      intentPath: 'down_regulation',
    };

  function flowCompleteWith(
    stateAfter: 'wired' | 'foggy' | 'steady' | 'clear' | 'alive',
    ctx: NonNullable<BrowseFlowCompleteStep['checkInFlowContext']>
  ): BrowseFlowCompleteStep {
    return {
      step: 'flow_complete',
      protocol: NSDR_20,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_000_000 + 1_200_000,
      durationActualSeconds: 1200,
      stateAfter,
      checkInFlowContext: ctx,
    };
  }

  it('foggy→steady classifies as "shifted" (negative→green)', () => {
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('steady', ctxFoggy10),
      'default'
    );
    expect(payload.outcome).toBe('shifted');
    expect(payload.stateBefore).toBe('foggy');
    expect(payload.stateAfter).toBe('steady');
    expect(payload.timeWindowSelected).toBe(10);
  });

  it('foggy→clear classifies as "shifted"', () => {
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('clear', ctxFoggy10),
      'default'
    );
    expect(payload.outcome).toBe('shifted');
  });

  it('wired→foggy classifies as "partial_shift" (special-case cluster 1)', () => {
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('foggy', ctxWired20),
      'default'
    );
    expect(payload.outcome).toBe('partial_shift');
    expect(payload.stateBefore).toBe('wired');
    expect(payload.timeWindowSelected).toBe(20);
  });

  it('wired→wired classifies as "not_shifted"', () => {
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('wired', ctxWired20),
      'default'
    );
    expect(payload.outcome).toBe('not_shifted');
  });

  it('steady→steady classifies as "maintenance" (green stay-or-down)', () => {
    const ctx: NonNullable<BrowseFlowCompleteStep['checkInFlowContext']> = {
      state: 'steady',
      timeWindow: 5,
      intentPath: 'default',
    };
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('steady', ctx),
      'default'
    );
    expect(payload.outcome).toBe('maintenance');
  });

  it('steady→clear classifies as "shifted" (upward green-to-green)', () => {
    const ctx: NonNullable<BrowseFlowCompleteStep['checkInFlowContext']> = {
      state: 'steady',
      timeWindow: 5,
      intentPath: 'default',
    };
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('clear', ctx),
      'default'
    );
    expect(payload.outcome).toBe('shifted');
  });

  it('intentPath comes from context, not the BrowseRunFlow caller default', () => {
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('steady', ctxWired20),
      'default'
    );
    expect(payload.intentPath).toBe('down_regulation');
  });

  it('abandoned with context preserves stateBefore from context, outcome stays "abandoned"', () => {
    const terminal: BrowseAbandonedStep = {
      step: 'abandoned',
      protocol: NSDR_20,
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_030_000,
      durationActualSeconds: 30,
      checkInFlowContext: ctxFoggy10,
    };
    const payload = mapBrowseTerminalToPayload(terminal, 'default');
    expect(payload.outcome).toBe('abandoned');
    expect(payload.stateBefore).toBe('foggy');
    expect(payload.stateAfter).toBeNull();
    expect(payload.timeWindowSelected).toBe(10);
  });

  it('userChosenNextStep is null even with context (BrowseRunFlow has no response screen)', () => {
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('steady', ctxFoggy10),
      'default'
    );
    expect(payload.userChosenNextStep).toBeNull();
  });

  // Round 10 (Finding 3) — "Try something longer" omits timeWindow
  // from the context. The mapper must fall back to the protocol's
  // intrinsic timeWindow so the session doc still records a valid
  // value for `timeWindowSelected`.
  it('ctx without timeWindow falls back to protocol.timeWindow for timeWindowSelected', () => {
    const ctxNoBudget: NonNullable<
      BrowseFlowCompleteStep['checkInFlowContext']
    > = {
      state: 'foggy',
      // timeWindow intentionally omitted (try_longer path)
      intentPath: 'default',
    };
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('clear', ctxNoBudget),
      'default'
    );
    // NSDR_20.timeWindow is 20 — falls back to that.
    expect(payload.timeWindowSelected).toBe(NSDR_20.timeWindow);
    // stateBefore + outcome still derived from context — only the
    // timeWindow falls back. Bug B routing/classification preserved.
    expect(payload.stateBefore).toBe('foggy');
    expect(payload.outcome).toBe('shifted'); // foggy→clear
  });

  it('ctx with explicit timeWindow uses the context value (not the fallback)', () => {
    // Regression guard: when ctx.timeWindow IS provided, the mapper
    // must use it, NOT fall through to protocol.timeWindow. This is
    // the "See other options" path's contract.
    const ctxWithBudget: NonNullable<
      BrowseFlowCompleteStep['checkInFlowContext']
    > = {
      state: 'foggy',
      timeWindow: 5, // user picked 5-min budget; ran a 20-min protocol
      intentPath: 'default',
    };
    const payload = mapBrowseTerminalToPayload(
      flowCompleteWith('clear', ctxWithBudget),
      'default'
    );
    expect(payload.timeWindowSelected).toBe(5);
  });
});

describe('initBrowseRunFlow — context plumbing (Bug B fix)', () => {
  it('persists checkInFlowContext when provided', () => {
    const ctx = {
      state: 'foggy' as const,
      timeWindow: 10 as const,
      intentPath: 'default' as const,
    };
    const state = initBrowseRunFlow({
      protocol: NSDR_20,
      nowMs: 5_000_000,
      checkInFlowContext: ctx,
    });
    expect(state.checkInFlowContext).toEqual(ctx);
  });

  it('defaults checkInFlowContext to null when omitted', () => {
    const state = initBrowseRunFlow({ protocol: NSDR_20, nowMs: 5_000_000 });
    expect(state.checkInFlowContext).toBeNull();
  });

  it('context propagates through running → re_check → flow_complete', () => {
    const ctx = {
      state: 'foggy' as const,
      timeWindow: 10 as const,
      intentPath: 'default' as const,
    };
    let state: BrowseRunFlowState = initBrowseRunFlow({
      protocol: NSDR_20,
      nowMs: 1_000_000,
      checkInFlowContext: ctx,
    });
    state = browseRunReducer(state, {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_000_000 + 1_200_000,
    });
    expect(state.checkInFlowContext).toEqual(ctx);
    state = browseRunReducer(state, {
      type: 'state_after_selected',
      stateAfter: 'steady',
    });
    expect(state.checkInFlowContext).toEqual(ctx);
  });
});
