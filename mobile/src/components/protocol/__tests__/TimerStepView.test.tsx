import React from 'react';
import { act, render } from '@testing-library/react-native';
import { TimerStepView } from '../TimerStepView';
import type { TimerStep } from '../../../types/models';

const fiveMinStep: TimerStep = {
  kind: 'timer',
  id: 'move',
  durationSeconds: 300,
  label: 'Move your body',
  hint: 'Walking, light cardio, or a flow.',
};

const fortyFiveSecStep: TimerStep = {
  kind: 'timer',
  id: 'short',
  durationSeconds: 45,
  label: 'Short timer',
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('TimerStepView', () => {
  it('renders label, hint, and countdown', () => {
    const { getByTestId, queryByTestId } = render(
      <TimerStepView
        step={fiveMinStep}
        isActive={true}
        onComplete={jest.fn()}
      />
    );
    expect(getByTestId('timer-step-label').props.children).toBe(
      'Move your body'
    );
    expect(getByTestId('timer-step-hint').props.children).toBe(
      fiveMinStep.hint
    );
    expect(getByTestId('timer-step-countdown').props.children).toBe('5:00');
    expect(queryByTestId('timer-step-hint')).not.toBeNull();
  });

  it('omits the hint when none provided', () => {
    const { queryByTestId } = render(
      <TimerStepView
        step={fortyFiveSecStep}
        isActive={true}
        onComplete={jest.fn()}
      />
    );
    expect(queryByTestId('timer-step-hint')).toBeNull();
  });

  it('formats countdown under one minute as "Xs"', () => {
    const { getByTestId } = render(
      <TimerStepView
        step={fortyFiveSecStep}
        isActive={true}
        onComplete={jest.fn()}
      />
    );
    expect(getByTestId('timer-step-countdown').props.children).toBe('45s');
  });

  it('formats countdown over one minute as "M:SS"', () => {
    const { getByTestId } = render(
      <TimerStepView
        step={fiveMinStep}
        isActive={true}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    const value = getByTestId('timer-step-countdown').props.children;
    // ~4:00 remaining (allow a tick of slack).
    expect(value).toMatch(/^4:0[0-1]$/);
  });

  it('fires onComplete when durationSeconds elapses', () => {
    const onComplete = jest.fn();
    render(
      <TimerStepView
        step={fortyFiveSecStep}
        isActive={true}
        onComplete={onComplete}
      />
    );
    act(() => {
      jest.advanceTimersByTime(46_000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire onComplete and does not advance while paused', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(
      <TimerStepView
        step={fiveMinStep}
        isActive={false}
        onComplete={onComplete}
      />
    );
    act(() => {
      jest.advanceTimersByTime(120_000);
    });
    expect(onComplete).not.toHaveBeenCalled();
    expect(getByTestId('timer-step-countdown').props.children).toBe('5:00');
  });

  it('resumes from where it paused when isActive flips back to true', () => {
    const onComplete = jest.fn();
    const { rerender } = render(
      <TimerStepView
        step={fortyFiveSecStep}
        isActive={true}
        onComplete={onComplete}
      />
    );
    // 30s elapsed
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    rerender(
      <TimerStepView
        step={fortyFiveSecStep}
        isActive={false}
        onComplete={onComplete}
      />
    );
    // 60s of paused wall-clock — shouldn't matter
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    rerender(
      <TimerStepView
        step={fortyFiveSecStep}
        isActive={true}
        onComplete={onComplete}
      />
    );
    // ~15s more should complete it
    act(() => {
      jest.advanceTimersByTime(16_000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
