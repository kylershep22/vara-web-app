/**
 * Dashboard Screen
 * Main home screen showing wellness overview
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Button, Card, LoadingSpinner } from '../components';
import {
  FourThreeTwoOneCard,
  BrainHealthInsightStrip,
  NextBestActionCard,
  WellnessScoreCard,
  WellnessScoreBreakdown,
  MorningCheckIn,
  WellnessScoreOptInCard,
  QuickActionsRow,
} from '../components/dashboard';
import WelcomeBackCard from '../components/dashboard/WelcomeBackCard';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import { ConsistencyBadge } from '../components/habits';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGoals, useHabits, useTasks, useJournal, useFeatureDiscovery } from '../hooks';
import { useNotificationOptInCards } from '../hooks/useNotificationOptInCards';
import {
  markHabitComplete,
  getHabitCompletions,
  isHabitCompletedToday,
  unmarkHabitComplete,
  getMorningCheckIn,
  saveMorningCheckIn,
  calculateWellnessScore,
  refreshWellnessScore,
  getTodayWellnessScore,
  getTodayEntry,
  getWellnessScoreEnabled,
  setWellnessScoreEnabled,
} from '../services/firebase';
import { generateDailyPlan } from '../services/api/ai.service';
import * as SecureStore from 'expo-secure-store';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { DailyWellnessScore, MorningCheckIn as MorningCheckInType, FourThreeTwoOneEntry } from '../types';

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
  const { entries: journalEntries } = useJournal(1); // Get most recent entry for lastJournalDate

  // Feature discovery engagement tracking
  const { trackEngagement, evaluateTriggers, pendingToasts, markToastShown } = useFeatureDiscovery();
  const { queueUnlockToasts } = useToast();

  // Progressive notification opt-in cards
  const { activeCard: notifOptInCard, onOptIn: handleNotifOptIn, onDismiss: handleNotifDismiss } = useNotificationOptInCards();

  // Get last journal date for NextBestAction priority
  const lastJournalDate = useMemo(() => {
    if (journalEntries.length === 0) return null;
    const entry = journalEntries[0];
    if (entry.createdAt?.toDate) return entry.createdAt.toDate();
    if (entry.createdAt?.seconds) return new Date(entry.createdAt.seconds * 1000);
    return null;
  }, [journalEntries]);
  const [refreshing, setRefreshing] = useState(false);
  const [realStreaks, setRealStreaks] = useState<{ [habitId: string]: number }>({});
  const [allCompletions, setAllCompletions] = useState<{ [habitId: string]: string[] }>({});
  const [processingHabits, setProcessingHabits] = useState<Set<string>>(new Set());
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [weeklyCompletions, setWeeklyCompletions] = useState<{ [habitId: string]: { [date: string]: boolean } }>({});
  const [dailyPlan, setDailyPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);

  // Wellness Score state
  const [wellnessScore, setWellnessScore] = useState<DailyWellnessScore | null>(null);
  const [wellnessScoreLoading, setWellnessScoreLoading] = useState(true);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [morningCheckIn, setMorningCheckIn] = useState<MorningCheckInType | null>(null);
  const [morningCheckInLoading, setMorningCheckInLoading] = useState(false);
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
  const [fourThreeTwoOneEntry, setFourThreeTwoOneEntry] = useState<FourThreeTwoOneEntry | null>(null);

  // Wellness Score opt-in state
  const [wellnessScoreEnabled, setWellnessScoreEnabledState] = useState<boolean | null>(null);
  const [showOptInPrompt, setShowOptInPrompt] = useState(true);

  // Welcome-back card state (shown if user was away 3+ days)
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Track lastActiveAt and check for returning user
  useEffect(() => {
    if (!user?.uid) return;
    const checkAndUpdate = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const data = userDoc.data();
        if (data?.lastActiveAt) {
          const lastActive = data.lastActiveAt.toDate ? data.lastActiveAt.toDate() : new Date(data.lastActiveAt);
          const daysSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= 3) {
            setShowWelcomeBack(true);
          }
        }
        // Update lastActiveAt
        await updateDoc(userRef, { lastActiveAt: serverTimestamp() });
      } catch (error) {
        console.log('Error updating lastActiveAt:', error);
      }
    };
    checkAndUpdate();
  }, [user?.uid]);

  // Responsive: Determine how many days to show based on screen width
  // Small screens (<375px): 5 days, Medium (375-414px): 6 days, Large (>414px): 7 days
  const daysToShow = useMemo(() => {
    if (screenWidth < SMALL_SCREEN_WIDTH) return 5;
    if (screenWidth < MEDIUM_SCREEN_WIDTH) return 6;
    return 7;
  }, [screenWidth]);

  // Calculate minimum touch target size (48px for accessibility)
  const isCompactMode = screenWidth < SMALL_SCREEN_WIDTH;

  // Get today's date for habit completion (local timezone)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Formatted date for header display (e.g., "Saturday, February 8")
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const greeting = user?.displayName?.split(' ')[0]
    ? `${getTimeBasedGreeting()}, ${user.displayName.split(' ')[0]}`
    : getTimeBasedGreeting();

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

  // Load wellness score opt-in preference
  useEffect(() => {
    const loadWellnessPreference = async () => {
      if (!user?.uid) return;
      try {
        const enabled = await getWellnessScoreEnabled(user.uid);
        setWellnessScoreEnabledState(enabled);
      } catch (error) {
        console.error('Error loading wellness score preference:', error);
        setWellnessScoreEnabledState(false);
      }
    };

    loadWellnessPreference();
  }, [user?.uid]);

  // Track new session for feature discovery
  useEffect(() => {
    if (user?.uid) {
      trackEngagement('sessionCount').then(() => {
        // Evaluate triggers after tracking session
        evaluateTriggers();
      }).catch(console.error);
    }
  }, [user?.uid]);

  // Show toasts for newly unlocked features
  useEffect(() => {
    if (pendingToasts.length > 0) {
      const featureIds = pendingToasts.map(t => t.featureId);
      queueUnlockToasts(featureIds);
      // Mark toasts as shown
      featureIds.forEach(id => markToastShown(id).catch(console.error));
    }
  }, [pendingToasts, queueUnlockToasts, markToastShown]);

  // Load wellness score, morning check-in, and 4-3-2-1 entry
  useEffect(() => {
    const loadWellnessData = async () => {
      if (!user?.uid) return;

      setWellnessScoreLoading(true);
      try {
        // Load all wellness data in parallel for better performance
        const [existingCheckIn, todayFourThreeTwoOne] = await Promise.all([
          getMorningCheckIn(user.uid),
          getTodayEntry(user.uid),
        ]);

        setMorningCheckIn(existingCheckIn);
        setFourThreeTwoOneEntry(todayFourThreeTwoOne);

        // Show morning check-in prompt if not yet done today (only in the morning)
        const hour = new Date().getHours();
        if (!existingCheckIn && hour < 12) {
          setShowMorningCheckIn(true);
        }

        // Calculate or fetch today's wellness score
        const existingScore = await getTodayWellnessScore(user.uid);
        if (existingScore) {
          setWellnessScore(existingScore);
        } else {
          // Calculate fresh score
          const newScore = await calculateWellnessScore(user.uid);
          setWellnessScore(newScore);
        }
      } catch (error) {
        console.error('Error loading wellness data:', error);
      } finally {
        setWellnessScoreLoading(false);
      }
    };

    loadWellnessData();
  }, [user?.uid, today]);

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
      const allCompletionDates: { [habitId: string]: string[] } = {};

      for (const habit of habits) {
        try {
          const completionsData = await getHabitCompletions(habit.id);
          const completionDates = completionsData.map((c) => c.date);
          streaks[habit.id] = calculateCurrentStreak(completionDates);

          // Store all completion dates for ConsistencyBadge
          allCompletionDates[habit.id] = completionDates;

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
          allCompletionDates[habit.id] = [];
        }
      }

      setRealStreaks(streaks);
      setWeeklyCompletions(weekly);
      setCompletedToday(completedSet);
      setAllCompletions(allCompletionDates);
    };

    if (habits.length > 0) {
      loadHabitData();
    }
  }, [habits]);

  // Filter tasks to show only incomplete ones (used for AI plan generation)
  const tasks = allTasks.filter((task) => !task.completed);

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
          // Track habit completion for feature discovery
          trackEngagement('habitsCompleted').then(() => evaluateTriggers()).catch(console.error);
        }
      }

      // Recalculate streak and update completions for this habit
      const completionsData = await getHabitCompletions(habitId);
      const completionDates = completionsData.map((c) => c.date);
      setRealStreaks(prev => ({
        ...prev,
        [habitId]: calculateCurrentStreak(completionDates)
      }));
      setAllCompletions(prev => ({
        ...prev,
        [habitId]: completionDates
      }));

      // Refresh wellness score if today's habit was toggled (affects Consistency pillar)
      if (date === today && user?.uid) {
        try {
          const newScore = await refreshWellnessScore(user.uid);
          setWellnessScore(newScore);
        } catch (error) {
          console.error('Error refreshing wellness score after habit toggle:', error);
        }
      }
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

  // Handle morning check-in submission
  const handleMorningCheckInComplete = async (energyLevel: number, mood: number) => {
    if (!user?.uid) return;

    setMorningCheckInLoading(true);
    try {
      const checkIn = await saveMorningCheckIn(user.uid, energyLevel, mood);
      setMorningCheckIn(checkIn);
      setShowMorningCheckIn(false);

      // Track morning check-in for feature discovery
      trackEngagement('morningCheckInsCompleted').then(() => evaluateTriggers()).catch(console.error);

      // Refresh wellness score with new check-in data
      const newScore = await refreshWellnessScore(user.uid);
      setWellnessScore(newScore);
    } catch (error) {
      console.error('Error saving morning check-in:', error);
    } finally {
      setMorningCheckInLoading(false);
    }
  };

  // Handle wellness score refresh
  const handleRefreshWellnessScore = async () => {
    if (!user?.uid) return;

    setWellnessScoreLoading(true);
    try {
      const newScore = await refreshWellnessScore(user.uid);
      setWellnessScore(newScore);
    } catch (error) {
      console.error('Error refreshing wellness score:', error);
    } finally {
      setWellnessScoreLoading(false);
    }
  };

  // Handle 4-3-2-1 practice changes - refresh wellness score and update state
  const handleFourThreeTwoOneChange = async (entry: FourThreeTwoOneEntry) => {
    // Update local state immediately for responsive Next Best Action
    setFourThreeTwoOneEntry(entry);

    // Refresh wellness score to reflect the change
    if (user?.uid) {
      try {
        const newScore = await refreshWellnessScore(user.uid);
        setWellnessScore(newScore);
      } catch (error) {
        console.error('Error refreshing wellness score after 4-3-2-1 change:', error);
      }
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
                {greeting}
              </Text>
              <Text variant="bodyMedium" style={styles.dateText}>
                {formattedDate}
              </Text>
            </View>
            <IconButton
              icon="cog-outline"
              size={28}
              iconColor={Colors.evergreenTeal}
              onPress={() => navigation.navigate('ProfileStack' as never, { screen: 'Settings' } as never)}
              style={styles.settingsButton}
              accessibilityLabel="Settings"
            />
          </View>
        </View>

        {/* Welcome Back Card (returning users, 3+ days away) */}
        {showWelcomeBack && (
          <WelcomeBackCard
            onResume={() => {
              setShowWelcomeBack(false);
              navigation.navigate('Main' as never, { screen: 'Track' } as never);
            }}
          />
        )}

        {/* Notification Opt-In Card (progressive disclosure) */}
        {notifOptInCard && (
          <View style={{ paddingHorizontal: Spacing.base }}>
            <NotificationOptInCard
              category={notifOptInCard}
              onOptIn={() => handleNotifOptIn(notifOptInCard)}
              onDismiss={() => handleNotifDismiss(notifOptInCard)}
            />
          </View>
        )}

        {/* Weekly Habits Tracker - MOVED UP */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Track' as never, { tab: 'habits' } as never)}
              style={styles.sectionTitleButton}
              activeOpacity={0.7}
            >
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Weekly Habits
              </Text>
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
              <Text variant="bodyMedium" style={styles.emptyText}>
                No active habits yet
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Small daily actions build lasting change
              </Text>
              <TouchableOpacity
                style={styles.addHabitButton}
                onPress={() => navigation.navigate('Track' as never, { tab: 'habits', openCreateModal: true } as never)}
              >
                <Text style={styles.addHabitButtonText}>Add Your First Habit</Text>
              </TouchableOpacity>
            </View>
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
                const habitCompletions = allCompletions[habit.id] || [];

                return (
                  <View key={habit.id} style={styles.habitRow}>
                    <View style={styles.habitNameColumn}>
                      <Text variant="bodyMedium" style={styles.habitRowName} numberOfLines={2}>
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
            <Button
              variant="text"
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('Track' as never, { tab: 'habits' } as never)}
            >
              View All Habits →
            </Button>
          )}
        </Card>

        {/* 4-3-2-1 Daily Practice - MOVED UP, collapsed by default */}
        <FourThreeTwoOneCard onChange={handleFourThreeTwoOneChange} defaultCollapsed={true} />

        {/* AI Daily Plan Card - Collapsible */}
        <View style={styles.aiPlanCard}>
          <TouchableOpacity
            style={styles.aiPlanHeader}
            onPress={() => dailyPlan ? setIsPlanExpanded(!isPlanExpanded) : handleGenerateDailyPlan()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ expanded: isPlanExpanded }}
            accessibilityLabel={dailyPlan ? `Today's Plan. ${isPlanExpanded ? 'Tap to collapse' : 'Tap to expand'}` : "Generate today's plan"}
          >
            <View style={styles.aiPlanHeaderLeft}>
              <View style={styles.aiPlanIconContainer}>
                <Icon name="auto-fix" size={18} color={Colors.evergreenTeal} />
              </View>
              <View style={styles.aiPlanTitleContainer}>
                <Text style={styles.aiPlanTitle}>Today's Plan</Text>
                <Text style={styles.aiPlanSubtitle}>Personalized for your goals and habits</Text>
              </View>
            </View>
            <View style={styles.aiPlanHeaderRight}>
              <View style={styles.aiPlanStatusBadge}>
                <Text style={styles.aiPlanStatusText}>
                  {generatingPlan ? 'Creating...' : dailyPlan ? 'Ready' : 'Generate'}
                </Text>
              </View>
              {dailyPlan && (
                <Icon
                  name={isPlanExpanded ? 'chevron-up' : 'chevron-right'}
                  size={16}
                  color={Colors.silverSage}
                  style={styles.aiPlanChevron}
                />
              )}
            </View>
          </TouchableOpacity>

          {/* Expanded Plan Content */}
          {isPlanExpanded && dailyPlan && (
            <View style={styles.aiPlanExpandedContent}>
              <View style={styles.aiPlanDivider} />
              <View style={styles.aiPlanContentContainer}>
                <ScrollView
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  style={styles.aiPlanScroll}
                >
                  <Text style={styles.aiPlanText}>{dailyPlan}</Text>
                </ScrollView>
              </View>
              <View style={styles.aiPlanActions}>
                <TouchableOpacity style={styles.aiPlanActionButton}>
                  <Text style={styles.aiPlanActionTextSecondary}>Adjust plan</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.aiPlanActionButton}
                  onPress={handleGenerateDailyPlan}
                  disabled={generatingPlan}
                >
                  <Text style={styles.aiPlanActionTextPrimary}>
                    {generatingPlan ? 'Regenerating...' : 'Regenerate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Next Best Action Card - Intelligent pillar-aware recommendation */}
        <NextBestActionCard
          wellnessScore={wellnessScore}
          habits={habits}
          tasks={tasks}
          completedTodayHabits={completedToday}
          fourThreeTwoOne={fourThreeTwoOneEntry}
          lastJournalDate={lastJournalDate}
          hasMorningCheckIn={!!morningCheckIn}
          hasDailyPlan={!!dailyPlan}
          onGeneratePlan={handleGenerateDailyPlan}
          onMorningCheckIn={() => setShowMorningCheckIn(true)}
        />

        {/* Quick Actions Row - Journal + Reflect */}
        <QuickActionsRow
          onJournalPress={() => navigation.navigate('Journal' as never)}
          onReflectPress={() => navigation.navigate('Focus' as never)}
        />

        {/* Brain Health Insight Strip - compact version */}
        <BrainHealthInsightStrip compact />

        {/* Wellness Score Opt-In (only if not enabled and not dismissed) */}
        {wellnessScoreEnabled === false && showOptInPrompt && (
          <WellnessScoreOptInCard
            onEnable={async () => {
              if (user?.uid) {
                await setWellnessScoreEnabled(user.uid, true);
                setWellnessScoreEnabledState(true);
              }
            }}
            onDismiss={() => setShowOptInPrompt(false)}
          />
        )}

        {/* Wellness Score Card (only if enabled) */}
        {wellnessScoreEnabled && (
          <WellnessScoreCard
            score={wellnessScore}
            loading={wellnessScoreLoading}
            onPress={() => setShowScoreBreakdown(true)}
            onRefresh={handleRefreshWellnessScore}
          />
        )}

        {/* Morning Check-In - MOVED TO BOTTOM */}
        {showMorningCheckIn && !morningCheckIn && (
          <MorningCheckIn
            onComplete={handleMorningCheckInComplete}
            onDismiss={() => setShowMorningCheckIn(false)}
            loading={morningCheckInLoading}
          />
        )}
      </ScrollView>

      {/* Wellness Score Breakdown Modal */}
      <WellnessScoreBreakdown
        visible={showScoreBreakdown}
        onClose={() => setShowScoreBreakdown(false)}
        score={wellnessScore}
        onNavigate={(route) => {
          navigation.navigate(route as never);
        }}
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
    paddingHorizontal: Spacing.base,
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
    fontWeight: Typography.fontWeight.semibold,
    fontSize: 26,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
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
  sectionCount: {
    color: Colors.textSecondary,
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.lg,
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
  habitCountBadge: {
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  habitCountText: {
    color: Colors.mutedSageGray || '#6F7F77',
    fontSize: 12,
    fontWeight: '500',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.sunriseAmber}1F`, // 12% opacity
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C4960A',
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
  },
  // Touch target wrapper - provides good touch area while fitting in column
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
    backgroundColor: `${Colors.dewSage}40`, // 25% opacity
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
  // AI Daily Plan Card styles
  aiPlanCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: Spacing.lg,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  aiPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiPlanHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiPlanIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${Colors.evergreenTeal}14`, // 8% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  aiPlanTitleContainer: {
    flex: 1,
  },
  aiPlanTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  aiPlanSubtitle: {
    fontSize: 12,
    color: Colors.mutedSageGray || '#6F7F77',
    marginTop: 2,
  },
  aiPlanHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiPlanStatusBadge: {
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  aiPlanStatusText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },
  aiPlanChevron: {
    marginLeft: 4,
  },
  aiPlanExpandedContent: {
    marginTop: 14,
  },
  aiPlanDivider: {
    height: 1,
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    marginBottom: 14,
  },
  aiPlanContentContainer: {
    backgroundColor: `${Colors.dewSage}40`, // 25% opacity
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
    padding: 14,
  },
  aiPlanScroll: {
    maxHeight: 200,
  },
  aiPlanText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 14 * 1.5,
  },
  aiPlanActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: Spacing.base,
  },
  aiPlanActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  aiPlanActionTextPrimary: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  aiPlanActionTextSecondary: {
    fontSize: 13,
    color: Colors.mutedSageGray || '#6F7F77',
    fontWeight: '500',
  },
});

export default DashboardScreen;
