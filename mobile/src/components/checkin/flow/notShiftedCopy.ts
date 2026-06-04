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
  // Phase 2.8.2 — Section 5 Highlight Card. Dew Sage background with
  // teal left accent; validates the user's just-completed protocol
  // before offering paths forward.
  highlightText: string;
  // Phase 2.8.2 — section label above the two path cards.
  keepGoingLabel: string;
  tryLongerLabel: string;
  tryLongerHint: string;
  restLaterLabel: string;
  restLaterHint: string;
  // Sub-step 2.4 — late-night NSDR swap copy override. Renders when
  // the user is Wired and the local hour is in the late-night window
  // (22:00–03:59). Action shape is unchanged — the button still fires
  // `'try_longer'` on tap; only the affordance copy changes. Phase 5
  // path-nests these strings alongside the rest of NotShiftedCopy.
  // Neutral framing per locked decision — Wired at 11pm doesn't
  // always mean "going to sleep." The default-path stays intent-
  // neutral; sleep-specific framing belongs in the sleep IntentPath
  // table when Phase 5 lands.
  lateNightTryLongerLabel: string;
  lateNightTryLongerHint: string;
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
  body: "A short protocol can't reach everything. That's normal, not a sign anything's wrong.",
  highlightText:
    "What you just did still counts. Your nervous system noticed the input, even if the shift didn't land yet.",
  keepGoingLabel: "If you'd like to keep going",
  tryLongerLabel: 'Try something longer',
  tryLongerHint: '10+ minute protocol, for states that need more time',
  restLaterLabel: 'Rest and come back later',
  restLaterHint: 'Your next check-in will still be here',
  lateNightTryLongerLabel: "Try NSDR when you're ready",
  lateNightTryLongerHint: 'About 20 minutes of guided rest',
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
