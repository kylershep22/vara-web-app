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
import {
  PICKER_COPY,
  TIME_CHIP_LABELS,
  TIME_GLOSSES,
  TIME_LABELS,
} from '../dailyPicker.copy';

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
      expect(screen.getByText(TIME_CHIP_LABELS.short)).toBeTruthy();
    });

    test('asks the time question at all', () => {
      // THE REASON THIS SLICE EXISTS. The question rendered below the fold of a
      // scrolling modal with nothing signalling it was there, so it was
      // collected from a control users had never seen. A passing assertion that
      // the three options EXIST does not catch that, and did not: the suite was
      // green the whole time the question was invisible. What this pins is the
      // heading, which is the part that tells a user the chips below it are a
      // question rather than decoration on the capacity answer.
      renderSheet();

      expect(screen.getByText(PICKER_COPY.timeQuestion)).toBeTruthy();
    });
  });

  describe('the time chip row', () => {
    // Time is a horizontal chip row and capacity is not. The compression is what
    // brings the second question above the fold; see the component header.
    test('renders exactly three chips, one per time class', () => {
      renderSheet();

      const chips = ['short', 'medium', 'long'].map((cls) =>
        screen.getByTestId(`daily-pick-time-${cls}`)
      );

      expect(chips).toHaveLength(3);
      expect(screen.getByText(TIME_CHIP_LABELS.short)).toBeTruthy();
      expect(screen.getByText(TIME_CHIP_LABELS.medium)).toBeTruthy();
      expect(screen.getByText(TIME_CHIP_LABELS.long)).toBeTruthy();
    });

    test('shows the SHORT label and announces the full one', () => {
      // The compression is a fit constraint on a 313pt row, not a copy change a
      // screen reader has to inherit. The full label and its gloss are what the
      // OptionRow announced before this slice and what the chip announces now,
      // which is why TIME_LABELS and TIME_GLOSSES are still live.
      renderSheet();

      const chip = screen.getByTestId('daily-pick-time-medium');

      expect(chip.props.accessibilityLabel).toBe(
        `${TIME_LABELS.medium}. ${TIME_GLOSSES.medium}`
      );
      // And the short form is what is painted, not the long one.
      expect(screen.queryByText(TIME_LABELS.medium)).toBeNull();
    });

    test('reflects the selection on exactly one chip at a time', () => {
      // Single-select is the contract. A row that can show two selected states
      // is a row that can send an ambiguous answer to the write.
      renderSheet({ initialTime: 'medium' });

      const selectedIds = () =>
        ['short', 'medium', 'long'].filter(
          (cls) =>
            screen.getByTestId(`daily-pick-time-${cls}`).props.accessibilityState
              .selected === true
        );

      expect(selectedIds()).toEqual(['medium']);

      fireEvent.press(screen.getByTestId('daily-pick-time-long'));

      expect(selectedIds()).toEqual(['long']);
    });

    test('carries a radio role, so the row reads as one answer', () => {
      renderSheet();

      expect(screen.getByTestId('daily-pick-time-short').props.accessibilityRole).toBe(
        'radio'
      );
    });

    test('is painted below 48 but hit to the 48 floor', () => {
      // Standards 16: 48 is the target floor. The chip is painted at 44 so three
      // of them read as one control rather than three buttons, and the missing
      // 4 is made up in vertical hit slop. Horizontal slop stays at zero: the
      // chips are 8 apart and slop would overlap a neighbour's target.
      renderSheet();

      const chip = screen.getByTestId('daily-pick-time-short');

      expect(chip.props.hitSlop).toEqual({ top: 2, bottom: 2, left: 0, right: 0 });
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

  describe('the time value reaching the write', () => {
    // THE BYTE-IDENTICAL CLAIM. This slice is presentation only: the sheet still
    // owns no write, and the only thing it hands upwards is the same pair of
    // union values it handed upwards before the chips existed. If the chip row
    // ever started reporting a label, an index, or a minute count instead of a
    // TimeClass, `upsertDailyLog`'s `dailyTimeBudget` would change shape and
    // `hasPickedToday` would stop recognising its own field.
    test.each([
      ['short'],
      ['medium'],
      ['long'],
    ])('confirms the raw %s TimeClass, not its label', (cls) => {
      renderSheet({ initialCapacity: 'normal', initialTime: 'medium' });

      fireEvent.press(screen.getByTestId(`daily-pick-time-${cls}`));
      fireEvent.press(screen.getByTestId('daily-pick-confirm'));

      expect(onConfirm).toHaveBeenCalledWith('normal', cls);
    });

    test('the pre-fill fast path still reaches the write untouched', () => {
      // One tap from a cold open, with the chip row in place of the rows. The
      // value handed up is yesterday's, unmodified by the presentation change.
      renderSheet({ initialCapacity: 'slammed', initialTime: 'short' });

      fireEvent.press(screen.getByTestId('daily-pick-confirm'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith('slammed', 'short');
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
