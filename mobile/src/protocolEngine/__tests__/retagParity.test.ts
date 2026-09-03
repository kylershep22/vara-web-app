// RE-TAG PARITY - the "data, not rewrite" proof for journey slice 3a.
//
// Replaces reshapeParity.test.ts, whose premise the re-tag destroyed. That file
// asserted that `selectProtocol(outcome, capacity, ...)` returned the same row
// as before the 3b-ii-a reshape. It could only say that while every cell held
// exactly one variant, and `recover` now holds three: the roadmap (3.2)
// collapses stress, energy and routines into one phase, so per-outcome identity
// through `selectProtocol` is no longer a property the matrix has.
//
// WHAT IS STILL TRUE, AND IS WHAT THIS FILE PINS: the twelve authored rows were
// MOVED, not edited. Each one still exists, character for character, in the
// cell the roadmap says it moved to. That is the whole claim of a re-tag, and
// it is the claim worth a test.
//
// The values below are restated rather than imported, deliberately, so this
// compares against a fixed record of the shipped content instead of against
// whatever the matrix says today. An accidental content edit during the re-tag
// fails here.
//
// LIFETIME: delete when Jen's content replaces these twelve rows. At that point
// they are legitimately gone and the file is asserting the absence of the
// wrong thing.
import { PROTOCOL_MATRIX, CAPACITY_TIERS } from '../protocolMatrix';
import { selectProtocol, representativeProtocol, orderForDestination } from '../selectProtocol';
import { PHASE_ORDER } from '../../constants/journey';
import type { CapacityTier, TimeClass } from '../types';
import type { PhaseKey } from '../../types/models';

interface RetaggedRow {
  /** Where the row lived before slice 3a. Documentation, not a lookup key. */
  wasOutcome: string;
  /** Where the roadmap says it moved to. */
  phase: PhaseKey;
  capacity: CapacityTier;
  dailyAction: string;
  estMinutes: number;
}

/** The 12 authored rows, and the cell each moved into (roadmap 3.2). */
const RETAGGED: RetaggedRow[] = [
  // focus -> refocus
  { wasOutcome: 'focus', phase: 'refocus', capacity: 'normal', estMinutes: 30, dailyAction: 'One 25-min single-task block, then a device-free break' },
  { wasOutcome: 'focus', phase: 'refocus', capacity: 'limited', estMinutes: 15, dailyAction: 'One 15-min single-task block' },
  { wasOutcome: 'focus', phase: 'refocus', capacity: 'slammed', estMinutes: 5, dailyAction: '5 min on one thing, every other tab closed' },
  // stress -> recover
  { wasOutcome: 'stress', phase: 'recover', capacity: 'normal', estMinutes: 15, dailyAction: '10-min extended exhale, plus an afternoon device-free break' },
  { wasOutcome: 'stress', phase: 'recover', capacity: 'limited', estMinutes: 10, dailyAction: '5-min extended exhale, plus a break' },
  { wasOutcome: 'stress', phase: 'recover', capacity: 'slammed', estMinutes: 5, dailyAction: '5-min extended exhale' },
  // routines -> recover (routines are recovery infrastructure, Jen section 5)
  { wasOutcome: 'routines', phase: 'recover', capacity: 'normal', estMinutes: 10, dailyAction: 'One 3-step anchor routine, same order daily' },
  { wasOutcome: 'routines', phase: 'recover', capacity: 'limited', estMinutes: 6, dailyAction: 'A 2-step anchor routine' },
  { wasOutcome: 'routines', phase: 'recover', capacity: 'slammed', estMinutes: 2, dailyAction: 'One anchor cue at the same time daily' },
  // energy -> recover
  { wasOutcome: 'energy', phase: 'recover', capacity: 'normal', estMinutes: 20, dailyAction: 'Morning light within 30 min of waking, plus movement and a consistent wake time' },
  { wasOutcome: 'energy', phase: 'recover', capacity: 'limited', estMinutes: 10, dailyAction: 'Morning light, plus a consistent wake time' },
  { wasOutcome: 'energy', phase: 'recover', capacity: 'slammed', estMinutes: 5, dailyAction: 'Morning light only' },
];

