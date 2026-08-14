// Every user-facing string for the Blocks day view and the add-a-block sheet
// (TB-1b). One file so changing the voice is a string edit and never a
// structural one.
//
// [COPY GAP] markers render ON SCREEN, per the weekly-loop and Stress Recovery
// convention: nobody should mistake a walkthrough build for finished product.
// Removing a marker is a copy decision and belongs to Jen.
//
// EVERYTHING HERE IS DRAFT, INCLUDING THE LINES LIFTED VERBATIM FROM THE
// MOCKUP. The mockup's own header says "All copy is draft for Jen to react to",
// so a string being in the drawing is not the same as it being approved. Marked
// below: [mockup] = taken from Vara_Blocks_and_Tasks_Mockups.html as-is,
// [new] = written for this build because the mockup had no line for it.
//
// No em dashes anywhere in this file, per the app-wide rule.

const gap = (text: string) => `[COPY GAP] ${text}`;

// ---- day view (mockup A2) ----

/** [mockup] A2 h1. */
export const DAY_TITLE = gap("Today's blocks");
/** [mockup] A2 sub. */
export const DAY_INTRO = gap('Decide when it happens. Then put it down until then.');
/** [mockup] A2 .shapecap, under the strip. */
export const STRIP_CAPTION = gap(
  'The shaded stretch is when your focus tends to run strongest.'
);
/** [mockup] A2 primary button. The one primary action on this screen. */
export const ADD_BLOCK_CTA = gap('Add a block');

/**
 * [new] Empty state. The mockup draws no empty day, so this is written to the
 * UI standards' warm-one-liner rule: an invitation, never a deficit ("no blocks
 * yet", "you haven't planned anything").
 */
export const EMPTY_LINE = gap('Nothing placed yet. Pick one thing and give it a window.');

/**
 * [new] Shown in place of the Add CTA once the day holds MAX_BLOCKS_PER_DAY.
 *
 * The decisions block in the mockup states the cap "is framed as sufficiency,
 * never scarcity." Screen A carries that framing in its "Two blocks is plenty"
 * line, but A2 REPLACES that line with the strip, so the cap has no drawn copy
 * surface in the variant being built. This is that surface.
 *
 * COUNT-AGNOSTIC ON PURPOSE. It said "Three blocks..." while the cap was three;
 * the round-3 walk moved the cap to six and the copy would have silently
 * started lying. No number here, so the next cap change is a one-line constant
 * edit and nothing else. Open for Jen.
 */
export const SUFFICIENCY_LINE = gap("That's a full day of intent. The rest is yours.");

/** [mockup] A2 card chip, shown when isProtected. */
export const PROTECTED_CHIP = gap('Protected');

/**
 * [new] Caption on a faded card, so the fade reads as meaning rather than as a
 * rendering fault.
 *
 * THIS IS NOW THE ENTIRE PAST TREATMENT. Round 2 added it alongside an opacity
 * fade; round 3 removed the fade outright, because it was misread as a
 * rendering glitch in two consecutive walks including by the person who
 * specced it. Past blocks render at full opacity with this caption and nothing
 * else.
 *
 * Still no done state, no checkmark, and no past tense implying the block was
 * completed: it says WHEN, not whether.
 */
export const EARLIER_TODAY = gap('Earlier today');

/**
 * [new] The single destructive action on a card, revealed by swipe.
 *
 * "Remove", never "Delete forever", per the UI standards' language rule. The
 * swipe interaction itself is open for Jen; see the comment at its call site.
 */
export const REMOVE_ACTION = gap('Remove');

/** [new] Announced to screen readers for the swipe action. */
export const REMOVE_A11Y_HINT = gap('Removes this block from today');

// ---- add-a-block sheet (mockup B, demand row from mockup D) ----

/** [mockup] B h2. */
export const SHEET_TITLE = gap('Add a block');
/** [mockup] B sub. */
export const SHEET_INTRO = gap('One thing, one window.');
/** [mockup] B field label. */
export const LABEL_WHAT = gap('WHAT');
/** [new] The mockup shows this field pre-filled from Tasks, so it draws no placeholder. */
export const TITLE_PLACEHOLDER = gap('What is it?');
/** [mockup] D .demhint, reused here because B assumes the tag arrives from Tasks. */
export const LABEL_DEMAND = gap('How much does this take out of you?');
/** [mockup] B field label. */
export const LABEL_HOW_LONG = gap('HOW LONG');
/** [mockup] B .lbl above the suggestion. */
export const LABEL_RHYTHMS = gap('FOCUS RHYTHMS');

