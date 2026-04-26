import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

// Mocks must precede the component import.

jest.mock('../../../services/audio/protocolAudioLoader', () => ({
  loadProtocolAudio: jest.fn(),
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {},
  },
}));

import { AudioStepView } from '../AudioStepView';
import { loadProtocolAudio } from '../../../services/audio/protocolAudioLoader';
import type { AudioStep } from '../../../types/models';
import type { AVPlaybackStatus } from 'expo-av';

const mockLoadProtocolAudio = loadProtocolAudio as jest.MockedFunction<
  typeof loadProtocolAudio
>;

// Builds a fake Sound with jest mocks for every method we touch and a
// captured reference to the onPlaybackStatusUpdate callback so tests
// can simulate playback events directly.
function buildFakeSound() {
  const handle = {
    handler: null as null | ((status: AVPlaybackStatus) => void),
  };
  const sound = {
    playAsync: jest.fn().mockResolvedValue(undefined),
    pauseAsync: jest.fn().mockResolvedValue(undefined),
    setPositionAsync: jest.fn().mockResolvedValue(undefined),
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    setOnPlaybackStatusUpdate: jest.fn(
      (cb: ((status: AVPlaybackStatus) => void) | null) => {
        handle.handler = cb;
      }
    ),
  };
  return { sound, handle };
}

const sampleStep: AudioStep = {
  kind: 'audio',
  id: 'guided',
  durationSeconds: 600,
  audioPath: 'nsdr/nsdr_10min_v1.mp3',
};

beforeEach(() => {
  mockLoadProtocolAudio.mockReset();
});

