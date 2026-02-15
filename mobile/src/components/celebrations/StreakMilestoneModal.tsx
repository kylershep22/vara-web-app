/**
 * Consistency Milestone Modal
 * Full-screen celebration modal for consistency milestones (7, 30, 100 days)
 *
 * Design Philosophy: Celebrates patterns over perfection, growth over streaks.
 * Aligns with Vara's "Progress Without Pressure" brand pillar.
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface MilestoneInfo {
  milestone: 7 | 30 | 100;
  title: string;
  subtitle: string;
  emoji: string;
  color: string;
}

const MILESTONE_INFO: { [key: number]: MilestoneInfo } = {
  7: {
    milestone: 7,
    title: '7 Days of Showing Up!',
    subtitle: 'You\'re building a rhythm. This is how habits take root.',
    emoji: '🌱',
    color: Colors.evergreenTeal,
  },
  30: {
    milestone: 30,
    title: 'A Month of Growth!',
    subtitle: 'Thirty days of consistency. You\'re becoming who you want to be.',
    emoji: '🌿',
    color: Colors.evergreenTeal,
  },
  100: {
    milestone: 100,
    title: '100 Days of Commitment!',
    subtitle: 'This is no longer something you do—it\'s part of who you are.',
    emoji: '🌳',
    color: Colors.evergreenTeal,
  },
};

interface StreakMilestoneModalProps {
  visible: boolean;
  onDismiss: () => void;
  habitName: string;
  /** Number of days of consistency (kept as streakCount for backward compatibility) */
  streakCount: number;
  milestone: 7 | 30 | 100;
}

/**
 * ConsistencyMilestoneModal (exported as StreakMilestoneModal for backward compatibility)
 * Celebrates consistency milestones with growth-oriented messaging.
 */
const StreakMilestoneModal: React.FC<StreakMilestoneModalProps> = ({
  visible,
  onDismiss,
  habitName,
  streakCount: consistencyDays,
  milestone,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(0);
  const emojiScale = useSharedValue(1);
  const numberScale = useSharedValue(1);

  const milestoneInfo = MILESTONE_INFO[milestone] || MILESTONE_INFO[7];

  // Responsive modal width: 90% of screen width, max 400px, min 280px
  const modalWidth = Math.min(Math.max(screenWidth * 0.9 - Spacing.lg * 2, 280), 400);

  useEffect(() => {
    if (visible) {
      // Trigger success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Modal entrance animation
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });

      // Pulsing emoji animation
      emojiScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Number scale bounce
      numberScale.value = withSequence(
        withTiming(1.3, { duration: 300 }),
        withSpring(1, { damping: 10, stiffness: 150 })
      );
    } else {
      scale.value = 0;
      emojiScale.value = 1;
      numberScale.value = 1;
    }
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const numberStyle = useAnimatedStyle(() => ({
    transform: [{ scale: numberScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.modal, modalStyle, { width: modalWidth }]}>
          {/* Emoji with pulsing animation */}
          <Animated.Text style={[styles.emoji, emojiStyle]}>
            {milestoneInfo.emoji}
          </Animated.Text>

          {/* Title */}
          <Text variant="headlineLarge" style={[styles.title, { color: milestoneInfo.color }]}>
            {milestoneInfo.title}
          </Text>

          {/* Days Count */}
          <Animated.View style={[styles.numberContainer, numberStyle]}>
            <Text style={[styles.consistencyNumber, { color: milestoneInfo.color }]}>
              {consistencyDays}
            </Text>
            <Text style={styles.daysLabel}>days</Text>
          </Animated.View>

          {/* Habit Name */}
          <Text variant="titleMedium" style={styles.habitName}>
            {habitName}
          </Text>

          {/* Subtitle */}
          <Text variant="bodyLarge" style={styles.subtitle}>
            {milestoneInfo.subtitle}
          </Text>

          {/* Dismiss Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: milestoneInfo.color }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Keep Growing!</Text>
          </TouchableOpacity>

          {/* Decorative elements - growth themed */}
          <View style={styles.decorativeContainer}>
            <Icon name="leaf" size={20} color={Colors.evergreenTeal} style={styles.decorativeIcon} />
            <Icon name="flower" size={16} color={Colors.silverSage} style={[styles.decorativeIcon, { top: 40, left: 30 }]} />
            <Icon name="spa" size={14} color={Colors.silverSage} style={[styles.decorativeIcon, { top: 60, right: 25 }]} />
            <Icon name="sprout" size={18} color={Colors.evergreenTeal} style={[styles.decorativeIcon, { bottom: 80, left: 20 }]} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.xl,
    // Width is now set dynamically based on screen size
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  title: {
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  numberContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  consistencyNumber: {
    fontSize: 72,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 80,
  },
  daysLabel: {
    fontSize: Typography.fontSize.xl,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  habitName: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.lg * 1.5,
  },
  button: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl * 1.5,
    borderRadius: Layout.borderRadius.full,
  },
  buttonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  decorativeContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  decorativeIcon: {
    position: 'absolute',
    opacity: 0.3,
  },
});

export default StreakMilestoneModal;
