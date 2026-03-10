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
import { BrainPillarBadgeList, NeurochemicalTagList } from '../components/shared/BrainPillarBadge';
import { getNeurochemicalTags, getBrainPillars } from '../constants/brainHealthMapping';

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
        <div className="bg-white rounded-3xl p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto border border-silver-sage">
          <div className="flex items-center justify-between mb-vara-lg">
            <div>
              <h2 className="text-vara-xl font-bold text-evergreen-teal">App Integrations</h2>
              <p className="text-muted-sage-gray mt-1">Connect your favorite apps to automatically track habits</p>
            </div>
            <button
              onClick={() => setShowIntegrations(false)}
              className="p-2 hover:bg-dew-sage-light rounded-vara-lg transition-colors"
            >
              <X size={24} className="text-muted-sage-gray" />
            </button>
          </div>

          <div className="space-y-4">
            {connectedApps.map((app) => (
              <div key={app.id} className="bg-mist-white rounded-vara-lg p-vara-lg hover:bg-dew-sage-light transition-colors border border-divider">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-vara-base">
                    <div
                      className={`w-12 h-12 rounded-vara-lg flex items-center justify-center ${
                        app.connected ? 'bg-dew-sage' : 'bg-dew-sage-light'
                      }`}
                    >
                      <app.icon size={24} className={app.connected ? 'text-evergreen-teal' : 'text-muted-sage-gray'} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-soft-charcoal">{app.name}</h3>
                      <div className="flex items-center gap-vara-sm mt-1">
                        {app.connected ? (
                          <span className="flex items-center gap-1 text-vara-sm text-evergreen-teal">
                            <CheckCircle2 size={14} />
                            Connected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-vara-sm text-muted-sage-gray">
                            <XCircle size={14} />
                            Not connected
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.capabilities.map((capability) => (
                          <span key={capability} className="text-vara-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setConnectedApps((apps) => apps.map((a) => a.id === app.id ? { ...a, connected: !a.connected } : a))}
                    className={`px-vara-lg py-3 rounded-vara-lg font-medium transition-all ${
                      app.connected
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-dew-sage text-evergreen-teal hover:bg-silver-sage'
                    }`}
                  >
                    {app.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-vara-lg bg-blue-50 rounded-vara-lg border border-silver-sage">
            <h3 className="font-semibold text-evergreen-teal mb-2">How it works</h3>
            <ul className="text-vara-sm text-soft-charcoal space-y-1">
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

    // Get brain pillars if they exist on the goal
    const brainPillars = goal.brainPillars || [];

    return (
      <div className="bg-white border border-divider rounded-vara-lg p-vara-lg shadow-vara-sm hover:shadow-vara-md transition-all">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-vara-sm mb-2 flex-wrap">
              <div className={`w-2.5 h-2.5 rounded-full ${goal.status === 'completed' ? 'bg-evergreen-teal/70' : 'bg-evergreen-teal'}`} />
              <h3 className="text-vara-lg font-semibold text-soft-charcoal">{goal.title}</h3>
              <span
                className={`ml-2 text-vara-xs px-2 py-0.5 rounded-full border ${
                  goal.status === 'completed'
                    ? 'bg-teal-light text-evergreen-teal border-evergreen-teal/20'
                    : 'bg-mist-white text-soft-charcoal border-divider'
                }`}
              >
                {goal.status === 'completed' ? 'Completed' : 'Active'}
              </span>
            </div>
            <p className="text-vara-sm text-muted-sage-gray mb-3">
              {goal.category} • {goal.target} {goal.unit} {goal.timeframe ? `• ${goal.timeframe}` : ''}
            </p>

            {/* Brain Pillars */}
            {brainPillars.length > 0 && (
              <div className="mb-3">
                <span className="text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wide mb-1 block">Brain Health Focus</span>
                <BrainPillarBadgeList pillars={brainPillars} size="small" />
              </div>
            )}

            <div className="space-y-2 mb-vara-base">
              <div className="flex justify-between items-center">
                <span className="text-vara-xs text-muted-sage-gray">Progress</span>
                <span className="text-vara-sm font-medium text-evergreen-teal">{goal.progress || 0}%</span>
              </div>
              <div className="w-full bg-dew-sage-light rounded-full h-2">
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${goal.progress || 0}%`, background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-vara-base text-vara-sm">
              <div className="flex items-center gap-vara-sm">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-soft-charcoal">{attachedHabitsCount} {attachedHabitsCount === 1 ? 'habit' : 'habits'}</span>
              </div>
              <div className="flex items-center gap-vara-sm">
                <CalendarIcon size={16} className="text-purple-500" />
                <span className="text-soft-charcoal">{attachedTasksCount} {attachedTasksCount === 1 ? 'task' : 'tasks'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-vara-sm ml-4">
            <button
              onClick={() => setSelectedGoal(goal)}
              className="p-2 rounded-vara-md border border-divider hover:bg-mist-white"
              title="View details"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setEditingGoal(goal)}
              className="p-2 rounded-vara-md border border-divider hover:bg-mist-white"
              title="Edit goal"
            >
              <PencilLine size={16} />
            </button>
            {goal.status !== 'completed' && (
              <button
                onClick={() => markGoalCompleted(goal.id)}
                className="p-2 rounded-vara-md bg-evergreen-teal text-white hover:opacity-90"
                title="Mark completed"
              >
                <Check size={16} />
              </button>
            )}
            <button
              onClick={() => handleDeleteGoal(goal.id)}
              className="p-2 rounded-vara-md bg-red-50 text-red-600 hover:bg-red-100"
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
    // If you're computing streaks in the parent via the hook, this uses that:
    const streak = habitStreaks.get(habit.id) || { current: 0, best: 0 };

    // Prefer Firestore title if present, then name, then a safe fallback
    const title = habit.title ?? habit.name ?? 'Untitled Habit';

    // Get brain health info for this habit
    const neurochemicalTags = habit.category ? getNeurochemicalTags(habit.category) : [];
    const brainPillars = habit.category ? getBrainPillars(habit.category) : [];

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
      <div className="bg-white border border-divider rounded-vara-lg overflow-hidden shadow-vara-sm hover:shadow-vara-md transition-all">
        <div className="px-vara-lg pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-vara-sm flex-wrap">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  habit.type === 'daily' ? 'bg-evergreen-teal' : habit.type === 'weekly' ? 'bg-blue-500' : 'bg-purple-500'
                }`}
              />
              <h3 className="text-vara-lg font-semibold text-soft-charcoal">{title}</h3>
              <span className="text-vara-xs px-2 py-0.5 rounded-full border bg-mist-white text-soft-charcoal border-divider">
                {habit.type || 'custom'}
              </span>
              <span
                className={`text-vara-xs px-2 py-0.5 rounded-full border ${
                  habit.status === 'completed'
                    ? 'bg-teal-light text-evergreen-teal border-evergreen-teal/20'
                    : 'bg-mist-white text-soft-charcoal border-divider'
                }`}
              >
                {habit.status === 'completed' ? 'Completed' : 'Active'}
              </span>
            </div>

            <div className="flex items-center gap-vara-sm text-vara-sm">
              <div className="flex items-center gap-1 bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full border border-orange-100">
                <Flame size={14} />
                <span>{streak.current}d</span>
              </div>
            </div>
          </div>

          {/* Brain Health Impacts */}
          {(neurochemicalTags.length > 0 || brainPillars.length > 0) && (
            <div className="mt-3 space-y-2">
              {neurochemicalTags.length > 0 && (
                <div>
                  <span className="text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wide mb-1 block">Brain Impact</span>
                  <NeurochemicalTagList impacts={neurochemicalTags} size="small" maxDisplay={4} />
                </div>
              )}
              {brainPillars.length > 0 && (
                <div>
                  <span className="text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wide mb-1 block">Brain Pillars</span>
                  <BrainPillarBadgeList pillars={brainPillars} size="small" />
                </div>
              )}
            </div>
          )}

          {(habit.trigger || habit.reward) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-md mt-3">
              {habit.trigger && (
                <div className="bg-blue-50 border border-blue-100 rounded-vara-lg p-3">
                  <div className="flex items-center gap-vara-sm mb-1">
                    <Zap size={14} className="text-blue-600" />
                    <span className="text-vara-sm font-medium text-blue-800">Trigger</span>
                  </div>
                  <p className="text-blue-700 text-vara-sm">{habit.trigger}</p>
                </div>
              )}
              {habit.reward && (
                <div className="bg-teal-light border border-dew-sage rounded-vara-lg p-3">
                  <div className="flex items-center gap-vara-sm mb-1">
                    <Award size={14} className="text-evergreen-teal" />
                    <span className="text-vara-sm font-medium text-soft-charcoal">Reward</span>
                  </div>
                  <p className="text-evergreen-teal text-vara-sm">{habit.reward}</p>
                </div>
              )}
            </div>
          )}

          {habit.goalIds && habit.goalIds.length > 0 && (
            <div className="mt-3">
              <span className="text-vara-sm font-medium text-soft-charcoal">Linked Goals</span>
              <div className="flex flex-wrap gap-vara-sm mt-2">
                {habit.goalIds.map((gId) => {
                  const goal = goals.find((g) => g.id === gId);
                  return (
                    <span
                      key={gId}
                      className="text-vara-xs bg-teal-light text-evergreen-teal px-3 py-1 rounded-full border border-silver-sage"
                    >
                      {goal ? goal.title : 'Unknown Goal'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-5 pb-5 border-t border-divider pt-4">
            <div className="flex justify-between text-vara-xs text-muted-sage-gray mb-2">
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
              <div className="flex gap-vara-sm">
                <button
                  onClick={() => setSelectedHabit(habit)}
                  className="px-3 py-2 text-vara-sm rounded-vara-md border border-divider hover:bg-mist-white flex items-center gap-vara-sm"
                >
                  <Eye size={14} />
                  View
                </button>
                {/* Ensure Edit opens the EDIT modal, not create-new */}
                <button
                  onClick={() => setEditingHabit(habit)}
                  className="px-3 py-2 text-vara-sm rounded-vara-md border border-divider hover:bg-mist-white flex items-center gap-vara-sm"
                >
                  <PencilLine size={14} />
                  Edit
                </button>
                {habit.status !== 'completed' && (
                  <button
                    onClick={() => markHabitCompleted(habit.id)}
                    className="px-3 py-2 text-vara-sm rounded-vara-md bg-evergreen-teal text-white hover:opacity-90 flex items-center gap-vara-sm"
                  >
                    <Check size={14} />
                    Complete
                  </button>
                )}
              </div>

              <div className="flex items-center gap-vara-sm">
                <button
                  onClick={handleLogToday}
                  className="px-vara-base py-2 text-vara-sm rounded-vara-md"
                  style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})`, color: 'white' }}
                  title="Log completion for today"
                >
                  Log Today
                </button>
                <button
                  onClick={() => handleDeleteHabit(habit.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-vara-md"
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
        <div className="bg-white border border-divider rounded-vara-lg p-vara-lg">
          <div className="flex items-center justify-between mb-vara-base">
            <div className="flex items-center gap-vara-md">
              <CalendarIcon size={20} className="text-evergreen-teal" />
              <h3 className="text-vara-lg font-semibold text-soft-charcoal">
                {anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>
            <div className="flex items-center gap-vara-sm">
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(anchor.getTime() - 24*3600*1000))}>Prev</button>
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date())}>Today</button>
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(anchor.getTime() + 24*3600*1000))}>Next</button>
            </div>
          </div>
          {items.length === 0 ? (
            <div className="text-vara-sm text-muted-sage-gray">No activity logged.</div>
          ) : (
            <ul className="space-y-2">
              {items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-vara-sm text-vara-sm">
                  <div className={`w-2 h-2 rounded-full ${it.type === 'habit' ? 'bg-blue-500' : it.event === 'completed' ? 'bg-evergreen-teal' : 'bg-evergreen-teal'}`} />
                  <span className="text-soft-charcoal">
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
        <div className="bg-white border border-divider rounded-vara-lg p-vara-lg">
          <div className="flex items-center justify-between mb-vara-base">
            <div className="flex items-center gap-vara-md">
              <CalendarIcon size={20} className="text-evergreen-teal" />
              <h3 className="text-vara-lg font-semibold text-soft-charcoal">
                Week of {days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </h3>
            </div>
            <div className="flex items-center gap-vara-sm">
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(anchor.getTime() - 7*24*3600*1000))}>Prev</button>
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date())}>Today</button>
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(anchor.getTime() + 7*24*3600*1000))}>Next</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-vara-sm">
            {days.map((d, i) => {
              const iso = toISO(d);
              const items = isoMap.get(iso) || [];
              return (
                <div key={i} className="p-3 rounded-vara-md border border-divider">
                  <div className="text-vara-xs text-muted-sage-gray mb-2">{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                  <div className="text-vara-sm font-medium text-soft-charcoal mb-2">{d.getDate()}</div>
                  <div className="flex flex-wrap gap-1">
                    {items.slice(0, 4).map((it, idx) => (
                      <span
                        key={idx}
                        className={`w-2 h-2 rounded-full ${it.type === 'habit' ? 'bg-blue-500' : it.event === 'completed' ? 'bg-evergreen-teal' : 'bg-evergreen-teal'}`}
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
        <div className="bg-white border border-divider rounded-vara-lg p-vara-lg">
          <div className="flex items-center justify-between mb-vara-base">
            <div className="flex items-center gap-vara-md">
              <CalendarIcon size={20} className="text-evergreen-teal" />
              <h3 className="text-vara-lg font-semibold text-soft-charcoal">{year}</h3>
            </div>
            <div className="flex items-center gap-vara-sm">
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(year - 1, anchor.getMonth(), anchor.getDate()))}>Prev</button>
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date())}>This Year</button>
              <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(year + 1, anchor.getMonth(), anchor.getDate()))}>Next</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-vara-base">
            {months.map((m, idx) => {
              const days = Array.from({ length: daysInMonth(m) }).map((_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1));
              const hasActivity = days.some((d) => (isoMap.get(toISO(d)) || []).length > 0);
              return (
                <div key={idx} className={`border rounded-vara-lg p-3 ${hasActivity ? 'border-silver-sage' : 'border-divider'}`}>
                  <div className="text-vara-sm font-semibold text-soft-charcoal mb-2">
                    {m.toLocaleString(undefined, { month: 'long' })}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((d, i) => {
                      const items = isoMap.get(toISO(d)) || [];
                      return (
                        <div
                          key={i}
                          className={`h-2 rounded ${items.length === 0 ? 'bg-dew-sage-light' : 'bg-evergreen-teal'}`}
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
      <div className="bg-white border border-divider rounded-vara-lg p-vara-lg">
        <div className="flex items-center justify-between mb-vara-base">
          <div className="flex items-center gap-vara-md">
            <CalendarIcon size={20} className="text-evergreen-teal" />
            <h3 className="text-vara-lg font-semibold text-soft-charcoal">
              {anchor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </h3>
          </div>
          <div className="flex items-center gap-vara-sm">
            <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(year, month - 1, 1))}>Prev</button>
            <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date())}>Today</button>
            <button className="px-3 py-2 rounded-vara-md border border-divider" onClick={() => setCalendarAnchor(new Date(year, month + 1, 1))}>Next</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-vara-sm text-vara-xs text-muted-sage-gray mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="px-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-vara-sm">
          {cells.map((d, idx) => {
            if (!d) return <div key={idx} className="p-3 rounded-vara-md border border-transparent" />;
            const iso = toISO(d);
            const items = isoMap.get(iso) || [];
            return (
              <div key={idx} className="p-3 rounded-vara-md border border-divider">
                <div className="text-vara-sm font-medium text-soft-charcoal mb-2">{d.getDate()}</div>
                <div className="flex flex-wrap gap-1">
                  {items.slice(0, 6).map((it, i) => (
                    <span
                      key={i}
                      className={`w-2 h-2 rounded-full ${it.type === 'habit' ? 'bg-blue-500' : it.event === 'completed' ? 'bg-evergreen-teal' : 'bg-evergreen-teal'}`}
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
    <div className="mb-vara-xl" ref={tabBarRef}>
      <div className="flex items-center justify-between mb-vara-lg">
        <div className="flex bg-white rounded-vara-lg p-1 border border-divider shadow-vara-sm">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'goals', label: 'Goals', icon: Target },
            { key: 'habits', label: 'Habits', icon: Sparkles },
            { key: 'integrations', label: 'Integrations', icon: Link2 }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSelectedTab(key)}
              className={`flex items-center gap-vara-sm px-5 py-2.5 rounded-vara-lg font-medium transition-all ${
                selectedTab === key
                  ? 'text-white shadow-vara-sm'
                  : 'text-soft-charcoal hover:bg-mist-white'
              }`}
              style={selectedTab === key ? { background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` } : {}}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {(selectedTab === 'goals' || selectedTab === 'habits') && (
          <div className="flex items-center gap-vara-md">
            <div className="flex items-center gap-vara-sm">
              <Filter size={16} className="text-muted-sage-gray" />
              <select
                value={selectedTab === 'goals' ? goalFilter : habitFilter}
                onChange={(e) =>
                  selectedTab === 'goals'
                    ? setGoalFilter(e.target.value)
                    : setHabitFilter(e.target.value)
                }
                className="bg-white border border-divider rounded-vara-lg px-vara-base py-2 text-vara-sm focus:outline-none"
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

            <div className="flex bg-dew-sage-light rounded-vara-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-vara-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-vara-sm' : 'text-muted-sage-gray'}`}
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
                className={`p-2 rounded-vara-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-vara-sm' : 'text-muted-sage-gray'}`}
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
    <div className="mb-vara-xl">
      <div className="bg-white border border-divider rounded-vara-lg p-vara-lg shadow-vara-sm">
        <div className="flex items-center justify-between mb-vara-base">
          <div className="flex items-center gap-vara-md">
            <div className="w-10 h-10 rounded-vara-lg flex items-center justify-center" style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}>
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-vara-lg font-semibold text-soft-charcoal">AI Coach</h2>
              <p className="text-vara-sm text-muted-sage-gray">Personalized insights and recommendations</p>
            </div>
          </div>
          <button
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            className="px-vara-base py-2 rounded-vara-lg text-vara-sm font-medium text-white shadow-vara-sm"
            style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
          >
            {showAISuggestions ? 'Hide Coach' : 'Get Insights'}
          </button>
        </div>

        {showAISuggestions && (
          <div className="space-y-4">
            <div className="flex items-center gap-vara-sm">
              <span className="text-vara-sm font-semibold text-soft-charcoal">Focus:</span>
              <div className="flex bg-mist-white rounded-vara-lg p-1 border border-divider">
                {[
                  { key: 'goals', label: 'Goals', icon: Target },
                  { key: 'habits', label: 'Habits', icon: Sparkles },
                  { key: 'insights', label: 'Insights', icon: TrendingUp }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setAiSuggestionType(key)}
                    className={`flex items-center gap-vara-sm px-3 py-1.5 rounded-vara-md text-vara-sm ${
                      aiSuggestionType === key ? 'bg-white shadow-vara-sm' : 'text-muted-sage-gray'
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-mist-white rounded-vara-lg p-vara-base border border-divider">
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-vara-base mb-vara-xl">
      {/* Goals card */}
      <button
        type="button"
        onClick={() => {
          setGoalFilter('all');
          jumpToTab('goals');
        }}
        className="text-left bg-white border border-divider rounded-vara-lg p-5 hover:shadow-vara-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-vara-md mb-3">
          <div className="w-9 h-9 rounded-vara-md flex items-center justify-center" style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}>
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-soft-charcoal">Goals</h3>
            <p className="text-muted-sage-gray text-vara-sm">{goalStats.active} active</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-vara-sm">
            <span className="text-muted-sage-gray">Progress</span>
            <span className="font-semibold text-evergreen-teal">{goalStats.avgProgress}%</span>
          </div>
          <div className="w-full bg-dew-sage-light rounded-full h-2">
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
        className="text-left bg-white border border-divider rounded-vara-lg p-5 hover:shadow-vara-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-vara-md mb-3">
          <div className="w-9 h-9 rounded-vara-md flex items-center justify-center bg-blue-600">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-soft-charcoal">Habits</h3>
            <p className="text-muted-sage-gray text-vara-sm">{habitStats.active} active</p>
          </div>
        </div>
        <div className="text-vara-sm text-soft-charcoal">
          <span className="font-medium">Avg streak:</span> {habitStats.avgStreak} days
        </div>
      </button>

      {/* Integrations card */}
      <button
        type="button"
        onClick={() => jumpToTab('integrations')}
        className="text-left bg-white border border-divider rounded-vara-lg p-5 hover:shadow-vara-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-vara-md mb-3">
          <div className="w-9 h-9 rounded-vara-md flex items-center justify-center bg-purple-600">
            <Link2 size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-soft-charcoal">Integrations</h3>
            <p className="text-muted-sage-gray text-vara-sm">
              {connectedApps.filter((a) => a.connected).length} connected
            </p>
          </div>
        </div>
        <div className="w-full">
          <span className="inline-block bg-white text-evergreen-teal border border-silver-sage rounded-vara-lg px-3 py-2 text-vara-sm font-medium">
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
        className="text-left bg-white border border-divider rounded-vara-lg p-5 hover:shadow-vara-md transition-shadow cursor-pointer"
      >
        <div className="flex items-center gap-vara-md mb-3">
          <div className="w-9 h-9 rounded-vara-md flex items-center justify-center bg-amber-500">
            <Crown size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-soft-charcoal">Best Streak</h3>
            <p className="text-muted-sage-gray text-vara-sm">Personal record</p>
          </div>
        </div>
        <div className="flex items-center gap-vara-sm">
          <Medal size={16} className="text-amber-600" />
          <span className="font-bold text-amber-700 text-vara-lg">{habitStats.bestStreak} days</span>
        </div>
      </button>
    </div>
  );

  /** ----------------- Render ----------------- */
  return (
    <SidebarLayout>
      <div className="px-vara-base py-vara-lg max-w-5xl mx-auto">
        <div className="mb-vara-lg">
          <div className="flex items-center gap-vara-base">
            <div className="w-12 h-12 rounded-vara-lg flex items-center justify-center shadow-vara-sm" style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}>
              <Target size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-vara-2xl font-semibold tracking-tight text-soft-charcoal">Productivity Hub</h1>
              <p className="text-muted-sage-gray">
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
            <div className="bg-white rounded-vara-lg p-vara-lg border border-divider shadow-vara-sm">
              <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base flex items-center gap-vara-sm">
                <Activity size={20} className="text-evergreen-teal" />
                Recent Activity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-base">
                <div>
                  <h3 className="font-semibold text-soft-charcoal mb-3 flex items-center gap-vara-sm">
                    <Target size={16} className="text-evergreen-teal" />
                    Latest Goals
                  </h3>
                  <div className="space-y-2">
                    {goals.slice(0, 3).map((goal) => (
                      <div key={goal.id} className="bg-mist-white border border-divider rounded-vara-lg p-vara-base">
                        <div className="flex items-center gap-vara-sm">
                          <div className={`w-2 h-2 rounded-full ${goal.status === 'completed' ? 'bg-evergreen-teal' : 'bg-evergreen-teal'}`} />
                          <h4 className="font-medium text-soft-charcoal">{goal.title}</h4>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-vara-sm text-muted-sage-gray">{goal.category}</span>
                          <span className="text-vara-sm font-medium text-evergreen-teal">{goal.progress || 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-soft-charcoal mb-3 flex items-center gap-vara-sm">
                    <Sparkles size={16} className="text-blue-600" />
                    Active Habits
                  </h3>
                  <div className="space-y-2">
                    {habits.filter(h => h.status !== 'completed').slice(0, 3).map((habit) => {
                      const s = habitStreaks.get(habit.id) || { current: 0 };
                      const displayTitle = habit.title ?? habit.name;
                      return (
                        <div key={habit.id} className="bg-mist-white border border-divider rounded-vara-lg p-vara-base">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-soft-charcoal">{displayTitle}</h4>
                            <div className="flex items-center gap-1 text-vara-sm font-medium text-orange-600">
                              <Flame size={14} />
                              {s.current}d
                            </div>
                          </div>
                          <div className="text-vara-sm text-muted-sage-gray mt-1">{habit.type}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Calendar with filters */}
            <div className="bg-white rounded-vara-lg p-vara-lg border border-divider shadow-vara-sm">
              <div className="flex flex-wrap items-center justify-between gap-vara-md mb-vara-base">
                <div className="flex items-center gap-vara-sm">
                  <CalendarIcon size={18} className="text-evergreen-teal" />
                  <h2 className="text-vara-lg font-semibold text-soft-charcoal">Calendar</h2>
                </div>
                <div className="flex flex-wrap items-center gap-vara-sm">
                  <select
                    value={calendarView}
                    onChange={(e) => setCalendarView(e.target.value)}
                    className="bg-white border border-divider rounded-vara-md px-3 py-2 text-vara-sm"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="year">Year</option>
                  </select>

                  <select
                    value={calendarTypeFilter}
                    onChange={(e) => setCalendarTypeFilter(e.target.value)}
                    className="bg-white border border-divider rounded-vara-md px-3 py-2 text-vara-sm"
                  >
                    <option value="all">All</option>
                    <option value="goals">Goals</option>
                    <option value="habits">Habits</option>
                  </select>

                  <select
                    value={calendarStatusFilter}
                    onChange={(e) => setCalendarStatusFilter(e.target.value)}
                    className="bg-white border border-divider rounded-vara-md px-3 py-2 text-vara-sm"
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
                <h2 className="text-vara-xl font-bold text-soft-charcoal flex items-center gap-vara-md">
                  <Target size={24} className="text-evergreen-teal" />
                  Goals
                  <span className="bg-teal-light text-evergreen-teal text-vara-sm px-2.5 py-1 rounded-full border border-evergreen-teal/20">
                    {filteredGoals.length}
                  </span>
                </h2>
                <p className="text-muted-sage-gray mt-1">Define and track your long-term objectives</p>
              </div>
              <button
                onClick={() => setCreatingGoal(true)}
                className="flex items-center gap-vara-sm px-5 py-2.5 rounded-vara-lg text-white font-medium shadow-vara-sm"
                style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
              >
                <Plus size={18} />
                Create Goal
              </button>
            </div>

            {creatingGoal && (
              <div className="bg-white border border-silver-sage rounded-vara-lg p-vara-lg shadow-vara-sm">
                <div className="flex items-center justify-between mb-vara-base">
                  <h3 className="text-vara-lg font-semibold text-evergreen-teal">Create New Goal</h3>
                  <button onClick={() => setCreatingGoal(false)} className="p-2 hover:bg-dew-sage-light rounded-vara-md">
                    <X size={18} className="text-muted-sage-gray" />
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


            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-vara-base' : 'space-y-3'}>
              {filteredGoals.length === 0 ? (
                <div className="col-span-full text-center py-10">
                  <Target size={40} className="mx-auto text-silver-sage mb-3" />
                  <h3 className="text-vara-lg font-semibold text-soft-charcoal">No goals yet</h3>
                  <p className="text-muted-sage-gray">Create your first goal to get started</p>
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
                <h2 className="text-vara-xl font-bold text-soft-charcoal flex items-center gap-vara-md">
                  <Sparkles size={24} className="text-blue-600" />
                  Habits
                  <span className="bg-blue-50 text-blue-700 text-vara-sm px-2.5 py-1 rounded-full border border-blue-100">
                    {filteredHabits.length}
                  </span>
                </h2>
                <p className="text-muted-sage-gray mt-1">Build consistent routines that support your goals</p>
              </div>
              <button
                onClick={() => setCreatingHabit(true)}
                className="flex items-center gap-vara-sm px-5 py-2.5 rounded-vara-lg text-white font-medium shadow-vara-sm"
                style={{ background: `linear-gradient(90deg, ${TEAL}, ${SAGE})` }}
              >
                <Plus size={18} />
                Create Habit
              </button>
            </div>

            {creatingHabit && (
              <div className="bg-white border border-silver-sage rounded-vara-lg p-vara-lg shadow-vara-sm">
                <div className="flex items-center justify-between mb-vara-base">
                  <h3 className="text-vara-lg font-semibold text-evergreen-teal">Create New Habit</h3>
                  <button onClick={() => setCreatingHabit(false)} className="p-2 hover:bg-dew-sage-light rounded-vara-md">
                    <X size={18} className="text-muted-sage-gray" />
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


            <div className={viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 gap-vara-base' : 'space-y-3'}>
              {filteredHabits.length === 0 ? (
                <div className="col-span-full text-center py-10">
                  <Sparkles size={40} className="mx-auto text-silver-sage mb-3" />
                  <h3 className="text-vara-lg font-semibold text-soft-charcoal">No habits yet</h3>
                  <p className="text-muted-sage-gray">Create your first habit to start building consistency</p>
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
              <h2 className="text-vara-xl font-bold text-soft-charcoal flex items-center gap-vara-md mb-2">
                <Link2 size={24} className="text-purple-600" />
                App Integrations
              </h2>
              <p className="text-muted-sage-gray">Connect your favorite apps to automatically track habits and sync data</p>
            </div>

            <div className="bg-white rounded-vara-lg p-vara-lg border border-divider">
              <div className="flex items-center justify-between mb-vara-lg">
                <div>
                  <h3 className="text-vara-lg font-semibold text-soft-charcoal">Connected Apps</h3>
                  <p className="text-muted-sage-gray">
                    {connectedApps.filter((a) => a.connected).length} of {connectedApps.length} apps connected
                  </p>
                </div>
                <div className="flex items-center gap-vara-sm">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      connectedApps.some((a) => a.connected) ? 'bg-evergreen-teal' : 'bg-muted-sage-gray/60'
                    }`}
                  />
                  <span className="text-vara-sm font-medium text-soft-charcoal">
                    {connectedApps.some((a) => a.connected) ? 'Active' : 'No connections'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-vara-base">
                {connectedApps.map((app) => (
                  <div
                    key={app.id}
                    className={`bg-white rounded-vara-lg p-5 border transition-all ${app.connected ? 'border-silver-sage bg-teal-light' : 'border-divider'}`}
                  >
                    <div className="flex items-center gap-vara-md mb-3">
                      <div className={`w-10 h-10 rounded-vara-lg flex items-center justify-center ${app.connected ? 'bg-dew-sage' : 'bg-dew-sage-light'}`}>
                        <app.icon size={20} className={app.connected ? 'text-evergreen-teal' : 'text-muted-sage-gray'} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-soft-charcoal">{app.name}</h4>
                        <span className={`text-vara-sm flex items-center gap-1 ${app.connected ? 'text-evergreen-teal' : 'text-muted-sage-gray'}`}>
                          {app.connected ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {app.connected ? 'Connected' : 'Not connected'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-vara-xs font-medium text-muted-sage-gray uppercase tracking-wide">Capabilities</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {app.capabilities.map((capability) => (
                            <span key={capability} className="text-vara-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {capability}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() => setConnectedApps((apps) => apps.map((a) => a.id === app.id ? { ...a, connected: !a.connected } : a))}
                        className={`w-full py-2.5 rounded-vara-lg font-medium transition-all ${
                          app.connected ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-dew-sage text-evergreen-teal hover:bg-silver-sage'
                        }`}
                      >
                        {app.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-5 bg-mist-white rounded-vara-lg border border-divider">
                <h4 className="font-semibold text-soft-charcoal mb-2 flex items-center gap-vara-sm">
                  <Lightbulb size={18} className="text-evergreen-teal" />
                  How Auto-Tracking Works
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-base text-vara-sm">
                  <div className="space-y-1 text-soft-charcoal">
                    <div className="flex items-center gap-vara-sm"><div className="w-1.5 h-1.5 bg-evergreen-teal rounded-full" /><span>Connect your favorite fitness and wellness apps</span></div>
                    <div className="flex items-center gap-vara-sm"><div className="w-1.5 h-1.5 bg-evergreen-teal rounded-full" /><span>Create habits that match activities in those apps</span></div>
                  </div>
                  <div className="space-y-1 text-soft-charcoal">
                    <div className="flex items-center gap-vara-sm"><div className="w-1.5 h-1.5 bg-evergreen-teal rounded-full" /><span>Habits automatically complete when activities are detected</span></div>
                    <div className="flex items-center gap-vara-sm"><div className="w-1.5 h-1.5 bg-evergreen-teal rounded-full" /><span>Your streaks and progress update in real-time</span></div>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-vara-base">
            <div className="bg-white rounded-vara-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-divider px-vara-lg py-vara-base flex items-center justify-between">
                <h3 className="text-vara-lg font-semibold text-evergreen-teal">Edit Goal</h3>
                <button
                  onClick={() => setEditingGoal(null)}
                  className="p-2 hover:bg-dew-sage-light rounded-vara-md transition-colors"
                >
                  <X size={20} className="text-muted-sage-gray" />
                </button>
              </div>
              <div className="p-vara-lg">
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-vara-base">
            <div className="bg-white rounded-vara-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-divider px-vara-lg py-vara-base flex items-center justify-between">
                <h3 className="text-vara-lg font-semibold text-evergreen-teal">Edit Habit</h3>
                <button
                  onClick={() => setEditingHabit(null)}
                  className="p-2 hover:bg-dew-sage-light rounded-vara-md transition-colors"
                >
                  <X size={20} className="text-muted-sage-gray" />
                </button>
              </div>
              <div className="p-vara-lg">
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
            <div className="bg-white rounded-vara-lg p-vara-lg w-full max-w-lg border border-divider">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-vara-lg font-semibold text-soft-charcoal">Habit Details</h3>
                <button className="p-2 hover:bg-dew-sage-light rounded-vara-lg" onClick={() => setSelectedHabit(null)}>
                  <X size={18} className="text-muted-sage-gray" />
                </button>
              </div>
              <div className="space-y-2 text-vara-sm">
                <div className="font-semibold text-soft-charcoal">{selectedHabit.title ?? selectedHabit.name}</div>
                <div className="text-soft-charcoal">Type: {selectedHabit.type || 'Custom'}</div>
                <div className="text-soft-charcoal">Frequency: {selectedHabit.frequency || '—'}</div>
                {selectedHabit.trigger && <div className="text-soft-charcoal">Trigger: {selectedHabit.trigger}</div>}
                {selectedHabit.reward && <div className="text-soft-charcoal">Reward: {selectedHabit.reward}</div>}
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










