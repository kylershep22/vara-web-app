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
import { db } from '../config/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { NotificationPreferences, NotificationType, ReminderTime } from '../types';
import {
  getNotificationPreferences,
  isWithinQuietHours,
} from './firebase/notificationPreferences.service';
import { canSendSystemNotification, markNotificationSent } from './notificationThrottle';

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

const DAILY_RHYTHM_MESSAGES = {
  morning: [
    { title: 'Good morning', body: 'Your morning routine is ready whenever you are.' },
    { title: 'A small moment', body: 'Your morning routine is here when you\'re ready.' },
  ],
  evening: [
    { title: 'Good evening', body: 'Your evening routine is ready whenever you are.' },
    { title: 'Wind down', body: 'A small moment for your evening routine, if it feels right.' },
  ],
  default: [
    { title: 'Your routine is ready', body: 'A small moment for yourself, whenever you\'re ready.' },
  ],
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

export async function scheduleDailyRhythm(userId: string): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    if (!preferences.allNotificationsEnabled || !preferences.dailyRhythm?.enabled) {
      return null;
    }

    const reminderTime = preferences.dailyRhythm.reminderTime;
    if (!reminderTime) return null;

    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.DAILY_RHYTHM);
    await cancelNotificationById(notificationId);

    const timeOfDay = getTimeOfDay(reminderTime.hour);
    const messages = DAILY_RHYTHM_MESSAGES[timeOfDay];
    const message = messages[Math.floor(Math.random() * messages.length)];

    const trigger: Notifications.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: reminderTime.hour,
      minute: reminderTime.minute,
    };

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: { type: 'daily_reminder' as NotificationType, category: 'daily_rhythm' },
      },
      trigger,
    });

    return id;
  } catch (error) {
    console.error('Error scheduling daily rhythm:', error);
    return null;
  }
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

    if (preferences.insightsLearning?.enabled) {
      await scheduleInsightsNotification(userId);
    }
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
