// Practices tab root — IA restructure steps 4a + 4b-i.
//
// The step-2 version of this suite asserted the shell had NOTHING tappable, as a
// tripwire that would fire the moment content arrived without a destination to
// match. It has fired, and this is its replacement: the same guarantee stated
// positively. Everything tappable on this hub goes to a route that exists.
//
// The count assertion is still the load-bearing one, now at THREE. 4b-i adds the
// Routines card; Stress Recovery has no page yet, and this suite fails if a
// fourth card appears before one does. That is the no-dead-ends rule with teeth,
// not a comment.

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

import { PracticesHubScreen } from '../PracticesHubScreen';
import { ROUTES } from '../../../navigation/routes';
import { NAV_TARGETS } from '../../../navigation/navTargets';

// The three cards, in the order the hub is designed to render them.
const CARD_IDS = [
  'practices-hub-card-focus-time',
  'practices-hub-card-energy',
  'practices-hub-card-routines',
];

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('PracticesHubScreen — pillar launcher', () => {
  it('mounts as a tab root', () => {
    const { getByTestId, getByText } = render(<PracticesHubScreen />);

    expect(getByTestId('practices-hub')).toBeTruthy();
    expect(getByText('Practices')).toBeTruthy();
  });

  it('renders the three live pillar cards, in the designed order', () => {
    const { UNSAFE_getAllByType } = render(<PracticesHubScreen />);

    // Order is designed, not incidental: Focus & Time, Energy, Routines.
    // Asserted off the rendered tree order rather than by matching label text,
    // so a copy change (these are all [COPY GAP] placeholders awaiting Jen)
    // cannot silently turn this into a no-op.
    const cards = UNSAFE_getAllByType(TouchableOpacity);
    expect(cards.map((c) => c.props.testID)).toEqual(CARD_IDS);
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

  it('routes Routines to the existing routine builder', () => {
    const { getByTestId } = render(<PracticesHubScreen />);

    fireEvent.press(getByTestId('practices-hub-card-routines'));

    // 4b-i is WIRING: this must be the same destination the dashboard's
    // "Today's routine" card already opens (DashboardScreen.tsx:424), not a new
    // screen. Asserted against NAV_TARGETS.plan rather than a hardcoded route
    // name so the card tracks the alias if that destination ever moves.
    expect(mockNavigate).toHaveBeenCalledWith(NAV_TARGETS.plan, {
      tab: 'routines',
    });
  });

  it('names the routines sub-tab explicitly, never PlanScreen\'s habits default', () => {
    const { getByTestId } = render(<PracticesHubScreen />);

    fireEvent.press(getByTestId('practices-hub-card-routines'));

    // The destination defaults to its habits sub-tab when no `tab` param is
    // passed (PlanScreen.tsx:163). A card labelled Routines that dropped the
    // param would land on habits and still look like it worked, so the param is
    // asserted on its own rather than only inside the call-shape check above.
    const [, params] = mockNavigate.mock.calls[0];
    expect(params).toEqual({ tab: 'routines' });
  });

  it('has exactly three tappable cards, and every one of them navigates', () => {
    const { UNSAFE_getAllByType } = render(<PracticesHubScreen />);

    // By component type, not by scanning props: a TouchableOpacity renders
    // several host nodes that each carry onPress and accessibilityRole, so a
    // props scan counts one card twice.
    const cards = UNSAFE_getAllByType(TouchableOpacity);

    // Three cards, no more. A fourth appearing here means a pillar card shipped
    // ahead of its page — the dead end this hub is not allowed to have.
    expect(cards).toHaveLength(3);

    for (const card of cards) {
      mockNavigate.mockClear();
      fireEvent.press(card);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    }
  });

  it('renders every card destination as a registered route name', () => {
    const { getByTestId } = render(<PracticesHubScreen />);
    const registered = new Set<string>(Object.values(ROUTES));

    for (const id of CARD_IDS) {
      mockNavigate.mockClear();
      fireEvent.press(getByTestId(id));
      expect(registered.has(mockNavigate.mock.calls[0][0])).toBe(true);
    }
  });

  it('does not ship a Stress Recovery card ahead of its page', () => {
    const { queryByTestId } = render(<PracticesHubScreen />);

    // 4b-ii adds the card and the page together. Until then a Stress Recovery
    // card would open nothing. Stated positively here as well as by the count
    // above, so the failure message names the actual rule that was broken.
    expect(queryByTestId('practices-hub-card-stress-recovery')).toBeNull();
  });

  it('still marks its copy as a gap', () => {
    const { getAllByText } = render(<PracticesHubScreen />);

    // The marker renders ON SCREEN, per the weekly-loop convention: a
    // walkthrough build must never be mistaken for finished product. All three
    // cards carry it on both their label and their descriptor.
    expect(getAllByText(/^\[COPY GAP\]/)).toHaveLength(CARD_IDS.length * 2 + 1);
  });
});
