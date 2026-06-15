import {
  classifyOutcome,
  classifyReflectionOutcome,
  type ClassifierOutcome,
} from '../outcomeClassifier';
import type { BrainState } from '../../types/models';

// ────────────────────────────────────────────────────────────
// classifyReflectionOutcome — engine-wired check-in reflection recorder.
// The legacy 5×5 classifyOutcome matrix below is retained for the
// out-of-scope BrowseRunFlow path; this block covers the new recorder.
// ────────────────────────────────────────────────────────────
describe('classifyReflectionOutcome — chip → outcome + firstShift gate', () => {
  it('strong-positive chip → shifted and qualifies firstShift', () => {
    expect(classifyReflectionOutcome('energy', 'settle', 'calmer')).toEqual({
      outcome: 'shifted',
      qualifiesFirstShift: true,
    });
    expect(classifyReflectionOutcome('energy', 'energize', 'more_with_it').outcome).toBe('shifted');
  });

  it('middle chip → maintenance, does NOT qualify firstShift', () => {
    expect(classifyReflectionOutcome('energy', 'settle', 'a_little')).toEqual({
      outcome: 'maintenance',
      qualifiesFirstShift: false,
    });
  });

  it('negative chip → not_shifted, does NOT qualify firstShift', () => {
    expect(classifyReflectionOutcome('energy', 'settle', 'still_wound_up')).toEqual({
      outcome: 'not_shifted',
      qualifiesFirstShift: false,
    });
  });

  it('keys on the slot (pillar, direction): same id, different set', () => {
    // 'a_little' is the middle chip in every energy set → maintenance.
    expect(classifyReflectionOutcome('energy', 'energize', 'a_little').outcome).toBe('maintenance');
    // focus strong-positive is 'settled'.
    expect(classifyReflectionOutcome('focus', 'neutral', 'settled').qualifiesFirstShift).toBe(true);
  });
});

// Mirror of the classifier's 5×5 transition matrix. Layout matches
// the comment block in outcomeClassifier.ts so visual drift is
// catchable when reading either file.
//
//          wired   foggy   steady       clear        alive
//   wired  not     partial shifted      shifted      shifted
//   foggy  not     not     shifted      shifted      shifted
//   steady not     not     maintenance  shifted      shifted
//   clear  not     not     maintenance  maintenance  shifted
//   alive  not     not     maintenance  maintenance  maintenance
const MATRIX: ReadonlyArray<readonly [BrainState, BrainState, ClassifierOutcome]> = [
  // Row 1 — wired → *
  ['wired',  'wired',  'not_shifted'],
  ['wired',  'foggy',  'partial_shift'],
  ['wired',  'steady', 'shifted'],
  ['wired',  'clear',  'shifted'],
  ['wired',  'alive',  'shifted'],
  // Row 2 — foggy → *
  ['foggy',  'wired',  'not_shifted'],
  ['foggy',  'foggy',  'not_shifted'],
  ['foggy',  'steady', 'shifted'],
  ['foggy',  'clear',  'shifted'],
  ['foggy',  'alive',  'shifted'],
  // Row 3 — steady → *
  ['steady', 'wired',  'not_shifted'],
  ['steady', 'foggy',  'not_shifted'],
  ['steady', 'steady', 'maintenance'],
  ['steady', 'clear',  'shifted'],
  ['steady', 'alive',  'shifted'],
  // Row 4 — clear → *
  ['clear',  'wired',  'not_shifted'],
  ['clear',  'foggy',  'not_shifted'],
  ['clear',  'steady', 'maintenance'],
  ['clear',  'clear',  'maintenance'],
  ['clear',  'alive',  'shifted'],
  // Row 5 — alive → *
  ['alive',  'wired',  'not_shifted'],
  ['alive',  'foggy',  'not_shifted'],
  ['alive',  'steady', 'maintenance'],
  ['alive',  'clear',  'maintenance'],
  ['alive',  'alive',  'maintenance'],
];

const ALL_STATES: ReadonlyArray<BrainState> = [
  'wired',
  'foggy',
  'steady',
  'clear',
  'alive',
];

const ALL_OUTCOMES: ReadonlyArray<ClassifierOutcome> = [
  'shifted',
  'partial_shift',
  'maintenance',
  'not_shifted',
];

describe('classifyOutcome — full 5×5 matrix', () => {
  // 25 cells, one assertion each. Failure on any single cell tells
  // you exactly which transition broke.
  it.each(MATRIX)(
    '%s → %s = %s',
    (stateBefore, stateAfter, expected) => {
      expect(classifyOutcome(stateBefore, stateAfter)).toBe(expected);
    }
  );

  it('matrix has 25 cells (5 states × 5 states)', () => {
    expect(MATRIX).toHaveLength(25);
  });
});

describe('classifyOutcome — structural guards', () => {
  it('BrainState union has exactly 5 values', () => {
    // Compile-time exhaustiveness: the BrainState union narrows to
    // these five literals. If a sixth state is ever added, this
    // type-level switch will fail to compile.
    const _exhaustive = (s: BrainState): 'ok' => {
      switch (s) {
        case 'wired':
        case 'foggy':
        case 'steady':
        case 'clear':
        case 'alive':
          return 'ok';
      }
    };

    // Runtime cardinality: ALL_STATES enumerates the union and must
    // remain 5 entries. Adding a sixth state without updating the
    // matrix will fail the matrix length check too — defense in depth.
    expect(ALL_STATES).toHaveLength(5);

    // Sanity: every listed state survives the exhaustive switch.
    for (const state of ALL_STATES) {
      expect(_exhaustive(state)).toBe('ok');
    }
  });

  it('classifier is total over BrainState × BrainState (no undefined, no throws)', () => {
    // Every (before, after) pair returns a defined ClassifierOutcome
    // from the four-value union. No `undefined`, no exceptions.
    for (const before of ALL_STATES) {
      for (const after of ALL_STATES) {
        const result = classifyOutcome(before, after);
        expect(typeof result).toBe('string');
        expect(ALL_OUTCOMES).toContain(result);
      }
    }
  });
});
