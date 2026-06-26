// Focus-session loop closure (Vara_Engine_Contract.md §12.1) + the B-3c
// "Center first" pre-focus box breathing handoff (commit 5).
//
// A focus session launched FROM the check-in (fromCheckIn) OR the hub (fromHub)
// returns to the Focus reflection on "Done for now". With Center-first ON, the
// Begin tap first runs box breathing (GuidedSessionPlayer), then hands off to
// the timer, which still ends on the focus reflection. PomodoroTab and
// GuidedSessionPlayer are mocked to expose their wiring without the timer/audio
// trees.

const mockGoBack = jest.fn();
const mockRoute: {
  params: { fromCheckIn?: boolean; fromHub?: boolean } | undefined;
} = {
  params: undefined,
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => mockRoute,
}));

const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn((_db, coll, id) => ({ __ref: `${coll}/${id}` }));
jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => '__TS__',
}));

jest.mock('../../../config/firebase', () => ({ db: { __mock: true } }));
jest.mock('../../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), log: jest.fn() },
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

const mockGetPrefs = jest.fn((..._a: any[]) => Promise.resolve({ centerFirst: false }));
const mockSavePrefs = jest.fn((..._a: any[]) => Promise.resolve());
jest.mock('../../../services/firebase/focusPreferences.service', () => ({
  getFocusPreferences: (...a: any[]) => mockGetPrefs(...a),
  saveFocusPreferences: (...a: any[]) => mockSavePrefs(...a),
}));

const mockWriteSession = jest.fn((..._a: any[]) => Promise.resolve());
jest.mock('../../../services/firebase/protocolSession.service', () => ({
  writeProtocolSession: (...a: any[]) => mockWriteSession(...a),
}));

// Mock GuidedSessionPlayer — expose the protocol it ran and buttons to fire
// onExit (natural completion / mid-practice abandon).
jest.mock('../../../components/protocol/GuidedSessionPlayer', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    GuidedSessionPlayer: (props: any) =>
      ReactLib.createElement(
        View,
        { testID: 'mock-gsp' },
        ReactLib.createElement(Text, { testID: 'mock-gsp-protocol' }, props.protocol?.id),
        ReactLib.createElement(
          TouchableOpacity,
          {
            testID: 'mock-gsp-complete',
            onPress: () =>
              props.onExit?.({
                protocolId: props.protocol?.id,
                stateBefore: null,
                completed: true,
                durationActualSeconds: 128,
                stepsCompleted: 1,
                totalSteps: 1,
                abandonReason: null,
                startedAt: 1000,
                endedAt: 1128,
              }),
          },
          ReactLib.createElement(Text, null, 'complete')
        ),
        ReactLib.createElement(
          TouchableOpacity,
          {
            testID: 'mock-gsp-abandon',
            onPress: () =>
              props.onExit?.({
                protocolId: props.protocol?.id,
                stateBefore: null,
                completed: false,
                durationActualSeconds: 40,
                stepsCompleted: 0,
                totalSteps: 1,
                abandonReason: 'user_exit',
                startedAt: 1000,
                endedAt: 1040,
              }),
          },
          ReactLib.createElement(Text, null, 'abandon')
        )
      ),
  };
});

// Mock PomodoroTab — expose onLoopDone wiring, centerFirst/autoStart props, and
// buttons to fire onLoopDone, onCenterFirstBegin, onToggleCenterFirst.
jest.mock('../PomodoroTab', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    PomodoroTab: (props: any) =>
      ReactLib.createElement(
        View,
        { testID: 'mock-pomodoro' },
        ReactLib.createElement(
          Text,
          { testID: 'mock-pomodoro-mode' },
          props.onLoopDone ? 'loop' : 'direct'
        ),
        ReactLib.createElement(
          Text,
          { testID: 'mock-pomodoro-centerfirst' },
          props.centerFirst ? 'on' : 'off'
        ),
        ReactLib.createElement(
          Text,
          { testID: 'mock-pomodoro-autostart' },
          props.autoStart ? 'on' : 'off'
        ),
        ReactLib.createElement(
          Text,
          { testID: 'mock-pomodoro-cancenter' },
          props.onCenterFirstBegin ? 'yes' : 'no'
        ),
        ReactLib.createElement(
          TouchableOpacity,
          { testID: 'mock-pomodoro-done', onPress: () => props.onLoopDone?.('focus-doc-1') },
          ReactLib.createElement(Text, null, 'done')
        ),
        ReactLib.createElement(
          TouchableOpacity,
          { testID: 'mock-pomodoro-begin-center', onPress: () => props.onCenterFirstBegin?.(25) },
          ReactLib.createElement(Text, null, 'begin-center')
        ),
        ReactLib.createElement(
          TouchableOpacity,
          { testID: 'mock-pomodoro-toggle', onPress: () => props.onToggleCenterFirst?.(true) },
          ReactLib.createElement(Text, null, 'toggle')
        )
      ),
  };
});

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FocusScreen } from '../FocusScreen';

