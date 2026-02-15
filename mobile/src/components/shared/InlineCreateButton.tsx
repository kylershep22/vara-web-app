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

// Design tokens
const TOKENS = {
  colorPrimary: '#1B5E57',        // Evergreen Teal
  colorSecondary: '#B8CDBA',      // Silver Sage
  colorSectionBg: '#D5E3D1',      // Dew Sage
  radiusLg: 12,
  spacingBase: 16,
  spacingSm: 8,
  fontSizeLabel: 14,
};

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
    >
      <Icon name="plus" size={18} color={TOKENS.colorPrimary} />
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
    marginHorizontal: TOKENS.spacingBase,
    marginBottom: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: TOKENS.colorSecondary,
    borderRadius: TOKENS.radiusLg,
    gap: TOKENS.spacingSm,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: TOKENS.fontSizeLabel,
    fontWeight: '500',
    color: TOKENS.colorPrimary,
  },
});

export default InlineCreateButton;
