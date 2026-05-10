// Round 14 — AppStack-boundary integration test for the PracticeRunScreen
// try_longer back-button behavior fix (sibling of the CheckInFlowScreen
// fix in the same round).
//
// Reproducer (deep Path 2 chain): Daily check-in → state → time →
// recommendation → run → re-check (not_shifted) → response → "Try
// something longer" → PracticeRun(first) → run → re-check
// (not_shifted) → response → "Try something longer" AGAIN →
// PracticeRunScreen.handleComplete fires from inside PracticeRun(first)
// while it's in BrowseRunFlow's flow_complete terminal state.
//
// With the bug (navigate): stack becomes [Dashboard, ...,
// PracticeRun(first), Practices/PracticeRun(second)]. PracticeRun(first)
// renders null (BrowseRunFlow.tsx case 'flow_complete' returns null).
// Back from the new top of stack surfaces a blank PracticeRun(first)
// frame.
//
// With the fix (replace): stack becomes [Dashboard, ...,
// Practices/PracticeRun(second)]. Back from the new top lands on
// Dashboard (or wherever was beneath PracticeRun(first)).
//
// The "deep chain" is the user-visible reproducer; the architectural
// pattern is the same with a single level of PracticeRun, so the test
// uses initialState to start at [Dashboard, PracticeRun] and asserts
// the architectural fix from there. PracticeRunScreen is REAL (the
// load-bearing system under test); BrowseRunFlow is mocked so we can
// drive onComplete with a synthetic try_longer terminal directly
// (the mock is below the navigation chain — BrowseRunFlow's internal
// flow doesn't touch the navigator).

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockGetLateNightNSDRSwap = jest.fn();
jest.mock('../../../services/lateNightNSDRSwap', () => ({
  getLateNightNSDRSwap: (...args: unknown[]) => mockGetLateNightNSDRSwap(...args),
}));

// Capture the onComplete handler so tests can fire a synthetic
// try_longer terminal directly. The full re_check → response → tap
// drive is exhaustively covered in BrowseRunFlow.test.tsx; this test
// focuses narrowly on the navigation transport outcome.
let lastOnComplete:
  | ((terminal: Record<string, unknown>) => void)
  | null = null;

jest.mock('../../../components/checkin/flow/BrowseRunFlow', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    BrowseRunFlow: (props: {
      onComplete: (terminal: Record<string, unknown>) => void;
    }) => {
      lastOnComplete = props.onComplete;
      return ReactLib.createElement(
        View,
        { testID: 'mock-browse-run-flow' },
        ReactLib.createElement(Text, null, 'BrowseRunFlow stub')
      );
    },
  };
});

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { PracticeRunScreen } from '../PracticeRunScreen';
import { PracticesIndexScreen } from '../PracticesIndexScreen';

const Stack = createNativeStackNavigator();

function DashboardStub() {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return ReactLib.createElement(
    View,
    { testID: 'dashboard-stub' },
    ReactLib.createElement(Text, null, 'Dashboard root')
  );
}

// Initial navigation state representing the stack shape after a user
// has navigated through CheckInFlow → "Try something longer" →
// PracticeRun. The PracticeRun route params mirror the production
// shape (CheckInFlowScreen.handleSeeOtherOptions / try_longer
// branches set fromCheckInFlow + intentPath).
const STACK_AFTER_TRY_LONGER = {
  index: 1,
  routes: [
    { key: 'Dashboard-1', name: 'Dashboard' },
    {
      key: 'PracticeRun-1',
      name: 'PracticeRun',
      params: {
        protocolId: 'nsdr-20',
        stateBefore: 'foggy' as const,
        fromCheckInFlow: true,
        intentPath: 'default' as const,
      },
    },
  ],
};

// Navigation ref for programmatic back-button simulation. The override
// branch test uses navigationRef.goBack() because PracticeRun has no
// exposed header-back affordance (it presents as a full-screen modal);
// the user-facing equivalent is the iOS swipe-back gesture or the
// hardware back button on Android. Both ultimately dispatch navigation
// .goBack(), which is what we trigger here.
const navigationRef = createNavigationContainerRef();

