/**
 * Notification Scheduler Service
 * Handles scheduling and managing notifications based on user preferences
 *
 * Tier 1 (Retention-Critical):
 * - Consistency Protection ("Never Miss Twice")
 * - Milestone Celebrations
 * - Daily Check-in Reminders
 *
 * Design Philosophy: Uses supportive, growth-oriented language.
 * Aligns with Vara's "Progress Without Pressure" brand pillar.
 */

import * as Notifications from 'expo-notifications';
import { db } from '../config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import {
  NotificationPreferences,
  NotificationType,
  ReminderTime,
} from '../types';
import {
  getNotificationPreferences,
  isWithinQuietHours,
  isNotificationEnabled,
  formatReminderTime,
} from './firebase/notificationPreferences.service';

// ==========================================
// NOTIFICATION IDENTIFIERS
// Used to manage scheduled notifications
// ==========================================

const NOTIFICATION_IDS = {
  STREAK_PROTECTION: 'streak-protection',
  DAILY_REMINDER: 'daily-reminder',
  FOUR_THREE_TWO_ONE: 'four-three-two-one',
  HABIT_REMINDER: 'habit-reminder',
  CHALLENGE_REMINDER: 'challenge-reminder',
  WEEKLY_SUMMARY: 'weekly-summary',
};

// ==========================================
// NOTIFICATION CONTENT TEMPLATES
// ==========================================

// Consistency protection messages - supportive, not pressuring
const CONSISTENCY_PROTECTION_MESSAGES = [
  {
    title: "A gentle reminder 🌱",
    body: "You've been consistent for {{days}} days. Today's a great day to continue.",
  },
  {
    title: "Quick check-in? 💪",
    body: "Just a few minutes to keep your rhythm going.",
  },
  {
    title: "You're doing great 🌿",
    body: "{{days}} days of showing up. One small action keeps the momentum.",
  },
  {
    title: "When you're ready ⏰",
    body: "A quick check-in is all it takes to keep building your rhythm.",
  },
];

const MILESTONE_MESSAGES = {
  // Consistency milestones - growth-oriented language
  streak: {
    7: { title: "7 Days of Showing Up! 🌱", body: "A week of consistency. You're building something meaningful." },
    14: { title: "Two Weeks of Growth! 🌿", body: "14 days of showing up. This is becoming part of who you are." },
    21: { title: "21 Days Strong! 💪", body: "Three weeks of consistency. You're building lasting habits." },
    30: { title: "A Month of Growth! 🌳", body: "30 days of dedication. This is who you're becoming." },
    60: { title: "60 Days of Commitment! 🌟", body: "Two months of growth. Your consistency is inspiring." },
    90: { title: "90 Days of Transformation! 🌈", body: "A quarter year of showing up. You've truly grown." },
    180: { title: "Half a Year! ⭐", body: "180 days of consistent progress. Remarkable." },
    365: { title: "One Year of Growth! 👑", body: "365 days of showing up. You're a wellness champion." },
  },
  goal: {
    25: { title: "25% Progress! 🎯", body: "You're a quarter of the way to your goal!" },
    50: { title: "Halfway There! 🏃", body: "50% complete - keep up the momentum!" },
    75: { title: "Almost Done! 🌟", body: "75% - the finish line is in sight!" },
    100: { title: "Goal Achieved! 🎉", body: "Congratulations! You've reached your goal!" },
  },
  dailyCompletion: {
    title: "All Done for Today! ✨",
    body: "You completed all your habits and tasks today!",
  },
};

const DAILY_REMINDER_MESSAGES = [
  {
    title: "Good evening! 🌙",
    body: "Time for your daily wellness check-in.",
  },
  {
    title: "How was your day? 📝",
    body: "Take a moment to reflect and track your progress.",
  },
  {
    title: "Evening check-in time 🌅",
    body: "Log your habits and plan for tomorrow.",
  },
];

