/**
 * Onboarding Confirmation Screen
 * Screen 5 of 6 - Confirmation and Soft Habit Offer
 *
 * Purpose: Celebrate completion and offer to make it a habit.
 * Keep it minimal and warm - no pressure.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components';
import { OnboardingProgressDots, InsightCard } from '../../components/onboarding';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { completeOnboarding } from '../../services/firebase';
import { createHabit } from '../../services/firebase/habits.service';
import { useAuth } from '../../context/AuthContext';
import { OnboardingStackParamList } from '../../types/onboarding';
import { BrainPillar } from '../../types';

type ConfirmationScreenRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingConfirmation'>;

interface OnboardingConfirmationScreenProps {
  navigation: any;
}

// Map focus to habit category
const FOCUS_TO_CATEGORY: Record<BrainPillar, string> = {
  focus: 'focus',
  energy: 'energy',
  growth: 'growth',
  resilience: 'resilience',
  connection: 'connection',
};

const OnboardingConfirmationScreen: React.FC<OnboardingConfirmationScreenProps> = ({
  navigation,
}) => {
  const route = useRoute<ConfirmationScreenRouteProp>();
  const { user } = useAuth();
  const { checkIn, insight, selectedFocus, completedActivity } = route.params;

  const [isCreatingHabit, setIsCreatingHabit] = useState(false);
  const [habitCreated, setHabitCreated] = useState(false);

  const handleAddToRoutine = async () => {
    if (isCreatingHabit || habitCreated) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCreatingHabit(true);

    try {
      if (user?.uid && completedActivity) {
        // Create the habit
        await createHabit(user.uid, {
          name: completedActivity.name,
          type: 'daily',
          frequency: 1,
          category: FOCUS_TO_CATEGORY[selectedFocus] || 'focus',
          active: true,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setHabitCreated(true);

        // Mark onboarding as complete after showing success state
        // AppNavigator will automatically detect this change via Firestore listener
        // and switch to MainNavigator
        setTimeout(async () => {
          await completeOnboarding(user.uid);
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating habit:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsCreatingHabit(false);
    }
  };

  const handleMaybeLater = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark onboarding as complete
    // AppNavigator will automatically detect this change via Firestore listener
    // and switch to MainNavigator
    if (user?.uid) {
      try {
        await completeOnboarding(user.uid);
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OnboardingProgressDots currentStep={5} totalSteps={6} />

      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon
              name={habitCreated ? 'check-bold' : 'check'}
              size={48}
              color={Colors.evergreenTeal}
            />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          {habitCreated ? 'Added to your routine.' : 'Nicely done.'}
        </Text>

        {/* Body */}
        <Text style={styles.body}>
          {habitCreated
            ? "You'll find this in your daily habits. Small steps lead to big changes."
            : 'A good first step. Vara is here whenever you\'re ready for the next one.'}
        </Text>

        {/* Habit Prompt Card - Only show if not yet created */}
        {!habitCreated && completedActivity && (
          <View style={styles.habitPromptContainer}>
            <InsightCard
              label="Build on this moment"
              text={`Would you like Vara to remind you to do this again?\n\n${completedActivity.name} · ${completedActivity.duration}`}
            />
          </View>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />
      </View>

      {/* Action Buttons */}
      <View style={styles.ctaContainer}>
        {!habitCreated ? (
          <>
            <Button
              variant="primary"
              onPress={handleAddToRoutine}
              fullWidth
              loading={isCreatingHabit}
              disabled={isCreatingHabit}
              accessibilityLabel="Add to my routine"
              accessibilityRole="button"
            >
              Add to my routine
            </Button>

            <TouchableOpacity
              onPress={handleMaybeLater}
              style={styles.skipButton}
              disabled={isCreatingHabit}
              accessibilityLabel="Maybe later"
              accessibilityRole="button"
            >
              <Text style={[styles.skipText, isCreatingHabit && styles.skipTextDisabled]}>
                Maybe later
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.successContainer}>
            <Icon name="check-circle" size={24} color={Colors.evergreenTeal} />
            <Text style={styles.successText}>Taking you home...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.md,
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.heading,
  },
  body: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.xl,
  },
  habitPromptContainer: {
    width: '100%',
    marginTop: Spacing.md,
  },
  spacer: {
    flex: 1,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  skipText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  skipTextDisabled: {
    opacity: 0.5,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  successText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default OnboardingConfirmationScreen;
