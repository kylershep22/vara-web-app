/**
 * Quick capture (TB-2b, mockup D).
 *
 * THE PLAIN FORM, AND THE ABSENCE IS THE DESIGN. A name and a demand tag. No
 * duration, no time, no rhythm suggestion, no picker takeover, no protected
 * toggle — none of AddBlockSheet's machinery, because a task is not a block.
 * The mockup's own annotation says it: "This is the entire capture form. Name
 * plus demand. The absence of every other field is the design."
 *
 * DOUBLES AS THE EDIT SHEET SINCE TB-2c, on the AddBlockSheet precedent: same
 * component, same two fields, seeded from the task and with the copy switched.
 * A separate edit sheet would be this file with different strings, and the two
 * would drift the first time the gate changed. Clearing lives at the bottom of
 * it, below a divider, because a task has nowhere else to put a destructive
 * action — there is no swipe, by decision (see the screen header).
 *
 * PRESENTATIONAL. It hands a draft up once and writes nothing itself — not even
 * the delete, which it only requests. Same split AddBlockSheet and
 * DailyPickerSheet use, and what lets an abandoned sheet leave nothing behind.
 *
 * DEMAND IS REQUIRED AND HAS NO DEFAULT. Same reasoning as the blocks sheet:
 * "how much does this take out of you?" is a felt question, and pre-selecting an
 * answer assigns the user a state rather than acknowledging one. The mockup
 * leans the same way — it is one tap and it is the whole model. Do not add a
 * default to make the primary always live; that trade was made once on the
 * blocks sheet and reverted.
 *
 * THE PRIMARY IS DIMMED BUT NEVER DISABLED, and this is the accessibility
 * decision carried over intact from the TB-1b demand amendment. Two halves, one
 * rule: (1) a truly `disabled` TouchableOpacity swallows the press, so a dimmed
 * button with no explanation becomes a dead end; (2) assistive tech refuses to
 * ACTIVATE a control announced as disabled, so "tap it to learn what is missing"
 * would be a sighted-only affordance. Hence: dim visually, never set
 * accessibilityState.disabled, expose the reason through accessibilityHint
 * (read on focus, no tap needed), and answer the tap with the hint.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { EnhancedModal } from '../../components/shared/EnhancedModal';
import { SelectChip } from '../../components/shared/SelectChip';
import { Colors, Layout, Spacing, Typography } from '../../constants';
import type { Demand } from '../../types/models';
import {
  CLEAR_TASK,
  DEMAND_LABELS,
  EDIT_INTRO,
  EDIT_TITLE,
  LABEL_DEMAND,
  SAVE_CHANGES,
  SAVE_CTA,
  SAVE_FAILED,
  SHEET_INTRO,
  SHEET_TITLE,
  TITLE_PLACEHOLDER,
  missingCaptureHint,
} from './tasksCopy';
import type { CapturedTask } from '../../types/models';

const MIN_TOUCH_TARGET = 48;
const INPUT_ACCESSORY_ID = 'capture-task-title';

const DEMAND_OPTIONS: Demand[] = ['light', 'medium', 'heavy'];

/** What the sheet hands up. The screen turns this into a createCapturedTask call. */
export interface NewTaskDraft {
  title: string;
  demand: Demand;
}

export interface CaptureTaskSheetProps {
  visible: boolean;
  saving: boolean;
  saveFailed: boolean;
  /** Pre-fills the form and switches copy to edit mode (TB-2c). */
  initialTask?: CapturedTask | null;
  /** Edit mode only. Confirms and clears; the screen owns the delete. */
  onClear?: () => void;
  onConfirm: (draft: NewTaskDraft) => void;
  onDismiss: () => void;
}

