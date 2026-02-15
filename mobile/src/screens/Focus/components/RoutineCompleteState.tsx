/**
 * RoutineCompleteState Component
 * Completion screen for Active Routine Player
 *
 * Per Focus Page Spec Section 7.8:
 * - Check icon: 24px stroke in 64px circle with primary at 15% opacity
 * - Headline: "Routine complete" - 22px Semi-Bold, primary
 * - Body: Variety within spec voice/tone - 14px Regular, text-secondary
 * - Primary CTA: "Back to Focus"
 * - Secondary: "Adjust this routine" - tertiary text button
 * - Animation: Gentle fade-in only. No bounce, confetti, fireworks.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  SizeTokens,
  AnimationTokens,
  FocusCopy,
  CompletionMessages,
} from '../../../tokens/design-tokens';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface RoutineCompleteStateProps {
  /** Callback when "Back to Focus" is pressed */
  onBackToFocus: () => void;
  /** Callback when "Adjust this routine" is pressed */
  onAdjustRoutine: () => void;
  /** Routine name (for context) */
  routineName?: string;
}

export const RoutineCompleteState: React.FC<RoutineCompleteStateProps> = ({
  onBackToFocus,
  onAdjustRoutine,
  routineName,
}) => {
  const reduceMotion = useReducedMotion();
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  // Get random completion message
  const completionMessage = CompletionMessages[
    Math.floor(Math.random() * CompletionMessages.length)
  ];

  // Fade in animation
  useEffect(() => {
    if (!reduceMotion) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: AnimationTokens.durationSlow,
        useNativeDriver: true,
      }).start();
    }

    // Haptic feedback on mount
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [reduceMotion]);

  const handleBackToFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onBackToFocus();
  };

  const handleAdjustRoutine = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdjustRoutine();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Check icon in circle */}
      <View style={styles.iconCircle}>
        <Icon
          name="check"
          size={24}
          color={ColorTokens.primary}
          style={styles.checkIcon}
        />
      </View>

      {/* Headline */}
      <Text style={styles.headline}>{FocusCopy.completeHeadline}</Text>

      {/* Body */}
      <Text style={styles.body}>{completionMessage}</Text>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleBackToFocus}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={FocusCopy.completeCtaPrimary}
      >
        <Text style={styles.primaryButtonText}>{FocusCopy.completeCtaPrimary}</Text>
      </TouchableOpacity>

      {/* Secondary */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleAdjustRoutine}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={FocusCopy.completeCtaSecondary}
      >
        <Text style={styles.secondaryButtonText}>{FocusCopy.completeCtaSecondary}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SpacingTokens.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ColorTokens.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SpacingTokens.base,
  },
  checkIcon: {
    // Rounded stroke style would require custom SVG
    // Using MaterialCommunityIcons check for now
  },
  headline: {
    fontSize: 22,
    fontWeight: '600',
    color: ColorTokens.primary,
    textAlign: 'center',
    marginBottom: SpacingTokens.sm,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: ColorTokens.textSecondary,
    textAlign: 'center',
    lineHeight: 14 * 1.5,
    marginBottom: SpacingTokens.xl,
    paddingHorizontal: SpacingTokens.lg,
  },
  primaryButton: {
    height: SizeTokens.buttonHeightPrimary,
    paddingHorizontal: SpacingTokens.xl,
    backgroundColor: ColorTokens.primary,
    borderRadius: RadiusTokens.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: ColorTokens.textOnPrimary,
  },
  secondaryButton: {
    paddingVertical: SpacingTokens.md,
    paddingHorizontal: SpacingTokens.base,
    marginTop: SpacingTokens.md,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
});

export default RoutineCompleteState;
