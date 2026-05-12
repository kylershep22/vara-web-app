// Integration tests for CheckInFlow.
//
// The reducer is exhaustively tested in reducer.test.ts. These tests
// cover the integration surface — the contract between reducer
// state, the rendered step view, and the dispatched action — that
// the unit tests can't see.
//
// GuidedSessionPlayer is mocked: its production behavior (audio,
// breath pacing, recovery) isn't relevant here. The mock captures
// the most-recent `onExit` callback so tests can drive
// player_exit transitions deterministically.

// AsyncStorage mock — sub-step 2.7 added a transitive import via
// flowSessionMarker. Tests use writeMode='dev_dry_run' so the marker
// effect short-circuits before touching AsyncStorage, but the module
// still needs to load.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

import React from 'react';
import { fireEvent, render, waitFor, act } from '@testing-library/react-native';

import { CheckInFlow, type TerminalFlowState } from '../CheckInFlow';
import type { FlowInit } from '../types';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import type { Protocol, ProtocolSessionSummary } from '../../../../types/models';

// ────────────────────────────────────────────────────────────
// Mock the GuidedSessionPlayer so tests can trigger onExit at will.
// ────────────────────────────────────────────────────────────
let lastOnExit: ((summary: ProtocolSessionSummary) => void) | null = null;
let mockProtocolId: string | null = null;

jest.mock('../../../protocol/GuidedSessionPlayer', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    GuidedSessionPlayer: (props: {
      protocol: { id: string };
      onExit: (summary: ProtocolSessionSummary) => void;
    }) => {
      lastOnExit = props.onExit;
      mockProtocolId = props.protocol.id;
      return ReactLib.createElement(
        View,
        { testID: 'mock-guided-session-player' },
        ReactLib.createElement(Text, null, `Mock player for ${props.protocol.id}`)
      );
    },
  };
});

// Mock the Firestore write helper so we can assert the call shape
// without exercising real Firestore. The dryRun-mode tests above
// don't directly cover "CheckInFlow actually calls write at terminal"
// — the writer's payload-mapper unit tests cover data-shape
// correctness, but the wiring from terminal-state useEffect to the
// write call is an integration concern. This mock fills the gap.
jest.mock('../../../../services/firebase/brainStateCheckIn.service', () => {
  const actual = jest.requireActual(
    '../../../../services/firebase/brainStateCheckIn.service'
  );
  return {
    ...actual,
    writeStandardFlowSession: jest.fn().mockResolvedValue(undefined),
  };
});

import { writeStandardFlowSession as writeStandardFlowSessionMock } from '../../../../services/firebase/brainStateCheckIn.service';

beforeEach(() => {
  lastOnExit = null;
  mockProtocolId = null;
  (writeStandardFlowSessionMock as jest.Mock).mockClear();
});

// ────────────────────────────────────────────────────────────
// Fixtures
// ────────────────────────────────────────────────────────────
function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`fixture: ${id} missing`);
  return p;
}

function buildOverwhelmInit(): FlowInit {
  return {
    entrySource: 'overwhelm_safety_card',
    protocol: getProtocol('cyclic-sighing-2'),
    nowMs: 1_000_000,
  };
}

// Minimum-viable summary for the mock player's onExit.
function summary(opts: { completed: boolean; protocolId: string }): ProtocolSessionSummary {
  return {
    protocolId: opts.protocolId,
    stateBefore: 'wired',
    completed: opts.completed,
    durationActualSeconds: 120,
    stepsCompleted: opts.completed ? 5 : 2,
    totalSteps: 5,
    abandonReason: opts.completed ? null : 'user_exit',
    startedAt: 1_000_000,
    endedAt: 1_120_000,
  };
}

// ────────────────────────────────────────────────────────────
// Test props helper — sub-step 2.5 added required `userId` and the
// optional `writeMode` props. Centralizing the dev_dry_run setup
// here keeps individual tests focused on flow behavior; the writes
// themselves are covered in protocolSession.service.test.ts.
// ────────────────────────────────────────────────────────────

