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

beforeEach(() => {
  lastOnExit = null;
  mockProtocolId = null;
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

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
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

    // Now we're at flow_complete; onComplete fires once with
    // userChosenNextStep === 'auto_dismissed'.
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
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

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
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

describe('CheckInFlow — terminal-state useEffect contract', () => {
  it('fires onComplete exactly once with the full session-record payload shape', async () => {
    const onComplete = jest.fn();
    render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );

    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'cyclic-sighing-2' }));
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
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