const HABIT_REMINDER_MESSAGES = [
  {
    title: "Habit Check-In 📋",
    body: "Don't forget to complete your daily habits!",
  },
  {
    title: "Time for Habits! ✅",
    body: "A few habits completed today keeps procrastination away.",
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Get a random message from an array of messages
 */
function getRandomMessage<T>(messages: T[]): T {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Replace template variables in a message
 */
function formatMessage(message: { title: string; body: string }, variables: Record<string, string | number>): { title: string; body: string } {
  let title = message.title;
  let body = message.body;

  Object.entries(variables).forEach(([key, value]) => {
    title = title.replace(`{{${key}}}`, String(value));
    body = body.replace(`{{${key}}}`, String(value));
  });

  return { title, body };
}

/**
 * Convert ReminderTime to trigger input
 */
function reminderTimeToTrigger(time: ReminderTime, repeats: boolean = true): Notifications.DailyTriggerInput {
  return {
    hour: time.hour,
    minute: time.minute,
    repeats,
  };
}

/**
 * Get notification identifier with user prefix
 */
function getNotificationId(userId: string, baseId: string): string {
  return `${userId}-${baseId}`;
}

// ==========================================
// TIER 1: STREAK PROTECTION
// ==========================================

/**
 * Schedule streak protection notification
 * Called when user hasn't completed any activities for the day
 */
export async function scheduleStreakProtectionNotification(
  userId: string,
  currentStreak: number
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'streakProtection')) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    // Get random message and format with consistency days
    const message = getRandomMessage(CONSISTENCY_PROTECTION_MESSAGES);
    const formatted = formatMessage(message, { days: currentStreak });

    // Cancel any existing streak protection notification
    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.STREAK_PROTECTION);
    await cancelNotificationById(notificationId);

    // Schedule notification for the reminder time
    const trigger = reminderTimeToTrigger(preferences.streakProtection.reminderTime, false);

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'streak_protection' as NotificationType,
          streakDays: currentStreak,
        },
      },
      trigger,
    });

    console.log(`Scheduled streak protection notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error scheduling streak protection notification:', error);
    return null;
  }
}

/**
 * Cancel streak protection notification (when user completes activity)
 */
export async function cancelStreakProtectionNotification(userId: string): Promise<void> {
  try {
    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.STREAK_PROTECTION);
    await cancelNotificationById(notificationId);
    console.log('Cancelled streak protection notification');
  } catch (error) {
    console.error('Error cancelling streak protection notification:', error);
  }
}

// ==========================================
// TIER 1: MILESTONE CELEBRATIONS
// ==========================================

/**
 * Send milestone celebration notification
 */
export async function sendMilestoneNotification(
  userId: string,
  milestoneType: 'streak' | 'goal' | 'dailyCompletion',
  value?: number,
  habitName?: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'milestones')) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    // Check specific milestone setting
    if (milestoneType === 'streak' && !preferences.milestones.habitStreaks) {
      return null;
    }
    if (milestoneType === 'goal' && !preferences.milestones.goalProgress) {
      return null;
    }
    if (milestoneType === 'dailyCompletion' && !preferences.milestones.dailyCompletion) {
      return null;
    }

    let content: { title: string; body: string };

    if (milestoneType === 'dailyCompletion') {
      content = MILESTONE_MESSAGES.dailyCompletion;
    } else if (milestoneType === 'streak' && value) {
      // Find the milestone message for this streak value
      const milestoneMessage = MILESTONE_MESSAGES.streak[value as keyof typeof MILESTONE_MESSAGES.streak];
      if (!milestoneMessage) return null;
      content = milestoneMessage;
      if (habitName) {
        content = { ...content, body: `${habitName}: ${content.body}` };
      }
    } else if (milestoneType === 'goal' && value) {
      const milestoneMessage = MILESTONE_MESSAGES.goal[value as keyof typeof MILESTONE_MESSAGES.goal];
      if (!milestoneMessage) return null;
      content = milestoneMessage;
    } else {
      return null;
    }

    // Send immediately
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: `${milestoneType}_milestone` as NotificationType,
          milestoneValue: value,
        },
      },
      trigger: null, // Send immediately
    });

    console.log(`Sent milestone notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending milestone notification:', error);
    return null;
  }
}

/**
 * Check and send streak milestone if applicable
 */
export async function checkAndSendStreakMilestone(
  userId: string,
  habitName: string,
  newStreak: number
): Promise<void> {
  const milestones = Object.keys(MILESTONE_MESSAGES.streak).map(Number);

  if (milestones.includes(newStreak)) {
    await sendMilestoneNotification(userId, 'streak', newStreak, habitName);
  }
}

/**
 * Check and send goal progress milestone if applicable
 */
export async function checkAndSendGoalMilestone(
  userId: string,
  progressPercent: number
): Promise<void> {
  const milestones = Object.keys(MILESTONE_MESSAGES.goal).map(Number);

  if (milestones.includes(progressPercent)) {
    await sendMilestoneNotification(userId, 'goal', progressPercent);
  }
}

