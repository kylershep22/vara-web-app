/**
 * Analytics event schema — the content firewall.
 *
 * THE ONE RULE: events record BEHAVIOR, never CONTENT. What the user did, never
 * what the user wrote. `closeNote`, the floor-commitment text, journal and
 * reflection bodies, and every [Jen] free-text string are permanently out of
 * bounds.
 *
 * That rule is enforced HERE, BY THE TYPE SYSTEM, and not by reviewer
 * discipline. Every event declares an exact payload whose every value is a
 * closed union, a boolean or a number. There is deliberately:
 *
 *   - no open `string` value anywhere in a payload,
 *   - no `[key: string]: unknown` escape hatch,
 *   - no generic `value` / `label` / `name` field,
 *   - no tolerance for unknown keys (see `ExactParams`).
 *
 * A developer who tries to log content gets a tsc error, not a code review
 * comment. The `@ts-expect-error` assertions in
 * `services/firebase/__tests__/analyticsEvents.service.test.ts` are what keep
 * that true: widen anything here and those directives go unused, which fails
 * the build.
 *
 * ADDING AN EVENT: add a key to `AnalyticsEventMap` with an exact payload type,
 * then add the name to `EVENT_NAME_SET` (tsc requires it — the Record type is
 * exhaustive). If a payload field wants to be a `string`, it is either an enum
 * you have not written down yet or it is content. There is no third case.
 *
 * NOT ANONYMOUS: events are owner-scoped and carry `userId`, because the
 * Firestore rules gate them on ownership. See the header of
 * `services/firebase/analyticsEvents.service.ts`.
 */

import type { CapacityTier } from '../protocolEngine';
// Type-only, therefore erased at compile time: this does NOT wire the journey
// derivations into anything that reads the event map at runtime. Imported
// rather than restated as a local union so the two can never drift, which is
// the opposite call from JourneyMigrationSource below - that one is DEFINED
// here because its strings exist only to be recorded, while the two doors are
// an engine concept that happens to be worth recording.
import type { AdvanceDoor } from '../journey/derive';
import type {
  AdjustChoiceId,
  PhaseKey,
  PhaseRead,
  RemoveFamily,
  RemoveTiming,
  ReplacementSlot,
} from './models';

/**
 * The 12 protocol ids, as a closed union.
 *
 * `ProtocolVariant.id` is typed `string`, and a `string` slot in an event payload
 * is precisely the hole this module exists to close. So the id is DERIVED from
 * the outcome/capacity pair rather than read off the protocol object, which
 * buys a 12-member union that arbitrary text cannot satisfy.
 *
 * The derivation mirrors the single place the matrix builds its ids
 * (`protocolEngine/protocolMatrix.ts`, the `protocol()` factory), and
 * `types/__tests__/analyticsEvents.test.ts` pins the two together across all 12
 * cells so they cannot drift apart unnoticed.
 */
export type ProtocolId = `${PhaseKey}-${CapacityTier}`;

/** The protocol id for a pair, typed as the closed union. */
export function protocolIdFor(phase: PhaseKey, capacity: CapacityTier): ProtocolId {
  return `${phase}-${capacity}`;
}

/** How an account was authenticated. A closed set, not a free label. */
export type AuthMethod = 'email' | 'apple' | 'google';

/**
 * Which rung of the journey resolver ladder supplied a migrated destination.
 *
 * A CLOSED UNION, not an open string, for the same reason every other
 * dimension here is closed: this collection is read cold, and a free-text
 * source would drift into three spellings of the same rung within a month.
 */
export type JourneyMigrationSource = 'migration_cycle' | 'migration_active_outcome';

/**
 * Why a write failed. Three buckets, and everything else is `unknown`.
 *
 * THE UNION IS THE ONLY GUARD HERE, and this is the one place that is easy to
 * get wrong. `scrubParams` in the writer keeps any string of 1-64 characters, so
 * a raw Firestore code like `'resource-exhausted'` — or a short `error.message`
 * — would sail straight through the runtime backstop and land in the log. Only
 * the closed type stops it.
 *
 * Which is why `toFailureReason` below LOOKS UP rather than passes through: the
 * value it returns is always one of the three literals written in this file, and
 * is never a string that came from the error. A mapper written as
 * `return isKnown(code) ? code : 'unknown'` would type-check and would still be
 * wrong the day someone widens `isKnown`.
 */
