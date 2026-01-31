/**
 * Auth Header Component
 * Reusable header for authentication screens
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  icon?: string;
  iconSize?: number;
  iconColor?: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconSize = 48,
  iconColor = Colors.evergreenTeal,
}) => {
  return (
    <View style={styles.container}>
      {icon && (
        <Icon
          name={icon}
          size={iconSize}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text variant="displayMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        {subtitle}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  icon: {
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
