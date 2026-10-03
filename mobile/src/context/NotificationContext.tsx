/**
 * Notification Context
 * Manages notification scheduling, foreground consolidation, push token registration,
 * and provides notification functions to the app.
 *
 * It is the one owner of push token registration (NPM-3a-ii, Kyle's II-D1):
 * see pushRegistration.service for what a pass reads and writes.
 *
 * The daily rhythm is local only in V1 (Kyle's ruling D1 and NPM-1 ruling 1):
 * whether it should exist is decided by reconcileDailyRhythm from a FRESH read of
 * the user's preferences, never from a hook copy and never from serverPushEnabled.
 */

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import {
  setForegroundNotificationHandler,
  cancelAllScheduledExceptFocusComplete,
  addNotificationResponseListener,
  getLastNotificationResponse,
  onNotificationPermissionGranted,
  dismissAllDeliveredNotifications,
} from '../services/notifications.service';
import {
  ensurePushRegistration,
  onDeviceTokenChange,
} from '../services/pushRegistration.service';
import {
  getActiveFocusSession,
  clearActiveFocusSession,
  finalizeFocusSession,
  planFocusCompleteLaunch,
} from '../services/firebase/focusSession.service';
import { logger } from '../utils/logger';
import {
  syncAllReminders,
  cancelAllRoutineReminders,
  invalidateRoutineReminderAttempts,
  isRoutineReminderId,
} from '../services/reminderScheduler.service';
import { navigationRef } from '../navigation/AppNavigator';
import { ROUTES } from '../navigation/routes';
import { NAV_TARGETS } from '../navigation/navTargets';
import {
  reconcileDailyRhythm,
  dailyRhythmNotificationId,
  cancelAllUserNotifications,
  sendMilestoneNotification,
  sendConnectionRequestNotification,
  sendMessageNotification,
  sendGroupPostNotification,
  sendMentionNotification,
} from '../services/notificationScheduler.service';
import {
  replayNotificationIntent,
  clearNotificationIntent,
} from '../services/notificationIntentJournal';

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
  const { user, isAuthReady } = useAuth();
  const { showNotificationToast } = useToast();
  const appStateRef = useRef(AppState.currentState);

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
      // Habit reminders left V1 (V1-HABITS-RETIREMENT, Kyle ruling 2 of
      // 2026-09-29). A stale one scheduled by an earlier build shows nothing.
      if (data?.type === 'habit-reminder') return;
      showNotificationToast(title, body);
    });
  }, [showNotificationToast, user?.uid]);

  // Push token registration (NPM-3a-ii, Kyle's II-D1 and II-D12). Only for a
  // signed-in user with a verified email. Runs at sign-in and on a cold start
  // with a restored session, when the email becomes verified (the effect
  // re-runs on that change), after any in-app permission grant and on a token
  // change. The return to the app is in the foreground handler below. Every
  // pass goes through runExclusive, and a pass never prompts.
  const registrationUid = user?.uid;
  const emailVerified = !!user?.emailVerified;
  useEffect(() => {
    if (!registrationUid || !emailVerified) return;
    const uid = registrationUid;
    const register = () => {
      void runExclusive(() => ensurePushRegistration(uid));
    };
    register();
    const stopGrants = onNotificationPermissionGranted(register);
    const tokenChanges = onDeviceTokenChange(register);
    return () => {
      stopGrants();
      tokenChanges.remove();
    };
  }, [registrationUid, emailVerified, runExclusive]);

  // Foreground consolidation: cancel pending, reschedule future. Spares the
  // pending focus-complete notification (the OS owns it; the timer relies on it
  // firing at endsAt) so a mid-block glance at the phone no longer wipes it, the
  // current user's daily rhythm, which the reconcile owns (NPM-1), and routine
  // reminders, which syncAllReminders owns (ROUTINE-REMINDER-OFFLINE-RESILIENCE).
  // Every other identifier is cleared exactly as before, including ids older
  // builds left behind that nothing else cancels.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appStateRef.current !== 'active' && nextState === 'active' && user?.uid) {
        const uid = user.uid;
        await runExclusive(async () => {
          // The current user's daily rhythm and every routine reminder are
          // spared: the reconciles below own them, and a read there that fails
          // or times out must leave them scheduled. (An offline read served from
          // the session cache does not fail; the daily rhythm reconcile acts on
          // it, with this device's pending changes laid over it.)
          const dailyRhythmId = dailyRhythmNotificationId(uid);
          await cancelAllScheduledExceptFocusComplete(
            (id) => id === dailyRhythmId || isRoutineReminderId(id)
          );
          // Decided from a fresh read (NPM-1). The provider used to read its own
          // preferences copy here, loaded once per uid, so a new user's first
          // leave-and-return cancelled the reminder onboarding had just set.
          await reconcileDailyRhythm(uid);
          // Routine reminders are reconciled from a bounded server read: on
          // success, anything outside this user's desired set is cancelled
          // (another account's leftovers included); on failure, timeout or no
          // OS permission they are left exactly as they were. The read is
          // bounded, so a hung read cannot hold this queue indefinitely.
          await syncAllReminders(uid);
        });
        // Push token registration on every return to the app (II-D1), after
        // the reminder work and on the same queue.
        if (user.emailVerified) {
          await runExclusive(() => ensurePushRegistration(uid));
        }
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [user?.uid, user?.emailVerified, runExclusive]);

  // Reconcile the daily rhythm on sign-in and cold start. The reconcile reads the
  // preferences fresh and decides; nothing here consults a stored copy.
  //
  // Replay first (NPM-2): any notification preference change this user made
  // that Firestore never acknowledged, persisted in the pending-intent journal,
  // is sent again. Replay waits only for the local disk read, never for the
  // network, and the reconcile lays the same pending changes over its read.
  useEffect(() => {
    if (user?.uid && user?.emailVerified) {
      const uid = user.uid;
      // Serialized against the foreground handler above; see runExclusive.
      runExclusive(async () => {
        await replayNotificationIntent(uid);
        await reconcileDailyRhythm(uid);
      });
    }
  }, [user?.uid, user?.emailVerified, runExclusive]);

  // Sync routine reminders on sign-in. Independent of the General notifications
  // preference and of server push: a routine reminder depends only on the user
  // setting one, a valid time and OS permission (Kyle's ruling R-A, 2026-10-01).
  useEffect(() => {
    if (user?.uid && user?.emailVerified) {
      const uid = user.uid;
      // Serialized against the foreground handler above; see runExclusive.
      runExclusive(async () => {
        await syncAllReminders(uid);
      });
    }
  }, [user?.uid, user?.emailVerified, runExclusive]);

  // Deep link routing for notification taps
  useEffect(() => {
    const subscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (!data?.type || !navigationRef.isReady()) return;

      // Same one-cast-at-the-boundary idiom as navigateToFocusTimer above:
      // navigationRef is untyped, and casting the function once beats casting
      // every argument to `never`, which is what previously let a route name
      // that no longer existed type-check.
      const navigate = navigationRef.navigate as (
        name: string,
        params?: object
      ) => void;

      // Routines live on the planning surface. NAV_TARGETS.plan resolves to the
      // surface that is actually registered (ROUTES.Rhythms, the legacy tab, is
      // never mounted since FOUR_PILLAR_IA went true).
      //
      // A habit reminder is stale: habits left V1 (V1-HABITS-RETIREMENT, Kyle
      // ruling 2 of 2026-09-29) and nothing schedules one any more. Its tap goes
      // Home by the same root-ref path the weekly screens use, never to the
      // planning surface and never to a habit destination.
      if (data.type === 'habit-reminder') {
        navigate(ROUTES.Main, { screen: ROUTES.Home });
      } else if (data.type === 'routine-reminder') {
        navigate(NAV_TARGETS.plan, { tab: 'routines' });
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

  // The uid as of the latest render, so the cleanup below can tell a session
  // that ended from the same user's object being replaced.
  const currentUidRef = useRef(user?.uid);
  currentUidRef.current = user?.uid;

  // Cancel all notifications when user logs out
  useEffect(() => {
    if (!user) return;
    return () => {
      // Only when the session actually ended: the uid became null (sign-out,
      // account deletion, a lost token) or a different uid. Not when the same
      // user's object is replaced, and not on unmount (NPM-1 T5: replacing the
      // object used to cancel the daily rhythm too).
      if (user?.uid && currentUidRef.current !== user.uid) {
        // Every notification already delivered goes too (Kyle's II-D15), on
        // this and every other authoritative session-loss path. Local, never
        // rejects. logout() has usually done it already; twice is harmless.
        void dismissAllDeliveredNotifications();
        // The departing user's pending notification changes go with the
        // session (NPM-2): cleared from memory and made inert synchronously,
        // removed from disk after. Never applied to the next account.
        void clearNotificationIntent(user.uid);
        cancelAllUserNotifications(user.uid);
        // No routine reminder survives loss of the owning user session
        // (ruling R-I). Routine reminder ids carry no user id, so the call
        // above never matches them.
        // Any sync attempt still in flight loses ownership now, synchronously,
        // so its late completion cannot schedule the departing user's
        // reminders while the cancel below waits its turn.
        invalidateRoutineReminderAttempts();
        // Serialized, so the next account's sign-in sync cannot interleave.
        runExclusive(cancelAllRoutineReminders);
      }
    };
  }, [user, runExclusive]);

  // Auth has resolved and nobody is signed in. Covers the start with no
  // session, where there is no transition for the cleanup above to see: a
  // device signed out on an older build still holds that account's routine
  // reminders. Never while auth is still resolving, and never with a user,
  // whose sign-in sync owns cancelling and rescheduling (ruling R-I).
  const sessionUid = user?.uid;
  useEffect(() => {
    if (isAuthReady && !sessionUid) {
      runExclusive(cancelAllRoutineReminders);
      // The pending notification journal is deliberately NOT cleared here (Kyle's
      // ruling 1 on Build A): a transient unauthenticated startup state is not an
      // authoritative session loss. A record left by another account is
      // discarded when the next account's journal is read, before any replay.
    }
  }, [isAuthReady, sessionUid, runExclusive]);

  const initializeNotifications = useCallback(async () => {
    if (!user?.uid) return;
    await reconcileDailyRhythm(user.uid);
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
