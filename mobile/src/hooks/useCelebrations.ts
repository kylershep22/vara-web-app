/**
 * useCelebrations Hook
 * Manages celebration state for quiet finish and moment of recognition
 */

import { useState, useCallback } from 'react';

interface UseCelebrationsReturn {
  // All habits completed state (triggers QuietFinish)
  allHabitsCompletedToday: boolean;
  setAllHabitsCompletedToday: (value: boolean) => void;

  // Moment of recognition state
  showRecognition: boolean;
  triggerRecognition: () => void;
  dismissRecognition: () => void;
}

export function useCelebrations(): UseCelebrationsReturn {
  const [allHabitsCompletedToday, setAllHabitsCompletedToday] = useState(false);
  const [showRecognition, setShowRecognition] = useState(false);

  const triggerRecognition = useCallback(() => {
    setShowRecognition(true);
  }, []);

  const dismissRecognition = useCallback(() => {
    setShowRecognition(false);
  }, []);

  return {
    allHabitsCompletedToday,
    setAllHabitsCompletedToday,
    showRecognition,
    triggerRecognition,
    dismissRecognition,
  };
}
