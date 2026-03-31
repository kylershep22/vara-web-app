// src/services/userContextService.js
import { db } from '../firebase';
import {
  collection, query, where, getDocs, limit
} from 'firebase/firestore';
import { getTodayCheckIn } from './db/brainStateCheckIn.service';
import { getTodayReflection } from './db/dailyReflection.service';

/**
 * Summarize a few items to keep tokens low.
 * Extend as needed (journal stats, last 3 check-ins, etc).
 */
export async function buildUserContextSummary(userId) {
  if (!userId) return { goals: [], habits: [] };

  // ---- Goals (grab a few) ----
  const goalsSnap = await getDocs(
    query(collection(db, 'goals'), where('userId', '==', userId), limit(5))
  );
  const goals = goalsSnap.docs.map(d => {
    const g = d.data();
    return {
      id: d.id,
      title: g.title || g.name || 'Untitled goal',
      category: g.category || null,
      timeframe: g.timeframe || null,
      progress: typeof g.progress === 'number' ? g.progress : null,
    };
  });

  // ---- Habits (grab a few) ----
  const habitsSnap = await getDocs(
    query(collection(db, 'habits'), where('userId', '==', userId), limit(8))
  );
  const habits = habitsSnap.docs.map(d => {
    const h = d.data();
    return {
      id: d.id,
      title: h.title || h.name || 'Untitled habit',
      goalId: h.goalId || null,
      cadence: h.cadence || h.frequency || null,
      streak: typeof h.streak === 'number' ? h.streak : null,
    };
  });

  // ---- Brain state check-in ----
  let brainState = null;
  try {
    const checkIn = await getTodayCheckIn(userId);
    brainState = checkIn?.brainState || null;
  } catch { /* non-critical */ }

  // ---- Daily reflection ----
  let dailyReflection = null;
  try {
    const refl = await getTodayReflection(userId);
    dailyReflection = refl?.difficulty || null;
  } catch { /* non-critical */ }

  // ---- Habits completed today ----
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let habitsCompletedToday = 0;
  try {
    const compSnap = await getDocs(
      query(collection(db, 'habitCompletions'), where('userId', '==', userId), where('dateISO', '==', todayISO))
    );
    habitsCompletedToday = compSnap.size;
  } catch { /* non-critical */ }

  return {
    goals,
    habits,
    brainState,
    dailyReflection,
    activeHabits: habits.length,
    habitsCompletedToday,
  };
}

/**
 * Turn a route like "/goals" or "/community/group/123" into a friendly label.
 */
export function pageLabelFromPath(pathname) {
  if (!pathname) return 'Unknown';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/goals')) return 'Goals';
  if (pathname.startsWith('/habits')) return 'Habits';
  if (pathname.startsWith('/journal')) return 'Journal';
  if (pathname.startsWith('/community')) return 'Community';
  if (pathname.startsWith('/movement')) return 'Movement';
  if (pathname.startsWith('/sleep')) return 'Sleep & Recovery';
  if (pathname.startsWith('/mindbody')) return 'Mind & Body';
  if (pathname === '/' || pathname === '/welcome') return 'Welcome';
  return pathname.replace('/', '').split('/')[0] || 'Unknown';
}
