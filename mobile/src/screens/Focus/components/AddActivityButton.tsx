/**
 * AddActivityButton Component
 * Dashed-border button for adding activities to routine
 *
 * Per Focus Page Spec Section 6.4:
 * - Layout: Flex row with dashed icon square + label
 * - Icon container: 38px square, 1.5px dashed secondary border
 * - Icon: Plus, 18px, primary color
 * - Label: "Add an activity", 14px Medium, primary
 * - Tap area: full row width, 48px minimum height
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  SizeTokens,
  FocusCopy,
} from '../../../tokens/design-tokens';

interface AddActivityButtonProps {
  /** Callback when button is pressed */
  onPress: () => void;
}

export const AddActivityButton: React.FC<AddActivityButtonProps> = ({
  onPress,
}) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={FocusCopy.addActivityLabel}
    >
      <View style={styles.iconContainer}>
        <Icon
          name="plus"
          size={18}
          color={ColorTokens.primary}
        />
      </View>
      <Text style={styles.label}>{FocusCopy.addActivityLabel}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SpacingTokens.sm,
    marginTop: SpacingTokens.xs,
    minHeight: SizeTokens.touchTargetMin,
  },
  iconContainer: {
    width: SizeTokens.activityIconSquare,
    height: SizeTokens.activityIconSquare,
    borderRadius: RadiusTokens.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: ColorTokens.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SpacingTokens.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
});

export default AddActivityButton;
