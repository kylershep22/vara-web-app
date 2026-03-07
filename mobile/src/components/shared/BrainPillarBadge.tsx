/**
 * Brain Pillar Badge Component
 * Displays brain health pillar with color-coded background and icon
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainPillar } from '../../types/models';

interface BrainPillarBadgeProps {
  pillar: BrainPillar;
  showIcon?: boolean;
  style?: any;
}

// Pillar display metadata (accessible names with scientific context)
const PILLAR_METADATA: Record<BrainPillar, { label: string; icon: string; description: string }> = {
  growth: {
    label: 'Growth',
    icon: 'sprout',
    description: 'Learning & adaptation (neuroplasticity)',
  },
  energy: {
    label: 'Energy',
    icon: 'lightning-bolt',
    description: 'Vitality & recharge (neuroenergy)',
  },
  focus: {
    label: 'Focus',
    icon: 'eye-circle',
    description: 'Attention & clarity (neurofocus)',
  },
  resilience: {
    label: 'Resilience',
    icon: 'shield-check',
    description: 'Recovery & strength (neuroresilience)',
  },
  connection: {
    label: 'Connection',
    icon: 'account-heart',
    description: 'Relationships & belonging (neurosocial)',
  },
};

export const BrainPillarBadge: React.FC<BrainPillarBadgeProps> = ({
  pillar,
  showIcon = true,
  style,
}) => {
  const metadata = PILLAR_METADATA[pillar];
  const backgroundColor = Colors.brainPillars[pillar] + '20'; // 20% opacity
  const textColor = Colors.brainPillars[pillar];

  return (
    <View style={[styles.badge, { backgroundColor }, style]}>
      {showIcon && (
        <Icon name={metadata.icon} size={12} color={textColor} style={styles.icon} />
      )}
      <Text style={[styles.text, { color: textColor }]}>
        {metadata.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  text: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});
