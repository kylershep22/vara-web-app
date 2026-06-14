// Mocks must precede the component import.

jest.mock('../../../utils/sessionMarker', () => ({
  readMarker: jest.fn(),
  writeMarker: jest.fn(() => Promise.resolve()),
  clearMarker: jest.fn(() => Promise.resolve()),
  isExpired: jest.fn(() => false),
  buildRecoveredSummary: jest.fn((marker: any) => ({
    protocolId: marker.protocolId,
    stateBefore: marker.stateBefore,
    completed: false,
    durationActualSeconds: 30,
    stepsCompleted: marker.stepsCompleted,
    totalSteps: marker.totalSteps,
    abandonReason: 'force_quit',
    startedAt: marker.startedAt,
    endedAt: marker.lastUpdatedAt,
  })),
}));

jest.mock('../../../services/audio/protocolAudioLoader', () => ({
  prefetchProtocolAudio: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    FadeIn: { duration: () => undefined },
  };
});

// Leaf component stubs. Each renders test-scoped buttons that fire
// the relevant callbacks; the player's behavior is exercised by
// pressing those.
jest.mock('../BreathPacer', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    BreathPacer: ({ onComplete }: any) => (
      <TouchableOpacity
        testID="mock-breath-complete"
        onPress={() => onComplete()}
      >
        <Text>breath complete</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../AudioStepView', () => {
  const React = require('react');
  const { TouchableOpacity, Text, View } = require('react-native');
  let mountCount = 0;
  return {
    AudioStepView: ({ onComplete, onError }: any) => {
      mountCount += 1;
      return (
        <View testID={`mock-audio-mount-${mountCount}`}>
          <TouchableOpacity
            testID="mock-audio-fire-error"
            onPress={() => onError?.(new Error('mock audio error'))}
          >
            <Text>fire error</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="mock-audio-fire-complete"
            onPress={() => onComplete()}
          >
            <Text>fire complete</Text>
          </TouchableOpacity>
        </View>
      );
    },
    __resetMountCount: () => {
      mountCount = 0;
    },
  };
});

jest.mock('../InstructionStepView', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    InstructionStepView: ({ onComplete }: any) => (
      <TouchableOpacity
        testID="mock-instruction-complete"
        onPress={() => onComplete()}
      >
        <Text>instruction complete</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../TimerStepView', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    TimerStepView: ({ onComplete }: any) => (
      <TouchableOpacity
        testID="mock-timer-complete"
        onPress={() => onComplete()}
      >
        <Text>timer complete</Text>
      </TouchableOpacity>
    ),
  };
});

