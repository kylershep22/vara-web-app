// Display helpers for the protocol library. Keeps presentation logic out
// of the static data (constants/brainStateProtocols.ts) and out of the
// schema (types/models.ts). UI consumers (Phase 1: TodaysProtocolCard;
// Phase 2: ProtocolDetailScreen, GuidedSessionPlayer) call into here.

import type {
  EvidenceTier,
  Protocol,
  ProtocolModality,
  ProtocolStep,
} from '../types/models';

// User-facing duration label. Always "{timeWindow} min" — keeps the label
// consistent with the time-window bucket the user picked, even when
// `durationSeconds` runs slightly over (e.g. Box Breathing's 128s ends
// on a complete cycle but still reads as "2 min").
export function formatProtocolDuration(p: Protocol): string {
  return `${p.timeWindow} min`;
}

// Material Community Icons name for a modality. Aligned with the icon
// set the existing TodaysProtocolCard pulls from. Phase 2 may switch to
// Lucide per the Build Guide; revisit then.
export function modalityIconName(modality: ProtocolModality): string {
  switch (modality) {
    case 'breath':
      return 'weather-windy';
    case 'movement':
      return 'run-fast';
    case 'audio':
      return 'headphones';
    case 'sensory':
      return 'eye-outline';
    case 'cold':
      return 'snowflake';
    case 'cognitive':
      return 'brain';
    case 'environmental':
      return 'weather-sunny';
  }
}

// Plain-language evidence chip. Stored numeric tier on the protocol, but
// the UI never shows the number — it shows the corresponding chip text.
// Mapping is from docs/Vara_Protocol_Detail_Content.md "Evidence chip
// mapping."
export function evidenceChipLabel(tier: EvidenceTier): string {
  switch (tier) {
    case 1:
      return 'Strong research backing';
    case 2:
      return 'Good research + clinical tradition';
    case 3:
      return 'Clinical tradition';
    case 4:
      return 'Traditional practice, use with care';
  }
}

// Flat list of instruction strings derived from the structured `steps[]`
// array. Used by Phase 1's TodaysProtocolCard, which renders a numbered
// list. Phase 2's GuidedSessionPlayer renders steps natively (with
// timers, pacers, and audio) and does not call this helper.
export function deriveStepInstructions(steps: ProtocolStep[]): string[] {
  return steps.map(stepToString);
}

function stepToString(step: ProtocolStep): string {
  switch (step.kind) {
    case 'breath':
      return step.guidance ?? 'Follow the visual pacer.';
    case 'audio':
      return 'Lie down somewhere quiet. Headphones if you have them. Let the audio guide you.';
    case 'instruction':
      return step.text;
    case 'timer':
      return step.hint ? `${step.label} — ${step.hint}` : step.label;
  }
}