beforeEach(() => {
  mockGoBack.mockClear();
  mockUpdateDoc.mockClear();
  mockDoc.mockClear();
  mockRoute.params = undefined;
  mockGetPrefs.mockReset();
  mockGetPrefs.mockResolvedValue({ centerFirst: false });
  mockSavePrefs.mockClear();
  mockWriteSession.mockClear();
});

describe('FocusScreen — focus-session loop closure', () => {
  it('loop-launched: "Done for now" returns to the Focus reflection (focus chip set)', () => {
    mockRoute.params = { fromCheckIn: true };
    const { getByTestId, queryByTestId } = render(<FocusScreen />);

    expect(getByTestId('mock-pomodoro-mode').props.children).toBe('loop');
    expect(queryByTestId('checkin-flow-reflection')).toBeNull();

    fireEvent.press(getByTestId('mock-pomodoro-done'));
    expect(getByTestId('checkin-flow-reflection')).toBeTruthy();
    expect(getByTestId('checkin-flow-reflection-chip-settled')).toBeTruthy();
    expect(getByTestId('checkin-flow-reflection-chip-some')).toBeTruthy();
    expect(getByTestId('checkin-flow-reflection-chip-still_busy')).toBeTruthy();
  });

  it('loop-launched: selecting a reflection writes it (focus vocabulary) and exits home', () => {
    mockRoute.params = { fromCheckIn: true };
    const { getByTestId } = render(<FocusScreen />);
    fireEvent.press(getByTestId('mock-pomodoro-done'));

    fireEvent.press(getByTestId('checkin-flow-reflection-chip-settled'));

    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'focusSessions', 'focus-doc-1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ reflection: 'settled' })
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('hub-launched: "Done for now" chains into the Focus reflection', () => {
    mockRoute.params = { fromHub: true };
    const { getByTestId, queryByTestId } = render(<FocusScreen />);

    expect(getByTestId('mock-pomodoro-mode').props.children).toBe('loop');
    expect(queryByTestId('checkin-flow-reflection')).toBeNull();

    fireEvent.press(getByTestId('mock-pomodoro-done'));
    expect(getByTestId('checkin-flow-reflection')).toBeTruthy();
    expect(getByTestId('checkin-flow-reflection-chip-settled')).toBeTruthy();
  });

  it('hub-launched: selecting a reflection writes it (focus vocabulary) and exits', () => {
    mockRoute.params = { fromHub: true };
    const { getByTestId } = render(<FocusScreen />);
    fireEvent.press(getByTestId('mock-pomodoro-done'));
    fireEvent.press(getByTestId('checkin-flow-reflection-chip-settled'));

    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'focusSessions', 'focus-doc-1');
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ reflection: 'settled' })
    );
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('directly-started: no onLoopDone, "Done for now" pops NO reflection', () => {
    mockRoute.params = undefined; // not from the check-in loop
    const { getByTestId, queryByTestId } = render(<FocusScreen />);

    expect(getByTestId('mock-pomodoro-mode').props.children).toBe('direct');
    fireEvent.press(getByTestId('mock-pomodoro-done')); // onLoopDone is undefined → no-op
    expect(queryByTestId('checkin-flow-reflection')).toBeNull();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('FocusScreen — Center first (B-3c commit 5)', () => {
  it('initializes the Center-first row from the persisted preference', async () => {
    mockGetPrefs.mockResolvedValue({ centerFirst: true });
    mockRoute.params = { fromHub: true };
    const { getByTestId } = render(<FocusScreen />);
    await waitFor(() =>
      expect(getByTestId('mock-pomodoro-centerfirst').props.children).toBe('on')
    );
    expect(mockGetPrefs).toHaveBeenCalledWith('u1');
  });

  it('persists the choice when the row is toggled', async () => {
    mockRoute.params = { fromHub: true };
    const { getByTestId } = render(<FocusScreen />);
    fireEvent.press(getByTestId('mock-pomodoro-toggle'));
    await waitFor(() =>
      expect(mockSavePrefs).toHaveBeenCalledWith('u1', { centerFirst: true })
    );
    expect(getByTestId('mock-pomodoro-centerfirst').props.children).toBe('on');
  });

  it('ON: Begin launches box breathing, then hands off to the auto-started timer', async () => {
    mockGetPrefs.mockResolvedValue({ centerFirst: true });
    mockRoute.params = { fromHub: true };
    const { getByTestId, queryByTestId } = render(<FocusScreen />);
    await waitFor(() =>
      expect(getByTestId('mock-pomodoro-centerfirst').props.children).toBe('on')
    );

    // Begin with centering → box breathing runs (the fixed 2-min protocol).
    fireEvent.press(getByTestId('mock-pomodoro-begin-center'));
    expect(getByTestId('mock-gsp')).toBeTruthy();
    expect(getByTestId('mock-gsp-protocol').props.children).toBe('box-breathing-2');
    expect(queryByTestId('mock-pomodoro')).toBeNull(); // timer not shown during centering

    // Completion → writes its OWN protocolSession row, then hands off to the
    // auto-started timer.
    fireEvent.press(getByTestId('mock-gsp-complete'));
    expect(mockWriteSession).toHaveBeenCalledTimes(1);
    expect(mockWriteSession.mock.calls[0][0]).toBe('u1');
    expect(mockWriteSession.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        protocolId: 'box-breathing-2',
        stateBefore: null,
        stateAfter: null,
        outcome: 'browse_launched',
      })
    );
    expect(getByTestId('mock-pomodoro')).toBeTruthy();
    expect(getByTestId('mock-pomodoro-autostart').props.children).toBe('on');
    // Centering consumed: a second block starts directly (no re-center).
    expect(getByTestId('mock-pomodoro-cancenter').props.children).toBe('no');
  });

  it('ON: the single end-of-loop reflection is still the FOCUS reflection', async () => {
    mockGetPrefs.mockResolvedValue({ centerFirst: true });
    mockRoute.params = { fromHub: true };
    const { getByTestId } = render(<FocusScreen />);
    await waitFor(() =>
      expect(getByTestId('mock-pomodoro-centerfirst').props.children).toBe('on')
    );

    fireEvent.press(getByTestId('mock-pomodoro-begin-center'));
    fireEvent.press(getByTestId('mock-gsp-complete')); // box breathing done → timer
    // Timer "Done for now" → the FOCUS reflection (not a box-breathing one).
    fireEvent.press(getByTestId('mock-pomodoro-done'));
    expect(getByTestId('checkin-flow-reflection')).toBeTruthy();
    expect(getByTestId('checkin-flow-reflection-chip-settled')).toBeTruthy();
  });

  it('ON but abandoned mid-practice: writes an abandoned row and returns to the timer un-started', async () => {
    mockGetPrefs.mockResolvedValue({ centerFirst: true });
    mockRoute.params = { fromHub: true };
    const { getByTestId } = render(<FocusScreen />);
    await waitFor(() =>
      expect(getByTestId('mock-pomodoro-centerfirst').props.children).toBe('on')
    );

    fireEvent.press(getByTestId('mock-pomodoro-begin-center'));
    fireEvent.press(getByTestId('mock-gsp-abandon'));
    expect(mockWriteSession.mock.calls[0][1]).toEqual(
      expect.objectContaining({ protocolId: 'box-breathing-2', outcome: 'abandoned' })
    );
    expect(getByTestId('mock-pomodoro')).toBeTruthy();
    expect(getByTestId('mock-pomodoro-autostart').props.children).toBe('off');
  });
});
