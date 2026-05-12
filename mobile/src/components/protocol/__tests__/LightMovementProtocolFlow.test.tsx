// Sub-step 2.7 round 4 (Obs 10) — integration tests for the Light
// Movement wrapper. Verifies the picker→player handoff: modality
// pick fires the parent callback, the player receives a protocol
// with the modality-specific timer hint, and Cancel from the picker
// calls onCancel without ever mounting the player.

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

// Mock GuidedSessionPlayer — we want to inspect the protocol prop
// that the wrapper hands off, not actually run the player.
let lastPlayerProps: { protocol: any; stateBefore: any } | null = null;
jest.mock('../GuidedSessionPlayer', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    GuidedSessionPlayer: (props: any) => {
      lastPlayerProps = { protocol: props.protocol, stateBefore: props.stateBefore };
      return (
        <View testID="mock-guided-session-player">
          <Text testID="mock-player-protocol-id">{props.protocol.id}</Text>
          <Text testID="mock-player-step-hint">
            {props.protocol.steps[0].hint}
          </Text>
          <Text testID="mock-player-step-label">
            {props.protocol.steps[0].label}
          </Text>
        </View>
      );
    },
  };
});

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { LightMovementProtocolFlow } from '../LightMovementProtocolFlow';
import { getProtocolById } from '../../../constants/brainStateProtocols';

beforeEach(() => {
  lastPlayerProps = null;
});

describe('LightMovementProtocolFlow', () => {
  const protocol = getProtocolById('brief-movement-5')!;

  it('renders the modality picker initially (player is NOT mounted yet)', () => {
    const { getByTestId, queryByTestId } = render(
      <LightMovementProtocolFlow
        protocol={protocol}
        stateBefore="foggy"
        onExit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByTestId('light-movement-modality-picker')).toBeTruthy();
    expect(queryByTestId('mock-guided-session-player')).toBeNull();
  });

  it('after selecting Walk, mounts the player with a Walk-specific timer hint', () => {
    const { getByTestId } = render(
      <LightMovementProtocolFlow
        protocol={protocol}
        stateBefore="foggy"
        onExit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('modality-picker-walk'));

    expect(getByTestId('mock-guided-session-player')).toBeTruthy();
    expect(getByTestId('mock-player-step-hint').props.children).toBe(
      'Walk at a comfortable pace.'
    );
    expect(getByTestId('mock-player-step-label').props.children).toBe(
      'Light movement'
    );
    // Protocol id is preserved — the hint override does not change identity.
    expect(getByTestId('mock-player-protocol-id').props.children).toBe(
      'brief-movement-5'
    );
  });

  it('after selecting Stretch, mounts the player with a Stretch-specific timer hint', () => {
    const { getByTestId } = render(
      <LightMovementProtocolFlow
        protocol={protocol}
        stateBefore="foggy"
        onExit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    fireEvent.press(getByTestId('modality-picker-stretch'));

    expect(getByTestId('mock-player-step-hint').props.children).toBe(
      'Stretch gently — neck, shoulders, back, legs.'
    );
  });

  it('fires onModalitySelected with the chosen modality before the player mounts', () => {
    const onModalitySelected = jest.fn();
    const { getByTestId } = render(
      <LightMovementProtocolFlow
        protocol={protocol}
        stateBefore="foggy"
        onExit={jest.fn()}
        onCancel={jest.fn()}
        onModalitySelected={onModalitySelected}
      />
    );

    fireEvent.press(getByTestId('modality-picker-stretch'));

    expect(onModalitySelected).toHaveBeenCalledTimes(1);
    expect(onModalitySelected).toHaveBeenCalledWith('stretch');
  });

  it('fires onCancel when the picker X is tapped, does NOT mount the player', () => {
    const onCancel = jest.fn();
    const onExit = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <LightMovementProtocolFlow
        protocol={protocol}
        stateBefore="foggy"
        onExit={onExit}
        onCancel={onCancel}
      />
    );

    fireEvent.press(getByTestId('modality-picker-cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onExit).not.toHaveBeenCalled();
    expect(queryByTestId('mock-guided-session-player')).toBeNull();
  });

  it('does not mutate the source protocol object when applying the modality hint', () => {
    const { getByTestId } = render(
      <LightMovementProtocolFlow
        protocol={protocol}
        stateBefore="foggy"
        onExit={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    const originalHint =
      protocol.steps[0].kind === 'timer' ? protocol.steps[0].hint : undefined;

    fireEvent.press(getByTestId('modality-picker-walk'));

    // Source protocol's catalog hint is unchanged; only the cloned
    // protocol passed to the player carries the modality-specific hint.
    const stillOriginalHint =
      protocol.steps[0].kind === 'timer' ? protocol.steps[0].hint : undefined;
    expect(stillOriginalHint).toBe(originalHint);
    expect(lastPlayerProps?.protocol.steps[0].hint).toBe(
      'Walk at a comfortable pace.'
    );
  });
});
