/**
 * Every user-facing string in the weekly-loop screens, in one file.
 *
 * NONE OF THIS IS SHIPPABLE COPY. Two markers, and the distinction matters:
 *
 *   [Jen]      the spec supplies this line; Jen owns the final wording.
 *   [COPY GAP] the spec supplies nothing and a string was structurally
 *              required. The placeholder below was written to be replaced, not
 *              to be approved. Every one of these is reported as a copy gap.
 *
 * Both markers are rendered ON SCREEN, not stripped at build time, so nobody
 * can mistake a walkthrough build for finished product. Removing a marker is a
 * copy decision and belongs to Jen.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */

/** Prefix for a string the spec supplies. */
const jen = (text: string) => `[Jen] ${text}`;
/** Prefix for a string the spec does not supply. */
const gap = (text: string) => `[COPY GAP] ${text}`;

export const FLOOR_COPY = {
  // Spec 10.1, verbatim prompt.
  prompt: jen("Name the one thing you'll do even on your worst week."),
  helper: gap('One line, in your own words.'),
  placeholder: gap('Ten minutes outside'),
  save: gap('Save'),
  // Shown when the field is empty; the button is disabled, this says why.
  required: gap('Write one line to continue.'),
  saveFailed: gap('That did not save. Check your connection and try again.'),
} as const;

export const ENTRY_COPY = {
  loading: gap('One moment.'),
  failed: gap('We could not load your week. Try again.'),
  retry: gap('Try again'),
  signedOut: gap('Sign in to open your week.'),
} as const;
