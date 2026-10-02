/**
 * Notifications settings copy (NPM-2).
 *
 * Kyle's owner-approved strings, 2026-10-02 (Ruling 6, Decisions 5, 6, 9, 10
 * and 11, the approved spoken labels and the first-load copy). Character for
 * character as approved: straight apostrophes everywhere except Vara’s in the
 * General subtitle, which is U+2019 as approved on 2026-10-01. Do not reword,
 * retitle or re-punctuate. They land flat, with no drafted marker.
 *
 * The picker sheet's own strings (Reminder time, Cancel, Done and their spoken
 * labels) are unchanged and live in TimePickerSheet.
 */

export const NOTIFICATION_SETTINGS_COPY = {
  title: 'Notifications',
  loading: 'Loading notification settings...',
  loadFailed: "Couldn't load notification settings.",
  tryAgain: 'Try again',

  general: {
    label: 'General notifications',
    subtitle: 'Controls Vara’s general reminders and updates. Routine reminders are managed within each routine.',
  },

  dailyReminder: {
    label: 'Daily reminder',
    addTime: 'Add a time',
    subtitle: 'One reminder per day at your chosen time',
    /** Only when a valid time exists and General is off (Decision 5). */
    subtitleGeneralOff: 'Turn on General notifications to get this reminder.',
  },

  community: {
    header: 'Community',
    directMessages: {
      label: 'Direct messages',
      subtitle: 'Notifications when someone messages you',
    },
    connectionRequests: {
      label: 'Connection requests',
      subtitle: 'When someone wants to connect',
    },
  },

  /** Three full stops, as approved (Decision 6). */
  saving: 'Saving...',

  failure: {
    title: "Couldn't save",
    body: "Your change wasn't saved. Please try again.",
    ok: 'OK',
  },
} as const;

export const NOTIFICATION_PERMISSION_COPY = {
  label: 'Device notifications',
  allowed: { status: 'Allowed' },
  denied: { status: 'Off in your device settings', action: 'Open Settings' },
  notAsked: { status: 'Not allowed yet', action: 'Allow notifications' },
} as const;

/**
 * Spoken labels, as approved. An action is spoken only where the focused
 * element performs it.
 */
export const NOTIFICATION_SPOKEN = {
  back: 'Back',
  tryAgain: 'Try again',
  /** "General notifications", or "General notifications, saving" while pending. */
  switchLabel: (label: string, saving: boolean) => (saving ? `${label}, saving` : label),
  /** "Daily reminder, 8:00 PM", "Daily reminder, add a time", or "..., saving". */
  dailyReminder: (formattedTime: string | null, saving: boolean) => {
    const base = formattedTime ? `Daily reminder, ${formattedTime}` : 'Daily reminder, add a time';
    return saving ? `${base}, saving` : base;
  },
  permissionAllowed: 'Device notifications, allowed',
  permissionDenied: 'Device notifications, off in your device settings. Open Settings.',
  permissionNotAsked: 'Device notifications, not allowed yet. Allow notifications.',
} as const;
