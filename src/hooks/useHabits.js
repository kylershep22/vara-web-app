import { useEffect, useMemo, useState, useCallback } from 'react';
import { db } from '../firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, serverTimestamp
} from 'firebase/firestore';
import { logCompletion, removeCompletion } from '../services/db/habits.service';

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
function getConsecutiveStreak(isoDatesSet) {
  const dates = Array.from(isoDatesSet).sort();
  const toDate = (iso) => new Date(iso + 'T00:00:00');
  let best = 0, current = 0, last = null;
  for (const iso of dates) {
    const d = toDate(iso);
    if (last) {
      const diff = Math.round((d - last) / (24*3600*1000));
      if (diff === 1) current += 1;
      else if (diff > 1) { best = Math.max(best, current); current = 1; }
    } else { current = 1; }
    last = d;
  }
  best = Math.max(best, current);
  const today = new Date(isoToday() + 'T00:00:00');
  let rolling = 0, probe = new Date(today);
  while (isoDatesSet.has(toISO(probe))) {
    rolling += 1;
    probe = new Date(probe.getTime() - 24*3600*1000);
  }
  return [rolling, best];
}

export function useHabits(userId) {
  const [habits, setHabits] = useState([]);
  const [habitCompletions, setHabitCompletions] = useState([]);
  const [pendingReflection, setPendingReflection] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const habitsQ = query(collection(db, 'habits'), where('userId', '==', userId));
    const unsubHabits = onSnapshot(habitsQ, (snap) => {
      setHabits(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        title: d.data().title ?? d.data().name ?? 'Untitled Habit',
        name: d.data().name ?? d.data().title ?? 'Untitled Habit',
        status: d.data().status ?? 'active',
        type: d.data().type ?? d.data().frequency ?? 'daily'
      })));
    });

    const hcQ = query(
      collection(db, 'habitCompletions'),
      where('userId', '==', userId),
      orderBy('dateISO', 'desc')
    );
    const unsubHC = onSnapshot(hcQ, (snap) => {
      setHabitCompletions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubHabits(); unsubHC(); };
  }, [userId]);

  const habitStreaks = useMemo(() => {
    const map = new Map();
    for (const h of habits) {
      const dates = habitCompletions.filter(c => c.habitId === h.id).map(c => c.dateISO);
      const [current, best] = getConsecutiveStreak(new Set(dates));
      map.set(h.id, { current, best });
    }
    return map;
  }, [habits, habitCompletions]);

  const beginToggle = useCallback((habit, dateISO) => {
    if (!userId || !habit?.id) return;
    const date = dateISO || isoToday();
    const already = habitCompletions.find(c => c.habitId === habit.id && c.dateISO === date);

    if (already) {
      // Un-toggle: remove completion immediately
      removeCompletion(habit.id, date).then(() => {
        const dates = habitCompletions
          .filter(c => c.habitId === habit.id && c.dateISO !== date)
          .map(c => c.dateISO);
        const [current, best] = getConsecutiveStreak(new Set(dates));
        updateDoc(doc(db, 'habits', habit.id), {
          streak: current, bestStreak: best, updatedAt: serverTimestamp()
        });
      }).catch(err => console.error('Error removing completion:', err));
      return;
    }

    // New completion: open reflection sheet
    setPendingReflection({ habit, dateISO: date });
  }, [userId, habitCompletions]);

  const confirmCompletion = useCallback(async (reflectionData = {}) => {
    if (!pendingReflection || !userId) return;
    const { habit, dateISO } = pendingReflection;
    setPendingReflection(null);

    try {
      await logCompletion(userId, habit.id, dateISO, {
        ...reflectionData,
        source: reflectionData.source || 'track',
      });

      const dates = habitCompletions
        .filter(c => c.habitId === habit.id)
        .map(c => c.dateISO)
        .concat(dateISO);
      const [current, best] = getConsecutiveStreak(new Set(dates));
      await updateDoc(doc(db, 'habits', habit.id), {
        streak: current, bestStreak: best, updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging habit completion:', error);
    }
  }, [userId, pendingReflection, habitCompletions]);

  const dismissReflection = useCallback(() => {
    setPendingReflection(null);
  }, []);

  const recomputeStreaksForHabit = async (habitId) => {
    const dates = habitCompletions.filter(c => c.habitId === habitId).map(c => c.dateISO);
    const [current, best] = getConsecutiveStreak(new Set(dates));
    await updateDoc(doc(db, 'habits', habitId), {
      streak: current, bestStreak: best, updatedAt: serverTimestamp()
    });
  };

  return {
    habits,
    habitCompletions,
    habitStreaks,
    pendingReflection,
    beginToggle,
    confirmCompletion,
    dismissReflection,
    recomputeStreaksForHabit,
  };
}
