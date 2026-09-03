/**
 * journeyStates - where each user is in their journey (Journey Architecture
 * Roadmap v3, Section 3.1).
 *
 * ONE DOCUMENT PER USER, AND THE DOCUMENT ID IS THE UID. That is why every
 * helper here takes a uid and none of them takes a document ID: there is
 * nothing to look up. The rules gate on the ID path rather than on a field.
 *
 * NO COUNTERS ARE STORED. Consistent days and calendar days are derived at
 * read time by src/journey/derive.ts from dailyLogs and `enteredAt`. This
 * module writes decisions and timestamps; it never writes a tally. If a future
 * slice wants a counter here, that is the wrong fix; see the JourneyState
 * comment in types/models.ts.
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
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { requireDb } from './ensureDb';
import { PHASE_ORDER } from '../../constants/journey';
import type {
  DestinationKey,
  JourneyState,
  PhaseExitReason,
  PhaseHistoryEntry,
  PhaseKey,
  RemoveFamily,
  RemoveTiming,
} from '../../types/models';

const JOURNEY_STATES = 'journeyStates';

/** The fields a caller supplies when a user starts their journey. */
export interface CreateJourneyStateInput {
  destination: DestinationKey;
  /** Always 'remove' today; typed as PhaseKey so a later slice can seed. */
  phaseKey: PhaseKey;
}

/**
 * The four offer/decline timestamps, cleared.
 *
 * SPELLED OUT IN ONE PLACE because every phase change has to reset all four
 * and forgetting one is silent: a stale `advanceDeclinedAt` would suppress the
 * next phase's advance offer forever, and nothing would log that it had.
 */
const CLEARED_OFFERS = {
  advanceOfferedAt: null,
  advanceDeclinedAt: null,
  adjustOfferedAt: null,
  adjustDeclinedAt: null,
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
// Four one-field setters rather than one parameterised helper. The field names
// are the API: a recordOffer(kind) would push the choice into a string and
// lose the compile-time check that the caller meant advance rather than adjust.
// ---------------------------------------------------------------------------

/** The advance offer was shown. */
export async function recordAdvanceOffered(userId: string): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    advanceOfferedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** The user said not yet to advancing. Suppresses the offer for this phase. */
export async function recordAdvanceDeclined(userId: string): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    advanceDeclinedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** The adjustment offer was shown. */
export async function recordAdjustOffered(userId: string): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    adjustOfferedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** The user said not yet to adjusting. Suppresses the offer for this phase. */
export async function recordAdjustDeclined(userId: string): Promise<void> {
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    adjustDeclinedAt: serverTimestamp(),
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
  await updateDoc(doc(requireDb(), JOURNEY_STATES, userId), {
    removeFamily: input.family ?? null,
    removeTargetChip: input.chipId ?? null,
    removeTargetText: input.text ?? null,
    removeTiming: input.timing ?? null,
    removeCapturedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
