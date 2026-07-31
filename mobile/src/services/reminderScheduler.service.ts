/**
 * Reminder Scheduler Service
 * Schedules and manages daily notifications for habit triggers and routine reminders.
 * Uses expo-notifications DailyTriggerInput for repeating daily notifications.
 */

import * as Notifications from 'expo-notifications';
import { logger } from '../utils/logger';
import { Habit } from '../types';
import {
  habitReminderPlan,
  habitReminderIdentifier,
  isIdentifierForHabit,
} from '../utils/habitReminderPlan';
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
 * Schedule a habit's reminder from `reminderEnabled` + `reminderTime`, on the
 * cadence the habit itself already declares.
 *
 * A daily or flexible habit gets one DAILY trigger; a specific-days habit gets
 * one WEEKLY trigger per chosen day, so a single habit can own up to seven
 * scheduled notifications. See utils/habitReminderPlan for why the days are
 * derived rather than stored, and for the null cases that get no reminder.
 *
 * QUIET HOURS ARE DELIBERATELY NOT CONSULTED HERE, and this is intended
 * behaviour, not an oversight to be "fixed" later: quiet hours are a default
 * window, while a per-habit reminder time is an explicit instruction the user
 * typed into a picker for this specific habit. An explicit instruction beats a
 * default. (isWithinQuietHours governs immediate, app-initiated notifications
 * via sendThrottledNotification; it has never applied to scheduled triggers.)
 */
