/**
 * Habit completion note constraints.
 *
 * Its own module so the note sheet can enforce the limit without importing the
 * habits service (and with it the whole Firebase config) for a single number.
 */

/**
 * Longest note we store on a completion. Deliberately longer than the 80-char
 * intention (a stable phrase) because a note records a specific moment, and
 * short enough to stay scannable in the "What you noted" card.
 */
export const MAX_QUICK_NOTE_LENGTH = 140;
