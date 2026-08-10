/**
 * The entry to the weekly close (spec 8) on Home.
 *
 * Ported from WeeklyTodayScreen.tsx:426-434. Outlined and last on the surface,
 * like the re-set control and for the same reason: spec 9 allows Home ONE
 * primary action and that is the daily completion control in the hero above.
 *
 * This is a deliberate entry, not the real trigger. The close belongs to an
 * elapsed week, and routing on that boundary is a follow-up on the entry guard.
 * Nothing checks the boundary here, so nothing here pretends a week has ended.
 *
 * The analytics event lives in useWeeklyCloseEntry, which must fire it on the
 * tap and before the navigation.
 *
 * TWO STATES, and the closed one REPLACES the entry rather than hiding it.
 * `closeCompletedAt` has been written on every closed week since the close
 * shipped and was read by nothing, so the entry stayed on screen and stayed
 * tappable: the close felt like a loop with no completion, and a second close
 * was a legal re-write that overwrote the first. Hiding the button would stop
 * that, but it answers "can I close again?" without answering "did it work?",
 * and not knowing whether the close had landed is the other half of the report.
 *
 * The acknowledgment is a plain statement and is NOT tappable: there is nothing
 * left to do here, and a control in this slot would be a second CTA competing
 * with today's completion control in the hero above. It is identical whether
 * the floor held or not; the count that follows from that answer is rendered
 * elsewhere, under its own three-state rule.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { TODAY_COPY } from '../../screens/weekly/copy';

const MIN_TOUCH_TARGET = 48;

export interface CloseWeekEntryProps {
  /** The week has been closed: `closeCompletedAt` is set on the cycle. */
  closed: boolean;
  onPress: () => void;
}

export const CloseWeekEntry: React.FC<CloseWeekEntryProps> = ({ closed, onPress }) =>
  closed ? (
    <View style={styles.closedNote} testID="home-week-closed">
      <Text style={styles.closedLabel}>{TODAY_COPY.weekClosed}</Text>
    </View>
  ) : (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={TODAY_COPY.closeEntry}
      testID="home-close-entry"
    >
      <Text style={styles.label}>{TODAY_COPY.closeEntry}</Text>
    </TouchableOpacity>
  );

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
  // Deliberately unlike the button above: no border, no teal, no touch-target
  // height. It should not read as a control that has been switched off, because
  // it is not a control at all.
  closedNote: {
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
  },
  closedLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
});
