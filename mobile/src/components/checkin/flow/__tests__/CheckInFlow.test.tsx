// Integration tests for the engine-wired CheckInFlow.
//
// The reducer is exhaustively unit-tested in reducer.test.ts. These tests cover
// the integration surface — the contract between reducer state, the rendered
// step view, and the dispatched action.
//
// GuidedSessionPlayer is mocked; the mock captures the most-recent onExit so
// tests can drive player_exit transitions deterministically.

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

const TEST_PROPS = {
  userId: 'test-user-id',
  writeMode: 'dev_dry_run' as const,
};

const TERMINAL_ON_COMPLETE_TIMEOUT_MS = 3000;

describe('CheckInFlow — initial render by entry source', () => {
  it('standard entry renders the situation picker at mount', () => {
    const { getByTestId, queryByTestId } = render(
      <CheckInFlow init={{ entrySource: 'standard' }} {...TEST_PROPS} onComplete={jest.fn()} />
    );
    expect(getByTestId('checkin-flow-situation-pick')).toBeTruthy();
    expect(getByTestId('checkin-flow-situation-pick-title').props.children).toBe(
      'What do you need right now?'
    );
    expect(queryByTestId('mock-guided-session-player')).toBeNull();
  });

  it('overwhelm entry renders the GuidedSessionPlayer at mount (skips situation/state/time/plan)', () => {
    const { getByTestId, queryByTestId } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={jest.fn()} />
    );
    expect(getByTestId('mock-guided-session-player')).toBeTruthy();
    expect(mockProtocolId).toBe('cyclic-sighing-2');
    expect(queryByTestId('checkin-flow-situation-pick')).toBeNull();
  });
});

describe('CheckInFlow — situation → circumplex → time dispatch', () => {
  it('walks situation → two-tap state → time window', () => {
    const { getByTestId, getByLabelText, queryByTestId } = render(
      <CheckInFlow init={{ entrySource: 'standard' }} {...TEST_PROPS} onComplete={jest.fn()} />
    );

    // Situation tile.
    fireEvent.press(getByLabelText('Quiet a busy mind'));
    expect(getByTestId('checkin-flow-arousal-title')).toBeTruthy();

    // Energy tap reveals the feeling question on the same screen (no swap).
    fireEvent.press(getByLabelText('On the higher side'));
    expect(getByTestId('checkin-flow-valence-title')).toBeTruthy();

    // Feeling tap (quiet_mind hard pole = "Too much") → time window.
    fireEvent.press(getByLabelText('Too much'));
    expect(getByTestId('time-window-selector')).toBeTruthy();
    expect(queryByTestId('checkin-flow-state-pick')).toBeNull();
  });

  it('plan screen shows the reason, and Begin launches the practice player (not habits)', () => {
    const { getByTestId, getByLabelText, queryByTestId } = render(
      <CheckInFlow init={{ entrySource: 'standard' }} {...TEST_PROPS} onComplete={jest.fn()} />
    );

    // Drive to the plan: quiet_mind / Tense → a single settle practice.
    fireEvent.press(getByLabelText('Quiet a busy mind'));
    fireEvent.press(getByLabelText('On the higher side'));
    fireEvent.press(getByLabelText('Too much'));
    fireEvent.press(getByTestId('time-window-chip-5'));

    // The plan renders with the felt reason subhead + a single Begin.
    expect(getByTestId('checkin-flow-plan')).toBeTruthy();
    expect(getByTestId('checkin-flow-plan-reason')).toBeTruthy();
    const begin = getByTestId('checkin-flow-plan-primary');
    expect(begin.props.accessibilityLabel).toBe('Begin');

    // Begin launches the real practice player in-flow — not a route to habits.
    fireEvent.press(begin);
    expect(getByTestId('mock-guided-session-player')).toBeTruthy();
    expect(queryByTestId('checkin-flow-plan')).toBeNull();
  });
});

