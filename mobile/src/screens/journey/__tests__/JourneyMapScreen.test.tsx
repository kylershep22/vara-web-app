// The Practices tab root — journey slice 5a.
//
// TWO GUARANTEES, AND THE SECOND IS THE ONE THAT BITES. First, the map shows
// the user's real position in their own destination's language. Second, every
// destination the launcher used to open is still reachable from this screen,
// whatever the map does — including for a user the map cannot draw at all.
//
// The count assertion is inherited from the launcher's suite and keeps its
// meaning: FOUR cards, each going somewhere real. It held at two until Routines
// had a destination and at three until Stress Recovery had a page.
//
// THE CARDS ARE NOT GOING ANYWHERE (slice 5b-i, decision 3). This file used to
// say 5b would move them onto the phase detail pages; that clause is superseded,
// because a phase page is an explanation and not a second launcher. This screen
// remains the only navigator to ROUTES.PillarFocus and
// ROUTES.PillarStressRecovery in the app, so the count keeps guarding both
// directions for as long as that is true.

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

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
const mockGetRenderableJourneyState = jest.fn();
jest.mock('../../../services/firebase/journeyState.service', () => ({
  getJourneyState: (...a: any[]) => mockGetJourneyState(...a),
  // SLICE 7f. The screen reads through the VALIDATING accessor now. Both are
  // mocked, and a test below asserts which one the screen actually calls: a
  // suite that mocked only the accessor would pass just as happily against a
  // screen that had quietly gone back to the raw read.
  getRenderableJourneyState: (...a: any[]) => mockGetRenderableJourneyState(...a),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

// SLICE 5c. The screen now mounts StartHereRow, which resolves a Storage path
// and reads a local marker. Both are faked here so the map's own assertions stay
// about the map: the default is a video that has not resolved, which is what
// every user sees today, and which renders no row at all.
const mockUseVideoSource = jest.fn();
jest.mock('../../../hooks/useVideoSource', () => ({
  useVideoSource: (path: string | null) => mockUseVideoSource(path),
}));

jest.mock('../../../constants/startHere', () => ({
  START_HERE_PATHS: { practices: 'focus-video/test_explainer_v1.mp4', today: null },
  START_HERE_LABEL: 'Start here',
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(),
}));

jest.mock('../../../components/video/VideoPlayerModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VideoPlayerModal: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'video-player-modal-stub', ...props }),
  };
});

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
  mockGetRenderableJourneyState.mockReset();
  mockGetRenderableJourneyState.mockResolvedValue(journeyFixture());
  mockUseVideoSource.mockReset();
  // No video resolved: the shipped state, and the state in which the row does
  // not exist. Every assertion in this file except the two below runs against a
  // screen with no Start here on it, exactly as main does today.
  mockUseVideoSource.mockReturnValue({
    url: null,
    loading: false,
    error: null,
    retry: jest.fn(),
  });
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
    mockGetRenderableJourneyState.mockResolvedValue(
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
    mockGetRenderableJourneyState.mockResolvedValue(
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

  it('opens the phase page from every row, carrying phase and destination', async () => {
    // ALL FOUR ROWS, INCLUDING THE ONES AHEAD. Roadmap section 8: AHEAD opens.
    // A map where only the current and completed rows led somewhere would draw
    // the locked door the model does not have.
    const { getByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByTestId('journey-map-path')).toBeTruthy());

    for (const phase of PHASE_ORDER) {
      mockNavigate.mockClear();
      fireEvent.press(getByTestId(`journey-map-path-${phase}`));
      expect(mockNavigate).toHaveBeenCalledWith(ROUTES.JourneyPhase, {
        phase,
        // The destination travels with the phase so the page renders its title
        // and body even when its own read fails. The fixture is 'calm'.
        destination: 'calm',
      });
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
    //
    // SCOPED TO THE CARD BLOCK SINCE 5b-i. It used to count every
    // TouchableOpacity on the screen, which was exact while the map rows were
    // inert and became wrong the moment they became buttons: the count went to
    // eight and the test failed without anything being broken. Counting inside
    // the destinations container asserts the same thing and says which four it
    // means, so the two pressable groups can change independently.
    const { getByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByTestId('journey-map-destinations')).toBeTruthy());

    const cards = within(getByTestId('journey-map-destinations')).UNSAFE_getAllByType(
      TouchableOpacity
    );
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
    mockGetRenderableJourneyState.mockResolvedValue(null);

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
    mockGetRenderableJourneyState.mockRejectedValue(new Error('offline'));

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
    mockGetRenderableJourneyState.mockResolvedValue(null);

    const { queryByText, queryByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(queryByTestId('journey-map-loading')).toBeNull());
    for (const destination of DESTINATION_KEYS) {
      for (const phase of PHASE_ORDER) {
        expect(queryByText(PHASE_DISPLAY[phase][destination].title)).toBeNull();
      }
    }
  });
});

