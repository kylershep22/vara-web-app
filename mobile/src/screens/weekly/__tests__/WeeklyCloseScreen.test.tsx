// The weekly close (spec 8) — what it protects: every answer is one tap, the
// adjustment is genuinely single-choice, the note is genuinely skippable, and
// the floor answer the user gave is the boolean that reaches storage.

// TWO NAVIGATION VERBS, and which one is used carries meaning.
//
//   replace  the no-cycle bail-out, which hands the decision back to the entry
//            guard. Still a stack-to-stack move.
//   navigate the post-close terminal. Home is a TAB, not a stack screen, so it
//            is reached through its navigator (Main -> Home) and cannot be
//            replaced into. `replace(Main)` would push a second Main on top of
//            the one already at the root.
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace, navigate: mockNavigate }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockGetLatestCycle = jest.fn();
const mockCloseCycle = jest.fn();
jest.mock('../../../services/firebase/weeklyCycle.service', () => ({
  getLatestWeeklyCycle: (...a: any[]) => mockGetLatestCycle(...a),
  closeWeeklyCycle: (...a: any[]) => mockCloseCycle(...a),
}));
// The continuity read, mocked at the seam rather than through the service.
// Mocked rather than left off deliberately: an absent export throws inside the
// screen's best-effort catch, continuity stays null, and every assertion about
// the close event's payload then passes against an event that never fired.
const mockLoadContinuity = jest.fn();
jest.mock('../weeklyContinuity', () => ({
  loadWeeklyContinuity: (...a: any[]) => mockLoadContinuity(...a),
}));
// Mocked BEFORE the screen imports logEvent, for the reason spelled out in the
// Today suite: the real writer would load and swallow, and the assertions would
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
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { WeeklyCloseScreen } from '../WeeklyCloseScreen';
import { ADJUSTMENT_KEYS } from '../copy';

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

async function renderClose() {
  const screen = render(<WeeklyCloseScreen />);
  await waitFor(() => expect(screen.getByTestId('weekly-close')).toBeTruthy());
  return screen;
}

/** Answer everything the close requires, leaving the note blank. */
function answerAll(
  screen: ReturnType<typeof render>,
  opts: { floorMet?: boolean; adjustment?: string } = {}
) {
  fireEvent.press(screen.getByTestId('weekly-close-rating-focus-4'));
  fireEvent.press(screen.getByTestId('weekly-close-rating-recovery-2'));
  fireEvent.press(screen.getByTestId('weekly-close-rating-energy-3'));
  fireEvent.press(
    screen.getByTestId(
      opts.floorMet === false ? 'weekly-close-floor-no' : 'weekly-close-floor-yes'
    )
  );
  fireEvent.press(
    screen.getByTestId(`weekly-close-adjustment-${opts.adjustment ?? 'smaller-daily-action'}`)
  );
}

