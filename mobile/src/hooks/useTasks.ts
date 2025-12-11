/**
 * useTasks Hook
 * Real-time subscription to user's tasks
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
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
