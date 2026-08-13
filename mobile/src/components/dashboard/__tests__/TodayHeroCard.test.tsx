// TodayHeroCard — the day's single action on Home, and the week context under it.
//
// The card had NO test before this slice, which is how the end-date clause came
// to be landing in an untested component. These cover the week-summary line and
// the constraints spec 9 puts on the surface; the completion write itself lives
// in useTodayCard and is covered there.

import React from 'react';
import { render } from '@testing-library/react-native';

import { TodayHeroCard } from '../TodayHeroCard';
import { CAPACITY_LABELS, OUTCOME_LABELS, TODAY_COPY } from '../../../screens/weekly/copy';
import { PROTOCOL_MATRIX } from '../../../protocolEngine';
import type { WeeklyCycle } from '../../../types/models';

// 2026-08-16 is a SUNDAY; 2026-08-22 is the Saturday that ends that week.
const SUNDAY = '2026-08-16';
const SATURDAY = '2026-08-22';

const cycle = (over: Partial<WeeklyCycle> = {}): WeeklyCycle =>
  ({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: SUNDAY,
    weekEnd: SATURDAY,
    outcome: 'routines',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'routines-normal',
    ...over,
  }) as WeeklyCycle;

/**
 * The rendered text of a node, children flattened.
 *
 * The summary line interpolates several expressions, so its children are an
 * ARRAY of strings rather than one string, and matching on the node directly
 * misses every segment after the first.
 */
function textOf(node: { props: { children: unknown } }): string {
  const flatten = (child: unknown): string =>
    Array.isArray(child) ? child.map(flatten).join('') : typeof child === 'string' ? child : '';
  return flatten(node.props.children);
}

function renderCard(over: Partial<WeeklyCycle> = {}, props: Record<string, unknown> = {}) {
  return render(
    <TodayHeroCard
      cycle={cycle(over)}
      protocol={{ ...PROTOCOL_MATRIX.routines.normal[0], quickWinActive: false }}
      floorCommitment={null}
      completed={false}
      saving={false}
      saveFailed={false}
      onMarkDone={jest.fn()}
      {...props}
    />
  );
}

describe('TodayHeroCard', () => {
  describe('the week-summary line', () => {
    test('carries the outcome and the tier in force', () => {
      const screen = renderCard();
      const summary = textOf(screen.getByTestId('home-today-summary'));

      expect(summary).toContain(OUTCOME_LABELS.routines);
      expect(summary).toContain(CAPACITY_LABELS.normal);
    });

    test('takes the tier from the PROTOCOL, not from the cycle', () => {
      // Capacity is a daily read now (roadmap 3b-i), so the cycle's own tier is
      // no longer what the day was derived at. Rendering it would label the
      // card with a tier the action underneath does not match. The protocol
      // carries the capacity it resolved, which makes the two the same fact
      // rather than two values that have to agree.
      const screen = renderCard(
        { capacityInitial: 'normal', capacityCurrent: 'normal' },
        {
          protocol: { ...PROTOCOL_MATRIX.routines.slammed[0], quickWinActive: false },
        }
      );
      const summary = textOf(screen.getByTestId('home-today-summary'));

      expect(summary).toContain(CAPACITY_LABELS.slammed);
      expect(summary).not.toContain(CAPACITY_LABELS.normal);
    });

    test('appends the day the week runs through', () => {
      // Saturday 2026-08-22 is the stored inclusive boundary.
      const screen = renderCard();

      expect(textOf(screen.getByTestId('home-today-summary'))).toContain('Saturday');
    });

    test('reads the boundary through resolveWeekEnd, not weekStart + 6', () => {
      // A STUB week: four days, so weekStart + 6 would name the wrong day. This
      // is the assertion that fails if the card ever reimplements the boundary
      // instead of calling the same function the entry guard calls.
      const screen = renderCard({ weekStart: '2026-08-12', weekEnd: '2026-08-15' });

      const summary = textOf(screen.getByTestId('home-today-summary'));
      expect(summary).toContain('Saturday');
      expect(summary).not.toContain('Tuesday');
    });

    test('omits the clause entirely for a legacy cycle with no stored boundary', () => {
      // The fallback would name weekStart + 6, a weekday this user never chose.
      // Nothing is more honest than an arbitrary day.
      const screen = renderCard({ weekStart: SUNDAY, weekEnd: undefined });
      const summary = textOf(screen.getByTestId('home-today-summary'));

      expect(summary).toContain(OUTCOME_LABELS.routines);
      expect(summary).not.toContain('Saturday');
      expect(summary).not.toContain('runs through');
    });

    test('is calm orientation, never a countdown', () => {
      const screen = renderCard();

      expect(screen.queryByText(/days? left|remaining|hurry/i)).toBeNull();
    });
  });

  describe('the one action', () => {
    test('offers the completion control when the day is not done', () => {
      const screen = renderCard();

      expect(screen.getByTestId('home-today-complete')).toBeTruthy();
      expect(screen.queryByTestId('home-today-done')).toBeNull();
    });

    test('becomes a state, not a button, once done', () => {
      // Forward-only: there is nothing to un-tap.
      const screen = renderCard({}, { completed: true });

      expect(screen.getByTestId('home-today-done')).toBeTruthy();
      expect(screen.queryByTestId('home-today-complete')).toBeNull();
    });

    test('renders the day action from the protocol', () => {
      const screen = renderCard();

      expect(textOf(screen.getByTestId('home-today-action'))).toContain(
        PROTOCOL_MATRIX.routines.normal[0].dailyAction
      );
    });
  });

  describe('spec 9 constraints on the surface', () => {
    test('shows no streak, score, percentage or grade', () => {
      const screen = renderCard();

      expect(screen.queryByText(/%|streak|score|grade|points?\b/i)).toBeNull();
    });

    test('shows the floor only when one was read', () => {
      expect(renderCard().queryByTestId('home-today-floor')).toBeNull();
      expect(
        renderCard({}, { floorCommitment: 'ten minutes outside' }).getByTestId(
          'home-today-floor'
        )
      ).toBeTruthy();
    });

    test('surfaces the quick win only when the engine marks it active', () => {
      const screen = render(
        <TodayHeroCard
          cycle={cycle()}
          protocol={{ ...PROTOCOL_MATRIX.routines.normal[0], quickWinActive: true }}
          floorCommitment={null}
          completed={false}
          saving={false}
          saveFailed={false}
          onMarkDone={jest.fn()}
        />
      );

      expect(screen.getByTestId('home-today-quickwin')).toBeTruthy();
      expect(screen.getByText(TODAY_COPY.quickWinHeading)).toBeTruthy();
    });
  });
});
