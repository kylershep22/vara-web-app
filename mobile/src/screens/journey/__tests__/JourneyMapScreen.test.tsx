// The Practices tab root — journey slice 5a.
//
// TWO GUARANTEES, AND THE SECOND IS THE ONE THAT BITES. First, the map shows
// the user's real position in their own destination's language. Second, every
// destination the launcher used to open is still reachable from this screen,
// whatever the map does — including for a user the map cannot draw at all.
//
// The count assertion is inherited from the launcher's suite and keeps its
// meaning: FOUR cards, each going somewhere real. It held at two until Routines
// had a destination and at three until Stress Recovery had a page. It now also
// guards the other direction, since 5b will move these cards onto the phase
// detail pages and a card dropped on the way would leave FocusHubScreen and
// StressRecoveryScreen with no caller in the app at all.

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // The screen re-reads on focus. Under test there is no navigator, so focus is
  // mount: the callback runs once and its cleanup runs on unmount, which is the
  // behaviour being stood in for.
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

const mockGetJourneyState = jest.fn();
jest.mock('../../../services/firebase/journeyState.service', () => ({
  getJourneyState: (...a: any[]) => mockGetJourneyState(...a),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

import { JourneyMapScreen } from '../JourneyMapScreen';
import { DESTINATION_KEYS, PHASE_DISPLAY, PHASE_ORDER } from '../../../constants/journey';
import { PHASE_STATE_LABELS } from '../../../constants/journeyCopy';
import { ROUTES } from '../../../navigation/routes';
import { NAV_TARGETS } from '../../../navigation/navTargets';
import type { JourneyState } from '../../../types/models';

// The four cards, in the order the screen is designed to render them.
const CARD_IDS = [
  'journey-map-card-focus-time',
  'journey-map-card-energy',
  'journey-map-card-routines',
  'journey-map-card-stress-recovery',
];

// Timestamps are never read by anything this screen renders: the map asks which
// phase and why it closed, not when. Left null so the fixture cannot imply the
// dates matter.
function journeyFixture(over: Partial<JourneyState> = {}): JourneyState {
  return {
    id: 'u1',
    userId: 'u1',
    destination: 'calm',
    phaseKey: 'remove',
    enteredAt: null,
    history: [],
    skipped: [],
    advanceOfferedAt: null,
    advanceDeclinedAt: null,
    adjustOfferedAt: null,
    adjustDeclinedAt: null,
    ...over,
  } as unknown as JourneyState;
}

beforeEach(() => {
  mockNavigate.mockClear();
  mockGetJourneyState.mockReset();
  mockGetJourneyState.mockResolvedValue(journeyFixture());
});

describe('JourneyMapScreen — the map', () => {
  it('mounts as a tab root, under the title it carried as a launcher', async () => {
    const { getByTestId, getByText } = render(<JourneyMapScreen />);

    expect(getByTestId('journey-map')).toBeTruthy();
    expect(getByText('Practices')).toBeTruthy();
    await waitFor(() => expect(getByTestId('journey-map-path')).toBeTruthy());
  });

  it('renders four rows of title and gloss, in the destination the user picked', async () => {
    const { getByText, queryByText } = render(<JourneyMapScreen />);

    await waitFor(() => {
      expect(getByText(PHASE_DISPLAY.remove.calm.title)).toBeTruthy();
    });

    for (const phase of PHASE_ORDER) {
      const cell = PHASE_DISPLAY[phase].calm;
      expect(getByText(cell.title)).toBeTruthy();
      expect(getByText(cell.gloss)).toBeTruthy();
    }

    // The wrong-column check. A map hard-wired to one destination passes the
    // loop above and fails nothing.
    for (const other of DESTINATION_KEYS) {
      if (other === 'calm') continue;
      for (const phase of PHASE_ORDER) {
        const wrong = PHASE_DISPLAY[phase][other].title;
        if (wrong === PHASE_DISPLAY[phase].calm.title) continue;
        expect(queryByText(wrong)).toBeNull();
      }
    }
  });

  it('marks where the user is, what is done, and what is ahead', async () => {
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'recover',
        history: [
          {
            phaseKey: 'remove',
            enteredAt: null,
            exitedAt: null,
            exitReason: 'advanced',
          },
        ] as unknown as JourneyState['history'],
      })
    );

    const { getByTestId } = render(<JourneyMapScreen />);

    await waitFor(() =>
      expect(getByTestId('journey-map-path-remove-state')).toHaveTextContent(
        PHASE_STATE_LABELS.done
      )
    );
    expect(getByTestId('journey-map-path-recover-state')).toHaveTextContent(
      PHASE_STATE_LABELS.current
    );
    expect(getByTestId('journey-map-path-rewire-state')).toHaveTextContent(
      PHASE_STATE_LABELS.ahead
    );
    expect(getByTestId('journey-map-path-refocus-state')).toHaveTextContent(
      PHASE_STATE_LABELS.ahead
    );
  });

  it('shows a skipped phase as skipped', async () => {
    // Unreachable by using the app until slice 7 ships the offers, which is
    // exactly why it is pinned here rather than left to a device walk.
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'rewire',
        skipped: ['recover'],
        history: [
          { phaseKey: 'remove', enteredAt: null, exitedAt: null, exitReason: 'advanced' },
          { phaseKey: 'recover', enteredAt: null, exitedAt: null, exitReason: 'skipped' },
        ] as unknown as JourneyState['history'],
      })
    );

    const { getByTestId } = render(<JourneyMapScreen />);

    await waitFor(() =>
      expect(getByTestId('journey-map-path-recover-state')).toHaveTextContent(
        PHASE_STATE_LABELS.skipped
      )
    );
  });

  it('renders the map card copy, not the route strip copy', async () => {
    // `title` here, `short` on A2. Five of the sixteen cells ship the two
    // identical by design, so those are skipped rather than "fixed".
    const { getByText, queryByText } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByText(PHASE_DISPLAY.remove.calm.title)).toBeTruthy());

    for (const phase of PHASE_ORDER) {
      const cell = PHASE_DISPLAY[phase].calm;
      if (cell.short === cell.title) continue;
      expect(queryByText(cell.short)).toBeNull();
    }
  });

  it('never renders a framework word AS A LABEL', async () => {
    // Exact match rather than a word-boundary regex, for the reason recorded in
    // PhasePath's suite: one of Jen's approved glosses uses "recover" as the
    // ordinary English verb. The ban in roadmap section 8 is on the key
    // standing on its own as a phase name, and that is what this asserts.
    const { getByText, queryByText } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByText(PHASE_DISPLAY.remove.calm.title)).toBeTruthy());

    for (const phase of PHASE_ORDER) {
      expect(queryByText(phase)).toBeNull();
      expect(queryByText(phase.toUpperCase())).toBeNull();
    }
  });

  it('shows no count, fraction or ordinal', async () => {
    const { getByText, queryByText } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByText(PHASE_DISPLAY.remove.calm.title)).toBeTruthy());

    expect(queryByText(/\d+\s*(of|\/)\s*\d+/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
  });
});

