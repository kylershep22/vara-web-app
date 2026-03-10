/**
 * useDashboard Hook
 * Extracted from Dashboard.jsx - all state management and data fetching.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useHabits } from './useHabits';

/* ==================== HELPERS ==================== */

const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ymd = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const isHabitDueToday = (habit) => {
  const shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayShort = shortDays[new Date().getDay()];
  const type =
    habit?.type ||
    habit?.frequency?.type ||
    (habit?.frequency === 'daily' ? 'daily' : habit?.frequency);

  if (!type || type === 'daily') return true;
  if (type === 'weekly') {
    const days = habit?.days || habit?.frequency?.days || [];
    return Array.isArray(days) && days.length ? days.includes(todayShort) : true;
  }
  return true;
};

export const getGoalProgressParts = (goal) => {
  const isBinaryLike =
    (goal?.targetType && ['milestone', 'binary', 'boolean'].includes(String(goal.targetType).toLowerCase())) ||
    !Number.isFinite(Number(goal?.target)) ||
    Number(goal?.target) <= 0;

  if (isBinaryLike) {
    const progressed = !!goal?.progress;
    return { progressDisplay: progressed ? 1 : 0, targetDisplay: 1, pct: progressed ? 100 : 0 };
  }

  const progressNum = Number(goal?.progress) || 0;
  const targetNum = Math.max(1, Number(goal?.target) || 1);
  return {
    progressDisplay: progressNum,
    targetDisplay: targetNum,
    pct: Math.min(100, (progressNum / targetNum) * 100),
  };
};

