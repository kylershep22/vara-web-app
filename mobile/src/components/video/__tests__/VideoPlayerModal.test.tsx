// Mocks must be declared before importing the component under test.

const mockPlayer = {
  status: 'readyToPlay' as string,
  playing: false,
  duration: 120,
  currentTime: 0,
  timeUpdateEventInterval: 0,
  play: jest.fn(),
  pause: jest.fn(),
};

const mockEnterFullscreen = jest.fn();

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: (_source: unknown, setup?: (p: unknown) => void) => {
      setup?.(mockPlayer);
      return mockPlayer;
    },
    VideoView: React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({
        enterFullscreen: mockEnterFullscreen,
        exitFullscreen: jest.fn(),
      }));
      return React.createElement(View, props);
    }),
  };
});

// useEvent returns its initial value; the component reads live player state
// directly, so that is sufficient for these assertions.
jest.mock('expo', () => ({
  useEvent: (_obj: unknown, _name: string, initial: unknown) => initial,
}));

jest.mock('@react-native-community/slider', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    React.createElement(View, { ...props, ref })
  );
});

// The real SafeAreaProvider withholds children until it has measured natively,
// which never happens under jest. Mock it, and expose non-zero initial metrics
// so the "header is inset on the first frame" assertion is meaningful.
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(View, { ...props, testID: 'safe-area-provider' }, children),
    SafeAreaView: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(View, props, children),
    useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 390, height: 844 },
      insets: { top: 47, bottom: 34, left: 0, right: 0 },
    },
  };
});

const mockUseVideoSource = jest.fn();
jest.mock('../../../hooks/useVideoSource', () => ({
  useVideoSource: (path: string | null) => mockUseVideoSource(path),
}));

jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReduceMotion(),
}));
const mockReduceMotion = jest.fn(() => false);

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import { VideoPlayerModal, formatTime, spokenTime } from '../VideoPlayerModal';

const READY = {
  url: 'https://example/clip.mp4',
  loading: false,
  error: null,
  retry: jest.fn(),
};

