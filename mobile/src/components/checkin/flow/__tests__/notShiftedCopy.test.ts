import {
  NOT_SHIFTED_COPY,
  getNotShiftedCopy,
  type NotShiftedCopy,
} from '../notShiftedCopy';

const REQUIRED_KEYS: ReadonlyArray<keyof NotShiftedCopy> = [
  'title',
  'body',
  'tryLongerLabel',
  'tryLongerHint',
  'restLaterLabel',
  'restLaterHint',
  // Sub-step 2.4 additions
  'lateNightTryLongerLabel',
  'lateNightTryLongerHint',
];

describe('NOT_SHIFTED_COPY — default path', () => {
  it.each(REQUIRED_KEYS)('default-path entry has non-empty "%s"', (key) => {
    const value = NOT_SHIFTED_COPY.default[key];
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });

  it('lateNightTryLongerLabel is the locked Core Loop v2 phrase', () => {
    expect(NOT_SHIFTED_COPY.default.lateNightTryLongerLabel).toBe(
      "Try NSDR when you're ready"
    );
  });

  it('lateNightTryLongerHint is the neutral framing (no sleep-specific language)', () => {
    // Neutral by locked decision — Wired at 11pm doesn't always mean
    // "going to sleep." Sleep-specific framing belongs in the sleep
    // IntentPath table when Phase 5 lands.
    const hint = NOT_SHIFTED_COPY.default.lateNightTryLongerHint;
    expect(hint).toBe('About 20 minutes of guided rest');
    expect(hint.toLowerCase()).not.toMatch(/sleep|bedtime|wind down/);
  });
});

describe('getNotShiftedCopy — lookup', () => {
  it('returns default-path entry for IntentPath="default"', () => {
    expect(getNotShiftedCopy('default')).toBe(NOT_SHIFTED_COPY.default);
  });

  it('falls through to default for other paths in 2.4 (none populated yet)', () => {
    // Phase 5 will populate down_regulation, sleep, activation. Until
    // then, all three resolve to the default-path entry.
    expect(getNotShiftedCopy('down_regulation')).toBe(NOT_SHIFTED_COPY.default);
    expect(getNotShiftedCopy('sleep')).toBe(NOT_SHIFTED_COPY.default);
    expect(getNotShiftedCopy('activation')).toBe(NOT_SHIFTED_COPY.default);
  });
});
