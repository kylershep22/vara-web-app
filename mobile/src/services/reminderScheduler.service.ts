/**
 * Reminder Scheduler Service
 * Schedules and manages daily notifications for routine reminders. Habit
 * reminders left V1 (V1-HABITS-RETIREMENT): nothing schedules them any more, and
 * syncAllReminders still cancels any a previous build left behind.
 * Uses expo-notifications DailyTriggerInput for repeating daily notifications.
 */

import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import {
  Routine,
  fetchUserRoutinesFromServer,
  calculateTotalDuration,
} from './firebase/routines.service';

// Every routine reminder is scheduled under this prefix plus the routine id.
const ROUTINE_REMINDER_PREFIX = 'routine-reminder-';

function routineReminderId(routineId: string): string {
  return `${ROUTINE_REMINDER_PREFIX}${routineId}`;
}

/** True for any routine reminder identifier, whoever's routine it belongs to. */
export function isRoutineReminderId(identifier: string): boolean {
  return identifier.startsWith(ROUTINE_REMINDER_PREFIX);
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

  // No cancel of this id first: scheduling under the same identifier replaces
  // the pending request, so there is no gap, and a failed schedule leaves the
  // previous request in place. The routine editor cancels explicitly before it
  // calls this, which keeps its rule that anything but 'scheduled' means the
  // reminder is not set.
  try {
    await Notifications.scheduleNotificationAsync(routineReminderRequest(routine, parsed));
    logger.log(`[reminderScheduler] Scheduled routine reminder: ${routineReminderId(routine.id)} at ${parsed.hour}:${String(parsed.minute).padStart(2, '0')}`);
    return 'scheduled';
  } catch (error) {
    logger.error(`[reminderScheduler] Failed to schedule routine reminder:`, error);
    return 'failed';
  }
}

/** The OS request for a routine reminder at an already-parsed time. */
function routineReminderRequest(
  routine: RoutineReminderInput,
  parsed: { hour: number; minute: number }
): Notifications.NotificationRequestInput {
  const totalDuration = calculateTotalDuration(routine.activities);
  const typeLabel = routine.type === 'custom' ? '' : `${routine.type} `;
  return {
    identifier: routineReminderId(routine.id),
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
  };
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
 *
 * Ends every sync attempt in flight first, synchronously, so none of them can
 * schedule the departing user's reminders after this has run.
 */
export async function cancelAllRoutineReminders(): Promise<void> {
  invalidateRoutineReminderAttempts();
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

// Invariant (ROUTINE-REMINDER-OFFLINE-RESILIENCE, Kyle's ruling 1): a failed or
// timed-out routine refresh never makes the scheduled routine reminders less
// correct than they were before it began. Nothing routine-related is cancelled
// or scheduled until a successful server read says what should exist.

/** A routine read that has not answered by then is treated as a failed read. */
const ROUTINE_READ_TIMEOUT_MS = 10_000;

/**
 * Ownership of the routine reminders. Each sync attempt takes a generation when
 * it starts running, and anything that ends its claim bumps the counter: a
 * newer attempt, cancelAllRoutineReminders, or the end of the user session
 * (invalidateRoutineReminderAttempts). An attempt checks its generation after
 * its read and before every cancel and every schedule, so a late completion
 * from a superseded or session-lost attempt changes nothing.
 */
let reconcileGeneration = 0;

/**
 * End every routine reminder sync attempt in flight. Called synchronously when
 * the user session ends, before anything is queued, so an attempt still waiting
 * on its read can never cancel or schedule for the departing user.
 */
export function invalidateRoutineReminderAttempts(): void {
  reconcileGeneration += 1;
}

export type RoutineReminderSyncOutcome =
  | 'reconciled'
  | 'no-permission'
  | 'read-failed'
  | 'read-timed-out'
  | 'superseded';

type RoutineRead =
  | { ok: true; routines: Routine[] }
  | { ok: false; outcome: 'read-failed' | 'read-timed-out' };

/**
 * The server read, bounded. Settles exactly once: whichever of the read and the
 * timer comes first wins, and a read that answers after the timer resolves a
 * promise that has already settled, which does nothing. Never rejects.
 */
function readRoutinesWithTimeout(userId: string): Promise<RoutineRead> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      logger.warn('[reminderScheduler] Routine read timed out, routine reminders left as they are');
      resolve({ ok: false, outcome: 'read-timed-out' });
    }, ROUTINE_READ_TIMEOUT_MS);
    fetchUserRoutinesFromServer(userId).then(
      (routines) => {
        clearTimeout(timer);
        resolve({ ok: true, routines });
      },
      (error) => {
        clearTimeout(timer);
        logger.warn('[reminderScheduler] Routine read failed, routine reminders left as they are', error);
        resolve({ ok: false, outcome: 'read-failed' });
      }
    );
  });
}

