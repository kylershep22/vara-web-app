import type { BrainState } from '../types/models';
import { logger } from './logger';

// Maps legacy Firestore values (written before the Phase 0 rename) to the
// canonical BrainState labels. okay → steady, energized → alive.
const LEGACY_TO_CURRENT = {
  okay: 'steady',
  energized: 'alive',
} as const;

// The canonical (post-rename) BrainState label set.
// Kept in sync with the BrainState union in types/models.ts.
const CURRENT_SET: ReadonlySet<string> = new Set([
  'wired',
  'foggy',
  'steady',
  'clear',
  'alive',
]);

// TODO(tech-debt): The `as unknown as BrainState` casts inside this function
// were necessary during the Phase 0 rename transition. Now that models.ts
// BrainState matches the post-rename union, they're cosmetic no-ops. Safe to
// simplify to `value as BrainState` (after confirming the value is in the
// CURRENT_SET) in a future polish pass.
function asBrainState(value: string): BrainState {
  return value as unknown as BrainState;
}

export function normalizeBrainState(value: string): BrainState {
  if (typeof value !== 'string') {
    throw new TypeError(
      `normalizeBrainState: expected string, got ${typeof value}`
    );
  }
  const trimmed = value.trim().toLowerCase();
  const mapped =
    LEGACY_TO_CURRENT[trimmed as keyof typeof LEGACY_TO_CURRENT];
  if (mapped !== undefined) {
    return asBrainState(mapped);
  }
  if (CURRENT_SET.has(trimmed)) {
    return asBrainState(trimmed);
  }
  throw new Error(
    `normalizeBrainState: unknown brain state value "${value}"`
  );
}

export function serializeBrainState(state: BrainState): string {
  const raw = state as unknown as string;
  const legacyMapped =
    LEGACY_TO_CURRENT[raw as keyof typeof LEGACY_TO_CURRENT];
  if (legacyMapped !== undefined) {
    logger.warn(
      `serializeBrainState: received legacy value "${raw}". Writes should use current labels.`
    );
    return legacyMapped;
  }
  return raw;
}
