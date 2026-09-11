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
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

const mockGetJourneyState = jest.fn();
const mockAdvancePhase = jest.fn(async () => {});
const mockRecordAdvanceDeclined = jest.fn(async () => {});
const mockRecordAdjustChoice = jest.fn(async () => {});
jest.mock('../../../services/firebase/journeyState.service', () => ({
  getJourneyState: (...a: any[]) => mockGetJourneyState(...a),
  advancePhase: (...a: any[]) => mockAdvancePhase(...(a as [])),
  recordAdvanceDeclined: (...a: any[]) => mockRecordAdvanceDeclined(...(a as [])),
  recordAdjustChoice: (...a: any[]) => mockRecordAdjustChoice(...(a as [])),
}));

const mockLogEvent = jest.fn();
jest.mock('../../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...(a as [])),
}));

const mockGoBack = jest.fn();

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

const mockParams: { phase: string; destination: string } = {
  phase: 'remove',
  destination: 'calm',
};
jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: mockParams }),
  useNavigation: () => ({ goBack: mockGoBack }),
  useFocusEffect: (cb: () => undefined | (() => void)) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

import { JourneyPhaseScreen } from '../JourneyPhaseScreen';
import { DESTINATION_KEYS, PHASE_DISPLAY, PHASE_ORDER } from '../../../constants/journey';
import {
  ADJUST_ALTERNATIVES,
  ADJUST_COPY,
  ADVANCE_PREVIEW_COPY,
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
  mockAdvancePhase.mockClear();
  mockRecordAdvanceDeclined.mockClear();
  mockRecordAdjustChoice.mockReset();
  mockRecordAdjustChoice.mockResolvedValue(undefined as never);
  mockLogEvent.mockClear();
  mockGoBack.mockClear();
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

// ---------------------------------------------------------------------------
// Preview mode (slice 7a decision 4, refined to derived-not-passed)
//
// THE CONDITION IS DERIVED FROM STORED STATE, so these tests set journey
// documents rather than route params. That is the point of the refinement:
// Today and the map reach this page the same way and get the same page, and the
// demoted offer therefore exists on the map with no change to JourneyMapScreen.
//
// PHASE_ORDER is remove -> recover -> rewire -> refocus, so a user standing in
// 'remove' who has been offered advancement previews 'recover'.
// ---------------------------------------------------------------------------
describe('JourneyPhaseScreen - preview mode', () => {
  const offered = (over = {}) =>
    journeyFixture({
      phaseKey: 'remove',
      advanceOfferedAt: { seconds: 1 } as any,
      ...over,
    });

  test('shows the commit controls on the NEXT phase once offered', async () => {
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    const { getByTestId } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByTestId('journey-phase-commit')).toBeTruthy());
    expect(getByTestId('journey-phase-start')).toBeTruthy();
    expect(getByTestId('journey-phase-not-yet')).toBeTruthy();
  });

  test('shows NOTHING when the user has never been offered advancement', async () => {
    // Browsing ahead on the map is browsing, not an invitation. Section 8 says
    // AHEAD opens; it does not say AHEAD asks.
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(journeyFixture({ phaseKey: 'remove' }));
    const { queryByTestId, getByText } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByText(PHASE_PAGE_BODIES.recover)).toBeTruthy());
    expect(queryByTestId('journey-phase-commit')).toBeNull();
  });

  test('shows nothing on the CURRENT phase, even while an offer is live', async () => {
    setParams('remove', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    const { queryByTestId, getByText } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByText(PHASE_PAGE_BODIES.remove)).toBeTruthy());
    expect(queryByTestId('journey-phase-commit')).toBeNull();
  });

  test('shows nothing two phases ahead', async () => {
    // The offer is to take the NEXT step, never to jump. skipToPhase exists and
    // is not what this flow calls.
    setParams('rewire', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    const { queryByTestId, getByText } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByText(PHASE_PAGE_BODIES.rewire)).toBeTruthy());
    expect(queryByTestId('journey-phase-commit')).toBeNull();
  });

  test('SUPPRESSES the state eyebrow in preview', async () => {
    // Kyle, slice 7a: the state word answers "where am I" and the preview
    // answers "shall I go here". "Ahead" above an invitation to start this
    // phase makes the page argue with itself.
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    const { queryByTestId, getByTestId } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByTestId('journey-phase-commit')).toBeTruthy());
    expect(queryByTestId('journey-phase-state')).toBeNull();
  });

  test('KEEPS the state eyebrow on the same page when not previewing', async () => {
    // Guards the suppression above against passing because the eyebrow never
    // renders on this phase at all.
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(journeyFixture({ phaseKey: 'remove' }));
    const { getByTestId } = render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(getByTestId('journey-phase-state')).toHaveTextContent(
        PHASE_STATE_LABELS.ahead
      )
    );
  });
});

