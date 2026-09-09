// One phase, explained — journey slice 5b-i.
//
// THREE GUARANTEES. The page says the right thing for the user's own
// destination; it never reads as a locked door for a phase they have not
// reached; and it never echoes the user's own words back at them.
//
// The third is the one worth a test rather than a comment. `removeTargetText`
// is free text the user typed during the Remove capture, and its contract
// (types/models.ts) allows exactly ONE echo point, at the capture confirmation.
// A phase page is a return surface days later, so the assertion here is that the
// string does not appear even when the document carries it.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';

const mockGetJourneyState = jest.fn();
jest.mock('../../../services/firebase/journeyState.service', () => ({
  getJourneyState: (...a: any[]) => mockGetJourneyState(...a),
}));

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

const mockParams: { phase: string; destination: string } = {
  phase: 'remove',
  destination: 'calm',
};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

import { JourneyPhaseScreen } from '../JourneyPhaseScreen';
import { DESTINATION_KEYS, PHASE_DISPLAY, PHASE_ORDER } from '../../../constants/journey';
import {
  PHASE_PAGE_BODIES,
  PHASE_PAGE_COPY,
  PHASE_STATE_LABELS,
} from '../../../constants/journeyCopy';
import { REPLACEMENT_MENUS } from '../removeCapture/copy';
import type { JourneyState } from '../../../types/models';

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

function setParams(phase: string, destination: string) {
  mockParams.phase = phase;
  mockParams.destination = destination;
}

beforeEach(() => {
  mockGetJourneyState.mockReset();
  mockGetJourneyState.mockResolvedValue(journeyFixture());
  setParams('remove', 'calm');
});

describe('JourneyPhaseScreen — the explanation', () => {
  it.each(DESTINATION_KEYS)(
    'renders the %s title, gloss and body for every phase',
    async (destination) => {
      for (const phase of PHASE_ORDER) {
        setParams(phase, destination);
        mockGetJourneyState.mockResolvedValue(journeyFixture({ destination }));

        const view = render(<JourneyPhaseScreen />);
        const cell = PHASE_DISPLAY[phase][destination];

        await waitFor(() => expect(view.getByText(cell.title)).toBeTruthy());
        expect(view.getByText(cell.gloss)).toBeTruthy();
        expect(view.getByText(PHASE_PAGE_BODIES[phase])).toBeTruthy();

        view.unmount();
      }
    }
  );

  it('renders the destination the user actually has, and no other', async () => {
    setParams('recover', 'energy');
    mockGetJourneyState.mockResolvedValue(journeyFixture({ destination: 'energy' }));

    const { getByText, queryByText } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByText(PHASE_DISPLAY.recover.energy.title)).toBeTruthy());

    for (const other of DESTINATION_KEYS) {
      if (other === 'energy') continue;
      const wrong = PHASE_DISPLAY.recover[other].title;
      if (wrong === PHASE_DISPLAY.recover.energy.title) continue;
      expect(queryByText(wrong)).toBeNull();
    }
  });

  it('names where the user is, using the map vocabulary', async () => {
    setParams('remove', 'calm');
    const { getByTestId } = render(<JourneyPhaseScreen />);

    await waitFor(() =>
      expect(getByTestId('journey-phase-state')).toHaveTextContent(
        PHASE_STATE_LABELS.current
      )
    );
  });

  it('explains a phase the user has never reached without implying a locked door', async () => {
    // The unreached case: refocus while the user stands in remove. The page must
    // still say what the stretch is for, must say "Ahead" rather than anything
    // gate-shaped, and must carry no lock, no "not yet", no "unlock".
    setParams('refocus', 'calm');

    const { getByText, getByTestId, queryByText } = render(<JourneyPhaseScreen />);

    await waitFor(() =>
      expect(getByText(PHASE_DISPLAY.refocus.calm.title)).toBeTruthy()
    );
    expect(getByText(PHASE_PAGE_BODIES.refocus)).toBeTruthy();
    expect(getByTestId('journey-phase-state')).toHaveTextContent(PHASE_STATE_LABELS.ahead);

    for (const shape of [/lock/i, /unlock/i, /not yet/i, /available/i, /complete .* first/i]) {
      expect(queryByText(shape)).toBeNull();
    }
  });

  it('renders without a state word when the read gives nothing back', async () => {
    // The page is the title and the body; the state is decoration on top of it.
    // A failed read must cost the decoration and nothing else.
    mockGetJourneyState.mockResolvedValue(null);

    const { getByText, queryByTestId } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByText(PHASE_DISPLAY.remove.calm.title)).toBeTruthy());
    expect(getByText(PHASE_PAGE_BODIES.remove)).toBeTruthy();
    expect(queryByTestId('journey-phase-state')).toBeNull();
  });

  it('shows no count, fraction or ordinal', async () => {
    const { getByText, queryByText } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByText(PHASE_DISPLAY.remove.calm.title)).toBeTruthy());
    expect(queryByText(/\d+\s*(of|\/)\s*\d+/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
  });

  it('never renders a framework word AS A LABEL', async () => {
    // Exact match, not a word-boundary regex: one of Jen's approved glosses uses
    // "recover" as the ordinary English verb (constants/journey.ts). Recorded in
    // full in PhasePath's suite.
    const { getByText, queryByText } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByText(PHASE_DISPLAY.remove.calm.title)).toBeTruthy());
    for (const phase of PHASE_ORDER) {
      expect(queryByText(phase)).toBeNull();
      expect(queryByText(phase.toUpperCase())).toBeNull();
    }
  });
});

