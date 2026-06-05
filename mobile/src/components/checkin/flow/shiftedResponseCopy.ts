// Per-transition copy table for the ShiftedResponse component.
//
// 16 entries covering every transition that classifyOutcome can label
// as `'shifted'`, `'partial_shift'`, or `'maintenance'`. The
// 9 transitions that classify as `'not_shifted'` use the single
// NOT_SHIFTED_DEFAULT entry from notShiftedCopy.ts.
//
// Forward-compatible with Phase 5's per-IntentPath nesting from day
// one: the outer record is a Partial<Record<IntentPath, ...>> so 2.3
// only has to populate `'default'`. Phase 5 adds the other three path
// tables without restructure. Lookup falls through to default-path
// copy when the requested path's table or key is missing.
//
// Voice anchor: Vara_Voice_Tone_Rules + Vara_CTA_Headline_Library.
// Several entries lift verbatim from Core Loop v2 §"Adaptive
// response — Path A — Shifted" (#2 wired_to_steady, #3 wired_to_clear,
// #11 steady_to_steady) to anchor the most-shipped affirming surfaces
// to canonical phrasing.

import type { BrainState, IntentPath } from '../../../types/models';

// ────────────────────────────────────────────────────────────
// TransitionKey — closed union of the 16 valid keys
// ────────────────────────────────────────────────────────────
// Grouped by classifier outcome family for visual parallelism with
// the runtime table below. Drift between the type and the table
// surfaces visibly when reading either file.
export type TransitionKey =
  // partial_shift (1)
  | 'wired_to_foggy'
  // shifted — negative → green (6)
  | 'wired_to_steady'
  | 'wired_to_clear'
  | 'wired_to_alive'
  | 'foggy_to_steady'
  | 'foggy_to_clear'
  | 'foggy_to_alive'
  // shifted — upward green (3)
  | 'steady_to_clear'
  | 'steady_to_alive'
  | 'clear_to_alive'
  // maintenance — same-state green (3)
  | 'steady_to_steady'
  | 'clear_to_clear'
  | 'alive_to_alive'
  // maintenance — downward green (3)
  | 'alive_to_clear'
  | 'clear_to_steady'
  | 'alive_to_steady';

// ────────────────────────────────────────────────────────────
// ShiftedResponseCopy — per-cell shape
// ────────────────────────────────────────────────────────────
// `body` is a function so duration interpolation is type-safe (no
// `[N]` placeholder parsing). Body functions stay PURE — template
// literals + ctx fields only. No Date.now(), no Math.random(), no
// Intl formatters, no async. The determinism + perf-smoke tests
// catch any regression here.
export interface ShiftedResponseCopy {
  title: string;
  body: (ctx: { durationMinutes: number }) => string;
}

// ────────────────────────────────────────────────────────────
// Table type
// ────────────────────────────────────────────────────────────
// Outer Partial so 2.3 only has to populate `'default'`. The
// `default` key is REQUIRED (intersection with mapped type) so the
// type system enforces "default-path always exists." Phase 5 adds
// the other three path tables; lookup falls through.
export type ShiftedResponseCopyTable = Partial<
  Record<IntentPath, Record<TransitionKey, ShiftedResponseCopy>>
> & {
  default: Record<TransitionKey, ShiftedResponseCopy>;
};

// ────────────────────────────────────────────────────────────
// Default-path table — 16 entries
// ────────────────────────────────────────────────────────────
// Layout mirrors the TransitionKey union grouping. Reorder both
// together if the rule clusters change.
const DEFAULT_PATH_COPY: Record<TransitionKey, ShiftedResponseCopy> = {
  // ── partial_shift ──────────────────────────────────────
  wired_to_foggy: {
    title: 'Some of the edge came off.',
    body: () =>
      "Wired down to Foggy. The intensity dropped. Fatigue underneath is surfacing. That's normal, and worth noticing.",
  },

  // ── shifted: negative → green ──────────────────────────
  wired_to_steady: {
    title: 'You settled.',
    body: ({ durationMinutes }) =>
      `Wired to Steady in ${durationMinutes} ${durationMinutes === 1 ? 'minute' : 'minutes'}. That's your system returning to baseline.`,
  },
  wired_to_clear: {
    title: 'There it is.',
    body: () =>
      'Wired to Clear. A notable shift, worth noticing how you got there.',
  },
  wired_to_alive: {
    title: 'Real ground covered.',
    body: ({ durationMinutes }) =>
      `Wired to Alive in ${durationMinutes} ${durationMinutes === 1 ? 'minute' : 'minutes'}. Your system moved a long way in a short window.`,
  },
  foggy_to_steady: {
    title: 'Coming back.',
    body: () => 'Foggy to Steady. Clarity is returning.',
  },
  foggy_to_clear: {
    title: 'Clarity returned.',
    body: () =>
      'Foggy to Clear. Your system had more in it than it looked.',
  },
  foggy_to_alive: {
    title: 'Energy returned.',
    body: () => 'Foggy to Alive. The lift is real. Energy and presence, both.',
  },

  // ── shifted: upward green ──────────────────────────────
  steady_to_clear: {
    title: 'Came into focus.',
    body: () => 'Steady to Clear. Functional became focused.',
  },
  steady_to_alive: {
    title: "There's the lift.",
    body: ({ durationMinutes }) =>
      `Steady to Alive in ${durationMinutes} ${durationMinutes === 1 ? 'minute' : 'minutes'}. From baseline to engaged.`,
  },
  clear_to_alive: {
    title: 'Moved into Alive.',
    body: () =>
      'Clear to Alive. The protocol added energy on top of the focus that was already there.',
  },

  // ── maintenance: same-state green ──────────────────────
  steady_to_steady: {
    title: 'Held steady.',
    body: () =>
      'Sometimes the practice is about not losing ground. You did that.',
  },
  clear_to_clear: {
    title: 'Stayed clear.',
    body: () => 'Clear at the start, Clear at the end. The focus held.',
  },
  alive_to_alive: {
    title: 'Held the energy.',
    body: () =>
      'Alive at the start, Alive at the end. Many people find this state slips during a longer session, but yours didn\'t.',
  },

  // ── maintenance: downward green ────────────────────────
  alive_to_clear: {
    title: 'Settled into focus.',
    body: () => 'Alive to Clear. The buzz quieted; the clarity stayed.',
  },
  clear_to_steady: {
    title: 'Settled to baseline.',
    body: () => "Clear to Steady. The focus relaxed; you're still functional.",
  },
  alive_to_steady: {
    title: 'Came down to baseline.',
    body: () =>
      'Alive to Steady. The intensity dialed back. Functional ground recovered.',
  },
};

