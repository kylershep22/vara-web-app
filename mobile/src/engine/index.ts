/**
 * Recommendation engine — public surface (Vara_Engine_Contract.md v1.1).
 *
 * Pure, additive module. No production caller is wired here; the check-in
 * rework that feeds real inputs and retires selectProtocol is a later step.
 */
export type {
  Arousal,
  Valence,
  Quadrant,
  Situation,
  LengthClass,
  Pillar,
  SlotDirection,
  CatalogSlotType,
  PointerSlotType,
  SlotType,
  SlotMode,
  Slot,
  PlanTemplate,
  PracticePointer,
  ResolvedSlot,
  ResolvedPlan,
  ClockTime,
  SessionHistory,
  RankContext,
  Ranker,
  ResolveInput,
} from './types';

export { resolve } from './resolve';
export { classifyQuadrant } from './quadrant';
export { isEvening, EVENING_START_HOUR } from './clock';
export { defaultRanker } from './ranker';
export {
  timeWindowToLengthClass,
  lengthClassOrder,
  lengthClassWithinBudget,
} from './lengthClass';
export {
  SLOT_TYPE_MODALITIES,
  directionMatches,
  eligiblePractices,
  slotModalities,
} from './slotFilter';
export {
  PLAN_MAP,
  getPlanTemplate,
  settleBreathSlot,
  groundingSlot,
  settleSlot,
  energizeSlot,
  nsdrSlot,
  focusSessionSlot,
  planSlot,
} from './planMap';
export { quadrantToBrainState, brainStateToCircumplex } from './stateBridge';
