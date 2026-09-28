/**
 * ProtocolSheet: what the pin shows, and the three states its one control can
 * be in (slice 9.1b). Presentational, so every state arrives as a prop; the
 * rules that derive them are pinned in usePinnedProtocol.test.ts.
 */
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ProtocolSheet } from '../ProtocolSheet';
import { PROTOCOL_MATRIX } from '../../../protocolEngine';
import { COMPLETION_COPY } from '../TodayCompletion';
import { PROTOCOL_SHEET_COPY } from '../protocolSheet.copy';

const PROTOCOL = { ...PROTOCOL_MATRIX.remove.normal[0], quickWinActive: false };

function renderSheet(props: Record<string, unknown> = {}) {
  return render(
    <ProtocolSheet
      snapshot={{
        protocol: PROTOCOL,
        iso: '2026-08-10',
        completedAtOpen: false,
        consistentDays: 0,
      }}
      done={false}
      diverged={false}
      completable
      saveFailed={false}
      onMarkDone={jest.fn()}
      onDismiss={jest.fn()}
      {...props}
    />
  );
}

test("renders the protocol's name, daily action and why it can help", () => {
  const screen = renderSheet();
  expect(screen.getByText(PROTOCOL.name)).toBeTruthy();
  expect(screen.getByTestId('protocol-sheet-action').props.children).toBe(PROTOCOL.dailyAction);
  expect(screen.getByTestId('protocol-sheet-why').props.children).toBe(PROTOCOL.whyItWorks);
  expect(screen.getByText(PROTOCOL_SHEET_COPY.whyHeading)).toBeTruthy();
});

test('the one action is the card\'s own "Mark it done", and it completes', () => {
  const onMarkDone = jest.fn();
  const screen = renderSheet({ onMarkDone });
  const cta = screen.getByTestId('protocol-sheet-complete');
  expect(screen.getByText(COMPLETION_COPY.markDone)).toBeTruthy();
  fireEvent.press(cta);
  expect(onMarkDone).toHaveBeenCalledTimes(1);
});

test('there is no "Do it now"', () => {
  const screen = renderSheet();
  expect(screen.queryByText(/do it now/i)).toBeNull();
});

test('not completable: the control is held', () => {
  const onMarkDone = jest.fn();
  const screen = renderSheet({ completable: false, onMarkDone });
  const cta = screen.getByTestId('protocol-sheet-complete');
  expect(cta.props.accessibilityState).toEqual({ disabled: true });
  fireEvent.press(cta);
  expect(onMarkDone).not.toHaveBeenCalled();
});

test('diverged: the control is REPLACED by the explanation, and the content stays', () => {
  const screen = renderSheet({ diverged: true, completable: false });
  expect(screen.queryByTestId('protocol-sheet-complete')).toBeNull();
  expect(screen.getByTestId('protocol-sheet-diverged').props.children).toBe(
    PROTOCOL_SHEET_COPY.diverged
  );
  expect(screen.getByTestId('protocol-sheet-why')).toBeTruthy();
  expect(screen.getByTestId('protocol-sheet-dismiss')).toBeTruthy();
});

test("done: the card's acknowledgment, and no control", () => {
  const screen = renderSheet({ done: true, completable: false });
  expect(screen.queryByTestId('protocol-sheet-complete')).toBeNull();
  expect(screen.getByTestId('protocol-sheet-done')).toBeTruthy();
  expect(screen.getByText(PROTOCOL.acknowledgment as string)).toBeTruthy();
});

test('done wins over diverged: a finished day stays finished', () => {
  const screen = renderSheet({ done: true, diverged: true, completable: false });
  expect(screen.getByTestId('protocol-sheet-done')).toBeTruthy();
  expect(screen.queryByTestId('protocol-sheet-diverged')).toBeNull();
});

test('a failed write says so', () => {
  const screen = renderSheet({ saveFailed: true });
  expect(screen.getByTestId('protocol-sheet-error').props.children).toBe(
    COMPLETION_COPY.saveFailed
  );
});

test('the dismiss closes', () => {
  const onDismiss = jest.fn();
  const screen = renderSheet({ onDismiss });
  const dismiss = screen.getByTestId('protocol-sheet-dismiss');
  expect(dismiss.props.accessibilityLabel).toBe(PROTOCOL_SHEET_COPY.dismiss);
  fireEvent.press(dismiss);
  expect(onDismiss).toHaveBeenCalled();
});
