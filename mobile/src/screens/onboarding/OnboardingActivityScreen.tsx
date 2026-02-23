/**
 * Onboarding Activity Screen
 * Screen 4 of 6 - Try One Thing
 *
 * Purpose: Let user try a micro-activity tailored to their selected focus.
 * Activities are intentionally short (30s-2min) to build early confidence.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components';
import {
  OnboardingProgressDots,
  OnboardingActivityCard,
  OnboardingBreathingActivity,
  OnboardingReflectionActivity,
  OnboardingIntentionActivity,
} from '../../components/onboarding';
import { Colors, Spacing, Typography } from '../../constants';
import { saveCompletedActivity } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  OnboardingStackParamList,
  CompletedOnboardingActivity,
} from '../../types/onboarding';
import { BrainPillar } from '../../types';
import { Timestamp } from 'firebase/firestore';

type ActivityScreenRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingActivity'>;

interface OnboardingActivityScreenProps {
  navigation: any;
}

interface ActivityOption {
  id: string;
  name: string;
  description: string;
  duration: string;
  durationSeconds: number;
  type: 'breathing' | 'reflection' | 'intention';
  icon: string;
  prompt?: string;
}

// Activity options by focus area
const ACTIVITIES_BY_FOCUS: Record<BrainPillar, ActivityOption[]> = {
  focus: [
    {
      id: 'focus-breath',
      name: 'Calming Breath',
      description: 'A simple breathing pattern to settle your mind',
      duration: '1 min',
      durationSeconds: 60,
      type: 'breathing',
      icon: 'meditation',
    },
    {
      id: 'focus-intention',
      name: 'Set an Intention',
      description: 'Choose one word to guide your focus today',
      duration: '30 sec',
      durationSeconds: 30,
      type: 'intention',
      icon: 'lightbulb-outline',
      prompt: 'What one word will guide your focus today?',
    },
    {
      id: 'focus-reflection',
      name: '2-Min Reflection',
      description: 'Notice what your mind keeps returning to',
      duration: '2 min',
      durationSeconds: 120,
      type: 'reflection',
      icon: 'notebook-outline',
      prompt: 'What has your mind kept returning to lately? What might that mean?',
    },
  ],
  energy: [
    {
      id: 'energy-breath',
      name: 'Grounding Breath',
      description: 'Deep breaths to restore your energy',
      duration: '1 min',
      durationSeconds: 60,
      type: 'breathing',
      icon: 'meditation',
    },
    {
      id: 'energy-check',
      name: 'Energy Check',
      description: 'Notice where you feel energy in your body',
      duration: '30 sec',
      durationSeconds: 30,
      type: 'reflection',
      icon: 'lightning-bolt-outline',
      prompt: 'Where do you feel energy in your body right now? Where does it feel blocked?',
    },
    {
      id: 'energy-movement',
      name: 'Movement Moment',
      description: 'A quick body scan to wake up your senses',
      duration: '2 min',
      durationSeconds: 120,
      type: 'reflection',
      icon: 'walk',
      prompt: 'Stand up and stretch. Roll your shoulders. Take a deep breath. How do you feel now compared to a moment ago?',
    },
  ],
  growth: [
    {
      id: 'growth-intention',
      name: 'Set an Intention',
      description: 'Choose something small to explore today',
      duration: '30 sec',
      durationSeconds: 30,
      type: 'intention',
      icon: 'lightbulb-outline',
      prompt: 'What is one small thing you want to learn or try today?',
    },
    {
      id: 'growth-reflection',
      name: '2-Min Reflection',
      description: 'Reflect on a recent challenge and what it taught you',
      duration: '2 min',
      durationSeconds: 120,
      type: 'reflection',
      icon: 'notebook-outline',
      prompt: 'Think of a recent challenge. What did you learn from it that you want to carry forward?',
    },
    {
      id: 'growth-curiosity',
      name: 'Curiosity Moment',
      description: 'Notice something new in your environment',
      duration: '30 sec',
      durationSeconds: 30,
      type: 'reflection',
      icon: 'magnify',
      prompt: 'Look around you. What is one thing you haven\'t noticed before? What does it make you curious about?',
    },
  ],
  resilience: [
    {
      id: 'resilience-breath',
      name: 'Calming Breath',
      description: 'A soothing breathing pattern to find calm',
      duration: '1 min',
      durationSeconds: 60,
      type: 'breathing',
      icon: 'meditation',
    },
    {
      id: 'resilience-gratitude',
      name: 'Quick Gratitude',
      description: 'Name one thing you\'re grateful for right now',
      duration: '30 sec',
      durationSeconds: 30,
      type: 'intention',
      icon: 'heart-outline',
      prompt: 'What is one thing you\'re grateful for right now, no matter how small?',
    },
    {
      id: 'resilience-bodyscan',
      name: 'Body Scan',
      description: 'Check in with how your body is feeling',
      duration: '2 min',
      durationSeconds: 120,
      type: 'reflection',
      icon: 'human-handsup',
      prompt: 'Close your eyes. Starting from your head, scan down through your body. Where do you notice tension? Where do you feel relaxed?',
    },
  ],
  connection: [
    {
      id: 'connection-reflection',
      name: 'Quick Reflection',
      description: 'Think of someone who matters to you',
      duration: '30 sec',
      durationSeconds: 30,
      type: 'reflection',
      icon: 'account-heart-outline',
      prompt: 'Who is someone that made a positive impact on your life? What would you want them to know?',
    },
    {
      id: 'connection-gratitude',
      name: 'Gratitude for Others',
      description: 'Appreciate someone in your life',
      duration: '30 sec',
      durationSeconds: 30,
      type: 'intention',
      icon: 'heart-outline',
      prompt: 'Who is someone you\'re grateful for today? What makes them special?',
    },
    {
      id: 'connection-breath',
      name: 'Calming Breath',
      description: 'Ground yourself before connecting with others',
      duration: '1 min',
      durationSeconds: 60,
      type: 'breathing',
      icon: 'meditation',
    },
  ],
};

const OnboardingActivityScreen: React.FC<OnboardingActivityScreenProps> = ({
  navigation,
}) => {
  const route = useRoute<ActivityScreenRouteProp>();
  const { user } = useAuth();
  const { checkIn, insight, selectedFocus } = route.params;

  const [activeActivity, setActiveActivity] = useState<ActivityOption | null>(null);

  // Get activities for the selected focus
  const activities = ACTIVITIES_BY_FOCUS[selectedFocus] || ACTIVITIES_BY_FOCUS.focus;

  const handleBack = () => {
    if (activeActivity) {
      // If in activity, go back to selection
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveActivity(null);
    } else {
      // If in selection, go back to insight screen
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.goBack();
    }
  };

  const handleStartActivity = (activity: ActivityOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveActivity(activity);
  };

  const handleActivityComplete = async (response?: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (!activeActivity) return;

    const completedActivity: CompletedOnboardingActivity = {
      id: activeActivity.id,
      name: activeActivity.name,
      type: activeActivity.type,
      duration: activeActivity.duration,
      completedAt: Timestamp.now(),
      response,
    };

    // Save to Firebase
    if (user?.uid) {
      try {
        await saveCompletedActivity(user.uid, completedActivity);
      } catch (error) {
        console.error('Error saving completed activity:', error);
      }
    }

    // Navigate to confirmation
    navigation.navigate('OnboardingConfirmation', {
      checkIn,
      insight,
      selectedFocus,
      completedActivity,
    });
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark onboarding as complete
    // AppNavigator will automatically detect this change via Firestore listener
    // and switch to MainNavigator
    if (user?.uid) {
      try {
        const { completeOnboarding } = await import('../../services/firebase');
        await completeOnboarding(user.uid);
      } catch (error) {
        console.error('Error completing onboarding:', error);
      }
    }
  };

  // Render activity execution view
  if (activeActivity) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <OnboardingProgressDots currentStep={4} totalSteps={6} />

        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" size={28} color={Colors.evergreenTeal} />
        </TouchableOpacity>

        <View style={styles.activityContainer}>
          {activeActivity.type === 'breathing' && (
            <OnboardingBreathingActivity
              durationSeconds={activeActivity.durationSeconds}
              onComplete={() => handleActivityComplete()}
            />
          )}

          {activeActivity.type === 'reflection' && (
            <OnboardingReflectionActivity
              prompt={activeActivity.prompt || ''}
              onComplete={handleActivityComplete}
            />
          )}

          {activeActivity.type === 'intention' && (
            <OnboardingIntentionActivity
              prompt={activeActivity.prompt || ''}
              onComplete={handleActivityComplete}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Render activity selection view
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OnboardingProgressDots currentStep={4} totalSteps={6} />

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
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headline}>
            Choose something that feels right
          </Text>
          <Text style={styles.subheadline}>
            These are tailored to your check-in. Pick one, or explore on your own.
          </Text>
        </View>

        {/* Activity Cards */}
        <View style={styles.activitiesContainer}>
          {activities.map((activity) => (
            <OnboardingActivityCard
              key={activity.id}
              activity={{
                id: activity.id,
                name: activity.name,
                description: activity.description,
                duration: activity.duration,
                durationSeconds: activity.durationSeconds,
                icon: activity.icon,
                type: activity.type,
              }}
              onPress={() => handleStartActivity(activity)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Skip Option */}
      <View style={styles.skipContainer}>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          accessibilityLabel="Explore on my own"
          accessibilityRole="button"
        >
          <Text style={styles.skipText}>Explore on my own</Text>
        </TouchableOpacity>
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
    top: 60,
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
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.heading,
  },
  subheadline: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  activitiesContainer: {
    gap: Spacing.md,
  },
  activityContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl * 2,
  },
  skipContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  skipText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default OnboardingActivityScreen;
