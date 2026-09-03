import { representativeProtocol, selectProtocol } from '../selectProtocol';
import { PHASE_ORDER } from '../../constants/journey';
import {
  PROTOCOL_MATRIX,
  TIME_CLASSES,
  TIME_CLASS_MAX_MINUTES,
  allProtocols,
  unauthoredVariants,
} from '../protocolMatrix';
import type { CapacityTier, TimeClass } from '../types';
import type { DestinationKey, PhaseKey } from '../../types/models';

const PHASES: readonly PhaseKey[] = PHASE_ORDER;
const CAPACITIES: CapacityTier[] = ['normal', 'limited', 'slammed'];
/**
 * The destination every call below passes unless it is testing ordering.
 *
 * ARBITRARY AND SAFE TODAY: no variant carries a destinationWeight, so
 * `orderForDestination` is the identity and the choice cannot affect a single
 * assertion in this file. It stops being arbitrary the moment Jen defines
 * weights, and `retagParity.test.ts` is the test that will go red to say so.
 */
const ANY_DESTINATION: DestinationKey = 'focus';

describe('selectProtocol (spec 6.2, time-aware per roadmap 3b-ii-a)', () => {
  it.each(PHASES)('returns a protocol for every capacity of phase %s', (phase) => {
    for (const capacity of CAPACITIES) {
      for (const time of TIME_CLASSES) {
        const protocol = selectProtocol(phase, capacity, time, ANY_DESTINATION);
        expect(protocol.phase).toBe(phase);
        expect(protocol.capacity).toBe(capacity);
      }
    }
  });

  // THE TOTALITY GUARANTEE, restated as a test because the shape no longer
  // provides it. The old matrix held exactly one protocol per cell, so a lookup
  // could not miss; a cell is an ARRAY now and a time class may have no variant
  // in it. The fallback in selectProtocol is what keeps the function total, and
  // this is the only thing that holds it to that.
  it('resolves every phase x capacity x timeClass to a protocol', () => {
    for (const phase of PHASES) {
      for (const capacity of CAPACITIES) {
        for (const time of TIME_CLASSES) {
          expect(selectProtocol(phase, capacity, time, ANY_DESTINATION)).toBeTruthy();
        }
      }
    }
  });

  it('prefers an exact timeClass match when the cell has one', () => {
    // refocus/limited (the former focus/limited) is authored at medium.
    const picked = selectProtocol('refocus', 'limited', 'medium', ANY_DESTINATION);
    expect(picked.timeClass).toBe('medium');
    expect(picked.estMinutes).toBe(15);
  });

  describe('the fallback, when a cell has no variant of the asked class', () => {
    it('falls to the nearest SHORTER class rather than overrunning the budget', () => {
      // refocus/slammed is authored only at short. A user with a long window
      // is served the short one: finishing early is fine, overrunning the time
      // they said they had is not.
      const picked = selectProtocol('refocus', 'slammed', 'long', ANY_DESTINATION);
      expect(picked.timeClass).toBe('short');
      expect(picked.estMinutes).toBe(5);
    });

    it('falls to the cell FIRST variant when nothing shorter exists either', () => {
      // refocus/normal is authored only at long. A short ask has nothing shorter
      // to drop to, so the cell's canonical variant is served rather than
      // nothing at all. This is the one case that can exceed the asked window,
      // and it is deliberate: a protocol the user must trim beats a blank card.
      const picked = selectProtocol('refocus', 'normal', 'short', ANY_DESTINATION);
      expect(picked).toBe(PROTOCOL_MATRIX.refocus.normal[0]);
      expect(picked.timeClass).toBe('long');
    });
  });

  it('is pure: the same call returns the same object every time', () => {
    expect(selectProtocol('recover', 'limited', 'medium', ANY_DESTINATION)).toBe(
      selectProtocol('recover', 'limited', 'medium', ANY_DESTINATION)
    );
  });
});

describe('representativeProtocol (week-level callers)', () => {
  // The weekly open and the onboarding terminal resolve a protocol BEFORE any
  // daily time answer exists. They must not invent one: they take the cell's
  // canonical variant, which is what `WeeklyCycle.protocolId` then describes.
  it('returns the cell FIRST variant, for every cell', () => {
    for (const phase of PHASES) {
      for (const capacity of CAPACITIES) {
        expect(representativeProtocol(phase, capacity)).toBe(
          PROTOCOL_MATRIX[phase][capacity][0]
        );
      }
    }
  });

  it('takes no time argument, so a week cannot record a daily answer', () => {
    expect(representativeProtocol.length).toBe(2);
  });
});

