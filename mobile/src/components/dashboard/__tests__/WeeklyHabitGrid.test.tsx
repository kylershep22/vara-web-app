// WeeklyHabitGrid — rendering, interaction, and guardrail tests.
//
// The guardrail tests are the point: a perfect non-daily week must render zero
// missed-state cells, off-schedule completion must be indistinguishable from an
// ordinary completion, and nothing anywhere may count, score, or shame.

jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true, // no animation in tests
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { WeeklyHabitGrid } from '../WeeklyHabitGrid';
import { currentWeek, resolveWeekStart } from '../habitWeekState';
import type { Habit } from '../../../types/models';

// Thursday 2026-07-16. Sunday-start week: Sun 12 … Sat 18.
const THURSDAY = new Date(2026, 6, 16, 9, 0, 0);
const TODAY_KEY = '2026-07-16';

function habit(over: Partial<Habit> & { id: string; name: string }): Habit {
  return {
    userId: 'u1',
    type: 'daily',
    frequency: 7,
    streak: 0,
    longestStreak: 0,
    active: true,
    createdAt: {} as any,
    updatedAt: {} as any,
    ...over,
  } as Habit;
}

const MWF = habit({
  id: 'h-mwf',
  name: 'Strength training',
  frequencyType: 'specific_days',
  specificDays: [1, 3, 5],
});

const DAILY = habit({ id: 'h-daily', name: 'Morning walk', frequencyType: 'daily' });

const FLEXIBLE = habit({
  id: 'h-flex',
  name: 'Read something',
  frequencyType: 'flexible',
});

const UNKNOWN = habit({ id: 'h-unknown', name: 'Legacy habit' }); // no frequencyType

function setup(over: Partial<React.ComponentProps<typeof WeeklyHabitGrid>> = {}) {
  const onCompleteToday = jest.fn();
  const onOpenHabit = jest.fn();
  const onViewAll = jest.fn();
  const onAddHabit = jest.fn();

  const utils = render(
    <WeeklyHabitGrid
      habits={[MWF]}
      completionsByHabit={{}}
      onCompleteToday={onCompleteToday}
      onOpenHabit={onOpenHabit}
      onViewAll={onViewAll}
      onAddHabit={onAddHabit}
      now={THURSDAY}
      {...over}
    />
  );

  return { ...utils, onCompleteToday, onOpenHabit, onViewAll, onAddHabit };
}

describe('a perfect non-daily week renders zero missed-state cells', () => {
  it('Mon/Wed/Fri, both elapsed scheduled days done → no gap marks at all', () => {
    const { queryAllByTestId } = setup({
      completionsByHabit: { 'h-mwf': ['2026-07-13', '2026-07-15'] },
    });

    // The honest-gap form must be entirely absent.
    expect(queryAllByTestId('mark-gap')).toHaveLength(0);
    expect(queryAllByTestId('mark-completed')).toHaveLength(2);
    // The four never-scheduled days are dashes (+ today's dashed ring), never dots.
    expect(queryAllByTestId('mark-unscheduled')).toHaveLength(3);
    expect(queryAllByTestId('mark-today_unscheduled')).toHaveLength(1);
  });

  it('the same week reads as 7 cells, not 3-of-7 — no cell says "not completed"', () => {
    const { queryAllByLabelText } = setup({
      completionsByHabit: { 'h-mwf': ['2026-07-13', '2026-07-15'] },
    });
    // Friday is still upcoming, so it is "not completed" — but no PAST day is.
    expect(queryAllByLabelText('Monday, not completed')).toHaveLength(0);
    expect(queryAllByLabelText('Wednesday, not completed')).toHaveLength(0);
  });

  it('a genuinely skipped scheduled day still shows its gap (information is kept)', () => {
    const { queryAllByTestId, getByLabelText } = setup({
      completionsByHabit: { 'h-mwf': ['2026-07-15'] },
    });
    expect(queryAllByTestId('mark-gap')).toHaveLength(1);
    expect(getByLabelText('Monday, not completed')).toBeTruthy();
  });

  it('a flexible habit shows no gaps and no dots on unscheduled days', () => {
    const { queryAllByTestId } = setup({ habits: [FLEXIBLE] });
    expect(queryAllByTestId('mark-gap')).toHaveLength(0);
    expect(queryAllByTestId('mark-unscheduled')).toHaveLength(6);
    expect(queryAllByTestId('mark-today_unscheduled')).toHaveLength(1);
  });

  it('an unknown frequencyType is treated as not scheduled, never as daily', () => {
    const { queryAllByTestId } = setup({ habits: [UNKNOWN] });
    expect(queryAllByTestId('mark-gap')).toHaveLength(0);
    expect(queryAllByTestId('mark-unscheduled')).toHaveLength(6);
  });
});

