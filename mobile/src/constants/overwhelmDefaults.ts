// Defaults for the Overwhelm Safety Card entry point.
//
// Sub-step 2.6 — text-only Today-surface card ("Need something right
// now?") that mounts CheckInFlow with `entrySource:
// 'overwhelm_safety_card'` and the protocol below. The user is in
// acute distress; we want zero decision points between tap and
// protocol-running.
//
// Why a named constant rather than inline 'sensory-reset-2' at the
// call site:
//   - The card and any future surfacing logic (Phase 5 path-specific
//     thresholds) reference the same symbol.
//   - Tests assert on the constant, not a string literal.
//   - If Phase 5 adds conditional selection (audio-availability,
//     user history, etc.) the symbol stays stable while the
//     implementation grows into a function.
//
// Sensory Reset locked over Cyclic Sighing per spec consensus
// (Vara_Brain_State_Model_v2.2 line 234 + Vara_Persona_Validation
// line 108) plus the brainStateProtocols.ts:455 rationale: "any
// moment when you need something immediate and can't pause to
// breathe deliberately." The Overwhelm user may not have access to
// the deliberate inhale/double-exhale Cyclic Sighing requires.
// SPEC_CONSISTENCY_BACKLOG flags Vara_Implementation_Plan line 294
// for reconciliation.

import type { ProtocolId } from './brainStateProtocols';

export const OVERWHELM_DEFAULT_PROTOCOL_ID = 'sensory-reset-2' as const satisfies ProtocolId;
