/**
 * Good moments — every user-facing string in slice 8.
 *
 * ALL SIX ARE JEN'S AND ALL SIX ARE APPROVED ON DELIVERY (2026-09-12 and
 * 2026-09-18). None of them carries a copy-draft sentinel and
 * EXPECTED_SENTINELS does not move for them. That follows the 7n precedent
 * recorded in `src/__tests__/copyDraftSentinel.test.ts`: approved copy landing
 * from a rank-1 source-of-truth document enters with no marker, the same way
 * pack copy does, even though these strings are recorded on the roadmap rather
 * than in the content pack. The ledger in that file carries a dated no-change
 * entry for this slice so a flat number is distinguishable from an unchecked
 * one.
 *
 * THE FEATURE IS CALLED "GOOD MOMENTS", NOT "MOMENTS OF JOY". Jen's ruling,
 * 2026-09-12: joy sets the emotional bar too high. `moments` remains the
 * collection name because a collection name is not copy.
 *
 * "GRATITUDE" APPEARS IN NONE OF THESE, and it must not appear in any string
 * added here later. The roadmap's section 8 tripwire is the authority.
 *
 * NO PLACEHOLDER IN THE INPUT, DELIBERATELY (Jen, 2026-09-12). The prompt above
 * the field is the whole framing; a placeholder underneath it would either
 * repeat the prompt or lead the user toward what counts as a good moment. That
 * is why there is no `placeholder` key in this file rather than an empty one.
 */

/** The below-fold row on Today. The row's only string. */
export const GOOD_MOMENT_ROW_LABEL = 'Add a good moment';

/** Sits above the input, inside the sheet. */
export const GOOD_MOMENT_PROMPT = 'What was one good moment from today?';

/** The sheet's primary. */
export const GOOD_MOMENT_SAVE = 'Save';

/** The sheet's secondary. Dismisses and discards, exactly like the other two
 *  dismissal routes. */
export const GOOD_MOMENT_CANCEL = 'Cancel';

/** Shown inline on success, then the sheet closes itself. */
export const GOOD_MOMENT_SAVED = 'Saved.';

/** Shown inline on failure. The sheet stays open and the text survives. */
export const GOOD_MOMENT_SAVE_FAILED = "Couldn't save that. Try again.";

/**
 * How long "Saved." is held before the sheet dismisses itself, in ms.
 *
 * 1.25s DEVIATES FROM UI STANDARDS 14.3, WHICH SAYS 2 TO 3 SECONDS, and the
 * deviation is decided rather than inherited. 14.3's window is written for an
 * acknowledgment that appears non-blockingly over a screen the user can carry
 * on using. This one is holding a modal open over Today: every extra second is
 * a second the user is kept in a sheet whose work is finished. Short enough to
 * be a confirmation, long enough to be read.
 */
export const GOOD_MOMENT_SAVED_HOLD_MS = 1250;

/**
 * The cap on a single moment, in characters.
 *
 * NO COUNTER, NO WARNING AND NO LIMIT COPY ANYWHERE. The field simply stops
 * accepting characters. A visible counter would be a number on a surface whose
 * whole premise is that nothing here is counted (roadmap section 8: "one tap,
 * optional, never counted"), and UI Standards 11.E prohibits any number on
 * Today outright.
 */
export const GOOD_MOMENT_MAX_LENGTH = 200;
