/**
 * Data Model Types
 * TypeScript interfaces for all Firestore collections
 */

import { Timestamp } from 'firebase/firestore';
import type { HabitCategoryKey } from '../constants/habitTaxonomy';
import type { TimedRhythmKey } from '../constants/focusRhythms';
// Type-only import: erased at compile time, so this does NOT wire the weekly
// engine into the running app. The engine stays unconsumed by any screen.
import type { OutcomeKey, CapacityTier, TimeClass } from '../protocolEngine';
// Type-only, same as above: these shapes already exist and the UserPrivate
// migration surface reuses them rather than re-declaring divergent copies.
import type { SubscriptionData, SubscriptionType } from '../utils/subscription';
import type {
  OnboardingCheckInData,
  OnboardingInsightResult,
  CompletedOnboardingActivity,
} from './onboarding';

// ==========================================
// VALUE MODELS
// ==========================================

export interface UserValue {
  id: string;
  label: string; // e.g. "Clarity", "Resilience"
}

// ==========================================
// USER MODELS
// ==========================================

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string; // Alternative field name used in some places
  bannerUrl?: string;
  location?: string;
  // Personal values (set during onboarding, displayed in habit wizard Step 5)
  values?: string[];
  // Value alignment objects (id + label pairs for habit completion sheet)
  userValues?: UserValue[];

  privacy: 'public' | 'connections' | 'private';
  searchable?: boolean;

  // Standardized interests (IDs from WELLNESS_INTERESTS)
  interests?: string[];
  interestsPublic?: boolean; // Toggle for showing interests publicly

  // Wellness goals (IDs from WELLNESS_GOALS)
  goals?: string[];
  goalsPublic?: boolean; // Toggle for showing goals publicly

  // Activity tracking
  lastActiveAt?: Timestamp;

  // Group memberships (for suggested connections)
  groupIds?: string[];

  // Intent path captured during onboarding (wired during Phase 3).
  // Missing field on existing profile docs is treated as 'default' by readers.
  intentPath?: IntentPath;

  // Set by writeStandardFlowSession the first time a CheckInFlow
  // session produces an outcome of 'shifted' or 'partial_shift'
  // (qualifiesAsFirstShift). Drives the one-time "Your first shift is
  // logged in Patterns" footer on Today (sub-step 2.7). Null/undefined
  // means the user has not yet had a qualifying shift.
  firstShiftAt?: Timestamp | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User intent path, drives first-week recommendations and copy tone.
// See Vara_Intent_Paths.md for full spec.
export type IntentPath = 'down_regulation' | 'sleep' | 'activation' | 'default';

/**
 * Owner-only private store (userPrivate/{uid}); extended by later
 * re-architecture slices. Do not add public/profile fields here.
 *
 * WHY A SEPARATE DOCUMENT: Firestore read rules are document-level, so no field
 * on users/{uid} can be made private — that document is readable by any
 * authenticated account (see `match /users/{userId}` in firestore.rules, where
 * privacy filtering is explicitly deferred to the app layer). Anything the user
 * would not want another account to read belongs here instead, behind an
 * owner-only rule. Moving a field out of UserProfile into this interface is
 * therefore a privacy change, not a refactor.
 *
 * Uid-keyed singleton: the document ID IS the uid, matching the
 * notificationPreferences/{userId} and sleepRoutines/{userId} convention. There
 * is deliberately no `userId` FIELD — ownership is carried by the document ID,
 * which is what the rule matches on. `uid` below mirrors the ID so a document
 * read in isolation (console, export) is self-describing.
 *
 * Every field past `uid` is optional because this store is created empty: the
 * foundation slice writes nothing to it. Later slices (onboarding, the
 * weekly-capacity engine) populate them, so any reader must treat every field
 * as absent-by-default rather than assuming a shape.
 */
export interface UserPrivate {
  /** Mirrors the document ID. */
  uid: string;

  /**
   * The smallest version of the commitment the user will still honor on a bad
   * week. Free text, in the user's own words — never rendered back as a target
   * or a score.
   */
  floorCommitment?: string;

  /** Things the user has explicitly decided NOT to pursue this cycle. */
  antiGoals?: string[];

  /**
   * The outcome the user is currently working toward.
   *
   * Narrowed from `string` to `OutcomeKey` by the progressive onboarding slice,
   * which is the first thing that actually writes it. That was always the plan
   * (the previous comment said the enum lands in a later slice); this is that
   * slice. Nothing read the field while it was a plain string, so the narrowing
   * cost nothing to reconcile.
   *
   * DURABLE and user-level, as distinct from `weeklyCycles.outcome`, which
   * records what a SPECIFIC week was opened on. Onboarding sets this once; a
   * user switching outcomes later updates it. Nothing derives one from the
   * other yet.
   */
  activeOutcome?: OutcomeKey;

  /**
   * Why this outcome matters, in the user's own words. Captured at onboarding,
   * skippable, and shown back on hard weeks.
   *
   * FLAT AND SINGLE-VALUED on purpose. An edit history is a real product
   * question (where it renders, whether an old reason is ever surfaced) and
   * belongs to its own slice; a premature array would have to be migrated once
   * that question is answered. Absent means never captured or skipped, which
   * are the same thing to every reader today.
   */
  whyNote?: string;

  /** Day the user's week starts. 0 = Sunday … 6 = Saturday, matching Date#getDay. */
  weekStartDay?: number;

  /**
   * When the user reports having the most capacity. `bucket` is a plain string
   * for the same reason as activeOutcome. An explicit null means asked and
   * cleared, which is distinct from undefined (never captured).
   */
  energyWindow?: { bucket: string; updatedAt: Timestamp } | null;

  // ==========================================================================
  // MIGRATION SURFACE — declared in slice 1, written in slice 2.
  //
  // Everything below moves off users/{uid}, which is readable by ANY
  // authenticated account (firestore.rules `match /users/{userId}`). The public
  // document keeps only the profile card — displayName, bio, avatar, bannerUrl,
  // location, interests, goals, keywords, privacy, searchable, timestamps —
  // and after the flip its write rule is an ALLOWLIST, so nothing here can be
  // written back to it.
  //
  // NOTHING WRITES THESE YET. Slice 1 is type-only: declaring the target shape
  // is what lets slice 2 repoint writers one at a time against a fixed
  // contract. Every field stays optional per this interface's rule — readers
  // must treat absence as the default, which during slices 2-3 is the normal
  // state for any user not yet backfilled.
  // ==========================================================================

  /** Account email. Written by signup today (AuthContext), moves in slice 2. */
  email?: string;

  // ---- Billing. Server-written (RevenueCat webhook / onUserCreate) via Admin
  // SDK, which bypasses rules. Clients never write these — see the users
  // write-rule denylist, which the allowlist supersedes at the flip. ----
  subscription?: SubscriptionData;
  subscriptionType?: SubscriptionType;
  hasActiveSubscription?: boolean;
  trialStartedAt?: Timestamp;
  trialExpiresAt?: Timestamp;

  // ---- Moderation. Server-written.
  //
  // ⚠️ RULES DEPENDENCY — READ BEFORE MOVING THESE. `isAdmin()` reads
  // users/{uid}.role and `isActiveUser()` reads users/{uid}.moderationStatus and
  // .suspendedUntil (firestore.rules helpers). Between them they gate 25 rule
  // clauses. Both helpers MUST be repointed at userPrivate/{uid} in the same
  // change that moves these fields, or every isActiveUser()-gated write starts
  // failing and isAdmin() silently returns false for real admins. A rules
  // get() is a privileged read, so it can reach an owner-only document. ----
  role?: string;
  moderationStatus?: string | null;
  suspendedUntil?: Timestamp | null;

