// Start here, the explainer row (slice 5c).
//
// THE GUARANTEE THIS FILE EXISTS FOR: the row is invisible unless there is a
// real video behind it. Slice 5c decision 1 makes a null path and a path that
// fails to resolve the same outcome, because the alternative — shipping a
// placeholder that resolves to nothing — puts VideoPlayerModal's coral error
// overlay in front of every user on the calmest surface in the app, blaming
// their connection for a file nobody has uploaded. Four of the tests below are
// that one rule seen from four directions.
//
// AsyncStorage IS FAKED, NOT THE MARKER MODULE. The persistence tests are the
// point of decision 5, so they run the real key-scoping code against an
// in-memory store. Mocking the marker at the boundary (the FirstShiftFooter
// convention) would have made "a second account sees the expanded row" a
// restatement of the mock rather than a property of the key.

const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: (key: string) =>
    Promise.resolve(mockStore.has(key) ? mockStore.get(key)! : null),
  setItem: (key: string, value: string) => {
    mockStore.set(key, value);
    return Promise.resolve();
  },
}));

// A stand-in path table, so the suite is not hostage to the shipped values.
// Both surfaces are null on main today; `today` stays null here on purpose so
// the no-video path is exercised through the real lookup rather than a prop.
jest.mock('../../../constants/startHere', () => ({
  START_HERE_PATHS: {
    practices: 'focus-video/test_explainer_v1.mp4',
    today: null,
  },
  START_HERE_LABEL: 'Start here',
}));

const mockUseVideoSource = jest.fn();
jest.mock('../../../hooks/useVideoSource', () => ({
  useVideoSource: (path: string | null) => mockUseVideoSource(path),
}));

// Captured rather than rendered for real: the assertions here are about what the
// container hands the player, and the real modal needs the whole expo-video
// harness to mount. Its own suite covers its behaviour.
const mockModalProps: Array<Record<string, unknown>> = [];
jest.mock('../../video/VideoPlayerModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VideoPlayerModal: (props: Record<string, unknown>) => {
      mockModalProps.push(props);
      return React.createElement(View, {
        testID: props.visible ? 'player-open' : 'player-closed',
      });
    },
  };
});

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { StartHereRow } from '../StartHereRow';
import { _startHereMarkerKeyFor } from '../../../utils/startHereCollapseMarker';

const USER_A = 'user-aaa-111';
const USER_B = 'user-bbb-222';

const GLOSS = 'A short video on how this works.';

/** What useVideoSource returns once a path has resolved. */
function resolved(url = 'https://example.test/clip.mp4') {
  return { url, loading: false, error: null, retry: jest.fn() };
}
/** Its shape while the resolution is still in flight. */
function resolving() {
  return { url: null, loading: true, error: null, retry: jest.fn() };
}
/** And after a failure, which is what a path to a missing object produces. */
function failed() {
  return {
    url: null,
    loading: false,
    error: "Couldn't load this video.",
    retry: jest.fn(),
  };
}

function renderRow(props: Partial<React.ComponentProps<typeof StartHereRow>> = {}) {
  return render(
    <StartHereRow surface="practices" userId={USER_A} gloss={GLOSS} {...props} />
  );
}

beforeEach(() => {
  mockStore.clear();
  mockModalProps.length = 0;
  mockUseVideoSource.mockReset();
  mockUseVideoSource.mockReturnValue(resolved());
});