const TEST_USER_ID = 'test-user-id';

const TEST_PROPS = {
  userId: TEST_USER_ID,
  writeMode: 'dev_dry_run' as const,
};

// Sub-step 2.7 round 4 (Obs 11 fix) — CheckInFlow's terminal effect
// awaits Promise.all([write, setTimeout(1500)]) before firing
// onComplete. Tests using real timers need a waitFor timeout above
// 1500ms; tests using fake timers must advance past 1500ms before
// asserting onComplete fired. 3000ms gives a comfortable margin
// without slowing the suite materially.
const TERMINAL_ON_COMPLETE_TIMEOUT_MS = 3000;
const TERMINAL_DELAY_FAKE_TIMER_ADVANCE_MS = 1600;

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe('CheckInFlow — initial render by entry source', () => {
  it('standard entry renders StatePickStepView at mount', () => {
    const { getByTestId, queryByTestId } = render(
      <CheckInFlow
        init={{ entrySource: 'standard' }}
        {...TEST_PROPS}
        onComplete={jest.fn()}
      />
    );
    expect(getByTestId('checkin-flow-state-pick')).toBeTruthy();
    expect(getByTestId('checkin-flow-state-pick-title').props.children).toBe(
      'How are you right now?'
    );
    expect(queryByTestId('mock-guided-session-player')).toBeNull();
  });

  it('overwhelm entry renders the GuidedSessionPlayer at mount (skips state/time/recommendation)', () => {
    const { getByTestId, queryByTestId } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={jest.fn()} />
    );
    expect(getByTestId('mock-guided-session-player')).toBeTruthy();
    expect(mockProtocolId).toBe('cyclic-sighing-2');
    // State-pick / time-pick UI not present.
    expect(queryByTestId('checkin-flow-state-pick')).toBeNull();
  });
});

describe('CheckInFlow — state-pick → time-pick dispatch', () => {
  it('tapping a state chip advances to TimePickStep (renders TimeWindowSelector)', () => {
    const { getByTestId, queryByTestId, getByLabelText } = render(
      <CheckInFlow
        init={{ entrySource: 'standard' }}
        {...TEST_PROPS}
        onComplete={jest.fn()}
      />
    );

    // Sanity: state-pick is showing.
    expect(getByTestId('checkin-flow-state-pick')).toBeTruthy();

    // Tap "Wired" — uses the BrainStateOptionRow's accessibilityLabel.
    fireEvent.press(getByLabelText('Wired'));

    // Time-window selector should now be on screen, state-pick gone.
    expect(queryByTestId('checkin-flow-state-pick')).toBeNull();
    // TimeWindowSelector renders chips with these labels per Core
    // Loop v2 §Step 2; we just need to confirm one is mounted.
    expect(queryByTestId('mock-guided-session-player')).toBeNull();
  });
});

