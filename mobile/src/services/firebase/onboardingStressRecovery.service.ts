/**
 * Persists the stress-recovery onboarding inputs and the resume step on
 * users/{uid}. Follows the existing onboarding.service.ts pattern
 * (updateDoc + serverTimestamp). The daily anchor is NOT stored here — it
 * reuses NotificationPreferences.dailyRhythm (see Task 3).
 *
 * Data-save functions persist ONLY their data field (+ updatedAt). They never
 * touch onboardingStep — that is written on screen MOUNT via saveOnboardingStep,
 * so a crash mid-flow resumes onto the step the user is ON, not the one they
 * just completed.
 */
import { doc, getDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { setUserPrivate, stageUserPrivate } from './userPrivate.service';
import { getMergedUserData } from './userMigrationRead';
import { db } from '../../config/firebase';
import type { BrainState } from '../../types/models';
import {
  ONBOARDING_SR_STEPS,
  ONBOARDING_SITUATION,
  type OnboardingSrStep,
  type PeakWindow,
} from '../../constants/onboardingStressRecovery';
import { classifyQuadrant } from '../../engine';
import { brainStateToCircumplex } from '../../engine/stateBridge';
import { saveOnboardingRecheckCheckIn } from './brainStateCheckIn.service';

const USERS_COLLECTION = 'users';

function userRef(userId: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, USERS_COLLECTION, userId);
}

/** Narrowed Firestore handle for the one site that opens a batch. */
function requireDbForBatch() {
  if (!db) throw new Error('Firestore not initialized');
  return db;
}

// MIGRATION SLICE 2 — these four now write userPrivate/{uid}.
//
// The dotted paths became nested objects. That is required, not cosmetic:
// setDoc(..., {merge:true}) treats a key like 'onboardingStressRecovery.peakWindow'
// as a literal field name containing a dot, so the dotted form would have
// written a garbage top-level field and silently dropped the real one. Nested
// maps under merge:true deep-merge in Firestore, so each of these still leaves
// its sibling keys intact exactly as the dotted updateDoc did.
//
// setUserPrivate (setDoc merge) rather than updateDoc also fixes the absent-
// document case: updateDoc rejects a write to a document that does not exist,
// and for a mid-migration user the private document usually does not yet.

export async function saveInitialState(userId: string, state: BrainState): Promise<void> {
  await setUserPrivate(userId, { onboardingStressRecovery: { initialState: state } });
}

export async function saveStressors(userId: string, stressors: string[]): Promise<void> {
  await setUserPrivate(userId, { onboardingStressRecovery: { stressors } });
}

export async function savePeakWindow(userId: string, peak: PeakWindow | null): Promise<void> {
  await setUserPrivate(userId, { onboardingStressRecovery: { peakWindow: peak } });
}

export async function saveRecheckShift(
  userId: string,
  stateAfter: BrainState,
  shift: 'improved' | 'flat' | 'worse'
): Promise<void> {
  await setUserPrivate(userId, {
    onboardingStressRecovery: { recheckStateAfter: stateAfter, recheckShift: shift },
  });
}

/**
 * On onboarding completion: if the user completed the re-check step, persist
 * that brain state as today's first daily check-in (source-tagged) so the
 * dashboard's gated-until-check-in logic doesn't immediately re-ask. A skipped
 * / never-reached re-check leaves `recheckStateAfter` unset → no write, and the
 * dashboard gates normally. Non-blocking: never trap the user on the terminal
 * screen.
 */
export async function persistRecheckAsDailyCheckIn(userId: string): Promise<void> {
  try {
    // MIGRATION_FALLBACK — the re-check state is written privately from slice 2
    // but a user who captured it on an older build still has it on users/{uid}.
    const merged = await getMergedUserData(userId);
    if (!merged) return;
    const sr = merged.onboardingStressRecovery as
      | { recheckStateAfter?: BrainState }
      | undefined;
    const after = (sr?.recheckStateAfter ?? null) as BrainState | null;
    if (!after) return; // re-check skipped or not reached → gate normally
    // Stamp the marker with the real circumplex quadrant + pinned situation
    // (derived losslessly from the bridged re-check state), matching the
    // dashboard's check-in write so the acknowledgment card can read it.
    const circumplex = brainStateToCircumplex(after);
    const quadrant = classifyQuadrant(circumplex.arousal, circumplex.valence);
    await saveOnboardingRecheckCheckIn(userId, after, {
      quadrant,
      situation: ONBOARDING_SITUATION,
    });
  } catch {
    // Swallow — analytics/UX convenience, must not block completion.
  }
}

/**
 * The SOLE writer of onboardingStep. Called on screen MOUNT with the current
 * route name, so a crash mid-flow resumes onto the step the user is on — not
 * the one they just completed. Writes the route name verbatim.
 */
export async function saveOnboardingStep(userId: string, step: OnboardingSrStep): Promise<void> {
  const batch = writeBatch(requireDbForBatch());
  // MIGRATION_FALLBACK — gate-field dual-write. onboardingStep decides which
  // screen AppNavigator resumes the arc on, so a client still reading
  // users/{uid} must keep seeing it advance or it would restart the flow.
  // Slice 4 drops this line and keeps the userPrivate write.
  batch.update(userRef(userId), { onboardingStep: step, updatedAt: serverTimestamp() });
  await stageUserPrivate(batch, userId, { onboardingStep: step });
  await batch.commit();
}

/**
 * Resume helper (pure, unit-tested): given the user doc data, return the route
 * to start onboarding on. Missing/invalid → the first screen.
 */
export function resolveInitialStep(
  userData: { onboardingStep?: unknown } | null | undefined
): OnboardingSrStep {
  const step = userData?.onboardingStep;
  return (typeof step === 'string' && (ONBOARDING_SR_STEPS as readonly string[]).includes(step)
    ? step
    : 'OnboardingProblem') as OnboardingSrStep;
}
