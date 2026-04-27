import {
  BRAIN_STATE_PROTOCOLS,
  getAllProtocols,
  getProtocolById,
  getProtocolsForState,
} from '../brainStateProtocols';
import type {
  BrainState,
  Protocol,
  ProtocolFamily,
  ProtocolStep,
} from '../../types/models';

const ALL_BRAIN_STATES: BrainState[] = [
  'wired',
  'foggy',
  'steady',
  'clear',
  'alive',
];

// Sum of phase seconds across one breath cycle.
function cycleSeconds(step: Extract<ProtocolStep, { kind: 'breath' }>): number {
  return step.phases.reduce((acc, p) => acc + p.seconds, 0);
}

// Sum of `durationSeconds` across all steps.
function stepsDurationSum(steps: ProtocolStep[]): number {
  return steps.reduce((acc, s) => acc + s.durationSeconds, 0);
}

describe('BRAIN_STATE_PROTOCOLS — Phase 1 launch library', () => {
  describe('library shape', () => {
    it('contains exactly 16 variants', () => {
      expect(getAllProtocols()).toHaveLength(16);
    });

    it('every variant id matches the dict key', () => {
      for (const [key, protocol] of Object.entries(BRAIN_STATE_PROTOCOLS)) {
        expect(protocol.id).toBe(key);
      }
    });

    it('contains all 11 launch families', () => {
      const families = new Set(getAllProtocols().map((p) => p.family));
      expect(Array.from(families).sort()).toEqual([
        'box-breathing',
        'brief-movement',
        'bright-light',
        'coherence-breathing',
        'cold-water-reset',
        'cyclic-sighing',
        'extended-exhale',
        'focused-work',
        'mindful-walking',
        'nsdr',
        'sensory-reset',
      ]);
    });

    it.each([
      ['cyclic-sighing-2'],
      ['sensory-reset-2'],
      ['extended-exhale-2'],
      ['box-breathing-2'],
      ['coherence-breathing-5'],
      ['brief-movement-5'],
      ['brief-movement-10'],
      ['nsdr-10'],
      ['nsdr-20'],
      ['cold-water-reset-5'],
      ['mindful-walking-10'],
      ['mindful-walking-20'],
      ['focused-work-45'],
      ['focused-work-90'],
      ['bright-light-10'],
      ['bright-light-20'],
    ])('includes variant id %s', (id) => {
      expect(getProtocolById(id)).not.toBeNull();
    });
  });

  describe('required fields populated', () => {
    it.each(getAllProtocols().map((p): [string, Protocol] => [p.id, p]))(
      '%s has all required string fields',
      (_id, p) => {
        expect(p.name).toBeTruthy();
        expect(p.description).toBeTruthy();
        expect(p.whatItIs).toBeTruthy();
        expect(p.whatYoullNeed).toBeTruthy();
        expect(p.howItWorks).toBeTruthy();
        expect(p.whenItFits).toBeTruthy();
        expect(p.firstTimeOrientation.whatYoullDo).toBeTruthy();
        expect(p.firstTimeOrientation.whatYoullNeed).toBeTruthy();
        expect(p.firstTimeOrientation.whyItWorks).toBeTruthy();
      }
    );

    it.each(getAllProtocols().map((p): [string, Protocol] => [p.id, p]))(
      '%s has valid evidence tier and at least one suitable state',
      (_id, p) => {
        expect([1, 2, 3, 4]).toContain(p.evidenceTier);
        expect(p.suitableForStates.length).toBeGreaterThan(0);
      }
    );

    it.each(getAllProtocols().map((p): [string, Protocol] => [p.id, p]))(
      '%s has timeWindow in {2, 5, 10, 20, 45} and at least one step',
      (_id, p) => {
        expect([2, 5, 10, 20, 45]).toContain(p.timeWindow);
        expect(p.steps.length).toBeGreaterThan(0);
      }
    );
  });

  describe('step durations sum to protocol durationSeconds', () => {
    it.each(getAllProtocols().map((p): [string, Protocol] => [p.id, p]))(
      '%s — steps sum equals durationSeconds',
      (_id, p) => {
        expect(stepsDurationSum(p.steps)).toBe(p.durationSeconds);
      }
    );
  });

  describe('breath protocols end on a complete cycle boundary', () => {
    const breathProtocols = getAllProtocols().filter((p) =>
      p.steps.some((s) => s.kind === 'breath')
    );

    it.each(breathProtocols.map((p): [string, Protocol] => [p.id, p]))(
      '%s — every breath step duration is a multiple of its cycle',
      (_id, p) => {
        for (const step of p.steps) {
          if (step.kind !== 'breath') continue;
          const cycle = cycleSeconds(step);
          expect(cycle).toBeGreaterThan(0);
          expect(step.durationSeconds % cycle).toBe(0);
        }
      }
    );
  });

  describe('audio steps reference Firebase Storage paths', () => {
    const audioProtocols = getAllProtocols().filter((p) =>
      p.steps.some((s) => s.kind === 'audio')
    );

    it('all audio steps live under nsdr/ with versioned mp3 names', () => {
      for (const p of audioProtocols) {
        for (const step of p.steps) {
          if (step.kind !== 'audio') continue;
          expect(step.audioPath).toMatch(/^nsdr\/nsdr_\d+min_v\d+\.mp3$/);
        }
      }
    });
  });

  describe('variant family consistency', () => {
    it('variants in the same family share the same name and modality', () => {
      const byFamily = new Map<ProtocolFamily, Protocol[]>();
      for (const p of getAllProtocols()) {
        const arr = byFamily.get(p.family) ?? [];
        arr.push(p);
        byFamily.set(p.family, arr);
      }
      for (const [family, variants] of byFamily) {
        if (variants.length < 2) continue;
        const names = new Set(variants.map((v) => v.name));
        const modalities = new Set(variants.map((v) => v.modality));
        expect(names.size).toBe(1);
        expect(modalities.size).toBe(1);
        // family field matches the family key
        for (const v of variants) {
          expect(v.family).toBe(family);
        }
      }
    });
  });

  describe('state coverage', () => {
    it.each(ALL_BRAIN_STATES)('every state has at least one protocol — %s', (state) => {
      const matches = getProtocolsForState(state);
      expect(matches.length).toBeGreaterThan(0);
    });

    // The Phase 1 transitional `getProtocolForState` was deleted in
    // sub-step 2.5 alongside the four caller migrations. The remaining
    // state-coverage assertion above is sufficient — the new
    // `selectProtocol` helper has its own exhaustive matrix tests
    // in services/__tests__/protocolSelector.service.test.ts.
  });

  describe('getProtocolById', () => {
    it('returns null for unknown id', () => {
      expect(getProtocolById('not-a-protocol')).toBeNull();
    });

    it('returns the protocol for a known id', () => {
      const p = getProtocolById('cyclic-sighing-2');
      expect(p).not.toBeNull();
      expect(p?.family).toBe('cyclic-sighing');
    });
  });
});
