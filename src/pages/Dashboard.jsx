// src/pages/Dashboard.jsx - Simplified Dashboard (Redesign)

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
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
} from "firebase/firestore";
import SidebarLayout from "../components/layout/SidebarLayout";
import { useHabits } from '../hooks/useHabits';
import {
  Flame,
  CheckCircle,
  TrendingUp,
  Brain,
  AlertTriangle,
  Target,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  CalendarClock,
  Inbox,
  Archive,
  Edit2,
  Plus,
} from "lucide-react";

// Import new reusable components
import StatCard from "../components/dashboard/StatCard";
import PriorityItem from "../components/dashboard/PriorityItem";
import SectionCard from "../components/dashboard/SectionCard";

// Import task components
import TaskQuickAdd from "../components/tasks/TaskQuickAdd";
import TaskCard from "../components/tasks/TaskCard";
import TaskSection from "../components/tasks/TaskSection";

// Import Phase 2 components
import TimeFilter from "../components/dashboard/TimeFilter";
import HabitTrackerWeekly from "../components/dashboard/HabitTrackerWeekly";
import CommunityHighlights from "../components/dashboard/CommunityHighlights";
import WeekRecap from "../components/dashboard/WeekRecap";

// Import Edit Modals
import HabitEditModal from "../components/dashboard/HabitEditModal";
import GoalEditModal from "../components/dashboard/GoalEditModal";
import GoalProgressModal from "../components/dashboard/GoalProgressModal";

/* ==================== HELPER FUNCTIONS ==================== */

const todayYMD = () => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const ymd = (d) => {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const isHabitDueToday = (habit) => {
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayShort = shortDays[new Date().getDay()];
  const type =
    habit?.type ||
    habit?.frequency?.type ||
    (habit?.frequency === "daily" ? "daily" : habit?.frequency);

  if (!type) return true;
  if (type === "daily") return true;
  if (type === "weekly") {
    const days = habit?.days || habit?.frequency?.days || [];
    if (Array.isArray(days) && days.length) {
      return days.includes(todayShort);
    }
    return true;
  }
  return true;
};

const getGoalProgressParts = (goal) => {
  const isBinaryLike =
    (goal?.targetType && ["milestone", "binary", "boolean"].includes(String(goal.targetType).toLowerCase())) ||
    !Number.isFinite(Number(goal?.target)) ||
    Number(goal?.target) <= 0;

  if (isBinaryLike) {
    const progressed = !!goal?.progress;
    return {
      progressDisplay: progressed ? 1 : 0,
      targetDisplay: 1,
      pct: progressed ? 100 : 0
    };
  }

  const progressNum = Number(goal?.progress) || 0;
  const targetNum = Math.max(1, Number(goal?.target) || 1);
  return {
    progressDisplay: progressNum,
    targetDisplay: targetNum,
    pct: Math.min(100, (progressNum / targetNum) * 100)
  };
};

const formatDueDate = (dueDate) => {
  if (!dueDate) return '';

  let date;
  if (dueDate?.seconds) {
    date = new Date(dueDate.seconds * 1000);
  } else {
    date = new Date(dueDate);
  }

  if (isNaN(date)) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const diffTime = compareDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < -1) return `${Math.abs(diffDays)} days ago`;
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;

  return date.toLocaleDateString();
};

const getTimeBasedGreeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

const getMotivationalInsight = () => {
  const insights = [
    "You're building incredible momentum!",
    "Small steps lead to big changes!",
    "Your consistency is paying off!",
    "Every habit completed is a victory!",
    "You're creating a better version of yourself!",
  ];
  return insights[Math.floor(Math.random() * insights.length)];
};

