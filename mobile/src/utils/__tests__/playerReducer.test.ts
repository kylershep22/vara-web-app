import {
  initialPlayerState,
  isActive,
  isTerminal,
  playerReducer,
  type PlayerAction,
  type PlayerState,
  type PlayerStatus,
} from '../playerReducer';

// ----- helpers -----

const T0 = 1_700_000_000_000; // arbitrary epoch ms used as session start
const T1 = T0 + 1_000;        // 1s later
const T2 = T0 + 4_500;        // 4.5s later
const T3 = T0 + 12_000;       // 12s later

function reduce(state: PlayerState, ...actions: PlayerAction[]): PlayerState {
  return actions.reduce((s, a) => playerReducer(s, a), state);
}

// State factories that read better than spread-clones at call sites.
function runningState(overrides: Partial<{
  stepIndex: number;
  stepStartedAtMs: number;
  breathScheduleIndex: number;
  sessionStartedAtMs: number;
  stepsCompleted: number;
}> = {}): PlayerState {
  return {
    status: {
      kind: 'running',
      stepIndex: overrides.stepIndex ?? 0,
      stepStartedAtMs: overrides.stepStartedAtMs ?? T0,
      breathScheduleIndex: overrides.breathScheduleIndex,
    },
    sessionStartedAtMs: overrides.sessionStartedAtMs ?? T0,
    stepsCompleted: overrides.stepsCompleted ?? 0,
  };
}

function pausedState(overrides: Partial<{
  stepIndex: number;
  elapsedInStepMs: number;
  breathScheduleIndex: number;
  sessionStartedAtMs: number;
  stepsCompleted: number;
}> = {}): PlayerState {
  return {
    status: {
      kind: 'paused',
      stepIndex: overrides.stepIndex ?? 0,
      elapsedInStepMs: overrides.elapsedInStepMs ?? 1_500,
      breathScheduleIndex: overrides.breathScheduleIndex,
    },
    sessionStartedAtMs: overrides.sessionStartedAtMs ?? T0,
    stepsCompleted: overrides.stepsCompleted ?? 0,
  };
}

const completedState: PlayerState = {
  status: { kind: 'completed', completedAtMs: T3 },
  sessionStartedAtMs: T0,
  stepsCompleted: 5,
};

const abandonedState: PlayerState = {
  status: {
    kind: 'abandoned',
    reason: 'user_exit',
    abandonedAtMs: T2,
  },
  sessionStartedAtMs: T0,
  stepsCompleted: 1,
};

// ----- tests -----

describe('initial state', () => {
  it('starts idle with no session and zero steps completed', () => {
    expect(initialPlayerState.status).toEqual({ kind: 'idle' });
    expect(initialPlayerState.sessionStartedAtMs).toBeNull();
    expect(initialPlayerState.stepsCompleted).toBe(0);
  });
});

describe('START', () => {
  it('idle → running with stepIndex=0 and sessionStartedAtMs=nowMs', () => {
    const next = playerReducer(initialPlayerState, {
      type: 'START',
      nowMs: T0,
    });
    expect(next.status).toEqual({
      kind: 'running',
      stepIndex: 0,
      stepStartedAtMs: T0,
    });
    expect(next.sessionStartedAtMs).toBe(T0);
    expect(next.stepsCompleted).toBe(0);
  });

  it.each([
    ['running', runningState()],
    ['paused', pausedState()],
    ['completed', completedState],
    ['abandoned', abandonedState],
  ])('is a no-op from %s', (_label, state) => {
    expect(playerReducer(state, { type: 'START', nowMs: T1 })).toBe(state);
  });
});

