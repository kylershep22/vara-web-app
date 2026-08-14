/**
 * Add a block (TB-1b, mockup B). The demand row is mockup D's, because B draws
 * the task arriving from Tasks with its tag already on and TB-1b has no Tasks
 * screen to arrive from.
 *
 * THAT ARRIVAL EXISTS AS OF TB-3 (`seed`). A task tapped "Block it" on the Tasks
 * screen opens this sheet with its title and demand already filled, which is
 * what mockup B's annotation describes: "The task arrives from Tasks with its
 * demand tag already on. Typing a fresh one here also works." What the mockup
 * does NOT draw, and what is therefore deliberately absent, is a control for
 * PICKING a task from inside this sheet. Arriving and picking are two different
 * features and only the first is drawn; the picker is deferred.
 *
 * PRESENTATIONAL, AND THAT IS THE SAFETY PROPERTY, exactly as DailyPickerSheet
 * states it: this component owns no write and no service call. It holds the
 * draft in local state and hands it upward once, on confirm. The screen owns
 * createDayBlock. Keeping the write on the far side of `onConfirm` is what makes
 * a half-built block impossible to persist rather than merely unlikely.
 *
 * ONE PRIMARY ACTION. With a suggestion that is "Place it there"; without one it
 * is "Save". The no-rhythms invitation is a text LINK, never a second button,
 * and "I'll choose a time" is a text button per the mockup's note that it is a
 * first-class exit rather than a buried link.
 *
 * THE CLOCK IS INJECTED (`now`). The sheet turns a zone suggestion into a
 * concrete Date, so it needs today's date; reading it internally would make
 * every test time-dependent.
 *
 * Built on EnhancedModal, the shared shell. Unlike DailyPickerSheet this one
 * passes hasInputs — there is a text field here — which is a path
 * DailyPickerSheet does not exercise. Keyboard behaviour on device is on the
 * walk plan for exactly that reason.
 */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Switch } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { EnhancedModal } from '../../components/shared/EnhancedModal';
import { SelectChip } from '../../components/shared/SelectChip';
import {
  TimePickerSheet,
  formatReminderTime,
} from '../../components/shared/TimePickerSheet';
import type { DayBlock, Demand } from '../../types/models';
import type { ReminderTime } from '../../types/models';
import type { TimedRhythmKey } from '../../constants/focusRhythms';
import { FOCUS_RHYTHM_OPTIONS } from '../../constants/focusRhythms';
import type { PlacementSuggestion } from './suggestPlacement';
import {
  CHOOSE_A_TIME,
  CHOOSE_START_TIME_ROW,
  SUGGESTION_RESELECT,
  TIME_PICKER_TITLE,
  startsAtRow,
  DEMAND_LABELS,
  DURATION_LABELS,
  LABEL_DEMAND,
  LABEL_HOW_LONG,
  LABEL_RHYTHMS,
  LABEL_WHAT,
  EDIT_INTRO,
  EDIT_TITLE,
  REMOVE_BLOCK,
  SAVE_CHANGES,
  NO_RHYTHMS_INVITATION,
  PLACE_IT_THERE,
  USE_THIS_TIME,
  overlapMessage,
  missingFieldsHint,
  PROTECT_TOGGLE,
  SAVE_BLOCK,
  SAVE_FAILED,
  SHEET_INTRO,
  SHEET_TITLE,
  TITLE_PLACEHOLDER,
  VARIES_LINE,
  formatTimeRange,
  suggestionSlot,
  suggestionText,
} from './blocksCopy';

const MIN_TOUCH_TARGET = 48;
const INPUT_ACCESSORY_ID = 'add-block-title';

/** The durations offered at MVP. Stored as a plain number on the block. */
export const DURATION_OPTIONS = [30, 60, 90];
const DEMAND_OPTIONS: Demand[] = ['light', 'medium', 'heavy'];

/**
 * DEMAND HAS NO DEFAULT, DELIBERATELY.
 *
 * "How much does this take out of you?" is a felt question. Pre-selecting an
 * answer assigns the user a state rather than acknowledging one, which is the
 * same reason the mockup leans toward requiring the tag at capture: it is one
 * tap and it is the whole model. An earlier pass defaulted this to 'medium' to
 * keep the primary always live; that traded the model away for a convenience
 * nobody asked for. Do not reintroduce a default here.
 *
 * Duration is the deliberate contrast: 30/60/90 is logistics, not a felt state,
 * so it keeps its default below.
 */

