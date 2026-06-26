// Integration probe for the B-3b Issue 1 device-walk dead-end: a browse-
// launched Rest/NSDR (audio) protocol whose idle-preroll header-X "End early"
// fails to leave the flow. Unlike BrowseRunFlow.test.tsx (which MOCKS the
// player), this file mounts the REAL GuidedSessionPlayer so the actual
// BrowseRunFlow → onCancel → onExitBeforeStart threading is exercised end to
// end for an nsdr-family protocol. The player's heavy leaf deps are stubbed
// the same way GuidedSessionPlayer.test.tsx stubs them.
//
// Two layers:
//   1. Component boundary — BrowseRunFlow with a spy onCancel: proves the
//      idle X confirm reaches onCancel for nsdr.
//   2. Full navigation path — real NavigationContainer with
//      EnergyBrowseList → PracticeRun (both real), tap the NSDR card, then
//      idle X confirm, and assert we land back on the Energy browse list
//      (the real navigation.goBack() that handleCancel performs).

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockResolvedValue(undefined),
  getItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

// ---- player leaf-dep stubs (paths relative to THIS test file) ----
jest.mock('../../../../utils/sessionMarker', () => ({
  readMarker: jest.fn().mockResolvedValue(null),
  writeMarker: jest.fn().mockResolvedValue(undefined),
  clearMarker: jest.fn().mockResolvedValue(undefined),
  isExpired: jest.fn(() => false),
  buildRecoveredSummary: jest.fn(),
}));

jest.mock('../../../../services/audio/protocolAudioLoader', () => ({
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

jest.mock('../../../protocol/AudioStepView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { AudioStepView: () => React.createElement(View, { testID: 'mock-audio' }) };
});

jest.mock('../../../../services/firebase/protocolSession.service', () => {
  const actual = jest.requireActual(
    '../../../../services/firebase/protocolSession.service'
  );
  return { ...actual, writeProtocolSession: jest.fn().mockResolvedValue(undefined) };
});

jest.mock('../../../../services/firebase/brainStateCheckIn.service', () => {
  const actual = jest.requireActual(
    '../../../../services/firebase/brainStateCheckIn.service'
  );
  return {
    ...actual,
    writeBrainStateCheckInDoc: jest.fn().mockResolvedValue(undefined),
    maybeMarkFirstShift: jest.fn().mockResolvedValue(undefined),
  };
});

const mockUseAuth = jest.fn();
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('../../../../services/lateNightNSDRSwap', () => ({
  getLateNightNSDRSwap: jest.fn(() => null),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BrowseRunFlow } from '../BrowseRunFlow';
import { PracticeRunScreen } from '../../../../screens/practices/PracticeRunScreen';
import { EnergyBrowseListScreen } from '../../../../screens/Energy/EnergyBrowseListScreen';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import { writeProtocolSession as writeProtocolSessionMock } from '../../../../services/firebase/protocolSession.service';

beforeEach(() => {
  mockUseAuth.mockReset();
  mockUseAuth.mockReturnValue({ user: { uid: 'test-user' } });
  (writeProtocolSessionMock as jest.Mock).mockClear();
});

describe('BrowseRunFlow — Rest/NSDR idle-preroll X reaches onCancel (component boundary)', () => {
  it('true-browse nsdr-10: idle X confirm calls onCancel and writes no session', async () => {
    const nsdr = getProtocolById('nsdr-10');
    if (!nsdr) throw new Error('fixture: nsdr-10 missing');
    const onCancel = jest.fn();
    const onComplete = jest.fn();

    const { getByTestId } = render(
      <BrowseRunFlow
        protocol={nsdr}
        stateBefore={null}
        userId="test-user"
        onComplete={onComplete}
        onCancel={onCancel}
        writeMode="dev_dry_run"
      />
    );

    fireEvent.press(getByTestId('player-header-close'));
    fireEvent.press(getByTestId('end-early-modal-confirm'));

    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
    expect(writeProtocolSessionMock).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('Energy browse → NSDR → idle X exits back to the browse list (full navigation)', () => {
  const Stack = createNativeStackNavigator();

  function renderEnergyNav() {
    return render(
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="EnergyBrowse"
            component={EnergyBrowseListScreen}
            initialParams={{ category: 'rest' }}
          />
          <Stack.Screen name="PracticeRun" component={PracticeRunScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  it('tapping NSDR then idle X "End early" returns to the Energy rest browse list', async () => {
    const { findByTestId, queryByTestId } = renderEnergyNav();

    // Start on the Energy "rest" browse list (contains nsdr-10 / nsdr-20).
    await findByTestId('energy-browse-list-rest');

    // Tap the NSDR card → navigate to PracticeRun → real BrowseRunFlow + player.
    fireEvent.press(await findByTestId('energy-browse-card-nsdr-10'));

    // We are on the player idle preroll (no Begin tapped).
    await findByTestId('player-header-close');
    expect(queryByTestId('energy-browse-list-rest')).toBeNull();

    // Idle header-X → confirm "End early".
    fireEvent.press(await findByTestId('player-header-close'));
    fireEvent.press(await findByTestId('end-early-modal-confirm'));

    // handleCancel → navigation.goBack() should pop PracticeRun and land us
    // back on the Energy rest browse list (NOT stuck on the preroll).
    await waitFor(() => {
      expect(queryByTestId('energy-browse-list-rest')).not.toBeNull();
    });
    expect(queryByTestId('player-header-close')).toBeNull();
    expect(writeProtocolSessionMock).not.toHaveBeenCalled();
  });
});
