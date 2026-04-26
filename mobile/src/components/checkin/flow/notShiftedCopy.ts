// Not-shifted response copy — single default-path entry.
//
// Per Core Loop v2 §Path B: one validating message regardless of
// the specific (stateBefore, stateAfter) pair. Forward-compatible
// with Phase 5 IntentPath nesting via the same Partial-with-default
// pattern as shiftedResponseCopy.ts.
//
// The NotShiftedResponse component itself is sub-step 2.4's
// deliverable — 2.3 ships only the data shape and the default-path
// entry. Sub-step 2.2's placeholder UI in ResponseStepView reads
// from this module so the strings can iterate without component
// churn.

import type { IntentPath } from '../../../types/models';

export interface NotShiftedCopy {
  title: string;
  body: string;
  tryLongerLabel: string;
  tryLongerHint: string;
  restLaterLabel: string;
  restLaterHint: string;
}

export type NotShiftedCopyTable = Partial<Record<IntentPath, NotShiftedCopy>> & {
  default: NotShiftedCopy;
};

// Default-path strings. Lifted from Core Loop v2 lines 254-269 with
// one adjustment: the spec's "A 2-minute protocol can't reach
// everything" was 2-minute-specific; not_shifted reaches us from any
// time-window, so generalized to "A short protocol."
const DEFAULT: NotShiftedCopy = {
  title: 'Some states take more time.',
  body: "That's normal. Nothing's wrong. A short protocol can't reach everything. Some moments need more than a reset.",
  tryLongerLabel: 'Try something longer',
  tryLongerHint: 'When you have 10+ minutes',
  restLaterLabel: 'Rest and come back later',
  restLaterHint: 'The next check-in will still be here',
};

export const NOT_SHIFTED_COPY: NotShiftedCopyTable = {
  default: DEFAULT,
  // Phase 5 adds: down_regulation, sleep, activation.
};

/**
 * Returns the NotShiftedCopy for an IntentPath.
 *
 * Falls through to default-path copy when the requested path's entry
 * is missing. Mirrors `getShiftedResponseCopy` but simpler — there's
 * one entry per path, no per-transition keys to disambiguate.
 *
 * The default-path entry is type-required, so this never returns
 * undefined and never throws.
 */
export function getNotShiftedCopy(intentPath: IntentPath): NotShiftedCopy {
  if (intentPath !== 'default') {
    const pathEntry = NOT_SHIFTED_COPY[intentPath];
    if (pathEntry !== undefined) {
      return pathEntry;
    }
  }
  return NOT_SHIFTED_COPY.default;
}
