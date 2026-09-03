/**
 * Where each answer sends the user, and what it means (journey slice 3c-i).
 *
 * PURE. No navigation, no Firestore, no React. The screens call these and obey
 * the answer, which is what lets the whole routing table be tested without a
 * navigator and read without opening five components.
 *
 * THE TWO PATHS ARE SEPARABLE BY CONSTRUCTION. Every chip route reaches a
 * complete capture without ever touching `nextAfterClarify`, so the free-text
 * path could be removed entirely and the flow would still work end to end.
 * That is a requirement of the slice, not an accident of the shape.
 */
import type { RemoveFamily, RemoveTiming } from '../../../types/models';

/** The screens the flow can be on. */
export type CaptureStep = 'clarify' | 'sleep' | 'timing' | 'firstMove';

/** What one answer contributes to the capture. */
export interface CaptureLeg {
  next: CaptureStep;
  family?: RemoveFamily;
  timing?: RemoveTiming;
}

/**
 * Screen A. The five opening chips.
 *
 * THREE OF THE FIVE SKIP THE TIMING QUESTION, each for its own reason:
 *   - relationship goes straight to the first move, because "when does this
 *     person drain you" is not a question with a useful answer and asking it
 *     would invite a story the app has nowhere to put.
 *   - sleep goes to its own sub-question, and its timing is settled by being
 *     about sleep at all.
 *   - "something else" goes to clarify, which is where the free-text field
 *     lives; timing follows from whatever family that resolves to, and this
 *     slice does not ask it.
 */
export function legForIdentifyChip(chipId: string): CaptureLeg {
  switch (chipId) {
    case 'scroll':
      return { next: 'timing', family: 'behavioral' };
    case 'thoughts':
      return { next: 'timing', family: 'mental' };
    case 'sleep':
      return { next: 'sleep' };
    case 'relationship':
      return { next: 'firstMove', family: 'interpersonal' };
    case 'other':
      return { next: 'clarify' };
    default:
      // An unknown chip cannot route, and guessing a family would file the
      // user's answer under something they did not say. Clarify is the honest
      // destination: it asks.
      return { next: 'clarify' };
  }
}

/**
 * Screen C. The sleep sub-question.
 *
 * EVERY OPTION SETS TIMING TO EVENING and skips screen D. The question was
 * about sleep, so the timing is already answered; asking again would read as
 * not having listened.
 *
 * "I'm not sure" ROUTES BEHAVIORAL. Not stated in the signed routing, and this
 * is the assumption: the two behavioral options (phone, staying up) are the
 * common cases, and a behavioral first move is the one that costs least if the
 * guess is wrong. Worth Jen confirming.
 */
export function legForSleepChip(chipId: string): CaptureLeg {
  switch (chipId) {
    case 'sleep_mind':
      return { next: 'firstMove', family: 'mental', timing: 'evening' };
    case 'sleep_phone':
    case 'sleep_late':
    case 'sleep_unsure':
    default:
      return { next: 'firstMove', family: 'behavioral', timing: 'evening' };
  }
}

/** Screen B. The clarify chips, and the family the free-text path resolves to. */
export function familyForClarifyChip(chipId: string): RemoveFamily {
  switch (chipId) {
    case 'loop':
      return 'mental';
    case 'person':
      return 'interpersonal';
    case 'do':
    default:
      return 'behavioral';
  }
}

/**
 * Screen D's heading depends on the family, because the question does.
 *
 * Anything that is not mental reads as something you get pulled into.
 */
export function timingTitleFor(family: RemoveFamily | undefined): 'behavioral' | 'mental' {
  return family === 'mental' ? 'mental' : 'behavioral';
}

/** Screen D. The timing chips map to the stored union one to one. */
export function timingForChip(chipId: string): RemoveTiming {
  switch (chipId) {
    case 'morning':
    case 'day':
    case 'evening':
    case 'varies':
      return chipId;
    default:
      // 'varies' is the honest fallback: it is the answer that promises least,
      // and it routes scaffold-only rather than seeding a routine at a time
      // nobody named.
      return 'varies';
  }
}
