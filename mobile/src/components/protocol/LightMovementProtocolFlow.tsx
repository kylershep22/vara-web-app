// LightMovementProtocolFlow — wraps GuidedSessionPlayer with a
// pre-timer modality picker for the brief-movement family.
//
// Sub-step 2.7 round 4 (Obs 10). Light Movement is the only protocol
// where the timer covers multiple possible activities (walk, light
// cardio, stretching, flow). The picker collapses that to two
// honest options the user picks before the timer starts. Selected
// modality is persisted on the session doc as `selectedModality`
// (additive optional field on ProtocolSessionWritePayload).
//
// Usage: parent flow (CheckInFlow / BrowseRunFlow) checks
// `protocol.family === 'brief-movement'` and renders this wrapper
// instead of GuidedSessionPlayer directly. All other protocols
// continue to mount the player directly with no behavior change.
//
// State flow:
//   1. Mount → picker visible (selectedModality = null).
//   2. User taps Walk or Stretch → setSelectedModality + fire
//      onModalitySelected so parent can record the value before the
//      session terminal write fires.
//   3. Player mounts with a derived protocol whose timer step.hint
//      is overridden to reflect the chosen modality. label stays
//      "Light movement"; only the supporting hint copy varies.
//   4. Player exit fires onExit upward — same signature as
//      GuidedSessionPlayer's onExit; parent's existing reducer
//      dispatch path is unchanged.
//
// Cancel before selection: picker's Cancel/X calls onCancel. Parent
// wires this to navigation.goBack() (CheckInFlow → onClose;
// BrowseRunFlow → new onCancel prop). No session is written because
// none was started — the modality picker phase is pre-protocol.

import React, { useMemo, useState } from 'react';

import type {
  BrainState,
  MovementModality,
  Protocol,
  ProtocolSessionSummary,
  ProtocolStep,
  ProtocolTimeWindow,
} from '../../types/models';
import { GuidedSessionPlayer } from './GuidedSessionPlayer';
import { LightMovementModalityPicker } from './LightMovementModalityPicker';

export interface LightMovementProtocolFlowProps {
  protocol: Protocol;
  // null for browse-launched sessions; threaded straight to GuidedSessionPlayer.
  stateBefore: BrainState | null;
  // Same signature as GuidedSessionPlayer's onExit so parent wiring
  // doesn't need to change for non-Light-Movement protocols.
  onExit: (summary: ProtocolSessionSummary) => void;
  // Fires when the user picks a modality. Parent typically stores
  // this in a ref so the terminal write effect can pass it to the
  // session-write call. Optional — if unused, modality is not
  // persisted (the player still runs with the modality-specific
  // hint, but the session doc lacks the field).
  onModalitySelected?: (modality: MovementModality) => void;
  // Fires when the user cancels from the picker before selecting a
  // modality. Parent navigates back. No session write — none
  // started.
  onCancel: () => void;
  // Fires when the user confirms exit at the player PREROLL (after picking a
  // modality, before the timer starts). Threaded to GuidedSessionPlayer's
  // onExitBeforeStart. Opt-in: only browse launches pass it, so check-in's
  // brief-movement preroll behavior is unchanged. No session write — none
  // started.
  onExitBeforeStart?: () => void;
  // Round 3 (Layer 3) — the time window the user picked at the
  // chip step. Forwarded to the modality picker so it can render
  // the gap-acknowledgment line when the recommender returned a
  // protocol shorter than the chosen window. Browse-launched flows
  // omit this; the picker silently doesn't show the line in that case.
  timeWindowSelected?: ProtocolTimeWindow | null;
}

// Modality-specific timer hint copy. Overrides the catalog's static
// hint at runtime. Label stays "Light movement" (set in the catalog)
// so the visual hierarchy is consistent between the two modalities.
const MODALITY_HINTS: Record<MovementModality, string> = {
  walk: 'Walk at a comfortable pace.',
  stretch: 'Stretch gently: neck, shoulders, back, legs.',
};

function applyModalityHint(
  protocol: Protocol,
  modality: MovementModality
): Protocol {
  const overriddenSteps: ProtocolStep[] = protocol.steps.map((step) =>
    step.kind === 'timer'
      ? { ...step, hint: MODALITY_HINTS[modality] }
      : step
  );
  return { ...protocol, steps: overriddenSteps };
}

export function LightMovementProtocolFlow({
  protocol,
  stateBefore,
  onExit,
  onModalitySelected,
  onCancel,
  onExitBeforeStart,
  timeWindowSelected = null,
}: LightMovementProtocolFlowProps) {
  const [selectedModality, setSelectedModality] =
    useState<MovementModality | null>(null);

  const derivedProtocol = useMemo(
    () =>
      selectedModality === null
        ? protocol
        : applyModalityHint(protocol, selectedModality),
    [protocol, selectedModality]
  );

  if (selectedModality === null) {
    return (
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={(modality) => {
          setSelectedModality(modality);
          onModalitySelected?.(modality);
        }}
        onCancel={onCancel}
        timeWindowSelected={timeWindowSelected}
      />
    );
  }

  return (
    <GuidedSessionPlayer
      protocol={derivedProtocol}
      stateBefore={stateBefore}
      onExit={onExit}
      onExitBeforeStart={onExitBeforeStart}
    />
  );
}
