// Practices tab root — IA restructure steps 4a + 4b-i + 4b-ii-a.
//
// The step-2 version of this suite asserted the shell had NOTHING tappable, as a
// tripwire that would fire the moment content arrived without a destination to
// match. It has fired, and this is its replacement: the same guarantee stated
// positively. Everything tappable on this hub goes to a route that exists.
//
// The count assertion is still the load-bearing one, now at FOUR — the complete
// pillar set. It has done its job twice: it held at two until Routines had a
// destination, then at three until Stress Recovery had a page. Now that the set
// is closed it changes meaning slightly, from "nothing has shipped early" to
// "nothing has been added without a page", and a FIFTH card must not appear
// without one. That is the no-dead-ends rule with teeth, not a comment.

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

// The four cards, in the order the hub is designed to render them.
const CARD_IDS = [
  'practices-hub-card-focus-time',
  'practices-hub-card-energy',
  'practices-hub-card-routines',
  'practices-hub-card-stress-recovery',
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

  it('renders the four live pillar cards, in the designed order', () => {
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

  it('has exactly four tappable cards, and every one of them navigates', () => {
    const { UNSAFE_getAllByType } = render(<PracticesHubScreen />);

    // By component type, not by scanning props: a TouchableOpacity renders
    // several host nodes that each carry onPress and accessibilityRole, so a
    // props scan counts one card twice.
    const cards = UNSAFE_getAllByType(TouchableOpacity);

    // Four cards, no more. A fifth appearing here means a pillar card shipped
    // ahead of its page — the dead end this hub is not allowed to have.
    expect(cards).toHaveLength(4);

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

  it('routes Stress Recovery to its page', () => {
    const { getByTestId } = render(<PracticesHubScreen />);

    fireEvent.press(getByTestId('practices-hub-card-stress-recovery'));

    // The inverse of the assertion this replaces. Until 4b-ii-a this test read
    // `expect(...).toBeNull()`, guarding against the card shipping ahead of its
    // page; the page landed in the same commit as the card, so the guard is
    // retired by being turned around rather than deleted.
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PillarStressRecovery);
  });

  it('sends Stress Recovery somewhere other than Energy, despite sharing its practices', () => {
    const { getByTestId } = render(<PracticesHubScreen />);

    fireEvent.press(getByTestId('practices-hub-card-stress-recovery'));

    // Stress Recovery cross-lists Energy's settle practices, so "just point it
    // at Energy" is a plausible-looking shortcut that would destroy the point
    // of the pillar: the framing around the practices IS the feature. Pinned
    // so that shortcut cannot be taken quietly.
    expect(mockNavigate).not.toHaveBeenCalledWith(ROUTES.PillarEnergy);
  });

  it('still marks its copy as a gap', () => {
    const { getAllByText } = render(<PracticesHubScreen />);

    // The marker renders ON SCREEN, per the weekly-loop convention: a
    // walkthrough build must never be mistaken for finished product. Every card
    // carries it on both its label and its descriptor, plus one on the page
    // intro — hence the arithmetic, which scales with CARD_IDS rather than
    // needing a hand-edit each time a pillar lands.
    expect(getAllByText(/^\[COPY GAP\]/)).toHaveLength(CARD_IDS.length * 2 + 1);
  });
});
