/**
 * Dashboard Screen
 * Main home screen showing wellness overview
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Card as PaperCard, IconButton, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Button, Card, LoadingSpinner, StatCard, PriorityBadge, ProgressBar, BrainPillarBadge, BrainPillarInfoModal } from '../components';
import { FourThreeTwoOneCard, ProgressNudgeCard } from '../components/dashboard';
import { BrainReadinessWidget, NeuroplasticityTracker, NervousSystemToolsWidget, AMCCChallengeCard, FocusWindowIndicator, WeeklyBrainMetricsChart } from '../components/brain';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useGoals, useHabits, useTasks } from '../hooks';
import { markHabitComplete, completeTask, getHabitCompletions, isHabitCompletedToday, unmarkHabitComplete } from '../services/firebase';
import { generateDailyPlan } from '../services/api/ai.service';
import { getBrainPillars } from '../constants/brainHealthMapping';
import { BrainPillar } from '../types';
import * as SecureStore from 'expo-secure-store';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

// Responsive breakpoints for habit tracker
const SMALL_SCREEN_WIDTH = 375;
const MEDIUM_SCREEN_WIDTH = 414;

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const { goals, loading: goalsLoading } = useGoals();
  const { habits, loading: habitsLoading } = useHabits(true); // Active habits only
  const { tasks: allTasks, loading: tasksLoading } = useTasks(); // All tasks
  const [refreshing, setRefreshing] = useState(false);
  const [realStreaks, setRealStreaks] = useState<{ [habitId: string]: number }>({});
  const [processingHabits, setProcessingHabits] = useState<Set<string>>(new Set());
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [weeklyCompletions, setWeeklyCompletions] = useState<{ [habitId: string]: { [date: string]: boolean } }>({});
  const [dailyPlan, setDailyPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [pillarInfoVisible, setPillarInfoVisible] = useState(false);
  const [weeklyFocusSessions, setWeeklyFocusSessions] = useState<number>(0);
  const [weeklyUltradianSessions, setWeeklyUltradianSessions] = useState<number>(0); // 90-min sessions for Resilience
  const [weeklyJournalEntries, setWeeklyJournalEntries] = useState<number>(0);
  const [weeklyCommunityActions, setWeeklyCommunityActions] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'today' | 'brain'>('today');

  // Responsive: Determine how many days to show based on screen width
  // Small screens (<375px): 5 days, Medium (375-414px): 6 days, Large (>414px): 7 days
  const daysToShow = useMemo(() => {
    if (screenWidth < SMALL_SCREEN_WIDTH) return 5;
    if (screenWidth < MEDIUM_SCREEN_WIDTH) return 6;
    return 7;
  }, [screenWidth]);

  // Calculate minimum touch target size (48px for accessibility)
  const isCompactMode = screenWidth < SMALL_SCREEN_WIDTH;

  // Get today's date for habit completion
  const today = new Date().toISOString().split('T')[0];

  // Get last N days (responsive based on screen width)
  const getLastNDays = (numDays: number) => {
    const days = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        // Use single letter on very small screens, short name otherwise
        dayName: isCompactMode
          ? date.toLocaleDateString('en-US', { weekday: 'narrow' })
          : date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toISOString().split('T')[0] === today,
      });
    }
    return days;
  };

  // Memoize to avoid recalculating on every render
  const visibleDays = useMemo(() => getLastNDays(daysToShow), [daysToShow, today, isCompactMode]);

  // Load daily plan from storage on mount
  useEffect(() => {
    const loadDailyPlan = async () => {
      try {
        const storedPlan = await SecureStore.getItemAsync(`dailyPlan_${today}`);
        if (storedPlan) {
          setDailyPlan(storedPlan);
        }
      } catch (error) {
        console.error('Error loading daily plan:', error);
      }
    };

    loadDailyPlan();
  }, [today]);

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

  /**
   * Calculate weekly pillar engagement from ALL activities
   *
   * What counts toward each pillar:
   * - ALL PILLARS: Habits mapped via category → brain health mapping
   * - FOCUS: Focus sessions (Pomodoro/90-min deep work)
   * - RESILIENCE: 90-minute ultradian focus sessions (mental endurance)
   * - GROWTH: Journal entries (reflection & learning)
   * - CONNECTION: Community actions (posts, messages, connections)
   *
   * Note: Routines (breathwork, meditation, movement) will count once completion tracking is implemented
   */
  const calculateWeeklyPillarEngagement = (): { pillar: BrainPillar; count: number }[] => {
    const pillarCounts: { [key: string]: number } = {};

    // 1. Count completed habits by their brain pillars
    habits.forEach(habit => {
      if (habit.category) {
        const pillars = getBrainPillars(habit.category);
        const completions = weeklyCompletions[habit.id] || {};
        const weeklyCount = Object.values(completions).filter(c => c).length;

        pillars.forEach(pillar => {
          pillarCounts[pillar] = (pillarCounts[pillar] || 0) + weeklyCount;
        });
      }
    });

    // 2. Count focus sessions → Focus pillar
    // Each focus session counts as 1 activity toward Focus
    if (weeklyFocusSessions > 0) {
      pillarCounts['focus'] = (pillarCounts['focus'] || 0) + weeklyFocusSessions;
    }

    // 90-min ultradian sessions also count toward Resilience (building mental endurance)
    if (weeklyUltradianSessions > 0) {
      pillarCounts['resilience'] = (pillarCounts['resilience'] || 0) + weeklyUltradianSessions;
    }

    // 3. Count journal entries → Growth pillar
    // Each journal entry counts as 1 activity toward Growth
    if (weeklyJournalEntries > 0) {
      pillarCounts['growth'] = (pillarCounts['growth'] || 0) + weeklyJournalEntries;
    }

    // 4. Count community actions → Connection pillar
    // Posts, comments, messages, connections all count toward Connection
    if (weeklyCommunityActions > 0) {
      pillarCounts['connection'] = (pillarCounts['connection'] || 0) + weeklyCommunityActions;
    }

    // Convert to array and sort by count
    const sorted = Object.entries(pillarCounts)
      .map(([pillar, count]) => ({ pillar: pillar as BrainPillar, count }))
      .sort((a, b) => b.count - a.count);

    return sorted;
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
          visibleDays.forEach(day => {
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

  // Load weekly activity data (focus sessions, journal entries, community actions)
  useEffect(() => {
    const loadWeeklyActivityData = async () => {
      if (!user) return;

      // Calculate timestamp for 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weekStart = Timestamp.fromDate(sevenDaysAgo);

      // 1. Count focus sessions from past 7 days
      let totalFocusSessions = 0;
      let ultradianCount = 0;
      try {
        const focusSessionsQuery = query(
          collection(db, 'focusSessions'),
          where('userId', '==', user.uid),
          where('createdAt', '>=', weekStart),
          where('completed', '==', true)
        );
        const focusSnapshot = await getDocs(focusSessionsQuery);

        totalFocusSessions = focusSnapshot.size;
        focusSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.duration === 90 || data.type === 'ultradian') {
            ultradianCount++;
          }
        });
      } catch (error) {
        console.log('No focus sessions data available (likely new user)');
      }
      setWeeklyFocusSessions(totalFocusSessions);
      setWeeklyUltradianSessions(ultradianCount);

      // 2. Count journal entries from past 7 days
      let journalCount = 0;
      try {
        const journalQuery = query(
          collection(db, 'journalEntries'),
          where('userId', '==', user.uid),
          where('createdAt', '>=', weekStart)
        );
        const journalSnapshot = await getDocs(journalQuery);
        journalCount = journalSnapshot.size;
      } catch (error) {
        console.log('No journal entries data available (likely new user)');
      }
      setWeeklyJournalEntries(journalCount);

      // 3. Count community actions from past 7 days
      let postsCount = 0;
      let messagesCount = 0;
      let connectionsCount = 0;

      // Posts created
      try {
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', user.uid),
          where('createdAt', '>=', weekStart)
        );
        const postsSnapshot = await getDocs(postsQuery);
        postsCount = postsSnapshot.size;
      } catch (error) {
        console.log('No posts data available (likely new user)');
      }

      // Messages sent (direct messages)
      try {
        const messagesQuery = query(
          collection(db, 'directMessages'),
          where('senderId', '==', user.uid),
          where('createdAt', '>=', weekStart)
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        messagesCount = messagesSnapshot.size;
      } catch (error) {
        console.log('No messages data available (likely new user)');
      }

      // Connections made (accepted connections where user initiated)
      try {
        const connectionsQuery = query(
          collection(db, 'connections'),
          where('a', '==', user.uid),
          where('status', '==', 'accepted'),
          where('createdAt', '>=', weekStart)
        );
        const connectionsSnapshot = await getDocs(connectionsQuery);
        connectionsCount = connectionsSnapshot.size;
      } catch (error) {
        console.log('No connections data available (likely new user)');
      }

      // Total community actions
      const totalCommunityActions = postsCount + messagesCount + connectionsCount;
      setWeeklyCommunityActions(totalCommunityActions);
    };

    loadWeeklyActivityData();
  }, [user]);

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
    // Add haptic feedback for better touch response
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
        // Mark complete - stronger haptic for completion
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const handleGenerateDailyPlan = async () => {
    setGeneratingPlan(true);
    try {
      const response = await generateDailyPlan({
        userId: user!.uid,
        goals: goals.slice(0, 5),
        habits: habits.slice(0, 10),
        tasks: tasks.slice(0, 10),
      });

      setDailyPlan(response.plan);

      // Store plan in secure storage for today
      await SecureStore.setItemAsync(`dailyPlan_${today}`, response.plan);
    } catch (error) {
      console.error('Error generating daily plan:', error);
      // Show error to user
      alert('Failed to generate daily plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
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
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text variant="displaySmall" style={styles.greeting}>
                Hello, {user?.displayName?.split(' ')[0] || 'there'}!
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                Here's your wellness overview
              </Text>
            </View>
            <IconButton
              icon="cog-outline"
              size={28}
              iconColor={Colors.evergreenTeal}
              onPress={() => navigation.navigate('ProfileStack' as never)}
              style={styles.settingsButton}
            />
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <SegmentedButtons
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'today' | 'brain')}
            buttons={[
              {
                value: 'today',
                label: 'Today',
                icon: 'calendar-today',
              },
              {
                value: 'brain',
                label: 'Brain Health',
                icon: 'brain',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>

        {/* Today Tab Content */}
        {activeTab === 'today' && (
          <View>
        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatCard
            value={activeGoals}
            label="Active Goals"
            icon="target"
          />
          <StatCard
            value={`🔥 ${totalStreak}`}
            label="Total Streak"
            color={Colors.sunriseAmber}
            icon="fire"
            iconColor={Colors.sunriseAmber}
          />
          <StatCard
            value={pendingTasks}
            label="Tasks To Do"
            icon="checkbox-marked-circle-outline"
          />
        </View>

        {/* Progress Nudge Card - Motivational prompt */}
        <ProgressNudgeCard
          habits={habits}
          completedToday={completedToday}
          realStreaks={realStreaks}
          onHabitPress={(habitId) => navigation.navigate('Plan' as never, { tab: 'habits', highlightHabit: habitId } as never)}
        />

        {/* Weekly Wellness Summary */}
        {(() => {
          const pillarEngagement = calculateWeeklyPillarEngagement();
          const topPillars = pillarEngagement.slice(0, 3);

          // Only show if there's at least one activity
          const hasActivities = habits.length > 0 || weeklyFocusSessions > 0 || weeklyJournalEntries > 0 || weeklyCommunityActions > 0;
          if (!hasActivities || topPillars.length === 0) return null;

          // Find the pillar with highest count for the main message
          const topPillar = topPillars[0];
          const pillarLabels: { [key in BrainPillar]: string } = {
            growth: 'Growth',
            energy: 'Energy',
            focus: 'Focus',
            resilience: 'Resilience',
            connection: 'Connection',
          };

          return (
            <Card style={styles.wellnessSummaryCard}>
              <View style={styles.wellnessSummaryHeader}>
                <Text variant="titleMedium" style={styles.wellnessSummaryTitle}>
                  This Week's Wellness Focus
                </Text>
                <IconButton
                  icon="information-outline"
                  size={20}
                  iconColor={Colors.evergreenTeal}
                  onPress={() => setPillarInfoVisible(true)}
                  style={styles.infoButton}
                />
              </View>
              <Text variant="bodyMedium" style={styles.wellnessSummarySubtitle}>
                Your activities this week are supporting these brain health pillars:
              </Text>
              <Text variant="bodySmall" style={styles.wellnessActivityTypes}>
                {[
                  habits.length > 0 && 'Habits',
                  weeklyFocusSessions > 0 && 'Focus',
                  weeklyJournalEntries > 0 && 'Journaling',
                  weeklyCommunityActions > 0 && 'Community'
                ].filter(Boolean).join(' • ')}
              </Text>
              <View style={styles.wellnessPillarsRow}>
                {topPillars.map(({ pillar, count }) => (
                  <View key={pillar} style={styles.wellnessPillarItem}>
                    <BrainPillarBadge pillar={pillar} />
                    <Text variant="bodySmall" style={styles.wellnessPillarCount}>
                      {count} {count === 1 ? 'activity' : 'activities'}
                    </Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => setPillarInfoVisible(true)}
                style={styles.learnMoreButton}
              >
                <Text variant="bodySmall" style={styles.learnMoreText}>
                  Learn about brain health pillars
                </Text>
              </TouchableOpacity>
            </Card>
          );
        })()}

        {/* Daily AI Plan */}
        {dailyPlan && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Today's AI Plan
              </Text>
              <IconButton
                icon="close"
                size={20}
                onPress={async () => {
                  setDailyPlan(null);
                  await SecureStore.deleteItemAsync(`dailyPlan_${today}`);
                }}
              />
            </View>
            <View style={styles.planScrollContainer}>
              <ScrollView
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <Text variant="bodyMedium" style={styles.planText}>
                  {dailyPlan}
                </Text>
              </ScrollView>
            </View>
          </Card>
        )}

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
                {visibleDays.map((day) => (
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
                          onPress={() => !isFutureDate && handleHabitToggle(habit.id, day.date)}
                          disabled={isProcessing || isFutureDate}
                          accessibilityLabel={`${isCompleted ? 'Completed' : 'Not completed'} ${habitName} on ${day.dayName}`}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isCompleted, disabled: isFutureDate }}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                          <View style={styles.checkboxTouchTarget}>
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
            <Button
              variant="text"
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Plan' as never, { tab: 'habits' } as never)}
            >
              View All Habits →
            </Button>
          )}
        </Card>

        {/* 4-3-2-1 Daily Practice */}
        <FourThreeTwoOneCard />

        {/* Priority Tasks */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Plan' as never, { tab: 'tasks' } as never)}
        >
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
                      <PriorityBadge priority={task.priority} />
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
            <Button
              variant="text"
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Plan' as never, { tab: 'tasks' } as never)}
            >
              View All Tasks →
            </Button>
          )}
          </Card>
        </TouchableOpacity>

        {/* Goals Progress */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Plan' as never, { tab: 'goals' } as never)}
        >
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
                  <ProgressBar progress={goal.progress} />
                </View>
              ))}
            </View>
          )}

          {goals.length > 3 && (
            <Button
              variant="text"
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Plan' as never, { tab: 'goals' } as never)}
            >
              View All Goals →
            </Button>
          )}
          </Card>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Button
            variant="primary"
            fullWidth
            style={styles.actionButton}
            onPress={handleGenerateDailyPlan}
            disabled={generatingPlan || !!dailyPlan}
          >
            {generatingPlan ? 'Generating...' : dailyPlan ? '✓ Plan Generated' : 'Generate Daily Plan with AI'}
          </Button>
          <Button
            variant="outline"
            fullWidth
            style={styles.actionButton}
            onPress={() => navigation.navigate('Journal' as never)}
          >
            Add Journal Entry
          </Button>
        </View>
          </View>
        )}

        {/* Brain Health Tab Content */}
        {activeTab === 'brain' && (
          <View style={styles.brainHealthTab}>
            <Text variant="headlineSmall" style={styles.brainHealthTitle}>
              Brain Health Dashboard
            </Text>
            <Text variant="bodyMedium" style={styles.brainHealthSubtitle}>
              Track your cognitive wellness and build brain-healthy habits
            </Text>

            {/* Brain Health Widgets */}
            <BrainReadinessWidget />
            <FocusWindowIndicator />
            <NeuroplasticityTracker />
            <AMCCChallengeCard />
            <NervousSystemToolsWidget />
            <WeeklyBrainMetricsChart />
          </View>
        )}
      </ScrollView>

      {/* Brain Pillar Info Modal */}
      <BrainPillarInfoModal
        visible={pillarInfoVisible}
        onDismiss={() => setPillarInfoVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  settingsButton: {
    margin: 0,
    marginTop: -8,
  },
  greeting: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
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
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionCount: {
    color: Colors.textSecondary,
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.lg,
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
    borderBottomWidth: Layout.borderWidth.medium,
    borderBottomColor: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  habitNameColumn: {
    flex: 1.2, // Reduced from 1.5 to give more space to day columns
    paddingRight: Spacing.xs,
    justifyContent: 'center',
    minWidth: 80, // Minimum width for habit names
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
    minWidth: 40, // Reduced to prevent overflow
    minHeight: 44,
    paddingVertical: 2,
    paddingHorizontal: 1,
  },
  todayColumn: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.sm,
    marginHorizontal: 1, // Small margin to prevent edge overflow
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
    minHeight: 56, // Ensure adequate row height for touch targets
    paddingVertical: Spacing.xs,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  habitRowName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.sm,
    marginBottom: 2,
  },
  habitRowStreak: {
    color: Colors.sunriseAmber,
    fontSize: Typography.fontSize.xs,
  },
  // Touch target wrapper - provides good touch area while fitting in column
  checkboxTouchTarget: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: Layout.borderRadius.full,
    borderWidth: Layout.borderWidth.medium,
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
    borderWidth: Layout.borderWidth.thick,
  },
  checkmark: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
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
  tasksList: {
    marginBottom: Spacing.sm,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
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
  goalsList: {
    marginBottom: Spacing.sm,
  },
  goalItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  goalTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
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
  planScrollContainer: {
    maxHeight: 200,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
  },
  planText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * 1.6,
  },
  wellnessSummaryCard: {
    marginBottom: Spacing.lg,
    backgroundColor: Colors.dewSage,
  },
  wellnessSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  wellnessSummaryTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  infoButton: {
    margin: 0,
  },
  wellnessSummarySubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  wellnessActivityTypes: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.md,
  },
  wellnessPillarsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  wellnessPillarItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: Spacing.xs / 2,
  },
  wellnessPillarCount: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  learnMoreButton: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  learnMoreText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    textDecorationLine: 'underline',
  },
  tabContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  brainHealthTab: {
    paddingHorizontal: Spacing.lg,
  },
  brainHealthTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  brainHealthSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  comingSoonCard: {
    backgroundColor: Colors.dewSage,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  comingSoonTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  comingSoonText: {
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * 1.8,
  },
});

export default DashboardScreen;
