// The weekly reset (spec 8, repurposed by journey slice 6) — what it protects:
// the question is the one Jen wrote for THIS user's destination, the three
// answers are the three PhaseRead values, the read and the phase it was given
// about reach storage together or not at all, the note is genuinely skippable,
// and the confirmation is on screen before the user is sent anywhere.
//
// TWO NAVIGATION VERBS, and which one is used carries meaning.
//
//   replace  the no-cycle bail-out, which hands the decision back to the entry
//            guard. Still a stack-to-stack move.
//   navigate the post-reset terminal. Home is a TAB, not a stack screen, so it
//            is reached through its navigator (Main -> Home) and cannot be
//            replaced into. `replace(Main)` would push a second Main on top of
//            the one already at the root.
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
// PARAMS ARE PART OF THE HARNESS NOW (slice 6). The screen reads the phase and
// the destination off the route rather than reading journeyStates itself, so a
// suite that mocked only useNavigation would render the no-phase path for every
// test and every question assertion would pass against nothing.
let mockParams: Record<string, unknown> | undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace, navigate: mockNavigate }),
  useRoute: () => ({ params: mockParams }),
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
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { WeeklyCloseScreen } from '../WeeklyCloseScreen';
import {
  RESET_ANSWERS,
  RESET_CONFIRMATION,
  RESET_QUESTIONS,
} from '../../../constants/journeyCopy';
import type { DestinationKey } from '../../../types/models';

const cycle = (over: Record<string, unknown> = {}) => ({
  id: 'cycle-1',
  userId: 'u1',
  weekStart: '2026-08-03',
  capacityInitial: 'normal',
  ...over,
});

async function renderReset(
  params: Record<string, unknown> = { phase: 'remove', destination: 'focus' }
) {
  mockParams = params;
  const screen = render(<WeeklyCloseScreen />);
  await waitFor(() => expect(screen.getByTestId('weekly-close')).toBeTruthy());
  return screen;
}

/**
 * The no-phase path: Home navigated with no params at all.
 *
 * ITS OWN HELPER RATHER THAN `renderReset(undefined)`, which is the trap this
 * suite already fell into once: passing `undefined` explicitly triggers the
 * default parameter above, so every no-phase test rendered WITH a phase and
 * asserted against the wrong screen.
 */
async function renderNoPhase() {
  mockParams = undefined;
  const screen = render(<WeeklyCloseScreen />);
  await waitFor(() => expect(screen.getByTestId('weekly-close')).toBeTruthy());
  return screen;
}

/** Answer the one required question, leaving the note blank. */
function answer(screen: ReturnType<typeof render>, value = 'moving') {
  fireEvent.press(screen.getByTestId(`weekly-close-read-${value}`));
}

