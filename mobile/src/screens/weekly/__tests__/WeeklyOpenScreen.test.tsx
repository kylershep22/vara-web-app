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
  // Exposed only so the assertion below can prove the open NEVER calls it.
  // The week number has exactly one derivation and it lives on Today.
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
}));
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
    mockLogEvent.mockReset();
  });

  // The one wired analytics event this slice (spec 20). Everything asserted
  // here is behavior: which pair was chosen and which protocol it resolved to.
  // Nothing the user typed exists on this screen, and nothing content-shaped
  // may ever be added to this payload.
  describe('the weekly_open event', () => {
    test('fires once after a successful write, carrying the chosen pair', async () => {
      await openWeek('routines', 'limited');

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalledTimes(1));
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('u1');
      expect(name).toBe('weekly_open');
      expect(params).toEqual({
        outcome: 'routines',
        capacityInitial: 'limited',
        protocolId: PROTOCOL_MATRIX.routines.limited.id,
      });
    });

    test('carries behavior only, and no field beyond the three declared', async () => {
      // The audit surface for the content firewall at the call site. A key
      // appearing here that this test does not name is a key nobody decided to
      // collect.
      await openWeek('focus', 'slammed');

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
      const params = mockLogEvent.mock.calls[0][2];
      expect(Object.keys(params).sort()).toEqual([
        'capacityInitial',
        'outcome',
        'protocolId',
      ]);
    });

    test('does not fire when the cycle write fails', async () => {
      // No cycle, no open. An event for a week that was never opened would be
      // a straightforward lie in the funnel.
      mockCreateWeeklyCycle.mockRejectedValue(new Error('offline'));
      const screen = await openWeek('stress', 'normal');
      await waitFor(() => expect(screen.getByTestId('weekly-open-error')).toBeTruthy());

      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test('fires after the write lands and before navigating away', async () => {
      const order: string[] = [];
      mockCreateWeeklyCycle.mockImplementation(async () => {
        order.push('write');
        return 'cycle-1';
      });
      mockLogEvent.mockImplementation(() => {
        order.push('event');
      });
      mockReplace.mockImplementation(() => {
        order.push('navigate');
      });

      await openWeek('energy', 'normal');

      await waitFor(() => expect(order).toEqual(['write', 'event', 'navigate']));
    });

    test('a throwing analytics call still lets the user through', async () => {
      // logEvent is built never to throw, and this asserts the call site does
      // not depend on that promise. Telemetry must never be able to strand a
      // user on a screen whose work is already saved.
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });

      await openWeek('focus', 'normal');

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyToday'));
    });
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

  describe('the week number', () => {
    test('is not computed here, and no count is read', async () => {
      // One derivation, on Today. Counting here as well would read a different
      // database state (pre-write) than Today does (post-write), and the two
      // could then disagree about whether the same week gets the quick win.
      await openWeek('focus', 'normal');

      expect(mockCountForOutcome).not.toHaveBeenCalled();
    });

    test('is not handed forward as a route param', async () => {
      await openWeek('focus', 'normal');

      expect(mockReplace).toHaveBeenCalledWith('WeeklyToday');
      expect(mockReplace.mock.calls[0]).toHaveLength(1);
    });

    test('the cycle is persisted BEFORE navigating, so Today can count it', async () => {
      // This ordering is what makes the single derivation correct: Today's
      // count includes the current week only because the write has landed.
      const order: string[] = [];
      mockCreateWeeklyCycle.mockImplementation(async () => {
        order.push('write');
        return 'cycle-1';
      });
      mockReplace.mockImplementation(() => {
        order.push('navigate');
      });

      await openWeek('routines', 'normal');

      expect(order).toEqual(['write', 'navigate']);
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
