/**
 * Up Next Card
 * Dynamic primary action card that shows the user's most important next action
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { Task, Habit, FourThreeTwoOneEntry } from '../../types';
import { Timestamp } from 'firebase/firestore';

// Action types for the Up Next card
type UpNextActionType =
  | 'overdue_task'
  | 'due_today_task'
  | 'incomplete_habit'
  | 'four_three_two_one'
  | 'focus_session'
  | 'journal'
  | 'explore_library'
  | 'community';

interface UpNextAction {
  type: UpNextActionType;
  label: string;
  title: string;
  subtitle: string;
  buttonText: string;
  icon: string;
  route: string;
  params?: Record<string, any>;
  priority: number;
  data?: any;
}

interface UpNextCardProps {
  tasks: Task[];
  habits: Habit[];
  completedHabitsToday: Set<string>;
  fourThreeTwoOneEntry: FourThreeTwoOneEntry | null;
  hasRecentJournalEntry: boolean;
}

export const UpNextCard: React.FC<UpNextCardProps> = ({
  tasks,
  habits,
  completedHabitsToday,
  fourThreeTwoOneEntry,
  hasRecentJournalEntry,
}) => {
  const navigation = useNavigation();

  // Determine the highest priority action
  const upNextAction = useMemo((): UpNextAction => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Check for overdue tasks (highest priority)
    const overdueTasks = tasks.filter((task) => {
      if (task.completed || !task.dueDate) return false;
      const dueDate = task.dueDate instanceof Timestamp
        ? task.dueDate.toDate()
        : new Date(task.dueDate);
      return dueDate < today;
    });

    if (overdueTasks.length > 0) {
      const task = overdueTasks[0];
      return {
        type: 'overdue_task',
        label: 'Past due date',
        title: task.title,
        subtitle: 'You can update or reschedule this task',
        buttonText: 'View Task',
        icon: 'alert-circle',
        route: 'Track',
        params: { tab: 'tasks' },
        priority: 1,
        data: task,
      };
    }

    // Check for tasks due today
    const tasksDueToday = tasks.filter((task) => {
      if (task.completed || !task.dueDate) return false;
      const dueDate = task.dueDate instanceof Timestamp
        ? task.dueDate.toDate()
        : new Date(task.dueDate);
      return dueDate >= today && dueDate <= todayEnd;
    });

    if (tasksDueToday.length > 0) {
      const task = tasksDueToday[0];
      return {
        type: 'due_today_task',
        label: 'DUE TODAY',
        title: task.title,
        subtitle: `${tasksDueToday.length > 1 ? `+ ${tasksDueToday.length - 1} more task${tasksDueToday.length > 2 ? 's' : ''}` : 'Complete this before end of day'}`,
        buttonText: 'View Task',
        icon: 'calendar-check',
        route: 'Track',
        params: { tab: 'tasks' },
        priority: 2,
        data: task,
      };
    }

    // Check for incomplete daily habits
    const incompleteHabits = habits.filter(
      (habit) => habit.active && !completedHabitsToday.has(habit.id)
    );

    if (incompleteHabits.length > 0) {
      const habit = incompleteHabits[0];
      return {
        type: 'incomplete_habit',
        label: 'UP NEXT',
        title: habit.name,
        subtitle: incompleteHabits.length > 1
          ? `${incompleteHabits.length} habits remaining today`
          : 'A few habits are here when you\'re ready',
        buttonText: 'Mark Complete',
        icon: 'checkbox-marked-circle-outline',
        route: 'Track',
        params: { tab: 'habits' },
        priority: 3,
        data: habit,
      };
    }

    // Check for 4-3-2-1 practice
    if (fourThreeTwoOneEntry && !fourThreeTwoOneEntry.completed) {
      const completionCount = [
        fourThreeTwoOneEntry.fourMinutes,
        fourThreeTwoOneEntry.threeWins?.completed,
        fourThreeTwoOneEntry.twoFuel?.completed,
        fourThreeTwoOneEntry.oneConnection,
      ].filter(Boolean).length;

      return {
        type: 'four_three_two_one',
        label: 'DAILY PRACTICE',
        title: '4-3-2-1 Practice',
        subtitle: `${completionCount}/4 completed - Keep going!`,
        buttonText: 'Continue Practice',
        icon: 'star-four-points',
        route: 'Home', // Scroll to section
        priority: 4,
      };
    }

    // Default to focus session
    if (!hasRecentJournalEntry) {
      return {
        type: 'journal',
        label: 'REFLECTION',
        title: 'Journal Entry',
        subtitle: 'Take a moment to reflect on your day',
        buttonText: 'Start Writing',
        icon: 'book-open-page-variant',
        route: 'Journal',
        priority: 5,
      };
    }

    // Focus session as default
    return {
      type: 'focus_session',
      label: 'UP NEXT',
      title: 'Focus Session',
      subtitle: 'Uninterrupted attention time',
      buttonText: 'Begin Session',
      icon: 'brain',
      route: 'Focus',
      priority: 6,
    };
  }, [tasks, habits, completedHabitsToday, fourThreeTwoOneEntry, hasRecentJournalEntry]);

  const handlePress = () => {
    if (upNextAction.route === 'Home') {
      // Scroll to 4-3-2-1 section - handled by parent
      return;
    }
    navigation.navigate(upNextAction.route as never, upNextAction.params as never);
  };

  const isOverdue = upNextAction.type === 'overdue_task';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, isOverdue && styles.labelOverdue]}>
            {upNextAction.label}
          </Text>
          <Icon
            name={upNextAction.icon as any}
            size={20}
            color={isOverdue ? Colors.error : Colors.mutedSageGray}
          />
        </View>

        <Text style={styles.title}>{upNextAction.title}</Text>
        <Text style={styles.subtitle}>{upNextAction.subtitle}</Text>

        <View style={styles.buttonContainer}>
          <Text style={styles.button} onPress={handlePress}>
            {upNextAction.buttonText}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.mutedSageGray,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelOverdue: {
    color: Colors.mutedSageGray,
    textTransform: 'none',
  },
  title: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  buttonContainer: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  button: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default UpNextCard;
