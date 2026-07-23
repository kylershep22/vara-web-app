import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PanResponder } from 'react-native';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

import { HabitNoteSheet } from '../HabitNoteSheet';

/** Capture the PanResponder config the sheet builds, to drive gestures. */
function panConfig(): any {
  const spy = PanResponder.create as unknown as jest.Mock;
  return spy.mock.calls[spy.mock.calls.length - 1][0];
}

const baseProps = {
  visible: true,
  habitName: 'Morning walk',
  onSave: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(PanResponder, 'create');
});

describe('HabitNoteSheet — the invitation', () => {
  it('asks whether anything is worth remembering, without asking for a rating', () => {
    const { getByText, queryByText } = render(<HabitNoteSheet {...baseProps} />);

    expect(getByText('Anything worth remembering?')).toBeTruthy();
    expect(getByText('Morning walk')).toBeTruthy();

    // No evaluation of the experience.
    expect(queryByText('How did it go?')).toBeNull();
    expect(queryByText('Smooth')).toBeNull();
    expect(queryByText('Okay')).toBeNull();
    expect(queryByText('Hard today')).toBeNull();
  });

  it('offers no skip affordance — dismissal is not framed as an omission', () => {
    const { queryByText } = render(<HabitNoteSheet {...baseProps} />);
    expect(queryByText('Skip')).toBeNull();
    expect(queryByText('Skip reflection')).toBeNull();
    expect(queryByText('No thanks')).toBeNull();
  });

  it('clamps input to 140 characters', () => {
    const { getByTestId } = render(<HabitNoteSheet {...baseProps} />);
    expect(getByTestId('habit-note-sheet-input').props.maxLength).toBe(140);
  });

  it('shows no character counter', () => {
    const { queryByText } = render(<HabitNoteSheet {...baseProps} />);
    expect(queryByText(/\/\s*140/)).toBeNull();
  });
});

describe('HabitNoteSheet — dismissal paths write nothing', () => {
  it('X button dismisses without saving', () => {
    const { getByTestId } = render(<HabitNoteSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('habit-note-sheet-input'), 'typed but abandoned');
    fireEvent.press(getByTestId('habit-note-sheet-close'));

    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('tapping outside dismisses without saving', () => {
    const { getByTestId } = render(<HabitNoteSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('habit-note-sheet-input'), 'typed but abandoned');
    fireEvent.press(getByTestId('habit-note-sheet-overlay'));

    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('hardware back dismisses without saving', () => {
    const { getByTestId } = render(<HabitNoteSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('habit-note-sheet-input'), 'typed but abandoned');
    fireEvent(getByTestId('habit-note-sheet'), 'requestClose');

    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('swiping down past the threshold dismisses without saving', () => {
    const { getByTestId } = render(<HabitNoteSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('habit-note-sheet-input'), 'typed but abandoned');

    panConfig().onPanResponderRelease({}, { dy: 120, dx: 0, vy: 0.1 });

    expect(baseProps.onDismiss).toHaveBeenCalledTimes(1);
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('a short drag snaps back rather than dismissing', () => {
    render(<HabitNoteSheet {...baseProps} />);
    panConfig().onPanResponderRelease({}, { dy: 20, dx: 0, vy: 0.1 });
    expect(baseProps.onDismiss).not.toHaveBeenCalled();
  });
});

describe('HabitNoteSheet — saving', () => {
  it('saves the trimmed note', () => {
    const { getByTestId } = render(<HabitNoteSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('habit-note-sheet-input'), '   hills felt easier   ');
    fireEvent.press(getByTestId('habit-note-sheet-save'));

    expect(baseProps.onSave).toHaveBeenCalledWith('hills felt easier');
  });

  it('does not save an empty note', () => {
    const { getByTestId } = render(<HabitNoteSheet {...baseProps} />);
    fireEvent.press(getByTestId('habit-note-sheet-save'));
    expect(baseProps.onSave).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('habit-note-sheet-input'), '    ');
    fireEvent.press(getByTestId('habit-note-sheet-save'));
    expect(baseProps.onSave).not.toHaveBeenCalled();
  });

  it('starts empty on each opening so a note cannot land on the wrong day', () => {
    const { getByTestId, rerender } = render(<HabitNoteSheet {...baseProps} />);
    fireEvent.changeText(getByTestId('habit-note-sheet-input'), 'yesterday note');

    rerender(<HabitNoteSheet {...baseProps} visible={false} />);
    rerender(<HabitNoteSheet {...baseProps} visible={true} />);

    expect(getByTestId('habit-note-sheet-input').props.value).toBe('');
  });
});