describe('PAUSE', () => {
  it('running → paused with elapsedInStepMs computed from nowMs', () => {
    const start = runningState({ stepStartedAtMs: T0, stepIndex: 2 });
    const next = playerReducer(start, { type: 'PAUSE', nowMs: T0 + 2_000 });
    expect(next.status).toEqual({
      kind: 'paused',
      stepIndex: 2,
      elapsedInStepMs: 2_000,
      breathScheduleIndex: undefined,
    });
  });

  it('preserves breathScheduleIndex through pause', () => {
    const start = runningState({
      stepStartedAtMs: T0,
      breathScheduleIndex: 7,
    });
    const next = playerReducer(start, { type: 'PAUSE', nowMs: T1 });
    expect(next.status.kind).toBe('paused');
    if (next.status.kind === 'paused') {
      expect(next.status.breathScheduleIndex).toBe(7);
    }
  });

  it('preserves sessionStartedAtMs and stepsCompleted', () => {
    const start = runningState({
      sessionStartedAtMs: T0,
      stepsCompleted: 3,
    });
    const next = playerReducer(start, { type: 'PAUSE', nowMs: T1 });
    expect(next.sessionStartedAtMs).toBe(T0);
    expect(next.stepsCompleted).toBe(3);
  });

  it.each([
    ['idle', initialPlayerState],
    ['paused', pausedState()],
    ['completed', completedState],
    ['abandoned', abandonedState],
  ])('is a no-op from %s', (_label, state) => {
    expect(playerReducer(state, { type: 'PAUSE', nowMs: T1 })).toBe(state);
  });
});

describe('RESUME', () => {
  it('paused → running with stepStartedAtMs reconstructed from elapsedInStepMs', () => {
    const start = pausedState({
      stepIndex: 1,
      elapsedInStepMs: 3_500,
    });
    const resumeAt = T0 + 10_000;
    const next = playerReducer(start, { type: 'RESUME', nowMs: resumeAt });
    expect(next.status.kind).toBe('running');
    if (next.status.kind === 'running') {
      // (resumeAt - stepStartedAtMs) should equal elapsedInStepMs,
      // so the running clock continues from where pause left off.
      expect(resumeAt - next.status.stepStartedAtMs).toBe(3_500);
      expect(next.status.stepIndex).toBe(1);
    }
  });

  it('preserves breathScheduleIndex through resume', () => {
    const start = pausedState({ breathScheduleIndex: 12 });
    const next = playerReducer(start, { type: 'RESUME', nowMs: T1 });
    if (next.status.kind === 'running') {
      expect(next.status.breathScheduleIndex).toBe(12);
    } else {
      throw new Error('expected running status');
    }
  });

  it.each([
    ['idle', initialPlayerState],
    ['running', runningState()],
    ['completed', completedState],
    ['abandoned', abandonedState],
  ])('is a no-op from %s', (_label, state) => {
    expect(playerReducer(state, { type: 'RESUME', nowMs: T1 })).toBe(state);
  });
});

describe('ADVANCE_STEP', () => {
  it('running → running with stepIndex+1 and stepStartedAtMs=nowMs', () => {
    const start = runningState({ stepIndex: 2, stepsCompleted: 2 });
    const next = playerReducer(start, {
      type: 'ADVANCE_STEP',
      nowMs: T2,
    });
    expect(next.status).toEqual({
      kind: 'running',
      stepIndex: 3,
      stepStartedAtMs: T2,
    });
    expect(next.stepsCompleted).toBe(3);
  });

  it('clears breathScheduleIndex on the new step (next step gets fresh schedule)', () => {
    const start = runningState({ breathScheduleIndex: 8 });
    const next = playerReducer(start, {
      type: 'ADVANCE_STEP',
      nowMs: T1,
    });
    if (next.status.kind === 'running') {
      expect(next.status.breathScheduleIndex).toBeUndefined();
    }
  });

  it.each([
    ['idle', initialPlayerState],
    ['paused', pausedState()],
    ['completed', completedState],
    ['abandoned', abandonedState],
  ])('is a no-op from %s', (_label, state) => {
    expect(playerReducer(state, { type: 'ADVANCE_STEP', nowMs: T1 })).toBe(state);
  });
});

