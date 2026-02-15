/**
 * BaseCard Component
 * Unified card wrapper used across Goals, Habits, and Tasks
 *
 * Per Vara Mobile UI Standards:
 * - Background: White (#FFFFFF)
 * - Border radius: radius-lg (12px)
 * - Padding: 20px all sides
 * - Shadow: shadow-sm
 * - Gap between cards: 10px
 * - Press state: scale to 0.98 with 150ms ease-out
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  ViewStyle,
} from 'react-native';

// Design tokens
const TOKENS = {
  colorSurface: '#FFFFFF',
  radiusLg: 12,
  padding: 20,
  gap: 10,
};

interface BaseCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  /** Whether to show press animation */
  animated?: boolean;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Accessibility hint for additional context */
  accessibilityHint?: string;
}

export const BaseCard: React.FC<BaseCardProps> = ({
  children,
  onPress,
  style,
  animated = true,
  testID,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  if (onPress) {
    return (
      <Animated.View
        style={[
          styles.card,
          style,
          animated && { transform: [{ scale: scaleAnim }] },
        ]}
        testID={testID}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={styles.touchable}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View
      style={[styles.card, style]}
      testID={testID}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: TOKENS.colorSurface,
    borderRadius: TOKENS.radiusLg,
    padding: TOKENS.padding,
    marginBottom: TOKENS.gap,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  touchable: {
    flex: 1,
  },
});

export default BaseCard;
