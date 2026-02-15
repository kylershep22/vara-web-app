/**
 * Progress Nudge Card
 * Motivational card showing daily progress and consistency milestones
 *
 * Design Philosophy: Emphasizes patterns over perfection, growth over streaks.
 * Aligns with Vara's "Progress Without Pressure" brand pillar.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { Habit } from '../../types';

interface ProgressNudgeCardProps {
  habits: Habit[];
  completedToday: Set<string>;
  realStreaks: { [habitId: string]: number };
  onHabitPress?: (habitId: string) => void;
}

interface NudgeContent {
  type: 'daily_progress' | 'consistency_milestone';
  title: string;
  message: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  habitId?: string;
  habitName?: string;
}

const ProgressNudgeCard: React.FC<ProgressNudgeCardProps> = ({
  habits,
  completedToday,
  realStreaks,
  onHabitPress,
}) => {
  // Calculate nudge content
  const nudge = useMemo<NudgeContent | null>(() => {
    if (habits.length === 0) return null;

    const remainingHabits = habits.filter(h => !completedToday.has(h.id));
    const completedCount = completedToday.size;
    const totalCount = habits.length;
    const remainingCount = remainingHabits.length;

    // Check for consistency milestones first (priority nudges)
    // Milestones: 6 → 7 (week), 29 → 30 (month), 99 → 100 (century)
    const milestoneThresholds = [6, 29, 99];

    for (const habit of habits) {
      const currentConsistency = realStreaks[habit.id] || 0;
      const habitName = habit.name || (habit as any).title || 'this habit';

      // Only show if not completed today and at a threshold
      if (!completedToday.has(habit.id) && milestoneThresholds.includes(currentConsistency)) {
        const nextMilestone = currentConsistency === 6 ? 7 : currentConsistency === 29 ? 30 : 100;
        const milestoneLabel = nextMilestone === 7 ? 'a week' : nextMilestone === 30 ? 'a month' : '100 days';
        return {
          type: 'consistency_milestone',
          title: `Almost ${milestoneLabel} of consistency!`,
          message: `Complete "${habitName}" to reach ${nextMilestone} days.`,
          icon: 'leaf',
          iconColor: Colors.evergreenTeal,
          backgroundColor: Colors.dewSage,
          habitId: habit.id,
          habitName,
        };
      }
    }

    // Daily progress nudge (only show when 1-3 habits remaining)
    if (remainingCount >= 1 && remainingCount <= 3) {
      const progressPercent = Math.round((completedCount / totalCount) * 100);

      if (remainingCount === 1) {
        const lastHabit = remainingHabits[0];
        const habitName = lastHabit.name || (lastHabit as any).title || 'your last habit';
        return {
          type: 'daily_progress',
          title: 'Almost There!',
          message: `Just "${habitName}" left to complete today. You've got this!`,
          icon: 'trophy-outline',
          iconColor: Colors.evergreenTeal,
          backgroundColor: Colors.dewSage,
          habitId: lastHabit.id,
          habitName,
        };
      }

      return {
        type: 'daily_progress',
        title: `${progressPercent}% Complete!`,
        message: `You're ${remainingCount} habits away from completing today!`,
        icon: 'lightning-bolt',
        iconColor: Colors.evergreenTeal,
        backgroundColor: Colors.dewSage,
      };
    }

    // If all habits completed, show celebration message
    if (remainingCount === 0 && totalCount > 0) {
      return {
        type: 'daily_progress',
        title: 'All Done!',
        message: 'Amazing work! You completed all your habits today.',
        icon: 'star-circle',
        iconColor: Colors.sunriseAmber,
        backgroundColor: Colors.sunriseAmber + '20',
      };
    }

    return null;
  }, [habits, completedToday, realStreaks]);

  // Don't render if no nudge
  if (!nudge) return null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: nudge.backgroundColor }]}
      activeOpacity={nudge.habitId ? 0.7 : 1}
      onPress={() => nudge.habitId && onHabitPress?.(nudge.habitId)}
      disabled={!nudge.habitId}
      accessibilityRole={nudge.habitId ? 'button' : 'text'}
      accessibilityLabel={`${nudge.title}. ${nudge.message}`}
      accessibilityHint={nudge.habitId ? 'Double tap to view habit' : undefined}
    >
      <View style={styles.iconContainer}>
        <Icon
          name={nudge.icon as any}
          size={32}
          color={nudge.iconColor}
        />
      </View>
      <View style={styles.contentContainer}>
        <Text variant="titleMedium" style={[styles.title, { color: nudge.iconColor }]}>
          {nudge.title}
        </Text>
        <Text variant="bodyMedium" style={styles.message}>
          {nudge.message}
        </Text>
      </View>
      {nudge.habitId && (
        <View style={styles.arrowContainer}>
          <Icon
            name="chevron-right"
            size={24}
            color={Colors.textSecondary}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs / 2,
  },
  message: {
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * 1.4,
  },
  arrowContainer: {
    marginLeft: Spacing.sm,
  },
});

export default ProgressNudgeCard;
