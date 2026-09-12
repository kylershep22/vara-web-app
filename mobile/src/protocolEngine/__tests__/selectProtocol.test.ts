import {
  orderForDestination,
  orderForFamily,
  representativeProtocol,
  selectProtocol,
} from '../selectProtocol';
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
 * weights, and 'destination ordering is still the identity on every shipped
 * cell' at the bottom of this file is the test that will go red to say so.
 * (That test used to live in `retagParity.test.ts`, deleted in slice 7i.)
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

  it('duplicates only ever sit inside ONE cell, in recover and remove', () => {
    const counts = new Map<string, number>();
    for (const p of allProtocols()) {
      counts.set(p.variantKey, (counts.get(p.variantKey) ?? 0) + 1);
    }
    const duplicated = [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k);
    // Two multi-variant phases now, for two different reasons: recover absorbed
    // three former outcomes (slice 3a), and remove holds one variant per family
    // (slice 3c-i). Both are cells with several answers to one question, which
    // is exactly what the array shape was for.
    for (const key of duplicated) {
      expect(key.startsWith('recover-') || key.startsWith('remove-')).toBe(true);
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

  it('holds one AUTHORED variant per family per remove cell', () => {
    // Slice 3c-i added the mental and interpersonal families beside the
    // behavioral one that shipped with slice 3a, so every remove cell now holds
    // exactly three: one answer per family, and every family answered.
    for (const capacity of CAPACITIES) {
      const cell = PROTOCOL_MATRIX.remove[capacity];
      expect(cell).toHaveLength(3);
      expect(cell.map((v) => v.family)).toEqual([
        'behavioral',
        'mental',
        'interpersonal',
      ]);
      for (const variant of cell) {
        expect(variant.placeholder).toBeUndefined();
        // Every Remove variant carries its own acknowledgment line.
        expect(variant.acknowledgment?.length).toBeGreaterThan(0);
      }
    }
  });

  it('THE SLICE 7i COMPLETION GATE: no placeholder outside rewire', () => {
    // WHY THIS EXISTS, and why row 7i named the wrong test. That row said the
    // merge gate in protocolMatrix.removeCellsAuthored.test.ts was "the check
    // that this row is complete". It is not, and it never could have been: that
    // gate reads the `placeholder` FLAG and scans the `remove` CELLS ONLY. The
    // twelve strings 7i replaced carried a `PLACEHOLDER [Jen]` source
    // ANNOTATION and no flag, in `recover` and `refocus`. So the gate was green
    // before 7i and is green after it, and it says nothing about this row.
    //
    // THIS is the check. Every phase a user can reach must be free of
    // placeholder variants; rewire is the one exception and has its own
    // assertion below. Re-introducing a stand-in anywhere else fails here.
    for (const phase of ['remove', 'recover', 'refocus'] as const) {
      for (const capacity of CAPACITIES) {
        for (const variant of PROTOCOL_MATRIX[phase][capacity]) {
          expect(variant.placeholder).toBeUndefined();
          expect(variant.name).not.toContain('PLACEHOLDER');
          // Vacuity guard: a cell emptied by a bad edit would satisfy every
          // assertion above by having nothing to check.
          expect(variant.dailyAction.length).toBeGreaterThan(0);
          expect(variant.whyItWorks.length).toBeGreaterThan(0);
        }
        expect(PROTOCOL_MATRIX[phase][capacity].length).toBeGreaterThan(0);
      }
    }
  });

  it('holds 21 authored variants, and 3 placeholders, across the whole matrix', () => {
    // REHOMED FROM retagParity.test.ts (deleted in slice 7i), and re-expressed.
    // It used to read `RETAGGED.length + removeAuthored.length`, arithmetic over
    // a fixture of twelve strings that Jen's copy replaced. The total is stated
    // directly now: 9 remove + 9 recover + 3 refocus authored, 3 rewire not.
    const authored = PHASES.flatMap((phase) =>
      CAPACITIES.flatMap((capacity) =>
        PROTOCOL_MATRIX[phase][capacity].filter((v) => !v.placeholder)
      )
    );
    const placeholders = PHASES.flatMap((phase) =>
      CAPACITIES.flatMap((capacity) =>
        PROTOCOL_MATRIX[phase][capacity].filter((v) => v.placeholder)
      )
    );

    expect(authored).toHaveLength(21);
    expect(placeholders).toHaveLength(3);
    expect(allProtocols()).toHaveLength(24);
    // Every placeholder is a rewire one. Stated as its own assertion so a
    // placeholder appearing elsewhere fails on WHERE and not only on the count.
    expect(placeholders.every((v) => v.phase === 'rewire')).toBe(true);
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

describe('family-aware selection in the Remove phase (slice 3c-i)', () => {
  const FAMILIES = ['behavioral', 'mental', 'interpersonal'] as const;

  it('serves the captured family at every capacity tier', () => {
    for (const family of FAMILIES) {
      for (const capacity of CAPACITIES) {
        const served = selectProtocol(
          'remove',
          capacity,
          'long',
          ANY_DESTINATION,
          family
        );
        expect(served.family).toBe(family);
      }
    }
  });

  it('falls back to behavioral when the family has no variant in the cell', () => {
    // Every remove cell holds all three families today, so this is asserted
    // against a hand-built cell rather than the matrix: the fallback rung must
    // work before a cell is ever authored unevenly, not after.
    const cell = PROTOCOL_MATRIX.remove.normal.filter(
      (v) => v.family !== 'interpersonal'
    );
    const ordered = orderForFamily(cell, 'interpersonal');
    expect(ordered[0].family).toBe('behavioral');
  });

  it('IS A NO-OP WITH NO CAPTURE, so pre-capture behavior is unchanged', () => {
    for (const capacity of CAPACITIES) {
      const withNothing = selectProtocol('remove', capacity, 'long', ANY_DESTINATION);
      expect(withNothing).toBe(PROTOCOL_MATRIX.remove[capacity][0]);
      expect(withNothing.family).toBe('behavioral');
    }
  });

  it('never consults family outside the Remove phase', () => {
    // The other three phases have no family axis. Passing one must not reorder
    // their cells, which would silently change what they serve on a field that
    // means nothing there.
    for (const phase of ['recover', 'rewire', 'refocus'] as const) {
      for (const family of FAMILIES) {
        expect(
          selectProtocol(phase, 'normal', 'long', ANY_DESTINATION, family)
        ).toBe(selectProtocol(phase, 'normal', 'long', ANY_DESTINATION));
      }
    }
  });

  it('orders rather than filters: every family still sees the whole cell', () => {
    for (const family of FAMILIES) {
      const ordered = orderForFamily(PROTOCOL_MATRIX.remove.normal, family);
      expect(ordered).toHaveLength(PROTOCOL_MATRIX.remove.normal.length);
    }
  });
});


describe('invariants rehomed from retagParity.test.ts (deleted in slice 7i)', () => {
  // retagParity pinned the twelve pre-Jen strings character-for-character, as
  // proof that slice 3a MOVED rows rather than editing them. Slice 7i replaced
  // all twelve with Jen's authored copy, so that fixture now asserts the absence
  // of the wrong thing and the file was deleted on the lifetime its own header
  // declared. These are the invariants it held that were NOT about the fixture,
  // moved here BEFORE the deletion so none of them died with it.
  //
  // ONLY TWO OF ITS THREE ARE BELOW, AND THE THIRD WAS DELIBERATELY NOT COPIED.
  // Its "week-level callers get the cell canonical variant" test is already
  // asserted, identically, by 'returns the cell FIRST variant, for every cell'
  // in the representativeProtocol describe above. Copying it would have added a
  // second copy of a live assertion rather than rescuing a dying one, and two
  // tests of one fact drift.
  const DESTINATIONS: readonly DestinationKey[] = ['focus', 'calm', 'routines', 'energy'];

  it.each(PHASES)(
    'phase %s serves a non-empty protocol for every capacity, time AND destination',
    (phase) => {
      // THE DELTA OVER THE EXISTING TOTALITY TEST, which is why this one is not
      // a duplicate: the test at the top of this file resolves every
      // phase x capacity x timeClass against ONE destination. This crosses all
      // four. They are equivalent only while orderForDestination is the
      // identity, and the moment Jen defines destinationWeight they stop being.
      for (const capacity of CAPACITIES) {
        for (const time of TIME_CLASSES) {
          for (const destination of DESTINATIONS) {
            const served = selectProtocol(phase, capacity, time, destination);
            expect(served).toBeDefined();
            expect(served.dailyAction.length).toBeGreaterThan(0);
          }
        }
      }
    }
  );

  it('destination ordering is still the identity on every shipped cell', () => {
    // No variant carries a destinationWeight yet, so orderForDestination must
    // return authored order untouched. When Jen defines weights this goes red,
    // and that is the signal that ordering has become real rather than a bug.
    for (const phase of PHASES) {
      for (const capacity of CAPACITIES) {
        const cell = PROTOCOL_MATRIX[phase][capacity];
        for (const destination of DESTINATIONS) {
          expect(orderForDestination(cell, destination)).toEqual(cell);
        }
      }
    }
  });
});
