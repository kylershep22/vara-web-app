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
  PLACEHOLDER_TITLE_PREFIX,
} from './protocolMatrix';
export type { ProtocolVariantMatrix, UnauthoredVariant } from './protocolMatrix';
// selectProtocol takes a time class; representativeProtocol deliberately does
// not (week-level callers have no daily answer to give it).
export {
  selectProtocol,
  representativeProtocol,
  orderForDestination,
  orderForFamily,
  legacyPhaseFor,
} from './selectProtocol';
// RETIRED in journey slice 3a: `applyQuickWin` / `QUICK_WIN_WEEK`. The week-1
// quick win was an ENGINE rule bolted onto a content problem; early-phase
// gentleness is a property Jen authors into the Remove protocols themselves
// (roadmap 3.2). Its only week-number source, countWeeklyCyclesForOutcome,
// retired with it.
// RETIRED in journey slice 6: `computeContinuity` and the `WeeklyRecord` type
// above it. The continuity count was a visible run of unbroken weeks on Today,
// and a visible count of consistent days is functionally a streak whatever it
// is called (roadmap section 9 R4). The whole chain went, not a null through
// it: the card, its copy, the storage-to-engine mapper, the engine function and
// the type it consumed. Nothing replaces it, and no replacement Today metric
// may be added here.
// RETIRED with the in-week re-set (roadmap 3b-i): `nextTierDown` / `nextTierUp`
// walked the capacity ladder one rung for that control and had no other caller.
// CAPACITY_TIERS above is still the single place the order lives.
