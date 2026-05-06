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
    writeBrainStateCheckInLegacyEffects: jest
      .fn()
      .mockResolvedValue(undefined),
  };
});

import { writeProtocolSession as writeProtocolSessionMock } from '../../../../services/firebase/protocolSession.service';
import { writeBrainStateCheckInLegacyEffects as writeLegacyMock } from '../../../../services/firebase/brainStateCheckIn.service';

beforeEach(() => {
  lastOnExit = null;
  (writeProtocolSessionMock as jest.Mock).mockClear();
  (writeLegacyMock as jest.Mock).mockClear();
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

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe('BrowseRunFlow — terminal write with CheckInFlowContext (Bug A v2 fix)', () => {
  it('flow_complete with context invokes BOTH writeProtocolSession AND writeBrainStateCheckInLegacyEffects', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
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

    // Drive: player completes → re-check renders → user picks state.
    act(() => {
      lastOnExit!(summary({ completed: true, protocolId: 'nsdr-20' }));
    });
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Steady'));

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

    // Legacy + first-shift helper fired exactly once with the right args.
    expect(writeLegacyMock).toHaveBeenCalledTimes(1);
    const legacyCall = (writeLegacyMock as jest.Mock).mock.calls[0];
    expect(legacyCall[0]).toBe(TEST_USER_ID);
    expect(legacyCall[1]).toBe('foggy'); // stateBefore from context
    expect(legacyCall[2]).toBe(true); // isFlowComplete
    expect(legacyCall[3]).toBe('shifted'); // outcome
    expect(legacyCall[4]).toEqual({ dryRun: true });
  });

  it('classifier branches: foggy→clear writes outcome="shifted" via legacy helper', async () => {
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
    fireEvent.press(getByLabelText('Clear'));
    await waitFor(
      () => expect(writeLegacyMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const [, , , outcome] = (writeLegacyMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('shifted');
  });

  it('classifier branches: wired→foggy writes outcome="partial_shift" via legacy helper', async () => {
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
    fireEvent.press(getByLabelText('Foggy'));
    await waitFor(
      () => expect(writeLegacyMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const [, stateBefore, , outcome] = (writeLegacyMock as jest.Mock).mock
      .calls[0];
    expect(stateBefore).toBe('wired');
    expect(outcome).toBe('partial_shift');
  });

  it('classifier branches: wired→wired writes outcome="not_shifted"', async () => {
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
    await waitFor(
      () => expect(writeLegacyMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const [, , , outcome] = (writeLegacyMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('not_shifted');
  });

  it('classifier branches: steady→steady writes outcome="maintenance"', async () => {
    const steadyCtx: CheckInFlowContext = {
      state: 'steady',
      timeWindow: 5,
      intentPath: 'default',
    };
    const { findByTestId, getByLabelText } = render(
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
    await waitFor(
      () => expect(writeLegacyMock).toHaveBeenCalled(),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );
    const [, , , outcome] = (writeLegacyMock as jest.Mock).mock.calls[0];
    expect(outcome).toBe('maintenance');
  });

  it('abandoned with context still invokes legacy helper, isFlowComplete=false, outcome="abandoned"', async () => {
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
    const [, stateBefore, isFlowComplete, outcome] = (
      writeLegacyMock as jest.Mock
    ).mock.calls[0];
    expect(stateBefore).toBe('foggy');
    expect(isFlowComplete).toBe(false);
    expect(outcome).toBe('abandoned');
  });
});

describe('BrowseRunFlow — terminal write WITHOUT context (true-browse legacy behavior)', () => {
  it('does NOT invoke writeBrainStateCheckInLegacyEffects when context is absent', async () => {
    const onComplete = jest.fn();
    const { findByTestId, getByLabelText } = render(
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
    expect(await findByTestId('checkin-flow-re-check')).toBeTruthy();
    fireEvent.press(getByLabelText('Clear'));

    await waitFor(
      () => expect(onComplete).toHaveBeenCalledTimes(1),
      { timeout: TERMINAL_ON_COMPLETE_TIMEOUT_MS }
    );

    // Authoritative write still fires.
    expect(writeProtocolSessionMock).toHaveBeenCalledTimes(1);
    const [, payload] = (writeProtocolSessionMock as jest.Mock).mock.calls[0];
    expect(payload.outcome).toBe('browse_launched');
    expect(payload.stateBefore).toBeNull();

    // Legacy helper NOT called (preserves isolated browse semantics).
    expect(writeLegacyMock).not.toHaveBeenCalled();
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
