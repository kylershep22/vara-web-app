/**
 * Copy for task batching (TB-2b, mockup C and D).
 *
 * Every string here is DRAFT and carries the sentinel the release gate counts.
 * No marker text renders — see mobile/src/__tests__/copyDraftSentinel.test.ts
 * for the contract, including the rule that moving the pinned count in either
 * direction must be named in the commit that does it.
 *
 * TWO STRINGS ARE DELIBERATELY NOT REDRAFTED HERE, and are imported from
 * blocksCopy instead: DEMAND_LABELS and LABEL_DEMAND. Both are about the
 * `Demand` axis itself rather than about blocks, and blocksCopy's own note
 * records that it took LABEL_DEMAND from mockup D — this sheet — in the first
 * place. Duplicating them would put the same words behind two sentinels that
 * could drift apart, and would let a task be tagged "Heavy" while the block it
 * becomes says something else. The axis has one vocabulary.
 */

import { DEMAND_LABELS, LABEL_DEMAND, missingFieldsHint } from './blocksCopy';
import type { Demand } from '../../types/models';

export { DEMAND_LABELS, LABEL_DEMAND };

/** Group order, heaviest first — see GROUP_HEADERS. */
export const DEMAND_ORDER: Demand[] = ['heavy', 'medium', 'light'];

// ---- the list screen (mockup C) ----

// COPY: draft, not from guidelines doc - pending Jen
/** [mockup] C h1. */
export const TASKS_TITLE = 'Tasks';

// COPY: draft, not from guidelines doc - pending Jen
/** [mockup] C sub. Names the whole loop: capture, tag, leave. */
export const TASKS_INTRO =
  'Jot it down, tag what it takes, and get back to what you were doing.';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [mockup] C capture field.
 *
 * Drawn as a placeholder in the mockup and kept as one here, because the
 * affordance is a field-styled TAP TARGET rather than a live input: it looks
 * like somewhere to type and its only behaviour is opening the capture sheet,
 * where the demand question lives. A live input could not enforce the tag.
 */
export const CAPTURE_TARGET = 'Jot it down...';

// COPY: draft, not from guidelines doc - pending Jen
/** [new] Announced for the capture target, since its role is not "text field". */
export const CAPTURE_A11Y_HINT = 'Opens a sheet to capture a task and tag it';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [mockup] C .ghead, extended to all three demands.
 *
 * The header teaches the model in one line: it names the demand and then says
 * what kind of window that demand wants. Heavy and light are the mockup's own
 * lines verbatim; medium had no group drawn (the mockup's example data happens
 * to have none) and is written to the same shape.
 *
 * Guidance, never instruction — no "should", no "must". The line describes when
 * the work tends to go well, and the user decides.
 */
export const GROUP_HEADERS: Record<Demand, string> = {
  heavy: 'HEAVY · WANTS A HIGH-CAPACITY WINDOW',
  medium: 'MEDIUM · FITS WHEN YOU HAVE SOME ROOM',
  light: "LIGHT · CLEARS EASILY WHEN YOU'RE RUNNING LOW",
};

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] Zero tasks anywhere.
 *
 * Standards 11.2: warm, and NEVER deficit-framed. An empty capture list is a
 * clear head, not a backlog someone has failed to build — so this says nothing
 * about getting started, adding your first task, or what is missing. It offers
 * the surface and stops.
 */
export const EMPTY_LINE = 'Nothing on the list. When something surfaces, put it here.';

// ---- the capture sheet (mockup D) ----

// COPY: draft, not from guidelines doc - pending Jen
/** [mockup] D h2. */
export const SHEET_TITLE = 'Jot it down';

// COPY: draft, not from guidelines doc - pending Jen
/** [mockup] D sub. Names the payoff: capture exists so you can put it down. */
export const SHEET_INTRO =
  'Get it out of your head. It will be here when you have room for it.';

// COPY: draft, not from guidelines doc - pending Jen
/** [new] The mockup shows this field filled in, so it draws no placeholder. */
export const TITLE_PLACEHOLDER = 'What is it?';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [mockup] D button.
 *
 * "Save and get back" names the payoff rather than the mechanism: the point of
 * capture is returning to what you were doing, so the CTA says so.
 */
export const SAVE_CTA = 'Save and get back';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] A refused save.
 *
 * Soft Coral IS right here, and it is the only place on this feature that
 * earns it: a write that did not land is a genuine needs-attention state
 * (standards 11.4). Distinct wording from the blocks sheet's SAVE_FAILED so
 * the two can be approved, or reworded, independently.
 */
export const SAVE_FAILED = "That didn't save. Try once more.";

/**
 * What is still missing, shown when the primary is tapped before the capture is
 * complete.
 *
 * DELEGATES to the blocks hint rather than restating it. The two forms ask for
 * the same two things in the same words, and `needsTime` is omitted because a
 * task has no time — that is the whole difference between the two sheets, and
 * passing false makes it unrepresentable here rather than merely unused.
 */
export function missingCaptureHint(needsTitle: boolean, needsDemand: boolean): string {
  return missingFieldsHint(needsTitle, needsDemand, false);
}
