/**
 * TodayHeroCard: THE PROTOCOL SHEET'S ENTRY (slice 9.1b).
 *
 * The card's content area, the heading and the day's action, becomes the way
 * into the sheet when Home hands it `onOpenDetail`. Three properties matter:
 * the entry is absent when the prop is, the existing CTA is untouched beside
 * it, and the entry refuses while either staleness flag is up, because a sheet
 * pins what it opens on and only a currently valid protocol may be pinned.
 *
 * A SUITE OF ITS OWN so TodayHeroCard.test.tsx stays under the max-lines limit.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TodayHeroCard } from '../TodayHeroCard';
import { PROTOCOL_MATRIX } from '../../../protocolEngine';
import { PROTOCOL_SHEET_COPY } from '../protocolSheet.copy';

const PROTOCOL = { ...PROTOCOL_MATRIX.remove.normal[0], quickWinActive: false };

function renderCard(props: Record<string, unknown> = {}) {
  return render(
    <TodayHeroCard
      protocol={PROTOCOL}
      floorCommitment={null}
      completed={false}
      saving={false}
      saveFailed={false}
      onMarkDone={jest.fn()}
      {...props}
    />
  );
}

test('without onOpenDetail there is no entry, and the card is as it was', () => {
  const screen = renderCard();
  expect(screen.queryByTestId('home-today-open-detail')).toBeNull();
  expect(screen.getByTestId('home-today-action')).toBeTruthy();
});

test('with it, the content area is a button that opens the sheet', () => {
  const onOpenDetail = jest.fn();
  const screen = renderCard({ onOpenDetail });
  const entry = screen.getByTestId('home-today-open-detail');

  expect(entry.props.accessibilityRole).toBe('button');
  // The action text is INSIDE the entry, so the whole area is the target.
  expect(screen.getByTestId('home-today-action')).toBeTruthy();
  fireEvent.press(entry);
  expect(onOpenDetail).toHaveBeenCalledTimes(1);
});

test('the entry says what it opens, for VoiceOver', () => {
  const screen = renderCard({ onOpenDetail: jest.fn() });
  const entry = screen.getByTestId('home-today-open-detail');
  expect(entry.props.accessibilityHint).toBe(PROTOCOL_SHEET_COPY.entryHint);
  expect(PROTOCOL_SHEET_COPY.entryHint).toBe("Opens today's action in full");
});

test('the CTA is still the one action and still completes, not opens', () => {
  const onOpenDetail = jest.fn();
  const onMarkDone = jest.fn();
  const screen = renderCard({ onOpenDetail, onMarkDone });

  fireEvent.press(screen.getByTestId('home-today-complete'));
  expect(onMarkDone).toHaveBeenCalledTimes(1);
  expect(onOpenDetail).not.toHaveBeenCalled();
});

test.each([['staleDate'], ['variantStale']])('the entry refuses while %s is true', (flag) => {
  const onOpenDetail = jest.fn();
  const screen = renderCard({ onOpenDetail, [flag]: true });
  const entry = screen.getByTestId('home-today-open-detail');

  expect(entry.props.accessibilityState).toEqual({ disabled: true });
  fireEvent.press(entry);
  expect(onOpenDetail).not.toHaveBeenCalled();
});
