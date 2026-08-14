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

// ---- edit mode (TB-2c, no mockup) ----

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] The sheet's title when opened on an existing task.
 *
 * The mockup draws no edit state — it predates the decision that a task can be
 * changed at all — so this and the strings below are written to the pattern the
 * blocks sheet established rather than transcribed.
 */
export const EDIT_TITLE = 'Edit task';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] The sheet's subtitle when editing.
 *
 * Names the two things that can change, because they are the only two. Nothing
 * about when it happens: a task is timeless, and scheduling it is what a block
 * is for.
 */
export const EDIT_INTRO = 'Change what it says, or how much it takes.';

// COPY: draft, not from guidelines doc - pending Jen
/** [new] The primary in edit mode, mirroring the blocks sheet's SAVE_CHANGES. */
export const SAVE_CHANGES = 'Save changes';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] The single destructive action, inside the edit sheet.
 *
 * "Clear", not "Delete" and never "Delete forever", per the UI standards'
 * language rule and because clearing is what the model actually calls it: the
 * row goes and nothing is kept. Blocks say "Remove" for the same reason at the
 * same place in their sheet.
 */
export const CLEAR_TASK = 'Clear';

// COPY: draft, not from guidelines doc - pending Jen
/** [new] Confirm dialog title. Names the act, asks nothing rhetorical. */
export const CLEAR_CONFIRM_TITLE = 'Clear this task?';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] Confirm dialog body.
 *
 * States the one consequence that matters and stops. It is honest that there is
 * no undo and no history, without dressing a two-word task up as a grave
 * decision — the recovery cost is retyping a line.
 */
export const CLEAR_CONFIRM_BODY = "It won't be kept anywhere. You can always jot it down again.";

// COPY: draft, not from guidelines doc - pending Jen
/** [new] Confirm dialog accept. */
export const CLEAR_CONFIRM_ACCEPT = 'Clear it';

// COPY: draft, not from guidelines doc - pending Jen
/** [new] Confirm dialog cancel. */
export const CLEAR_CONFIRM_CANCEL = 'Keep it';

// COPY: draft, not from guidelines doc - pending Jen
/** [new] Shown when the clear itself fails, in the same Alert. */
export const CLEAR_FAILED = "That didn't clear. Try once more.";

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] Announced for a task row, since the row LOOKS static and now is not.
 *
 * Tap, not swipe. The device walk answered the Step-0 question: swipe stayed
 * dead app-wide, so the row itself is the affordance and this line is how a
 * screen-reader user learns it.
 */
export const ROW_A11Y_HINT = 'Opens this task to edit or clear it';

// ---- the task-to-block bridge (TB-3, mockup C) ----

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [mockup] C .st.q, the action on a task that has no block yet.
 *
 * IT IS A BUTTON INSIDE THE EDIT SHEET, NOT A PER-ROW CONTROL, and the mockup
 * itself is what asks the question: "'Block it' per row is three tappables per
 * group. Alternative: tap a task, act from a sheet. Quieter, one more step.
 * Which way?" TB-2c already answered the identical question for editing and
 * clearing by choosing the sheet, and a second tappable nested inside a row that
 * is already one button would give every row two targets and two announcements.
 * The words survive the move; the placement does not.
 */
export const BLOCK_IT = 'Block it';

// COPY: draft, not from guidelines doc - pending Jen
/**
 * [new] Announced for the Block it button, because the tap LEAVES this screen.
 *
 * Every other control in this sheet resolves inside it. This one closes the
 * sheet and pushes the day view, which is a bigger consequence than a button
 * label can carry on its own, so it is named rather than discovered.
 */
export const BLOCK_IT_A11Y_HINT = 'Closes this and opens the day view to place it';

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