function renderAppStack() {
  return render(
    <NavigationContainer
      ref={navigationRef}
      initialState={STACK_AFTER_TRY_LONGER}
    >
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" component={DashboardStub} />
        <Stack.Screen name="PracticeRun" component={PracticeRunScreen} />
        <Stack.Screen name="Practices" component={PracticesIndexScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user-id' } });
  mockGetLateNightNSDRSwap.mockReset();
  mockGetLateNightNSDRSwap.mockReturnValue(null);
  lastOnComplete = null;
});

// Synthetic BrowseRunFlow terminal — flow_complete with try_longer
// chosen by the user on the response screen. checkInFlowContext is
// implicit in PracticeRunScreen's handleComplete: it's built from
// route.params (fromCheckInFlow + state + intentPath + timeWindow).
function tryLongerTerminal(stateBefore: 'wired' | 'foggy') {
  return {
    step: 'flow_complete',
    protocol: { id: 'nsdr-20', timeWindow: 20 },
    sessionStartedAt: 1_000_000,
    sessionEndedAt: 1_120_000,
    durationActualSeconds: 120,
    stateAfter: stateBefore, // same-state in negative zone → not_shifted
    checkInFlowContext: {
      state: stateBefore,
      intentPath: 'default',
    },
    userChosenNextStep: 'try_longer',
  };
}

describe('PracticeRunScreen — try_longer no_override back-button (Round 14 sibling fix)', () => {
  it('back from Practices after try_longer lands on Dashboard, not blank PracticeRun', async () => {
    const { findByTestId, queryByTestId } = renderAppStack();

    // Stack starts as [Dashboard, PracticeRun]. BrowseRunFlow stub
    // captures onComplete.
    await findByTestId('mock-browse-run-flow');
    expect(lastOnComplete).not.toBeNull();

    // Fire the terminal that BrowseRunFlow's response screen would
    // dispatch when the user taps "Try something longer."
    lastOnComplete!(tryLongerTerminal('foggy'));

    // After the round-14 fix: replace('Practices', ...) executes →
    // stack becomes [Dashboard, Practices].
    await findByTestId('practices-index');
    // PracticeRun must be gone (replace removed it from the stack).
    expect(queryByTestId('mock-browse-run-flow')).toBeNull();

    // Tap Practices' back button. With the round-14 fix, stack pops
    // to [Dashboard]. With the bug (navigate), stack would have been
    // [Dashboard, PracticeRun(first), Practices] and back would
    // surface the dead PracticeRun(first) frame.
    const backButton = await findByTestId('practices-back-button');
    fireEvent.press(backButton);

    await waitFor(() => {
      expect(queryByTestId('dashboard-stub')).not.toBeNull();
    });
    expect(queryByTestId('mock-browse-run-flow')).toBeNull();
    expect(queryByTestId('practices-index')).toBeNull();
  });
});

describe('PracticeRunScreen — try_longer late_night_nsdr_override stack-shape (Round 14 sibling fix)', () => {
  // Why a stack-shape assertion rather than a back-button drive:
  // React Navigation's `navigate(SameScreenName, ...)` when the
  // current top of stack is the same screen name behaves as a
  // params-merge (no new push). Inverting replace → navigate in the
  // override branch (where the destination is also 'PracticeRun')
  // produces stack shape [Dashboard, PracticeRun] in BOTH cases —
  // the bug doesn't manifest as a stack-depth difference. So a
  // back-from-resulting-screen integration test for this branch
  // would not differentiate replace from navigate via inversion.
  //
  // Instead we verify the contract directly: the navigationRef's
  // root state must show exactly [Dashboard, PracticeRun] after
  // the override fires (one PracticeRun, not stacked) AND the
  // route key must be DIFFERENT from the original PracticeRun's
  // key (replace creates a fresh route entry; navigate's params-
  // merge keeps the original key). The key-change assertion is
  // what differentiates the two methods on the same-name path.
  it('replace creates a fresh PracticeRun route (different key from initial), not a params-merge', async () => {
    mockGetLateNightNSDRSwap.mockReturnValue({ protocolId: 'nsdr-20' });

    const { findByTestId } = renderAppStack();

    await findByTestId('mock-browse-run-flow');
    expect(lastOnComplete).not.toBeNull();

    // Capture the initial PracticeRun route key before the override
    // fires.
    const initialRoutes = navigationRef.getRootState().routes;
    const initialPracticeRunKey = initialRoutes.find(
      (r) => r.name === 'PracticeRun'
    )?.key;
    expect(initialPracticeRunKey).toBe('PracticeRun-1');

    lastOnComplete!(tryLongerTerminal('wired'));

    // After replace: stack still [Dashboard, PracticeRun] but the
    // PracticeRun route key changes (replace creates a new entry
    // with a fresh key). With navigate (bug), the key would stay
    // 'PracticeRun-1' (params-merge in place).
    await waitFor(() => {
      const routes = navigationRef.getRootState().routes;
      expect(routes.length).toBe(2);
      expect(routes[0].name).toBe('Dashboard');
      expect(routes[1].name).toBe('PracticeRun');
      expect(routes[1].key).not.toBe(initialPracticeRunKey);
    });

    // The new PracticeRun's params reflect the override target.
    // stateBefore comes from PracticeRunScreen's checkInFlowContext
    // (built from route.params at line 87-94, which uses the initial
    // route's stateBefore='foggy'), NOT from BrowseRunFlow's terminal
    // checkInFlowContext.state. The two stateBefores happen to match
    // in production (BrowseRunFlow inherits from the same context)
    // but the route.params source is what handleComplete reads.
    const finalPracticeRun = navigationRef.getRootState().routes[1];
    expect(finalPracticeRun.params).toEqual(
      expect.objectContaining({
        protocolId: 'nsdr-20',
        stateBefore: 'foggy',
        fromCheckInFlow: true,
      })
    );
  });
});