/* ==================== MAIN COMPONENT ==================== */

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Habits hook
  const { habits, habitCompletions: habitCompletionsArray, logHabitToday } = useHabits(user?.uid);

  // Transform habitCompletions array into a map for easier lookup
  const habitCompletions = useMemo(() => {
    const map = {};
    if (Array.isArray(habitCompletionsArray)) {
      habitCompletionsArray.forEach(completion => {
        const { habitId, dateISO } = completion;
        if (!map[habitId]) map[habitId] = [];
        map[habitId].push(dateISO);
      });
    }
    return map;
  }, [habitCompletionsArray]);

  // State - significantly reduced from original 68 variables
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [userName, setUserName] = useState("");
  const [dailyPlan, setDailyPlan] = useState("");
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [showAllHabits, setShowAllHabits] = useState(false);
  const [loading, setLoading] = useState(true);

  // Phase 2: Time view state
  const [timeView, setTimeView] = useState('weekly'); // daily, weekly, monthly, yearly

  // Modal states for editing
  const [editingHabit, setEditingHabit] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [progressGoal, setProgressGoal] = useState(null);

  // Helper: Get current week range
  const getCurrentWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Get Monday
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  const currentWeekRange = getCurrentWeekRange();

  /* ==================== DATA FETCHING ==================== */

  const fetchDashboardData = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [goalsSnap, tasksSnap, userSnap] = await Promise.all([
        getDocs(query(collection(db, 'goals'), where('userId', '==', user.uid))),
        getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid))),
        getDoc(doc(db, 'users', user.uid))
      ]);

      setGoals(goalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setUserName(userSnap.data()?.displayName || 'there');
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.uid]);

  // Fetch AI Daily Plan
  const fetchDailyPlan = async () => {
    if (!user?.uid) return;

    // Only fetch if we have at least some goals or habits
    if (goals.length === 0 && habits.length === 0) {
      setDailyPlan('Create some goals and habits to get your personalized daily plan!');
      return;
    }

    setIsLoadingPlan(true);
    try {
      // Get user profile for name
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userName = userDoc.data()?.displayName || user.displayName || 'there';

      // Prepare goals data
      const goalsData = goals.map(g => ({
        title: g.title || 'Untitled Goal',
        progress: g.progress || 0,
        target: g.target || 100,
        unit: g.unit || '%'
      }));

      // Call Firebase callable function
      const functions = getFunctions();
      const generateDailyPlanFn = httpsCallable(functions, 'generateDailyPlan');

      const result = await generateDailyPlanFn({
        name: userName,
        preferences: {
          tone: 'gentle',
          intensity: 'standard'
        },
        mood: null, // Could be enhanced to fetch today's mood
        goals: goalsData,
        modifier: null
      });

      setDailyPlan(result.data.plan || 'No plan generated');
    } catch (error) {
      console.error('Error fetching daily plan:', error);
      setDailyPlan('AI plan is temporarily unavailable. Click Regenerate to try again.');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  // Removed auto-fetch to prevent unnecessary API calls
  // Users can click "Regenerate" to manually fetch their daily plan

  /* ==================== COMPUTED VALUES ==================== */

  const todaysCompletions = useMemo(() => {
    const today = todayYMD();
    return new Set(
      Object.entries(habitCompletions)
        .filter(([_, dates]) => Array.isArray(dates) && dates.includes(today))
        .map(([habitId]) => habitId)
    );
  }, [habitCompletions]);

  const habitsDueToday = useMemo(() => {
    return habits.filter(h => h.active !== false && isHabitDueToday(h));
  }, [habits]);

  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status !== 'completed').slice(0, 4);
  }, [goals]);

  // Group tasks by Eisenhower quadrant
  const urgentImportantTasks = useMemo(() => {
    return tasks
      .filter(t => t.eisenhowerQuadrant === 'urgent-important' && t.status !== 'completed')
      .sort((a, b) => {
        const dateA = a.dueDate?.seconds || 0;
        const dateB = b.dueDate?.seconds || 0;
        return dateA - dateB;
      });
  }, [tasks]);

  const importantNotUrgentTasks = useMemo(() => {
    return tasks
      .filter(t => t.eisenhowerQuadrant === 'important-not-urgent' && t.status !== 'completed')
      .sort((a, b) => {
        const dateA = a.dueDate?.seconds || 0;
        const dateB = b.dueDate?.seconds || 0;
        return dateA - dateB;
      });
  }, [tasks]);

  const urgentNotImportantTasks = useMemo(() => {
    return tasks
      .filter(t => t.eisenhowerQuadrant === 'urgent-not-important' && t.status !== 'completed')
      .sort((a, b) => {
        const dateA = a.dueDate?.seconds || 0;
        const dateB = b.dueDate?.seconds || 0;
        return dateA - dateB;
      });
  }, [tasks]);

  const neitherTasks = useMemo(() => {
    return tasks
      .filter(t => t.eisenhowerQuadrant === 'neither' && t.status !== 'completed')
      .sort((a, b) => {
        const dateA = a.dueDate?.seconds || 0;
        const dateB = b.dueDate?.seconds || 0;
        return dateA - dateB;
      });
  }, [tasks]);

  // Calculate stats
  const currentStreak = useMemo(() => {
    let maxStreak = 0;
    habits.forEach(habit => {
      if (habit.streak && habit.streak > maxStreak) {
        maxStreak = habit.streak;
      }
    });
    return maxStreak;
  }, [habits]);

  const todayCompletionRate = useMemo(() => {
    if (habitsDueToday.length === 0) return 100;
    const completed = habitsDueToday.filter(h => todaysCompletions.has(h.id)).length;
    return Math.round((completed / habitsDueToday.length) * 100);
  }, [habitsDueToday, todaysCompletions]);

  const weekCompletionRate = useMemo(() => {
    // Calculate last 7 days completion rate
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last7Days.push(ymd(d));
    }

    let totalExpected = 0;
    let totalCompleted = 0;

    habits.forEach(habit => {
      const habitDates = habitCompletions[habit.id] || [];
      last7Days.forEach(date => {
        totalExpected++;
        if (habitDates.includes(date)) {
          totalCompleted++;
        }
      });
    });

    if (totalExpected === 0) return 0;
    return Math.round((totalCompleted / totalExpected) * 100);
  }, [habits, habitCompletions]);

  /* ==================== HANDLERS ==================== */

  const handleCompleteHabit = async (habitId) => {
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      await logHabitToday(habit);
    }
  };

  const handleToggleTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: task.status === 'completed' ? 'pending' : 'completed',
        updatedAt: serverTimestamp(),
      });

      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const getLinkedGoal = (goalId) => goals.find(g => g.id === goalId);

  const handleAddTask = async (taskData) => {
    if (!user?.uid) return;

    try {
      const newTask = {
        ...taskData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'tasks'), newTask);

      setTasks(prev => [...prev, { id: docRef.id, ...taskData, createdAt: new Date(), updatedAt: new Date() }]);
    } catch (error) {
      console.error('Error adding task:', error);
      alert('Failed to add task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const handleDeferTask = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // Default to 9 AM tomorrow

      await updateDoc(doc(db, 'tasks', taskId), {
        dueDate: tomorrow,
        updatedAt: serverTimestamp(),
      });

      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, dueDate: tomorrow } : t
        )
      );
    } catch (error) {
      console.error('Error deferring task:', error);
      alert('Failed to defer task. Please try again.');
    }
  };

  const handleEditTask = (task) => {
    // Navigate to Life Design page where full task editing exists
    navigate('/goals-habits');
  };

  /* ==================== RENDER ==================== */

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#1B5E57] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* ==================== HEADER ==================== */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {getTimeBasedGreeting()}, {userName}
              </h1>
              <p className="text-gray-600">{getMotivationalInsight()}</p>
            </div>
            {/* Phase 2: Time Filter */}
            <TimeFilter currentView={timeView} onViewChange={setTimeView} />
          </div>
        </div>

        {/* ==================== HERO STATS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<Flame size={24} />}
            label="Current Streak"
            value={currentStreak}
            unit="days"
            gradient="from-orange-400 via-red-500 to-pink-500"
          />

          <StatCard
            icon={<CheckCircle size={24} />}
            label="Today's Habits"
            value={`${todaysCompletions.size}/${habitsDueToday.length}`}
            subtitle={`${todayCompletionRate}% complete`}
            gradient="from-green-400 via-emerald-500 to-teal-500"
          />

          <StatCard
            icon={<TrendingUp size={24} />}
            label="This Week"
            value={`${weekCompletionRate}%`}
            subtitle="completion rate"
            gradient="from-blue-400 via-indigo-500 to-purple-500"
          />
        </div>

        {/* ==================== AI PLAN SECTION ==================== */}
        <SectionCard
          icon={<Brain size={24} className="text-purple-600" />}
          title="Today's AI Plan"
          action={
            <button
              onClick={fetchDailyPlan}
              disabled={isLoadingPlan}
              className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoadingPlan ? '...' : '↻ Generate'}
            </button>
          }
        >
          {isLoadingPlan ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : dailyPlan ? (
            <div>
              <div className={`text-gray-700 leading-relaxed whitespace-pre-wrap ${isPlanExpanded ? '' : 'line-clamp-3'}`}>
                {dailyPlan}
              </div>
              {dailyPlan.length > 200 && (
                <button
                  onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                  className="mt-3 text-sm text-[#1B5E57] hover:text-[#174C46] font-medium flex items-center gap-1"
                >
                  {isPlanExpanded ? (
                    <>Show Less <ChevronUp size={16} /></>
                  ) : (
                    <>Read Full Plan <ChevronDown size={16} /></>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Click 'Generate' to get your personalized plan...
            </p>
          )}
        </SectionCard>

        {/* ==================== FOCUS RIGHT NOW SECTION ==================== */}
        <SectionCard
          gradient="from-red-50 to-orange-50"
          headerClassName="border-b border-red-100"
          icon={<AlertTriangle size={24} className="text-red-600" />}
          title="Focus Right Now"
          action={
            <span className="text-sm text-gray-600">
              {habitsDueToday.filter(h => !todaysCompletions.has(h.id)).length} habits
            </span>
          }
        >
          <div className="space-y-3">
            {/* Habits due today that aren't completed */}
            {habitsDueToday
              .slice(0, 5)
              .map(habit => (
                <PriorityItem
                  key={habit.id}
                  type="habit"
                  title={habit.name}
                  streak={habit.streak || 0}
                  frequency={habit.frequency?.type || habit.type}
                  completed={todaysCompletions.has(habit.id)}
                  onComplete={() => handleCompleteHabit(habit.id)}
                  onEdit={() => setEditingHabit(habit)}
                />
              ))}

            {/* Empty State */}
            {habitsDueToday.filter(h => !todaysCompletions.has(h.id)).length === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto mb-2 text-green-500" size={48} />
                <p className="font-medium text-gray-700">All caught up! Great work!</p>
                <p className="text-sm text-gray-500 mt-1">You've completed all your priority habits for today</p>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ==================== ACTIVE GOALS SECTION ==================== */}
        <SectionCard
          icon={<Target size={24} className="text-[#1B5E57]" />}
          title="Active Goals"
          action={
            <button
              onClick={() => navigate('/goals-habits')}
              className="text-sm text-[#1B5E57] hover:text-[#174C46] font-medium"
            >
              View All →
            </button>
          }
        >
          {activeGoals.length > 0 ? (
            <div className="space-y-4">
              {activeGoals.map(goal => {
                const { pct, progressDisplay, targetDisplay } = getGoalProgressParts(goal);
                return (
                  <div key={goal.id} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => setEditingGoal(goal)}
                          className="font-medium text-gray-900 hover:text-[#1B5E57] text-left transition-colors truncate"
                        >
                          {goal.title}
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProgressGoal(goal);
                            }}
                            className="p-1 hover:bg-green-50 rounded transition-all flex-shrink-0"
                            title="Mark progress"
                          >
                            <Plus size={14} className="text-green-600" />
                          </button>
                          <button
                            onClick={() => setEditingGoal(goal)}
                            className="p-1 hover:bg-gray-100 rounded transition-all flex-shrink-0"
                            title="Edit goal"
                          >
                            <Edit2 size={14} className="text-gray-500" />
                          </button>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-[#1B5E57] flex-shrink-0">
                        {Math.round(pct)}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {progressDisplay} / {targetDisplay} {goal.unit || 'completed'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {goal.primaryFocus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No active goals yet</p>
              <button
                onClick={() => navigate('/goals-habits')}
                className="px-4 py-2 rounded-lg bg-[#1B5E57] text-white hover:bg-[#174C46] transition-colors"
              >
                Create Your First Goal
              </button>
            </div>
          )}
        </SectionCard>

        {/* ==================== PHASE 2: HABIT TRACKER (WEEKLY) ==================== */}
        <SectionCard
          title="Habit Tracker"
          action={
            <span className="text-sm text-gray-600">
              {todaysCompletions.size}/{habitsDueToday.length} completed today
            </span>
          }
        >
          <HabitTrackerWeekly
            habits={habits}
            habitCompletions={habitCompletions}
            onComplete={handleCompleteHabit}
            onEdit={(habit) => setEditingHabit(habit)}
          />
        </SectionCard>

        {/* ==================== TASK COMMAND CENTER ==================== */}
        <SectionCard
          title="Task Command Center"
          icon={<Target size={24} className="text-[#1B5E57]" />}
          action={
            <button
              onClick={() => navigate('/goals-habits')}
              className="text-sm text-[#1B5E57] hover:text-[#174C46] font-medium"
            >
              Manage Tasks →
            </button>
          }
        >
          {/* Quick Add */}
          <div className="mb-6">
            <TaskQuickAdd onAdd={handleAddTask} defaultQuadrant="urgent-important" />
          </div>

          {/* Eisenhower Matrix - All 4 Quadrants */}
          <div className="space-y-4">
            {/* DO FIRST - Urgent & Important */}
            <TaskSection
              title="DO FIRST"
              icon={Zap}
              count={urgentImportantTasks.length}
              gradient="from-red-500 to-orange-500"
              borderColor="border-red-200"
              defaultExpanded={true}
            >
              {urgentImportantTasks.map(task => {
                const linkedGoal = getLinkedGoal(task.goalId);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    goalBadge={linkedGoal?.title}
                    onToggle={handleToggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onDefer={handleDeferTask}
                  />
                );
              })}
            </TaskSection>

            {/* SCHEDULE - Important but Not Urgent */}
            <TaskSection
              title="SCHEDULE"
              icon={CalendarClock}
              count={importantNotUrgentTasks.length}
              gradient="from-blue-500 to-indigo-500"
              borderColor="border-blue-200"
              defaultExpanded={importantNotUrgentTasks.length > 0}
            >
              {importantNotUrgentTasks.map(task => {
                const linkedGoal = getLinkedGoal(task.goalId);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    goalBadge={linkedGoal?.title}
                    onToggle={handleToggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onDefer={handleDeferTask}
                  />
                );
              })}
            </TaskSection>

            {/* DELEGATE - Urgent but Not Important */}
            <TaskSection
              title="DELEGATE"
              icon={Inbox}
              count={urgentNotImportantTasks.length}
              gradient="from-yellow-500 to-amber-500"
              borderColor="border-yellow-200"
              defaultExpanded={false}
              autoCollapseIfEmpty={true}
            >
              {urgentNotImportantTasks.map(task => {
                const linkedGoal = getLinkedGoal(task.goalId);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    goalBadge={linkedGoal?.title}
                    onToggle={handleToggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onDefer={handleDeferTask}
                  />
                );
              })}
            </TaskSection>

            {/* ELIMINATE - Neither Urgent nor Important */}
            <TaskSection
              title="ELIMINATE"
              icon={Archive}
              count={neitherTasks.length}
              gradient="from-gray-500 to-slate-500"
              borderColor="border-gray-200"
              defaultExpanded={false}
              autoCollapseIfEmpty={true}
            >
              {neitherTasks.map(task => {
                const linkedGoal = getLinkedGoal(task.goalId);
                return (
                  <TaskCard
                    key={task.id}
                    task={task}
                    goalBadge={linkedGoal?.title}
                    onToggle={handleToggleTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onDefer={handleDeferTask}
                  />
                );
              })}
            </TaskSection>
          </div>

          {/* Empty State - No tasks at all */}
          {tasks.filter(t => t.status !== 'completed').length === 0 && (
            <div className="text-center py-12">
              <Target className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="font-medium text-gray-700 mb-2">No active tasks</p>
              <p className="text-sm text-gray-500">Use Quick Add above to create your first task</p>
            </div>
          )}
        </SectionCard>

        {/* ==================== PHASE 2: COMMUNITY HIGHLIGHTS ==================== */}
        <SectionCard
          title="Community Highlights"
          action={
            <button
              onClick={() => navigate('/community')}
              className="text-sm text-[#1B5E57] hover:text-[#174C46] font-medium"
            >
              View Community →
            </button>
          }
        >
          <CommunityHighlights timeView={timeView} />
        </SectionCard>

        {/* ==================== PHASE 2: WEEK RECAP (4-3-2-1 FRAMEWORK) ==================== */}
        {timeView === 'weekly' && (
          <SectionCard>
            <WeekRecap userId={user?.uid} currentWeekRange={currentWeekRange} />
          </SectionCard>
        )}

      </div>

      {/* Edit Modals */}
      {editingHabit && (
        <HabitEditModal
          habit={editingHabit}
          onClose={() => setEditingHabit(null)}
          onSave={fetchDashboardData}
        />
      )}

      {editingGoal && (
        <GoalEditModal
          goal={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSave={fetchDashboardData}
        />
      )}

      {progressGoal && (
        <GoalProgressModal
          goal={progressGoal}
          onClose={() => setProgressGoal(null)}
          onSave={fetchDashboardData}
        />
      )}
    </SidebarLayout>
  );
}
