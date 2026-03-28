/**
 * useDashboardV2 Hook
 * Aggregates all data for the new card-based Dashboard layout.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useHabits } from './useHabits';
import {
  getMorningCheckIn,
  getWellnessScore,
  refreshWellnessScore,
} from '../services/wellnessScore.service';

/* ==================== HELPERS ==================== */

const LAST_OPEN_KEY = 'vara_last_app_open_date';
const WELLNESS_SCORE_ENABLED_KEY = 'vara_wellness_score_enabled';
const FOUR_THREE_TWO_ONE_COLLECTION = 'fourThreeTwoOne';

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function getFormattedDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Build the last-7-days array (oldest first, today last).
 * Each entry: { date: 'YYYY-MM-DD', dayName: 'Mon', dayNumber: '14', isToday: bool }
 */
function buildVisibleDays() {
  const days = [];
  const todayDate = todayYMD();
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = ymd(d);
    days.push({
      date: dateStr,
      dayName: shortDays[d.getDay()],
      dayNumber: String(d.getDate()),
      isToday: dateStr === todayDate,
    });
  }
  return days;
}

/**
 * Derive a single next-best-action recommendation from current data.
 */
function buildRecommendation({ morningCheckIn, habits, habitCompletionsMap, today, navigate }) {
  // 1. No morning check-in
  if (!morningCheckIn) {
    return {
      icon: null,
      title: 'Start your morning check-in',
      subtitle: 'Log your energy and mood to start the day.',
      reason: null,
      actionLabel: null,
      onAction: null,
    };
  }

  // 2. Habits due today not yet completed
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayShort = shortDays[new Date().getDay()];

  const activeHabits = habits.filter((h) => h.active !== false);
  const dueToday = activeHabits.filter((h) => {
    const type = h?.type || h?.frequency?.type || (h?.frequency === 'daily' ? 'daily' : h?.frequency);
    if (!type || type === 'daily') return true;
    if (type === 'weekly') {
      const days = h?.days || h?.frequency?.days || [];
      return Array.isArray(days) && days.length ? days.includes(todayShort) : true;
    }
    return true;
  });

  const completedToday = dueToday.filter((h) => {
    const dates = habitCompletionsMap[h.id] || [];
    return dates.includes(today);
  });

  const remaining = dueToday.length - completedToday.length;
  if (remaining > 0) {
    const nextHabit = dueToday.find((h) => {
      const dates = habitCompletionsMap[h.id] || [];
      return !dates.includes(today);
    });
    return {
      icon: null,
      title: nextHabit ? `Complete "${nextHabit.name}"` : `${remaining} habit${remaining > 1 ? 's' : ''} remaining today`,
      subtitle: `${completedToday.length} of ${dueToday.length} done today`,
      reason: null,
      actionLabel: null,
      onAction: null,
    };
  }

  // 3. All habits done — encourage journaling
  return {
    icon: null,
    title: 'All habits done for today!',
    subtitle: 'Consider journaling to reflect on your progress.',
    reason: null,
    actionLabel: 'Open Journal',
    onAction: () => navigate('/journal'),
  };
}

/* ==================== HOOK ==================== */

