// Integration tests for BrowseRunFlow's terminal write contract.
//
// The reducer + payload mapper are unit-tested in
// browseRunReducer.test.ts. These tests cover the component-level
// integration that the unit tests can't see:
//
//   - The terminal useEffect calls writeProtocolSession authoritatively
//     in both context-present and context-absent cases.
//   - When CheckInFlowContext is present, it ALSO calls
//     writeBrainStateCheckInLegacyEffects so the dashboard's
//     brainStateCheckIns read sees the new check-in (round 7 fix —
//     the original Bug A symptom resurfaced after Bug B routed
//     BrowseRunFlow to dashboard, exposing the legacy-write gap).
//   - When context is absent (true browse), the legacy helper is
//     NOT called — preserves the isolated browse path semantics.
//   - onComplete fires AFTER Promise.all resolves (timing parity
//     with CheckInFlow's terminal pattern).
//
// GuidedSessionPlayer is mocked: tests drive player_exit deterministically.

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import {
  fireEvent,
  render,
  waitFor,
  act,
} from '@testing-library/react-native';

import { BrowseRunFlow } from '../BrowseRunFlow';
import type { CheckInFlowContext } from '../browseRunTypes';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import type {
  Protocol,
  ProtocolSessionSummary,
} from '../../../../types/models';

// ────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────
let lastOnExit: ((summary: ProtocolSessionSummary) => void) | null = null;

jest.mock('../../../protocol/GuidedSessionPlayer', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    GuidedSessionPlayer: (props: {
      protocol: { id: string };
      onExit: (summary: ProtocolSessionSummary) => void;
    }) => {
      lastOnExit = props.onExit;
      return ReactLib.createElement(
        View,
        { testID: 'mock-guided-session-player' },
        ReactLib.createElement(Text, null, `Mock player for ${props.protocol.id}`)
      );
    },
  };
});

// LightMovementProtocolFlow wraps GuidedSessionPlayer plus a modality
// picker. For these tests we stick to non-brief-movement protocols
// (NSDR-20) so the picker doesn't render and the simpler player path
// is exercised.

jest.mock('../../../../services/firebase/protocolSession.service', () => {
  const actual = jest.requireActual(
    '../../../../services/firebase/protocolSession.service'
  );
  return {
    ...actual,
    writeProtocolSession: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../../../services/firebase/brainStateCheckIn.service', () => {
  const actual = jest.requireActual(
    '../../../../services/firebase/brainStateCheckIn.service'
  );
  return {
    ...actual,
    // Round 14 split — was a single writeBrainStateCheckInLegacyEffects
    // mock. The two independent helpers replaced it; tests assert on
    // writeBrainStateCheckInDoc (the legacy doc write) for outcome /
    // protocolId / stateBefore arguments.
    writeBrainStateCheckInDoc: jest.fn().mockResolvedValue(undefined),
    maybeMarkFirstShift: jest.fn().mockResolvedValue(undefined),
  };
});

import { writeProtocolSession as writeProtocolSessionMock } from '../../../../services/firebase/protocolSession.service';
import {
  writeBrainStateCheckInDoc as writeLegacyMock,
  maybeMarkFirstShift as maybeMarkFirstShiftMock,
} from '../../../../services/firebase/brainStateCheckIn.service';

beforeEach(() => {
  lastOnExit = null;
  (writeProtocolSessionMock as jest.Mock).mockClear();
  (writeLegacyMock as jest.Mock).mockClear();
  (maybeMarkFirstShiftMock as jest.Mock).mockClear();
});

// ────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────
function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`fixture: ${id} missing`);
  return p;
}

const NSDR_20 = getProtocol('nsdr-20');
const TEST_USER_ID = 'test-user-id';

const TEST_PROPS = {
  userId: TEST_USER_ID,
  stateBefore: 'foggy' as const,
  writeMode: 'dev_dry_run' as const,
};

function summary(opts: {
  completed: boolean;
  protocolId: string;
}): ProtocolSessionSummary {
  return {
    protocolId: opts.protocolId,
    stateBefore: 'foggy',
    completed: opts.completed,
    durationActualSeconds: 1200,
    stepsCompleted: opts.completed ? 1 : 0,
    totalSteps: 1,
    abandonReason: opts.completed ? null : 'user_exit',
    startedAt: 1_000_000,
    endedAt: 1_000_000 + 1_200_000,
  };
}