describe('every authored row survived the re-tag unedited', () => {
  it.each(RETAGGED)(
    '$wasOutcome/$capacity now lives in $phase/$capacity, unchanged',
    ({ phase, capacity, dailyAction, estMinutes }) => {
      const match = PROTOCOL_MATRIX[phase][capacity].find(
        (v) => v.dailyAction === dailyAction
      );

      expect(match).toBeDefined();
      expect(match?.estMinutes).toBe(estMinutes);
      // The row moved cells, so its derived ids moved with it. That IS the
      // re-tag; asserting it here is what stops a "move" that quietly left the
      // old id behind.
      expect(match?.id).toBe(`${phase}-${capacity}`);
      expect(match?.phase).toBe(phase);
      expect(match?.placeholder).toBeUndefined();
    }
  );

  test('nothing re-tagged was lost, and Remove added exactly three', () => {
    // 12 re-tagged rows + 3 authored Remove protocols = 15. The Remove three
    // arrived in the slice 3a closing commit and are NOT re-tagged rows, so
    // they are counted separately rather than folded into RETAGGED: this test
    // must keep failing if a re-tagged row goes missing, even while the
    // authored total grows.
    const authored = PHASE_ORDER.flatMap((phase) =>
      CAPACITY_TIERS.flatMap((capacity) =>
        PROTOCOL_MATRIX[phase][capacity].filter((v) => !v.placeholder)
      )
    );
    const removeAuthored = CAPACITY_TIERS.flatMap((capacity) =>
      PROTOCOL_MATRIX.remove[capacity].filter((v) => !v.placeholder)
    );

    expect(removeAuthored).toHaveLength(3);
    expect(authored).toHaveLength(RETAGGED.length + removeAuthored.length);
  });

  test('recover absorbed three former outcomes, so its cells hold three each', () => {
    // The structural consequence of the collapse, stated rather than implied.
    // It is also why per-outcome parity through selectProtocol no longer holds:
    // three rows now compete for one cell, and the destination decides which
    // leads once Jen defines weights.
    for (const capacity of CAPACITY_TIERS) {
      expect(PROTOCOL_MATRIX.recover[capacity]).toHaveLength(3);
      expect(PROTOCOL_MATRIX.refocus[capacity]).toHaveLength(1);
    }
  });
});

describe('selection is still total across the re-tagged grid', () => {
  const TIMES: TimeClass[] = ['short', 'medium', 'long'];

  it.each(PHASE_ORDER.flatMap((phase) => CAPACITY_TIERS.map((capacity) => ({ phase, capacity }))))(
    '$phase/$capacity returns a protocol for every time class and destination',
    ({ phase, capacity }) => {
      for (const time of TIMES) {
        for (const destination of ['focus', 'calm', 'routines', 'energy'] as const) {
          const served = selectProtocol(phase, capacity, time, destination);
          expect(served).toBeDefined();
          expect(served.dailyAction.length).toBeGreaterThan(0);
        }
      }
    }
  );

  it.each(PHASE_ORDER.flatMap((phase) => CAPACITY_TIERS.map((capacity) => ({ phase, capacity }))))(
    '$phase/$capacity gives week-level callers the cell canonical variant',
    ({ phase, capacity }) => {
      expect(representativeProtocol(phase, capacity)).toBe(
        PROTOCOL_MATRIX[phase][capacity][0]
      );
    }
  );

  test('destination ordering is currently the identity on every shipped cell', () => {
    // No variant carries a destinationWeight yet, so orderForDestination must
    // return authored order untouched. When Jen defines weights this test goes
    // red, and that is the signal that the ordering has become real rather
    // than a bug.
    for (const phase of PHASE_ORDER) {
      for (const capacity of CAPACITY_TIERS) {
        const cell = PROTOCOL_MATRIX[phase][capacity];
        for (const destination of ['focus', 'calm', 'routines', 'energy'] as const) {
          expect(orderForDestination(cell, destination)).toEqual(cell);
        }
      }
    }
  });
});
