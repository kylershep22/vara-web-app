/**
 * Shared layout for the stress-recovery onboarding arc: one primary action,
 * vertical, generous whitespace, calm 250ms ease-in fade (skipped under Reduce
 * Motion). Tokens only — no raw px/hex/font-size literals. RN lineHeight needs
 * absolute px, so it's derived from tokens (fontSize × lineHeight multiplier),
 * since Typography.lineHeight.normal is 1.5.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface OnboardingScaffoldProps {
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  onSkip?: () => void; // present => render "Skip for now"
  children?: React.ReactNode;
}

export const OnboardingScaffold: React.FC<OnboardingScaffoldProps> = ({
  title,
  subtitle,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  onSkip,
  children,
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.flex, { opacity }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.body}>{children}</View>
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
  body: { marginTop: Spacing.base },
  footer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  cta: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    height: Layout.buttonHeight.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
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
