/**
 * useNotificationScheduler Hook
 * Provides access to notification scheduling functionality
 * and automatically initializes notifications on login
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotificationPreferences } from './useNotificationPreferences';
import {
  initializeUserNotifications,
  updateNotificationsFromPreferences,
  scheduleStreakProtectionCheck,
  cancelStreakProtectionNotification,
  checkAndSendStreakMilestone,
  checkAndSendGoalMilestone,
  sendMilestoneNotification,
} from '../services/notificationScheduler.service';

interface UseNotificationSchedulerReturn {
  // Initialize notifications for the current user
  initializeNotifications: () => Promise<void>;

  // Call when user completes a habit - handles milestones and cancels streak protection
  onHabitCompleted: (habitName: string, newStreak: number) => Promise<void>;

  // Call when goal progress updates
  onGoalProgressUpdated: (progressPercent: number) => Promise<void>;

  // Call when user completes all daily items
  onDailyCompletionAchieved: () => Promise<void>;

  // Manually trigger streak protection check
  checkStreakProtection: () => Promise<void>;
}

export function useNotificationScheduler(): UseNotificationSchedulerReturn {
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user?.uid) {
      initializeUserNotifications(user.uid);
    }
  }, [user?.uid]);

  // Update notifications when preferences change
  useEffect(() => {
    if (user?.uid && preferences) {
      updateNotificationsFromPreferences(user.uid, preferences);
    }
  }, [user?.uid, preferences]);

  // Run streak protection check daily (on app open)
  useEffect(() => {
    if (user?.uid) {
      scheduleStreakProtectionCheck(user.uid);
    }
  }, [user?.uid]);

  const initializeNotifications = useCallback(async () => {
    if (!user?.uid) return;
    await initializeUserNotifications(user.uid);
  }, [user?.uid]);

  const onHabitCompleted = useCallback(async (habitName: string, newStreak: number) => {
    if (!user?.uid) return;

    // Cancel streak protection notification since user completed something
    await cancelStreakProtectionNotification(user.uid);

    // Check and send streak milestone
    await checkAndSendStreakMilestone(user.uid, habitName, newStreak);
  }, [user?.uid]);

  const onGoalProgressUpdated = useCallback(async (progressPercent: number) => {
    if (!user?.uid) return;

    // Check and send goal milestone
    await checkAndSendGoalMilestone(user.uid, progressPercent);
  }, [user?.uid]);

  const onDailyCompletionAchieved = useCallback(async () => {
    if (!user?.uid) return;

    // Send daily completion milestone
    await sendMilestoneNotification(user.uid, 'dailyCompletion');
  }, [user?.uid]);

  const checkStreakProtection = useCallback(async () => {
    if (!user?.uid) return;
    await scheduleStreakProtectionCheck(user.uid);
  }, [user?.uid]);

  return {
    initializeNotifications,
    onHabitCompleted,
    onGoalProgressUpdated,
    onDailyCompletionAchieved,
    checkStreakProtection,
  };
}

export default useNotificationScheduler;
