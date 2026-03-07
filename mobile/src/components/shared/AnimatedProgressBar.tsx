/**
 * Animated Progress Bar Component
 * Enhanced progress bar with smooth animations and milestone markers
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { Milestone } from '../../types/models';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  color?: string;
  backgroundColor?: string;
  height?: number;
  showPercentage?: boolean;
  milestones?: Milestone[];
  showMilestoneMarkers?: boolean;
  onMilestonePress?: (milestone: Milestone) => void;
  style?: any;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  color = Colors.evergreenTeal,
  backgroundColor = Colors.borderLight,
  height = 8,
  showPercentage = true,
  milestones = [],
  showMilestoneMarkers = true,
  onMilestonePress,
  style,
}) => {
  const reduceMotion = useReducedMotion();
  const animatedProgress = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Animate progress changes
  useEffect(() => {
    if (reduceMotion) {
      animatedProgress.value = clampedProgress;
    } else {
      animatedProgress.value = withTiming(clampedProgress, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [clampedProgress, reduceMotion]);

  // Animated style for the fill bar
  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  // Sort milestones by target progress
  const sortedMilestones = [...milestones]
    .filter((m) => m.targetProgress !== undefined)
    .sort((a, b) => (a.targetProgress || 0) - (b.targetProgress || 0));

  return (
    <View style={style}>
      {/* Progress bar container */}
      <View style={[styles.container, { height, backgroundColor }]}>
        {/* Animated fill */}
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color },
            animatedFillStyle,
          ]}
        />

        {/* Milestone markers */}
        {showMilestoneMarkers &&
          sortedMilestones.map((milestone) => (
            <MilestoneMarker
              key={milestone.id}
              milestone={milestone}
              currentProgress={clampedProgress}
              barHeight={height}
              onPress={onMilestonePress}
            />
          ))}
      </View>

      {/* Percentage text */}
      {showPercentage && (
        <Text style={styles.percentageText}>
          {Math.round(clampedProgress)}% complete
        </Text>
      )}
    </View>
  );
};

// Milestone marker component
interface MilestoneMarkerProps {
  milestone: Milestone;
  currentProgress: number;
  barHeight: number;
  onPress?: (milestone: Milestone) => void;
}

const MilestoneMarker: React.FC<MilestoneMarkerProps> = ({
  milestone,
  currentProgress,
  barHeight,
  onPress,
}) => {
  const targetProgress = milestone.targetProgress || 0;
  const isCompleted = milestone.completed || currentProgress >= targetProgress;
  const markerSize = barHeight + 8;

  return (
    <View
      style={[
        styles.milestoneMarker,
        {
          left: `${targetProgress}%`,
          width: markerSize,
          height: markerSize,
          marginLeft: -markerSize / 2,
          marginTop: -4,
        },
      ]}
    >
      <View
        style={[
          styles.markerCircle,
          {
            width: markerSize,
            height: markerSize,
            borderRadius: markerSize / 2,
            backgroundColor: isCompleted ? Colors.evergreenTeal : Colors.surface,
            borderColor: isCompleted ? Colors.evergreenTeal : Colors.borderLight,
          },
        ]}
      >
        {isCompleted && (
          <Icon
            name="check"
            size={markerSize - 6}
            color={Colors.textOnPrimary}
          />
        )}
      </View>
    </View>
  );
};

// Compact version for dashboard cards
interface CompactProgressBarProps {
  progress: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: any;
}

export const CompactProgressBar: React.FC<CompactProgressBarProps> = ({
  progress,
  color = Colors.evergreenTeal,
  backgroundColor = Colors.borderLight,
  height = 6,
  style,
}) => {
  const reduceMotion = useReducedMotion();
  const animatedProgress = useSharedValue(0);
  const clampedProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    if (reduceMotion) {
      animatedProgress.value = clampedProgress;
    } else {
      animatedProgress.value = withTiming(clampedProgress, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [clampedProgress, reduceMotion]);

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  return (
    <View style={[styles.compactContainer, { height, backgroundColor }, style]}>
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color },
          animatedFillStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Layout.borderRadius.sm,
    overflow: 'visible', // Allow milestone markers to overflow
    marginBottom: Spacing.xs,
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: Layout.borderRadius.sm,
  },
  percentageText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
  },
  milestoneMarker: {
    position: 'absolute',
    top: 0,
    zIndex: 1,
  },
  markerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  compactContainer: {
    borderRadius: Layout.borderRadius.sm,
    overflow: 'hidden',
  },
});

export default AnimatedProgressBar;
