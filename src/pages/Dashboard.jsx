// src/pages/Dashboard.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  orderBy,
  limit,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import SidebarLayout from "../components/layout/SidebarLayout";
// import HabitList from '../components/habits/HabitList'; // not used anymore in this file
import AddHabitForm from "../components/habits/AddHabitForm";
import GoalCreationForm from "../components/goals/GoalCreationForm";
import TaskCreationForm from "../components/tasks/TaskCreationForm";
import {
  Target,
  Sparkles,
  CheckCircle,
  Plus,
  Clock,
  Zap,
  AlertTriangle,
  Archive,
  ChevronDown,
  X,
  Activity,
  TrendingUp,
  Calendar,
  Brain,
  Edit,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ------------------------------ helpers ------------------------------ */

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

const getPastNDates = (n) => {
  const arr = [];
  const base = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    arr.push(ymd(d));
  }
  return arr; // oldest -> newest
};

// count consecutive days ending today present in a Set of 'YYYY-MM-DD'
const calcConsecutiveStreak = (dateSet) => {
  let streak = 0;
  const d = new Date();
  while (true) {
    const key = ymd(d);
    if (dateSet.has(key)) {
      streak += 1;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

// basic “due today” inference
const isHabitDueToday = (habit) => {
  // Accept flexible schemas:
  // - habit.type: 'daily' | 'weekly' | ...
  // - habit.frequency?.type: 'daily' | 'weekly'
  // - habit.frequency?.days: ['Mon', 'Tue', ...]
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayShort = shortDays[new Date().getDay()];
  const type = habit?.type || habit?.frequency?.type || (habit?.frequency === "daily" ? "daily" : habit?.frequency);
  if (!type) return true; // default due
  if (type === "daily") return true;
  if (type === "weekly") {
    const days = habit?.days || habit?.frequency?.days || [];
    if (Array.isArray(days) && days.length) {
      return days.includes(todayShort);
    }
    return true; // if day list not defined, assume due
  }
  return true;
};

// sanitize object to avoid undefined values for Firestore
const cleanForFirestore = (obj) => {
  const out = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const nested = cleanForFirestore(v);
      if (Object.keys(nested).length > 0) out[k] = nested;
    } else {
      out[k] = v;
    }
  });
  return out;
};

