/**
 * useDashboard
 * State management and event handlers for the DashboardScreen.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useGoals } from './useGoals';
import { useHabits } from './useHabits';
import { useTasks } from './useTasks';
import { useJournal } from './useJournal';
import { useFeatureDiscovery } from './useFeatureDiscovery';
import { useNotificationOptInCards } from './useNotificationOptInCards';
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
import { DailyWellnessScore, MorningCheckIn as MorningCheckInType, FourThreeTwoOneEntry } from '../types';
import { logger } from '../utils/logger';
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { getProtocolForState } from '../constants/brainStateProtocols';
import {
  getTodayBrainStateCheckIn,
  saveBrainStateCheckIn,
  markProtocolCompleted,
  getTodayDailyReflection,
  saveDailyReflection,
} from '../services/firebase';
import { BrainState, BrainStateCheckIn as BrainStateCheckInType, DailyReflection as DailyReflectionType, DailyReflectionValue } from '../types';

const SMALL_SCREEN_WIDTH = 375;
const MEDIUM_SCREEN_WIDTH = 414;

export function useDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const goalsResult = useGoals();
  const goals = DASHBOARD_V2 ? [] : goalsResult.goals;
  const goalsLoading = DASHBOARD_V2 ? false : goalsResult.loading;
  const { habits, loading: habitsLoading } = useHabits(true);
  const tasksResult = useTasks();
  const allTasks = DASHBOARD_V2 ? [] : tasksResult.tasks;
  const tasksLoading = DASHBOARD_V2 ? false : tasksResult.loading;
  const { entries: journalEntries } = useJournal(1);

  const { trackEngagement, evaluateTriggers, pendingToasts, markToastShown } = useFeatureDiscovery();
  const { queueUnlockToasts } = useToast();
  const { activeCard: notifOptInCard, onOptIn: handleNotifOptIn, onDismiss: handleNotifDismiss } = useNotificationOptInCards();

  const lastJournalDate = useMemo(() => {
    if (journalEntries.length === 0) return null;
    const entry = journalEntries[0];
    if (entry.createdAt?.toDate) return entry.createdAt.toDate();
    if (entry.createdAt?.seconds) return new Date(entry.createdAt.seconds * 1000);
    return null;
  }, [journalEntries]);

  const [refreshing, setRefreshing] = useState(false);
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

  // Welcome-back card state
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Dashboard V2: Brain State Check-In
  const [brainStateCheckIn, setBrainStateCheckIn] = useState<BrainStateCheckInType | null>(null);
  const [brainStateCheckInLoading, setBrainStateCheckInLoading] = useState(false);

  // Dashboard V2: Daily Reflection
  const [dailyReflection, setDailyReflection] = useState<DailyReflectionType | null>(null);
  const [dailyReflectionDismissed, setDailyReflectionDismissed] = useState(false);

  // Responsive day count
  const daysToShow = useMemo(() => {
    if (screenWidth < SMALL_SCREEN_WIDTH) return 5;
    if (screenWidth < MEDIUM_SCREEN_WIDTH) return 6;
    return 7;
  }, [screenWidth]);

  const isCompactMode = screenWidth < SMALL_SCREEN_WIDTH;

  // Today's date string (local timezone)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting: string;
    if (DASHBOARD_V2) {
      if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
      else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
      else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
      else timeGreeting = 'Hey';
    } else {
      timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    }
    const firstName = user?.displayName?.split(' ')[0];
    if (DASHBOARD_V2) {
      return firstName ? `${timeGreeting}, ${firstName}.` : `${timeGreeting}.`;
    }
    return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  }, [user?.displayName]);

  // Visible days for weekly habit tracker
  const visibleDays = useMemo(() => {
    const days = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: isCompactMode
          ? date.toLocaleDateString('en-US', { weekday: 'narrow' })
          : date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toISOString().split('T')[0] === today,
      });
    }
    return days;
  }, [daysToShow, today, isCompactMode]);

  // Filter tasks to incomplete only
  const tasks = useMemo(() => allTasks.filter((task) => !task.completed), [allTasks]);

  // Track lastActiveAt and check for returning user
  useEffect(() => {
    if (!user?.uid || !db) return;
    const checkAndUpdate = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const data = userDoc.data();
        if (data?.lastActiveAt) {
          const lastActive = data.lastActiveAt.toDate ? data.lastActiveAt.toDate() : new Date(data.lastActiveAt);
          const daysSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= 3 && !DASHBOARD_V2) {
            setShowWelcomeBack(true);
          }
        }
        await updateDoc(userRef, { lastActiveAt: serverTimestamp() });
      } catch (error) {
        logger.log('Error updating lastActiveAt:', error);
      }
    };
    checkAndUpdate();
  }, [user?.uid]);

  // Load daily plan from storage
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadDailyPlan = async () => {
      try {
        const storedPlan = await SecureStore.getItemAsync(`dailyPlan_${today}`);
        if (storedPlan) setDailyPlan(storedPlan);
      } catch (error) {
        logger.error('Error loading daily plan:', error);
      }
    };
    loadDailyPlan();
  }, [today]);

  // Load wellness score opt-in preference
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadWellnessPreference = async () => {
      if (!user?.uid) return;
      try {
        const enabled = await getWellnessScoreEnabled(user.uid);
        setWellnessScoreEnabledState(enabled);
      } catch (error) {
        logger.error('Error loading wellness score preference:', error);
        setWellnessScoreEnabledState(false);
      }
    };
    loadWellnessPreference();
  }, [user?.uid]);

  // Track new session for feature discovery
  useEffect(() => {
    if (user?.uid) {
      trackEngagement('sessionCount').then(() => evaluateTriggers()).catch(logger.error);
    }
  }, [user?.uid]);

  // Show toasts for newly unlocked features
  useEffect(() => {
    if (pendingToasts.length > 0) {
      const featureIds = pendingToasts.map(t => t.featureId);
      queueUnlockToasts(featureIds);
      featureIds.forEach(id => markToastShown(id).catch(logger.error));
    }
  }, [pendingToasts, queueUnlockToasts, markToastShown]);

  // V2: Load brain state check-in
  useEffect(() => {
    if (!DASHBOARD_V2 || !user?.uid) return;
    const loadBrainStateCheckIn = async () => {
      setBrainStateCheckInLoading(true);
      try {
        const existing = await getTodayBrainStateCheckIn(user.uid);
        setBrainStateCheckIn(existing);
        const existingReflection = await getTodayDailyReflection(user.uid);
        setDailyReflection(existingReflection);
      } catch (error) {
        logger.error('Error loading brain state check-in:', error);
      } finally {
        setBrainStateCheckInLoading(false);
      }
    };
    loadBrainStateCheckIn();
  }, [user?.uid, today]);

  // V1: Load wellness score, morning check-in, and 4-3-2-1 entry
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadWellnessData = async () => {
      if (!user?.uid) return;
      setWellnessScoreLoading(true);
      try {
        const [existingCheckIn, todayFourThreeTwoOne] = await Promise.all([
          getMorningCheckIn(user.uid),
          getTodayEntry(user.uid),
        ]);
        setMorningCheckIn(existingCheckIn);
        setFourThreeTwoOneEntry(todayFourThreeTwoOne);

        const hour = new Date().getHours();
        if (!existingCheckIn && hour < 12) setShowMorningCheckIn(true);

        const existingScore = await getTodayWellnessScore(user.uid);
        if (existingScore) {
          setWellnessScore(existingScore);
        } else {
          const newScore = await calculateWellnessScore(user.uid);
          setWellnessScore(newScore);
        }
      } catch (error) {
        logger.error('Error loading wellness data:', error);
      } finally {
        setWellnessScoreLoading(false);
      }
    };
    loadWellnessData();
  }, [user?.uid, today]);

  // Load weekly completions when habits load
  useEffect(() => {
    const loadHabitData = async () => {
      const weekly: { [habitId: string]: { [date: string]: boolean } } = {};
      const completedSet = new Set<string>();
      const allCompletionDates: { [habitId: string]: string[] } = {};

      for (const habit of habits) {
        try {
          const completionsData = await getHabitCompletions(habit.id);
          const completionDates = completionsData.map((c) => c.date);
          allCompletionDates[habit.id] = completionDates;

          weekly[habit.id] = {};
          visibleDays.forEach(day => {
            weekly[habit.id][day.date] = completionDates.includes(day.date);
          });

          const isCompleted = await isHabitCompletedToday(habit.id);
          if (isCompleted) completedSet.add(habit.id);
        } catch (error) {
          logger.error('Error loading habit data:', error);
          weekly[habit.id] = {};
          allCompletionDates[habit.id] = [];
        }
      }

      setWeeklyCompletions(weekly);
      setCompletedToday(completedSet);
      setAllCompletions(allCompletionDates);
    };

    if (habits.length > 0) loadHabitData();
  }, [habits]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleHabitToggle = useCallback(async (habitId: string, date: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProcessingHabits(prev => new Set(prev).add(`${habitId}-${date}`));

    try {
      const isCompleted = weeklyCompletions[habitId]?.[date] || false;

      if (isCompleted) {
        await unmarkHabitComplete(habitId, date);
        setWeeklyCompletions(prev => ({
          ...prev,
          [habitId]: { ...prev[habitId], [date]: false },
        }));
        if (date === today) {
          setCompletedToday(prev => {
            const newSet = new Set(prev);
            newSet.delete(habitId);
            return newSet;
          });
        }
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await markHabitComplete(habitId, user!.uid, date);
        setWeeklyCompletions(prev => ({
          ...prev,
          [habitId]: { ...prev[habitId], [date]: true },
        }));
        if (date === today) {
          setCompletedToday(prev => new Set(prev).add(habitId));
          trackEngagement('habitsCompleted').then(() => evaluateTriggers()).catch(logger.error);
        }
      }

      const completionsData = await getHabitCompletions(habitId);
      const completionDates = completionsData.map((c) => c.date);
      setAllCompletions(prev => ({ ...prev, [habitId]: completionDates }));

      if (date === today && user?.uid) {
        try {
          const newScore = await refreshWellnessScore(user.uid);
          setWellnessScore(newScore);
        } catch (error) {
          logger.error('Error refreshing wellness score after habit toggle:', error);
        }
      }
    } catch (error) {
      logger.error('Error toggling habit completion:', error);
    } finally {
      setProcessingHabits(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${habitId}-${date}`);
        return newSet;
      });
    }
  }, [weeklyCompletions, today, user, trackEngagement, evaluateTriggers]);

  const handleGenerateDailyPlan = useCallback(async () => {
    setGeneratingPlan(true);
    try {
      const response = await generateDailyPlan({
        userId: user!.uid,
        goals: goals.slice(0, 5),
        habits: habits.slice(0, 10),
        tasks: tasks.slice(0, 10),
      });
      setDailyPlan(response.plan);
      await SecureStore.setItemAsync(`dailyPlan_${today}`, response.plan);
    } catch (error) {
      logger.error('Error generating daily plan:', error);
      alert('Failed to generate daily plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  }, [user, goals, habits, tasks, today]);

  const handleMorningCheckInComplete = useCallback(async (energyLevel: number, mood: number) => {
    if (!user?.uid) return;
    setMorningCheckInLoading(true);
    try {
      const checkIn = await saveMorningCheckIn(user.uid, energyLevel, mood);
      setMorningCheckIn(checkIn);
      setShowMorningCheckIn(false);
      trackEngagement('morningCheckInsCompleted').then(() => evaluateTriggers()).catch(logger.error);
      const newScore = await refreshWellnessScore(user.uid);
      setWellnessScore(newScore);
    } catch (error) {
      logger.error('Error saving morning check-in:', error);
    } finally {
      setMorningCheckInLoading(false);
    }
  }, [user, trackEngagement, evaluateTriggers]);

  const handleBrainStateCheckIn = useCallback(async (state: BrainState) => {
    if (!user?.uid) return;
    setBrainStateCheckInLoading(true);
    try {
      const checkIn = await saveBrainStateCheckIn(user.uid, state);
      setBrainStateCheckIn(checkIn);
      trackEngagement('morningCheckInsCompleted').then(() => evaluateTriggers()).catch(logger.error);
    } catch (error) {
      logger.error('Error saving brain state check-in:', error);
    } finally {
      setBrainStateCheckInLoading(false);
    }
  }, [user, trackEngagement, evaluateTriggers]);

  const handleMarkProtocolCompleted = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await markProtocolCompleted(user.uid);
      setBrainStateCheckIn((prev) =>
        prev ? { ...prev, protocolCompleted: true } : null
      );
    } catch (error) {
      logger.error('Error marking protocol completed:', error);
    }
  }, [user]);

  const todaysProtocol = useMemo(() => {
    if (!brainStateCheckIn) return null;
    return getProtocolForState(brainStateCheckIn.brainState);
  }, [brainStateCheckIn]);

  const showDailyReflection = useMemo(() => {
    if (!DASHBOARD_V2) return false;
    if (dailyReflection || dailyReflectionDismissed) return false;
    if (habits.length === 0) return false;
    const activeHabits = habits.filter((h) => h.active);
    if (activeHabits.length === 0) return false;
    return activeHabits.every((h) => completedToday.has(h.id));
  }, [habits, completedToday, dailyReflection, dailyReflectionDismissed]);

  const handleDailyReflection = useCallback(async (value: DailyReflectionValue) => {
    if (!user?.uid) return;
    try {
      const reflection = await saveDailyReflection(user.uid, value);
      setDailyReflection(reflection);
    } catch (error) {
      logger.error('Error saving daily reflection:', error);
    }
  }, [user]);

  const handleDailyReflectionSkip = useCallback(() => {
    setDailyReflectionDismissed(true);
  }, []);

  const handleRefreshWellnessScore = useCallback(async () => {
    if (!user?.uid) return;
    setWellnessScoreLoading(true);
    try {
      const newScore = await refreshWellnessScore(user.uid);
      setWellnessScore(newScore);
    } catch (error) {
      logger.error('Error refreshing wellness score:', error);
    } finally {
      setWellnessScoreLoading(false);
    }
  }, [user]);

  const handleFourThreeTwoOneChange = useCallback(async (entry: FourThreeTwoOneEntry) => {
    setFourThreeTwoOneEntry(entry);
    if (user?.uid) {
      try {
        const newScore = await refreshWellnessScore(user.uid);
        setWellnessScore(newScore);
      } catch (error) {
        logger.error('Error refreshing wellness score after 4-3-2-1 change:', error);
      }
    }
  }, [user]);

  const handleWellnessScoreEnable = useCallback(async () => {
    if (user?.uid) {
      await setWellnessScoreEnabled(user.uid, true);
      setWellnessScoreEnabledState(true);
    }
  }, [user]);

  const dataLoading = goalsLoading || habitsLoading || tasksLoading;

  return {
    user,
    navigation,
    dataLoading,
    refreshing,
    greeting,
    formattedDate,
    today,
    visibleDays,

    // Habits
    habits,
    allCompletions,
    processingHabits,
    weeklyCompletions,
    handleHabitToggle,

    // Goals/Tasks
    goals,
    tasks,
    completedToday,
    lastJournalDate,

    // Daily Plan
    dailyPlan,
    generatingPlan,
    isPlanExpanded,
    setIsPlanExpanded,
    handleGenerateDailyPlan,

    // Wellness Score
    wellnessScore,
    wellnessScoreLoading,
    showScoreBreakdown,
    setShowScoreBreakdown,
    wellnessScoreEnabled,
    showOptInPrompt,
    setShowOptInPrompt,
    handleRefreshWellnessScore,
    handleWellnessScoreEnable,

    // Morning Check-In
    morningCheckIn,
    morningCheckInLoading,
    showMorningCheckIn,
    setShowMorningCheckIn,
    handleMorningCheckInComplete,

    // 4-3-2-1
    fourThreeTwoOneEntry,
    handleFourThreeTwoOneChange,

    // Welcome back
    showWelcomeBack,
    setShowWelcomeBack,

    // Notification opt-in
    notifOptInCard,
    handleNotifOptIn,
    handleNotifDismiss,

    // Refresh
    handleRefresh,

    // Dashboard V2
    brainStateCheckIn,
    brainStateCheckInLoading,
    handleBrainStateCheckIn,
    handleMarkProtocolCompleted,
    todaysProtocol,

    // Daily Reflection
    showDailyReflection,
    handleDailyReflection,
    handleDailyReflectionSkip,
  };
}
