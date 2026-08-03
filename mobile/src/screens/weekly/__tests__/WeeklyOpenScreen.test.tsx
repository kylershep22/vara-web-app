// Weekly open (spec 6.1) — the wiring test. What it protects: the ONE cycle
// written at confirm carries the pair the user chose, the protocol the engine
// resolved for that pair, and a capacityCurrent equal to the forecast.

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockCreateWeeklyCycle = jest.fn();
const mockCountForOutcome = jest.fn();
jest.mock('../../../services/firebase/weeklyCycle.service', () => ({
  createWeeklyCycle: (...a: any[]) => mockCreateWeeklyCycle(...a),
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { WeeklyOpenScreen } from '../WeeklyOpenScreen';
import { PROTOCOL_MATRIX } from '../../../weeklyEngine';

/** Walk the three steps: outcome, capacity, confirm. */
async function openWeek(
  outcome: 'focus' | 'stress' | 'routines' | 'energy',
  capacity: 'normal' | 'limited' | 'slammed'
) {
  const screen = render(<WeeklyOpenScreen />);
  fireEvent.press(screen.getByTestId(`weekly-open-outcome-${outcome}`));
  fireEvent.press(screen.getByTestId(`weekly-open-capacity-${capacity}`));
  fireEvent.press(screen.getByTestId('weekly-open-confirm'));
  await waitFor(() => expect(mockCreateWeeklyCycle).toHaveBeenCalled());
  return screen;
}

describe('WeeklyOpenScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockCreateWeeklyCycle.mockReset().mockResolvedValue('cycle-1');
    mockCountForOutcome.mockReset().mockResolvedValue(0);
  });

  describe('the cycle write', () => {
    test('writes exactly one cycle carrying the chosen pair and its protocol', async () => {
      await openWeek('routines', 'limited');

      expect(mockCreateWeeklyCycle).toHaveBeenCalledTimes(1);
      const [uid, input] = mockCreateWeeklyCycle.mock.calls[0];
      expect(uid).toBe('u1');
      expect(input.outcome).toBe('routines');
      expect(input.capacityInitial).toBe('limited');
      expect(input.protocolId).toBe(PROTOCOL_MATRIX.routines.limited.id);
    });

    test('does not pass capacityCurrent or userId in the payload', async () => {
      // The service owns both. Passing capacityCurrent is the one way to open a
      // week whose current tier already disagrees with its forecast, so the
      // screen must not be the thing that sets it.
      await openWeek('focus', 'slammed');

      const input = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(input).not.toHaveProperty('capacityCurrent');
      expect(input).not.toHaveProperty('userId');
      expect(Object.keys(input).sort()).toEqual([
        'capacityInitial',
        'outcome',
        'protocolId',
        'weekStart',
      ]);
    });

    test('weekStart is today, as an ISO calendar date', async () => {
      await openWeek('energy', 'normal');

      const { weekStart } = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const now = new Date();
      const today = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
      expect(weekStart).toBe(today);
    });

    test('every outcome and capacity pair writes the matching protocol id', async () => {
      const pairs = [
        ['focus', 'normal'],
        ['stress', 'slammed'],
        ['routines', 'normal'],
        ['energy', 'limited'],
      ] as const;

      for (const [outcome, capacity] of pairs) {
        mockCreateWeeklyCycle.mockClear();
        await openWeek(outcome, capacity);
        expect(mockCreateWeeklyCycle.mock.calls[0][1].protocolId).toBe(
          PROTOCOL_MATRIX[outcome][capacity].id
        );
      }
    });
  });

  describe('the week number handed to Today', () => {
    test('a first week on this outcome is week 1, counted before the write', async () => {
      mockCountForOutcome.mockResolvedValue(0);
      await openWeek('focus', 'normal');

      expect(mockCountForOutcome).toHaveBeenCalledWith('u1', 'focus');
      expect(mockReplace).toHaveBeenCalledWith('WeeklyToday', { weekNumber: 1 });
    });

    test('a fourth week on this outcome is week 4', async () => {
      mockCountForOutcome.mockResolvedValue(3);
      await openWeek('focus', 'normal');

      expect(mockReplace).toHaveBeenCalledWith('WeeklyToday', { weekNumber: 4 });
    });

    test('the count is per outcome, so a switch starts at week 1 again', async () => {
      // Time-to-felt-effect is a property of the protocol, not of how long the
      // user has had the app (spec 6.3).
      mockCountForOutcome.mockImplementation((_uid: string, outcome: string) =>
        Promise.resolve(outcome === 'focus' ? 9 : 0)
      );
      await openWeek('routines', 'normal');

      expect(mockReplace).toHaveBeenCalledWith('WeeklyToday', { weekNumber: 1 });
    });
  });

  describe('the failure path', () => {
    test('a failed write shows an error and does not navigate', async () => {
      mockCreateWeeklyCycle.mockRejectedValue(new Error('offline'));
      const screen = await openWeek('stress', 'normal');

      await waitFor(() => expect(screen.getByTestId('weekly-open-error')).toBeTruthy());
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('the confirm stays available so the write can be retried', async () => {
      mockCreateWeeklyCycle.mockRejectedValueOnce(new Error('offline'));
      const screen = await openWeek('stress', 'normal');
      await waitFor(() => expect(screen.getByTestId('weekly-open-error')).toBeTruthy());

      // Second attempt, same selections: no re-answering the two questions.
      mockCreateWeeklyCycle.mockResolvedValue('cycle-1');
      fireEvent.press(screen.getByTestId('weekly-open-confirm'));
      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
      expect(mockCreateWeeklyCycle).toHaveBeenCalledTimes(2);
    });
  });

  describe('what is not on this screen', () => {
    test('no calendar-forecast affordance is rendered', async () => {
      // Spec 6.1 step 3 is deferred this slice. A disabled control standing in
      // for it would be a dead affordance, so there must be none at all.
      const screen = render(<WeeklyOpenScreen />);
      fireEvent.press(screen.getByTestId('weekly-open-outcome-focus'));

      expect(screen.queryByText(/calendar/i)).toBeNull();
      expect(screen.queryByTestId('weekly-open-calendar')).toBeNull();
    });
  });
});
