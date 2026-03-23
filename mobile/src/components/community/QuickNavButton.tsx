/**
 * Quick Navigation Button Component
 * Icon + label button for community navigation
 */

import React from 'react';
import { StyleSheet, TouchableOpacity, View, Platform, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface QuickNavButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  subtitle?: string;
}

export const QuickNavButton: React.FC<QuickNavButtonProps> = ({
  icon,
  label,
  onPress,
  active = false,
  subtitle,
}) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, active && styles.iconContainerActive]}>
        <Icon
          name={icon as any}
          size={18}
          color={Colors.evergreenTeal}
        />
      </View>
      <Text style={[styles.text, active && styles.textActive]}>
        {label}
      </Text>
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}
      {active && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 80,
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.dewSageLight,
  },
  iconContainerActive: {
    backgroundColor: Colors.tealLight,
  },
  text: {
    color: Colors.mutedSageGray,
    marginTop: 6,
    fontSize: 12,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  textActive: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.mutedSageGray,
    marginTop: 2,
    fontSize: 9.5,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center' as const,
    lineHeight: 12,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 28,
    height: 3,
    backgroundColor: Colors.evergreenTeal,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
});
