/**
 * useUserValues Hook
 * Provides the user's selected values from their Firestore profile.
 * Returns an empty array if values haven't been set yet.
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ValueId } from '../constants/values';

export function useUserValues(): ValueId[] {
  const { user } = useAuth();
  const [selectedValues, setSelectedValues] = useState<ValueId[]>([]);

  useEffect(() => {
    if (!user?.uid || !db) {
      setSelectedValues([]);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data.selectedValues)) {
            setSelectedValues(data.selectedValues as ValueId[]);
          }
        }
      },
      (error) => {
        console.error('Error listening to user values:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return selectedValues;
}
