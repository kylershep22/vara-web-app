// FocusScreen orchestration (B-3c / B-3c.1).
//
// - "Done for now" exits the screen when launched from the hub / check-in
//   (onExit), and is a no-op (reset) for a directly-started timer.
// - The per-block focus reflection is INLINE on the completion surface (inside
//   PomodoroTab/BreakPrompt); selecting a chip flows up via onBlockReflect and
//   FocusScreen writes it onto that block's focusSessions doc. No separate
//   reflection screen → no double-reflect.
// - Center-first: Begin runs box breathing (GuidedSessionPlayer), then hands off
//   to the auto-started timer.
// PomodoroTab and GuidedSessionPlayer are mocked to expose their wiring.

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

// Mock PomodoroTab — expose onExit / onBlockReflect / center wiring and buttons.
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
          props.onExit ? 'loop' : 'direct'
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
          { testID: 'mock-pomodoro-done', onPress: () => props.onExit?.() },
          ReactLib.createElement(Text, null, 'done')
        ),
        ReactLib.createElement(
          TouchableOpacity,
          { testID: 'mock-pomodoro-reflect', onPress: () => props.onBlockReflect?.('settled', 'focus-doc-1') },
          ReactLib.createElement(Text, null, 'reflect')
        ),
        ReactLib.createElement(
          TouchableOpacity,
          { testID: 'mock-pomodoro-reflect-noid', onPress: () => props.onBlockReflect?.('settled', null) },
          ReactLib.createElement(Text, null, 'reflect-noid')
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

describe('FocusScreen — Done for now / exit', () => {
  it('check-in launched: "Done for now" exits the screen', () => {
    mockRoute.params = { fromCheckIn: true };
    const { getByTestId } = render(<FocusScreen />);
    expect(getByTestId('mock-pomodoro-mode').props.children).toBe('loop');
    fireEvent.press(getByTestId('mock-pomodoro-done'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('hub launched: "Done for now" exits the screen', () => {
    mockRoute.params = { fromHub: true };
    const { getByTestId } = render(<FocusScreen />);
    expect(getByTestId('mock-pomodoro-mode').props.children).toBe('loop');
    fireEvent.press(getByTestId('mock-pomodoro-done'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('directly-started: no onExit, "Done for now" does not navigate', () => {
    mockRoute.params = undefined;
    const { getByTestId } = render(<FocusScreen />);
    expect(getByTestId('mock-pomodoro-mode').props.children).toBe('direct');
    fireEvent.press(getByTestId('mock-pomodoro-done'));
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('FocusScreen — inline per-block reflection', () => {
  it('writes the selected chip onto the block focusSessions doc (any launch source)', () => {
    mockRoute.params = undefined; // ungated — fires even for a direct launch
    const { getByTestId } = render(<FocusScreen />);
    fireEvent.press(getByTestId('mock-pomodoro-reflect'));
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'focusSessions', 'focus-doc-1');
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(
      expect.objectContaining({ reflection: 'settled' })
    );
    // Reflecting does NOT navigate away (only "Done for now" exits).
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('skips the write when there is no completed block id', () => {
    mockRoute.params = { fromHub: true };
    const { getByTestId } = render(<FocusScreen />);
    fireEvent.press(getByTestId('mock-pomodoro-reflect-noid'));
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('FocusScreen — Center first (B-3c)', () => {
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

    fireEvent.press(getByTestId('mock-pomodoro-begin-center'));
    expect(getByTestId('mock-gsp')).toBeTruthy();
    expect(getByTestId('mock-gsp-protocol').props.children).toBe('box-breathing-2');
    expect(queryByTestId('mock-pomodoro')).toBeNull();

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
    expect(getByTestId('mock-pomodoro-cancenter').props.children).toBe('no');
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
