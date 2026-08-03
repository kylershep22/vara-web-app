// Today (spec 9) — what it protects: the action shown is the one the engine
// resolves for the stored outcome x capacity, the week-1 quick win surfaces and
// then stops, and the floor commitment appears only on a slammed week.

const mockReplace = jest.fn();
let mockRouteParams: { weekNumber?: number } | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
  useRoute: () => ({ params: mockRouteParams }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockGetLatestCycle = jest.fn();
const mockCountForOutcome = jest.fn();
const mockGetFloor = jest.fn();
jest.mock('../../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
}));
jest.mock('../../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { WeeklyTodayScreen } from '../WeeklyTodayScreen';
import { PROTOCOL_MATRIX } from '../../../weeklyEngine';

const cycle = (over: Record<string, unknown> = {}) => ({
  id: 'cycle-1',
  userId: 'u1',
  weekStart: '2026-08-03',
  outcome: 'focus',
  capacityInitial: 'normal',
  capacityCurrent: 'normal',
  protocolId: 'focus-normal',
  ...over,
});

async function renderToday() {
  const screen = render(<WeeklyTodayScreen />);
  await waitFor(() => expect(screen.getByTestId('weekly-today')).toBeTruthy());
  return screen;
}

describe('WeeklyTodayScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockRouteParams = { weekNumber: 1 };
    mockGetLatestCycle.mockReset().mockResolvedValue(cycle());
    mockCountForOutcome.mockReset().mockResolvedValue(1);
    mockGetFloor.mockReset().mockResolvedValue(null);
  });

  describe("today's action", () => {
    test('shows the daily action the engine resolves for the stored pair', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ outcome: 'routines', capacityInitial: 'slammed', capacityCurrent: 'slammed' })
      );
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-action').props.children).toBe(
        PROTOCOL_MATRIX.routines.slammed.dailyAction
      );
    });

    test('resolves a different pair to a different action', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ outcome: 'energy', capacityInitial: 'normal', capacityCurrent: 'normal' })
      );
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-action').props.children).toBe(
        PROTOCOL_MATRIX.energy.normal.dailyAction
      );
    });

    test('uses capacityCurrent, not capacityInitial', async () => {
      // The two are equal until the re-set control ships, but the current tier
      // is the one the user is living in, so it is what Today must render.
      mockGetLatestCycle.mockResolvedValue(
        cycle({ outcome: 'stress', capacityInitial: 'normal', capacityCurrent: 'slammed' })
      );
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-action').props.children).toBe(
        PROTOCOL_MATRIX.stress.slammed.dailyAction
      );
      expect(screen.getByTestId('weekly-today-action').props.children).not.toBe(
        PROTOCOL_MATRIX.stress.normal.dailyAction
      );
    });
  });

  describe('the week-1 quick win (spec 6.3)', () => {
    test('surfaces in week 1', async () => {
      mockRouteParams = { weekNumber: 1 };
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
    });

    test('is gone by week 2', async () => {
      mockRouteParams = { weekNumber: 2 };
      const screen = await renderToday();

      expect(screen.queryByTestId('weekly-today-quickwin')).toBeNull();
    });

    test('never renders the raw practice id', async () => {
      // The practice has no catalogue entry yet, so it shows as a marked copy
      // gap. Printing 'exhale-90s' at the user would be worse than the gap.
      mockRouteParams = { weekNumber: 1 };
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
      expect(screen.queryByText(/exhale-90s/)).toBeNull();
      // Marked as a gap instead. Several strings on this screen carry the
      // marker, so this asserts the quick-win one specifically.
      expect(screen.getByText(/COPY GAP.*not yet named/)).toBeTruthy();
    });

    test('recounts the week number when entered without the param', async () => {
      // Re-entry through the guard carries no param. The stored cycle IS
      // counted, so the raw count is the week number here, not count + 1.
      mockRouteParams = undefined;
      mockCountForOutcome.mockResolvedValue(1);
      const screen = await renderToday();

      expect(mockCountForOutcome).toHaveBeenCalledWith('u1', 'focus');
      expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
    });

    test('a recounted third week shows no quick win', async () => {
      mockRouteParams = undefined;
      mockCountForOutcome.mockResolvedValue(3);
      const screen = await renderToday();

      expect(screen.queryByTestId('weekly-today-quickwin')).toBeNull();
    });
  });

  describe('the floor commitment (spec 9, 10.1)', () => {
    test('shows on a slammed week', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ capacityInitial: 'slammed', capacityCurrent: 'slammed' })
      );
      mockGetFloor.mockResolvedValue('ten minutes outside');
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-floor')).toBeTruthy();
      expect(screen.getByText('ten minutes outside')).toBeTruthy();
    });

    test('is absent on a normal week, and is not even read', async () => {
      const screen = await renderToday();

      expect(screen.queryByTestId('weekly-today-floor')).toBeNull();
      expect(mockGetFloor).not.toHaveBeenCalled();
    });

    test('is absent on a limited week', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ capacityInitial: 'limited', capacityCurrent: 'limited' })
      );
      const screen = await renderToday();

      expect(screen.queryByTestId('weekly-today-floor')).toBeNull();
    });
  });

  describe('this week summary', () => {
    test('shows the outcome and the current capacity', async () => {
      mockGetLatestCycle.mockResolvedValue(
        cycle({ outcome: 'energy', capacityInitial: 'limited', capacityCurrent: 'limited' })
      );
      const screen = await renderToday();

      const summary = screen.getByTestId('weekly-today-summary');
      expect(summary).toBeTruthy();
      expect(screen.getByText(/Energy/)).toBeTruthy();
      expect(screen.getByText(/Limited/)).toBeTruthy();
    });
  });

  describe('routing and failure', () => {
    test('hands the decision back to the guard when there is no cycle', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      render(<WeeklyTodayScreen />);

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyEntry'));
    });

    test('a failed read shows an error rather than an empty week', async () => {
      mockGetLatestCycle.mockRejectedValue(new Error('offline'));
      const screen = render(<WeeklyTodayScreen />);

      await waitFor(() => expect(screen.getByTestId('weekly-today-error')).toBeTruthy());
      expect(screen.getByTestId('weekly-today-retry')).toBeTruthy();
    });
  });

  describe('what spec 9 forbids on this screen', () => {
    test('renders no completion CTA and no re-set control this slice', async () => {
      // Both land in later slices. Until then there must be nothing tappable
      // standing in for them.
      const screen = await renderToday();

      expect(screen.queryByText(/done/i)).toBeNull();
      expect(screen.queryByText(/this week changed/i)).toBeNull();
      expect(screen.queryByText(/%/)).toBeNull();
    });
  });
});