  // ---- Push delivery. An identifier, not content: a push token on a
  // world-readable document lets any authenticated account harvest every user's
  // token. Moving these is the highest-value item in the migration. ----
  expoPushToken?: string;
  pushTokenUpdatedAt?: Timestamp;
  fcmTokenUpdatedAt?: Timestamp;

  // ---- Event / cohort affiliation. Server-written by validateEventCode. ----
  eventCode?: string;
  eventId?: string;
  eventName?: string;
  eventData?: Record<string, unknown>;
  joinedAt?: Timestamp;

  // ---- Onboarding. `onboardingCheckIn` carries energy/focus/mood and
  // `onboardingInsight` an AI-generated wellness narrative — both are health-
  // adjacent and neither belongs on a public document. ----
  hasCompletedOnboarding?: boolean;
  onboardingCompletedAt?: Timestamp;
  onboardingHabitCreated?: boolean;
  onboardingCheckIn?: OnboardingCheckInData;
  onboardingInsight?: OnboardingInsightResult;
  completedOnboardingActivity?: CompletedOnboardingActivity;
  selectedPillar?: BrainPillar;
  /**
   * The live values field. Note the PUBLIC document also declares `values` and
   * `userValues` (UserProfile) — both are dead: nothing writes them, and the one
   * reader (IntentionStep) reads a field that never exists. Those are deleted in
   * the flip slice; this is the one that carries data.
   */
  selectedValues?: string[];

  // ---- Consent, integrations, behavioural state. ----
  aiConsent?: boolean;
  connectedAppsPicks?: string[];
  connectedAppsSubmittedAt?: Timestamp;
  featureDiscovery?: Record<string, unknown>;
  firstShiftAt?: Timestamp | null;
  wellnessScoreEnabled?: boolean;
  lastActiveAt?: Timestamp;
  eventPromptDismissed?: boolean;

  /** Optional like everything else: absent until the first write stamps them. */
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// ==========================================
// ORG MODELS
//
// The org/roster data model (Reconciled Product Spec S17.1–17.2). Both
// collections are provisioned SERVER-SIDE (Admin SDK); clients are read-only and
// the rules enforce that with `allow write: if false`. Nothing in the running app
// reads them yet.
//
// THE MEMBER-PRIVACY PRECONDITION (S17.1): a member's individual data is as
// private from a coach or employer as it is from a stranger. Nothing here grants
// anyone read access to another user's behavioral data — an Organization says
// how many seats exist, a Membership says who belongs and in what role. Neither
// carries member data, and no rule added with them widens read access to any
// per-user collection. Keep it that way: roster/aggregate surfaces for coaches
// are a later slice and need their own rules, not a loosening of these.
// ==========================================

/**
 * Org shape. `individual` exists so a solo user is not a special case with a
 * null org — the same membership path serves everyone.
 */
export type OrgType = 'individual' | 'coach_practice' | 'corporate';

/** A member's role WITHIN one organization. Carried on Membership, not on the user. */
export type OrgRole = 'member' | 'coach' | 'admin';

/**
 * An organization. Provisioned server-side; clients read-only.
 *
 * Readable only by its own members (see `match /organizations/{orgId}` in
 * firestore.rules) — deliberately not world-readable, unlike users/{uid}.
 */
export interface Organization {
  /** Mirrors the document ID. */
  id: string;
  name: string;
  type: OrgType;
  /** Provisioned seat count. Enforcement lives server-side, not in this type. */
  seatLimit: number;
  /** Opaque pointer to the billing system. Never a card or customer PII. */
  billingRef?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * A user's membership in an organization. Provisioned server-side; clients read-only.
 *
 * THIS COLLECTION IS THE SINGLE SOURCE OF TRUTH FOR ORG LINKAGE. There is
 * deliberately no `orgId` on users/{uid} (world-readable — it would leak employer
 * or coaching-practice affiliation to any authenticated account) and none
 * denormalized onto userPrivate yet: memberships is queryable by userId, so a
 * copy would buy a sync burden with no caller to justify it.
 *
 * DOCUMENT ID IS DETERMINISTIC: `${orgId}_${userId}`. Two reasons — it makes a
 * duplicate membership structurally impossible, and it lets a rule answer "is
 * this caller a member of org X" with a single exists() instead of a query,
 * which rules cannot do. Anything constructing this ID must use the same shape;
 * see membershipDocId() in services/firebase/org.service.ts, which is the one
 * place it is built.
 */
export interface Membership {
  /** Mirrors the document ID, `${orgId}_${userId}`. */
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  /** When the user joined this org, as distinct from when the row was written. */
  joinedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// WEEKLY LOOP MODELS
//
// Persistence for the weekly-capacity loop the src/protocolEngine module computes
// (Reconciled Product Spec S6-S8, S17.2). Three OWNER-SCOPED BEHAVIORAL
// collections: weeklyCycles, dailyLogs, downshiftEvents.
//
// MEMBER-PRIVACY PRECONDITION (S17.1), and the reason the rules gate every one
// of these on the userId FIELD: coach and employer rollups aggregate these rows
// via Cloud Function and MUST NEVER read them individually. Org membership
// grants zero read here — a coach in the same org is exactly as locked out as a
// stranger, and the rules tests assert that directly so a later coach slice
// cannot widen it quietly.
//
// `floorMet` is SELF-REPORTED AT THE WEEKLY CLOSE (open item #10, resolved in
// the weekly-close slice: Option A). The user answers whether they held their
// floor that week and the answer is stored on the cycle; nothing derives it
// from daily completion. That is what computeContinuity() consumes, one boolean
// per week, and it is deliberately independent of the capacity tier.
//
// `energyRating` is absent: it belongs to the derived-energy-window feature
// (S11), not to this slice.
// ==========================================

/**
 * One week of the weekly loop. Created at the weekly open (S6.1), updated by the
 * in-week capacity control (S7), completed at the weekly close (S8).
 *
 * `capacityInitial` is kept alongside `capacityCurrent` on purpose: the gap
 * between what the user forecast on the open and where they actually landed is
 * the signal that tells us whether the weekly forecast is doing its job (S7's
 * instrumentation guardrail). Overwriting the forecast would destroy it.
 *
 * Continuity is NOT stored here. It is derived from floor outcomes by
 * computeContinuity(), and it is measured against the floor commitment, never
 * against a capacity tier — which is why no tier on this document may ever feed
 * a continuity calculation.
 */
export interface WeeklyCycle {
  /** Mirrors the document ID (auto-ID). */
  id: string;
  userId: string;
  /** ISO date (YYYY-MM-DD) of the user's chosen week start. Any weekday (S6.1). */
  weekStart: string;
  /**
   * ISO date (YYYY-MM-DD) of the week's last day, INCLUSIVE. Stored rather than
   * derived, for two reasons.
   *
   * A cycle is not always seven days: the first one is a partial "stub" running
   * from setup day to the day before the user's next chosen start day, so its
   * length cannot be recovered from `weekStart` alone.
   *
   * And a live week's boundary must be a FACT ON THE DOCUMENT. Deriving it from
   * `userPrivate.weekStartDay` at read time would let a later change to that
   * preference retroactively move the end of a week already in progress, which
   * the semantics forbid.
   *
   * OPTIONAL, and absent on every cycle written before this field existed.
   * Readers must go through `resolveWeekEnd`, which falls back to
   * `weekStart + 6` — exactly the fixed-length behavior those rows already had.
   * That fallback is why this needs no backfill.
   */
  weekEnd?: string;
  outcome: OutcomeKey;
  /** The tier forecast at the weekly open. Never overwritten. */
  capacityInitial: CapacityTier;
  /** The tier in force now, after any in-week adjustment (S7). */
  capacityCurrent: CapacityTier;
  /** The selected protocol cell, `${outcome}-${capacity}` (see protocolEngine). */
  protocolId: string;