describe('WeeklyCloseScreen', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockNavigate.mockClear();
    mockGetLatestCycle.mockReset().mockResolvedValue(cycle());
    mockCloseCycle.mockReset().mockResolvedValue(undefined);
    mockLogEvent.mockReset();
    mockParams = { phase: 'remove', destination: 'focus' };
  });

  describe('the felt read (C1)', () => {
    // THE QUESTION IS PER DESTINATION, and all four are asserted rather than
    // one plus a shrug. The screen indexes RESET_QUESTIONS by a param, so a
    // mis-wired index would render the wrong destination's question with no
    // error anywhere, and a single-destination test would not see it.
    const DESTINATIONS: DestinationKey[] = ['focus', 'calm', 'routines', 'energy'];

    test.each(DESTINATIONS)('asks the %s question, and only that one', async (destination) => {
      const screen = await renderReset({ phase: 'recover', destination });

      expect(screen.getByText(RESET_QUESTIONS[destination])).toBeTruthy();

      // The other three are absent. Without this the test would pass if the
      // screen rendered all four questions stacked.
      for (const other of DESTINATIONS.filter((d) => d !== destination)) {
        expect(screen.queryByText(RESET_QUESTIONS[other])).toBeNull();
      }
    });

    test('offers exactly the three answers, in the pack order', async () => {
      const screen = await renderReset();

      for (const { label } of RESET_ANSWERS) {
        expect(screen.getByText(label)).toBeTruthy();
      }
      expect(RESET_ANSWERS.map((a) => a.value)).toEqual([
        'moving',
        'not_moving',
        'unclear',
      ]);
    });

    test('is one tap, with nothing else to confirm it', async () => {
      const screen = await renderReset();

      answer(screen, 'not_moving');

      expect(
        screen.getByTestId('weekly-close-read-not_moving').props.accessibilityState.selected
      ).toBe(true);
    });

    test('picking a second answer REPLACES the first, so only one is ever selected', async () => {
      const screen = await renderReset();

      answer(screen, 'moving');
      answer(screen, 'unclear');

      const selected = RESET_ANSWERS.filter(
        ({ value }) =>
          screen.getByTestId(`weekly-close-read-${value}`).props.accessibilityState.selected
      );
      expect(selected).toHaveLength(1);
      expect(selected[0].value).toBe('unclear');
    });

    test('renders no scale, no number and no grade', async () => {
      const screen = await renderReset();

      // The three 1-to-5 rating rows are gone (slice 6). Asserted by their old
      // testIDs rather than by counting text, so a reintroduction under the
      // same shape fails here rather than passing quietly.
      expect(screen.queryByTestId('weekly-close-rating-focus')).toBeNull();
      expect(screen.queryByTestId('weekly-close-rating-recovery')).toBeNull();
      expect(screen.queryByTestId('weekly-close-rating-energy')).toBeNull();
      for (const n of [1, 2, 3, 4, 5]) {
        expect(screen.queryByText(String(n))).toBeNull();
      }
    });

    test('asks no floor question and offers no adjustment', async () => {
      const screen = await renderReset();

      expect(screen.queryByTestId('weekly-close-floor')).toBeNull();
      expect(screen.queryByTestId('weekly-close-adjustments')).toBeNull();
    });
  });

  describe('what the save writes', () => {
    test('sends the read and the phase it was about, against the cycle id', async () => {
      const screen = await renderReset({ phase: 'recover', destination: 'calm' });
      answer(screen, 'not_moving');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockCloseCycle).toHaveBeenCalledWith('cycle-1', {
        closeNote: '',
        phaseRead: 'not_moving',
        phaseKeyAtRead: 'recover',
      });
    });

    test.each(RESET_ANSWERS.map((a) => [a.value, a.label]))(
      'stores %s when the user taps "%s"',
      async (value) => {
        const screen = await renderReset();
        answer(screen, value as string);

        await act(async () => {
          fireEvent.press(screen.getByTestId('weekly-close-save'));
        });

        expect(mockCloseCycle.mock.calls[0][1].phaseRead).toBe(value);
      }
    );

    test('never sends floorMet, which retired with continuity', async () => {
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      // Asserted on the KEY SET rather than on the value, because
      // `floorMet: undefined` would satisfy a value check and still reach the
      // service, which spreads what it is given.
      expect(Object.keys(mockCloseCycle.mock.calls[0][1]).sort()).toEqual([
        'closeNote',
        'phaseKeyAtRead',
        'phaseRead',
      ]);
    });

    test('sends the note when one was written', async () => {
      const screen = await renderReset();
      answer(screen);
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'quiet week');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockCloseCycle.mock.calls[0][1].closeNote).toBe('quiet week');
    });

    test('never sends a closeCompletedAt, which the service stamps', async () => {
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockCloseCycle.mock.calls[0][1]).not.toHaveProperty('closeCompletedAt');
    });

    test('never sends a tier, so the reset cannot rewrite what the week was', async () => {
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      const written = mockCloseCycle.mock.calls[0][1];
      expect(written).not.toHaveProperty('capacityInitial');
      expect(written).not.toHaveProperty('capacityCurrent');
      expect(written).not.toHaveProperty('outcome');
    });
  });

  describe('with no phase resolved', () => {
    // REACHABLE THREE WAYS, none of them exotic: JOURNEY_IA off, a resolver
    // that threw and fell back to legacy, and rung (d) with no derivable
    // destination. Home carries the cycle in all three, so the reset entry is
    // on screen and this path is live.

    test('renders the note without a question rather than an invented one', async () => {
      const screen = await renderNoPhase();

      expect(screen.queryByTestId('weekly-close-read')).toBeNull();
      expect(screen.getByTestId('weekly-close-note')).toBeTruthy();
      for (const destination of ['focus', 'calm', 'routines', 'energy'] as DestinationKey[]) {
        expect(screen.queryByText(RESET_QUESTIONS[destination])).toBeNull();
      }
    });

    test('saves on arrival, because nothing is required without a question', async () => {
      const screen = await renderNoPhase();

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        false
      );
      expect(screen.queryByTestId('weekly-close-required')).toBeNull();
    });

    test('closes the week with no read at all, which is a defined value', async () => {
      const screen = await renderNoPhase();
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'still here');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      // Absent, never null and never a guessed read: journey/derive.ts defines
      // absence as "not answered", and an invented value would feed the
      // adjustment threshold.
      expect(mockCloseCycle).toHaveBeenCalledWith('cycle-1', {
        closeNote: 'still here',
        phaseRead: undefined,
        phaseKeyAtRead: undefined,
      });
    });

    test('a half-filled param set is treated as no phase, not as half a read', async () => {
      // The pairing rule, at the screen boundary. A destination with no phase
      // could render a question whose answer had no phase to attribute it to.
      const screen = await renderReset({ destination: 'focus' });

      expect(screen.queryByTestId('weekly-close-read')).toBeNull();
    });
  });

  describe('the confirmation', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('renders BEFORE the user is navigated away', async () => {
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      // The whole point of the state. If it rendered after the navigate, or
      // not at all, this is where it shows.
      expect(screen.getByTestId('weekly-close-confirmation')).toBeTruthy();
      expect(screen.getByText(RESET_CONFIRMATION)).toBeTruthy();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('replaces the form, so a second write is not reachable', async () => {
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(screen.queryByTestId('weekly-close-save')).toBeNull();
      expect(screen.queryByTestId('weekly-close-note')).toBeNull();
      expect(mockCloseCycle).toHaveBeenCalledTimes(1);
    });

    test('is identical whichever answer was given', async () => {
      // The pack's instruction, asserted rather than trusted: "Do not change
      // the confirmation depending on the answer."
      const seen: string[] = [];
      for (const { value } of RESET_ANSWERS) {
        mockCloseCycle.mockClear();
        const screen = await renderReset();
        answer(screen, value);
        await act(async () => {
          fireEvent.press(screen.getByTestId('weekly-close-save'));
        });
        seen.push(screen.getByTestId('weekly-close-confirmation').props.children);
        screen.unmount();
      }
      expect(new Set(seen).size).toBe(1);
      expect(seen[0]).toBe(RESET_CONFIRMATION);
    });

    test('then lands on Today, through the tab navigator', async () => {
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });
      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockNavigate).toHaveBeenCalledWith('Main', { screen: 'Home' });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('does not navigate from an unmounted screen', async () => {
      // What backing out during the hold does. The write is already committed,
      // so the only thing left to get wrong is navigating after teardown.
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });
      screen.unmount();
      await act(async () => {
        jest.runAllTimers();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('never appears when the write failed', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(screen.queryByTestId('weekly-close-confirmation')).toBeNull();
      expect(screen.getByTestId('weekly-close-error')).toBeTruthy();
    });
  });

  describe('the note is skippable (spec 8.3)', () => {
    test('the save is available with the note untouched', async () => {
      const screen = await renderReset();
      answer(screen);

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        false
      );
    });

    test('a skipped note still closes the week', async () => {
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockCloseCycle).toHaveBeenCalled();
    });
  });

  describe('the save is unavailable until the question is answered', () => {
    test('is disabled on arrival, with the reason on screen', async () => {
      const screen = await renderReset();

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        true
      );
      expect(screen.getByTestId('weekly-close-required')).toBeTruthy();
    });

    test('a note alone is not an answer', async () => {
      const screen = await renderReset();
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'a line');

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        true
      );
    });

    test('writes nothing while it is disabled', async () => {
      const screen = await renderReset();

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockCloseCycle).not.toHaveBeenCalled();
    });

    test('becomes available once the read is given', async () => {
      const screen = await renderReset();
      answer(screen);

      expect(screen.getByTestId('weekly-close-save').props.accessibilityState.disabled).toBe(
        false
      );
      expect(screen.queryByTestId('weekly-close-required')).toBeNull();
    });
  });

  describe('when the write fails', () => {
    test('shows a supportive error instead of crashing', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(screen.getByTestId('weekly-close-error')).toBeTruthy();
    });

    test('does NOT navigate, so the user is not told a week closed that did not', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockNavigate).not.toHaveBeenCalled();
    });

    test('keeps every answer, so a retry is one tap and not two', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderReset();
      answer(screen, 'unclear');
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'kept');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(
        screen.getByTestId('weekly-close-read-unclear').props.accessibilityState.selected
      ).toBe(true);
      expect(screen.getByTestId('weekly-close-note').props.value).toBe('kept');
    });
  });

  describe('loading the week to close', () => {
    test('hands the decision back to the guard when there is no cycle', async () => {
      mockGetLatestCycle.mockResolvedValue(null);
      mockParams = { phase: 'remove', destination: 'focus' };
      render(<WeeklyCloseScreen />);

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyEntry'));
    });

    test('a failed read offers a retry rather than an empty reset', async () => {
      mockGetLatestCycle.mockRejectedValue(new Error('offline'));
      mockParams = { phase: 'remove', destination: 'focus' };
      const screen = render(<WeeklyCloseScreen />);

      await waitFor(() =>
        expect(screen.getByTestId('weekly-close-load-error')).toBeTruthy()
      );
      expect(screen.getByTestId('weekly-close-retry')).toBeTruthy();
    });

    test('the retry loads the week', async () => {
      mockGetLatestCycle
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(cycle());
      mockParams = { phase: 'remove', destination: 'focus' };
      const screen = render(<WeeklyCloseScreen />);

      await waitFor(() =>
        expect(screen.getByTestId('weekly-close-load-error')).toBeTruthy()
      );
      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-retry'));
      });

      await waitFor(() => expect(screen.getByTestId('weekly-close')).toBeTruthy());
    });
  });

  describe('what spec 8 keeps OFF this screen', () => {
    test('renders no count of days completed', async () => {
      const screen = await renderReset();

      // Roadmap section 8 bars counters outright, so this is stronger than
      // spec 8's own "suppress an empty debrief" rule: there is no data-bearing
      // version of this that is allowed back.
      expect(screen.queryByText(/\d+ (of|\/) \d+/)).toBeNull();
      expect(screen.queryByText(/days? completed/i)).toBeNull();
    });

    test('renders no group-post affordance', async () => {
      const screen = await renderReset();

      expect(screen.queryByText(/share/i)).toBeNull();
      expect(screen.queryByText(/group/i)).toBeNull();
    });

    test('renders no continuity count', async () => {
      const screen = await renderReset();

      // It was never rendered here, but it WAS read here for telemetry, and
      // the read is gone too. This is the surface half of that removal.
      expect(screen.queryByText(/week[s]? holding/i)).toBeNull();
      expect(screen.queryByTestId('home-continuity')).toBeNull();
    });
  });

  describe('the weekly_close event', () => {
    test('fires once after a successful write, carrying the read', async () => {
      const screen = await renderReset({ phase: 'refocus', destination: 'energy' });
      answer(screen, 'moving');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      expect(mockLogEvent).toHaveBeenCalledWith('u1', 'weekly_close', {
        phaseRead: 'moving',
        phaseKeyAtRead: 'refocus',
      });
    });

    test('carries no field beyond the two declared, and never the note', async () => {
      const screen = await renderReset();
      answer(screen);
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'private');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(Object.keys(mockLogEvent.mock.calls[0][2]).sort()).toEqual([
        'phaseKeyAtRead',
        'phaseRead',
      ]);
    });

    test('the note still reaches storage, so the omission is the event only', async () => {
      const screen = await renderReset();
      answer(screen);
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'private');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockCloseCycle.mock.calls[0][1].closeNote).toBe('private');
    });

    test('records nulls rather than skipping when there was no phase', async () => {
      // THE REPLACEMENT FOR THE CONTINUITY GATE. The event used to be dropped
      // whenever the continuity read had failed, which lost a real reset from
      // the record. Nothing is droppable now: a reset that saved is a reset
      // that is logged, and null says the question was not asked.
      const screen = await renderNoPhase();

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockLogEvent).toHaveBeenCalledWith('u1', 'weekly_close', {
        phaseRead: null,
        phaseKeyAtRead: null,
      });
    });

    test('does not fire when the write fails', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      const closeEvents = mockLogEvent.mock.calls.filter((c) => c[1] === 'weekly_close');
      expect(closeEvents).toHaveLength(0);
    });

    test('fires after the write lands and before the confirmation clears', async () => {
      const order: string[] = [];
      mockCloseCycle.mockImplementation(async () => {
        order.push('write');
      });
      mockLogEvent.mockImplementation((_u: string, name: string) => {
        if (name === 'weekly_close') order.push('event');
      });

      const screen = await renderReset();
      answer(screen);
      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(order).toEqual(['write', 'event']);
    });

    test('a throwing analytics call still lets the user through', async () => {
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics down');
      });
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(screen.getByTestId('weekly-close-confirmation')).toBeTruthy();
    });
  });

  describe('the weekly_close_failed event', () => {
    test('fires once on a failed save, with a bucketed reason', async () => {
      mockCloseCycle.mockRejectedValue({ code: 'unavailable' });
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(mockLogEvent).toHaveBeenCalledWith('u1', 'weekly_close_failed', {
        reason: 'unavailable',
      });
    });

    test('never carries the error message, however short', async () => {
      mockCloseCycle.mockRejectedValue({ code: 'db down', message: 'alice failed' });
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      const [, , params] = mockLogEvent.mock.calls[0];
      expect(params).toEqual({ reason: 'unknown' });
    });

    test('carries none of the answers the user gave', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      const screen = await renderReset();
      answer(screen, 'not_moving');
      fireEvent.changeText(screen.getByTestId('weekly-close-note'), 'private');

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(Object.keys(mockLogEvent.mock.calls[0][2])).toEqual(['reason']);
    });

    test('a throwing analytics call still shows the user the error', async () => {
      mockCloseCycle.mockRejectedValue(new Error('offline'));
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics down');
      });
      const screen = await renderReset();
      answer(screen);

      await act(async () => {
        fireEvent.press(screen.getByTestId('weekly-close-save'));
      });

      expect(screen.getByTestId('weekly-close-error')).toBeTruthy();
    });
  });
});
