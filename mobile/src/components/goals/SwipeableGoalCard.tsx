/**
 * Swipeable Goal Card Component
 * Dashboard card with swipe-to-reveal progress actions
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CompactProgressBar } from '../shared/AnimatedProgressBar';
import { Goal } from '../../types/models';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = Spacing.lg * 2;
const ACTION_BUTTON_WIDTH = 70;
const MAX_REVEAL_WIDTH = ACTION_BUTTON_WIDTH * 3 + Spacing.sm * 2; // 3 buttons + gaps
const HAPTIC_THRESHOLD = MAX_REVEAL_WIDTH * 0.3;

interface SwipeableGoalCardProps {
  goal: Goal;
  isRevealed: boolean;
  onRevealChange: (goalId: string, revealed: boolean) => void;
  onProgressUpdate: (goalId: string, increment: number) => void;
  onMoreOptions: (goal: Goal) => void;
  onPress?: (goal: Goal) => void;
}

export const SwipeableGoalCard: React.FC<SwipeableGoalCardProps> = ({
  goal,
  isRevealed,
  onRevealChange,
  onProgressUpdate,
  onMoreOptions,
  onPress,
}) => {
  const reduceMotion = useReducedMotion();
  const translateX = useSharedValue(0);
  const hapticTriggered = useSharedValue(false);

  // Sync external revealed state with animation
  React.useEffect(() => {
    if (isRevealed) {
      if (reduceMotion) {
        translateX.value = MAX_REVEAL_WIDTH;
      } else {
        translateX.value = withTiming(MAX_REVEAL_WIDTH, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
      }
    } else {
      if (reduceMotion) {
        translateX.value = 0;
      } else {
        translateX.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
      }
      hapticTriggered.value = false;
    }
  }, [isRevealed, reduceMotion]);

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleRevealChange = useCallback(
    (revealed: boolean) => {
      onRevealChange(goal.id, revealed);
    },
    [goal.id, onRevealChange]
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX(15) // Minimum horizontal movement to activate
    .failOffsetY([-15, 15]) // Fail if vertical movement is significant
    .onUpdate((event) => {
      // Only allow right swipe (positive X)
      const newX = Math.max(0, Math.min(event.translationX, MAX_REVEAL_WIDTH));
      translateX.value = newX;

      // Trigger haptic at threshold
      if (newX >= HAPTIC_THRESHOLD && !hapticTriggered.value) {
        runOnJS(triggerHaptic)();
        hapticTriggered.value = true;
      } else if (newX < HAPTIC_THRESHOLD) {
        hapticTriggered.value = false;
      }
    })
    .onEnd((event) => {
      // Snap open or closed based on position and velocity
      const shouldOpen =
        translateX.value > MAX_REVEAL_WIDTH / 2 || event.velocityX > 500;

      if (shouldOpen) {
        translateX.value = withTiming(MAX_REVEAL_WIDTH, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
        runOnJS(handleRevealChange)(true);
      } else {
        translateX.value = withTiming(0, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        });
        runOnJS(handleRevealChange)(false);
        hapticTriggered.value = false;
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, MAX_REVEAL_WIDTH * 0.3, MAX_REVEAL_WIDTH],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    ),
  }));

  const handleIncrement = useCallback(
    (increment: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onProgressUpdate(goal.id, increment);
      // Close after action
      onRevealChange(goal.id, false);
    },
    [goal.id, onProgressUpdate, onRevealChange]
  );

  const handleMore = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMoreOptions(goal);
    // Close after action
    onRevealChange(goal.id, false);
  }, [goal, onMoreOptions, onRevealChange]);

  const handleCardPress = useCallback(() => {
    if (isRevealed) {
      // Close if revealed
      onRevealChange(goal.id, false);
    } else if (onPress) {
      onPress(goal);
    }
  }, [goal, isRevealed, onPress, onRevealChange]);

  const isDisabled = goal.status !== 'active';
  const canIncrement = goal.progress < 100 && !isDisabled;

  return (
    <View style={styles.container}>
      {/* Action buttons (behind the card) */}
      <Animated.View style={[styles.actionsContainer, actionsAnimatedStyle]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButton10]}
          onPress={() => handleIncrement(10)}
          disabled={!canIncrement || goal.progress + 10 > 100}
        >
          <Text style={styles.actionButtonText}>+10%</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButton25]}
          onPress={() => handleIncrement(25)}
          disabled={!canIncrement || goal.progress + 25 > 100}
        >
          <Text style={styles.actionButtonText}>+25%</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonMore]}
          onPress={handleMore}
        >
          <Icon name="dots-horizontal" size={24} color={Colors.textOnPrimary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, cardAnimatedStyle]}>
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={handleCardPress}
            style={styles.cardContent}
          >
            {/* Goal info */}
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text
                  style={[styles.title, isDisabled && styles.titleDisabled]}
                  numberOfLines={1}
                >
                  {goal.title}
                </Text>
                {goal.status === 'completed' && (
                  <View style={styles.completedBadge}>
                    <Icon name="check" size={12} color={Colors.textOnPrimary} />
                  </View>
                )}
              </View>
              <Text style={styles.progress}>{Math.round(goal.progress)}%</Text>
            </View>

            {/* Progress bar */}
            <CompactProgressBar
              progress={goal.progress}
              height={6}
              style={styles.progressBar}
            />

            {/* Swipe hint (only for active goals) */}
            {!isRevealed && goal.status === 'active' && (
              <View style={styles.swipeHint}>
                <Icon
                  name="gesture-swipe-right"
                  size={14}
                  color={Colors.textSecondary}
                />
                <Text style={styles.swipeHintText}>Swipe to log progress</Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: Spacing.base,
  },
  actionsContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.xs,
    gap: Spacing.xs,
  },
  actionButton: {
    width: ACTION_BUTTON_WIDTH,
    height: '80%',
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton10: {
    backgroundColor: Colors.evergreenTeal,
  },
  actionButton25: {
    backgroundColor: Colors.sunriseAmber,
  },
  actionButtonMore: {
    backgroundColor: Colors.silverSage,
  },
  actionButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    ...Layout.shadow.sm,
  },
  cardContent: {
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  titleDisabled: {
    color: Colors.textSecondary,
  },
  completedBadge: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  progress: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  progressBar: {
    marginBottom: Spacing.xs,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  swipeHintText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});

export default SwipeableGoalCard;