  // ---- Weekly close (S8). All absent until the close is completed. ----
  closeCompletedAt?: Timestamp;
  /** 1-5, one tap. Weekly, never daily (S8.2). */
  ratingFocus?: number;
  ratingRecovery?: number;
  ratingEnergy?: number;
  /** Free text, skippable. The highest-value qualitative data in the product (S8.3). */
  closeNote?: string;
  /**
   * The single adjustment chosen for next week (S8.4). Stores the stable option
   * ID, never the label: the labels are placeholder copy that Jen will replace,
   * and a stored label would orphan every row written before the rewrite.
   */
  adjustmentSelected?: string;
  /**
   * Did the user hold their floor commitment this week? SELF-REPORTED at the
   * close (open item #10, Option A), never derived from daily completion.
   *
   * THE ONLY INPUT TO CONTINUITY. Absent on every cycle written before the
   * close slice and on any week the user never closed, and absent reads as
   * not-met, so continuity counts from the first closed week. That is correct,
   * not a gap to backfill.
   *
   * Note what it is NOT measured against: no capacity tier feeds this, so a
   * slammed week that held the floor counts exactly as much as a normal one.
   */
  floorMet?: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * One day's completion state. At most one per user per day.
 *
 * DOCUMENT ID IS DETERMINISTIC: `${userId}_${date}`, matching the existing
 * brainStateCheckIns / dailyReflections / fourThreeTwoOne convention. `date` is
 * ISO YYYY-MM-DD, which contains no underscore, so the key cannot be parsed
 * ambiguously the way a slug-bearing org ID could.
 *
 * Completion is BINARY (S9.2): done or not yet. Never a percentage, never a
 * grade. Do not add a partial-completion field.
 *
 * THIS ROW IS ALSO WHERE THE DAY'S INPUTS LIVE (roadmap 3b). Capacity used to be
 * locked for the week on the cycle; it is answered per day now, and the answer
 * belongs on the day it was given rather than on the week it fell inside.
 */
export interface DailyLog {
  /** Mirrors the document ID, `${userId}_${date}`. */
  id: string;
  userId: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  protocolCompleted: boolean;
  /** Practices actually run that day. May be empty. */
  practiceIds: string[];

  /**
   * The capacity tier in force for THIS DAY (roadmap 3b-i).
   *
   * STORED AS AN INPUT, NOT AS A DERIVED PROTOCOL. `selectProtocol` is a pure
   * function of its inputs, so a stored `protocolId` would be a second copy of
   * an answer that can already be recomputed, and the two would disagree the
   * first time the matrix content changed. The inputs are the durable fact; the
   * protocol is a view of them. The next slices add a time input alongside this
   * one and an explicit override, and both are only expressible this way.
   *
   * OPTIONAL, and absent on every row written before this field existed and on
   * every day the user has not answered for. Absent means NOT PICKED and falls
   * back to the cycle's `capacityInitial`, which is the day-1 seed; readers must
   * go through that fallback rather than treating absence as a tier.
   */
  dailyCapacity?: CapacityTier;

  /**
   * How much time the user said they had for THIS DAY (roadmap 3b-ii-b).
   *
   * Stored as an INPUT beside `dailyCapacity`, for the same reason: the served
   * protocol is a pure function of (outcome, capacity, time) and recomputing it
   * can never disagree with itself, while a stored copy would.
   *
   * A TIME CLASS, NOT MINUTES. The name echoes the practice engine's
   * `ResolveInput.timeBudget`, which IS a number of minutes and is an unrelated
   * concept; this one is the picker's three-window bucket. Do not do arithmetic
   * on it.
   *
   * ALSO THE "DID THEY PICK TODAY" SIGNAL, which is the load-bearing part.
   * Nothing writes this except an explicit confirm in the picker, so its
   * presence means the user answered rather than merely having been served a
   * default. Read it through `hasPickedToday` and never directly; the coupling
   * is documented there.
   *
   * CURRENTLY INERT FOR DISPLAY (Path C). It is passed to `selectProtocol`
   * honestly, but every matrix cell holds one variant until the off-diagonal is
   * authored, so the served protocol is capacity-driven. Storing it now is what
   * makes the content pass able to light it up without a migration.
   */
  dailyTimeBudget?: TimeClass;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * One in-week capacity change (S7). APPEND-ONLY LOG.
 *
 * Covers both directions despite the name: `fromCapacity`/`toCapacity` carry the
 * direction, so an upshift is recorded here too. Kept as an event log rather
 * than a counter because S7 requires re-set FREQUENCY to be instrumented — if
 * people are re-setting daily, the weekly forecast is not working and we need to
 * know it rather than guess.
 *
 * Recording a tier change here has no bearing on continuity. See computeContinuity().
 */
export interface DownshiftEvent {
  /** Mirrors the document ID (auto-ID). */
  id: string;
  userId: string;
  /** The weeklyCycle this change belongs to. */
  weeklyCycleId: string;
  fromCapacity: CapacityTier;
  toCapacity: CapacityTier;
  timestamp: Timestamp;
}

// ==========================================
// BRAIN HEALTH MODELS
// ==========================================

// User-facing accessible names for brain health pillars
export type BrainPillar =
  | 'growth'      // Learning, adaptation, trying new things (neuroplasticity)
  | 'energy'      // Sleep, nutrition, vitality (neuroenergy)
  | 'focus'       // Attention, concentration, clarity (neurofocus)
  | 'resilience'  // Stress management, recovery (neuroresilience)
  | 'connection'; // Social bonds, belonging (neurosocial)

// ==========================================
// GOAL MODELS
// ==========================================

export interface Goal {
  id: string;
  userId: string;
  title: string;
  primaryFocus: string;
  refinedFocus?: string;
  timeframe: string;
  progress: number;
  milestones?: Milestone[];
  status: 'active' | 'completed' | 'paused';
  brainPillars?: BrainPillar[]; // Brain health pillars this goal supports
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp;
  targetProgress?: number; // Associated progress percentage (e.g., 25, 50, 75, 100)
  isUserDefined?: boolean; // True if user created/modified, false if from suggestions
}

// ==========================================
// INTENTION SYSTEM
// ==========================================

export type IntentionCategory =
  | 'focus_clarity'
  | 'regulation_recovery'
  | 'sustainable_consistency'
  | 'energy_resilience'
  | 'brain_health';

export interface HabitIntention {
  label: string;
  category: IntentionCategory;
  isCustom: boolean;
}

// ==========================================
// HABIT MODELS
// ==========================================

/**
 * The time-of-day slot a habit is aimed at.
 *
 * THE single definition for habits. It was previously written out twice (inline
 * on Habit below, and again as a local union in SimpleHabitCreateScreen), so the
 * create sheet and the model could drift apart silently. Anything that offers,
 * stores or maps to a habit's slot imports this; do not write the union out
 * again.
 *
 * NOT to be confused with `TimeOfDay` further down this file, which is the
 * RECOMMENDER's seven-bucket vocabulary (early_morning / midday /
 * late_afternoon / ...). Different granularity, different consumers, no shared
 * values beyond the word "evening". Hence the distinct name rather than one
 * union serving both.
 *
 * `anytime` means the user declined to aim it. The create path deliberately
 * does not persist that value, so an unaimed habit carries no timeOfDay field
 * at all rather than a stored "anytime".
 */
export type HabitTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  type: 'daily' | 'weekly' | 'custom';
  frequency: number; // times per week
  frequencyType?: 'daily' | 'specific_days' | 'flexible';
  specificDays?: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  timeOfDay?: HabitTimeOfDay;

