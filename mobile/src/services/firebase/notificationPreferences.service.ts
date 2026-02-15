/**
 * Notification Preferences Service
 * Manages user notification settings in Firestore
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { NotificationPreferences, ReminderTime } from '../../types';

// Default notification preferences for new users
// PHILOSOPHY: Start minimal, let users opt-in to more notifications
// Only essential notifications are enabled by default
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  // Master toggle
  allNotificationsEnabled: true,

  // Quiet Hours - default 9 PM to 8 AM (generous quiet hours)
  quietHours: {
    enabled: true,
    startTime: { hour: 21, minute: 0 },
    endTime: { hour: 8, minute: 0 },
  },

  // ==========================================
  // TIER 1: Retention-Critical (ESSENTIAL - ON BY DEFAULT)
  // ==========================================

  // Streak Protection - enabled, but only as in-app
  streakProtection: {
    enabled: true,
    push: false, // Start with in-app only, less intrusive
    inApp: true,
    reminderTime: { hour: 9, minute: 0 },
  },

  // Milestone Celebrations - only big milestones via push
  milestones: {
    enabled: true,
    push: false, // In-app celebrations only by default
    inApp: true,
    habitStreaks: true,
    goalProgress: true,
    dailyCompletion: false, // Too frequent, off by default
  },

  // Daily Reminders - OFF by default (let user opt-in)
  dailyReminders: {
    enabled: false, // Users should opt-in to daily reminders
    push: false,
    inApp: true,
    reminderTime: { hour: 18, minute: 0 },
    fourThreeTwoOne: true,
    habits: true,
  },

  // ==========================================
  // TIER 2: Engagement Boosters (OFF BY DEFAULT)
  // ==========================================

  // Challenge Notifications - OFF by default
  challenges: {
    enabled: false,
    push: false,
    inApp: true,
    checkInReminders: true,
    friendActivity: false,
    leaderboardChanges: false,
    reminderTime: { hour: 19, minute: 0 },
  },

  // Implementation Intentions - OFF by default
  implementationIntentions: {
    enabled: false,
    push: false,
    inApp: true,
  },

  // Weekly Summary - enabled (low frequency, high value)
  weeklySummary: {
    enabled: true,
    push: false, // In-app only
    inApp: true,
    frequency: 'weekly',
    dayOfWeek: 0, // Sunday
    time: { hour: 18, minute: 0 },
    includeEmail: false,
  },

  // ==========================================
  // TIER 3: Re-engagement & Community (MINIMAL)
  // ==========================================

  // Inactivity Reminders - only 7-day by default
  inactivityReminders: {
    enabled: true,
    push: false,
    inApp: true,
    threeDayReminder: false, // Too soon
    sevenDayReminder: true,  // Just right
    fourteenDayReminder: false, // If 7-day didn't work, 14-day won't
  },

  // Community Activity - only essential (mentions, connection requests)
  community: {
    enabled: true,
    push: true, // Direct interactions should push
    inApp: true,
    friendMilestones: false, // Can be noisy
    groupPosts: false,        // Can be noisy
    mentions: true,           // Direct attention needed
    connectionRequests: true, // Direct interaction
  },

  // Direct Messages - essential, enabled
  messages: {
    enabled: true,
    push: true, // Direct messages are important
    inApp: true,
    frequency: 'realtime',
  },

  // AI Wellness Suggestions - OFF by default (can feel intrusive)
  wellnessSuggestions: {
    enabled: false,
    push: false,
    inApp: true,
    frequency: 'daily',
    basedOnMood: true,
    basedOnStress: true,
    basedOnSleep: true,
  },
};

// Simplified notification presets for easy configuration
export const NOTIFICATION_PRESETS = {
  minimal: {
    // Only direct messages and connection requests
    allNotificationsEnabled: true,
    streakProtection: { enabled: false, push: false, inApp: false },
    milestones: { enabled: false, push: false, inApp: false },
    dailyReminders: { enabled: false, push: false, inApp: false },
    challenges: { enabled: false, push: false, inApp: false },
    implementationIntentions: { enabled: false, push: false, inApp: false },
    weeklySummary: { enabled: false, push: false, inApp: false },
    inactivityReminders: { enabled: false, push: false, inApp: false },
    community: { enabled: true, push: true, inApp: true, friendMilestones: false, groupPosts: false, mentions: true, connectionRequests: true },
    messages: { enabled: true, push: true, inApp: true, frequency: 'realtime' as const },
    wellnessSuggestions: { enabled: false, push: false, inApp: false },
  },
  balanced: {
    // Default settings (essential only)
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  },
  engaged: {
    // More notifications for engaged users
    allNotificationsEnabled: true,
    quietHours: { enabled: true, startTime: { hour: 22, minute: 0 }, endTime: { hour: 7, minute: 0 } },
    streakProtection: { enabled: true, push: true, inApp: true, reminderTime: { hour: 9, minute: 0 } },
    milestones: { enabled: true, push: true, inApp: true, habitStreaks: true, goalProgress: true, dailyCompletion: true },
    dailyReminders: { enabled: true, push: true, inApp: true, reminderTime: { hour: 18, minute: 0 }, fourThreeTwoOne: true, habits: true },
    challenges: { enabled: true, push: true, inApp: true, checkInReminders: true, friendActivity: true, leaderboardChanges: false, reminderTime: { hour: 19, minute: 0 } },
    implementationIntentions: { enabled: true, push: true, inApp: true },
    weeklySummary: { enabled: true, push: true, inApp: true, frequency: 'weekly' as const, dayOfWeek: 0, time: { hour: 18, minute: 0 }, includeEmail: false },
    inactivityReminders: { enabled: true, push: true, inApp: true, threeDayReminder: true, sevenDayReminder: true, fourteenDayReminder: false },
    community: { enabled: true, push: true, inApp: true, friendMilestones: true, groupPosts: true, mentions: true, connectionRequests: true },
    messages: { enabled: true, push: true, inApp: true, frequency: 'realtime' as const },
    wellnessSuggestions: { enabled: true, push: false, inApp: true, frequency: 'daily' as const, basedOnMood: true, basedOnStress: true, basedOnSleep: true },
  },
} as const;

export type NotificationPresetKey = keyof typeof NOTIFICATION_PRESETS;

/**
 * Get user's notification preferences
 * Returns default preferences if none exist
 */
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const docRef = doc(db, 'notificationPreferences', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as NotificationPreferences;
    }

    // Create default preferences if they don't exist
    const defaultPrefs = await createDefaultNotificationPreferences(userId);
    return defaultPrefs;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    throw error;
  }
}

