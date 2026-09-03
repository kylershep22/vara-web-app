/**
 * The capture flow's screen frame (slice 3c-i).
 *
 * A THIN WRAPPER OVER OnboardingScaffold, not a second scaffold. Two reasons it
 * exists at all rather than the screens calling the onboarding one directly:
 *
 *   1. NO STEP COUNT. `currentStep` / `totalSteps` are deliberately never
 *      passed, so the progress bar does not render. The flow branches; there is
 *      no honest "3 of 5".
 *   2. A CALLER-NAMED TERTIARY. OnboardingScaffold's `onSkip` renders the fixed
 *      label "Skip for now", and this flow's tertiary is "I'll name it later",
 *      which is a different promise: it retires the card for a week rather than
 *      dismissing a step.
 *
 * This lives in the authenticated app, not onboarding, and shares only the
 * visual idiom.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { Colors, Spacing, Typography } from '../../../constants';

const MIN_TOUCH_TARGET = 48;

interface RemoveCaptureScaffoldProps {
  title: string;
  subtitle?: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  onBack?: () => void;
  /** Renders a quiet tertiary under the primary when both are provided. */
  tertiaryLabel?: string;
  onTertiary?: () => void;
  children?: React.ReactNode;
}

export const RemoveCaptureScaffold: React.FC<RemoveCaptureScaffoldProps> = ({
  title,
  subtitle,
  primaryLabel,
  primaryDisabled,
  onPrimary,
  onBack,
  tertiaryLabel,
  onTertiary,
  children,
}) => (
  <OnboardingScaffold
    title={title}
    subtitle={subtitle}
    primaryLabel={primaryLabel}
    primaryDisabled={primaryDisabled}
    onPrimary={onPrimary}
    onBack={onBack}
  >
    <View>
      {children}

      {/* Quiet and unbordered, the same weight as the picker's skip: naming it
          later is a real answer and is never a failure state, so it gets no
          warning colour and no emphasis. */}
      {!!tertiaryLabel && !!onTertiary && (
        <TouchableOpacity
          style={styles.tertiary}
          onPress={onTertiary}
          accessibilityRole="button"
          accessibilityLabel={tertiaryLabel}
          testID="remove-capture-tertiary"
        >
          <Text style={styles.tertiaryLabel}>{tertiaryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  </OnboardingScaffold>
);

const styles = StyleSheet.create({
  tertiary: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
  },
  tertiaryLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});
