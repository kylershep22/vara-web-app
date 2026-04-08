/**
 * useDashboardV2 Hook
 * Aggregates all data for the V2 card-based Dashboard layout.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useHabits } from './useHabits';

// Brain state services
import {
  getTodayCheckIn,
  saveCheckIn,
  markProtocolCompleted,
} from '../services/db/brainStateCheckIn.service';
import { getProtocolForState } from '../constants/brainStateProtocols';

// Daily reflection services
import {
  getTodayReflection,
  saveReflection,
} from '../services/db/dailyReflection.service';

/* ==================== HELPERS ==================== */

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

/* ==================== HOOK ==================== */

export function useDashboardV2() {
  const { user } = useAuth();

  const {
    habits,
    habitCompletions: habitCompletionsArray,
    beginToggle,
    pendingReflection,
    confirmCompletion,
  } = useHabits(user?.uid);

  // --- Core state ---
  const [userName, setUserName] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  // Brain state check-in
  const [brainStateCheckIn, setBrainStateCheckIn] = useState(null);
  const [brainStateLoading, setBrainStateLoading] = useState(false);

  // Daily reflection
  const [dailyReflection, setDailyReflection] = useState(null);

  /* ---- Derived constants ---- */

  const today = useMemo(() => todayYMD(), []);
  const greeting = useMemo(() => getTimeBasedGreeting(), []);
  const formattedDate = useMemo(() => getFormattedDate(), []);
  const visibleDays = useMemo(() => buildVisibleDays(), []);

  // Auto-confirm habit completions on dashboard (skip reflection modal)
  useEffect(() => {
    if (pendingReflection) {
      confirmCompletion({ source: 'dashboard' });
    }
  }, [pendingReflection, confirmCompletion]);

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

  /* ---- Derived: today's protocol from brain state ---- */
  const todaysProtocol = useMemo(() => {
    if (!brainStateCheckIn?.brainState) return null;
    return getProtocolForState(brainStateCheckIn.brainState);
  }, [brainStateCheckIn]);

  /* ---- Derived: show daily reflection when all active habits completed today ---- */
  const showDailyReflection = useMemo(() => {
    if (dailyReflection) return true; // Show saved state
    const activeHabits = habits.filter((h) => h.active !== false);
    if (activeHabits.length === 0) return false;

    const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayShort = shortDays[new Date().getDay()];

    const dueToday = activeHabits.filter((h) => {
      const type = h?.type || h?.frequency?.type || (h?.frequency === 'daily' ? 'daily' : h?.frequency);
      if (!type || type === 'daily') return true;
      if (type === 'weekly') {
        const days = h?.days || h?.frequency?.days || [];
        return Array.isArray(days) && days.length ? days.includes(todayShort) : true;
      }
      return true;
    });

    if (dueToday.length === 0) return false;

    const allCompleted = dueToday.every((h) => {
      const dates = weeklyCompletions[h.id] || [];
      return dates.includes(today);
    });

    return allCompleted;
  }, [habits, weeklyCompletions, today, dailyReflection]);

  /* ==================== Data fetching ==================== */

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    async function loadDashboardData() {
      setDataLoading(true);
      try {
        const [userSnap, checkIn, reflection] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)),
          getTodayCheckIn(user.uid),
          getTodayReflection(user.uid),
        ]);

        if (cancelled) return;

        setUserName(userSnap.data()?.displayName || user.displayName || 'there');
        setBrainStateCheckIn(checkIn);
        setDailyReflection(reflection);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  /* ==================== Handlers ==================== */

  const handleBrainStateCheckIn = useCallback(
    async (brainState) => {
      if (!user?.uid || brainStateLoading) return;
      setBrainStateLoading(true);
      try {
        const result = await saveCheckIn(user.uid, brainState);
        setBrainStateCheckIn(result);
      } catch (error) {
        console.error('Error saving brain state check-in:', error);
      } finally {
        setBrainStateLoading(false);
      }
    },
    [user?.uid, brainStateLoading]
  );

  const handleMarkProtocolCompleted = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await markProtocolCompleted(user.uid);
      setBrainStateCheckIn((prev) => prev ? { ...prev, protocolCompleted: true } : prev);
    } catch (error) {
      console.error('Error marking protocol completed:', error);
    }
  }, [user?.uid]);

  const handleHabitToggle = useCallback(
    async (habitId, date) => {
      const habit = habits.find((h) => h.id === habitId);
      if (!habit) return;
      // Only allow toggling today
      if (date === today) {
        beginToggle(habit, date);
      }
    },
    [habits, today, beginToggle]
  );

  const handleDailyReflection = useCallback(
    async (difficulty) => {
      if (!user?.uid) return;
      try {
        const result = await saveReflection(user.uid, difficulty);
        setDailyReflection(result);
      } catch (error) {
        console.error('Error saving daily reflection:', error);
      }
    },
    [user?.uid]
  );

  /* ==================== Return ==================== */

  return {
    // User
    user,
    userName,
    greeting,
    formattedDate,
    today,
    dataLoading,

    // Brain State Check-In
    brainStateCheckIn,
    brainStateLoading,
    handleBrainStateCheckIn,
    handleMarkProtocolCompleted,
    todaysProtocol,

    // Daily Reflection
    dailyReflection,
    showDailyReflection,
    handleDailyReflection,

    // Habits (for weekly grid)
    habits,
    weeklyCompletions,
    visibleDays,
    handleHabitToggle,
  };
}
