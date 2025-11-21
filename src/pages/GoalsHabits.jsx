// src/pages/GoalsHabits.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  Target,
  Sparkles,
  Plus,
  Clock,
  Zap,
  Link2,
  X,
  Brain,
  Lightbulb,
  TrendingUp,
  Award,
  BarChart3,
  Calendar as CalendarIcon,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  Flame,
  Crown,
  Medal,
  PencilLine,
  Check
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  orderBy,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';

import AddHabitForm from '../components/habits/AddHabitForm';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';
import GoalCreationForm from '../components/goals/GoalCreationForm';
import GoalDetailsModal from '../components/goals/GoalDetailsModal';
import { useHabits } from '../hooks/useHabits';

/** ---------- color tokens to match DS ---------- */
const TEAL = '#1B5E57';
const SAGE = '#B8CDBA';

function isoToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toISO(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns [currentStreak, bestStreak] given a Set of ISO dates marked complete */
function getConsecutiveStreak(isoDatesSet) {
  const dates = Array.from(isoDatesSet).sort();
  const toDate = (iso) => new Date(iso + 'T00:00:00');
  let best = 0;
  let current = 0;
  let last = null;

  for (const iso of dates) {
    const d = toDate(iso);
    if (last) {
      const diff = Math.round((d - last) / (24 * 3600 * 1000));
      if (diff === 1) {
        current += 1;
      } else if (diff > 1) {
        best = Math.max(best, current);
        current = 1;
      }
    } else {
      current = 1;
    }
    last = d;
  }
  best = Math.max(best, current);

  const today = new Date(isoToday() + 'T00:00:00');
  let rolling = 0;
  let probe = new Date(today);
  while (isoDatesSet.has(toISO(probe))) {
    rolling += 1;
    probe = new Date(probe.getTime() - 24 * 3600 * 1000);
  }

  return [rolling, best];
}

export default function GoalsHabits() {
  const { user } = useAuth();

  // Pull habits + completions + streaks + logger from the shared hook
  const {
    habits,
    habitCompletions,
    habitStreaks,
    logHabitToday,
    recomputeStreaksForHabit
  } = useHabits(user?.uid);

  // Core data local to this page
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);

  // UI state
  const [selectedTab, setSelectedTab] = useState('overview');

  const [creatingGoal, setCreatingGoal] = useState(false);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [editingHabit, setEditingHabit] = useState(null);

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [selectedHabit, setSelectedHabit] = useState(null);

  // AI Suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestionType, setAiSuggestionType] = useState('goals');

  // Filters / view
  const [goalFilter, setGoalFilter] = useState('all'); // all, active, completed, archived
  const [habitFilter, setHabitFilter] = useState('all'); // all, active, daily, weekly, monthly
  const [viewMode, setViewMode] = useState('grid'); // grid, list

  // Calendar filters
  const [calendarView, setCalendarView] = useState('month'); // day | week | month | year
  const [calendarTypeFilter, setCalendarTypeFilter] = useState('all'); // all | goals | habits
  const [calendarStatusFilter, setCalendarStatusFilter] = useState('all'); // all | active | completed
  const [calendarAnchor, setCalendarAnchor] = useState(new Date()); // base date for view

  // Integrations
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [connectedApps, setConnectedApps] = useState([
    { id: 'apple-health', name: 'Apple Health', icon: Activity, connected: false, capabilities: ['steps', 'workouts', 'sleep'] },
    { id: 'apple-fitness', name: 'Apple Fitness+', icon: Activity, connected: false, capabilities: ['workouts', 'activity-rings'] },
    { id: 'strava', name: 'Strava', icon: Activity, connected: true, capabilities: ['running', 'cycling', 'swimming'] },
    { id: 'myfitnesspal', name: 'MyFitnessPal', icon: Activity, connected: false, capabilities: ['nutrition', 'calories'] },
    { id: 'headspace', name: 'Headspace', icon: Brain, connected: false, capabilities: ['meditation', 'mindfulness'] }
  ]);

  // Ref to scroll the tab bar into view when the stat cards are clicked
  const tabBarRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) return;

    // --- Goals (real-time) ---
    const goalsQ = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubGoals = onSnapshot(goalsQ, (snap) => {
      const rows = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        title: d.data().title ?? d.data().goalText ?? d.data().name ?? 'Untitled Goal',
        status: d.data().status ?? 'active'
      }));
      setGoals(rows);
    });

    // --- Tasks (still fine to be real-time or keep getDocs) ---
    const tasksQ = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubTasks = onSnapshot(tasksQ, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubGoals();
      unsubTasks();
    };
  }, [user?.uid]);

  /** ---------------- Firestore Fetchers ---------------- */
  // Normalize helpers to ensure active counts don't show 0 due to missing status
  const normalizeGoal = (id, data) => ({
    id,
    ...data,
    // title fallback chain for safety
    title: data.title ?? data.goalText ?? data.name ?? 'Untitled Goal',
    status: data.status ?? 'active'
  });

  const normalizeHabit = (id, data) => ({
    id,
    ...data,
    // keep both so UIs using either field work
    title: data.title ?? data.name ?? 'Untitled Habit',
    name: data.name ?? data.title ?? 'Untitled Habit',
    status: data.status ?? 'active',
    type: data.type ?? data.frequency ?? 'daily'
  });

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => normalizeGoal(d.id, d.data()));
    setGoals(data);
  };

  const fetchTasks = async () => {
    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    setTasks(data);
  };

  /** ---------------- Firestore Savers / Updaters ---------------- */
  const handleSaveGoal = async (goalData) => {
    if (!user?.uid) return;
    try {
      // Handle both old and new goal creation formats
      const mappedGoal = {
        title: goalData.goalText ?? goalData.title,
        // Support new streamlined flow (primaryFocus) and old flow (focus/category)
        category: goalData.primaryFocus ?? (goalData.focus === 'custom' ? goalData.customFocus : (goalData.focus ?? goalData.category)),
        // Support both old (targetType/measurement) and new (target/unit) formats
        target: goalData.targetType ?? goalData.target,
        unit: goalData.measurement ?? goalData.unit,
        timeframe: goalData.timeframe,
        status: goalData.status ?? 'active',
        progress: goalData.progress ?? 0,
        habitIds: goalData.habitIds ?? [],
        milestones: goalData.milestones || [],
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Only add optional fields if they have values (avoid Firestore undefined errors)
      if (goalData.primaryFocus) mappedGoal.primaryFocus = goalData.primaryFocus;
      if (goalData.refinedFocus) mappedGoal.refinedFocus = goalData.refinedFocus;
      if (goalData.action) mappedGoal.action = goalData.action;
      if (goalData.why) mappedGoal.why = goalData.why;
      if (goalData.frequency) mappedGoal.frequency = goalData.frequency;

      await addDoc(collection(db, 'goals'), mappedGoal);
      await fetchGoals();
      setCreatingGoal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleUpdateGoal = async (goalId, updates) => {
    try {
      await updateDoc(doc(db, 'goals', goalId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      await fetchGoals();
      setEditingGoal(null);
    } catch (e) {
      console.error('Error updating goal:', e);
    }
  };

  const markGoalCompleted = async (goalId) => {
    await handleUpdateGoal(goalId, { status: 'completed', completedAt: serverTimestamp(), progress: 100 });
  };

  const handleDeleteGoal = async (goalId) => {
    await deleteDoc(doc(db, 'goals', goalId));
    fetchGoals();
  };

  const handleSaveHabit = async (habitData) => {
    if (!user?.uid) return;
    try {
      const title = habitData.title ?? habitData.name ?? 'Untitled Habit';
      const mappedHabit = {
        // store both for maximum compatibility across UIs
        title,
        name: title,
        type: habitData.type ?? 'daily',
        frequency: habitData.frequency ?? 'daily',
        goalIds: habitData.goalIds ?? [],
        trigger: habitData.trigger ?? '',
        reward: habitData.reward ?? '',
        status: 'active',
        streak: 0,
        bestStreak: 0,
        completionRate: 0,
        integrations: habitData.integrations || [],
        userId: user.uid,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'habits'), mappedHabit);
      setCreatingHabit(false);
    } catch (error) {
      console.error('Error saving habit:', error);
    }
  };

  const handleUpdateHabit = async (habitId, updates) => {
    try {
      // keep title/name consistent if either changes
      const next = { ...updates };
      if (next.title && !next.name) next.name = next.title;
      if (next.name && !next.title) next.title = next.name;

      await updateDoc(doc(db, 'habits', habitId), {
        ...next,
        updatedAt: serverTimestamp()
      });
      setEditingHabit(null);
    } catch (e) {
      console.error('Error updating habit:', e);
    }
  };

  const markHabitCompleted = async (habitId) => {
    await handleUpdateHabit(habitId, { status: 'completed', completedAt: serverTimestamp() });
  };

  const handleDeleteHabit = async (habitId) => {
    await deleteDoc(doc(db, 'habits', habitId));
  };

  /** ----------------- Filters ----------------- */
  const filteredGoals = useMemo(() => {
    return goals.filter((goal) => {
      switch (goalFilter) {
        case 'active': return goal.status === 'active';
        case 'completed': return goal.status === 'completed';
        case 'archived': return goal.status === 'archived';
        default: return true;
      }
    });
  }, [goals, goalFilter]);

  const filteredHabits = useMemo(() => {
    return habits.filter((habit) => {
      switch (habitFilter) {
        case 'active': return habit.status === 'active';
        case 'daily': return habit.type === 'daily';
        case 'weekly': return habit.type === 'weekly';
        case 'monthly': return habit.type === 'monthly';
        default: return true;
      }
    });
  }, [habits, habitFilter]);

  /** ----------------- Stats ----------------- */
  const goalStats = {
    total: goals.length,
    active: goals.filter((g) => (g.status ?? 'active') === 'active').length,
    completed: goals.filter((g) => g.status === 'completed').length,
    avgProgress: goals.length > 0
      ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length)
      : 0
  };

  const computedAvgStreak = useMemo(() => {
    if (habits.length === 0) return 0;
    const sum = habits.reduce((acc, h) => acc + (habitStreaks.get(h.id)?.current || 0), 0);
    return Math.round(sum / habits.length);
  }, [habits, habitStreaks]);

  const computedBestStreak = useMemo(() => {
    let best = 0;
    for (const h of habits) {
      best = Math.max(best, habitStreaks.get(h.id)?.best || 0);
    }
    return best;
  }, [habits, habitStreaks]);

  const habitStats = {
    total: habits.length,
    active: habits.filter((h) => (h.status ?? 'active') === 'active').length,
    avgStreak: computedAvgStreak,
    bestStreak: computedBestStreak
  };

  /** ----------------- Integration Modal ----------------- */
  const IntegrationModal = () =>
    showIntegrations && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-[#B8CDBA]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1B5E57]">App Integrations</h2>
              <p className="text-gray-600 mt-1">Connect your favorite apps to automatically track habits</p>
            </div>
            <button
              onClick={() => setShowIntegrations(false)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={24} className="text-gray-400" />
            </button>
          </div>

          <div className="space-y-4">
            {connectedApps.map((app) => (
              <div key={app.id} className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors border border-[#D5E3D1]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        app.connected ? 'bg-green-100' : 'bg-gray-200'
                      }`}
                    >
                      <app.icon size={24} className={app.connected ? 'text-green-600' : 'text-gray-500'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{app.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {app.connected ? (
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <CheckCircle2 size={14} />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <XCircle size={14} />
                            Not connected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.capabilities.map((capability) => (
                          <span key={capability} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConnectedApps((apps) => apps.map((a) => a.id === app.id ? { ...a, connected: !a.connected } : a))}
                    className={`px-6 py-3 rounded-xl font-medium transition-all ${
                      app.connected
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {app.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-[#B8CDBA]">
            <h3 className="font-semibold text-[#1B5E57] mb-2">How it works</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Connect your fitness and wellness apps</li>
              <li>• Create habits that match activities in those apps</li>
              <li>• Habits automatically complete when activities are detected</li>
              <li>• Your streaks and progress update in real-time</li>
            </ul>
          </div>
        </div>
      </div>
    );

  /** ----------------- Cards ----------------- */
  const GoalCard = ({ goal }) => {
    const attachedHabitsCount = habits.filter((h) => h.goalIds?.includes(goal.id)).length;
    const attachedTasksCount = tasks.filter((t) => t.goalId === goal.id).length;

    return (
      <div className="bg-white border border-[#D5E3D1] rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2.5 h-2.5 rounded-full ${goal.status === 'completed' ? 'bg-emerald-400' : 'bg-[#1B5E57]'}`} />
              <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
              <span
                className={`ml-2 text-xs px-2 py-0.5 rounded-full border ${
                  goal.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {goal.status === 'completed' ? 'Completed' : 'Active'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {goal.category} • {goal.target} {goal.unit} {goal.timeframe ? `• ${goal.timeframe}` : ''}
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-sm font-medium text-[#1B5E57]">{goal.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${goal.progress || 0}%`, background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-gray-700">{attachedHabitsCount} {attachedHabitsCount === 1 ? 'habit' : 'habits'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-purple-500" />
                <span className="text-gray-700">{attachedTasksCount} {attachedTasksCount === 1 ? 'task' : 'tasks'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => setSelectedGoal(goal)}
              className="p-2 rounded-lg border border-[#D5E3D1] hover:bg-gray-50"
              title="View details"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setEditingGoal(goal)}
              className="p-2 rounded-lg border border-[#D5E3D1] hover:bg-gray-50"
              title="Edit goal"
            >
              <PencilLine size={16} />
            </button>
            {goal.status !== 'completed' && (
              <button
                onClick={() => markGoalCompleted(goal.id)}
                className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                title="Mark completed"
              >
                <Check size={16} />
              </button>
            )}
            <button
              onClick={() => handleDeleteGoal(goal.id)}
              className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
              title="Delete goal"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /** --------------- Habit Logging + Streaks (bring into this file) --------------- */
  function isoToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function toISO(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /** Returns [currentStreak, bestStreak] given a Set of ISO dates marked complete */
  function getConsecutiveStreak(isoDatesSet) {
    const dates = Array.from(isoDatesSet).sort();
    const toDate = (iso) => new Date(iso + 'T00:00:00');
    let best = 0;
    let current = 0;
    let last = null;

    for (const iso of dates) {
      const d = toDate(iso);
      if (last) {
        const diff = Math.round((d - last) / (24 * 3600 * 1000));
        if (diff === 1) {
          current += 1;
        } else if (diff > 1) {
          best = Math.max(best, current);
          current = 1;
        }
      } else {
        current = 1;
      }
      last = d;
    }
    best = Math.max(best, current);

    const today = new Date(isoToday() + 'T00:00:00');
    let rolling = 0;
    let probe = new Date(today);
    while (isoDatesSet.has(toISO(probe))) {
      rolling += 1;
      probe = new Date(probe.getTime() - 24 * 3600 * 1000);
    }

    return [rolling, best];
  }

  const HabitCard = ({ habit, onLogHabitToday }) => {
    // If you’re computing streaks in the parent via the hook, this uses that:
    const streak = habitStreaks.get(habit.id) || { current: 0, best: 0 };

    // Prefer Firestore title if present, then name, then a safe fallback
    const title = habit.title ?? habit.name ?? 'Untitled Habit';

    const handleLogToday = () => {
      if (onLogHabitToday) {
        onLogHabitToday(habit);
        return;
      }
      // Safety: only call a local function if it exists in this file
      if (typeof logHabitToday !== 'undefined') {
        logHabitToday(habit);
      }
    };

    return (
      <div className="bg-white border border-[#D5E3D1] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  habit.type === 'daily' ? 'bg-emerald-500' : habit.type === 'weekly' ? 'bg-blue-500' : 'bg-purple-500'
                }`}
              />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
                {habit.type || 'custom'}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  habit.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {habit.status === 'completed' ? 'Completed' : 'Active'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-100">
                <Flame size={14} />
                <span>{streak.current}d</span>
              </div>
            </div>
          </div>

          {(habit.trigger || habit.reward) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {habit.trigger && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={14} className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Trigger</span>
                  </div>
                  <p className="text-blue-700 text-sm">{habit.trigger}</p>
                </div>
              )}
              {habit.reward && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Award size={14} className="text-green-600" />
                    <span className="text-sm font-medium text-green-800">Reward</span>
                  </div>
                  <p className="text-green-700 text-sm">{habit.reward}</p>
                </div>
              )}
            </div>
          )}

          {habit.goalIds && habit.goalIds.length > 0 && (
            <div className="mt-3">
              <span className="text-sm font-medium text-gray-700">Linked Goals</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {habit.goalIds.map((gId) => {
                  const goal = goals.find((g) => g.id === gId);
                  return (
                    <span
                      key={gId}
                      className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200"
                    >
                      {goal ? goal.title : 'Unknown Goal'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 pb-5 border-t border-gray-100 pt-4">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <Medal size={12} className="text-amber-500" />
                <span>Best: {streak.best} days</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>Next: Today</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedHabit(habit)}
                  className="px-3 py-2 text-sm rounded-lg border border-[#D5E3D1] hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye size={14} />
                  View
                </button>
                {/* Ensure Edit opens the EDIT modal, not create-new */}
                <button
                  onClick={() => setEditingHabit(habit)}
                  className="px-3 py-2 text-sm rounded-lg border border-[#D5E3D1] hover:bg-gray-50 flex items-center gap-2"
                >
                  <PencilLine size={14} />
                  Edit
                </button>
                {habit.status !== 'completed' && (
                  <button
                    onClick={() => markHabitCompleted(habit.id)}
                    className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-2"
                  >
                    <Check size={14} />
                    Complete
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleLogToday}
                  className="px-4 py-2 text-sm rounded-lg"
                  style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})`, color: 'white' }}
                  title="Log completion for today"
                >
                  Log Today
                </button>
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Delete habit"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /** ----------------- Calendar (Overview) ----------------- */
  function startOfWeek(d) {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  function daysInMonth(d) {
    const year = d.getFullYear();
    const month = d.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }

  const CalendarBlock = () => {
    // Build a map of ISO date -> items [{type:'habit'|'goal', status, ref}]
    const isoMap = useMemo(() => {
      const map = new Map();

      const push = (iso, item) => {
        const arr = map.get(iso) || [];
        arr.push(item);
        map.set(iso, arr);
      };

      if (calendarTypeFilter !== 'habits') {
        goals.forEach((g) => {
          const createdAt = g.createdAt instanceof Timestamp ? g.createdAt.toDate() : (g.createdAt ? new Date(g.createdAt) : null);
          const completedAt = g.completedAt instanceof Timestamp ? g.completedAt.toDate() : (g.completedAt ? new Date(g.completedAt) : null);

          if (createdAt) {
            const iso = toISO(createdAt);
            if (calendarStatusFilter === 'all' || (calendarStatusFilter === 'active' && g.status !== 'completed') || (calendarStatusFilter === 'completed' && g.status === 'completed')) {
              push(iso, { type: 'goal', status: g.status, ref: g, event: 'created' });
            }
          }

          if (completedAt) {
            const iso = toISO(completedAt);
            if (calendarStatusFilter === 'all' || calendarStatusFilter === 'completed') {
              push(iso, { type: 'goal', status: 'completed', ref: g, event: 'completed' });
            }
          }
        });
      }

      if (calendarTypeFilter !== 'goals') {
        habitCompletions.forEach((c) => {
          const h = habits.find((h) => h.id === c.habitId);
          if (!h) return;
          if (calendarStatusFilter === 'active' && h.status === 'completed') return;
          if (calendarStatusFilter === 'completed' && h.status !== 'completed') return;
          push(c.dateISO, { type: 'habit', status: h.status, ref: h, event: 'completed' });
        });
      }

      return map;
    }, [goals, habits, habitCompletions, calendarTypeFilter, calendarStatusFilter]);

    const anchor = calendarAnchor;

    if (calendarView === 'day') {
      const iso = toISO(anchor);
      const items = isoMap.get(iso) || [];
      return (
        <div className="bg-white border border-[#D5E3D1] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalendarIcon size={20} className="text-[#1B5E57]" />
              <h3 className="text-lg font-semibold text-gray-900">
                {anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(anchor.getTime() - 24*3600*1000))}>Prev</button>
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date())}>Today</button>
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(anchor.getTime() + 24*3600*1000))}>Next</button>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="text-sm text-gray-600">No activity logged.</div>
          ) : (
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${it.type === 'habit' ? 'bg-blue-500' : it.event === 'completed' ? 'bg-emerald-500' : 'bg-[#1B5E57]'}`} />
                  <span className="text-gray-800">
                    {it.type === 'habit' ? `Habit: ${(it.ref.title ?? it.ref.name)} completed` : `Goal ${it.event}: ${it.ref.title}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (calendarView === 'week') {
      const start = startOfWeek(anchor);
      const days = Array.from({ length: 7 }).map((_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
      return (
        <div className="bg-white border border-[#D5E3D1] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalendarIcon size={20} className="text-[#1B5E57]" />
              <h3 className="text-lg font-semibold text-gray-900">
                Week of {days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(anchor.getTime() - 7*24*3600*1000))}>Prev</button>
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date())}>Today</button>
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(anchor.getTime() + 7*24*3600*1000))}>Next</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((d, i) => {
              const iso = toISO(d);
              const items = isoMap.get(iso) || [];
              return (
                <div key={i} className="p-3 rounded-lg border border-[#D5E3D1]">
                  <div className="text-xs text-gray-500 mb-2">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-sm font-medium text-gray-800 mb-2">{d.getDate()}</div>
                  <div className="flex flex-wrap gap-1">
                    {items.slice(0, 4).map((it, idx) => (
                      <span
                        key={idx}
                        className={`w-2 h-2 rounded-full ${it.type === 'habit' ? 'bg-blue-500' : it.event === 'completed' ? 'bg-emerald-500' : 'bg-[#1B5E57]'}`}
                        title={it.type === 'habit' ? `Habit: ${(it.ref.title ?? it.ref.name)}` : `Goal ${it.event}: ${it.ref.title}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (calendarView === 'year') {
      const year = anchor.getFullYear();
      const months = Array.from({ length: 12 }).map((_, m) => new Date(year, m, 1));
      return (
        <div className="bg-white border border-[#D5E3D1] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalendarIcon size={20} className="text-[#1B5E57]" />
              <h3 className="text-lg font-semibold text-gray-900">{year}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(year - 1, anchor.getMonth(), anchor.getDate()))}>Prev</button>
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date())}>This Year</button>
              <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(year + 1, anchor.getMonth(), anchor.getDate()))}>Next</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {months.map((m, idx) => {
              const days = Array.from({ length: daysInMonth(m) }).map((_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1));
              const hasActivity = days.some((d) => (isoMap.get(toISO(d)) || []).length > 0);
              return (
                <div key={idx} className={`border rounded-xl p-3 ${hasActivity ? 'border-[#B8CDBA]' : 'border-gray-200'}`}>
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    {m.toLocaleString(undefined, { month: 'long' })}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                      const items = isoMap.get(toISO(d)) || [];
                      return (
                        <div
                          key={i}
                          className={`h-2 rounded ${items.length === 0 ? 'bg-gray-100' : 'bg-[#1B5E57]'}`}
                          title={items.length ? `${items.length} activities` : 'No activity'}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Default: Month view
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const first = new Date(year, month, 1);
    const firstWeekday = (first.getDay() + 6) % 7; // Monday=0
    const total = daysInMonth(anchor);
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));

    return (
      <div className="bg-white border border-[#D5E3D1] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon size={20} className="text-[#1B5E57]" />
            <h3 className="text-lg font-semibold text-gray-900">
              {anchor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(year, month - 1, 1))}>Prev</button>
            <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date())}>Today</button>
            <button className="px-3 py-2 rounded-lg border border-[#D5E3D1]" onClick={() => setCalendarAnchor(new Date(year, month + 1, 1))}>Next</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="px-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} className="p-3 rounded-lg border border-transparent" />;
            const iso = toISO(d);
            const items = isoMap.get(iso) || [];
            return (
              <div key={idx} className="p-3 rounded-lg border border-[#D5E3D1]">
                <div className="text-sm font-medium text-gray-800 mb-2">{d.getDate()}</div>
                <div className="flex flex-wrap gap-1">
                  {items.slice(0, 6).map((it, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${it.type === 'habit' ? 'bg-blue-500' : it.event === 'completed' ? 'bg-emerald-500' : 'bg-[#1B5E57]'}`}
                      title={it.type === 'habit' ? `Habit: ${(it.ref.title ?? it.ref.name)}` : `Goal ${it.event}: ${it.ref.title}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /** ----------------- Tab Navigation ----------------- */
  const TabNavigation = () => (
    <div className="mb-8" ref={tabBarRef}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-white rounded-2xl p-1 border border-[#D5E3D1] shadow-sm">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'goals', label: 'Goals', icon: Target },
            { key: 'habits', label: 'Habits', icon: Sparkles },
            { key: 'integrations', label: 'Integrations', icon: Link2 }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedTab(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                selectedTab === key
                  ? 'text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={selectedTab === key ? { background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` } : {}}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {(selectedTab === 'goals' || selectedTab === 'habits') && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={selectedTab === 'goals' ? goalFilter : habitFilter}
                onChange={(e) =>
                  selectedTab === 'goals'
                    ? setGoalFilter(e.target.value)
                    : setHabitFilter(e.target.value)
                }
                className="bg-white border border-[#D5E3D1] rounded-xl px-4 py-2 text-sm focus:outline-none"
              >
                <option value="all">All</option>
                {selectedTab === 'goals' ? (
                  <>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </>
                ) : (
                  <>
                    <option value="active">Active</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              >
                <div className="grid grid-cols-2 gap-1">
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                  <div className="w-1 h-1 bg-current rounded-full" />
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
              >
                <div className="space-y-1">
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                  <div className="w-4 h-0.5 bg-current rounded-full" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /** ----------------- AI Coach + Stats ----------------- */
  const AIAssistantSection = () => (
    <div className="mb-8">
      <div className="bg-white border border-[#D5E3D1] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}>
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Coach</h2>
              <p className="text-sm text-gray-600">Personalized insights and recommendations</p>
            </div>
          </div>
          <button
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white shadow-sm"
            style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
          >
            {showAISuggestions ? 'Hide Coach' : 'Get Insights'}
          </button>
        </div>

        {showAISuggestions && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">Focus:</span>
              <div className="flex bg-gray-50 rounded-xl p-1 border border-[#D5E3D1]">
                {[
                  { key: 'goals', label: 'Goals', icon: Target },
                  { key: 'habits', label: 'Habits', icon: Sparkles },
                  { key: 'insights', label: 'Insights', icon: TrendingUp }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setAiSuggestionType(key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                      aiSuggestionType === key ? 'bg-white shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-[#D5E3D1]">
              {user?.uid && (
                <AIBasedSuggestions
                  type={aiSuggestionType}
                  userId={user.uid}
                  context={{ goals, habits, connectedApps }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper to jump to a tab and scroll the tab bar into view
  const jumpToTab = (key) => {
    setSelectedTab(key);
    // slight delay to ensure DOM updates before scrolling
    setTimeout(() => {
      tabBarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const StatsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Goals card */}
      <button
        type="button"
        onClick={() => {
          setGoalFilter('all');
          jumpToTab('goals');
        }}
        className="text-left bg-white border border-[#D5E3D1] rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}>
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Goals</h3>
            <p className="text-gray-600 text-sm">{goalStats.active} active</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-semibold text-[#1B5E57]">{goalStats.avgProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="h-2 rounded-full" style={{ width: `${goalStats.avgProgress}%`, background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }} />
          </div>
        </div>
      </button>

      {/* Habits card */}
      <button
        type="button"
        onClick={() => {
          setHabitFilter('active');
          jumpToTab('habits');
        }}
        className="text-left bg-white border border-[#D5E3D1] rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-600">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Habits</h3>
            <p className="text-gray-600 text-sm">{habitStats.active} active</p>
          </div>
        </div>
        <div className="text-sm text-gray-700">
          <span className="font-medium">Avg streak:</span> {habitStats.avgStreak} days
        </div>
      </button>

      {/* Integrations card */}
      <button
        type="button"
        onClick={() => jumpToTab('integrations')}
        className="text-left bg-white border border-[#D5E3D1] rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-600">
            <Link2 size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Integrations</h3>
            <p className="text-gray-600 text-sm">
              {connectedApps.filter((a) => a.connected).length} connected
            </p>
          </div>
        </div>
        <div className="w-full">
          <span className="inline-block bg-white text-[#1B5E57] border border-[#B8CDBA] rounded-xl px-3 py-2 text-sm font-medium">
            Manage Apps
          </span>
        </div>
      </button>

      {/* Best streak card */}
      <button
        type="button"
        onClick={() => {
          setHabitFilter('active');
          jumpToTab('habits');
        }}
        className="text-left bg-white border border-[#D5E3D1] rounded-2xl p-5 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500">
            <Crown size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Best Streak</h3>
            <p className="text-gray-600 text-sm">Personal record</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Medal size={16} className="text-amber-600" />
          <span className="font-bold text-amber-700 text-lg">{habitStats.bestStreak} days</span>
        </div>
      </button>
    </div>
  );

  /** ----------------- Render ----------------- */
  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}>
              <Target size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Productivity Hub</h1>
              <p className="text-gray-600">
                Build meaningful goals, develop powerful habits, and track your progress with intelligent insights
              </p>
            </div>
          </div>
        </div>

        <AIAssistantSection />
        <StatsOverview />
        <TabNavigation />

        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 border border-[#D5E3D1] shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity size={20} className="text-[#1B5E57]" />
                Recent Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Target size={16} className="text-emerald-600" />
                    Latest Goals
                  </h3>
                  <div className="space-y-2">
                    {goals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="bg-gray-50 border border-[#D5E3D1] rounded-xl p-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${goal.status === 'completed' ? 'bg-emerald-500' : 'bg-[#1B5E57]'}`} />
                          <h4 className="font-medium text-gray-900">{goal.title}</h4>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">{goal.category}</span>
                          <span className="text-sm font-medium text-[#1B5E57]">{goal.progress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <Sparkles size={16} className="text-blue-600" />
                    Active Habits
                  </h3>
                  <div className="space-y-2">
                    {habits.filter(h => h.status !== 'completed').slice(0, 3).map((habit) => {
                      const s = habitStreaks.get(habit.id) || { current: 0 };
                      const displayTitle = habit.title ?? habit.name;
                      return (
                        <div key={habit.id} className="bg-gray-50 border border-[#D5E3D1] rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">{displayTitle}</h4>
                            <div className="flex items-center gap-1 text-sm font-medium text-orange-600">
                              <Flame size={14} />
                              {s.current}d
                            </div>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{habit.type}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar with filters */}
            <div className="bg-white rounded-2xl p-6 border border-[#D5E3D1] shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={18} className="text-[#1B5E57]" />
                  <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={calendarView}
                    onChange={(e) => setCalendarView(e.target.value)}
                    className="bg-white border border-[#D5E3D1] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>

                  <select
                    value={calendarTypeFilter}
                    onChange={(e) => setCalendarTypeFilter(e.target.value)}
                    className="bg-white border border-[#D5E3D1] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="goals">Goals</option>
                    <option value="habits">Habits</option>
                  </select>

                  <select
                    value={calendarStatusFilter}
                    onChange={(e) => setCalendarStatusFilter(e.target.value)}
                    className="bg-white border border-[#D5E3D1] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <CalendarBlock />
            </div>
          </div>
        )}

        {selectedTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Target size={24} className="text-emerald-600" />
                  Goals
                  <span className="bg-emerald-50 text-emerald-700 text-sm px-2.5 py-1 rounded-full border border-emerald-100">
                    {filteredGoals.length}
                  </span>
                </h2>
                <p className="text-gray-600 mt-1">Define and track your long-term objectives</p>
              </div>
              <button
                onClick={() => setCreatingGoal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium shadow-sm"
                style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
              >
                <Plus size={18} />
                Create Goal
              </button>
            </div>

            {creatingGoal && (
              <div className="bg-white border border-[#B8CDBA] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1B5E57]">Create New Goal</h3>
                  <button onClick={() => setCreatingGoal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
                <GoalCreationForm
                  userId={user.uid}
                  userHabits={habits}
                  onSave={handleSaveGoal}
                  onCancel={() => setCreatingGoal(false)}
                />
              </div>
            )}


            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {filteredGoals.length === 0 ? (
                <div className="col-span-full text-center py-10">
                  <Target size={40} className="mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700">No goals yet</h3>
                  <p className="text-gray-500">Create your first goal to get started</p>
                </div>
              ) : (
                filteredGoals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
              )}
            </div>
          </div>
        )}

        {selectedTab === 'habits' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Sparkles size={24} className="text-blue-600" />
                  Habits
                  <span className="bg-blue-50 text-blue-700 text-sm px-2.5 py-1 rounded-full border border-blue-100">
                    {filteredHabits.length}
                  </span>
                </h2>
                <p className="text-gray-600 mt-1">Build consistent routines that support your goals</p>
              </div>
              <button
                onClick={() => setCreatingHabit(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium shadow-sm"
                style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
              >
                <Plus size={18} />
                Create Habit
              </button>
            </div>

            {creatingHabit && (
              <div className="bg-white border border-[#B8CDBA] rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#1B5E57]">Create New Habit</h3>
                  <button onClick={() => setCreatingHabit(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
                <AddHabitForm
                  userId={user.uid}
                  goals={goals}
                  connectedApps={connectedApps.filter((app) => app.connected)}
                  onSave={handleSaveHabit}
                  onCancel={() => setCreatingHabit(false)}
                />
              </div>
            )}


            <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-4' : 'space-y-3'}>
              {filteredHabits.length === 0 ? (
                <div className="col-span-full text-center py-10">
                  <Sparkles size={40} className="mx-auto text-gray-300 mb-3" />
                  <h3 className="text-lg font-semibold text-gray-700">No habits yet</h3>
                  <p className="text-gray-500">Create your first habit to start building consistency</p>
                </div>
              ) : (
                filteredHabits.map((habit) => <HabitCard key={habit.id} habit={habit} />)
              )}
            </div>
          </div>
        )}

        {selectedTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <Link2 size={24} className="text-purple-600" />
                App Integrations
              </h2>
              <p className="text-gray-600">Connect your favorite apps to automatically track habits and sync data</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#D5E3D1]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Connected Apps</h3>
                  <p className="text-gray-600">
                    {connectedApps.filter((a) => a.connected).length} of {connectedApps.length} apps connected
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      connectedApps.some((a) => a.connected) ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {connectedApps.some((a) => a.connected) ? 'Active' : 'No connections'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connectedApps.map((app) => (
                  <div
                    key={app.id}
                    className={`bg-white rounded-2xl p-5 border transition-all ${app.connected ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${app.connected ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <app.icon size={20} className={app.connected ? 'text-green-600' : 'text-gray-500'} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{app.name}</h4>
                        <span className={`text-sm flex items-center gap-1 ${app.connected ? 'text-green-600' : 'text-gray-500'}`}>
                          {app.connected ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {app.connected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Capabilities</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {app.capabilities.map((capability) => (
                            <span key={capability} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {capability}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setConnectedApps((apps) => apps.map((a) => a.id === app.id ? { ...a, connected: !a.connected } : a))}
                        className={`w-full py-2.5 rounded-xl font-medium transition-all ${
                          app.connected ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {app.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-5 bg-gray-50 rounded-2xl border border-[#D5E3D1]">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Lightbulb size={18} className="text-[#1B5E57]" />
                  How Auto-Tracking Works
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1 text-gray-700">
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#1B5E57] rounded-full" /><span>Connect your favorite fitness and wellness apps</span></div>
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#1B5E57] rounded-full" /><span>Create habits that match activities in those apps</span></div>
                  </div>
                  <div className="space-y-1 text-gray-700">
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#1B5E57] rounded-full" /><span>Habits automatically complete when activities are detected</span></div>
                    <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#1B5E57] rounded-full" /><span>Your streaks and progress update in real-time</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Goal Details Modal */}
        {selectedGoal && (
          <GoalDetailsModal
            goal={selectedGoal}
            habits={habits}
            tasks={tasks.filter((t) => t.goalId === selectedGoal.id)}
            onClose={() => setSelectedGoal(null)}
            onDelete={handleDeleteGoal}
          />
        )}

        {/* Edit Goal Modal */}
        {editingGoal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#D5E3D1] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1B5E57]">Edit Goal</h3>
                <button
                  onClick={() => setEditingGoal(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <GoalCreationForm
                  userId={user.uid}
                  userHabits={habits}
                  initialData={{
                    title: editingGoal.title,
                    focus: editingGoal.category,
                    targetType: editingGoal.target,
                    measurement: editingGoal.unit,
                    frequency: editingGoal.frequency,
                    habitIds: editingGoal.habitIds || [],
                    timeframe: editingGoal.timeframe,
                    status: editingGoal.status,
                    progress: editingGoal.progress,
                    milestones: editingGoal.milestones || []
                  }}
                  onSave={(data) => handleUpdateGoal(editingGoal.id, {
                    title: data.goalText ?? data.title,
                    category: data.focus === 'custom' ? data.customFocus : (data.focus ?? editingGoal.category),
                    target: data.targetType ?? editingGoal.target,
                    unit: data.measurement ?? editingGoal.unit,
                    frequency: data.frequency ?? editingGoal.frequency,
                    habitIds: data.habitIds ?? editingGoal.habitIds ?? [],
                    timeframe: data.timeframe ?? editingGoal.timeframe,
                    status: data.status ?? editingGoal.status,
                    progress: typeof data.progress === 'number' ? data.progress : editingGoal.progress,
                    milestones: data.milestones ?? editingGoal.milestones
                  })}
                  onCancel={() => setEditingGoal(null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Habit Modal */}
        {editingHabit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-[#D5E3D1] px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-[#1B5E57]">Edit Habit</h3>
                <button
                  onClick={() => setEditingHabit(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <AddHabitForm
                  userId={user.uid}
                  goals={goals}
                  connectedApps={connectedApps.filter((app) => app.connected)}
                  initialData={{
                    id: editingHabit.id,
                    title: editingHabit.title ?? editingHabit.name,
                    name: editingHabit.name ?? editingHabit.title,
                    type: editingHabit.type,
                    frequency: editingHabit.frequency,
                    goalIds: editingHabit.goalIds || [],
                    trigger: editingHabit.trigger || '',
                    reward: editingHabit.reward || '',
                    integrations: editingHabit.integrations || []
                  }}
                  onSave={(data) =>
                    handleUpdateHabit(editingHabit.id, {
                      title: data.title ?? data.name ?? editingHabit.title ?? editingHabit.name,
                      name: data.name ?? data.title ?? editingHabit.name ?? editingHabit.title,
                      type: data.type ?? editingHabit.type,
                      frequency: data.frequency ?? editingHabit.frequency,
                      goalIds: data.goalIds ?? editingHabit.goalIds,
                      trigger: data.trigger ?? editingHabit.trigger,
                      reward: data.reward ?? editingHabit.reward,
                      integrations: data.integrations ?? editingHabit.integrations
                    })
                  }
                  onCancel={() => setEditingHabit(null)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Minimal Habit Details Modal */}
        {selectedHabit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-[#D5E3D1]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Habit Details</h3>
                <button className="p-2 hover:bg-gray-100 rounded-xl" onClick={() => setSelectedHabit(null)}>
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-semibold text-gray-900">{selectedHabit.title ?? selectedHabit.name}</div>
                <div className="text-gray-700">Type: {selectedHabit.type || 'Custom'}</div>
                <div className="text-gray-700">Frequency: {selectedHabit.frequency || '—'}</div>
                {selectedHabit.trigger && <div className="text-gray-700">Trigger: {selectedHabit.trigger}</div>}
                {selectedHabit.reward && <div className="text-gray-700">Reward: {selectedHabit.reward}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Integration Modal */}
        <IntegrationModal />
      </div>
    </SidebarLayout>
  );
}










