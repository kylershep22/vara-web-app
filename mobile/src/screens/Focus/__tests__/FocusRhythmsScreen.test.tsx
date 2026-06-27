// Focus rhythms (Four-Pillar IA Phase B-3c). A multi-select capture of when
// focus comes easiest. Opt-in, nothing scored. Reached from the Focus hub.

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

const mockSave = jest.fn((..._a: any[]) => Promise.resolve());
const mockGet = jest.fn((..._a: any[]) => Promise.resolve([] as string[]));
jest.mock('../../../services/firebase/focusRhythms.service', () => ({
  saveFocusRhythms: (...a: any[]) => mockSave(...a),
  getFocusRhythms: (...a: any[]) => mockGet(...a),
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FocusRhythmsScreen } from '../FocusRhythmsScreen';

beforeEach(() => {
  mockGoBack.mockClear();
  mockSave.mockClear();
  mockGet.mockReset();
  mockGet.mockResolvedValue([]);
});

describe('FocusRhythmsScreen', () => {
  it('renders the intro, cue, options, the quiet note, and Save', () => {
    const { getByText } = render(<FocusRhythmsScreen />);
    expect(
      getByText(
        'When does focus tend to come most easily? Noticing your natural rhythms can help you plan around them.'
      )
    ).toBeTruthy();
    expect(getByText('Pick any that fit.')).toBeTruthy();
    expect(getByText('Early morning')).toBeTruthy();
    expect(getByText('It varies')).toBeTruthy();
    expect(getByText('Just for you. Nothing here is tracked or scored.')).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
  });

  it('is multi-select: more than one option can be active at once', () => {
    const { getByTestId } = render(<FocusRhythmsScreen />);
    fireEvent.press(getByTestId('focus-rhythm-option-early_morning'));
    fireEvent.press(getByTestId('focus-rhythm-option-evening'));
    expect(getByTestId('focus-rhythm-option-early_morning').props.accessibilityState.checked).toBe(true);
    expect(getByTestId('focus-rhythm-option-evening').props.accessibilityState.checked).toBe(true);
  });

  it('toggles a selection off when tapped again', () => {
    const { getByTestId } = render(<FocusRhythmsScreen />);
    const opt = () => getByTestId('focus-rhythm-option-afternoon');
    fireEvent.press(opt());
    expect(opt().props.accessibilityState.checked).toBe(true);
    fireEvent.press(opt());
    expect(opt().props.accessibilityState.checked).toBe(false);
  });

  it('Save persists the selected windows and returns', async () => {
    const { getByTestId, getByText } = render(<FocusRhythmsScreen />);
    fireEvent.press(getByTestId('focus-rhythm-option-mid_morning'));
    fireEvent.press(getByText('Save'));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith('u1', ['mid_morning']));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('pre-selects the user\'s previously saved windows', async () => {
    mockGet.mockResolvedValue(['evening']);
    const { getByTestId } = render(<FocusRhythmsScreen />);
    await waitFor(() =>
      expect(getByTestId('focus-rhythm-option-evening').props.accessibilityState.checked).toBe(true)
    );
  });
});
