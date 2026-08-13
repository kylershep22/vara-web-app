// PRE-RESHAPE PARITY — the no-op proof for roadmap 3b-ii-a.
//
// The reshape turned each matrix cell from a single protocol into an ordered
// array of time variants, and made selectProtocol take a time class. Nothing
// about what a user SEES was meant to change: with the time axis unauthored,
// every cell still holds exactly one variant and the fallback resolves to it
// whatever class is asked.
//
// The values below are copied from the matrix as it stood at 530cfaa, BEFORE
// the reshape. They are deliberately restated here rather than imported, so
// this file compares against a fixed record of the old behaviour instead of
// against whatever the matrix says today. An accidental content edit during the
// reshape fails here.
//
// LIFETIME: this file is scoped to the reshape. Once Jen authors the
// off-diagonal, `selectProtocol(outcome, capacity, DEFAULT_TIME_CLASS)` will
// legitimately start returning a medium variant instead of the cell's only one,
// and these expectations become wrong ON PURPOSE. Delete it in that slice
// rather than loosening it.

import { selectProtocol, representativeProtocol } from '../selectProtocol';
import { DEFAULT_TIME_CLASS } from '../protocolMatrix';
import type { CapacityTier, OutcomeKey } from '../types';

interface PreReshapeRow {
  outcome: OutcomeKey;
  capacity: CapacityTier;
  dailyAction: string;
  estMinutes: number;
}

/** The 12 cells exactly as they resolved at 530cfaa. */
const BEFORE: PreReshapeRow[] = [
  { outcome: 'focus', capacity: 'normal', estMinutes: 30, dailyAction: 'One 25-min single-task block, then a device-free break' },
  { outcome: 'focus', capacity: 'limited', estMinutes: 15, dailyAction: 'One 15-min single-task block' },
  { outcome: 'focus', capacity: 'slammed', estMinutes: 5, dailyAction: '5 min on one thing, every other tab closed' },
  { outcome: 'stress', capacity: 'normal', estMinutes: 15, dailyAction: '10-min extended exhale, plus an afternoon device-free break' },
  { outcome: 'stress', capacity: 'limited', estMinutes: 10, dailyAction: '5-min extended exhale, plus a break' },
  { outcome: 'stress', capacity: 'slammed', estMinutes: 5, dailyAction: '5-min extended exhale' },
  { outcome: 'routines', capacity: 'normal', estMinutes: 10, dailyAction: 'One 3-step anchor routine, same order daily' },
  { outcome: 'routines', capacity: 'limited', estMinutes: 6, dailyAction: 'A 2-step anchor routine' },
  { outcome: 'routines', capacity: 'slammed', estMinutes: 2, dailyAction: 'One anchor cue at the same time daily' },
  { outcome: 'energy', capacity: 'normal', estMinutes: 20, dailyAction: 'Morning light within 30 min of waking, plus movement and a consistent wake time' },
  { outcome: 'energy', capacity: 'limited', estMinutes: 10, dailyAction: 'Morning light, plus a consistent wake time' },
  { outcome: 'energy', capacity: 'slammed', estMinutes: 5, dailyAction: 'Morning light only' },
];

describe('the reshape is a no-op for what the Today card renders', () => {
  it.each(BEFORE)(
    '$outcome/$capacity still serves the pre-reshape protocol',
    ({ outcome, capacity, dailyAction, estMinutes }) => {
      // Exactly what useTodayCard now calls.
      const served = selectProtocol(outcome, capacity, DEFAULT_TIME_CLASS);

      expect(served.dailyAction).toBe(dailyAction);
      expect(served.estMinutes).toBe(estMinutes);
    }
  );

  it.each(BEFORE)(
    '$outcome/$capacity resolves identically for EVERY time class',
    ({ outcome, capacity, dailyAction }) => {
      // The stronger statement, and the one that says the time question is
      // currently inert: with one variant per cell, no answer the picker could
      // collect would change what is served. This is the honest cost of the
      // unauthored off-diagonal, pinned so 3b-ii-b cannot mistake it for a
      // working filter.
      for (const time of ['short', 'medium', 'long'] as const) {
        expect(selectProtocol(outcome, capacity, time).dailyAction).toBe(dailyAction);
      }
    }
  );

  it.each(BEFORE)(
    '$outcome/$capacity gives week-level callers the same protocol too',
    ({ outcome, capacity, dailyAction }) => {
      // The weekly open preview and the protocolId it writes are unchanged by
      // the reshape: representativeProtocol returns the cell's canonical
      // variant, which is the row that was there before.
      expect(representativeProtocol(outcome, capacity).dailyAction).toBe(dailyAction);
      expect(representativeProtocol(outcome, capacity).id).toBe(`${outcome}-${capacity}`);
    }
  );
});
