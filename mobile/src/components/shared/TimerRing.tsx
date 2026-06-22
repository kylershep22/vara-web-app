/**
 * TimerRing Component
 * Circular progress ring for timers using SVG
 *
 * Per Focus Page Spec Section 5.3:
 * - Track: color-secondary at 25% opacity, 5px stroke (Pomodoro) / 4px (Player)
 * - Progress fill: color-primary by default, configurable via fillColor prop
 * - Direction: Clockwise from 12 o'clock (SVG rotate -90°)
 * - Animation: strokeDashoffset animated via Animated.Value
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { ColorTokens, AnimationTokens } from '../../constants/designTokens';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface TimerRingProps {
  /** Diameter of the ring in pixels */
  diameter: number;
  /** Stroke width for both track and progress */
  strokeWidth: number;
  /** Progress value from 0 to 1 */
  progress: number;
  /** Fill color for the progress arc (defaults to primary) */
  fillColor?: string;
  /** Track color (defaults to secondary at 25% opacity) */
  trackColor?: string;
  /** Children to render in center of ring */
  children?: React.ReactNode;
  /** Whether to animate progress changes */
  animated?: boolean;
}

export const TimerRing: React.FC<TimerRingProps> = ({
  diameter,
  strokeWidth,
  progress,
  fillColor = ColorTokens.primary,
  trackColor = ColorTokens.secondaryLight,
  children,
  animated = true,
}) => {
  const reduceMotion = useReducedMotion();
  const animatedProgress = useRef(new Animated.Value(progress)).current;

  // Calculate SVG dimensions
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = diameter / 2;

  // Animate progress changes
  useEffect(() => {
    if (!animated || reduceMotion) {
      animatedProgress.setValue(progress);
    } else {
      Animated.timing(animatedProgress, {
        toValue: progress,
        duration: AnimationTokens.durationTimer,
        useNativeDriver: true,
      }).start();
    }
  }, [progress, animated, reduceMotion]);

  // Calculate stroke dash offset from progress
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.container, { width: diameter, height: diameter }]}>
      <Svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        style={styles.svg}
      >
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default TimerRing;
