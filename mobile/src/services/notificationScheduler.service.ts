/**
 * Notification Scheduler Service
 * 4 notification categories, brand-aligned, user-value-driven.
 *
 * Categories:
 * 1. Daily Rhythm — 1/day at user-selected time
 * 2. Insights & Learning — 2-3/week from static content pool
 * 3. Social & Connection — real-time DMs/connections, batched community
 * 4. Milestones & Reflection — calendar-time based, accomplishment framing
 */

import * as Notifications from 'expo-notifications';
import { auth, db } from '../config/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { NotificationPreferences, NotificationType, ReminderTime } from '../types';
import {
  getNotificationPreferences,
  isWithinQuietHours,
} from './firebase/notificationPreferences.service';
import { canSendSystemNotification, markNotificationSent } from './notificationThrottle';
import { logger } from '../utils/logger';
import { isValidReminderTime } from '../utils/reminderTime';
import { pendingDailyRhythmOverlay } from './notificationIntentStore';

// ==========================================
// NOTIFICATION IDENTIFIERS
// ==========================================

const NOTIFICATION_IDS = {
  DAILY_RHYTHM: 'daily-rhythm',
  INSIGHTS: 'insights-learning',
};

// ==========================================
// CONTENT POOLS (brand-compliant)
// ==========================================

// One message per time of day, Kyle's approved strings (NPM-1, 2026-10-01).
// TAXONOMY: "routine" is reserved for the user-created Routines feature; Vara's
// daily recommendation is a practice. The server copy in
// functions/src/notifications/dailyRhythm.js still says routine; its sender is
// paused and that mismatch is ledgered on the server rows.
const DAILY_RHYTHM_MESSAGES = {
  morning: { title: 'Good morning', body: 'Your morning practice is ready when you are.' },
  evening: { title: 'Good evening', body: 'Your evening practice is ready when you are.' },
  default: { title: 'Your practice is ready', body: 'Your daily practice is ready when you are.' },
};

// Static content pool: 22 insights (6 brain health + 16 intention)
const INSIGHT_CONTENT_POOL = [
  // Brain health messages (from BrainHealthInsightStrip)
  'Focus often improves when there\'s less competing demand on your attention.',
  'Supporting brain health creates the conditions where habits can stick.',
  'Small changes work better when they respect how the brain functions.',
  'Recovery isn\'t a break from progress. It\'s part of how the brain sustains it.',
  'Consistency doesn\'t require perfection.',
  'Habits are easier to maintain when they work with your brain\'s energy and attention.',
  // Focus & clarity insights
  'Consistent focus habits strengthen prefrontal cortex pathways over time.',
  'Even 5 minutes of focused practice builds your brain\'s attention networks.',
  'Focus improves not just with effort, but with recovery between sessions.',
  'Your brain\'s clarity peaks when you pair focused work with intentional rest.',
  // Regulation & recovery insights
  'Emotional regulation is a skill that strengthens with each mindful repetition.',
  'Recovery isn\'t passive. It\'s an active process your brain gets better at.',
  'Small regulation habits compound into greater emotional flexibility over time.',
  'Your nervous system adapts to the patterns you practice most consistently.',
  // Sustainable consistency insights
  'Consistency rewires your brain\'s default patterns, making habits feel automatic.',
  'The most sustainable habits are the ones you can do even on your hardest days.',
  'Your brain rewards consistency itself. Each completion strengthens the neural loop.',
  'Building momentum matters more than intensity. Show up, and the rest follows.',
  // Energy & resilience insights
  'Resilience is built through small, repeated energy management practices.',
  'Your body\'s energy systems adapt to consistent habits within weeks.',
  'Strategic recovery habits are as important as active energy-building ones.',
  'Energy resilience means bouncing back faster, and your habits train that response.',
];

const TIME_REFLECTION_MESSAGES: Record<string, { title: string; body: string }> = {
  '1_week': { title: 'One week with Vara', body: 'You\'ve been building your routine for a week. How\'s it feeling?' },
  '1_month': { title: 'A month with Vara', body: 'A month of supporting your brain health. Take a moment to notice what\'s shifted.' },
  '3_months': { title: 'Three months', body: 'Three months of showing up for yourself. What\'s felt most useful?' },
};

// ==========================================
// HELPERS
// ==========================================

function getNotificationId(userId: string, baseId: string): string {
  return `${userId}-${baseId}`;
}

function getTimeOfDay(hour: number): 'morning' | 'evening' | 'default' {
  if (hour < 12) return 'morning';
  if (hour >= 17) return 'evening';
  return 'default';
}

function selectInsightForDate(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return INSIGHT_CONTENT_POOL[dayOfYear % INSIGHT_CONTENT_POOL.length];
}

