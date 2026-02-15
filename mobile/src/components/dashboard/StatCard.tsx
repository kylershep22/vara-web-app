/**
 * Stat Card Component
 * Displays a single statistic with label
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Card from '../Card';
import { Colors, Spacing, Typography } from '../../constants';

interface StatCardProps {
  value: number | string;
  label: string;
  color?: string;
  icon?: string;
  iconColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  color = Colors.evergreenTeal,
  icon,
  iconColor,
}) => {
  return (
    <Card style={styles.container} padding={Spacing.base}>
      {icon && (
        <Icon
          name={icon}
          size={24}
          color={iconColor || color}
          style={styles.icon}
        />
      )}
      <Text variant="headlineMedium" style={[styles.value, { color }]}>
        {value}
      </Text>
      <Text variant="bodySmall" style={styles.label}>
        {label}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  icon: {
    marginBottom: Spacing.xs,
  },
  value: {
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  label: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
