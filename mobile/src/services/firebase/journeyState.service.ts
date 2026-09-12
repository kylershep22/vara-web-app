/**
 * journeyStates - where each user is in their journey (Journey Architecture
 * Roadmap v3, Section 3.1).
 *
 * ONE DOCUMENT PER USER, AND THE DOCUMENT ID IS THE UID. That is why every
 * helper here takes a uid and none of them takes a document ID: there is
 * nothing to look up. The rules gate on the ID path rather than on a field.
 *
 * NO DERIVABLE COUNTER IS STORED. Consistent days and calendar days are derived
 * at read time by src/journey/derive.ts from dailyLogs and `enteredAt`. If a
 * future slice wants to store either of those, that is the wrong fix; see the
 * JourneyState comment in types/models.ts.
 *
 * THIS SENTENCE USED TO READ "it never writes a tally" AND SLICE 7a MADE THAT
 * FALSE. `recordAdvanceExposure` below increments `advanceExposures`. The rule
 * is narrower than the old wording and the field carries the full argument at
 * its declaration in types/models.ts: section 8 bans counters a USER READS, and
 * this model bans counters that DUPLICATE something derivable. An exposure
 * count is neither. It is never rendered, and nothing else in the system
 * records that a card was on screen, so there is no second copy for it to drift
 * from. Read the field comment before adding a second tally on its precedent;
 * the precedent is narrow on purpose.
 *
 * PHASE ORDER COMES FROM PHASE_ORDER, never from the PhaseKey union's
 * declaration order.
 *
 * NOTHING READS OR WRITES THIS FROM A SCREEN YET. Slice 1 lands the model, the
 * service and the derivations only; the wiring is slice 2.
 *
 * Uses requireDb() so the Firestore handle is narrowed to non-null, keeping
 * this module clear of the "Firestore | null is not assignable" errors the raw
 * `db` import produces elsewhere in this directory.
 */
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { requireDb } from './ensureDb';
import { PHASE_ORDER } from '../../constants/journey';
import { hasRenderableKeys, uidDigest } from '../../journey/journeyDocGuard';
import { logger } from '../../utils/logger';
import type {
  AdjustChoiceId,
  DestinationKey,
  JourneyState,
  PhaseExitReason,
  PhaseHistoryEntry,
  PhaseKey,
  RemoveFamily,
  RemoveTiming,
  ReplacementSlot,
} from '../../types/models';

const JOURNEY_STATES = 'journeyStates';

/** The fields a caller supplies when a user starts their journey. */
export interface CreateJourneyStateInput {
  destination: DestinationKey;
  /** Always 'remove' today; typed as PhaseKey so a later slice can seed. */
  phaseKey: PhaseKey;
}

/**
 * Every piece of offer bookkeeping, cleared.
 *
 * SPELLED OUT IN ONE PLACE because every phase change has to reset all of it
 * and forgetting one is silent: a stale `advanceDeclinedAt` would demote the
 * next phase's advance offer to the journey forever, and nothing would log that
 * it had.
 *
 * SPREAD AT EXACTLY FOUR SITES - createJourneyState, advancePhase, skipToPhase
 * and stepBackToPhase - which is why adding a field here is the whole of the
 * work rather than the first quarter of it. Do not inline these values at a
 * call site; the next field added would then reset in three places out of four.
 *
 * THE THREE EXPOSURE FIELDS JOINED IN SLICE 7a and are not optional additions.
 * A count or a date surviving a phase transition would spend the incoming
 * phase's exposure budget, or fire its seven-day cap, before its offer had ever
 * been shown once (roadmap section 9 R3).
 *
 * THE THREE ADJUST FIELDS JOINED IN SLICE 7b, on exactly the same terms and for
 * three separate failures. A surviving `adjustDeclines` at the cap would
 * silence the incoming phase's offer before it had ever been made (section 9
 * R5). A surviving `adjustChosenAt` would hold the re-arm floor above the new
 * phase's first weeks, so no read in them could ever count. A surviving
 * `adjustChoice` would attach a choice made about one stretch to a different
 * one, which is the same mis-attribution `phaseKeyAtRead` exists to prevent on
 * the weekly side.
 */
const CLEARED_OFFERS = {
  advanceOfferedAt: null,
  advanceDeclinedAt: null,
  adjustOfferedAt: null,
  adjustDeclinedAt: null,
  advanceExposures: 0,
  advanceFirstOfferedOn: null,
  advanceLastExposedOn: null,
  adjustDeclines: 0,
  adjustChoice: null,
  adjustChosenAt: null,
} as const;