// ==========================================
// TIER 1: DAILY CHECK-IN REMINDERS
// ==========================================

/**
 * Schedule daily check-in reminder
 */
export async function scheduleDailyReminder(userId: string): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'dailyReminders')) {
      return null;
    }

    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.DAILY_REMINDER);

    // Cancel existing notification
    await cancelNotificationById(notificationId);

    // Get random message
    const message = getRandomMessage(DAILY_REMINDER_MESSAGES);

    // Schedule daily notification
    const trigger = reminderTimeToTrigger(preferences.dailyReminders.reminderTime, true);

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'daily_reminder' as NotificationType,
        },
      },
      trigger,
    });

    console.log(`Scheduled daily reminder: ${id}`);
    return id;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
}

/**
 * Schedule habit reminder
 */
export async function scheduleHabitReminder(userId: string): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if habit reminders are enabled
    if (!isNotificationEnabled(preferences, 'dailyReminders') || !preferences.dailyReminders.habits) {
      return null;
    }

    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.HABIT_REMINDER);

    // Cancel existing notification
    await cancelNotificationById(notificationId);

    // Get random message
    const message = getRandomMessage(HABIT_REMINDER_MESSAGES);

    // Schedule 2 hours before daily reminder time
    const reminderTime = { ...preferences.dailyReminders.reminderTime };
    reminderTime.hour = (reminderTime.hour - 2 + 24) % 24; // 2 hours earlier

    const trigger = reminderTimeToTrigger(reminderTime, true);

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'habit_reminder' as NotificationType,
        },
      },
      trigger,
    });

    console.log(`Scheduled habit reminder: ${id}`);
    return id;
  } catch (error) {
    console.error('Error scheduling habit reminder:', error);
    return null;
  }
}

/**
 * Schedule 4-3-2-1 reminder
 */
export async function scheduleFourThreeTwoOneReminder(userId: string): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if 4-3-2-1 reminders are enabled
    if (!isNotificationEnabled(preferences, 'dailyReminders') || !preferences.dailyReminders.fourThreeTwoOne) {
      return null;
    }

    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.FOUR_THREE_TWO_ONE);

    // Cancel existing notification
    await cancelNotificationById(notificationId);

    // Schedule at the daily reminder time
    const trigger = reminderTimeToTrigger(preferences.dailyReminders.reminderTime, true);

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: "Time for your 4-3-2-1! 🧠",
        body: "Capture your wins, lessons, and gratitude for today.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'daily_reminder' as NotificationType,
          subType: 'four_three_two_one',
        },
      },
      trigger,
    });

    console.log(`Scheduled 4-3-2-1 reminder: ${id}`);
    return id;
  } catch (error) {
    console.error('Error scheduling 4-3-2-1 reminder:', error);
    return null;
  }
}

// ==========================================
// NOTIFICATION MANAGEMENT
// ==========================================

/**
 * Cancel a notification by its identifier
 */
export async function cancelNotificationById(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    // Notification may not exist, which is fine
    console.log(`Could not cancel notification ${identifier}:`, error);
  }
}

/**
 * Cancel all notifications for a user
 */
export async function cancelAllUserNotifications(userId: string): Promise<void> {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();

    const userNotifications = allScheduled.filter(
      (n) => n.identifier.startsWith(userId)
    );

    for (const notification of userNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    console.log(`Cancelled ${userNotifications.length} notifications for user ${userId}`);
  } catch (error) {
    console.error('Error cancelling user notifications:', error);
  }
}

/**
 * Initialize all scheduled notifications for a user based on their preferences
 */
export async function initializeUserNotifications(userId: string): Promise<void> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Only schedule if master toggle is on
    if (!preferences.allNotificationsEnabled) {
      await cancelAllUserNotifications(userId);
      return;
    }

    // Schedule Tier 1 notifications
    await scheduleDailyReminder(userId);
    await scheduleHabitReminder(userId);
    await scheduleFourThreeTwoOneReminder(userId);

    // Schedule Tier 2 notifications
    await scheduleWeeklySummary(userId);

    // Note: Challenge reminders are scheduled when user joins a challenge
    // Note: Inactivity reminders are typically handled by server-side scheduled functions

    console.log('Initialized all user notifications');
  } catch (error) {
    console.error('Error initializing user notifications:', error);
  }
}

/**
 * Update notifications when preferences change
 */