describe('COMPLETE', () => {
  it('running → completed with completedAtMs=nowMs and stepsCompleted+1', () => {
    const start = runningState({ stepIndex: 4, stepsCompleted: 4 });
    const next = playerReducer(start, { type: 'COMPLETE', nowMs: T3 });
    expect(next.status).toEqual({ kind: 'completed', completedAtMs: T3 });
    expect(next.stepsCompleted).toBe(5);
    expect(next.sessionStartedAtMs).toBe(T0);
  });

  it.each([
    ['idle', initialPlayerState],
    ['paused', pausedState()],
    ['completed', completedState],
    ['abandoned', abandonedState],
  ])('is a no-op from %s', (_label, state) => {
    expect(playerReducer(state, { type: 'COMPLETE', nowMs: T1 })).toBe(state);
  });
});

describe('UPDATE_BREATH_INDEX', () => {
  it('updates breathScheduleIndex when running', () => {
    const start = runningState({ breathScheduleIndex: 0 });
    const next = playerReducer(start, {
      type: 'UPDATE_BREATH_INDEX',
      index: 5,
    });
    if (next.status.kind === 'running') {
      expect(next.status.breathScheduleIndex).toBe(5);
    }
  });

  it('updates breathScheduleIndex when paused', () => {
    const start = pausedState({ breathScheduleIndex: 0 });
    const next = playerReducer(start, {
      type: 'UPDATE_BREATH_INDEX',
      index: 9,
    });
    if (next.status.kind === 'paused') {
      expect(next.status.breathScheduleIndex).toBe(9);
    }
  });

  it.each([
    ['idle', initialPlayerState],
    ['completed', completedState],
    ['abandoned', abandonedState],
  ])('is a no-op from %s', (_label, state) => {
    expect(
      playerReducer(state, { type: 'UPDATE_BREATH_INDEX', index: 1 })
    ).toBe(state);
  });
});

describe('END_EARLY', () => {
  it('running → abandoned with reason=user_exit', () => {
    const start = runningState({ stepIndex: 1, stepsCompleted: 1 });
    const next = playerReducer(start, { type: 'END_EARLY', nowMs: T2, reason: 'user_exit' });
    expect(next.status).toEqual({
      kind: 'abandoned',
      reason: 'user_exit',
      abandonedAtMs: T2,
    });
    // stepsCompleted is not bumped — the user didn't finish the
    // step they were in when they ended.
    expect(next.stepsCompleted).toBe(1);
    expect(next.sessionStartedAtMs).toBe(T0);
  });

  it('paused → abandoned with reason=user_exit', () => {
    const start = pausedState({ stepIndex: 1, stepsCompleted: 1 });
    const next = playerReducer(start, { type: 'END_EARLY', nowMs: T2, reason: 'user_exit' });
    expect(next.status.kind).toBe('abandoned');
    if (next.status.kind === 'abandoned') {
      expect(next.status.reason).toBe('user_exit');
    }
  });

  it('passes audio_error reason through unchanged', () => {
    const start = runningState({ stepIndex: 0 });
    const next = playerReducer(start, {
      type: 'END_EARLY',
      nowMs: T2,
      reason: 'audio_error',
    });
    expect(next.status.kind).toBe('abandoned');
    if (next.status.kind === 'abandoned') {
      expect(next.status.reason).toBe('audio_error');
    }
  });

  it('audio_error reason is no-op from idle (defensive)', () => {
    expect(
      playerReducer(initialPlayerState, {
        type: 'END_EARLY',
        nowMs: T1,
        reason: 'audio_error',
      })
    ).toBe(initialPlayerState);
  });

  it.each([
    ['idle', initialPlayerState],
    ['completed', completedState],
    ['abandoned', abandonedState],
  ])('is a no-op from %s', (_label, state) => {
    expect(playerReducer(state, { type: 'END_EARLY', nowMs: T1, reason: 'user_exit' })).toBe(state);
  });
});