/** One user's journey state, or null before they have started one. */
export async function getJourneyState(userId: string): Promise<JourneyState | null> {
  const snap = await getDoc(doc(requireDb(), JOURNEY_STATES, userId));
  if (!snap.exists()) return null;
  // `id` comes from the argument: the document ID is the authority on
  // ownership, so a stored field that ever disagreed still reads back correctly.
  return { ...(snap.data() as Omit<JourneyState, 'id'>), id: userId };
}

/**
 * One user's journey state, or null if it is absent OR unrenderable (slice 7f).
 *
 * THE READ BOUNDARY FOR EVERY SURFACE THAT IS NOT TODAY. `resolveJourney` has
 * carried this check since slice 7e, which covered Home; the journey map calls
 * `getJourneyState` directly and never passes through the resolver, so a
 * document with a `destination` outside its union reached `PhasePath`, was used
 * to index `PHASE_DISPLAY` during a render, and threw. The app has ONE
 * ErrorBoundary and it sits above the navigator (App.tsx:114), so that throw
 * costs the whole app and not the tab.
 *
 * NULL FOR BOTH CASES, AND THAT IS WHY IT NEEDS NO NEW UI. Absent and
 * unrenderable are different facts, but every caller already has a correct,
 * designed answer for null: the map draws its Start here row and its
 * destination cards and simply omits the path (JourneyMapScreen's own comment
 * says the explainer is a sibling of the path for exactly this reason). A
 * second return shape would have made every caller learn a state it has no
 * different response to.
 *
 * IT WARNS ONCE AND DOES NOT REPAIR. A read path that wrote would erase the
 * evidence of a data problem something upstream produced, and would do it from
 * a screen the user can open at any time. The digest names which user without
 * naming the user.
 *
 * SEPARATE FUNCTION RATHER THAN A GUARD INSIDE `getJourneyState`. The writers
 * in this file read the document to mutate it - `advancePhase` reads it to
 * compute the next phase, `stepBackToPhase` to close a history entry - and a
 * read that returned null for an unrenderable row would turn those into silent
 * no-ops on exactly the documents that need fixing. Rendering is the only
 * concern that wants this check, so only the rendering callers get it.
 */
export async function getRenderableJourneyState(
  userId: string
): Promise<JourneyState | null> {
  const state = await getJourneyState(userId);
  if (!state) return null;
  if (!hasRenderableKeys(state)) {
    logger.warn(
      '[journeyState] document has an unrecognised phaseKey or destination, treating it as absent:',
      uidDigest(userId)
    );
    return null;
  }
  return state;
}

/**
 * Start a user's journey.
 *
 * setDoc WITHOUT merge, deliberately: creating a journey state is starting
 * over, and a merge would leave a previous run's history and skipped list
 * attached to a fresh start.
 */
