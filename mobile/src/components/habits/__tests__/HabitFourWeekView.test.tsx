// HabitFourWeekView — the four past weeks, and the mark vocabulary they use.
//
// The mark tests are the point. The week strip directly above this view already
// spends the hairline dash on ONE meaning: the habit was never asked about that
// day. This view cannot say that — with no schedule history it does not know
// what was asked — so its empty mark must be a different form, or a single mark
// would carry two meanings on one screen.

import React from 'react';
import { StyleSheet } from 'react-native';
import { render } from '@testing-library/react-native';

import { HabitFourWeekView } from '../HabitFourWeekView';
import { HISTORY_WEEKS, pastWeeks } from '../habitHistory';
import { resolveWeekStart } from '../../dashboard/habitWeekState';
import {
  SAGE_DASH,
  SAGE_GAP,
  SAGE_UPCOMING,
  SAGE_HISTORY_EMPTY,
} from '../../dashboard/habitCellMarks';

// Thursday 16 July 2026.
const TODAY = new Date(2026, 6, 16, 9, 0, 0);

const WEEKS = pastWeeks(TODAY, resolveWeekStart(), HISTORY_WEEKS);
const ALL_KEYS = WEEKS.flatMap((w) => w.dateKeys);

function styleOf(node: any) {
  return StyleSheet.flatten(node.props.style) as Record<string, any>;
}

describe('HabitFourWeekView — the empty mark is not the strip dash', () => {
  const { getAllByTestId } = render(
    <HabitFourWeekView completions={[ALL_KEYS[0]]} now={TODAY} />
  );
  const empty = styleOf(getAllByTestId('history-mark-empty')[0]);
  const completed = styleOf(getAllByTestId('history-mark-completed')[0]);

  it('never uses the dash color, which means "not scheduled"', () => {
    expect(empty.backgroundColor).not.toBe(SAGE_DASH);
    expect(empty.backgroundColor).toBe(SAGE_HISTORY_EMPTY);
  });

  it('is a dot, not a line: square box, fully rounded', () => {
    expect(empty.width).toBe(empty.height);
    expect(empty.borderRadius).toBe(empty.width / 2);
    // The dash is a 1.5px-tall bar. Nothing here may be that shape.
    expect(empty.height).toBeGreaterThan(2);
  });

  it('is separable from the strip gap dot, which means "asked, not done"', () => {
    // The gap dot is 8px at 45% sage. This is smaller AND fainter than that:
    // different on two axes, not one.
    expect(empty.backgroundColor).not.toBe(SAGE_GAP);
    expect(empty.width).toBeLessThan(8);
    expect(alphaOf(empty.backgroundColor)).toBeLessThan(alphaOf(SAGE_GAP));
  });

  it('is distinguishable from the completed mark by size and fill', () => {
    expect(completed.backgroundColor).not.toBe(empty.backgroundColor);
    expect(completed.width).toBeGreaterThan(empty.width * 2);
  });

  it('carries its own token rather than borrowing another mark state', () => {
    [SAGE_DASH, SAGE_GAP, SAGE_UPCOMING].forEach((token) => {
      expect(SAGE_HISTORY_EMPTY).not.toBe(token);
    });
  });
});

describe('HabitFourWeekView — structure and labels', () => {
  it('renders four rows and twenty-eight cells whatever the history', () => {
    const { getAllByTestId, queryAllByTestId, getByTestId } = render(
      <HabitFourWeekView completions={ALL_KEYS.slice(0, 5)} now={TODAY} />
    );

    ['4 wks ago', '3 wks ago', '2 wks ago', 'Last week'].forEach((label) => {
      expect(getByTestId(`habit-history-row-${label}`)).toBeTruthy();
    });

    expect(
      getAllByTestId('history-mark-completed').length +
        queryAllByTestId('history-mark-empty').length
    ).toBe(28);
  });

  it('says "no completion recorded", never "missed"', () => {
    const { getByTestId } = render(
      <HabitFourWeekView completions={[ALL_KEYS[0]]} now={TODAY} />
    );

    expect(getByTestId(`habit-history-cell-${ALL_KEYS[0]}`).props.accessibilityLabel).toMatch(
      /, completed$/
    );

    const emptyLabel = getByTestId(`habit-history-cell-${ALL_KEYS[1]}`).props
      .accessibilityLabel;
    expect(emptyLabel).toMatch(/, no completion recorded$/);
    expect(emptyLabel).not.toMatch(/missed|not scheduled|failed/i);
  });
});

/** Alpha out of an `rgba(r, g, b, a)` string. */
function alphaOf(color: string): number {
  const match = /rgba\([^)]*,\s*([\d.]+)\s*\)/.exec(color);
  return match ? Number(match[1]) : 1;
}
