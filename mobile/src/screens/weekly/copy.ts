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

/**
 * Outcome labels are NOT placeholders and carry no marker. These four names are
 * the locked taxonomy (spec 5): the same vocabulary across the weekly open, the
 * Practices filters and the content tags. Renaming one is a spec change, not a
 * copy pass.
 */
export const OUTCOME_LABELS = {
  focus: 'Focus',
  stress: 'Stress',
  routines: 'Routines',
  energy: 'Energy',
} as const;

/**
 * Capacity labels. The tier names and the two glosses the spec supplies
 * (normal = "full time and resources", slammed = "minimal") are spec 6.1;
 * `limited` is given no gloss there, so it has one copy gap of its own.
 */
export const CAPACITY_LABELS = {
  normal: 'Normal',
  limited: 'Limited',
  slammed: 'Slammed',
} as const;

export const CAPACITY_GLOSSES = {
  normal: jen('Full time and resources'),
  limited: gap('Less room than usual'),
  slammed: jen('Minimal'),
} as const;

export const OPEN_COPY = {
  // Spec 6.1 step 1, verbatim.
  outcomeQuestion: jen("What's your focus this week?"),
  // Spec 6.1 step 2, verbatim.
  capacityQuestion: jen("What's your capacity this week?"),
  // Spec 6.1 step 3 (calendar forecast) is DEFERRED, not hidden behind a
  // disabled control. There is no string for it here because there is no
  // affordance for it on screen.
  confirmHeading: gap('Your week'),
  confirm: gap('Start this week'),
  back: gap('Back'),
  perDay: gap('About {minutes} min a day'),
  whyHeading: gap('Why this works'),
  saveFailed: gap('That did not save. Check your connection and try again.'),
} as const;

export const TODAY_COPY = {
  actionHeading: gap('Today'),
  weekHeading: gap('This week'),
  floorHeading: gap('Your floor'),
  quickWinHeading: gap('Plus, once today'),
  // The week-1 quick-win practice (spec 6.3) has no catalogue entry and so no
  // display name. Showing the raw practice id would be worse than showing the
  // gap, so this stands in until the practice exists.
  quickWinPractice: gap('week-1 quick-win practice, not yet named'),
  loadFailed: gap('We could not load your week. Try again.'),
  retry: gap('Try again'),
} as const;
