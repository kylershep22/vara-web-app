/**
 * Reminder Scheduler Service
 * Schedules and manages daily notifications for routine reminders. Habit
 * reminders left V1 (V1-HABITS-RETIREMENT): nothing schedules them any more, and
 * syncAllReminders still cancels any a previous build left behind.
 * Uses expo-notifications DailyTriggerInput for repeating daily notifications.
 */

import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import { Routine, fetchUserRoutines, calculateTotalDuration } from './firebase/routines.service';

// Every routine reminder is scheduled under this prefix plus the routine id.
const ROUTINE_REMINDER_PREFIX = 'routine-reminder-';

function routineReminderId(routineId: string): string {
  return `${ROUTINE_REMINDER_PREFIX}${routineId}`;
}

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

export type ReminderPermission = 'granted' | 'denied' | 'undetermined';

/**
 * Collapse an OS permission response to the three states a routine reminder
 * cares about. iOS provisional and ephemeral authorisation, and anything else
 * that is neither granted nor denied, count as undetermined.
 */
export function classifyReminderPermission(
  perm: Pick<Notifications.NotificationPermissionsStatus, 'status' | 'ios'>
): ReminderPermission {
  const iosStatus = perm.ios?.status;
  if (
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'undetermined';
  }
  if (perm.status === 'granted') return 'granted';
  if (perm.status === 'denied') return 'denied';
  return 'undetermined';
}

// ─── Routine Reminders ────────────────────────────────────────

/**
 * What happened when a routine reminder was asked for. `not-set` means the
 * routine has no reminder time; it is internal and carries no copy.
 */
export type RoutineReminderOutcome =
  | 'scheduled'
  | 'not-set'
  | 'inactive'
  | 'invalid-time'
  | 'permission-undetermined'
  | 'permission-denied'
  | 'failed';

/** The fields scheduling reads. A full Routine satisfies it. */
export type RoutineReminderInput = Pick<
  Routine,
  'id' | 'name' | 'type' | 'activities' | 'active' | 'reminderTime'
>;

/**
 * Schedule a daily notification for a routine's reminderTime.
 * Only schedules if routine.active === true and reminderTime is non-null and parseable.
 * Never asks for permission; it only reads the current status.
 */
export async function scheduleRoutineReminder(
  routine: RoutineReminderInput
): Promise<RoutineReminderOutcome> {
  if (!routine.reminderTime) {
    return 'not-set';
  }
  if (!routine.active) {
    return 'inactive';
  }

  const parsed = parseTimeString(routine.reminderTime);
  if (!parsed) {
    logger.warn(`[reminderScheduler] Cannot parse routine reminderTime: "${routine.reminderTime}" for routine ${routine.id}`);
    return 'invalid-time';
  }

  let permission: ReminderPermission;
  try {
    permission = classifyReminderPermission(await Notifications.getPermissionsAsync());
  } catch {
    permission = 'undetermined';
  }
  if (permission !== 'granted') {
    logger.warn('[reminderScheduler] Notification permission not granted, skipping routine reminder');
    return permission === 'denied' ? 'permission-denied' : 'permission-undetermined';
  }

  const identifier = routineReminderId(routine.id);

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
    return 'scheduled';
  } catch (error) {
    logger.error(`[reminderScheduler] Failed to schedule routine reminder:`, error);
    return 'failed';
  }
}

/**
 * Cancel a scheduled routine reminder.
 */
export async function cancelRoutineReminder(routineId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(routineReminderId(routineId));
    logger.log(`[reminderScheduler] Cancelled routine reminder: ${routineReminderId(routineId)}`);
  } catch {
    // May not exist
  }
}

/**
 * Cancel every scheduled routine reminder on this device, whoever's routine it
 * belongs to. Routine reminder ids carry no user id, so a session that ends
 * (sign-out, account deletion, a lost token, a switch to another account) has
 * no other way to take its reminders with it. Invariant: no routine reminder
 * survives loss of the owning user session.
 */
export async function cancelAllRoutineReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n.identifier.startsWith(ROUTINE_REMINDER_PREFIX)) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (error) {
    logger.warn('[reminderScheduler] Could not cancel routine reminders:', error);
  }
}

// ─── Sync All Reminders ───────────────────────────────────────

/**
 * Re-sync routine reminders, and clear any habit reminders a previous build left.
 * Called on app foreground to handle routines changed while app was killed.
 */
export async function syncAllReminders(userId: string): Promise<void> {
  // First, before anything can bail: whatever routine reminders this device
  // holds, including another account's, go. Only the current user's active
  // routines are scheduled again below.
  await cancelAllRoutineReminders();

  if (!(await hasNotificationPermission())) {
    logger.log('[reminderScheduler] No notification permission, skipping sync');
    return;
  }

  // Routine reminders do not read the General notifications preference
  // (allNotificationsEnabled). They depend only on the user setting one, a
  // valid time and OS permission (Kyle's ruling R-A, 2026-10-01).

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

  // 2. Re-schedule routine reminders. Habit reminders are deliberately NOT
  // re-scheduled (V1-HABITS-RETIREMENT, Kyle ruling 1 of 2026-09-29): step 1
  // cancels any a previous build scheduled, and nothing puts them back.
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