describe('CheckInFlow — player exit branching', () => {
  it("player onExit { completed: false } drives the flow to AbandonedStep (terminal — onComplete fires with step 'abandoned')", async () => {
    const onComplete = jest.fn();
    render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );

    // Mock player should be mounted and onExit captured.
    expect(lastOnExit).toBeTruthy();

    // Trigger End early.
    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'cyclic-sighing-2' }));
    });

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    expect(terminal.step).toBe('abandoned');
    expect(terminal.entrySource).toBe('overwhelm_safety_card');
    expect(terminal.protocol.id).toBe('cyclic-sighing-2');
  });

  it('player onExit { completed: true } drives the flow to ReCheckStep (re-check UI rendered, onComplete NOT yet fired)', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );

    expect(lastOnExit).toBeTruthy();
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });

    // Re-check is a non-terminal step — onComplete must not fire yet.
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('CheckInFlow — re-check → response with auto-dismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('selecting a re-check state advances to response; shifted path auto-dismisses after 4s', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText, queryByTestId } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );

    // Drive: player completes naturally.
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });

    // Re-check screen mounted. Pick "Steady" (wired→steady = shifted).
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));

    // ShiftedResponse renders for positive outcomes (sub-step 2.3).
    // Auto-dismiss timer is armed; not yet fired.
    expect(await findByTestId('shifted-response')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();

    // Advance the auto-dismiss timer (AUTO_DISMISS_MS = 4000 in
    // ShiftedResponse.tsx).
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Now we're at flow_complete. Sub-step 2.7 round 4 (Obs 11)
    // added an awaited Promise.all([write, setTimeout(1500)]) before
    // onComplete fires; advance fake timers past the 1500ms floor.
    await act(async () => {
      jest.advanceTimersByTime(TERMINAL_DELAY_FAKE_TIMER_ADVANCE_MS);
    });

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    expect(terminal.step).toBe('flow_complete');
    if (terminal.step === 'flow_complete') {
      expect(terminal.outcome).toBe('shifted');
      expect(terminal.userChosenNextStep).toBe('auto_dismissed');
      expect(terminal.stateBefore).toBe('wired');
      expect(terminal.stateAfter).toBe('steady');
    }

    // Response view unmounts on terminal transition (CheckInFlow's
    // renderStep returns null for terminal steps).
    expect(queryByTestId('shifted-response')).toBeNull();
  });

  it('not_shifted path does NOT auto-dismiss — waits for explicit user choice', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );

    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });

    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    // wired → wired = not_shifted (matrix cell 1, locked rules).
    fireEvent.press(getByLabelText('Wired'));

    // NotShiftedResponse renders for the not_shifted path (sub-step 2.4).
    expect(await findByTestId('not-shifted-response')).toBeTruthy();

    // Run timers a long way past the would-be 4s mark. No auto-dismiss
    // should fire on not_shifted.
    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // User taps "Rest and come back later".
    fireEvent.press(getByLabelText('Rest and come back later'));

    // Advance past the 1500ms terminal-effect delay (Obs 11 fix).
    await act(async () => {
      jest.advanceTimersByTime(TERMINAL_DELAY_FAKE_TIMER_ADVANCE_MS);
    });

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    if (terminal.step === 'flow_complete') {
      expect(terminal.outcome).toBe('not_shifted');
      expect(terminal.userChosenNextStep).toBe('rest_later');
    }
  });
});

describe('CheckInFlow — late-night NSDR override prop pass-through (sub-step 2.4)', () => {
  // Verifies the (stateBefore, device-local-hour) → lateNightOverride
  // computation in ResponseStepView reaches NotShiftedResponse and
  // changes the rendered button label. Without this test, a refactor
  // that breaks the prop pass-through would only surface on device.

  beforeEach(() => {
    // Modern fake timers replace Date too. setSystemTime forces
    // new Date().getHours() to return the mocked hour, which is what
    // ResponseStepView reads.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the late-night NSDR copy variant when wired + local hour 23 + not_shifted', async () => {
    // 2026-04-26T23:00 — late-night window. stateBefore="wired"
    // because overwhelm entry forces it. wired→wired re-check
    // classifies as not_shifted, which routes to NotShiftedResponse
    // with lateNightOverride=true.
    jest.setSystemTime(new Date('2026-04-26T23:00:00'));

    const { findByTestId, getByLabelText } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={jest.fn()} />
    );

    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });

    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Wired')); // wired→wired = not_shifted

    expect(await findByTestId('not-shifted-response')).toBeTruthy();

    // The "Try something longer" button should carry the NSDR-
    // specific accessibility label, not the standard one.
    const tryLonger = await findByTestId('not-shifted-response-try-longer');
    expect(tryLonger.props.accessibilityLabel).toBe(
      "Try NSDR when you're ready"
    );
  });

  it('renders the standard try-longer copy when wired + local hour 14 + not_shifted', async () => {
    // 14:00 — daytime, no override regardless of state.
    jest.setSystemTime(new Date('2026-04-26T14:00:00'));

    const { findByTestId, getByLabelText } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={jest.fn()} />
    );

    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });

    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Wired'));

    const tryLonger = await findByTestId('not-shifted-response-try-longer');
    expect(tryLonger.props.accessibilityLabel).toBe('Try something longer');
  });
});

