/**
 * useGoals Hook
 * Real-time subscription to user's goals
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, firebaseError } from '../config/firebase';
import { Goal } from '../types';
import { useAuth } from '../context/AuthContext';

export const useGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setLoading(false);
      return;
    }

    // Check if Firebase is properly initialized
    if (!db) {
      console.error('Firestore not initialized - cannot load goals');
      setError(firebaseError || new Error('Firestore is not initialized. Please check your Firebase configuration.'));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'goals'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const goalsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Goal[];

        setGoals(goalsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error subscribing to goals:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  return { goals, loading, error };
};
