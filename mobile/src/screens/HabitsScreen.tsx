/**
 * Habits Screen
 * Daily habit tracking with consistency rhythm visualization
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, FAB, Menu } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Button, Input, Card, LoadingSpinner, BrainPillarBadge, BrainPillarInfoModal, EnhancedModal, ModalFooterActions, BaseCard, InlineCreateButton, LockedScreenOverlay } from '../components';
import { AnimatedCheckbox, ConfettiOverlay, StreakMilestoneModal } from '../components/celebrations';
import { Colors, Spacing, Typography, Layout, HABIT_CATEGORIES } from '../constants';
import { getNeurochemicalTags, formatNeurochemicalTag, getBrainPillars, getHabitBrainMapping } from '../constants/brainHealthMapping';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../hooks';
import { useCelebrations } from '../hooks/useCelebrations';
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
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

interface HabitsScreenProps {
  hideHeader?: boolean;
  /** Filter passed from parent (PlanScreen) */
  externalFilter?: string;
  /** Show inline create button instead of FAB */
  showInlineCreate?: boolean;
}

const HabitsScreen: React.FC<HabitsScreenProps> = ({
  hideHeader = false,
  externalFilter,
  showInlineCreate = false,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { habits, loading, error: habitsError } = useHabits(true); // Active habits only
  const insets = useSafeAreaInsets();
  const {
    showConfetti,
    triggerConfetti,
    dismissConfetti,
    pendingMilestone,
    checkForMilestone,
    dismissMilestone,
  } = useCelebrations();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'daily' as 'daily' | 'weekly' | 'custom',
    frequency: 7,
    category: '',
    // Vara Habits Enhancement fields
    identity: '',
    identityStatement: '',
    outcomeGoal: '',
    fullVersion: '',
    quickStartVersion: '',
    justShowUpVersion: '',
    cueType: 'time' as 'time' | 'location' | 'after_habit' | 'emotion',
    cueValue: '',
    implementationIntention: '',
    problem: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [realStreaks, setRealStreaks] = useState<{ [habitId: string]: { current: number; longest: number } }>({});
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [pillarInfoVisible, setPillarInfoVisible] = useState(false);
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
    setFormData({
      name: '',
      type: 'daily',
      frequency: 7,
      category: '',
      identity: '',
      identityStatement: '',
      outcomeGoal: '',
      fullVersion: '',
      quickStartVersion: '',
      justShowUpVersion: '',
      cueType: 'time',
      cueValue: '',
      implementationIntention: '',
      problem: '',
    });
    setModalVisible(true);
  };

  const handleEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      type: habit.type,
      frequency: habit.frequency,
      category: habit.category || '',
      identity: habit.identity || '',
      identityStatement: habit.identityStatement || '',
      outcomeGoal: habit.outcomeGoal || '',
      fullVersion: habit.fullVersion || '',
      quickStartVersion: habit.quickStartVersion || '',
      justShowUpVersion: habit.justShowUpVersion || '',
      cueType: habit.cue?.type || 'time',
      cueValue: habit.cue?.value || '',
      implementationIntention: habit.implementationIntention || '',
      problem: habit.problem || '',
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    // Check user authentication first
    if (!user || !user.uid) {
      Alert.alert('Authentication Error', 'You must be logged in to create a habit. Please sign out and sign back in.');
      return;
    }

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare habit data with new Vara Habits fields
      const habitData: any = {
        name: formData.name.trim(),
        type: formData.type,
        frequency: formData.frequency,
        category: formData.category || undefined,
      };

      // Add Vara Habits Enhancement fields if provided
      if (formData.identity) {
        habitData.identity = formData.identity.trim();
        // Auto-generate identity statement if not provided
        if (!formData.identityStatement && formData.identity) {
          habitData.identityStatement = `I'm becoming ${formData.identity.toLowerCase()}`;
        } else if (formData.identityStatement) {
          habitData.identityStatement = formData.identityStatement.trim();
        }
      }

      if (formData.outcomeGoal) habitData.outcomeGoal = formData.outcomeGoal.trim();
      if (formData.fullVersion) habitData.fullVersion = formData.fullVersion.trim();
      if (formData.quickStartVersion) habitData.quickStartVersion = formData.quickStartVersion.trim();
      if (formData.justShowUpVersion) habitData.justShowUpVersion = formData.justShowUpVersion.trim();
      if (formData.problem) habitData.problem = formData.problem.trim();

      // Add cue if value is provided
      if (formData.cueValue) {
        habitData.cue = {
          type: formData.cueType,
          value: formData.cueValue.trim(),
        };

        // Auto-generate implementation intention if not provided
        if (!formData.implementationIntention) {
          const cuePrefix = formData.cueType === 'time' ? 'At' :
                           formData.cueType === 'after_habit' ? 'After' :
                           formData.cueType === 'location' ? 'At' : 'When';
          habitData.implementationIntention = `${cuePrefix} ${formData.cueValue}, I will ${formData.name.toLowerCase()}`;
        } else {
          habitData.implementationIntention = formData.implementationIntention.trim();
        }
      } else if (formData.implementationIntention) {
        habitData.implementationIntention = formData.implementationIntention.trim();
      }

      // Initialize progress tracking fields for new habits
      if (!editingHabit) {
        habitData.totalStepsTaken = 0;
        habitData.thisWeekSteps = 0;
        habitData.missedYesterday = false;
        habitData.consecutiveMisses = 0;
        habitData.scalingPhase = 'getting_started';
      }

      if (editingHabit) {
        await updateHabit(editingHabit.id, habitData);
      } else {
        await createHabit(user!.uid, habitData);
      }

      setModalVisible(false);
      setFormData({
        name: '',
        type: 'daily',
        frequency: 7,
        category: '',
        identity: '',
        identityStatement: '',
        outcomeGoal: '',
        fullVersion: '',
        quickStartVersion: '',
        justShowUpVersion: '',
        cueType: 'time',
        cueValue: '',
        implementationIntention: '',
        problem: '',
      });
    } catch (error: any) {
      console.error('Error saving habit:', error);
      const errorMessage = error?.message || 'Failed to save habit.';
      Alert.alert(
        'Unable to Save Habit',
        `${errorMessage}\n\nPlease check your internet connection and try again. If the problem persists, try signing out and back in.`
      );
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
    const habit = habits.find(h => h.id === habitId);
    const habitName = habit?.name || (habit as any)?.title || 'Habit';

    // Store previous streak for milestone detection
    const previousStreak = realStreaks[habitId] || 0;

    try {
      if (isCompleted) {
        await unmarkHabitComplete(habitId, today);
        setCompletedToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(habitId);
          return newSet;
        });

        // Recalculate streak after unmarking
        const completionsData = await getHabitCompletions(habitId);
        const completionDates = completionsData.map((c) => c.date);
        const newStreak = calculateStreak(completionDates).current;
        setRealStreaks(prev => ({
          ...prev,
          [habitId]: newStreak,
        }));
      } else {
        await markHabitComplete(habitId, user!.uid, today);

        // Update completed set
        const newCompletedSet = new Set(completedToday).add(habitId);
        setCompletedToday(newCompletedSet);

        // Recalculate streak after marking complete
        const completionsData = await getHabitCompletions(habitId);
        const completionDates = completionsData.map((c) => c.date);
        const newStreakData = calculateStreak(completionDates);
        const newStreak = newStreakData.current;

        setRealStreaks(prev => ({
          ...prev,
          [habitId]: newStreak,
        }));

        // Check for streak milestone (7, 30, 100)
        checkForMilestone(habitId, habitName, previousStreak, newStreak);

        // Check if all habits are now completed -> trigger confetti
        if (newCompletedSet.size === habits.length && habits.length > 0) {
          // Small delay to let the checkbox animation complete
          setTimeout(() => {
            triggerConfetti();
          }, 300);
        }
      }
    } catch (error) {
      console.error('Error toggling habit completion:', error);
      Alert.alert('Error', 'Failed to update habit');
    }
  };

  /**
   * Simplified habit card per Vara UI Standards
   * - Checkbox + Title + Metadata + Chevron
   * - No streak counters, momentum stats, or visible Edit/Delete
   */
  const renderHabitItem = ({ item }: { item: Habit }) => {
    try {
      const isCompleted = completedToday.has(item.id);
      const habitName = item?.name || (item as any)?.title || 'Unnamed Habit';

      // Build metadata line: Category · Frequency · Trigger
      const metaParts: string[] = [];
      if (item.category) metaParts.push(item.category);
      if (item.type) metaParts.push(item.type.charAt(0).toUpperCase() + item.type.slice(1));
      if (item.cue?.value) {
        const triggerPrefix = item.cue.type === 'time' ? '' : '';
        metaParts.push(item.cue.value);
      }
      const metaLine = metaParts.join(' · ');

      const handleNavigateToDetail = () => {
        // Navigate to habit detail screen
        navigation.navigate('HabitDetail', { habitId: item.id, habit: item });
      };

      return (
        <BaseCard onPress={handleNavigateToDetail}>
          <View style={styles.habitCardRow}>
            {/* Checkbox */}
            <View style={styles.checkboxWrapper}>
              <AnimatedCheckbox
                status={isCompleted ? 'checked' : 'unchecked'}
                onPress={() => handleToggleCompletion(item.id)}
                color={Colors.evergreenTeal}
              />
            </View>

            {/* Content */}
            <View style={styles.habitCardContent}>
              <Text
                style={[
                  styles.habitCardTitle,
                  isCompleted && styles.habitCardTitleCompleted,
                ]}
              >
                {habitName}
              </Text>
              {metaLine && (
                <Text style={styles.habitCardMeta}>
                  {metaLine}
                </Text>
              )}
            </View>

            {/* Chevron */}
            <Icon name="chevron-right" size={16} color="#6F7F77" />
          </View>
        </BaseCard>
      );
    } catch (error) {
      console.error('Error rendering habit item:', error, item);
      return (
        <BaseCard>
          <Text style={{ color: Colors.textSecondary }}>
            Unable to display this habit.
          </Text>
        </BaseCard>
      );
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading habits..." />;
  }

  // Show error state if habits failed to load
  if (habitsError) {
    return (
      <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle" size={64} color={Colors.error} />
          <Text variant="titleMedium" style={[styles.emptyTitle, { color: Colors.error }]}>
            Unable to Load Habits
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            There was a problem loading your habits. Please check your connection and try again.
          </Text>
          <Text variant="bodySmall" style={[styles.emptyText, { marginTop: Spacing.sm }]}>
            Error: {habitsError.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <LockedScreenOverlay feature="habits_basic">
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

      {/* Today's Date - Only show when NOT embedded in PlanScreen */}
      {!externalFilter && (
        <View style={styles.dateContainer}>
          <Text variant="titleMedium" style={styles.dateText}>
            Today: {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}

      {/* Inline Create Button - Only show when embedded in PlanScreen */}
      {showInlineCreate && (
        <InlineCreateButton
          label="Add a habit"
          onPress={handleCreateHabit}
        />
      )}

      {/* Habits List */}
      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="waves" size={32} color={Colors.silverSage} />
          </View>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            Your habits live here
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Start with one small thing that feels manageable.
          </Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          renderItem={renderHabitItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(100, 80 + insets.bottom) } // Account for FAB + safe area
          ]}
        />
      )}

      {/* FAB - Only show when NOT using inline create */}
      {!showInlineCreate && (
        <FAB
          icon="plus"
          label="New Habit"
          style={[styles.fab, { bottom: Math.max(Spacing.lg, insets.bottom + Spacing.sm) }]}
          onPress={handleCreateHabit}
          color={Colors.textOnPrimary}
        />
      )}

      {/* Create/Edit Modal */}
      <EnhancedModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        title={editingHabit ? 'Edit Habit' : 'New Habit'}
        subtitle="Build consistency, one day at a time"
        headerIcon="refresh"
        inputAccessoryViewID="habit-modal"
        maxHeightPercent={0.9}
        footer={
          <ModalFooterActions
            onCancel={() => setModalVisible(false)}
            onSubmit={handleSubmit}
            submitLabel={editingHabit ? 'Update' : 'Create'}
            submitLoading={submitting}
            submitDisabled={submitting}
          />
        }
      >
              {/* Step 1: Who Are You Becoming? */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="account-star" size={20} color={Colors.evergreenTeal} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Who Are You Becoming?
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.sectionDescription}>
                  Focus on the person you want to become, not just the outcome you want to achieve.
                </Text>

                <Input
                  label="Identity (e.g., 'A runner', 'Someone who writes')"
                  value={formData.identity}
                  onChangeText={(text) => setFormData({ ...formData, identity: text })}
                  placeholder="A person who..."
                  style={styles.input}
                />

                {formData.identity && (
                  <View style={styles.identityPreview}>
                    <Text variant="bodyMedium" style={styles.identityPreviewText}>
                      "I'm becoming {formData.identity.toLowerCase()}"
                    </Text>
                  </View>
                )}

                <Input
                  label="Outcome Goal (Optional)"
                  value={formData.outcomeGoal}
                  onChangeText={(text) => setFormData({ ...formData, outcomeGoal: text })}
                  placeholder="e.g., Run a 5K (de-emphasized)"
                  style={styles.input}
                />
              </View>

              {/* Step 2: What Action Proves It? */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="lightning-bolt" size={20} color={Colors.evergreenTeal} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    What Action Proves It?
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.sectionDescription}>
                  Be specific about what you'll do.
                </Text>

                <Input
                  label="Habit Name *"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="e.g., Run for 30 minutes"
                  style={styles.input}
                />
              </View>

              {/* Step 3: Quick Start System (Scaling Versions) */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="rocket-launch" size={20} color={Colors.evergreenTeal} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Start Small (Quick Start System)
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.sectionDescription}>
                  Make it flexible for tough days. All versions count! 🎯
                </Text>

                <Input
                  label="Full Version (Optional)"
                  value={formData.fullVersion}
                  onChangeText={(text) => setFormData({ ...formData, fullVersion: text })}
                  placeholder="e.g., Run for 30 minutes"
                  style={styles.input}
                />

                <Input
                  label="Quick Start (5-10 min version)"
                  value={formData.quickStartVersion}
                  onChangeText={(text) => setFormData({ ...formData, quickStartVersion: text })}
                  placeholder="e.g., Run for 10 minutes"
                  style={styles.input}
                />

                <Input
                  label="Just Show Up (1-2 min version)"
                  value={formData.justShowUpVersion}
                  onChangeText={(text) => setFormData({ ...formData, justShowUpVersion: text })}
                  placeholder="e.g., Put on shoes, step outside"
                  style={styles.input}
                />

                <View style={styles.quickStartInfo}>
                  <Icon name="information-outline" size={16} color={Colors.evergreenTeal} />
                  <Text variant="bodySmall" style={styles.quickStartInfoText}>
                    On tough days, showing up is the win. Every version counts toward your progress!
                  </Text>
                </View>
              </View>

              {/* Step 4: Your When/Where Plan */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="calendar-clock" size={20} color={Colors.evergreenTeal} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Your When/Where Plan
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.sectionDescription}>
                  Clear plans increase success by 3x!
                </Text>

                <Text variant="bodyMedium" style={styles.fieldLabel}>
                  Trigger Type
                </Text>
                <View style={styles.cueTypeButtons}>
                  {[
                    { type: 'time', label: 'Time', icon: 'clock-outline' },
                    { type: 'after_habit', label: 'After Habit', icon: 'link-variant' },
                    { type: 'location', label: 'Location', icon: 'map-marker' },
                    { type: 'emotion', label: 'Feeling', icon: 'emoticon-happy-outline' },
                  ].map((cueOption) => (
                    <TouchableOpacity
                      key={cueOption.type}
                      onPress={() => setFormData({ ...formData, cueType: cueOption.type as any })}
                      style={[
                        styles.cueTypeButton,
                        formData.cueType === cueOption.type && styles.cueTypeButtonActive,
                      ]}
                    >
                      <Icon
                        name={cueOption.icon}
                        size={16}
                        color={formData.cueType === cueOption.type ? Colors.textOnPrimary : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.cueTypeButtonText,
                          formData.cueType === cueOption.type && styles.cueTypeButtonTextActive,
                        ]}
                      >
                        {cueOption.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Input
                  label={
                    formData.cueType === 'time' ? 'Time (e.g., 7:00 AM)' :
                    formData.cueType === 'after_habit' ? 'After which habit/routine?' :
                    formData.cueType === 'location' ? 'Where?' :
                    'When you feel...'
                  }
                  value={formData.cueValue}
                  onChangeText={(text) => setFormData({ ...formData, cueValue: text })}
                  placeholder={
                    formData.cueType === 'time' ? '7:00 AM' :
                    formData.cueType === 'after_habit' ? 'After morning coffee' :
                    formData.cueType === 'location' ? 'At my desk' :
                    'Stressed'
                  }
                  style={styles.input}
                />

                {formData.cueValue && (
                  <View style={styles.intentionPreview}>
                    <Text variant="bodySmall" style={styles.intentionPreviewLabel}>
                      Your plan:
                    </Text>
                    <Text variant="bodyMedium" style={styles.intentionPreviewText}>
                      "{
                        formData.cueType === 'time' ? `At ${formData.cueValue}` :
                        formData.cueType === 'after_habit' ? `After ${formData.cueValue}` :
                        formData.cueType === 'location' ? `At ${formData.cueValue}` :
                        `When I feel ${formData.cueValue}`
                      }, I will {formData.name.toLowerCase() || '...'}"
                    </Text>
                  </View>
                )}
              </View>

              {/* Step 5: Problem Context (Optional) */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="lightbulb-outline" size={20} color={Colors.evergreenTeal} />
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    What Problem Are You Solving? (Optional)
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.sectionDescription}>
                  Understanding your "why" makes the habit more meaningful.
                </Text>

                <Input
                  label="Problem"
                  value={formData.problem}
                  onChangeText={(text) => setFormData({ ...formData, problem: text })}
                  placeholder="e.g., I feel stressed after work"
                  style={styles.input}
                  multiline
                  numberOfLines={2}
                />
              </View>

              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Category
              </Text>
              <Menu
                visible={categoryMenuVisible}
                onDismiss={() => setCategoryMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.categoryDropdown}
                    onPress={() => setCategoryMenuVisible(true)}
                  >
                    <Text style={styles.categoryValue}>
                      {formData.category || 'Select a category'}
                    </Text>
                    <Icon
                      name={categoryMenuVisible ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </TouchableOpacity>
                }
              >
                {HABIT_CATEGORIES.map((category) => (
                  <Menu.Item
                    key={category}
                    onPress={() => {
                      setFormData({ ...formData, category });
                      setCategoryMenuVisible(false);
                    }}
                    title={category}
                  />
                ))}
              </Menu>

              {/* Pillar Impact Preview */}
              {formData.category && (() => {
                const mapping = getHabitBrainMapping(formData.category);
                const pillars = getBrainPillars(formData.category);
                const neurochemicalTags = getNeurochemicalTags(formData.category);

                return (
                  <View style={styles.pillarImpactSection}>
                    <View style={styles.pillarImpactHeader}>
                      <Icon name="brain" size={20} color={Colors.evergreenTeal} />
                      <Text variant="titleSmall" style={styles.pillarImpactTitle}>
                        Brain Health Benefits
                      </Text>
                    </View>

                    {/* Description */}
                    {mapping?.description && (
                      <Text variant="bodySmall" style={styles.pillarImpactDescription}>
                        {mapping.description}
                      </Text>
                    )}

                    {/* Neurochemical Tags */}
                    {neurochemicalTags.length > 0 && (
                      <View style={styles.neurochemicalTagsRow}>
                        {neurochemicalTags.slice(0, 3).map((impact, index) => (
                          <View key={index} style={styles.neurochemicalTag}>
                            <Icon name={impact.icon} size={14} color={Colors.textSecondary} />
                            <Text variant="bodySmall" style={styles.neurochemicalTagText}>
                              {formatNeurochemicalTag(impact)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Brain Pillars */}
                    {pillars.length > 0 && (
                      <View style={styles.pillarBadgesContainer}>
                        <Text variant="bodySmall" style={styles.pillarBadgesLabel}>
                          Supports:
                        </Text>
                        <View style={styles.pillarBadgesRow}>
                          {pillars.map((pillar) => (
                            <BrainPillarBadge key={pillar} pillar={pillar} showIcon={false} />
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })()}

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

      </EnhancedModal>

      {/* Brain Pillar Info Modal */}
      <BrainPillarInfoModal
        visible={pillarInfoVisible}
        onDismiss={() => setPillarInfoVisible(false)}
      />

      {/* Confetti Overlay - All habits completed */}
      <ConfettiOverlay
        visible={showConfetti}
        onComplete={dismissConfetti}
        duration={3000}
      />

      {/* Streak Milestone Modal */}
      {pendingMilestone && (
        <StreakMilestoneModal
          visible={!!pendingMilestone}
          onDismiss={dismissMilestone}
          habitName={pendingMilestone.habitName}
          streakCount={pendingMilestone.streakCount}
          milestone={pendingMilestone.milestone}
        />
      )}
    </SafeAreaView>
    </LockedScreenOverlay>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  dateContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.dewSage,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.base,
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
    marginBottom: Spacing.base,
  },
  habitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  habitInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  habitName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
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
  wellnessInsights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  wellnessTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  wellnessTagText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  learnMoreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.evergreenTeal + '40',
  },
  learnMoreTagText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  streakContainer: {
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: Typography.fontSize['2xl'],
  },
  streakNumber: {
    color: Colors.sunriseAmber,
    fontWeight: Typography.fontWeight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.base,
    backgroundColor: Colors.mistWhite,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: Layout.borderWidth.thin,
    backgroundColor: Colors.border,
  },
  statLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  statValue: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  habitActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    marginLeft: Spacing.sm,
  },
  // Simplified Habit Card Styles (per Vara UI Standards)
  habitCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxWrapper: {
    paddingTop: 1, // Align with title baseline
  },
  habitCardContent: {
    flex: 1,
    marginLeft: 14,
  },
  habitCardTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#3E3E3E',
    lineHeight: 21,
  },
  habitCardTitleCompleted: {
    color: '#6F7F77',
    textDecorationLine: 'line-through',
  },
  habitCardMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6F7F77',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    opacity: 0.6,
  },
  emptyIcon: {
    fontSize: 48, // Large empty state icon
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6F7F77',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 21,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  input: {
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  categoryDropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.base,
  },
  categoryValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    flex: 1,
  },
  pillarImpactSection: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.evergreenTeal + '40',
  },
  pillarImpactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  pillarImpactTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  pillarImpactDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  neurochemicalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  neurochemicalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
  },
  neurochemicalTagText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  pillarBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pillarBadgesLabel: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  pillarBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
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
    fontWeight: Typography.fontWeight.semibold,
  },
  // Vara Habits Enhancement Styles
  section: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  identityPreview: {
    backgroundColor: Colors.dewSage,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.evergreenTeal + '40',
  },
  identityPreviewText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    fontStyle: 'italic',
  },
  quickStartInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.dewSage,
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius.sm,
    marginTop: Spacing.sm,
  },
  quickStartInfoText: {
    flex: 1,
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * 1.4,
  },
  cueTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
  },
  cueTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cueTypeButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  cueTypeButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  cueTypeButtonTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  intentionPreview: {
    backgroundColor: Colors.mistWhite,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    marginTop: Spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
  },
  intentionPreviewLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
  intentionPreviewText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  // Habit Card Enhancement Styles
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dewSage,
    borderTopLeftRadius: Layout.borderRadius.md,
    borderTopRightRadius: Layout.borderRadius.md,
  },
  identityHeaderText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  milestoneText: {
    color: Colors.sunriseAmber,
    fontWeight: Typography.fontWeight.medium,
  },
  stepsProgress: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.mistWhite,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  stepsLabel: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  stepsCount: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 3,
  },
  progressMessage: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  intentionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.mistWhite,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Spacing.sm,
  },
  intentionDisplayText: {
    flex: 1,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default HabitsScreen;
