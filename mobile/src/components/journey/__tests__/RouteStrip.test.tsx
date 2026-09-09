// The route strip: four phases, the right `short` for the destination.
//
// The strip is the only surface rendering PHASE_DISPLAY in slice 4, so this is
// where "the pack landed correctly" is pinned. It reads the real constant
// rather than a fixture: a fixture would let the strip and the strings drift
// apart and still pass.

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { RouteStrip } from '../RouteStrip';
import { DESTINATION_KEYS, PHASE_DISPLAY, PHASE_ORDER } from '../../../constants/journey';

describe('RouteStrip', () => {
  test('renders all four phases, in PHASE_ORDER', () => {
    render(<RouteStrip destination="focus" />);

    for (const phase of PHASE_ORDER) {
      expect(screen.getByTestId(`journey-route-strip-${phase}`)).toBeTruthy();
    }
  });

  test.each(DESTINATION_KEYS)(
    'renders the %s column of shorts, and no other destination',
    (destination) => {
      render(<RouteStrip destination={destination} />);

      for (const phase of PHASE_ORDER) {
        expect(screen.getByText(PHASE_DISPLAY[phase][destination].short)).toBeTruthy();
      }

      // The wrong-column check. Without it, a strip hard-wired to `focus` would
      // pass the loop above for focus and fail nothing for the other three.
      for (const other of DESTINATION_KEYS) {
        if (other === destination) continue;
        for (const phase of PHASE_ORDER) {
          const wrong = PHASE_DISPLAY[phase][other].short;
          if (wrong === PHASE_DISPLAY[phase][destination].short) continue;
          expect(screen.queryByText(wrong)).toBeNull();
        }
      }
    }
  );

  test('renders `short` and never `title` or `gloss`', () => {
    // Slice 5 owns the map card. If the strip ever reaches for `title`, two
    // surfaces that must stay independently editable start sharing a string.
    render(<RouteStrip destination="calm" />);

    for (const phase of PHASE_ORDER) {
      const cell = PHASE_DISPLAY[phase].calm;
      expect(screen.queryByText(cell.gloss)).toBeNull();
      if (cell.title !== cell.short) {
        expect(screen.queryByText(cell.title)).toBeNull();
      }
    }
  });

  test('never renders a framework word', () => {
    // Roadmap section 8: remove / recover / rewire / refocus are keys, never
    // values. brandCopyGuard covers the source files; this covers the render.
    render(<RouteStrip destination="energy" />);

    for (const phase of PHASE_ORDER) {
      expect(screen.queryByText(new RegExp(`\\b${phase}\\b`, 'i'))).toBeNull();
    }
  });

  test('A2 rows are not pressable, after the map made rows pressable', () => {
    // ADDED IN 5b-i, AND IT IS THE POINT OF THE SLICE'S FENCE. PhasePath gained
    // an optional press handler so the journey map's rows could open the phase
    // pages. The strip must not inherit it: A2 runs during onboarding and once
    // at migration, there is nowhere for a row to go from either, and a row that
    // looked tappable there would be a promise the flow cannot keep.
    //
    // Asserted through RouteStrip rather than PhasePath because what matters is
    // what A2 ACTUALLY RENDERS. PhasePath's own suite proves a handler-less path
    // is inert; this proves the strip never passes one.
    render(<RouteStrip destination="focus" currentPhase="remove" />);

    for (const phase of PHASE_ORDER) {
      const row = screen.getByTestId(`journey-route-strip-${phase}`);
      expect(row.props.accessibilityRole).toBeUndefined();
      expect(row.props.onClick).toBeUndefined();
    }
  });

  test('marks the current phase for a screen reader, not only visually', () => {
    // The marker dot carries no text, so the emphasis on the current row is
    // invisible to VoiceOver unless the label says so.
    render(<RouteStrip destination="focus" currentPhase="remove" />);

    expect(
      screen.getByLabelText(`${PHASE_DISPLAY.remove.focus.short}. Starting here.`)
    ).toBeTruthy();
    expect(screen.getByLabelText(PHASE_DISPLAY.recover.focus.short)).toBeTruthy();
  });
});

describe('the pack landed intact', () => {
  test('all 16 cells carry all three lengths, none empty', () => {
    for (const phase of PHASE_ORDER) {
      for (const destination of DESTINATION_KEYS) {
        const cell = PHASE_DISPLAY[phase][destination];
        expect(cell.title.length).toBeGreaterThan(0);
        expect(cell.short.length).toBeGreaterThan(0);
        expect(cell.gloss.length).toBeGreaterThan(0);
      }
    }
  });

  test('exactly five shorts are identical to their titles, BY DESIGN', () => {
    // Content Pack v1, editorial note at the short-labels anchor. Where a title
    // is already short enough for the strip, Jen repeats it rather than
    // inventing a second phrasing.
    //
    // PINNED AS EXPECTED DUPLICATES, not as distinctness. A test asserting all
    // 16 differ would fail correctly and would then be "fixed" by editing one
    // of Jen's strings, which is the outcome this pin exists to prevent.
    const identical: string[] = [];
    for (const phase of PHASE_ORDER) {
      for (const destination of DESTINATION_KEYS) {
        const cell = PHASE_DISPLAY[phase][destination];
        if (cell.short === cell.title) identical.push(`${destination}/${phase}`);
      }
    }

    expect(identical.sort()).toEqual(
      [
        'calm/rewire',
        'energy/recover',
        'energy/remove',
        'focus/recover',
        'routines/recover',
      ].sort()
    );
  });
});
