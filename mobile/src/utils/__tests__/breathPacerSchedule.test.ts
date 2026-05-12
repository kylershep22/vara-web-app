import type { BreathStep } from '../../types/models';
import { computeBreathPhaseSchedule } from '../breathPacerSchedule';

const cyclicSighingStep: BreathStep = {
  kind: 'breath',
  id: 'cycle',
  durationSeconds: 120,
  phases: [
    { kind: 'inhale', seconds: 1.5, label: 'Inhale' },
    { kind: 'inhale', seconds: 1, label: 'Top up' },
    { kind: 'exhale', seconds: 5, label: 'Exhale' },
  ],
};

const boxBreathingStep: BreathStep = {
  kind: 'breath',
  id: 'cycle',
  durationSeconds: 128,
  phases: [
    { kind: 'inhale', seconds: 4, label: 'Inhale' },
    { kind: 'hold', seconds: 4, label: 'Hold' },
    { kind: 'exhale', seconds: 4, label: 'Exhale' },
    { kind: 'hold', seconds: 4, label: 'Hold' },
  ],
};

describe('computeBreathPhaseSchedule', () => {
  describe('Cyclic Sighing (1.5 + 1 + 5 = 7.5s, 16 cycles)', () => {
    const schedule = computeBreathPhaseSchedule(cyclicSighingStep);

    it('emits exactly 16 cycles × 3 phases = 48 entries', () => {
      expect(schedule).toHaveLength(48);
    });

    it('first entry starts at 0 seconds and is the first inhale phase', () => {
      expect(schedule[0]).toEqual({
        phaseIndex: 0,
        cycleIndex: 0,
        startSeconds: 0,
        durationSeconds: 1.5,
      });
    });

    it('second entry is the top-up inhale at 1.5s', () => {
      expect(schedule[1]).toEqual({
        phaseIndex: 1,
        cycleIndex: 0,
        startSeconds: 1.5,
        durationSeconds: 1,
      });
    });

    it('third entry is the exhale at 2.5s', () => {
      expect(schedule[2]).toEqual({
        phaseIndex: 2,
        cycleIndex: 0,
        startSeconds: 2.5,
        durationSeconds: 5,
      });
    });

    it('fourth entry starts the next cycle at 7.5s', () => {
      expect(schedule[3]).toEqual({
        phaseIndex: 0,
        cycleIndex: 1,
        startSeconds: 7.5,
        durationSeconds: 1.5,
      });
    });

    it('last entry ends exactly at durationSeconds', () => {
      const last = schedule[schedule.length - 1];
      expect(last.startSeconds + last.durationSeconds).toBe(120);
    });
  });

  describe('Box Breathing (16s × 8 cycles = 128s)', () => {
    const schedule = computeBreathPhaseSchedule(boxBreathingStep);

    it('emits 8 cycles × 4 phases = 32 entries', () => {
      expect(schedule).toHaveLength(32);
    });

    it('every cycle starts on a 16-second boundary', () => {
      for (let cycleIndex = 0; cycleIndex < 8; cycleIndex++) {
        const firstPhaseOfCycle = schedule[cycleIndex * 4];
        expect(firstPhaseOfCycle.startSeconds).toBe(cycleIndex * 16);
        expect(firstPhaseOfCycle.cycleIndex).toBe(cycleIndex);
        expect(firstPhaseOfCycle.phaseIndex).toBe(0);
      }
    });

    it('last entry ends exactly at 128s', () => {
      const last = schedule[schedule.length - 1];
      expect(last.startSeconds + last.durationSeconds).toBe(128);
    });
  });

  describe('edge cases', () => {
    it('returns empty schedule when phases is empty', () => {
      const step: BreathStep = {
        kind: 'breath',
        id: 'empty',
        durationSeconds: 60,
        phases: [],
      };
      expect(computeBreathPhaseSchedule(step)).toEqual([]);
    });

    it('returns empty schedule when cycle sums to zero', () => {
      const step: BreathStep = {
        kind: 'breath',
        id: 'zero',
        durationSeconds: 60,
        phases: [{ kind: 'hold', seconds: 0 }],
      };
      expect(computeBreathPhaseSchedule(step)).toEqual([]);
    });

    it('truncates a partial trailing cycle (defensive against bad data)', () => {
      const step: BreathStep = {
        kind: 'breath',
        id: 'partial',
        durationSeconds: 25, // not a multiple of 16
        phases: [
          { kind: 'inhale', seconds: 4 },
          { kind: 'hold', seconds: 4 },
          { kind: 'exhale', seconds: 4 },
          { kind: 'hold', seconds: 4 },
        ],
      };
      const schedule = computeBreathPhaseSchedule(step);
      // Only 1 full cycle fits in 25s → 4 entries.
      expect(schedule).toHaveLength(4);
      const last = schedule[schedule.length - 1];
      expect(last.startSeconds + last.durationSeconds).toBe(16);
    });
  });

  describe('cumulative timing invariant', () => {
    it.each([cyclicSighingStep, boxBreathingStep])(
      'every entry start equals previous entry end (no gaps, no overlaps)',
      (step) => {
        const schedule = computeBreathPhaseSchedule(step);
        for (let i = 1; i < schedule.length; i++) {
          const prev = schedule[i - 1];
          const cur = schedule[i];
          expect(cur.startSeconds).toBeCloseTo(
            prev.startSeconds + prev.durationSeconds,
            5
          );
        }
      }
    );
  });
});