describe('StartHereRow — no video means no row', () => {
  it('renders nothing, and asks for nothing, when the surface has no video', async () => {
    const { queryByTestId } = render(
      <StartHereRow surface="today" userId={USER_A} gloss={GLOSS} />
    );

    await waitFor(() => expect(mockUseVideoSource).toHaveBeenCalled());
    // The hook is handed the real null rather than a fabricated path, so no
    // Storage round trip is attempted for a video that does not exist.
    expect(mockUseVideoSource).toHaveBeenCalledWith(null);
    expect(queryByTestId('start-here-row')).toBeNull();
  });

  it('renders nothing while the video is still resolving', async () => {
    // THE NO-FLASH RULE. useVideoSource returns url null on its first render,
    // before its own effect runs, so "not resolved yet" and "resolved to
    // nothing" are indistinguishable from `loading`. Keying on `url` answers
    // both with nothing, which is correct for each.
    mockUseVideoSource.mockReturnValue(resolving());

    const { queryByTestId } = renderRow();

    await waitFor(() => expect(mockUseVideoSource).toHaveBeenCalled());
    expect(queryByTestId('start-here-row')).toBeNull();
  });

  it('renders nothing when the path fails to resolve', async () => {
    // A path naming an object that is not in the bucket. No row, no message,
    // no disabled affordance, and above all no coral: section 8 reserves it for
    // genuine errors, and a video nobody has uploaded is not the user's error.
    mockUseVideoSource.mockReturnValue(failed());

    const { queryByTestId, queryByText } = renderRow();

    await waitFor(() => expect(mockUseVideoSource).toHaveBeenCalled());
    expect(queryByTestId('start-here-row')).toBeNull();
    expect(queryByText(/couldn't load/i)).toBeNull();
  });

  it('renders nothing without an authenticated user', async () => {
    const { queryByTestId } = renderRow({ userId: null });

    await waitFor(() => expect(mockUseVideoSource).toHaveBeenCalled());
    expect(queryByTestId('start-here-row')).toBeNull();
  });

  it('never mounts the player when there is no row', async () => {
    // THE STRONGEST FORM OF "NEVER OPEN THE MODAL ON A NULL PATH": in this
    // branch the modal is not in the tree at all, so there is no guard to
    // forget. VideoPlayerModal with a null storagePath and visible true opens
    // onto an empty black screen with only the close button live
    // (VideoPlayerModal.tsx:274,309).
    mockUseVideoSource.mockReturnValue(failed());

    const { queryByTestId } = renderRow();

    await waitFor(() => expect(mockUseVideoSource).toHaveBeenCalled());
    expect(queryByTestId('player-closed')).toBeNull();
    expect(queryByTestId('player-open')).toBeNull();
    expect(mockModalProps).toHaveLength(0);
  });
});

describe('StartHereRow — with a video behind it', () => {
  it('renders the row once the video resolves', async () => {
    const { getByTestId, getByText } = renderRow();

    await waitFor(() => expect(getByTestId('start-here-row')).toBeTruthy());
    expect(getByText('Start here')).toBeTruthy();
  });

  it('shows the gloss to someone who has not opened it', async () => {
    const { getByTestId } = renderRow();

    await waitFor(() => expect(getByTestId('start-here-row-gloss')).toBeTruthy());
  });

  it('hands the player the storage path, never the resolved url and never null', async () => {
    // The modal resolves the path itself; resolveStorageUrl memoises by path, so
    // that second resolve is a cache hit rather than a second download.
    const { getByTestId } = renderRow();

    await waitFor(() => expect(getByTestId('start-here-row')).toBeTruthy());

    const last = mockModalProps[mockModalProps.length - 1];
    expect(last.storagePath).toBe('focus-video/test_explainer_v1.mp4');
    expect(last.title).toBe('Start here');
  });

  it('opens the player on one tap, with no expand step in between', async () => {
    // One action, not two. A first tap that only revealed a second tap would put
    // a step between the user and the thing the row offers.
    const { getByTestId } = renderRow();

    await waitFor(() => expect(getByTestId('start-here-row')).toBeTruthy());
    expect(getByTestId('player-closed')).toBeTruthy();

    fireEvent.press(getByTestId('start-here-row'));

    expect(getByTestId('player-open')).toBeTruthy();
  });

  it('shows no count, duration or framework word', async () => {
    const { getByTestId, queryByText } = renderRow();

    await waitFor(() => expect(getByTestId('start-here-row')).toBeTruthy());
    expect(queryByText(/\d/)).toBeNull();
    expect(queryByText(/remove|recover|rewire|refocus/i)).toBeNull();
  });
});

describe('StartHereRow — collapse', () => {
  it('collapses when the user opens it, and writes the marker', async () => {
    const { getByTestId, queryByTestId } = renderRow();

    await waitFor(() => expect(getByTestId('start-here-row-gloss')).toBeTruthy());

    fireEvent.press(getByTestId('start-here-row'));

    // Collapsed is the gloss going away, not the row going away.
    expect(queryByTestId('start-here-row-gloss')).toBeNull();
    expect(getByTestId('start-here-row')).toBeTruthy();

    await waitFor(() =>
      expect(mockStore.get(_startHereMarkerKeyFor('practices', USER_A))).toBeTruthy()
    );
  });

  it('stays collapsed across a remount', async () => {
    const first = renderRow();
    await waitFor(() =>
      expect(first.getByTestId('start-here-row-gloss')).toBeTruthy()
    );
    fireEvent.press(first.getByTestId('start-here-row'));
    await waitFor(() =>
      expect(mockStore.get(_startHereMarkerKeyFor('practices', USER_A))).toBeTruthy()
    );
    first.unmount();

    const second = renderRow();

    await waitFor(() => expect(second.getByTestId('start-here-row')).toBeTruthy());
    expect(second.queryByTestId('start-here-row-gloss')).toBeNull();
  });

  it('gives a second account on the same device its own expanded row', async () => {
    // The Round 8 defect, asserted rather than assumed. A device-global key
    // would silently hand user B the collapse user A earned.
    const first = renderRow({ userId: USER_A });
    await waitFor(() =>
      expect(first.getByTestId('start-here-row-gloss')).toBeTruthy()
    );
    fireEvent.press(first.getByTestId('start-here-row'));
    await waitFor(() =>
      expect(mockStore.get(_startHereMarkerKeyFor('practices', USER_A))).toBeTruthy()
    );
    first.unmount();

    const second = renderRow({ userId: USER_B });

    await waitFor(() =>
      expect(second.getByTestId('start-here-row-gloss')).toBeTruthy()
    );
    expect(mockStore.has(_startHereMarkerKeyFor('practices', USER_B))).toBe(false);
  });

  it('does not render the expanded row before the marker has been read', async () => {
    // The second of the two async gates. Rendering on the video alone would show
    // an expanded row that collapses a frame later, which looks like a defect.
    mockStore.set(_startHereMarkerKeyFor('practices', USER_A), '1700000000000');

    const { queryByTestId, getByTestId } = renderRow();

    // First commit: the video has resolved but the marker has not been read.
    expect(queryByTestId('start-here-row')).toBeNull();

    await waitFor(() => expect(getByTestId('start-here-row')).toBeTruthy());
    expect(queryByTestId('start-here-row-gloss')).toBeNull();
  });

  it('does not rewrite the marker on a later open', async () => {
    mockStore.set(_startHereMarkerKeyFor('practices', USER_A), '1700000000000');

    const { getByTestId } = renderRow();
    await waitFor(() => expect(getByTestId('start-here-row')).toBeTruthy());

    fireEvent.press(getByTestId('start-here-row'));

    expect(getByTestId('player-open')).toBeTruthy();
    // The first open is the one that collapses it; later opens are ordinary
    // playback and must not move the recorded timestamp.
    expect(mockStore.get(_startHereMarkerKeyFor('practices', USER_A))).toBe(
      '1700000000000'
    );
  });
});