export const SHIFTED_RESPONSE_COPY: ShiftedResponseCopyTable = {
  default: DEFAULT_PATH_COPY,
  // Phase 5 adds: down_regulation, sleep, activation.
};

// ────────────────────────────────────────────────────────────
// Lookup
// ────────────────────────────────────────────────────────────

// Build the (stateBefore, stateAfter) → TransitionKey string. Caller
// is responsible for invoking only on positive outcomes — the type
// system enforces this at the call site (ShiftedResponseProps takes
// only the positive ClassifierOutcome subset).
function buildTransitionKey(
  stateBefore: BrainState,
  stateAfter: BrainState
): TransitionKey {
  return `${stateBefore}_to_${stateAfter}` as TransitionKey;
}

// Module-scoped warn-dedup set. Cleared on JS bundle restart, which is
// the right granularity — we want one warn per (path, key) pair per
// session, not on every render.
const _warnedPathKeys = new Set<string>();

// Test-only reset hook. Underscore prefix signals "internal". Do not
// call from production code.
export function _resetWarnedPathKeysForTests(): void {
  _warnedPathKeys.clear();
}

/**
 * Returns the ShiftedResponseCopy for a (transition, intentPath) pair.
 *
 * Lookup order:
 *   1. table[intentPath]?.[key] — path-specific copy (Phase 5 onward).
 *   2. table.default[key] — default-path copy (always present).
 *
 * Failure modes:
 *   - intentPath !== 'default', table[intentPath] is populated, but
 *     table[intentPath]![key] is undefined → __DEV__ console.warn ONCE
 *     per (path, key) pair, then fall through to default. This catches
 *     partial Phase 5 authoring without breaking runtime.
 *   - table.default[key] is undefined → throw in __DEV__ with the key
 *     in the message. Production falls through to a hardcoded fallback
 *     so the user never sees a blank screen. This is the only THROW
 *     path — empty title/body strings are caught by the exhaustive
 *     coverage test, not at runtime.
 */
export function getShiftedResponseCopy(
  stateBefore: BrainState,
  stateAfter: BrainState,
  intentPath: IntentPath
): ShiftedResponseCopy {
  const key = buildTransitionKey(stateBefore, stateAfter);
  const pathTable = SHIFTED_RESPONSE_COPY[intentPath];

  // Path-specific lookup — only meaningful when the path table exists.
  if (intentPath !== 'default' && pathTable !== undefined) {
    const pathEntry = pathTable[key];
    if (pathEntry !== undefined) {
      return pathEntry;
    }
    // Path table is populated but missing this key — partial authoring.
    // Warn once per (path, key), then fall through to default.
    if (__DEV__) {
      const warnKey = `${intentPath}::${key}`;
      if (!_warnedPathKeys.has(warnKey)) {
        _warnedPathKeys.add(warnKey);
        // eslint-disable-next-line no-console
        console.warn(
          `[shiftedResponseCopy] Missing entry for path="${intentPath}", key="${key}". Falling through to default. Populate the path table to silence.`
        );
      }
    }
  }

  const defaultEntry = SHIFTED_RESPONSE_COPY.default[key];
  if (defaultEntry === undefined) {
    if (__DEV__) {
      throw new Error(
        `[shiftedResponseCopy] Default-path copy missing for key="${key}". The classifier produced a positive outcome with no corresponding copy entry — schema bug.`
      );
    }
    // Production fallback. Keeps the user out of a broken state if the
    // classifier and the table ever drift apart in the wild.
    return {
      title: 'You shifted.',
      body: () => `${stateBefore} to ${stateAfter}.`,
    };
  }
  return defaultEntry;
}
