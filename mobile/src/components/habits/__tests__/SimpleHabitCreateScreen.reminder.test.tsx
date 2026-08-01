/**
 * SimpleHabitCreateScreen — the reminder section.
 *
 * Two things matter beyond "the toggle works": the control must be HIDDEN for a
 * habit whose schedule carries no cadence (rather than defaulting to daily and
 * inventing one the user never chose), and there must be exactly ONE
 * day-picker on the sheet — the reminder inherits the frequency's days instead
 * of asking for them again.
 */
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

import { SimpleHabitCreateScreen } from '../SimpleHabitCreateScreen';

const onSave = jest.fn();
const onDismiss = jest.fn();

function renderSheet() {
  return render(
    <SimpleHabitCreateScreen visible onDismiss={onDismiss} onSave={onSave} />
  );
}

/** Fill in the required fields so Save is enabled. */
function fillRequired() {
  fireEvent.changeText(screen.getByPlaceholderText(/Morning walk/i), 'Stretch');
  fireEvent.press(screen.getByTestId('habit-create-category-movement'));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('when the reminder control is offered', () => {
  test('offered for a daily habit — the default frequency', () => {
    renderSheet();
    expect(screen.getByTestId('habit-create-reminder')).toBeTruthy();
  });

  test('offered for a flexible habit', () => {
    renderSheet();
    fireEvent.press(screen.getByText('Flexible'));
    expect(screen.getByTestId('habit-create-reminder')).toBeTruthy();
  });

  test('HIDDEN for specific days until a day is actually picked', () => {
    renderSheet();
    fireEvent.press(screen.getByText('Specific days'));

    // No days chosen yet: there is no cadence to inherit, so no reminder.
    expect(screen.queryByTestId('habit-create-reminder')).toBeNull();
  });

  test('appears the moment a day is chosen, and goes away again when unpicked', () => {
    renderSheet();
    fireEvent.press(screen.getByText('Specific days'));
    expect(screen.queryByTestId('habit-create-reminder')).toBeNull();

    fireEvent.press(screen.getAllByText('M')[0]);
    expect(screen.getByTestId('habit-create-reminder')).toBeTruthy();

    fireEvent.press(screen.getAllByText('M')[0]);
    expect(screen.queryByTestId('habit-create-reminder')).toBeNull();
  });
});

describe('no redundant day entry', () => {
  test('turning the reminder on adds no second set of day dots', () => {
    renderSheet();
    fireEvent.press(screen.getByText('Specific days'));
    fireEvent.press(screen.getAllByText('W')[0]);

    // One 'W' dot on the sheet before the reminder is enabled...
    const before = screen.getAllByText('W').length;
    fireEvent(screen.getByTestId('habit-create-reminder-toggle'), 'valueChange', true);

    // ...and still exactly one after. The reminder inherits; it does not ask.
    expect(screen.getAllByText('W').length).toBe(before);
  });

  test('shows the inherited days read-only instead', () => {
    renderSheet();
    fireEvent.press(screen.getByText('Specific days'));
    fireEvent.press(screen.getAllByText('M')[0]);
    fireEvent.press(screen.getAllByText('W')[0]);

    expect(screen.getByText(/on your mon · wed schedule/i)).toBeTruthy();
  });
});

describe('what gets saved', () => {
  test('no reminder fields when the toggle is left off', () => {
    renderSheet();
    fillRequired();
    fireEvent.press(screen.getByLabelText('Save Habit'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ reminderEnabled: false, reminderTime: null })
    );
  });

  test('the enabled reminder and its time are passed up', () => {
    renderSheet();
    fillRequired();
    fireEvent(screen.getByTestId('habit-create-reminder-toggle'), 'valueChange', true);
    fireEvent.press(screen.getByLabelText('Save Habit'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        reminderEnabled: true,
        reminderTime: { hour: 8, minute: 0 },
      })
    );
  });

  test('a reminder toggled on then orphaned by a frequency change is not saved', () => {
    renderSheet();
    fillRequired();
    fireEvent(screen.getByTestId('habit-create-reminder-toggle'), 'valueChange', true);

    // Switching to specific days with nothing picked removes the cadence.
    fireEvent.press(screen.getByText('Specific days'));
    fireEvent.press(screen.getByLabelText('Save Habit'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ reminderEnabled: false, reminderTime: null })
    );
  });
});

describe('the time control', () => {
  test('is only shown once the reminder is on', () => {
    renderSheet();
    expect(screen.queryByTestId('habit-create-reminder-time')).toBeNull();

    fireEvent(screen.getByTestId('habit-create-reminder-toggle'), 'valueChange', true);
    expect(screen.getByTestId('habit-create-reminder-time')).toBeTruthy();
  });

  test('is reachable by a screen reader as a button with its current value', () => {
    renderSheet();
    fireEvent(screen.getByTestId('habit-create-reminder-toggle'), 'valueChange', true);

    const row = screen.getByTestId('habit-create-reminder-time');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toMatch(/8:00 AM/);
  });
});
