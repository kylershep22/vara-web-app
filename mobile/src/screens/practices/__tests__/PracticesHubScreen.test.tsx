// Practices tab root — IA restructure step 4a.
//
// The step-2 version of this suite asserted the shell had NOTHING tappable, as a
// tripwire that would fire the moment content arrived without a destination to
// match. It has fired, and this is its replacement: the same guarantee stated
// positively. Everything tappable on this hub goes to a route that exists.
//
// The count assertion is the load-bearing one. 4a ships TWO pillar cards; the
// other two pillars (Routines & Systems, Stress Recovery) have no pages yet, and
// this suite fails if a third card appears before one does. That is the no-dead-
// ends rule with teeth, not a comment.

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { PracticesHubScreen } from '../PracticesHubScreen';
import { ROUTES } from '../../../navigation/routes';

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('PracticesHubScreen — step 4a pillar launcher', () => {
  it('mounts as a tab root', () => {
    const { getByTestId, getByText } = render(<PracticesHubScreen />);

    expect(getByTestId('practices-hub')).toBeTruthy();
    expect(getByText('Practices')).toBeTruthy();
  });

  it('renders the two live pillar cards, in the designed order', () => {
    const { getByTestId, getAllByText } = render(<PracticesHubScreen />);

    expect(getByTestId('practices-hub-card-focus-time')).toBeTruthy();
    expect(getByTestId('practices-hub-card-energy')).toBeTruthy();

    // Order is designed, not incidental: Focus & Time first, Energy second.
    const labels = getAllByText(/Focus & Time|^\[COPY GAP\] Energy$/);
    expect(labels).toHaveLength(2);
    expect(labels[0].props.children).toContain('Focus & Time');
    expect(labels[1].props.children).toContain('Energy');
  });

  it('routes Focus & Time to the Focus hub', () => {
    const { getByTestId } = render(<PracticesHubScreen />);

    fireEvent.press(getByTestId('practices-hub-card-focus-time'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PillarFocus);
  });

  it('routes Energy to the Energy hub', () => {
    const { getByTestId } = render(<PracticesHubScreen />);

    fireEvent.press(getByTestId('practices-hub-card-energy'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PillarEnergy);
  });

  it('has exactly two tappable cards, and every one of them navigates', () => {
    const { UNSAFE_getAllByType } = render(<PracticesHubScreen />);

    // By component type, not by scanning props: a TouchableOpacity renders
    // several host nodes that each carry onPress and accessibilityRole, so a
    // props scan counts one card twice.
    const cards = UNSAFE_getAllByType(TouchableOpacity);

    // Two cards, no more. A third appearing here means a pillar card shipped
    // ahead of its page — the dead end this hub is not allowed to have.
    expect(cards).toHaveLength(2);

    for (const card of cards) {
      mockNavigate.mockClear();
      fireEvent.press(card);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    }
  });

  it('renders every card destination as a registered route name', () => {
    const { getByTestId } = render(<PracticesHubScreen />);
    const registered = new Set<string>(Object.values(ROUTES));

    for (const id of ['focus-time', 'energy']) {
      mockNavigate.mockClear();
      fireEvent.press(getByTestId(`practices-hub-card-${id}`));
      expect(registered.has(mockNavigate.mock.calls[0][0])).toBe(true);
    }
  });

  it('still marks its copy as a gap', () => {
    const { getAllByText } = render(<PracticesHubScreen />);

    // The marker renders ON SCREEN, per the weekly-loop convention: a
    // walkthrough build must never be mistaken for finished product.
    expect(getAllByText(/^\[COPY GAP\]/).length).toBeGreaterThan(0);
  });
});
