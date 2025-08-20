// src/services/userContextService.js
import { db } from '../firebase';
import {
  collection, query, where, getDocs, limit
} from 'firebase/firestore';

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

  return { goals, habits };
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
