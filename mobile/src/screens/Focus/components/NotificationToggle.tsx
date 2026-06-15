/**
 * NotificationToggle Component
 * Toggle for silencing notifications during focus sessions
 *
 * Per Focus Page Spec Section 5.5:
 * - Container: Card-style row with shadow-sm
 * - Icon: Bell (off) / Bell-off (on), 20px
 * - Toggle: 48px wide, 28px tall, 200ms ease slide
 * - Labels: "Silence notifications" + helper text
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
  SizeTokens,
} from '../../../constants/designTokens';
import { FocusCopy } from '../../../constants/focusContent';

interface NotificationToggleProps {
  /** Whether notification silencing is enabled */
  isEnabled: boolean;
  /** Callback when toggle changes */
  onToggle: () => void;
  /** Whether notifications are currently silenced (active during timer) */
  isCurrentlyActive?: boolean;
}

export const NotificationToggle: React.FC<NotificationToggleProps> = ({
  isEnabled,
  onToggle,
  isCurrentlyActive = false,
}) => {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle();
  };

  const iconName = isEnabled ? 'bell-off' : 'bell';
  const iconColor = isEnabled ? ColorTokens.primary : ColorTokens.textSecondary;
  const helperText = isEnabled
    ? FocusCopy.notificationHelperOn
    : FocusCopy.notificationHelperOff;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handleToggle}
      activeOpacity={0.8}
      accessibilityRole="switch"
      accessibilityState={{ checked: isEnabled }}
      accessibilityLabel={`${FocusCopy.notificationLabel}, ${isEnabled ? 'on' : 'off'}`}
    >
      <View style={styles.leftContent}>
        <Icon name={iconName} size={20} color={iconColor} />
        <View style={styles.textContainer}>
          <Text style={styles.label}>{FocusCopy.notificationLabel}</Text>
          <Text style={styles.helper}>{helperText}</Text>
        </View>
      </View>

      <Switch
        value={isEnabled}
        onValueChange={handleToggle}
        trackColor={{
          false: ColorTokens.secondary,
          true: ColorTokens.primary,
        }}
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

export default NotificationToggle;