describe('JourneyPhaseScreen - preview mutates nothing until Start this', () => {
  const offered = () =>
    journeyFixture({ phaseKey: 'remove', advanceOfferedAt: { seconds: 1 } as any });

  test('rendering the preview writes nothing and fires nothing', async () => {
    // Decision 4's core claim: the primary promises a look, not a commitment.
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    const { getByTestId } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByTestId('journey-phase-commit')).toBeTruthy());
    expect(mockAdvancePhase).not.toHaveBeenCalled();
    expect(mockRecordAdvanceDeclined).not.toHaveBeenCalled();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test('Start this advances the phase, records it, and returns', async () => {
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    const { getByTestId } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByTestId('journey-phase-start')).toBeTruthy());

    fireEvent.press(getByTestId('journey-phase-start'));
    await waitFor(() => expect(mockAdvancePhase).toHaveBeenCalledWith('u1'));
    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_advance_accepted', {});
    expect(mockGoBack).toHaveBeenCalled();
  });

  test('a failed commit does NOT navigate, and says so', async () => {
    // Going back on a failure would return the user to a Today still showing
    // the offer, which reads as the tap having done nothing.
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    mockAdvancePhase.mockRejectedValueOnce(new Error('offline'));
    const { getByTestId } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByTestId('journey-phase-start')).toBeTruthy());

    fireEvent.press(getByTestId('journey-phase-start'));
    await waitFor(() =>
      expect(getByTestId('journey-phase-commit-error')).toHaveTextContent(
        ADVANCE_PREVIEW_COPY.failed
      )
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  test('Not yet declines and returns WITHOUT advancing', async () => {
    // Permitted by decision 4's own wording: Start this is named there as the
    // only thing that mutates PHASE. A decline moves the offer bookkeeping.
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(offered());
    const { getByTestId } = render(<JourneyPhaseScreen />);
    await waitFor(() => expect(getByTestId('journey-phase-not-yet')).toBeTruthy());

    fireEvent.press(getByTestId('journey-phase-not-yet'));
    await waitFor(() => expect(mockRecordAdvanceDeclined).toHaveBeenCalledWith('u1'));
    expect(mockAdvancePhase).not.toHaveBeenCalled();
    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_advance_declined', {
      from: 'preview',
    });
    expect(mockGoBack).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// The phase-page door: "Try a different approach" (slice 7b, section 9 R5).
//
// WHY THE DOOR IS ON THIS PAGE AT ALL. R5 caps proactive offers at two and then
// says the door stays open: "the door is open, Vara just stops knocking." A
// capped user has to be able to reach the alternatives by a route that knows
// nothing about the offer, and every journey map row already opens this page,
// including the current one.
// ---------------------------------------------------------------------------
describe('the adjustment door', () => {
  const qualified = () =>
    journeyFixture({
      phaseKey: 'remove',
      adjustOfferedAt: { seconds: 1 } as any,
    });

  test('is absent for a user who has never been offered an adjustment', async () => {
    // Browsing is not an invitation. `adjustOfferedAt` is null on every user
    // who has not had the card on Today, and the page must show them nothing.
    mockGetJourneyState.mockResolvedValue(journeyFixture({ adjustOfferedAt: null }));
    render(<JourneyPhaseScreen />);
    await waitFor(() => expect(mockGetJourneyState).toHaveBeenCalled());
    expect(screen.queryByTestId('journey-phase-adjust')).toBeNull();
  });

  test('appears on the CURRENT phase once the user has qualified', async () => {
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    expect(screen.getByText(ADJUST_COPY.primary)).toBeTruthy();
  });

  test('is absent on a phase page that is NOT the current phase', async () => {
    // The alternatives change how the user works on the stretch they are
    // standing in. Offering them on a page about a phase the user has finished
    // or not reached would be offering to adjust something they are not doing.
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('rewire', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() => expect(mockGetJourneyState).toHaveBeenCalled());
    expect(screen.queryByTestId('journey-phase-adjust')).toBeNull();
  });

  test('SURVIVES THE CAP: the door does not read the decline count', async () => {
    // The cap's promise, asserted directly. A user who has declined twice has
    // lost the card and must keep the door; nothing on this page consults
    // `adjustDeclines`, so the count cannot close it.
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'remove',
        adjustOfferedAt: { seconds: 1 } as any,
        adjustDeclinedAt: { seconds: 2 } as any,
        adjustDeclines: 2,
      } as Partial<JourneyState>)
    );
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
  });

  test('is shut by default and opens the three alternatives on tap', async () => {
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    // Shut: the options are not on the page yet.
    expect(screen.queryByText(ADJUST_COPY.alternativesIntro)).toBeNull();

    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));

    expect(screen.getByText(ADJUST_COPY.alternativesIntro)).toBeTruthy();
    for (const option of ADJUST_ALTERNATIVES.remove) {
      expect(screen.getByText(option.label)).toBeTruthy();
      expect(screen.getByText(option.body)).toBeTruthy();
    }
  });

  test('serves THIS phase alternatives, not another phase set', async () => {
    // The keyed-not-ordinal contract, at the render. A refocus user must never
    // be shown the remove set.
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({ phaseKey: 'refocus', adjustOfferedAt: { seconds: 1 } as any })
    );
    setParams('refocus', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));
    expect(screen.getByText('Narrow what matters')).toBeTruthy();
    expect(screen.queryByText('Make it smaller')).toBeNull();
  });

  test('choosing records the curated id and confirms in place', async () => {
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));
    fireEvent.press(screen.getByTestId('journey-phase-adjust-make_it_smaller'));

    await waitFor(() =>
      expect(mockRecordAdjustChoice).toHaveBeenCalledWith('u1', 'make_it_smaller')
    );
    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_adjust_chosen', {
      optionId: 'make_it_smaller',
      from: 'phase_page',
    });
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-confirmation')).toBeTruthy()
    );
    // NO NAVIGATION ON SUCCESS. There is nowhere to go that would show a
    // result, because as of 7b the choice is recorded and not yet honoured.
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  test('choosing CHANGES NO PHASE', async () => {
    // Adjusting is about how the user works on this stretch, never about
    // leaving it. The only control on this page that may move a phase is
    // "Start this", and it is not on screen here.
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));
    fireEvent.press(screen.getByTestId('journey-phase-adjust-try_another_way'));
    await waitFor(() => expect(mockRecordAdjustChoice).toHaveBeenCalled());
    expect(mockAdvancePhase).not.toHaveBeenCalled();
  });

  test('a failed write shows the failure line and keeps the options tappable', async () => {
    // UI Standards 18: every control that writes has an error state. The
    // options stay on screen because retrying is the recovery the line names.
    mockRecordAdjustChoice.mockRejectedValueOnce(new Error('offline'));
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));
    fireEvent.press(screen.getByTestId('journey-phase-adjust-make_it_smaller'));

    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-error')).toBeTruthy()
    );
    expect(screen.getByText(ADJUST_COPY.failed)).toBeTruthy();
    expect(screen.queryByTestId('journey-phase-adjust-confirmation')).toBeNull();
    expect(screen.getByTestId('journey-phase-adjust-make_it_smaller')).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // COEXISTENCE WITH 7a's PREVIEW MODE.
  //
  // Both are derived on this one screen and both are bottom-of-page blocks.
  // Preview requires `phase === PHASE_ORDER[idx + 1]`; the door requires
  // `phase === journey.phaseKey`, which is PHASE_ORDER[idx]. They are mutually
  // exclusive BY CONSTRUCTION, and the point of testing it is that the
  // construction is two independent expressions rather than one guard someone
  // could edit apart.
  // -------------------------------------------------------------------------
  test('the door and the preview commit never appear together', async () => {
    // A user who has been offered BOTH: qualified to adjust, and offered
    // advancement. On the current phase's page only the door shows.
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'remove',
        adjustOfferedAt: { seconds: 1 } as any,
        advanceOfferedAt: { seconds: 1 } as any,
      })
    );
    setParams('remove', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust')).toBeTruthy()
    );
    expect(screen.queryByTestId('journey-phase-commit')).toBeNull();
  });

  test('on the NEXT phase page the same user gets the preview and no door', async () => {
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'remove',
        adjustOfferedAt: { seconds: 1 } as any,
        advanceOfferedAt: { seconds: 1 } as any,
      })
    );
    setParams('recover', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-commit')).toBeTruthy()
    );
    expect(screen.queryByTestId('journey-phase-adjust')).toBeNull();
  });

  test('the state eyebrow still reads correctly beside the door', async () => {
    // Preview suppresses the eyebrow because the page is answering "shall I go
    // here". The door does not: the page is about where the user IS, and that
    // is exactly what the word says. Pinned so the 7a suppression is not
    // widened to cover a block it was never about.
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust')).toBeTruthy()
    );
    expect(screen.getByTestId('journey-phase-state')).toBeTruthy();
    expect(screen.getByText(PHASE_STATE_LABELS.current)).toBeTruthy();
  });
});