describe('AudioStepView', () => {
  describe('load lifecycle', () => {
    it('shows loading state before the Sound resolves', async () => {
      // Resolve the load on demand so we can observe the loading state.
      let resolveLoad: ((s: unknown) => void) | undefined;
      mockLoadProtocolAudio.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLoad = resolve as typeof resolveLoad;
          })
      );

      const { getByTestId, queryByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          onComplete={jest.fn()}
        />
      );

      expect(getByTestId('audio-step-loading')).toBeTruthy();

      // Now resolve the load.
      const { sound } = buildFakeSound();
      await act(async () => {
        resolveLoad?.(sound);
      });

      await waitFor(() => {
        expect(queryByTestId('audio-step-loading')).toBeNull();
        expect(queryByTestId('audio-step-ready')).not.toBeNull();
      });
    });

    it('shows error state and fires onError when load fails', async () => {
      const loadError = new Error('Couldn’t load protocol audio.');
      mockLoadProtocolAudio.mockRejectedValueOnce(loadError);
      const onError = jest.fn();

      const { findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          onComplete={jest.fn()}
          onError={onError}
        />
      );

      await findByTestId('audio-step-error');
      expect(onError).toHaveBeenCalledWith(loadError);
    });

    it('unloads the Sound when the component unmounts', async () => {
      const { sound } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);

      const { unmount, findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          onComplete={jest.fn()}
        />
      );
      await findByTestId('audio-step-ready');

      unmount();
      expect(sound.unloadAsync).toHaveBeenCalled();
    });
  });

  describe('play / pause based on isActive', () => {
    it('calls playAsync when isActive=true after load', async () => {
      const { sound } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);

      const { rerender, findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          onComplete={jest.fn()}
        />
      );
      await findByTestId('audio-step-ready');

      expect(sound.playAsync).not.toHaveBeenCalled();

      rerender(
        <AudioStepView
          step={sampleStep}
          isActive={true}
          onComplete={jest.fn()}
        />
      );
      await waitFor(() => {
        expect(sound.playAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('calls pauseAsync when isActive flips to false', async () => {
      const { sound } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);

      const { rerender, findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={true}
          onComplete={jest.fn()}
        />
      );
      await findByTestId('audio-step-ready');
      await waitFor(() => {
        expect(sound.playAsync).toHaveBeenCalled();
      });

      rerender(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          onComplete={jest.fn()}
        />
      );
      await waitFor(() => {
        expect(sound.pauseAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('back-15s', () => {
    it('does nothing on initial render even if skipBackSignal is set', async () => {
      const { sound } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);

      const { findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          skipBackSignal={5}
          onComplete={jest.fn()}
        />
      );
      await findByTestId('audio-step-ready');
      expect(sound.setPositionAsync).not.toHaveBeenCalled();
    });

    it('seeks back 15 seconds when skipBackSignal increments', async () => {
      const { sound, handle } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);

      const { rerender, findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          skipBackSignal={0}
          onComplete={jest.fn()}
        />
      );
      await findByTestId('audio-step-ready');

      // Simulate playback reaching 30s in.
      await act(async () => {
        handle.handler?.({
          isLoaded: true,
          positionMillis: 30_000,
          durationMillis: 600_000,
          didJustFinish: false,
        } as AVPlaybackStatus);
      });

      rerender(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          skipBackSignal={1}
          onComplete={jest.fn()}
        />
      );
      await waitFor(() => {
        expect(sound.setPositionAsync).toHaveBeenCalledWith(15_000);
      });
    });

    it('clamps the back-skip to zero (no negative position)', async () => {
      const { sound, handle } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);

      const { rerender, findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          skipBackSignal={0}
          onComplete={jest.fn()}
        />
      );
      await findByTestId('audio-step-ready');

      // Position is at 5s — back-15s should clamp to 0.
      await act(async () => {
        handle.handler?.({
          isLoaded: true,
          positionMillis: 5_000,
          durationMillis: 600_000,
          didJustFinish: false,
        } as AVPlaybackStatus);
      });

      rerender(
        <AudioStepView
          step={sampleStep}
          isActive={false}
          skipBackSignal={1}
          onComplete={jest.fn()}
        />
      );
      await waitFor(() => {
        expect(sound.setPositionAsync).toHaveBeenCalledWith(0);
      });
    });
  });

  describe('completion and errors', () => {
    it('fires onComplete exactly once when status.didJustFinish=true', async () => {
      const { sound, handle } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);
      const onComplete = jest.fn();

      const { findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={true}
          onComplete={onComplete}
        />
      );
      await findByTestId('audio-step-ready');

      await act(async () => {
        handle.handler?.({
          isLoaded: true,
          positionMillis: 600_000,
          durationMillis: 600_000,
          didJustFinish: true,
        } as AVPlaybackStatus);
      });
      // Repeat fire — the guard should prevent a second call.
      await act(async () => {
        handle.handler?.({
          isLoaded: true,
          positionMillis: 600_000,
          durationMillis: 600_000,
          didJustFinish: true,
        } as AVPlaybackStatus);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('fires onError when status reports a runtime error after load', async () => {
      const { sound, handle } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);
      const onError = jest.fn();

      const { findByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={true}
          onComplete={jest.fn()}
          onError={onError}
        />
      );
      await findByTestId('audio-step-ready');

      await act(async () => {
        handle.handler?.({
          isLoaded: false,
          error: 'codec failure',
        } as unknown as AVPlaybackStatus);
      });

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
      expect((onError.mock.calls[0][0] as Error).message).toBe(
        'codec failure'
      );
    });

    it('updates the position display from playback status', async () => {
      const { sound, handle } = buildFakeSound();
      mockLoadProtocolAudio.mockResolvedValueOnce(sound as unknown as Awaited<ReturnType<typeof loadProtocolAudio>>);

      const { findByTestId, getByTestId } = render(
        <AudioStepView
          step={sampleStep}
          isActive={true}
          onComplete={jest.fn()}
        />
      );
      await findByTestId('audio-step-ready');

      await act(async () => {
        handle.handler?.({
          isLoaded: true,
          positionMillis: 90_000,
          durationMillis: 600_000,
          didJustFinish: false,
        } as AVPlaybackStatus);
      });

      expect(getByTestId('audio-step-position').props.children).toBe(
        '1:30 / 10:00'
      );
    });
  });
});
