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
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { TODAY_COPY } from '../../screens/weekly/copy';

const MIN_TOUCH_TARGET = 48;

export interface CloseWeekEntryProps {
  onPress: () => void;
}

export const CloseWeekEntry: React.FC<CloseWeekEntryProps> = ({ onPress }) => (
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
});
