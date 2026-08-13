// Stress Recovery launch path — IA restructure step 4b-ii-a.
//
// Cloned from BrowseRunFlow.prerollExit.integration.test.tsx, which proves the
// same chain for the Energy browse lists. The point of repeating it for a second
// entry point is the RETURN leg, not the launch: PracticeRunScreen decides where
// to go after a browse pick with a bare `navigation.goBack()`
// (PracticeRunScreen.tsx:123-126 for completion, :184-189 for cancel), which is
// relative to whoever pushed it. Step-0 read that as parent-agnostic; this suite
// is what turns that reading into a fact for the new parent.
//
// The failure this guards against is specific and has happened before on this
// screen family: a browse-launched audio protocol whose idle-preroll X leaves
// the user stranded in the player with no way back (the B-3b device-walk
// dead-end). A new parent is exactly where that would resurface.
//
// Mounts the REAL StressRecoveryScreen and the REAL PracticeRunScreen. Only the
// player's heavy leaf deps are stubbed, on the same terms as the Energy probe.

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// A real navigator pulls @react-navigation/elements' SafeAreaProviderCompat,
// which reads the provider, both contexts and initialWindowMetrics; the screen
// under test also renders its own SafeAreaView. Missing any one of them renders
// as an undefined component rather than a helpful error.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  const insets = { top: 0, left: 0, right: 0, bottom: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    SafeAreaView: ({ children, style }: any) =>
      React.createElement(View, { style }, children),
    SafeAreaInsetsContext: React.createContext(insets),
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// ---- player leaf-dep stubs (paths relative to THIS test file) ----
jest.mock('../../../utils/sessionMarker', () => ({
  readMarker: jest.fn().mockResolvedValue(null),
  writeMarker: jest.fn().mockResolvedValue(undefined),
  clearMarker: jest.fn().mockResolvedValue(undefined),
  isExpired: jest.fn(() => false),
  buildRecoveredSummary: jest.fn(),
}));

jest.mock('../../../services/audio/protocolAudioLoader', () => ({
  prefetchProtocolAudio: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return { ...actual, FadeIn: { duration: () => undefined } };
});

jest.mock('../../../components/protocol/AudioStepView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { AudioStepView: () => React.createElement(View, { testID: 'mock-audio' }) };
});

jest.mock('../../../services/firebase/protocolSession.service', () => {
  const actual = jest.requireActual(
    '../../../services/firebase/protocolSession.service'
  );
  return { ...actual, writeProtocolSession: jest.fn().mockResolvedValue(undefined) };
});

jest.mock('../../../services/firebase/brainStateCheckIn.service', () => {
  const actual = jest.requireActual(
    '../../../services/firebase/brainStateCheckIn.service'
  );
  return {
    ...actual,
    writeBrainStateCheckInDoc: jest.fn().mockResolvedValue(undefined),
    maybeMarkFirstShift: jest.fn().mockResolvedValue(undefined),
  };
});

const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../services/lateNightNSDRSwap', () => ({
  getLateNightNSDRSwap: jest.fn(() => null),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { StressRecoveryScreen } from '../StressRecoveryScreen';
import { PracticeRunScreen } from '../../practices/PracticeRunScreen';
import { ROUTES } from '../../../navigation/routes';
import { writeProtocolSession as writeProtocolSessionMock } from '../../../services/firebase/protocolSession.service';

const Stack = createNativeStackNavigator();

function renderStressRecoveryNav() {
  return render(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name={ROUTES.PillarStressRecovery}
          component={StressRecoveryScreen}
        />
        <Stack.Screen name={ROUTES.PracticeRun} component={PracticeRunScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
  (writeProtocolSessionMock as jest.Mock).mockClear();
});

describe('Stress Recovery → practice → player → back', () => {
  it('lists the settle practices with its own testID prefix, not Energy\'s', async () => {
    const { findByTestId, queryByTestId } = renderStressRecoveryNav();

    await findByTestId('stress-recovery-list');
    // Same practice object as the Energy rest list, addressed by this page's
    // own prefix. Both surfaces render the shared ProtocolListItem, so this is
    // what keeps a failure message pointing at the right screen.
    expect(await findByTestId('stress-recovery-card-nsdr-10')).toBeTruthy();
    expect(queryByTestId('energy-browse-card-nsdr-10')).toBeNull();
  });

  it('launches the catalog player from a practice row', async () => {
    const { findByTestId, queryByTestId } = renderStressRecoveryNav();

    await findByTestId('stress-recovery-list');
    fireEvent.press(await findByTestId('stress-recovery-card-nsdr-10'));

    // On the player's idle preroll (Begin not tapped), and off the list.
    await findByTestId('player-header-close');
    expect(queryByTestId('stress-recovery-list')).toBeNull();
  });

  it('returns to the Stress Recovery list on idle "End early", not to Energy', async () => {
    const { findByTestId, queryByTestId } = renderStressRecoveryNav();

    await findByTestId('stress-recovery-list');
    fireEvent.press(await findByTestId('stress-recovery-card-nsdr-10'));
    await findByTestId('player-header-close');

    fireEvent.press(await findByTestId('player-header-close'));
    fireEvent.press(await findByTestId('end-early-modal-confirm'));

    // THE assertion of this file. handleCancel's goBack() pops PracticeRun back
    // to whoever pushed it — which for this entry point must be Stress Recovery.
    // The one hardcoded destination in that screen, replace('Practices'), sits
    // inside the checkInFlowContext branch and is unreachable from a browse
    // pick; if that ever stopped being true, this is where it would show.
    await waitFor(() => {
      expect(queryByTestId('stress-recovery-list')).not.toBeNull();
    });
    expect(queryByTestId('player-header-close')).toBeNull();
    // Abandoned before Begin: nothing to record.
    expect(writeProtocolSessionMock).not.toHaveBeenCalled();
  });
});
