import { representativeProtocol, selectProtocol } from '../selectProtocol';
import {
  PROTOCOL_MATRIX,
  TIME_CLASSES,
  TIME_CLASS_MAX_MINUTES,
  allProtocols,
  unauthoredVariants,
} from '../protocolMatrix';
import type { CapacityTier, OutcomeKey, TimeClass } from '../types';

const OUTCOMES: OutcomeKey[] = ['focus', 'stress', 'routines', 'energy'];
const CAPACITIES: CapacityTier[] = ['normal', 'limited', 'slammed'];

describe('selectProtocol (spec 6.2, time-aware per roadmap 3b-ii-a)', () => {
  it.each(OUTCOMES)('returns a protocol for every capacity of outcome %s', (outcome) => {
    for (const capacity of CAPACITIES) {
      for (const time of TIME_CLASSES) {
        const protocol = selectProtocol(outcome, capacity, time);
        expect(protocol.outcome).toBe(outcome);
        expect(protocol.capacity).toBe(capacity);
      }
    }
  });

  // THE TOTALITY GUARANTEE, restated as a test because the shape no longer
  // provides it. The old matrix held exactly one protocol per cell, so a lookup
  // could not miss; a cell is an ARRAY now and a time class may have no variant
  // in it. The fallback in selectProtocol is what keeps the function total, and
  // this is the only thing that holds it to that.
  it('resolves every outcome x capacity x timeClass to a protocol', () => {
    for (const outcome of OUTCOMES) {
      for (const capacity of CAPACITIES) {
        for (const time of TIME_CLASSES) {
          expect(selectProtocol(outcome, capacity, time)).toBeTruthy();
        }
      }
    }
  });

  it('prefers an exact timeClass match when the cell has one', () => {
    // focus/limited is authored at medium and asked for medium.
    const picked = selectProtocol('focus', 'limited', 'medium');
    expect(picked.timeClass).toBe('medium');
    expect(picked.estMinutes).toBe(15);
  });

  describe('the fallback, when a cell has no variant of the asked class', () => {
    it('falls to the nearest SHORTER class rather than overrunning the budget', () => {
      // focus/slammed is authored only at short. A user with a long window is
      // served the short one: finishing early is fine, overrunning the time
      // they said they had is not.
      const picked = selectProtocol('focus', 'slammed', 'long');
      expect(picked.timeClass).toBe('short');
      expect(picked.estMinutes).toBe(5);
    });

    it('falls to the cell FIRST variant when nothing shorter exists either', () => {
      // focus/normal is authored only at long. A short ask has nothing shorter
      // to drop to, so the cell's canonical variant is served rather than
      // nothing at all. This is the one case that can exceed the asked window,
      // and it is deliberate: a protocol the user must trim beats a blank card.
      const picked = selectProtocol('focus', 'normal', 'short');
      expect(picked).toBe(PROTOCOL_MATRIX.focus.normal[0]);
      expect(picked.timeClass).toBe('long');
    });
  });

  it('is pure: the same call returns the same object every time', () => {
    expect(selectProtocol('stress', 'limited', 'medium')).toBe(
      selectProtocol('stress', 'limited', 'medium')
    );
  });
});

describe('representativeProtocol (week-level callers)', () => {
  // The weekly open and the onboarding terminal resolve a protocol BEFORE any
  // daily time answer exists. They must not invent one: they take the cell's
  // canonical variant, which is what `WeeklyCycle.protocolId` then describes.
  it('returns the cell FIRST variant, for every cell', () => {
    for (const outcome of OUTCOMES) {
      for (const capacity of CAPACITIES) {
        expect(representativeProtocol(outcome, capacity)).toBe(
          PROTOCOL_MATRIX[outcome][capacity][0]
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
    for (const outcome of OUTCOMES) {
      for (const capacity of CAPACITIES) {
        for (const variant of PROTOCOL_MATRIX[outcome][capacity]) {
          expect(variant.id).toBe(`${outcome}-${capacity}`);
        }
      }
    }
  });

  it('covers all 12 cells with distinct ids', () => {
    const ids = OUTCOMES.flatMap((outcome) =>
      CAPACITIES.map((capacity) => representativeProtocol(outcome, capacity).id)
    );
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  it('gives every variant a distinct variantKey across the whole matrix', () => {
    const keys = allProtocols().map((p) => p.variantKey);
    expect(new Set(keys).size).toBe(keys.length);
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
    for (const outcome of OUTCOMES) {
      for (const capacity of CAPACITIES) {
        expect(PROTOCOL_MATRIX[outcome][capacity].length).toBeGreaterThan(0);
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
    for (const outcome of OUTCOMES) {
      for (const capacity of CAPACITIES) {
        const classes = PROTOCOL_MATRIX[outcome][capacity].map((v) =>
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

describe('authored coverage', () => {
  // WHAT IS ACTUALLY WRITTEN, pinned so it cannot quietly shrink and so the
  // gap is visible without reading the matrix. The 12 shipped rows sit on the
  // DIAGONAL of the readiness x time grid: they were authored when capacity was
  // the time proxy, so each cell has exactly one variant and its time class is
  // whatever its minutes imply. Everything off that diagonal is unauthored and
  // reaches the user through the fallback above.
  //
  // This list is the brief for the content pass. It shrinks as Jen writes.
  it('has exactly one authored variant per cell today', () => {
    for (const outcome of OUTCOMES) {
      for (const capacity of CAPACITIES) {
        expect(PROTOCOL_MATRIX[outcome][capacity]).toHaveLength(1);
      }
    }
  });

  it('reports every unauthored outcome x capacity x timeClass triple', () => {
    const gaps = unauthoredVariants();
    // 4 outcomes x 3 capacities x 3 classes = 36 triples, 12 authored.
    expect(gaps).toHaveLength(24);
    // Nothing authored may appear in the gap list.
    for (const gap of gaps) {
      const cell = PROTOCOL_MATRIX[gap.outcome][gap.capacity];
      expect(cell.some((v) => v.timeClass === gap.timeClass)).toBe(false);
    }
  });

  it('has no long-window variant for routines at any readiness', () => {
    // Routines top out at a 10-minute three-step anchor, so the whole long
    // column is a genuine content gap rather than an indexing artefact.
    for (const capacity of CAPACITIES) {
      const cell = PROTOCOL_MATRIX.routines[capacity];
      expect(cell.some((v) => v.timeClass === 'long')).toBe(false);
    }
  });

  it.each<[OutcomeKey, CapacityTier, TimeClass]>([
    ['focus', 'slammed', 'short'],
    ['focus', 'limited', 'medium'],
    ['focus', 'normal', 'long'],
    ['energy', 'slammed', 'short'],
    ['energy', 'limited', 'medium'],
    ['energy', 'normal', 'long'],
  ])('authors %s/%s at %s', (outcome, capacity, timeClass) => {
    expect(PROTOCOL_MATRIX[outcome][capacity][0].timeClass).toBe(timeClass);
  });
});
