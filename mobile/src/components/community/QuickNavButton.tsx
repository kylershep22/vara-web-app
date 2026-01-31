/**
 * Quick Navigation Button Component
 * Icon + label button for community navigation
 */

import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

interface QuickNavButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}

export const QuickNavButton: React.FC<QuickNavButtonProps> = ({
  icon,
  label,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Icon name={icon} size={24} color={Colors.evergreenTeal} />
      <Text variant="bodySmall" style={styles.text}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  text: {
    color: Colors.evergreenTeal,
    marginTop: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
});