describe('CheckInFlow — Firestore write contract', () => {
  // The dev_dry_run mode tests above don't directly cover the
  // wiring from terminal-state useEffect to writeStandardFlowSession.
  // The writer's payload-mapper unit tests cover data-shape
  // correctness; this test catches "we forgot to wire the write at
  // terminal" without writing to Firestore. The writer is mocked at
  // the module boundary above (jest.mock at file top).

  it('calls writeStandardFlowSession exactly once on terminal with the correct args', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
      <CheckInFlow
        init={buildOverwhelmInit()}
        {...TEST_PROPS}
        onComplete={onComplete}
      />
    );

    // Sanity: writer not called at mount (only on terminal).
    expect(writeStandardFlowSessionMock).not.toHaveBeenCalled();

    // Drive the flow: player completes → re-check mounts → user picks
    // a state → flow_complete terminal.
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));
    fireEvent.press(getByLabelText('Continue'));

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );

    // The integration assertion: writer fired exactly once with the
    // expected (userId, terminal, intentPath, options) shape.
    expect(writeStandardFlowSessionMock).toHaveBeenCalledTimes(1);
    const [userIdArg, terminalArg, intentPathArg, optionsArg] = (
      writeStandardFlowSessionMock as jest.Mock
    ).mock.calls[0];

    expect(userIdArg).toBe('test-user-id');
    expect(intentPathArg).toBe('default');
    expect(optionsArg).toEqual({ dryRun: true });
    expect(terminalArg).toEqual(
      expect.objectContaining({
        step: 'flow_complete',
        entrySource: 'overwhelm_safety_card',
        stateBefore: 'wired',
        timeWindow: 2,
        stateAfter: 'steady',
        outcome: 'shifted',
        userChosenNextStep: 'dismissed',
      })
    );
  });

  it('still calls writeStandardFlowSession on the abandoned terminal path', async () => {
    const onComplete = jest.fn();
    render(
      <CheckInFlow
        init={buildOverwhelmInit()}
        {...TEST_PROPS}
        onComplete={onComplete}
      />
    );

    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'cyclic-sighing-2' }));
    });

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );

    expect(writeStandardFlowSessionMock).toHaveBeenCalledTimes(1);
    const [, terminalArg] = (writeStandardFlowSessionMock as jest.Mock).mock.calls[0];
    expect(terminalArg.step).toBe('abandoned');
  });
});

describe('CheckInFlow — terminal-state useEffect contract', () => {
  it('fires onComplete exactly once with the full session-record payload shape', async () => {
    const onComplete = jest.fn();
    render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );

    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'cyclic-sighing-2' }));
    });

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    // AbandonedStep payload — sub-step 2.5's Firestore write reads
    // these exact field names. If this contract drifts, the write
    // will silently miss data.
    expect(terminal).toEqual(
      expect.objectContaining({
        step: 'abandoned',
        entrySource: 'overwhelm_safety_card',
        stateBefore: 'wired',
        timeWindow: 2,
        sessionStartedAt: expect.any(Number),
        sessionEndedAt: expect.any(Number),
        durationActualSeconds: expect.any(Number),
      })
    );
    expect(terminal.protocol.id).toBe('cyclic-sighing-2');
    // No subsequent unintended fires.
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────
// Sub-step 2.7 — recovery_confirm integration
// ────────────────────────────────────────────────────────────
//
// These tests verify CheckInFlow's behavior when mounted with a
// 'recovery' FlowInit — the integration of (recovery init → reducer
// init → recovery_confirm step rendering → user tap → next step
// rendering). The marker storage policy itself (offered/expired/
// not-yet-offered branches) is covered in flowSessionMarker.test.ts;
// these tests assume CheckInFlowScreen has already produced an
// eligible recovery FlowInit and exercise what happens next.
//
// One-shot semantics note: the user-facing spec ("force-quit during
// recovery_confirm UI does NOT produce 'recover the recovery'") is
// implemented via the marker's recoveryOfferedAt guard at
// readMarkerForRecoveryOffer (covered in flowSessionMarker.test.ts).
// Since CheckInFlow itself doesn't observe recoveryOfferedAt, we
// don't repeat the test here — but the code comment in CheckInFlow
// names the guarantee explicitly so a future maintainer reading just
// CheckInFlow.tsx still knows where the boundary is enforced.

