// Weekly open (spec 6.1) — the wiring test. What it protects: the ONE cycle
// written at confirm carries the pair the user chose, the protocol the engine
// resolved for that pair, and a capacityCurrent equal to the forecast.

// `navigate`, not `replace`: the confirmation lands on Home, a TAB inside Main,
// which cannot be replaced into.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockCreateWeeklyCycle = jest.fn();
const mockCountForOutcome = jest.fn();
const mockGetLatestCycle = jest.fn();
jest.mock('../../../services/firebase/weeklyCycle.service', () => ({
  createWeeklyCycle: (...a: any[]) => mockCreateWeeklyCycle(...a),
  // Exposed only so the assertion below can prove the open NEVER calls it.
  // The week number has exactly one derivation and it lives on Today.
  countWeeklyCyclesForOutcome: (...a: any[]) => mockCountForOutcome(...a),
  // Read to decide whether this open is the user's SETUP week (no prior cycle,
  // so it may be a partial stub) or a recurring one anchored to their start
  // day, and to keep the new week off days the previous one still covers.
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
}));
const mockGetUserPrivate = jest.fn();
const mockSetUserPrivate = jest.fn();
jest.mock('../../../services/firebase/userPrivate.service', () => ({
  getUserPrivate: (...a: any[]) => mockGetUserPrivate(...a),
  setUserPrivate: (...a: any[]) => mockSetUserPrivate(...a),
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
import {
  addDaysIso,
  isoWeekday,
  nextWeekStartAfter,
  toIsoDate,
} from '../../../utils/weekStart';

// The screen reads the real clock, so boundary expectations are built relative
// to today through the same helpers rather than hardcoded.
const TODAY = toIsoDate(new Date());

type Outcome = 'focus' | 'stress' | 'routines' | 'energy';
type Capacity = 'normal' | 'limited' | 'slammed';

/** Walk the three steps and press confirm. Does not wait for the write. */
function renderConfirm(outcome: Outcome, capacity: Capacity) {
  const screen = render(<WeeklyOpenScreen />);
  fireEvent.press(screen.getByTestId(`weekly-open-outcome-${outcome}`));
  fireEvent.press(screen.getByTestId(`weekly-open-capacity-${capacity}`));
  fireEvent.press(screen.getByTestId('weekly-open-confirm'));
  return screen;
}

/** Walk the three steps: outcome, capacity, confirm. */
async function openWeek(outcome: Outcome, capacity: Capacity) {
  const screen = renderConfirm(outcome, capacity);
  await waitFor(() => expect(mockCreateWeeklyCycle).toHaveBeenCalled());
  return screen;
}

/**
 * Render, WAIT for the mount-time week-start read to land, then walk to the
 * capacity answer. The wait is load-bearing: whether the week-start step exists
 * is decided by that read, and pressing through before it resolves is exactly
 * the case where the screen deliberately does not ask.
 */
async function walkToAfterCapacity(outcome: Outcome = 'focus', capacity: Capacity = 'normal') {
  const screen = render(<WeeklyOpenScreen />);
  await waitFor(() => expect(mockGetUserPrivate).toHaveBeenCalled());
  fireEvent.press(screen.getByTestId(`weekly-open-outcome-${outcome}`));
  fireEvent.press(screen.getByTestId(`weekly-open-capacity-${capacity}`));
  return screen;
}

describe('WeeklyOpenScreen — the week-start step', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCreateWeeklyCycle.mockReset().mockResolvedValue('cycle-1');
    mockCountForOutcome.mockReset().mockResolvedValue(0);
    mockGetUserPrivate.mockReset().mockResolvedValue(null);
    mockSetUserPrivate.mockReset().mockResolvedValue(undefined);
    mockGetLatestCycle.mockReset().mockResolvedValue(null);
    mockLogEvent.mockReset();
  });

  test('is offered to a user who has never chosen a start day', async () => {
    const screen = await walkToAfterCapacity();

    expect(screen.getByTestId('weekly-open-weekstart-0')).toBeTruthy();
  });

  test('is ABSENT for a user who already has one, leaving the wizard at three steps', async () => {
    // The whole point of the condition: this is capture, not editing. A user
    // with an anchor must never be re-asked.
    mockGetUserPrivate.mockResolvedValue({ weekStartDay: 2 });

    const screen = await walkToAfterCapacity();

    expect(screen.queryByTestId('weekly-open-weekstart-0')).toBeNull();
    expect(screen.getByTestId('weekly-open-confirm')).toBeTruthy();
  });

  test('persists the chosen day and anchors THIS week to it', async () => {
    const screen = await walkToAfterCapacity();

    fireEvent.press(screen.getByTestId('weekly-open-weekstart-4'));
    fireEvent.press(screen.getByTestId('weekly-open-weekstart-continue'));
    fireEvent.press(screen.getByTestId('weekly-open-confirm'));
    await waitFor(() => expect(mockCreateWeeklyCycle).toHaveBeenCalled());

    expect(mockSetUserPrivate).toHaveBeenCalledWith('u1', { weekStartDay: 4 });
    // Answered this run, so it must shape this week rather than only the next.
    const { weekStart, weekEnd } = mockCreateWeeklyCycle.mock.calls[0][1];
    expect(weekEnd).toBe(addDaysIso(nextWeekStartAfter(weekStart, 4), -1));
  });

  test('persists SUNDAY, which is 0 and would be dropped by a truthiness guard', async () => {
    const screen = await walkToAfterCapacity();

    fireEvent.press(screen.getByTestId('weekly-open-weekstart-0'));
    fireEvent.press(screen.getByTestId('weekly-open-weekstart-continue'));
    fireEvent.press(screen.getByTestId('weekly-open-confirm'));
    await waitFor(() => expect(mockCreateWeeklyCycle).toHaveBeenCalled());

    expect(mockSetUserPrivate).toHaveBeenCalledWith('u1', { weekStartDay: 0 });
  });

  test('skipping the step writes no preference and keeps open-date anchoring', async () => {
    const screen = await walkToAfterCapacity();

    fireEvent.press(screen.getByTestId('weekly-open-weekstart-continue'));
    fireEvent.press(screen.getByTestId('weekly-open-confirm'));
    await waitFor(() => expect(mockCreateWeeklyCycle).toHaveBeenCalled());

    expect(mockSetUserPrivate).not.toHaveBeenCalled();
    const { weekStart, weekEnd } = mockCreateWeeklyCycle.mock.calls[0][1];
    expect(weekStart).toBe(TODAY);
    expect(weekEnd).toBe(addDaysIso(TODAY, 6));
  });

  test('a failed week-start read does not ask, and the week still opens', async () => {
    // Failing by not asking is the right direction: the user keeps the
    // anchoring they already had rather than being interrogated over a blip.
    mockGetUserPrivate.mockRejectedValue(new Error('offline'));

    const screen = render(<WeeklyOpenScreen />);
    await waitFor(() => expect(mockGetUserPrivate).toHaveBeenCalled());
    fireEvent.press(screen.getByTestId('weekly-open-outcome-focus'));
    fireEvent.press(screen.getByTestId('weekly-open-capacity-normal'));

    expect(screen.queryByTestId('weekly-open-weekstart-0')).toBeNull();
  });

  test('back from the step returns to capacity, not past it', async () => {
    const screen = await walkToAfterCapacity();

    fireEvent.press(screen.getByTestId('weekly-open-back'));

    expect(screen.getByTestId('weekly-open-capacity-normal')).toBeTruthy();
  });
});

