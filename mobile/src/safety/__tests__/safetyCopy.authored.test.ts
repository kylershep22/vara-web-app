/**
 * THE MERGE GATE FOR JOURNEY SLICE 3c-i.
 *
 * THIS TEST IS EXPECTED TO FAIL until Jen's safety response copy and resource
 * list land. That is not a broken suite; it is the gate doing its job.
 *
 * WHY IT IS A GATE RATHER THAN A BACKLOG ITEM. The screen these strings render
 * on is what a person sees immediately after typing something about self-harm,
 * abuse, or not eating. Shipping a placeholder there is not an unfinished
 * feature, it is the app responding to a disclosure with lorem ipsum.
 *
 * HOW TO CLOSE IT: replace the strings in safetyCopy.ts with Jen's, populate
 * SAFETY_RESOURCES, and bump the copy sentinel in the SAME commit. This file
 * needs no edit.
 */
import {
  SAFETY_COPY,
  SAFETY_PLACEHOLDER_MARKER,
  SAFETY_RESOURCES,
} from '../safetyCopy';

describe('the safety screen is structurally sound (these must pass now)', () => {
  test('every slot the screen renders exists and is non-empty', () => {
    // Guards against a vacuous pass below: an empty string contains no marker
    // and would sail through the gate while rendering nothing.
    for (const value of Object.values(SAFETY_COPY)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  test('the resource list is an array, empty or not', () => {
    expect(Array.isArray(SAFETY_RESOURCES)).toBe(true);
  });

  test('no resource is half-filled', () => {
    // If Jen supplies rows, both halves must be there. A label with no detail
    // is a resource a person cannot reach.
    for (const resource of SAFETY_RESOURCES) {
      expect(resource.label.length).toBeGreaterThan(0);
      expect(resource.detail.length).toBeGreaterThan(0);
    }
  });
});

describe('MERGE GATE: safety copy is authored', () => {
  test('no placeholder marker remains in any safety string', () => {
    const offending = Object.entries(SAFETY_COPY)
      .filter(([, value]) => value.includes(SAFETY_PLACEHOLDER_MARKER))
      .map(([key]) => `  SAFETY_COPY.${key}`);

    if (offending.length > 0) {
      throw new Error(
        `${offending.length} safety string(s) still carry the placeholder marker:\n` +
          `${offending.join('\n')}\n\n` +
          'THIS IS THE SLICE 3c-i MERGE GATE, and it is expected to be red until\n' +
          "Jen's safety response copy lands. These strings render to a person who\n" +
          'has just disclosed self-harm, abuse, or food restriction.\n\n' +
          'To close: swap in the authored copy, populate SAFETY_RESOURCES, and\n' +
          'bump EXPECTED_SENTINELS in the same commit.\n' +
          'Do not edit this test to make it pass.'
      );
    }
  });

  test('the resource list is not empty', () => {
    // Also red until Jen supplies it. Deliberately separate from the marker
    // check: authored prose with no resources behind it would otherwise pass
    // a gate whose whole purpose is that someone can reach help.
    if (SAFETY_RESOURCES.length === 0) {
      throw new Error(
        'SAFETY_RESOURCES is empty. The support screen renders a resources\n' +
          'heading with nothing under it. Jen owns this list; it is deliberately\n' +
          'not seeded with a guess, because a wrong crisis number is the most\n' +
          'damaging string this app could contain.'
      );
    }
  });
});