export async function updateNotificationsFromPreferences(
  userId: string,
  preferences: NotificationPreferences
): Promise<void> {
  // If master toggle is off, cancel all
  if (!preferences.allNotificationsEnabled) {
    await cancelAllUserNotifications(userId);
    return;
  }

  // Reinitialize based on new preferences
  await initializeUserNotifications(userId);
}

// ==========================================
// STREAK TRACKING HELPERS
// ==========================================

/**
 * Check if user has any activity today
 * Used to determine if streak protection should be triggered
 */
export async function checkUserHasActivityToday(userId: string): Promise<boolean> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    // Check habits completions
    const habitsQuery = query(
      collection(db, 'habits'),
      where('userId', '==', userId),
      where('active', '==', true)
    );

    const habitsSnap = await getDocs(habitsQuery);

    for (const habitDoc of habitsSnap.docs) {
      const completionsRef = collection(db, 'habits', habitDoc.id, 'completions');
      const todayStr = today.toISOString().split('T')[0];
      const completionDoc = await getDoc(doc(completionsRef, todayStr));

      if (completionDoc.exists() && completionDoc.data()?.completed) {
        return true;
      }
    }

    // Check if user logged 4-3-2-1 today
    const fourThreeTwoOneQuery = query(
      collection(db, 'fourThreeTwoOne'),
      where('userId', '==', userId),
      where('date', '==', today.toISOString().split('T')[0])
    );

    const fourThreeTwoOneSnap = await getDocs(fourThreeTwoOneQuery);
    if (!fourThreeTwoOneSnap.empty) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking user activity:', error);
    return false;
  }
}

/**
 * Get user's current longest active streak
 */
export async function getUserMaxStreak(userId: string): Promise<number> {
  try {
    const habitsQuery = query(
      collection(db, 'habits'),
      where('userId', '==', userId),
      where('active', '==', true)
    );

    const habitsSnap = await getDocs(habitsQuery);
    let maxStreak = 0;

    for (const habitDoc of habitsSnap.docs) {
      const streak = habitDoc.data()?.streak || 0;
      if (streak > maxStreak) {
        maxStreak = streak;
      }
    }

    return maxStreak;
  } catch (error) {
    console.error('Error getting user max streak:', error);
    return 0;
  }
}

/**
 * Schedule streak protection check
 * Should be called daily (e.g., in the morning) to check if user needs reminder
 */
export async function scheduleStreakProtectionCheck(userId: string): Promise<void> {
  try {
    const hasActivity = await checkUserHasActivityToday(userId);

    if (!hasActivity) {
      const maxStreak = await getUserMaxStreak(userId);

      if (maxStreak > 0) {
        await scheduleStreakProtectionNotification(userId, maxStreak);
      }
    } else {
      // User already has activity, cancel any pending streak protection
      await cancelStreakProtectionNotification(userId);
    }
  } catch (error) {
    console.error('Error in streak protection check:', error);
  }
}

// ==========================================
// TIER 2: CHALLENGE NOTIFICATIONS
// ==========================================

const CHALLENGE_MESSAGES = {
  reminder: [
    {
      title: "Challenge Check-In Time! 🏆",
      body: "Don't forget to log your progress for {{challengeName}}.",
    },
    {
      title: "Your Challenge Awaits! 💪",
      body: "Time to check in on {{challengeName}}.",
    },
  ],
  friendActivity: {
    title: "Friend Update! 🌟",
    body: "{{friendName}} just made progress in {{challengeName}}.",
  },
  leaderboardChange: {
    title: "Leaderboard Update! 📊",
    body: "You've moved to position #{{position}} in {{challengeName}}!",
  },
};

/**
 * Schedule challenge reminder notification
 */
export async function scheduleChallengeReminder(
  userId: string,
  challengeId: string,
  challengeName: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if challenge notifications are enabled
    if (!isNotificationEnabled(preferences, 'challenges') || !preferences.challenges.checkInReminders) {
      return null;
    }

    const notificationId = getNotificationId(userId, `${NOTIFICATION_IDS.CHALLENGE_REMINDER}-${challengeId}`);

    // Cancel existing notification
    await cancelNotificationById(notificationId);

    // Get random message and format
    const message = getRandomMessage(CHALLENGE_MESSAGES.reminder);
    const formatted = formatMessage(message, { challengeName });

    // Schedule at the challenge reminder time
    const trigger = reminderTimeToTrigger(preferences.challenges.reminderTime, true);

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'challenge_reminder' as NotificationType,
          challengeId,
        },
      },
      trigger,
    });

    console.log(`Scheduled challenge reminder: ${id}`);
    return id;
  } catch (error) {
    console.error('Error scheduling challenge reminder:', error);
    return null;
  }
}

