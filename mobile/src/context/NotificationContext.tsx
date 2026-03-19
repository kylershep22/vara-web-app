/**
 * Notification Context
 * Manages notification scheduling, foreground consolidation, FCM token registration,
 * and provides notification functions to the app.
 *
 * Server push: When serverPushEnabled feature flag is on, local scheduling for
 * daily_rhythm and insights_learning is skipped (Cloud Functions handle those).
 * Social notifications still use local fallback for immediate delivery.
 */

import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { useNotificationPreferences } from '../hooks/useNotificationPreferences';
import { useToast } from './ToastContext';
import {
  setForegroundNotificationHandler,
  cancelAllNotifications,
  registerAndSaveFCMToken,
  isServerPushEnabled,
} from '../services/notifications.service';
import {
  initializeUserNotifications,
  updateNotificationsFromPreferences,
  cancelAllUserNotifications,
  checkAndSendGoalMilestone,
  sendMilestoneNotification,
  scheduleDailyReminder,
  sendConnectionRequestNotification,
  sendMessageNotification,
  sendGroupPostNotification,
  sendMentionNotification,
} from '../services/notificationScheduler.service';

interface NotificationContextType {
  initializeNotifications: () => Promise<void>;
  onGoalProgressUpdated: (progressPercent: number) => Promise<void>;
  onDailyCompletionAchieved: () => Promise<void>;
  notifyConnectionRequest: (senderName: string, senderId: string) => Promise<void>;
  notifyNewMessage: (senderName: string, messagePreview: string, conversationId: string, senderId: string) => Promise<void>;
  notifyGroupPost: (groupName: string, authorName: string, groupId: string) => Promise<void>;
  notifyMention: (authorName: string, context: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();
  const { showNotificationToast } = useToast();
  const appStateRef = useRef(AppState.currentState);
  const [serverPush, setServerPush] = useState(false);

  // Register foreground notification handler → route to toast
  useEffect(() => {
    setForegroundNotificationHandler((title: string, body: string) => {
      showNotificationToast(title, body);
    });
  }, [showNotificationToast]);

  // Register FCM token and check feature flag on login
  useEffect(() => {
    if (!user?.uid) return;

    const setup = async () => {
      // Register native push token for FCM
      await registerAndSaveFCMToken(user.uid);

      // Check if server push is enabled
      const enabled = await isServerPushEnabled();
      setServerPush(enabled);
    };

    setup();
  }, [user?.uid]);

  // Foreground consolidation: cancel pending, reschedule future
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active' && user?.uid) {
        await cancelAllNotifications();
        // Only reschedule locally if server push is off
        if (preferences?.allNotificationsEnabled && !serverPush) {
          await scheduleDailyReminder(user.uid);
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [user?.uid, preferences?.allNotificationsEnabled, serverPush]);

  // Initialize notifications when user logs in (only if master toggle is on)
  useEffect(() => {
    if (user?.uid && user?.emailVerified && preferences?.allNotificationsEnabled) {
      if (!serverPush) {
        // Local scheduling as fallback when server push is off
        initializeUserNotifications(user.uid);
      }
    }
  }, [user?.uid, user?.emailVerified, preferences?.allNotificationsEnabled, serverPush]);

  // Update notifications when preferences change
  useEffect(() => {
    if (user?.uid && preferences && !serverPush) {
      updateNotificationsFromPreferences(user.uid, preferences);
    }
  }, [user?.uid, preferences, serverPush]);

  // Cancel all notifications when user logs out
  useEffect(() => {
    if (!user) return;
    return () => {
      if (user?.uid) {
        cancelAllUserNotifications(user.uid);
      }
    };
  }, [user]);

  const initializeNotifications = useCallback(async () => {
    if (!user?.uid) return;
    if (!serverPush) {
      await initializeUserNotifications(user.uid);
    }
  }, [user?.uid, serverPush]);

  const onGoalProgressUpdated = useCallback(async (progressPercent: number) => {
    if (!user?.uid) return;
    await checkAndSendGoalMilestone(user.uid, progressPercent);
  }, [user?.uid]);

  const onDailyCompletionAchieved = useCallback(async () => {
    if (!user?.uid) return;
    await sendMilestoneNotification(user.uid, 'dailyCompletion');
  }, [user?.uid]);

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

  const value: NotificationContextType = {
    initializeNotifications,
    onGoalProgressUpdated,
    onDailyCompletionAchieved,
    notifyConnectionRequest,
    notifyNewMessage,
    notifyGroupPost,
    notifyMention,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
