// The daily picker sheet — two questions, one confirm.
//
// THE LOAD-BEARING RULE IS "CONFIRM WRITES, NOTHING ELSE DOES". `hasPickedToday`
// keys on the time field, so any write before the confirm would mark the day
// picked merely because the user opened the sheet and looked at it. Opening,
// tapping around, and dismissing must leave the day untouched. The sheet is
// presentational for exactly that reason: it owns no write at all, and reports
// the answer upwards once.

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DailyPickerSheet } from '../DailyPickerSheet';
import { CAPACITY_LABELS } from '../../../constants/capacityCopy';
import { PICKER_COPY, TIME_LABELS } from '../dailyPicker.copy';

const onConfirm = jest.fn();
const onDismiss = jest.fn();

function renderSheet(over: Record<string, unknown> = {}) {
  return render(
    <DailyPickerSheet
      visible
      initialCapacity="normal"
      initialTime="medium"
      saving={false}
      saveFailed={false}
      onConfirm={onConfirm}
      onDismiss={onDismiss}
      {...over}
    />
  );
}

describe('DailyPickerSheet', () => {
  beforeEach(() => {
    onConfirm.mockReset();
    onDismiss.mockReset();
  });

  describe('the two questions', () => {
    test('offers all three capacity tiers', () => {
      renderSheet();
      for (const tier of ['normal', 'limited', 'slammed'] as const) {
        expect(screen.getByTestId(`daily-pick-capacity-${tier}`)).toBeTruthy();
      }
    });

    test('offers all three time windows', () => {
      renderSheet();
      for (const time of ['short', 'medium', 'long'] as const) {
        expect(screen.getByTestId(`daily-pick-time-${time}`)).toBeTruthy();
      }
    });

    test('labels them from the shared vocabulary, not its own strings', () => {
      // Capacity labels are the locked ones the weekly open and onboarding use.
      renderSheet();
      expect(screen.getByText(CAPACITY_LABELS.slammed)).toBeTruthy();
      expect(screen.getByText(TIME_LABELS.short)).toBeTruthy();
    });
  });

  describe('the pre-fill', () => {
    test('arrives with the handed-in answers already selected', () => {
      renderSheet({ initialCapacity: 'slammed', initialTime: 'short' });

      expect(
        screen.getByTestId('daily-pick-capacity-slammed').props.accessibilityState.selected
      ).toBe(true);
      expect(
        screen.getByTestId('daily-pick-time-short').props.accessibilityState.selected
      ).toBe(true);
    });

    test('confirming without touching anything returns the pre-fill unchanged', () => {
      // THE FAST PATH. An unchanged day is one tap: open, confirm, done. If this
      // ever required re-answering both questions the picker would be a chore
      // rather than an affirmation.
      renderSheet({ initialCapacity: 'limited', initialTime: 'long' });

      fireEvent.press(screen.getByTestId('daily-pick-confirm'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith('limited', 'long');
    });
  });

  describe('changing an answer', () => {
    test('confirms the tapped capacity instead of the pre-fill', () => {
      renderSheet({ initialCapacity: 'normal', initialTime: 'medium' });

      fireEvent.press(screen.getByTestId('daily-pick-capacity-slammed'));
      fireEvent.press(screen.getByTestId('daily-pick-confirm'));

      expect(onConfirm).toHaveBeenCalledWith('slammed', 'medium');
    });

    test('confirms the tapped time instead of the pre-fill', () => {
      renderSheet({ initialCapacity: 'normal', initialTime: 'medium' });

      fireEvent.press(screen.getByTestId('daily-pick-time-long'));
      fireEvent.press(screen.getByTestId('daily-pick-confirm'));

      expect(onConfirm).toHaveBeenCalledWith('normal', 'long');
    });
  });

  describe('confirm writes, nothing else does', () => {
    test('tapping options without confirming reports NOTHING upwards', () => {
      // The sheet cannot write, so the only way a stray write could happen is
      // by calling back early. Selecting is local state and stays local.
      renderSheet();

      fireEvent.press(screen.getByTestId('daily-pick-capacity-slammed'));
      fireEvent.press(screen.getByTestId('daily-pick-time-short'));
      fireEvent.press(screen.getByTestId('daily-pick-capacity-limited'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    test('skipping after tapping around reports nothing but the dismiss', () => {
      renderSheet();

      fireEvent.press(screen.getByTestId('daily-pick-time-short'));
      fireEvent.press(screen.getByTestId('daily-pick-skip'));

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('skip', () => {
    test('is offered, and says skip rather than close', () => {
      // "Close" would imply the question is still pending somewhere. Skipping
      // is a complete answer that happens to be "not now".
      renderSheet();

      expect(screen.getByText(PICKER_COPY.skip)).toBeTruthy();
    });

    test('is the SAME pure dismiss as the scrim, carrying no answer with it', () => {
      // The distinction that matters: skip must not quietly submit the
      // pre-fill. A skipped day is unanswered, not answered-with-a-guess.
      renderSheet({ initialCapacity: 'limited', initialTime: 'long' });

      fireEvent.press(screen.getByTestId('daily-pick-skip'));

      expect(onConfirm).not.toHaveBeenCalled();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    test('stays available while a confirm is in flight', () => {
      // Only the confirm is held during a write. A user who changes their mind
      // mid-save is not trapped in the sheet.
      renderSheet({ saving: true });

      fireEvent.press(screen.getByTestId('daily-pick-skip'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('the write in flight', () => {
    test('holds the confirm while saving, so one tap cannot become two', () => {
      renderSheet({ saving: true });

      fireEvent.press(screen.getByTestId('daily-pick-confirm'));

      expect(onConfirm).not.toHaveBeenCalled();
    });

    test('shows the failure and stays open so the answer is not lost', () => {
      renderSheet({ saveFailed: true });

      expect(screen.getByTestId('daily-pick-error')).toBeTruthy();
      expect(screen.getByTestId('daily-pick-confirm')).toBeTruthy();
    });
  });
});
