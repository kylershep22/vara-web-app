/**
 * useUserValues Hook
 * Provides the user's selected values from their Firestore profile.
 * Returns an empty array if values haven't been set yet.
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { subscribeMergedUserData } from '../services/firebase/userMigrationRead';
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

    // MIGRATION_FALLBACK — selectedValues moved to userPrivate in slice 2.
    const unsubscribe = subscribeMergedUserData(
      user.uid,
      (data) => {
        if (data && Array.isArray(data.selectedValues)) {
          setSelectedValues(data.selectedValues as ValueId[]);
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
