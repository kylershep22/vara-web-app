/**
 * BreakPrompt Component
 * Break timer prompt shown after Pomodoro session completes
 *
 * Per Focus Page Spec Section 5.4:
 * - Trigger: Timer reaches 0:00 during focus session
 * - Display: "Session complete" + "Take a 5-minute break?"
 * - Break ring color: color-accent-apricot with 400ms ease-out transition
 * - Break complete: "Break's over" + "Ready for another session?"
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
  ColorTokens,
  SpacingTokens,
  SizeTokens,
  FocusCopy,
} from '../../../tokens/design-tokens';

type BreakState = 'session_complete' | 'break_running' | 'break_complete';

interface BreakPromptProps {
  /** Current state of the break flow */
  state: BreakState;
  /** Callback to start the break timer */
  onStartBreak: () => void;
  /** Callback to begin another focus session */
  onBeginAnother: () => void;
  /** Callback when user is done for now */
  onDoneForNow: () => void;
  /** Time remaining in break (for break_running state) */
  breakTimeRemaining?: string;
}

export const BreakPrompt: React.FC<BreakPromptProps> = ({
  state,
  onStartBreak,
  onBeginAnother,
  onDoneForNow,
  breakTimeRemaining,
}) => {
  const renderContent = () => {
    switch (state) {
      case 'session_complete':
        return (
          <View style={styles.content}>
            <Text style={styles.headline}>{FocusCopy.sessionCompleteLine1}</Text>
            <Text style={styles.subtext}>{FocusCopy.sessionCompleteLine2}</Text>
          </View>
        );

      case 'break_running':
        return (
          <View style={styles.content}>
            <Text style={styles.breakTime}>{breakTimeRemaining}</Text>
            <Text style={styles.subtext}>Taking a break</Text>
          </View>
        );

      case 'break_complete':
        return (
          <View style={styles.content}>
            <Text style={styles.headline}>{FocusCopy.breakCompleteLine1}</Text>
            <Text style={styles.subtext}>{FocusCopy.breakCompleteLine2}</Text>
          </View>
        );

      default:
        return null;
    }
  };

  const renderControls = () => {
    switch (state) {
      case 'session_complete':
        return (
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.playButton}
              onPress={onStartBreak}
              accessibilityRole="button"
              accessibilityLabel="Start 5-minute break"
            >
              <Icon name="play" size={28} color={ColorTokens.textOnPrimary} />
            </TouchableOpacity>
          </View>
        );

      case 'break_complete':
        return (
          <View style={styles.breakCompleteControls}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onBeginAnother}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaPrimary}
            >
              <Text style={styles.primaryButtonText}>{FocusCopy.breakCtaPrimary}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={onDoneForNow}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaTertiary}
            >
              <Text style={styles.tertiaryButtonText}>{FocusCopy.breakCtaTertiary}</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
      {renderControls()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    marginBottom: SpacingTokens.lg,
  },
  headline: {
    fontSize: 18,
    fontWeight: '500',
    color: ColorTokens.primary,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    fontWeight: '400',
    color: ColorTokens.textSecondary,
    textAlign: 'center',
    marginTop: SpacingTokens.xs,
  },
  breakTime: {
    fontSize: 48,
    fontWeight: '600',
    color: ColorTokens.accentApricot,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.02 * 48,
  },
  controls: {
    alignItems: 'center',
  },
  playButton: {
    width: SizeTokens.playButtonSize,
    height: SizeTokens.playButtonSize,
    borderRadius: SizeTokens.playButtonSize / 2,
    backgroundColor: ColorTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakCompleteControls: {
    alignItems: 'center',
    gap: SpacingTokens.md,
  },
  primaryButton: {
    height: SizeTokens.buttonHeightPrimary,
    paddingHorizontal: SizeTokens.buttonPaddingHorizontal,
    backgroundColor: ColorTokens.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: ColorTokens.textOnPrimary,
  },
  tertiaryButton: {
    paddingVertical: SpacingTokens.sm,
    paddingHorizontal: SpacingTokens.base,
  },
  tertiaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
});

export default BreakPrompt;
