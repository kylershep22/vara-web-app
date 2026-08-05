// The weekly close (spec 8) — what it protects: every answer is one tap, the
// adjustment is genuinely single-choice, the note is genuinely skippable, and
// the floor answer the user gave is the boolean that reaches storage.

const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
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
    mockGetLatestCycle.mockReset().mockResolvedValue(cycle());
    mockCloseCycle.mockReset().mockResolvedValue(undefined);
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

    test('saves a single key, not a list', async () => {
      const screen = await renderClose();

      answerAll(screen, { adjustment: 'different-outcome' });
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle.mock.calls[0][1].adjustmentSelected).toBe('different-outcome');
    });
  });

  describe('what the save writes', () => {
    test('sends the chosen ratings, floor answer and adjustment against the cycle id', async () => {
      const screen = await renderClose();

      answerAll(screen);
      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockCloseCycle).toHaveBeenCalled());
      expect(mockCloseCycle).toHaveBeenCalledWith('cycle-1', {
        ratingFocus: 4,
        ratingRecovery: 2,
        ratingEnergy: 3,
        closeNote: '',
        adjustmentSelected: 'smaller-daily-action',
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

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyToday'));
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

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyToday'));
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
      expect(mockReplace).not.toHaveBeenCalled();
    });

    test('keeps every answer, so a retry is one tap and not five', async () => {
      mockCloseCycle.mockRejectedValueOnce(new Error('offline'));
      const screen = await renderClose();

      answerAll(screen, { floorMet: false, adjustment: 'different-time' });
      fireEvent.press(screen.getByTestId('weekly-close-save'));
      await waitFor(() => expect(screen.getByTestId('weekly-close-error')).toBeTruthy());

      fireEvent.press(screen.getByTestId('weekly-close-save'));

      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyToday'));
      expect(mockCloseCycle).toHaveBeenCalledTimes(2);
      expect(mockCloseCycle.mock.calls[1][1]).toMatchObject({
        ratingFocus: 4,
        floorMet: false,
        adjustmentSelected: 'different-time',
      });
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
});
