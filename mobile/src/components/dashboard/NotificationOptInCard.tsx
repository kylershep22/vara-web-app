/**
 * NotificationOptInCard
 * Reusable card for progressive notification opt-in on the Dashboard.
 * Matches WellnessScoreOptInCard visual pattern:
 * Dew Sage at 50% opacity, evergreenTeal left accent, 12px radius.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface NotificationOptInCardProps {
  category: 'insights' | 'milestones';
  onOptIn: () => void;
  onDismiss: () => void;
}

const CARD_CONTENT = {
  insights: {
    icon: 'lightbulb-on-outline' as const,
    title: 'Get Brain-Health Insights',
    description: 'Receive 2-3 insights per week from our content library to support your brain health journey.',
  },
  milestones: {
    icon: 'trophy-outline' as const,
    title: 'Celebrate Your Milestones',
    description: 'Get notified when you reach meaningful milestones — like your first week, first month, and beyond.',
  },
};

const NotificationOptInCard: React.FC<NotificationOptInCardProps> = ({
  category,
  onOptIn,
  onDismiss,
}) => {
  const content = CARD_CONTENT[category];

  const handleEnable = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOptIn();
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
            <Icon name={content.icon} size={22} color={Colors.evergreenTeal} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.description}>{content.description}</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnable}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Enable ${category} notifications`}
          >
            <Text style={styles.enableButtonText}>Enable</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Dismiss ${category} notification prompt`}
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
    backgroundColor: `${Colors.dewSage}80`,
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
    fontWeight: Typography.fontWeight.semibold as any,
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
    fontWeight: Typography.fontWeight.semibold as any,
  },
  dismissText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
  },
});

export default NotificationOptInCard;
