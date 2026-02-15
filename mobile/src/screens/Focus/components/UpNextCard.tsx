/**
 * UpNextCard Component
 * Shows the next activity in routine player
 *
 * Per Focus Page Spec Section 7.7:
 * - Position: Bottom of screen, 16px margin, 32px above safe area
 * - Background: surface, radius-lg, shadow-sm
 * - "UP NEXT" label: 11px Semi-Bold, uppercase, 0.04em letter spacing
 * - Activity icon: 18px in 32px radius-md square
 * - Name: 14px Medium, text-primary
 * - Duration: 12px Regular, text-secondary
 * - Hidden on last activity
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  SizeTokens,
  FocusCopy,
} from '../../../tokens/design-tokens';
import { getActivityColor, getActivityColorWithOpacity } from './activityColors';

interface Activity {
  id: number | string;
  name: string;
  duration: number;
  icon: string;
  color: string;
}

interface UpNextCardProps {
  /** Next activity to display */
  activity: Activity;
}

export const UpNextCard: React.FC<UpNextCardProps> = ({ activity }) => {
  const activityColor = getActivityColor(activity.color);
  const iconBgColor = getActivityColorWithOpacity(activity.color, 0.15);

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Up next: ${activity.name}, ${activity.duration} minutes`}
    >
      <Text style={styles.label}>{FocusCopy.upNextLabel}</Text>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Icon
            name={activity.icon as any}
            size={18}
            color={activityColor}
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.name}>{activity.name}</Text>
          <Text style={styles.duration}>{`${activity.duration} min`}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.lg,
    padding: 14,
    ...ShadowTokens.sm,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: ColorTokens.textSecondary,
    letterSpacing: 0.04 * 11, // 0.04em
    textTransform: 'uppercase',
    marginBottom: SpacingTokens.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: SizeTokens.upNextIconSize,
    height: SizeTokens.upNextIconSize,
    borderRadius: RadiusTokens.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SpacingTokens.md,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textPrimary,
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    fontWeight: '400',
    color: ColorTokens.textSecondary,
  },
});

export default UpNextCard;
