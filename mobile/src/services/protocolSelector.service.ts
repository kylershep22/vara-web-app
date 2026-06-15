// Phase 2 stub recommender — first-match, deterministic.
//
// DEPRECATED on the check-in path (engine wiring, Phase B). The daily
// check-in now routes through the recommendation engine's resolve()
// (src/engine), which retired suitableForStates in favor of the
// situation × circumplex map. This stub is RETAINED only for the
// onboarding stack (OnboardingV2CheckInScreen / resolveOnboardingProtocol /
// OnboardingProtocolScreen) and the legacy brainStateCheckIns protocolId
// fallback, which still speak BrainState. Do not wire new check-in code to
// it; full deletion (and removing suitableForStates from the schema) is
// deferred to the onboarding-migration sub-step.
//
// Phase 4 replaces this with the full algorithm (state + time-of-day
// + intent path + recency penalty + response-history bonus). Phase 2's
// job is just to pick *something* reasonable so the multi-step
// check-in flow is testable end-to-end on device.
//
// Strategy:
//   1. Filter by `protocol.suitableForStates.includes(state)`.
//   2. Filter by `protocol.timeWindow <= timeWindow` (the time the
//      user picked is a hard filter; longer windows include shorter
//      protocols per Core Loop v2 line 144).
//   3. Sort by closest match to the chosen time window
//      (`|protocol.timeWindow - chosenWindow|` ascending), with
//      alphabetical id as a deterministic tie-break. Pulled forward
//      from Phase 4 because the prior alphabetical-only sort produced
//      misleading recommendations in 18 of 25 state×time cells (e.g.
//      Foggy+20 returned brief-movement-10 instead of the available
//      20-min protocols). Still deterministic, still first-match —
//      Phase 4 still owns the real scoring algorithm.
//   4. Return the first.
//   5. No-match handling:
//      - In `__DEV__`: throw with a descriptive error so schema bugs
//        and call-site bugs surface immediately. The function's
//        contract is "always returns a real match, or tells you it
//        can't" — silent fallbacks mask both.
//      - In production: fall back to Cyclic Sighing 2-min per Core
//        Loop v2 line 161 so users never hit a dead end.
//
// Phase 4 NOTE: do not extend this stub. Replace it. The Phase 2 sub-
// step 2.5 caller migration intentionally points all production
// callers at this entry point so Phase 4 can swap the implementation
// without touching call sites.

import type {
  BrainState,
  Protocol,
  ProtocolTimeWindow,
} from '../types/models';
import {
  getAllProtocols,
  getProtocolById,
} from '../constants/brainStateProtocols';

export interface ProtocolSelectionInput {
  state: BrainState;
  timeWindow: ProtocolTimeWindow;
}

const FALLBACK_PROTOCOL_ID = 'cyclic-sighing-2';

export function selectProtocol(input: ProtocolSelectionInput): Protocol {
  const eligible = getAllProtocols()
    .filter((p) => p.suitableForStates.includes(input.state))
    .filter((p) => p.timeWindow <= input.timeWindow)
    .sort((a, b) => {
      const distA = Math.abs(a.timeWindow - input.timeWindow);
      const distB = Math.abs(b.timeWindow - input.timeWindow);
      if (distA !== distB) return distA - distB;
      return a.id.localeCompare(b.id);
    });

  if (eligible.length > 0) {
    return eligible[0];
  }

  if (__DEV__) {
    throw new Error(
      `protocolSelector: no protocol matched (state=${input.state}, timeWindow=${input.timeWindow}). Check protocol metadata and suitableForStates coverage.`
    );
  }

  const fallback = getProtocolById(FALLBACK_PROTOCOL_ID);
  if (!fallback) {
    // Library invariant violation — every release ships with the
    // fallback protocol present. Throw rather than silently failing.
    throw new Error(
      `protocolSelector: fallback protocol "${FALLBACK_PROTOCOL_ID}" missing from library`
    );
  }
  return fallback;
}
