/**
 * useHabits Hook
 * Real-time subscription to user's habits
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Habit } from '../types';
import { useAuth } from '../context/AuthContext';

export const useHabits = (activeOnly: boolean = false) => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setHabits([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let q = query(
      collection(db, 'habits'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    // Filter by active status if specified
    if (activeOnly) {
      q = query(
        collection(db, 'habits'),
        where('userId', '==', user.uid),
        where('active', '==', true),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const habitsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Habit[];

        setHabits(habitsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to habits:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, activeOnly]);

  return { habits, loading, error };
};