async function sendThrottledNotification(
  content: Notifications.NotificationContentInput,
  quietHours: NotificationPreferences['quietHours'],
): Promise<string | null> {
  if (isWithinQuietHours(quietHours)) return null;
  if (!(await canSendSystemNotification())) return null;

  const id = await Notifications.scheduleNotificationAsync({
    content,
    trigger: null,
  });
  await markNotificationSent();
  return id;
}

// ==========================================
// CATEGORY 1: DAILY RHYTHM
// One notification per day at user-selected time
// ==========================================

/** The pending-notification id of a user's daily rhythm. */
export function dailyRhythmNotificationId(userId: string): string {
  return getNotificationId(userId, NOTIFICATION_IDS.DAILY_RHYTHM);
}

/** The daily rhythm notification for a reminder at `hour`: one message per time of day. */
export function dailyRhythmContent(hour: number): Notifications.NotificationContentInput {
  const message = DAILY_RHYTHM_MESSAGES[getTimeOfDay(hour)];
  return {
    title: message.title,
    body: message.body,
    sound: true,
    priority: Notifications.AndroidNotificationPriority.DEFAULT,
    data: { type: 'daily_reminder' as NotificationType, category: 'daily_rhythm' },
  };
}

function dailyTrigger(time: ReminderTime): Notifications.DailyTriggerInput {
  return {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour: time.hour,
    minute: time.minute,
  };
}

/**
 * THE activation rule for the daily reminder (NPM-2, Kyle's Ruling 10 and
 * Decision 8): it fires when General notifications is on and the stored time is
 * a valid time. Nothing else decides it. The legacy dailyRhythm.enabled flag is
 * NOT consulted: it has no control on screen, so letting it gate the reminder
 * made it a hidden second switch. Returns the time to fire at, or null.
 */
export function desiredDailyRhythm(general: unknown, reminderTime: unknown): ReminderTime | null {
  if (general !== true || !isValidReminderTime(reminderTime)) return null;
  return { hour: reminderTime.hour, minute: reminderTime.minute };
}

/** The activation rule applied to a stored preferences document. */
function desiredDailyRhythmTime(preferences: NotificationPreferences): ReminderTime | null {
  return desiredDailyRhythm(preferences.allNotificationsEnabled, preferences.dailyRhythm?.reminderTime);
}

export async function scheduleDailyRhythm(userId: string): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    const reminderTime = desiredDailyRhythmTime(preferences);
    if (!reminderTime) return null;

    const notificationId = dailyRhythmNotificationId(userId);
    await cancelNotificationById(notificationId);

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: dailyRhythmContent(reminderTime.hour),
      trigger: dailyTrigger(reminderTime),
    });

    return id;
  } catch (error) {
    console.error('Error scheduling daily rhythm:', error);
    return null;
  }
}

// ==========================================
// DAILY RHYTHM RECONCILE (NPM-1)
// ==========================================

export type DailyRhythmReconcileOutcome =
  | 'scheduled'
  | 'cancelled'
  | 'read-failed'
  | 'schedule-failed';

/** A preference read that has not answered by then is treated as a failed read. */
const RECONCILE_READ_TIMEOUT_MS = 10_000;

/**
 * Overlapping reconciles run one at a time, in call order. Module-level rather
 * than per provider, so a reconcile started by onboarding is serialized with one
 * started by the foreground handler.
 */
let reconcileQueue: Promise<unknown> = Promise.resolve();

