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

  it('plan pointer replaces with the planning surface (routines)', async () => {
    // IA restructure step 2: the planning surface stopped being a TAB and became
    // a pushed AppStack screen, so this branch names it directly instead of
    // navigating to Main with a nested `screen`. The nested form addressed a
    // child of Main, and Main no longer has this child — an unhandled nested
    // navigate is a silent no-op, which would have left the user parked on the
    // last screen of a finished check-in.
    //
    // replace, not navigate, and for the same reason as the focus-session branch
    // above: it drops the spent CheckInFlow frame so back lands on the launching
    // surface rather than a blank check-in.
    await complete(pointerOnly('plan'));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(NAV_TARGETS.plan, { tab: 'routines' })
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('plan pointer names the Routines sub-tab explicitly (never PlanScreen\'s habits default)', async () => {
    // The pointer's promise is "we'll take you to your routines". PlanScreen
    // defaults activeTab to 'habits' when no `tab` param arrives, so omitting
    // the param silently lands the user on Habits. Pin it.
    await complete(pointerOnly('plan'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));

    const [, params] = mockReplace.mock.calls[0] as [string, { tab?: string }];
    expect(params).toEqual({ tab: 'routines' });
    expect(params.tab).not.toBe('habits');
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
