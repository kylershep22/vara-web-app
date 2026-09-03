/**
 * Every user-facing string in the Remove capture flow (journey slice 3c-i).
 *
 * ONE QUESTION PER SCREEN. The chips are the vocabulary the user chooses from;
 * the framework words (remove / recover / rewire / refocus) appear nowhere here
 * and must not, per roadmap section 8. `family` values are code and live in
 * routing.ts, not in this file.
 *
 * CHIP IDS ARE STABLE AND THE LABELS ARE NOT. `removeTargetChip` stores an id,
 * so a label rewrite orphans nothing. Never store a label.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */

/** Screen A. The one question that opens the flow. */
export const IDENTIFY_COPY = {
  title: "What's draining you most right now?",
  /**
   * The combined helper line (Kyle's definition plus Jen's decision rule),
   * per the slice brief. It does two jobs on purpose: it says what counts as an
   * answer, and it says how to choose when several do.
   */
  helper:
    'Something that takes up mental space or contributes to stress. Start with the one that’s in your way most.',
  primary: "That's the one",
  /**
   * The tertiary. NOT "skip": naming it later is a real answer, and the card
   * that offered this retires for a week rather than re-firing.
   */
  tertiary: "I'll name it later",
} as const;

/** Screen A options. Ids are persisted; labels are not. */
export const IDENTIFY_CHIPS = [
  { id: 'scroll', label: 'Getting stuck scrolling' },
  { id: 'thoughts', label: "Thoughts I can't switch off" },
  { id: 'sleep', label: 'Something getting in the way of my sleep' },
  { id: 'relationship', label: "A relationship that's draining me" },
  { id: 'other', label: 'Something else' },
] as const;

/** Screen B. Only after "Something else". */
export const CLARIFY_COPY = {
  title: 'Which is it closest to?',
  primary: "That's the one",
  /** The free-text field. The ONLY one in the flow. */
  textPlaceholder: 'Say it in your own words',
} as const;

export const CLARIFY_CHIPS = [
  { id: 'do', label: 'Something I do' },
  { id: 'loop', label: 'Thoughts that loop' },
  { id: 'person', label: 'A person or situation' },
] as const;

/** Screen C. Only after the sleep chip. */
export const SLEEP_COPY = {
  title: "What's usually getting in the way?",
  primary: "That's the one",
} as const;

export const SLEEP_CHIPS = [
  { id: 'sleep_phone', label: 'Late-night phone use' },
  { id: 'sleep_late', label: 'Staying up too late' },
  { id: 'sleep_mind', label: "My mind won't switch off" },
  { id: 'sleep_unsure', label: "I'm not sure" },
] as const;

/**
 * Screen D. Two headings, because the question is not the same question.
 *
 * A behavioral target is something you get PULLED INTO; a mental one is
 * something you cannot SWITCH OFF. Asking both with one wording would make one
 * of the two read as a category error.
 */
export const TIMING_COPY = {
  titleBehavioral: 'When do you tend to get pulled into it?',
  titleMental: 'When is it hardest to switch off?',
  primary: "That's the one",
} as const;

export const TIMING_CHIPS = [
  { id: 'morning', label: 'Morning' },
  { id: 'day', label: 'During the day' },
  { id: 'evening', label: 'Evening' },
  { id: 'varies', label: 'It varies' },
] as const;

/** Screen E. The first move, and the end of the flow. */
export const FIRST_MOVE_COPY = {
  title: 'One thing to try',
  primary: "I'll do that",
  /**
   * The quiet caption above the chip label or the user's own words.
   *
   * A CAPTION, NOT A FIELD LABEL. It sits over static text with no container
   * and no border; styling it as a form label is how the read-back came to be
   * mistaken for an empty input on the first device walk.
   */
  confirmationHeading: "What you're working on",
  /** Shown in place of navigating away when the one write fails. */
  saveFailed: 'That did not save. Try again.',
} as const;

/**
 * The family-matched first move.
 *
 * DRAFTED, NOT APPROVED. The slice brief sources these from "the v3 pack
 * Section 4", which was not supplied with the brief the way Section 6 (the
 * protocols) was. These carry the drafted-copy sentinel so the gap is counted
 * and visible rather than silently shipped as approved content, and they are
 * the only strings in this flow that do.
 */
export const FIRST_MOVE_BY_FAMILY = {
  // COPY: draft, not from guidelines doc - pending Jen
  behavioral: 'Put one piece of friction in the way today. Move it, close it, or put it out of reach.',
  // COPY: draft, not from guidelines doc - pending Jen
  mental: 'Write one line about it today. What it is, and when you will deal with it.',
  // COPY: draft, not from guidelines doc - pending Jen
  interpersonal: 'Pick one small limit for today. A shorter call, a topic you leave alone, a reply that waits.',
} as const;

/** The one-time Today entry card. */
export const CAPTURE_CARD_COPY = {
  title: "What's draining you most?",
  body: 'Name one thing, and today gets pointed at it.',
  cta: 'Name it',
  dismiss: "I'll name it later",
} as const;
