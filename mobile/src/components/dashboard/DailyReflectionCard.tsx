/**
 * DailyReflectionCard
 * End-of-day micro check-in: "How did today feel overall?"
 * Shown when all daily habits are completed and no reflection saved today.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DailyReflectionValue } from '../../types';

interface DailyReflectionCardProps {
  onReflect: (value: DailyReflectionValue) => void;
  onSkip: () => void;
}

const REFLECTION_OPTIONS: { value: DailyReflectionValue; label: string }[] = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'okay', label: 'Okay' },
  { value: 'hard', label: 'Hard' },
];

export const DailyReflectionCard: React.FC<DailyReflectionCardProps> = ({
  onReflect,
  onSkip,
}) => {
  const [showCaptured, setShowCaptured] = useState(false);

  const handleSelect = (value: DailyReflectionValue) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onReflect(value);
    setShowCaptured(true);
    setTimeout(() => setShowCaptured(false), 2000);
  };

  if (showCaptured) {
    return (
      <View style={styles.container}>
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedText}>Captured.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How did today feel overall?</Text>
      <View style={styles.chipRow}>
        {REFLECTION_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.chip}
            onPress={() => handleSelect(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  prompt: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  chip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background.default,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  capturedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  capturedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
