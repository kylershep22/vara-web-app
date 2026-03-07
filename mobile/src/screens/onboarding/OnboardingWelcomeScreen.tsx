/**
 * Onboarding Welcome Screen
 * Screen 1 of 6 - Sets the emotional and philosophical tone
 *
 * Purpose: Communicate that Vara works with your brain, not against it.
 * One screen, one idea: brain-first wellness.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components';
import { OnboardingProgressDots } from '../../components/onboarding';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface OnboardingWelcomeScreenProps {
  navigation: any;
}

const OnboardingWelcomeScreen: React.FC<OnboardingWelcomeScreenProps> = ({
  navigation,
}) => {
  const handleBegin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('OnboardingCheckIn');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress Dots */}
      <OnboardingProgressDots currentStep={1} totalSteps={6} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer for vertical centering */}
        <View style={styles.topSpacer} />

        {/* Brain Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="brain" size={48} color={Colors.white} />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          Vara supports your brain, so your habits can follow.
        </Text>

        {/* Body */}
        <Text style={styles.body}>
          This app is designed around how your brain actually works — helping
          you build clarity, focus, and consistency without pressure.
        </Text>

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* CTA Button - Fixed at bottom */}
      <View style={styles.ctaContainer}>
        <Button
          variant="primary"
          onPress={handleBegin}
          fullWidth
          accessibilityLabel="Begin at your own pace"
          accessibilityRole="button"
        >
          Begin at your own pace
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  topSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.md,
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.heading,
    marginBottom: Spacing.lg,
    letterSpacing: -0.25,
  },
  body: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    paddingHorizontal: Spacing.sm,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
  },
});

export default OnboardingWelcomeScreen;
