/**
 * Weekly protocol engine — public surface
 * (Vara_Weekly_Engine_Contract.md v1.0).
 *
 * Pure, additive module. No production caller is wired here: the weekly open,
 * the Today screen, and the in-week control that will consume this are later
 * slices. This barrel is deliberately NOT re-exported from any app barrel.
 *
 * Explicit named re-exports only (no `export *`) — required under Metro 0.83.
 */
export type {
  OutcomeKey,
  CapacityTier,
  WeeklyProtocol,
  ResolvedWeeklyProtocol,
  WeeklyRecord,
} from './types';

export {
  PROTOCOL_MATRIX,
  OUTCOME_KEYS,
  CAPACITY_TIERS,
  DEFAULT_QUICK_WIN_PRACTICE_ID,
  allProtocols,
} from './protocolMatrix';
export type { WeeklyProtocolMatrix } from './protocolMatrix';
export { selectProtocol } from './selectProtocol';
export { applyQuickWin, QUICK_WIN_WEEK } from './quickWin';
export { computeContinuity } from './continuity';
