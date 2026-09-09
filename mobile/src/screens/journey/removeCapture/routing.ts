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
import type { RemoveFamily, RemoveTiming, ReplacementSlot } from '../../../types/models';
import { REPLACEMENT_MENUS } from './copy';

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

/**
 * Does this capture get a curated replacement menu, and for which slot?
 * (Slice 3c-ii.)
 *
 * THE PRINCIPLE IS REPLACE THE BEHAVIOR IN ITS SLOT. Both halves are load
 * bearing, so both are required and neither is inferred:
 *
 *   - BEHAVIORAL ONLY. A mental target is a thought you cannot switch off and
 *     an interpersonal one is a person; neither vacates a slot that something
 *     else could fill, so offering "what would you rather do with that time"
 *     would be answering a question the user did not ask. Those two keep the
 *     friction, boundary and noticing scaffolds in FIRST_MOVE_BY_FAMILY, which
 *     this slice does not touch.
 *   - A NAMED SLOT. 'varies' routes scaffold-only by decision (roadmap section
 *     13, Sept 2), because a replacement anchored to a time the user does not
 *     have is worse than none. Absent timing does the same for the same reason.
 *
 * WHY THE FREE-TEXT PATH CANNOT REACH THIS. Screen B goes straight to the first
 * move and never asks timing, so every free-text capture arrives with timing
 * null and fails the second test. The user's own words therefore cannot appear
 * on the replacement screen by construction, not merely by discipline. That is
 * the structural half of the curated-strings-only rule; the tests pin it.
 */
export function replacementSlotFor(
  family: RemoveFamily | null | undefined,
  timing: RemoveTiming | null | undefined
): ReplacementSlot | null {
  if (family !== 'behavioral') return null;
  if (timing === 'morning' || timing === 'day' || timing === 'evening') return timing;
  return null;
}

/**
 * The display label for a stored replacement pick, or null (slice 5b-i).
 *
 * THE STORED VALUE IS AN ID AND ONLY AN ID (`removeReplacementId`,
 * types/models.ts). This is the one place that turns it back into words, so a
 * relabelled menu option changes one string in copy.ts and every surface that
 * shows a past pick follows.
 *
 * ABSENT-SAFE ON EVERY INPUT, and that is the whole reason it returns null
 * rather than a fallback string:
 *   - No pick was ever made. Every mental capture, every interpersonal one,
 *     every 'varies' timing and every capture predating slice 3c-ii is in this
 *     state, and it is not a failure.
 *   - A slot that is not one of the three menus.
 *   - AN ID THAT NO LONGER EXISTS, which is the case worth building for. The
 *     menus are copy and copy gets rewritten; an id retired after a user picked
 *     it must render as nothing rather than as an empty row, a raw id, or a
 *     cheerful stand-in for a choice the app can no longer name.
 *
 * The caller decides what absence looks like. Nothing here invents a label.
 */
export function labelForReplacement(
  slot: ReplacementSlot | null | undefined,
  optionId: string | null | undefined
): string | null {
  if (!slot || !optionId) return null;
  const menu = REPLACEMENT_MENUS[slot];
  if (!menu) return null;
  return menu.find((option) => option.id === optionId)?.label ?? null;
}
