/**
 * Shared layout for the stress-recovery onboarding arc: one primary action,
 * vertical, generous whitespace, calm 250ms ease-in fade (skipped under Reduce
 * Motion). Tokens only — no raw px/hex/font-size literals. RN lineHeight needs
 * absolute px, so it's derived from tokens (fontSize × lineHeight multiplier),
 * since Typography.lineHeight.normal is 1.5.
 */
import React, { useEffect, useRef, type ComponentType } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { StepIndicator } from './StepIndicator';

// Minimal shape of a Lucide icon component. Kept local so the scaffold doesn't
// hard-depend on lucide-react-native's types.
type IconComponent = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// Fixed decorative-icon spec (Commit 4): light Silver Sage, thin 1.2 stroke to
// read as decorative (vs the 1.5 functional selection icons). Centralized here
// so every text-only transition screen renders an identical accent.
const DECORATIVE_ICON_SIZE = 56;
const DECORATIVE_ICON_STROKE = 1.2;

interface OnboardingScaffoldProps {
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  onSkip?: () => void; // present => render "Skip for now"
  // Present => render a top-left back chevron (pre-protocol screens only). Sits
  // to the left of the step indicator; callers pass a guarded navigation.goBack.
  onBack?: () => void;
  children?: React.ReactNode;
  // When both are provided, render the thin step-position progress bar above
  // the headline. The protocol (Cold Water Reset) screen omits these.
  currentStep?: number;
  totalSteps?: number;
  // Optional decorative line icon centered above the headline. Used to balance
  // text-only transition screens; rendered with the fixed decorative spec.
  decorativeIcon?: IconComponent;
  // Override the decorative icon size (default 56). Used by single-focus screens
  // (e.g. the intro) that want a larger hero accent.
  decorativeIconSize?: number;
  // Vertically center the content block (icon + heading + subtitle + body)
  // between the top progress bar and the sticky CTA. For single-focus screens
  // without a scrolling option list; leave false for list screens.
  centerContent?: boolean;
}

export const OnboardingScaffold: React.FC<OnboardingScaffoldProps> = ({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  onSkip,
  onBack,
  children,
  currentStep,
  totalSteps,
  decorativeIcon: DecorativeIcon,
  decorativeIconSize,
  centerContent,
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [opacity, reduceMotion]);

  const contentBlock = (
    <>
      {DecorativeIcon && (
        <View style={styles.decorativeIcon}>
          <DecorativeIcon
            size={decorativeIconSize ?? DECORATIVE_ICON_SIZE}
            strokeWidth={DECORATIVE_ICON_STROKE}
            color={Colors.silverSage}
          />
        </View>
      )}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.body}>{children}</View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.flex, { opacity }]}>
        <ScrollView
          contentContainerStyle={[styles.content, centerContent && styles.contentCentered]}
          showsVerticalScrollIndicator={false}
        >
          {(onBack || (currentStep != null && totalSteps != null)) && (
            <View style={styles.topRow}>
              {onBack && (
                <TouchableOpacity
                  onPress={onBack}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.backButton}
                >
                  <ChevronLeft size={24} color={Colors.evergreenTeal} />
                </TouchableOpacity>
              )}
              {currentStep != null && totalSteps != null && (
                <View style={styles.stepIndicatorFlex}>
                  <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
                </View>
              )}
            </View>
          )}
          {centerContent ? (
            <View style={styles.centeredBlock}>{contentBlock}</View>
          ) : (
            contentBlock
          )}
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, primaryDisabled && styles.ctaDisabled]}
            onPress={onPrimary}
            disabled={primaryDisabled}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!primaryDisabled }}
            accessibilityLabel={primaryLabel}
          >
            <Text style={styles.ctaText}>{primaryLabel}</Text>
          </TouchableOpacity>
          {!!onSkip && (
            <TouchableOpacity onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip for now">
              <Text style={styles.skip}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mistWhite },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
  },
  // Lets the centered block grow to fill the space between the top row and the
  // sticky CTA; content taller than the viewport still scrolls.
  contentCentered: { flexGrow: 1 },
  centeredBlock: { flex: 1, justifyContent: 'center' },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.base,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    marginBottom: Spacing.lg,
  },
  // Back chevron + 12px gap + step indicator bar (flex 1). The 24px chevron
  // sits left of the bar; the bar takes the remaining width.
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  backButton: { alignItems: 'flex-start', justifyContent: 'center' },
  stepIndicatorFlex: { flex: 1 },
  // Centered ~spacing.lg above the headline; balances text-only screens.
  decorativeIcon: { alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.lg },
  body: { marginTop: Spacing.base },
  footer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  cta: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    height: Layout.buttonHeight.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Design-system disabled state: primary teal at 40% opacity, no interaction.
  ctaDisabled: { opacity: 0.4 },
  ctaText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  skip: {
    marginTop: Spacing.base,
    textAlign: 'center',
    color: Colors.mutedSageGray,
    fontSize: Typography.fontSize.sm,
    paddingVertical: Spacing.sm,
  },
});
