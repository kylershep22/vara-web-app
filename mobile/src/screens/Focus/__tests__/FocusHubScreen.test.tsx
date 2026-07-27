// Focus hub (Four-Pillar IA Phase B-3c). The PillarFocus tab root: a calm home
// with one primary action (set a focus → the timer) and a quieter secondary
// entry (focus rhythms). No streaks, no counts, no stats.

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));
// The docked Guide pill pulls the AI chat + consent stack; stub it out so the
// hub unit test stays focused on the hub's own content and navigation.
jest.mock('../../../components/ai/GuidePill', () => ({
  GuidePill: () => null,
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { FocusHubScreen } from '../FocusHubScreen';

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('FocusHubScreen', () => {
  it('renders the title and calm subtitle', () => {
    const { getByText } = render(<FocusHubScreen />);
    expect(getByText('Focus')).toBeTruthy();
    expect(getByText('Protected time for one thing at a time.')).toBeTruthy();
  });

  it('shows the primary "Set a focus" card with eyebrow + body', () => {
    const { getByText } = render(<FocusHubScreen />);
    expect(getByText('Deep work')).toBeTruthy();
    expect(getByText('Set a focus')).toBeTruthy();
    expect(
      getByText(
        'Choose a length, settle in if you need to, and give a single task your full attention.'
      )
    ).toBeTruthy();
  });

  it('tapping the primary card opens the focus timer, flagged as hub-launched', () => {
    const { getByTestId } = render(<FocusHubScreen />);
    fireEvent.press(getByTestId('focus-hub-card-primary'));
    // fromHub chains the timer into the focus reflection on completion (commit 3).
    expect(mockNavigate).toHaveBeenCalledWith('FocusTimer', { fromHub: true });
  });

  it('shows the secondary "Focus rhythms" entry and routes to it', () => {
    const { getByText, getByTestId } = render(<FocusHubScreen />);
    expect(getByText('Focus rhythms')).toBeTruthy();
    expect(getByText('Notice when focus comes easiest for you.')).toBeTruthy();
    fireEvent.press(getByTestId('focus-hub-card-rhythms'));
    expect(mockNavigate).toHaveBeenCalledWith('FocusRhythms');
  });

  it('shows the planned tools as coming-soon cards, in order after rhythms', () => {
    const { getByText, getByTestId } = render(<FocusHubScreen />);
    expect(getByText('Time blocking')).toBeTruthy();
    expect(getByText('Shape the day into a few protected blocks.')).toBeTruthy();
    expect(getByText('Task batching')).toBeTruthy();
    expect(getByText('Group similar work so you switch less.')).toBeTruthy();
    // Both are present and distinct; the rhythms row still sits above them.
    expect(getByTestId('focus-hub-card-rhythms')).toBeTruthy();
    expect(getByTestId('focus-hub-card-time-blocking')).toBeTruthy();
    expect(getByTestId('focus-hub-card-task-batching')).toBeTruthy();
  });

  it('coming-soon cards navigate nowhere when pressed', () => {
    const { getByTestId } = render(<FocusHubScreen />);
    fireEvent.press(getByTestId('focus-hub-card-time-blocking'));
    fireEvent.press(getByTestId('focus-hub-card-task-batching'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('coming-soon cards are inert to assistive tech, not actionable', () => {
    const { getByTestId } = render(<FocusHubScreen />);
    for (const id of ['focus-hub-card-time-blocking', 'focus-hub-card-task-batching']) {
      const card = getByTestId(id);
      expect(card.props.accessibilityRole).toBe('text');
      expect(card.props.onPress).toBeUndefined();
    }
  });

  it('has no streak / count / stats language', () => {
    const { queryByText } = render(<FocusHubScreen />);
    expect(queryByText(/streak/i)).toBeNull();
    expect(queryByText(/sessions today/i)).toBeNull();
  });
});
