/**
 * Reminder Scheduler Service
 * Schedules and manages daily notifications for habit triggers and routine reminders.
 * Uses expo-notifications DailyTriggerInput for repeating daily notifications.
 */

import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import { Habit } from '../types';
import { Routine, fetchUserRoutines, calculateTotalDuration } from './firebase/routines.service';
import { getNotificationPreferences } from './firebase/notificationPreferences.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Time Parsing ──────────────────────────────────────────────

/**
 * Parse a human-readable time string into hour/minute.
 * Handles: "7:00 AM", "7:00 PM", "07:00", "14:30", "7:00am", "7:00pm"
 * Returns null for unparseable strings.
 */
export function parseTimeString(value: string): { hour: number; minute: number } | null {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim().toLowerCase();

  // Try 12-hour format: "7:00 AM", "7:00am", "12:30 pm"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const period = match12[3];

    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;

    if (period === 'am' && hour === 12) hour = 0;
    else if (period === 'pm' && hour !== 12) hour += 12;

    return { hour, minute };
  }

  // Try 24-hour format: "07:00", "14:30"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    return { hour, minute };
  }

  return null;
}

// ─── Permission & Preference Checks ───────────────────────────

async function hasNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// ─── Habit Reminders ──────────────────────────────────────────

/**
 * Schedule a daily notification for a habit's time-based cue.
 * Only schedules if habit.cue?.type === 'time' and cue.value is parseable.
 */
export async function scheduleHabitReminder(habit: Habit): Promise<void> {
  if (!habit.cue || habit.cue.type !== 'time' || !habit.cue.value) {
    return;
  }

  const parsed = parseTimeString(habit.cue.value);
  if (!parsed) {
    logger.warn(`[reminderScheduler] Cannot parse habit cue time: "${habit.cue.value}" for habit ${habit.id}`);
    return;
  }

  if (!(await hasNotificationPermission())) {
    logger.warn('[reminderScheduler] Notification permission not granted, skipping habit reminder');
    return;
  }

  const identifier = `habit-reminder-${habit.id}`;

  // Cancel existing before scheduling (prevents duplicates)
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // May not exist, that's fine
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `Time for ${habit.name}`,
        body: `Your ${habit.cue.value} reminder`,
        sound: true,
        data: { type: 'habit-reminder', habitId: habit.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
      },
    });
    logger.log(`[reminderScheduler] Scheduled habit reminder: ${identifier} at ${parsed.hour}:${String(parsed.minute).padStart(2, '0')}`);
  } catch (error) {
    logger.error(`[reminderScheduler] Failed to schedule habit reminder:`, error);
  }
}

/**
 * Cancel a scheduled habit reminder.
 */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`habit-reminder-${habitId}`);
    logger.log(`[reminderScheduler] Cancelled habit reminder: habit-reminder-${habitId}`);
  } catch {
    // May not exist, that's fine
  }
}

// ─── Routine Reminders ────────────────────────────────────────

/**
 * Schedule a daily notification for a routine's reminderTime.
 * Only schedules if routine.active === true and reminderTime is non-null and parseable.
 */
export async function scheduleRoutineReminder(routine: Routine): Promise<void> {
  if (!routine.active || !routine.reminderTime) {
    return;
  }

  const parsed = parseTimeString(routine.reminderTime);
  if (!parsed) {
    logger.warn(`[reminderScheduler] Cannot parse routine reminderTime: "${routine.reminderTime}" for routine ${routine.id}`);
    return;
  }

  if (!(await hasNotificationPermission())) {
    logger.warn('[reminderScheduler] Notification permission not granted, skipping routine reminder');
    return;
  }

  const identifier = `routine-reminder-${routine.id}`;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // May not exist
  }

  const totalDuration = calculateTotalDuration(routine.activities);
  const typeLabel = routine.type === 'custom' ? '' : `${routine.type} `;

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: `Your ${typeLabel}routine is ready`,
        body: `${routine.name} · ${totalDuration} min`,
        sound: true,
        data: { type: 'routine-reminder', routineId: routine.id, routineType: routine.type },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: parsed.hour,
        minute: parsed.minute,
      },
    });
    logger.log(`[reminderScheduler] Scheduled routine reminder: ${identifier} at ${parsed.hour}:${String(parsed.minute).padStart(2, '0')}`);
  } catch (error) {
    logger.error(`[reminderScheduler] Failed to schedule routine reminder:`, error);
  }
}

/**
 * Cancel a scheduled routine reminder.
 */
export async function cancelRoutineReminder(routineId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`routine-reminder-${routineId}`);
    logger.log(`[reminderScheduler] Cancelled routine reminder: routine-reminder-${routineId}`);
  } catch {
    // May not exist
  }
}

// ─── Sync All Reminders ───────────────────────────────────────

/**
 * Re-sync all habit and routine reminders.
 * Called on app foreground to handle habits/routines changed while app was killed.
 */
export async function syncAllReminders(userId: string): Promise<void> {
  if (!(await hasNotificationPermission())) {
    logger.log('[reminderScheduler] No notification permission, skipping sync');
    return;
  }

  try {
    const prefs = await getNotificationPreferences(userId);
    if (!prefs?.allNotificationsEnabled) {
      logger.log('[reminderScheduler] Notifications disabled, skipping sync');
      return;
    }
  } catch {
    logger.warn('[reminderScheduler] Could not read preferences, skipping sync');
    return;
  }

  // 1. Get all scheduled notifications and cancel reminder ones
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const reminderNotifications = allScheduled.filter(
      (n) =>
        n.identifier.startsWith('habit-reminder-') ||
        n.identifier.startsWith('routine-reminder-')
    );

    for (const n of reminderNotifications) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    logger.log(`[reminderScheduler] Cancelled ${reminderNotifications.length} stale reminders`);
  } catch (error) {
    logger.error('[reminderScheduler] Error cancelling stale reminders:', error);
  }

  // 2. Re-schedule habit reminders
  if (db) {
    try {
      const habitsQuery = query(
        collection(db, 'habits'),
        where('userId', '==', userId),
        where('active', '==', true)
      );
      const habitsSnapshot = await getDocs(habitsQuery);
      const habits = habitsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Habit));

      for (const habit of habits) {
        if (habit.cue?.type === 'time') {
          await scheduleHabitReminder(habit);
        }
      }
      logger.log(`[reminderScheduler] Synced ${habits.filter((h) => h.cue?.type === 'time').length} habit reminders`);
    } catch (error) {
      logger.error('[reminderScheduler] Error syncing habit reminders:', error);
    }
  }

  // 3. Re-schedule routine reminders
  try {
    const routines = await fetchUserRoutines(userId);
    for (const routine of routines) {
      if (routine.active && routine.reminderTime) {
        await scheduleRoutineReminder(routine);
      }
    }
    logger.log(`[reminderScheduler] Synced ${routines.filter((r) => r.active && r.reminderTime).length} routine reminders`);
  } catch (error) {
    logger.error('[reminderScheduler] Error syncing routine reminders:', error);
  }
}
