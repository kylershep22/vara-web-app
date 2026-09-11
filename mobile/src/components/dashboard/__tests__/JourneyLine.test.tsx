/**
 * Today's journey line (slice 7a, roadmap section 9 R6).
 *
 * ALL SIXTEEN CELLS, NOT A SAMPLE. The line's whole job is to render the right
 * approved `short` for a (phase, destination) pair, and a test that checked one
 * pair would pass for a component that ignored its props and rendered a
 * constant. Sixteen assertions cost nothing and pin the lookup.
 *
 * The rest of the file guards what the line must NOT become: a card, a control,
 * or a number.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

import { JourneyLine } from '../JourneyLine';
import { PHASE_DISPLAY, PHASE_ORDER, DESTINATION_KEYS } from '../../../constants/journey';
import { JOURNEY_LINE_LABEL } from '../../../constants/journeyCopy';
import type { DestinationKey, PhaseKey } from '../../../types/models';

describe('JourneyLine - the approved short, for every cell', () => {
  test('renders the label and the short for all sixteen pairs', () => {
    for (const phaseKey of PHASE_ORDER) {
      for (const destination of DESTINATION_KEYS) {
        const { getByTestId, unmount } = render(
          <JourneyLine
            label={JOURNEY_LINE_LABEL}
            phaseKey={phaseKey}
            destination={destination}
          />
        );
        expect(getByTestId('home-journey-line-short')).toHaveTextContent(
          PHASE_DISPLAY[phaseKey][destination].short
        );
        unmount();
      }
    }
  });

  test('the four destinations of one phase render four different shorts', () => {
    // Guards the loop above against passing for a component that renders the
    // right string for the wrong reason - a hardcoded phase lookup ignoring
    // destination would satisfy every assertion above for a single phase.
    const shorts = DESTINATION_KEYS.map((destination) => {
      const { getByTestId, unmount } = render(
        <JourneyLine label="L" phaseKey="remove" destination={destination} />
      );
      const text = getByTestId('home-journey-line-short').props.children;
      unmount();
      return text;
    });
    expect(new Set(shorts).size).toBe(DESTINATION_KEYS.length);
  });

  test('renders the label above the short', () => {
    const { getByText } = render(
      <JourneyLine label={JOURNEY_LINE_LABEL} phaseKey="remove" destination="calm" />
    );
    expect(getByText(JOURNEY_LINE_LABEL)).toBeTruthy();
  });
});

describe('JourneyLine - what it must not become', () => {
  test('is not pressable', () => {
    // Section 8: a text row, never a CTA. A press target here would be a second
    // call to action standing above the one real one on Today.
    const { getByTestId } = render(
      <JourneyLine label="L" phaseKey="recover" destination="energy" />
    );
    const row = getByTestId('home-journey-line');
    expect(row.props.accessibilityRole).toBe('text');
    expect(row.props.onPress).toBeUndefined();
  });

  test('announces as ONE node, label and short together', () => {
    // Read separately a screen reader says a bare label and then an imperative,
    // which reproduces the exact confusion the label exists to prevent.
    const { getByTestId } = render(
      <JourneyLine label="Where you are" phaseKey="remove" destination="focus" />
    );
    expect(getByTestId('home-journey-line').props.accessibilityLabel).toBe(
      `Where you are. ${PHASE_DISPLAY.remove.focus.short}`
    );
  });

  test('renders no digit in any of the sixteen cells', () => {
    // Section 8's counter ban, and the stage words R6 rejected would have
    // arrived as "Stretch 2" or "Stage B". Checks the rendered pair rather than
    // the constants, so an ordinal added by the component is caught too.
    for (const phaseKey of PHASE_ORDER) {
      for (const destination of DESTINATION_KEYS) {
        const { getByTestId, unmount } = render(
          <JourneyLine
            label={JOURNEY_LINE_LABEL}
            phaseKey={phaseKey}
            destination={destination}
          />
        );
        expect(getByTestId('home-journey-line').props.accessibilityLabel).not.toMatch(
          /\d/
        );
        unmount();
      }
    }
  });

  test('names no framework word', () => {
    // remove | recover | rewire | refocus are keys and file names, never copy.
    for (const phaseKey of PHASE_ORDER) {
      for (const destination of DESTINATION_KEYS) {
        const { getByTestId, unmount } = render(
          <JourneyLine
            label={JOURNEY_LINE_LABEL}
            phaseKey={phaseKey}
            destination={destination}
          />
        );
        const announced = getByTestId('home-journey-line').props
          .accessibilityLabel as string;
        expect(announced.toLowerCase()).not.toMatch(
          /\b(remove|recover|rewire|refocus)\b/
        );
        unmount();
      }
    }
  });
});

// DEFENCE IN DEPTH, NOT THE FIX (slice 7e). The fix is the read boundary in
// resolveJourney, which is pinned in that module's own suite; these four cases
// pin that the component cannot take Home down even if a key ever reaches it by
// some route nobody has thought of.
//
// EVERY CASE HERE IS UNREACHABLE TO THE COMPILER, which is why the props are
// cast. A key outside the union cannot be written by a client; it arrives from
// an Admin SDK write, and the types stop describing the data at that boundary.
describe('JourneyLine - a key it cannot render', () => {
  const unrenderable: Array<[string, PhaseKey, DestinationKey]> = [
    // Verbatim from slice 7b's walk: a trailing space typed into the console.
    ['a trailing space on a real phase key', 'remove ' as PhaseKey, 'focus'],
    ['a phase key outside the union', 'reboot' as PhaseKey, 'focus'],
    ['a destination outside the union', 'remove', 'stress' as DestinationKey],
    ['both outside the union', 'reboot' as PhaseKey, 'stress' as DestinationKey],
  ];

  test.each(unrenderable)('%s does not throw', (_name, phaseKey, destination) => {
    expect(() =>
      render(
        <JourneyLine
          label={JOURNEY_LINE_LABEL}
          phaseKey={phaseKey}
          destination={destination}
        />
      )
    ).not.toThrow();
  });

  // NOTHING RENDERS, NOT A PLACEHOLDER. The line answers "where am I" and there
  // is no honest answer from a document nobody can read; its absence is a state
  // Today already has on every legacy-path launch.
  test.each(unrenderable)('%s renders nothing at all', (_name, phaseKey, destination) => {
    const { queryByTestId } = render(
      <JourneyLine
        label={JOURNEY_LINE_LABEL}
        phaseKey={phaseKey}
        destination={destination}
      />
    );

    expect(queryByTestId('home-journey-line')).toBeNull();
    expect(queryByTestId('home-journey-line-short')).toBeNull();
  });
});
