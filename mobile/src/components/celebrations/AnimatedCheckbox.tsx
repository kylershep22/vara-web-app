/**
 * Animated Checkbox with Haptic Feedback
 * Drop-in replacement for react-native-paper Checkbox with animations
 */

import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants';

interface AnimatedCheckboxProps {
  status: 'checked' | 'unchecked' | 'indeterminate';
  onPress: () => void;
  color?: string;
  uncheckedColor?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({
  status,
  onPress,
  color = Colors.evergreenTeal,
  uncheckedColor = Colors.border,
  disabled = false,
  style,
}) => {
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(status === 'checked' ? 1 : 0);
  const backgroundOpacity = useSharedValue(status === 'checked' ? 1 : 0);

  // Update animation values when status changes
  React.useEffect(() => {
    if (status === 'checked') {
      checkOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      backgroundOpacity.value = withTiming(1, { duration: 150 });
    } else {
      checkOpacity.value = withTiming(0, { duration: 150 });
      backgroundOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [status]);

  const handlePress = useCallback(async () => {
    if (disabled) return;

    // Trigger haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate scale: press down (0.85) -> bounce up (1.15) -> settle (1.0)
    scale.value = withSequence(
      withTiming(0.85, { duration: 50, easing: Easing.out(Easing.ease) }),
      withSpring(1.15, { damping: 15, stiffness: 180 }),
      withSpring(1, { damping: 15, stiffness: 180 })
    );

    // Call the onPress handler
    onPress();
  }, [disabled, onPress, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolate(
      backgroundOpacity.value,
      [0, 1],
      [0, 1]
    ) === 1 ? color : 'transparent',
    borderColor: interpolate(
      backgroundOpacity.value,
      [0, 1],
      [0, 1]
    ) === 1 ? color : uncheckedColor,
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [
      { scale: interpolate(checkOpacity.value, [0, 1], [0.5, 1]) },
    ],
  }));

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={style}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: status === 'checked', disabled }}
      accessibilityLabel={status === 'checked' ? 'Checked' : 'Unchecked'}
    >
      <Animated.View style={[styles.container, containerStyle]}>
        <Animated.View style={[styles.checkbox, backgroundStyle]}>
          <Animated.Text style={[styles.checkmark, checkmarkStyle]}>
            ✓
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48, // Accessibility: minimum touch target size
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 28, // Slightly larger visual checkbox
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AnimatedCheckbox;