/**
 * Default duration.
 *
 * The mockup shows 90 selected, but that is its filled-in example for a heavy
 * task rather than a stated default. 60 is the neutral middle. Open for Jen.
 */
const DEFAULT_DURATION = 60;

/** Fallback manual start when there is no suggestion to seed from. */
const FALLBACK_START_HOUR = 9;

/**
 * A captured task this block is being created from (TB-3).
 *
 * PRE-FILL PLUS PROVENANCE, and nothing else. It seeds two fields the user
 * would otherwise retype and carries the id through to the write. It does not
 * decide the time, the duration, or the day — a task is timeless, so everything
 * about WHEN is still the user's answer here, exactly as it is for a block
 * started by hand.
 */
export interface BlockSeed {
  title: string;
  demand: Demand;
  sourceTaskId: string;
}

/** What the sheet hands up. The screen turns this into a createDayBlock call. */
export interface NewBlockDraft {
  title: string;
  demand: Demand;
  durationMinutes: number;
  startAt: Date;
  isProtected: boolean;
  /** Present only when the rhythm suggestion was accepted unchanged. */
  suggestedFrom?: TimedRhythmKey;
  /** Present only when the block was started from a captured task (TB-3). */
  sourceTaskId?: string;
}

export interface AddBlockSheetProps {
  visible: boolean;
  /** Already computed by the screen from the user's stored windows. */
  suggestion: PlacementSuggestion;
  /** Injected clock, so the concrete date is deterministic under test. */
  now: Date;
  /**
   * The DAY a manually-picked time lands on. Today on the Today tab, tomorrow
   * on the Tomorrow tab, and the block's own day when editing. Separate from
   * `now`, which stays the clock the suggestion reasons about.
   */
  dayAnchor: Date;
  /**
   * Suppresses the whole rhythm area and opens straight in manual mode.
   *
   * True when editing (adjusting a concrete time is not re-running placement)
   * and on the Tomorrow tab (the suggestion is about what comes NEXT, which may
   * well be today, so offering it while the user is deliberately planning
   * tomorrow would place the block on the wrong day).
   */
  manualOnly: boolean;
  /** Pre-fills the form and switches copy to edit mode. */
  initialBlock?: DayBlock | null;
  /**
   * Pre-fills a CREATE from a captured task (TB-3). Null for a hand-started
   * block, and mutually exclusive with initialBlock in practice: a seed makes a
   * block that does not exist yet, an initialBlock edits one that does. Where
   * both were somehow supplied, initialBlock wins every field below — editing a
   * real row must never be overwritten by a stale seed.
   */
  seed?: BlockSeed | null;
  /** Edit mode only. Confirms and removes; the screen owns the delete. */
  onRemove?: () => void;
  saving: boolean;
  saveFailed: boolean;
  /**
   * Title of an existing block the chosen window collides with, set by the
   * screen when a save is refused. Null when there is no conflict.
   */
  overlapWith: string | null;
  onConfirm: (draft: NewBlockDraft) => void;
  onDismiss: () => void;
  /** Opens FocusRhythms. Only reachable from the no-rhythms invitation. */
  onOpenRhythms: () => void;
}

/** The zone's sentence fragment, e.g. "in the mid-morning". */
function phraseFor(zoneKey: TimedRhythmKey): string {
  return FOCUS_RHYTHM_OPTIONS.find((o) => o.key === zoneKey)?.phrase ?? '';
}

/** The zone's standalone label, e.g. "Mid-morning". */
function labelFor(zoneKey: TimedRhythmKey): string {
  return FOCUS_RHYTHM_OPTIONS.find((o) => o.key === zoneKey)?.label ?? '';
}

/** A concrete Date on `now`'s day (or the next one) at the given hour. */
function dateAtHour(now: Date, hour: number, tomorrow: boolean): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + (tomorrow ? 1 : 0));
  d.setHours(hour, 0, 0, 0);
  return d;
}

