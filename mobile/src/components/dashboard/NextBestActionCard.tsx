/**
 * Next Best Action Card
 *
 * Displays a single, intelligent recommendation for the user's next action.
 * Uses wellness score pillars and context to prioritize the most impactful action.
 *
 * Features:
 * - Pillar-aware recommendations (improves low-scoring areas)
 * - Time-of-day context (morning routines, evening wind-down)
 * - Personalized messaging with clear reasoning
 * - Single focused action, not a list
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DailyWellnessScore, Habit, Task, FourThreeTwoOneEntry } from '../../types/models';
import {
  getNextActionRecommendation,
  NextActionRecommendation,
  RecommendationContext,
} from '../../services/nextAction.service';

// Pillar labels for display
const PILLAR_LABELS: Record<string, string> = {
  foundation: 'Foundation',
  consistency: 'Consistency',
  mind: 'Mind',
  growth: 'Growth',
};

interface NextBestActionCardProps {
  // Wellness score for intelligent recommendations
  wellnessScore?: DailyWellnessScore | null;
  // User data for context
  habits: Habit[];
  tasks: Task[];
  completedTodayHabits: Set<string>;
  fourThreeTwoOne?: FourThreeTwoOneEntry | null;
  lastJournalDate?: Date | null;
  hasMorningCheckIn?: boolean;
  hasDailyPlan?: boolean;
  // Callbacks
  onGeneratePlan?: () => void;
  onMorningCheckIn?: () => void;
}

export const NextBestActionCard: React.FC<NextBestActionCardProps> = ({
  wellnessScore = null,
  habits,
  tasks,
  completedTodayHabits,
  fourThreeTwoOne = null,
  lastJournalDate = null,
  hasMorningCheckIn = false,
  hasDailyPlan = false,
  onGeneratePlan,
  onMorningCheckIn,
}) => {
  const navigation = useNavigation<any>();

  // Build context and get recommendation
  const recommendation = useMemo((): NextActionRecommendation => {
    const context: RecommendationContext = {
      wellnessScore,
      habits,
      completedTodayHabits,
      tasks,
      fourThreeTwoOne,
      lastJournalDate,
      hasMorningCheckIn,
      hasDailyPlan,
    };

    return getNextActionRecommendation(context);
  }, [
    wellnessScore,
    habits,
    completedTodayHabits,
    tasks,
    fourThreeTwoOne,
    lastJournalDate,
    hasMorningCheckIn,
    hasDailyPlan,
  ]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Handle special actions
    if (recommendation.type === 'morning_checkin' && onMorningCheckIn) {
      onMorningCheckIn();
      return;
    }

    // Navigate to the target screen
    if (recommendation.navigationTarget) {
      if (recommendation.navigationParams) {
        navigation.navigate(recommendation.navigationTarget, recommendation.navigationParams);
      } else {
        navigation.navigate(recommendation.navigationTarget);
      }
    }
  };

  // Determine if we should show the pillar badge
  const showPillarBadge = recommendation.pillarTarget && wellnessScore;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${recommendation.title}. ${recommendation.subtitle}. ${recommendation.actionLabel}`}
      style={styles.touchable}
    >
      <View style={[styles.container, { borderLeftColor: recommendation.accentColor }]}>
        {/* Pillar badge (shows which wellness pillar this improves) */}
        {showPillarBadge && (
          <View style={styles.pillarBadgeContainer}>
            <View style={[styles.pillarBadge, { backgroundColor: recommendation.accentColor + '15' }]}>
              <Text style={[styles.pillarBadgeText, { color: recommendation.accentColor }]}>
                Improves {PILLAR_LABELS[recommendation.pillarTarget!]}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${recommendation.iconColor}14` }]}>
            <Icon name={recommendation.icon as any} size={24} color={recommendation.iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{recommendation.title}</Text>
            <Text style={styles.subtitle} numberOfLines={2}>
              {recommendation.subtitle}
            </Text>
          </View>
          <View style={styles.actionContainer}>
            <Text style={[styles.actionLabel, { color: recommendation.accentColor }]}>
              {recommendation.actionLabel}
            </Text>
            <Icon name="chevron-right" size={20} color={recommendation.accentColor} />
          </View>
        </View>

        {/* Reason strip (subtle explanation) */}
        {recommendation.reason && (
          <View style={styles.reasonContainer}>
            <Icon name="lightbulb-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.reasonText}>{recommendation.reason}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    marginBottom: Spacing.base,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderLeftWidth: 4,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pillarBadgeContainer: {
    marginBottom: 10,
  },
  pillarBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pillarBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 14 * 1.4,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 2,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: 6,
  },
  reasonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default NextBestActionCard;
