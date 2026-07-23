// Tests for CheckInFlowScreen's terminal-state navigation routing in the
// engine-wired flow. Routing is now driven by the FlowCompletion:
//   - pointer hand-off (focus-session) → replace('FocusTimer')
//   - pointer hand-off (plan)          → navigate('Main', { screen: NAV_TARGETS.plan,
//                                                           params: { tab: 'routines' } })
//   - practice with no pointer / acknowledged / abandoned → goBack()
//
// CheckInFlow is mocked at the module boundary so tests can drive the parent's
// onComplete callback synchronously.

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockRouteParams: { params: { entrySource: 'standard' } } = {
  params: { entrySource: 'standard' },
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
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

let lastOnComplete: ((terminal: Record<string, unknown>) => void) | null = null;

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
import { NAV_TARGETS } from '../../../navigation/navTargets';

beforeEach(() => {
  mockNavigate.mockClear();
  mockReplace.mockClear();
  mockGoBack.mockClear();
  mockSetOptions.mockClear();
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user-id' } });
  lastOnComplete = null;
  mockRouteParams.params = { entrySource: 'standard' };
});

const CTX = {
  entrySource: 'standard' as const,
  situation: 'get_through_hard',
  arousal: 'revved',
  valence: 'good',
  quadrant: 'Activated',
  timeWindow: 5,
  plan: { situation: 'get_through_hard', quadrant: 'Activated', slots: [] },
};

function pointerOnly(type: 'focus-session' | 'plan') {
  return {
    step: 'flow_complete',
    ...CTX,
    completion: {
      kind: 'pointer_only',
      pointerLaunched: { pillar: type === 'focus-session' ? 'focus' : 'time', type },
    },
  };
}

function practice(pointerLaunched: null | { pillar: string; type: string }) {
  return {
    step: 'flow_complete',
    ...CTX,
    completion: {
      kind: 'practice',
      protocol: { id: 'cyclic-sighing-2' },
      pillar: 'energy',
      direction: 'settle',
      reflection: 'calmer',
      sessionStartedAt: 1_000_000,
      sessionEndedAt: 1_120_000,
      durationActualSeconds: 120,
      pointerLaunched,
    },
  };
}

const acknowledged = { step: 'flow_complete', ...CTX, completion: { kind: 'acknowledged' } };

const abandoned = {
  step: 'abandoned',
  ...CTX,
  protocol: { id: 'cyclic-sighing-2' },
  pillar: 'energy',
  direction: 'settle',
  sessionStartedAt: 1_000_000,
  sessionEndedAt: 1_060_000,
  durationActualSeconds: 60,
};

async function complete(terminal: Record<string, unknown>) {
  const { findByTestId } = render(<CheckInFlowScreen />);
  await findByTestId('mock-checkin-flow');
  expect(lastOnComplete).not.toBeNull();
  lastOnComplete!(terminal);
}

describe('CheckInFlowScreen — pointer hand-off navigation', () => {
  it('focus-session pointer replaces with FocusTimer (removes the dead check-in frame)', async () => {
    await complete(pointerOnly('focus-session'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('FocusTimer', { fromCheckIn: true })
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('plan pointer navigates to the planning tab (routines), flag-aware', async () => {
    // NAV_TARGETS.plan resolves to 'Rhythms' (legacy IA) or 'PillarTime'
    // (four-pillar IA), so this assertion holds under either FOUR_PILLAR_IA.
    await complete(pointerOnly('plan'));
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('Main', {
        screen: NAV_TARGETS.plan,
        params: { tab: 'routines' },
      })
    );
  });

  it('plan pointer names the Routines sub-tab explicitly (never PlanScreen\'s habits default)', async () => {
    // The pointer's promise is "we'll take you to your routines". PlanScreen
    // defaults activeTab to 'habits' when no `tab` param arrives, so omitting
    // the nested params silently lands the user on Habits. Pin the param.
    await complete(pointerOnly('plan'));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledTimes(1));

    const [, options] = mockNavigate.mock.calls[0] as [
      string,
      { screen: string; params?: { tab?: string } },
    ];
    expect(options.params).toEqual({ tab: 'routines' });
    expect(options.params?.tab).not.toBe('habits');
  });

  it('practice that launched a pointer hands off to FocusTimer', async () => {
    await complete(practice({ pillar: 'focus', type: 'focus-session' }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('FocusTimer', { fromCheckIn: true })
    );
  });
});

describe('CheckInFlowScreen — non-pointer terminals return to the launching surface', () => {
  it('practice with no pointer goes back', async () => {
    await complete(practice(null));
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('acknowledged (zero-slot / declined offer) goes back', async () => {
    await complete(acknowledged);
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });

  it('abandoned goes back', async () => {
    await complete(abandoned);
    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });
});
