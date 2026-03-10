/**
 * Brain-State Window Lookup
 * Static client-side table mapping hour ranges to brain states.
 * Used in the TriggerStep callout (Step 4).
 */

export interface BrainStateWindow {
  label: string;
  timeRange: string;
  background: string;
  textColor: string;
  description: string;
  chips: string[];
}

const WINDOWS: { startHour: number; endHour: number; window: BrainStateWindow }[] = [
  {
    startHour: 6,
    endHour: 10,
    window: {
      label: 'Theta / Alpha',
      timeRange: '6am – 10am',
      background: '#FEF3C7',
      textColor: '#92400E',
      description: 'Creative, receptive window — high neuroplasticity. Best for learning, journaling, and new skills.',
      chips: ['Learning', 'Journaling', 'Meditation'],
    },
  },
  {
    startHour: 10,
    endHour: 14,
    window: {
      label: 'Beta — Peak Focus',
      timeRange: '10am – 2pm',
      background: '#EAF2E8',
      textColor: '#1B5E57',
      description: 'Your highest-focus window. Ideal for cognitively demanding work and deep habits.',
      chips: ['Deep work', 'Focus sessions', 'Complex tasks'],
    },
  },
  {
    startHour: 14,
    endHour: 17,
    window: {
      label: 'Beta — Declining',
      timeRange: '2pm – 5pm',
      background: '#FFF0F0',
      textColor: '#9B3B3B',
      description: 'Energy naturally dips here. Movement and lighter habits work better than demanding cognitive work.',
      chips: ['Movement', 'Admin tasks', 'Light habits'],
    },
  },
  {
    startHour: 17,
    endHour: 24,
    window: {
      label: 'Alpha / Theta',
      timeRange: '5pm – 12am',
      background: '#EDE9FE',
      textColor: '#5B21B6',
      description: 'Wind-down state. Ideal for reflection, connection, and recovery habits.',
      chips: ['Journaling', 'Connection', 'Breathwork'],
    },
  },
];

/** All four brain-state windows in chronological order (for the Learn More sheet). */
export const ALL_BRAIN_STATE_WINDOWS: BrainStateWindow[] = WINDOWS.map((w) => w.window);

/**
 * Parses a user-entered time string and extracts the hour (0–23).
 * Handles formats like "7:00 AM", "7am", "14:00", "2:30 PM", etc.
 * Returns null if unparseable.
 */
export function parseHourFromTimeString(timeStr: string): number | null {
  if (!timeStr || !timeStr.trim()) return null;

  const normalized = timeStr.trim().toLowerCase().replace(/\s+/g, ' ');

  // Try "HH:MM AM/PM" or "H:MM AM/PM" or "Ham/Hpm"
  const amPmMatch = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (amPmMatch) {
    let hour = parseInt(amPmMatch[1], 10);
    const isPM = amPmMatch[3] === 'pm';
    if (hour === 12) hour = isPM ? 12 : 0;
    else if (isPM) hour += 12;
    return hour;
  }

  // Try 24-hour "HH:MM" or "H:MM"
  const h24Match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hour = parseInt(h24Match[1], 10);
    if (hour >= 0 && hour <= 23) return hour;
  }

  return null;
}

/**
 * Returns the brain-state window for a given hour, or null for 00:00–05:59.
 */
export function getBrainStateWindow(hour: number): BrainStateWindow | null {
  if (hour < 6) return null; // No callout for midnight–5:59am
  for (const { startHour, endHour, window } of WINDOWS) {
    if (hour >= startHour && hour < endHour) return window;
  }
  return null;
}

/**
 * Convenience: parse a time string and return the matching window (or null).
 */
export function getBrainStateForTimeString(timeStr: string): BrainStateWindow | null {
  const hour = parseHourFromTimeString(timeStr);
  if (hour === null) return null;
  return getBrainStateWindow(hour);
}
