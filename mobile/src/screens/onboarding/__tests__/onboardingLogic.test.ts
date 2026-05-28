/**
 * Pure-logic coverage for the reflect-back line and the re-check shift —
 * the brand-critical bits: reflect-back mirrors the user's ACTUAL inputs, and
 * a flat/worse shift gets a compassionate (never shaming) response.
 */
import { buildReflectLine, computeShift, shiftLine, shiftOutcome } from '../onboardingShift';

describe('buildReflectLine — mirrors actual inputs', () => {
  test('reflects state + stressor + peak in plain language', () => {
    const line = buildReflectLine('wired', ['A racing mind'], 'evening');
    expect(line).toContain('Wired');
    expect(line).toContain('racing mind');
    expect(line).toContain('evening');
  });

  test('omits clauses for skipped stressor/peak but still names the state', () => {
    const line = buildReflectLine('foggy', [], null);
    expect(line).toContain('Foggy');
    expect(line).not.toContain('with ');
    expect(line).not.toContain('in the ');
  });

  test('fully-skipped (no state) falls back to the generic downshift line', () => {
    const line = buildReflectLine(null, [], null);
    expect(line).toBe("Here's a five-minute reset to help your system downshift.");
  });
});

describe('computeShift', () => {
  test('toward regulation → improved', () => {
    expect(computeShift('wired', 'steady')).toBe('improved');
  });
  test('same state → flat', () => {
    expect(computeShift('steady', 'steady')).toBe('flat');
  });
  test('away from regulation → worse', () => {
    expect(computeShift('clear', 'wired')).toBe('worse');
  });
});

describe('shiftLine — compassionate, never shaming', () => {
  test('improved names the before→after movement', () => {
    expect(shiftLine('wired', 'steady', 'improved')).toBe('You moved from Wired to Steady in five minutes.');
  });
  test('flat does not imply the user did it wrong', () => {
    const line = shiftLine('steady', 'steady', 'flat');
    expect(line.toLowerCase()).toContain("isn't linear");
    expect(line.toLowerCase()).not.toMatch(/wrong|fail|should have|try harder/);
  });
  test('worse is reassuring, not a penalty', () => {
    const line = shiftLine('clear', 'wired', 'worse');
    expect(line.toLowerCase()).not.toMatch(/wrong|fail|penalty|missed/);
  });
});

describe('shiftOutcome — maps shift to a ProtocolSessionOutcome', () => {
  test('improved → shifted', () => expect(shiftOutcome('improved')).toBe('shifted'));
  test('flat → maintenance', () => expect(shiftOutcome('flat')).toBe('maintenance'));
  test('worse → not_shifted', () => expect(shiftOutcome('worse')).toBe('not_shifted'));
});
