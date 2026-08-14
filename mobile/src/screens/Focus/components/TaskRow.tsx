/**
 * One captured task on the list (TB-2b, mockup C .task).
 *
 * INFORMATIONAL, AND THAT IS THE WHOLE COMPONENT AT TB-2b. The mockup draws a
 * trailing status on each row — "Block it" on an unplaced task, "Blocked · 9:00"
 * on a placed one — and that entire column is the task-to-block bridge, which is
 * TB-3. Clearing is TB-2c. So this slice ships the row with no trailing control,
 * no onPress and no gesture: a name and its group, nothing else.
 *
 * Deliberately NOT built as a tappable card "for later". A card that looks
 * actionable and does nothing is the exact thing ComingSoonCard exists to avoid,
 * and BlockCard's TB-1b/1c history is the same lesson twice — an affordance
 * arrives when the behaviour behind it does.
 *
 * The demand is NOT repeated on the row. The group header already names it, so a
 * chip here would say the same word twice within 40 pixels. This is the one
 * place the row differs from BlockCard, which has no grouping to lean on.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Spacing, TextStyles } from '../../../constants';
import type { CapturedTask } from '../../../types/models';

export interface TaskRowProps {
  task: CapturedTask;
  testID?: string;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, testID }) => (
  // One accessible node with role "text", like ComingSoonCard: the row is
  // static content, so it is readable but never lands in the actionable order.
  <View
    style={styles.row}
    accessible
    accessibilityRole="text"
    accessibilityLabel={task.title}
    testID={testID}
  >
    <Text style={styles.name}>{task.title}</Text>
  </View>
);

const styles = StyleSheet.create({
  // The mockup's .task: a plain white card, generous tap-height even though
  // nothing is tappable yet, so adding the TB-2c gesture changes no geometry.
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
