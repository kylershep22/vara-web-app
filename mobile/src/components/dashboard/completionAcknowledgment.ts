// Completion acknowledgment — the quiet post-check-in line that names what the
// user DID, never the state they reported.
//
// Replaces stateAcknowledgment.ts (a state readback) per Voice & Tone v2.1
// §3.1: name state at input, never reflect it back after. There is no
// post-practice state to display — and displaying any state label after the
// work is done is the thing that is wrong — so the slot now acknowledges the
// completed practice instead.
//
// ⚠️ Provisional copy behind a swap seam (same pattern as planReason.ts): the
// strings are treated as near-final but stay isolated here so a copy change is a
// one-file swap. Never a number/score, never an accumulation ("your third"),
// never a state label.

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

// Rough time-of-day bucket for the completion line. Descriptive, not a number.
// Boundaries: hour < 12 → morning, < 17 → afternoon, else evening.
export function timeOfDay(when: Date): TimeOfDay {
  const hour = when.getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Acknowledgment naming the completed practice.
 *
 * - `"[Practice], done."` when no completion time is available.
 * - `"[Practice], done this morning."` (/afternoon/evening) when `completedAt`
 *   is available — preferred whenever the data is there (no new persistence:
 *   sourced from the daily marker's `updatedAt`).
 */
export function completionAcknowledgment(
  practiceName: string,
  completedAt?: Date | null
): string {
  if (completedAt == null) return `${practiceName}, done.`;
  return `${practiceName}, done this ${timeOfDay(completedAt)}.`;
}
