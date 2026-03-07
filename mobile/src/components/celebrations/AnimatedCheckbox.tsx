/**
 * Animated Checkbox with Haptic Feedback
 * Drop-in replacement for react-native-paper Checkbox with animations
 */

import React, { useCallback, useState, useRef } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const ACKNOWLEDGMENTS = ['Done.', 'Noted.', 'Captured.'];

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
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(status === 'checked' ? 1 : 0);
  const backgroundOpacity = useSharedValue(status === 'checked' ? 1 : 0);
  const [ackText, setAckText] = useState<string | null>(null);
  const ackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update animation values when status changes
  React.useEffect(() => {
    if (status === 'checked') {
      if (reduceMotion) {
        checkOpacity.value = 1;
        backgroundOpacity.value = 1;
      } else {
        checkOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        backgroundOpacity.value = withTiming(1, { duration: 150 });
      }
    } else {
      if (reduceMotion) {
        checkOpacity.value = 0;
        backgroundOpacity.value = 0;
      } else {
        checkOpacity.value = withTiming(0, { duration: 150 });
        backgroundOpacity.value = withTiming(0, { duration: 150 });
      }
    }
  }, [status]);

  const handlePress = useCallback(async () => {
    if (disabled) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!reduceMotion) {
      // Press down to 0.95, then release to 1.0 (no overshoot)
      scale.value = withSequence(
        withTiming(0.95, { duration: 50, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 150, easing: Easing.out(Easing.ease) })
      );
    }

    onPress();

    // Show brief acknowledgment text when checking (not unchecking)
    if (status !== 'checked') {
      const text = ACKNOWLEDGMENTS[Math.floor(Math.random() * ACKNOWLEDGMENTS.length)];
      setAckText(text);
      if (ackTimer.current) clearTimeout(ackTimer.current);
      ackTimer.current = setTimeout(() => setAckText(null), 1500);
    }
  }, [disabled, onPress, scale, status, reduceMotion]);

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
    <View style={styles.wrapper}>
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
      {ackText && (
        <Text style={styles.ackText}>{ackText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  ackText: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    marginLeft: 4,
  },
});

export default AnimatedCheckbox;
