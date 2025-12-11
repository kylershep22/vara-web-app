/**
 * Habits Screen
 * Daily habit tracking with streaks
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, FAB, Portal, Modal, Button as PaperButton, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingSpinner } from '../components';
import { Colors, Spacing } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../hooks';
import {
  createHabit,
  updateHabit,
  deleteHabit,
  markHabitComplete,
  unmarkHabitComplete,
  isHabitCompletedToday,
  getHabitCompletions,
} from '../services/firebase';
import { Habit } from '../types';

interface HabitsScreenProps {
  hideHeader?: boolean;
}

const HabitsScreen: React.FC<HabitsScreenProps> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { habits, loading } = useHabits(true); // Active habits only
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'daily' as 'daily' | 'weekly' | 'custom',
    frequency: 7,
    category: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [realStreaks, setRealStreaks] = useState<{ [habitId: string]: { current: number; longest: number } }>({});
  const today = new Date().toISOString().split('T')[0];

  // Calculate real streaks from completion history
  const calculateStreak = (completions: string[]): { current: number; longest: number } => {
    if (completions.length === 0) {
      return { current: 0, longest: 0 };
    }

    const sortedDates = completions.sort().reverse();
    const todayDate = new Date();
    const yesterdayDate = new Date(todayDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);

    const todayStr = todayDate.toISOString().split('T')[0];
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let expectedDate = new Date(sortedDates[0]);

    // Check if most recent completion is today or yesterday
    if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
      // Last completion was more than 1 day ago, streak is broken
      currentStreak = 0;
    } else {
      // Calculate current streak
      for (let i = 0; i < sortedDates.length; i++) {
        const completionDate = new Date(sortedDates[i]);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];

        if (sortedDates[i] === expectedDateStr) {
          currentStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let streakDate = new Date(sortedDates[0]);
    tempStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return { current: currentStreak, longest: Math.max(longestStreak, currentStreak) };
  };

  // Check which habits are completed today and calculate real streaks
  useEffect(() => {
    const checkCompletionsAndStreaks = async () => {
      const completed = new Set<string>();
      const streaks: { [habitId: string]: { current: number; longest: number } } = {};

      for (const habit of habits) {
        const isCompleted = await isHabitCompletedToday(habit.id);
        if (isCompleted) {
          completed.add(habit.id);
        }

        // Get all completions to calculate real streak
        try {
          const completionsData = await getHabitCompletions(habit.id);
          const completionDates = completionsData.map((c) => c.date);
          streaks[habit.id] = calculateStreak(completionDates);
        } catch (error) {
          console.error('Error calculating streak for habit:', habit.id, error);
          streaks[habit.id] = { current: 0, longest: 0 };
        }
      }

      setCompletedToday(completed);
      setRealStreaks(streaks);
    };

    if (habits.length > 0) {
      checkCompletionsAndStreaks();
    }
  }, [habits]);

  const handleCreateHabit = () => {
    setEditingHabit(null);
    setFormData({ name: '', type: 'daily', frequency: 7, category: '' });
    setModalVisible(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      type: habit.type,
      frequency: habit.frequency,
      category: habit.category || '',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    setSubmitting(true);
    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, formData);
      } else {
        await createHabit(user!.uid, formData);
      }
      setModalVisible(false);
      setFormData({ name: '', type: 'daily', frequency: 7, category: '' });
    } catch (error) {
      console.error('Error saving habit:', error);
      Alert.alert('Error', 'Failed to save habit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteHabit = (habitId: string) => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habitId);
            } catch (error) {
              console.error('Error deleting habit:', error);
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  };

  const handleToggleCompletion = async (habitId: string) => {
    const isCompleted = completedToday.has(habitId);

    try {
      if (isCompleted) {
        await unmarkHabitComplete(habitId, today);
        setCompletedToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(habitId);
          return newSet;
        });
      } else {
        await markHabitComplete(habitId, user!.uid, today);
        setCompletedToday(prev => new Set(prev).add(habitId));
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
      Alert.alert('Error', 'Failed to update habit');
    }
  };

  const renderHabitItem = ({ item }: { item: Habit }) => {
    const isCompleted = completedToday.has(item.id);

    // Handle both 'name' and 'title' fields from web app
    const habitName = item.name || (item as any).title || 'Unnamed Habit';

    // Use calculated real streaks from completion history
    const streakData = realStreaks[item.id] || { current: 0, longest: 0 };
    const currentStreak = streakData.current;
    const bestStreak = streakData.longest;

    return (
      <Card style={styles.habitCard}>
        <View style={styles.habitContent}>
          {/* Checkbox */}
          <Checkbox
            status={isCompleted ? 'checked' : 'unchecked'}
            onPress={() => handleToggleCompletion(item.id)}
            color={Colors.evergreenTeal}
          />

          {/* Habit Info */}
          <View style={styles.habitInfo}>
            <Text
              variant="titleMedium"
              style={[styles.habitName, isCompleted && styles.habitCompleted]}
            >
              {habitName}
            </Text>
            <View style={styles.habitMeta}>
              {item.category && (
                <Text variant="bodySmall" style={styles.habitCategory}>
                  {item.category}
                </Text>
              )}
              <Text variant="bodySmall" style={styles.habitType}>
                • {item.type || 'daily'}
              </Text>
            </View>
          </View>

          {/* Streak */}
          <View style={styles.streakContainer}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text variant="titleLarge" style={styles.streakNumber}>
              {currentStreak}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={styles.statLabel}>
              Current Streak
            </Text>
            <Text variant="titleSmall" style={styles.statValue}>
              {currentStreak} days
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text variant="bodySmall" style={styles.statLabel}>
              Best Streak
            </Text>
            <Text variant="titleSmall" style={styles.statValue}>
              {bestStreak} days
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.habitActions}>
          <Button variant="text" onPress={() => handleEditHabit(item)} style={styles.actionButton}>
            Edit
          </Button>
          <Button
            variant="text"
            onPress={() => handleDeleteHabit(item.id)}
            style={styles.deleteButton}
          >
            Delete
          </Button>
        </View>
      </Card>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading habits..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.screenTitle}>
            Habits
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Build consistency, one day at a time
          </Text>
        </View>
      )}

      {/* Today's Date */}
      <View style={styles.dateContainer}>
        <Text variant="titleMedium" style={styles.dateText}>
          Today: {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Habits List */}
      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✨</Text>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No habits yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Create your first habit to start building consistency!
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          renderItem={renderHabitItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        label="New Habit"
        style={styles.fab}
        onPress={handleCreateHabit}
        color={Colors.textOnPrimary}
      />

      {/* Create/Edit Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {editingHabit ? 'Edit Habit' : 'New Habit'}
              </Text>

              <Input
                label="Habit Name *"
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., Morning meditation"
                style={styles.input}
              />

              <Input
                label="Category"
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="e.g., Health, Productivity"
                style={styles.input}
              />

              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Type
              </Text>
              <View style={styles.typeButtons}>
                {(['daily', 'weekly', 'custom'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setFormData({ ...formData, type })}
                    style={[
                      styles.typeButton,
                      formData.type === type && styles.typeButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        formData.type === type && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={submitting}
                  style={styles.modalButton}
                  buttonColor={Colors.evergreenTeal}
                >
                  {editingHabit ? 'Update' : 'Create'}
                </PaperButton>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  dateContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.dewSage,
    marginHorizontal: Spacing.lg,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  dateText: {
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  habitCard: {
    marginBottom: Spacing.md,
  },
  habitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  habitInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  habitName: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  habitCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  habitMeta: {
    flexDirection: 'row',
  },
  habitCategory: {
    color: Colors.textSecondary,
  },
  habitType: {
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 24,
  },
  streakNumber: {
    color: Colors.sunriseAmber,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    backgroundColor: Colors.mistWhite,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  statLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
  },
  habitActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  input: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  typeButtonText: {
    color: Colors.textSecondary,
  },
  typeButtonTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default HabitsScreen;
