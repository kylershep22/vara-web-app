/**
 * BreakPrompt Component
 * Break flow shown after focus session completes
 *
 * Session complete: 3-option layout with adjustable break duration
 * Break running: Countdown display
 * Break complete: "Begin another" / "Done for now"
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
  ColorTokens,
  SpacingTokens,
  SizeTokens,
} from '../../../constants/designTokens';
import { FocusCopy } from '../../../constants/focusContent';

type BreakState = 'session_complete' | 'break_running' | 'break_complete';

interface BreakPromptProps {
  state: BreakState;
  onStartBreak: () => void;
  onBeginAnother: () => void;
  onDoneForNow: () => void;
  breakTimeRemaining?: string;
  breakDurationMinutes?: number;
  onAdjustBreak?: (minutes: number) => void;
}

export const BreakPrompt: React.FC<BreakPromptProps> = ({
  state,
  onStartBreak,
  onBeginAnother,
  onDoneForNow,
  breakTimeRemaining,
  breakDurationMinutes = 5,
  onAdjustBreak,
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
          <View style={styles.sessionCompleteControls}>
            {/* Take a break with duration adjuster */}
            <View style={styles.breakRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => onAdjustBreak?.(breakDurationMinutes - 1)}
                accessibilityRole="button"
                accessibilityLabel="Decrease break duration"
                disabled={breakDurationMinutes <= 1}
              >
                <Icon
                  name="minus"
                  size={16}
                  color={breakDurationMinutes <= 1 ? ColorTokens.textSecondary : ColorTokens.primary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onStartBreak}
                accessibilityRole="button"
                accessibilityLabel={`Take a ${breakDurationMinutes} minute break`}
              >
                <Text style={styles.primaryButtonText}>
                  {FocusCopy.breakCtaTakeBreak} ({breakDurationMinutes}m)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => onAdjustBreak?.(breakDurationMinutes + 1)}
                accessibilityRole="button"
                accessibilityLabel="Increase break duration"
                disabled={breakDurationMinutes >= 15}
              >
                <Icon
                  name="plus"
                  size={16}
                  color={breakDurationMinutes >= 15 ? ColorTokens.textSecondary : ColorTokens.primary}
                />
              </TouchableOpacity>
            </View>

            {/* Start another */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onBeginAnother}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaStartAnother}
            >
              <Text style={styles.secondaryButtonText}>{FocusCopy.breakCtaStartAnother}</Text>
            </TouchableOpacity>

            {/* Done for now */}
            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={onDoneForNow}
              accessibilityRole="button"
              accessibilityLabel={FocusCopy.breakCtaDoneForNow}
            >
              <Text style={styles.tertiaryButtonText}>{FocusCopy.breakCtaDoneForNow}</Text>
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
    maxWidth: 220,
  },
  breakTime: {
    fontSize: 48,
    fontWeight: '600',
    color: ColorTokens.accentApricot,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.02 * 48,
  },
  sessionCompleteControls: {
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.sm,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ColorTokens.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ColorTokens.backgroundPrimary,
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
  secondaryButton: {
    height: SizeTokens.buttonHeightPrimary,
    paddingHorizontal: SizeTokens.buttonPaddingHorizontal,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ColorTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
  breakCompleteControls: {
    alignItems: 'center',
    gap: SpacingTokens.md,
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
