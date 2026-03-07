/**
 * Progress Nudge Card
 * Gentle encouragement card showing daily progress
 *
 * Design Philosophy: Emphasizes patterns over perfection, growth over streaks.
 * Aligns with Vara's "Progress Without Pressure" brand pillar.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { Habit } from '../../types';

interface ProgressNudgeCardProps {
  habits: Habit[];
  completedToday: Set<string>;
  onHabitPress?: (habitId: string) => void;
}

interface NudgeContent {
  title: string;
  message: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  habitId?: string;
}

const ProgressNudgeCard: React.FC<ProgressNudgeCardProps> = ({
  habits,
  completedToday,
  onHabitPress,
}) => {
  const nudge = useMemo<NudgeContent | null>(() => {
    if (habits.length === 0) return null;

    const remainingHabits = habits.filter(h => !completedToday.has(h.id));
    const remainingCount = remainingHabits.length;
    const totalCount = habits.length;

    // Daily progress nudge (only show when 1-3 habits remaining)
    if (remainingCount >= 1 && remainingCount <= 3) {
      if (remainingCount === 1) {
        const lastHabit = remainingHabits[0];
        const habitName = lastHabit.name || (lastHabit as any).title || 'your last habit';
        return {
          title: "You've been showing up for yourself.",
          message: `${habitName} is here whenever you're ready.`,
          icon: 'leaf',
          iconColor: Colors.evergreenTeal,
          backgroundColor: Colors.dewSage,
          habitId: lastHabit.id,
        };
      }

      return {
        title: "You've been showing up for yourself.",
        message: `No rush \u2014 take it at your own pace.`,
        icon: 'leaf',
        iconColor: Colors.evergreenTeal,
        backgroundColor: Colors.dewSage,
      };
    }

    // If all habits completed
    if (remainingCount === 0 && totalCount > 0) {
      return {
        title: 'Nice day.',
        message: 'You took care of a lot.',
        icon: 'check-circle',
        iconColor: Colors.evergreenTeal,
        backgroundColor: Colors.dewSage,
      };
    }

    return null;
  }, [habits, completedToday]);

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
        <Text style={[styles.title, { color: nudge.iconColor }]}>
          {nudge.title}
        </Text>
        <Text style={styles.message}>
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
    marginBottom: 2,
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