/**
 * Reconcile this device's routine reminders with the user's routines, and clear
 * any habit reminders a previous build left. Called on sign-in and on every
 * return to the foreground. Never rejects.
 *
 * Without OS permission nothing is cancelled, read or scheduled (Kyle's ruling
 * 2, G2): permission controls delivery, and the configured reminders resume
 * when it comes back. Routine reminders do not read the General notifications
 * preference (allNotificationsEnabled); they depend only on the user setting
 * one, a valid time and OS permission (Kyle's ruling R-A, 2026-10-01).
 */
export async function syncAllReminders(userId: string): Promise<RoutineReminderSyncOutcome> {
  if (!(await hasNotificationPermission())) {
    logger.log('[reminderScheduler] No notification permission, routine reminders left as they are');
    return 'no-permission';
  }

  // Taken when this attempt starts running, not when it was queued.
  reconcileGeneration += 1;
  const attempt = reconcileGeneration;
  const owned = () => attempt === reconcileGeneration;

  // Habit reminders are deliberately NOT re-scheduled (V1-HABITS-RETIREMENT,
  // Kyle ruling 1 of 2026-09-29): any a previous build scheduled are cancelled
  // here, and nothing puts them back. This does not depend on the read.
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of allScheduled) {
      if (n.identifier.startsWith('habit-reminder-')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
  } catch (error) {
    logger.error('[reminderScheduler] Error cancelling stale habit reminders:', error);
  }

  // The read comes before any routine cancel or schedule, and only a server
  // read counts: a cache-backed result is not authoritative enough to cancel on
  // (Kyle's ruling 2). On failure or timeout the reminders stay as they are; a
  // reminder changed on another device meanwhile is reconciled next time.
  const read = await readRoutinesWithTimeout(userId);
  if (!read.ok) return read.outcome;
  if (!owned()) return 'superseded';

  // The desired set: this user's active routines with a time that parses.
  const desired = new Map<string, { routine: Routine; parsed: { hour: number; minute: number } }>();
  for (const routine of read.routines) {
    if (!routine.active || !routine.reminderTime) continue;
    const parsed = parseTimeString(routine.reminderTime);
    if (!parsed) continue;
    desired.set(routineReminderId(routine.id), { routine, parsed });
  }

  // Every routine reminder outside the desired set goes, another account's
  // included: routine reminder ids carry no user id.
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of allScheduled) {
      if (!isRoutineReminderId(n.identifier) || desired.has(n.identifier)) continue;
      if (!owned()) return 'superseded';
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  } catch (error) {
    logger.error('[reminderScheduler] Error cancelling routine reminders outside the desired set:', error);
  }

  // Each desired reminder is scheduled under its own identifier with no cancel
  // first, which replaces the pending request: no gap, and a failed schedule
  // leaves that id's previous request in place without stopping the others.
  for (const { routine, parsed } of Array.from(desired.values())) {
    if (!owned()) return 'superseded';
    try {
      await Notifications.scheduleNotificationAsync(routineReminderRequest(routine, parsed));
    } catch (error) {
      logger.error(`[reminderScheduler] Failed to schedule routine reminder ${routine.id}:`, error);
    }
  }
  logger.log(`[reminderScheduler] Reconciled ${desired.size} routine reminders`);
  return 'reconciled';
}
