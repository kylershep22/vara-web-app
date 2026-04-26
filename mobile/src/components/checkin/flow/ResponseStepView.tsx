// Step 6 of the multi-step check-in flow: adaptive response.
//
// Sub-step 2.3 update:
//   - Positive outcomes (shifted | partial_shift | maintenance)
//     delegate to ShiftedResponse, which reads its title and body
//     from the per-transition copy table.
//
// Sub-step 2.4 update:
//   - not_shifted now delegates to NotShiftedResponse (replaces the
//     2.2/2.3 placeholder). This view computes the late-night
//     override from `stateBefore` + `new Date().getHours()` and
//     passes it to NotShiftedResponse so the "Try something longer"
//     copy adapts when the user is Wired late at night.
//
// The auto-dismiss timer for the positive paths lives inside
// ShiftedResponse. This view no longer arms a timer for any
// outcome — single owner per concern.
//
// `durationActualSeconds` flows in from the FlowState's ReCheckStep /
// ResponseStep payload (computed at player exit). ShiftedResponse
// converts to minutes for body interpolation.

import React from 'react';

import type { BrainState, IntentPath } from '../../../types/models';
import type { ClassifierOutcome } from '../../../services/outcomeClassifier';
import { getLateNightNSDRSwap } from '../../../services/lateNightNSDRSwap';
import type { UserChosenNextStep } from './types';
import { ShiftedResponse } from './ShiftedResponse';
import { NotShiftedResponse } from './NotShiftedResponse';

export interface ResponseStepViewProps {
  stateBefore: BrainState;
  stateAfter: BrainState;
  outcome: ClassifierOutcome;
  durationActualSeconds: number;
  // Optional — Phase 3 wires the user's resolved intent path into
  // the flow. Until then, defaults to 'default' (the only path 2.3
  // populates). Forwarded to ShiftedResponse / NotShiftedResponse.
  intentPath?: IntentPath;
  onChoose: (choice: UserChosenNextStep) => void;
}

export function ResponseStepView({
  stateBefore,
  stateAfter,
  outcome,
  durationActualSeconds,
  intentPath = 'default',
  onChoose,
}: ResponseStepViewProps) {
  // Positive outcomes delegate to ShiftedResponse (owns its own
  // auto-dismiss timer, copy lookup, render).
  if (outcome !== 'not_shifted') {
    return (
      <ShiftedResponse
        stateBefore={stateBefore}
        stateAfter={stateAfter}
        durationActualSeconds={durationActualSeconds}
        intentPath={intentPath}
        onChoose={onChoose}
      />
    );
  }

  // not_shifted delegates to NotShiftedResponse. The late-night
  // override is computed here from device-local-hour so the
  // component stays pure of clock access. The PARENT of CheckInFlow
  // also calls getLateNightNSDRSwap (with the same inputs) when it
  // routes navigation on `'try_longer'` — that's the single source
  // of truth pattern documented in PHASE_NOTES sub-step 2.4 entry.
  const lateNightOverride =
    getLateNightNSDRSwap(stateBefore, new Date().getHours()) !== null;

  return (
    <NotShiftedResponse
      intentPath={intentPath}
      lateNightOverride={lateNightOverride}
      onChoose={onChoose}
    />
  );
}