import React from 'react';
import {
  act,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react-native';
import { GuidedSessionPlayer } from '../GuidedSessionPlayer';
import {
  clearMarker,
  isExpired,
  readMarker,
} from '../../../utils/sessionMarker';
import { logger } from '../../../utils/logger';
import type {
  AudioStep,
  InstructionStep,
  Protocol,
  ProtocolSessionSummary,
} from '../../../types/models';

const mockReadMarker = readMarker as jest.MockedFunction<typeof readMarker>;
const mockClearMarker = clearMarker as jest.MockedFunction<typeof clearMarker>;
const mockIsExpired = isExpired as jest.MockedFunction<typeof isExpired>;

// ----- fixture builders -----

const instructionStep: InstructionStep = {
  kind: 'instruction',
  id: 'step',
  durationSeconds: 30,
  text: 'Five things you can see right now.',
};

const audioStep: AudioStep = {
  kind: 'audio',
  id: 'guided',
  durationSeconds: 600,
  audioPath: 'nsdr/nsdr_10min_v1.mp3',
};

function makeProtocol(steps: any[]): Protocol {
  return {
    id: 'test-protocol',
    pillar: 'energy',
    regulationDirection: 'settle',
    family: 'cyclic-sighing',
    name: 'Test Protocol',
    description: 'd',
    whatItIs: 'w',
    whatYoullNeed: 'wn',
    howItWorks: 'h',
    whenItFits: 'f',
    firstTimeOrientation: {
      whatYoullDo: 'do',
      whatYoullNeed: 'need',
      whyItWorks: 'why',
    },
    evidenceTier: 1,
    durationSeconds: steps.reduce(
      (acc, s) => acc + s.durationSeconds,
      0
    ),
    timeWindow: 2,
    modality: 'sensory',
    suitableForStates: ['wired'],
    suitableForTimesOfDay: [],
    steps,
  };
}

const singleInstruction = makeProtocol([instructionStep]);
const singleAudio = makeProtocol([audioStep]);

// ----- helpers -----

let warnSpy: jest.SpyInstance;

beforeEach(() => {
  mockReadMarker.mockReset();
  mockClearMarker.mockReset();
  mockClearMarker.mockResolvedValue(undefined);
  mockIsExpired.mockReset();
  mockIsExpired.mockReturnValue(false);
  warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

// ----- recovery tests -----

describe('GuidedSessionPlayer — recovery flow', () => {
  it('does not call onRecoveredSession when no marker exists', async () => {
    mockReadMarker.mockResolvedValue(null);
    const onRecoveredSession = jest.fn().mockResolvedValue(undefined);

    render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={jest.fn()}
        onRecoveredSession={onRecoveredSession}
      />
    );

    await waitFor(() => {
      expect(mockReadMarker).toHaveBeenCalled();
    });
    expect(onRecoveredSession).not.toHaveBeenCalled();
    expect(mockClearMarker).not.toHaveBeenCalled();
  });

  it('does not call onRecoveredSession or clear marker when no handler provided', async () => {
    mockReadMarker.mockResolvedValue({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      startedAt: 100,
      lastUpdatedAt: 200,
      currentStepIndex: 0,
      stepsCompleted: 0,
      totalSteps: 1,
    });

    render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={jest.fn()}
      />
    );

    // Wait long enough for any async to flush.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockClearMarker).not.toHaveBeenCalled();
  });

  it('discards an expired marker without calling onRecoveredSession', async () => {
    mockReadMarker.mockResolvedValue({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      startedAt: 100,
      lastUpdatedAt: 200,
      currentStepIndex: 0,
      stepsCompleted: 0,
      totalSteps: 1,
    });
    mockIsExpired.mockReturnValue(true);
    const onRecoveredSession = jest.fn().mockResolvedValue(undefined);

    render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={jest.fn()}
        onRecoveredSession={onRecoveredSession}
      />
    );

    await waitFor(() => {
      expect(mockClearMarker).toHaveBeenCalled();
    });
    expect(onRecoveredSession).not.toHaveBeenCalled();
  });

  it('happy path: marker exists, parent resolves, marker cleared', async () => {
    mockReadMarker.mockResolvedValue({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      startedAt: 100,
      lastUpdatedAt: 200,
      currentStepIndex: 0,
      stepsCompleted: 0,
      totalSteps: 1,
    });
    const onRecoveredSession = jest.fn().mockResolvedValue(undefined);

    render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={jest.fn()}
        onRecoveredSession={onRecoveredSession}
      />
    );

    await waitFor(() => {
      expect(onRecoveredSession).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(mockClearMarker).toHaveBeenCalled();
    });
  });

  it('preserves marker when parent rejects', async () => {
    mockReadMarker.mockResolvedValue({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      startedAt: 100,
      lastUpdatedAt: 200,
      currentStepIndex: 0,
      stepsCompleted: 0,
      totalSteps: 1,
    });
    const handlerError = new Error('parent failed');
    const onRecoveredSession = jest.fn().mockRejectedValue(handlerError);

    render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={jest.fn()}
        onRecoveredSession={onRecoveredSession}
      />
    );

    await waitFor(() => {
      expect(onRecoveredSession).toHaveBeenCalledTimes(1);
    });
    // Marker should NOT be cleared after a rejection.
    expect(mockClearMarker).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('rejected or timed out'),
        expect.any(Error)
      );
    });
  });

  it('treats a hanging handler as rejected after the 30s timeout', async () => {
    jest.useFakeTimers();
    try {
      mockReadMarker.mockResolvedValue({
        protocolId: 'cyclic-sighing-2',
        stateBefore: 'wired',
        startedAt: 100,
        lastUpdatedAt: 200,
        currentStepIndex: 0,
        stepsCompleted: 0,
        totalSteps: 1,
      });
      // Promise that never resolves on its own.
      const onRecoveredSession = jest.fn(
        () => new Promise<void>(() => undefined)
      );

      render(
        <GuidedSessionPlayer
          protocol={singleInstruction}
          stateBefore="wired"
          onExit={jest.fn()}
          onRecoveredSession={onRecoveredSession}
        />
      );

      // Let readMarker microtask resolve.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(onRecoveredSession).toHaveBeenCalledTimes(1);
      expect(warnSpy).not.toHaveBeenCalled();

      // Advance past the 30-second timeout.
      await act(async () => {
        jest.advanceTimersByTime(30_001);
      });

      await waitFor(() => {
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining('rejected or timed out'),
          expect.any(Error)
        );
      });
      expect(mockClearMarker).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('fires onRecoveredSession exactly once even if parent passes a non-memoized handler', async () => {
    mockReadMarker.mockResolvedValue({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      startedAt: 100,
      lastUpdatedAt: 200,
      currentStepIndex: 0,
      stepsCompleted: 0,
      totalSteps: 1,
    });
    const handler = jest.fn().mockResolvedValue(undefined);

    const Wrapper: React.FC<{ counter: number }> = ({ counter }) => (
      // New arrow each render — forces ref update without re-running
      // the mount effect.
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={jest.fn()}
        onRecoveredSession={(s) => handler(s, counter)}
      />
    );

    const { rerender } = render(<Wrapper counter={1} />);
    rerender(<Wrapper counter={2} />);
    rerender(<Wrapper counter={3} />);

    await waitFor(() => {
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

// ----- exit reason tests -----

describe('GuidedSessionPlayer — exit reasons', () => {
  beforeEach(() => {
    mockReadMarker.mockResolvedValue(null);
  });

  it('header X confirm dispatches END_EARLY with reason=user_exit', async () => {
    const onExit = jest.fn<void, [ProtocolSessionSummary]>();
    const { getByTestId } = render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={onExit}
        onRecoveredSession={jest.fn().mockResolvedValue(undefined)}
      />
    );
    // Start the session.
    fireEvent.press(getByTestId('player-idle-start'));
    // Header X opens modal.
    fireEvent.press(getByTestId('player-header-close'));
    fireEvent.press(getByTestId('end-early-modal-confirm'));

    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1);
    });
    expect(onExit.mock.calls[0][0].abandonReason).toBe('user_exit');
    expect(onExit.mock.calls[0][0].completed).toBe(false);
  });

  it('header X confirm uses user_exit even in audio-error state (per design)', async () => {
    const onExit = jest.fn<void, [ProtocolSessionSummary]>();
    const { getByTestId } = render(
      <GuidedSessionPlayer
        protocol={singleAudio}
        stateBefore="foggy"
        onExit={onExit}
        onRecoveredSession={jest.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.press(getByTestId('player-idle-start'));
    // Trigger audio error from the mocked AudioStepView.
    fireEvent.press(getByTestId('mock-audio-fire-error'));
    // Header X confirm even after audio error → still user_exit.
    fireEvent.press(getByTestId('player-header-close'));
    fireEvent.press(getByTestId('end-early-modal-confirm'));

    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1);
    });
    expect(onExit.mock.calls[0][0].abandonReason).toBe('user_exit');
  });

  it('transport End early in normal state dispatches with reason=user_exit', async () => {
    const onExit = jest.fn<void, [ProtocolSessionSummary]>();
    const { getByTestId } = render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={onExit}
        onRecoveredSession={jest.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.press(getByTestId('player-idle-start'));
    fireEvent.press(getByTestId('player-transport-end-early'));
    fireEvent.press(getByTestId('end-early-modal-confirm'));

    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1);
    });
    expect(onExit.mock.calls[0][0].abandonReason).toBe('user_exit');
  });

  it('transport End early in audio-error state dispatches with reason=audio_error', async () => {
    const onExit = jest.fn<void, [ProtocolSessionSummary]>();
    const { getByTestId } = render(
      <GuidedSessionPlayer
        protocol={singleAudio}
        stateBefore="foggy"
        onExit={onExit}
        onRecoveredSession={jest.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.press(getByTestId('player-idle-start'));
    fireEvent.press(getByTestId('mock-audio-fire-error'));
    // Transport now shows Try again + End early in error variant.
    fireEvent.press(getByTestId('player-transport-end-early'));
    fireEvent.press(getByTestId('end-early-modal-confirm'));

    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1);
    });
    expect(onExit.mock.calls[0][0].abandonReason).toBe('audio_error');
  });

  it('onExit fires exactly once on natural completion', async () => {
    const onExit = jest.fn<void, [ProtocolSessionSummary]>();
    const { getByTestId } = render(
      <GuidedSessionPlayer
        protocol={singleInstruction}
        stateBefore="wired"
        onExit={onExit}
        onRecoveredSession={jest.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.press(getByTestId('player-idle-start'));
    // Trigger the leaf's completion.
    fireEvent.press(getByTestId('mock-instruction-complete'));

    await waitFor(() => {
      expect(onExit).toHaveBeenCalledTimes(1);
    });
    expect(onExit.mock.calls[0][0].completed).toBe(true);
    expect(onExit.mock.calls[0][0].abandonReason).toBeNull();
  });
});

