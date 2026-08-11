/**
 * Weekly protocol engine — public surface
 * (Vara_Weekly_Engine_Contract.md v1.0).
 *
 * Pure module: every function here is a function of its arguments, with no
 * React, no Firebase, and no clock read. The weekly open, the Today screen and
 * the in-week re-set control now consume it. Persistence stays on the far side
 * of the service layer, so nothing below writes. This barrel is deliberately
 * NOT re-exported from any app barrel.
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
// RETIRED with the in-week re-set (roadmap 3b-i): `nextTierDown` / `nextTierUp`
// walked the capacity ladder one rung for that control and had no other caller.
// CAPACITY_TIERS above is still the single place the order lives.