export async function createJourneyState(
  userId: string,
  input: CreateJourneyStateInput
): Promise<void> {
  await setDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    userId,
    destination: input.destination,
    phaseKey: input.phaseKey,
    enteredAt: serverTimestamp(),
    history: [],
    skipped: [],
    ...CLEARED_OFFERS,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Close the phase in progress into a history entry.
 *
 * `exitedAt` is a CLIENT-SIDE Date, not serverTimestamp(). serverTimestamp()
 * is a sentinel the server resolves on write, and Firestore refuses a sentinel
 * inside an array element, so a history entry cannot carry one. The document's
 * own `updatedAt` keeps the authoritative server time for the write itself.
 */
function closeEntry(
  phaseKey: PhaseKey,
  enteredAt: JourneyState['enteredAt'],
  exitReason: PhaseExitReason
): PhaseHistoryEntry {
  return {
    phaseKey,
    enteredAt,
    exitedAt: new Date() as unknown as JourneyState['enteredAt'],
    exitReason,
  };
}

/**
 * Move to the next phase in PHASE_ORDER.
 *
 * NO-OP AT THE LAST PHASE, and silently so: 'refocus' is the end of the
 * sequence and there is nothing after it to advance into. A throw here would
 * turn the end of the journey into an error every caller has to special-case.
 *
 * Also a no-op when no state exists. Advancing a journey that was never
 * started is a caller bug, but creating one here would have to guess a
 * destination.
 */
export async function advancePhase(userId: string): Promise<void> {
  const state = await getJourneyState(userId);
  if (!state) return;

  const idx = PHASE_ORDER.indexOf(state.phaseKey);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return;

  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    phaseKey: PHASE_ORDER[idx + 1],
    enteredAt: serverTimestamp(),
    history: [...state.history, closeEntry(state.phaseKey, state.enteredAt, 'advanced')],
    ...CLEARED_OFFERS,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Jump forward to `target`, marking everything jumped over as skipped.
 *
 * THE PHASE IN PROGRESS IS SKIPPED TOO, not advanced: the user left it without
 * finishing it, and calling that an advance would overstate what happened. Its
 * history entry and every intermediate one carry exitReason 'skipped'.
 *
 * The intermediate phases get history entries with a zero-length span
 * (enteredAt === exitedAt). They were never actually entered, and the entry
 * records that they were passed over rather than pretending they were lived
 * through.
 *
 * Refuses to go backwards or nowhere. stepBackToPhase is the other direction.
 */
export async function skipToPhase(userId: string, target: PhaseKey): Promise<void> {
  const state = await getJourneyState(userId);
  if (!state) return;

  const from = PHASE_ORDER.indexOf(state.phaseKey);
  const to = PHASE_ORDER.indexOf(target);
  if (from === -1 || to === -1 || to <= from) return;

  const now = new Date() as unknown as JourneyState['enteredAt'];
  const closed: PhaseHistoryEntry[] = [
    closeEntry(state.phaseKey, state.enteredAt, 'skipped'),
  ];
  const skipped: PhaseKey[] = [state.phaseKey];
  for (let i = from + 1; i < to; i += 1) {
    closed.push({
      phaseKey: PHASE_ORDER[i],
      enteredAt: now,
      exitedAt: now,
      exitReason: 'skipped',
    });
    skipped.push(PHASE_ORDER[i]);
  }

  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    phaseKey: target,
    enteredAt: serverTimestamp(),
    history: [...state.history, ...closed],
    skipped: [...state.skipped, ...skipped],
    ...CLEARED_OFFERS,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Go back to an earlier phase, because the journey is not working.
 *
 * The phase being left gets exitReason 'adjusted_back'. NOTHING IS MARKED
 * SKIPPED: stepping back is not skipping, and the phases between here and the
 * target were genuinely lived through and already carry their own history.
 *
 * Refuses to move forwards or nowhere. skipToPhase is the other direction.
 */
export async function stepBackToPhase(userId: string, target: PhaseKey): Promise<void> {
  const state = await getJourneyState(userId);
  if (!state) return;

  const from = PHASE_ORDER.indexOf(state.phaseKey);
  const to = PHASE_ORDER.indexOf(target);
  if (from === -1 || to === -1 || to >= from) return;

  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    phaseKey: target,
    enteredAt: serverTimestamp(),
    history: [
      ...state.history,
      closeEntry(state.phaseKey, state.enteredAt, 'adjusted_back'),
    ],
    ...CLEARED_OFFERS,
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Offer bookkeeping
//
// One setter per event rather than one parameterised helper. The field names
// are the API: a recordOffer(kind) would push the choice into a string and
// lose the compile-time check that the caller meant advance rather than adjust.
//
// THE ADVANCE SIDE IS NO LONGER ONE FIELD PER SETTER (slice 7a). Recording an
// exposure moves four fields that only mean anything together - the count, the
// two date anchors and the last-shown timestamp - so splitting them into four
// setters would let a caller record half an exposure. What the rule above
// forbids is parameterising over KIND, and that still holds: nothing here takes
// 'advance' | 'adjust' as an argument.
//
// NOR IS THE ADJUST SIDE, FROM SLICE 7b. `recordAdjustDeclined` moves the floor
// and the cap count together for the same reason: they are two halves of one
// event, and a caller able to write half of a decline could re-arm the counter
// without ever capping it.
// ---------------------------------------------------------------------------

/**
 * The advance offer occupied Today for one calendar day (slice 7a, R3).
 *
 * REPLACES `recordAdvanceOffered`, WHICH IS DELETED RATHER THAN LEFT BESIDE IT.
 * That helper wrote `advanceOfferedAt` alone, had no caller in its whole life,
 * and is a strict subset of this one. Shipping both would leave two writers of
 * the same field where only one maintains the exposure bookkeeping, and the
 * next person would have a fifty-fifty chance of picking the one that silently
 * fails to count.
 *
 * THE CALLER MUST HAVE PASSED THE DAY GATE FIRST. This function does not check
 * it, deliberately: the gate is a pure predicate over state the caller already
 * holds (`shouldRecordExposure` in journey/offerPlacement.ts), and duplicating
 * it here would put the rule in two places and invite a caller to skip its own.
 * A second call on the same day writes the same date back and DOUBLE-COUNTS the
 * exposure, so the gate is not decorative.
 *
 * `advanceFirstOfferedOn` IS WRITTEN IDEMPOTENTLY, not conditionally. The
 * caller passes the value it already has and this writes `?? todayIso`, so the
 * second and third exposures rewrite the same date rather than needing a
 * read-modify-write or a branch here.
 *
 * `increment(1)` IS SAFE HERE and the featureDiscovery caveat does not apply.
 * That module's warning is about `increment` against a document that may not
 * exist yet, where the sentinel resets a counter to 1. A user cannot be offered
 * advancement without a journeyStates document, so this always lands on an
 * existing row.
 */
export async function recordAdvanceExposure(
  userId: string,
  todayIso: string,
  firstOfferedOn: string | null
): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    advanceOfferedAt: serverTimestamp(),
    advanceExposures: increment(1),
    advanceFirstOfferedOn: firstOfferedOn ?? todayIso,
    advanceLastExposedOn: todayIso,
    updatedAt: serverTimestamp(),
  });
}

/** The user said not yet to advancing. Demotes the offer to the journey. */
export async function recordAdvanceDeclined(userId: string): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    advanceDeclinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * The adjustment offer occupied Today (slice 7b, R5).
 *
 * IT IS WHAT OPENS THE PHASE PAGE'S DOOR, and that is the field's real job.
 * `adjustOfferedAt` is non-null if and only if the offer has been made in this
 * phase at least once, which is exactly the condition `JourneyPhaseScreen`
 * reads to decide whether "Try a different approach" belongs on the page. The
 * same relationship `advanceOfferedAt` has with the preview page.
 *
 * WRITTEN ONCE PER PHASE IN PRACTICE, AND HARMLESS TO REPEAT. The caller writes
 * it on the first render that places the offer on Today, so a second write
 * merely slides a timestamp nothing measures an interval from. NO DAY GATE IS
 * NEEDED HERE and none should be added: unlike the advance side there is no
 * exposure budget to overspend (see `placeAdjustOffer`), so there is nothing a
 * repeat write can consume.
 */
export async function recordAdjustOffered(userId: string): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    adjustOfferedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * The user said not yet to adjusting (slice 7b, R5).
 *
 * IT NO LONGER SUPPRESSES, AND THAT SENTENCE REPLACES THE ONE THIS COMMENT USED
 * TO CARRY. "Suppresses the offer for this phase" was true while
 * `deriveAdjustDue` short-circuited on the timestamp, and R5 is the decision
 * that ended it: after a decline the counter RE-ARMS, and two further
 * consecutive not_moving reads offer again. A decline answers this week, not
 * the practice.
 *
 * SO THE TIMESTAMP IS NOW A FLOOR. It is converted to an ISO date in
 * `PhaseContext` and only reads from weeks starting strictly after it count.
 * The full argument, including why the floor compares against `weekStart` and
 * not `weekEnd`, is at `AdjustDueInput.armedFromIso` in journey/derive.ts.
 *
 * TWO FIELDS, ONE EVENT, AND THEY MUST MOVE TOGETHER. The floor re-arms the
 * counter and the count spends the cap; a write that moved one without the
 * other would either re-arm without ever capping or cap without re-arming.
 * That is why this is one setter and not two, and it is the same reasoning
 * slice 7a applied to the four exposure fields.
 *
 * `increment(1)` IS SAFE HERE. A user cannot decline an offer they were never
 * made, so this always lands on an existing journeyStates document, and the
 * featureDiscovery caveat about incrementing into absence does not apply. A
 * document written before this slice has no `adjustDeclines` at all; Firestore
 * treats the absent field as zero and the first decline writes 1, which is the
 * correct answer for a user whose first decline this is.
 */
export async function recordAdjustDeclined(userId: string): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    adjustDeclinedAt: serverTimestamp(),
    adjustDeclines: increment(1),
    updatedAt: serverTimestamp(),
  });
}

