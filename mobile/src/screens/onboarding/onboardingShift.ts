/**
 * Pure copy/logic for the reflect-back (screen 5) and re-check shift (screen 7).
 * No React/RN imports, so it's unit-testable without loading the screen's
 * dependency tree. Screens import these helpers.
 */
import type { BrainState, ProtocolSessionOutcome } from '../../types/models';
import { BRAIN_STATES } from '../../components/dashboard/brainStateCheckin/brainStateOptions';
import { PEAK_WINDOW_OPTIONS, type PeakWindow } from '../../constants/onboardingStressRecovery';

export const STATE_LABELS: Record<BrainState, string> = BRAIN_STATES.reduce(
  (acc, o) => ({ ...acc, [o.state]: o.label }),
  {} as Record<BrainState, string>
);

// Same per-state colors the selection cards use (BrainStateOptionRow dot), so
// the re-check transition visual matches the swatches above it.
export const STATE_COLORS: Record<BrainState, string> = BRAIN_STATES.reduce(
  (acc, o) => ({ ...acc, [o.state]: o.color }),
  {} as Record<BrainState, string>
);

export const PEAK_LABELS: Record<PeakWindow, string> = PEAK_WINDOW_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.id]: o.label }),
  {} as Record<PeakWindow, string>
);

export const GENERIC_REFLECT_LINE = "Here's a five-minute reset to help your system downshift.";

export const BRAIN_LINE =
  'Small recovery moments like this, repeated, are how your brain learns to handle stress better over time.';

/** Screen 5 — mirror the user's ACTUAL inputs (never a static string). */
export function buildReflectLine(
  state: BrainState | null,
  stressorLabels: string[],
  peak: PeakWindow | null
): string {
  if (!state) return GENERIC_REFLECT_LINE;
  const stressorClause = stressorLabels.length ? `, with ${stressorLabels[0].toLowerCase()}` : '';
  const peakClause = peak ? ` in the ${PEAK_LABELS[peak].toLowerCase()}` : '';
  return `You're arriving ${STATE_LABELS[state]}${stressorClause}${peakClause}. ${GENERIC_REFLECT_LINE}`;
}

export type Shift = 'improved' | 'flat' | 'worse';

// Ordinal toward regulation; used only to phrase the shift, never to gate.
const RANK: Record<BrainState, number> = { wired: 0, foggy: 1, steady: 2, clear: 3, alive: 4 };

export function computeShift(before: BrainState, after: BrainState): Shift {
  if (RANK[after] > RANK[before]) return 'improved';
  if (RANK[after] < RANK[before]) return 'worse';
  return 'flat';
}

export function shiftOutcome(shift: Shift): ProtocolSessionOutcome {
  if (shift === 'improved') return 'shifted';
  if (shift === 'flat') return 'maintenance';
  return 'not_shifted';
}

/** Screen 7 — surface before→after; flat/worse gets a compassionate reframe. */
export function shiftLine(before: BrainState, after: BrainState, shift: Shift): string {
  if (shift === 'improved') {
    return `You moved from ${STATE_LABELS[before]} to ${STATE_LABELS[after]} in five minutes.`;
  }
  return "Recovery isn't linear. Some days the shift is quiet. Showing up is the part that compounds.";
}
