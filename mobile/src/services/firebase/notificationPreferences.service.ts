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

  completionSound: {
    enabled: true,
    sound: 'singing-bowl',
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
  if (!db) {
    return {
      id: userId,
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    } as NotificationPreferences;
  }
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

    completionSound: {
      enabled: true,
      sound: 'singing-bowl' as const,
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
// STRANDED-TIME SALVAGE (V2 doc + legacy debris)
// ==========================================

/**
 * A V2 document can carry a stray `dailyReminders` object written by the old
 * NotificationOptInScreen, which wrote the legacy V1 shape onto V2 documents.
 * The scheduler reads `dailyRhythm.reminderTime`, so for anyone who never set
 * an onboarding anchor that field is still null and the time they picked was
 * never scheduled — with no way back, because NotificationSettingsScreen only
 * renders the time row when `dailyRhythm.reminderTime` is already truthy.
 *
 * This is deliberately NOT handled by widening isV1Schema. Routing these
 * documents through migratePreferencesToV2 would be destructive: that function
 * derives `dailyRhythm.enabled` from `dailyReminders.enabled` (absent on these
 * writes, so it would resolve to FALSE and disable the reminder), and resets
 * insightsLearning / socialConnection / milestonesReflection from V1 fields
 * that a V2 document does not have. It is correct for V1 documents only.
 *
 * So: a narrow, idempotent copy-and-clean, applied on read.
 */
function hasSalvageableReminderTime(data: Record<string, any>): boolean {
  const stranded = data.dailyReminders?.reminderTime;
  if (!stranded || typeof stranded !== 'object') return false;

  const { hour, minute } = stranded as Partial<ReminderTime>;
  const valid =
    typeof hour === 'number' &&
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour <= 23 &&
    typeof minute === 'number' &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute <= 59;
  if (!valid) return false;

  // Only when the canonical field has nothing to lose. A document whose
  // dailyRhythm.reminderTime is already set is left exactly as it is.
  return data.dailyRhythm?.reminderTime == null;
}

/**
 * Copy a stranded reminder time onto the canonical field and drop the legacy
 * object. Preserves an explicit `dailyRhythm.enabled === false` rather than
 * re-enabling a reminder the user turned off.
 */
async function salvageStrandedReminderTime(
  userId: string,
  data: Record<string, any>,
): Promise<NotificationPreferences> {
  const reminderTime: ReminderTime = {
    hour: data.dailyReminders.reminderTime.hour,
    minute: data.dailyReminders.reminderTime.minute,
  };
  const dailyRhythm = {
    enabled: data.dailyRhythm?.enabled ?? true,
    reminderTime,
  };

  const { dailyReminders: _dropped, ...rest } = data;
  const salvaged = { id: userId, ...rest, dailyRhythm } as NotificationPreferences;

  if (!db) return salvaged;

  try {
    await updateDoc(doc(db, 'notificationPreferences', userId), {
      dailyRhythm,
      dailyReminders: deleteField(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // The repair is idempotent and retried on the next read. Returning the
    // salvaged value anyway means this session already behaves correctly.
    console.error('Error salvaging stranded reminder time:', error);
  }

  return salvaged;
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
  if (!db) {
    console.warn('Firestore not initialized - returning default notification preferences');
    return {
      id: userId,
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    } as NotificationPreferences;
  }
  try {
    const docRef = doc(db, 'notificationPreferences', userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Detect and migrate old schema
      if (isV1Schema(data)) {
        return await migratePreferencesToV2(userId, data);
      }

      // V2 document carrying legacy debris: recover a stranded reminder time
      // before anyone reads dailyRhythm.reminderTime and finds it null.
      if (hasSalvageableReminderTime(data)) {
        return await salvageStrandedReminderTime(userId, data);
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
  if (!db) {
    console.warn('Firestore not initialized - returning default notification preferences');
    return {
      id: userId,
      userId,
      ...DEFAULT_NOTIFICATION_PREFERENCES,
    } as NotificationPreferences;
  }
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
  if (!db) {
    console.warn('Firestore not initialized - cannot update notification preferences');
    return;
  }
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