export function useDashboardV2() {
  const { user } = useAuth();

  const { habits, habitCompletions: habitCompletionsArray, logHabitToday } = useHabits(user?.uid);

  // --- Core state ---
  const [userName, setUserName] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // Welcome back
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Morning check-in
  const [morningCheckIn, setMorningCheckIn] = useState(null);
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);

  // 4-3-2-1
  const [fourThreeTwoOneEntry, setFourThreeTwoOneEntry] = useState(null);

  // AI daily plan
  const [dailyPlan, setDailyPlan] = useState('');
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);

  // Wellness score
  const [wellnessScore, setWellnessScore] = useState(null);
  const [wellnessScoreLoading, setWellnessScoreLoading] = useState(false);
  const [wellnessScoreEnabled, setWellnessScoreEnabled] = useState(() => {
    try {
      return localStorage.getItem(WELLNESS_SCORE_ENABLED_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);

  /* ---- Derived constants ---- */

  const today = useMemo(() => todayYMD(), []);
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);
  const visibleDays = useMemo(() => buildVisibleDays(), []);

  /* ---- habitCompletions map: { [habitId]: ['YYYY-MM-DD', ...] } ---- */
  const weeklyCompletions = useMemo(() => {
    const map = {};
    if (Array.isArray(habitCompletionsArray)) {
      habitCompletionsArray.forEach(({ habitId, dateISO }) => {
        if (!map[habitId]) map[habitId] = [];
        map[habitId].push(dateISO);
      });
    }
    return map;
  }, [habitCompletionsArray]);

  /* ---- Next best action ---- */
  const recommendation = useMemo(() => {
    if (dataLoading) return null;
    return buildRecommendation({
      morningCheckIn,
      habits,
      habitCompletionsMap: weeklyCompletions,
      today,
      navigate: (path) => { window.location.href = path; },
    });
  }, [dataLoading, morningCheckIn, habits, weeklyCompletions, today]);

  /* ==================== Data fetching ==================== */

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    async function loadDashboardData() {
      setDataLoading(true);
      try {
        const [userSnap, checkIn, score, fttoSnap] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getMorningCheckIn(user.uid),
          wellnessScoreEnabled ? getWellnessScore(user.uid) : Promise.resolve(null),
          getDoc(doc(db, FOUR_THREE_TWO_ONE_COLLECTION, `${user.uid}_${todayYMD()}`)),
        ]);

        if (cancelled) return;

        setUserName(userSnap.data()?.displayName || user.displayName || 'there');

        // Morning check-in
        setMorningCheckIn(checkIn);
        setShowMorningCheckIn(!checkIn);

        // Wellness score
        if (wellnessScoreEnabled && score) {
          setWellnessScore(score);
        }

        // 4-3-2-1
        if (fttoSnap.exists()) {
          setFourThreeTwoOneEntry(fttoSnap.data());
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    // Welcome back check
    try {
      const lastOpen = localStorage.getItem(LAST_OPEN_KEY);
      if (lastOpen) {
        const lastOpenDate = new Date(lastOpen);
        const now = new Date();
        const diffHours = (now - lastOpenDate) / (1000 * 60 * 60);
        if (diffHours > 48) {
          setShowWelcomeBack(true);
        }
      }
      localStorage.setItem(LAST_OPEN_KEY, new Date().toISOString());
    } catch {
      // localStorage not available — skip
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, wellnessScoreEnabled]);

  /* ==================== Handlers ==================== */

  const dismissWelcomeBack = useCallback(() => {
    setShowWelcomeBack(false);
  }, []);

  const handleMorningCheckInComplete = useCallback((checkInData) => {
    setMorningCheckIn(checkInData);
    setShowMorningCheckIn(false);
  }, []);

  const handleHabitToggle = useCallback(
    async (habitId, date) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      // Only allow toggling today
      if (date === today) {
        await logHabitToday(habit);
      }
    },
    [habits, today, logHabitToday]
  );

  const handleFourThreeTwoOneChange = useCallback(
    async (draft) => {
      if (!user?.uid) return;
      try {
        const docId = `${user.uid}_${today}`;
        await setDoc(
          doc(db, FOUR_THREE_TWO_ONE_COLLECTION, docId),
          {
            ...draft,
            userId: user.uid,
            date: today,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setFourThreeTwoOneEntry(draft);
      } catch (error) {
        console.error('Error saving 4-3-2-1:', error);
      }
    },
    [user?.uid, today]
  );

  const handleGenerateDailyPlan = useCallback(async () => {
    if (!user?.uid) return;
    if (generatingPlan) return;

    setGeneratingPlan(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const name = userDoc.data()?.displayName || user.displayName || 'there';

      const goalsSnap = await getDocs(
        query(collection(db, 'goals'), where('userId', '==', user.uid))
      );
      const goals = goalsSnap.docs.map((d) => d.data());

      if (goals.length === 0 && habits.length === 0) {
        setDailyPlan('Create some goals and habits to get your personalized daily plan!');
        setIsPlanExpanded(true);
        return;
      }

      const goalsData = goals.map((g) => ({
        title: g.title || 'Untitled Goal',
        progress: g.progress || 0,
        target: g.target || 100,
        unit: g.unit || '%',
      }));

      const functions = getFunctions();
      const generateDailyPlanFn = httpsCallable(functions, 'generateDailyPlan');
      const result = await generateDailyPlanFn({
        name,
        preferences: { tone: 'gentle', intensity: 'standard' },
        mood: morningCheckIn?.mood ?? null,
        goals: goalsData,
        modifier: null,
      });
      setDailyPlan(result.data?.plan || 'No plan generated');
      setIsPlanExpanded(true);
    } catch (error) {
      console.error('Error generating daily plan:', error);
      setDailyPlan('AI plan is temporarily unavailable. Click Generate to try again.');
      setIsPlanExpanded(true);
    } finally {
      setGeneratingPlan(false);
    }
  }, [user?.uid, user?.displayName, habits, morningCheckIn, generatingPlan]);

  const handleRefreshWellnessScore = useCallback(async () => {
    if (!user?.uid || wellnessScoreLoading) return;
    setWellnessScoreLoading(true);
    try {
      const score = await refreshWellnessScore(user.uid);
      setWellnessScore(score);
    } catch (error) {
      console.error('Error refreshing wellness score:', error);
    } finally {
      setWellnessScoreLoading(false);
    }
  }, [user?.uid, wellnessScoreLoading]);

  const handleWellnessScoreEnable = useCallback(async () => {
    try {
      localStorage.setItem(WELLNESS_SCORE_ENABLED_KEY, 'true');
    } catch {
      // localStorage not available
    }
    setWellnessScoreEnabled(true);
    // Score will load on next effect run (wellnessScoreEnabled dependency)
    if (!user?.uid) return;
    setWellnessScoreLoading(true);
    try {
      const score = await refreshWellnessScore(user.uid);
      setWellnessScore(score);
    } catch (error) {
      console.error('Error loading wellness score on enable:', error);
    } finally {
      setWellnessScoreLoading(false);
    }
  }, [user?.uid]);

  /* ==================== Return ==================== */

  return {
    // User
    user,
    userName,
    greeting,
    formattedDate,
    today,
    dataLoading,

    // Welcome Back
    showWelcomeBack,
    dismissWelcomeBack,

    // Morning Check-In
    morningCheckIn,
    showMorningCheckIn,
    handleMorningCheckInComplete,

    // Habits (for weekly grid)
    habits,
    weeklyCompletions,
    visibleDays,
    handleHabitToggle,

    // Next Best Action
    recommendation,

    // 4-3-2-1
    fourThreeTwoOneEntry,
    handleFourThreeTwoOneChange,

    // AI Daily Plan
    dailyPlan,
    generatingPlan,
    isPlanExpanded,
    setIsPlanExpanded,
    handleGenerateDailyPlan,

    // Wellness Score
    wellnessScore,
    wellnessScoreLoading,
    wellnessScoreEnabled,
    showScoreBreakdown,
    setShowScoreBreakdown,
    handleRefreshWellnessScore,
    handleWellnessScoreEnable,
  };
}
