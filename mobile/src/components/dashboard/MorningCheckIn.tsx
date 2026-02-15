/**
 * Morning Check-In Component
 *
 * Quick 30-second check-in for energy level and mood.
 * Appears at the top of the dashboard when not yet completed for the day.
 * Grounds the objective wellness score data with subjective feelings.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface MorningCheckInProps {
  onComplete: (energyLevel: number, mood: number) => void;
  onDismiss?: () => void;
  loading?: boolean;
}

const ENERGY_LEVELS = [
  { value: 1, label: 'Exhausted', icon: 'battery-10', color: Colors.error },
  { value: 2, label: 'Tired', icon: 'battery-30', color: Colors.sunriseAmber },
  { value: 3, label: 'Okay', icon: 'battery-50', color: Colors.textSecondary },
  { value: 4, label: 'Good', icon: 'battery-70', color: Colors.evergreenTeal },
  { value: 5, label: 'Energized', icon: 'battery', color: Colors.success },
];

const MOOD_LEVELS = [
  { value: 1, label: 'Rough', emoji: '😔' },
  { value: 2, label: 'Low', emoji: '😕' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 5, label: 'Great', emoji: '😊' },
];

export const MorningCheckIn: React.FC<MorningCheckInProps> = ({
  onComplete,
  onDismiss,
  loading = false,
}) => {
  const [step, setStep] = useState<'energy' | 'mood'>('energy');
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [moodLevel, setMoodLevel] = useState<number | null>(null);

  const handleEnergySelect = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEnergyLevel(value);
    // Auto-advance to mood after brief delay
    setTimeout(() => setStep('mood'), 300);
  };

  const handleMoodSelect = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMoodLevel(value);
    // Submit after brief delay for visual feedback
    if (energyLevel !== null) {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete(energyLevel, value);
      }, 400);
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="weather-sunny" size={20} color={Colors.sunriseAmber} />
          <Text style={styles.headerTitle}>
            {step === 'energy' ? 'Good morning!' : 'Almost done!'}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton}>
            <Icon name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Question */}
      <Text style={styles.question}>
        {step === 'energy'
          ? "How's your energy level right now?"
          : "And how's your mood?"}
      </Text>

      {/* Energy Selection */}
      {step === 'energy' && (
        <View style={styles.optionsContainer}>
          {ENERGY_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.energyOption,
                energyLevel === level.value && styles.energyOptionSelected,
                energyLevel === level.value && { borderColor: level.color },
              ]}
              onPress={() => handleEnergySelect(level.value)}
              activeOpacity={0.7}
            >
              <Icon
                name={level.icon}
                size={28}
                color={energyLevel === level.value ? level.color : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.optionLabel,
                  energyLevel === level.value && { color: level.color },
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Mood Selection */}
      {step === 'mood' && (
        <View style={styles.optionsContainer}>
          {MOOD_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.value}
              style={[
                styles.moodOption,
                moodLevel === level.value && styles.moodOptionSelected,
              ]}
              onPress={() => handleMoodSelect(level.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.moodEmoji}>{level.emoji}</Text>
              <Text
                style={[
                  styles.optionLabel,
                  moodLevel === level.value && { color: Colors.evergreenTeal },
                ]}
              >
                {level.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, step === 'energy' && styles.progressDotActive]} />
        <View style={[styles.progressDot, step === 'mood' && styles.progressDotActive]} />
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Saving...</Text>
        </View>
      )}
    </View>
  );
};

// Compact version for when already completed
export const MorningCheckInComplete: React.FC<{
  energyLevel: number;
  mood: number;
  onEdit?: () => void;
}> = ({ energyLevel, mood, onEdit }) => {
  const energy = ENERGY_LEVELS.find(e => e.value === energyLevel) || ENERGY_LEVELS[2];
  const moodData = MOOD_LEVELS.find(m => m.value === mood) || MOOD_LEVELS[2];

  return (
    <TouchableOpacity
      style={styles.completedContainer}
      onPress={onEdit}
      activeOpacity={onEdit ? 0.7 : 1}
    >
      <View style={styles.completedContent}>
        <Icon name="check-circle" size={16} color={Colors.success} />
        <Text style={styles.completedText}>
          Morning check-in: {energy.label} energy, {moodData.emoji} mood
        </Text>
      </View>
      {onEdit && (
        <Icon name="pencil" size={14} color={Colors.textSecondary} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.sunriseAmber + '40',
    borderLeftWidth: 4,
    borderLeftColor: Colors.sunriseAmber,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  dismissButton: {
    padding: Spacing.xs,
  },
  question: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  energyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.default,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  energyOptionSelected: {
    backgroundColor: Colors.dewSage,
    borderWidth: 2,
  },
  moodOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.default,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.borderLight,
  },
  moodOptionSelected: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.evergreenTeal,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 2,
  },
  optionLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: Colors.evergreenTeal,
    width: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.lg,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  // Completed state styles
  completedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.success + '10',
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  completedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
});

export default MorningCheckIn;