/** [mockup] D demand chips. Values map to the Demand type. */
export const DEMAND_LABELS = {
  light: gap('Light'),
  medium: gap('Medium'),
  heavy: gap('Heavy'),
} as const;

/** [mockup] B duration chips. */
export const DURATION_LABELS: Record<number, string> = {
  30: gap('30 min'),
  60: gap('60 min'),
  90: gap('90 min'),
};

/**
 * [mockup] B suggestion sentence, minus its second clause.
 *
 * The drawing reads "Your focus tends to run strongest in the morning. A heavy
 * block fits well there." The second sentence asserts a fit between the chosen
 * demand and the zone that nothing in the engine actually computes, so it is
 * left out rather than faked. The mockup's own open question asks Jen how much
 * mechanism to surface here, so this is exactly the line she is meant to react
 * to.
 *
 * `phrase` comes from FOCUS_RHYTHM_OPTIONS and already carries its preposition.
 */
export const suggestionText = (phrase: string) =>
  gap(`Your focus tends to run strongest ${phrase}.`);

/** [mockup] B .slot, the concrete window. Tomorrow gets its own prefix. */
export const suggestionSlot = (zoneLabel: string, range: string, tomorrow: boolean) =>
  gap(`${tomorrow ? 'Tomorrow ' : ''}${zoneLabel} ${'·'} ${range}`);

/** [mockup] B primary, shown only when there is a suggestion to accept. */
export const PLACE_IT_THERE = gap('Place it there');
/** [mockup] B text button. A first-class exit, not a buried link. */
export const CHOOSE_A_TIME = gap("I'll choose a time");
/** [new] The primary when there is no suggestion, so the sheet still has one. */
export const SAVE_BLOCK = gap('Save');

/**
 * [new, supplied in the TB-1b brief] The no-rhythms invitation.
 *
 * A text link, never a second button: the sheet keeps one primary action.
 */
export const NO_RHYTHMS_INVITATION = gap('Tell Vara when your focus runs strongest');

/**
 * [new] Shown when the user answered "It varies".
 *
 * Neutral and non-recruiting. They already answered, so there is no link and no
 * nudge to go answer again. Echoes RHYTHM_VARIES_SUMMARY's voice in rhythmRecall.
 */
export const VARIES_LINE = gap(
  "Your focus doesn't follow one fixed time, so pick a window that suits today."
);

/**
 * [new] The Protected toggle.
 *
 * The mockup omits this control entirely, but isProtected is a real field on
 * DayBlock and the decisions block calls a protected block "just a block marked
 * protected", so something has to set it. Default off. Open for Jen.
 */
export const PROTECT_TOGGLE = gap('Protect this block');

/** [new] Mirrors DailyPickerSheet's saveFailed treatment. */
export const SAVE_FAILED = gap("That didn't save. Try again?");

/**
 * [new] Confirmation after a block lands on TOMORROW.
 *
 * suggestPlacement rolls over to tomorrow once every window has passed, so an
 * evening user accepting the suggestion creates a block the today-only day view
 * cannot show. The block is correct; the list simply does not cover that day
 * yet. Without this line the save looks like it silently failed.
 *
 * Temporary by design: TB-1c adds the Tomorrow view and this stops being the
 * only evidence the block exists.
 */
export const placedForTomorrow = (zoneLabel?: string) =>
  gap(zoneLabel ? `Placed for tomorrow ${zoneLabel.toLowerCase()}` : 'Placed for tomorrow');

/**
 * [new] What is still missing, shown when the primary is tapped before the
 * block is complete.
 *
 * Names the gap rather than scolding: no "required", no "you must", no error
 * colour. Demand has no default because "how much does this take out of you?"
 * is a felt question and pre-filling it would assign the user a state instead
 * of acknowledging one, so the hint has to carry the ask instead.
 */
export function missingFieldsHint(
  needsTitle: boolean,
  needsDemand: boolean,
  needsTime = false
): string {
  if (needsTitle && needsDemand) return gap('Add a name and pick how much it takes.');
  if (needsTitle) return gap('Give it a name first.');
  if (needsDemand) return gap('Pick how much it takes out of you.');
  return gap('Choose a start time.');
}

// ---- the manual time path ----