/**
 * The user chose one of the in-phase alternatives (slice 7b).
 *
 * RECORDED, NOT HONOURED, AS OF SLICE 7b. Nothing in the protocol serving path
 * reads `adjustChoice`; consuming it is slice 7c's entire scope. This is
 * written down here as well as at the model field because the gap is invisible
 * from the call site: the screen shows a confirmation, the write succeeds, and
 * nothing about the day changes. The confirmation is worded for exactly that
 * state ("We'll work it this way for now"), and it must not be rewritten into a
 * claim that something has already changed until 7c lands.
 *
 * IT ENDS THE PROACTIVE WINDOW, which is the one behaviour the choice DOES have
 * today. `adjustChosenAt` joins the re-arm floor, so acting drops the offer off
 * Today on the next resolve exactly as declining does. Acting does NOT spend
 * the two-offer cap: `adjustDeclines` is untouched here, because R5 caps offers
 * the user refused and a user who acted got what the offer was for.
 *
 * A CURATED ID, AND THE TYPE IS THE ENFORCEMENT. `AdjustChoiceId` is a closed
 * union of twelve, so no caller can pass a label, a free-text string, or an id
 * from a phase the user is not in. The per-phase grouping lives in
 * `ADJUST_ALTERNATIVES`; this function does not re-check it, because the only
 * caller renders its options from that map.
 *
 * updateDoc, not setDoc(merge): a choice only ever follows an offer, which only
 * ever happens for a user who already has a journey state.
 */
