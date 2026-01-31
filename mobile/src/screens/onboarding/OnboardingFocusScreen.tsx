/**
 * Onboarding Focus Screen
 * Let users choose their wellness focus areas
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface OnboardingFocusScreenProps {
  navigation: any;
  route: any;
}

export type FocusArea = 'physical' | 'mental' | 'productivity' | 'growth' | 'community';

interface FocusOption {
  id: FocusArea;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const FOCUS_OPTIONS: FocusOption[] = [
  {
    id: 'physical',
    title: 'Physical Health',
    description: 'Exercise, nutrition, and sleep',
    icon: 'dumbbell',
    color: Colors.sunriseAmber,
  },
  {
    id: 'mental',
    title: 'Mental Wellness',
    description: 'Meditation, journaling, mindfulness',
    icon: 'brain',
    color: Colors.lavenderMist,
  },
  {
    id: 'productivity',
    title: 'Productivity',
    description: 'Goals, tasks, and focus sessions',
    icon: 'clipboard-check',
    color: Colors.evergreenTeal,
  },
  {
    id: 'growth',
    title: 'Personal Growth',
    description: 'Habits, learning, self-improvement',
    icon: 'sprout',
    color: Colors.success,
  },
  {
    id: 'community',
    title: 'Community',
    description: 'Connect, share, and support',
    icon: 'account-group',
    color: Colors.secondary,
  },
];

const OnboardingFocusScreen: React.FC<OnboardingFocusScreenProps> = ({ navigation }) => {
  const [selectedFocus, setSelectedFocus] = useState<Set<FocusArea>>(new Set());

  const toggleFocus = (focusId: FocusArea) => {
    const newSelection = new Set(selectedFocus);
    if (newSelection.has(focusId)) {
      newSelection.delete(focusId);
    } else {
      newSelection.add(focusId);
    }
    setSelectedFocus(newSelection);
  };

  const handleContinue = () => {
    // Pass selected focus areas to next screen
    navigation.navigate('OnboardingQuickStart', {
      selectedFocus: Array.from(selectedFocus),
    });
  };

  const handleSkip = () => {
    // Skip to tour with no specific focus
    navigation.navigate('OnboardingTour', {
      selectedFocus: [],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        {/* Header */}
        <Text variant="headlineMedium" style={styles.title}>
          What would you like to focus on?
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          Choose one or more areas (you can always change this later)
        </Text>

        {/* Focus Options */}
        <View style={styles.optionsContainer}>
          {FOCUS_OPTIONS.map((option) => {
            const isSelected = selectedFocus.has(option.id);
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                  { borderColor: option.color },
                ]}
                onPress={() => toggleFocus(option.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
                  <Icon name={option.icon} size={24} color={option.color} />
                </View>
                <View style={styles.optionText}>
                  <Text variant="titleMedium" style={styles.optionTitle}>
                    {option.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.optionDescription}>
                    {option.description}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: option.color }]}>
                    <Icon name="check" size={16} color={Colors.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            variant="primary"
            onPress={handleContinue}
            disabled={selectedFocus.size === 0}
            fullWidth
            style={styles.continueButton}
          >
            Continue ({selectedFocus.size} selected)
          </Button>

          <Button
            variant="text"
            onPress={handleSkip}
            fullWidth
          >
            Skip for now
          </Button>
        </View>
      </ScrollView>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: Colors.evergreenTeal,
    width: 24,
  },
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xl,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: Typography.fontSize.sm * 1.4,
    fontSize: Typography.fontSize.sm,
  },
  optionsContainer: {
    marginBottom: Spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  optionCardSelected: {
    borderWidth: 2,
    backgroundColor: Colors.dewSage,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
    fontSize: Typography.fontSize.sm,
  },
  optionDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    marginTop: 'auto',
    paddingTop: Spacing.sm,
  },
  continueButton: {
    marginBottom: Spacing.sm,
  },
});

export default OnboardingFocusScreen;