export default function Dashboard() {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [userName, setUserName] = useState("");
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dailyPlan, setDailyPlan] = useState("");
  const [planPreview, setPlanPreview] = useState("");
  const [modifier, setModifier] = useState("");
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // compact mood tracker
  const [mood, setMood] = useState("");
  const [moodNote, setMoodNote] = useState("");
  const [showMoodNote, setShowMoodNote] = useState(false);

  const [timeframe, setTimeframe] = useState("weekly");
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0,
  });

  // Form states
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskFilter, setTaskFilter] = useState({
    goalId: "all",
    status: "open",
  });

  const modifiers = [
    "Feeling energetic",
    "Short on time",
    "Need something gentle",
    "Prefer physical activity",
    "Prefer mental wellness",
    "Overwhelmed – need calm",
    "Focus on routine",
    "Surprise me",
  ];

  const timeframeOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  const moodOptions = [
    { emoji: "😄", label: "Amazing" },
    { emoji: "🙂", label: "Good" },
    { emoji: "😐", label: "Okay" },
    { emoji: "😞", label: "Not Great" },
    { emoji: "😣", label: "Struggling" },
  ];

  /* ---------------- AI daily plan ---------------- */
  const fetchDailyPlan = useCallback(
    async (opts = {}) => {
      if (!user?.uid) return;
      try {
        setIsLoadingPlan(true);
        const res = await fetch("http://localhost:5001/api/generate-daily-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, concise: true, bullets: 3, ...opts }),
        });
        const data = await res.json();
        if (data.plan) {
          setDailyPlan(data.plan);
          const preview = data.plan.length > 100 ? data.plan.substring(0, 100) + "..." : data.plan;
          setPlanPreview(preview);
        }
      } catch (err) {
        console.error("Failed to fetch daily plan:", err);
      } finally {
        setIsLoadingPlan(false);
      }
    },
    [user]
  );

  /* ---------------- fetching & shaping data ---------------- */

  const fetchGoals = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "goals"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      setGoals(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching goals:", err);
    }
  };

  const fetchHabits = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "habits"),
        where("userId", "==", user.uid),
        where("active", "==", true),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      const baseHabits = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // fetch completions for each habit (last ~60 days)
      const habitsWithCompletions = await Promise.all(
        baseHabits.map(async (h) => {
          try {
            const compRef = collection(db, "habits", h.id, "completions");
            // order by date if stored; if not, we'll just get all
            const compSnap = await getDocs(query(compRef));
            const dates = compSnap.docs
              .map((c) => (c.data()?.date ? c.data().date : c.id)) // support either field or docId as date
              .filter(Boolean);

            const dateSet = new Set(dates);
            const todayDone = dateSet.has(todayYMD());
            const streak = calcConsecutiveStreak(dateSet);
            const last7Keys = getPastNDates(7);
            const last7 = last7Keys.map((d) => dateSet.has(d));

            return {
              ...h,
              _completionDates: dateSet,
              completedToday: todayDone,
              streak,
              last7Keys,
              last7,
              dueToday: isHabitDueToday(h),
            };
          } catch (e) {
            console.error("Error loading completions for habit", h.id, e);
            return {
              ...h,
              _completionDates: new Set(),
              completedToday: false,
              streak: 0,
              last7Keys: getPastNDates(7),
              last7: Array(7).fill(false),
              dueToday: isHabitDueToday(h),
            };
          }
        })
      );

      setHabits(habitsWithCompletions);

      // dashboard-level streak/summary
      const totalHabits = habitsWithCompletions.length;
      const completedToday = habitsWithCompletions.filter((h) => h.completedToday).length;
      const completionRate = totalHabits > 0 ? Math.round((completedToday / totalHabits) * 100) : 0;
      const bestStreak = habitsWithCompletions.reduce((m, h) => Math.max(m, h.streak || 0), 0);

      setStreakData({
        currentStreak: habitsWithCompletions.reduce((sum, h) => sum + (h.completedToday ? 1 : 0), 0), // number of habits completed today
        longestStreak: bestStreak,
        completionRate,
      });
    } catch (err) {
      console.error("Error fetching habits:", err);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const taskData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTasks(taskData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        setUserName(
          userDoc.exists() ? userDoc.data().name || user.displayName : user.displayName || "User"
        );
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    if (user && isAuthReady) {
      fetchUserData();
      fetchGoals();
      fetchHabits();
      fetchTasks();
      fetchDailyPlan();
    }
  }, [user, isAuthReady, fetchDailyPlan, timeframe]);

  /* ---------------- actions ---------------- */

  const regeneratePlan = () => {
    if (!modifier) return;
    fetchDailyPlan({ forceNew: true, modifier });
  };

  const handleSaveMood = () => {
    // Optionally persist mood to Firestore here
    console.log("Mood saved:", { mood, note: moodNote });
    setMoodNote("");
    setShowMoodNote(false);
  };

  // ✅ FIX: Map SMART form payload to your Firestore schema and strip undefined
  const handleSaveGoal = async (dataFromForm) => {
    if (!user?.uid) return;
    try {
      const docBody = cleanForFirestore({
        userId: user.uid,
        // aliases from SMART form
        title: (dataFromForm.goalTitle || "").trim(),
        description: (dataFromForm.goalStatement || "").trim(),
        category: dataFromForm.focus, // "category" is used in your goal cards
        targetType: dataFromForm.targetType,
        unit: dataFromForm.measurementUnit, // displayed as goal.unit in cards
        target: Number(dataFromForm.targetAmount) || 0, // displayed as goal.target
        frequency: {
          value: Number(dataFromForm.frequencyValue) || 0,
          period: dataFromForm.frequencyPeriod || null,
        },
        successCriteria: dataFromForm.successCriteria || null,
        baseline: {
          amount:
            dataFromForm.baselineAmount === "" || dataFromForm.baselineAmount === undefined
              ? null
              : Number(dataFromForm.baselineAmount),
          notes: dataFromForm.baselineNotes || null,
        },
        confidence: Number(dataFromForm.confidence) || null,
        relevance: {
          why: dataFromForm.whyImportant || "",
          alignment: dataFromForm.alignmentNotes || null,
        },
        timeframe: {
          startDate: dataFromForm.startDate || null,
          endDate: dataFromForm.endDate || null,
          quick: dataFromForm.timeframeQuick || null,
        },
        habitIds: Array.isArray(dataFromForm.habitIds) ? dataFromForm.habitIds : [],
        status: "active",
        progress: 0, // initialize
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "goals"), docBody);
      await fetchGoals();
      setCreatingGoal(false);
    } catch (error) {
      console.error("Error saving goal:", error);
    }
  };

  const handleSaveHabit = async (habitData) => {
    if (!user?.uid) return;
    try {
      const mappedHabit = {
        ...habitData,
        userId: user.uid,
        active: habitData.active !== false, // default true
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "habits"), cleanForFirestore(mappedHabit));
      await fetchHabits();
      setCreatingHabit(false);
    } catch (error) {
      console.error("Error saving habit:", error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    await deleteDoc(doc(db, "goals", goalId));
    fetchGoals();
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    await updateDoc(doc(db, "tasks", taskId), { status: newStatus });
    fetchTasks();
  };

  const getTasksByQuadrant = (quadrant) => {
    return tasks.filter((task) => {
      const matchesQuadrant = task.eisenhowerQuadrant === quadrant;
      const matchesGoal =
        taskFilter.goalId === "all"
          ? true
          : taskFilter.goalId === "ungrouped"
          ? !task.goalId
          : task.goalId === taskFilter.goalId;
      const matchesStatus =
        taskFilter.status === "all"
          ? true
          : task.status === (taskFilter.status === "open" ? "pending" : "completed");

      return matchesQuadrant && matchesGoal && matchesStatus;
    });
  };

  const getLinkedGoal = (goalId) => goals.find((goal) => goal.id === goalId);
  const getLinkedHabit = (habitId) => habits.find((habit) => habit.id === habitId);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  };

  const getMotivationalInsight = () => {
    const insights = [
      "You're building incredible momentum! 🚀",
      "Small steps lead to big changes! ✨",
      "Your consistency is paying off! 💪",
      "Every habit completed is a victory! 🎉",
      "You're creating a better version of yourself! 🌟",
    ];
    return insights[Math.floor(Math.random() * insights.length)];
  };

  /* ---------------- compact mood bar ---------------- */
  const CompactMoodBar = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-700">Mood:</span>
        <div className="flex items-center gap-1">
          {moodOptions.map((m) => (
            <button
              key={m.emoji}
              onClick={() => setMood(m.emoji)}
              className={`px-2 py-1 rounded-lg text-sm border transition ${
                mood === m.emoji
                  ? "bg-[#B8CDBA] text-white border-[#B8CDBA]"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
              title={m.label}
            >
              {m.emoji}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowMoodNote((s) => !s)}
          className="ml-2 text-xs text-gray-500 hover:text-gray-700 underline"
        >
          {showMoodNote ? "Hide note" : "Add note"}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={handleSaveMood}
            className="px-3 py-1.5 rounded-md bg-[#1B5E57] text-white text-xs hover:bg-[#174C46]"
          >
            Save
          </button>
        </div>
      </div>
      {showMoodNote && (
        <div className="mt-2">
          <textarea
            value={moodNote}
            onChange={(e) => setMoodNote(e.target.value)}
            placeholder="Optional note…"
            rows={2}
            className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
          />
        </div>
      )}
    </div>
  );

  /* ---------------- habits: toggle today's completion ---------------- */

  const toggleHabitToday = async (habit) => {
    if (!user?.uid) return;
    const compDocRef = doc(db, "habits", habit.id, "completions", todayYMD());

    try {
      if (habit.completedToday) {
        // un-complete today
        await deleteDoc(compDocRef);
      } else {
        // mark complete
        await setDoc(compDocRef, { date: todayYMD(), createdAt: serverTimestamp() }, { merge: true });
      }
      // refresh just this habit locally to avoid full refetch
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== habit.id) return h;
          const newSet = new Set(h._completionDates);
          if (habit.completedToday) {
            newSet.delete(todayYMD());
          } else {
            newSet.add(todayYMD());
          }
          const streak = calcConsecutiveStreak(newSet);
          const last7Keys = getPastNDates(7);
          const last7 = last7Keys.map((d) => newSet.has(d));
          return {
            ...h,
            _completionDates: newSet,
            completedToday: !habit.completedToday,
            streak,
            last7Keys,
            last7,
          };
        })
      );
    } catch (e) {
      console.error("Failed to toggle habit completion", e);
    }
  };

  /* ---------------- UI pieces ---------------- */

  const GoalCards = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1B5E57] flex items-center gap-2">
          <Target size={20} />
          Active Goals
        </h2>
        <button
          onClick={() => setCreatingGoal(true)}
          className="flex items-center gap-1 text-sm text-[#1B5E57] border border-[#B8CDBA] px-3 py-2 rounded-lg hover:bg-[#B8CDBA] hover:text-white transition"
        >
          <Plus size={14} /> Add Goal
        </button>
      </div>

      {creatingGoal && (
        <div className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#1B5E57]">Create New Goal</h3>
            <button onClick={() => setCreatingGoal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <GoalCreationForm
            userId={user.uid}
            userHabits={habits}
            onNewHabitCreated={fetchHabits}
            onSave={handleSaveGoal}
            onCancel={() => setCreatingGoal(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {goals.map((goal) => {
          const progress = Number(goal.progress || 0);
          const target = Number(goal.target || 0);
          const pct = target > 0 ? Math.min((progress / target) * 100, 100) : 0;

          return (
            <div key={goal.id} className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1B5E57] flex items-center gap-2">
                    🎯 {goal.title || "Untitled Goal"}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {goal.category || "General"} • {goal.targetType || "Target"} {goal.unit || ""}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-lg font-bold text-[#1B5E57]">
                      {progress} / {target}
                    </span>
                    <span className="text-xs text-[#9AAE8C]">{goal.unit || ""}</span>
                  </div>
                  <div className="w-full bg-[#D5E3D1] rounded-full h-2 mt-2">
                    <div
                      className="bg-[#1B5E57] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6">
            You haven't created any goals yet. Click <span className="font-medium">Add Goal</span> to get started.
          </div>
        )}
      </div>
    </div>
  );

  const EnhancedHabitTracker = () => {
    const smallDay = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const last7Labels = getPastNDates(7).map((d) => d.slice(5)); // 'MM-DD'

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#9AAE8C] flex items-center gap-2">
            <Sparkles size={20} />
            Habit Tracker
          </h2>
          <button
            onClick={() => setCreatingHabit(true)}
            className="flex items-center gap-1 text-sm text-[#9AAE8C] border border-[#9AAE8C] px-3 py-2 rounded-lg hover:bg-[#9AAE8C] hover:text-white transition"
          >
            <Plus size={14} /> Add Habit
          </button>
        </div>

        {creatingHabit && (
          <div className="bg-white border border-[#9AAE8C] rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#9AAE8C]">Create New Habit</h3>
              <button onClick={() => setCreatingHabit(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <AddHabitForm userId={user.uid} goals={goals} onSave={handleSaveHabit} onCancel={() => setCreatingHabit(false)} />
          </div>
        )}

        <div className="space-y-4">
          {habits.map((habit) => {
            const title = habit.title || habit.name || "Habit";
            const due = habit.dueToday;
            const done = habit.completedToday;
            return (
              <div
                key={habit.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition ${
                  due && !done ? "border-[#E4BFA1]" : "border-gray-100"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                          due ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {due ? "Due today" : "Scheduled"}
                      </span>
                      {habit.frequency && (
                        <span className="text-xs text-gray-500">
                          {typeof habit.frequency === "string"
                            ? habit.frequency
                            : habit.frequency?.type || "—"}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-semibold text-gray-800">{title}</h3>

                    {/* Streak + last 7 */}
                    <div className="mt-2 flex items-center gap-4">
                      <div className="text-xs text-orange-600 font-medium flex items-center gap-1">
                        🔥 {habit.streak} day streak
                      </div>
                      <div className="flex items-center gap-1">
                        {habit.last7?.map((isDone, idx) => (
                          <div
                            key={habit.last7Keys?.[idx] || idx}
                            title={habit.last7Keys?.[idx]}
                            className={`w-3 h-3 rounded ${
                              isDone ? "bg-green-500" : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] text-gray-400 hidden sm:flex gap-1">
                        {last7Labels.map((l) => (
                          <span key={l}>{l}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleHabitToday(habit)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        done
                          ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {done ? "Completed ✓" : "Mark done"}
                    </button>
                    <button className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1">
                      <Edit size={14} /> Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {habits.length === 0 && (
            <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6">
              No habits yet. Click <span className="font-medium">Add Habit</span> to create one.
            </div>
          )}
        </div>
      </div>
    );
  };

  const EisenhowerQuadrant = ({ title, quadrant, color, icon: Icon, tasks }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-4 h-[300px] flex flex-col`}>
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <Icon size={16} className="text-white" />
        <h4 className="font-semibold text-white text-sm">{title}</h4>
        <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-white/95 rounded-lg p-3 text-xs transition-all hover:bg-white ${
              task.status === "completed" ? "opacity-70" : ""
            }`}
          >
            <div className="flex items-start gap-2">
              <button
                onClick={() => toggleTaskStatus(task.id, task.status)}
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  task.status === "completed" ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"
                }`}
              >
                {task.status === "completed" && <CheckCircle size={10} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div
                  className={`font-medium leading-tight ${
                    task.status === "completed" ? "line-through text-gray-500" : "text-gray-800"
                  }`}
                >
                  {task.title}
                </div>

                {(task.goalId || task.habitId) && (
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {task.goalId && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {getLinkedGoal(task.goalId)?.title?.substring(0, 12) || "Goal"}
                        {getLinkedGoal(task.goalId)?.title?.length > 12 ? "..." : ""}
                      </span>
                    )}
                    {task.habitId && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {getLinkedHabit(task.habitId)?.title?.substring(0, 12) ||
                          getLinkedHabit(task.habitId)?.name?.substring(0, 12) ||
                          "Habit"}
                        {(getLinkedHabit(task.habitId)?.title?.length ||
                          getLinkedHabit(task.habitId)?.name?.length) > 12
                          ? "..."
                          : ""}
                      </span>
                    )}
                  </div>
                )}

                {task.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock size={8} />
                    {/* Support Firestore Timestamp or ISO string */}
                    {task.dueDate?.seconds
                      ? new Date(task.dueDate.seconds * 1000).toLocaleDateString()
                      : new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ---------------- tabs config ---------------- */

  const tabConfig = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "stats", label: "Stats & Insights", icon: TrendingUp },
    { id: "ai-plan", label: "AI Plan", icon: Brain },
  ];

  /* ---------------- render ---------------- */

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#1B5E57]">
                {getTimeBasedGreeting()}, {userName || "Friend"} 👋
              </h1>
              <p className="text-[#9AAE8C] mt-1">{getMotivationalInsight()}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#3E3E3E]">View:</span>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="border border-[#D5E3D1] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent"
                >
                  {timeframeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Compact mood bar */}
        <div className="mb-6">
          <CompactMoodBar />
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex items-center border-b border-gray-200">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm transition-all ${
                  activeTab === tab.id
                    ? "text-[#1B5E57] border-b-2 border-[#1B5E57] bg-[#1B5E57]/5"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-10">
            {/* Goals – full width */}
            <GoalCards />

            {/* Habits – full width */}
            <EnhancedHabitTracker />

            {/* Today's Tasks preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#E4BFA1] flex items-center gap-2">
                  <CheckCircle size={20} />
                  Today’s Tasks
                </h2>
                <button
                  onClick={() => setCreatingTask(true)}
                  className="flex items-center gap-1 text-sm text-[#E4BFA1] border border-[#E4BFA1] px-3 py-2 rounded-lg hover:bg-[#E4BFA1] hover:text-white transition"
                >
                  <Plus size={14} /> Add Task
                </button>
              </div>

              {creatingTask && (
                <div className="bg-white border border-[#E4BFA1] rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#E4BFA1]">Create New Task</h3>
                    <button onClick={() => setCreatingTask(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                      <X size={18} className="text-gray-400" />
                    </button>
                  </div>
                  <TaskCreationForm
                    userId={user.uid}
                    goals={goals}
                    habits={habits}
                    onTaskCreated={fetchTasks}
                    onCancel={() => setCreatingTask(false)}
                  />
                </div>
              )}

              {/* Filtered preview: due today or overdue & pending */}
              <div className="bg-white/80 border border-gray-200 rounded-xl p-4">
                {tasks
                  .filter((t) => t.status !== "completed")
                  .filter((t) => {
                    if (!t.dueDate) return true;
                    const due =
                      t.dueDate?.seconds
                        ? new Date(t.dueDate.seconds * 1000)
                        : new Date(t.dueDate);
                    const now = new Date();
                    // due today or overdue
                    return due <= new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                  })
                  .slice(0, 5)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 mb-2 last:mb-0"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTaskStatus(task.id, task.status)}
                          className={`mt-1 w-5 h-5 rounded border flex items-center justify-center ${
                            task.status === "completed" ? "bg-green-500 border-green-500" : "border-gray-300"
                          }`}
                        >
                          {task.status === "completed" && <CheckCircle size={12} className="text-white" />}
                        </button>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{task.title}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                            {task.goalId && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {getLinkedGoal(task.goalId)?.title || "Goal"}
                              </span>
                            )}
                            {task.habitId && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {getLinkedHabit(task.habitId)?.title ||
                                  getLinkedHabit(task.habitId)?.name ||
                                  "Habit"}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="inline-flex items-center gap-1">
                                <Clock size={10} />
                                {task.dueDate?.seconds
                                  ? new Date(task.dueDate.seconds * 1000).toLocaleDateString()
                                  : new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                        onClick={() => navigate("/tasks")}
                      >
                        Open
                      </button>
                    </div>
                  ))}

                {tasks.filter((t) => t.status !== "completed").length === 0 && (
                  <div className="text-sm text-gray-500">No open tasks. Nicely done! 🎉</div>
                )}
              </div>
            </div>

            {/* Task Filters + Eisenhower Matrix */}
            <div className="space-y-6">
              {/* Task Filters */}
              <div className="bg-gradient-to-r from-white/80 via-white/90 to-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  <h3 className="text-sm font-medium text-gray-700">Filter Tasks</h3>
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[140px]">
                    <div className="relative">
                      <select
                        value={taskFilter.goalId}
                        onChange={(e) =>
                          setTaskFilter((prev) => ({
                            ...prev,
                            goalId: e.target.value,
                          }))
                        }
                        className="w-full bg-white/70 border-0 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200/50 focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all appearance-none cursor-pointer hover:shadow-md"
                      >
                        <option value="all">🎯 All Goals</option>
                        <option value="ungrouped">📋 Ungrouped</option>
                        {goals.map((g) => (
                          <option key={g.id} value={g.id}>
                            🎪 {g.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="flex-1 min-w-[120px]">
                    <div className="relative">
                      <select
                        value={taskFilter.status}
                        onChange={(e) =>
                          setTaskFilter((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        className="w-full bg-white/70 border-0 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200/50 focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-all appearance-none cursor-pointer hover:shadow-md"
                      >
                        <option value="open">⏳ Open Tasks</option>
                        <option value="completed">✅ Completed</option>
                        <option value="all">📊 All Tasks</option>
                      </select>
                      <ChevronDown
                        size={16}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 ml-auto">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span>
                        Showing:{" "}
                        {
                          tasks.filter((t) => {
                            const matchesGoal =
                              taskFilter.goalId === "all"
                                ? true
                                : taskFilter.goalId === "ungrouped"
                                ? !t.goalId
                                : t.goalId === taskFilter.goalId;
                            const matchesStatus =
                              taskFilter.status === "all"
                                ? true
                                : t.status === (taskFilter.status === "open" ? "pending" : "completed");
                            return matchesGoal && matchesStatus;
                          }).length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Eisenhower Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EisenhowerQuadrant
                  title="Urgent & Important"
                  quadrant="urgent-important"
                  color="from-red-500 to-red-600"
                  icon={AlertTriangle}
                  tasks={getTasksByQuadrant("urgent-important")}
                />
                <EisenhowerQuadrant
                  title="Important, Not Urgent"
                  quadrant="important-not-urgent"
                  color="from-blue-500 to-blue-600"
                  icon={Target}
                  tasks={getTasksByQuadrant("important-not-urgent")}
                />
                <EisenhowerQuadrant
                  title="Urgent, Not Important"
                  quadrant="urgent-not-important"
                  color="from-yellow-500 to-yellow-600"
                  icon={Zap}
                  tasks={getTasksByQuadrant("urgent-not-important")}
                />
                <EisenhowerQuadrant
                  title="Neither Urgent nor Important"
                  quadrant="neither"
                  color="from-gray-500 to-gray-600"
                  icon={Archive}
                  tasks={getTasksByQuadrant("neither")}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats & Insights Tab */}
        {activeTab === "stats" && (
          <div className="space-y-8">
            {/* Streak Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-[#1B5E57] to-[#2A7B6B] text-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{streakData.currentStreak}</div>
                    <div className="text-sm opacity-80">Habits Completed Today</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#B8CDBA] to-[#A8BDA9] text-[#1B5E57] p-6 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/30 rounded-xl flex items-center justify-center">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{streakData.completionRate}%</div>
                    <div className="text-sm opacity-80">Completion Rate (Today)</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white p-6 rounded-2xl shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Star size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{streakData.longestStreak}</div>
                    <div className="text-sm opacity-80">Best Streak (Any Habit)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Progress Ring */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Weekly Progress</h3>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="text-[#1B5E57]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${streakData.completionRate}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-2xl font-bold text-[#1B5E57]">
                        {streakData.completionRate}%
                      </span>
                      <div className="text-xs text-gray-500">Complete</div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-center text-gray-600 mt-4">
                {Math.floor((streakData.completionRate * habits.length) / 100)} of {habits.length} habits completed today
              </p>
            </div>
          </div>
        )}

        {/* AI Plan Tab */}
        {activeTab === "ai-plan" && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border border-purple-200/50 rounded-2xl p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Brain size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">Your AI Daily Plan</h2>
                  <p className="text-gray-600">Personalized recommendations based on your goals and habits</p>
                </div>
              </div>

              {isLoadingPlan ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-sm">
                    {isPlanExpanded ? (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{dailyPlan}</div>
                      </div>
                    ) : (
                      <div className="text-gray-700 leading-relaxed">{planPreview}</div>
                    )}

                    {dailyPlan.length > 100 && (
                      <button
                        onClick={() => setIsPlanExpanded(!isPlanExpanded)}
                        className="mt-4 text-purple-600 text-sm font-medium hover:text-purple-700 transition-colors"
                      >
                        {isPlanExpanded ? "Show Less" : "Read Full Plan"}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">Customize your plan:</label>
                      <select
                        value={modifier}
                        onChange={(e) => setModifier(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                      >
                        <option value="">-- Select a modifier --</option>
                        {modifiers.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={regeneratePlan}
                        disabled={!modifier || isLoadingPlan}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {isLoadingPlan ? "Generating..." : "Regenerate Plan"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Plan History (example UI) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Plans</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Today's Morning Focus</div>
                      <div className="text-xs text-gray-500">Generated 2 hours ago</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Yesterday's Gentle Routine</div>
                      <div className="text-xs text-gray-500">Generated yesterday</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar size={16} className="text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Energetic Weekend Plan</div>
                      <div className="text-xs text-gray-500">Generated 2 days ago</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}