export async function recordAdjustChoice(
  userId: string,
  choice: AdjustChoiceId
): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    adjustChoice: choice,
    adjustChosenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * The answers one Remove capture produces (slice 3c-i).
 *
 * EVERY FIELD IS OPTIONAL BECAUSE THE FIVE ROUTES ANSWER DIFFERENT QUESTIONS.
 * The chips path writes a chip and no text; the free-text path writes text and
 * no chip; the relationship and sleep routes skip timing entirely. Requiring
 * any of them would force a caller to invent an answer the user never gave.
 */
export interface RemoveCaptureInput {
  family?: RemoveFamily | null;
  chipId?: string | null;
  /**
   * The user's own words. THE CALLER IS RESPONSIBLE FOR HAVING RUN THE CRISIS
   * PRE-CHECK before this reaches here; this module does not scan text and must
   * not start, because a second scanner is a second answer.
   */
  text?: string | null;
  timing?: RemoveTiming | null;
}

/**
 * Record what the user named as the thing to remove.
 *
 * `removeCapturedAt` is stamped here and ONLY here, so it is the one field that
 * says a capture happened. Explicit nulls are written for whatever the route
 * did not collect, rather than omitting the keys: a null says "this route did
 * not ask", which reads correctly cold, while a missing key is
 * indistinguishable from a document that predates the field.
 *
 * updateDoc, not setDoc(merge): a capture only ever happens for a user who
 * already has a journey state, and a create here would mean the resolver ladder
 * had been bypassed.
 */
export async function recordRemoveCapture(
  userId: string,
  input: RemoveCaptureInput
): Promise<void> {
  // AN EMPTY CAPTURE IS NOT A CAPTURE, and writing one is destructive rather
  // than merely useless: this is an updateDoc, so it would overwrite a real
  // answer with nulls while stamping a fresh removeCapturedAt.
  //
  // That is not hypothetical. A navigation defect let the first-move screen be
  // reached a second time with the context already cleared, and the second
  // completion nulled the first one's answers. The call site guards too; this
  // is the backstop, because the service is what actually touches the row.
  if (!input.chipId && !input.text && !input.family) {
    throw new Error(
      'recordRemoveCapture called with no target. Refusing to null an existing capture.'
    );
  }

  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    removeFamily: input.family ?? null,
    removeTargetChip: input.chipId ?? null,
    removeTargetText: input.text ?? null,
    removeTiming: input.timing ?? null,
    removeCapturedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Record the curated replacement the user picked for their time slot
 * (slice 3c-ii).
 *
 * A COMMITMENT, NOT A ROUTINE. Nothing here touches the `routines` collection.
 * See the field comment on JourneyState for why that was rejected rather than
 * overlooked.
 *
 * `removeReplacementAt` is stamped here and ONLY here, so it is the one field
 * that says a pick happened, on the same contract as `removeCapturedAt`.
 *
 * THE OPTION ID IS CURATED AND THE SLOT IS A CLOSED UNION. Neither can carry
 * the user's own words: the replacement screen is unreachable from the
 * free-text path (it never asks timing, so it can never qualify), and no
 * caller has a text field to pass. This function takes no text parameter and
 * must not grow one.
 *
 * updateDoc, not setDoc(merge): a pick only ever follows a capture, which only
 * ever happens for a user who already has a journey state.
 */
export async function recordRemoveReplacement(
  userId: string,
  input: { optionId: string; slot: ReplacementSlot }
): Promise<void> {
  // AN EMPTY PICK IS NOT A PICK. This is an updateDoc, so writing one would
  // blank a real choice while stamping a fresh removeReplacementAt. The same
  // backstop the capture write carries above, for the same reason: the service
  // is what actually touches the row.
  if (!input.optionId) {
    throw new Error(
      'recordRemoveReplacement called with no option. Refusing to blank an existing pick.'
    );
  }

  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    removeReplacementId: input.optionId,
    removeReplacementSlot: input.slot,
    removeReplacementAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