export type FailureReason = 'permission-denied' | 'unavailable' | 'unknown';

/**
 * An unknown thrown value to a failure bucket. Never throws, and never returns
 * anything the caller handed in.
 *
 * A SWITCH, NOT A LOOKUP TABLE. Every value it can return is a literal written
 * on the lines below, so there is no path by which an error's own string becomes
 * the logged value. An object keyed by code would also be shorter and would also
 * be wrong: `{ code: 'constructor' }` would index straight through to
 * `Object.prototype.constructor` and log a function.
 *
 * The two named codes are deliberately the only ones. `permission-denied` means
 * the rules refused the write, which is a bug in the rules or in the caller's
 * ownership. `unavailable` means the device could not reach Firestore, which is
 * the user's train tunnel and not a defect. Everything else is noise until a
 * real failure pattern argues for its own bucket, and adding one is a schema
 * decision made here, not a pass-through.
 */
export function toFailureReason(error: unknown): FailureReason {
  if (typeof error !== 'object' || error === null) return 'unknown';

  switch ((error as { code?: unknown }).code) {
    case 'permission-denied':
      return 'permission-denied';
    case 'unavailable':
      return 'unavailable';
    default:
      return 'unknown';
  }
}

/**
 * `WeeklyRating` AND `ADJUSTMENT_IDS` STOOD HERE and retired together in
 * journey slice 6, with the questions that produced them.
 *
 * `WeeklyRating` was the weekly close's 1-to-5 scale (spec 8.2). `ADJUSTMENT_IDS`
 * was the redeclared twin of `screens/weekly/copy.ts`'s `ADJUSTMENT_KEYS`,
 * pinned to it by `types/__tests__/analyticsEvents.test.ts` so the two could not
 * drift; both sides and the pinning test are gone, because there is no longer a
 * list to keep in step.
 *
 * THE "ALREADY PERMANENT" ARGUMENT FOR THE IDS EXPIRED BEFORE THEY DID, and the
 * order matters. It held while `adjustmentSelected` was stored, since a rename
 * would have orphaned rows. Slice 3b stopped that write (roadmap section 3.4),
 * so no row written since carries one and the ids were free to delete rather
 * than merely free to leave alone. Pre-3b rows keep their stored strings,
 * unread; `WeeklyCycle.adjustmentSelected` stays optional on the model for them.
 *
 * The reasoning that put them here is still live for `ProtocolId` above:
 * redeclare rather than import when a `types/` module would otherwise reach
 * into `screens/`, then pin the two with a test.
 */

/**
 * Where the weekly entry guard sent the user (spec 6.1, 10.1).
 *
 * Redeclared for the same reason as the adjustment ids: `WeeklyEntryTarget`
 * lives in `screens/weekly/weeklyEntry.ts`. Pinned to it by a compile-time
 * mutual-assignability check in the schema test, so adding a fourth target
 * without adding it here fails the build.
 */
export const WEEKLY_ENTRY_ROUTES = ['floor', 'rollover', 'today'] as const;

export type WeeklyEntryRoute = (typeof WEEKLY_ENTRY_ROUTES)[number];

/**
 * Every event and its exact payload.
 *
 * EVERY NAME HERE HAS A WIRED CALLER. That invariant is the reason the map stays
 * honest about coverage, and the name-list test enforces the count while the
 * per-screen wiring tests enforce the callers.
 *
 * WHAT IS DELIBERATELY ABSENT, each with a reason:
 *   - anything about the in-week capacity re-set, in either direction. That
 *     control is retired (roadmap 3b-i): capacity is answered per day now, so
 *     there is no weekly tier to move, no transition to log and no write to
 *     fail. Its `reset_failed` event went with it.
 *   - anything about continuity. The count is retired outright (roadmap
 *     section 9 R4): it was a run of unbroken weeks on Today, and a visible
 *     count of consistent weeks is functionally a streak whatever it is called.
 *     `continuityBeforeClose` rode as a field on `weekly_close` until slice 6
 *     and went with it. The stored `floorMet` booleans it was derived from are
 *     still on pre-slice-6 cycles, so an aggregation job could still compute it
 *     COLD if there is ever a reason to; nothing in the app computes or shows
 *     it, and no replacement Today metric may be added.
 *   - `screen_view`. High volume by an order of magnitude, and route names are
 *     open strings that would need their own closed union. Its own slice.
 */
