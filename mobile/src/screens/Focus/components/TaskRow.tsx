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
 * The mockup's trailing status — "Block it", "Blocked · 9:00" — is still absent:
 * that column is the task-to-block bridge, which is TB-3.
 *
 * The demand is NOT repeated on the row. The group header already names it, so a
 * chip here would say the same word twice within 40 pixels.
 */
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Colors, Layout, Spacing, TextStyles } from '../../../constants';
import type { CapturedTask } from '../../../types/models';
import { ROW_A11Y_HINT } from '../tasksCopy';

export interface TaskRowProps {
  task: CapturedTask;
  onEdit: (task: CapturedTask) => void;
  testID?: string;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, onEdit, testID }) => {
  const handlePress = useCallback(() => onEdit(task), [onEdit, task]);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={task.title}
      // The row carries no visible chevron or handle — it is a calm list, not a
      // settings menu — so this line is how a screen-reader user learns the tap
      // does anything at all.
      accessibilityHint={ROW_A11Y_HINT}
      testID={testID}
    >
      <Text style={styles.name}>{task.title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // The mockup's .task: a plain white card at a comfortable tap height, which
  // it already had in TB-2b — adding the gesture changed no geometry.
  row: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  name: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
  },
});

export default TaskRow;
