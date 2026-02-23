/**
 * CustomCheckbox Component
 * Styled checkbox following Vara design system
 *
 * Features:
 * - Custom styling for checked/unchecked states
 * - Smooth transitions
 * - Proper touch target (44x44px)
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface CustomCheckboxProps {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
  error?: boolean;
}

const CHECKBOX_SIZE = 22;
const TOUCH_TARGET_SIZE = 44;
const ANIMATION_DURATION = 200;

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onPress,
  disabled = false,
  error = false,
}) => {
  const reduceMotion = useReducedMotion();
  const animValue = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = reduceMotion ? 0 : ANIMATION_DURATION;

    Animated.timing(animValue, {
      toValue: checked ? 1 : 0,
      duration,
      useNativeDriver: false, // Required for color interpolation
    }).start();
  }, [checked, reduceMotion]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: false, // Keep consistent with other animations
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: false,
    }).start();
  };

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.evergreenTeal],
  });

  const checkOpacity = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const borderColor = error && !checked
    ? Colors.error
    : checked
    ? Colors.evergreenTeal
    : Colors.silverSage;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={styles.touchTarget}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <Animated.View
        style={[
          styles.checkbox,
          {
            backgroundColor,
            borderColor,
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View style={{ opacity: checkOpacity }}>
          <Icon name="check" size={14} color={Colors.white} />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    width: TOUCH_TARGET_SIZE,
    height: TOUCH_TARGET_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomCheckbox;
