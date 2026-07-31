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
  cancelAllScheduledExceptFocusComplete,
  getAllScheduledNotifications,
  registerAndSaveFCMToken,
  isServerPushEnabled,
  addNotificationResponseListener,
  getLastNotificationResponse,
} from '../services/notifications.service';
import {
  getActiveFocusSession,
  clearActiveFocusSession,
  finalizeFocusSession,
  planFocusCompleteLaunch,
} from '../services/firebase/focusSession.service';
import { logger } from '../utils/logger';
import { syncAllReminders } from '../services/reminderScheduler.service';
import { isHabitCompletedToday } from '../services/firebase/habits.service';
import { navigationRef } from '../navigation/AppNavigator';
import { ROUTES } from '../navigation/routes';
import {
  initializeUserNotifications,
  updateNotificationsFromPreferences,
  cancelAllUserNotifications,
  sendMilestoneNotification,
  scheduleDailyReminder,
  sendConnectionRequestNotification,
  sendMessageNotification,
  sendGroupPostNotification,
  sendMentionNotification,
} from '../services/notificationScheduler.service';

interface NotificationContextType {
  initializeNotifications: () => Promise<void>;
  onDailyCompletionAchieved: () => Promise<void>;
  notifyConnectionRequest: (senderName: string, senderId: string) => Promise<void>;
  notifyNewMessage: (senderName: string, messagePreview: string, conversationId: string, senderId: string) => Promise<void>;
  notifyGroupPost: (groupName: string, authorName: string, groupId: string) => Promise<void>;
  notifyMention: (authorName: string, context: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/** Resolve once the navigation container is ready (bounded), for cold-launch routing. */
async function waitForNavReady(timeoutMs = 5000): Promise<boolean> {
  const start = Date.now();
  while (!navigationRef.isReady()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return true;
}

/** Navigate to the focus timer, optionally bound to a completed block's id. */
function navigateToFocusTimer(completedSessionId?: string): void {
  if (!navigationRef.isReady()) return;
  const navigate = navigationRef.navigate as (name: string, params?: object) => void;
  navigate(ROUTES.FocusTimer, completedSessionId ? { completedSessionId } : undefined);
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { preferences } = useNotificationPreferences();
  const { showNotificationToast } = useToast();
  const appStateRef = useRef(AppState.currentState);
  const [serverPush, setServerPush] = useState(false);

  // Reminder reconciliation is cancel-then-reschedule, and two effects run it:
  // the login effect below and the foreground handler. On a cold start they
  // overlap (the app becomes active while auth is still resolving), and an
  // interleaving lets one run's cancel wipe what the other just scheduled.
  // Serializing them makes the outcome independent of that timing.
  const reminderWorkRef = useRef<Promise<void>>(Promise.resolve());
  const runExclusive = useCallback((work: () => Promise<void>): Promise<void> => {
    // Chained on both settle paths, so one failure cannot stall the queue.
    const next = reminderWorkRef.current.then(work, work);
    reminderWorkRef.current = next.catch(() => {});
    return next;
  }, []);

  // Register foreground notification handler → route to toast
  useEffect(() => {
    setForegroundNotificationHandler(async (title: string, body: string, data?: Record<string, unknown>) => {
      // Suppress habit reminders for already-completed habits
      if (data?.type === 'habit-reminder' && data?.habitId) {
        try {
          const completed = await isHabitCompletedToday(data.habitId as string);
          if (completed) return; // Suppress
        } catch {
          // If check fails, show the notification anyway
        }
      }
      showNotificationToast(title, body);
    });
  }, [showNotificationToast, user?.uid]);

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

  // Foreground consolidation: cancel pending, reschedule future. Spares the
  // pending focus-complete notification (the OS owns it; the timer relies on it
  // firing at endsAt) so a mid-block glance at the phone no longer wipes it.
  // Every other type is cleared exactly as before.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active' && user?.uid) {
        const uid = user.uid;
        await runExclusive(async () => {
          // INSTRUMENTATION (temporary, for the Slice B device walk). The three
          // counts below are the whole question: if AFTER-CANCEL drops to ~0 and
          // AFTER-SYNC does not climb back, the schedule was wiped and never
          // refilled — and the reminder can never arrive regardless of what the
          // create path did. warn, not log: __DEV__ is false in preview builds.
          const beforeCancel = (await getAllScheduledNotifications()).length;
          logger.warn(`[NotificationContext] FOREGROUND pending BEFORE cancel=${beforeCancel}`);

          await cancelAllScheduledExceptFocusComplete();

          const afterCancel = (await getAllScheduledNotifications()).length;
          logger.warn(`[NotificationContext] FOREGROUND pending AFTER cancel=${afterCancel}`);

          // Only reschedule locally if server push is off
          if (preferences?.allNotificationsEnabled && !serverPush) {
            await scheduleDailyReminder(uid);
          }
          // Habit and routine reminders are re-synced regardless of the
          // server-push toggle, matching the login effect below: server push
          // covers daily rhythm and insights, never reminders. Without this,
          // the cancel above wipes every pending routine reminder — and, once
          // they exist, every habit reminder — until the next login, so a
          // glance at the phone silently emptied the schedule for the day.
          // Ordered after the cancel, or it would clear what it just wrote.
          await syncAllReminders(uid);

          const afterSync = (await getAllScheduledNotifications()).length;
          logger.warn(
            `[NotificationContext] FOREGROUND pending AFTER syncAllReminders=${afterSync} (serverPush=${serverPush} prefsMaster=${String(preferences?.allNotificationsEnabled)})`
          );
        });
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [user?.uid, preferences?.allNotificationsEnabled, serverPush, runExclusive]);

  // Initialize notifications when user logs in (only if master toggle is on)
  useEffect(() => {
    if (user?.uid && user?.emailVerified && preferences?.allNotificationsEnabled) {
      const uid = user.uid;
      // Serialized against the foreground handler above; see runExclusive.
      runExclusive(async () => {
        if (!serverPush) {
          // Local scheduling as fallback when server push is off
          await initializeUserNotifications(uid);
        }
        // Always sync reminders (independent of server push toggle)
        await syncAllReminders(uid);
      });
    }
  }, [user?.uid, user?.emailVerified, preferences?.allNotificationsEnabled, serverPush, runExclusive]);

  // Update notifications when preferences change
  useEffect(() => {
    if (user?.uid && preferences && !serverPush) {
      updateNotificationsFromPreferences(user.uid, preferences);
    }
  }, [user?.uid, preferences, serverPush]);

  // Deep link routing for notification taps
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (!data?.type || !navigationRef.isReady()) return;

      if (data.type === 'habit-reminder') {
        navigationRef.navigate(ROUTES.Rhythms as never);
      } else if (data.type === 'routine-reminder') {
        // Routines live on the Rhythms tab (the focus-timer route is `FocusTimer`,
        // not `Focus`; the old `Focus` target was dead).
        navigationRef.navigate(ROUTES.Rhythms as never, { tab: 'routines' } as never);
      } else if (data.type === 'focus-complete') {
        // Warm/background tap: the block's row was finalized by the live
        // foreground reconcile; land the completion surface bound to it so the
        // inline reflection can write.
        const id = typeof data.focusSessionId === 'string' ? data.focusSessionId : undefined;
        navigateToFocusTimer(id);
      }
    });

