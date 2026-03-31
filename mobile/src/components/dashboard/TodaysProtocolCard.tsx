/**
 * TodaysProtocolCard
 * Shows the recommended protocol after brain state check-in.
 * Expands inline to show instructions. "Done" marks protocol completed.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainStateProtocol } from '../../constants/brainStateProtocols';

interface TodaysProtocolCardProps {
  protocol: BrainStateProtocol;
  completed: boolean;
  onMarkCompleted: () => void;
  startExpanded?: boolean;
}

export const TodaysProtocolCard: React.FC<TodaysProtocolCardProps> = ({
  protocol,
  completed,
  onMarkCompleted,
  startExpanded = false,
}) => {
  const [showInstructions, setShowInstructions] = useState(startExpanded);

  const handleBegin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowInstructions(true);
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMarkCompleted();
    setShowInstructions(false);
  };

  const categoryIcon = {
    breathwork: 'weather-windy',
    reflection: 'head-lightbulb-outline',
    reset: 'refresh',
  }[protocol.category] as 'weather-windy' | 'head-lightbulb-outline' | 'refresh';

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name={categoryIcon} size={20} color={Colors.evergreenTeal} />
          <Text style={styles.protocolName}>{protocol.name}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{protocol.duration}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{protocol.description}</Text>

      {/* Completed state */}
      {completed && !showInstructions && (
        <View style={styles.completedRow}>
          <Icon name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.completedText}>Completed</Text>
        </View>
      )}

      {/* CTA or Instructions */}
      {!completed && !showInstructions && (
        <TouchableOpacity style={styles.ctaButton} onPress={handleBegin} activeOpacity={0.7}>
          <Text style={styles.ctaText}>Begin when ready</Text>
        </TouchableOpacity>
      )}

      {showInstructions && (
        <View style={styles.instructionsContainer}>
          {protocol.instructions.map((step, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>{index + 1}.</Text>
              <Text style={styles.instructionText}>{step}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.7}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
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
    flex: 1,
  },
  protocolName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  durationBadge: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  ctaButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  instructionsContainer: {
    marginTop: Spacing.sm,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  instructionNumber: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    width: 24,
  },
  instructionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
    flex: 1,
  },
  doneButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  doneButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
