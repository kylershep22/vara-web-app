// Mocks must precede the component import.

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: unknown) => ({ value: val }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (val: unknown) => val,
    Easing: {
      inOut: (fn: unknown) => fn,
      ease: 'ease',
    },
  };
});

// Force useReducedMotion to return false so the schedule effect
// takes the animated branch (the reduce-motion branch sets up a
// 250ms interval which would obscure the pause assertion).
jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

import React from 'react';
import { act, render } from '@testing-library/react-native';
import { BreathPacer } from '../BreathPacer';
import type { BreathStep } from '../../../types/models';

const fastStep: BreathStep = {
  kind: 'breath',
  id: 'cycle',
  durationSeconds: 6,
  phases: [
    { kind: 'inhale', seconds: 1, label: 'Inhale' },
    { kind: 'exhale', seconds: 1, label: 'Exhale' },
  ],
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('BreathPacer — pause via isActive prop', () => {
  it('does NOT advance phases when isActive=false', () => {
    const onPhaseChange = jest.fn();
    const onComplete = jest.fn();

    render(
      <BreathPacer
        step={fastStep}
        isActive={false}
        onPhaseChange={onPhaseChange}
        onComplete={onComplete}
      />
    );

    // First phase fires synchronously on mount (running branch only),
    // so isActive=false means no onPhaseChange at all. Advance time
    // past several phase boundaries to confirm.
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onPhaseChange).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('advances phases normally when isActive=true (default)', () => {
    const onPhaseChange = jest.fn();
    const onComplete = jest.fn();

    render(
      <BreathPacer
        step={fastStep}
        onPhaseChange={onPhaseChange}
        onComplete={onComplete}
      />
    );

    // Mount fires the first phase callback synchronously.
    expect(onPhaseChange).toHaveBeenCalledTimes(1);

    // Each act() block advances one phase boundary AND flushes the
    // state update + new effect + new timer schedule. A single
    // advanceTimersByTime call wouldn't unfurl through the chain
    // because React state updates from setTimeout callbacks aren't
    // processed synchronously within fake-timer advancement.
    // fastStep has 6 phase entries (3 cycles × 2 phases), so 6
    // advances reach the final timeout that fires onComplete.
    for (let i = 0; i < 6; i++) {
      act(() => {
        jest.advanceTimersByTime(1_100);
      });
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('exposes the phase label as a polite live region with a phase accessibilityLabel', () => {
    const { getByTestId } = render(<BreathPacer step={fastStep} />);
    const label = getByTestId('breath-pacer-phase-label');
    expect(label.props.accessibilityLiveRegion).toBe('polite');
    expect(label.props.accessibilityLabel).toBe('Inhale');
  });

  it('flipping isActive false → true → false controls the schedule', () => {
    const onPhaseChange = jest.fn();
    const onComplete = jest.fn();

    const { rerender } = render(
      <BreathPacer
        step={fastStep}
        isActive={true}
        onPhaseChange={onPhaseChange}
        onComplete={onComplete}
      />
    );

    // First phase fired on mount.
    expect(onPhaseChange).toHaveBeenCalledTimes(1);

    // Advance to second phase boundary.
    act(() => {
      jest.advanceTimersByTime(1_100);
    });
    expect(onPhaseChange).toHaveBeenCalledTimes(2);

    // Pause.
    rerender(
      <BreathPacer
        step={fastStep}
        isActive={false}
        onPhaseChange={onPhaseChange}
        onComplete={onComplete}
      />
    );

    const callCountAtPause = onPhaseChange.mock.calls.length;

    // Long wall-clock during pause — no further phase advances.
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onPhaseChange).toHaveBeenCalledTimes(callCountAtPause);
    expect(onComplete).not.toHaveBeenCalled();

    // Resume — re-fires the current phase (current phase restarts
    // with full duration on resume, by design).
    rerender(
      <BreathPacer
        step={fastStep}
        isActive={true}
        onPhaseChange={onPhaseChange}
        onComplete={onComplete}
      />
    );
    expect(onPhaseChange).toHaveBeenCalledTimes(callCountAtPause + 1);
  });
});
