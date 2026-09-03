/**
 * The capture completion (journey slice 3c-i, walk-failure fix).
 *
 * THE TWO REGRESSIONS THIS FILE EXISTS FOR, both found on the first device
 * walk and both invisible to the suites that shipped with the slice:
 *
 *   1. LEAVING THE FLOW POPPED THE WRONG STACK. `useNavigation` inside a
 *      screen of the nested capture navigator resolves to that nested stack,
 *      so `goBack()` landed on the timing question instead of Today. The user
 *      could then press through again.
 *   2. A SECOND COMPLETION NULLED THE FIRST. The context was cleared before
 *      navigating, so the re-entered screen wrote an all-null capture over a
 *      real one, with a fresh removeCapturedAt.
 *
 * WHAT IS ASSERTED, AND WHAT IS NOT. These are call-shape assertions against a
 * mocked navigator: they prove the screen pops the PARENT and never the nested
 * stack, which is precisely the defect. They are not a rendered navigation-state
 * assertion, which would need a real NavigationContainer and a native-stack
 * mock; that is stated here rather than implied, so nobody reads this as
 * stronger than it is.
 */
const mockGoBack = jest.fn();
const mockParentGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ goBack: mockParentGoBack }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    getParent: mockGetParent,
    navigate: jest.fn(),
  }),
}));

const mockRecordRemoveCapture = jest.fn();
jest.mock('../../../../services/firebase/journeyState.service', () => ({
  recordRemoveCapture: (...a: any[]) => mockRecordRemoveCapture(...a),
}));

const mockLogEvent = jest.fn();
jest.mock('../../../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));

const mockWarn = jest.fn();
jest.mock('../../../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: (...a: any[]) => mockWarn(...a), error: jest.fn() },
}));

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

// The scaffold pulls the onboarding chrome; only the primary matters here.
jest.mock('../RemoveCaptureScaffold', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    RemoveCaptureScaffold: ({ primaryLabel, primaryDisabled, onPrimary, children }: any) => (
      <View>
        {children}
        <TouchableOpacity
          testID="scaffold-primary"
          disabled={primaryDisabled}
          accessibilityState={{ disabled: !!primaryDisabled }}
          onPress={onPrimary}
        >
          <Text>{primaryLabel}</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

const mockCapture = {
  family: 'behavioral' as const,
  chipId: 'scroll',
  chipLabel: 'Getting stuck scrolling',
  text: null as string | null,
  timing: 'evening' as const,
  reset: jest.fn(),
};
jest.mock('../RemoveCaptureContext', () => ({
  useRemoveCapture: () => mockCapture,
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { FirstMoveScreen } from '../FirstMoveScreen';

describe('completing the capture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordRemoveCapture.mockResolvedValue(undefined);
    mockGetParent.mockReturnValue({ goBack: mockParentGoBack });
    Object.assign(mockCapture, {
      family: 'behavioral',
      chipId: 'scroll',
      chipLabel: 'Getting stuck scrolling',
      text: null,
      timing: 'evening',
    });
  });

  test('POPS THE PARENT, never the nested capture stack', async () => {
    // The walk failure in one assertion. A nested goBack lands on the timing
    // question; popping the parent unmounts the whole flow and returns to Today.
    const { getByTestId } = render(<FirstMoveScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockParentGoBack).toHaveBeenCalledTimes(1));
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  test('the flow is left with no capture screen still on it', async () => {
    // Popping the parent removes the single AppStack entry that holds the whole
    // nested stack, so none of the six capture routes remains reachable by
    // back. Asserted here as the parent pop, which is the mechanism.
    const { getByTestId } = render(<FirstMoveScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockParentGoBack).toHaveBeenCalled());
    expect(mockGetParent).toHaveBeenCalled();
  });

  test('writes once, and clears the context only after the write resolves', async () => {
    const { getByTestId } = render(<FirstMoveScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockRecordRemoveCapture).toHaveBeenCalledTimes(1));
    expect(mockRecordRemoveCapture).toHaveBeenCalledWith('u1', {
      family: 'behavioral',
      chipId: 'scroll',
      text: null,
      timing: 'evening',
    });
    expect(mockCapture.reset).toHaveBeenCalled();
  });

  test('a second tap cannot produce a second write', async () => {
    const { getByTestId } = render(<FirstMoveScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() => expect(mockRecordRemoveCapture).toHaveBeenCalledTimes(1));

    fireEvent.press(getByTestId('scaffold-primary'));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockParentGoBack).toHaveBeenCalled());
    expect(mockRecordRemoveCapture).toHaveBeenCalledTimes(1);
  });

  test('COMPLETION WITH AN ABSENT TARGET DOES NOT WRITE', async () => {
    // The state the re-entered screen was in: context cleared, nothing named.
    // An updateDoc here would null a real answer and restamp removeCapturedAt.
    Object.assign(mockCapture, {
      family: null,
      chipId: null,
      chipLabel: null,
      text: null,
      timing: null,
    });

    const { getByTestId } = render(<FirstMoveScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));

    // The press does not even reach the handler, because the primary is
    // disabled without a target. Asserted on the OUTCOME rather than on the
    // warn line, which only fires if that first defence is ever removed; the
    // service-level guard covers the same invariant where it is reachable.
    await waitFor(() => expect(mockRecordRemoveCapture).not.toHaveBeenCalled());
    expect(mockLogEvent).not.toHaveBeenCalled();
    expect(mockParentGoBack).not.toHaveBeenCalled();
  });

  test('the primary is disabled outright when there is no target', () => {
    Object.assign(mockCapture, {
      family: null,
      chipId: null,
      chipLabel: null,
      text: null,
      timing: null,
    });

    const { getByTestId } = render(<FirstMoveScreen />);
    expect(getByTestId('scaffold-primary').props.accessibilityState.disabled).toBe(true);
  });
});

