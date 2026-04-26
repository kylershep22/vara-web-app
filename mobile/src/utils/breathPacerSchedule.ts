// Pure helper that turns a BreathStep into a flat schedule of phase
// entries. Exported separately from BreathPacer so the timing logic is
// testable without mounting the React component.

import type { BreathStep } from '../types/models';

export interface PhaseScheduleEntry {
  // Index into BreathStep.phases (which kind of phase: inhale/hold/exhale).
  phaseIndex: number;
  // 0-based cycle number. The phases array repeats `cycleCount` times.
  cycleIndex: number;
  // Seconds elapsed from step start when this phase begins.
  startSeconds: number;
  // Duration of this specific phase (copied from phases[phaseIndex].seconds).
  durationSeconds: number;
}

// Returns the full ordered list of phase entries spanning the breath
// step's `durationSeconds`. The data tests in
// `constants/__tests__/brainStateProtocols.test.ts` guarantee that
// durationSeconds is a whole-cycle multiple, so this helper does not
// emit a partial trailing cycle.
export function computeBreathPhaseSchedule(
  step: BreathStep
): PhaseScheduleEntry[] {
  const cycleSeconds = step.phases.reduce((acc, p) => acc + p.seconds, 0);
  if (cycleSeconds <= 0 || step.phases.length === 0) {
    return [];
  }
  const cycleCount = Math.floor(step.durationSeconds / cycleSeconds);
  const schedule: PhaseScheduleEntry[] = [];
  for (let cycleIndex = 0; cycleIndex < cycleCount; cycleIndex++) {
    let phaseStart = cycleIndex * cycleSeconds;
    for (let phaseIndex = 0; phaseIndex < step.phases.length; phaseIndex++) {
      const phase = step.phases[phaseIndex];
      schedule.push({
        phaseIndex,
        cycleIndex,
        startSeconds: phaseStart,
        durationSeconds: phase.seconds,
      });
      phaseStart += phase.seconds;
    }
  }
  return schedule;
}