function readPreferencesWithTimeout(userId: string): Promise<NotificationPreferences> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('notification preferences read timed out')),
      RECONCILE_READ_TIMEOUT_MS
    );
    getNotificationPreferences(userId).then(
      (prefs) => {
        clearTimeout(timer);
        resolve(prefs);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function reconcileDailyRhythmNow(userId: string): Promise<DailyRhythmReconcileOutcome> {
  // The desired state comes first, from a FRESH read. Never a hook copy: those
  // are loaded once per uid and miss every write made through the service.
  let preferences: NotificationPreferences;
  try {
    preferences = await readPreferencesWithTimeout(userId);
  } catch (error) {
    // A read that FAILS or TIMES OUT changes nothing: whatever is scheduled
    // stays. That is not true of every offline read. The Firestore cache is the
    // SDK's in-memory default, and an offline read of a document already in it
    // RESOLVES from cache, with this session's pending writes applied; it lands
    // below and is acted on like any other. Only an offline read of a document
    // not in the cache (a cold start, say) rejects and ends here.
    logger.warn('[notificationScheduler] daily rhythm reconcile skipped, preferences unreadable', error);
    return 'read-failed';
  }

  // This device's pending changes win over what was read until Firestore
  // acknowledges or rejects them (NPM-2, Decision 2): a read served from the
  // session cache, or a server answer that predates the change, cannot put an
  // older schedule back. Only changes already persisted to the journal count.
  const pending = await pendingDailyRhythmOverlay(userId);
  return makeDailyRhythmMatch(
    userId,
    desiredDailyRhythm(
      pending.general ?? preferences.allNotificationsEnabled,
      pending.reminderTime ?? preferences.dailyRhythm?.reminderTime
    )
  );
}

/**
 * Make the device match a decided daily rhythm: scheduled at `time`, or
 * cancelled when `time` is null. Shared by the reconcile and the direct apply,
 * so the two can never disagree about what a decision does on the device.
 */
async function makeDailyRhythmMatch(
  userId: string,
  time: ReminderTime | null
): Promise<'scheduled' | 'cancelled' | 'schedule-failed'> {
  // Insights notifications are hidden pending INSIGHTS-V1 (NPM-1 ruling 2):
  // cancel any a previous build scheduled, and never schedule one. The stored
  // preference is left as it is.
  await cancelNotificationById(getNotificationId(userId, NOTIFICATION_IDS.INSIGHTS));

  // OS permission is not part of the decision (NPM-1 ruling 3), and neither is
  // serverPushEnabled (ruling 1): V1's daily rhythm is local only.
  const id = dailyRhythmNotificationId(userId);
  if (!time) {
    await cancelNotificationById(id);
    return 'cancelled';
  }

  // Scheduling under the same identifier replaces the pending request, so there
  // is no cancel of this id anywhere in a run that schedules it: a failure here
  // cannot leave the reminder cancelled.
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: dailyRhythmContent(time.hour),
      trigger: dailyTrigger(time),
    });
    return 'scheduled';
  } catch (error) {
    logger.warn('[notificationScheduler] daily rhythm schedule failed', error);
    return 'schedule-failed';
  }
}

/**
 * Make the device's daily rhythm match the user's stored preferences: scheduled
 * at reminderTime when General notifications is on and the time is valid,
 * cancelled otherwise (the activation rule, desiredDailyRhythm). Never rejects.
 */
export function reconcileDailyRhythm(userId: string): Promise<DailyRhythmReconcileOutcome> {
  return enqueueDailyRhythmWork(() => reconcileDailyRhythmNow(userId));
}

/** Run daily rhythm work on reconcileQueue, after everything already on it. */
function enqueueDailyRhythmWork<T>(work: () => Promise<T>): Promise<T> {
  const run = reconcileQueue.then(work, work);
  reconcileQueue = run.catch(() => undefined);
  return run;
}

// ==========================================
// DIRECT APPLY (NPM-2)
// ==========================================

export type DailyRhythmApplyOutcome = 'scheduled' | 'cancelled' | 'schedule-failed' | 'session-changed';

/** The signed-in user right now, or null. Read when queued work runs, not when it is queued. */
function currentSessionUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

/**
 * Apply the user's current General and daily-time choice to this device at once,
 * WITHOUT reading Firestore (Kyle's Decision 1 on Addendum 1). The caller passes
 * the values its user has just chosen; the activation rule decides, and the
 * daily reminder is scheduled or cancelled under its usual identifier. The
 * hidden Insights notification is cancelled exactly as the reconcile does.
 *
 * It runs on reconcileQueue, so whatever is already queued finishes first and
 * this decision is the last word on the device until something newer runs.
 *
 * QUEUE BOUND, documented rather than engineered around: a reconcile already in
 * flight holds the queue until its preferences read answers or times out
 * (RECONCILE_READ_TIMEOUT_MS, 10 seconds). Offline, an apply can therefore wait
 * up to 10 seconds before it takes effect on the device.
 *
 * SESSION GUARD: if the signed-in user is no longer `userId` when this runs, it
 * does nothing. A choice made by one account is never applied for another.
 * Never rejects.
 */
export function applyDailyRhythmChoice(
  userId: string,
  choice: { general: boolean; reminderTime: ReminderTime | null }
): Promise<DailyRhythmApplyOutcome> {
  return enqueueDailyRhythmWork(async () => {
    if (currentSessionUid() !== userId) return 'session-changed';
    return makeDailyRhythmMatch(userId, desiredDailyRhythm(choice.general, choice.reminderTime));
  });
}

// Alias for backward compatibility
export const scheduleDailyReminder = scheduleDailyRhythm;

// ==========================================
// CATEGORY 2: INSIGHTS & LEARNING
// 2-3 per week from static content pool
// ==========================================

