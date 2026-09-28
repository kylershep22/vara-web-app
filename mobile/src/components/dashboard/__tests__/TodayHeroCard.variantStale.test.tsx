/**
 * TodayHeroCard: THE VARIANT TREATMENT (STALE-SOURCE-COMPLETION), and why it is
 * NOT the rollover treatment in TodayHeroCard.test.tsx.
 *
 * `variantStale` means the card holds a variant the current journey would no
 * longer serve: a phase advance has reached Home and the new load has not
 * committed. It dims the control exactly as `staleDate` does. It does NOT touch
 * the done branch, because completion is keyed to the date alone - a day
 * already done is still done after an advance, and hiding the check would show
 * it as a dimmed "Mark done".
 *
 * A SUITE OF ITS OWN so TodayHeroCard.test.tsx stays under the max-lines limit.
 * The hook's refusal of the write is pinned separately, in
 * useTodayCard.variantStale.test.ts.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TodayHeroCard } from '../TodayHeroCard';
import { PROTOCOL_MATRIX } from '../../../protocolEngine';

// No cycle: the week-summary line is not what this suite is about, and the
// prop is optional precisely so the card renders without one.
function renderCard(props: Record<string, unknown> = {}) {
  return render(
    <TodayHeroCard
      protocol={{ ...PROTOCOL_MATRIX.remove.normal[0], quickWinActive: false }}
      floorCommitment={null}
      completed={false}
      saving={false}
      saveFailed={false}
      onMarkDone={jest.fn()}
      {...props}
    />
  );
}

describe('a load resolved under a variant that is no longer current', () => {
  test('the completion control is rendered but not actionable', () => {
    const screen = renderCard({ variantStale: true });
    const cta = screen.getByTestId('home-today-complete');

    // STILL MOUNTED, as under `staleDate`: the button holds its height while
    // dimmed, so nothing below it moves.
    expect(cta.props.accessibilityState).toEqual({ disabled: true });
  });

  test('a press on the stale control does not reach onMarkDone', () => {
    const onMarkDone = jest.fn();
    const screen = renderCard({ variantStale: true, onMarkDone });

    fireEvent.press(screen.getByTestId('home-today-complete'));

    expect(onMarkDone).not.toHaveBeenCalled();
  });

  test('the done-state STAYS when the day is already complete', () => {
    // THE DISTINCTION FROM `staleDate`. A change that routed this flag into the
    // done branch alongside `staleDate` is what this catches.
    const screen = renderCard({ completed: true, variantStale: true });

    expect(screen.getByTestId('home-today-done')).toBeTruthy();
    expect(screen.queryByTestId('home-today-complete')).toBeNull();
  });

  test('an absent variantStale changes nothing for existing callers', () => {
    const onMarkDone = jest.fn();
    const screen = renderCard({ onMarkDone });
    const cta = screen.getByTestId('home-today-complete');

    expect(cta.props.accessibilityState).toEqual({ disabled: false });
    // The press path is live when nothing is stale, so the refusal above is
    // the flag's doing and not the harness's.
    fireEvent.press(cta);
    expect(onMarkDone).toHaveBeenCalledTimes(1);
  });
});
