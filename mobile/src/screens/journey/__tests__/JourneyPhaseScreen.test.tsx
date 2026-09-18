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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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

const mockParams: { phase: string; destination: string; openAdjust?: boolean } = {
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

function setParams(phase: string, destination: string, openAdjust?: boolean) {
  mockParams.phase = phase;
  mockParams.destination = destination;
  // Slice 7c. Deleted rather than set to false when absent, so a test that does
  // not mention the flag gets the same params object a map arrival produces
  // rather than one carrying an explicit `false` no caller writes.
  if (openAdjust === undefined) delete mockParams.openAdjust;
  else mockParams.openAdjust = openAdjust;
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
  /**
   * RE-FIXTURED TO `recover` IN SLICE 7c, AS A DELIBERATE UPDATE.
   *
   * Every case in this block was written against `remove` because `remove` is
   * the first phase and `journeyFixture`'s default, not because the door has
   * anything to do with it. Jen's ruling 1 of 2026-09-17 activates the
   * alternatives for Recover only, so a `remove` fixture now exercises the
   * UNACTIVATED path: the door tests would have gone red, and the three
   * ABSENCE tests would have gone green for a second, independent reason and
   * stopped proving their own conjunct. Both are failures of the fixture, not
   * of the cases, so the phase moves and nothing else does.
   *
   * THE ROUTE PARAM MOVES WITH IT. The door requires `phase === journey.phaseKey`,
   * so a fixture on `recover` with a param on `remove` would be testing the
   * wrong-phase branch by accident.
   */
  beforeEach(() => setParams('recover', 'calm'));

  const qualified = () =>
    journeyFixture({
      phaseKey: 'recover',
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
    //
    // RE-FIXTURED IN SLICE 7c AND THE CONTROL BELOW IS NEW. The journey is on
    // `recover` and the PAGE is `remove`, so the only thing that differs from
    // the passing case is which phase the page is about. Before this change the
    // journey was `remove` and the page `rewire`, which after ruling 1 would
    // have been absent for two reasons - wrong phase AND unactivated - and would
    // have proved neither. `remove` is used rather than `rewire` deliberately:
    // it is a phase the user has BEEN in, which is the case the comment above is
    // actually about.
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('remove', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() => expect(mockGetJourneyState).toHaveBeenCalled());
    expect(screen.queryByTestId('journey-phase-adjust')).toBeNull();

    // THE POSITIVE CONTROL, in the same test: the same document on its own
    // phase page DOES show the door. Without it this passes just as well when
    // the door is broken outright.
    screen.unmount();
    setParams('recover', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
  });

  test('SURVIVES THE CAP: the door does not read the decline count', async () => {
    // The cap's promise, asserted directly. A user who has declined twice has
    // lost the card and must keep the door; nothing on this page consults
    // `adjustDeclines`, so the count cannot close it.
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'recover',
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

  /**
   * THE ACTIVATION GATE AT THE DOOR (slice 7c; Jen ruling 1, 2026-09-17).
   *
   * IT IS CHECKED HERE AS WELL AS AT THE CARD BECAUSE THIS DOOR IS REACHABLE
   * WITHOUT THE CARD. Section 9 R5 keeps it open after the two-offer cap stops
   * the knocking, and every journey map row opens this page, so a gate on the
   * card alone would leave a door onto nine options that do nothing.
   *
   * IT RETRACTS SOMETHING AND THE TEST SAYS SO. Each fixture below has a
   * non-null `adjustOfferedAt` - these are users who HAD the door yesterday and
   * do not have it today. That is a real behaviour change against R5's "the door
   * is open, Vara just stops knocking", made on Jen's ruling, and a test that
   * quietly asserted absence without naming the retraction would hide it.
   */
  test.each(['remove', 'rewire', 'refocus'] as const)(
    'a qualified %s user gets no door, where the same recover user does',
    async (phaseKey) => {
      mockGetJourneyState.mockResolvedValue(
        journeyFixture({ phaseKey, adjustOfferedAt: { seconds: 1 } as any })
      );
      setParams(phaseKey, 'calm');
      render(<JourneyPhaseScreen />);
      await waitFor(() => expect(mockGetJourneyState).toHaveBeenCalled());
      expect(screen.queryByTestId('journey-phase-adjust')).toBeNull();

      // THE POSITIVE CONTROL, in the same test. The only difference between the
      // two halves is the phase: same stamp, same page shape, same everything
      // else. Without it this passes when the door is broken outright.
      screen.unmount();
      mockGetJourneyState.mockResolvedValue(qualified());
      setParams('recover', 'calm');
      render(<JourneyPhaseScreen />);
      await waitFor(() =>
        expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
      );
    }
  );

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
    for (const option of ADJUST_ALTERNATIVES.recover) {
      expect(screen.getByText(option.label)).toBeTruthy();
      expect(screen.getByText(option.body)).toBeTruthy();
    }
  });

  /**
   * A COVERAGE REDUCTION CAUSED BY RULING 1, RECORDED RATHER THAN ABSORBED.
   *
   * THIS TEST USED TO BE: "serves THIS phase alternatives, not another phase
   * set". A refocus user opened the door and saw "Narrow what matters" and not
   * "Make it smaller". It was the keyed-not-ordinal contract asserted AT THE
   * RENDER - proof that the screen reads `ADJUST_ALTERNATIVES` by PhaseKey and
   * not by an index into PHASE_ORDER.
   *
   * IT NEEDS TWO EXPOSED PHASES TO EXPRESS AND RULING 1 LEAVES ONE. With only
   * `recover` activated there is no second set the screen could wrongly show, so
   * the property has no failing case left. It is not re-fixturable: a
   * recover-only version asserts that the recover set renders, which the "shut
   * by default and opens the three alternatives" test above already does.
   *
   * WHAT STILL COVERS THE CONTRACT, AND AT WHICH LEVEL:
   * `constants/__tests__/journeyCopy.adjust.test.ts` asserts the pack-ordinal to
   * phase-key mapping directly and fails on a PHASE_ORDER reorder. That is
   * strictly weaker than what was here - it proves the MAP is right, not that
   * the SCREEN reads the map - and the gap is real until a second phase is
   * activated. The substitute below keeps the half that can still fail: the
   * screen renders the set for the phase it is on, read by key.
   *
   * WHEN A SECOND PHASE IS ACTIVATED, restore the original from git history
   * rather than rewriting it.
   */
  test('reads the alternatives BY PHASE KEY, not by an ordinal', async () => {
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));

    // The recover set renders in full...
    for (const option of ADJUST_ALTERNATIVES.recover) {
      expect(screen.getByText(option.label)).toBeTruthy();
    }
    // ...and NO label from any other phase's set appears. Enumerated over the
    // real table rather than against one invented string, so a testID or label
    // that exists nowhere cannot make this pass by being absent either way.
    for (const phaseKey of PHASE_ORDER) {
      if (phaseKey === 'recover') continue;
      for (const option of ADJUST_ALTERNATIVES[phaseKey]) {
        expect(screen.queryByText(option.label)).toBeNull();
      }
    }
  });

  test('choosing records the curated id and confirms in place', async () => {
    mockGetJourneyState.mockResolvedValue(qualified());
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));
    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_come_down'));

    await waitFor(() =>
      expect(mockRecordAdjustChoice).toHaveBeenCalledWith('u1', 'help_me_come_down')
    );
    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_adjust_chosen', {
      optionId: 'help_me_come_down',
      from: 'phase_page',
    });
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-confirmation')).toBeTruthy()
    );
    // NO NAVIGATION ON SUCCESS. There is nowhere to go that would show a result
    // ON THIS PAGE: as of slice 7c the choice IS honoured, but what it changes
    // is tomorrow's protocol on Today, which this screen does not render. The
    // confirmation in place is still the honest response and the user leaves
    // when they are ready.
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
    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_get_re_oriented'));
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
    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_get_something_back'));

    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-error')).toBeTruthy()
    );
    expect(screen.getByText(ADJUST_COPY.failed)).toBeTruthy();
    expect(screen.queryByTestId('journey-phase-adjust-confirmation')).toBeNull();
    expect(screen.getByTestId('journey-phase-adjust-help_me_get_something_back')).toBeTruthy();
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
        phaseKey: 'recover',
        adjustOfferedAt: { seconds: 1 } as any,
        advanceOfferedAt: { seconds: 1 } as any,
      })
    );
    setParams('recover', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust')).toBeTruthy()
    );
    expect(screen.queryByTestId('journey-phase-commit')).toBeNull();
  });

  test('on the NEXT phase page the same user gets the preview and no door', async () => {
    // RE-FIXTURED IN SLICE 7c: the journey is on `recover` and the page is
    // `rewire`, the phase after it. Before this the journey was `remove` and the
    // page `recover`, which after ruling 1 would have shown no door because
    // `recover` IS the activated phase but is not the CURRENT one - two reasons
    // for one absence. The pair now differs only by which page is open, which is
    // what this test is about.
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'recover',
        adjustOfferedAt: { seconds: 1 } as any,
        advanceOfferedAt: { seconds: 1 } as any,
      })
    );
    setParams('rewire', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-commit')).toBeTruthy()
    );
    expect(screen.queryByTestId('journey-phase-adjust')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // SLICE 7c: THE TWO ARRIVALS, AND THE IN-FLIGHT GUARD.
  //
  // Both were logged to row 7c at 7b's walk and both are about the same thing -
  // a control that does not tell the user what state it is in. The first makes
  // the page say which question it is answering; the second makes it say that
  // it heard the tap.
  // -------------------------------------------------------------------------
  test('arrives EXPANDED from the Today card', async () => {
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('recover', 'calm', true);
    render(<JourneyPhaseScreen />);
    // The three options are on the page with no tap at all, and the control
    // that would have asked for one is gone.
    await waitFor(() =>
      expect(screen.getByText(ADJUST_COPY.alternativesIntro)).toBeTruthy()
    );
    expect(screen.queryByTestId('journey-phase-adjust-open')).toBeNull();
    for (const option of ADJUST_ALTERNATIVES.recover) {
      expect(screen.getByTestId(`journey-phase-adjust-${option.id}`)).toBeTruthy();
    }
  });

  test('arrives SHUT from the map, which passes no flag', async () => {
    // THE CONTROL FOR THE TEST ABOVE, and the reason it is a separate case: an
    // expanded-always door would satisfy the first test perfectly. The map's
    // route sets no `openAdjust`, so this is the real second arrival rather than
    // a constructed one.
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('recover', 'calm');
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-open')).toBeTruthy()
    );
    expect(screen.queryByText(ADJUST_COPY.alternativesIntro)).toBeNull();
  });

  test('an expanded arrival can still be answered, and confirms in place', async () => {
    // The expanded path is a different render branch from the tap-to-open path,
    // and skipping a tap must not skip the write. Without this, `openAdjust`
    // could render three decorative rows.
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('recover', 'calm', true);
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-help_me_come_down')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_come_down'));
    await waitFor(() =>
      expect(mockRecordAdjustChoice).toHaveBeenCalledWith('u1', 'help_me_come_down')
    );
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-confirmation')).toBeTruthy()
    );
  });

  test('the tapped option reports busy and the other two report disabled', async () => {
    // THE IN-FLIGHT GUARD, asserted through accessibilityState rather than
    // through a style: the style is the visible half and the state is the half a
    // screen reader gets, and UI Standards require both. Held mid-flight by a
    // promise this test controls.
    let settle: () => void = () => {};
    mockRecordAdjustChoice.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        settle = resolve;
      }) as never
    );
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('recover', 'calm', true);
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-help_me_come_down')).toBeTruthy()
    );

    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_come_down'));

    await waitFor(() =>
      expect(
        screen.getByTestId('journey-phase-adjust-help_me_come_down').props
          .accessibilityState
      ).toEqual({ disabled: true, busy: true })
    );
    for (const id of ['help_me_get_something_back', 'help_me_get_re_oriented']) {
      expect(
        screen.getByTestId(`journey-phase-adjust-${id}`).props.accessibilityState
      ).toEqual({ disabled: true, busy: false });
    }

    // AND IT CLEARS. A guard that never lifted would be a worse bug than the one
    // it fixes, and on the failure path the options have to come back.
    await act(async () => {
      settle();
    });
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-confirmation')).toBeTruthy()
    );
  });

  test('a second tap while the first is settling writes ONCE', async () => {
    // THE REASON THE GUARD IS ON THE WRITE AND NOT ONLY ON THE PIXELS. Two
    // writes would let whichever network call finished last decide what the
    // engine serves tomorrow, which is a wrong DAY and not merely a wrong frame.
    let settle: () => void = () => {};
    mockRecordAdjustChoice.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        settle = resolve;
      }) as never
    );
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('recover', 'calm', true);
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-help_me_come_down')).toBeTruthy()
    );

    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_come_down'));
    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_get_re_oriented'));
    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_come_down'));

    await act(async () => {
      settle();
    });
    expect(mockRecordAdjustChoice).toHaveBeenCalledTimes(1);
    expect(mockRecordAdjustChoice).toHaveBeenCalledWith('u1', 'help_me_come_down');
  });

  test('a failed write lifts the guard, so the options are tappable again', async () => {
    mockRecordAdjustChoice.mockRejectedValueOnce(new Error('offline'));
    mockGetJourneyState.mockResolvedValue(qualified());
    setParams('recover', 'calm', true);
    render(<JourneyPhaseScreen />);
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-help_me_come_down')).toBeTruthy()
    );
    fireEvent.press(screen.getByTestId('journey-phase-adjust-help_me_come_down'));
    await waitFor(() =>
      expect(screen.getByTestId('journey-phase-adjust-error')).toBeTruthy()
    );
    // Not merely present: ACTIVATABLE. A disabled row that still rendered would
    // satisfy an existence check and leave the user with nothing to do.
    for (const option of ADJUST_ALTERNATIVES.recover) {
      expect(
        screen.getByTestId(`journey-phase-adjust-${option.id}`).props.accessibilityState
      ).toEqual({ disabled: false, busy: false });
    }
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

// ROUTE PARAMS THE TYPES SAY CANNOT ARRIVE (slice 7f).
//
// Both params are declared as closed unions, and every navigation that reaches
// this screen supplies real keys today - the map iterates PHASE_ORDER, and
// Today's two entry points are guarded by slice 7e's resolver branch. These
// cases pin the page against the day a fourth caller is written, because the
// failure mode is not a broken page but a fallback where the page should be.
// That was EVERY TAB when this was written (one ErrorBoundary, above the
// navigator at App.tsx:114); since slice 7g it is this screen.
describe('JourneyPhaseScreen - params it cannot render', () => {
  it('a destination outside the union does not throw, and the page still renders', async () => {
    setParams('remove', 'stress');
    mockGetJourneyState.mockResolvedValue(journeyFixture());

    expect(() => render(<JourneyPhaseScreen />)).not.toThrow();

    // The title and gloss go quiet; the BODY is keyed on phase alone and is
    // still there, which is the partial render the file header describes for a
    // failed document read.
    await waitFor(() => {
      expect(screen.getByText(PHASE_PAGE_BODIES.remove)).toBeTruthy();
    });
  });

  // THE SHARPEST SHAPE ON THE PAGE, and it was found by tracing rather than by
  // a crash: `.map` on an undefined cell throws instantly. It is reached only
  // when the door is open, which needs the document's phaseKey to equal the
  // route param.
  it('a phase outside the union does not throw, and no longer opens a door', async () => {
    // THE MEANING OF THIS TEST CHANGED IN SLICE 7c, AND THE CHANGE IS RECORDED
    // RATHER THAN SWALLOWED. It used to assert that an unrecognised phase opened
    // the door and OFFERED NOTHING - a guarded lookup returning an empty list
    // rather than throwing. After ruling 1 the door does not open at all: an
    // unrecognised phase is not in `ADJUST_ACTIVATED`, and
    // `adjustAlternativesActive` compares `=== true`, so it is unactivated
    // rather than undefined-and-falsy by luck.
    //
    // THAT IS A BETTER OUTCOME AND A DIFFERENT ASSERTION. The old property - the
    // empty-list render is safe - stops being exercised here. It is not lost
    // entirely: the same guarded lookup still runs for any phase that IS
    // activated, and the substitute test above enumerates the real table. What
    // is gone is the specific "opens and offers nothing" state, because that
    // state no longer exists.
    setParams('reboot', 'calm');
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({
        phaseKey: 'reboot' as never,
        adjustOfferedAt: { seconds: 1 } as never,
      })
    );

    expect(() => render(<JourneyPhaseScreen />)).not.toThrow();

    await waitFor(() => expect(mockGetJourneyState).toHaveBeenCalled());
    expect(screen.queryByTestId('journey-phase-adjust')).toBeNull();

    // ASSERTED AGAINST EVERY REAL OPTION ID IN THE TABLE, not against one
    // invented name: a testID that does not exist in any phase would be absent
    // whether the guard worked or not, which is a test that cannot fail.
    for (const phaseKey of PHASE_ORDER) {
      for (const option of ADJUST_ALTERNATIVES[phaseKey]) {
        expect(screen.queryByTestId(`journey-phase-adjust-${option.id}`)).toBeNull();
      }
    }
  });

  // THE ANTI-VACUITY DIRECTION. A guard that rendered nothing for every phase
  // would satisfy both tests above.
  it('an ACTIVATED phase still offers all of its alternatives', async () => {
    // THE ANTI-VACUITY GUARD, MOVED TO `recover` IN SLICE 7c AND STILL THE
    // COUNTERWEIGHT TO THE TWO TESTS ABOVE. Its own original comment is the
    // reason it cannot simply be deleted with the `remove` fixture: "a guard
    // that rendered nothing for every phase would satisfy both tests above".
    // After ruling 1 a guard that rendered nothing for every phase would ALSO
    // satisfy the new "does not open a door" assertion, so the counterweight
    // matters more than it did, not less.
    setParams('recover', 'calm');
    mockGetJourneyState.mockResolvedValue(
      journeyFixture({ phaseKey: 'recover', adjustOfferedAt: { seconds: 1 } as never })
    );

    render(<JourneyPhaseScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('journey-phase-adjust')).toBeTruthy();
    });
    fireEvent.press(screen.getByTestId('journey-phase-adjust-open'));

    for (const option of ADJUST_ALTERNATIVES.recover) {
      expect(screen.getByTestId(`journey-phase-adjust-${option.id}`)).toBeTruthy();
    }
  });
});