/**
 * Create default notification preferences for a new user
 */
export async function createDefaultNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const docRef = doc(db, 'notificationPreferences', userId);
    const preferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(docRef, preferences);

    return {
      id: userId,
      ...preferences,
    } as NotificationPreferences;
  } catch (error) {
    console.error('Error creating default notification preferences:', error);
    throw error;
  }
}

/**
 * Update notification preferences
 * Supports partial updates
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const docRef = doc(db, 'notificationPreferences', userId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Toggle master notifications on/off
 */
export async function toggleAllNotifications(userId: string, enabled: boolean): Promise<void> {
  await updateNotificationPreferences(userId, { allNotificationsEnabled: enabled });
}

/**
 * Update quiet hours settings
 */
export async function updateQuietHours(
  userId: string,
  quietHours: NotificationPreferences['quietHours']
): Promise<void> {
  await updateNotificationPreferences(userId, { quietHours });
}

/**
 * Update a specific notification category
 */
export async function updateNotificationCategory<K extends keyof NotificationPreferences>(
  userId: string,
  category: K,
  settings: NotificationPreferences[K]
): Promise<void> {
  await updateNotificationPreferences(userId, { [category]: settings } as any);
}

/**
 * Check if notifications should be sent based on quiet hours
 */
export function isWithinQuietHours(
  quietHours: NotificationPreferences['quietHours'],
  currentTime?: Date
): boolean {
  if (!quietHours.enabled) return false;

  const now = currentTime || new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const startTimeInMinutes = quietHours.startTime.hour * 60 + quietHours.startTime.minute;
  const endTimeInMinutes = quietHours.endTime.hour * 60 + quietHours.endTime.minute;

  // Handle overnight quiet hours (e.g., 10 PM to 7 AM)
  if (startTimeInMinutes > endTimeInMinutes) {
    // Quiet hours span midnight
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
  } else {
    // Quiet hours within same day
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  }
}

/**
 * Check if a specific notification type is enabled
 */
export function isNotificationEnabled(
  preferences: NotificationPreferences,
  category: keyof NotificationPreferences,
  checkPush: boolean = true
): boolean {
  // Master toggle check
  if (!preferences.allNotificationsEnabled) return false;

  const categorySettings = preferences[category];
  if (typeof categorySettings === 'object' && categorySettings !== null && 'enabled' in categorySettings) {
    if (!categorySettings.enabled) return false;
    if (checkPush && 'push' in categorySettings) {
      return categorySettings.push === true;
    }
    return true;
  }

  return true;
}

/**
 * Apply a notification preset
 */
export async function applyNotificationPreset(
  userId: string,
  preset: NotificationPresetKey
): Promise<void> {
  const presetSettings = NOTIFICATION_PRESETS[preset];
  await updateNotificationPreferences(userId, presetSettings as any);
}

/**
 * Format reminder time for display
 */
export function formatReminderTime(time: ReminderTime): string {
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour >= 12 ? 'PM' : 'AM';
  const minute = time.minute.toString().padStart(2, '0');
  return `${hour12}:${minute} ${ampm}`;
}

/**
 * Parse time string to ReminderTime
 */
export function parseTimeToReminder(timeString: string): ReminderTime {
  const [time, period] = timeString.split(' ');
  const [hourStr, minuteStr] = time.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (period?.toUpperCase() === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period?.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}
