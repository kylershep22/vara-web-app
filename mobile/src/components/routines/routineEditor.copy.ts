/**
 * RoutineEditor reminder copy.
 *
 * Kyle's owner-approved strings, ROUTINE-REMINDERS (2026-10-01). Character for
 * character as approved, apostrophes included: do not reword, retitle or
 * re-punctuate. They land flat, with no drafted marker.
 */

/** The helper line under the reminder field. */
export const REMINDER_HELPER = 'Optional. For example, 7:30 AM or 7:30 PM.';

export const REMINDER_ALERTS = {
  scheduled: {
    title: 'Reminder set',
    /** `{time}` is the parsed time as "7:30 PM", whatever the user typed. */
    body: (time: string) => `Your routine is saved. Vara will remind you at ${time}.`,
    ok: 'OK',
  },
  permissionNeeded: {
    title: 'Allow reminders?',
    body: 'Your routine is saved. Allow notifications to get this reminder.',
    allow: 'Allow notifications',
    notNow: 'Not now',
  },
  deniedOff: {
    title: 'Notifications are off',
    body: "Your routine is saved, but Vara can't send this reminder while notifications are turned off in your device settings.",
    openSettings: 'Open Settings',
    notNow: 'Not now',
  },
  invalidTime: {
    title: 'Check the reminder time',
    body: 'Your routine is saved without a reminder. Enter a time like 7:30 AM or 7:30 PM.',
    ok: 'OK',
  },
  schedulingFailure: {
    title: 'Reminder not set',
    body: "Your routine is saved, but the reminder couldn't be scheduled. Open the routine and try again.",
    ok: 'OK',
  },
} as const;
