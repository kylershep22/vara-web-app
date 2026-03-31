import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useHabits } from "./useHabits";
import {
  getTodayCheckIn,
  saveCheckIn,
  markProtocolCompleted,
} from "../services/db/brainStateCheckIn.service";
import {
  getTodayReflection,
  saveReflection,
} from "../services/db/dailyReflection.service";

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function useDashboardV2() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [userName, setUserName] = useState("");
  const [dataLoading, setDataLoading] = useState(true);

  // Brain state check-in
  const [brainStateCheckIn, setBrainStateCheckIn] = useState(null);
  const [brainStateLoading, setBrainStateLoading] = useState(false);

  // Daily reflection
  const [reflection, setReflection] = useState(null);
  const [reflectionLoading, setReflectionLoading] = useState(false);

  // Habits
  const { habits, habitCompletions, pendingReflection, beginToggle, confirmCompletion, dismissReflection } = useHabits(uid);

  // Load initial data
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    async function load() {
      try {
        const [userDoc, checkIn, refl] = await Promise.all([
          getDoc(doc(db, "users", uid)),
          getTodayCheckIn(uid),
          getTodayReflection(uid),
        ]);

        if (cancelled) return;

        if (userDoc.exists()) {
          setUserName(userDoc.data().displayName || "");
        }
        setBrainStateCheckIn(checkIn);
        setReflection(refl);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [uid]);

  // Handle brain state selection
  const handleBrainStateSelect = useCallback(async (state) => {
    if (!uid) return;
    setBrainStateLoading(true);
    try {
      const result = await saveCheckIn(uid, state);
      setBrainStateCheckIn(result);
    } catch (err) {
      console.error("Brain state save error:", err);
    } finally {
      setBrainStateLoading(false);
    }
  }, [uid]);

  // Handle protocol completion
  const handleProtocolComplete = useCallback(async () => {
    if (!uid) return;
    try {
      await markProtocolCompleted(uid);
      setBrainStateCheckIn((prev) => prev ? { ...prev, protocolCompleted: true } : prev);
    } catch (err) {
      console.error("Protocol complete error:", err);
    }
  }, [uid]);

  // Handle daily reflection
  const handleReflectionSave = useCallback(async (difficulty) => {
    if (!uid) return;
    setReflectionLoading(true);
    try {
      const result = await saveReflection(uid, difficulty);
      setReflection(result);
    } catch (err) {
      console.error("Reflection save error:", err);
    } finally {
      setReflectionLoading(false);
    }
  }, [uid]);

  // Handle habit toggle — beginToggle expects the full habit object
  const handleHabitToggle = useCallback((habit, date, isCompleting) => {
    if (!uid) return;
    beginToggle(habit, date);
  }, [uid, beginToggle]);

  // Check if all active habits are completed today
  const today = todayYMD();
  const activeHabits = habits.filter((h) => h.active !== false);
  const allHabitsCompleted =
    activeHabits.length > 0 &&
    activeHabits.every((h) =>
      habitCompletions.some((c) => c.habitId === h.id && c.dateISO === today)
    );
  const showReflection = allHabitsCompleted && !reflection;

  return {
    user,
    userName,
    greeting: getGreeting(),
    formattedDate: getFormattedDate(),
    dataLoading,

    brainStateCheckIn,
    brainStateLoading,
    handleBrainStateSelect,

    handleProtocolComplete,

    habits,
    habitCompletions,
    handleHabitToggle,

    pendingReflection,
    confirmCompletion,
    dismissReflection,

    reflection,
    reflectionLoading,
    showReflection,
    handleReflectionSave,

    allHabitsCompleted,
  };
}