describe('VideoPlayerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReduceMotion.mockReturnValue(false);
    mockUseVideoSource.mockReturnValue(READY);
    mockPlayer.status = 'readyToPlay';
    mockPlayer.playing = false;
    mockPlayer.duration = 120;
    mockPlayer.currentTime = 0;
  });

  it('resolves the storage path it is given and nothing hard-coded', () => {
    render(
      <VideoPlayerModal
        visible
        storagePath="focus-video/anything-at-all.mp4"
        onClose={jest.fn()}
      />
    );
    expect(mockUseVideoSource).toHaveBeenCalledWith('focus-video/anything-at-all.mp4');
  });

  it('does not resolve a path while hidden', () => {
    render(
      <VideoPlayerModal
        visible={false}
        storagePath="focus-video/a.mp4"
        onClose={jest.fn()}
      />
    );
    expect(mockUseVideoSource).toHaveBeenCalledWith(null);
  });

  it('autoplays once the URL resolves — no tap required', () => {
    render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(mockPlayer.play).toHaveBeenCalled();
  });

  it('sets the time-update interval during the same setup pass', () => {
    render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(mockPlayer.timeUpdateEventInterval).toBe(0.25);
  });

  it('renders the video surface once a URL resolves', () => {
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByTestId('video-player-view')).toBeTruthy();
  });

  it('shows a calm loading state while the URL resolves', () => {
    mockUseVideoSource.mockReturnValue({ ...READY, url: null, loading: true });
    const { getByTestId, queryByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByTestId('video-player-loading')).toBeTruthy();
    expect(queryByTestId('video-player-error')).toBeNull();
  });

  it('shows an error state with a retry when resolution fails', () => {
    const retry = jest.fn();
    mockUseVideoSource.mockReturnValue({
      url: null,
      loading: false,
      error: "Couldn't load this video.",
      retry,
    });
    const { getByTestId, getByText } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByText("Couldn't load this video.")).toBeTruthy();
    fireEvent.press(getByTestId('video-player-retry'));
    expect(retry).toHaveBeenCalled();
  });

  it('surfaces a playback error even when the URL resolved fine', () => {
    mockPlayer.status = 'error';
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByTestId('video-player-error')).toBeTruthy();
  });

  it('toggles play and pause', () => {
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    fireEvent.press(getByTestId('video-player-playpause'));
    expect(mockPlayer.play).toHaveBeenCalled();

    mockPlayer.playing = true;
    fireEvent.press(getByTestId('video-player-playpause'));
    expect(mockPlayer.pause).toHaveBeenCalled();
  });

  it('seeks the player when a scrub gesture completes', () => {
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    fireEvent(getByTestId('video-player-scrubber'), 'onSlidingComplete', 42);
    expect(mockPlayer.currentTime).toBe(42);
  });

  it('has no fullscreen control — it trapped users and was removed', () => {
    const { queryByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(queryByTestId('video-player-fullscreen')).toBeNull();
  });

  it('disables every path out of the modal that could strand playback', () => {
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    const view = getByTestId('video-player-view');
    expect(view.props.fullscreenOptions).toEqual({ enable: false });
    expect(view.props.allowsPictureInPicture).toBe(false);
    expect(mockEnterFullscreen).not.toHaveBeenCalled();
  });

  it('closes from the close control', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={onClose} />
    );
    fireEvent.press(getByTestId('video-player-close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on hardware back (onRequestClose)', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={onClose} />
    );
    fireEvent(getByTestId('video-player-modal'), 'requestClose');
    expect(onClose).toHaveBeenCalled();
  });

  it('gives play/pause and close real accessibility labels', () => {
    const { getByTestId, rerender } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByTestId('video-player-playpause').props.accessibilityLabel).toBe('Play video');
    expect(getByTestId('video-player-close').props.accessibilityLabel).toBe('Close video');

    mockPlayer.playing = true;
    rerender(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByTestId('video-player-playpause').props.accessibilityLabel).toBe('Pause video');
  });

  it('exposes the scrubber to assistive tech with a spoken position', () => {
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    const scrubber = getByTestId('video-player-scrubber');
    expect(scrubber.props.accessibilityLabel).toBe('Video position');
    expect(scrubber.props.accessibilityValue).toEqual({
      min: 0,
      max: 120,
      now: 0,
      text: '0 seconds of 2 minutes',
    });
  });

  it('nests its own SafeAreaProvider so the header clears the camera cutout', () => {
    // A React Native Modal is outside the app-root provider's measured tree, so
    // without this the top inset reads zero and the title sits under the notch.
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" title="Test" onClose={jest.fn()} />
    );
    const provider = getByTestId('safe-area-provider');
    expect(provider).toBeTruthy();
    // Seeded from window metrics so the first frame is already inset.
    expect(provider.props.initialMetrics?.insets?.top).toBe(47);
  });

  it('cross-fades instead of sliding under Reduce Motion', () => {
    mockReduceMotion.mockReturnValue(true);
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByTestId('video-player-modal').props.animationType).toBe('fade');
  });

  it('slides when Reduce Motion is off', () => {
    const { getByTestId } = render(
      <VideoPlayerModal visible storagePath="focus-video/a.mp4" onClose={jest.fn()} />
    );
    expect(getByTestId('video-player-modal').props.animationType).toBe('slide');
  });
});

describe('time formatting', () => {
  it.each([
    [0, '0:00'],
    [5, '0:05'],
    [65, '1:05'],
    [600, '10:00'],
    [3661, '1:01:01'],
    [NaN, '0:00'],
    [-4, '0:00'],
  ])('formatTime(%p) -> %p', (input, expected) => {
    expect(formatTime(input as number)).toBe(expected);
  });

  it.each([
    [0, '0 seconds'],
    [1, '1 second'],
    [60, '1 minute'],
    [65, '1 minute 5 seconds'],
    [120, '2 minutes'],
  ])('spokenTime(%p) -> %p', (input, expected) => {
    expect(spokenTime(input as number)).toBe(expected);
  });
});
