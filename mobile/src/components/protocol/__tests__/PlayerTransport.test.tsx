jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PlayerTransport } from '../PlayerTransport';
import * as Haptics from 'expo-haptics';

const baseHandlers = {
  onPauseToggle: jest.fn(),
  onBackFifteen: jest.fn(),
  onTryAgain: jest.fn(),
  onEndEarly: jest.fn(),
};

beforeEach(() => {
  Object.values(baseHandlers).forEach((fn) => fn.mockClear());
  (Haptics.impactAsync as jest.Mock).mockClear();
});

describe('PlayerTransport — normal playback (audioErrorPhase=none)', () => {
  it('renders Pause/Resume + End early; Back-15s only when audio step', () => {
    const { getByTestId, queryByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={false}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    expect(getByTestId('player-transport-pause-toggle')).toBeTruthy();
    expect(getByTestId('player-transport-end-early')).toBeTruthy();
    expect(queryByTestId('player-transport-back-fifteen')).toBeNull();
    expect(queryByTestId('player-transport-try-again')).toBeNull();
  });

  it('renders Back-15s when isAudioStep=true', () => {
    const { getByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={true}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    expect(getByTestId('player-transport-back-fifteen')).toBeTruthy();
  });

  it('shows "Pause" when not paused, "Resume" when paused', () => {
    const { getByLabelText, rerender } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={false}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    expect(getByLabelText('Pause session')).toBeTruthy();

    rerender(
      <PlayerTransport
        isPaused={true}
        isAudioStep={false}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    expect(getByLabelText('Resume session')).toBeTruthy();
  });

  it('Pause/Resume tap calls onPauseToggle and fires light haptic', () => {
    const { getByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={false}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    fireEvent.press(getByTestId('player-transport-pause-toggle'));
    expect(baseHandlers.onPauseToggle).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('Back-15s tap calls onBackFifteen and fires light haptic', () => {
    const { getByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={true}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    fireEvent.press(getByTestId('player-transport-back-fifteen'));
    expect(baseHandlers.onBackFifteen).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('Try again tap does NOT fire haptic (retry feedback comes from loading UI)', () => {
    const { getByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={true}
        audioErrorPhase="error"
        {...baseHandlers}
      />
    );
    fireEvent.press(getByTestId('player-transport-try-again'));
    expect(baseHandlers.onTryAgain).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});

describe('PlayerTransport — audio error (audioErrorPhase=error)', () => {
  it('renders Try again + End early; hides Pause/Resume and Back-15s', () => {
    const { getByTestId, queryByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={true}
        audioErrorPhase="error"
        {...baseHandlers}
      />
    );
    expect(getByTestId('player-transport-try-again')).toBeTruthy();
    expect(getByTestId('player-transport-end-early')).toBeTruthy();
    expect(queryByTestId('player-transport-pause-toggle')).toBeNull();
    expect(queryByTestId('player-transport-back-fifteen')).toBeNull();
  });

  it('Try again tap calls onTryAgain', () => {
    const { getByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={true}
        audioErrorPhase="error"
        {...baseHandlers}
      />
    );
    fireEvent.press(getByTestId('player-transport-try-again'));
    expect(baseHandlers.onTryAgain).toHaveBeenCalledTimes(1);
  });

  it('End early in error state still goes through the confirm modal', () => {
    const { getByTestId, queryByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={true}
        audioErrorPhase="error"
        {...baseHandlers}
      />
    );
    // Modal is hidden initially.
    expect(queryByTestId('end-early-modal-card')).toBeNull();
    fireEvent.press(getByTestId('player-transport-end-early'));
    // Modal opens — onEndEarly is NOT called yet.
    expect(getByTestId('end-early-modal-card')).toBeTruthy();
    expect(baseHandlers.onEndEarly).not.toHaveBeenCalled();
  });
});

describe('PlayerTransport — End early confirmation flow', () => {
  it('opening the modal does not fire onEndEarly until confirmation', () => {
    const { getByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={false}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    fireEvent.press(getByTestId('player-transport-end-early'));
    expect(getByTestId('end-early-modal-card')).toBeTruthy();
    expect(baseHandlers.onEndEarly).not.toHaveBeenCalled();
  });

  it('Keep going dismisses the modal without firing onEndEarly', () => {
    const { getByTestId, queryByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={false}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    fireEvent.press(getByTestId('player-transport-end-early'));
    fireEvent.press(getByTestId('end-early-modal-keep-going'));
    expect(queryByTestId('end-early-modal-card')).toBeNull();
    expect(baseHandlers.onEndEarly).not.toHaveBeenCalled();
  });

  it('confirming inside the modal fires onEndEarly and dismisses', () => {
    const { getByTestId, queryByTestId } = render(
      <PlayerTransport
        isPaused={false}
        isAudioStep={false}
        audioErrorPhase="none"
        {...baseHandlers}
      />
    );
    fireEvent.press(getByTestId('player-transport-end-early'));
    fireEvent.press(getByTestId('end-early-modal-confirm'));
    expect(baseHandlers.onEndEarly).toHaveBeenCalledTimes(1);
    expect(queryByTestId('end-early-modal-card')).toBeNull();
  });
});
