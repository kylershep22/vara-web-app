// Render tests for NotShiftedResponse — Phase 2.8.2 layout refactor.
//
// Section 5 in vara_protocol_mockups.html. Replaces the previous text-link
// CTAs (jammed against the bottom edge with FAB overlap) with a full-screen
// vertical layout: completed-protocol pill at top, teal H1, validating body,
// Dew Sage Highlight Card, "If you'd like to keep going" section label,
// and two path cards (primary teal-bordered, secondary plain) with icons.
//
// FAB hidden via the Phase 2.8.1 default-HIDE rule (CheckInFlow's
// <Stack.Screen> declares no showFAB, NotShiftedResponse is a child step).
//
// Coverage:
// 1. Pill renders the just-completed protocol name + duration.
// 2. Headline + validating Highlight Card render with the spec copy.
// 3. Section label "If you'd like to keep going" renders.
// 4. Path cards render with the spec copy, icons, and correct testIDs;
//    onChoose fires the right value on tap.
// 5. Late-night override swaps the try-longer label + hint; rest-later stays.
// 6. No auto-dismiss (long fake-timer advance does not trigger onChoose).

import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

import { NotShiftedResponse } from '../NotShiftedResponse';

const PROTOCOL_NAME = 'Box Breathing';
const PROTOCOL_DURATION_LABEL = '2 min';

function renderResponse(
  overrides: Partial<React.ComponentProps<typeof NotShiftedResponse>> = {}
) {
  const onChoose = overrides.onChoose ?? jest.fn();
  return {
    onChoose,
    ...render(
      <NotShiftedResponse
        protocolName={PROTOCOL_NAME}
        protocolDurationLabel={PROTOCOL_DURATION_LABEL}
        lateNightOverride={false}
        onChoose={onChoose}
        {...overrides}
      />
    ),
  };
}

describe('NotShiftedResponse — Section 5 layout', () => {
  it('renders the completed-protocol pill with name + duration', () => {
    const { getByText } = renderResponse();
    // Pill renders the two fragments joined by a separator. Assert each
    // appears somewhere in the rendered tree.
    expect(getByText(new RegExp(PROTOCOL_NAME))).toBeTruthy();
    expect(getByText(new RegExp(PROTOCOL_DURATION_LABEL))).toBeTruthy();
  });

  it('renders the teal H1 headline with the spec copy', () => {
    const { getByTestId } = renderResponse();
    expect(getByTestId('not-shifted-response-title').props.children).toBe(
      'Some states take more time.'
    );
  });

  it('renders the validating Highlight Card text', () => {
    const { getByText } = renderResponse();
    expect(
      getByText(/What you just did still counts/)
    ).toBeTruthy();
    expect(
      getByText(/Your nervous system noticed the input/)
    ).toBeTruthy();
  });

  it('renders the "If you\'d like to keep going" section label', () => {
    const { getByText } = renderResponse();
    expect(getByText("If you'd like to keep going")).toBeTruthy();
  });

  it('renders both path cards with their testIDs', () => {
    const { getByTestId } = renderResponse();
    expect(getByTestId('not-shifted-response-try-longer')).toBeTruthy();
    expect(getByTestId('not-shifted-response-rest-later')).toBeTruthy();
  });
});

describe('NotShiftedResponse — default mode copy + action shape', () => {
  it('try-longer card shows the spec label + hint', () => {
    const { getByTestId, getByText } = renderResponse();
    const card = getByTestId('not-shifted-response-try-longer');
    expect(card.props.accessibilityLabel).toBe('Try something longer');
    expect(getByText('Try something longer')).toBeTruthy();
    expect(
      getByText('10+ minute protocol, for states that need more time')
    ).toBeTruthy();
  });

  it('rest-later card shows the spec label + hint', () => {
    const { getByTestId, getByText } = renderResponse();
    const card = getByTestId('not-shifted-response-rest-later');
    expect(card.props.accessibilityLabel).toBe('Rest and come back later');
    expect(getByText('Rest and come back later')).toBeTruthy();
    expect(getByText('Your next check-in will still be here')).toBeTruthy();
  });

  it('try-longer tap fires onChoose("try_longer"); rest-later tap fires onChoose("rest_later")', () => {
    const { getByTestId, onChoose } = renderResponse();

    fireEvent.press(getByTestId('not-shifted-response-try-longer'));
    expect(onChoose).toHaveBeenLastCalledWith('try_longer');

    fireEvent.press(getByTestId('not-shifted-response-rest-later'));
    expect(onChoose).toHaveBeenLastCalledWith('rest_later');

    expect(onChoose).toHaveBeenCalledTimes(2);
  });
});

describe('NotShiftedResponse — late-night override mode', () => {
  it('swaps try-longer label to "Try NSDR when you\'re ready"', () => {
    const { getByTestId } = renderResponse({ lateNightOverride: true });
    const card = getByTestId('not-shifted-response-try-longer');
    expect(card.props.accessibilityLabel).toBe(
      "Try NSDR when you're ready"
    );
  });

  it('renders the neutral late-night hint (no sleep-specific framing)', () => {
    const { getByText, queryByText } = renderResponse({
      lateNightOverride: true,
    });
    expect(getByText('About 20 minutes of guided rest')).toBeTruthy();
    expect(queryByText(/sleep|bedtime|wind down/i)).toBeNull();
  });

  it('rest-later card remains unchanged in override mode', () => {
    const { getByTestId } = renderResponse({ lateNightOverride: true });
    const card = getByTestId('not-shifted-response-rest-later');
    expect(card.props.accessibilityLabel).toBe('Rest and come back later');
  });

  it('try-longer tap still fires onChoose("try_longer") in override mode', () => {
    const { getByTestId, onChoose } = renderResponse({
      lateNightOverride: true,
    });
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
      <NotShiftedResponse
        protocolName={PROTOCOL_NAME}
        protocolDurationLabel={PROTOCOL_DURATION_LABEL}
        lateNightOverride={false}
        onChoose={onChoose}
      />
    );

    // Advance well past the 4s ShiftedResponse auto-dismiss window —
    // the not_shifted path must not borrow that behavior.
    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(onChoose).not.toHaveBeenCalled();
  });
});
