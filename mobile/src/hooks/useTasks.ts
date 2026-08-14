/**
 * useTasks Hook
 * Real-time subscription to user's tasks
 *
 * TECH DEBT — THIS HOOK HAS ZERO CONSUMERS, DELIBERATELY. TB-2a removed its
 * only caller (useDashboard, where the subscription ran on every dashboard
 * mount and its result was discarded under DASHBOARD_V2). The hook is left in
 * place rather than deleted because it is one part of a FROZEN LAYER that has
 * to be retired or revived as a whole:
 *
 *   - this hook
 *   - services/firebase/tasks.service.ts (also consumer-free on mobile;
 *     createTask / updateTask / deleteTask are re-exported by the
 *     services/firebase barrel and imported by nothing)
 *   - the `useTasks` entry in hooks/index.ts
 *   - the `Task` interface in types/models.ts
 *   - the `tasks` block in firestore.rules
 *   - the two `tasks` composite indexes in firestore.indexes.json
 *
 * All of it serves the WEB app, which still writes this collection and is
 * currently behind a coming-soon wall. Whether the layer is deleted or brought
 * back is a product call about the web app's future, not a cleanup task —
 * deleting half of it while the other half still has live writers would be
 * worse than leaving it whole.
 *
 * NOT THE SAME THING AS TB-2's TASKS. Mobile task capture is the separate
 * `capturedTasks` collection (CapturedTask, demand = cognitive load). This one
 * is the legacy entity (Task, priority = importance). Never conflate them, and
 * never point new mobile code at this hook.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, firebaseError } from '../config/firebase';
import { Task } from '../types';
import { useAuth } from '../context/AuthContext';

export const useTasks = (completedFilter?: boolean) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    // Check if Firebase is properly initialized
    if (!db) {
      console.error('Firestore not initialized - cannot load tasks');
      setError(firebaseError || new Error('Firestore is not initialized. Please check your Firebase configuration.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Filter by completed status if specified
    if (completedFilter !== undefined) {
      q = query(
        collection(db, 'tasks'),
        where('userId', '==', user.uid),
        where('completed', '==', completedFilter),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasksData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];

        setTasks(tasksData);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to tasks:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, completedFilter]);

  return { tasks, loading, error };
};