describe('JourneyMapScreen — every destination stays reachable', () => {
  it('renders the four cards, in the designed order', async () => {
    const { getByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByTestId('journey-map-destinations')).toBeTruthy());
    for (const id of CARD_IDS) {
      expect(getByTestId(id)).toBeTruthy();
    }
  });

  it('has exactly four tappable cards, and every one of them navigates', async () => {
    // The no-dead-ends rule with teeth. A fifth card must not appear without a
    // destination, and a fourth must not disappear without one taking its place.
    const { getByTestId, UNSAFE_getAllByType } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByTestId('journey-map-destinations')).toBeTruthy());

    const cards = UNSAFE_getAllByType(TouchableOpacity);
    expect(cards).toHaveLength(CARD_IDS.length);

    for (const id of CARD_IDS) {
      mockNavigate.mockClear();
      fireEvent.press(getByTestId(id));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    }
  });

  it('sends each card to the route that screen is registered under', async () => {
    const { getByTestId } = render(<JourneyMapScreen />);
    await waitFor(() => expect(getByTestId('journey-map-destinations')).toBeTruthy());

    fireEvent.press(getByTestId('journey-map-card-focus-time'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PillarFocus);

    fireEvent.press(getByTestId('journey-map-card-energy'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PillarEnergy);

    fireEvent.press(getByTestId('journey-map-card-stress-recovery'));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.PillarStressRecovery);

    // The param is load-bearing: PlanScreen defaults to habits, so a card
    // labelled Routines that omitted it would land the user on the wrong tab.
    fireEvent.press(getByTestId('journey-map-card-routines'));
    expect(mockNavigate).toHaveBeenCalledWith(NAV_TARGETS.plan, { tab: 'routines' });
  });

  it('keeps every card working for a user with no journey state', async () => {
    // The absent-state render. A user the map cannot draw still gets a working
    // screen: this is what stops a failed read taking the only entry point to
    // FocusHubScreen and StressRecoveryScreen down with it.
    mockGetJourneyState.mockResolvedValue(null);

    const { getByTestId, queryByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(queryByTestId('journey-map-loading')).toBeNull());
    expect(queryByTestId('journey-map-path')).toBeNull();

    for (const id of CARD_IDS) {
      mockNavigate.mockClear();
      fireEvent.press(getByTestId(id));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    }
  });

  it('keeps every card working when the read fails outright', async () => {
    mockGetJourneyState.mockRejectedValue(new Error('offline'));

    const { getByTestId, queryByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(queryByTestId('journey-map-loading')).toBeNull());
    expect(queryByTestId('journey-map-path')).toBeNull();

    for (const id of CARD_IDS) {
      mockNavigate.mockClear();
      fireEvent.press(getByTestId(id));
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    }
  });

  it('substitutes nothing when there is no destination to speak', async () => {
    // No "Unknown", no default destination, no borrowed column. Substituting a
    // destination would put another user's language on this user's screen.
    mockGetJourneyState.mockResolvedValue(null);

    const { queryByText, queryByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(queryByTestId('journey-map-loading')).toBeNull());
    for (const destination of DESTINATION_KEYS) {
      for (const phase of PHASE_ORDER) {
        expect(queryByText(PHASE_DISPLAY[phase][destination].title)).toBeNull();
      }
    }
  });
});
