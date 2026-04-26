import {
  selectProtocol,
  type ProtocolSelectionInput,
} from '../protocolSelector.service';
import type { BrainState, ProtocolTimeWindow } from '../../types/models';

describe('selectProtocol — Phase 2 stub recommender', () => {
  describe('eligibility filter', () => {
    it('Wired + 2 min returns the alphabetically-first 2-min Wired protocol', () => {
      // Eligible: box-breathing-2, cyclic-sighing-2, extended-exhale-2,
      // sensory-reset-2 (all timeWindow=2, all include 'wired'). Sorted
      // ascending by id, box-breathing-2 wins.
      const result = selectProtocol({ state: 'wired', timeWindow: 2 });
      expect(result.id).toBe('box-breathing-2');
    });

    it('Steady + 2 min returns box-breathing-2 (only 2-min Steady protocol)', () => {
      const result = selectProtocol({ state: 'steady', timeWindow: 2 });
      expect(result.id).toBe('box-breathing-2');
    });

    it('Steady + 5 min still returns box-breathing-2 (alphabetical first; coherence-breathing-5 also eligible)', () => {
      const result = selectProtocol({ state: 'steady', timeWindow: 5 });
      // Eligible: box-breathing-2 (timeWindow=2 ≤ 5, includes steady),
      // coherence-breathing-5 (timeWindow=5, includes steady).
      // box-breathing-2 sorts first.
      expect(result.id).toBe('box-breathing-2');
    });

    it('Clear + 5 min returns coherence-breathing-5 (only Clear protocol fitting)', () => {
      const result = selectProtocol({ state: 'clear', timeWindow: 5 });
      expect(result.id).toBe('coherence-breathing-5');
    });

    it('Clear + 45 min returns coherence-breathing-5 (alphabetical first; focused-work-45/90 also eligible)', () => {
      const result = selectProtocol({ state: 'clear', timeWindow: 45 });
      expect(result.id).toBe('coherence-breathing-5');
    });

    it('Alive + 5 min returns brief-movement-5', () => {
      const result = selectProtocol({ state: 'alive', timeWindow: 5 });
      expect(result.id).toBe('brief-movement-5');
    });

    it('Foggy + 10 min returns brief-movement-10 (alphabetical first among 10-min foggy options)', () => {
      // Eligible: brief-movement-10 (10, foggy+alive),
      // brief-movement-5 (5≤10, foggy+alive),
      // bright-light-10 (10, foggy),
      // cold-water-reset-5 (5≤10, wired+foggy),
      // mindful-walking-10 (10, steady+foggy),
      // nsdr-10 (10, foggy).
      // brief-movement-10 sorts first.
      const result = selectProtocol({ state: 'foggy', timeWindow: 10 });
      expect(result.id).toBe('brief-movement-10');
    });

    it('time-window filter is <= (a 20-min user can receive a 5-min protocol)', () => {
      // Coherence Breathing has timeWindow=5; the user budgeting 20
      // minutes should still be eligible to receive it.
      const result = selectProtocol({ state: 'clear', timeWindow: 20 });
      expect(result.timeWindow).toBeLessThanOrEqual(20);
      expect(result.suitableForStates).toContain('clear');
    });
  });

  describe('no-match — __DEV__ throws (jest runs in __DEV__)', () => {
    // Contract: when no protocol matches, the dev path throws loudly
    // with the (state, timeWindow) pair in the message so schema bugs
    // and call-site bugs surface immediately. The production path
    // (covered below) falls back to cyclic-sighing-2.

    it('Foggy + 2 min throws with state and timeWindow in the message', () => {
      // No 2-min protocol includes 'foggy' in suitableForStates.
      expect(() => selectProtocol({ state: 'foggy', timeWindow: 2 })).toThrow(
        /no protocol matched.*state=foggy.*timeWindow=2/i
      );
    });

    it('Clear + 2 min throws', () => {
      expect(() => selectProtocol({ state: 'clear', timeWindow: 2 })).toThrow(
        /no protocol matched.*state=clear.*timeWindow=2/i
      );
    });

    it('Alive + 2 min throws', () => {
      expect(() => selectProtocol({ state: 'alive', timeWindow: 2 })).toThrow(
        /no protocol matched.*state=alive.*timeWindow=2/i
      );
    });
  });

  describe('no-match — production falls back to cyclic-sighing-2', () => {
    let originalDev: unknown;

    beforeEach(() => {
      originalDev = (globalThis as unknown as { __DEV__: unknown }).__DEV__;
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    });

    afterEach(() => {
      (globalThis as unknown as { __DEV__: unknown }).__DEV__ = originalDev;
    });

    it('Foggy + 2 min falls back to cyclic-sighing-2 when __DEV__ is false', () => {
      const result = selectProtocol({ state: 'foggy', timeWindow: 2 });
      expect(result.id).toBe('cyclic-sighing-2');
    });
  });

  describe('determinism', () => {
    it('returns the same protocol on repeated calls with identical input', () => {
      const input: ProtocolSelectionInput = { state: 'wired', timeWindow: 5 };
      const a = selectProtocol(input);
      const b = selectProtocol(input);
      const c = selectProtocol(input);
      expect(a.id).toBe(b.id);
      expect(b.id).toBe(c.id);
    });

    it('returns a Protocol whose suitableForStates includes the requested state (when no fallback)', () => {
      const inputs: Array<[BrainState, ProtocolTimeWindow]> = [
        ['wired', 2],
        ['wired', 5],
        ['steady', 2],
        ['steady', 5],
        ['clear', 5],
        ['clear', 45],
        ['alive', 5],
        ['alive', 10],
        ['foggy', 5],
        ['foggy', 10],
      ];
      for (const [state, timeWindow] of inputs) {
        const result = selectProtocol({ state, timeWindow });
        expect(result.suitableForStates).toContain(state);
      }
    });
  });
});