describe('JourneyPhaseScreen — the stored replacement intention', () => {
  const PICK = REPLACEMENT_MENUS.evening[0];

  function withReplacement(over: Partial<JourneyState> = {}) {
    return journeyFixture({
      removeCapturedAt: {} as JourneyState['removeCapturedAt'],
      removeReplacementAt: {} as JourneyState['removeReplacementAt'],
      removeReplacementSlot: 'evening',
      removeReplacementId: PICK.id,
      ...over,
    });
  }

  it('renders the curated label the user picked', async () => {
    // Slice 3c-ii stored this and nothing has rendered it since. The label comes
    // from the menus by id, never from a stored string.
    mockGetJourneyState.mockResolvedValue(withReplacement());

    const { getByTestId, getByText } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByTestId('journey-phase-replacement')).toBeTruthy());
    expect(getByText(PICK.label)).toBeTruthy();
    expect(getByText(PHASE_PAGE_COPY.replacementLeadIn)).toBeTruthy();
  });

  it('renders cleanly when no pick was ever made', async () => {
    // The common case, and not a failure: every mental capture, every
    // interpersonal one, every 'varies' timing and every capture predating
    // 3c-ii is in this state.
    const { getByText, queryByTestId } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByText(PHASE_PAGE_BODIES.remove)).toBeTruthy());
    expect(queryByTestId('journey-phase-replacement')).toBeNull();
    expect(queryByTestId('journey-phase-state')).toBeTruthy();
  });

  it('renders nothing for an id the menus no longer carry', async () => {
    // Copy gets rewritten and options get retired. A pick whose id has gone must
    // render as nothing, never as an empty row or a raw id.
    mockGetJourneyState.mockResolvedValue(
      withReplacement({ removeReplacementId: 'evening_retired_option' })
    );

    const { getByText, queryByTestId, queryByText } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByText(PHASE_PAGE_BODIES.remove)).toBeTruthy());
    expect(queryByTestId('journey-phase-replacement')).toBeNull();
    expect(queryByText('evening_retired_option')).toBeNull();
  });

  it('shows the intention on the remove page only', async () => {
    // The other three pages read the same document. A stored Remove commitment
    // appearing under a different stretch would attach it to work it is not
    // about.
    mockGetJourneyState.mockResolvedValue(withReplacement());
    setParams('recover', 'calm');

    const { getByText, queryByTestId, queryByText } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByText(PHASE_PAGE_BODIES.recover)).toBeTruthy());
    expect(queryByTestId('journey-phase-replacement')).toBeNull();
    expect(queryByText(PICK.label)).toBeNull();
  });

  it('NEVER echoes the user own words, even when the document carries them', async () => {
    // removeTargetText has exactly one echo point and this is not it. Asserted
    // rather than trusted: the field sits on the same document the page already
    // reads, so including it would be one line and no error.
    const ownWords = 'my endless late night doomscrolling about work';
    mockGetJourneyState.mockResolvedValue(
      withReplacement({ removeTargetText: ownWords, removeTargetChip: 'scroll' })
    );

    const { getByTestId, queryByText } = render(<JourneyPhaseScreen />);

    await waitFor(() => expect(getByTestId('journey-phase-replacement')).toBeTruthy());
    expect(queryByText(ownWords)).toBeNull();
    expect(queryByText(new RegExp('doomscrolling', 'i'))).toBeNull();
  });
});
