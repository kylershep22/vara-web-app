// Mock the marker module at the boundary so tests can drive
// firstShiftAt + marker state independently. The marker module's own
// behavior (AsyncStorage round-trip, error swallowing) is covered in
// firstShiftFooterMarker.test.ts.

const mockReadMarker = jest.fn();
const mockWriteMarker = jest.fn();

jest.mock('../../../utils/firstShiftFooterMarker', () => ({
  readMarker: (userId: string) => mockReadMarker(userId),
  writeMarker: (userId: string, ts: number) => mockWriteMarker(userId, ts),
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import type { Timestamp } from 'firebase/firestore';

import { FirstShiftFooter } from '../FirstShiftFooter';

// Stand-in for a Firestore Timestamp. The component only does a
// truthy check (`== null`); it never reads Timestamp methods.
const FAKE_TIMESTAMP = { seconds: 1700000000, nanoseconds: 0 } as unknown as Timestamp;

const TEST_USER_ID = 'user-abc-123';

beforeEach(() => {
  mockReadMarker.mockReset();
  mockWriteMarker.mockReset();
  mockWriteMarker.mockResolvedValue(undefined);
});

describe('FirstShiftFooter — render gating', () => {
  it('does NOT render when firstShiftAt is null (user has not shifted yet)', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { queryByTestId } = render(
      <FirstShiftFooter firstShiftAt={null} userId={TEST_USER_ID} />
    );
    // The marker should never even be read for a null firstShiftAt —
    // we short-circuit before the async branch.
    await waitFor(() => {
      expect(mockReadMarker).not.toHaveBeenCalled();
    });
    expect(queryByTestId('first-shift-footer')).toBeNull();
  });

  it('does NOT render when firstShiftAt is undefined (legacy profile docs without the field)', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { queryByTestId } = render(
      <FirstShiftFooter firstShiftAt={undefined} userId={TEST_USER_ID} />
    );
    await waitFor(() => {
      expect(mockReadMarker).not.toHaveBeenCalled();
    });
    expect(queryByTestId('first-shift-footer')).toBeNull();
  });

  it('does NOT render when firstShiftAt is set BUT the marker already exists (already shown)', async () => {
    mockReadMarker.mockResolvedValue(1_700_000_000_000);
    const { queryByTestId } = render(
      <FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />
    );
    // Marker is read; render decision is "no" because marker is non-
    // null. Marker write does NOT fire (already written).
    await waitFor(() => {
      expect(mockReadMarker).toHaveBeenCalledTimes(1);
    });
    expect(queryByTestId('first-shift-footer')).toBeNull();
    expect(mockWriteMarker).not.toHaveBeenCalled();
  });

  it('renders when firstShiftAt is set AND the marker is null', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { findByTestId } = render(
      <FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />
    );
    expect(await findByTestId('first-shift-footer')).toBeTruthy();
  });
});

describe('FirstShiftFooter — marker write contract', () => {
  it('writes the marker exactly once on the render where the footer first appears', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { findByTestId } = render(
      <FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />
    );

    // Wait for the footer to appear — the marker write fires inside
    // the same useEffect that flips visible to true.
    expect(await findByTestId('first-shift-footer')).toBeTruthy();

    await waitFor(() => {
      expect(mockWriteMarker).toHaveBeenCalledTimes(1);
    });
    // Round 8: writeMarker signature is (userId, timestampMs).
    // Argument 0 is userId, argument 1 is the timestamp. Assert
    // both — userId scoping is the load-bearing fix for the marker
    // leak across users.
    const userIdArg = mockWriteMarker.mock.calls[0][0];
    const ts = mockWriteMarker.mock.calls[0][1];
    expect(userIdArg).toBe(TEST_USER_ID);
    expect(typeof ts).toBe('number');
    expect(ts).toBeGreaterThan(0);
  });

  it('does not write the marker on a re-render with the same firstShiftAt prop', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { findByTestId, rerender } = render(
      <FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />
    );

    expect(await findByTestId('first-shift-footer')).toBeTruthy();
    await waitFor(() => {
      expect(mockWriteMarker).toHaveBeenCalledTimes(1);
    });

    // Re-render with the same prop reference. useEffect deps don't
    // change → effect doesn't re-run → marker is not re-written.
    rerender(<FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />);

    // Give the microtask queue a chance to flush in case of a stray
    // async call.
    await waitFor(() => {
      expect(mockWriteMarker).toHaveBeenCalledTimes(1);
    });
  });
});

describe('FirstShiftFooter — render content', () => {
  // These render even if the marker mock isn't set explicitly —
  // beforeEach resets it, but for these we control read explicitly.

  it('renders the locked spec copy verbatim', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { findByTestId } = render(
      <FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />
    );
    const text = await findByTestId('first-shift-footer-text');
    // Copy is from Core Loop v2 line 238 — exact match. Drift catches
    // would surface in this assertion.
    expect(text.props.children).toBe('Your first shift is logged in Patterns');
  });

  it('exposes a screen-reader-friendly accessibility label', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { findByTestId } = render(
      <FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />
    );
    const text = await findByTestId('first-shift-footer-text');
    expect(text.props.accessibilityLabel).toBe(
      'Your first shift is logged in Patterns. View your patterns over time.'
    );
  });

  it('contains no celebration language or punctuation (Build Guide §4 calm-over-stimulation)', async () => {
    mockReadMarker.mockResolvedValue(null);
    const { findByTestId } = render(
      <FirstShiftFooter firstShiftAt={FAKE_TIMESTAMP} userId={TEST_USER_ID} />
    );
    const text = await findByTestId('first-shift-footer-text');
    const copy = String(text.props.children);
    // No exclamation marks (calm tone).
    expect(copy).not.toMatch(/!/);
    // No celebration vocabulary that would creep in via a "small
    // improvement" PR.
    expect(copy).not.toMatch(/congrat|amazing|awesome|nice job|way to go/i);
  });
});
