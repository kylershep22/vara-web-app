/**
 * Dashboard Screen
 * Main home screen showing wellness overview
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card as PaperCard, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, LoadingSpinner } from '../components';
import { Colors, Spacing } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useGoals, useHabits, useTasks } from '../hooks';
import { markHabitComplete, completeTask, getHabitCompletions, isHabitCompletedToday, unmarkHabitComplete } from '../services/firebase';

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { goals, loading: goalsLoading } = useGoals();
  const { habits, loading: habitsLoading } = useHabits(true); // Active habits only
  const { tasks: allTasks, loading: tasksLoading } = useTasks(); // All tasks
  const [refreshing, setRefreshing] = useState(false);
  const [realStreaks, setRealStreaks] = useState<{ [habitId: string]: number }>({});
  const [processingHabits, setProcessingHabits] = useState<Set<string>>(new Set());
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [weeklyCompletions, setWeeklyCompletions] = useState<{ [habitId: string]: { [date: string]: boolean } }>({});

  // Get today's date for habit completion
  const today = new Date().toISOString().split('T')[0];

  // Get last 7 days
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toISOString().split('T')[0] === today,
      });
    }
    return days;
  };

  const last7Days = getLast7Days();

  // Calculate real current streak from completion history
  const calculateCurrentStreak = (completions: string[]): number => {
    if (completions.length === 0) return 0;

    const sortedDates = completions.sort().reverse();
    const todayDate = new Date();
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const todayStr = todayDate.toISOString().split('T')[0];
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    // Check if most recent completion is today or yesterday
    if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
      return 0; // Streak is broken
    }

    // Calculate consecutive days from most recent
    let currentStreak = 0;
    let expectedDate = new Date(sortedDates[0]);

    for (let i = 0; i < sortedDates.length; i++) {
      const expectedDateStr = expectedDate.toISOString().split('T')[0];

      if (sortedDates[i] === expectedDateStr) {
        currentStreak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  };

  // Calculate real streaks and load weekly completions when habits load
  useEffect(() => {
    const loadHabitData = async () => {
      const streaks: { [habitId: string]: number } = {};
      const weekly: { [habitId: string]: { [date: string]: boolean } } = {};
      const completedSet = new Set<string>();

      for (const habit of habits) {
        try {
          const completionsData = await getHabitCompletions(habit.id);
          const completionDates = completionsData.map((c) => c.date);
          streaks[habit.id] = calculateCurrentStreak(completionDates);

          // Build weekly completion map
          weekly[habit.id] = {};
          last7Days.forEach(day => {
            weekly[habit.id][day.date] = completionDates.includes(day.date);
          });

          // Check if completed today
          const isCompleted = await isHabitCompletedToday(habit.id);
          if (isCompleted) {
            completedSet.add(habit.id);
          }
        } catch (error) {
          console.error('Error loading habit data:', habit.id, error);
          streaks[habit.id] = 0;
          weekly[habit.id] = {};
        }
      }

      setRealStreaks(streaks);
      setWeeklyCompletions(weekly);
      setCompletedToday(completedSet);
    };

    if (habits.length > 0) {
      loadHabitData();
    }
  }, [habits]);

  // Filter tasks to show only incomplete ones
  const tasks = allTasks.filter((task) => !task.completed);

  // Calculate stats using real streaks
  const activeGoals = goals.filter((g) => g.status === 'active').length;
  const completedGoals = goals.filter((g) => g.status === 'completed').length;
  const totalStreak = habits.reduce((sum, h) => sum + (realStreaks[h.id] || 0), 0);
  const pendingTasks = tasks.length;

  const handleRefresh = async () => {
    setRefreshing(true);
    // Hooks will auto-refresh via real-time subscriptions
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleHabitToggle = async (habitId: string, date: string) => {
    // Add to processing set
    setProcessingHabits(prev => new Set(prev).add(`${habitId}-${date}`));

    try {
      const isCompleted = weeklyCompletions[habitId]?.[date] || false;

      if (isCompleted) {
        // Unmark completion
        await unmarkHabitComplete(habitId, date);
        setWeeklyCompletions(prev => ({
          ...prev,
          [habitId]: { ...prev[habitId], [date]: false }
        }));
        if (date === today) {
          setCompletedToday(prev => {
            const newSet = new Set(prev);
            newSet.delete(habitId);
            return newSet;
          });
        }
      } else {
        // Mark complete
        await markHabitComplete(habitId, user!.uid, date);
        setWeeklyCompletions(prev => ({
          ...prev,
          [habitId]: { ...prev[habitId], [date]: true }
        }));
        if (date === today) {
          setCompletedToday(prev => new Set(prev).add(habitId));
        }
      }

      // Recalculate streak for this habit
      const completionsData = await getHabitCompletions(habitId);
      const completionDates = completionsData.map((c) => c.date);
      setRealStreaks(prev => ({
        ...prev,
        [habitId]: calculateCurrentStreak(completionDates)
      }));
    } catch (error) {
      console.error('Error toggling habit completion:', error);
    } finally {
      // Remove from processing set
      setProcessingHabits(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${habitId}-${date}`);
        return newSet;
      });
    }
  };

  const handleTaskCheck = async (taskId: string) => {
    try {
      await completeTask(taskId);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (goalsLoading || habitsLoading || tasksLoading) {
    return <LoadingSpinner message="Loading your wellness dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.greeting}>
            Hello, {user?.displayName?.split(' ')[0] || 'there'}!
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Here's your wellness overview
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard} padding={Spacing.md}>
            <Text variant="headlineMedium" style={styles.statNumber}>
              {activeGoals}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Active Goals
            </Text>
          </Card>

          <Card style={styles.statCard} padding={Spacing.md}>
            <Text variant="headlineMedium" style={[styles.statNumber, styles.streakNumber]}>
              🔥 {totalStreak}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Total Streak
            </Text>
          </Card>

          <Card style={styles.statCard} padding={Spacing.md}>
            <Text variant="headlineMedium" style={styles.statNumber}>
              {pendingTasks}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Tasks To Do
            </Text>
          </Card>
        </View>

        {/* Weekly Habits Tracker */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Weekly Habits
            </Text>
            <Text variant="bodySmall" style={styles.sectionCount}>
              {habits.length}
            </Text>
          </View>

          {habits.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No active habits. Create one to get started!
            </Text>
          ) : (
            <View>
              {/* Week Day Headers */}
              <View style={styles.weekHeader}>
                <View style={styles.habitNameColumn}>
                  <Text variant="labelSmall" style={styles.weekHeaderText}>Habit</Text>
                </View>
                {last7Days.map((day) => (
                  <View key={day.date} style={[styles.dayColumn, day.isToday && styles.todayColumn]}>
                    <Text variant="labelSmall" style={[styles.dayHeaderText, day.isToday && styles.todayHeaderText]}>
                      {day.dayName}
                    </Text>
                    <Text variant="labelSmall" style={[styles.dayNumberText, day.isToday && styles.todayNumberText]}>
                      {day.dayNumber}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Habit Rows */}
              {habits.slice(0, 5).map((habit) => {
                const habitName = habit.name || (habit as any).title || 'Unnamed Habit';
                const currentStreak = realStreaks[habit.id] || 0;

                return (
                  <View key={habit.id} style={styles.habitRow}>
                    <View style={styles.habitNameColumn}>
                      <Text variant="bodyMedium" style={styles.habitRowName} numberOfLines={2}>
                        {habitName}
                      </Text>
                      <Text variant="bodySmall" style={styles.habitRowStreak}>
                        🔥 {currentStreak}
                      </Text>
                    </View>
                    {last7Days.map((day) => {
                      const isCompleted = weeklyCompletions[habit.id]?.[day.date] || false;
                      const isProcessing = processingHabits.has(`${habit.id}-${day.date}`);
                      const isFutureDate = new Date(day.date) > new Date(today);

                      return (
                        <TouchableOpacity
                          key={day.date}
                          style={[
                            styles.dayColumn,
                            day.isToday && styles.todayColumn,
                            isFutureDate && styles.disabledColumn,
                          ]}
                          onPress={() => !isFutureDate && handleHabitToggle(habit.id, day.date)}
                          disabled={isProcessing || isFutureDate}
                        >
                          {isProcessing ? (
                            <View style={styles.checkboxLoading}>
                              <Text style={styles.loadingDot}>⋯</Text>
                            </View>
                          ) : (
                            <View style={[
                              styles.checkbox,
                              isCompleted && styles.checkboxCompleted,
                              day.isToday && styles.checkboxToday,
                            ]}>
                              {isCompleted && (
                                <Text style={styles.checkmark}>✓</Text>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          )}

          {habits.length > 5 && (
            <Button
              variant="text"
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Habits' as never)}
            >
              View All Habits →
            </Button>
          )}
        </Card>

        {/* Priority Tasks */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Priority Tasks
            </Text>
            <Text variant="bodySmall" style={styles.sectionCount}>
              {tasks.length}
            </Text>
          </View>

          {tasks.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No pending tasks. You're all caught up!
            </Text>
          ) : (
            <View style={styles.tasksList}>
              {tasks.slice(0, 5).map((task) => (
                <View key={task.id} style={styles.taskItem}>
                  <View style={styles.taskInfo}>
                    <Text variant="bodyLarge" style={styles.taskTitle}>
                      {task.title}
                    </Text>
                    <View style={styles.taskMeta}>
                      <View
                        style={[
                          styles.priorityBadge,
                          task.priority === 'high' && styles.priorityHigh,
                          task.priority === 'medium' && styles.priorityMedium,
                          task.priority === 'low' && styles.priorityLow,
                        ]}
                      >
                        <Text variant="bodySmall" style={styles.priorityText}>
                          {task.priority}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Button
                    variant="outline"
                    onPress={() => handleTaskCheck(task.id)}
                    style={styles.checkButton}
                  >
                    ✓
                  </Button>
                </View>
              ))}
            </View>
          )}

          {tasks.length > 5 && (
            <Button variant="text" style={styles.viewAllButton}>
              View All Tasks
            </Button>
          )}
        </Card>

        {/* Goals Progress */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Goals Progress
            </Text>
            <Text variant="bodySmall" style={styles.sectionCount}>
              {completedGoals}/{goals.length} completed
            </Text>
          </View>

          {goals.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No goals yet. Set a goal to start your journey!
            </Text>
          ) : (
            <View style={styles.goalsList}>
              {goals.slice(0, 3).map((goal) => (
                <View key={goal.id} style={styles.goalItem}>
                  <Text variant="bodyMedium" style={styles.goalTitle}>
                    {goal.title}
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[styles.progressFill, { width: `${goal.progress}%` }]}
                    />
                  </View>
                  <Text variant="bodySmall" style={styles.progressText}>
                    {goal.progress}% complete
                  </Text>
                </View>
              ))}
            </View>
          )}

          {goals.length > 3 && (
            <Button variant="text" style={styles.viewAllButton}>
              View All Goals
            </Button>
          )}
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button variant="primary" fullWidth style={styles.actionButton}>
            Generate Daily Plan with AI
          </Button>
          <Button variant="outline" fullWidth style={styles.actionButton}>
            Add Journal Entry
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    marginHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  statNumber: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  streakNumber: {
    color: Colors.sunriseAmber,
  },
  statLabel: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
  },
  sectionCount: {
    color: Colors.textSecondary,
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  // Weekly Habit Tracker Styles
  weekHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  habitNameColumn: {
    width: 120,
    paddingRight: Spacing.sm,
    justifyContent: 'center',
  },
  weekHeaderText: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
    fontSize: 12,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  todayColumn: {
    backgroundColor: Colors.dewSage,
    borderRadius: 8,
  },
  disabledColumn: {
    opacity: 0.3,
  },
  dayHeaderText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  todayHeaderText: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  dayNumberText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  todayNumberText: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  habitRowName: {
    color: Colors.textPrimary,
    fontWeight: '500',
    fontSize: 13,
    marginBottom: 2,
  },
  habitRowStreak: {
    color: Colors.sunriseAmber,
    fontSize: 11,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxCompleted: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  checkboxToday: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 2.5,
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLoading: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    color: Colors.textSecondary,
    fontSize: 18,
  },
  tasksList: {
    marginBottom: Spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  taskMeta: {
    flexDirection: 'row',
  },
  priorityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityHigh: {
    backgroundColor: '#FFEBEE',
  },
  priorityMedium: {
    backgroundColor: '#FFF3E0',
  },
  priorityLow: {
    backgroundColor: '#E8F5E9',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  goalsList: {
    marginBottom: Spacing.sm,
  },
  goalItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  goalTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 4,
  },
  progressText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  viewAllButton: {
    marginTop: Spacing.sm,
  },
  quickActions: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
});

export default DashboardScreen;
