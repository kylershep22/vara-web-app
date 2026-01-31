/**
 * useCelebrations Hook
 * Manages celebration state for confetti and streak milestones
 */

import { useState, useCallback } from 'react';

export interface MilestoneData {
  habitName: string;
  habitId: string;
  milestone: 7 | 30 | 100;
  streakCount: number;
}

interface UseCelebrationsReturn {
  // Confetti state
  showConfetti: boolean;
  triggerConfetti: () => void;
  dismissConfetti: () => void;

  // Milestone state
  pendingMilestone: MilestoneData | null;
  checkForMilestone: (habitId: string, habitName: string, previousStreak: number, newStreak: number) => void;
  dismissMilestone: () => void;

  // All habits completed state
  allHabitsCompletedToday: boolean;
  setAllHabitsCompletedToday: (value: boolean) => void;
}

// Milestone thresholds
const MILESTONES = [7, 30, 100] as const;

export function useCelebrations(): UseCelebrationsReturn {
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingMilestone, setPendingMilestone] = useState<MilestoneData | null>(null);
  const [allHabitsCompletedToday, setAllHabitsCompletedToday] = useState(false);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
  }, []);

  const dismissConfetti = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const checkForMilestone = useCallback(
    (habitId: string, habitName: string, previousStreak: number, newStreak: number) => {
      // Check if we've crossed any milestone threshold
      for (const milestone of MILESTONES) {
        // If previous streak was below milestone and new streak is at or above it
        if (previousStreak < milestone && newStreak >= milestone) {
          setPendingMilestone({
            habitId,
            habitName,
            milestone,
            streakCount: newStreak,
          });
          return;
        }
      }
    },
    []
  );

  const dismissMilestone = useCallback(() => {
    setPendingMilestone(null);
  }, []);

  return {
    showConfetti,
    triggerConfetti,
    dismissConfetti,
    pendingMilestone,
    checkForMilestone,
    dismissMilestone,
    allHabitsCompletedToday,
    setAllHabitsCompletedToday,
  };
}
