import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { computeCorrelations } from '../services/correlationEngine.service';

const CACHE_KEY = 'vara_weekly_correlations';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateRange(days) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return { start, end, dates };
}

export function useWeeklyCorrelations() {
  const { user } = useAuth();
  const [correlations, setCorrelations] = useState(null);
  const [brainStateDistribution, setBrainStateDistribution] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      // Check localStorage cache first
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.date === todayStr()) {
            if (!cancelled) {
              setCorrelations(parsed.data);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // Cache miss — compute fresh
      }

      try {
        const { start, end, dates } = dateRange(7);
        const uid = user.uid;

        // Fetch all data sources in parallel
        const [morningCheckIns, brainStateCheckIns, brainMetrics, journalEntries, focusSessions, habits] =
          await Promise.all([
            fetchMorningCheckIns(uid, dates),
            fetchBrainStateCheckIns(uid, dates),
            fetchBrainMetrics(uid, dates),
            fetchJournalEntries(uid, start, end),
            fetchFocusSessions(uid, start, end),
            fetchHabitsAndCompletions(uid, dates),
          ]);

        // Build daily data points
        const dailyData = dates.map((date) => {
          const checkIn = morningCheckIns.get(date);
          const brainCheck = brainStateCheckIns.get(date);
          const brain = brainMetrics.get(date);
          const journaled = journalEntries.has(date);
          const focus = focusSessions.get(date) || 0;
          const habitRate = habits.get(date);
          const bState = brainCheck?.brainState;

          return {
            date,
            sleepQuality: brain?.sleepQuality ?? null,
            mood: checkIn?.mood ?? null,
            energy: checkIn?.energyLevel ?? null,
            stress: brain?.stressLevel ?? null,
            habitCompletionRate: habitRate ?? null,
            focusMinutes: focus > 0 ? focus : null,
            journaled,
            brainState: bState ?? null,
            protocolCompleted: brainCheck?.protocolCompleted ?? false,
          };
        });

        const result = computeCorrelations(dailyData);

        // Brain state distribution
        let brainDist = null;
        const currentBrainStates = [];
        for (const date of dates) {
          const entry = brainStateCheckIns.get(date);
          if (entry?.brainState) currentBrainStates.push(entry.brainState);
        }

        if (currentBrainStates.length >= 3) {
          const stateConfig = [
            { key: 'energized', label: 'Energized\u26A1', positive: true },
            { key: 'clear', label: 'Clear\u2728', positive: true },
            { key: 'okay', label: 'Okay\uD83C\uDF24\uFE0F', positive: false },
            { key: 'foggy', label: 'Foggy\uD83C\uDF2B\uFE0F', positive: false },
            { key: 'wired', label: 'Wired\u26A0\uFE0F', positive: false },
          ];
          const distribution = stateConfig.map(({ key, label }) => ({
            state: key,
            label,
            count: currentBrainStates.filter((s) => s === key).length,
          }));
          const positiveDays = currentBrainStates.filter(
            (s) => s === 'clear' || s === 'energized'
          ).length;

          // Fetch prior 7-day period for comparison
          const priorRange = dateRange(14);
          const priorDates = priorRange.dates.slice(0, 7);
          let priorPositiveDays = 0;
          try {
            const priorCheckIns = await fetchBrainStateCheckIns(uid, priorDates);
            const priorStates = [];
            for (const date of priorDates) {
              const entry = priorCheckIns.get(date);
              if (entry?.brainState) priorStates.push(entry.brainState);
            }
            priorPositiveDays = priorStates.filter(
              (s) => s === 'clear' || s === 'energized'
            ).length;
          } catch {
            // Prior period unavailable
          }

          brainDist = {
            distribution,
            positiveDays,
            priorPositiveDays,
            totalCheckIns: currentBrainStates.length,
          };
        }

        // Cache result in localStorage
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), data: result }));
        } catch {
          // Non-critical cache write failure
        }

        if (!cancelled) {
          setCorrelations(result);
          setBrainStateDistribution(brainDist);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error computing correlations:', err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return { correlations, brainStateDistribution, loading };
}

// --- Data fetchers ---

async function fetchMorningCheckIns(uid, dates) {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      const docRef = doc(db, 'morningCheckIns', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, { mood: data.mood, energyLevel: data.energyLevel });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}

async function fetchBrainStateCheckIns(uid, dates) {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      const docRef = doc(db, 'brainStateCheckIns', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, {
          brainState: data.brainState,
          protocolCompleted: data.protocolCompleted ?? false,
        });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}

async function fetchBrainMetrics(uid, dates) {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      const docRef = doc(db, 'brainMetrics', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, {
          sleepQuality: data.sleepQuality ?? null,
          stressLevel: data.stressLevel ?? null,
        });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}

async function fetchJournalEntries(uid, start, end) {
  const set = new Set();
  try {
    const q = query(
      collection(db, 'journalEntries'),
      where('userId', '==', uid),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end))
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const ts = d.data().createdAt;
      if (ts?.toDate) {
        const date = ts.toDate();
        set.add(
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        );
      }
    });
  } catch {
    // Return empty set
  }
  return set;
}

async function fetchFocusSessions(uid, start, end) {
  const map = new Map();
  try {
    const q = query(
      collection(db, 'focusSessions'),
      where('userId', '==', uid)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => {
      const data = d.data();
      if (!data.completed) return;
      const seconds = data.startedAt?.seconds || 0;
      if (seconds < start.getTime() / 1000 || seconds > end.getTime() / 1000) return;
      const date = new Date(seconds * 1000);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + (data.duration || 0));
    });
  } catch {
    // Return empty map
  }
  return map;
}

async function fetchHabitsAndCompletions(uid, dates) {
  const map = new Map();
  try {
    const q = query(
      collection(db, 'habits'),
      where('userId', '==', uid),
      where('active', '==', true)
    );
    const habitsSnap = await getDocs(q);
    const habitIds = habitsSnap.docs.map((d) => d.id);

    if (habitIds.length === 0) return map;

    // For each habit, fetch completions subcollection docs matching our date range
    const completionPromises = habitIds.map(async (habitId) => {
      try {
        const completionsSnap = await getDocs(
          query(
            collection(db, 'habits', habitId, 'completions'),
            where('date', 'in', dates)
          )
        );
        return completionsSnap.docs
          .map((d) => d.data())
          .filter((c) => c.completed);
      } catch {
        return [];
      }
    });

    const allCompletions = await Promise.all(completionPromises);

    // allCompletions[i] is an array of completion records for habit at habitIds[i]
    for (const date of dates) {
      let completed = 0;
      for (const habitCompletions of allCompletions) {
        if (habitCompletions.some((c) => c.date === date)) completed++;
      }
      const rate = Math.round((completed / habitIds.length) * 100);
      map.set(date, rate);
    }
  } catch {
    // Return empty map
  }
  return map;
}
