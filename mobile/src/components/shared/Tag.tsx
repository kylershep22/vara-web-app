/**
 * Tag Component
 * Reusable tag/chip following Vara Mobile UI Standards v1.0
 *
 * Usage:
 * - Tags use radius-sm (4px)
 * - Padding: 4px horizontal (xs), 2px vertical (2xs)
 * - Font: 12px Caption, Medium (500)
 * - Colors: Brand-aligned, soft tints for backgrounds
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

export type TagVariant = 'default' | 'teal' | 'sage' | 'amber' | 'coral' | 'lavender';

interface TagProps {
  /** Text to display in the tag */
  label: string;
  /** Visual variant determining colors */
  variant?: TagVariant;
  /** Optional icon to display before the label */
  icon?: string;
  /** Whether the tag is selected/active */
  selected?: boolean;
  /** Callback when tag is pressed (makes it interactive) */
  onPress?: () => void;
  /** Whether the tag can be dismissed (shows X icon) */
  dismissible?: boolean;
  /** Callback when dismiss is pressed */
  onDismiss?: () => void;
  /** Optional custom styles */
  style?: ViewStyle;
}

// Variant color configurations
const VARIANT_COLORS: Record<TagVariant, { bg: string; text: string; selectedBg: string }> = {
  default: {
    bg: Colors.dewSage,
    text: Colors.softCharcoal,
    selectedBg: Colors.evergreenTeal,
  },
  teal: {
    bg: Colors.mintCream,
    text: Colors.evergreenTeal,
    selectedBg: Colors.evergreenTeal,
  },
  sage: {
    bg: Colors.dewSage,
    text: Colors.mutedSageGray,
    selectedBg: Colors.silverSage,
  },
  amber: {
    bg: Colors.priority.medium, // Soft amber tint
    text: Colors.softCharcoal,
    selectedBg: Colors.sunriseAmber,
  },
  coral: {
    bg: Colors.priority.high, // Soft coral tint
    text: Colors.softCharcoal,
    selectedBg: Colors.error,
  },
  lavender: {
    bg: Colors.lavenderMist + '30', // 30% opacity
    text: Colors.softCharcoal,
    selectedBg: Colors.lavenderMist,
  },
};

export const Tag: React.FC<TagProps> = ({
  label,
  variant = 'default',
  icon,
  selected = false,
  onPress,
  dismissible = false,
  onDismiss,
  style,
}) => {
  const colors = VARIANT_COLORS[variant];
  const backgroundColor = selected ? colors.selectedBg : colors.bg;
  const textColor = selected ? Colors.white : colors.text;

  const content = (
    <View style={[styles.container, { backgroundColor }, style]}>
      {icon && (
        <Icon
          name={icon}
          size={Layout.iconSize.xs}
          color={textColor}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, { color: textColor }]}>
        {label}
      </Text>
      {dismissible && (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          style={styles.dismissButton}
        >
          <Icon
            name="close"
            size={12}
            color={textColor}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    // radius-sm (4px) per UI standards
    borderRadius: Layout.borderRadius.sm,
    // xs (4px) horizontal, 2xs (2px) vertical per UI standards
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing['2xs'],
  },
  icon: {
    marginRight: Spacing['2xs'],
  },
  label: {
    // Caption: 12px, Medium (500)
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: Typography.letterSpacing.wide,
  },
  dismissButton: {
    marginLeft: Spacing['2xs'],
  },
});

export default Tag;
