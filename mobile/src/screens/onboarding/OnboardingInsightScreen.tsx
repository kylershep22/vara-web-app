/**
 * Onboarding Insight Screen
 * Screen 3 of 6 - The "Aha Moment"
 *
 * Purpose: Show personalized brain-health insight based on check-in data.
 * This is the most important screen - where users think "This app understands me."
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Button } from '../../components';
import {
  OnboardingProgressDots,
  InsightCard,
  FocusRecommendationCard,
  FocusAreaBottomSheet,
} from '../../components/onboarding';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { generateInsight } from '../../utils/onboardingInsights';
import { saveOnboardingCheckIn, saveOnboardingInsight, saveSelectedFocus } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { OnboardingCheckInData, OnboardingStackParamList } from '../../types/onboarding';
import { BrainPillar } from '../../types';

type InsightScreenRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingInsight'>;

interface OnboardingInsightScreenProps {
  navigation: any;
}

const OnboardingInsightScreen: React.FC<OnboardingInsightScreenProps> = ({
  navigation,
}) => {
  const route = useRoute<InsightScreenRouteProp>();
  const { user } = useAuth();
  const { checkIn } = route.params;

  const [selectedFocus, setSelectedFocus] = useState<BrainPillar | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Generate insight based on check-in data
  const insight = useMemo(() => {
    return generateInsight(checkIn.energy, checkIn.focus, checkIn.mood);
  }, [checkIn]);

  // Set initial selected focus to recommended
  useEffect(() => {
    setSelectedFocus(insight.recommendedFocus);
  }, [insight.recommendedFocus]);

  // Persist check-in and insight data
  useEffect(() => {
    const persistData = async () => {
      if (!user?.uid) return;

      try {
        await saveOnboardingCheckIn(user.uid, checkIn);
        await saveOnboardingInsight(user.uid, insight);
      } catch (error) {
        console.error('Error persisting onboarding data:', error);
        // Continue even if persistence fails
      }
    };

    persistData();
  }, [user?.uid, checkIn, insight]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleAdjustFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBottomSheet(true);
  };

  const handleSelectFocus = (focus: BrainPillar) => {
    setSelectedFocus(focus);
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Save selected focus
    if (user?.uid && selectedFocus) {
      try {
        await saveSelectedFocus(user.uid, selectedFocus);
      } catch (error) {
        console.error('Error saving selected focus:', error);
      }
    }

    navigation.navigate('OnboardingActivity', {
      checkIn,
      insight,
      selectedFocus: selectedFocus || insight.recommendedFocus,
    });
  };

  // Calculate bar widths for the mini summary (as percentage 0-100)
  const getBarWidth = (value: number): number => (value / 10) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress Dots */}
      <OnboardingProgressDots currentStep={3} totalSteps={6} />

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
      >
        {/* Header */}
        <Text style={styles.headline}>
          Here's what your brain may need right now
        </Text>

        {/* Check-in Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Energy</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${getBarWidth(checkIn.energy)}%` as any }]} />
            </View>
            <Text style={styles.summaryValue}>{checkIn.energy}/10</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Focus</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${getBarWidth(checkIn.focus)}%` as any }]} />
            </View>
            <Text style={styles.summaryValue}>{checkIn.focus}/10</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mood</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${getBarWidth(checkIn.mood)}%` as any }]} />
            </View>
            <Text style={styles.summaryValue}>{checkIn.mood}/10</Text>
          </View>
        </View>

        {/* Insight Card */}
        <InsightCard
          label="Your Brain-Health Snapshot"
          text={insight.text}
        />

        {/* Focus Recommendation */}
        <View style={styles.focusSection}>
          <Text style={styles.sectionLabel}>A starting point</Text>

          {selectedFocus && (
            <FocusRecommendationCard
              focus={selectedFocus}
              explanation={insight.focusExplanation}
              onAdjust={handleAdjustFocus}
              showAdjustButton={true}
            />
          )}
        </View>
      </ScrollView>

      {/* CTA Button - Fixed at bottom */}
      <View style={styles.ctaContainer}>
        <Button
          variant="primary"
          onPress={handleContinue}
          fullWidth
          accessibilityLabel="Try something small"
          accessibilityRole="button"
        >
          Try something small
        </Button>
      </View>

      {/* Focus Selection Bottom Sheet */}
      <FocusAreaBottomSheet
        visible={showBottomSheet}
        selectedFocus={selectedFocus || insight.recommendedFocus}
        recommendedFocus={insight.recommendedFocus}
        onSelect={handleSelectFocus}
        onDismiss={() => setShowBottomSheet(false)}
      />
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
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.heading,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryLabel: {
    width: 60,
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: `${Colors.silverSage}4D`, // 30% opacity
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 3,
  },
  summaryValue: {
    width: 40,
    textAlign: 'right',
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  focusSection: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.sm,
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
  },
});

export default OnboardingInsightScreen;