export const AddBlockSheet: React.FC<AddBlockSheetProps> = ({
  visible,
  suggestion,
  now,
  dayAnchor,
  manualOnly,
  initialBlock,
  seed,
  onRemove,
  saving,
  saveFailed,
  overlapWith,
  onConfirm,
  onDismiss,
  onOpenRhythms,
}) => {
  const editing = !!initialBlock;
  // The rhythm area is offered only when there is something to suggest AND the
  // user is not deliberately placing into a specific day or fixing an existing
  // block.
  const hasSuggestion = suggestion.kind === 'ok' && !manualOnly;

  // Every field is seeded from the block when editing. The sheet is remounted
  // by key on each open, so these initialisers run exactly once per opening
  // and there is no stale-prop reconciliation to get wrong.
  // A seed fills the same two initialisers an edit does, and for the same
  // reason: both are answers the user has already given. Nothing about WHEN is
  // seeded — see the BlockSeed note.
  const [title, setTitle] = useState(initialBlock?.title ?? seed?.title ?? '');
  // Null until the user answers. See the note above on why there is no default.
  // A seeded demand is NOT a default: the user tagged the task, and this is
  // that answer carried over rather than one assigned on their behalf.
  const [demand, setDemand] = useState<Demand | null>(
    initialBlock?.demand ?? seed?.demand ?? null
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialBlock?.durationMinutes ?? DEFAULT_DURATION
  );
  const [isProtected, setIsProtected] = useState(initialBlock?.isProtected ?? false);
  // Set by tapping the primary before the block is complete, and never shown
  // once it is: the hint answers a question the user just asked by tapping.
  const [hintRequested, setHintRequested] = useState(false);

  // Manual mode is the only mode when there is nothing to suggest. When there
  // IS a suggestion, "I'll choose a time" is what flips this on, and it never
  // flips back: having overridden once, re-offering the suggestion as the
  // primary would quietly undo the user's choice.
  const [manual, setManual] = useState(!hasSuggestion);
  const [pickerOpen, setPickerOpen] = useState(false);

  /**
   * The manual start time, and NULL UNTIL THE USER PRESSES DONE.
   *
   * This nullability is the whole fix for the commit-semantics bug found on the
   * device walk. It used to be a pre-seeded ReminderTime, which meant Save had
   * something plausible to write from the moment manual mode opened — so
   * pressing Save while the picker was still up wrote the seed rather than the
   * value on the spinner, and nothing on screen said which one owned the
   * choice. There is now exactly one commit path: the picker's Done.
   *
   * The seed below is a DISPLAY starting point for the spinner only. It is
   * never a committed value and is never written.
   */
  const [committedTime, setCommittedTime] = useState<ReminderTime | null>(() => {
    if (!initialBlock) return null;
    // Editing starts with the block's own time already committed, so Save is
    // live immediately and the row shows a real value rather than a prompt.
    const d = initialBlock.startAt.toDate();
    return { hour: d.getHours(), minute: d.getMinutes() };
  });

  const seedHour = suggestion.kind === 'ok' ? suggestion.startHour : FALLBACK_START_HOUR;
  const pickerSeed: ReminderTime = committedTime ?? { hour: seedHour, minute: 0 };

  const suggestedStart = useMemo(
    () =>
      suggestion.kind === 'ok'
        ? dateAtHour(now, suggestion.startHour, suggestion.day === 'tomorrow')
        : null,
    [suggestion, now]
  );

  // Null until a time has been committed. There is no fallback: an uncommitted
  // manual block is incomplete and cannot be saved at all.
  // Built on the DAY ANCHOR, not on `now`: a time picked from the Tomorrow tab
  // has to land on tomorrow, and an edited block has to stay on its own day.
  const manualStart = useMemo(() => {
    if (!committedTime) return null;
    const d = new Date(dayAnchor);
    d.setHours(committedTime.hour, committedTime.minute, 0, 0);
    return d;
  }, [dayAnchor, committedTime]);

  const startAt = manual ? manualStart : suggestedStart;

  const needsTitle = title.trim().length === 0;
  const needsDemand = demand === null;
  // Manual mode has nothing to write until Done has been pressed once.
  const needsTime = startAt === null;
  const isComplete = !needsTitle && !needsDemand && !needsTime;
  const canSave = isComplete && !saving;
  const showHint = hintRequested && !isComplete;
  const hintText = missingFieldsHint(needsTitle, needsDemand, needsTime);

  /**
   * The primary stays TAPPABLE while it looks disabled.
   *
   * A truly disabled TouchableOpacity swallows the press, and a button that
   * dims with no explanation is the exact dead end the hint exists to prevent.
   * So the press is always handled: it either saves or says what is missing.
   * `saving` is the one case that genuinely blocks, so one tap stays one write.
   */
  const handlePrimary = () => {
    if (saving) return;
    if (!isComplete) {
      setHintRequested(true);
      return;
    }
    handleConfirm();
  };

  const handleConfirm = () => {
    // Narrowing only; handlePrimary is the sole caller and gates on isComplete.
    if (demand === null || startAt === null) return;
    onConfirm({
      title: title.trim(),
      demand,
      durationMinutes,
      startAt,
      isProtected,
      // Provenance is recorded ONLY when the suggestion was taken as offered. A
      // hand-picked time is not a rhythm placement, so it carries no zone.
      ...(!manual && suggestion.kind === 'ok'
        ? { suggestedFrom: suggestion.zoneKey }
        : {}),
      // Provenance, carried through untouched from the seed. Only on a create:
      // editing an existing block cannot establish a link that was not there,
      // and the patch type makes re-linking unrepresentable anyway.
      ...(seed && !editing ? { sourceTaskId: seed.sourceTaskId } : {}),
    });
  };

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={onDismiss}
      title={editing ? EDIT_TITLE : SHEET_TITLE}
      subtitle={editing ? EDIT_INTRO : SHEET_INTRO}
      hasInputs
      inputAccessoryViewID={INPUT_ACCESSORY_ID}
      showKeyboardToolbar
      // Standards 7.5: an explicit exit, not swipe/overlay dismiss alone. This
      // is EnhancedModal's built-in X, which is what most callers use (only
      // three surfaces opt out). Hidden while the picker has taken the sheet
      // over, so the takeover's Cancel is the single exit at that moment rather
      // than competing with an X that would close the whole sheet.
      //
      // Closing discards the draft. Nothing persists it, and the keyed remount
      // on reopen guarantees the next open starts clean.
      showCloseButton={!pickerOpen}
      // HEIGHT, third pass. "auto" (safe areas minus 40) came up short; 0.95
      // cleared the fold but the walk still read as cramped, and edit mode adds
      // a sixth row (Remove) below the five. EnhancedModal caps at
      // screenHeight * this, so 0.98 is effectively "as tall as the shell
      // allows" — its own 480 minHeight and internal padding still keep the
      // sheet off the very edges.
      //
      // Height alone was never going to fix "cramped": the breathing room comes
      // from the loosened rhythm in the styles below, and the cap is what stops
      // that extra room from reintroducing a scroll.
      maxHeightPercent={0.98}
      testID="add-block-sheet"
      // THE FOOTER IS GONE WHILE THE PICKER IS UP. Done and Save must never be
      // live at the same time: that ambiguity is the commit-semantics bug this
      // slice fixes, and removing the footer is what makes it structurally
      // impossible rather than merely unlikely.
      footer={
        pickerOpen ? undefined : (
        <View>
          {saveFailed && (
            <Text style={styles.error} testID="add-block-error">
              {SAVE_FAILED}
            </Text>
          )}
          {/* Soft Coral IS right here, unlike the Remove pane: a refused save
              is a genuine needs-attention state (standards 11.4). It names the
              block in the way so the fix is obvious rather than a hunt. */}
          {overlapWith && (
            <Text style={styles.error} testID="add-block-overlap">
              {overlapMessage(overlapWith)}
            </Text>
          )}
          {showHint && (
            <Text style={styles.hint} testID="add-block-hint">
              {hintText}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.primary, !canSave && styles.primaryDisabled]}
            onPress={handlePrimary}
            // NEITHER `disabled` NOR accessibilityState.disabled, DELIBERATELY,
            // and the two are the same decision: assistive tech refuses to
            // ACTIVATE a control it has been told is disabled, which would make
            // tap-to-learn-what-is-missing a sighted-only affordance. The
            // button is dimmed to 40% but remains genuinely activatable, and it
            // always answers. Never announce an activatable control as disabled.
            //
            // The incomplete state reaches screen readers through the hint
            // below instead, which is read on focus and needs no tap at all.
            // `saving` is guarded inside handlePrimary, so one tap is still one
            // write.
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityHint={isComplete ? undefined : hintText}
            testID="add-block-confirm"
          >
            <Text style={styles.primaryLabel}>
              {editing ? SAVE_CHANGES : manual ? SAVE_BLOCK : PLACE_IT_THERE}
            </Text>
          </TouchableOpacity>

          {/* Edit only. Separated from the primary by a divider so a
              destructive action is never adjacent to the confirm. Muted Sage
              Gray, not coral: removing a block you placed is housekeeping, per
              the round-3 rule. */}
          {editing && onRemove && (
            <View style={styles.removeZone}>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={onRemove}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={REMOVE_BLOCK}
                testID="add-block-remove"
              >
                <Text style={styles.removeLabel}>{REMOVE_BLOCK}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Only offered while the suggestion is still on the table. */}
          {!manual && hasSuggestion && (
            <TouchableOpacity
              style={styles.textButton}
              // Enters manual mode AND opens the picker in one move. Landing in
              // manual mode with no picker and no committed time would leave
              // the user staring at a dimmed Save with nothing obviously to do.
              onPress={() => {
                setManual(true);
                setPickerOpen(true);
              }}
              accessibilityRole="button"
              testID="add-block-choose-time"
            >
              <Text style={styles.textButtonLabel}>{CHOOSE_A_TIME}</Text>
            </TouchableOpacity>
          )}
        </View>
        )
      }
    >
      {/* THE PICKER IS A FULL TAKEOVER, not a second sheet. It replaces the
          form in place, in the same sheet, so nothing from the form is visible
          behind it. The first attempt layered TimePickerSheet's own scrimmed
          overlay inside this already-open modal, which left the duration chips
          bleeding through between the two layers and read as two competing
          sheets. Rendering the form at all while the picker is up is what
          caused that, so it is not rendered.

          Commit semantics are unchanged by the presentation swap: Done calls
          onChange, the only thing in this component that can set a manual time,
          and Cancel calls onClose alone and leaves the committed state exactly
          as it was. The title override matters because the component defaults
          to "Reminder time" for the per-habit reminder path, and blocks have no
          reminders of any kind. */}
      {pickerOpen ? (
        <TimePickerSheet
          visible
          presentation="inline"
          value={pickerSeed}
          title={TIME_PICKER_TITLE}
          commitLabel={USE_THIS_TIME}
          onChange={(next) => {
            setCommittedTime(next);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      ) : (
      <>
      <Text style={styles.fieldLabel}>{LABEL_WHAT}</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={TITLE_PLACEHOLDER}
        placeholderTextColor={Colors.mutedSageGray}
        inputAccessoryViewID={INPUT_ACCESSORY_ID}
        accessibilityLabel={LABEL_WHAT}
        testID="add-block-title"
      />

      <Text style={styles.fieldLabel}>{LABEL_DEMAND}</Text>
      <View style={styles.chipRow}>
        {DEMAND_OPTIONS.map((option) => (
          <SelectChip
            key={option}
            layout="row"
            label={DEMAND_LABELS[option]}
            selected={demand === option}
            onPress={() => setDemand(option)}
            testID={`add-block-demand-${option}`}
          />
        ))}
      </View>

      <Text style={styles.fieldLabel}>{LABEL_HOW_LONG}</Text>
      <View style={styles.chipRow}>
        {DURATION_OPTIONS.map((option) => (
          <SelectChip
            key={option}
            layout="row"
            label={DURATION_LABELS[option]}
            selected={durationMinutes === option}
            onPress={() => setDurationMinutes(option)}
            testID={`add-block-duration-${option}`}
          />
        ))}
      </View>

      {/* ---- the rhythm area, three states keyed to suggestPlacement ---- */}

      {suggestion.kind === 'ok' && !manualOnly && (
        // In manual mode the card stays, DE-EMPHASIZED and tappable, so going
        // manual is not a one-way door. It is dead as a placement until tapped:
        // `manual` alone decides what gets written, never this card's presence.
        <TouchableOpacity
          style={[styles.rhythmCard, manual && styles.rhythmCardMuted]}
          disabled={!manual}
          onPress={() => setManual(false)}
          accessibilityRole={manual ? 'button' : 'text'}
          accessibilityLabel={
            manual
              ? `${suggestionText(phraseFor(suggestion.zoneKey))} ${SUGGESTION_RESELECT}`
              : undefined
          }
          testID="add-block-suggestion"
        >
          <Text style={styles.rhythmLabel}>{LABEL_RHYTHMS}</Text>
          <Text style={styles.rhythmText}>
            {suggestionText(phraseFor(suggestion.zoneKey))}
          </Text>
          <View style={styles.slot}>
            {/* The one accent in the sheet: a single amber dot, per the
                mockup's note that the suggestion gets the whole accent budget. */}
            <View style={styles.slotDot} />
            <Text style={styles.slotLabel}>
              {suggestionSlot(
                labelFor(suggestion.zoneKey),
                formatTimeRange(suggestedStart!, durationMinutes),
                suggestion.day === 'tomorrow'
              )}
            </Text>
          </View>
          {manual && (
            <Text style={styles.reselect} testID="add-block-suggestion-reselect">
              {SUGGESTION_RESELECT}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {suggestion.kind === 'no-rhythms' && !manualOnly && (
        // A LINK, not a button: the sheet keeps one primary action.
        <TouchableOpacity
          onPress={onOpenRhythms}
          accessibilityRole="link"
          style={styles.invitationRow}
          testID="add-block-rhythms-invitation"
        >
          <Text style={styles.invitationText}>{NO_RHYTHMS_INVITATION}</Text>
        </TouchableOpacity>
      )}

      {suggestion.kind === 'varies' && !manualOnly && (
        // Neutral, and deliberately no link: they already answered.
        <Text style={styles.variesText} testID="add-block-varies">
          {VARIES_LINE}
        </Text>
      )}

      {/* The committed manual time, or the invitation to commit one. Either
          way it is the ONLY way back into the picker, and tapping it reopens
          the picker seeded from whatever is already committed. */}
      {manual && (
        <TouchableOpacity
          style={styles.timeRow}
          onPress={() => setPickerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={
            committedTime
              ? startsAtRow(formatReminderTime(committedTime))
              : CHOOSE_START_TIME_ROW
          }
          testID="add-block-time-row"
        >
          <Text style={[styles.timeValue, !committedTime && styles.timeValueEmpty]}>
            {committedTime
              ? startsAtRow(formatReminderTime(committedTime))
              : CHOOSE_START_TIME_ROW}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>{PROTECT_TOGGLE}</Text>
        <Switch
          value={isProtected}
          onValueChange={setIsProtected}
          trackColor={{ false: Colors.silverSage, true: Colors.evergreenTeal }}
          accessibilityLabel={PROTECT_TOGGLE}
          testID="add-block-protect"
        />
      </View>

      </>
      )}
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.4,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
    // Round 3 cut every marginTop a step to clear the fold. Round 4 gives the
    // room back, paired with the raised cap: clearing the fold was never the
    // same as being comfortable. Change these together, never one alone.
    marginTop: Spacing.base,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  rhythmCard: {
    marginTop: Spacing.base,
    backgroundColor: Colors.dewSageLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
  },
  rhythmLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.4,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  rhythmText: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  slotDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.sunriseAmber,
  },
  // Manual mode: the suggestion is no longer what will be written, so it steps
  // back visually. Still legible, still tappable, just not the answer any more.
  rhythmCardMuted: {
    opacity: 0.55,
  },
  reselect: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  slotLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  invitationRow: {
    marginTop: Spacing.base,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  invitationText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    textDecorationLine: 'underline',
  },
  variesText: {
    marginTop: Spacing.base,
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    color: Colors.mutedSageGray,
  },
  timeRow: {
    marginTop: Spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
  },
  timeValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  // Nothing committed yet: reads as a prompt rather than as a value.
  timeValueEmpty: {
    color: Colors.mutedSageGray,
  },
  toggleRow: {
    marginTop: Spacing.base,
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  primary: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  // Teal at 40% per the standards' disabled treatment, matching
  // DailyPickerSheet's confirm. Visual only: the press still lands.
  primaryDisabled: { opacity: 0.4 },
  // Brief hint at the standards' 11.5px caption size. Muted, never the error
  // coral: nothing has gone wrong, something is just not filled in yet.
  hint: {
    marginBottom: Spacing.sm,
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
  primaryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  // Sits below the primary with a rule above it: a destructive action must not
  // read as the next step after the confirm.
  removeZone: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  removeButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.mutedSageGray,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  removeLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  textButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  error: {
    marginBottom: Spacing.sm,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
});

export default AddBlockSheet;
