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
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FocusHubScreen } from '../FocusHubScreen';

// The primary card's two bodies. Asserted as literals on purpose: importing the
// constants from the component would let a copy change pass silently.
const DEFAULT_BODY =
  'Choose a length, settle in if you need to, and give a single task your full attention.';
const IN_WINDOW_BODY = "Now's usually an easier time to focus. Protect a little of it?";

// Layer 1 replaced 2c's passive line with the body swap above. Nothing may
// render this string, or its test id, ever again.
const RETIRED_PASSIVE_LINE =
  'Focus usually comes a little easier for you around now.';

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
    expect(getByText(DEFAULT_BODY)).toBeTruthy();
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

  it('shows both focus tools, in order after rhythms', () => {
    const { getByText, getByTestId } = render(<FocusHubScreen />);
    expect(getByText('Time blocking')).toBeTruthy();
    // The body survived the coming-soon swap verbatim: TB-1b changed the
    // affordance, not the promise.
    expect(getByText('Shape the day into a few protected blocks.')).toBeTruthy();
    expect(getByText('Task batching')).toBeTruthy();
    expect(getByText('Group similar work so you switch less.')).toBeTruthy();
    // Both present and distinct; the rhythms row still sits above them.
    expect(getByTestId('focus-hub-card-rhythms')).toBeTruthy();
    expect(getByTestId('focus-hub-card-time-blocking')).toBeTruthy();
    expect(getByTestId('focus-hub-card-task-batching')).toBeTruthy();
  });

  it('routes Time blocking to the day view, and nowhere else', () => {
    // THE card-swap tripwire. Mirrors the Stress Recovery pattern: a live card
    // must land on its OWN screen, so a copy-paste of the rhythms row (the
    // nearest neighbour, and the row this card was styled from) fails here
    // rather than shipping.
    const { getByTestId } = render(<FocusHubScreen />);

    fireEvent.press(getByTestId('focus-hub-card-time-blocking'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('FocusDayBlocks');
    expect(mockNavigate).not.toHaveBeenCalledWith('FocusRhythms');
    expect(mockNavigate).not.toHaveBeenCalledWith('FocusTimer', expect.anything());
  });

  it('leaves Task batching navigating nowhere when pressed', () => {
    const { getByTestId } = render(<FocusHubScreen />);
    fireEvent.press(getByTestId('focus-hub-card-task-batching'));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('keeps Task batching inert to assistive tech, and Time blocking actionable', () => {
    const { getByTestId } = render(<FocusHubScreen />);

    const comingSoon = getByTestId('focus-hub-card-task-batching');
    expect(comingSoon.props.accessibilityRole).toBe('text');
    expect(comingSoon.props.onPress).toBeUndefined();

    // The swapped card is a real button now, which is the whole point of the
    // swap: an inert card that navigates would be the worst of both.
    const live = getByTestId('focus-hub-card-time-blocking');
    expect(live.props.accessibilityRole).toBe('button');
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

    it('gives "varies" alone its own sentence', async () => {
      mockGetFocusRhythms.mockResolvedValue(['varies']);
      const { findByText } = render(<FocusHubScreen />);
      expect(await findByText("Your focus doesn't follow one fixed time.")).toBeTruthy();
    });

    it('still routes to the rhythms screen once reflected', async () => {
      mockGetFocusRhythms.mockResolvedValue(['evening']);
      const { findByText, getByTestId } = render(<FocusHubScreen />);
      await findByText('Focus tends to come easiest for you in the evening.');
      fireEvent.press(getByTestId('focus-hub-card-rhythms'));
      expect(mockNavigate).toHaveBeenCalledWith('FocusRhythms');
    });

    it('keeps reflecting while the primary card speaks in-window', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, getByText } = render(<FocusHubScreen />);
      // READ 1 (the rhythms row) and the Layer 1 body swap are independent.
      await findByText(IN_WINDOW_BODY);
      expect(
        getByText('Focus tends to come easiest for you in the afternoon.')
      ).toBeTruthy();
    });
  });

  describe('in-window invitation on the primary card', () => {
    it('swaps the body to the invitation inside a stored window', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, queryByText } = render(<FocusHubScreen />);
      expect(await findByText(IN_WINDOW_BODY)).toBeTruthy();
      expect(queryByText(DEFAULT_BODY)).toBeNull();
    });

    it('keeps the default body outside every stored window', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(6);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, getByText, queryByText } = render(<FocusHubScreen />);
      // Wait for the read to land so this is not just asserting the pre-load state.
      await findByText('Focus tends to come easiest for you in the afternoon.');
      expect(getByText(DEFAULT_BODY)).toBeTruthy();
      expect(queryByText(IN_WINDOW_BODY)).toBeNull();
    });

    // Every real window, both sides. The out-hour for each is deliberately
    // inside a DIFFERENT window, so a matcher that ignored the stored set
    // entirely would fail here rather than pass by accident.
    it.each([
      ['early_morning', 6, 14],
      ['mid_morning', 10, 6],
      ['afternoon', 14, 23],
      ['evening', 19, 10],
      ['late_night', 23, 14],
    ])('%s: invites at %i:00, stays default at %i:00', async (window, inHour, outHour) => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(inHour as number);
      mockGetFocusRhythms.mockResolvedValue([window]);
      const inside = render(<FocusHubScreen />);
      expect(await inside.findByText(IN_WINDOW_BODY)).toBeTruthy();
      inside.unmount();

      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(outHour as number);
      const outside = render(<FocusHubScreen />);
      expect(await outside.findByText(DEFAULT_BODY)).toBeTruthy();
      expect(outside.queryByText(IN_WINDOW_BODY)).toBeNull();
    });

    it('never invites on "varies" alone, at any hour', async () => {
      mockGetFocusRhythms.mockResolvedValue(['varies']);
      for (const hour of [0, 6, 10, 14, 19, 23]) {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
        const { findByText, queryByText, unmount } = render(<FocusHubScreen />);
        expect(await findByText("Your focus doesn't follow one fixed time.")).toBeTruthy();
        expect(queryByText(DEFAULT_BODY)).toBeTruthy();
        expect(queryByText(IN_WINDOW_BODY)).toBeNull();
        unmount();
      }
    });

    it('never invites with no windows set, at any hour', async () => {
      mockGetFocusRhythms.mockResolvedValue([]);
      for (const hour of [0, 6, 10, 14, 19, 23]) {
        jest.spyOn(Date.prototype, 'getHours').mockReturnValue(hour);
        const { findByText, queryByText, unmount } = render(<FocusHubScreen />);
        expect(await findByText(DEFAULT_BODY)).toBeTruthy();
        expect(queryByText(IN_WINDOW_BODY)).toBeNull();
        unmount();
      }
    });

    it('invites either side of midnight for a late-night setter, but not at 3am', async () => {
      mockGetFocusRhythms.mockResolvedValue(['late_night']);

      // 23:30 — before the wrap.
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
      const before = render(<FocusHubScreen />);
      expect(await before.findByText(IN_WINDOW_BODY)).toBeTruthy();
      before.unmount();

      // 00:30 — after the wrap, still the same window.
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(0);
      const after = render(<FocusHubScreen />);
      expect(await after.findByText(IN_WINDOW_BODY)).toBeTruthy();
      after.unmount();

      // 03:00 — hours 2 to 4 belong to no window at all.
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(3);
      const dead = render(<FocusHubScreen />);
      // The rhythms row still reflects; only the body goes back to default.
      expect(
        await dead.findByText('Focus tends to come easiest for you late at night.')
      ).toBeTruthy();
      expect(dead.getByText(DEFAULT_BODY)).toBeTruthy();
      expect(dead.queryByText(IN_WINDOW_BODY)).toBeNull();
    });

    it('keeps the default body when the rhythms read fails', async () => {
      mockGetFocusRhythms.mockRejectedValue(new Error('offline'));
      const { getByText, queryByText } = render(<FocusHubScreen />);
      await waitFor(() =>
        expect(getByText('Notice when focus comes easiest for you.')).toBeTruthy()
      );
      expect(getByText(DEFAULT_BODY)).toBeTruthy();
      expect(queryByText(IN_WINDOW_BODY)).toBeNull();
    });

    it('renders the invitation at AA on the card, not the default body color', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText } = render(<FocusHubScreen />);
      const body = await findByText(IN_WINDOW_BODY);
      // softCharcoal (10.7:1 on the card), not mutedSageGray (4.22:1, under AA).
      expect(StyleSheet.flatten(body.props.style).color).toBe('#3E3E3E');
    });

    it('leaves the default body color untouched', () => {
      const { getByText } = render(<FocusHubScreen />);
      // The app-wide mutedSageGray contrast issue is NOT closed by this slice.
      expect(StyleSheet.flatten(getByText(DEFAULT_BODY).props.style).color).toBe('#6F7F77');
    });

    it('reads the invitation to assistive tech as part of the one CTA', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, getByTestId } = render(<FocusHubScreen />);
      await findByText(IN_WINDOW_BODY);
      expect(getByTestId('focus-hub-card-primary').props.accessibilityLabel).toBe(
        `Set a focus. ${IN_WINDOW_BODY}`
      );
    });

    it('stays on-grain: no peak / optimizer / best-hours framing', () => {
      expect(IN_WINDOW_BODY).not.toMatch(
        /peak|optimi[sz]|most productive|your best|prime time|make the most of/i
      );
      // Invitational and present tense, never deficit or guilt.
      expect(IN_WINDOW_BODY).not.toMatch(/should|missed|don't|didn't|not your|wasted/i);
    });

    it('adds no second CTA: one primary card, still routing to the timer', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, getAllByTestId, getByTestId } = render(<FocusHubScreen />);
      await findByText(IN_WINDOW_BODY);
      expect(getAllByTestId('focus-hub-card-primary')).toHaveLength(1);
      fireEvent.press(getByTestId('focus-hub-card-primary'));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('FocusTimer', { fromHub: true });
    });

    it('leaves the rhythms row and both tool cards alone', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, getByText, getByTestId } = render(<FocusHubScreen />);
      await findByText(IN_WINDOW_BODY);
      expect(getByText('Deep work')).toBeTruthy();
      expect(getByText('Set a focus')).toBeTruthy();
      // Both tool cards still render in-window. Time blocking is live as of
      // TB-1b, Task batching is still a placeholder; the in-window state
      // changes neither.
      expect(getByTestId('focus-hub-card-time-blocking')).toBeTruthy();
      expect(getByTestId('focus-hub-card-task-batching')).toBeTruthy();
      fireEvent.press(getByTestId('focus-hub-card-rhythms'));
      expect(mockNavigate).toHaveBeenCalledWith('FocusRhythms');
    });
  });

  describe("2c's passive in-window line is gone", () => {
    it('renders neither the retired line nor its test id, in-window', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, queryByText, queryByTestId } = render(<FocusHubScreen />);
      await findByText(IN_WINDOW_BODY);
      expect(queryByText(RETIRED_PASSIVE_LINE)).toBeNull();
      expect(queryByTestId('focus-hub-rhythm-note')).toBeNull();
    });

    it('renders neither out-of-window either', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(6);
      mockGetFocusRhythms.mockResolvedValue(['afternoon']);
      const { findByText, queryByText, queryByTestId } = render(<FocusHubScreen />);
      await findByText(DEFAULT_BODY);
      expect(queryByText(RETIRED_PASSIVE_LINE)).toBeNull();
      expect(queryByTestId('focus-hub-rhythm-note')).toBeNull();
    });
  });

  it('has no streak / count / stats language', () => {
    const { queryByText } = render(<FocusHubScreen />);
    expect(queryByText(/streak/i)).toBeNull();
    expect(queryByText(/sessions today/i)).toBeNull();
  });
});