describe('CheckInFlow — player exit branching (overwhelm entry)', () => {
  it('player onExit { completed: false } drives to the abandoned terminal', async () => {
    const onComplete = jest.fn();
    render(<CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />);
    expect(lastOnExit).toBeTruthy();

    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'cyclic-sighing-2' }));
    });

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), {
      timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS,
    });
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    expect(terminal.step).toBe('abandoned');
    if (terminal.step === 'abandoned') {
      expect(terminal.protocol.id).toBe('cyclic-sighing-2');
    }
  });

  it('player onExit { completed: true } renders the reflection step (no terminal yet)', async () => {
    const onComplete = jest.fn();
    const { findByTestId } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });
    expect(await findByTestId('checkin-flow-reflection')).toBeTruthy();
    // Energy/settle reflection set.
    expect(await findByTestId('checkin-flow-reflection-chip-calmer')).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('CheckInFlow — reflection → terminal + write contract', () => {
  it('selecting a reflection chip completes the flow and writes the session once', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
      <CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />
    );

    expect(writeStandardFlowSessionMock).not.toHaveBeenCalled();

    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'cyclic-sighing-2' }));
    });
    expect(await findByTestId('checkin-flow-reflection')).toBeTruthy();
    fireEvent.press(getByLabelText('Calmer'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), {
      timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS,
    });

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
        situation: 'just_reset',
        quadrant: 'Tense',
        completion: expect.objectContaining({
          kind: 'practice',
          reflection: 'calmer',
        }),
      })
    );
  });

  it('still writes on the abandoned terminal path', async () => {
    const onComplete = jest.fn();
    render(<CheckInFlow init={buildOverwhelmInit()} {...TEST_PROPS} onComplete={onComplete} />);
    act(() => {
      lastOnExit!(summary({ completed: false, protocolId: 'cyclic-sighing-2' }));
    });
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), {
      timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS,
    });
    expect(writeStandardFlowSessionMock).toHaveBeenCalledTimes(1);
    const [, terminalArg] = (writeStandardFlowSessionMock as jest.Mock).mock.calls[0];
    expect(terminalArg.step).toBe('abandoned');
  });
});

// ────────────────────────────────────────────────────────────
// Recovery FlowInit integration
// ────────────────────────────────────────────────────────────
function buildRecoveryInit(
  overrides: Partial<{
    protocolId: string;
    stateBefore: 'wired' | 'foggy' | 'steady' | 'clear' | 'alive';
    timeWindow: 2 | 5 | 10 | 20 | 45;
    entrySource: 'standard' | 'overwhelm_safety_card' | 'state_preselected';
  }> = {}
): FlowInit {
  const protocolId = overrides.protocolId ?? 'cyclic-sighing-2';
  return {
    entrySource: 'recovery',
    recoveredPayload: {
      protocol: getProtocol(protocolId),
      stateBefore: overrides.stateBefore ?? 'wired',
      timeWindow: overrides.timeWindow ?? 2,
      sessionStartedAt: 1_700_000_000_000,
      sessionEndedAt: 1_700_000_000_000 + 120_000,
      durationActualSeconds: 120,
      intentPath: 'default',
      entrySource: overrides.entrySource ?? 'standard',
    },
  };
}

describe('CheckInFlow — recovery FlowInit', () => {
  it('mounts at recovery_confirm (skips situation/state/time/running)', () => {
    const { getByTestId, queryByTestId } = render(
      <CheckInFlow init={buildRecoveryInit()} {...TEST_PROPS} onComplete={jest.fn()} />
    );
    expect(getByTestId('checkin-flow-recovery-confirm')).toBeTruthy();
    expect(queryByTestId('checkin-flow-situation-pick')).toBeNull();
    expect(queryByTestId('mock-guided-session-player')).toBeNull();
  });

  it('"Yes, check in" resumes at the reflection step', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText, queryByTestId } = render(
      <CheckInFlow init={buildRecoveryInit()} {...TEST_PROPS} onComplete={onComplete} />
    );
    expect(await findByTestId('checkin-flow-recovery-confirm')).toBeTruthy();
    fireEvent.press(getByLabelText('Yes, check in'));
    expect(await findByTestId('checkin-flow-reflection')).toBeTruthy();
    expect(queryByTestId('checkin-flow-recovery-confirm')).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('the recovered reflection completes carrying the marker timestamps', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
      <CheckInFlow init={buildRecoveryInit({ timeWindow: 5 })} {...TEST_PROPS} onComplete={onComplete} />
    );
    fireEvent.press(getByLabelText('Yes, check in'));
    expect(await findByTestId('checkin-flow-reflection')).toBeTruthy();
    fireEvent.press(getByLabelText('Calmer'));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1), {
      timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS,
    });
    const terminal: TerminalFlowState = onComplete.mock.calls[0][0];
    if (terminal.step === 'flow_complete' && terminal.completion.kind === 'practice') {
      expect(terminal.timeWindow).toBe(5);
      expect(terminal.completion.sessionStartedAt).toBe(1_700_000_000_000);
      expect(terminal.completion.sessionEndedAt).toBe(1_700_000_000_000 + 120_000);
    } else {
      throw new Error('expected practice completion');
    }
  });

  it('"Start fresh" resets to the situation picker', async () => {
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
    expect(await findByTestId('checkin-flow-situation-pick')).toBeTruthy();
    expect(queryByTestId('checkin-flow-recovery-confirm')).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
