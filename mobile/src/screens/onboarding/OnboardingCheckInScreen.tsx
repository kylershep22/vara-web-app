/**
 * Onboarding Check-In Screen
 * Screen 2 of 6 - Quick brain health check-in
 *
 * Purpose: Capture baseline energy, focus, and mood data.
 * This data drives the personalized insight on the next screen.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components';
import {
  OnboardingProgressDots,
  DotScaleSelector,
} from '../../components/onboarding';
import { Colors, Spacing, Typography } from '../../constants';
import { OnboardingCheckInData } from '../../types/onboarding';

interface OnboardingCheckInScreenProps {
  navigation: any;
}

const OnboardingCheckInScreen: React.FC<OnboardingCheckInScreenProps> = ({
  navigation,
}) => {
  const [energy, setEnergy] = useState(5);
  const [focus, setFocus] = useState(5);
  const [mood, setMood] = useState(5);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const checkInData: OnboardingCheckInData = {
      energy,
      focus,
      mood,
      timestamp: new Date().toISOString(),
    };

    navigation.navigate('OnboardingInsight', { checkIn: checkInData });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress Dots */}
      <OnboardingProgressDots currentStep={2} totalSteps={6} />

      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Icon name="chevron-left" size={28} color={Colors.evergreenTeal} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.prompt}>How is your brain doing right now?</Text>
          <Text style={styles.subPrompt}>
            This helps Vara understand where to start.
          </Text>
        </View>

        {/* Dimension Selectors */}
        <View style={styles.selectorsContainer}>
          <DotScaleSelector
            value={energy}
            onChange={setEnergy}
            label="Energy Level"
            icon="waves"
            lowLabel="Low"
            highLabel="High"
          />

          <DotScaleSelector
            value={focus}
            onChange={setFocus}
            label="Focus"
            icon="circle-double"
            lowLabel="Low"
            highLabel="High"
          />

          <DotScaleSelector
            value={mood}
            onChange={setMood}
            label="Mood"
            icon="white-balance-sunny"
            lowLabel="Low"
            highLabel="High"
          />
        </View>
      </ScrollView>

      {/* CTA Button - Fixed at bottom */}
      <View style={styles.ctaContainer}>
        <Button
          variant="primary"
          onPress={handleContinue}
          fullWidth
          accessibilityLabel="See what your brain needs"
          accessibilityRole="button"
        >
          See what your brain needs
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
  backButton: {
    position: 'absolute',
    top: 60, // Below progress dots
    left: Spacing.base,
    padding: Spacing.xs,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
    marginTop: Spacing.lg,
  },
  prompt: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.heading,
  },
  subPrompt: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
  selectorsContainer: {
    gap: Spacing.lg,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
  },
});

export default OnboardingCheckInScreen;
