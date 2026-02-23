/**
 * DotScaleSelector Component
 * A 1-10 scale selector using dots for the onboarding check-in
 *
 * Specs:
 * - 10 dots, 28px diameter, 8px gap
 * - Inactive: Silver Sage at 40% opacity
 * - Active (filled to value): Evergreen Teal
 * - Touch target: 44px minimum
 * - Haptic feedback on change
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface DotScaleSelectorProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon?: string;
  lowLabel?: string;
  highLabel?: string;
  disabled?: boolean;
}

const DOT_COUNT = 10;
const DOT_SIZE = 28;
const DOT_GAP = 8;
const HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };

const DotScaleSelector: React.FC<DotScaleSelectorProps> = ({
  value,
  onChange,
  label,
  icon,
  lowLabel = 'Low',
  highLabel = 'High',
  disabled = false,
}) => {
  const handleDotPress = useCallback(
    (dotValue: number) => {
      if (disabled) return;

      // Provide haptic feedback
      Haptics.selectionAsync();

      // Update value
      onChange(dotValue);

      // Announce for accessibility
      AccessibilityInfo.announceForAccessibility(
        `${label}: ${dotValue} out of 10`
      );
    },
    [disabled, onChange, label]
  );

  return (
    <View style={styles.container}>
      {/* Label Row */}
      <View style={styles.labelRow}>
        <Text variant="bodyLarge" style={styles.label}>
          {label}
        </Text>
        {icon && (
          <Icon
            name={icon as any}
            size={24}
            color={Colors.evergreenTeal}
            style={styles.labelIcon}
          />
        )}
      </View>

      {/* Dots Container */}
      <View
        style={styles.dotsContainer}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} scale`}
        accessibilityValue={{
          min: 1,
          max: 10,
          now: value,
          text: `${value} out of 10`,
        }}
        accessibilityHint="Double tap to select, or swipe up and down to adjust"
      >
        <View style={styles.dotsRow}>
          {Array.from({ length: DOT_COUNT }, (_, index) => {
            const dotValue = index + 1;
            const isActive = dotValue <= value;

            return (
              <TouchableOpacity
                key={dotValue}
                onPress={() => handleDotPress(dotValue)}
                hitSlop={HIT_SLOP}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`${dotValue} out of 10`}
                accessibilityState={{ selected: isActive }}
                style={styles.dotTouchTarget}
              >
                <View
                  style={[
                    styles.dot,
                    isActive ? styles.dotActive : styles.dotInactive,
                    disabled && styles.dotDisabled,
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Low/High Labels */}
      <View style={styles.scaleLabelsRow}>
        <Text variant="labelSmall" style={styles.scaleLabel}>
          {lowLabel}
        </Text>
        <Text variant="labelSmall" style={styles.scaleLabel}>
          {highLabel}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  label: {
    color: Colors.softCharcoal,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.lg,
  },
  labelIcon: {
    marginLeft: Spacing.sm,
  },
  dotsContainer: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dotTouchTarget: {
    padding: 4, // Extra touch area
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dotActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  dotInactive: {
    backgroundColor: `${Colors.silverSage}66`, // 40% opacity (66 in hex)
  },
  dotDisabled: {
    opacity: 0.5,
  },
  scaleLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  scaleLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default DotScaleSelector;
