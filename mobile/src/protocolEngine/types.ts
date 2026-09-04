/**
 * Protocol engine — core types (Vara_Protocol_Engine_Contract.md v1.0).
 *
 * Named for what it owns — the protocol selection matrix and its rules — and
 * deliberately not for a cadence, because BOTH cadences live here. Selection is
 * daily: capacity and time are daily reads, so the variant served changes day to
 * day. The quick-win week rule and continuity are genuinely weekly. A name
 * picked from either half would misdescribe the other.
 *
 * Pure and dependency-light: no React, no Firebase, no system-clock reads.
 * Time enters as a parameter (week number, week-start date), never by reading
 * the clock, so every function here is a pure function of its inputs.
 *
 * Naming note: the matrix entry type is `ProtocolVariant`, deliberately not
 * `Protocol`, to avoid colliding with the practice-level `Protocol` in
 * `src/types/models` consumed by `src/engine`. Different concept, and the two
 * modules never import each other.
 *
 * It is not `WeeklyProtocol` either, which is what it used to be called. The
 * object is one variant entry in a matrix cell — it carries `variantKey` and
 * `timeClass` — and the cadence it is served at lives in the selection call,
 * not in the object. The genuinely weekly things in this module (`WeeklyRecord`,
 * the quick-win week rule) keep their names on purpose.
 */

import type { DestinationKey, PhaseKey, RemoveFamily } from '../types/models';

/**
 * LEGACY. The four weekly outcomes.
 *
 * NO LONGER A MATRIX AXIS (journey roadmap 3.2). PhaseKey is the outer key of
 * PROTOCOL_MATRIX now, and nothing in the daily loop reads this. It survives
 * for three reasons and no others:
 *
 *   1. `WeeklyCycle.outcome` and `UserPrivate.activeOutcome` are persisted on
 *      documents already written. Those fields keep this type so legacy rows
 *      still parse.
 *   2. Onboarding still writes it, and resolveJourney still reads it. The
 *      weekly open that used to write it is deleted (journey slice 3b); the
 *      field's own retirement is sequenced behind removing those reads.
 *   3. Onboarding V3 step 2 still collects it. That step rekeys to
 *      DestinationKey in slice 4.
 *
 * Do NOT add a new consumer. Every live reader maps through `legacyPhaseFor`
 * in `selectProtocol.ts`, which dies with the JOURNEY_IA flag.
 *
 * Type-only import of PhaseKey below: `import type` is erased by babel, so the
 * models <-> protocolEngine edge is a compile-time cycle only and produces no
 * runtime require cycle for Metro to trip on.
 */
export type OutcomeKey = 'focus' | 'stress' | 'routines' | 'energy';

/**
 * The three capacity tiers.
 *
 * CAPACITY IS READINESS, NOT DURATION (roadmap 3b-ii-a). It is how much demand
 * the user can bring today: `slammed` means gentler and more restorative, NOT
 * merely shorter. Duration is the separate `TimeClass` axis below, and the two
 * are orthogonal on purpose. A user who is slammed but has forty minutes is a
 * real and common state, and the grid has to be able to say something to them.
 *
 * This was not always true: capacity used to be the time PROXY, which is why
 * the 12 shipped protocols still read as a duration ladder. Re-authoring them
 * along the readiness axis is a content pass, not a code change.
 */
export type CapacityTier = 'normal' | 'limited' | 'slammed';

/**
 * How much of the user's day a protocol costs, bucketed to the three windows
 * the daily picker offers (roadmap 3b-ii).
 *
 *   short   <= 5 minutes
 *   medium  6 to 15 minutes
 *   long    more than 15 minutes
 *
 * These describe the protocol's COST, while the picker asks what the user HAS.
 * The bounds are exclusive of each other so a variant belongs to exactly one
 * class; `TIME_CLASS_MAX_MINUTES` in `protocolMatrix.ts` is where they live.
 */
export type TimeClass = 'short' | 'medium' | 'long';

/**
 * One variant within a cell of the 4 x 3 protocol matrix (spec 6.2).
 *
 * Every user-facing string is PLACEHOLDER [Jen] and lives in `protocolMatrix.ts`.
 * Content is data, not logic: swapping copy never touches a code path.
 */