    return () => subscription.remove();
  }, []);

  // Cold-launch deep link: the app was opened by TAPPING a focus-complete
  // notification while killed, so the warm response listener above never saw the
  // tap. Read the launch response, finalize the elapsed block from its persisted
  // record (stable id), and route to the completion surface bound to it. A
  // missing / not-yet-elapsed / other-user record degrades to opening Focus
  // plain (no fabricated completion, no crash).
  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;
    let cancelled = false;
    (async () => {
      const response = await getLastNotificationResponse();
      if (cancelled || !response) return;
      const data = response.notification.request.content.data;
      if (data?.type !== 'focus-complete') return;

      const record = await getActiveFocusSession();
      const plan = planFocusCompleteLaunch(record, uid, Date.now());
      if (plan.finalize) {
        try {
          await finalizeFocusSession({
            focusSessionId: plan.finalize.focusSessionId,
            userId: plan.finalize.userId,
            durationMinutes: plan.finalize.durationMinutes,
            type: plan.finalize.type,
          });
        } catch (error) {
          logger.error('[NotificationContext] cold-launch finalize failed', error);
        }
        await clearActiveFocusSession();
      }
      if (cancelled) return;
      if (!(await waitForNavReady())) return;
      navigateToFocusTimer(plan.completedSessionId ?? undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

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