  // Per-habit reminder. Opt-in: an absent `reminderEnabled` means off, so
  // habits created before this shipped carry no flag at all.
  //
  // `reminderTime` is the canonical ReminderTime {hour, minute} — deliberately
  // NOT a "7:00 AM" string (routines store one, and parseTimeString silently
  // no-ops on anything it cannot read) and NOT the legacy `cue`, which is a
  // different concept written only by the retired wizard.
  //
  // The reminder's DAYS are not stored: they are inherited from the habit's own
  // frequencyType/specificDays at schedule time, so a habit's schedule and its
  // reminder can never disagree. See utils/habitReminderPlan.
  reminderEnabled?: boolean;
  reminderTime?: ReminderTime | null;
  streak: number;
  longestStreak: number;
  active: boolean;

  // TWO CATEGORY FIELDS LIVE HERE. They are different things. Do not merge
  // them, do not read one as a fallback for the other.
  //
  // `category` is the LEGACY free-text field. It is uncontrolled (the habit
  // detail screen used to accept any typed string), it is rendered raw to the
  // user in the habit list meta line, and three live readers depend on its
  // exact values: the completion sheet routes on `category === 'Connection'`,
  // and isCognitiveReserveCategory / crFlagged key off the twelve strings in
  // constants/habitCategories.ts. It is also written by the web app against
  // this same collection. Nothing in the new taxonomy writes it.
  category?: string;

  // `habitCategory` is the NEW controlled taxonomy: one of the nine keys in
  // constants/habitTaxonomy.ts, or null on every habit created before the
  // capture shipped. Pillar and focus-demand are DERIVED from it via
  // HABIT_CATEGORY_MAPPING at read time and are deliberately not denormalized
  // here, so a mapping change needs no migration. Never free text.
  //
  // Three labels ("Health", "Mindfulness", "Connection") appear in both
  // vocabularies. That overlap is coincidental and carries no shared meaning.
  habitCategory?: HabitCategoryKey | null;

  neurochemicalTags?: string[]; // Brain health neurochemical impacts (e.g., 'dopamine', 'serotonin', 'cortisol')

  // ==========================================
  // VARA HABITS ENHANCEMENTS
  // Identity-based habit system
  // ==========================================

  // Who you're becoming (Vara's "Who Are You Becoming?" system)
  identity?: string; // e.g., "A Runner", "Someone who writes", "A healthy eater"
  identityStatement?: string; // e.g., "I'm becoming a person who runs daily"
  outcomeGoal?: string; // Optional: traditional goal, de-emphasized (e.g., "Run a 5K")

  // Quick Start System (Vara's scaling versions for flexibility)
  fullVersion?: string; // The ideal/target completion (e.g., "Run 30 minutes")
  quickStartVersion?: string; // 5-10 minute simplified version (e.g., "Run 10 minutes")
  justShowUpVersion?: string; // 1-2 minute minimal version (e.g., "Put on shoes, step outside")
  scalingPhase?: 'getting_started' | 'building_momentum' | 'committed' | 'established' | 'expert';

  // Bounce Back System (Vara's "Never Miss Twice" tracking)
  missedYesterday?: boolean; // Flag to trigger bounce back alerts
  consecutiveMisses?: number; // Track consecutive misses to prevent spirals

  // Your When/Where Plan (implementation intention)
  cue?: {
    type: 'time' | 'location' | 'after_habit' | 'emotion';
    value: string;
  };
  implementationIntention?: string; // e.g., "When I finish coffee, I will run for 30 min"

  // Context & Purpose
  problem?: string; // What problem does this habit solve?
  trigger?: string; // What situation/feeling triggers the need for this habit?

  // Build On What Works (habit stacking)
  stackedAfter?: string; // Habit ID or routine name this is stacked after

  // Intention System
  intention?: HabitIntention;

  // Values alignment (from Step 5 — links habit to a personal value)
  valueAlignment?: string | null;

  // Opt-in: invite a free-text note after this habit is completed. Per-habit,
  // so the behaviour follows the habit to every completion surface rather than
  // varying by where the user happened to tap. Unset means off — existing
  // habits are not backfilled.
  notePromptEnabled?: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type HabitReflection = 'smooth' | 'okay' | 'hard';
export type ConnectionQuality = 'nourishing' | 'fine' | 'draining';
export type CompletionSource = 'track' | 'home';

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  completedAt: Timestamp;

  // Vara Habits Enhancement: Track which version was completed
  versionCompleted?: 'full' | 'quick_start' | 'just_show_up'; // Which version did they do?
  quickNote?: string; // Optional 1-line note, written by setCompletionNote as a
                      // merge onto an already-saved completion. Only habits with
                      // notePromptEnabled are ever asked. Read by the Habit
                      // Details "What you noted" card.