describe('WeeklyOpenScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCreateWeeklyCycle.mockReset().mockResolvedValue('cycle-1');
    mockCountForOutcome.mockReset().mockResolvedValue(0);
    // The default is the pre-picker state every user is in today: no chosen
    // start day and no prior cycle, which anchors the week on the open date
    // exactly as this screen always did.
    mockGetUserPrivate.mockReset().mockResolvedValue(null);
    mockSetUserPrivate.mockReset().mockResolvedValue(undefined);
    mockGetLatestCycle.mockReset().mockResolvedValue(null);
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
      mockNavigate.mockImplementation(() => {
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

      await waitFor(() =>
        expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' })
      );
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
        'weekEnd',
        'weekStart',
      ]);
    });

    test('with no chosen start day, weekStart is today — the pre-picker behavior', async () => {
      await openWeek('energy', 'normal');

      const { weekStart } = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(weekStart).toBe(TODAY);
    });

    test('with no chosen start day, the week still runs a full seven days', async () => {
      await openWeek('energy', 'normal');

      const { weekStart, weekEnd } = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(weekEnd).toBe(addDaysIso(weekStart, 6));
    });

    test('a chosen start day anchors the week to it rather than to the open date', async () => {
      // THE DEFECT 2 REGRESSION. The old write stamped the open date whatever
      // day it was, so the anchor drifted a little further every late open and
      // a chosen start day could never take hold. A recurring open (there is a
      // prior, finished cycle) must land on the start day.
      mockGetUserPrivate.mockResolvedValue({ weekStartDay: isoWeekday(TODAY) });
      mockGetLatestCycle.mockResolvedValue({
        weekStart: addDaysIso(TODAY, -10),
        weekEnd: addDaysIso(TODAY, -4),
      });

      await openWeek('focus', 'normal');

      const { weekStart, weekEnd } = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(isoWeekday(weekStart)).toBe(isoWeekday(TODAY));
      expect(weekEnd).toBe(addDaysIso(weekStart, 6));
    });

    test('a setup opened mid-week is a stub ending the day before the next start day', async () => {
      // No prior cycle, so this is the user's setup week. Start day is three
      // days out, making cycle 1 a three-day stub rather than a full week.
      mockGetUserPrivate.mockResolvedValue({
        weekStartDay: isoWeekday(addDaysIso(TODAY, 3)),
      });
      mockGetLatestCycle.mockResolvedValue(null);

      await openWeek('focus', 'normal');

      const { weekStart, weekEnd } = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(weekStart).toBe(TODAY);
      expect(weekEnd).toBe(addDaysIso(TODAY, 2));
    });

    test('a failed anchor read does not write a wrongly anchored week', async () => {
      // The plan cannot be built without these reads, and a week anchored on a
      // guess is not something a later pass would ever notice and correct.
      mockGetUserPrivate.mockRejectedValue(new Error('offline'));
      const screen = await renderConfirm('focus', 'normal');

      await waitFor(() => expect(screen.getByTestId('weekly-open-error')).toBeTruthy());
      expect(mockCreateWeeklyCycle).not.toHaveBeenCalled();
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

      expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' });
      // The params carry the tab and nothing else. A week number smuggled in
      // here would be the second derivation this rule exists to prevent.
      expect(mockNavigate.mock.calls[0][1]).toEqual({ screen: 'Home' });
    });

    test('the cycle is persisted BEFORE navigating, so Today can count it', async () => {
      // This ordering is what makes the single derivation correct: Today's
      // count includes the current week only because the write has landed.
      const order: string[] = [];
      mockCreateWeeklyCycle.mockImplementation(async () => {
        order.push('write');
        return 'cycle-1';
      });
      mockNavigate.mockImplementation(() => {
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
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('the confirm stays available so the write can be retried', async () => {
      mockCreateWeeklyCycle.mockRejectedValueOnce(new Error('offline'));
      const screen = await openWeek('stress', 'normal');
      await waitFor(() => expect(screen.getByTestId('weekly-open-error')).toBeTruthy());

      // Second attempt, same selections: no re-answering the two questions.
      mockCreateWeeklyCycle.mockResolvedValue('cycle-1');
      fireEvent.press(screen.getByTestId('weekly-open-confirm'));
      await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
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
