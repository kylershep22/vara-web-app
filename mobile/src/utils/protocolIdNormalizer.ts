// Maps legacy protocolId values written by the pre-Phase-1 check-in flow
// to current-library protocol ids. The new id scheme always suffixes a
// duration ({family}-{minutes}) so future variant additions don't force
// renames; the legacy ids did not, so two of the surviving protocols
// gain a new id under the new scheme:
//   extended-exhale → extended-exhale-2
//   micro-reset     → sensory-reset-2
// Three legacy protocols are retired without a successor (Bellows Breath
// / Activating Breathwork excluded at v1; Gratitude & Clarity and Focus
// Primer have no equivalent in the new library) and map to null. The
// Detail/Patterns surface should render null as "protocol no longer
// available" rather than fabricate a substitute.
//
// Mirrors the brainStateNormalizer pattern from Phase 0.
export const LEGACY_PROTOCOL_ID_MAP: Readonly<Record<string, string | null>> = {
  'extended-exhale': 'extended-exhale-2',
  'activating-breathwork': null,
  'micro-reset': 'sensory-reset-2',
  'gratitude-clarity': null,
  'focus-primer': null,
};

// Resolve a stored protocolId to a current-library id (or null for
// retired protocols with no successor). Unknown ids pass through; the
// call site validates against the actual library. We deliberately do
// not depend on constants/brainStateProtocols.ts here to keep the
// utils → constants direction one-way.
export function normalizeProtocolId(
  rawId: string | null | undefined
): string | null {
  if (rawId === null || rawId === undefined) {
    return null;
  }
  if (typeof rawId !== 'string') {
    throw new TypeError(
      `normalizeProtocolId: expected string, got ${typeof rawId}`
    );
  }
  const trimmed = rawId.trim();
  if (trimmed === '') {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_PROTOCOL_ID_MAP, trimmed)) {
    return LEGACY_PROTOCOL_ID_MAP[trimmed];
  }
  return trimmed;
}