  // Completion reflection (from HabitCompletionSheet)
  reflection?: HabitReflection | null;        // For non-Connection habits
  connectionQuality?: ConnectionQuality | null; // For Connection-category habits
  source?: CompletionSource;                   // Where the completion was triggered
  crFlagged?: boolean;                         // Denormalized from habit at completion time
  valueAlignment?: string | null;              // Denormalized from habit at completion time
  skippedReflection?: boolean;                 // True when user explicitly tapped skip
}

/** Data passed from HabitCompletionSheet to the completion handler */
export interface CompletionData {
  habitId: string;
  reflection: HabitReflection | null;
  connectionQuality: ConnectionQuality | null;
  skippedReflection: boolean;
  source: CompletionSource;
}

// ==========================================
// TASK MODELS
// ==========================================

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// DAY BLOCK MODELS (Time-Blocking, TB-1a)
// ==========================================

/**
 * How much of the user's attention a piece of work asks for.
 *
 * Exported on its own because TB-2's batched tasks share this exact axis: a
 * task and the block it becomes must be sortable against each other, which a
 * second parallel enum would quietly prevent.
 *
 * NOT the same thing as `Task.priority` ('low' | 'medium' | 'high'), which is
 * importance, not cognitive load. Same cardinality, different question. Do not
 * alias one onto the other.
 */
export type Demand = 'light' | 'medium' | 'heavy';

/**
 * One protected stretch of the day.
 *
 * EXPORT-CLEAN BY CONSTRUCTION, and this is the load-bearing property of the
 * whole type: a block carries a real instant (`startAt`) plus a numeric
 * `durationMinutes`, which is exactly what a calendar event needs. Phase 2
 * sync therefore reads these two fields directly and re-derives nothing.
 *
 * A rhythm zone key is NEVER the time. `suggestedFrom` is provenance only —
 * see its own note below.
 *
 * NO `completed` FIELD, DELIBERATELY. Blocks have no done state: a past block
 * simply fades. There is nothing to tick, so there is nothing to store, and the
 * absence is designed rather than missing. A service test pins it.
 */
export interface DayBlock {
  id: string;
  userId: string;
  title: string;
  demand: Demand;
  /**
   * Length in minutes. 30 / 60 / 90 at MVP, but a plain number rather than a
   * union: the durations are a UI affordance and are expected to widen, and a
   * union here would make widening them a data-model migration.
   */
  durationMinutes: number;
  /** The real instant the block starts. Never a zone label. */
  startAt: Timestamp;
  isProtected: boolean;
  /**
   * Which rhythm zone the accepted placement suggestion came from, when one
   * was accepted at all.
   *
   * PROVENANCE ONLY. Nothing may derive a time from this — `startAt` is the
   * only source of when a block happens. It exists so we can later ask whether
   * suggested placements survive better than hand-picked ones.
   *
   * TimedRhythmKey, NOT the wider FocusRhythmKey: `varies` maps to no clock
   * range, so suggestPlacement can never propose it and it can never be the
   * provenance of an accepted suggestion. The narrower type makes that
   * unrepresentable rather than merely unlikely.
   */
  suggestedFrom?: TimedRhythmKey;
  /**
   * Which captured task this block was created from, when it came from one at
   * all (TB-3, the task-to-block bridge).
   *
   * PROVENANCE ONLY, on exactly the `suggestedFrom` terms above. It records
   * where the block came from; it is never scheduling data, never an ownership
   * claim, and nothing derives a time from it.
   *
   * THE LINK LIVES HERE AND NOT ON THE TASK, and that direction is the whole
   * design. A CapturedTask is structurally timeless — see its "deliberately
   * absent" list below, where `dueDate` is refused because it would make two
   * competing answers to "when does this happen". A `blockId` there would be
   * that same second answer one hop away. Keeping the reference on this side
   * also makes both deletions behave without a cleanup pass:
   *
   *   block deleted   the task's "Blocked" chip is DERIVED by scanning loaded
   *                   blocks (see screens/Focus/blockedFor.ts), so the chip
   *                   simply stops matching. Nothing to tidy.
   *   task cleared    this id dangles, and that is harmless: no read path
   *                   dereferences it. The derivation asks "which block points
   *                   at THIS task", starting from a task that still exists, so
   *                   a pointer to a cleared task is never followed.
   *
   * A DANGLING VALUE IS THEREFORE EXPECTED, not a defect. Do not add a cleanup
   * job, a batch write on clear, or an existence check on read.
   */
  sourceTaskId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// CAPTURED TASK MODELS (Task-Batching, TB-2a)
// ==========================================

/**
 * One captured task: a name and how much it takes out of you. Nothing else.
 *
 * NEVER CONFLATE THIS WITH `Task` ABOVE (line ~649). They are two different
 * entities that happen to share an English word, and the axis is the tell:
 *
 *   Task         legacy, WEB app, frozen. `priority: low|medium|high`, which
 *                is IMPORTANCE. Still written by the web app's Tasks page; the
 *                whole layer around it (tasks.service.ts, useTasks, the rules
 *                block, two composite indexes) is fenced off pending a product
 *                call about the web app's future. Mobile reads none of it.
 *   CapturedTask mobile capture, this arc. `demand: light|medium|heavy`, which
 *                is COGNITIVE LOAD — the same axis a DayBlock carries, reusing
 *                the same `Demand` type above so a task and the block it
 *                becomes stay sortable against each other.
 *
 * Same cardinality, different question. Do not alias, migrate, or "unify" them.
 *
 * WHAT IS DELIBERATELY ABSENT, each an answer rather than an omission:
 *
 *   completed  A cleared task is DELETED, not flagged done. There is no history
 *              and no cleared list — tasks are a holding pen, not a record, so
 *              there is no state for a completion flag to represent. (Compare
 *              DayBlock, which omits `completed` for a different reason: a block
 *              is an appointment with no done state at all.)
 *   dueDate    Scheduling is what a DayBlock is for. A due date here would make
 *              two competing answers to "when does this happen".
 *   blockId    Same refusal, one hop further out (TB-3). The task-to-block link
 *              is real, but it lives on the BLOCK as `sourceTaskId` — a
 *              reference from here would be a second answer to "when does this
 *              happen" reached by dereferencing, and it would need a cleanup
 *              write every time a block was deleted. The "Blocked" chip is
 *              DERIVED instead; see the sourceTaskId note on DayBlock above.
 *   priority   The importance axis belongs to the legacy entity. Demand is the
 *              only axis this model has, by design.
 *   description, projects, subtasks, reminders, tags
 *              The fence that keeps capture from becoming a to-do app. Adding
 *              any of them is a product decision, not a schema tweak.
 */
export interface CapturedTask {
  id: string;
  userId: string;
  title: string;
  /** Cognitive load. Shared with DayBlock — see the `Demand` note above. */
  demand: Demand;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// JOURNAL MODELS
// ==========================================

export interface JournalEntry {
  id: string;
  userId: string;
  content?: string; // Mobile app format
  text?: string; // Web app format
  mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JournalWeeklySummary {
  text: string;
  moodTrend: 'improving' | 'stable' | 'declining';
  topThemes: string[];
  wordCount: number;
  entryCount: number;
}

// ==========================================
// 4-3-2-1 DAILY PRACTICE MODELS
// ==========================================

export type BodyFuelOption =
  | 'healthy_meal'
  | 'hydration'
  | 'vitamins'
  | 'fruits_veggies'
  | 'protein'
  | 'exercise'
  | 'rest'
  | 'stretch'
  | 'other';

export interface FourThreeTwoOneEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format for easy querying

  // 4 minutes to yourself
  fourMinutes: boolean;

  // 3 wins from the day (optional to write)
  threeWins: {
    completed: boolean;
    wins?: string[]; // Optional array of win descriptions
  };

  // 2 ways fueled body
  twoFuel: {
    completed: boolean;
    options?: BodyFuelOption[]; // Selected fuel options
  };

  // 1 connection
  oneConnection: boolean;

  // Overall completion
  completed: boolean; // True when all 4 parts are checked

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// MOOD MODELS
// ==========================================

export interface Mood {
  id: string;
  userId: string;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  note?: string;
  createdAt: Timestamp;
}

// ==========================================
// COMMUNITY MODELS
// ==========================================

export type GroupCategory =
  | 'fitness'
  | 'mindfulness'
  | 'nutrition'
  | 'sleep'
  | 'mental-health'
  | 'productivity'
  | 'social'
  | 'learning'
  | 'other';

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  members: string[]; // array of user IDs
  memberCount?: number;
  category?: GroupCategory;
  coverImage?: string;
  // Invite permission settings
  invitePermission: 'owner_only' | 'all_members';
  // Activity tracking
  lastActivityAt?: Timestamp;
  postCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// GROUP PROMPT MODELS
// ==========================================

export interface GroupPrompt {
  id: string;
  groupId: string;
  prompt: string;
  frequency: 'weekly';
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  createdBy: string;
  active: boolean;
  currentPostId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// CHALLENGE MODELS
// ==========================================

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';
export type ChallengeFrequency = 'daily' | 'weekly' | 'total';

export interface Challenge {
  id: string;
  // Basic info (similar to Group)
  ownerId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  members: string[];
  memberCount?: number;
  category?: GroupCategory;
  coverImage?: string;

  // Challenge-specific fields
  type: 'challenge'; // Distinguishes from regular groups
  challengeGoal: string; // e.g., "Run 4 days a week"
  startDate: Timestamp;
  endDate: Timestamp;
  frequency: ChallengeFrequency; // How often to check in
  targetCount: number; // Target completions (e.g., 16 runs over 4 weeks)
  unit?: string; // e.g., "runs", "sessions", "days"

  // Invite permission settings
  invitePermission: 'owner_only' | 'all_members';
  sourceGroupId?: string; // If created from a group

  // Status
  status: ChallengeStatus;

