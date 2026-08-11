// The fallback ladder, tested against SYNTHETIC cells.
//
// WHY THIS FILE EXISTS. Every cell in the shipped matrix currently holds
// exactly one variant, so `selectProtocol` returns that variant for any time
// class whether the ladder works or not: a mutant that deletes the ladder
// entirely still passes every test driven off the real matrix. The ladder is
// load-bearing for 3b-ii-b (the time question) and 3b-iii (rotation), and it
// would have shipped unverified.
//
// `pickVariant` is the seam that fixes that: the ordering rule, separated from
// the data it usually reads, so it can be given cells the matrix does not have
// yet.

import { pickVariant } from '../selectProtocol';
import type { TimeClass, WeeklyProtocol } from '../types';

/** A variant carrying only what the ladder looks at. */
const v = (timeClass: TimeClass, tag: string): WeeklyProtocol =>
  ({ timeClass, variantKey: tag, name: tag }) as WeeklyProtocol;

const SHORT = v('short', 's');
const MEDIUM = v('medium', 'm');
const LONG = v('long', 'l');

describe('pickVariant — the time-class fallback ladder', () => {
  describe('step 1: an exact match wins', () => {
    it.each<[TimeClass, WeeklyProtocol]>([
      ['short', SHORT],
      ['medium', MEDIUM],
      ['long', LONG],
    ])('asking for %s returns the %s variant', (time, expected) => {
      expect(pickVariant([SHORT, MEDIUM, LONG], time)).toBe(expected);
    });

    it('returns the FIRST of several variants sharing the asked class', () => {
      // Two variants in one class is what 3b-iii rotates through. Selection
      // takes the head; rotation walks from there.
      const first = v('medium', 'm1');
      const second = v('medium', 'm2');
      expect(pickVariant([first, second], 'medium')).toBe(first);
    });
  });

  describe('step 2: otherwise the nearest SHORTER class', () => {
    it('drops long to medium when there is no long variant', () => {
      expect(pickVariant([SHORT, MEDIUM], 'long')).toBe(MEDIUM);
    });

    it('drops long all the way to short when medium is missing too', () => {
      expect(pickVariant([SHORT, LONG], 'medium')).toBe(SHORT);
      expect(pickVariant([SHORT], 'long')).toBe(SHORT);
    });

    it('descends by CLASS, not by position in the array', () => {
      // The discriminating case. In a cell that is not ordered shortest-first,
      // the descent answer and the first element are different objects, so a
      // ladder that quietly degraded to "return variants[0]" shows up here and
      // nowhere else. The shipped matrix is ordered, which is exactly why this
      // has to be asserted against one that is not.
      expect(pickVariant([LONG, SHORT], 'medium')).toBe(SHORT);
      expect(pickVariant([LONG, MEDIUM], 'long')).toBe(LONG);
      expect(pickVariant([LONG, MEDIUM, SHORT], 'medium')).toBe(MEDIUM);
    });

    it('never returns something LONGER than the window asked for', () => {
      // The direction of the ladder is the point. Serving a long protocol to
      // someone who said they had five minutes spends time they told us they
      // did not have.
      expect(pickVariant([SHORT, LONG], 'short')).toBe(SHORT);
      expect(pickVariant([MEDIUM, LONG], 'medium')).toBe(MEDIUM);
    });
  });

  describe('step 3: otherwise the cell first variant', () => {
    it('serves the canonical variant when nothing at or below the ask exists', () => {
      // The one case that can overrun, and it is deliberate: a protocol the
      // user has to trim beats a blank card.
      expect(pickVariant([LONG], 'short')).toBe(LONG);
      expect(pickVariant([MEDIUM, LONG], 'short')).toBe(MEDIUM);
    });
  });

  it('is total for every class on any non-empty cell', () => {
    const cells: WeeklyProtocol[][] = [
      [SHORT],
      [MEDIUM],
      [LONG],
      [SHORT, MEDIUM],
      [MEDIUM, LONG],
      [SHORT, LONG],
      [SHORT, MEDIUM, LONG],
    ];
    for (const cell of cells) {
      for (const time of ['short', 'medium', 'long'] as const) {
        expect(pickVariant(cell, time)).toBeTruthy();
      }
    }
  });
});
