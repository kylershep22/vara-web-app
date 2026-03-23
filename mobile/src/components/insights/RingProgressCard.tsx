/**
 * Ring Progress Card
 * Card with three animated ring progress indicators for Goals, Habits, and Tasks
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  apricot: '#F5B971',
  silverSage: '#B8CDBA',
  dewSage: '#D5E3D1',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

interface RingMetric {
  label: string;
  subLabel: string;
  percentage: number;
  color: string;
}

interface RingProgressCardProps {
  goals: { percentage: number };
  habits: { percentage: number };
  tasks: { percentage: number };
  totalCheckIns?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProgressRing: React.FC<{
  percentage: number;
  color: string;
  label: string;
  subLabel: string;
  size?: number;
  delay?: number;
}> = ({ percentage, color, label, subLabel, size = 54, delay = 0 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(percentage / 100, {
        duration: 1100,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      })
    );
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - progress.value * circumference,
  }));

  return (
    <View style={styles.ringItem}>
      <View style={styles.ringWrapper}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={VARA_COLORS.dewSage}
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </Svg>
        <View style={[styles.ringValueContainer, { width: size, height: size }]}>
          <Text style={styles.ringValue}>{Math.round(percentage)}%</Text>
        </View>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
      <Text style={styles.ringSubLabel}>{subLabel}</Text>
    </View>
  );
};

export const RingProgressCard: React.FC<RingProgressCardProps> = ({
  goals,
  habits,
  tasks,
  totalCheckIns,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="target" size={18} color={VARA_COLORS.teal} />
        </View>
        <Text style={styles.title}>Goal & habit progress</Text>
      </View>

      {/* Ring indicators */}
      <View style={styles.ringsRow}>
        <ProgressRing
          percentage={goals.percentage}
          color={VARA_COLORS.teal}
          label="Goals"
          subLabel="Avg completion"
          delay={0}
        />
        <ProgressRing
          percentage={habits.percentage}
          color={VARA_COLORS.apricot}
          label="Habits"
          subLabel="Success rate"
          delay={120}
        />
        <ProgressRing
          percentage={tasks.percentage}
          color={VARA_COLORS.silverSage}
          label="Tasks"
          subLabel="Completed"
          delay={240}
        />
      </View>

      {totalCheckIns !== undefined && totalCheckIns < 3 &&
        [goals.percentage, habits.percentage, tasks.percentage].filter(p => p === 0).length >= 2 && (
        <View style={styles.nudge}>
          <Text style={styles.nudgeText}>
            Check-ins and completed habits will build this out over time.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: VARA_COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: VARA_COLORS.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  ringItem: {
    alignItems: 'center',
  },
  ringWrapper: {
    position: 'relative',
    marginBottom: 6,
  },
  ringValueContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: 16,
    fontWeight: '700',
    color: VARA_COLORS.charcoal,
  },
  ringLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
  },
  ringSubLabel: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
    marginTop: -2,
  },
  nudge: {
    backgroundColor: 'rgba(213,227,209,0.38)',
    borderLeftWidth: 2.5,
    borderLeftColor: VARA_COLORS.teal,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  nudgeText: {
    fontSize: 10,
    fontWeight: '400',
    color: VARA_COLORS.charcoal,
    lineHeight: 16,
  },
});

export default RingProgressCard;
