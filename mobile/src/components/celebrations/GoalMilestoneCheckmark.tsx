/**
 * Goal Milestone Checkmark Animation
 * Animated checkmark overlay for milestone completion
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const MESSAGES = [
  'You made progress on this.',
  'That took effort. It\'s done.',
  'Worth acknowledging.',
];

interface GoalMilestoneCheckmarkProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  onComplete?: () => void;
  duration?: number;
}

export const GoalMilestoneCheckmark: React.FC<GoalMilestoneCheckmarkProps> = ({
  visible,
  message,
  subMessage,
  onComplete,
  duration = 2000,
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  const displayMessage = message || MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (reduceMotion) {
        opacity.value = 1;
        scale.value = 1;
        checkScale.value = 1;
        checkOpacity.value = 1;
        textOpacity.value = 1;
      } else {
        opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
        checkScale.value = withDelay(
          150,
          withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) })
        );
        checkOpacity.value = withDelay(150, withTiming(1, { duration: 200 }));
        textOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));
      }

      const dismissTimer = setTimeout(() => {
        if (reduceMotion) {
          opacity.value = 0;
          scale.value = 0.3;
        } else {
          opacity.value = withTiming(0, { duration: 300 });
          scale.value = withTiming(0.8, { duration: 300 });
        }

        if (onComplete) {
          setTimeout(() => {
            runOnJS(onComplete)();
          }, reduceMotion ? 0 : 300);
        }
      }, duration);

      return () => clearTimeout(dismissTimer);
    } else {
      opacity.value = 0;
      scale.value = 0.3;
      checkScale.value = 0;
      checkOpacity.value = 0;
      textOpacity.value = 0;
    }
  }, [visible, duration, onComplete]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.container, containerStyle]}>
        <View style={styles.circle}>
          <Animated.View style={checkStyle}>
            <Icon
              name="check"
              size={48}
              color={Colors.textOnPrimary}
            />
          </Animated.View>
        </View>

        <Animated.View style={textStyle}>
          <Text style={styles.message}>{displayMessage}</Text>
          {subMessage && (
            <Text style={styles.subMessage}>{subMessage}</Text>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
};

// Inline checkmark for use within cards/modals
interface InlineCheckmarkProps {
  visible: boolean;
  size?: number;
  color?: string;
  onComplete?: () => void;
}

export const InlineCheckmark: React.FC<InlineCheckmarkProps> = ({
  visible,
  size = 24,
  color = Colors.evergreenTeal,
  onComplete,
}) => {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (reduceMotion) {
        scale.value = 1;
        opacity.value = 1;
      } else {
        scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
        opacity.value = withTiming(1, { duration: 150 });
      }

      if (onComplete) {
        setTimeout(onComplete, 600);
      }
    } else {
      if (reduceMotion) {
        scale.value = 0;
        opacity.value = 0;
      } else {
        scale.value = withTiming(0, { duration: 150 });
        opacity.value = withTiming(0, { duration: 150 });
      }
    }
  }, [visible, onComplete]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.inlineCheckmark, animatedStyle]}>
      <Icon name="check-circle" size={size} color={color} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
  },
  container: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Layout.shadow.lg,
  },
  message: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subMessage: {
    fontSize: 14,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    opacity: 0.9,
  },
  inlineCheckmark: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GoalMilestoneCheckmark;
