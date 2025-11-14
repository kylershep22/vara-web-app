// src/pages/Dashboard.jsx

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { db, storage } from "../firebase"; // ⚠️ Ensure you export `storage` in ../firebase (getStorage(app))
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
  onSnapshot
} from "firebase/firestore";
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import SidebarLayout from "../components/layout/SidebarLayout";
import AddHabitForm from "../components/habits/AddHabitForm";
import GoalCreationForm from "../components/goals/GoalCreationForm";
import TaskCreationForm from "../components/tasks/TaskCreationForm";
import { useHabits } from '../hooks/useHabits';
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
  Calendar as CalendarIcon,
  Brain,
  Edit,
  Star,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
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
  const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const todayShort = shortDays[new Date().getDay()];
  const type =
    habit?.type ||
    habit?.frequency?.type ||
    (habit?.frequency === "daily" ? "daily" : habit?.frequency);
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

const toDateOrNull = (v) => {
  if (!v) return null;
  if (v?.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d) ? null : d;
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

// --- goals: progress helpers (avoid NaN and handle binary/milestone) ---
const safeNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Returns { progressDisplay, targetDisplay, pct }
 * - If goal has a numeric target>0, use progress/target
 * - Otherwise treat as binary/milestone: target=1, progress=0|1
 *   (uses goal.progress truthiness or explicit boolean fields if you add them later)
 */
const getGoalProgressParts = (goal) => {
  const isBinaryLike =
    (goal?.targetType && ["milestone", "binary", "boolean"].includes(String(goal.targetType).toLowerCase())) ||
    !Number.isFinite(Number(goal?.target)) ||
    Number(goal?.target) <= 0;

  if (isBinaryLike) {
    const progressed = !!goal?.progress; // treat any truthy as completed
    const progressNum = progressed ? 1 : 0;
    const targetNum = 1;
    return {
      progressDisplay: progressNum,
      targetDisplay: targetNum,
      pct: progressNum * 100
    };
  }

  const progressNum = safeNum(goal?.progress, 0);
  const targetNum = Math.max(1, safeNum(goal?.target, 1)); // don’t allow 0 to avoid NaN/Infinity
  return {
    progressDisplay: progressNum,
    targetDisplay: targetNum,
    pct: Math.min(100, (progressNum / targetNum) * 100)
  };
};

// --- goals: type helper ---
const isBinaryGoal = (goal) => {
  const tt = String(goal?.targetType || "").toLowerCase();
  const nonNumericTarget =
    !Number.isFinite(Number(goal?.target)) || Number(goal?.target) <= 0;
  return ["milestone", "binary", "boolean"].includes(tt) || nonNumericTarget;
};

/* ------------------------------ calendar utils ------------------------------ */
const startOfWeek = (date) => {
  const d = new Date(date);
  const diff = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = (date) => {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfMonth = (date) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  d.setHours(23, 59, 59, 999);
  return d;
};
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/* ========================================================================== */

export default function Dashboard() {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [userName, setUserName] = useState("");
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dailyPlan, setDailyPlan] = useState("");
  const [planPreview, setPlanPreview] = useState("");
  const [modifier, setModifier] = useState("");
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // compact mood tracker
  const [mood, setMood] = useState("");
  const [moodNote, setMoodNote] = useState("");
  const [showMoodNote, setShowMoodNote] = useState(false);

   // Moments of Joy
  const [joyText, setJoyText] = useState("");
  const [joyFile, setJoyFile] = useState(null);
  const [joyUploading, setJoyUploading] = useState(false);
  const [joyMoments, setJoyMoments] = useState([]);

  // Habit Edit Modal
  const [showHabitEdit, setShowHabitEdit] = useState(false);
  const [habitEditing, setHabitEditing] = useState(null); // entire habit object
  const [habitEditValues, setHabitEditValues] = useState({ title: "", notes: "", frequency: "" });

  // View/timeframe + stats
  const [timeframe, setTimeframe] = useState("weekly"); // daily | weekly | monthly | yearly
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
  const [goalView, setGoalView] = useState("active"); // 'active' | 'completed' | 'all'

  // 🔁 Real-time habits/completions shared across pages
  const { habits, habitCompletions, logHabitToday } = useHabits(user?.uid);

  // For quick “already logged today?” checks on the dashboard
  const today = todayYMD();
  const todaysCompletionsSet = useMemo(() => {
    const s = new Set();
    for (const c of habitCompletions) {
      if (c.dateISO === today) s.add(c.habitId);
    }
    return s;
  }, [habitCompletions, today]);

  // ✅ Unified helper — checks if this habit has a completion logged today
  const isLoggedToday = useCallback(
    (habitId) => {
      if (!habitId) return false;
      return habitCompletions.some(
        (c) => c.habitId === habitId && c.dateISO === today
      );
    },
    [habitCompletions, today]
  );

  // Task filters
  const [taskFilter, setTaskFilter] = useState({
    goalId: "all",
    status: "open",
  });

  // ---------- Moments of Joy: handlers ----------
const handleJoyFileChange = (e) => {
  const f = e.target.files?.[0] || null;
  setJoyFile(f);
};

const saveJoyMoment = async () => {
  if (!user?.uid) return;
  if (!joyText && !joyFile) return;

  try {
    setJoyUploading(true);
    let photoURL = null;

    if (joyFile) {
      // Upload to: joyMoments/{uid}/{timestamp}-{filename}
      const key = `joyMoments/${user.uid}/${Date.now()}-${joyFile.name}`;
      const fileRef = storageRef(storage, key);
      await uploadBytes(fileRef, joyFile);
      photoURL = await getDownloadURL(fileRef);
    }

    await addDoc(collection(db, "joyMoments"), {
      userId: user.uid,
      text: (joyText || "").trim(),
      photoURL,
      createdAt: serverTimestamp(),
    });

    setJoyText("");
    setJoyFile(null);

    // Reuse the existing fetchJoyMoments you kept further down the file
    if (typeof fetchJoyMoments === "function") {
      await fetchJoyMoments();
    }
  } catch (err) {
    console.error("Error saving joy moment:", err);
  } finally {
    setJoyUploading(false);
  }
};

// ---------- Habit Edit Modal: handlers ----------
const openHabitEdit = (habit) => {
  setHabitEditing(habit);
  setHabitEditValues({
    title: habit.title || habit.name || "",
    notes: habit.notes || "",
    // frequency can be string or object in your schema; store a best‑effort string for quick edit
    frequency:
      typeof habit.frequency === "string"
        ? habit.frequency
        : habit.frequency?.type || (habit.type || ""),
  });
  setShowHabitEdit(true);
};

const closeHabitEdit = () => {
  setShowHabitEdit(false);
  setHabitEditing(null);
};

const saveHabitEdits = async () => {
  if (!habitEditing?.id) return;
  try {
    const update = {
      title: habitEditValues.title,
      notes: habitEditValues.notes,
    };

    // If your schema uses frequency as string OR object
    if (habitEditValues.frequency) {
      // keep minimal mutation to avoid breaking existing shape
      if (typeof habitEditing.frequency === "object") {
        update.frequency = { ...(habitEditing.frequency || {}), type: habitEditValues.frequency };
      } else {
        update.frequency = habitEditValues.frequency;
      }
    }

    await updateDoc(doc(db, "habits", habitEditing.id), cleanForFirestore(update));

    closeHabitEdit();
  } catch (err) {
    console.error("Failed to save habit edits:", err);
  }
};

// Goal Modal state
const [showGoalModal, setShowGoalModal] = useState(false);
const [goalForModal, setGoalForModal] = useState(null);
const [goalModalMode, setGoalModalMode] = useState("view"); // 'view' | 'edit'

// Simple edit fields for goals
const [goalEditValues, setGoalEditValues] = useState({
  title: "",
  description: "",
  unit: "",
  targetType: "",
  progress: 0,
  target: 0,
});

// open/close + edit helpers
const openGoalModal = (goal, mode = "view") => {
  setGoalForModal(goal);
  setGoalModalMode(mode);

  // preload edit values
  setGoalEditValues({
    title: goal?.title || "",
    description: goal?.description || "",
    unit: goal?.unit || "",
    targetType: goal?.targetType || "",
    progress: safeNum(goal?.progress, 0),
    target: safeNum(goal?.target, 0),
  });

  setShowGoalModal(true);
};
const closeGoalModal = () => {
  setShowGoalModal(false);
  setGoalForModal(null);
};

const saveGoalEdits = async () => {
  if (!goalForModal?.id) return;
  try {
    await updateDoc(doc(db, "goals", goalForModal.id), cleanForFirestore({
      title: goalEditValues.title,
      description: goalEditValues.description,
      unit: goalEditValues.unit || null,
      targetType: goalEditValues.targetType || null,
      progress: safeNum(goalEditValues.progress, 0),
      target: safeNum(goalEditValues.target, 0),
      updatedAt: serverTimestamp(),
    }));
    await fetchGoals();
    // keep modal open but switch to "view" mode to show updated values
    setGoalForModal((g) => g ? { ...g, ...goalEditValues } : g);
    setGoalModalMode("view");
  } catch (e) {
    console.error("Failed to save goal edits:", e);
  }
};

  // Stats calendar filters
  const [calTypeFilter, setCalTypeFilter] = useState("all"); // habits | goals | tasks | all
  const [calGoalFilter, setCalGoalFilter] = useState("all");

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

  const fetchUserData = useCallback(async () => {
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      setUserName(userDoc.exists() ? userDoc.data().name || user.displayName : user.displayName || "User");
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "goals"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      setGoals(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching goals:", err);
    }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(collection(db, "tasks"), where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      const taskData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTasks(taskData);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  }, [user]);

  const fetchJoyMoments = useCallback(async () => {
    if (!user) return;
    try {
      const qy = query(
        collection(db, "joyMoments"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const snap = await getDocs(qy);
      setJoyMoments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("Error fetching joy moments:", e);
    }
  }, [user]);

  useEffect(() => {
    if (user && isAuthReady) {
      fetchUserData();
      fetchGoals();
      fetchTasks();
      fetchJoyMoments();
      fetchDailyPlan();
    }
  }, [user, isAuthReady, fetchUserData, fetchGoals, fetchTasks, fetchJoyMoments, fetchDailyPlan, timeframe]);

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

  const handleSaveGoal = async (dataFromForm) => {
    if (!user?.uid) return;
    try {
      const docBody = cleanForFirestore({
        userId: user.uid,
        title: (dataFromForm.goalTitle || "").trim(),
        description: (dataFromForm.goalStatement || "").trim(),
        category: dataFromForm.focus,
        targetType: dataFromForm.targetType,
        unit: dataFromForm.measurementUnit,
        target: Number(dataFromForm.targetAmount) || 0,
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
        progress: 0,
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
        active: habitData.active !== false,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, "habits"), cleanForFirestore(mappedHabit));
      setCreatingHabit(false);
    } catch (error) {
      console.error("Error saving habit:", error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    const ok = window.confirm("Delete this goal? This cannot be undone.");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "goals", goalId));
      await fetchGoals();
      if (goalForModal?.id === goalId) closeGoalModal();
    } catch (e) {
      console.error("Failed to delete goal:", e);
    }
  };

  /* ---------------- Goals: progress & status updaters ---------------- */
  // relies on helpers defined OUTSIDE the component:
  //   getGoalProgressParts(goal) and isBinaryGoal(goal)
  const setGoalStatus = async (goalId, status) => {
    try {
      await updateDoc(doc(db, "goals", goalId), {
        status,
        updatedAt: serverTimestamp(),
      });
      await fetchGoals();
    } catch (e) {
      console.error("Failed to setGoalStatus:", e);
    }
  };

  const setGoalProgress = async (goal, newValRaw) => {
    if (!goal?.id) return;

    const { targetDisplay } = getGoalProgressParts(goal);
    const targetNum = Number(targetDisplay) || 0;

    // clamp numeric input
    const parsed = Number(newValRaw);
    const newVal = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

    const next = {
      progress: newVal,
      updatedAt: serverTimestamp(),
    };

    if (isBinaryGoal(goal)) {
      // binary/milestone -> 0 or 1, and status follows progress
      next.progress = newVal > 0 ? 1 : 0;
      next.status = next.progress === 1 ? "completed" : "active";
    } else if (targetNum > 0) {
      // numeric: auto-complete / reopen by comparing to target
      if (newVal >= targetNum) next.status = "completed";
      if ((goal.status || "active") === "completed" && newVal < targetNum) {
        next.status = "active";
      }
    }

    try {
      await updateDoc(doc(db, "goals", goal.id), next);
      await fetchGoals();
    } catch (e) {
      console.error("Failed to setGoalProgress:", e);
    }
  };

  const incGoalProgress = async (goal, delta) => {
    const current = Number(goal?.progress) || 0;
    await setGoalProgress(goal, current + delta);
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

  /* ---------------- Moments of Joy ---------------- */
  const handleAddJoyMoment = async (e) => {
    e.preventDefault();
    if (!user?.uid || (!joyText && !joyFile)) return;
    try {
      setJoyUploading(true);
      let photoUrl = null;
      if (joyFile) {
        // path: joyMoments/{uid}/{timestamp}-{filename}
        const filePath = `joyMoments/${user.uid}/${Date.now()}-${joyFile.name}`;
        const sRef = storageRef(storage, filePath);
        await uploadBytes(sRef, joyFile);
        photoUrl = await getDownloadURL(sRef);
      }

      await addDoc(collection(db, "joyMoments"), {
        userId: user.uid,
        text: joyText || "",
        photoUrl: photoUrl || null,
        createdAt: serverTimestamp(),
      });

      setJoyText("");
      setJoyFile(null);
      await fetchJoyMoments();
    } catch (err) {
      console.error("Failed to add joy moment:", err);
    } finally {
      setJoyUploading(false);
    }
  };

  /* ---------------- derived data & sorting ---------------- */

  const goalsByStatus = useMemo(() => {
    const withKey = goals.map((g) => {
      const end = toDateOrNull(g?.timeframe?.endDate);
      const created = toDateOrNull(g?.createdAt) || new Date(8640000000000000);
      return { ...g, _endOrCreate: end || created };
    });

    const sortFn = (a, b) => a._endOrCreate - b._endOrCreate;

    const active = withKey.filter((g) => (g.status || "active") === "active").sort(sortFn);
    const completed = withKey.filter((g) => (g.status || "") === "completed").sort(sortFn);
    const all = [...withKey].sort(sortFn);

    return {
      active,
      completed,
      all,
      counts: { active: active.length, completed: completed.length, all: all.length },
    };
  }, [goals]);

  // The list to render based on the segmented control (goalView = 'active' | 'completed' | 'all')
  const visibleGoals = useMemo(() => goalsByStatus[goalView] || [], [goalsByStatus, goalView]);

    const sortedHabitsTop4 = useMemo(() => {
      const getDueKey = (h) => {
        // Prefer nextDueDate; else dueToday; else createdAt
        const next = toDateOrNull(h?.nextDueDate);
        if (next) return next.getTime();
        if (h.dueToday) return Date.now() - 1; // bubble to top
        const created = toDateOrNull(h?.createdAt) || new Date();
        return created.getTime();
      };
      return [...habits].sort((a, b) => getDueKey(a) - getDueKey(b)).slice(0, 4);
    }, [habits]);

  const topTasksByDue = useMemo(() => {
    const sortable = tasks
      .filter((t) => t.status !== "completed")
      .map((t) => {
        const d = toDateOrNull(t?.dueDate) || new Date(8640000000000);
        return { ...t, _due: d.getTime() };
      })
      .sort((a, b) => a._due - b._due);
    return sortable.slice(0, 4);
  }, [tasks]);

/* ---------------- UI pieces ---------------- */

/** Compact, type-aware inline controls */
const InlineGoalControls = ({ goal }) => {
  const { progressDisplay, targetDisplay, pct } = getGoalProgressParts(goal);
  const binary = isBinaryGoal(goal);
  const isDone = binary ? !!progressDisplay : pct >= 100;

  if (binary) {
    return (
      <div className="mt-3" data-no-nav>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">
            {isDone ? "Completed" : "Mark complete"}
          </span>
          <button
            onClick={() => setGoalProgress(goal, isDone ? 0 : 1)}
            className={`relative inline-flex h-6 w-11 rounded-full border transition ${
              isDone
                ? "bg-green-600 border-green-600"
                : "bg-gray-300 border-gray-300"
            }`}
            aria-label={isDone ? "Mark as not done" : "Mark complete"}
            data-no-nav
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transform transition ${
                isDone ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
      </div>
    );
  }

  // Numeric goals
  return (
    <div className="mt-3 space-y-2" data-no-nav>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => incGoalProgress(goal, -1)}
            className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-50 grid place-items-center"
            title="Decrease"
            aria-label="Decrease"
          >
            −
          </button>
          <div className="px-3 h-8 rounded-lg bg-gray-50 border border-gray-200 text-sm font-medium flex items-center">
            {progressDisplay} / {targetDisplay} {goal.unit || ""}
          </div>
          <button
            onClick={() => incGoalProgress(goal, +1)}
            className="h-8 w-8 rounded-lg border border-gray-300 hover:bg-gray-50 grid place-items-center"
            title="Increase"
            aria-label="Increase"
          >
            +
          </button>
        </div>

        {pct < 100 ? (
          <button
            onClick={() => setGoalProgress(goal, targetDisplay)}
            className="px-3 h-8 rounded-lg border border-green-600 text-green-700 text-sm hover:bg-green-50"
            title="Mark as completed"
          >
            Complete
          </button>
        ) : (
          <button
            onClick={() => setGoalStatus(goal.id, "active")}
            className="px-3 h-8 rounded-lg border border-amber-600 text-amber-700 text-sm hover:bg-amber-50"
            title="Reopen"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
};

/** Minimal, uncluttered goal card */
const GoalCard = ({ goal }) => {
  const { progressDisplay, targetDisplay, pct } = getGoalProgressParts(goal);
  const endDate = toDateOrNull(goal?.timeframe?.endDate);
  const binary = isBinaryGoal(goal);
  const isDone = binary ? !!progressDisplay : pct >= 100;

  return (
    <div className="min-w-[300px] md:min-w-[340px] snap-start bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => openGoalModal(goal, "view")}
          className="text-left min-w-0"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <h3 className="font-semibold text-gray-900 truncate">
              {goal.title || "Untitled Goal"}
            </h3>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            {goal.category && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full">
                {goal.category}
              </span>
            )}
            {(goal.unit || goal.targetType) && (
              <span>
                {goal.targetType || "Target"}
                {goal.unit ? ` • ${goal.unit}` : ""}
              </span>
            )}
            {endDate && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {endDate.toLocaleDateString()}
              </span>
            )}
          </div>
        </button>

        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
            isDone
              ? "bg-green-100 text-green-700"
              : "bg-[#B8CDBA]/20 text-[#1B5E57]"
          }`}
          title="Progress"
        >
          {Math.round(pct)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            style={{ width: `${pct}%` }}
            className={`h-full ${
              isDone ? "bg-green-600" : "bg-[#1B5E57]"
            } transition-all`}
          />
        </div>

        {/* Compact controls */}
        <InlineGoalControls goal={goal} />
      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={() => openGoalModal(goal, "edit")}
          className="px-2.5 py-1.5 rounded-md text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1"
          data-no-nav
          title="Edit"
        >
          <Edit size={14} />
          <span className="hidden sm:inline">Edit</span>
        </button>
        <button
          onClick={() => handleDeleteGoal(goal.id)}
          className="px-2.5 py-1.5 rounded-md text-sm text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-600"
          data-no-nav
          title="Delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// Goals row: horizontal scroll
const GoalRow = () => {
  const scrollerRef = useRef(null);
  const scrollByAmount = (delta) => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1B5E57] flex items-center gap-2">
          <Target size={20} />
          Goals
        </h2>
        <div className="flex items-center gap-2">
          {/* Segmented control for Active / Completed / All */}
          <div className="bg-white border border-[#B8CDBA] rounded-lg overflow-hidden text-sm">
            {["active", "completed", "all"].map((view, idx) => {
              const active = goalView === view;
              const label =
                view === "active"
                  ? `Active (${goalsByStatus.counts.active})`
                  : view === "completed"
                  ? `Completed (${goalsByStatus.counts.completed})`
                  : `All (${goalsByStatus.counts.all})`;
              return (
                <button
                  key={view}
                  onClick={() => setGoalView(view)}
                  className={`px-3 py-1.5 ${
                    active
                      ? "bg-[#B8CDBA] text-white"
                      : "text-[#1B5E57] hover:bg-[#B8CDBA]/20"
                  } ${idx > 0 ? "border-l border-[#B8CDBA]" : ""}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCreatingGoal(true)}
            className="flex items-center gap-1 text-sm text-[#1B5E57] border border-[#B8CDBA] px-3 py-2 rounded-lg hover:bg-[#B8CDBA] hover:text-white transition"
          >
            <Plus size={14} /> Add Goal
          </button>
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scrollByAmount(-360)}
              className="p-2 border rounded-lg hover:bg-gray-50"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollByAmount(360)}
              className="p-2 border rounded-lg hover:bg-gray-50"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Goal creation form (unchanged) */}
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
            onSave={handleSaveGoal}
            onCancel={() => setCreatingGoal(false)}
          />
        </div>
      )}

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
      >
        {visibleGoals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}

        {visibleGoals.length === 0 && (
          <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl p-6">
            {goalView === "completed"
              ? "No completed goals yet."
              : "You haven't created any goals yet. Click "}
            {goalView !== "completed" && (
              <span className="font-medium">Add Goal</span>
            )}
            {goalView !== "completed" && " to get started."}
          </div>
        )}
      </div>
    </div>
  );
};

  const EnhancedHabitTracker = () => {
    const last7Labels = getPastNDates(7).map((d) => d.slice(5)); // 'MM-DD'

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#9AAE8C] flex items-center gap-2">
            <Sparkles size={20} />
            Habit Tracker
          </h2>
          <button
            type="button"
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
              <button type="button" onClick={() => setCreatingHabit(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <AddHabitForm
              userId={user.uid}
              goals={goals}
              onSave={handleSaveHabit}
              onCancel={() => setCreatingHabit(false)}
            />
          </div>
        )}

        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {sortedHabitsTop4.map((habit) => {
            const title = habit.title || habit.name || "Habit";
            const due = habit.dueToday;
            const done = isLoggedToday(habit.id);

            return (
              <div
                key={habit.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition ${
                  due && !done ? "border-[#E4BFA1]" : "border-gray-100"
                }`}
                // Guard: if the click originated from a control that declares data-no-nav, do nothing
                onClick={(e) => {
                  const fromControl = e.target.closest("[data-no-nav]");
                  if (fromControl) return;
                  // If you WANT card-level nav, put it here; otherwise do nothing to avoid route errors.
                  // navigate(`/habits/${habit.id}`);
                }}
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
                          {typeof habit.frequency === "string" ? habit.frequency : habit.frequency?.type || "—"}
                        </span>
                      )}
                    </div>

                    {/* Title now opens the EDIT MODAL (no navigation) */}
                    <button
                      type="button"
                      data-no-nav
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openHabitEdit(habit);
                      }}
                      className="mt-1 font-semibold text-gray-800 text-left hover:underline"
                    >
                      {title}
                    </button>

                    {/* Streak + last 7 */}
                    <div className="mt-2 flex items-center gap-4">
                      <div className="text-xs text-orange-600 font-medium flex items-center gap-1">
                        🔥 {(habit.streak ?? 0)} day streak
                      </div>
                      <div className="flex items-center gap-1">
                        {(habit.last7 ?? []).map((isDone, idx) => (
                          <div
                            key={habit.last7Keys?.[idx] || idx}
                            title={habit.last7Keys?.[idx]}
                            className={`w-3 h-3 rounded ${isDone ? "bg-green-500" : "bg-gray-200"}`}
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
                      type="button"
                      data-no-nav
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        logHabitToday(habit);   // pass the full habit object
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                        done
                          ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {done ? "Completed ✓" : "Mark done"}
                    </button>

                    <button
                      type="button"
                      data-no-nav
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openHabitEdit(habit);
                      }}
                      className="px-3 py-2 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1"
                    >
                      <Edit size={14} /> Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {sortedHabitsTop4.length === 0 && (
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

  /* ---------------- Calendar renderer (Stats tab) ---------------- */

  const CalendarBlock = () => {
    const now = new Date();

    // Build date slots based on timeframe
    let slots = [];
    if (timeframe === "daily") {
      slots = [new Date(now)];
    } else if (timeframe === "weekly") {
      const start = startOfWeek(now);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        slots.push(d);
      }
    } else if (timeframe === "monthly") {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const cursor = new Date(start);
      while (cursor <= end) {
        slots.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      // yearly: show next 12 months as the first day of each month
      const start = new Date(now.getFullYear(), 0, 1);
      for (let m = 0; m < 12; m++) {
        slots.push(new Date(now.getFullYear(), m, 1));
      }
    }

    // Build events (simple)
    const goalEndEvents = goals
      .filter((g) => (calGoalFilter === "all" ? true : g.id === calGoalFilter))
      .map((g) => {
        const d = toDateOrNull(g?.timeframe?.endDate);
        return d
          ? {
              type: "goal",
              goalId: g.id,
              label: `Goal target: ${g.title || "Goal"}`,
              date: d,
            }
          : null;
      })
      .filter(Boolean);

    const taskDueEvents = tasks
      .filter((t) => (calGoalFilter === "all" ? true : t.goalId === calGoalFilter))
      .map((t) => {
        const d = toDateOrNull(t?.dueDate);
        return d
          ? {
              type: "task",
              goalId: t.goalId || null,
              label: `Task due: ${t.title}`,
              date: d,
              status: t.status,
            }
          : null;
      })
      .filter(Boolean);

    const habitEvents = habits.map((h) => {
      // Mark today's completion + last 7 completions as events
      const events = [];
      const today = new Date();
      const keys = h.last7Keys || [];
      keys.forEach((k, idx) => {
        const parts = k.split("-");
        if (parts.length === 3) {
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (h.last7[idx]) {
            events.push({
              type: "habit",
              goalId: h.goalId || null,
              label: `Habit ✓ ${h.title || h.name || "Habit"}`,
              date: d,
              status: "completed",
            });
          }
        }
      });
      // Also indicate due today
      if (h.dueToday) {
        events.push({
          type: "habit",
          goalId: h.goalId || null,
          label: `Habit due: ${h.title || h.name || "Habit"}`,
          date: today,
          status: h.completedToday ? "completed" : "due",
        });
      }
      return events;
    }).flat();

    let allEvents = [...goalEndEvents, ...taskDueEvents, ...habitEvents];

    // Type filter
    if (calTypeFilter !== "all") {
      allEvents = allEvents.filter((e) => e.type === calTypeFilter);
    }

    // Goal filter (already applied for goals/tasks above; also apply to habits)
    if (calGoalFilter !== "all") {
      allEvents = allEvents.filter((e) => (e.goalId ? e.goalId === calGoalFilter : false));
    }

    // Render by timeframe
    if (timeframe === "yearly") {
      // 12 columns (months)
      return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {slots.map((monthDate, i) => {
              const monthEvents = allEvents.filter(
                (e) => e.date.getMonth() === monthDate.getMonth() && e.date.getFullYear() === monthDate.getFullYear()
              );
              return (
                <div key={i} className="border rounded-xl p-3">
                  <div className="text-sm font-semibold text-gray-700 mb-2">
                    {monthDate.toLocaleString(undefined, { month: "long", year: "numeric" })}
                  </div>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {monthEvents.length === 0 && (
                      <div className="text-xs text-gray-400">No items</div>
                    )}
                    {monthEvents.map((e, idx) => (
                      <div key={idx} className="text-xs">
                        <span
                          className={`inline-block w-2 h-2 rounded-full mr-2 ${
                            e.type === "habit"
                              ? e.status === "completed"
                                ? "bg-green-500"
                                : "bg-amber-500"
                              : e.type === "task"
                              ? "bg-blue-500"
                              : "bg-purple-500"
                          }`}
                        />
                        {e.date.toLocaleDateString()}: {e.label}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // daily / weekly / monthly -> grid of days
    const columns =
      timeframe === "daily" ? 1 : timeframe === "weekly" ? 7 : 7;
    // For monthly, build 5–6 rows; for weekly, 1 row; for daily, 1 item.
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <div
          className={`grid gap-2`}
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          }}
        >
          {slots.map((d, idx) => {
            const dayEvents = allEvents.filter((e) => sameDay(e.date, d));
            return (
              <div key={idx} className="border rounded-xl p-2 min-h-[88px]">
                <div className="text-xs text-gray-500 mb-1">
                  {d.toLocaleDateString(undefined, {
                    month: timeframe === "weekly" ? "short" : "numeric",
                    day: "numeric",
                  })}
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {dayEvents.length === 0 && (
                    <div className="text-[11px] text-gray-300">—</div>
                  )}
                  {dayEvents.map((e, i2) => (
                    <div key={i2} className="text-[11px] leading-tight">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1 align-middle ${
                          e.type === "habit"
                            ? e.status === "completed"
                              ? "bg-green-500"
                              : "bg-amber-500"
                            : e.type === "task"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                        }`}
                      />
                      <span className="align-middle">{e.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

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

        {/* Mood (50%) + Moments of Joy (50%) */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <CompactMoodBar />
          <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-[#1B5E57]" />
                <h3 className="text-sm font-semibold text-[#1B5E57]">Moments of Joy</h3>
              </div>
            </div>
            <form onSubmit={handleAddJoyMoment} className="space-y-2">
              <textarea
                value={joyText}
                onChange={(e) => setJoyText(e.target.value)}
                placeholder="What brought you joy today?"
                rows={2}
                className="w-full text-sm p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setJoyFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
                <button
                  type="submit"
                  disabled={joyUploading || (!joyText && !joyFile)}
                  className="px-3 py-1.5 rounded-md bg-[#1B5E57] text-white text-xs hover:bg-[#174C46] disabled:opacity-50"
                >
                  {joyUploading ? "Saving..." : "Save Moment"}
                </button>
              </div>
            </form>

            {joyMoments.length > 0 && (
              <div className="mt-3 border-t pt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                {joyMoments.map((j) => (
                  <div key={j.id} className="text-xs">
                    <div className="text-gray-700">{j.text}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {j.photoUrl && (
                        <img
                          src={j.photoUrl}
                          alt="Joy"
                          className="w-14 h-14 object-cover rounded-md border"
                        />
                      )}
                      <span className="text-[11px] text-gray-400">
                        {j.createdAt?.seconds
                          ? new Date(j.createdAt.seconds * 1000).toLocaleString()
                          : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            {/* Goals – single row, 3-up horizontally scrollable */}
            <GoalRow />

            {/* Habits – top 4, vertical scroll if more */}
            <EnhancedHabitTracker />

            {/* Today's Tasks preview with "top 4 by due date" + vertical scroll */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#E4BFA1] flex items-center gap-2">
                  <CheckCircle size={20} />
                  Tasks
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

              <div className="bg-white/80 border border-gray-200 rounded-xl p-4 max-h-[360px] overflow-y-auto pr-1">
                {topTasksByDue.map((task) => (
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

                {topTasksByDue.length === 0 && (
                  <div className="text-sm text-gray-500">No open tasks. Nicely done! 🎉</div>
                )}
              </div>
            </div>

            {/* Task Filters + Eisenhower Matrix (unchanged) */}
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

            {/* Filters for Calendar */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className="text-[#1B5E57]" />
                  <span className="text-sm font-medium text-gray-700">Calendar Filters:</span>
                </div>
                <select
                  value={calTypeFilter}
                  onChange={(e) => setCalTypeFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="all">View All</option>
                  <option value="habits">Habits</option>
                  <option value="goals">Goals</option>
                  <option value="tasks">Tasks</option>
                </select>
                <select
                  value={calGoalFilter}
                  onChange={(e) => setCalGoalFilter(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="all">All Goals</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title || "Goal"}
                    </option>
                  ))}
                </select>
                <div className="text-xs text-gray-500 ml-auto">
                  Global view: <span className="font-medium">{timeframe}</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <CalendarBlock />
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

            {/* Plan History (placeholder UI) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Recent Plans</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <CalendarIcon size={16} className="text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-800">Today's Morning Focus</div>
                      <div className="text-xs text-gray-500">Generated recently</div>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ---------- Habit Edit Modal ---------- */}
        {showHabitEdit && (
           <div
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
             onClick={closeHabitEdit}
           >
             <div
               className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-5"
               onClick={(e) => e.stopPropagation()}
               data-no-nav
             >
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-lg font-semibold text-gray-800">
                   Edit Habit
                 </h3>
                 <button
                   type="button"
                   onClick={closeHabitEdit}
                   className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                 >
                   <X size={18} />
                 </button>
               </div>

               <div className="space-y-3">
                 <div>
                   <label className="text-xs font-medium text-gray-600">Title</label>
                   <input
                     type="text"
                     value={habitEditValues.title}
                     onChange={(e) =>
                       setHabitEditValues((v) => ({ ...v, title: e.target.value }))
                     }
                     className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                     placeholder="Habit name"
                   />
                 </div>

                 <div>
                   <label className="text-xs font-medium text-gray-600">Notes</label>
                   <textarea
                     rows={3}
                     value={habitEditValues.notes}
                     onChange={(e) =>
                       setHabitEditValues((v) => ({ ...v, notes: e.target.value }))
                     }
                     className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                     placeholder="Optional notes…"
                   />
                 </div>

                 <div>
                   <label className="text-xs font-medium text-gray-600">Frequency</label>
                   <input
                     type="text"
                     value={habitEditValues.frequency || ""}
                     onChange={(e) =>
                       setHabitEditValues((v) => ({ ...v, frequency: e.target.value }))
                     }
                     className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                     placeholder='e.g. "daily" or "weekly"'
                   />
                   {/* If you prefer a select, swap the input above for a <select> with your options */}
                 </div>
               </div>

               <div className="mt-5 flex items-center justify-end gap-2">
                 <button
                   type="button"
                   onClick={closeHabitEdit}
                   className="px-3 py-2 rounded-md text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                 >
                   Cancel
                 </button>
                 <button
                   type="button"
                   onClick={saveHabitEdits}
                   className="px-3 py-2 rounded-md text-sm bg-[#1B5E57] text-white hover:bg-[#174C46]"
                 >
                   Save
                  </button>
               </div>
             </div>
           </div>
         )}
         {/* ---------- Goal Modal ---------- */}
         {showGoalModal && goalForModal && (
           <div
             className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
             onClick={closeGoalModal}
           >
             <div
               className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-gray-200 p-5"
               onClick={(e) => e.stopPropagation()}
               data-no-nav
             >
               {/* Header */}
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-lg font-semibold text-gray-800">
                   {goalModalMode === "edit" ? "Edit Goal" : "Goal Details"}
                 </h3>
                 <div className="flex items-center gap-2">
                   {goalModalMode === "view" && (
                     <button
                       type="button"
                       onClick={() => setGoalModalMode("edit")}
                       className="px-3 py-1.5 rounded-md text-sm text-gray-700 border border-gray-200 hover:bg-gray-50 inline-flex items-center gap-1"
                     >
                       <Edit size={14} /> Edit
                     </button>
                   )}
                   <button
                     type="button"
                     onClick={closeGoalModal}
                     className="p-1 rounded-lg hover:bg-gray-100 text-gray-500"
                     aria-label="Close"
                   >
                     <X size={18} />
                   </button>
                 </div>
               </div>

               {/* Body */}
               {goalModalMode === "view" ? (
                 <div className="space-y-3">
                   <div>
                     <div className="text-sm text-gray-500">Title</div>
                     <div className="text-base font-medium">
                       {goalForModal.title || "Untitled Goal"}
                     </div>
                   </div>

                   {goalForModal.description && (
                     <div>
                       <div className="text-sm text-gray-500">Description</div>
                       <div className="text-sm text-gray-700 whitespace-pre-wrap">
                         {goalForModal.description}
                       </div>
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <div className="text-sm text-gray-500">Category</div>
                       <div className="text-sm text-gray-800">{goalForModal.category || "—"}</div>
                     </div>
                     <div>
                       <div className="text-sm text-gray-500">Target Type</div>
                       <div className="text-sm text-gray-800">{goalForModal.targetType || "—"}</div>
                     </div>
                     <div>
                       <div className="text-sm text-gray-500">Unit</div>
                       <div className="text-sm text-gray-800">{goalForModal.unit || "—"}</div>
                     </div>
                     <div>
                       <div className="text-sm text-gray-500">Timeframe</div>
                       <div className="text-sm text-gray-800">
                         {(goalForModal?.timeframe?.startDate || "—")} → {(goalForModal?.timeframe?.endDate || "—")}
                       </div>
                     </div>
                   </div>

                   {/* Progress */}
                   <div className="pt-2">
                     {(() => {
                       const { progressDisplay, targetDisplay, pct } = getGoalProgressParts(goalForModal);
                       return (
                         <>
                           <div className="flex items-center justify-between">
                             <div className="text-sm text-gray-700 font-medium">
                               Progress: {progressDisplay} / {targetDisplay} {goalForModal.unit || ""}
                             </div>
                             <div className="text-sm text-gray-500">{Math.round(pct)}%</div>
                           </div>
                           <div className="w-full bg-[#D5E3D1] rounded-full h-2 mt-2">
                             <div
                               className="bg-[#1B5E57] h-2 rounded-full transition-all duration-300"
                               style={{ width: `${pct}%` }}
                             />
                           </div>
                         </>
                       );
                     })()}
                   </div>
                 </div>
               ) : (
                 // --- Edit mode ---
                 <div className="space-y-3">
                   <div>
                     <label className="text-xs font-medium text-gray-600">Title</label>
                     <input
                       type="text"
                       value={goalEditValues.title}
                       onChange={(e) => setGoalEditValues((v) => ({ ...v, title: e.target.value }))}
                       className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                       placeholder="Goal title"
                     />
                   </div>

                   <div>
                     <label className="text-xs font-medium text-gray-600">Description</label>
                     <textarea
                       rows={3}
                       value={goalEditValues.description}
                       onChange={(e) => setGoalEditValues((v) => ({ ...v, description: e.target.value }))}
                       className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                       placeholder="What does success look like?"
                     />
                   </div>

                   <div className="grid grid-cols-2 gap-3">
                     <div>
                       <label className="text-xs font-medium text-gray-600">Target Type</label>
                       <input
                         type="text"
                         value={goalEditValues.targetType}
                         onChange={(e) => setGoalEditValues((v) => ({ ...v, targetType: e.target.value }))}
                         className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                         placeholder='e.g. "milestone", "binary", "numeric"'
                       />
                     </div>
                     <div>
                       <label className="text-xs font-medium text-gray-600">Unit</label>
                       <input
                         type="text"
                         value={goalEditValues.unit}
                         onChange={(e) => setGoalEditValues((v) => ({ ...v, unit: e.target.value }))}
                         className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                         placeholder='e.g. "miles", "sessions"'
                       />
                     </div>
                     <div>
                       <label className="text-xs font-medium text-gray-600">Progress</label>
                       <input
                         type="number"
                         value={goalEditValues.progress}
                         onChange={(e) => setGoalEditValues((v) => ({ ...v, progress: e.target.value }))}
                         className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                       />
                     </div>
                     <div>
                       <label className="text-xs font-medium text-gray-600">Target</label>
                       <input
                         type="number"
                         value={goalEditValues.target}
                         onChange={(e) => setGoalEditValues((v) => ({ ...v, target: e.target.value }))}
                         className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B8CDBA]"
                       />
                     </div>
                   </div>

                   <div className="flex items-center justify-between pt-2">
                     <button
                       type="button"
                       onClick={() => setGoalModalMode("view")}
                       className="px-3 py-2 rounded-md text-sm border border-gray-200 text-gray-600 hover:bg-gray-50"
                     >
                       Cancel
                     </button>
                     <div className="flex items-center gap-2">
                       <button
                         type="button"
                         onClick={() => {
                           const ok = window.confirm("Delete this goal? This cannot be undone.");
                           if (ok) handleDeleteGoal(goalForModal.id);
                         }}
                         className="px-3 py-2 rounded-md text-sm border border-red-200 text-red-600 hover:bg-red-50"
                       >
                         Delete
                       </button>
                       <button
                         type="button"
                         onClick={saveGoalEdits}
                         className="px-3 py-2 rounded-md text-sm bg-[#1B5E57] text-white hover:bg-[#174C46]"
                       >
                         Save
                       </button>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
         )}
      </div>
    </SidebarLayout>
  );
}

