describe('JourneyMapScreen — Start here', () => {
  it('shows nothing at all while no explainer has been authored', async () => {
    // The shipped state of slice 5c, asserted at the mount rather than only at
    // the component. Both paths in constants/startHere.ts are null on main, so
    // the row cannot resolve and the map looks exactly as it did before.
    const { queryByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(queryByTestId('journey-map-loading')).toBeNull());
    expect(queryByTestId('journey-map-start-here')).toBeNull();
  });

  it('renders while the journey read is still in flight', async () => {
    // THE INDEPENDENCE THAT THE PLACEMENT EXISTS TO GIVE IT. The row is a
    // sibling of the loading branch, never a child of it, so a slow
    // journeyStates read cannot take the explainer down with it. A never
    // settling read holds the screen in its loading state for the assertion.
    mockUseVideoSource.mockReturnValue({
      url: 'https://example.test/clip.mp4',
      loading: false,
      error: null,
      retry: jest.fn(),
    });
    mockGetRenderableJourneyState.mockReturnValue(new Promise(() => undefined));

    const { getByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByTestId('journey-map-start-here')).toBeTruthy());
    // Still loading: the path has not been drawn, and the row is there anyway.
    expect(getByTestId('journey-map-loading')).toBeTruthy();
  });

  it('renders for a user the map cannot draw at all', async () => {
    // Same guarantee from the other side, and the same shape as the four
    // destination cards' absent-state tests above: a user with no journey
    // document still gets the explainer.
    mockUseVideoSource.mockReturnValue({
      url: 'https://example.test/clip.mp4',
      loading: false,
      error: null,
      retry: jest.fn(),
    });
    mockGetRenderableJourneyState.mockResolvedValue(null);

    const { getByTestId, queryByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByTestId('journey-map-start-here')).toBeTruthy());
    expect(queryByTestId('journey-map-path')).toBeNull();
  });

  it('leaves the four destination cards untouched when it appears', async () => {
    // The count assertion above is scoped to the destinations block precisely so
    // a fifth pressable elsewhere on the screen cannot break it. This is the
    // other half of that: the row appearing must not add or remove a card.
    mockUseVideoSource.mockReturnValue({
      url: 'https://example.test/clip.mp4',
      loading: false,
      error: null,
      retry: jest.fn(),
    });

    const { getByTestId } = render(<JourneyMapScreen />);

    await waitFor(() => expect(getByTestId('journey-map-start-here')).toBeTruthy());
    const cards = within(getByTestId('journey-map-destinations')).UNSAFE_getAllByType(
      TouchableOpacity
    );
    expect(cards).toHaveLength(CARD_IDS.length);
  });
});

// THE READ BOUNDARY ON THIS SCREEN (slice 7f).
//
// The map is the surface 7e's resolver guard could not reach: it calls the
// service directly. A `destination` outside its union used to index
// PHASE_DISPLAY inside PhasePath during a render, and the app has ONE
// ErrorBoundary and it sits above the navigator (App.tsx:114), so the cost was
// every tab rather than this screen.
describe('JourneyMapScreen - the read boundary', () => {
  // THE ASSERTION THAT PINS THE FIX ITSELF. Everything else here would pass
  // against a screen that had gone back to the raw read, because the mocks
  // would simply return undefined and the path would not draw.
  it('reads through the VALIDATING accessor, never the raw read', async () => {
    mockGetRenderableJourneyState.mockResolvedValue(journeyFixture());

    render(<JourneyMapScreen />);

    await waitFor(() => expect(mockGetRenderableJourneyState).toHaveBeenCalledWith('u1'));
    expect(mockGetJourneyState).not.toHaveBeenCalled();
  });

  // The accessor answers null for an unrenderable document, which is the state
  // this screen was already written for.
  it('draws no path when the accessor rejects the document, and does not throw', async () => {
    mockGetRenderableJourneyState.mockResolvedValue(null);

    expect(() => render(<JourneyMapScreen />)).not.toThrow();

    await waitFor(() =>
      expect(screen.queryByTestId('journey-map-loading')).toBeNull()
    );
    expect(screen.queryByTestId('journey-map-path')).toBeNull();
  });

  // AND THE REST OF THE SCREEN SURVIVES. This is the whole argument for null
  // over a thrown screen: the destination cards are a SIBLING of the path, not
  // a child of it, and they never depended on the journey read.
  //
  // The destination block rather than Start here, because this file's default
  // fixture resolves no video and the shipped screen therefore has no Start
  // here row on it (see the beforeEach). Asserting the row here would be
  // asserting the video mock, not the read boundary.
  it('keeps the destination cards when the path is withheld', async () => {
    mockGetRenderableJourneyState.mockResolvedValue(null);

    render(<JourneyMapScreen />);

    await waitFor(() =>
      expect(screen.queryByTestId('journey-map-loading')).toBeNull()
    );
    expect(screen.getByTestId('journey-map-destinations')).toBeTruthy();
    for (const card of ['focus-time', 'energy', 'routines', 'stress-recovery']) {
      expect(screen.getByTestId(`journey-map-card-${card}`)).toBeTruthy();
    }
  });

  // THE ANTI-VACUITY DIRECTION: a screen that never drew a path would satisfy
  // the two tests above.
  it('still draws all four rows for a good document', async () => {
    mockGetRenderableJourneyState.mockResolvedValue(journeyFixture());

    render(<JourneyMapScreen />);

    await waitFor(() => expect(screen.getByTestId('journey-map-path')).toBeTruthy());
    for (const phase of PHASE_ORDER) {
      expect(screen.getByTestId(`journey-map-path-${phase}`)).toBeTruthy();
    }
  });
});