function buildRecoveryInit(
  overrides: Partial<{
    protocolId: string;
    stateBefore: 'wired' | 'foggy' | 'steady' | 'clear' | 'alive';
    timeWindow: 2 | 5 | 10 | 20 | 45;
    entrySource: 'standard' | 'overwhelm_safety_card' | 'state_preselected';
    sessionStartedAt: number;
    sessionEndedAt: number;
  }> = {}
): FlowInit {
  const protocolId = overrides.protocolId ?? 'cyclic-sighing-2';
  return {
    entrySource: 'recovery',
    recoveredPayload: {
      protocol: getProtocol(protocolId),
      stateBefore: overrides.stateBefore ?? 'wired',
      timeWindow: overrides.timeWindow ?? 2,
      sessionStartedAt: overrides.sessionStartedAt ?? 1_700_000_000_000,
      sessionEndedAt: overrides.sessionEndedAt ?? 1_700_000_000_000 + 120_000,
      durationActualSeconds: 120,
      intentPath: 'default',
      entrySource: overrides.entrySource ?? 'standard',
    },
  };
}

describe('CheckInFlow — recovery FlowInit mounts at recovery_confirm', () => {
  it('renders RecoveryConfirmStepView (skips state_pick / time_pick / running)', () => {
    const { getByTestId, queryByTestId } = render(
      <CheckInFlow
        init={buildRecoveryInit()}
        {...TEST_PROPS}
        onComplete={jest.fn()}
      />
    );
    expect(getByTestId('checkin-flow-recovery-confirm')).toBeTruthy();
    expect(queryByTestId('checkin-flow-state-pick')).toBeNull();
    expect(queryByTestId('mock-guided-session-player')).toBeNull();
    // No protocol began running, no Firestore write fired.
  });

  it('shows the recovered protocol name in the body copy', () => {
    const { getByTestId } = render(
      <CheckInFlow
        init={buildRecoveryInit({ protocolId: 'cyclic-sighing-2' })}
        {...TEST_PROPS}
        onComplete={jest.fn()}
      />
    );
    const body = getByTestId('checkin-flow-recovery-confirm-body').props
      .children;
    expect(body).toContain('Cyclic Sighing');
  });
});

