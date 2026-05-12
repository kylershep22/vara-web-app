// Bottom-pinned transport bar for GuidedSessionPlayer.
//
// Two visible variants driven by `audioErrorPhase`:
//
//   none  — normal playback. Pause/Resume + (Back-15s when audio) +
//           End early.
//   error — audio is in a load-failed state. Try again + End early.
//           Pause/Resume and Back-15s are hidden because the audio
//           isn't loaded. This UI applies on the first failure and
//           remains identical on subsequent failures — we don't
//           auto-abandon and we don't make Try again the only option.
//           "End early" from this state is the user's choice to log
//           the partial session as audio_error (the player decides
//           the abandonReason from its own state; the transport just
//           dispatches the callback).
//
// Verb alignment: the End early button label and the modal CTA both
// say "End early." No "End session" anywhere.
//
// Touch targets: 48px minimum on every interactive element. Light
// haptic on Pause/Resume, Back-15s, and End early taps; no haptic on
// Try again (the visible loading state is sufficient feedback for a
// retry). Back-15s gets the haptic because the audio actually jumps —
// without confirmation a dropped tap looks identical to a registered
// one and users will retap and end up 30s back. Icon swap on
// Pause/Resume is an instant text/icon change — no flip, no spring,
// no fade.

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, Typography } from '../../constants';
import { EndEarlyConfirmModal } from './EndEarlyConfirmModal';

const MIN_TOUCH_TARGET = 48;

export type TransportAudioErrorPhase = 'none' | 'error';

export interface PlayerTransportProps {
  isPaused: boolean;
  isAudioStep: boolean;
  audioErrorPhase: TransportAudioErrorPhase;
  onPauseToggle: () => void;
  onBackFifteen: () => void;
  onTryAgain: () => void;
  onEndEarly: () => void;
}

export function PlayerTransport({
  isPaused,
  isAudioStep,
  audioErrorPhase,
  onPauseToggle,
  onBackFifteen,
  onTryAgain,
  onEndEarly,
}: PlayerTransportProps) {
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handlePauseToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPauseToggle();
  };

  const handleBackFifteen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onBackFifteen();
  };

  const handleEndEarlyTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setConfirmVisible(true);
  };

  const handleEndEarlyCancel = () => setConfirmVisible(false);

  const handleEndEarlyConfirm = () => {
    setConfirmVisible(false);
    onEndEarly();
  };

  return (
    <View style={styles.container} testID="player-transport">
      <View style={styles.divider} />
      <View style={styles.row}>
        {audioErrorPhase === 'error' ? (
          <>
            <TransportButton
              icon="refresh"
              label="Try again"
              onPress={onTryAgain}
              testID="player-transport-try-again"
              accessibilityLabel="Try loading the audio again"
            />
            <TransportButton
              icon="close"
              label="End early"
              destructive
              onPress={handleEndEarlyTap}
              testID="player-transport-end-early"
              accessibilityLabel="End the session early"
            />
          </>
        ) : (
          <>
            <TransportButton
              icon={isPaused ? 'play' : 'pause'}
              label={isPaused ? 'Resume' : 'Pause'}
              onPress={handlePauseToggle}
              testID="player-transport-pause-toggle"
              accessibilityLabel={isPaused ? 'Resume session' : 'Pause session'}
            />
            {isAudioStep ? (
              <TransportButton
                icon="rewind-15"
                label="Back 15s"
                onPress={handleBackFifteen}
                testID="player-transport-back-fifteen"
                accessibilityLabel="Skip back fifteen seconds"
              />
            ) : null}
            <TransportButton
              icon="close"
              label="End early"
              destructive
              onPress={handleEndEarlyTap}
              testID="player-transport-end-early"
              accessibilityLabel="End the session early"
            />
          </>
        )}
      </View>

      <EndEarlyConfirmModal
        visible={confirmVisible}
        onCancel={handleEndEarlyCancel}
        onConfirm={handleEndEarlyConfirm}
      />
    </View>
  );
}

// ---------- subcomponent ----------

interface TransportButtonProps {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
}

function TransportButton({
  icon,
  label,
  destructive,
  onPress,
  testID,
  accessibilityLabel,
}: TransportButtonProps) {
  const tint = destructive ? Colors.softCoral : Colors.softCharcoal;
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <Icon
        name={icon as React.ComponentProps<typeof Icon>['name']}
        size={24}
        color={tint}
      />
      <Text style={[styles.buttonLabel, { color: tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.default,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.divider,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: Spacing.sm,
  },
  buttonLabel: {
    marginTop: 2,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});
