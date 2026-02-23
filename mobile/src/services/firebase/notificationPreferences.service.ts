/**
 * Notification Preferences Service
 * Manages user notification settings in Firestore.
 *
 * V2 schema: 4 categories (daily_rhythm, insights_learning, social_connection, milestones_reflection).
 * On-the-fly migration from V1 (tier-based) schema when detected.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { NotificationPreferences, ReminderTime } from '../../types';

// ==========================================
// V2 DEFAULT PREFERENCES
// ==========================================

// New users start with notifications OFF until opt-in (Phase 2).
// Daily Rhythm: enabled but no time set (user picks via opt-in screen).
// Social: DMs and connection requests on (essential), community digest off.
// Everything else off.
export const DEFAULT_NOTIFICATION_PREFERENCES: Omit<
  NotificationPreferences,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  schemaVersion: 2,
  allNotificationsEnabled: false,

  quietHours: {
    enabled: true,
    startTime: { hour: 21, minute: 0 },
    endTime: { hour: 8, minute: 0 },
  },

  dailyRhythm: {
    enabled: true,
    reminderTime: null, // User must set via opt-in
  },

  insightsLearning: {
    enabled: false,
    frequency: 'twice_weekly',
  },

  socialConnection: {
    directMessages: true,
    connectionRequests: true,
    communityDigest: false,
  },

  milestonesReflection: {
    enabled: false,
  },
};

// ==========================================
// ON-THE-FLY MIGRATION (V1 → V2)
// ==========================================

/**
 * Detect V1 schema by checking for fields that only exist in the old tier-based system.
 */
function isV1Schema(data: Record<string, any>): boolean {
  return (
    !data.schemaVersion ||
    data.schemaVersion < 2 ||
    'streakProtection' in data ||
    'inactivityReminders' in data ||
    'challenges' in data
  );
}

/**
 * Migrate a V1 notification preferences document to V2 in-place.
 * Preserves user's meaningful settings while removing deprecated fields.
 */
async function migratePreferencesToV2(
  userId: string,
  data: Record<string, any>,
): Promise<NotificationPreferences> {
  const docRef = doc(db, 'notificationPreferences', userId);

  // Map old fields → new categories
  const migrated: Record<string, any> = {
    schemaVersion: 2,
    allNotificationsEnabled: data.allNotificationsEnabled ?? false,

    quietHours: data.quietHours ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHours,

    dailyRhythm: {
      enabled: data.dailyReminders?.enabled ?? false,
      reminderTime: data.dailyReminders?.reminderTime ?? null,
    },

    insightsLearning: {
      enabled: false, // New category, start off
      frequency: 'twice_weekly',
    },

    socialConnection: {
      directMessages: data.messages?.enabled ?? true,
      connectionRequests: data.community?.connectionRequests ?? true,
      communityDigest: data.community?.groupPosts ?? false,
    },

    milestonesReflection: {
      enabled: data.milestones?.enabled ?? false,
    },

    updatedAt: serverTimestamp(),
  };

  // Delete deprecated V1 fields
  const deletions: Record<string, any> = {
    streakProtection: deleteField(),
    inactivityReminders: deleteField(),
    challenges: deleteField(),
    implementationIntentions: deleteField(),
    wellnessSuggestions: deleteField(),
    weeklySummary: deleteField(),
    // Old category fields replaced by new structure
    dailyReminders: deleteField(),
    milestones: deleteField(),
    messages: deleteField(),
    community: deleteField(),
  };

  try {
    await updateDoc(docRef, { ...migrated, ...deletions });
  } catch {
    // If updateDoc fails (doc may not exist as expected), overwrite
    await setDoc(docRef, {
      ...migrated,
      userId,
      createdAt: data.createdAt ?? serverTimestamp(),
    });
  }

  return {
    id: userId,
    userId,
    ...migrated,
    createdAt: data.createdAt,
  } as NotificationPreferences;
}

// ==========================================
// CRUD OPERATIONS
// ==========================================

/**
 * Get user's notification preferences.
 * Automatically migrates V1 schema to V2 on load.
 */
export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  try {
    const docRef = doc(db, 'notificationPreferences', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Detect and migrate old schema
      if (isV1Schema(data)) {
        return await migratePreferencesToV2(userId, data);
      }

      return { id: docSnap.id, ...data } as NotificationPreferences;
    }

    // New user — create V2 defaults
    return await createDefaultNotificationPreferences(userId);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    throw error;
  }
}

/**
 * Create default V2 notification preferences for a new user.
 */
export async function createDefaultNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
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
 * Update notification preferences (partial updates supported).
 */
export async function updateNotificationPreferences(
  userId: string,
  updates: Partial<Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>,
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
 * Toggle master notifications on/off.
 */
export async function toggleAllNotifications(
  userId: string,
  enabled: boolean,
): Promise<void> {
  await updateNotificationPreferences(userId, { allNotificationsEnabled: enabled });
}

/**
 * Update quiet hours settings.
 */
export async function updateQuietHours(
  userId: string,
  quietHours: NotificationPreferences['quietHours'],
): Promise<void> {
  await updateNotificationPreferences(userId, { quietHours });
}

/**
 * Update a specific notification category.
 */
export async function updateNotificationCategory<K extends keyof NotificationPreferences>(
  userId: string,
  category: K,
  settings: NotificationPreferences[K],
): Promise<void> {
  await updateNotificationPreferences(userId, { [category]: settings } as any);
}

// ==========================================
// QUIET HOURS CHECK
// ==========================================

/**
 * Check if current time falls within quiet hours.
 */
export function isWithinQuietHours(
  quietHours: NotificationPreferences['quietHours'],
  currentTime?: Date,
): boolean {
  if (!quietHours?.enabled) return false;

  const now = currentTime || new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = quietHours.startTime.hour * 60 + quietHours.startTime.minute;
  const endMinutes = quietHours.endTime.hour * 60 + quietHours.endTime.minute;

  // Overnight quiet hours (e.g., 9 PM to 8 AM)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Same-day quiet hours
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ==========================================
// FORMAT HELPERS
// ==========================================

/**
 * Format a ReminderTime for display (e.g., "6:00 PM").
 */
export function formatReminderTime(time: ReminderTime): string {
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour >= 12 ? 'PM' : 'AM';
  const minute = time.minute.toString().padStart(2, '0');
  return `${hour12}:${minute} ${ampm}`;
}

/**
 * Parse a display time string back to ReminderTime.
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
