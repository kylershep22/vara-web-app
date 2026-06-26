// Focus-session loop closure (Vara_Engine_Contract.md §12.1).
//
// A focus session launched FROM the check-in (route param fromCheckIn) returns
// to the Focus reflection on "Done for now"; a directly-started one does not.
// PomodoroTab is mocked to expose its onLoopDone wiring without the timer/audio
// tree.

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

// Mock PomodoroTab — expose whether it received onLoopDone, and a button that
// fires it (simulating the "Done for now" terminal after a completed block).
jest.mock('../PomodoroTab', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    PomodoroTab: (props: { onLoopDone?: (id: string | null) => void }) =>
      ReactLib.createElement(
        View,
        { testID: 'mock-pomodoro' },
        ReactLib.createElement(
          Text,
          { testID: 'mock-pomodoro-mode' },
          props.onLoopDone ? 'loop' : 'direct'
        ),
        ReactLib.createElement(
          TouchableOpacity,
          {
            testID: 'mock-pomodoro-done',
            onPress: () => props.onLoopDone?.('focus-doc-1'),
          },
          ReactLib.createElement(Text, null, 'done')
        )
      ),
  };
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FocusScreen } from '../FocusScreen';

beforeEach(() => {
  mockGoBack.mockClear();
  mockUpdateDoc.mockClear();
  mockDoc.mockClear();
  mockRoute.params = undefined;
});

describe('FocusScreen — focus-session loop closure', () => {
  it('loop-launched: "Done for now" returns to the Focus reflection (focus chip set)', () => {
    mockRoute.params = { fromCheckIn: true };
    const { getByTestId, queryByTestId } = render(<FocusScreen />);

    // PomodoroTab was given onLoopDone (loop mode); no reflection yet.
    expect(getByTestId('mock-pomodoro-mode').props.children).toBe('loop');
    expect(queryByTestId('checkin-flow-reflection')).toBeNull();

    // "Done for now" → the Focus reflection, with the §9 focus chips.
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
    // Exit home — same exit a catalog-practice reflection uses.
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('hub-launched: "Done for now" chains into the Focus reflection', () => {
    mockRoute.params = { fromHub: true };
    const { getByTestId, queryByTestId } = render(<FocusScreen />);

    // Hub launch also drives the loop (onLoopDone present); no reflection yet.
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
