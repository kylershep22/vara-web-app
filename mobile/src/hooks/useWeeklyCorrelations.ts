import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getHabitCompletions } from '../services/firebase/habits.service';
import {
  computeCorrelations,
  computePeriodScore,
  computeDailyActivityCounts,
  type DailyDataPoint,
  type WeeklyCorrelations,
} from '../services/correlationEngine.service';

const CACHE_KEY = 'vara_weekly_correlations';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateRange(days: number): { start: Date; end: Date; dates: string[] } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return { start, end, dates };
}

export function useWeeklyCorrelations(days: number = 7): {
  correlations: WeeklyCorrelations | null;
  compositeScore: number;
  dailyActivityCounts: number[];
  loading: boolean;
} {
  const { user } = useAuth();
  const [correlations, setCorrelations] = useState<WeeklyCorrelations | null>(null);
  const [compositeScore, setCompositeScore] = useState<number>(0);
  const [dailyActivityCounts, setDailyActivityCounts] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      // Check cache first
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.date === todayStr() && parsed.days === days) {
            if (!cancelled) {
              setCorrelations(parsed.data);
              setCompositeScore(parsed.compositeScore ?? 0);
              setDailyActivityCounts(parsed.dailyActivityCounts ?? []);
              setLoading(false);
            }
            return;
          }
        }
      } catch {
        // Cache miss, compute fresh
      }

      try {
        const fetchDays = days * 2;
        const { start, end, dates } = dateRange(fetchDays);
        const uid = user!.uid;

        // Fetch all data sources in parallel
        const [brainStateCheckIns, brainMetrics, journalEntries, focusSessions, habitsResult] = await Promise.all([
          fetchBrainStateCheckIns(uid, dates),
          fetchBrainMetrics(uid, dates),
          fetchJournalEntries(uid, start, end),
          fetchFocusSessions(uid, start, end),
          fetchHabitsAndCompletions(uid, dates),
        ]);
        const habits = habitsResult.rates;
        const habitCounts = habitsResult.counts;

        // Build daily data points
        const dailyData: DailyDataPoint[] = dates.map(date => {
          const brainCheck = brainStateCheckIns.get(date);
          const brain = brainMetrics.get(date);
          const journaled = journalEntries.has(date);
          const focus = focusSessions.get(date) || 0;
          const habitRate = habits.get(date);

          const brainStateToMood: Record<string, number> = {
            wired: 3, foggy: 2, okay: 3, clear: 4, energized: 5,
          };
          const brainStateToEnergy: Record<string, number> = {
            wired: 4, foggy: 2, okay: 3, clear: 4, energized: 5,
          };
          const bState = brainCheck?.brainState;

          return {
            date,
            sleepQuality: brain?.sleepQuality ?? null,
            mood: bState ? brainStateToMood[bState] ?? null : null,
            energy: bState ? brainStateToEnergy[bState] ?? null : null,
            stress: brain?.stressLevel ?? null,
            habitCompletionRate: habitRate ?? null,
            focusMinutes: focus > 0 ? focus : null,
            journaled,
          };
        });

        // Split into current period and full dataset
        const currentPeriodData = dailyData.slice(-days);
        const result = computeCorrelations(currentPeriodData, dailyData);

        // Compute composite score for current period
        const score = computePeriodScore(currentPeriodData);

        // Compute daily activity counts for current period
        const currentDates = dates.slice(-days);
        const habitCountsByDate = new Map<string, number>();
        const focusCountsByDate = new Map<string, number>();
        for (const date of currentDates) {
          habitCountsByDate.set(date, habitCounts.get(date) || 0);
          focusCountsByDate.set(date, focusSessions.get(date) ? 1 : 0);
        }

        const activityCounts = computeDailyActivityCounts(
          currentPeriodData,
          habitCountsByDate,
          focusCountsByDate
        );

        // Cache result
        try {
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              date: todayStr(),
              days,
              data: result,
              compositeScore: score,
              dailyActivityCounts: activityCounts,
            })
          );
        } catch {
          // Non-critical cache write failure
        }

        if (!cancelled) {
          setCorrelations(result);
          setCompositeScore(score);
          setDailyActivityCounts(activityCounts);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error computing correlations:', err);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.uid, days]);

  return { correlations, compositeScore, dailyActivityCounts, loading };
}

// --- Data fetchers ---

async function fetchBrainStateCheckIns(
  uid: string,
  dates: string[],
): Promise<Map<string, { brainState: string }>> {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      if (!db) return;
      const docRef = doc(db, 'brainStateCheckIns', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, { brainState: data.brainState });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}

async function fetchBrainMetrics(
  uid: string,
  dates: string[],
): Promise<Map<string, { sleepQuality: number; stressLevel: number }>> {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      if (!db) return;
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

async function fetchJournalEntries(
  uid: string,
  start: Date,
  end: Date,
): Promise<Set<string>> {
  const set = new Set<string>();
  try {
    if (!db) return set;
    const q = query(
      collection(db, 'journalEntries'),
      where('userId', '==', uid),
      where('createdAt', '>=', Timestamp.fromDate(start)),
      where('createdAt', '<=', Timestamp.fromDate(end)),
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
      const ts = d.data().createdAt;
      if (ts?.toDate) {
        const date = ts.toDate();
        set.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
      }
    });
  } catch {
    // Return empty set
  }
  return set;
}

async function fetchFocusSessions(
  uid: string,
  start: Date,
  end: Date,
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  try {
    if (!db) return map;
    const q = query(
      collection(db, 'focusSessions'),
      where('userId', '==', uid),
    );
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
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

async function fetchHabitsAndCompletions(
  uid: string,
  dates: string[],
): Promise<{ rates: Map<string, number>; counts: Map<string, number> }> {
  const rates = new Map<string, number>();
  const counts = new Map<string, number>();
  try {
    if (!db) return { rates, counts };
    const q = query(
      collection(db, 'habits'),
      where('userId', '==', uid),
      where('active', '==', true),
    );
    const habitsSnap = await getDocs(q);
    const habitIds = habitsSnap.docs.map(d => d.id);

    if (habitIds.length === 0) return { rates, counts };

    // For each habit, fetch completions in date range
    const completionPromises = habitIds.map(async (habitId) => {
      const completions = await getHabitCompletions(habitId);
      return { habitId, completions };
    });
    const allCompletions = await Promise.all(completionPromises);

    for (const date of dates) {
      let completed = 0;
      for (const { completions } of allCompletions) {
        const match = completions.find(c => c.date === date && c.completed);
        if (match) completed++;
      }
      const rate = Math.round((completed / habitIds.length) * 100);
      rates.set(date, rate);
      counts.set(date, completed);
    }
  } catch {
    // Return empty maps
  }
  return { rates, counts };
}
