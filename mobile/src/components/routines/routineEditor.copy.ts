/**
 * RoutineEditor reminder copy.
 *
 * Kyle's owner-approved strings, ROUTINE-REMINDERS (2026-10-01). Character for
 * character as approved, apostrophes included: do not reword, retitle or
 * re-punctuate. They land flat, with no drafted marker.
 */

/**
 * The reminder row (ROUTINE-REMINDER-TIME-PICKER, Kyle's rulings R-2 and R-3,
 * 2026-10-01). The helper line is gone: the row is picked, not typed.
 *
 * The accessibility labels are complete on their own, so the row never relies
 * on the section heading having just been announced.
 */
export const REMINDER_ROW = {
  sectionLabel: 'Reminder (optional)',
  empty: 'Add a reminder',
  remove: 'Remove reminder',
  a11yEmpty: 'Reminder, add a reminder',
  /** `{time}` is the formatted time, for example "7:30 PM". */
  a11ySet: (time: string) => `Reminder, ${time}`,
  a11yRemove: 'Remove reminder',
} as const;

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
    /**
     * Defensive only. Unreachable from the picker-era UI, which only ever
     * holds a valid time or none (R-6). Body revised 2026-10-01.
     */
    body: 'Your routine is saved without a reminder. Choose a time to add one.',
    ok: 'OK',
  },
  schedulingFailure: {
    title: 'Reminder not set',
    body: "Your routine is saved, but the reminder couldn't be scheduled. Open the routine and try again.",
    ok: 'OK',
  },
} as const;
