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
 * The decisions block in the mockup states "Up to 3 blocks a day. The cap is
 * framed as sufficiency, never scarcity." Screen A carries that framing in its
 * "Two blocks is plenty" line, but A2 REPLACES that line with the strip, so the
 * cap has no drawn copy surface in the variant being built. This is that
 * surface, written to the stated framing. Open for Jen, and see the report:
 * enforcing the cap at all is the single largest judgement call in this slice.
 */
export const SUFFICIENCY_LINE = gap('Three blocks is a full day of intent. The rest is yours.');

/** [mockup] A2 card chip, shown when isProtected. */
export const PROTECTED_CHIP = gap('Protected');

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

// ---- shared formatting ----

/**
 * "9:00 to 10:30", matching the mockup's card meta and suggestion slot.
 *
 * TWELVE-HOUR WITHOUT AM/PM, exactly as drawn. Note the drawing's own afternoon
 * card reads "2:00 to 2:30", which is ambiguous read alone; on the day view the
 * strip and the today-only scope disambiguate it. Flagged in the report as an
 * open item, and deliberately confined to this one function so adding a
 * meridiem later is a single edit.
 */
export function formatTimeRange(start: Date, durationMinutes: number): string {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return `${formatClock(start)} to ${formatClock(end)}`;
}

function formatClock(date: Date): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours12}:${minutes}`;
}
