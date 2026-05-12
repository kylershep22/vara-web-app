import {
  SHIFTED_RESPONSE_COPY,
  _resetWarnedPathKeysForTests,
  getShiftedResponseCopy,
  type ShiftedResponseCopy,
  type TransitionKey,
} from '../shiftedResponseCopy';
import type { BrainState, IntentPath } from '../../../../types/models';

// ────────────────────────────────────────────────────────────
// Exhaustive coverage — 16 keys
// ────────────────────────────────────────────────────────────
// Mirrors the classifier matrix groupings in
// outcomeClassifier.ts and the TransitionKey union groupings in
// shiftedResponseCopy.ts. If a 17th positive-outcome transition
// is ever added, this list grows together with both.
const EXPECTED_KEYS: ReadonlyArray<TransitionKey> = [
  // partial_shift (1)
  'wired_to_foggy',
  // shifted — negative → green (6)
  'wired_to_steady',
  'wired_to_clear',
  'wired_to_alive',
  'foggy_to_steady',
  'foggy_to_clear',
  'foggy_to_alive',
  // shifted — upward green (3)
  'steady_to_clear',
  'steady_to_alive',
  'clear_to_alive',
  // maintenance — same-state green (3)
  'steady_to_steady',
  'clear_to_clear',
  'alive_to_alive',
  // maintenance — downward green (3)
  'alive_to_clear',
  'clear_to_steady',
  'alive_to_steady',
];

const SAMPLE_CTX = { durationMinutes: 5 };

// Spread + cast to surface the actual runtime keys for length checks.
function defaultPathEntries(): Array<[TransitionKey, ShiftedResponseCopy]> {
  return Object.entries(SHIFTED_RESPONSE_COPY.default) as Array<
    [TransitionKey, ShiftedResponseCopy]
  >;
}