export async function scheduleHabitReminder(habit: Habit): Promise<void> {
  if (!habit.reminderEnabled || !habit.reminderTime) {
    // INSTRUMENTATION (temporary, for the Slice B device walk). warn, not log:
    // logger.log is gated behind __DEV__ and would be invisible in the preview
    // build this is being walked on.
    logger.warn(
      `[reminderScheduler] skip: fields missing habitId=${habit.id} reminderEnabled=${habit.reminderEnabled} hasTime=${!!habit.reminderTime}`
    );
    return;
  }

  const { hour, minute } = habit.reminderTime;
  const plan = habitReminderPlan(habit);
  if (!plan) {
    // The habit declares no usable cadence, so there is nothing to repeat on.
    // The UI hides the control in exactly these cases; this guard is what makes
    // that true for habits whose schedule changed after the reminder was set.
    logger.warn(
      `[reminderScheduler] skip: no plan (no frequencyType?) habitId=${habit.id} frequencyType=${String(habit.frequencyType)} specificDays=${JSON.stringify(habit.specificDays ?? null)}`
    );
    return;
  }

  if (!(await hasNotificationPermission())) {
    logger.warn('[reminderScheduler] Notification permission not granted, skipping habit reminder');
    return;
  }

  // Clear the habit's WHOLE existing set first. An exact-identifier cancel
  // would strand triggers whenever the day set shrinks (Mon/Wed/Fri -> Mon/Tue
  // would leave Wed and Fri firing forever).
  await cancelHabitReminder(habit.id);

  const content = {
    title: `Time for ${habit.name}`,
    sound: true,
    data: { type: 'habit-reminder', habitId: habit.id },
  };

  try {
    if (plan.kind === 'daily') {
      await Notifications.scheduleNotificationAsync({
        identifier: habitReminderIdentifier(habit.id),
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } else {
      for (const weekday of plan.weekdays) {
        await Notifications.scheduleNotificationAsync({
          identifier: habitReminderIdentifier(habit.id, weekday),
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour,
            minute,
          },
        });
      }
    }
    // INSTRUMENTATION: warn, not log, so it survives __DEV__ === false.
    logger.warn(
      `[reminderScheduler] SCHEDULED ${plan.kind} habit reminder habitId=${habit.id} at ${hour}:${String(minute).padStart(2, '0')} triggers=${plan.kind === 'daily' ? 1 : plan.weekdays.length}${plan.kind === 'weekly' ? ` weekdays=${JSON.stringify(plan.weekdays)}` : ''}`
    );
  } catch (error) {
    logger.error(`[reminderScheduler] Failed to schedule habit reminder:`, error);
  }
}

/**
 * Cancel EVERY scheduled notification belonging to a habit.
 *
 * Filter-then-cancel rather than a single exact-identifier cancel: a
 * specific-days habit owns one identifier per weekday, and cancelling only the
 * bare `habit-reminder-${id}` would leave orphaned weekly triggers firing for a
 * habit the user deleted.
 */
export async function cancelHabitReminder(habitId: string): Promise<void> {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const owned = allScheduled.filter((n) => isIdentifierForHabit(n.identifier, habitId));

    for (const n of owned) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
    if (owned.length > 0) {
      logger.log(`[reminderScheduler] Cancelled ${owned.length} reminder(s) for habit ${habitId}`);
    }
  } catch (error) {
    logger.error('[reminderScheduler] Error cancelling habit reminders:', error);
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

// ─── Habit reminder cap ───────────────────────────────────────

/**
 * Ceiling on how many habit-reminder triggers may be pending at once.
 *
 * iOS allows 64 pending notifications per app and SILENTLY DISCARDS the rest —
 * no error, no callback, the notification simply never arrives. A single
 * specific-days habit can own seven triggers, so ten such habits would already
 * blow past it and start evicting other categories (the daily rhythm, the focus
 * completion notification) at the OS's discretion rather than ours.
 *
 * 40 is provisional: it leaves headroom for the other categories while being
 * far above any plausible real habit count.
 */
export const MAX_HABIT_REMINDER_TRIGGERS = 40;

/** How many scheduled notifications this habit's reminder needs. */
function triggerCount(habit: Habit): number {
  const plan = habitReminderPlan(habit);
  if (!plan) return 0;
  return plan.kind === 'daily' ? 1 : plan.weekdays.length;
}

/**
 * Firestore Timestamp | Date | not-yet-resolved -> epoch millis.
 * An unresolved serverTimestamp sorts LAST, which is correct: it is the newest.
 */
function toMillis(value: unknown): number {
  const ts = value as { toMillis?: () => number; toDate?: () => Date } | undefined;
  if (ts && typeof ts.toMillis === 'function') return ts.toMillis();
  if (ts && typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Keep habits in the given (oldest-first) order until the trigger budget runs
 * out, then drop the remainder.
 *
 * Stops at the first habit that does not fit rather than skipping it to squeeze
 * in a smaller later one: "the oldest N are protected" is a rule a user could
 * be told, whereas "whichever ones happened to fit" is not. A habit is always
 * kept whole or dropped whole — scheduling three of a habit's five days would
 * be worse than scheduling none, because it looks like it works.
 */
function applyReminderCap(habits: Habit[]): {
  kept: Habit[];
  droppedHabits: number;
  droppedTriggers: number;
} {
  const kept: Habit[] = [];
  let used = 0;

  for (let i = 0; i < habits.length; i++) {
    const need = triggerCount(habits[i]);
    if (used + need > MAX_HABIT_REMINDER_TRIGGERS) {
      const dropped = habits.slice(i);
      return {
        kept,
        droppedHabits: dropped.length,
        droppedTriggers: dropped.reduce((sum, h) => sum + triggerCount(h), 0),
      };
    }
    kept.push(habits[i]);
    used += need;
  }

  return { kept, droppedHabits: 0, droppedTriggers: 0 };
}

// ─── Sync All Reminders ───────────────────────────────────────

/**
 * Re-sync all habit and routine reminders.
 * Called on app foreground to handle habits/routines changed while app was killed.
 */
export async function syncAllReminders(userId: string): Promise<void> {
  // INSTRUMENTATION (temporary, for the Slice B device walk). Every branch below
  // warns rather than logs: logger.log is gated behind __DEV__, so in a preview
  // build these bails were effectively silent — which is exactly why the two
  // candidate root causes were indistinguishable in the last walk.
  logger.warn(`[reminderScheduler] SYNC ENTER userId=${userId}`);

  if (!(await hasNotificationPermission())) {
    logger.warn('[reminderScheduler] SYNC BAIL: no notification permission — nothing rescheduled');
    return;
  }

  try {
    const prefs = await getNotificationPreferences(userId);
    if (!prefs?.allNotificationsEnabled) {
      logger.warn(
        `[reminderScheduler] SYNC BAIL: allNotificationsEnabled=${String(prefs?.allNotificationsEnabled)} — nothing rescheduled`
      );
      return;
    }
  } catch (error) {
    logger.warn('[reminderScheduler] SYNC BAIL: could not read preferences — nothing rescheduled');
    logger.error('[reminderScheduler] preference read error was:', error);
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
    logger.warn(`[reminderScheduler] SYNC cancelled ${reminderNotifications.length} stale reminder(s)`);
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

      const withReminders = habits
        .filter((h) => h.reminderEnabled && h.reminderTime && habitReminderPlan(h))
        // Oldest first. The cap below protects established reminders and drops
        // the marginal addition, so the order has to be deterministic — without
        // it "which reminder stopped working" would vary run to run.
        .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));

      const { kept, droppedHabits, droppedTriggers } = applyReminderCap(withReminders);

      if (droppedHabits > 0) {
        logger.warn(
          `[reminderScheduler] REMINDER CAP EXCEEDED — scheduling ${MAX_HABIT_REMINDER_TRIGGERS} triggers ` +
            `for ${kept.length} habit(s); DROPPED ${droppedHabits} habit(s) / ${droppedTriggers} trigger(s). ` +
            `Newest reminders are dropped first. iOS silently discards pending notifications beyond 64, ` +
            `so this cap is what keeps the drop deliberate and diagnosable.`
        );
      }

      // INSTRUMENTATION: the fetch/filter funnel. A habit that is fetched but
      // filtered out never reaches scheduleHabitReminder, so its skip-reason
      // logs above would never fire — this is the only place that gap shows.
      logger.warn(
        `[reminderScheduler] SYNC habits fetched=${habits.length} withReminders=${withReminders.length} kept=${kept.length}`
      );

      for (const habit of kept) {
        await scheduleHabitReminder(habit);
      }
      logger.warn(`[reminderScheduler] SYNC DONE scheduled ${kept.length} habit reminder(s)`);
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
