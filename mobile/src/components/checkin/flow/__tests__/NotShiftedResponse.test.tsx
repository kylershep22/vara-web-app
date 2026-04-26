// Render tests for NotShiftedResponse — five focused cases.
//
// 1. Default mode: standard six strings render; both buttons fire
//    the expected onChoose values.
// 2. Late-night override mode: the "Try something longer" button
//    label and hint swap to the NSDR-specific copy.
// 3. Late-night hint specifically renders the neutral framing.
// 4. No auto-dismiss: advancing fake timers a long way doesn't fire
//    onChoose unprompted.
// 5. The "Rest and come back later" button is unaffected by mode.

import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

import { NotShiftedResponse } from '../NotShiftedResponse';

describe('NotShiftedResponse — default mode', () => {
  it('renders the standard try-longer label/hint and rest-later label/hint', () => {
    const onChoose = jest.fn();
    const { getByTestId } = render(
      <NotShiftedResponse lateNightOverride={false} onChoose={onChoose} />
    );

    expect(getByTestId('not-shifted-response-title').props.children).toBe(
      'Some states take more time.'
    );

    const tryLonger = getByTestId('not-shifted-response-try-longer');
    expect(tryLonger.props.accessibilityLabel).toBe('Try something longer');

    const restLater = getByTestId('not-shifted-response-rest-later');
    expect(restLater.props.accessibilityLabel).toBe('Rest and come back later');
  });

  it('try-longer tap fires onChoose("try_longer"); rest-later tap fires onChoose("rest_later")', () => {
    const onChoose = jest.fn();
    const { getByTestId } = render(
      <NotShiftedResponse lateNightOverride={false} onChoose={onChoose} />
    );

    fireEvent.press(getByTestId('not-shifted-response-try-longer'));
    expect(onChoose).toHaveBeenLastCalledWith('try_longer');

    fireEvent.press(getByTestId('not-shifted-response-rest-later'));
    expect(onChoose).toHaveBeenLastCalledWith('rest_later');

    expect(onChoose).toHaveBeenCalledTimes(2);
  });
});

describe('NotShiftedResponse — late-night override mode', () => {
  it('swaps try-longer label to "Try NSDR when you\'re ready"', () => {
    const onChoose = jest.fn();
    const { getByTestId } = render(
      <NotShiftedResponse lateNightOverride={true} onChoose={onChoose} />
    );

    const tryLonger = getByTestId('not-shifted-response-try-longer');
    expect(tryLonger.props.accessibilityLabel).toBe(
      "Try NSDR when you're ready"
    );
  });

  it('renders the neutral late-night hint (no sleep-specific framing)', () => {
    const { getByText } = render(
      <NotShiftedResponse lateNightOverride={true} onChoose={jest.fn()} />
    );

    // Hint string renders as a separate Text node inside the button;
    // querying by exact text is more robust than walking children.
    expect(getByText('About 20 minutes of guided rest')).toBeTruthy();
    // Negative regex to catch future drift if someone re-introduces
    // sleep-specific framing into the default-path late-night hint
    // (Phase 5 path-specific tables can use sleep framing; default
    // stays neutral per locked decision).
    expect(() => getByText(/sleep|bedtime|wind down/i)).toThrow();
  });

  it('rest-later button remains unchanged in override mode', () => {
    const { getByTestId } = render(
      <NotShiftedResponse lateNightOverride={true} onChoose={jest.fn()} />
    );

    const restLater = getByTestId('not-shifted-response-rest-later');
    expect(restLater.props.accessibilityLabel).toBe('Rest and come back later');
  });

  it('try-longer tap still fires onChoose("try_longer") in override mode (action shape unchanged)', () => {
    const onChoose = jest.fn();
    const { getByTestId } = render(
      <NotShiftedResponse lateNightOverride={true} onChoose={onChoose} />
    );

    fireEvent.press(getByTestId('not-shifted-response-try-longer'));
    expect(onChoose).toHaveBeenCalledWith('try_longer');
  });
});

describe('NotShiftedResponse — no auto-dismiss', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not fire onChoose autonomously even after a long delay', () => {
    const onChoose = jest.fn();
    render(
      <NotShiftedResponse lateNightOverride={false} onChoose={onChoose} />
    );

    // Advance well past the 4s ShiftedResponse auto-dismiss window —
    // the not_shifted path must not borrow that behavior.
    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(onChoose).not.toHaveBeenCalled();
  });
});
