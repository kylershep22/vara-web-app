/**
 * Streak Milestone Modal
 * Full-screen celebration modal for streak milestones (7, 30, 100 days)
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
    title: 'One Week Strong!',
    subtitle: 'You\'ve built real momentum. Keep it going!',
    emoji: '🔥',
    color: Colors.sunriseAmber,
  },
  30: {
    milestone: 30,
    title: 'Monthly Momentum!',
    subtitle: 'A full month of dedication. You\'re unstoppable!',
    emoji: '🌟',
    color: Colors.goldenApricot,
  },
  100: {
    milestone: 100,
    title: 'Century Club!',
    subtitle: '100 days of commitment. This is who you are now!',
    emoji: '👑',
    color: Colors.evergreenTeal,
  },
};

interface StreakMilestoneModalProps {
  visible: boolean;
  onDismiss: () => void;
  habitName: string;
  streakCount: number;
  milestone: 7 | 30 | 100;
}

const StreakMilestoneModal: React.FC<StreakMilestoneModalProps> = ({
  visible,
  onDismiss,
  habitName,
  streakCount,
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

          {/* Streak Number */}
          <Animated.View style={[styles.numberContainer, numberStyle]}>
            <Text style={[styles.streakNumber, { color: milestoneInfo.color }]}>
              {streakCount}
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
            <Text style={styles.buttonText}>Keep Going!</Text>
          </TouchableOpacity>

          {/* Decorative elements */}
          <View style={styles.decorativeContainer}>
            <Icon name="fire" size={20} color={Colors.sunriseAmber} style={styles.decorativeIcon} />
            <Icon name="star" size={16} color={Colors.goldenApricot} style={[styles.decorativeIcon, { top: 40, left: 30 }]} />
            <Icon name="star" size={14} color={Colors.silverSage} style={[styles.decorativeIcon, { top: 60, right: 25 }]} />
            <Icon name="lightning-bolt" size={18} color={Colors.sunriseAmber} style={[styles.decorativeIcon, { bottom: 80, left: 20 }]} />
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
    marginBottom: Spacing.md,
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
  streakNumber: {
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
    marginBottom: Spacing.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.lg * 1.5,
  },
  button: {
    paddingVertical: Spacing.md,
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