describe('off-schedule completion', () => {
  it('renders identically to an ordinary completion — no deviation marker', () => {
    // Tuesday is not a scheduled day for the Mon/Wed/Fri habit.
    const { queryAllByTestId, getByLabelText } = setup({
      completionsByHabit: { 'h-mwf': ['2026-07-14'] },
    });

    // One completed mark, using the same form as any other completion.
    expect(queryAllByTestId('mark-completed')).toHaveLength(1);
    // Spoken exactly like a scheduled completion — not "extra", not "off plan".
    expect(getByLabelText('Tuesday, completed')).toBeTruthy();
  });

  it('today is tappable even when today is not scheduled', () => {
    // Thursday is not in Mon/Wed/Fri.
    const { getByLabelText, onCompleteToday } = setup();
    fireEvent.press(getByLabelText('Today, not scheduled, double tap to complete'));
    expect(onCompleteToday).toHaveBeenCalledWith('h-mwf', TODAY_KEY);
  });

  it('today carries a faint affordance when unscheduled, distinct from scheduled', () => {
    const { queryAllByTestId } = setup({ habits: [MWF, DAILY] });
    expect(queryAllByTestId('mark-today_unscheduled')).toHaveLength(1); // MWF
    expect(queryAllByTestId('mark-today_scheduled')).toHaveLength(1); // daily
  });
});

describe('past and future cells are inert', () => {
  it('pressing a past cell does not reach the completion handler', () => {
    const { getByTestId, onCompleteToday } = setup();
    fireEvent.press(getByTestId('weekly-habit-cell-h-mwf-2026-07-13'));
    expect(onCompleteToday).not.toHaveBeenCalled();
  });

  it('pressing a past COMPLETED cell does not un-complete it', () => {
    const { getByTestId, onCompleteToday } = setup({
      completionsByHabit: { 'h-mwf': ['2026-07-13'] },
    });
    fireEvent.press(getByTestId('weekly-habit-cell-h-mwf-2026-07-13'));
    expect(onCompleteToday).not.toHaveBeenCalled();
  });

  it('pressing a future cell does not reach the completion handler', () => {
    const { getByTestId, onCompleteToday } = setup();
    fireEvent.press(getByTestId('weekly-habit-cell-h-mwf-2026-07-17'));
    expect(onCompleteToday).not.toHaveBeenCalled();
  });

  it('only today ever reaches the handler, and always with today\'s date', () => {
    const { getByTestId, onCompleteToday } = setup({ habits: [DAILY] });
    fireEvent.press(getByTestId(`weekly-habit-cell-h-daily-${TODAY_KEY}`));
    expect(onCompleteToday).toHaveBeenCalledTimes(1);
    expect(onCompleteToday).toHaveBeenCalledWith('h-daily', TODAY_KEY);
  });
});