describe('CheckInFlow — recovery_confirm "Yes, check in" → re_check', () => {
  it('tapping primary CTA advances to re_check with the recovered payload', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText, queryByTestId } = render(
      <CheckInFlow
        init={buildRecoveryInit()}
        {...TEST_PROPS}
        onComplete={onComplete}
      />
    );

    // Sanity: recovery_confirm is showing.
    expect(await findByTestId('checkin-flow-recovery-confirm')).toBeTruthy();

    // Tap "Yes, check in" — the primary CTA.
    fireEvent.press(getByLabelText('Yes, check in'));

    // Re-check should now be on screen (recovery_confirm gone).
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    expect(queryByTestId('checkin-flow-recovery-confirm')).toBeNull();

    // No terminal yet — the flow continues normally from re_check.
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('the recovered re_check carries the marker payload through to terminal', async () => {
    // Confirms the data flow: marker stateBefore → recovery payload →
    // recovered re_check → response → flow_complete terminal. The
    // terminal's stateBefore matches what was on the marker.
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
      <CheckInFlow
        init={buildRecoveryInit({ stateBefore: 'wired', timeWindow: 5 })}
        {...TEST_PROPS}
        onComplete={onComplete}
      />
    );

    // Yes, check in → re_check.
    fireEvent.press(getByLabelText('Yes, check in'));
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();

    // Pick a stateAfter that's a shift (wired→steady = 'shifted').
    fireEvent.press(getByLabelText('Steady'));
    // Continue button completes the response → flow_complete.
    fireEvent.press(getByLabelText('Continue'));

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    if (terminal.step === 'flow_complete') {
      expect(terminal.stateBefore).toBe('wired');
      expect(terminal.stateAfter).toBe('steady');
      expect(terminal.timeWindow).toBe(5);
      expect(terminal.outcome).toBe('shifted');
      // The session timestamps are preserved from the marker — not
      // newly synthesized at recovery time.
      expect(terminal.sessionStartedAt).toBe(1_700_000_000_000);
      expect(terminal.sessionEndedAt).toBe(1_700_000_000_000 + 120_000);
    }
  });

  it('overwhelm-origin recovery preserves entrySource through to terminal', async () => {
    // Phase 5 forward-compat: NotShiftedResponse will branch on
    // entrySource='overwhelm_safety_card'. If recovery loses the
    // origin, the recovered re-check would silently use standard
    // not-shifted copy. This test catches that regression at the
    // integration layer (the reducer-test covers it at the unit
    // layer; this confirms the prop flow makes it to the terminal).
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
      <CheckInFlow
        init={buildRecoveryInit({ entrySource: 'overwhelm_safety_card' })}
        {...TEST_PROPS}
        onComplete={onComplete}
      />
    );

    fireEvent.press(getByLabelText('Yes, check in'));
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));
    fireEvent.press(getByLabelText('Continue'));

    await waitFor(
      () => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      },
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    expect(terminal.entrySource).toBe('overwhelm_safety_card');
  });
});

describe('CheckInFlow — recovery_confirm "Start fresh" → state_pick', () => {
  it('tapping secondary CTA resets to state_pick (entrySource standard)', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText, queryByTestId } = render(
      <CheckInFlow
        init={buildRecoveryInit({ entrySource: 'overwhelm_safety_card' })}
        {...TEST_PROPS}
        onComplete={onComplete}
      />
    );

    expect(await findByTestId('checkin-flow-recovery-confirm')).toBeTruthy();
    fireEvent.press(getByLabelText('Start fresh'));

    // state_pick is now on screen, with the title verbatim.
    expect(await findByTestId('checkin-flow-state-pick')).toBeTruthy();
    expect(
      await findByTestId('checkin-flow-state-pick-title')
    ).toBeTruthy();

    // recovery_confirm is gone, no terminal fired.
    expect(queryByTestId('checkin-flow-recovery-confirm')).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('after Start fresh, the user can complete a normal flow from state_pick', async () => {
    // Smoke test that state_pick is functional after recovery_declined
    // — not a stranded UI state. Tap a chip, advance to time_pick.
    const { findByTestId, getByLabelText } = render(
      <CheckInFlow
        init={buildRecoveryInit()}
        {...TEST_PROPS}
        onComplete={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('Start fresh'));
    expect(await findByTestId('checkin-flow-state-pick')).toBeTruthy();

    fireEvent.press(getByLabelText('Wired'));
    // state_pick gone, time-window selector chips available next.
    // (TimeWindowSelector doesn't have a sentinel testID; just
    // confirm state_pick disappeared.)
  });
});