/**
 * Send challenge friend activity notification
 */
export async function sendChallengeFriendActivityNotification(
  userId: string,
  friendName: string,
  challengeName: string,
  challengeId: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'challenges') || !preferences.challenges.friendActivity) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const formatted = formatMessage(CHALLENGE_MESSAGES.friendActivity, { friendName, challengeName });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'challenge_update' as NotificationType,
          challengeId,
        },
      },
      trigger: null, // Send immediately
    });

    console.log(`Sent challenge friend activity notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending challenge friend activity notification:', error);
    return null;
  }
}

/**
 * Send leaderboard change notification
 */
export async function sendLeaderboardChangeNotification(
  userId: string,
  position: number,
  challengeName: string,
  challengeId: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'challenges') || !preferences.challenges.leaderboardChanges) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const formatted = formatMessage(CHALLENGE_MESSAGES.leaderboardChange, { position, challengeName });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'challenge_update' as NotificationType,
          challengeId,
        },
      },
      trigger: null, // Send immediately
    });

    console.log(`Sent leaderboard change notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending leaderboard change notification:', error);
    return null;
  }
}

// ==========================================
// TIER 2: WEEKLY SUMMARY
// ==========================================

/**
 * Schedule weekly summary notification
 */
export async function scheduleWeeklySummary(userId: string): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if weekly summary is enabled
    if (!isNotificationEnabled(preferences, 'weeklySummary')) {
      return null;
    }

    const notificationId = getNotificationId(userId, NOTIFICATION_IDS.WEEKLY_SUMMARY);

    // Cancel existing notification
    await cancelNotificationById(notificationId);

    // Schedule for the configured day and time
    const trigger: Notifications.WeeklyTriggerInput = {
      weekday: (preferences.weeklySummary.dayOfWeek + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7, // Expo uses 1-7 (Sunday=1)
      hour: preferences.weeklySummary.time.hour,
      minute: preferences.weeklySummary.time.minute,
      repeats: true,
    };

    const id = await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: "Your Weekly Wellness Summary 📊",
        body: "See your progress, wins, and insights from this week.",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'weekly_summary' as NotificationType,
        },
      },
      trigger,
    });

    console.log(`Scheduled weekly summary: ${id}`);
    return id;
  } catch (error) {
    console.error('Error scheduling weekly summary:', error);
    return null;
  }
}

// ==========================================
// TIER 3: INACTIVITY REMINDERS
// ==========================================

const INACTIVITY_MESSAGES = {
  3: {
    title: "We miss you! 👋",
    body: "It's been a few days. A quick check-in can help you stay on track.",
  },
  7: {
    title: "Time to restart your journey 🌱",
    body: "One week without a check-in. Your goals are waiting for you.",
  },
  14: {
    title: "Your wellness journey awaits 🌟",
    body: "It's been two weeks. Every day is a new opportunity to start fresh.",
  },
};

/**
 * Send inactivity reminder notification
 * Called by a server-side function or background task
 */
export async function sendInactivityReminder(
  userId: string,
  daysInactive: 3 | 7 | 14
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if inactivity reminders are enabled
    if (!isNotificationEnabled(preferences, 'inactivityReminders')) {
      return null;
    }

    // Check specific day threshold settings
    if (
      (daysInactive === 3 && !preferences.inactivityReminders.threeDayReminder) ||
      (daysInactive === 7 && !preferences.inactivityReminders.sevenDayReminder) ||
      (daysInactive === 14 && !preferences.inactivityReminders.fourteenDayReminder)
    ) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const message = INACTIVITY_MESSAGES[daysInactive];

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: message.title,
        body: message.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'inactivity' as NotificationType,
          daysInactive,
        },
      },
      trigger: null, // Send immediately
    });

    console.log(`Sent ${daysInactive}-day inactivity reminder: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending inactivity reminder:', error);
    return null;
  }
}

// ==========================================
// TIER 3: COMMUNITY NOTIFICATIONS
// ==========================================

const COMMUNITY_MESSAGES = {
  friendMilestone: {
    title: "Celebrate {{friendName}}! 🎉",
    body: "Your friend just hit a {{milestoneType}} milestone.",
  },
  groupPost: {
    title: "New in {{groupName}} 💬",
    body: "{{authorName}} shared something new in your group.",
  },
  mention: {
    title: "You were mentioned! 👋",
    body: "{{authorName}} mentioned you in {{context}}.",
  },
  connectionRequest: {
    title: "New Connection Request 🤝",
    body: "{{senderName}} wants to connect with you.",
  },
};

/**
 * Send friend milestone notification
 */
export async function sendFriendMilestoneNotification(
  userId: string,
  friendName: string,
  milestoneType: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'community') || !preferences.community.friendMilestones) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const formatted = formatMessage(COMMUNITY_MESSAGES.friendMilestone, { friendName, milestoneType });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'community_activity' as NotificationType,
          subType: 'friend_milestone',
        },
      },
      trigger: null,
    });

    console.log(`Sent friend milestone notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending friend milestone notification:', error);
    return null;
  }
}

