// Floor commitment capture (spec 10.1) — the telemetry wiring.
//
// The event on this screen is EMPTY, and that is the entire point of the file:
// the only thing this screen produces is the user's own words, and the one thing
// that must never be true is that any of them reach the log. `text` is in scope
// one line from the call site, and the floor is capped short enough that the
// writer's 64-character backstop would happily keep it.

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockSetFloor = jest.fn();
jest.mock('../../../services/firebase/userPrivate.service', () => ({
  FLOOR_COMMITMENT_MAX_CHARS: 120,
  setFloorCommitment: (...a: any[]) => mockSetFloor(...a),
}));
// Mocked BEFORE the screen imports logEvent: the real writer would load here and
// swallow its own failure, and every assertion below would pass regardless.
const mockLogEvent = jest.fn();
jest.mock('../../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FloorCommitmentScreen } from '../FloorCommitmentScreen';

/** The user's own words. Short enough to clear every runtime backstop. */
const FLOOR_TEXT = 'ten minutes of quiet';

async function saveFloor(text: string = FLOOR_TEXT) {
  const screen = render(<FloorCommitmentScreen />);
  fireEvent.changeText(screen.getByTestId('weekly-floor-input'), text);
  fireEvent.press(screen.getByTestId('weekly-floor-save'));
  return screen;
}

describe('FloorCommitmentScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSetFloor.mockReset().mockResolvedValue(undefined);
    mockLogEvent.mockReset();
  });

  describe('the floor_set event', () => {
    test('fires once after the write lands, with an empty payload', async () => {
      await saveFloor();

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalledTimes(1));
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('u1');
      expect(name).toBe('floor_set');
      expect(params).toEqual({});
    });

    test('carries no key at all, and never the floor text', async () => {
      // The audit surface. There is no length, no bucket and no hash of the
      // user's words that is a decision input, so there is no key here.
      await saveFloor();

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
      expect(Object.keys(mockLogEvent.mock.calls[0][2])).toEqual([]);
      expect(JSON.stringify(mockLogEvent.mock.calls[0])).not.toContain('quiet');
    });

    test('the text still reaches storage, so the omission is the event only', async () => {
      // The opposite mistake: the firewall governs what is logged, not what the
      // user gets to keep.
      await saveFloor();

      await waitFor(() => expect(mockSetFloor).toHaveBeenCalled());
      expect(mockSetFloor).toHaveBeenCalledWith('u1', FLOOR_TEXT);
    });

    test('does not fire when the write fails', async () => {
      mockSetFloor.mockRejectedValue(new Error('offline'));
      const screen = await saveFloor();

      await waitFor(() => expect(screen.getByTestId('weekly-floor-error')).toBeTruthy());
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test('fires after the write and before navigating away', async () => {
      const order: string[] = [];
      mockSetFloor.mockImplementation(async () => {
        order.push('write');
      });
      mockLogEvent.mockImplementation(() => {
        order.push('event');
      });
      mockReplace.mockImplementation(() => {
        order.push('navigate');
      });

      await saveFloor();

      await waitFor(() => expect(order).toEqual(['write', 'event', 'navigate']));
    });

    test('a throwing analytics call still lets the user through', async () => {
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });

      await saveFloor();

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyEntry'));
    });

    test('does not fire on a plain render', async () => {
      render(<FloorCommitmentScreen />);

      expect(mockLogEvent).not.toHaveBeenCalled();
    });
  });
});
