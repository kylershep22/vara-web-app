/**
 * Notification Context
 * Manages notification scheduling and provides notification functions to the app
 */

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNotificationPreferences } from '../hooks';
import {
  initializeUserNotifications,
  updateNotificationsFromPreferences,
  scheduleStreakProtectionCheck,
  cancelStreakProtectionNotification,
  checkAndSendStreakMilestone,
  checkAndSendGoalMilestone,
  sendMilestoneNotification,
  cancelAllUserNotifications,
  // Tier 2
  scheduleChallengeReminder,
  sendChallengeFriendActivityNotification,
  // Tier 3
  sendConnectionRequestNotification,
  sendMessageNotification,
  sendGroupPostNotification,
  sendMentionNotification,
  sendFriendMilestoneNotification,
} from '../services/notificationScheduler.service';

interface NotificationContextType {
  // Initialize notifications for the current user
  initializeNotifications: () => Promise<void>;

  // Tier 1: Call when user completes a habit - handles milestones and cancels streak protection
  onHabitCompleted: (habitName: string, newStreak: number) => Promise<void>;

  // Tier 1: Call when goal progress updates
  onGoalProgressUpdated: (progressPercent: number) => Promise<void>;

  // Tier 1: Call when user completes all daily items
  onDailyCompletionAchieved: () => Promise<void>;

  // Tier 1: Manually trigger streak protection check
  checkStreakProtection: () => Promise<void>;

  // Tier 2: Challenge notifications
  onJoinChallenge: (challengeId: string, challengeName: string) => Promise<void>;
  notifyChallengeFriendActivity: (friendName: string, challengeName: string, challengeId: string) => Promise<void>;

  // Tier 3: Community notifications
  notifyConnectionRequest: (senderName: string, senderId: string) => Promise<void>;
  notifyNewMessage: (senderName: string, messagePreview: string, conversationId: string, senderId: string) => Promise<void>;
  notifyGroupPost: (groupName: string, authorName: string, groupId: string) => Promise<void>;
  notifyMention: (authorName: string, context: string) => Promise<void>;
  notifyFriendMilestone: (friendName: string, milestoneType: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user?.uid && user?.emailVerified) {
      console.log('📱 Initializing notifications for user:', user.uid);
      initializeUserNotifications(user.uid);
    }
  }, [user?.uid, user?.emailVerified]);

  // Update notifications when preferences change
  useEffect(() => {
    if (user?.uid && preferences) {
      console.log('📱 Updating notifications from preferences');
      updateNotificationsFromPreferences(user.uid, preferences);
    }
  }, [user?.uid, preferences]);

  // Run streak protection check on app open
  useEffect(() => {
    if (user?.uid) {
      scheduleStreakProtectionCheck(user.uid);
    }
  }, [user?.uid]);

  // Cancel all notifications when user logs out
  useEffect(() => {
    if (!user) {
      // User logged out - cleanup handled elsewhere
      return;
    }

    return () => {
      // Cleanup when component unmounts (e.g., on logout)
      if (user?.uid) {
        cancelAllUserNotifications(user.uid);
      }
    };
  }, [user]);

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

  // Tier 2: Challenge notifications
  const onJoinChallenge = useCallback(async (challengeId: string, challengeName: string) => {
    if (!user?.uid) return;
    await scheduleChallengeReminder(user.uid, challengeId, challengeName);
  }, [user?.uid]);

  const notifyChallengeFriendActivity = useCallback(async (friendName: string, challengeName: string, challengeId: string) => {
    if (!user?.uid) return;
    await sendChallengeFriendActivityNotification(user.uid, friendName, challengeName, challengeId);
  }, [user?.uid]);

  // Tier 3: Community notifications
  const notifyConnectionRequest = useCallback(async (senderName: string, senderId: string) => {
    if (!user?.uid) return;
    await sendConnectionRequestNotification(user.uid, senderName, senderId);
  }, [user?.uid]);

  const notifyNewMessage = useCallback(async (senderName: string, messagePreview: string, conversationId: string, senderId: string) => {
    if (!user?.uid) return;
    await sendMessageNotification(user.uid, senderName, messagePreview, conversationId, senderId);
  }, [user?.uid]);

  const notifyGroupPost = useCallback(async (groupName: string, authorName: string, groupId: string) => {
    if (!user?.uid) return;
    await sendGroupPostNotification(user.uid, groupName, authorName, groupId);
  }, [user?.uid]);

  const notifyMention = useCallback(async (authorName: string, context: string) => {
    if (!user?.uid) return;
    await sendMentionNotification(user.uid, authorName, context);
  }, [user?.uid]);

  const notifyFriendMilestone = useCallback(async (friendName: string, milestoneType: string) => {
    if (!user?.uid) return;
    await sendFriendMilestoneNotification(user.uid, friendName, milestoneType);
  }, [user?.uid]);

  const value: NotificationContextType = {
    initializeNotifications,
    onHabitCompleted,
    onGoalProgressUpdated,
    onDailyCompletionAchieved,
    checkStreakProtection,
    // Tier 2
    onJoinChallenge,
    notifyChallengeFriendActivity,
    // Tier 3
    notifyConnectionRequest,
    notifyNewMessage,
    notifyGroupPost,
    notifyMention,
    notifyFriendMilestone,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notification context
 */
export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