describe('no surveillance, no shame', () => {
  it('renders no digits anywhere — no streak, count, percentage, or score', () => {
    const { toJSON } = setup({
      habits: [MWF, DAILY, FLEXIBLE],
      completionsByHabit: { 'h-mwf': ['2026-07-13'], 'h-daily': ['2026-07-15'] },
    });

    const text = collectText(toJSON());
    expect(text.join(' ')).not.toMatch(/\d/);
  });

  it('the only text is habit names and the day-of-week header letters', () => {
    const { toJSON } = setup({ habits: [MWF, DAILY] });
    const text = collectText(toJSON());

    // The header renders first: seven single letters, one per column.
    const header = text.slice(0, 7);
    expect(header).toHaveLength(7);
    for (const letter of header) {
      expect(letter).toMatch(/^[A-Z]$/);
    }

    // Everything after the header is habit names — nothing else.
    expect(text.slice(7).sort()).toEqual(
      ['Morning walk', 'Strength training'].sort()
    );
  });

  it('the header letters follow the same locale week start as the grid', () => {
    const { toJSON } = setup({ habits: [DAILY] });
    const expected = currentWeek(THURSDAY, resolveWeekStart()).map((d) =>
      d.dayName.charAt(0)
    );
    expect(collectText(toJSON()).slice(0, 7)).toEqual(expected);
  });

  it('the header carries no digits and no count', () => {
    const { getByTestId } = setup({
      habits: [MWF, DAILY, FLEXIBLE, UNKNOWN, habit({ id: 'h5', name: 'Fifth' })],
    });
    // includeHiddenElements because the header is hidden from the a11y tree —
    // the default query would not find it, which is itself the proof.
    const header = getByTestId('weekly-habit-grid-header', {
      includeHiddenElements: true,
    });
    expect(collectText(header).join('')).not.toMatch(/\d/);
  });

  it('the header is hidden from screen readers (cells speak their own day)', () => {
    const { getByTestId, queryByTestId } = setup();

    // Absent from the default (accessibility-respecting) query...
    expect(queryByTestId('weekly-habit-grid-header')).toBeNull();

    // ...and hidden on both platforms' props.
    const header = getByTestId('weekly-habit-grid-header', {
      includeHiddenElements: true,
    });
    expect(header.props.accessibilityElementsHidden).toBe(true);
    expect(header.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('uses no coral, red, or amber in any rendered style', () => {
    const { toJSON } = setup({
      habits: [MWF, DAILY, FLEXIBLE],
      completionsByHabit: { 'h-mwf': ['2026-07-13'] },
    });

    const colors = collectColors(toJSON());
    expect(colors.length).toBeGreaterThan(0);
    for (const c of colors) {
      expect(c.toLowerCase()).not.toMatch(/#d97a6e|#e|red|amber|orange/i);
      // Every color used is teal, sage, or a surface/neutral token.
      expect(c).not.toMatch(/rgba?\(\s*2[0-5][0-9]\s*,\s*[0-9]{1,2}\s*,/);
    }
  });

  it('the view-all affordance names no count of hidden habits', () => {
    // Five habits, four shown — the label must not say "1 more" or "5".
    const { getByText, getByTestId } = setup({
      habits: [MWF, DAILY, FLEXIBLE, UNKNOWN, habit({ id: 'h5', name: 'Fifth' })],
    });

    const cta = getByText(/View all habits/);
    expect(String(cta.props.children)).not.toMatch(/\d/);
    expect(
      getByTestId('weekly-habit-grid-view-all').props.accessibilityLabel
    ).not.toMatch(/\d/);
  });
});

describe('rows and navigation', () => {
  it('shows at most four habits and offers a tap-through for the rest', () => {
    const { queryByTestId, getByTestId, onViewAll } = setup({
      habits: [MWF, DAILY, FLEXIBLE, UNKNOWN, habit({ id: 'h5', name: 'Fifth' })],
    });

    expect(getByTestId('weekly-habit-row-h-mwf')).toBeTruthy();
    expect(queryByTestId('weekly-habit-row-h5')).toBeNull();

    fireEvent.press(getByTestId('weekly-habit-grid-view-all'));
    expect(onViewAll).toHaveBeenCalledTimes(1);
  });

  it('offers no tap-through when every habit already fits', () => {
    const { queryByTestId } = setup({ habits: [MWF, DAILY] });
    expect(queryByTestId('weekly-habit-grid-view-all')).toBeNull();
  });

  it('preserves the order it was given (newest first, as loaded)', () => {
    const { toJSON } = setup({ habits: [MWF, DAILY, FLEXIBLE] });
    // Skip the seven header letters.
    expect(collectText(toJSON()).slice(7)).toEqual([
      'Strength training',
      'Morning walk',
      'Read something',
    ]);
  });

  it('tapping a habit name opens that habit', () => {
    const { getByTestId, onOpenHabit } = setup({ habits: [MWF, DAILY] });
    fireEvent.press(getByTestId('weekly-habit-name-h-daily'));
    expect(onOpenHabit).toHaveBeenCalledWith(DAILY);
  });

  it('renders an empty state, not a grid, when there are no habits', () => {
    const { getByTestId, queryByTestId, getByText } = setup({ habits: [] });

    expect(queryByTestId('weekly-habit-grid')).toBeNull();
    expect(getByTestId('weekly-habit-grid-empty')).toBeTruthy();
    expect(getByText('Habits show up here, a week at a time.')).toBeTruthy();
    expect(getByTestId('weekly-habit-grid-add')).toBeTruthy();
  });

  it('the empty state omits the day-of-week header — no grid to label', () => {
    const { queryByTestId } = setup({ habits: [] });
    expect(
      queryByTestId('weekly-habit-grid-header', { includeHiddenElements: true })
    ).toBeNull();
  });

  it('the empty-state CTA routes to the habits surface', () => {
    const { getByTestId, onAddHabit } = setup({ habits: [] });
    fireEvent.press(getByTestId('weekly-habit-grid-add'));
    expect(onAddHabit).toHaveBeenCalledTimes(1);
  });

  it('the empty state never implies the user is behind', () => {
    const { toJSON } = setup({ habits: [] });
    const text = collectText(toJSON()).join(' ');

    // No deficit framing: no "yet", no "you haven't", no catching up.
    expect(text).not.toMatch(/\byet\b/i);
    expect(text).not.toMatch(/haven'?t|hasn'?t|don'?t have|no habits/i);
    expect(text).not.toMatch(/behind|catch up|missed|start now|still/i);
    // And no counts, here as anywhere else in the card.
    expect(text).not.toMatch(/\d/);
  });

  it('an optimistic completion wins over the loaded set', () => {
    const { queryAllByTestId } = setup({
      habits: [DAILY],
      completionsByHabit: { 'h-daily': [] },
      optimisticCompletions: { 'h-daily': { [TODAY_KEY]: true } },
    });
    expect(queryAllByTestId('mark-completed')).toHaveLength(1);
  });
});

// ── helpers ──────────────────────────────────────────────────────────

function collectText(node: any, out: string[] = []): string[] {
  if (node == null) return out;
  if (typeof node === 'string') {
    if (node.trim()) out.push(node.trim());
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out));
    return out;
  }
  if (node.children) node.children.forEach((c: any) => collectText(c, out));
  return out;
}

function collectColors(node: any, out: string[] = []): string[] {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collectColors(n, out));
    return out;
  }

  const style = node.props?.style;
  const styles = Array.isArray(style) ? style : [style];
  for (const s of styles) {
    if (!s || typeof s !== 'object') continue;
    for (const key of ['backgroundColor', 'borderColor', 'color']) {
      const v = (s as any)[key];
      if (typeof v === 'string' && v !== 'transparent') out.push(v);
    }
  }

  if (node.children) node.children.forEach((c: any) => collectColors(c, out));
  return out;
}