export async function scheduleInsightsNotification(userId: string): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled || !preferences.insightsLearning?.enabled) {
      return null;
    }

    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.INSIGHTS);
    await cancelNotificationById(notificationId);

    const insight = selectInsightForDate();

    // Schedule for next day at 10 AM (or user's daily rhythm time if set)
    const hour = preferences.dailyRhythm?.reminderTime?.hour ?? 10;
    const minute = preferences.dailyRhythm?.reminderTime?.minute ?? 0;

    // Single-shot via calendar trigger (rescheduled by Cloud Functions or on next app open)
    const trigger: Notifications.CalendarTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: false,
    };

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: 'A brain-health insight for you',
        body: insight,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: { type: 'system' as NotificationType, category: 'insights_learning' },
      },
      trigger,
    });

    return id;
  } catch (error) {
    console.error('Error scheduling insights notification:', error);
    return null;
  }
}

// ==========================================
// CATEGORY 3: SOCIAL & CONNECTION
// DMs and connection requests: real-time
// Community digest: batched (OFF by default)
// ==========================================

export async function sendMessageNotification(
  userId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
  senderId: string,
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled || !preferences.socialConnection?.directMessages) {
      return null;
    }

    return await sendThrottledNotification(
      {
        title: senderName,
        body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'message' as NotificationType, category: 'social_connection', conversationId, senderId },
      },
      preferences.quietHours,
    );
  } catch (error) {
    console.error('Error sending message notification:', error);
    return null;
  }
}

export async function sendConnectionRequestNotification(
  userId: string,
  senderName: string,
  senderId: string,
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled || !preferences.socialConnection?.connectionRequests) {
      return null;
    }

    return await sendThrottledNotification(
      {
        title: `${senderName} would like to connect`,
        body: 'Tap to view their profile.',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'connection' as NotificationType, category: 'social_connection', senderId },
      },
      preferences.quietHours,
    );
  } catch (error) {
    console.error('Error sending connection request notification:', error);
    return null;
  }
}

export async function sendGroupPostNotification(
  userId: string,
  groupName: string,
  authorName: string,
  groupId: string,
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled || !preferences.socialConnection?.communityDigest) {
      return null;
    }

    return await sendThrottledNotification(
      {
        title: `New in ${groupName}`,
        body: `${authorName} shared something new.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: { type: 'community_activity' as NotificationType, category: 'social_connection', groupId },
      },
      preferences.quietHours,
    );
  } catch (error) {
    console.error('Error sending group post notification:', error);
    return null;
  }
}

export async function sendMentionNotification(
  userId: string,
  authorName: string,
  context: string,
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled || !preferences.socialConnection?.connectionRequests) {
      return null;
    }

    return await sendThrottledNotification(
      {
        title: `${authorName} mentioned you`,
        body: `In ${context}.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'community_activity' as NotificationType, category: 'social_connection' },
      },
      preferences.quietHours,
    );
  } catch (error) {
    console.error('Error sending mention notification:', error);
    return null;
  }
}

// ==========================================
// CATEGORY 4: MILESTONES & REFLECTION
// Calendar-time based, accomplishment framing
// ==========================================

export async function sendMilestoneNotification(
  userId: string,
  milestoneType: 'dailyCompletion',
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled) return null;

    if (milestoneType === 'dailyCompletion') {
      return await sendThrottledNotification(
        {
          title: 'All done for today',
          body: 'You completed everything on your list. Nicely done.',
          sound: true,
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
          data: { type: 'goal_completed' as NotificationType, category: 'milestones_reflection' },
        },
        preferences.quietHours,
      );
    }

    return null;
  } catch (error) {
    console.error('Error sending milestone notification:', error);
    return null;
  }
}

// ==========================================
// NOTIFICATION MANAGEMENT
// ==========================================

export async function cancelNotificationById(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Notification may not exist
  }
}

export async function cancelAllUserNotifications(userId: string): Promise<void> {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const userNotifications = allScheduled.filter((n) => n.identifier.startsWith(userId));
    for (const notification of userNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  } catch (error) {
    console.error('Error cancelling user notifications:', error);
  }
}

export async function initializeUserNotifications(userId: string): Promise<void> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled) {
      await cancelAllUserNotifications(userId);
      return;
    }

    await scheduleDailyRhythm(userId);
    // Insights notifications are not scheduled while hidden pending INSIGHTS-V1
    // (NPM-1 ruling 2); reconcileDailyRhythm cancels any already pending.
  } catch (error) {
    console.error('Error initializing user notifications:', error);
  }
}

export async function updateNotificationsFromPreferences(
  userId: string,
  preferences: NotificationPreferences,
): Promise<void> {
  if (!preferences.allNotificationsEnabled) {
    await cancelAllUserNotifications(userId);
    return;
  }
  await initializeUserNotifications(userId);
}