/** The two advancement doors, minus the not-due case a payload cannot carry. */
type AdvanceDoorName = Exclude<AdvanceDoor, null>;

export interface AnalyticsEventMap {
  /**
   * A week was closed: the weekly reset was answered and saved.
   *
   * THE NAME IS DELIBERATELY NOT `weekly_reset`, though the screen is called
   * the reset now. Renaming splits the historical series at an arbitrary date,
   * nobody owns the migration, and it buys register consistency in a place no
   * user ever sees. `weekly_close`, `weekly_close_failed` and
   * `weekly_close_entry` keep their names permanently. Roadmap section 5 row 3
   * anticipated the rename; this is the decision not to take it.
   *
   * `closeNote` IS NOT HERE AND MAY NEVER BE. It is the one free-text answer in
   * the reset (spec 8.3), it is in scope two lines from the call site, and it is
   * short enough that the writer's length backstop would not catch it. This
   * declaration is the whole guard.
   *
   * FOUR FIELDS LEFT IN SLICE 6: the three ratings and the adjustment, with the
   * questions that produced them, plus `floorMet` and `continuityBeforeClose`
   * with continuity. What remains is the felt read and nothing else, which is
   * the whole of what the screen now asks.
   *
   * NULLABLE, NOT OPTIONAL, and the distinction is the house convention rather
   * than a preference: see `journey_remove_captured` below, whose `family` and
   * `timing` do the same. The keys are always written; null means the reset was
   * taken with no phase resolved, so there was no destination to ask the
   * question about and no phase to attribute an answer to. That is a real path
   * (JOURNEY_IA off, and any resolve that fell back to legacy), not an error,
   * and reading it as "answered nothing" rather than "did not close" matters.
   *
   * Both are closed unions the user selected from or the app resolved, never
   * derived content, which is why they are safe to record.
   */
  weekly_close: {
    phaseRead: PhaseRead | null;
    phaseKeyAtRead: PhaseKey | null;
  };
  /**
   * A close was answered in full and then failed to save.
   *
   * Worth its own event because the write is a single `updateDoc`: a rejection
   * means nothing landed and the user lost their answers. Nothing else records
   * that today — the screen's `logger.error` is `__DEV__`-gated, so on-device
   * failures currently leave no trace anywhere.
   */
  weekly_close_failed: { reason: FailureReason };
  /*
   * RETIRED: `reset_failed`. It recorded a failed in-week capacity re-set, and
   * that control no longer exists (roadmap 3b-i) — capacity is answered per day
   * now, so there is no weekly tier to move and no write to fail. Removed
   * rather than left declared: an event nothing can emit reads as coverage the
   * product does not have.
   */
  /**
   * A floor commitment was captured (spec 10.1).
   *
   * EMPTY ON PURPOSE. The only thing this screen produces is the user's own
   * words, and there is no bucket, length or shape of it that is a decision
   * input. The fact that it happened is the whole event.
   */
  floor_set: Record<string, never>;
  /**
   * The entry guard resolved a route.
   *
   * All three targets are logged, including `floor`. Note that a first-run user
   * legitimately emits `floor` and then `open` in one continuous flow, because
   * the floor screen replaces back through the guard — that is the funnel, not
   * duplication, and an aggregation that reads the route distribution naively
   * will over-count `floor`.
   */
  weekly_entry: { route: WeeklyEntryRoute };
  /**
   * The close entry on Today was tapped.
   *
   * FIRE-ON-TAP, not fire-after-success: this is the intent half of the pair
   * whose other half is `weekly_close` / `weekly_close_failed`. Tap-with-no-close
   * is the abandon signal, which is the only reason the event exists; it is
   * close to worthless read on its own.
   */
  weekly_close_entry: Record<string, never>;
  /**
   * A journeyStates document was created for a user who did not have one
   * (journey slice 2, the migration branch).
   *
   * `source` IS THE WHOLE POINT. It records WHICH rung of the resolver ladder
   * supplied the destination, because the two are not equally trustworthy: a
   * weekly cycle is a choice the user made and re-made every week, while
   * activeOutcome is a single write from the onboarding terminal that nothing
   * has read since. If the migration ever looks wrong, the first question is
   * which rung produced it, and this is the only place that will say.
   *
   * NO uid AND NO destination IN THE PAYLOAD. The writer stamps the userId
   * itself, and the destination is already on the document this event is about.
   *
   * ONE PER USER, EVER. A second one for the same user means the ladder ran
   * again after a document already existed, which would be a resolver bug.
   */
  journey_state_created: { source: JourneyMigrationSource };
  /**
   * The Remove capture completed (slice 3c-i).
   *
   * THE USER'S OWN WORDS ARE NOT HERE AND MAY NEVER BE. `chipId` carries
   * 'free_text' when they typed instead of tapping, which records THAT they
   * used the free-text path without recording what they said. This declaration
   * is the guard: there is no field for the text, so there is nothing for a
   * careless call site to fill.
   *
   * `family` and `timing` are closed unions the user selected from, not derived
   * content, which is why they are safe to record.
   */
  journey_remove_captured: {
    family: RemoveFamily | null;
    /** A curated chip id, or the literal 'free_text'. NEVER the text. */
    chipId: string;
    timing: RemoveTiming | null;
  };
  /** The entry card was dismissed with "I'll name it later". */
  journey_remove_capture_dismissed: Record<string, never>;
  /**
   * A curated replacement was chosen for a named time slot (slice 3c-ii).
   *
   * `optionId` IS A CURATED ID FROM REPLACEMENT_MENUS, never a label and never
   * text. `slot` is a closed union. The screen that fires this is unreachable
   * from the free-text path, so there is no user-authored string in scope here
   * to leak; the type is what keeps it that way if the routing ever changes.
   */
  journey_remove_replacement_chosen: {
    optionId: string;
    slot: ReplacementSlot;
  };
  /**
   * The advancement offer occupied Today for one calendar day (slice 7a).
   *
   * ONE PER CALENDAR DAY AT MOST, because the day gate that bounds the write
   * bounds this too: both happen in `recordAdvanceExposure`'s call site, behind
   * `shouldRecordExposure`. So the row count IS the exposure count, and a
   * user with four of these in one phase is a bug report rather than a heavy
   * user.
   *
   * "OCCUPIED TODAY" MEANS THE CARD DREW, AND IT ONLY MEANS THAT FROM SLICE 7d.
   * This sentence described the intent from the day it was written and did not
   * describe the code: until 7d the gate fired on the offer being ELIGIBLE for
   * Today's one journey-action slot, and capture and C2 both outrank it, so
   * rows were emitted for a card the user never saw. ROWS WRITTEN BEFORE 7d ARE
   * NOT COMPARABLE WITH ROWS WRITTEN AFTER IT, and any accept-rate cut that
   * crosses the merge is measuring two different denominators.
   *
   * `door` IS WHICH THRESHOLD OPENED IT, and it is the reason this event is
   * worth having. 'consistency' and 'ceiling' catch opposite users - one doing
   * the work, one stuck - and the accept rate of the two is the first real
   * evidence about whether the ceiling is serving anyone or just interrupting
   * them. Both values are closed unions the engine produced, not content.
   *
   * NO COUNT IN THE PAYLOAD. Not the exposure number, not consistent days, not
   * days in phase. The firewall's rule is about user content, and these would
   * pass it, but section 8's counter ban is about what the product is FOR and
   * a per-user tally reconstructable from the log is the thing it bans wearing
   * a warehouse. The ordinal is recoverable by counting rows if it is ever
   * genuinely needed.
   *
   * `definition_version` MAKES THE PARAGRAPH ABOVE MACHINE-READABLE, and that
   * is its whole job (slice 7h, Jen's 2026-09-12 decision item 6). The caveat
   * about 7d was written in prose here and in the roadmap, where a person
   * cutting this data will not meet it:
   *
   *   - **v1 = the offer became ELIGIBLE.** Rows with NO `definition_version`
   *     field at all. Written before 2026-09-11.
   *   - **v2 = the offer was RENDERED to the user.** `definition_version: 2`.
   *     Begins 2026-09-11, slice 7d's merge (`2807511`), which moved the gate
   *     onto the occupied slot.
   *
   * **NO BACKFILL.** Pre-7d rows keep no version field and that absence IS the
   * v1 marker; inventing one for them would assert a review nobody did. An
   * accept-rate cut must therefore filter on the version or state that it is
   * mixing two denominators - which is the thing this field exists to stop
   * happening silently.
   *
   * TYPED AS THE LITERAL `2`, NOT `number`. The firewall's rule is closed
   * unions with no open primitives, the same reason `door` is one, and it makes
   * a future v3 a deliberate type edit that breaks the call site rather than a
   * value that drifts in at runtime.
   */
  journey_advance_offered: { door: AdvanceDoorName; definition_version: 2 };
  /**
   * The user opened the preview and committed. The phase changed.
   *
   * FIRED FROM THE COMMIT, NOT FROM THE CARD. "See what's next" mutates
   * nothing and fires nothing; this event means `advancePhase` succeeded, so
   * accepted-over-offered is a real conversion rate and not a click rate.
   *
   * NO `door` HERE, AND ITS ABSENCE IS DELIBERATE. The commit happens on the
   * phase page, which knows the user's stored state but not `consistentDays`,
   * so it cannot say which threshold opened the offer without a dailyLogs read
   * it has never done. Passing the door through navigation would have supplied
   * it from Today and left it empty on the map path, and defaulting it would
   * have invented an answer. The door is already on the `offered` row, these
   * rows are uid-keyed and time-ordered, and joining an accept to the most
   * recent offer recovers it exactly. Recording a value this surface cannot
   * know would be worse than recording none.
   */
  journey_advance_accepted: Record<string, never>;
  /**
   * The user declined. Either "Keep going here" on the card, or "Not yet" on
   * the preview page.
   *
   * `from` SEPARATES THE TWO, and the distinction is the point: declining
   * without looking and declining after looking are different answers about the
   * offer, and collapsing them would hide which one the copy is failing.
   *
   * NO `door`, for the same reason as `accepted` above: only one of the two
   * origins can know it, so neither reports it.
   */
  journey_advance_declined: { from: 'card' | 'preview' };
  /**
   * The adjustment offer occupied Today (slice 7b, roadmap section 9 R5).
   *
   * BARE, AND THE ABSENCES ARE EACH A DECISION. No door, because unlike
   * advancement there is only one way in: two consecutive not_moving reads.
   * No count of which offer this is, because that is the cap's bookkeeping and
   * putting it here would make a number the product refuses to show a number
   * the product reports on. No phase either: `journey_state_created` and the
   * advance events do not carry one, and the phase is recoverable from the
   * user's own journey document for any analysis that needs it.
   *
   * "OCCUPIED TODAY" MEANS THE C2 CARD DREW, from slice 7d. It fired on
   * ELIGIBILITY before that, and capture outranks adjust, so a user in `remove`
   * with no capture and two not_moving reads emitted this without C2 ever
   * appearing. Same caveat as `journey_advance_offered`: rows do not compare
   * across the 7d merge. It shares its gate with the `adjustOfferedAt` stamp,
   * so the event count and the phase page's door are the same fact.
   *
   * `definition_version` CARRIES THAT CAVEAT IN THE DATA (slice 7h). Identical
   * meaning to the twin above, and deliberately the same field name and the
   * same values on both, because the two events share the defect, the fix and
   * the merge that drew the line:
   *
   *   - **v1 = the offer became ELIGIBLE.** No `definition_version` field.
   *   - **v2 = the offer was RENDERED to the user.** Begins 2026-09-11, 7d's
   *     merge. **No backfill.**
   *
   * THE EVENT IS NO LONGER BARE, AND THE "BARE, AND THE ABSENCES ARE EACH A
   * DECISION" PARAGRAPH ABOVE STILL HOLDS. Every absence it defends is an
   * absence of something about the USER - no door, no offer ordinal, no phase.
   * `definition_version` describes the EVENT'S OWN DEFINITION and says nothing
   * about the person it was written for, so it is not the counter that
   * paragraph bans and not a dimension that paragraph refused. It is metadata
   * about the schema, sitting in the only place a reader of the data will find
   * it.
   */
  journey_adjust_offered: { definition_version: 2 };
  /**
   * The user declined the adjustment offer with "Keep going for now".
   *
   * ONE ORIGIN, SO NO `from` DIMENSION, and the asymmetry with
   * `journey_advance_declined` is real rather than an oversight. Advancement
   * can be declined from the card or from the preview page, and which one
   * matters because declining after looking is a different answer. Adjustment
   * has exactly one decline control, on the card: the phase page's door offers
   * the alternatives and has nothing to decline, because leaving a page is not
   * an answer and must not be recorded as one.
   */
  journey_adjust_declined: Record<string, never>;
  /**
   * The user chose one of the in-phase alternatives.
   *
   * `optionId` IS A CURATED ID FROM A CLOSED UNION OF TWELVE, never a label and
   * never the user's own words. That is what makes it safe under the content
   * firewall, and the type is the enforcement rather than a convention.
   *
   * `from` SEPARATES THE TWO DOORS and this one earns its dimension where the
   * decline above does not. 'card' is a user answering a proactive offer;
   * 'phase_page' is a user who went looking, which includes every user past the
   * two-offer cap. Whether the door gets used after Vara stops knocking is the
   * question R5's cap is a bet about, and this field is the only place it can
   * be answered.
   *
   * IT RECORDS A CHOICE, NOT AN OUTCOME. As of 7b nothing consumes the choice
   * (slice 7c does), so this event says the user asked for a change and not
   * that one was made.
   */
  journey_adjust_chosen: {
    optionId: AdjustChoiceId;
    from: 'card' | 'phase_page';
  };
  /**
   * The crisis pre-check did not pass and the support screen was shown.
   *
   * DELIBERATELY BARE. No text, no category, no length, no timing, nothing about
   * WHAT was disclosed. The only fact recorded is that the screen appeared at
   * all, which is what tells us whether the pre-check is firing in the field.
   *
   * THIS IS NOT AN ANONYMOUS COUNT, and an earlier version of this comment said
   * it was. `logEvent` writes `userId` on every row it creates
   * (analyticsEvents.service.ts), so the event is uid-keyed like every other one
   * and already says WHO reached the support screen. The empty payload is what
   * keeps it from also saying what they wrote. Adding ANY dimension here would
   * turn "this person hit the pre-check" into a record of who disclosed what,
   * which is a materially worse thing to hold.
   */
  safety_precheck_shown: Record<string, never>;
  /** An account was created. */
  sign_up: { method: AuthMethod };
  /** An existing account signed in. */
  login: { method: AuthMethod };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

/**
 * Exhaustive by type: `Record<AnalyticsEventName, true>` means adding an event
 * to the map above without adding it here is a tsc error.
 */
const EVENT_NAME_SET: Record<AnalyticsEventName, true> = {
  journey_advance_offered: true,
  journey_advance_accepted: true,
  journey_advance_declined: true,
  journey_adjust_offered: true,
  journey_adjust_declined: true,
  journey_adjust_chosen: true,
  journey_remove_captured: true,
  journey_remove_capture_dismissed: true,
  journey_remove_replacement_chosen: true,
  journey_state_created: true,
  safety_precheck_shown: true,
  weekly_close: true,
  weekly_close_failed: true,
  floor_set: true,
  weekly_entry: true,
  weekly_close_entry: true,
  sign_up: true,
  login: true,
};

/** Every declared event name. Derived, so it cannot fall out of sync. */
export const ANALYTICS_EVENT_NAMES = Object.keys(EVENT_NAME_SET) as readonly AnalyticsEventName[];

/** The exact payload for one event. */
export type AnalyticsParams<N extends AnalyticsEventName> = AnalyticsEventMap[N];

/**
 * Reject unknown keys, including on a payload passed as a variable.
 *
 * TypeScript's excess-property check only fires on fresh object literals, so
 * `const p = { ...safe, closeNote }; logEvent(uid, 'weekly_open', p)` would
 * otherwise slip straight through: an object with extra properties is
 * structurally assignable. Mapping every key outside the declared shape to
 * `never` closes that, which matters because building the payload as a variable
 * is exactly what a developer does when the call site gets busy.
 */
export type ExactParams<P, Shape> = P & {
  [K in Exclude<keyof P, keyof Shape>]: never;
};
