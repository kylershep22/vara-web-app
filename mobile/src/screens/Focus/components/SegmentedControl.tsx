/**
 * SegmentedControl Component
 * Custom brand-compliant tab selector with animated white pill indicator
 *
 * Per Focus Page Spec Section 4.1:
 * - Track: color-surface-tinted at 50% opacity
 * - Selected indicator: Animated white pill with shadow-sm
 * - Animation: 250ms ease-out on tab switch
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  AccessibilityInfo,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ColorTokens, SpacingTokens, RadiusTokens, ShadowTokens, AnimationTokens } from '../../../tokens/design-tokens';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface SegmentOption {
  value: string;
  label: string;
  icon?: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedValue,
  onValueChange,
}) => {
  const reduceMotion = useReducedMotion();
  const translateX = useRef(new Animated.Value(0)).current;
  const trackWidth = useRef(0);
  const selectedIndex = options.findIndex(opt => opt.value === selectedValue);

  // Calculate pill position based on selected index
  useEffect(() => {
    if (trackWidth.current > 0) {
      const trackPadding = 3;
      const pillWidth = (trackWidth.current - trackPadding * 2) / options.length;
      const targetX = trackPadding + selectedIndex * pillWidth;

      if (reduceMotion) {
        translateX.setValue(targetX);
      } else {
        Animated.timing(translateX, {
          toValue: targetX,
          duration: AnimationTokens.durationMedium,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [selectedIndex, reduceMotion]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    trackWidth.current = width;

    // Set initial position without animation
    const trackPadding = 3;
    const pillWidth = (width - trackPadding * 2) / options.length;
    const initialX = trackPadding + selectedIndex * pillWidth;
    translateX.setValue(initialX);
  };

  const handlePress = (value: string) => {
    if (value !== selectedValue) {
      Haptics.selectionAsync();
      onValueChange(value);
    }
  };

  const trackPadding = 3;
  const pillWidth = trackWidth.current > 0
    ? (trackWidth.current - trackPadding * 2) / options.length
    : 100; // fallback for initial render

  return (
    <View
      style={styles.track}
      onLayout={handleLayout}
      accessibilityRole="tablist"
    >
      {/* Animated white pill indicator */}
      <Animated.View
        style={[
          styles.pill,
          {
            width: pillWidth - 1, // Slight adjustment for visual fit
            transform: [{ translateX }],
          },
        ]}
      />

      {/* Tab buttons */}
      {options.map((option, index) => {
        const isSelected = option.value === selectedValue;

        return (
          <TouchableOpacity
            key={option.value}
            style={styles.tab}
            onPress={() => handlePress(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
            activeOpacity={0.7}
          >
            {option.icon && (
              <Icon
                name={option.icon as any}
                size={16}
                color={isSelected ? ColorTokens.primary : ColorTokens.textSecondary}
                style={styles.tabIcon}
              />
            )}
            <Text
              style={[
                styles.tabText,
                isSelected && styles.tabTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: ColorTokens.surfaceTintedLight,
    borderRadius: RadiusTokens.lg,
    height: 46,
    padding: 3,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: 10, // radius-lg minus track padding
    ...ShadowTokens.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    minHeight: 48, // Minimum touch target
  },
  tabIcon: {
    marginRight: SpacingTokens.xs,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textSecondary,
  },
  tabTextSelected: {
    color: ColorTokens.primary,
  },
});

export default SegmentedControl;
