// Tests for CheckInFlowScreen's terminal-state navigation routing —
// specifically the round-10 (Finding 3) change where the
// `try_longer` case omits `timeWindow` from the Practices route
// params so the destination shows all eligible protocols rather
// than re-applying the original budget filter.
//
// CheckInFlow is mocked at the module boundary so tests can drive
// the parent's onComplete callback synchronously without bringing
// the full reducer / player tree into the test.

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockRouteParams: { params: { entrySource: 'standard' } } = {
  params: { entrySource: 'standard' },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
  useRoute: () => mockRouteParams,
}));

const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../utils/flowSessionMarker', () => ({
  readMarkerForRecoveryOffer: jest.fn().mockResolvedValue(null),
  clearMarker: jest.fn().mockResolvedValue(undefined),
}));

// Replace the late-night NSDR override with a deterministic stub so
// tests don't depend on the device's local hour. Default: no override
// (the no_override_practices_index branch fires).
const mockGetLateNightNSDRSwap = jest.fn();
jest.mock('../../../services/lateNightNSDRSwap', () => ({
  getLateNightNSDRSwap: (...args: unknown[]) => mockGetLateNightNSDRSwap(...args),
}));

// Capture the `onComplete` handler so tests can invoke it directly
// with a synthetic terminal payload, bypassing the real flow.
let lastOnComplete:
  | ((terminal: Record<string, unknown>) => void)
  | null = null;

jest.mock('../../../components/checkin/flow/CheckInFlow', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    CheckInFlow: (props: {
      onComplete: (terminal: Record<string, unknown>) => void;
    }) => {
      lastOnComplete = props.onComplete;
      return ReactLib.createElement(View, { testID: 'mock-checkin-flow' });
    },
  };
});

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { CheckInFlowScreen } from '../CheckInFlowScreen';

beforeEach(() => {
  mockNavigate.mockClear();
  mockGoBack.mockClear();
  mockSetOptions.mockClear();
  mockGetLateNightNSDRSwap.mockReset();
  mockGetLateNightNSDRSwap.mockReturnValue(null);
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user-id' } });
  lastOnComplete = null;
  mockRouteParams.params = { entrySource: 'standard' };
});

function tryLongerTerminal(opts: {
  stateBefore: 'wired' | 'foggy' | 'steady' | 'clear' | 'alive';
  timeWindow: 2 | 5 | 10 | 20 | 45;
}) {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    stateBefore: opts.stateBefore,
    timeWindow: opts.timeWindow,
    protocol: { id: 'cyclic-sighing-2' },
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
    stateAfter: opts.stateBefore, // same-state → not_shifted (in negative zone)
    outcome: 'not_shifted',
    userChosenNextStep: 'try_longer',
  };
}

describe('CheckInFlowScreen — try_longer nav routing (Finding 3)', () => {
  it('navigates to Practices WITHOUT timeWindow when no late-night override', async () => {
    mockGetLateNightNSDRSwap.mockReturnValue(null);
    const { findByTestId } = render(<CheckInFlowScreen />);
    await findByTestId('mock-checkin-flow');
    expect(lastOnComplete).not.toBeNull();

    lastOnComplete!(tryLongerTerminal({ stateBefore: 'wired', timeWindow: 2 }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith(
      'Practices',
      expect.objectContaining({
        state: 'wired',
        fromCheckInFlow: true,
        intentPath: 'default',
      })
    );

    // Round 10 contract: timeWindow MUST NOT be in the params.
    const navCall = mockNavigate.mock.calls[0];
    const navParams = navCall[1] as Record<string, unknown>;
    expect(navParams.timeWindow).toBeUndefined();
    expect('timeWindow' in navParams).toBe(false);
  });

  it('regression guard — try_longer params shape stays minimal', async () => {
    const { findByTestId } = render(<CheckInFlowScreen />);
    await findByTestId('mock-checkin-flow');

    lastOnComplete!(tryLongerTerminal({ stateBefore: 'foggy', timeWindow: 10 }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    const navParams = mockNavigate.mock.calls[0][1] as Record<string, unknown>;
    // Exactly three keys: state, fromCheckInFlow, intentPath. Anyone
    // adding a key here should re-evaluate whether it propagates the
    // original budget by accident (e.g. timeWindow).
    expect(Object.keys(navParams).sort()).toEqual([
      'fromCheckInFlow',
      'intentPath',
      'state',
    ]);
  });

  it('late-night NSDR override path bypasses Practices entirely (PracticeRun nav)', async () => {
    // When the override fires, navigation goes to PracticeRun with
    // the override protocol, NOT to Practices. The timeWindow-omission
    // contract only applies to the no_override_practices_index branch.
    mockGetLateNightNSDRSwap.mockReturnValue({ protocolId: 'nsdr-20' });
    const { findByTestId } = render(<CheckInFlowScreen />);
    await findByTestId('mock-checkin-flow');

    lastOnComplete!(tryLongerTerminal({ stateBefore: 'wired', timeWindow: 2 }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledWith(
      'PracticeRun',
      expect.objectContaining({
        protocolId: 'nsdr-20',
        stateBefore: 'wired',
      })
    );
  });
});
