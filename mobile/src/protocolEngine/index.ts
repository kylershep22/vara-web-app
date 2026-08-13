/**
 * Protocol engine — public surface
 * (Vara_Protocol_Engine_Contract.md v1.0).
 *
 * Named for what it owns — the protocol selection matrix and its rules — not
 * for a cadence: selection is daily, while the quick-win week rule and
 * continuity below are genuinely weekly. See `types.ts` for the full note.
 *
 * Pure module: every function here is a function of its arguments, with no
 * React, no Firebase, and no clock read. The weekly open, Today (the hero card
 * and the daily picker) and the onboarding terminal consume it. The in-week
 * re-set control once did and is retired — see the note at the foot of this
 * file; capacity is a daily read now, so there is no weekly tier left to step.
 * Persistence stays on the far side of the service layer, so nothing below
 * writes. This barrel is deliberately NOT re-exported from any app barrel.
 *
 * Explicit named re-exports only (no `export *`) — required under Metro 0.83.
 */
export type {
  OutcomeKey,
  CapacityTier,
  TimeClass,
  ProtocolVariant,
  ResolvedProtocolVariant,
  WeeklyRecord,
} from './types';

export {
  PROTOCOL_MATRIX,
  OUTCOME_KEYS,
  CAPACITY_TIERS,
  TIME_CLASSES,
  TIME_CLASS_MAX_MINUTES,
  DEFAULT_TIME_CLASS,
  DEFAULT_QUICK_WIN_PRACTICE_ID,
  timeClassForMinutes,
  allProtocols,
  unauthoredVariants,
} from './protocolMatrix';
export type { ProtocolVariantMatrix, UnauthoredVariant } from './protocolMatrix';
// selectProtocol takes a time class; representativeProtocol deliberately does
// not (week-level callers have no daily answer to give it).
export { selectProtocol, representativeProtocol } from './selectProtocol';
export { applyQuickWin, QUICK_WIN_WEEK } from './quickWin';
export { computeContinuity } from './continuity';
// RETIRED with the in-week re-set (roadmap 3b-i): `nextTierDown` / `nextTierUp`
// walked the capacity ladder one rung for that control and had no other caller.
// CAPACITY_TIERS above is still the single place the order lives.