export interface ProtocolVariant {
  /**
   * Stable CELL id, by convention `${phase}-${capacity}`.
   *
   * DELIBERATELY NOT UNIQUE PER VARIANT. Every variant in a cell carries the
   * same id, because this value is persisted on `WeeklyCycle.protocolId` and is
   * typed as a closed 12-member union in `types/analyticsEvents`. Widening it to
   * identify a variant would mean a migration of rows already written and a
   * change to an event schema designed to be read cold. Use `variantKey` to tell
   * variants apart; use `id` to say which cell they belong to.
   */
  id: string;
  /**
   * Unique per variant, by convention `${phase}-${capacity}-${timeClass}`.
   *
   * Not persisted anywhere and not an analytics value: the daily variant is
   * DERIVED from the stored (capacity, time) inputs plus the user's phase, so
   * this exists to disambiguate objects in code and tests, not to be written
   * down.
   *
   * NOT UNIQUE ONCE A CELL HOLDS TWO VARIANTS OF ONE CLASS, which the re-tag
   * makes real: three former outcomes collapsed into `recover`, so its cells
   * now hold several variants and some share a time class. The name predates
   * that and is kept rather than churned; `id` plus `name` identifies a row.
   */
  variantKey: string;
  /**
   * The journey phase this variant belongs to. THE MATRIX AXIS (roadmap 3.2).
   */
  phase: PhaseKey;
  capacity: CapacityTier;
  /** Which of the picker's three windows this variant fits. */
  timeClass: TimeClass;
  /** PLACEHOLDER [Jen] — protocol name shown on Today. */
  name: string;
  /** PLACEHOLDER [Jen] — the one line the user acts on each day. */
  dailyAction: string;
  /** Rough per-day time cost, for the weekly open. PLACEHOLDER [Jen]. */
  estMinutes: number;
  /** PLACEHOLDER [Jen] — rationale, must stay defensible to a clinical audience. */
  whyItWorks: string;
  /**
   * Reference to the same-session physical practice appended in week 1
   * (spec 6.3). The referenced practice need not exist in the catalog yet.
   */
  quickWinPracticeId: string;
  /**
   * References to OPTIONAL supporting practices. May be empty.
   *
   * This list means optional extras and nothing else. The week-1 quick win is a
   * mandatory same-session step and is carried by `quickWinActive` on
   * `ResolvedProtocolVariant`, never by appending to this list.
   */
  supportingPracticeIds: string[];
  /**
   * How well this variant suits each destination, for ORDERING WITHIN A CELL
   * and never for membership (roadmap 3.2).
   *
   * Every variant in a cell is servable to every destination. This only decides
   * which one leads. Absent means "no preference", which sorts as authored
   * order, and that is the state of every variant today: Jen has not defined
   * weights, so `orderForDestination` is currently the identity.
   *
   * WHY NOT MEMBERSHIP. Filtering a cell by destination could empty it, and an
   * empty cell has no protocol to serve. Ordering cannot fail.
   */
  destinationWeight?: Partial<Record<DestinationKey, number>>;
  /**
   * Which Remove family this variant serves (slice 3c-i).
   *
   * REMOVE-PHASE ONLY. The other three phases have no family axis, so the field
   * is absent there rather than defaulted; `selectProtocol` only consults it
   * when the phase is 'remove' and the user has captured a family.
   *
   * ORDERING, LIKE destinationWeight, NEVER MEMBERSHIP. A user whose capture
   * says 'mental' is still served a behavioral variant when the cell has no
   * mental one, because an empty cell has no protocol to serve.
   */
  family?: RemoveFamily;
  /**
   * The line the done-state shows instead of the fixed one (slice 3c-i).
   *
   * PER VARIANT, SO IT MATCHES WHAT THE USER ACTUALLY DID. A friction protocol
   * acknowledges friction; a noticing protocol acknowledges noticing. Absent on
   * every non-Remove variant, which falls back to COMPLETION_COPY.done.
   *
   * NEVER A COUNT AND NEVER A STREAK. The quieting rule lives in the card, not
   * here, and it swaps this line for the plain one rather than counting at the
   * user.
   */
  acknowledgment?: string;
  /**
   * Build-and-walk stand-in, NOT shippable content.
   *
   * Present only on variants whose title also carries the "[PLACEHOLDER] "
   * prefix. `protocolMatrix.removeCellsAuthored.test.ts` fails while any remove
   * cell holds one of these, and that failing test is the merge gate for this
   * slice. Never set this on a variant Jen has authored.
   */
  placeholder?: true;
}

/**
 * A protocol variant resolved for a specific week (spec 6.3).
 *
 * The matrix in `protocolMatrix.ts` is static content, so the week-dependent
 * quick-win state lives here rather than on `ProtocolVariant`. `quickWinActive`
 * is always present and explicit: never undefined, never inferred from the
 * shape of another field.
 *
 * When active, the caller surfaces `quickWinPracticeId` as an in-session step
 * alongside the daily action.
 */
export interface ResolvedProtocolVariant extends ProtocolVariant {
  quickWinActive: boolean;
}

/**
 * One completed week, as input to the continuity calculation.
 *
 * This type deliberately carries NO capacity tier. Continuity is measured
 * against the floor commitment and never against the tier (spec Section 1), and
 * leaving the tier off the type is what stops that invariant from regressing.
 * Do not add a tier field here.
 */
export interface WeeklyRecord {
  /** Week-start date, injected by the caller. Never read from the clock here. */
  weekStart: string;
  /** Did the user meet their floor commitment that week? */
  floorMet: boolean;
}
