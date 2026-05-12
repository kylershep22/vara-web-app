import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

// expo-haptics imports expo-modules-core's EventEmitter which fails
// to initialize under the test runtime. Stub it here so the card
// (which calls Haptics.impactAsync on press) can render and tap.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
}));

import { OverwhelmSafetyCard } from '../OverwhelmSafetyCard';
import { OVERWHELM_DEFAULT_PROTOCOL_ID } from '../../../constants/overwhelmDefaults';

// Mock navigation at the module boundary. Captures the latest
// navigate(name, params) call so tests can assert on the dispatched
// route without spinning up a real navigator.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

beforeEach(() => {
  mockNavigate.mockClear();
});

describe('OverwhelmSafetyCard — render', () => {
  it('renders the locked title and subhead verbatim', () => {
    const { getByTestId } = render(<OverwhelmSafetyCard />);

    expect(getByTestId('overwhelm-safety-card-title').props.children).toBe(
      'Need something right now?'
    );
    expect(getByTestId('overwhelm-safety-card-subhead').props.children).toBe(
      'A two-minute reset for hard moments.'
    );
  });

  it('exposes the warm, explicit accessibility label', () => {
    // Locked: "Need something right now? Two-minute Sensory Reset."
    // Not "Overwhelm safety card" (clinical) and not "Tap for help"
    // (alarming).
    const { getByTestId } = render(<OverwhelmSafetyCard />);
    const card = getByTestId('overwhelm-safety-card');
    expect(card.props.accessibilityLabel).toBe(
      'Need something right now? Two-minute Sensory Reset.'
    );
    expect(card.props.accessibilityRole).toBe('button');
  });
});

describe('OverwhelmSafetyCard — tap dispatch', () => {
  it('dispatches navigation.navigate with entrySource and the locked protocolId', () => {
    const { getByTestId } = render(<OverwhelmSafetyCard />);
    fireEvent.press(getByTestId('overwhelm-safety-card'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('CheckInFlow', {
      entrySource: 'overwhelm_safety_card',
      protocolId: OVERWHELM_DEFAULT_PROTOCOL_ID,
    });
  });

  it('the locked protocolId is "sensory-reset-2" (catches drift if the constant ever changes silently)', () => {
    // Independent assertion against the literal value. If Phase 5
    // changes the default protocol, this test must be touched
    // intentionally — preventing a silent rotation from going
    // unnoticed in CI.
    expect(OVERWHELM_DEFAULT_PROTOCOL_ID).toBe('sensory-reset-2');
  });

  it('honors the onPress override prop and skips navigation when provided', () => {
    // Test-affordance — the onPress prop lets harness tests bypass
    // navigation entirely. Production callers omit it.
    const customHandler = jest.fn();
    const { getByTestId } = render(<OverwhelmSafetyCard onPress={customHandler} />);
    fireEvent.press(getByTestId('overwhelm-safety-card'));

    expect(customHandler).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