// Round 7 BrowseRunFlow terminal effect awaits Promise.all([write,
// setTimeout(1500)]) before firing onComplete. Same shape as
// CheckInFlow.
const TERMINAL_ON_COMPLETE_TIMEOUT_MS = 3000;

const FOGGY_10_CONTEXT: CheckInFlowContext = {
  state: 'foggy',
  timeWindow: 10,
  intentPath: 'default',
};

// Round 12 (Finding H): when ctx is present, BrowseRunFlow now
// renders a response step between re_check and flow_complete. The
// response component depends on outcome class:
//   - shifted / partial_shift / maintenance → ShiftedResponse
//     (testID 'shifted-response', continue button
//     'shifted-response-continue', dispatches 'dismissed').
//   - not_shifted → NotShiftedResponse (testIDs
//     'not-shifted-response-try-longer' / 'rest-later').
// Helper finds whichever response screen rendered and presses its
// dismiss-style button so flow_complete fires and onComplete runs.
async function pressResponseDismiss(
  findByTestId: (id: string) => Promise<unknown>,
  queryByTestId: (id: string) => unknown
): Promise<void> {
  // Race the two possible response surfaces. ShiftedResponse mounts
  // for positive outcomes; NotShiftedResponse for not_shifted.
  await findByTestId(
    queryByTestId('shifted-response') !== null
      ? 'shifted-response'
      : 'not-shifted-response'
  );
  const continueId =
    queryByTestId('shifted-response-continue') !== null
      ? 'shifted-response-continue'
      : 'not-shifted-response-rest-later';
  fireEvent.press((await findByTestId(continueId)) as never);
}

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe('BrowseRunFlow — terminal write with CheckInFlowContext (Bug A v2 fix)', () => {
  it('flow_complete with context invokes BOTH writeProtocolSession AND writeBrainStateCheckInLegacyEffects', async () => {
    const onComplete = jest.fn();
    const { findByTestId, queryByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        checkInFlowContext={FOGGY_10_CONTEXT}
        onComplete={onComplete}
      />
    );

    // Sanity: no writes at mount.
    expect(writeProtocolSessionMock).not.toHaveBeenCalled();
    expect(writeLegacyMock).not.toHaveBeenCalled();

    // Drive: player completes → re-check renders → user picks state →
    // response screen renders → user dismisses → flow_complete fires.
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));
    await pressResponseDismiss(findByTestId, queryByTestId);

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );

    // Authoritative write fired exactly once.
    expect(writeProtocolSessionMock).toHaveBeenCalledTimes(1);
    const [protoUserId, protoPayload] = (writeProtocolSessionMock as jest.Mock)
      .mock.calls[0];
    expect(protoUserId).toBe(TEST_USER_ID);
    expect(protoPayload).toEqual(
      expect.objectContaining({
        protocolId: 'nsdr-20',
        stateBefore: 'foggy',
        stateAfter: 'steady',
        timeWindowSelected: 10,
        outcome: 'shifted',
      })
    );

    // Round 14 split — was a single writeBrainStateCheckInLegacyEffects
    // call. Now writeBrainStateCheckInDoc (the legacy doc write) and
    // maybeMarkFirstShift (the first-shift marker) fire independently.
    // writeLegacyMock now refers to writeBrainStateCheckInDoc with
    // signature (userId, state, isFlowComplete, protocolId, options).
    //
    // Round 15 fix: the `state` arg at index 1 is now the user's
    // most-recent attestation. For flow_complete with re-check
    // 'steady', that's 'steady' (NOT the ctx.state 'foggy' that
    // pre-fix tests asserted on). The dashboard summary card and
    // AI prompt context both render this field — they should reflect
    // the post-protocol state, not the pre-protocol state.
    expect(writeLegacyMock).toHaveBeenCalledTimes(1);
    const legacyCall = (writeLegacyMock as jest.Mock).mock.calls[0];
    expect(legacyCall[0]).toBe(TEST_USER_ID);
    expect(legacyCall[1]).toBe('steady'); // stateAfter (post-re-check)
    expect(legacyCall[2]).toBe(true); // isFlowComplete
    expect(legacyCall[3]).toBe('nsdr-20'); // actually-completed protocolId
    expect(legacyCall[4]).toEqual({ dryRun: true });

    // Round 14 — first-shift marker fires alongside the legacy write
    // for ctx-present sessions (BrowseRunFlow ctx-present is a
    // CheckInFlow continuation; first-shift behavior preserved).
    expect(maybeMarkFirstShiftMock).toHaveBeenCalledTimes(1);
    const firstShiftCall = (maybeMarkFirstShiftMock as jest.Mock).mock.calls[0];
    expect(firstShiftCall[0]).toBe(TEST_USER_ID);
    expect(firstShiftCall[1]).toBe('shifted'); // outcome
    expect(firstShiftCall[2]).toEqual({ dryRun: true });
  });

  it('Bug F regression: protocolId arg matches the actually-completed protocol, not a default', async () => {
    // The whole point of round 8: BrowseRunFlow's terminal must pass
    // the user's actually-completed protocol id (state.protocol.id),
    // not let saveBrainStateCheckIn fall back to selectProtocol's
    // default for the state. Reproducer: Foggy + 5 → "See other
    // options" → user picks NSDR-20 (NOT the default Foggy 5-min
    // recommendation). The legacy helper's protocolId arg must be
    // 'nsdr-20'.
    render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        checkInFlowContext={FOGGY_10_CONTEXT}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'nsdr-20' }));
    });
    await waitFor(
      () => expect(writeLegacyMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    // Round 14 — protocolId moved from index 4 to index 3 with the
    // helper split (outcome dropped from this signature).
    const [, , , protocolIdArg] = (writeLegacyMock as jest.Mock).mock
      .calls[0];
    expect(protocolIdArg).toBe('nsdr-20');
  });

  it('classifier branches: foggy→clear writes outcome="shifted" via maybeMarkFirstShift', async () => {
    const { findByTestId, queryByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        checkInFlowContext={FOGGY_10_CONTEXT}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Clear'));
    await pressResponseDismiss(findByTestId, queryByTestId);
    await waitFor(
      () => expect(maybeMarkFirstShiftMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    // Round 14 — outcome moved from writeBrainStateCheckInLegacyEffects
    // index 3 to maybeMarkFirstShift index 1.
    const [, outcome] = (maybeMarkFirstShiftMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('shifted');
  });

  it('classifier branches: wired→foggy writes outcome="partial_shift" via maybeMarkFirstShift', async () => {
    const wiredCtx: CheckInFlowContext = {
      state: 'wired',
      timeWindow: 5,
      intentPath: 'default',
    };
    const { findByTestId, queryByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        stateBefore="wired"
        checkInFlowContext={wiredCtx}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Foggy'));
    await pressResponseDismiss(findByTestId, queryByTestId);
    await waitFor(
      () => expect(writeLegacyMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    // Round 15 — writeBrainStateCheckInDoc index 1 is now the user's
    // most-recent attestation. For flow_complete with re-check 'foggy',
    // that's 'foggy' (NOT the ctx.state 'wired' that pre-round-15
    // tests asserted on). Outcome stays on maybeMarkFirstShift index 1
    // (computed by classifyOutcome from the (stateBefore, stateAfter)
    // pair — 'wired' → 'foggy' = 'partial_shift').
    const [, stateForLegacyDoc] = (writeLegacyMock as jest.Mock).mock.calls[0];
    expect(stateForLegacyDoc).toBe('foggy');
    expect(maybeMarkFirstShiftMock).toHaveBeenCalled();
    const [, outcome] = (maybeMarkFirstShiftMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('partial_shift');
  });

  it('classifier branches: wired→wired writes outcome="not_shifted"', async () => {
    const wiredCtx: CheckInFlowContext = {
      state: 'wired',
      timeWindow: 5,
      intentPath: 'default',
    };
    const { findByTestId, queryByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        stateBefore="wired"
        checkInFlowContext={wiredCtx}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Wired'));
    await pressResponseDismiss(findByTestId, queryByTestId);
    await waitFor(
      () => expect(maybeMarkFirstShiftMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    // Round 14 — outcome lives on maybeMarkFirstShift now.
    const [, outcome] = (maybeMarkFirstShiftMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('not_shifted');
  });

  it('classifier branches: steady→steady writes outcome="maintenance"', async () => {
    const steadyCtx: CheckInFlowContext = {
      state: 'steady',
      timeWindow: 5,
      intentPath: 'default',
    };
    const { findByTestId, queryByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        stateBefore="steady"
        checkInFlowContext={steadyCtx}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));
    await pressResponseDismiss(findByTestId, queryByTestId);
    await waitFor(
      () => expect(maybeMarkFirstShiftMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const [, outcome] = (maybeMarkFirstShiftMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('maintenance');
  });

  it('abandoned with context still invokes both helpers; isFlowComplete=false, outcome="abandoned"', async () => {
    const onComplete = jest.fn();
    render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        checkInFlowContext={FOGGY_10_CONTEXT}
        onComplete={onComplete}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'nsdr-20' }));
    });
    await waitFor(
      () => expect(onComplete).toHaveBeenCalledTimes(1),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    expect(writeLegacyMock).toHaveBeenCalledTimes(1);
    const [, stateForLegacyDoc, isFlowComplete] = (
      writeLegacyMock as jest.Mock
    ).mock.calls[0];
    // Round 15: abandoned terminals still pass ctx.state (the
    // pre-protocol state). Re-check never ran, so there's no
    // stateAfter to use — ctx.state IS the most recent attestation
    // available. The fix only changes the value for flow_complete.
    expect(stateForLegacyDoc).toBe('foggy');
    expect(isFlowComplete).toBe(false);
    expect(maybeMarkFirstShiftMock).toHaveBeenCalledTimes(1);
    const [, outcome] = (maybeMarkFirstShiftMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('abandoned');
  });
});

describe('BrowseRunFlow — terminal write WITHOUT context (true-browse: felt reflection)', () => {
  it('shows the felt reflection (not the 5-state re-check) and writes browse_launched + reflectionId, stateAfter null', async () => {
    const onComplete = jest.fn();
    const { findByTestId, queryByTestId } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        // checkInFlowContext intentionally omitted — true browse path.
        onComplete={onComplete}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    // B-3b Issue 2: the modern reflection renders, NOT the deprecated
    // 5-state re-check (Wired/Foggy/Steady/Clear/Alive).
    expect(await findByTestId('checkin-flow-reflection')).toBeTruthy();
    expect(queryByTestId('checkin-flow-re-check')).toBeNull();
    // NSDR-20 is energy/settle → the strong-positive chip id is 'calmer'.
    fireEvent.press(await findByTestId('checkin-flow-reflection-chip-calmer'));

    await waitFor(
      () => expect(onComplete).toHaveBeenCalledTimes(1),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );

    // Authoritative write still fires — existing browse_launched shape plus
    // reflectionId, with stateAfter NULL (no synthesized 5-state).
    expect(writeProtocolSessionMock).toHaveBeenCalledTimes(1);
    const [, payload] = (writeProtocolSessionMock as jest.Mock).mock.calls[0];
    expect(payload.outcome).toBe('browse_launched');
    expect(payload.stateBefore).toBeNull();
    expect(payload.stateAfter).toBeNull();
    expect(payload.reflectionId).toBe('calmer');

    // Legacy helpers NOT called (preserves isolated browse semantics).
    // Round 14 — both writeBrainStateCheckInDoc and maybeMarkFirstShift
    // are gated on ctx presence; absence skips both.
    expect(writeLegacyMock).not.toHaveBeenCalled();
    expect(maybeMarkFirstShiftMock).not.toHaveBeenCalled();
  });
});

describe('BrowseRunFlow — response step (round 12 Finding H fix)', () => {
  // The response step renders ONLY when checkInFlowContext is present.
  // These tests assert (a) the screen mounts at the right moment in
  // the state machine, (b) tapping the response button captures the
  // user's actual choice (replacing the prior auto_dismissed
  // fragility flagged in earlier rounds), and (c) ctx-absent flows
  // still skip the response step (true-browse preserved).

  it('renders response screen between re_check and flow_complete when ctx present', async () => {
    const { findByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        checkInFlowContext={FOGGY_10_CONTEXT}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));
    // foggy→steady classifies as 'shifted' → ShiftedResponse renders.
    expect(await findByTestId('shifted-response')).toBeTruthy();
  });

  it('captured userChosenNextStep="dismissed" flows through to the legacy helper outcome arg position', async () => {
    // Round 8 helper-args index check: when the user actually presses
    // Continue (dismissed), the BrowseRunFlow terminal write must
    // capture that choice — NOT auto_dismissed (which was the
    // fragility flagged in earlier rounds).
    const { findByTestId, queryByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        checkInFlowContext={FOGGY_10_CONTEXT}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));
    // shifted-response-continue dispatches 'dismissed' (not auto-).
    fireEvent.press(await findByTestId('shifted-response-continue'));
    void queryByTestId; // keep destructure shape consistent

    await waitFor(
      () => expect(writeProtocolSessionMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const [, payload] = (writeProtocolSessionMock as jest.Mock).mock.calls[0];
    expect(payload.userChosenNextStep).toBe('dismissed');
  });

  it('captured userChosenNextStep="rest_later" on not_shifted path', async () => {
    const wiredCtx: CheckInFlowContext = {
      state: 'wired',
      timeWindow: 5,
      intentPath: 'default',
    };
    const { findByTestId, getByLabelText } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        stateBefore="wired"
        checkInFlowContext={wiredCtx}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Wired'));
    fireEvent.press(await findByTestId('not-shifted-response-rest-later'));

    await waitFor(
      () => expect(writeProtocolSessionMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const [, payload] = (writeProtocolSessionMock as jest.Mock).mock.calls[0];
    expect(payload.userChosenNextStep).toBe('rest_later');
    expect(payload.outcome).toBe('not_shifted');
  });

  it('ctx absent: reflection goes straight to flow_complete (no response step rendered)', async () => {
    const { findByTestId, queryByTestId } = render(
      <BrowseRunFlow
        protocol={NSDR_20}
        {...TEST_PROPS}
        // checkInFlowContext intentionally omitted
        onComplete={jest.fn()}
      />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-reflection')).toBeTruthy();
    fireEvent.press(await findByTestId('checkin-flow-reflection-chip-calmer'));

    await waitFor(
      () => expect(writeProtocolSessionMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    // No response screen ever rendered — true-browse short-circuit.
    expect(queryByTestId('shifted-response')).toBeNull();
    expect(queryByTestId('not-shifted-response')).toBeNull();
    // Payload still has userChosenNextStep null (no choice captured).
    const [, payload] = (writeProtocolSessionMock as jest.Mock).mock.calls[0];
    expect(payload.userChosenNextStep).toBeNull();
  });
});

describe('BrowseRunFlow — onComplete timing parity with CheckInFlow', () => {
  it('does NOT fire onComplete before Promise.all resolves (1500ms floor + write)', async () => {
    jest.useFakeTimers();
    try {
      const onComplete = jest.fn();
      render(
        <BrowseRunFlow
          protocol={NSDR_20}
          {...TEST_PROPS}
          checkInFlowContext={FOGGY_10_CONTEXT}
          onComplete={onComplete}
        />
      );
      act(() => {
        lastOnExit!(summary({ completed: false, protocolId: 'nsdr-20' }));
      });

      // Even though writes resolve immediately (mocked), the 1500ms
      // setTimeout inside Promise.all gates onComplete. At t=500ms,
      // onComplete should not yet have fired.
      await act(async () => {
        jest.advanceTimersByTime(500);
      });
      expect(onComplete).not.toHaveBeenCalled();

      // Advance past the 1500ms floor.
      await act(async () => {
        jest.advanceTimersByTime(1200);
      });
      // Drain microtasks so the awaited Promise.all + onComplete fire.
      await act(async () => {
        await Promise.resolve();
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