  // Activity tracking
  lastActivityAt?: Timestamp;
  postCount?: number;
  totalCheckIns?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChallengeCheckIn {
  id: string;
  challengeId: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  note?: string;
  mood?: string;
  proofImageUrl?: string;
  createdAt: Timestamp;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  joinedAt: Timestamp;
  checkInCount: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate?: string;
  completedTarget: boolean;
  rank?: number; // Calculated field for leaderboard
}

// ==========================================
// INVITE MODELS
// ==========================================

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string; // Denormalized for display
  inviterId: string;
  inviterName: string; // Denormalized for display
  inviteeId: string;
  status: InviteStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChallengeInvite {
  id: string;
  challengeId: string;
  challengeName: string; // Denormalized for display
  inviterId: string;
  inviterName: string; // Denormalized for display
  inviteeId: string;
  status: InviteStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Post {
  id: string;
  userId: string;
  groupId: string;
  content: string;
  imageUrl?: string;
  likes: string[]; // array of user IDs
  comments: Comment[];
  postType?: 'update' | 'win' | 'reflection' | 'ask';
  challengeId?: string;
  challengeName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
}

// ==========================================
// CONNECTION MODELS
// ==========================================

export interface Connection {
  id: string;
  a: string; // user ID
  b: string; // user ID
  pairId: string; // sorted IDs joined with _
  status: 'pending' | 'accepted' | 'declined';
  requestedBy: string; // user ID who sent request
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// MESSAGING MODELS
// ==========================================

export interface Conversation {
  id: string;
  participants: string[]; // array of user IDs
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

// ==========================================
// NOTIFICATION MODELS
// ==========================================

export type NotificationType =
  | 'connection'
  | 'message'
  | 'post'
  | 'comment'
  | 'system'
  | 'goal_milestone'         // 25%, 50%, 75%, 100% progress
  | 'goal_completed'         // Goal reached 100%
  | 'daily_reminder'         // Daily rhythm reminder
  | 'community_activity'     // Group activity
  | 'welcome_back';          // Returning user welcome

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string | number | boolean>;
  createdAt: Timestamp;
}

// ==========================================
// NOTIFICATION PREFERENCES MODELS
// ==========================================

export type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'never';
export type ReminderTime = { hour: number; minute: number };

export interface NotificationCategory {
  enabled: boolean;
  frequency?: NotificationFrequency;
  // For push vs in-app control
  push?: boolean;
  inApp?: boolean;
}

/**
 * The shape of a single legacy (V1) notification category, as it exists on an
 * un-migrated document. This type describes data the V1 -> V2 migration READS
 * off raw document data; nothing may write it.
 *
 * It used to carry an `[key: string]: unknown` index signature, and it used to
 * be reachable through four optional fields on NotificationPreferences below.
 * Together those let NotificationOptInScreen write a whole V1 `dailyReminders`
 * object onto a V2 document and still type-check. The scheduler reads
 * `dailyRhythm.reminderTime`, so the time the user picked was written to a
 * field nothing reads and silently discarded. Do not reintroduce either the
 * index signature or the fields on NotificationPreferences.
 */
export interface LegacyNotificationPreferences {
  enabled?: boolean;
  reminderTime?: ReminderTime | null;
  connectionRequests?: boolean;
  groupPosts?: boolean;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  schemaVersion?: number;

  // Master toggle
  allNotificationsEnabled: boolean;

  // Quiet Hours
  quietHours: {
    enabled: boolean;
    startTime: ReminderTime;
    endTime: ReminderTime;
  };

  // Daily Rhythm (1 notification/day at user-selected time)
  dailyRhythm: {
    enabled: boolean;
    reminderTime: ReminderTime | null;
  };

  // Insights & Learning (2-3/week brain-health content)
  insightsLearning: {
    enabled: boolean;
    frequency: 'twice_weekly' | 'three_weekly';
  };

  // Social & Connection
  socialConnection: {
    directMessages: boolean;
    connectionRequests: boolean;
    communityDigest: boolean;
  };

  // Milestones & Reflection (calendar-time based, not streaks)
  milestonesReflection: {
    enabled: boolean;
  };

  completionSound: {
    enabled: boolean;
    sound: 'singing-bowl' | 'soft-chime' | 'nature-bell' | 'stream';
  };

  // NO legacy V1 fields are declared here. `dailyReminders`, `milestones`,
  // `messages` and `community` used to be optional members of this interface
  // "for backward compat during migration" — but the migration reads them off
  // raw document data (Record<string, any>), never off this type, so declaring
  // them bought nothing and cost correctness: it made writing V1 debris onto a
  // V2 document a legal, silently-ignored operation. See
  // LegacyNotificationPreferences above.

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface DailyPlanRequest {
  userId: string;
  goals?: Goal[];
  habits?: Habit[];
  tasks?: Task[];
}

export interface DailyPlanResponse {
  plan: string;
  suggestions: string[];
}

export interface AIPromptRequest {
  context: string;
  type: 'goal' | 'habit' | 'task' | 'journal';
}

export interface AIPromptResponse {
  prompt: string;
}

export interface JournalPromptRawResponse {
  text: string;
}

export interface JournalSummaryRequest {
  userId: string;
  entries: JournalEntry[];
  startDate: string;
  endDate: string;
}

export interface JournalSummaryResponse {
  summary: string;
  insights: string[];
}

// ==========================================
// BRAIN HEALTH TRACKING MODELS
// ==========================================

export interface BrainMetrics {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  readinessScore: number; // 0-100 calculated score
  sleepQuality: number; // 1-5 user input
  hydrationChecks: number; // 0-8 glasses
  stressLevel: number; // 1-5 user input
  nervousSystemToolUses: number; // count of sigh + panoramic vision uses
  amccCompleted: boolean; // Did One Hard Thing completed
  amccType?: 'cold' | 'movement' | 'conversation' | 'skill';
  neuroplasticityStimulus: boolean; // Did something uncomfortable
  focusMinutes: number; // Total focus session time
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NervousSystemSession {
  id: string;
  userId: string;
  type: 'physiological-sigh' | 'panoramic-vision';
  duration: number; // seconds
  completedAt: Timestamp;
}

export interface AMCCChallenge {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  type: 'cold' | 'movement' | 'conversation' | 'skill';
  description: string;
  completed: boolean;
  reflection?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// ==========================================
// VARA WELLNESS SCORE MODELS
// ==========================================

/**
 * Wellness Score Pillar
 * Individual component scores that make up the overall wellness score
 */
export interface WellnessScorePillar {
  name: 'foundation' | 'consistency' | 'mind' | 'growth';
  score: number; // 0-100 for the pillar
  weight: number; // Percentage weight (0.40, 0.30, 0.20, 0.10)
  weightedScore: number; // score * weight
  components: WellnessScoreComponent[];
}

/**
 * Individual component within a pillar
 */
export interface WellnessScoreComponent {
  name: string;
  value: number; // Raw value or normalized 0-100
  maxValue?: number; // For display purposes (e.g., "3/5 habits")
  contribution: number; // Points contributed to pillar score
  status: 'positive' | 'neutral' | 'negative' | 'missing'; // For UI coloring
  label?: string; // Human-readable label
  hasData: boolean; // Whether this component has actual user data
  actionRoute?: string; // Navigation route to complete this component
  actionLabel?: string; // Label for the action button (e.g., "Log sleep")
}

/**
 * Incomplete action item for wellness score
 */
export interface WellnessIncompleteAction {
  component: string; // Component name
  label: string; // Human-readable label
  description: string; // What the user needs to do
  route: string; // Navigation route
  priority: number; // 1 = highest priority
  pillar: 'foundation' | 'consistency' | 'mind' | 'growth';
}

/**
 * Morning Check-In
 * Quick subjective input to ground the objective data
 */
export interface MorningCheckIn {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  energyLevel: number; // 1-5 scale
  mood: number; // 1-5 scale
  note?: string; // Optional quick note
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// BRAIN STATE CHECK-IN (Dashboard V2)
// ==========================================

export type BrainState = 'wired' | 'foggy' | 'steady' | 'clear' | 'alive';

/**
 * Brain State Check-In
 * Single-tap daily check-in that maps to a recommended protocol.
 * Stored in the `brainStateCheckIns` collection.
 */
export interface BrainStateCheckIn {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  brainState: BrainState;
  protocolId: string;
  protocolCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Raw circumplex state from the check-in that wrote this marker. Carried in
  // addition to the bridged `brainState` so the dashboard "Right now"
  // acknowledgment can reflect the real quadrant on EVERY terminal type
  // (practice, pointer hand-off, or acknowledged), not only when a catalog
  // practice ran and a protocolSessions doc exists. Inlined unions (kept in
  // sync with engine Quadrant/Situation) avoid a models→engine import cycle.
  quadrant?: 'Tense' | 'Activated' | 'Depleted' | 'Calm';
  situation?:
    | 'get_through_hard'
    | 'quiet_mind'
    | 'find_energy'
    | 'wind_down'
    | 'grip_on_day'
    | 'just_reset';
}

// ==========================================
// PROTOCOL CATALOG (Phase 1 schema lock)
//
// Type contract for the static protocol library that GuidedSessionPlayer
// consumes. Protocol *data* lives in constants/brainStateProtocols.ts and
// is populated against this shape in sub-step 2. The session record below
// (ProtocolSession) references protocols by id but does not depend on the
// catalog types directly, so a missing/retired protocolId on a historical
// session doc does not break reads — call sites use protocolIdNormalizer
// to resolve legacy ids.
// ==========================================

// Plain-language signal of how strong the research base is for a protocol.
// Stored numerically for algorithm sorting; the chip label/color shown in
// UI is derived in a presentation helper, not stored on the protocol.
export type EvidenceTier = 1 | 2 | 3 | 4;

// Time-of-day bucket used by the recommender (Phase 4) and by the user's
// onboarding answers (Phase 3). Empty `suitableForTimesOfDay` array means
// the protocol is appropriate any time.
export type TimeOfDay =
  | 'early_morning'
  | 'mid_morning'
  | 'midday'
  | 'early_afternoon'
  | 'late_afternoon'
  | 'evening'
  | 'late_night';

// Delivery modality. Drives icon, framing, and which step kinds the
// protocol uses. Aligned with the modality column in the v2.2 protocol
// table (split "sensory/cognitive" into separate values because Focused
// Work Window is purely cognitive while Sensory Reset is sensory).
export type ProtocolModality =
  | 'breath'
  | 'movement'
  | 'audio'
  | 'sensory'
  | 'cold'
  | 'cognitive'
  | 'environmental';

// The 11 protocol families shipping at launch. Variants (e.g. nsdr-10 vs
// nsdr-20) share a family so the algorithm can dedupe by family in the
// recency penalty. Bellows Breath is excluded at v1 — re-evaluate when
// the user-profile contraindication-flag system exists.
export type ProtocolFamily =
  | 'cyclic-sighing'
  | 'sensory-reset'
  | 'extended-exhale'
  | 'box-breathing'
  | 'coherence-breathing'
  | 'brief-movement'
  | 'nsdr'
  | 'cold-water-reset'
  | 'mindful-walking'
  // 'focused-work' retired in the engine-wiring step: focus work is served as a
  // `focus-session` pointer (Pomodoro), never a catalog practice. See
  // brainStateProtocols.ts where the variants were removed.
  | 'bright-light';

// Outcome pillar a practice serves. The engine fills plan slots by pillar.
// Most regulation practices are `energy`; focused-work is `focus`. The `time`
// and `community` pillars are served by other surfaces (routines, community),
// not the protocol catalog, but the union carries them for slot completeness.
export type ProtocolPillar = 'focus' | 'energy' | 'time' | 'community';

// Regulation direction used for slot matching: a `settle` slot accepts
// practices tagged `settle` or `both`; an `energize` slot accepts `energize`
// or `both`. `neutral` is for non-regulation practices (e.g. a focus-work
// session that is the goal itself rather than a state shift).
export type ProtocolRegulationDirection =
  | 'settle'
  | 'energize'
  | 'both'
  | 'neutral';

// Grouping tag for the Energy hub browse lists (IA Phase B-3). Purely a
// browse-UI concern: NOT read by the recommender/selector or slot matching.
// `regulate` = settle/ground practices, `rest` = deep-rest audio,
// `fuel` = activating/energizing practices. User-facing list labels are a
// B-3 decision; these are the data tags only.
export type ProtocolBrowseCategory = 'regulate' | 'rest' | 'fuel';

// One phase of a paced breath cycle. Sequenced into BreathStep.phases and
// repeated until the step's durationSeconds elapses. `label` is what the
// pacer renders alongside the visual ("Inhale", "Hold", "Exhale").
export interface BreathPhase {
  kind: 'inhale' | 'exhale' | 'hold';
  seconds: number;
  label?: string;
  // Short instructional copy shown below the pacer for this phase (e.g. "Long
  // exhale through your mouth"). Optional — the pacer omits the guidance line
  // when absent.
  guidance?: string;
}

// Common shape for every step. Step kinds extend this with kind-specific
// fields under a discriminator.
interface BaseProtocolStep {
  id: string; // stable within the protocol; used for player keys
  durationSeconds: number;
}

// Paced breathwork. Renders the BreathPacer visual (Phase 1 sub-step 3).
// `phases` repeats in order; cycle count is derived from durationSeconds
// divided by the sum of phase seconds.
export interface BreathStep extends BaseProtocolStep {
  kind: 'breath';
  phases: BreathPhase[];
  guidance?: string;
}

// Audio-driven step. The audio file *is* the protocol for its duration —
// no overlaid pacer or instruction text. Used for NSDR.
// `audioPath` is relative to the `protocolAudio/` root in Firebase
// Storage. Versioned filenames (e.g. nsdr_10min_v1.mp3) let us re-record
// without invalidating existing client data.
export interface AudioStep extends BaseProtocolStep {
  kind: 'audio';
  audioPath: string;
}

// Plain-text prompt shown for durationSeconds before auto-advancing.
// Used for Sensory Reset's 5-4-3-2-1 sequence.
export interface InstructionStep extends BaseProtocolStep {
  kind: 'instruction';
  text: string;
}

// Free-form timer where the user does the work elsewhere (walking,
// focused work) and the app just runs the clock. `label` names the
// activity; `hint` is optional supportive copy.
export interface TimerStep extends BaseProtocolStep {
  kind: 'timer';
  label: string;
  hint?: string;
}

// Discriminated union of all step kinds. Player uses `kind` to dispatch
// to the right renderer. Add new kinds here, then handle them at every
// switch site (the player's switch should be exhaustive via assertNever).
export type ProtocolStep =
  | BreathStep
  | AudioStep
  | InstructionStep
  | TimerStep;

// Full protocol definition. Each launch protocol — including each
// duration variant — is a single Protocol object keyed by `id`.
export interface Protocol {
  // Identity
  id: string; // unique per variant, matches the dict key in BRAIN_STATE_PROTOCOLS
  family: ProtocolFamily; // shared across variants of the same protocol
  name: string;
  description: string; // one-liner shown on cards

  // Detail screen content (long-form)
  whatItIs: string;
  whatYoullNeed: string;
  howItWorks: string;
  whenItFits: string;
  contraindications?: string;

  // First-time orientation (condensed three-section copy)
  firstTimeOrientation: {
    whatYoullDo: string;
    whatYoullNeed: string;
    whyItWorks: string;
  };

  // Evidence
  evidenceTier: EvidenceTier;
  evidenceCitation?: string; // single one-line citation; full lists stay out of v1 UI

  // Algorithm metadata (consumed in Phase 4)
  durationSeconds: number; // total expected; matches sum of step durations
  timeWindow: ProtocolTimeWindow;
  modality: ProtocolModality;
  // Engine tagging (Vara_Engine_Contract.md §5). The recommender fills plan
  // slots by { pillar, regulationDirection, modality→type, timeWindow→length }.
  pillar: ProtocolPillar;
  regulationDirection: ProtocolRegulationDirection;
  // Browse-list grouping for the Energy hub (IA Phase B-3). Consumed only by
  // the future browse UI — not by the recommender/selector. Required so the
  // type enforces that every protocol is bucketed.
  browseCategory: ProtocolBrowseCategory;
  // Retained for the Phase 2 selectProtocol stub + Practices index until the
  // engine replaces them (Vara_Engine_Contract.md §5 marks this "retired").
  suitableForStates: BrainState[];
  suitableForTimesOfDay: TimeOfDay[]; // empty array means any time

  // Execution
  steps: ProtocolStep[];
}

// ==========================================
// PROTOCOL SESSION (Phase 0 scaffolding — unused until Phase 2)
// ==========================================

// Time window (in minutes) a user has available when selecting a protocol.
export type ProtocolTimeWindow = 2 | 5 | 10 | 20 | 45;

// Outcome of a protocol session. Computed at Firestore write time
// from the state transition (stateBefore → stateAfter), the completion
// flag, and the abandon reason if any.
//
//   shifted       — session completed; state moved toward regulation.
//                   Wired/Foggy → Steady/Clear/Alive, or any "green
//                   zone" transition.
//   partial_shift — session completed; specifically Wired → Foggy.
//                   "The edge is off, fatigue is surfacing" per Core
//                   Loop v2. The classifier rule is strict to this
//                   transition only at v1; Phase 5 Patterns analysis
//                   can expand the rule set if data warrants.
//   maintenance   — session completed; user started in Steady/Clear/
//                   Alive and held the same state. Counts as success
//                   per Core Loop v2 line 209.
//   not_shifted   — session completed; user stayed in the same
//                   negative state (Wired → Wired, Foggy → Foggy) or
//                   moved further from regulation.
//   abandoned     — session ended by user choice. abandonReason is
//                   'user_exit' or 'force_quit'.
//   failed        — session ended due to a technical failure (the
//                   user didn't choose to leave a working session;
//                   something prevented completion). abandonReason
//                   is 'audio_error'.
//
// Analytics note: abandon-rate metrics should typically filter to
// `outcome === 'abandoned' && abandonReason === 'user_exit'`.
// `force_quit` is an analyst judgment call. `failed` is product
// failure, not user behavior, and should always be excluded.
export type ProtocolSessionOutcome =
  | 'shifted'
  | 'partial_shift'
  | 'maintenance'
  | 'not_shifted'
  | 'abandoned'
  | 'failed'
  // Sub-step 2.5 — browse-launched sessions (Case 4 per Core Loop v2).
  // Browse-launched sessions: stateBefore is null because no state was
  // captured pre-protocol; outcome is 'browse_launched' (not null) so
  // Patterns queries can filter without null-check JOINs on stateBefore.
  | 'browse_launched';

// User-chosen next step after the response screen.
//   try_longer     — user tapped "Try something longer" (not_shifted).
//   rest_later     — user tapped "Rest and come back later" (not_shifted).
//   dismissed      — user tapped Continue (positive paths).
//   auto_dismissed — 4-second timer fired without interaction
//                    (positive paths only). Phase 5 Patterns may care
//                    about the user-tap vs auto-timer distinction.
export type ProtocolNextStep =
  | 'try_longer'
  | 'rest_later'
  | 'dismissed'
  | 'auto_dismissed';

// Why a session ended without natural completion.
//   user_exit   — explicit "End early" affordance.
//   force_quit  — recovered from an AsyncStorage marker on the next
//                 player mount (user hard-killed the app or OS
//                 terminated it mid-session).
//   audio_error — mid-playback audio failure or repeated load failure
//                 the user chose to end on. Pre-playback load failures
//                 are retryable via the transport bar; this reason
//                 only fires when the user taps End early from the
//                 audio-error transport state.
//   null on the summary means the session completed normally.
//
// Analytics note: abandon-rate metrics should typically filter to
// `user_exit` only — `force_quit` is an analyst judgment call (could
// be a stressed user, could be an OS kill while their phone was idle),
// and `audio_error` should always be excluded since it's a product
// failure rather than a user choice.
export type ProtocolAbandonReason =
  | 'user_exit'
  | 'force_quit'
  | 'audio_error';

// Movement modality for protocols whose timer covers multiple
// possible activities. Sub-step 2.7 round 4 (Obs 10) introduced this
// for Light Movement (the brief-movement family) — the user picks
// Walk or Stretch in a pre-timer step so the timer's instruction
// copy reflects the chosen activity. Persisted on the session doc as
// `selectedModality` (optional — only present for protocols that
// surface the picker). See PHASE_NOTES "selectedModality schema".
export type MovementModality = 'walk' | 'stretch';

/**
 * ProtocolSessionSummary
 * Output of the GuidedSessionPlayer on exit (natural completion or
 * abandonment). Captures everything the player can observe; Phase 2
 * enriches with userId, stateAfter (post-recheck), timeWindowSelected,
 * intentPath, etc. to construct the full `ProtocolSession` Firestore
 * record below.
 *
 * Timestamps are ms-since-epoch (Date.now() shape). Phase 2 converts
 * to Firestore Timestamp at write time.
 */
export interface ProtocolSessionSummary {
  protocolId: string;
  // null for browse-launched sessions (Energy hub / Practices) — no
  // pre-protocol state was captured. Real BrainState for check-in and
  // onboarding sessions. Consumers must not render or persist null as a state.
  stateBefore: BrainState | null;
  completed: boolean;
  durationActualSeconds: number;
  stepsCompleted: number;
  totalSteps: number;
  abandonReason: ProtocolAbandonReason | null;
  startedAt: number;
  endedAt: number;
}

/**
 * Protocol Session
 * Full session record capturing state-in, state-out, time window, duration,
 * and outcome. The authoritative data source for the Patterns algorithm
 * starting in Phase 2.
 * Stored in the `protocolSessions` collection.
 */
export interface ProtocolSession {
  userId: string;
  protocolId: string;
  // Browse-launched sessions (Case 4) have stateBefore=null because no
  // pre-protocol check-in was captured. Standard-flow sessions always
  // have a value here. Schema asymmetry with `outcome`: browse-launched
  // sessions also have outcome='browse_launched' so queries don't need
  // null-checks on stateBefore to identify them.
  stateBefore: BrainState | null;
  stateAfter: BrainState | null; // null until re-check completes
  timeWindowSelected: ProtocolTimeWindow;
  durationActualSeconds: number;
  outcome: ProtocolSessionOutcome;
  userChosenNextStep: ProtocolNextStep | null;
  intentPath: IntentPath;
  createdAt: Timestamp;
  completedAt: Timestamp | null;
}

// ==========================================
// DAILY REFLECTION (End-of-Day Check-In)
// ==========================================

export type DailyReflectionValue = 'smooth' | 'okay' | 'hard';

/**
 * Daily Reflection
 * End-of-day difficulty signal captured after all habits completed.
 * Stored in the `dailyReflections` collection.
 */
export interface DailyReflection {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  reflection: DailyReflectionValue;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Daily Wellness Score
 * Calculated daily score with full breakdown
 */
export interface DailyWellnessScore {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format

  // Overall score
  score: number; // 0-100 composite score
  previousScore: number | null; // Yesterday's score for trend (null if no previous)
  trend: 'up' | 'down' | 'stable'; // Compared to yesterday

  // Pillar breakdown
  pillars: {
    foundation: WellnessScorePillar;
    consistency: WellnessScorePillar;
    mind: WellnessScorePillar;
    growth: WellnessScorePillar;
  };

  // Quick insights for the user
  topContributor?: string; // What's helping most
  topDetractor?: string; // What's dragging the score down
  suggestion?: string; // One actionable suggestion

  // Data completeness (for transparency)
  dataCompleteness: number; // 0-100 how much data we have
  missingData: string[] | null; // What data is missing (null if none)

  // Score context
  maxPossibleScore: number; // Max score possible with current data (components with data)
  componentsTracked: number; // How many components have data
  componentsTotal: number; // Total possible components

  // Actionable items to complete the score
  incompleteActions: WellnessIncompleteAction[];

  // Morning check-in data (if submitted)
  morningCheckIn: {
    energyLevel: number;
    mood: number;
  } | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Wellness Score History Entry (for trends/charts)
 */
export interface WellnessScoreHistoryEntry {
  date: string;
  score: number;
  pillars: {
    foundation: number;
    consistency: number;
    mind: number;
    growth: number;
  };
}
