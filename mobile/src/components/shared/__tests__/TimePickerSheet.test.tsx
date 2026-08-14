/**
 * TimePickerSheet — the three defects fixed on extraction.
 *
 * The original pattern (still in NotificationSettingsScreen) wired Cancel and
 * Done to the same handler and committed inside the picker's onChange, so
 * Cancel could not cancel and an iOS spinner wrote once per tick. Both are
 * pinned here so the extracted component cannot regress to that behaviour.
 */
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View, useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) };
});
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { TimePickerSheet, formatReminderTime } from '../TimePickerSheet';

const onChange = jest.fn();
const onClose = jest.fn();

function renderSheet(value = { hour: 8, minute: 0 }, visible = true) {
  return render(
    <TimePickerSheet
      visible={visible}
      value={value}
      onChange={onChange}
      onClose={onClose}
    />
  );
}

/** Drive the underlying picker as an iOS spinner scroll would. */
function scrollTo(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  fireEvent(screen.UNSAFE_getByType('DateTimePicker' as any), 'change', { type: 'set' }, d);
}

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
});

describe('committing', () => {
  test('Done commits the drafted time exactly once', () => {
    renderSheet();
    scrollTo(7, 30);

    expect(onChange).not.toHaveBeenCalled(); // still a draft

    fireEvent.press(screen.getByTestId('time-picker-done'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hour: 7, minute: 30 });
    expect(onClose).toHaveBeenCalled();
  });

  test('scrolling does NOT commit once per tick', () => {
    renderSheet();

    scrollTo(6, 0);
    scrollTo(6, 30);
    scrollTo(7, 0);

    // The original committed inside onChange — three writes for one decision.
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('time-picker-done'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hour: 7, minute: 0 });
  });
});

describe('cancelling', () => {
  test('Cancel DISCARDS the draft instead of committing it', () => {
    renderSheet();
    scrollTo(22, 15);

    fireEvent.press(screen.getByTestId('time-picker-cancel'));

    // The whole point: the original wired Cancel to the same handler as Done.
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  test('a cancelled edit does not become the next edit’s starting point', () => {
    const { rerender } = renderSheet({ hour: 8, minute: 0 });
    scrollTo(22, 15);
    fireEvent.press(screen.getByTestId('time-picker-cancel'));

    // Close, then reopen with the unchanged stored value.
    rerender(
      <TimePickerSheet visible={false} value={{ hour: 8, minute: 0 }} onChange={onChange} onClose={onClose} />
    );
    rerender(
      <TimePickerSheet visible value={{ hour: 8, minute: 0 }} onChange={onChange} onClose={onClose} />
    );

    fireEvent.press(screen.getByTestId('time-picker-done'));
    expect(onChange).toHaveBeenCalledWith({ hour: 8, minute: 0 });
  });
});

describe('accessibility', () => {
  test('Cancel and Done are buttons with distinct labels', () => {
    renderSheet();

    const cancel = screen.getByTestId('time-picker-cancel');
    const done = screen.getByTestId('time-picker-done');

    expect(cancel.props.accessibilityRole).toBe('button');
    expect(done.props.accessibilityRole).toBe('button');
    expect(cancel.props.accessibilityLabel).not.toBe(done.props.accessibilityLabel);
  });

  test('the overlay is marked modal so focus cannot wander behind it', () => {
    renderSheet();
    expect(screen.getByTestId('time-picker-sheet').props.accessibilityViewIsModal).toBe(true);
  });
});

describe('visibility', () => {
  test('renders nothing when hidden', () => {
    renderSheet({ hour: 8, minute: 0 }, false);
    expect(screen.queryByTestId('time-picker-sheet')).toBeNull();
  });
});

describe('the header title', () => {
  test('defaults to the reminder wording it was extracted for', () => {
    // The per-habit reminder path passes no title and must keep this exactly.
    renderSheet();
    expect(screen.getByText('Reminder time')).toBeTruthy();
  });

  test('an override replaces it entirely', () => {
    // Blocks pass "Start time": that surface has no reminders of any kind, so
    // the default would misdescribe what the app is about to do.
    render(
      <TimePickerSheet
        visible
        value={{ hour: 8, minute: 0 }}
        title="Start time"
        onChange={onChange}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Start time')).toBeTruthy();
    expect(screen.queryByText('Reminder time')).toBeNull();
  });
});

describe('formatReminderTime', () => {
  test.each([
    [{ hour: 0, minute: 0 }, '12:00 AM'],
    [{ hour: 7, minute: 30 }, '7:30 AM'],
    [{ hour: 12, minute: 5 }, '12:05 PM'],
    [{ hour: 13, minute: 0 }, '1:00 PM'],
    [{ hour: 23, minute: 59 }, '11:59 PM'],
  ])('%o renders as %s', (time, expected) => {
    expect(formatReminderTime(time)).toBe(expected);
  });
});