/**
 * [new] The committed start time, shown as a row once Done is pressed.
 *
 * Uses a meridiem ("9:00 AM"), unlike the card meta and suggestion slot, which
 * follow the mockup's bare "9:00 to 10:30". A time the user just chose out of a
 * 24-hour spinner is the one place ambiguity would be indefensible, and the
 * mockup draws no manual-time row to be consistent with.
 */
export const startsAtRow = (time: string) => gap(`Starts at ${time}`);

/** [new] The same row before anything has been committed. Opens the picker. */
export const CHOOSE_START_TIME_ROW = gap('Choose a start time');

/**
 * [new] Header for the shared TimePickerSheet in this context.
 *
 * The component defaults to "Reminder time" for the per-habit reminder path it
 * was built for. Blocks have no reminders of any kind, so that default would be
 * an outright lie about what the app is about to do.
 */
export const TIME_PICKER_TITLE = gap('Start time');

/**
 * [new] Sits on the de-emphasized suggestion card once the user has gone
 * manual, naming the way back.
 */
export const SUGGESTION_RESELECT = gap('Use this instead');

// ---- shared formatting ----

/**
 * "9:00 AM to 10:30 AM", for the card meta and the suggestion slot.
 *
 * THE MERIDIEM IS LOAD-BEARING, and its absence caused a phantom bug.
 *
 * This followed the mockup exactly and rendered bare 12-hour times ("5:00 to
 * 6:00"). That makes a 5 AM block and a 5 PM block VISUALLY IDENTICAL. On the
 * round-3 walk a genuinely-past morning block sat next to a live evening block
 * showing the same string, one captioned and one not, and the whole past-ness
 * treatment was reported as broken. It was not: the predicate and the clock
 * behind it were correct, and a probe confirmed both. The display was lying.
 *
 * The ambiguity was flagged as an open copy item when this function was first
 * written and deferred. Deferring it cost a walk round. Do not remove the
 * meridiem to match the drawing again; take it to Jen as a copy change if the
 * drawing is to win.
 */
export function formatTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${formatClock(start)} to ${formatClock(end)}`;
}

function formatClock(date: Date): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const meridiem = hours24 >= 12 ? 'PM' : 'AM';
  return `${hours12}:${minutes} ${meridiem}`;
}

/**
 * [new] Refusal shown when the chosen window collides with an existing block.
 *
 * Names the conflicting block, because "that overlaps something" leaves the
 * user hunting. Soft Coral IS correct here, unlike the Remove pane: this is a
 * genuine needs-attention state that blocks the action (standards 11.4).
 */
export const overlapMessage = (conflictTitle: string) =>
  gap(`That window overlaps ${conflictTitle}. Pick a clear stretch.`);

/** [new] The picker takeover's commit, now a real primary rather than a header link. */
export const USE_THIS_TIME = gap('Use this time');

// ---- edit mode (TB-1c) ----

/** [new] Sheet title when opened on an existing block. */
export const EDIT_TITLE = gap('Edit block');
/** [new] Sheet subtitle in edit mode. */
export const EDIT_INTRO = gap('Change what it is, how long, or when.');
/** [new] Primary in edit mode. */
export const SAVE_CHANGES = gap('Save changes');
/** [new] The in-sheet destructive action, Muted Sage Gray per the round-3 rule. */
export const REMOVE_BLOCK = gap('Remove');

/**
 * [new] Remove confirmation, matching HabitDetailScreen's Alert pattern.
 *
 * "Remove", never "Delete forever". The confirm button is deliberately NOT
 * styled `destructive` there, for the reason that governs the button colour
 * too: removing a block you placed yourself is an intentional act, not an error.
 */
export const REMOVE_CONFIRM_TITLE = gap('Remove block');
export const REMOVE_CONFIRM_BODY = gap('This takes it off your day. You can add it back.');
export const REMOVE_CONFIRM_CANCEL = gap('Cancel');
export const REMOVE_CONFIRM_ACCEPT = gap('Remove');
export const REMOVE_FAILED = gap("That didn't remove. Try again?");

// ---- today / tomorrow (TB-1c) ----

/** [new] The two-option day control at the top of the day view. */
export const TAB_TODAY = gap('Today');
export const TAB_TOMORROW = gap('Tomorrow');

/** [new] Heading and intro when the Tomorrow tab is selected. */
export const TOMORROW_TITLE = gap("Tomorrow's blocks");
export const TOMORROW_INTRO = gap('Decide it now, so tomorrow starts already shaped.');

/** [new] Empty state on the Tomorrow tab. */
export const TOMORROW_EMPTY = gap('Nothing placed for tomorrow yet.');
