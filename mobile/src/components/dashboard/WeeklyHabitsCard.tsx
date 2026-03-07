/**
 * WeeklyHabitsCard
 * Displays the weekly habit tracker grid with toggle-able checkboxes.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Card, Button } from '../../components';
import { ConsistencyBadge } from '../../components/habits';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface DayInfo {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}

interface WeeklyHabitsCardProps {
  habits: any[];
  visibleDays: DayInfo[];
  today: string;
  allCompletions: { [habitId: string]: string[] };
  weeklyCompletions: { [habitId: string]: { [date: string]: boolean } };
  processingHabits: Set<string>;
  onHabitToggle: (habitId: string, date: string) => void;
  onNavigateToHabits: () => void;
  onAddHabit: () => void;
}

export const WeeklyHabitsCard: React.FC<WeeklyHabitsCardProps> = ({
  habits,
  visibleDays,
  today,
  allCompletions,
  weeklyCompletions,
  processingHabits,
  onHabitToggle,
  onNavigateToHabits,
  onAddHabit,
}) => {
  return (
    <Card style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <TouchableOpacity
          onPress={onNavigateToHabits}
          style={styles.sectionTitleButton}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionTitle}>Weekly Habits</Text>
          <Icon name="chevron-right" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        {habits.length > 0 && (
          <View style={styles.habitCountBadge}>
            <Text style={styles.habitCountText}>
              {habits.length} {habits.length === 1 ? 'habit' : 'habits'}
            </Text>
          </View>
        )}
      </View>

      {habits.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Icon name="checkbox-marked-circle-outline" size={48} color={Colors.dewSage} />
          <Text style={styles.emptyText}>No active habits yet</Text>
          <Text style={styles.emptySubtext}>Small daily actions build lasting change</Text>
          <TouchableOpacity style={styles.addHabitButton} onPress={onAddHabit}>
            <Text style={styles.addHabitButtonText}>Add Your First Habit</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          {/* Week Day Headers */}
          <View style={styles.weekHeader}>
            <View style={styles.habitNameColumn}>
              <Text style={styles.weekHeaderText}>Habit</Text>
            </View>
            {visibleDays.map((day) => (
              <View key={day.date} style={[styles.dayColumn, day.isToday && styles.todayColumn]}>
                <Text style={[styles.dayHeaderText, day.isToday && styles.todayHeaderText]}>
                  {day.dayName}
                </Text>
                <Text style={[styles.dayNumberText, day.isToday && styles.todayNumberText]}>
                  {day.dayNumber}
                </Text>
              </View>
            ))}
          </View>

          {/* Habit Rows */}
          {habits.slice(0, 5).map((habit) => {
            const habitName = habit.name || habit.title || 'Unnamed Habit';
            const habitCompletions = allCompletions[habit.id] || [];

            return (
              <View key={habit.id} style={styles.habitRow}>
                <View style={styles.habitNameColumn}>
                  <Text style={styles.habitRowName} numberOfLines={2}>
                    {habitName}
                  </Text>
                  <ConsistencyBadge completions={habitCompletions} daysToShow={30} />
                </View>
                {visibleDays.map((day) => {
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
                      onPress={() => !isFutureDate && onHabitToggle(habit.id, day.date)}
                      disabled={isProcessing || isFutureDate}
                      accessibilityLabel={`${isCompleted ? 'Completed' : 'Not completed'} ${habitName} on ${day.dayName}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isCompleted, disabled: isFutureDate }}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <View style={styles.checkboxTouchTarget}>
                        {isProcessing ? (
                          <View style={styles.checkboxLoading}>
                            <Text style={styles.loadingDot}>...</Text>
                          </View>
                        ) : (
                          <View style={[
                            styles.checkbox,
                            isCompleted && styles.checkboxCompleted,
                            day.isToday && !isCompleted && styles.checkboxTodayUnchecked,
                          ]}>
                            {isCompleted && (
                              <Icon name="check" size={13} color={Colors.textOnPrimary} />
                            )}
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </View>
      )}

      {habits.length > 5 && (
        <Button variant="text" style={styles.viewAllButton} onPress={onNavigateToHabits}>
          View All Habits
        </Button>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitCountBadge: {
    backgroundColor: `${Colors.dewSage}80`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  habitCountText: {
    color: Colors.mutedSageGray || '#6F7F77',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.base,
  },
  emptySubtext: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
  },
  addHabitButton: {
    marginTop: Spacing.base,
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },
  addHabitButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  weekHeader: {
    flexDirection: 'row',
    paddingBottom: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.medium,
    borderBottomColor: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  habitNameColumn: {
    flex: 1.2,
    paddingRight: Spacing.xs,
    justifyContent: 'center',
    minWidth: 80,
  },
  weekHeaderText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xs,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    minHeight: 44,
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  todayColumn: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.sm,
    marginHorizontal: 1,
  },
  disabledColumn: {
    opacity: 0.3,
  },
  dayHeaderText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs - 2,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
  },
  todayHeaderText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  dayNumberText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  todayNumberText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: Spacing.xs,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  habitRowName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.sm,
  },
  checkboxTouchTarget: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: Layout.borderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  checkboxCompleted: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  checkboxTodayUnchecked: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 1.5,
    backgroundColor: `${Colors.dewSage}40`,
  },
  checkboxLoading: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.lg,
  },
  viewAllButton: {
    marginTop: Spacing.sm,
  },
});
