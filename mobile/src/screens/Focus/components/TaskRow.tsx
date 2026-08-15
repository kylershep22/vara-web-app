/**
 * One captured task on the list (TB-2b mockup C .task, extended in TB-2c).
 *
 * TAPPABLE AS OF TB-2c, and the tap is the ONLY affordance. The Step-0 question
 * — swipe-to-clear or something else — was answered by the device walk: tap.
 * Swipe stays dead app-wide, so gesture-handler and reanimated are not
 * reintroduced here or in this feature's tests. The whole row is one target
 * that opens the edit sheet, where both changing and clearing live, which keeps
 * the screen's single primary action (capture) unchallenged.
 *
 * Why not a swipe, when the mockup suggested one: blocks shipped swipe-to-remove
 * in TB-1b and deleted it in TB-1c as undiscoverable, with no affordance drawn
 * for it. Re-introducing the same gesture on a neighbouring surface would have
 * re-run that experiment. Tap is discoverable by default and needs no hint
 * beyond the one this row announces.
 *
 * HALF OF THE MOCKUP'S TRAILING STATUS LANDS IN TB-3, and only half. Screen C
 * draws two trailing states — "Blocked · 9:00" and "Block it" — and they are
 * mutually exclusive on any given row. The STATUS is here, as a display-only
 * chip. The ACTION is not: it lives in the edit sheet this row opens, because
 * the mockup's own open question ("three tappables per group... or tap a task,
 * act from a sheet") was answered the same way TB-2c answered it for editing and
 * clearing. So the row still has exactly one target.
 *
 * THE CHIP IS NOT ITS OWN ACCESSIBILITY NODE. It folds into the row's single
 * label, on BlockCard's one-announcement pattern: a screen-reader user hears
 * "Q3 board deck. Blocked · 9:00 AM" as one string rather than walking two
 * nodes to assemble it. Nothing here is separately focusable.
 *
 * The demand is NOT repeated on the row. The group header already names it, so a
 * chip here would say the same word twice within 40 pixels.
 */
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../../constants';
import type { CapturedTask } from '../../../types/models';
import { ROW_A11Y_HINT } from '../tasksCopy';

export interface TaskRowProps {
  task: CapturedTask;
  /**
   * The already-formatted "Blocked · 9:00 AM" status, or null when this task
   * has no block on it (TB-3).
   *
   * A FORMATTED STRING RATHER THAN THE BLOCK, deliberately. The chip is the
   * only thing this row wants to know about blocks, so handing it the finished
   * text keeps DayBlock, blocksCopy and the clock formatter out of a task
   * component entirely. The screen derives it; this renders it.
   */
  blockedLabel?: string | null;
  onEdit: (task: CapturedTask) => void;
  testID?: string;
}

export const TaskRow: React.FC<TaskRowProps> = ({
  task,
  blockedLabel,
  onEdit,
  testID,
}) => {
  const handlePress = useCallback(() => onEdit(task), [onEdit, task]);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      // One announcement carrying everything the row shows, so the chip is heard
      // as part of the task rather than as a second node to go and find.
      accessibilityLabel={
        blockedLabel ? `${task.title}. ${blockedLabel}` : task.title
      }
      // The row carries no visible chevron or handle — it is a calm list, not a
      // settings menu — so this line is how a screen-reader user learns the tap
      // does anything at all.
      accessibilityHint={ROW_A11Y_HINT}
      testID={testID}
    >
      <Text style={styles.name} numberOfLines={1}>
        {task.title}
      </Text>
      {/* DISPLAY ONLY. Not a button, not focusable, and deliberately carrying no
          testID-bearing touchable: the whole row is the target and adding a
          second one here is the thing this design decided against. */}
      {blockedLabel && (
        <View style={styles.status} importantForAccessibility="no">
          <Text style={styles.statusLabel} testID={`task-blocked-${task.id}`}>
            {blockedLabel}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // The mockup's .task: a plain white card at a comfortable tap height, which
  // it already had in TB-2b — adding the gesture changed no geometry.
  row: {
    minHeight: 48,
    // Was justifyContent alone. The chip made this a two-column row, so the
    // name takes the room it needs and the status sits against the trailing
    // edge, exactly as mockup C draws it.
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  name: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
    // The name yields to the status rather than pushing it off the row. One
    // line, truncated: a wrapped task name next to a chip reads as two rows.
    flex: 1,
  },
  // Quiet by design. This is a STATE, not an action and not a warning, so it
  // gets no border, no accent and none of the error colour: Muted Sage Gray on
  // the row's own surface, at the caption size the group headers use.
  status: {
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
});

export default TaskRow;
