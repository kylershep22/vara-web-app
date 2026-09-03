/**
 * THE MERGE GATE FOR JOURNEY SLICE 3a.
 *
 * THIS TEST IS EXPECTED TO FAIL until Jen's Remove protocols land. That is not
 * a broken suite; it is the gate doing its job, and it is the ONLY thing
 * standing between placeholder text and every beta user's daily card.
 *
 * WHY IT MATTERS MORE THAN THE USUAL CONTENT GAP. Under JOURNEY_IA every user
 * is in phase 'remove'. There is no other cell they can be served from and no
 * fallback that reaches a written one, because the fallback ladder walks time
 * classes WITHIN a cell, never across phases. So a placeholder in a remove cell
 * is not a gap that degrades gracefully; it is the card, for everyone.
 *
 * REWIRE PLACEHOLDERS ARE DELIBERATELY ALLOWED THROUGH. No user reaches rewire
 * until slice 5, so a stand-in there is unreachable rather than shipped. The
 * test below asserts that distinction rather than blurring it, so that fixing
 * the gate means authoring Remove and not quietly deleting an assertion.
 *
 * HOW TO CLOSE IT: swap Jen's content into the remove cells, drop
 * `placeholder: true` from those variants, and bump the copy sentinel in the
 * SAME commit (the sentinel contract). This file needs no edit.
 */
import { PROTOCOL_MATRIX, CAPACITY_TIERS, PLACEHOLDER_TITLE_PREFIX } from '../protocolMatrix';
import { PHASE_ORDER } from '../../constants/journey';

describe('the matrix is structurally complete (these must pass now)', () => {
  test('every phase in PHASE_ORDER has a cell for every capacity tier', () => {
    // Guards against a vacuous pass below: if a cell were missing entirely, the
    // placeholder scan would find nothing in it and report clean.
    for (const phase of PHASE_ORDER) {
      for (const capacity of CAPACITY_TIERS) {
        expect(Array.isArray(PROTOCOL_MATRIX[phase][capacity])).toBe(true);
      }
    }
  });

  test('no cell is empty, so selectProtocol can always return something', () => {
    for (const phase of PHASE_ORDER) {
      for (const capacity of CAPACITY_TIERS) {
        expect(PROTOCOL_MATRIX[phase][capacity].length).toBeGreaterThan(0);
      }
    }
  });

  test('the placeholder flag and the title prefix never disagree', () => {
    // One fact, two expressions of it. The gate below reads the flag; a human
    // scanning a diff reads the title. They must not drift.
    for (const phase of PHASE_ORDER) {
      for (const capacity of CAPACITY_TIERS) {
        for (const variant of PROTOCOL_MATRIX[phase][capacity]) {
          expect(variant.name.startsWith(PLACEHOLDER_TITLE_PREFIX)).toBe(
            variant.placeholder === true
          );
        }
      }
    }
  });

  test('no placeholder title names its own phase', () => {
    // Section 8: the framework words are internal. A stand-in still renders on
    // a real card during the walk, so it may not leak one either.
    for (const phase of PHASE_ORDER) {
      for (const capacity of CAPACITY_TIERS) {
        for (const variant of PROTOCOL_MATRIX[phase][capacity]) {
          if (!variant.placeholder) continue;
          expect(variant.name.toLowerCase()).not.toContain(phase);
        }
      }
    }
  });
});

describe('MERGE GATE: remove cells are authored', () => {
  test('no remove cell holds a placeholder variant', () => {
    const offending = CAPACITY_TIERS.flatMap((capacity) =>
      PROTOCOL_MATRIX.remove[capacity]
        .filter((v) => v.placeholder)
        .map((v) => `  remove/${capacity}: ${v.name}`)
    );

    if (offending.length > 0) {
      throw new Error(
        `${offending.length} placeholder variant(s) still in the Remove cells:\n` +
          `${offending.join('\n')}\n\n` +
          'THIS IS THE SLICE 3a MERGE GATE, and it is expected to be red until\n' +
          "Jen's Remove protocols land. Every user is in phase 'remove' under\n" +
          'JOURNEY_IA, so these strings ARE the daily card for the whole beta.\n\n' +
          'To close: swap in the authored content, drop `placeholder: true` from\n' +
          'those variants, and bump EXPECTED_SENTINELS in the same commit.\n' +
          'Do not edit this test to make it pass.'
      );
    }
  });

  test('rewire placeholders are permitted, and are tracked here rather than forgotten', () => {
    // Not a gate. Slice 5 is where these become reachable and therefore where
    // they become a gate of their own. Asserted so the count is visible in the
    // suite output rather than discovered by a user.
    const rewirePlaceholders = CAPACITY_TIERS.flatMap((capacity) =>
      PROTOCOL_MATRIX.rewire[capacity].filter((v) => v.placeholder)
    );
    expect(rewirePlaceholders.length).toBeLessThanOrEqual(CAPACITY_TIERS.length);
  });
});