export const formatDueDate = (dueDate) => {
  if (!dueDate) return '';
  let date = dueDate?.seconds ? new Date(dueDate.seconds * 1000) : new Date(dueDate);
  if (isNaN(date)) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((compareDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  return date.toLocaleDateString();
};

export const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
};

const getFormattedDate = () => {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

/* ==================== HOOK ==================== */

export function useDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { habits, habitCompletions: habitCompletionsArray, logHabitToday } = useHabits(user?.uid);

  const habitCompletions = useMemo(() => {
    const map = {};
    if (Array.isArray(habitCompletionsArray)) {
      habitCompletionsArray.forEach(({ habitId, dateISO }) => {
        if (!map[habitId]) map[habitId] = [];
        map[habitId].push(dateISO);
      });
    }
    return map;
  }, [habitCompletionsArray]);

  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userName, setUserName] = useState('');
  const [dailyPlan, setDailyPlan] = useState('');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [editingHabit, setEditingHabit] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [progressGoal, setProgressGoal] = useState(null);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState({
    aiPlan: false,
    habits: false,
    goals: false,
    tasks: false,
    community: false,
    weekRecap: false,
  });

  const toggleSection = useCallback((section) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  /* ---- Data Fetching ---- */

  const fetchDashboardData = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const [goalsSnap, tasksSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'goals'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid))),
        getDoc(doc(db, 'users', user.uid)),
      ]);
      setGoals(goalsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setTasks(tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setUserName(userSnap.data()?.displayName || 'there');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const fetchDailyPlan = useCallback(async () => {
    if (!user?.uid) return;
    if (goals.length === 0 && habits.length === 0) {
      setDailyPlan('Create some goals and habits to get your personalized daily plan!');
      return;
    }

    setIsLoadingPlan(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const name = userDoc.data()?.displayName || user.displayName || 'there';
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
        mood: null,
        goals: goalsData,
        modifier: null,
      });
      setDailyPlan(result.data.plan || 'No plan generated');
    } catch (error) {
      console.error('Error fetching daily plan:', error);
      setDailyPlan('AI plan is temporarily unavailable. Click Regenerate to try again.');
    } finally {
      setIsLoadingPlan(false);
    }
  }, [user, goals, habits]);

  /* ---- Computed Values ---- */

  const todaysCompletions = useMemo(() => {
    const today = todayYMD();
    return new Set(
      Object.entries(habitCompletions)
        .filter(([, dates]) => Array.isArray(dates) && dates.includes(today))
        .map(([habitId]) => habitId)
    );
  }, [habitCompletions]);

  const habitsDueToday = useMemo(() => {
    return habits.filter((h) => h.active !== false && isHabitDueToday(h));
  }, [habits]);

  const activeGoals = useMemo(() => {
    return goals.filter((g) => g.status !== 'completed').slice(0, 4);
  }, [goals]);

  const currentStreak = useMemo(() => {
    let max = 0;
    habits.forEach((h) => { if (h.streak > max) max = h.streak; });
    return max;
  }, [habits]);

  const todayCompletionRate = useMemo(() => {
    if (habitsDueToday.length === 0) return 100;
    return Math.round((habitsDueToday.filter((h) => todaysCompletions.has(h.id)).length / habitsDueToday.length) * 100);
  }, [habitsDueToday, todaysCompletions]);

  const weekCompletionRate = useMemo(() => {
    const last7 = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7.push(ymd(d));
    }
    let total = 0, completed = 0;
    habits.forEach((habit) => {
      const dates = habitCompletions[habit.id] || [];
      last7.forEach((date) => { total++; if (dates.includes(date)) completed++; });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }, [habits, habitCompletions]);

  // Task quadrants
  const tasksByQuadrant = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'completed');
    const sortByDate = (a, b) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0);
    return {
      urgentImportant: active.filter((t) => t.eisenhowerQuadrant === 'urgent-important').sort(sortByDate),
      importantNotUrgent: active.filter((t) => t.eisenhowerQuadrant === 'important-not-urgent').sort(sortByDate),
      urgentNotImportant: active.filter((t) => t.eisenhowerQuadrant === 'urgent-not-important').sort(sortByDate),
      neither: active.filter((t) => t.eisenhowerQuadrant === 'neither').sort(sortByDate),
      totalActive: active.length,
    };
  }, [tasks]);

  /* ---- Handlers ---- */

  const handleCompleteHabit = useCallback(async (habitId) => {
    const habit = habits.find((h) => h.id === habitId);
    if (habit) await logHabitToday(habit);
  }, [habits, logHabitToday]);

  const handleToggleTask = useCallback(async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: task.status === 'completed' ? 'pending' : 'completed',
        updatedAt: serverTimestamp(),
      });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  }, [tasks]);

  const handleAddTask = useCallback(async (taskData) => {
    if (!user?.uid) return;
    try {
      const newTask = { ...taskData, userId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const docRef = await addDoc(collection(db, 'tasks'), newTask);
      setTasks((prev) => [...prev, { id: docRef.id, ...taskData, createdAt: new Date(), updatedAt: new Date() }]);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }, [user?.uid]);

  const handleDeleteTask = useCallback(async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, []);

  const handleDeferTask = useCallback(async (taskId) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      await updateDoc(doc(db, 'tasks', taskId), { dueDate: tomorrow, updatedAt: serverTimestamp() });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, dueDate: tomorrow } : t));
    } catch (error) {
      console.error('Error deferring task:', error);
    }
  }, []);

  const getLinkedGoal = useCallback((goalId) => goals.find((g) => g.id === goalId), [goals]);

  return {
    // Auth & navigation
    user,
    navigate,
    // Data
    userName,
    goals,
    activeGoals,
    habits,
    habitCompletions,
    tasks,
    loading,
    // Stats
    currentStreak,
    todaysCompletions,
    habitsDueToday,
    todayCompletionRate,
    weekCompletionRate,
    tasksByQuadrant,
    // AI Plan
    dailyPlan,
    isLoadingPlan,
    isPlanExpanded,
    setIsPlanExpanded,
    fetchDailyPlan,
    // Greeting
    greeting: getTimeBasedGreeting(),
    formattedDate: getFormattedDate(),
    // Section collapse
    collapsedSections,
    toggleSection,
    // Modals
    editingHabit,
    setEditingHabit,
    editingGoal,
    setEditingGoal,
    progressGoal,
    setProgressGoal,
    showCreateGoalModal,
    setShowCreateGoalModal,
    // Handlers
    handleCompleteHabit,
    handleToggleTask,
    handleAddTask,
    handleDeleteTask,
    handleDeferTask,
    getLinkedGoal,
    fetchDashboardData,
  };
}
