// Today (spec 9) — what it protects: the action shown is the one the engine
// resolves for the stored outcome x capacity, the week-1 quick win surfaces and
// then stops, and the floor commitment appears only on a slammed week.

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockGetLatestCycle = jest.fn();
const mockCountForOutcome = jest.fn();
const mockGetFloor = jest.fn();
const mockResetCapacity = jest.fn();
// The continuity read. Mocked here rather than left off the mock: an absent
// export would throw inside the screen's best-effort catch and leave every
// continuity assertion below passing for the wrong reason.
const mockGetCyclesForUser = jest.fn();
jest.mock('../../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
  resetWeeklyCapacity: (...a: any[]) => mockResetCapacity(...a),
  getWeeklyCyclesForUser: (...a: any[]) => mockGetCyclesForUser(...a),
}));
jest.mock('../../../services/firebase/userPrivate.service', () => ({
  getFloorCommitment: (...a: any[]) => mockGetFloor(...a),
}));
// Mocked BEFORE the screen imports logEvent. Left off, the real writer would
// load here and reach for firebase/firestore and expo-constants, and every
// assertion below about what was logged would pass against a service that
// silently swallowed its own failure.
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
    mockGetLatestCycle.mockReset().mockResolvedValue(cycle());
    mockCountForOutcome.mockReset().mockResolvedValue(1);
    mockGetFloor.mockReset().mockResolvedValue(null);
    mockResetCapacity.mockReset().mockResolvedValue(undefined);
    // No closed weeks by default, so continuity is silent unless a test says
    // otherwise.
    mockGetCyclesForUser.mockReset().mockResolvedValue([]);
    mockLogEvent.mockReset();
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
    // The week number has ONE derivation: the count of stored cycles for the
    // active outcome, including the current week's. Nothing hands one in.
    test('surfaces when the outcome has one stored cycle', async () => {
      mockCountForOutcome.mockResolvedValue(1);
      const screen = await renderToday();

      expect(mockCountForOutcome).toHaveBeenCalledWith('u1', 'focus');
      expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
    });

    test('is gone once the outcome has two stored cycles', async () => {
      mockCountForOutcome.mockResolvedValue(2);
      const screen = await renderToday();

      expect(screen.queryByTestId('weekly-today-quickwin')).toBeNull();
    });

    test('is gone in a long-running third week', async () => {
      mockCountForOutcome.mockResolvedValue(3);
      const screen = await renderToday();

      expect(screen.queryByTestId('weekly-today-quickwin')).toBeNull();
    });

    test("counts against the cycle's own outcome, not a fixed one", async () => {
      mockGetLatestCycle.mockResolvedValue(cycle({ outcome: 'energy' }));
      mockCountForOutcome.mockResolvedValue(1);
      await renderToday();

      expect(mockCountForOutcome).toHaveBeenCalledWith('u1', 'energy');
    });

    test('never renders the raw practice id', async () => {
      // The practice has no catalogue entry yet, so it shows as a marked copy
      // gap. Printing 'exhale-90s' at the user would be worse than the gap.
      mockCountForOutcome.mockResolvedValue(1);
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
      expect(screen.queryByText(/exhale-90s/)).toBeNull();
      // Several strings on this screen carry the marker, so this asserts the
      // quick-win one specifically.
      expect(screen.getByText(/COPY GAP.*not yet named/)).toBeTruthy();
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
    test('renders no completion CTA this slice', async () => {
      // The completion CTA lands in a later slice. Until then there must be
      // nothing tappable standing in for it. The re-set control below IS
      // present now, so it is no longer covered by this test.
      const screen = await renderToday();

      expect(screen.queryByText(/done/i)).toBeNull();
      expect(screen.queryByText(/%/)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // The dynamic in-week re-set (spec 7), always visible per spec 9
  // -------------------------------------------------------------------------

  describe('the re-set control', () => {
    /**
     * The screen reloads after a re-set rather than patching state locally, so
     * a re-set test has to model the SECOND read too. This queues the cycle the
     * batch would have written, which is what makes the floor-card assertions
     * below real: the floor is only fetched during a load.
     */
    const cycleThenCycle = (first: object, second: object) => {
      mockGetLatestCycle.mockReset();
      mockGetLatestCycle.mockResolvedValueOnce(first).mockResolvedValue(second);
    };

    describe('presence and placement', () => {
      test('is always visible on a normal week', async () => {
        const screen = await renderToday();

        expect(screen.getByTestId('weekly-today-reset')).toBeTruthy();
      });

      test('is always visible on a slammed week, alongside the floor card', async () => {
        mockGetLatestCycle.mockResolvedValue(
          cycle({ capacityInitial: 'slammed', capacityCurrent: 'slammed' })
        );
        mockGetFloor.mockResolvedValue('ten minutes outside');
        const screen = await renderToday();

        expect(screen.getByTestId('weekly-today-reset')).toBeTruthy();
        expect(screen.getByTestId('weekly-today-floor')).toBeTruthy();
      });

      test('offers both directions from the middle tier', async () => {
        mockGetLatestCycle.mockResolvedValue(
          cycle({ capacityInitial: 'limited', capacityCurrent: 'limited' })
        );
        const screen = await renderToday();

        expect(screen.getByTestId('weekly-today-reset-down')).toBeTruthy();
        expect(screen.getByTestId('weekly-today-reset-up')).toBeTruthy();
      });
    });

    describe('the edges of the ladder', () => {
      test('at slammed there is no down action', async () => {
        mockGetLatestCycle.mockResolvedValue(
          cycle({ capacityInitial: 'slammed', capacityCurrent: 'slammed' })
        );
        const screen = await renderToday();

        expect(screen.queryByTestId('weekly-today-reset-down')).toBeNull();
        expect(screen.getByTestId('weekly-today-reset-up')).toBeTruthy();
      });

      test('at normal there is no up action', async () => {
        const screen = await renderToday();

        expect(screen.queryByTestId('weekly-today-reset-up')).toBeNull();
        expect(screen.getByTestId('weekly-today-reset-down')).toBeTruthy();
      });

      test('an unavailable direction is absent, never a button that does nothing', async () => {
        // A tappable that does not respond teaches the user the screen is
        // broken. The edge renders as a note instead.
        const screen = await renderToday();

        expect(screen.queryByTestId('weekly-today-reset-up')).toBeNull();
        expect(screen.getByTestId('weekly-today-reset-edge')).toBeTruthy();
      });
    });

    describe('down-tiering', () => {
      test('writes the transition it displayed, from the current tier', async () => {
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() =>
          expect(mockResetCapacity).toHaveBeenCalledWith('u1', 'cycle-1', 'normal', 'limited')
        );
      });

      test('re-serves the SAME outcome at the next capacity down', async () => {
        cycleThenCycle(
          cycle({ outcome: 'stress' }),
          cycle({ outcome: 'stress', capacityCurrent: 'limited' })
        );
        const screen = await renderToday();
        expect(screen.getByTestId('weekly-today-action').props.children).toBe(
          PROTOCOL_MATRIX.stress.normal.dailyAction
        );

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() =>
          expect(screen.getByTestId('weekly-today-action').props.children).toBe(
            PROTOCOL_MATRIX.stress.limited.dailyAction
          )
        );
      });

      test('steps one rung at a time, normal to limited and not to slammed', async () => {
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(mockResetCapacity).toHaveBeenCalled());
        expect(mockResetCapacity.mock.calls[0][3]).toBe('limited');
      });

      test('crossing into slammed brings the floor card with it', async () => {
        // The floor is read only during a load, and only when slammed. This is
        // the assertion that fails if the re-set ever patches state locally
        // instead of reloading.
        cycleThenCycle(
          cycle({ capacityCurrent: 'limited' }),
          cycle({ capacityCurrent: 'slammed' })
        );
        mockGetFloor.mockResolvedValue('ten minutes outside');
        const screen = await renderToday();
        expect(screen.queryByTestId('weekly-today-floor')).toBeNull();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(screen.getByTestId('weekly-today-floor')).toBeTruthy());
        expect(screen.getByText('ten minutes outside')).toBeTruthy();
      });
    });

    describe('up-tiering', () => {
      test('writes the transition it displayed, upwards', async () => {
        mockGetLatestCycle.mockResolvedValue(
          cycle({ capacityInitial: 'slammed', capacityCurrent: 'slammed' })
        );
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-up'));

        await waitFor(() =>
          expect(mockResetCapacity).toHaveBeenCalledWith('u1', 'cycle-1', 'slammed', 'limited')
        );
      });

      test('re-serves the same outcome at the next capacity up', async () => {
        cycleThenCycle(
          cycle({ outcome: 'energy', capacityCurrent: 'slammed' }),
          cycle({ outcome: 'energy', capacityCurrent: 'limited' })
        );
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-up'));

        await waitFor(() =>
          expect(screen.getByTestId('weekly-today-action').props.children).toBe(
            PROTOCOL_MATRIX.energy.limited.dailyAction
          )
        );
      });

      test('leaving slammed takes the floor card away', async () => {
        cycleThenCycle(
          cycle({ capacityCurrent: 'slammed' }),
          cycle({ capacityCurrent: 'limited' })
        );
        mockGetFloor.mockResolvedValue('ten minutes outside');
        const screen = await renderToday();
        expect(screen.getByTestId('weekly-today-floor')).toBeTruthy();

        fireEvent.press(screen.getByTestId('weekly-today-reset-up'));

        // Wait on the POSITIVE signal that the reload landed before asserting
        // the card is gone. Waiting only on the absence would pass on a screen
        // that had not reloaded at all, since the card is also absent for a
        // moment before the new view is set.
        await waitFor(() => expect(screen.getByText(/Limited/)).toBeTruthy());
        expect(screen.queryByTestId('weekly-today-floor')).toBeNull();
        // The floor is read once, on the slammed load, and not again.
        expect(mockGetFloor).toHaveBeenCalledTimes(1);
      });
    });

    describe('one tap, no confirmation (spec 7)', () => {
      test('a single press writes immediately, with no dialog in between', async () => {
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(mockResetCapacity).toHaveBeenCalledTimes(1));
      });

      test('the summary follows the new tier after the reload', async () => {
        cycleThenCycle(cycle(), cycle({ capacityCurrent: 'limited' }));
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(screen.getByText(/Limited/)).toBeTruthy());
      });
    });

    describe('when the batch fails', () => {
      test('shows a supportive error instead of crashing', async () => {
        mockResetCapacity.mockRejectedValue(new Error('permission denied'));
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(screen.getByTestId('weekly-today-reset-error')).toBeTruthy());
      });

      test('leaves the tier and the action exactly as they were', async () => {
        mockResetCapacity.mockRejectedValue(new Error('permission denied'));
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(screen.getByTestId('weekly-today-reset-error')).toBeTruthy());
        expect(screen.getByTestId('weekly-today-action').props.children).toBe(
          PROTOCOL_MATRIX.focus.normal.dailyAction
        );
        expect(screen.getByText(/Normal/)).toBeTruthy();
      });

      test('keeps the week on screen rather than replacing it with the load error', async () => {
        // A failed re-set is not a failed week. The screen still has a valid
        // cycle to show, so the whole-screen error state must not take over.
        mockResetCapacity.mockRejectedValue(new Error('permission denied'));
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(screen.getByTestId('weekly-today-reset-error')).toBeTruthy());
        expect(screen.getByTestId('weekly-today')).toBeTruthy();
        expect(screen.queryByTestId('weekly-today-error')).toBeNull();
      });

      test('a retry after a failure works', async () => {
        mockResetCapacity.mockRejectedValueOnce(new Error('offline'));
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));
        await waitFor(() => expect(screen.getByTestId('weekly-today-reset-error')).toBeTruthy());

        mockGetLatestCycle.mockResolvedValue(cycle({ capacityCurrent: 'limited' }));
        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        // Same rule as above: wait for the reload to land, then assert the
        // error is gone. The error clearing is a state change, not a timeout.
        await waitFor(() => expect(screen.getByText(/Limited/)).toBeTruthy());
        expect(mockResetCapacity).toHaveBeenCalledTimes(2);
        expect(screen.queryByTestId('weekly-today-reset-error')).toBeNull();
      });
    });

    describe('the re-set never writes continuity', () => {
      test('the re-set writes only the four arguments the service takes', async () => {
        // Re-set FREQUENCY is read off the downshiftEvents log the service
        // batches atomically with the tier change, not off anything this screen
        // passes. Today writes and moves on.
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(mockResetCapacity).toHaveBeenCalled());
        expect(mockResetCapacity.mock.calls[0]).toHaveLength(4);
      });
    });

    describe('the reset_failed event', () => {
      test('a successful re-set logs NOTHING', async () => {
        // The deliberate absence. downshiftEvents already carries the from/to
        // pair, atomically with the tier change; a second non-atomic copy could
        // disagree with it. If this test ever needs changing, that decision is
        // what is being reversed.
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(mockResetCapacity).toHaveBeenCalled());
        expect(mockLogEvent).not.toHaveBeenCalled();
      });

      test('fires once on failure, carrying the transition the user tapped', async () => {
        mockResetCapacity.mockRejectedValue(
          Object.assign(new Error('nope'), { code: 'permission-denied' })
        );
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(mockLogEvent).toHaveBeenCalledTimes(1));
        const [uid, name, params] = mockLogEvent.mock.calls[0];
        expect(uid).toBe('u1');
        expect(name).toBe('reset_failed');
        expect(params).toEqual({
          fromCapacity: 'normal',
          toCapacity: 'limited',
          reason: 'permission-denied',
        });
      });

      test('an unrecognised failure is bucketed, never passed through', async () => {
        // The content hazard on this event: 'offline' is 7 characters, so the
        // writer's length backstop would keep it. Only the mapper stops it.
        mockResetCapacity.mockRejectedValue(new Error('offline'));
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
        const params = mockLogEvent.mock.calls[0][2];
        expect(params.reason).toBe('unknown');
        expect(JSON.stringify(params)).not.toContain('offline');
      });

      test('carries no field beyond the three declared', async () => {
        mockResetCapacity.mockRejectedValue(new Error('offline'));
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
        expect(Object.keys(mockLogEvent.mock.calls[0][2]).sort()).toEqual([
          'fromCapacity',
          'reason',
          'toCapacity',
        ]);
      });

      test('a throwing analytics call still shows the user the error', async () => {
        mockResetCapacity.mockRejectedValue(new Error('offline'));
        mockLogEvent.mockImplementation(() => {
          throw new Error('analytics exploded');
        });
        const screen = await renderToday();

        fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

        await waitFor(() =>
          expect(screen.getByTestId('weekly-today-reset-error')).toBeTruthy()
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // The close entry (spec 8)
  // -------------------------------------------------------------------------

  describe('the weekly_close_entry event', () => {
    test('fires once on the tap, with an empty payload', async () => {
      const screen = await renderToday();

      fireEvent.press(screen.getByTestId('weekly-today-close-entry'));

      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('u1');
      expect(name).toBe('weekly_close_entry');
      expect(params).toEqual({});
    });

    test('fires on the TAP, not after any write', async () => {
      // This event is an INTENT, and its value is entirely the gap between it
      // and weekly_close: a tap with no close is the abandon signal. Nothing
      // must ever move it behind a success branch to match the other events.
      const order: string[] = [];
      mockLogEvent.mockImplementation(() => {
        order.push('event');
      });
      mockReplace.mockImplementation(() => {
        order.push('navigate');
      });
      const screen = await renderToday();

      fireEvent.press(screen.getByTestId('weekly-today-close-entry'));

      expect(order).toEqual(['event', 'navigate']);
    });

    test('a throwing analytics call still navigates to the close', async () => {
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });
      const screen = await renderToday();

      fireEvent.press(screen.getByTestId('weekly-today-close-entry'));

      expect(mockReplace).toHaveBeenCalledWith('WeeklyClose');
    });

    test('does not fire on a plain render of Today', async () => {
      // No render-fired events anywhere on this screen. Continuity in
      // particular rides on the close, not on this mount, precisely so the log
      // is not dominated by Today re-entries.
      await renderToday();

      expect(mockLogEvent).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Continuity (spec 1), below the fold per spec 9
  // -------------------------------------------------------------------------

  describe('the continuity count', () => {
    /** A stored cycle, as the continuity read returns it. */
    const closed = (weekStart: string, floorMet?: boolean) => ({
      ...cycle({ id: `c-${weekStart}`, weekStart }),
      ...(floorMet === undefined ? {} : { floorMet }),
    });

    test('shows the run of unbroken weeks as a count', async () => {
      mockGetCyclesForUser.mockResolvedValue([
        closed('2026-07-20', true),
        closed('2026-07-27', true),
        closed('2026-08-03', true),
      ]);
      const screen = await renderToday();

      await waitFor(() =>
        expect(screen.getByTestId('weekly-today-continuity')).toBeTruthy()
      );
      expect(screen.getByText(/3 weeks/)).toBeTruthy();
    });

    test('counts only back to the break, not the whole history', async () => {
      mockGetCyclesForUser.mockResolvedValue([
        closed('2026-07-13', true),
        closed('2026-07-20', false),
        closed('2026-07-27', true),
        closed('2026-08-03', true),
      ]);
      const screen = await renderToday();

      await waitFor(() =>
        expect(screen.getByTestId('weekly-today-continuity')).toBeTruthy()
      );
      expect(screen.getByText(/2 weeks/)).toBeTruthy();
      expect(screen.queryByText(/4 weeks/)).toBeNull();
    });

    test('counts correctly when the history arrives newest first', async () => {
      // The service does not promise an order. If the ascending sort in the
      // mapper were dropped, this history would count 1 instead of 3.
      mockGetCyclesForUser.mockResolvedValue([
        closed('2026-08-03', true),
        closed('2026-07-27', true),
        closed('2026-07-20', true),
        closed('2026-07-13', false),
      ]);
      const screen = await renderToday();

      await waitFor(() =>
        expect(screen.getByTestId('weekly-today-continuity')).toBeTruthy()
      );
      expect(screen.getByText(/3 weeks/)).toBeTruthy();
    });

    test('reads the singular for a single week', async () => {
      mockGetCyclesForUser.mockResolvedValue([closed('2026-08-03', true)]);
      const screen = await renderToday();

      await waitFor(() =>
        expect(screen.getByTestId('weekly-today-continuity')).toBeTruthy()
      );
      expect(screen.getByText(/1 week /)).toBeTruthy();
    });

    describe('zero is silent, never a deficit', () => {
      test('renders nothing at all when no week has been closed', async () => {
        mockGetCyclesForUser.mockResolvedValue([closed('2026-08-03')]);
        const screen = await renderToday();

        expect(screen.queryByTestId('weekly-today-continuity')).toBeNull();
        expect(screen.queryByText(/0 week/)).toBeNull();
      });

      test('renders nothing when the run has just broken', async () => {
        // The week they missed is the week they most need this screen not to
        // score them. Spec 9 forbids anything red; a "0" is the same thing in
        // numerals.
        mockGetCyclesForUser.mockResolvedValue([
          closed('2026-07-27', true),
          closed('2026-08-03', false),
        ]);
        const screen = await renderToday();

        expect(screen.queryByTestId('weekly-today-continuity')).toBeNull();
      });

      test('renders no percentage, bar or fraction with the count', async () => {
        mockGetCyclesForUser.mockResolvedValue([
          closed('2026-07-27', true),
          closed('2026-08-03', true),
        ]);
        const screen = await renderToday();

        await waitFor(() =>
          expect(screen.getByTestId('weekly-today-continuity')).toBeTruthy()
        );
        expect(screen.queryByText(/%/)).toBeNull();
        expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
      });
    });

    describe('when the continuity read fails', () => {
      test('the week still renders', async () => {
        // Continuity is below the fold. A failure there is a reason to show one
        // thing less, not to replace a valid week with an error screen.
        mockGetCyclesForUser.mockRejectedValue(new Error('offline'));
        const screen = await renderToday();

        expect(screen.getByTestId('weekly-today-action')).toBeTruthy();
        expect(screen.queryByTestId('weekly-today-error')).toBeNull();
      });

      test('shows no count rather than a zero it never read', async () => {
        mockGetCyclesForUser.mockRejectedValue(new Error('offline'));
        const screen = await renderToday();

        expect(screen.queryByTestId('weekly-today-continuity')).toBeNull();
      });
    });

    test('refreshes after a re-set reload', async () => {
      // The count comes from the same load effect as everything else, so a
      // reload picks up a close that happened in between.
      mockGetCyclesForUser
        .mockResolvedValueOnce([closed('2026-08-03', true)])
        .mockResolvedValue([closed('2026-07-27', true), closed('2026-08-03', true)]);
      const screen = await renderToday();
      await waitFor(() => expect(screen.getByText(/1 week /)).toBeTruthy());

      fireEvent.press(screen.getByTestId('weekly-today-reset-down'));

      await waitFor(() => expect(screen.getByText(/2 weeks/)).toBeTruthy());
    });
  });

  // -------------------------------------------------------------------------
  // The weekly close entry (spec 8)
  // -------------------------------------------------------------------------

  describe('the close entry', () => {
    test('is on the screen', async () => {
      const screen = await renderToday();

      expect(screen.getByTestId('weekly-today-close-entry')).toBeTruthy();
    });

    test('opens the close', async () => {
      const screen = await renderToday();

      fireEvent.press(screen.getByTestId('weekly-today-close-entry'));

      expect(mockReplace).toHaveBeenCalledWith('WeeklyClose');
    });

    test('is present whether or not there is a continuity count to show', async () => {
      mockGetCyclesForUser.mockResolvedValue([
        cycle({ id: 'c1', weekStart: '2026-07-27', floorMet: true }),
      ]);
      const screen = await renderToday();

      await waitFor(() =>
        expect(screen.getByTestId('weekly-today-continuity')).toBeTruthy()
      );
      expect(screen.getByTestId('weekly-today-close-entry')).toBeTruthy();
    });
  });
});
