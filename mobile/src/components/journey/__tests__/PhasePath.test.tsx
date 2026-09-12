// The shared phase path: one component, two surfaces.
//
// WHAT THIS FILE IS FOR that RouteStrip.test.tsx is not: the strip suite pins
// A2's contract and is deliberately untouched by slice 5a, so it doubles as the
// proof that adoption changed no behaviour there. This one pins the union the
// component has to satisfy for BOTH callers — the map's four states and full
// copy, the strip's short copy and silent state words — so a future change that
// serves one surface at the other's expense fails here rather than on a device.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhasePath } from '../PhasePath';
import { DESTINATION_KEYS, PHASE_DISPLAY, PHASE_ORDER } from '../../../constants/journey';
import type { PhaseState } from '../../../constants/journey';
import { PHASE_STATE_LABELS } from '../../../constants/journeyCopy';
import type { PhaseStates } from '../../../journey/phaseStates';

const ALL_AHEAD: PhaseStates = {
  remove: 'ahead',
  recover: 'ahead',
  rewire: 'ahead',
  refocus: 'ahead',
};

const MIXED: PhaseStates = {
  remove: 'done',
  recover: 'skipped',
  rewire: 'current',
  refocus: 'ahead',
};

describe('PhasePath', () => {
  test('renders all four phases, in PHASE_ORDER', () => {
    render(<PhasePath destination="focus" states={ALL_AHEAD} copy="short" />);

    for (const phase of PHASE_ORDER) {
      expect(screen.getByTestId(`phase-path-${phase}`)).toBeTruthy();
    }
  });

  test('copy="full" renders title and gloss, never short', () => {
    render(<PhasePath destination="calm" states={MIXED} copy="full" />);

    for (const phase of PHASE_ORDER) {
      const cell = PHASE_DISPLAY[phase].calm;
      expect(screen.getByText(cell.title)).toBeTruthy();
      expect(screen.getByText(cell.gloss)).toBeTruthy();
      // Five cells ship `short` identical to `title` by design, so a blanket
      // "short is absent" assertion would fail on Jen's own content. Skip those
      // and check the rest, which is the same shape the strip suite uses.
      if (cell.short !== cell.title) {
        expect(screen.queryByText(cell.short)).toBeNull();
      }
    }
  });

  test('copy="short" renders short only, never title or gloss', () => {
    render(<PhasePath destination="calm" states={ALL_AHEAD} copy="short" />);

    for (const phase of PHASE_ORDER) {
      const cell = PHASE_DISPLAY[phase].calm;
      expect(screen.getByText(cell.short)).toBeTruthy();
      expect(screen.queryByText(cell.gloss)).toBeNull();
      if (cell.title !== cell.short) {
        expect(screen.queryByText(cell.title)).toBeNull();
      }
    }
  });

  test('renders the requested destination column and no other', () => {
    // Without this, a path hard-wired to one destination passes every loop
    // above for that destination and fails nothing for the other three.
    render(<PhasePath destination="energy" states={ALL_AHEAD} copy="full" />);

    for (const phase of PHASE_ORDER) {
      const wrong = PHASE_DISPLAY[phase].routines.title;
      if (wrong === PHASE_DISPLAY[phase].energy.title) continue;
      expect(screen.queryByText(wrong)).toBeNull();
    }
  });

  test('draws a state word per row when asked, and the right one', () => {
    render(
      <PhasePath
        destination="focus"
        states={MIXED}
        copy="full"
        stateLabels={PHASE_STATE_LABELS}
        showStateLabels
      />
    );

    expect(screen.getByTestId('phase-path-remove-state')).toHaveTextContent(
      PHASE_STATE_LABELS.done
    );
    expect(screen.getByTestId('phase-path-recover-state')).toHaveTextContent(
      PHASE_STATE_LABELS.skipped
    );
    expect(screen.getByTestId('phase-path-rewire-state')).toHaveTextContent(
      PHASE_STATE_LABELS.current
    );
    expect(screen.getByTestId('phase-path-refocus-state')).toHaveTextContent(
      PHASE_STATE_LABELS.ahead
    );
  });

  test('speaks the state even when it is not drawn', () => {
    // A2's shape. The marker carries no text, so without this the emphasis on
    // the current row is invisible to a screen reader.
    render(
      <PhasePath
        destination="focus"
        states={{ ...ALL_AHEAD, remove: 'current' }}
        copy="short"
        stateLabels={{ current: 'Starting here.' }}
        showStateLabels={false}
      />
    );

    expect(screen.queryByTestId('phase-path-remove-state')).toBeNull();
    expect(
      screen.getByLabelText(`${PHASE_DISPLAY.remove.focus.short}. Starting here.`)
    ).toBeTruthy();
  });

  test('the spoken row carries title, state and gloss in the order they are seen', () => {
    render(
      <PhasePath
        destination="focus"
        states={MIXED}
        copy="full"
        stateLabels={PHASE_STATE_LABELS}
        showStateLabels
      />
    );

    const cell = PHASE_DISPLAY.rewire.focus;
    expect(
      screen.getByLabelText(`${cell.title}. ${PHASE_STATE_LABELS.current}. ${cell.gloss}`)
    ).toBeTruthy();
  });

  test('never renders a framework word AS A LABEL', () => {
    // Roadmap section 8: remove / recover / rewire / refocus are keys, never
    // values. brandCopyGuard covers the source files; this covers the render.
    //
    // EXACT MATCH, NOT A WORD-BOUNDARY REGEX, AND THE DIFFERENCE IS JEN'S COPY.
    // The strip's suite can use a regex because `short` never contains one of
    // the four; the map renders glosses, and PHASE_DISPLAY.recover.energy.gloss
    // reads "Find the things that help you recover when you're running low."
    // That is the ordinary English verb inside approved content, not the
    // framework key leaking into the UI. A regex here fails on it, and the only
    // way to make it pass would be to edit one of Jen's strings, which is the
    // outcome this suite exists to prevent. What section 8 actually bans is the
    // key standing on its own as the name of a phase, which is what is asserted.
    render(
      <PhasePath
        destination="energy"
        states={MIXED}
        copy="full"
        stateLabels={PHASE_STATE_LABELS}
        showStateLabels
      />
    );

    for (const phase of PHASE_ORDER) {
      expect(screen.queryByText(phase)).toBeNull();
      expect(screen.queryByText(phase.toUpperCase())).toBeNull();
    }
  });

  test('shows no count, fraction or ordinal anywhere', () => {
    // UI Standards 10.7 and roadmap section 8. The path is wayfinding, not a
    // progress bar, and the cheapest way for it to become one is a helpful
    // "1 of 4" added later by someone who did not read the header.
    render(
      <PhasePath
        destination="routines"
        states={MIXED}
        copy="full"
        stateLabels={PHASE_STATE_LABELS}
        showStateLabels
      />
    );

    expect(screen.queryByText(/\d+\s*(of|\/)\s*\d+/)).toBeNull();
    expect(screen.queryByText(/step\s*\d/i)).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  test('no row is pressable without a handler', () => {
    // A2's shape, and the half of 5a's pairing pin that SURVIVES 5b-i. The
    // route explainer passes no handler and its rows must stay inert: a row
    // that looked tappable on an onboarding screen would be a promise the flow
    // cannot keep. RouteStrip's own suite asserts the same thing through the
    // component A2 actually renders.
    render(
      <PhasePath
        destination="focus"
        states={MIXED}
        copy="full"
        stateLabels={PHASE_STATE_LABELS}
        showStateLabels
      />
    );

    for (const phase of PHASE_ORDER) {
      const row = screen.getByTestId(`phase-path-${phase}`);
      expect(row.props.accessibilityRole).toBeUndefined();
      expect(row.props.onClick).toBeUndefined();
    }
  });

  test('every row is a button when a handler is given, including AHEAD rows', () => {
    // THE OTHER HALF OF 5a's PAIRING PIN, INVERTED BY DESIGN. 5a asserted no row
    // was pressable because there was nowhere to go; 5b-i built the pages, so
    // that assertion became "not pressable WITHOUT a handler" above and this one
    // took its place. The pairing still holds: neither test passes if the
    // affordance and the destination come apart.
    //
    // ALL FOUR, NOT JUST THE VISITED ONES. Roadmap section 8: AHEAD opens. A
    // path where only the current and completed rows led somewhere would draw
    // the locked door the model does not have.
    const onPressPhase = jest.fn();
    render(
      <PhasePath
        destination="focus"
        states={MIXED}
        copy="full"
        stateLabels={PHASE_STATE_LABELS}
        showStateLabels
        onPressPhase={onPressPhase}
      />
    );

    for (const phase of PHASE_ORDER) {
      const row = screen.getByTestId(`phase-path-${phase}`);
      expect(row.props.accessibilityRole).toBe('button');
      onPressPhase.mockClear();
      fireEvent.press(row);
      expect(onPressPhase).toHaveBeenCalledWith(phase);
    }
  });

  test('the spoken label does not change when the row becomes a button', () => {
    // The chevron is an affordance, not content. If it ever reached the label,
    // VoiceOver would read "chevron right" as part of the phase.
    const states: PhaseStates = { ...ALL_AHEAD, remove: 'current' };
    const inert = render(
      <PhasePath destination="calm" states={states} copy="full" stateLabels={PHASE_STATE_LABELS} showStateLabels />
    );
    const inertLabel = inert.getByTestId('phase-path-remove').props.accessibilityLabel;
    inert.unmount();

    render(
      <PhasePath
        destination="calm"
        states={states}
        copy="full"
        stateLabels={PHASE_STATE_LABELS}
        showStateLabels
        onPressPhase={jest.fn()}
      />
    );

    expect(screen.getByTestId('phase-path-remove').props.accessibilityLabel).toBe(inertLabel);
  });

  test('every state is renderable, including the ones nothing produces yet', () => {
    // skipToPhase and stepBackToPhase have no callers until slice 7, so
    // 'skipped' and a mid-route 'done' cannot be produced by using the app. A
    // state that renders as a blank marker would not be noticed until then.
    const states: PhaseState[] = ['done', 'current', 'ahead', 'skipped'];
    for (const state of states) {
      const { unmount } = render(
        <PhasePath
          destination="focus"
          states={{ remove: state, recover: state, rewire: state, refocus: state }}
          copy="full"
          stateLabels={PHASE_STATE_LABELS}
          showStateLabels
        />
      );
      expect(screen.getAllByText(PHASE_STATE_LABELS[state]).length).toBe(
        PHASE_ORDER.length
      );
      unmount();
    }
  });
});

// DEFENCE IN DEPTH, NOT THE FIX (slice 7f). The fix is the validating accessor
// on the journey map's read, pinned in the service suite; these cases pin that
// the component cannot take a whole SURFACE down if an unrenderable destination
// ever reaches it by a route nobody has thought of. (When 7f wrote this it said
// the APP, because there was one ErrorBoundary and it sat above the navigator at
// App.tsx:114. Slice 7g gave every tab and screen its own, so the cost of a miss
// is now the Practices tab. These cases are unchanged and still earn their keep.)
//
// EVERY CASE IS UNREACHABLE TO THE COMPILER, which is why the prop is cast: a
// key outside the union arrives from an Admin SDK write, and the types stop
// describing the data at that boundary.
describe('PhasePath - a destination it cannot render', () => {
  const unrenderable: Array<[string, string]> = [
    ['absent', undefined as unknown as string],
    // A real key in the WEEKLY vocabulary, which reads 'calm' in this one.
    ['"stress", an OutcomeKey', 'stress'],
    ['a trailing space on a real key', 'focus '],
    ['outside the union', 'wellbeing'],
  ];

  test.each(unrenderable)('%s does not throw', (_name, destination) => {
    expect(() =>
      render(
        <PhasePath
          destination={destination as never}
          states={ALL_AHEAD}
          copy="full"
        />
      )
    ).not.toThrow();
  });

  // THE ROWS ARE DROPPED, NOT STUBBED. A placeholder row would draw a step of
  // the journey the app cannot name.
  test.each(unrenderable)('%s renders no rows at all', (_name, destination) => {
    render(
      <PhasePath
        destination={destination as never}
        states={ALL_AHEAD}
        copy="full"
        testID="guard-path"
      />
    );

    for (const phase of PHASE_ORDER) {
      expect(screen.queryByTestId(`guard-path-${phase}`)).toBeNull();
    }
  });

  // THE ANTI-VACUITY DIRECTION, and it is the one that matters here: a guard
  // that dropped every row would satisfy both tests above.
  test('every valid destination still renders all four rows', () => {
    for (const destination of DESTINATION_KEYS) {
      const { unmount } = render(
        <PhasePath
          destination={destination}
          states={ALL_AHEAD}
          copy="full"
          testID="valid-path"
        />
      );
      for (const phase of PHASE_ORDER) {
        expect(screen.getByTestId(`valid-path-${phase}`)).toBeTruthy();
        expect(
          screen.getByText(PHASE_DISPLAY[phase][destination].title)
        ).toBeTruthy();
      }
      unmount();
    }
  });
});
