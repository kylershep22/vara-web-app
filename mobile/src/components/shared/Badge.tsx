import React from 'react';
import { StyleSheet, View, ViewStyle, TextStyle, Text } from 'react-native';
import { Colors, Layout, Typography } from '../../constants';

export type BadgeVariant = 'default' | 'active' | 'category' | 'warm';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const BADGE_STYLES: Record<BadgeVariant, { bg: string; color: string; border?: string }> = {
  default: {
    bg: Colors.dewSageLight,
    color: Colors.evergreenTeal,
  },
  active: {
    bg: Colors.tealLight,
    color: Colors.evergreenTeal,
    border: Colors.tealMedium,
  },
  category: {
    bg: 'rgba(244,197,66,0.15)',
    color: '#9A7A1A',
  },
  warm: {
    bg: 'rgba(245,185,113,0.15)',
    color: '#8B6530',
  },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  style,
  textStyle,
}) => {
  const variantStyle = BADGE_STYLES[variant];

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: variantStyle.bg },
        variantStyle.border ? { borderWidth: 1, borderColor: variantStyle.border } : undefined,
        style,
      ]}
    >
      <Text style={[styles.label, { color: variantStyle.color }, textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Layout.borderRadius.sm,
    flexShrink: 0,
  },
  label: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default Badge;