describe('WeeklyCloseScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockNavigate.mockClear();
    mockGetLatestCycle.mockReset().mockResolvedValue(cycle());
    mockCloseCycle.mockReset().mockResolvedValue(undefined);
    mockLoadContinuity.mockReset().mockResolvedValue(3);
    mockLogEvent.mockReset();
  });

  describe('the three ratings (spec 8.2)', () => {
    test('offers 1 to 5 for each of focus, recovery and energy', async () => {
      const screen = await renderClose();

      for (const key of ['focus', 'recovery', 'energy']) {
        for (const value of [1, 2, 3, 4, 5]) {
          expect(screen.getByTestId(`weekly-close-rating-${key}-${value}`)).toBeTruthy();
        }
      }
    });

    test('one tap selects, with nothing else to confirm it', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-rating-focus-4'));

      expect(
        screen.getByTestId('weekly-close-rating-focus-4').props.accessibilityState.selected
      ).toBe(true);
    });

    test('a second tap on the same row REPLACES the value rather than adding one', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-rating-focus-4'));
      fireEvent.press(screen.getByTestId('weekly-close-rating-focus-2'));

      expect(
        screen.getByTestId('weekly-close-rating-focus-2').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('weekly-close-rating-focus-4').props.accessibilityState.selected
      ).toBe(false);
    });

    test('the three rows are independent of one another', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-rating-focus-5'));
      fireEvent.press(screen.getByTestId('weekly-close-rating-energy-1'));

      expect(
        screen.getByTestId('weekly-close-rating-focus-5').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('weekly-close-rating-energy-1').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('weekly-close-rating-recovery-5').props.accessibilityState.selected
      ).toBe(false);
    });

    test('shows no total, average or grade across the three', async () => {
      const screen = await renderClose();

      answerAll(screen);

      expect(screen.queryByText(/%/)).toBeNull();
      expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
      expect(screen.queryByText(/score|total|average/i)).toBeNull();
    });
  });

  describe('the floor question (open item #10, self-reported)', () => {
    test('offers both answers', async () => {
      const screen = await renderClose();

      expect(screen.getByTestId('weekly-close-floor-yes')).toBeTruthy();
      expect(screen.getByTestId('weekly-close-floor-no')).toBeTruthy();
    });

    test('is one tap either way, with no confirmation on the no', async () => {
      // A "are you sure?" on the no is how a false yes gets manufactured.
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-floor-no'));

      expect(
        screen.getByTestId('weekly-close-floor-no').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('weekly-close-floor-yes').props.accessibilityState.selected
      ).toBe(false);
    });

    test('changing the answer replaces it', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-floor-no'));
      fireEvent.press(screen.getByTestId('weekly-close-floor-yes'));

      expect(
        screen.getByTestId('weekly-close-floor-yes').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('weekly-close-floor-no').props.accessibilityState.selected
      ).toBe(false);
    });

    test('frames neither answer as a failure', async () => {
      const screen = await renderClose();

      expect(screen.queryByText(/fail|missed out|behind|broke/i)).toBeNull();
    });
  });

  describe('the adjustment is exactly one (spec 8.4, hard enforced)', () => {
    test('offers the fixed set', async () => {
      const screen = await renderClose();

      for (const key of ADJUSTMENT_KEYS) {
        expect(screen.getByTestId(`weekly-close-adjustment-${key}`)).toBeTruthy();
      }
    });

    test('picking a second REPLACES the first, so only one is ever selected', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-adjustment-smaller-daily-action'));
      fireEvent.press(screen.getByTestId('weekly-close-adjustment-different-time'));

      const selected = ADJUSTMENT_KEYS.filter(
        (key) =>
          screen.getByTestId(`weekly-close-adjustment-${key}`).props.accessibilityState
            .selected
      );
      expect(selected).toEqual(['different-time']);
    });

    test('never has two selected, however many are tapped', async () => {
      const screen = await renderClose();

      for (const key of ADJUSTMENT_KEYS) {
        fireEvent.press(screen.getByTestId(`weekly-close-adjustment-${key}`));
      }

      const selected = ADJUSTMENT_KEYS.filter(
        (key) =>
          screen.getByTestId(`weekly-close-adjustment-${key}`).props.accessibilityState
            .selected
      );
      expect(selected).toHaveLength(1);
    });

    test('is still single-select in the UI, though nothing stores it now', async () => {
      // THE ADJUSTMENT IS COLLECTED AND DISCARDED for one slice (journey 3b
      // stopped the write, slice 6 drops the question). The single-select
      // behaviour is asserted where it still exists, on screen, so this suite
      // does not quietly lose the constraint before slice 6 removes the
      // control that carries it.
      const screen = await renderClose();

      answerAll(screen, { adjustment: 'different-outcome' });
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle.mock.calls[0][1]).not.toHaveProperty('adjustmentSelected');
    });
  });

  describe('what the save writes', () => {
    test('sends the floor answer and the note against the cycle id, and nothing else', async () => {
      // The write-set is the live-reader set (journey slice 3b). The ratings
      // and the adjustment are still ANSWERED above and are deliberately not
      // here: nothing reads them and slice 6 removes the questions.
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle).toHaveBeenCalledWith('cycle-1', {
        closeNote: '',
        floorMet: true,
      });
    });

    test('sends floorMet false when the user said no', async () => {
      // The whole of continuity rides on this boolean being the answer the user
      // actually gave.
      const screen = await renderClose();

      answerAll(screen, { floorMet: false });
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle.mock.calls[0][1].floorMet).toBe(false);
    });

    test('sends the note when one was written', async () => {
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.changeText(
        screen.getByTestId('weekly-close-note'),
        'the late days were the ones that slipped'
      );
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle.mock.calls[0][1].closeNote).toBe(
        'the late days were the ones that slipped'
      );
    });

    test('never sends a closeCompletedAt, which the service stamps', async () => {
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle.mock.calls[0][1]).not.toHaveProperty('closeCompletedAt');
    });

    test('never sends a tier, so the close cannot rewrite what the week was', async () => {
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      const written = mockCloseCycle.mock.calls[0][1];
      expect(written).not.toHaveProperty('capacityCurrent');
      expect(written).not.toHaveProperty('capacityInitial');
    });

    test('lands on Today, which re-reads the count', async () => {
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' }));
    });
  });

  describe('the note is skippable (spec 8.3)', () => {
    test('the save is available with the note untouched', async () => {
      const screen = await renderClose();

      answerAll(screen);

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        false
      );
    });

    test('a skipped note still closes the week', async () => {
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' }));
    });
  });

  describe('the save is unavailable until the week is answered', () => {
    test('is disabled on arrival, with the reason on screen', async () => {
      const screen = await renderClose();

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        true
      );
      expect(screen.getByTestId('weekly-close-required')).toBeTruthy();
    });

    test('stays disabled with a rating missing', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-rating-focus-4'));
      fireEvent.press(screen.getByTestId('weekly-close-rating-recovery-2'));
      fireEvent.press(screen.getByTestId('weekly-close-floor-yes'));
      fireEvent.press(screen.getByTestId('weekly-close-adjustment-same-again'));

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        true
      );
    });

    test('stays disabled with the floor question unanswered', async () => {
      // Continuity has no input without it, so this one cannot be skipped.
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-rating-focus-4'));
      fireEvent.press(screen.getByTestId('weekly-close-rating-recovery-2'));
      fireEvent.press(screen.getByTestId('weekly-close-rating-energy-3'));
      fireEvent.press(screen.getByTestId('weekly-close-adjustment-same-again'));

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        true
      );
    });

    test('stays disabled with no adjustment chosen', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-rating-focus-4'));
      fireEvent.press(screen.getByTestId('weekly-close-rating-recovery-2'));
      fireEvent.press(screen.getByTestId('weekly-close-rating-energy-3'));
      fireEvent.press(screen.getByTestId('weekly-close-floor-yes'));

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        true
      );
    });

    test('writes nothing while it is disabled', async () => {
      const screen = await renderClose();

      fireEvent.press(screen.getByTestId('weekly-close-save'));

      expect(mockCloseCycle).not.toHaveBeenCalled();
    });

    test('becomes available once every required answer is given', async () => {
      const screen = await renderClose();

      answerAll(screen);

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        false
      );
      expect(screen.queryByTestId('weekly-close-required')).toBeNull();
    });
  });

  describe('when the write fails', () => {
    test('shows a supportive error instead of crashing', async () => {
      mockCloseCycle.mockRejectedValue(new Error('permission denied'));
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(screen.getByTestId('weekly-close-error')).toBeTruthy());
    });

    test('does NOT navigate, so the user is not told a week closed that did not', async () => {
      mockCloseCycle.mockRejectedValue(new Error('permission denied'));
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(screen.getByTestId('weekly-close-error')).toBeTruthy());
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('keeps every answer, so a retry is one tap and not five', async () => {
      mockCloseCycle.mockRejectedValueOnce(new Error('offline'));
      const screen = await renderClose();

      answerAll(screen, { floorMet: false, adjustment: 'different-time' });
      fireEvent.press(screen.getByTestId('weekly-close-save'));
      await waitFor(() => expect(screen.getByTestId('weekly-close-error')).toBeTruthy());

      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' }));
      expect(mockCloseCycle).toHaveBeenCalledTimes(2);
      expect(mockCloseCycle.mock.calls[1][1]).toMatchObject({ floorMet: false });
    });
  });

  describe('loading the week to close', () => {
    test('hands the decision back to the guard when there is no cycle', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      render(<WeeklyCloseScreen />);

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyEntry'));
    });

    test('a failed read offers a retry rather than an empty close', async () => {
      mockGetLatestCycle.mockRejectedValue(new Error('offline'));
      const screen = render(<WeeklyCloseScreen />);

      await waitFor(() =>
        expect(screen.getByTestId('weekly-close-load-error')).toBeTruthy()
      );
      expect(screen.getByTestId('weekly-close-retry')).toBeTruthy();
    });

    test('the retry loads the week', async () => {
      mockGetLatestCycle.mockRejectedValueOnce(new Error('offline'));
      const screen = render(<WeeklyCloseScreen />);
      await waitFor(() =>
        expect(screen.getByTestId('weekly-close-load-error')).toBeTruthy()
      );

      fireEvent.press(screen.getByTestId('weekly-close-retry'));

      await waitFor(() => expect(screen.getByTestId('weekly-close')).toBeTruthy());
    });
  });

  describe('what spec 8 keeps OFF this screen', () => {
    test('renders no count of days completed', async () => {
      // Spec 8.1 wants "what held" as a count, but nothing writes daily
      // completion yet, so the count would be zero for everyone. Spec 8's own
      // rule is to suppress a debrief with no data rather than show an empty
      // one. This returns with the completion CTA, not before.
      const screen = await renderClose();

      expect(screen.queryByText(/days? completed/i)).toBeNull();
      expect(screen.queryByText(/\d+\s*(of|\/)\s*7/)).toBeNull();
    });

    test('renders no group-post affordance', async () => {
      // Spec 8.5 is out of scope while Community is off. An inert control would
      // be worse than an absent one.
      const screen = await renderClose();

      expect(screen.queryByText(/group|share|post/i)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Telemetry (spec 20)
  // -------------------------------------------------------------------------

  describe('the weekly_close event', () => {
    test('fires once after a successful write, carrying every answer', async () => {
      const screen = await renderClose();
      answerAll(screen, { floorMet: true, adjustment: 'different-time' });
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalledTimes(1));
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('u1');
      expect(name).toBe('weekly_close');
      expect(params).toEqual({
        ratingFocus: 4,
        ratingRecovery: 2,
        ratingEnergy: 3,
        adjustmentSelected: 'different-time',
        floorMet: true,
        continuityBeforeClose: 3,
      });
    });

    // THE MANDATORY ONE. `note` is in scope four lines from the call site, it is
    // the only free-text answer in the close, and a short one clears the
    // writer's 64-character backstop untouched. A key here that this test does
    // not name is a key nobody decided to collect.
    test('carries no field beyond the six declared, and never the note', async () => {
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.changeText(
        screen.getByTestId('weekly-close-note'),
        'work was brutal and I slept badly'
      );
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
      const params = mockLogEvent.mock.calls[0][2];
      expect(Object.keys(params).sort()).toEqual([
        'adjustmentSelected',
        'continuityBeforeClose',
        'floorMet',
        'ratingFocus',
        'ratingRecovery',
        'ratingEnergy',
      ].sort());
      expect(params).not.toHaveProperty('closeNote');
      expect(JSON.stringify(mockLogEvent.mock.calls[0])).not.toContain('brutal');
    });

    test('the note still reaches storage, so the omission is the event only', async () => {
      // Guards the opposite mistake: the firewall is about what is LOGGED, not
      // about taking the user's answer away from their own week.
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'a hard week');
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle.mock.calls[0][1].closeNote).toBe('a hard week');
    });

    test('carries floorMet false as readily as true', async () => {
      const screen = await renderClose();
      answerAll(screen, { floorMet: false });
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
      expect(mockLogEvent.mock.calls[0][2].floorMet).toBe(false);
    });

    test('does not fire when the close write fails', async () => {
      // An event for a week that was never closed would be a lie in the funnel.
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(screen.getByTestId('weekly-close-error')).toBeTruthy());
      expect(
        mockLogEvent.mock.calls.filter((c) => c[1] === 'weekly_close')
      ).toHaveLength(0);
    });

    test('is skipped entirely when the continuity read failed', async () => {
      // continuityBeforeClose is required and has no honest stand-in. A 0 would
      // state something about the user that was never read, so the event is
      // dropped rather than guessed at.
      mockLoadContinuity.mockRejectedValue(new Error('offline'));
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test('a failed continuity read still lets the user close their week', async () => {
      // Telemetry may never be the reason a close does not happen.
      mockLoadContinuity.mockRejectedValue(new Error('offline'));
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' }));
    });

    test('fires after the write lands and before navigating away', async () => {
      const order: string[] = [];
      mockCloseCycle.mockImplementation(async () => {
        order.push('write');
      });
      mockLogEvent.mockImplementation(() => {
        order.push('event');
      });
      mockNavigate.mockImplementation(() => {
        order.push('navigate');
      });

      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(order).toEqual(['write', 'event', 'navigate']));
    });

    test('a throwing analytics call still lets the user through', async () => {
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' }));
    });
  });

  describe('the weekly_close_failed event', () => {
    test('fires once on a failed save, with a bucketed reason', async () => {
      mockCloseCycle.mockRejectedValue(
        Object.assign(new Error('nope'), { code: 'permission-denied' })
      );
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalledTimes(1));
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('u1');
      expect(name).toBe('weekly_close_failed');
      expect(params).toEqual({ reason: 'permission-denied' });
    });

    test('never carries the error message, however short', async () => {
      // 'offline' is 7 characters and would clear the writer's length backstop
      // untouched. toFailureReason is the only thing that stops it.
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
      const params = mockLogEvent.mock.calls[0][2];
      expect(Object.keys(params)).toEqual(['reason']);
      expect(params.reason).toBe('unknown');
      expect(JSON.stringify(params)).not.toContain('offline');
    });

    test('carries none of the answers the user gave', async () => {
      // A failed close's ratings say something about the user, not about the
      // failure, and the note is in scope at the catch too.
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'rough one');
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
      expect(JSON.stringify(mockLogEvent.mock.calls[0])).not.toContain('rough one');
      expect(mockLogEvent.mock.calls[0][2]).not.toHaveProperty('ratingFocus');
    });

    test('a throwing analytics call still shows the user the error', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });
      const screen = await renderClose();
      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(screen.getByTestId('weekly-close-error')).toBeTruthy());
    });
  });
});