describe('integration scenarios', () => {
  it('start → pause → resume continues the running clock from where pause left', () => {
    const after = reduce(
      initialPlayerState,
      { type: 'START', nowMs: T0 },
      // 2s elapse
      { type: 'PAUSE', nowMs: T0 + 2_000 },
      // user paused for 5 minutes (300s)
      { type: 'RESUME', nowMs: T0 + 2_000 + 300_000 }
    );
    expect(after.status.kind).toBe('running');
    if (after.status.kind === 'running') {
      // Resume time minus reconstructed stepStartedAtMs should equal
      // the elapsed-in-step at pause (2_000ms).
      expect(
        T0 + 2_000 + 300_000 - after.status.stepStartedAtMs
      ).toBe(2_000);
    }
  });

  it('full happy path through three steps lands in completed', () => {
    const after = reduce(
      initialPlayerState,
      { type: 'START', nowMs: T0 },
      { type: 'ADVANCE_STEP', nowMs: T0 + 30_000 },
      { type: 'ADVANCE_STEP', nowMs: T0 + 60_000 },
      { type: 'COMPLETE', nowMs: T0 + 90_000 }
    );
    expect(after.status.kind).toBe('completed');
    expect(after.stepsCompleted).toBe(3);
    expect(after.sessionStartedAtMs).toBe(T0);
  });

  it('end early during step 2 records correct stepsCompleted', () => {
    const after = reduce(
      initialPlayerState,
      { type: 'START', nowMs: T0 },
      { type: 'ADVANCE_STEP', nowMs: T0 + 30_000 }, // finished step 0
      { type: 'END_EARLY', nowMs: T0 + 45_000, reason: 'user_exit' } // bailed mid step 1
    );
    expect(after.status.kind).toBe('abandoned');
    expect(after.stepsCompleted).toBe(1);
    expect(after.sessionStartedAtMs).toBe(T0);
  });

  it('breath schedule index survives multiple pauses and resumes', () => {
    const after = reduce(
      initialPlayerState,
      { type: 'START', nowMs: T0 },
      { type: 'UPDATE_BREATH_INDEX', index: 4 },
      { type: 'PAUSE', nowMs: T0 + 5_000 },
      // schedule index can also be updated while paused (defensive)
      { type: 'UPDATE_BREATH_INDEX', index: 6 },
      { type: 'RESUME', nowMs: T0 + 60_000 },
      { type: 'PAUSE', nowMs: T0 + 70_000 }
    );
    if (after.status.kind === 'paused') {
      expect(after.status.breathScheduleIndex).toBe(6);
    } else {
      throw new Error('expected paused status');
    }
  });

  it('ADVANCE_STEP wipes breathScheduleIndex (new step, new schedule)', () => {
    const after = reduce(
      initialPlayerState,
      { type: 'START', nowMs: T0 },
      { type: 'UPDATE_BREATH_INDEX', index: 12 },
      { type: 'ADVANCE_STEP', nowMs: T1 }
    );
    if (after.status.kind === 'running') {
      expect(after.status.breathScheduleIndex).toBeUndefined();
      expect(after.status.stepIndex).toBe(1);
    }
  });
});

describe('type guards', () => {
  const guardCases: Array<[string, PlayerStatus, boolean, boolean]> = [
    // [label, status, isActive, isTerminal]
    ['idle', { kind: 'idle' }, false, false],
    [
      'running',
      { kind: 'running', stepIndex: 0, stepStartedAtMs: T0 },
      true,
      false,
    ],
    [
      'paused',
      { kind: 'paused', stepIndex: 0, elapsedInStepMs: 0 },
      true,
      false,
    ],
    ['completed', { kind: 'completed', completedAtMs: T0 }, false, true],
    [
      'abandoned',
      { kind: 'abandoned', reason: 'user_exit', abandonedAtMs: T0 },
      false,
      true,
    ],
  ];

  it.each(guardCases)(
    '%s — isActive and isTerminal report correctly',
    (_label, status, expectedActive, expectedTerminal) => {
      expect(isActive(status)).toBe(expectedActive);
      expect(isTerminal(status)).toBe(expectedTerminal);
    }
  );
});
