/**
 * InlineCreateButton Component
 * Replaces FAB for creating new items
 *
 * Per Vara Mobile UI Standards:
 * - Dashed border (1.5px, Silver Sage)
 * - Contextual label ("Add a goal", "Add a habit", "Add a task")
 * - Full width within 16px horizontal padding
 * - Height: 44px
 * - Border radius: radius-lg (12px)
 * - Press state: fill with Dew Sage at 30% opacity
 */

import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface InlineCreateButtonProps {
  label: string;
  onPress: () => void;
  /** Optional test ID */
  testID?: string;
}

export const InlineCreateButton: React.FC<InlineCreateButtonProps> = ({
  label,
  onPress,
  testID,
}) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <Icon name="plus" size={18} color={Colors.evergreenTeal} />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.lg,
    gap: Spacing.sm,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});

export default InlineCreateButton;
