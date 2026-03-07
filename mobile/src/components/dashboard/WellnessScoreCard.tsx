/**
 * Wellness Score Card
 *
 * Prominent dashboard card showing the user's daily wellness score (0-100)
 * as a circular gauge with color coding. Tappable to expand and show
 * the pillar breakdown.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DailyWellnessScore } from '../../types';
import { getScoreColor, getScoreLabel } from '../../services/firebase';

interface WellnessScoreCardProps {
  score: DailyWellnessScore | null;
  loading?: boolean;
  onPress?: () => void;
  onRefresh?: () => void;
}

const CIRCLE_SIZE = 140;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const WellnessScoreCard: React.FC<WellnessScoreCardProps> = ({
  score,
  loading = false,
  onPress,
  onRefresh,
}) => {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  // Animate the score on mount or when score changes
  useEffect(() => {
    if (score?.score !== undefined) {
      // Animate the circular progress
      Animated.timing(animatedProgress, {
        toValue: score.score / 100,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Animate the number display
      let startValue = displayScore;
      const endValue = score.score;
      const duration = 1500;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
        setDisplayScore(currentValue);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      animate();
    }
  }, [score?.score]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  // Get color based on score
  const getColor = () => {
    if (!score) return Colors.borderLight;
    const colorType = getScoreColor(score.score);
    switch (colorType) {
      case 'error': return Colors.error;
      case 'warning': return Colors.sunriseAmber;
      case 'success': return Colors.evergreenTeal;
      default: return Colors.evergreenTeal;
    }
  };

  // Get trend icon and color
  const getTrendIcon = () => {
    if (!score?.trend) return null;
    switch (score.trend) {
      case 'up':
        return { icon: 'trending-up', color: Colors.success };
      case 'down':
        return { icon: 'trending-down', color: Colors.error };
      default:
        return { icon: 'minus', color: Colors.textSecondary };
    }
  };

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const scoreColor = getColor();
  const trendInfo = getTrendIcon();

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCircle} />
          <Text style={styles.loadingText}>Calculating your score...</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="leaf" size={20} color={Colors.evergreenTeal} />
          <Text style={styles.title}>Today's Wellness</Text>
        </View>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Icon name="refresh" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Score Circle */}
      <View style={styles.scoreContainer}>
        <View style={styles.circleContainer}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <G rotation="-90" origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}>
              {/* Background circle */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={Colors.borderLight}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
              />
              {/* Progress circle */}
              <AnimatedCircle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={RADIUS}
                stroke={scoreColor}
                strokeWidth={STROKE_WIDTH}
                fill="transparent"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </G>
          </Svg>

          {/* Score number in center */}
          <View style={styles.scoreTextContainer}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>
              {displayScore}
            </Text>
            <Text style={styles.scoreLabel}>
              {score ? getScoreLabel(score.score) : '--'}
            </Text>
          </View>
        </View>

        {/* Trend and insight */}
        <View style={styles.insightContainer}>
          {trendInfo && score?.previousScore !== undefined && (
            <View style={styles.trendRow}>
              <Icon name={trendInfo.icon} size={16} color={trendInfo.color} />
              <Text style={[styles.trendText, { color: trendInfo.color }]}>
                {score.trend === 'up' ? '+' : score.trend === 'down' ? '' : ''}
                {score.score - (score.previousScore || 0)} from yesterday
              </Text>
            </View>
          )}

          {score?.suggestion && (
            <View style={styles.suggestionRow}>
              <Icon name="lightbulb-outline" size={14} color={Colors.sunriseAmber} />
              <Text style={styles.suggestionText} numberOfLines={2}>
                {score.suggestion}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tap hint */}
      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap for details</Text>
        <Icon name="chevron-right" size={16} color={Colors.textSecondary} />
      </View>

      {/* Data completeness indicator with action count */}
      {score?.incompleteActions && score.incompleteActions.length > 0 && (
        <View style={styles.incompleteIndicator}>
          <Icon name="clipboard-list-outline" size={14} color={Colors.evergreenTeal} />
          <Text style={styles.incompleteText}>
            {score.incompleteActions.length} item{score.incompleteActions.length !== 1 ? 's' : ''} to track
          </Text>
        </View>
      )}

      {/* Progress bar */}
      {score?.dataCompleteness !== undefined && score.dataCompleteness < 100 && (
        <View style={styles.completenessBar}>
          <View
            style={[
              styles.completenessProgress,
              { width: `${score.dataCompleteness}%` },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Layout.shadow.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: Colors.borderLight,
    marginBottom: Spacing.base,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleContainer: {
    position: 'relative',
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreTextContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 48,
  },
  scoreLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: -2,
  },
  insightContainer: {
    flex: 1,
    marginLeft: Spacing.lg,
    justifyContent: 'center',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  trendText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  suggestionText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.4,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  tapHintText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  incompleteIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.evergreenTeal + '10',
    borderRadius: Layout.borderRadius.sm,
  },
  incompleteText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  completenessBar: {
    height: 2,
    backgroundColor: Colors.borderLight,
    borderRadius: 1,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  completenessProgress: {
    height: '100%',
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 1,
  },
});

export default WellnessScoreCard;
