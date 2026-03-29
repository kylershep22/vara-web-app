/**
 * Hero Summary Card
 * Top-of-page summary with ring progress for brain readiness
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  tealLight: '#2E8A80',
  amber: '#F4C542',
  white: '#FFFFFF',
};

interface HeroSummaryCardProps {
  readinessScore: number;
  checkInsCount: number;
  trend: 'up' | 'steady' | 'down';
  timeframeLabel: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RingProgress: React.FC<{ percentage: number; size: number; checkInsCount: number }> = ({
  percentage,
  size,
  checkInsCount,
}) => {
  const strokeWidth = 4.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(percentage / 100, {
      duration: 1100,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [percentage]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - progress.value * circumference,
  }));

  return (
    <View style={styles.ringContainer}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={VARA_COLORS.amber}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
      <View style={[styles.ringValueContainer, { width: size, height: size }]}>
        {checkInsCount === 0 ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.ringValueZero}>{'\u2014'}</Text>
            <Text style={styles.ringCheckInLabel}>check in</Text>
          </View>
        ) : (
          <Text style={styles.ringValue}>{percentage}%</Text>
        )}
      </View>
    </View>
  );
};

export const HeroSummaryCard: React.FC<HeroSummaryCardProps> = ({
  readinessScore,
  checkInsCount,
  trend,
  timeframeLabel,
}) => {
  const getTrendText = () => {
    switch (trend) {
      case 'up':
        return 'Trending up';
      case 'down':
        return 'Needs attention';
      default:
        return 'Trending steady';
    }
  };

  return (
    <LinearGradient
      colors={[VARA_COLORS.teal, VARA_COLORS.tealLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Decorative circles */}
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.textContent}>
          <Text style={styles.eyebrow}>{timeframeLabel} at a glance</Text>
          <Text style={styles.title}>Brain Readiness</Text>
          <Text style={[styles.subtitle, checkInsCount === 0 && styles.subtitleZero]}>
            {checkInsCount === 0
              ? 'Your score appears after your first check-in'
              : `${getTrendText()} \u00B7 ${checkInsCount} check-in${checkInsCount !== 1 ? 's' : ''}`
            }
          </Text>
        </View>

        <RingProgress percentage={readinessScore || 0} size={54} checkInsCount={checkInsCount} />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 8,
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    marginRight: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: VARA_COLORS.white,
    marginTop: 6,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 4,
  },
  ringContainer: {
    position: 'relative',
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
    color: VARA_COLORS.white,
  },
  ringValueZero: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  ringCheckInLabel: {
    fontSize: 7.5,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
    marginTop: -2,
  },
  subtitleZero: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 15,
  },
});

export { HeroSummaryCard };
