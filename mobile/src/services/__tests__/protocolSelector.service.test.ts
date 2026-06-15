import {
  selectProtocol,
  type ProtocolSelectionInput,
} from '../protocolSelector.service';
import type { BrainState, ProtocolTimeWindow } from '../../types/models';

describe('selectProtocol — Phase 2 stub recommender', () => {
  describe('closest-match sort + alphabetical tie-break', () => {
    it('Wired + 2 min returns the alphabetically-first 2-min Wired protocol (all eligible are exact matches)', () => {
      // Eligible: box-breathing-2, cyclic-sighing-2, extended-exhale-2,
      // sensory-reset-2 (all timeWindow=2, all include 'wired'). All
      // four are distance=0 from the chosen window; alphabetical
      // tie-break picks box-breathing-2.
      const result = selectProtocol({ state: 'wired', timeWindow: 2 });
      expect(result.id).toBe('box-breathing-2');
    });

    it('Steady + 2 min returns box-breathing-2 (only 2-min Steady protocol)', () => {
      const result = selectProtocol({ state: 'steady', timeWindow: 2 });
      expect(result.id).toBe('box-breathing-2');
    });

    it('Steady + 5 min returns coherence-breathing-5 (closest match, beats box-breathing-2 distance=3)', () => {
      // Eligible: box-breathing-2 (timeWindow=2, distance=3),
      // coherence-breathing-5 (timeWindow=5, distance=0).
      // Closest-match sort picks coherence-breathing-5.
      const result = selectProtocol({ state: 'steady', timeWindow: 5 });
      expect(result.id).toBe('coherence-breathing-5');
    });

    it('Clear + 5 min returns coherence-breathing-5 (only Clear protocol fitting)', () => {
      const result = selectProtocol({ state: 'clear', timeWindow: 5 });
      expect(result.id).toBe('coherence-breathing-5');
    });

    it('Clear + 45 min returns coherence-breathing-5 (focused-work retired; only Clear-suitable protocol remaining)', () => {
      // focused-work-45/90 were retired in the engine wiring. The only
      // Clear-suitable protocol left is coherence-breathing-5 (timeWindow 5
      // ≤ 45), so it is selected for any Clear budget ≥ 5.
      const result = selectProtocol({ state: 'clear', timeWindow: 45 });
      expect(result.id).toBe('coherence-breathing-5');
    });

    it('Alive + 5 min returns brief-movement-5', () => {
      const result = selectProtocol({ state: 'alive', timeWindow: 5 });
      expect(result.id).toBe('brief-movement-5');
    });

    it('Foggy + 10 min returns brief-movement-10 (one of four exact matches; alphabetical tie-break wins)', () => {
      // Eligible at distance=0: brief-movement-10, bright-light-10,
      // mindful-walking-10, nsdr-10. Distance=5: brief-movement-5,
      // cold-water-reset-5. Closest-match sort picks the distance=0
      // group; alphabetical tie-break selects brief-movement-10.
      const result = selectProtocol({ state: 'foggy', timeWindow: 10 });
      expect(result.id).toBe('brief-movement-10');
    });

    it('Foggy + 20 min returns a 20-min protocol (regression: was brief-movement-10 under old alphabetical-only sort)', () => {
      // Eligible at distance=0: bright-light-20, mindful-walking-20,
      // nsdr-20. Alphabetical tie-break picks bright-light-20. The
      // critical assertion is that the result has timeWindow=20 — the
      // exact match — not a shorter protocol.
      const result = selectProtocol({ state: 'foggy', timeWindow: 20 });
      expect(result.timeWindow).toBe(20);
      expect(result.id).toBe('bright-light-20');
    });

    it('Wired + 20 min returns a 5-min protocol (no exact match; closest under wins)', () => {
      // Wired protocols cap at 5 min in the current library:
      //   timeWindow=2: box-breathing-2, cyclic-sighing-2, extended-exhale-2, sensory-reset-2
      //   timeWindow=5: cold-water-reset-5
      // Distances from 20: 18 for the 2-min set, 15 for cold-water-reset-5.
      // Closest under is cold-water-reset-5.
      const result = selectProtocol({ state: 'wired', timeWindow: 20 });
      expect(result.id).toBe('cold-water-reset-5');
      expect(result.timeWindow).toBe(5);
    });

    it('alphabetical tie-break when multiple exact matches exist (Wired + 2)', () => {
      // Four exact matches at distance=0; alphabetical tie-break is
      // deterministic across runs.
      const a = selectProtocol({ state: 'wired', timeWindow: 2 });
      const b = selectProtocol({ state: 'wired', timeWindow: 2 });
      expect(a.id).toBe('box-breathing-2');
      expect(b.id).toBe('box-breathing-2');
    });

    it('time-window filter is <= (a 20-min user can receive a shorter protocol when no exact match)', () => {
      // Wired+20 has no exact match; the result must still be ≤ 20.
      const result = selectProtocol({ state: 'wired', timeWindow: 20 });
      expect(result.timeWindow).toBeLessThanOrEqual(20);
      expect(result.suitableForStates).toContain('wired');
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
