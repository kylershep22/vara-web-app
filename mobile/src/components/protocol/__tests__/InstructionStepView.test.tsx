import React from 'react';
import { act, render } from '@testing-library/react-native';
import { InstructionStepView } from '../InstructionStepView';
import type { InstructionStep } from '../../../types/models';

const sampleStep: InstructionStep = {
  kind: 'instruction',
  id: 'see',
  durationSeconds: 30,
  text: 'Five things you can see right now.',
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('InstructionStepView', () => {
  it('renders the prompt text and the initial countdown', () => {
    const { getByTestId } = render(
      <InstructionStepView
        step={sampleStep}
        isActive={true}
        onComplete={jest.fn()}
      />
    );
    expect(getByTestId('instruction-step-text').props.children).toBe(
      sampleStep.text
    );
    expect(getByTestId('instruction-step-countdown').props.children).toBe(
      '30s'
    );
  });

  it('countdown decreases as time passes while active', () => {
    const { getByTestId } = render(
      <InstructionStepView
        step={sampleStep}
        isActive={true}
        onComplete={jest.fn()}
      />
    );
    act(() => {
      jest.advanceTimersByTime(10_000);
    });
    const value = getByTestId('instruction-step-countdown').props.children;
    expect(value).not.toBe('30s');
    // Should be ~20s remaining.
    expect(value).toMatch(/^(19s|20s|21s)$/);
  });

  it('fires onComplete after durationSeconds elapses', () => {
    const onComplete = jest.fn();
    render(
      <InstructionStepView
        step={sampleStep}
        isActive={true}
        onComplete={onComplete}
      />
    );
    act(() => {
      jest.advanceTimersByTime(31_000);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not fire onComplete when isActive=false', () => {
    const onComplete = jest.fn();
    render(
      <InstructionStepView
        step={sampleStep}
        isActive={false}
        onComplete={onComplete}
      />
    );
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('freezes the countdown when isActive flips from true to false', () => {
    const onComplete = jest.fn();
    const { getByTestId, rerender } = render(
      <InstructionStepView
        step={sampleStep}
        isActive={true}
        onComplete={onComplete}
      />
    );
    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    const beforePause = getByTestId('instruction-step-countdown').props.children;

    rerender(
      <InstructionStepView
        step={sampleStep}
        isActive={false}
        onComplete={onComplete}
      />
    );
    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    const afterPause = getByTestId('instruction-step-countdown').props.children;
    expect(afterPause).toBe(beforePause);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
