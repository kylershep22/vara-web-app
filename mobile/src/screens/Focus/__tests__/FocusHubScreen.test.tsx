// Focus hub (Four-Pillar IA Phase B-3c). The PillarFocus tab root: a calm home
// with one primary action (set a focus → the timer) and a quieter secondary
// entry (focus rhythms). No streaks, no counts, no stats.

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // The hub re-reads rhythms and the clock on focus. In tests, run it once on
  // mount: the callback is already useCallback-wrapped in the component.
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require('react');
    React.useEffect(cb, []);
  },
}));
// The hub reads the signed-in user to load their rhythms. Stubbed here so the
// hub test does not pull the AuthContext / RevenueCat module chain.
const mockGetFocusRhythms = jest.fn();
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
jest.mock('../../../services/firebase/focusRhythms.service', () => ({
  getFocusRhythms: (...a: any[]) => mockGetFocusRhythms(...a),
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
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FocusHubScreen } from '../FocusHubScreen';

beforeEach(() => {
  mockNavigate.mockClear();
  // Default: no rhythms set, and an hour inside no particular test's window.
  mockGetFocusRhythms.mockResolvedValue([]);
  jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
});

afterEach(() => {
  jest.restoreAllMocks();
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

  describe('rhythms recall', () => {
    it('reflects the stored rhythms back in the card body', async () => {
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText } = render(<FocusHubScreen />);
      expect(
        await findByText('Focus tends to come easiest for you in the afternoon.')
      ).toBeTruthy();
    });

    it('keeps the invitation copy when nothing is set', async () => {
      mockGetFocusRhythms.mockResolvedValue([]);
      const { getByText } = render(<FocusHubScreen />);
      await waitFor(() =>
        expect(getByText('Notice when focus comes easiest for you.')).toBeTruthy()
      );
    });

    it('gives "varies" alone its own sentence and no in-window line', async () => {
      mockGetFocusRhythms.mockResolvedValue(['varies']);
      const { findByText, queryByTestId } = render(<FocusHubScreen />);
      expect(await findByText("Your focus doesn't follow one fixed time.")).toBeTruthy();
      expect(queryByTestId('focus-hub-rhythm-note')).toBeNull();
    });

    it('still routes to the rhythms screen once reflected', async () => {
      mockGetFocusRhythms.mockResolvedValue(['evening']);
      const { findByText, getByTestId } = render(<FocusHubScreen />);
      await findByText('Focus tends to come easiest for you in the evening.');
      fireEvent.press(getByTestId('focus-hub-card-rhythms'));
      expect(mockNavigate).toHaveBeenCalledWith('FocusRhythms');
    });

    it('shows the in-window line when the clock is inside a stored window', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByTestId, getByText } = render(<FocusHubScreen />);
      await findByTestId('focus-hub-rhythm-note');
      expect(
        getByText('Focus usually comes a little easier for you around now.')
      ).toBeTruthy();
    });

    it('stays silent outside every stored window', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(6);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, queryByTestId } = render(<FocusHubScreen />);
      await findByText('Focus tends to come easiest for you in the afternoon.');
      // No "not your window" counterpart: the correct output is nothing.
      expect(queryByTestId('focus-hub-rhythm-note')).toBeNull();
    });

    it('shows the line after midnight for a late-night setter, but not at 3am', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(0);
      mockGetFocusRhythms.mockResolvedValue(['late_night']);
      const first = render(<FocusHubScreen />);
      expect(await first.findByTestId('focus-hub-rhythm-note')).toBeTruthy();
      first.unmount();

      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3);
      const second = render(<FocusHubScreen />);
      // Summary still reflects; only the present-tense line goes quiet.
      expect(
        await second.findByText('Focus tends to come easiest for you late at night.')
      ).toBeTruthy();
      expect(second.queryByTestId('focus-hub-rhythm-note')).toBeNull();
    });

    it('leaves the invitation in place when the rhythms read fails', async () => {
      mockGetFocusRhythms.mockRejectedValue(new Error('offline'));
      const { getByText, queryByTestId } = render(<FocusHubScreen />);
      await waitFor(() =>
        expect(getByText('Notice when focus comes easiest for you.')).toBeTruthy()
      );
      expect(queryByTestId('focus-hub-rhythm-note')).toBeNull();
    });

    it('does not disturb the primary card or the coming-soon cards', async () => {
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByTestId, getByText, getByTestId } = render(<FocusHubScreen />);
      await findByTestId('focus-hub-rhythm-note');
      expect(getByText('Set a focus')).toBeTruthy();
      expect(getByTestId('focus-hub-card-time-blocking')).toBeTruthy();
      expect(getByTestId('focus-hub-card-task-batching')).toBeTruthy();
      fireEvent.press(getByTestId('focus-hub-card-primary'));
      expect(mockNavigate).toHaveBeenCalledWith('FocusTimer', { fromHub: true });
    });
  });

  it('has no streak / count / stats language', () => {
    const { queryByText } = render(<FocusHubScreen />);
    expect(queryByText(/streak/i)).toBeNull();
    expect(queryByText(/sessions today/i)).toBeNull();
  });
});