export const CaptureTaskSheet: React.FC<CaptureTaskSheetProps> = ({
  visible,
  saving,
  saveFailed,
  initialTask,
  onClear,
  onConfirm,
  onDismiss,
}) => {
  const editing = !!initialTask;

  // Both fields are seeded from the task when editing. The screen remounts this
  // by key on each open, so these initialisers run exactly once per opening and
  // there is no stale-prop reconciliation to get wrong.
  const [title, setTitle] = useState(initialTask?.title ?? '');
  // Null until the user answers, on capture. On an edit it starts wherever the
  // task already is — that is a recorded answer, not a default.
  const [demand, setDemand] = useState<Demand | null>(initialTask?.demand ?? null);
  // Set by tapping the primary before the capture is complete, and never shown
  // once it is: the hint answers a question the user just asked by tapping.
  const [hintRequested, setHintRequested] = useState(false);

  const needsTitle = title.trim().length === 0;
  const needsDemand = demand === null;
  const isComplete = !needsTitle && !needsDemand;
  const canSave = isComplete && !saving;
  const showHint = hintRequested && !isComplete;
  const hintText = missingCaptureHint(needsTitle, needsDemand);

  /**
   * The primary stays TAPPABLE while it looks disabled — it either saves or
   * says what is missing. `saving` is the one case that genuinely blocks, so
   * one tap stays one write.
   */
  const handlePrimary = () => {
    if (saving) return;
    if (!isComplete) {
      setHintRequested(true);
      return;
    }
    // Narrowing only; the isComplete gate above is the real guard.
    if (demand === null) return;
    onConfirm({ title: title.trim(), demand });
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
      // is EnhancedModal's built-in X. Closing discards the draft — nothing
      // persists it, and the keyed remount on reopen starts clean.
      showCloseButton
      testID="capture-task-sheet"
      footer={
        <View>
          {saveFailed && (
            <Text style={styles.error} testID="capture-task-error">
              {SAVE_FAILED}
            </Text>
          )}
          {showHint && (
            <Text style={styles.hint} testID="capture-task-hint">
              {hintText}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.primary, !canSave && styles.primaryDisabled]}
            onPress={handlePrimary}
            // NEITHER `disabled` NOR accessibilityState.disabled, deliberately.
            // See the header: announcing this disabled would stop assistive tech
            // activating it, which is how the user learns what is missing.
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityHint={isComplete ? undefined : hintText}
            testID="capture-task-confirm"
          >
            <Text style={styles.primaryLabel}>
              {editing ? SAVE_CHANGES : SAVE_CTA}
            </Text>
          </TouchableOpacity>

          {/* Edit only. Separated from the primary by a divider so a
              destructive action is never adjacent to the confirm, and Muted
              Sage Gray rather than coral: clearing a task you captured
              yourself is housekeeping, not an error. The TB-1c Remove
              precedent, treatment and placement both. */}
          {editing && onClear && (
            <View style={styles.clearZone}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={onClear}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={CLEAR_TASK}
                testID="capture-task-clear"
              >
                <Text style={styles.clearLabel}>{CLEAR_TASK}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      }
    >
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder={TITLE_PLACEHOLDER}
        placeholderTextColor={Colors.mutedSageGray}
        inputAccessoryViewID={INPUT_ACCESSORY_ID}
        accessibilityLabel={TITLE_PLACEHOLDER}
        testID="capture-task-title"
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
            testID={`capture-task-demand-${option}`}
          />
        ))}
      </View>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
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
  fieldLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.4,
    color: Colors.mutedSageGray,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  primary: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  // Teal at 40% per the standards' disabled treatment. Visual only: the press
  // still lands.
  primaryDisabled: { opacity: 0.4 },
  primaryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  // Sits below the primary with a rule above it: a destructive action must not
  // read as the next step after the confirm.
  clearZone: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  clearButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.mutedSageGray,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  clearLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  // Muted, never the error coral: nothing has gone wrong, something is just not
  // filled in yet.
  hint: {
    marginBottom: Spacing.sm,
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
  error: {
    marginBottom: Spacing.sm,
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
});

export default CaptureTaskSheet;
