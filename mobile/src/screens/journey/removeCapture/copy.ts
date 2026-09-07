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
 * APPROVED AS-IS BY KYLE FOR v1, 2026-09-04, on his own authority rather than
 * Jen's. They landed drafted: the slice brief sourced them from "the v3 pack
 * Section 4", which was never supplied the way Section 6 (the protocols) was, so
 * they carried the drafted-copy sentinel and were counted at 192. That gap is
 * now closed by decision, not by Jen review, and the distinction matters if
 * these are ever revisited: nobody has checked them against the v3 pack, they
 * were accepted as good enough to ship.
 */
export const FIRST_MOVE_BY_FAMILY = {
  behavioral: 'Put one piece of friction in the way today. Move it, close it, or put it out of reach.',
  mental: 'Write one line about it today. What it is, and when you will deal with it.',
  interpersonal: 'Pick one small limit for today. A shorter call, a topic you leave alone, a reply that waits.',
} as const;

/** The one-time Today entry card. */
export const CAPTURE_CARD_COPY = {
  title: "What's draining you most?",
  body: 'Name one thing, and today gets pointed at it.',
  cta: 'Name it',
  dismiss: "I'll name it later",
} as const;

/**
 * The curated replacement menus (journey slice 3c-ii).
 *
 * VERBATIM FROM `Content Pack v1 §replacement-menus`. Jen-authored, approved by
 * the owner on delivery, so these carry NO drafted-copy sentinel and the
 * sentinel count does not move for them. The rule is written into the pack
 * header; do not add markers to approved content.
 *
 * NO REMINDER COPY LIVES HERE. The pack's "Want a nudge when that time comes?"
 * prompt, its two options, and the three reminder-presuming confirmations are
 * SLICE 9's, deferred by `Content Pack v1 §decisions-3`. If this screen ever
 * feels like it needs a nudge to be useful, that is the signal the scope split
 * was wrong, not licence to build one here.
 *
 * OPTION IDS ARE STABLE AND SLOT-PREFIXED; the labels are not stored, on the
 * same contract as the capture chips above. The prefix matters: three labels
 * repeat across slots ("Step outside", "Read a few pages"), and an unprefixed
 * id would make a morning pick indistinguishable from a daytime one.
 */
export const REPLACEMENT_COPY = {
  /** Pack title. One title for all three slots; the options are what differ. */
  title: 'What would you rather do with that time?',
  /**
   * NOT A NEW STRING. This is the flow's existing select-confirm label, already
   * shipped on all four preceding screens (IDENTIFY_COPY, CLARIFY_COPY,
   * SLEEP_COPY, TIMING_COPY above). Repeating an approved label is not new copy
   * and the sentinel does not move for it.
   */
  primary: "That's the one",
  /**
   * The exit from the confirmed state. THE ONE GAP STRING IN THIS SLICE: the
   * pack supplies the confirmation sentence but no label for the control that
   * dismisses it, because in Jen's original the reminder step owned that
   * position and it went to slice 9 with the rest.
   *
   * Tension with UI Standards section 18, RESOLVED IN FAVOUR OF SHIPPING IT.
   * Section 18 says buttons name the action, and this one acknowledges rather
   * than names. The alternatives all read worse here: "I'll do that" re-commits
   * to something the user has just committed to, and a navigation label ("Back
   * to today") names the mechanism rather than the intent.
   *
   * APPROVED by Kyle on device, 2026-09-06, during the 3c-ii walk, and the
   * draft marker cleared in the follow-up commit. Owner Kyle because it is a UI
   * button label rather than efficacy-adjacent copy. Read in place, in the
   * confirmed state it dismisses, rather than off a list. Revising it reopens
   * the section 18 tension above; do not treat the absence of a marker as
   * meaning nobody weighed it.
   */
  confirmedPrimary: 'Got it',
  /** Shown in place of navigating away when the seed write fails. */
  saveFailed: 'That did not save. Try again.',
} as const;

/**
 * The three slot menus, verbatim. Six options each, single selection only.
 *
 * KEYED BY ReplacementSlot, which cannot hold 'varies'. A capture whose timing
 * varies never reaches this screen; see `replacementSlotFor` in routing.ts.
 */
export const REPLACEMENT_MENUS = {
  morning: [
    { id: 'morning_get_ready', label: 'Get ready without checking my phone' },
    { id: 'morning_coffee', label: 'Make coffee or breakfast without scrolling' },
    { id: 'morning_outside', label: 'Step outside for a few minutes' },
    { id: 'morning_move', label: 'Move for a few minutes' },
    { id: 'morning_write', label: 'Write down what matters today' },
    { id: 'morning_read', label: 'Read a few pages' },
  ],
  day: [
    { id: 'day_break', label: 'Take a real break without my phone' },
    { id: 'day_walk', label: 'Walk for a few minutes' },
    { id: 'day_outside', label: 'Step outside' },
    { id: 'day_eat', label: 'Get something to eat or drink' },
    { id: 'day_read', label: 'Read a few pages' },
    { id: 'day_reset', label: 'Reset my space for a few minutes' },
  ],
  evening: [
    { id: 'evening_phone_away', label: 'Put my phone away' },
    { id: 'evening_read', label: 'Read for a bit' },
    { id: 'evening_write', label: "Write down what's still on my mind" },
    { id: 'evening_stretch', label: 'Stretch for a few minutes' },
    { id: 'evening_tomorrow', label: 'Get tomorrow set up' },
    { id: 'evening_offscreen', label: 'Do something off-screen' },
  ],
} as const;

/**
 * The neutral confirmations, verbatim from `Content Pack v1 §decisions-3`.
 *
 * THESE, NOT THE THREE IN THE PACK'S §replacement-menus DELIVERY. Those three
 * presume a reminder was set ("We'll bring this up in the morning") and return
 * only when slice 9 adds the reminder step. Using them here would promise a
 * nudge this build cannot send.
 */
export const REPLACEMENT_CONFIRMATIONS = {
  morning: "That's your morning option.",
  day: "That's there when you want it today.",
  evening: "That's your evening option.",
} as const;
