/**
 * Wellness Score Opt-In Card
 * Prompts user to enable wellness score tracking
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface WellnessScoreOptInCardProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export const WellnessScoreOptInCard: React.FC<WellnessScoreOptInCardProps> = ({
  onEnable,
  onDismiss,
}) => {
  const handleEnable = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEnable();
  };

  const handleDismiss = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftAccent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="chart-line" size={22} color={Colors.evergreenTeal} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Track Your Wellness Score</Text>
            <Text style={styles.description}>
              Get daily insights based on your habits, check-ins, and activities.
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnable}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enable wellness score tracking"
          >
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Dismiss wellness score prompt"
          >
            <Text style={styles.dismissText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  leftAccent: {
    width: 4,
    backgroundColor: Colors.evergreenTeal,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.evergreenTeal}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.base,
    gap: Spacing.base,
  },
  enableButton: {
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  dismissText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default WellnessScoreOptInCard;