describe('when the write fails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetParent.mockReturnValue({ goBack: mockParentGoBack });
    Object.assign(mockCapture, {
      family: 'behavioral',
      chipId: 'scroll',
      chipLabel: 'Getting stuck scrolling',
      text: null,
      timing: 'evening',
    });
    mockRecordRemoveCapture.mockRejectedValue(new Error('offline'));
  });

  test('STAYS ON THE SCREEN and shows the error', async () => {
    // Navigating away on a failure would lose the answers and leave the user
    // unsure whether anything was recorded.
    const { getByTestId } = render(<FirstMoveScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(getByTestId('remove-capture-error')).toBeTruthy());
    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockCapture.reset).not.toHaveBeenCalled();
  });

  test('a retry after a failure can still write', async () => {
    const { getByTestId } = render(<FirstMoveScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() => expect(getByTestId('remove-capture-error')).toBeTruthy());

    mockRecordRemoveCapture.mockResolvedValue(undefined);
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockParentGoBack).toHaveBeenCalled());
    expect(mockRecordRemoveCapture).toHaveBeenCalledTimes(2);
  });
});

describe('the read-back', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRecordRemoveCapture.mockResolvedValue(undefined);
  });

  test('renders the chip label with NO input chrome', () => {
    Object.assign(mockCapture, {
      family: 'behavioral',
      chipId: 'scroll',
      chipLabel: 'Getting stuck scrolling',
      text: null,
      timing: 'evening',
    });
    const { getByTestId } = render(<FirstMoveScreen />);

    expect(getByTestId('remove-capture-echo').props.children).toBe(
      'Getting stuck scrolling'
    );
    // The container must not carry a border: sharing the clarify input's chrome
    // is what made an empty read-back look like a broken text field.
    const box = getByTestId('remove-capture-confirmation');
    const flat = Array.isArray(box.props.style)
      ? Object.assign({}, ...box.props.style)
      : box.props.style;
    expect(flat.borderWidth).toBeUndefined();
    expect(flat.borderColor).toBeUndefined();
  });

  test('renders the free text verbatim when there is one', () => {
    Object.assign(mockCapture, {
      family: 'mental',
      chipId: 'free_text',
      chipLabel: 'Thoughts that loop',
      text: 'the thing I keep going back to at night',
      timing: null,
    });
    const { getByTestId } = render(<FirstMoveScreen />);

    expect(getByTestId('remove-capture-echo').props.children).toBe(
      'the thing I keep going back to at night'
    );
  });
});
