/**
 * Recommendation engine — core types (Vara_Engine_Contract.md v1.1).
 *
 * Pure and dependency-light: no React, no Firebase, no system-clock reads.
 * The engine is a situation × state → plan lookup that fills catalog-backed
 * slots and emits typed pointers for focus-session / plan slots.
 */
import type {
  Protocol,
  ProtocolModality,
  ProtocolFamily,
  ProtocolPillar,
} from '../types/models';

// --- State model (§2): two-tap circumplex ---
// Tap 1 (arousal): "Revved up" | "Running low". Tap 2 (valence): "Good" | "Hard".
export type Arousal = 'revved' | 'low';
export type Valence = 'good' | 'hard';
export type Quadrant = 'Tense' | 'Activated' | 'Depleted' | 'Calm';

// --- Situations (§3) ---
export type Situation =
  | 'get_through_hard' // S1
  | 'quiet_mind' // S2
  | 'find_energy' // S3
  | 'wind_down' // S4
  | 'grip_on_day' // S5
  | 'just_reset'; // S6

// --- Length size-class (§5): short = 2–5, medium = 10, long = 20–45 ---
export type LengthClass = 'short' | 'medium' | 'long';

// --- Slots (§5/§6) ---
export type Pillar = ProtocolPillar;
export type SlotDirection = 'settle' | 'energize' | 'neutral';
export type CatalogSlotType =
  | 'settle-breath'
  | 'grounding'
  | 'settle'
  | 'energize'
  | 'nsdr'
  | 'cold';
export type PointerSlotType = 'focus-session' | 'plan';
export type SlotType = CatalogSlotType | PointerSlotType;
export type SlotMode = 'mandatory' | 'offered';

export interface Slot {
  pillar: Pillar;
  direction: SlotDirection;
  type: SlotType;
  lengthClasses: LengthClass[]; // acceptable classes; empty for pointer slots
  mode: SlotMode;
  // Optional explicit modality set. When present it overrides
  // SLOT_TYPE_MODALITIES[type] so composite cells state intent directly rather
  // than relying on the length class to disambiguate (resolution #2).
  modalities?: ProtocolModality[];
  // Optional per-cell lead-preference ordering (best-first protocol ids). When
  // present it takes precedence over the global PRACTICE_LEAD_PREFERENCE for
  // this slot; ids absent from both fall through to the alphabetical tiebreak.
  leadPreference?: readonly string[];
}

export interface PlanTemplate {
  message?: string; // leading message (zero-slot + acknowledgment cells)
  slots: Slot[]; // 0, 1, or 2
}

// --- Resolution output ---
// focus-session / plan slots are emitted as typed pointers (pillar + type), not
// resolved to a screen or a catalog practice here.
export interface PracticePointer {
  pillar: Pillar;
  type: PointerSlotType; // 'focus-session' → Pomodoro flow; 'plan' → plan/routine
  // focus-session only: the budget-derived length (minutes) that prefills the
  // Pomodoro timer, snapped to a real timer option. Absent for plan pointers
  // (a routine destination is not timed). Set at every budget — the pointer is
  // the chosen outcome and is always emitted; a ≤5 budget snaps up to the
  // 10-min timer floor rather than dropping the hand-off.
  length?: number;
}

export type ResolvedSlot =
  | { kind: 'practice'; slot: Slot; practice: Protocol; mode: SlotMode }
  | { kind: 'pointer'; slot: Slot; pointer: PracticePointer; mode: SlotMode };

export interface ResolvedPlan {
  situation: Situation;
  quadrant: Quadrant;
  message?: string;
  slots: ResolvedSlot[]; // 0–2
}

// --- Inputs ---
// Injected wall-clock (never read from the system inside resolve), so the
// evening rules in §8 are deterministic and testable.
export interface ClockTime {
  hour: number; // 0–23
}

export interface SessionHistory {
  recentFamilies?: ProtocolFamily[]; // most-recent-first; drives the recency penalty
}

export interface RankContext {
  lengthClasses: LengthClass[];
  budgetClass: LengthClass;
  clockTime: ClockTime;
  history?: SessionHistory;
  // The filling slot's per-cell lead preference, if any. Takes precedence over
  // the global default in the tiebreak (see defaultRanker).
  leadPreference?: readonly string[];
}

// Pluggable ranker. Returns candidates best-first. Must be deterministic.
export type Ranker = (candidates: Protocol[], ctx: RankContext) => Protocol[];

export interface ResolveInput {
  situation: Situation;
  state: { arousal: Arousal; valence: Valence };
  clockTime: ClockTime;
  timeBudget: number; // minutes available to the user
  history?: SessionHistory;
  ranker?: Ranker; // defaults to defaultRanker
  catalog?: Protocol[]; // defaults to getAllProtocols()
}
