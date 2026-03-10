// src/hooks/useCelebrations.js
// Manages celebration state for quiet finish and moment of recognition

import { useState, useCallback } from 'react';

export function useCelebrations() {
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
