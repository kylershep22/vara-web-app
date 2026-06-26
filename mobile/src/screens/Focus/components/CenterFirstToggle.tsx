/**
 * CenterFirstToggle (B-3c commit 5)
 * Opt-in row on the focus timer setup. When on, a short box breathing practice
 * runs before the focus session to help the user arrive at the task. Remembered
 * across sessions (the value is persisted by the parent). Silver Sage off, Teal
 * on, mirroring NotificationToggle.
 *
 * Copy is about arriving at the task, not winding down — deliberately calm and
 * non-clinical, no performance framing.
 */

import React from 'react';
import { View, StyleSheet, Switch, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
} from '../../../constants/designTokens';

const HEADING = 'Center first';
const BODY = 'A short box breathing practice to settle in before you focus.';

interface CenterFirstToggleProps {
  value: boolean;
  onToggle: (next: boolean) => void;
}

export const CenterFirstToggle: React.FC<CenterFirstToggleProps> = ({
  value,
  onToggle,
}) => {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!value);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleToggle}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${HEADING}, ${value ? 'on' : 'off'}`}
      testID="center-first-toggle"
    >
      <View style={styles.leftContent}>
        <Icon
          name="weather-windy"
          size={20}
          color={value ? ColorTokens.primary : ColorTokens.textSecondary}
        />
        <View style={styles.textContainer}>
          <Text style={styles.label}>{HEADING}</Text>
          <Text style={styles.helper}>{BODY}</Text>
        </View>
      </View>

      <Switch
        value={value}
        onValueChange={handleToggle}
        trackColor={{ false: ColorTokens.secondary, true: ColorTokens.primary }}
        thumbColor={ColorTokens.backgroundSurface}
        ios_backgroundColor={ColorTokens.secondary}
        style={styles.switch}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.lg,
    paddingVertical: 14,
    paddingHorizontal: SpacingTokens.base,
    marginBottom: SpacingTokens.base,
    ...ShadowTokens.sm,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: SpacingTokens.md,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textPrimary,
  },
  helper: {
    fontSize: 12,
    fontWeight: '400',
    color: ColorTokens.textSecondary,
    marginTop: 2,
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
});

export default CenterFirstToggle;