/**
 * Send group post notification
 */
export async function sendGroupPostNotification(
  userId: string,
  groupName: string,
  authorName: string,
  groupId: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'community') || !preferences.community.groupPosts) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const formatted = formatMessage(COMMUNITY_MESSAGES.groupPost, { groupName, authorName });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        data: {
          type: 'community_activity' as NotificationType,
          subType: 'group_post',
          groupId,
        },
      },
      trigger: null,
    });

    console.log(`Sent group post notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending group post notification:', error);
    return null;
  }
}

/**
 * Send mention notification
 */
export async function sendMentionNotification(
  userId: string,
  authorName: string,
  context: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'community') || !preferences.community.mentions) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const formatted = formatMessage(COMMUNITY_MESSAGES.mention, { authorName, context });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'community_activity' as NotificationType,
          subType: 'mention',
        },
      },
      trigger: null,
    });

    console.log(`Sent mention notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending mention notification:', error);
    return null;
  }
}

/**
 * Send connection request notification
 */
export async function sendConnectionRequestNotification(
  userId: string,
  senderName: string,
  senderId: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if notifications are enabled
    if (!isNotificationEnabled(preferences, 'community') || !preferences.community.connectionRequests) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const formatted = formatMessage(COMMUNITY_MESSAGES.connectionRequest, { senderName });

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: formatted.title,
        body: formatted.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'connection' as NotificationType,
          senderId,
        },
      },
      trigger: null,
    });

    console.log(`Sent connection request notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending connection request notification:', error);
    return null;
  }
}

// ==========================================
// TIER 3: MESSAGE NOTIFICATIONS
// ==========================================

/**
 * Send direct message notification
 */
export async function sendMessageNotification(
  userId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
  senderId: string
): Promise<string | null> {
  try {
    const preferences = await getNotificationPreferences(userId);

    // Check if message notifications are enabled
    if (!isNotificationEnabled(preferences, 'messages')) {
      return null;
    }

    // Check quiet hours
    if (isWithinQuietHours(preferences.quietHours)) {
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: senderName,
        body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'message' as NotificationType,
          conversationId,
          senderId,
        },
      },
      trigger: null,
    });

    console.log(`Sent message notification: ${id}`);
    return id;
  } catch (error) {
    console.error('Error sending message notification:', error);
    return null;
  }
}

export default {
  // Tier 1: Streak Protection
  scheduleStreakProtectionNotification,
  cancelStreakProtectionNotification,
  scheduleStreakProtectionCheck,

  // Tier 1: Milestones
  sendMilestoneNotification,
  checkAndSendStreakMilestone,
  checkAndSendGoalMilestone,

  // Tier 1: Daily Reminders
  scheduleDailyReminder,
  scheduleHabitReminder,
  scheduleFourThreeTwoOneReminder,

  // Tier 2: Challenges
  scheduleChallengeReminder,
  sendChallengeFriendActivityNotification,
  sendLeaderboardChangeNotification,

  // Tier 2: Weekly Summary
  scheduleWeeklySummary,

  // Tier 3: Inactivity
  sendInactivityReminder,

  // Tier 3: Community
  sendFriendMilestoneNotification,
  sendGroupPostNotification,
  sendMentionNotification,
  sendConnectionRequestNotification,

  // Tier 3: Messages
  sendMessageNotification,

  // Management
  cancelNotificationById,
  cancelAllUserNotifications,
  initializeUserNotifications,
  updateNotificationsFromPreferences,

  // Helpers
  checkUserHasActivityToday,
  getUserMaxStreak,
};