// ----- audio error transport rendering -----

describe('GuidedSessionPlayer — audio error UX', () => {
  beforeEach(() => {
    mockReadMarker.mockResolvedValue(null);
  });

  it('shows Try again on audio error', async () => {
    const { getByTestId, queryByTestId } = render(
      <GuidedSessionPlayer
        protocol={singleAudio}
        stateBefore="foggy"
        onExit={jest.fn()}
        onRecoveredSession={jest.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.press(getByTestId('player-idle-start'));
    expect(queryByTestId('player-transport-try-again')).toBeNull();
    fireEvent.press(getByTestId('mock-audio-fire-error'));
    expect(getByTestId('player-transport-try-again')).toBeTruthy();
  });

  it('Try again restores the normal transport (clears error phase)', async () => {
    const { getByTestId, queryByTestId } = render(
      <GuidedSessionPlayer
        protocol={singleAudio}
        stateBefore="foggy"
        onExit={jest.fn()}
        onRecoveredSession={jest.fn().mockResolvedValue(undefined)}
      />
    );
    fireEvent.press(getByTestId('player-idle-start'));
    fireEvent.press(getByTestId('mock-audio-fire-error'));
    expect(getByTestId('player-transport-try-again')).toBeTruthy();
    fireEvent.press(getByTestId('player-transport-try-again'));
    expect(queryByTestId('player-transport-try-again')).toBeNull();
    // Pause/Resume comes back.
    expect(getByTestId('player-transport-pause-toggle')).toBeTruthy();
  });
});
