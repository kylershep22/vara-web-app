/**
 * Goal Milestone Checkmark Animation
 * Animated checkmark overlay for milestone completion
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GoalMilestoneCheckmarkProps {
  visible: boolean;
  message?: string;
  subMessage?: string;
  onComplete?: () => void;
  duration?: number;
}

export const GoalMilestoneCheckmark: React.FC<GoalMilestoneCheckmarkProps> = ({
  visible,
  message = 'Milestone reached!',
  subMessage,
  onComplete,
  duration = 2000,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      opacity.value = withTiming(1, { duration: 200 });

      // Circle scales up with bounce
      scale.value = withSequence(
        withSpring(1.1, { damping: 12, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 180 })
      );

      // Checkmark appears after circle
      checkScale.value = withDelay(
        150,
        withSequence(
          withSpring(1.2, { damping: 10, stiffness: 200 }),
          withSpring(1, { damping: 15, stiffness: 180 })
        )
      );
      checkOpacity.value = withDelay(150, withTiming(1, { duration: 200 }));

      // Text fades in after checkmark
      textOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));

      // Auto-dismiss after duration
      const dismissTimer = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 });
        scale.value = withTiming(0.8, { duration: 300 });

        if (onComplete) {
          setTimeout(() => {
            runOnJS(onComplete)();
          }, 300);
        }
      }, duration);

      return () => clearTimeout(dismissTimer);
    } else {
      // Reset values when not visible
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
        {/* Checkmark circle */}
        <View style={styles.circle}>
          <Animated.View style={checkStyle}>
            <Icon
              name="check"
              size={48}
              color={Colors.textOnPrimary}
            />
          </Animated.View>
        </View>

        {/* Message text */}
        <Animated.View style={textStyle}>
          <Text style={styles.message}>{message}</Text>
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
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      scale.value = withSequence(
        withSpring(1.3, { damping: 10, stiffness: 200 }),
        withSpring(1, { damping: 15, stiffness: 180 })
      );
      opacity.value = withTiming(1, { duration: 150 });

      // Auto-complete callback
      if (onComplete) {
        setTimeout(onComplete, 600);
      }
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
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
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textOnPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subMessage: {
    fontSize: Typography.fontSize.sm,
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
