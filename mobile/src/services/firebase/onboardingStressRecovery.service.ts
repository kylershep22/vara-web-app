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
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { BrainState } from '../../types/models';
import { ONBOARDING_SR_STEPS, type OnboardingSrStep, type PeakWindow } from '../../constants/onboardingStressRecovery';
import { saveOnboardingRecheckCheckIn } from './brainStateCheckIn.service';

const USERS_COLLECTION = 'users';

function userRef(userId: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, USERS_COLLECTION, userId);
}

export async function saveInitialState(userId: string, state: BrainState): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.initialState': state,
    updatedAt: serverTimestamp(),
  });
}

export async function saveStressors(userId: string, stressors: string[]): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.stressors': stressors,
    updatedAt: serverTimestamp(),
  });
}

export async function savePeakWindow(userId: string, peak: PeakWindow | null): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.peakWindow': peak,
    updatedAt: serverTimestamp(),
  });
}

export async function saveRecheckShift(
  userId: string,
  stateAfter: BrainState,
  shift: 'improved' | 'flat' | 'worse'
): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.recheckStateAfter': stateAfter,
    'onboardingStressRecovery.recheckShift': shift,
    updatedAt: serverTimestamp(),
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
    const snap = await getDoc(userRef(userId));
    if (!snap.exists()) return;
    const after = (snap.data()?.onboardingStressRecovery?.recheckStateAfter ??
      null) as BrainState | null;
    if (!after) return; // re-check skipped or not reached → gate normally
    await saveOnboardingRecheckCheckIn(userId, after);
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
  await updateDoc(userRef(userId), { onboardingStep: step, updatedAt: serverTimestamp() });
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
