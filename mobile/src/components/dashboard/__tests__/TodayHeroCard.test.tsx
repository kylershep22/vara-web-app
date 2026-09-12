// TodayHeroCard — the day's single action on Home, and the week context under it.
//
// The card had NO test before this slice, which is how the end-date clause came
// to be landing in an untested component. These cover the week-summary line and
// the constraints spec 9 puts on the surface; the completion write itself lives
// in useTodayCard and is covered there.

import React from 'react';
import { render } from '@testing-library/react-native';

import { TodayHeroCard } from '../TodayHeroCard';
import { OUTCOME_LABELS } from '../../../screens/weekly/copy';
import { CAPACITY_LABELS } from '../../../constants/capacityCopy';
import { DESTINATION_SUMMARY_LABELS } from '../../../constants/journeyCopy';
import { TODAY_COPY } from '../dailyPicker.copy';
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
      protocol={{ ...PROTOCOL_MATRIX.recover.normal[0], quickWinActive: false }}
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
          protocol: { ...PROTOCOL_MATRIX.recover.slammed[0], quickWinActive: false },
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

    // THE DONE-LINE'S WORDS, and the four tests below are deliberately about
    // the WORDS rather than about a reference. `COMPLETION_COPY` is module-
    // local and not exported, so the literal is spelled out here on purpose:
    // an assertion that imported the constant would pass against any string it
    // was changed to, which is exactly the thing worth catching on a line the
    // user reads on every single completion. Before slice 7m this surface was
    // held by the sentinel count alone - that count proves a marker is absent,
    // never that the right text renders.
    //
    // "Done for today." is APPROVED COPY: Jen signed off on this exact wording
    // on 2026-09-12 (roadmap row 7m). It is not printed in guidelines §1.5, so
    // the warrant is the owner's sign-off rather than a citation; see the
    // comment above COMPLETION_COPY.
    const APPROVED_DONE_LINE = 'Done for today.';

    test('the done-state renders the approved line for a variant with no acknowledgment', () => {
      // Recover carries no `acknowledgment` on any variant, so this is the
      // `protocol.acknowledgment ?? COMPLETION_COPY.done` fallback at :154.
      // Twelve of the twenty-one authored protocols reach the card this way.
      const screen = renderCard(
        {},
        {
          completed: true,
          protocol: { ...PROTOCOL_MATRIX.recover.normal[0], quickWinActive: false },
        }
      );

      expect(screen.getByText(APPROVED_DONE_LINE)).toBeTruthy();
    });

    test('a variant WITH an acknowledgment shows its own line below the threshold', () => {
      // THIS TEST EXISTS TO STOP THE NEXT ONE PASSING VACUOUSLY. Without it,
      // "the quiet branch renders the approved line" would still be green if
      // the acknowledgment never rendered anywhere, which would be a defect
      // wearing the shape of a pass.
      const remove = PROTOCOL_MATRIX.remove.normal[0];
      const screen = renderCard(
        {},
        {
          completed: true,
          consistentDays: 0,
          protocol: { ...remove, quickWinActive: false },
        }
      );

      expect(remove.acknowledgment).toBeTruthy();
      expect(screen.getByText(remove.acknowledgment as string)).toBeTruthy();
      expect(screen.queryByText(APPROVED_DONE_LINE)).toBeNull();
    });

    test('the quieting branch drops that acknowledgment to the approved line', () => {
      // Five consistent days: the volume control at :182. Praise that keeps
      // arriving at the same volume stops reading as acknowledgment and starts
      // reading as a scoreboard, so past the threshold the per-variant line is
      // replaced by the plain one. No number is rendered in either state and
      // the crossing is never announced.
      const remove = PROTOCOL_MATRIX.remove.normal[0];
      const screen = renderCard(
        {},
        {
          completed: true,
          consistentDays: 5,
          protocol: { ...remove, quickWinActive: false },
        }
      );

      expect(screen.getByText(APPROVED_DONE_LINE)).toBeTruthy();
      expect(screen.queryByText(remove.acknowledgment as string)).toBeNull();
    });

    test('the quieting rule is a deliberate no-op where there is no acknowledgment', () => {
      // PINNED AS INTENDED, NOT LEFT TO SURVIVE BY ACCIDENT. For the twelve
      // Recover and Refocus variants there is nothing to quiet, so both arms of
      // the conditional resolve to the same string and the rule never engages.
      // Jen declined twelve per-protocol acknowledgments on 2026-09-12, which
      // makes this the intended state rather than a gap - but "intended" is
      // only worth writing down if something fails when it stops being true.
      // This is that something: it goes red if a future change makes the two
      // sides of the threshold differ here, in either direction.
      //
      // ITS LIMIT, STATED RATHER THAN LEFT TO BE DISCOVERED. This test pins
      // SAMENESS, and sameness cannot see which way the comparison at :182
      // points: mutating `>=` to `<` leaves it green, by construction, because
      // on a variant with no acknowledgment there is nothing on either side
      // that differs. The two tests above are what hold the threshold's
      // direction; this one holds only that the no-op is still a no-op.
      const recover = { ...PROTOCOL_MATRIX.recover.normal[0], quickWinActive: false };
      const before = renderCard({}, { completed: true, consistentDays: 0, protocol: recover });
      const after = renderCard({}, { completed: true, consistentDays: 5, protocol: recover });

      expect(recover).not.toHaveProperty('acknowledgment');
      expect(textOf(before.getByTestId('home-today-done'))).toBe(
        textOf(after.getByTestId('home-today-done'))
      );
      expect(before.getByText(APPROVED_DONE_LINE)).toBeTruthy();
      expect(after.getByText(APPROVED_DONE_LINE)).toBeTruthy();
    });

    test('renders the day action from the protocol', () => {
      const screen = renderCard();

      expect(textOf(screen.getByTestId('home-today-action'))).toContain(
        PROTOCOL_MATRIX.recover.normal[0].dailyAction
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
          protocol={{ ...PROTOCOL_MATRIX.recover.normal[0], quickWinActive: true }}
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

describe('the summary label across both cycle shapes (slice 4b)', () => {
  // BOTH SHAPES COEXIST INDEFINITELY AND THERE IS NO MIGRATION. Every cycle a
  // beta account already has carries an outcome; nothing written from 4b
  // onwards does. Each test pins one of the two, and the PAIR is the point: a
  // change that fixed one by breaking the other would pass either alone.

  /** A cycle with the outcome genuinely absent, not set to undefined. */
  // NO CAST. `outcome` is optional on WeeklyCycle since slice 4b, so omitting
  // it by destructuring type-checks on its own -- which is itself part of what
  // this suite is asserting. A cast here would have hidden a type that still
  // required the field.
  const journeyEra = (over: Partial<WeeklyCycle> = {}): WeeklyCycle => {
    // The discarded binding IS the omission; naming it is how the field gets
    // dropped, so it is unused on purpose.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { outcome, ...rest } = cycle(over);
    return rest;
  };

  const summaryOf = (props: Record<string, unknown>) =>
    textOf(
      render(
        <TodayHeroCard
          protocol={{ ...PROTOCOL_MATRIX.recover.normal[0], quickWinActive: false }}
          floorCommitment={null}
          completed={false}
          saving={false}
          saveFailed={false}
          onMarkDone={jest.fn()}
          {...props}
        />
      ).getByTestId('home-today-summary')
    );

  test('a LEGACY cycle renders its outcome, exactly as before', () => {
    const summary = summaryOf({ cycle: cycle({ outcome: 'routines' }) });

    expect(summary).toContain(OUTCOME_LABELS.routines);
  });

  test('a legacy cycle ignores the destination even when one is passed', () => {
    // A migrated beta account has BOTH: an outcome on its old weeks and a
    // destination on its journey. The stored outcome wins, because relabelling
    // a week the user already ran rewrites their history.
    const summary = summaryOf({
      cycle: cycle({ outcome: 'routines' }),
      destination: 'calm',
    });

    expect(summary).toContain(OUTCOME_LABELS.routines);
    expect(summary).not.toContain(DESTINATION_SUMMARY_LABELS.calm);
  });

  test('a JOURNEY-ERA cycle renders the destination instead', () => {
    const summary = summaryOf({ cycle: journeyEra(), destination: 'calm' });

    expect(summary).toContain(DESTINATION_SUMMARY_LABELS.calm);
  });

  test('the two maps are never crossed: calm renders Calm, not Stress', () => {
    // OUTCOME_LABELS is keyed focus|stress|routines|energy;
    // DESTINATION_SUMMARY_LABELS is keyed focus|calm|routines|energy. Three
    // keys are spelled the same and one is not, which is what makes a cast look
    // right in review.
    const summary = summaryOf({ cycle: journeyEra(), destination: 'calm' });

    expect(summary).toContain(DESTINATION_SUMMARY_LABELS.calm);
    expect(summary).not.toContain(OUTCOME_LABELS.stress);
  });

  test('with NEITHER, the line opens on the capacity and invents nothing', () => {
    const summary = summaryOf({ cycle: journeyEra() });

    expect(summary).toContain(CAPACITY_LABELS.normal);
    // No label and no separator. Asserted on the separator too, so a future
    // change that rendered a bare label with no slash would still fail.
    expect(summary.trimStart().startsWith(CAPACITY_LABELS.normal)).toBe(true);
    expect(summary).not.toContain('/');
  });
});
