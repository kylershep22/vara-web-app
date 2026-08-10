// The entry guard (spec 6.1, 10.1) — the telemetry wiring.
//
// The routing RULE is tested purely in weeklyEntry.test.ts. What this file
// covers is the funnel event the screen fires around it: that all three targets
// are recorded, that the user's floor text cannot ride along, and that a read
// failure records nothing rather than guessing.

// TWO VERBS. 'floor' and 'open' are stack screens and are replaced into;
// 'today' is Home, a tab, and is navigated to. Which verb a target uses is part
// of what this suite pins.
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace, navigate: mockNavigate }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockGetFloor = jest.fn();
jest.mock('../../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
}));
const mockGetLatestCycle = jest.fn();
jest.mock('../../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
}));
// Mocked BEFORE the screen imports logEvent, for the reason the sibling suites
// spell out: the real writer swallows its own failures, so assertions against it
// pass for the wrong reason.
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
import { render, waitFor } from '@testing-library/react-native';
import { WeeklyEntryScreen } from '../WeeklyEntryScreen';
import { toIsoDate } from '../../../utils/weekStart';

/** The user's own words, which may never leave this screen. */
const FLOOR_TEXT = 'ten minutes of quiet';

const TODAY = toIsoDate(new Date());

async function route() {
  const screen = render(<WeeklyEntryScreen />);
  await waitFor(() =>
    expect(mockReplace.mock.calls.length + mockNavigate.mock.calls.length).toBeGreaterThan(0)
  );
  return screen;
}

describe('WeeklyEntryScreen', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockNavigate.mockReset();
    mockGetFloor.mockReset().mockResolvedValue(FLOOR_TEXT);
    mockGetLatestCycle.mockReset().mockResolvedValue({ weekStart: TODAY });
    mockLogEvent.mockReset();
  });

  describe('the weekly_entry event', () => {
    test('records the today branch', async () => {
      await route();

      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('u1');
      expect(name).toBe('weekly_entry');
      expect(params).toEqual({ route: 'today' });
    });

    test('records the open branch when the latest cycle is a past week', async () => {
      mockGetLatestCycle.mockResolvedValue({ weekStart: '2020-01-06' });
      await route();

      expect(mockLogEvent.mock.calls[0][2]).toEqual({ route: 'open' });
    });

    test('records the open branch when there is no cycle at all', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      await route();

      expect(mockLogEvent.mock.calls[0][2]).toEqual({ route: 'open' });
    });

    test('records the floor branch too, not only the two happy ones', async () => {
      // 'floor' is the first-run branch. Dropping it would make the denominator
      // of the funnel wrong rather than merely incomplete.
      mockGetFloor.mockResolvedValue(null);
      await route();

      expect(mockLogEvent.mock.calls[0][2]).toEqual({ route: 'floor' });
    });

    test('the route logged is the route navigated to', async () => {
      mockGetFloor.mockResolvedValue(null);
      await route();

      expect(mockLogEvent.mock.calls[0][2].route).toBe('floor');
      expect(mockReplace).toHaveBeenCalledWith('WeeklyFloor');
    });

    test('never carries the floor commitment text', async () => {
      // It is read ten lines above the call site, and even a boolean of it would
      // only restate `route === 'floor'`.
      await route();

      const params = mockLogEvent.mock.calls[0][2];
      expect(Object.keys(params)).toEqual(['route']);
      expect(JSON.stringify(mockLogEvent.mock.calls[0])).not.toContain('quiet');
    });

    test('fires before navigating', async () => {
      const order: string[] = [];
      mockLogEvent.mockImplementation(() => {
        order.push('event');
      });
      mockNavigate.mockImplementation(() => {
        order.push('navigate');
      });

      await route();

      expect(order).toEqual(['event', 'navigate']);
    });

    test('records nothing when the guard could not read its inputs', async () => {
      // The guard refuses to guess a route on a read failure, so there is no
      // route to record. A bucketed failure event here is a later decision, not
      // a silent 'open'.
      mockGetFloor.mockRejectedValue(new Error('offline'));
      const screen = render(<WeeklyEntryScreen />);

      await waitFor(() => expect(screen.getByTestId('weekly-entry-error')).toBeTruthy());
      expect(mockLogEvent).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('a throwing analytics call still routes the user', async () => {
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });

      await route();

      expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' });
    });
  });
});