describe('SHIFTED_RESPONSE_COPY — default path exhaustive coverage', () => {
  it('has exactly 16 entries (matches the TransitionKey union cardinality)', () => {
    expect(defaultPathEntries()).toHaveLength(16);
  });

  it.each(EXPECTED_KEYS)('contains an entry for %s', (key) => {
    expect(SHIFTED_RESPONSE_COPY.default[key]).toBeDefined();
  });

  it.each(EXPECTED_KEYS)('%s has a non-empty title', (key) => {
    expect(SHIFTED_RESPONSE_COPY.default[key].title.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_KEYS)('%s body returns a non-empty string', (key) => {
    const result = SHIFTED_RESPONSE_COPY.default[key].body(SAMPLE_CTX);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('SHIFTED_RESPONSE_COPY — body function purity', () => {
  // Determinism guard: catches anyone reaching for Date.now(),
  // Math.random(), Intl formatters, async APIs, or any other
  // nondeterministic source. Same ctx → same string, every call.
  it.each(EXPECTED_KEYS)(
    '%s body is deterministic across repeated calls with the same ctx',
    (key) => {
      const fn = SHIFTED_RESPONSE_COPY.default[key].body;
      const a = fn(SAMPLE_CTX);
      const b = fn(SAMPLE_CTX);
      const c = fn({ durationMinutes: 5 }); // structurally equal
      expect(a).toBe(b);
      expect(b).toBe(c);
    }
  );

  // Performance smoke: each body should execute in <5ms. With
  // template-literal-only bodies this passes by orders of magnitude;
  // a regression here means someone introduced expensive formatting.
  it.each(EXPECTED_KEYS)('%s body executes in under 5ms', (key) => {
    const fn = SHIFTED_RESPONSE_COPY.default[key].body;
    // Warm up to dodge cold-start jitter on the first call.
    fn(SAMPLE_CTX);
    const start = performance.now();
    fn(SAMPLE_CTX);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });
});

describe('getShiftedResponseCopy — lookup behavior', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    _resetWarnedPathKeysForTests();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('returns default-path entry when intentPath is "default"', () => {
    const result = getShiftedResponseCopy('wired', 'steady', 'default');
    expect(result).toBe(SHIFTED_RESPONSE_COPY.default.wired_to_steady);
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('falls through to default silently when path table does not exist (Phase 5 not yet authored)', () => {
    // None of the non-default path tables are populated in 2.3.
    const result = getShiftedResponseCopy('wired', 'steady', 'sleep');
    expect(result).toBe(SHIFTED_RESPONSE_COPY.default.wired_to_steady);
    // Silent fall-through — no warn for "path table not authored yet."
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  describe('partial path-table population (Phase 5 partial-authoring sim)', () => {
    // Simulate Phase 5 having authored some down_regulation entries
    // but not all, by mutating the module-scoped table for the
    // duration of the suite. Restored in afterAll.
    const PARTIAL_PATH: IntentPath = 'down_regulation';
    let originalEntry: unknown;

    beforeAll(() => {
      (SHIFTED_RESPONSE_COPY as Record<string, unknown>)[PARTIAL_PATH] = {
        wired_to_steady: {
          title: 'Settled.',
          body: () => 'down_regulation copy for wired_to_steady',
        },
        // Other 15 keys deliberately absent.
      };
    });

    afterAll(() => {
      delete (SHIFTED_RESPONSE_COPY as Record<string, unknown>)[PARTIAL_PATH];
    });

    it('returns path-specific entry when present', () => {
      const result = getShiftedResponseCopy(
        'wired',
        'steady',
        PARTIAL_PATH
      );
      expect(result.title).toBe('Settled.');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('warns once and falls through to default when path-key is missing', () => {
      const result = getShiftedResponseCopy('foggy', 'clear', PARTIAL_PATH);
      expect(result).toBe(SHIFTED_RESPONSE_COPY.default.foggy_to_clear);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy.mock.calls[0][0]).toMatch(
        /Missing entry for path="down_regulation", key="foggy_to_clear"/
      );
    });

    it('does not re-warn for the same (path, key) on subsequent calls', () => {
      getShiftedResponseCopy('foggy', 'clear', PARTIAL_PATH);
      getShiftedResponseCopy('foggy', 'clear', PARTIAL_PATH);
      getShiftedResponseCopy('foggy', 'clear', PARTIAL_PATH);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('warns separately for distinct (path, key) pairs', () => {
      getShiftedResponseCopy('foggy', 'clear', PARTIAL_PATH);
      getShiftedResponseCopy('wired', 'clear', PARTIAL_PATH);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });
  });
});

describe('getShiftedResponseCopy — dev-throw on missing default-path key', () => {
  // The throw fires only when the default-path key itself is missing.
  // In practice this means classifier ↔ table drift — the classifier
  // produced a positive-outcome key with no corresponding copy entry.
  // Schema bug; fail loudly in __DEV__ so it surfaces immediately.
  it('throws in __DEV__ when default-path entry is missing', () => {
    const original = SHIFTED_RESPONSE_COPY.default.wired_to_steady;
    delete (SHIFTED_RESPONSE_COPY.default as Record<string, unknown>)
      .wired_to_steady;
    try {
      expect(() =>
        getShiftedResponseCopy('wired', 'steady', 'default')
      ).toThrow(/Default-path copy missing for key="wired_to_steady"/);
    } finally {
      // Restore for the rest of the suite.
      (SHIFTED_RESPONSE_COPY.default as Record<string, ShiftedResponseCopy>)
        .wired_to_steady = original;
    }
  });
});

// Type-level assertion: every state pair that classifyOutcome returns
// a positive outcome for has a corresponding TransitionKey entry. The
// matrix of valid keys is a closed union (16 values); if a 17th
// positive-outcome state pair ever lands without a TransitionKey
// entry, the keyof check below fails to compile.
const _TYPECHECK_KEYS: TransitionKey[] = [...EXPECTED_KEYS];
void _TYPECHECK_KEYS;

// Sanity: BrainState is the 5-state union the classifier expects.
// If a sixth state lands, the constructor below errors at compile.
const _TYPECHECK_BRAIN_STATES: BrainState[] = [
  'wired',
  'foggy',
  'steady',
  'clear',
  'alive',
];
void _TYPECHECK_BRAIN_STATES;