describe('protocol id and variant key', () => {
  // protocolId STAYS cell-level. It is persisted on WeeklyCycle.protocolId and
  // typed as a closed union in types/analyticsEvents, so widening it for
  // variants would need a migration. Variants are told apart by variantKey.
  it('gives every variant in a cell the SAME cell-level id', () => {
    for (const phase of PHASES) {
      for (const capacity of CAPACITIES) {
        for (const variant of PROTOCOL_MATRIX[phase][capacity]) {
          expect(variant.id).toBe(`${phase}-${capacity}`);
        }
      }
    }
  });

  it('covers all 12 cells with distinct ids', () => {
    const ids = PHASES.flatMap((phase) =>
      CAPACITIES.map((capacity) => representativeProtocol(phase, capacity).id)
    );
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  // WEAKENED BY THE RE-TAG, AND HONESTLY SO. variantKey used to be unique
  // across the matrix because every cell held one variant. `recover` now holds
  // three, and recover/limited holds three MEDIUM ones, so three variants share
  // the key `recover-limited-medium`. That is a real consequence of collapsing
  // three outcomes into one phase, not a bug, and the type comment says so.
  //
  // What must still hold, and is the assertion worth having: a variantKey names
  // a (phase, capacity, timeClass) SLOT, so a collision across two different
  // cells would mean the key had stopped describing where a variant lives.
  it('derives variantKey from the slot, so it never collides ACROSS cells', () => {
    const seen = new Map<string, string>();
    for (const phase of PHASES) {
      for (const capacity of CAPACITIES) {
        for (const variant of PROTOCOL_MATRIX[phase][capacity]) {
          expect(variant.variantKey).toBe(
            `${phase}-${capacity}-${variant.timeClass}`
          );
          const cell = `${phase}/${capacity}`;
          const priorCell = seen.get(variant.variantKey);
          if (priorCell !== undefined) expect(priorCell).toBe(cell);
          seen.set(variant.variantKey, cell);
        }
      }
    }
  });

  it('duplicates only ever sit inside ONE cell, and only in recover today', () => {
    const counts = new Map<string, number>();
    for (const p of allProtocols()) {
      counts.set(p.variantKey, (counts.get(p.variantKey) ?? 0) + 1);
    }
    const duplicated = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    for (const key of duplicated) {
      expect(key.startsWith('recover-')).toBe(true);
    }
  });
});

describe('protocol matrix content integrity', () => {
  it('gives every protocol the fields the Today card needs', () => {
    for (const protocol of allProtocols()) {
      expect(protocol.name.length).toBeGreaterThan(0);
      expect(protocol.dailyAction.length).toBeGreaterThan(0);
      expect(protocol.whyItWorks.length).toBeGreaterThan(0);
      expect(protocol.estMinutes).toBeGreaterThan(0);
      expect(protocol.quickWinPracticeId.length).toBeGreaterThan(0);
      expect(Array.isArray(protocol.supportingPracticeIds)).toBe(true);
    }
  });

  it('never leaves a cell empty, which the fallback could not recover from', () => {
    for (const phase of PHASES) {
      for (const capacity of CAPACITIES) {
        expect(PROTOCOL_MATRIX[phase][capacity].length).toBeGreaterThan(0);
      }
    }
  });

  // REPLACES the old cross-capacity monotonicity assertion (normal >= limited
  // >= slammed on estMinutes). That rule encoded capacity as the time PROXY,
  // and capacity is readiness now, orthogonal to duration, so comparing minutes
  // across tiers no longer means anything. This is the stronger replacement: a
  // variant's cost has to match the window it claims to fit.
  it('keeps every estMinutes inside its own timeClass bounds', () => {
    for (const protocol of allProtocols()) {
      expect(protocol.estMinutes).toBeLessThanOrEqual(
        TIME_CLASS_MAX_MINUTES[protocol.timeClass]
      );
      const shorter = TIME_CLASSES.slice(0, TIME_CLASSES.indexOf(protocol.timeClass));
      for (const lower of shorter) {
        expect(protocol.estMinutes).toBeGreaterThan(TIME_CLASS_MAX_MINUTES[lower]);
      }
    }
  });

  it('orders variants within a cell shortest-first', () => {
    for (const phase of PHASES) {
      for (const capacity of CAPACITIES) {
        const classes = PROTOCOL_MATRIX[phase][capacity].map((v) =>
          TIME_CLASSES.indexOf(v.timeClass)
        );
        expect([...classes].sort((a, b) => a - b)).toEqual(classes);
      }
    }
  });

  it('keeps every user-facing string free of em dashes (principle 8)', () => {
    for (const protocol of allProtocols()) {
      for (const copy of [protocol.name, protocol.dailyAction, protocol.whyItWorks]) {
        expect(copy).not.toMatch(/[—–]/);
      }
    }
  });
});

describe('authored coverage after the slice 3a re-tag', () => {
  // WHAT IS ACTUALLY WRITTEN, pinned so it cannot quietly shrink and so the gap
  // stays visible without reading the matrix.
  //
  // THE OLD "one authored variant per cell" ASSERTION IS GONE, and its removal
  // is the point rather than a loosening: the re-tag collapsed stress, energy
  // and routines into `recover`, so that cell holds three. Asserting one per
  // cell now would be asserting that the re-tag did not happen.

  it('holds three variants per recover cell and one per refocus cell', () => {
    for (const capacity of CAPACITIES) {
      expect(PROTOCOL_MATRIX.recover[capacity]).toHaveLength(3);
      expect(PROTOCOL_MATRIX.refocus[capacity]).toHaveLength(1);
    }
  });

  it('holds exactly one AUTHORED variant per remove cell', () => {
    // Remove was placeholder-only when the re-key landed and is authored now
    // (Jen's behavioral-family content). The merge gate in
    // protocolMatrix.removeCellsAuthored.test.ts is the enforcement; this is
    // the shape assertion beside it.
    for (const capacity of CAPACITIES) {
      const cell = PROTOCOL_MATRIX.remove[capacity];
      expect(cell).toHaveLength(1);
      expect(cell[0].placeholder).toBeUndefined();
    }
  });

  it('holds exactly one PLACEHOLDER per rewire cell', () => {
    // Rewire is still net-new and unreachable until slice 5, so its stand-ins
    // outlive the slice 3a gate by design. When slice 5 makes it reachable this
    // becomes a gate of its own.
    for (const capacity of CAPACITIES) {
      const cell = PROTOCOL_MATRIX.rewire[capacity];
      expect(cell).toHaveLength(1);
      expect(cell[0].placeholder).toBe(true);
    }
  });

  it('reports every unauthored phase x capacity x timeClass triple', () => {
    const gaps = unauthoredVariants();
    // 4 phases x 3 capacities x 3 classes = 36 triples. 13 are covered:
    //   refocus  3 (one class per cell)
    //   recover  4 (normal has medium+long; limited medium; slammed short)
    //   remove   3, rewire 3 (one placeholder class per cell)
    // 36 - 13 = 23. This number IS the content brief and it shrinks as Jen
    // writes; it grew from 24 because the collapse gave recover a second class
    // in one cell while the two net-new phases added six slots of their own.
    expect(gaps).toHaveLength(23);
    // Nothing authored may appear in the gap list.
    for (const gap of gaps) {
      const cell = PROTOCOL_MATRIX[gap.phase][gap.capacity];
      expect(cell.some((v) => v.timeClass === gap.timeClass)).toBe(false);
    }
  });

  it('has no long-window variant for recover below normal readiness', () => {
    // The former routines and stress rows top out well under 15 minutes, so the
    // long column stays a genuine content gap rather than an indexing artefact.
    for (const capacity of ['limited', 'slammed'] as const) {
      expect(
        PROTOCOL_MATRIX.recover[capacity].some((v) => v.timeClass === 'long')
      ).toBe(false);
    }
  });

  it.each<[PhaseKey, CapacityTier, TimeClass]>([
    ['refocus', 'slammed', 'short'],
    ['refocus', 'limited', 'medium'],
    ['refocus', 'normal', 'long'],
    ['recover', 'slammed', 'short'],
    ['recover', 'limited', 'medium'],
    ['recover', 'normal', 'medium'],
  ])('authors %s/%s at %s', (phase, capacity, timeClass) => {
    expect(PROTOCOL_MATRIX[phase][capacity][0].timeClass).toBe(timeClass);
  });
});
