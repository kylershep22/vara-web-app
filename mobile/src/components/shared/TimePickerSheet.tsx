/**
 * TimePickerSheet
 *
 * A shared {hour, minute} time picker. Extracted from the pattern in
 * NotificationSettingsScreen, which is copy-pasted at six call sites; only the
 * two new per-habit-reminder sites use this component so far.
 *
 * Three defects in the original are fixed here, and none should be reintroduced:
 *
 *  1. CANCEL DISCARDS. The original wired iOS Cancel and Done to the same
 *     `closeTimePicker`, so Cancel could not cancel anything.
 *  2. ONE COMMIT, NOT ONE PER TICK. The original committed inside the picker's
 *     onChange, which on an iOS spinner fires continuously while scrolling —
 *     one Firestore write per tick. The draft lives in local state here and
 *     `onChange` is called exactly once, on Done.
 *  3. ACCESSIBILITY. Cancel/Done are real buttons, and the iOS overlay is
 *     marked as modal so screen-reader focus cannot wander behind it.
 *
 * Android keeps its platform behaviour: the system dialog's own OK commits
 * immediately and its dismissal cancels, so there is no second Done to press.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { ReminderTime } from '../../types';

interface TimePickerSheetProps {
  visible: boolean;
  /** Seed value. The component holds its own draft while open. */
  value: ReminderTime;
  /** Called ONCE, with the committed time. */
  onChange: (next: ReminderTime) => void;
  /** Dismiss without committing. */
  onClose: () => void;
  title?: string;
}

/**
 * "7:30 AM", for the row that opens this sheet.
 *
 * Co-located rather than imported from notificationPreferences.service (which
 * has an identical formatter) so that a presentational component never pulls
 * firebase in at module load. This codebase has a history of eager
 * module-initialisation cascades; a display string is not worth one.
 */
export function formatReminderTime(time: ReminderTime): string {
  const hour12 = time.hour % 12 || 12;
  const ampm = time.hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(time.minute).padStart(2, '0')} ${ampm}`;
}

function toDate(time: ReminderTime): Date {
  const d = new Date();
  d.setHours(time.hour, time.minute, 0, 0);
  return d;
}

function toReminderTime(date: Date): ReminderTime {
  return { hour: date.getHours(), minute: date.getMinutes() };
}

export const TimePickerSheet: React.FC<TimePickerSheetProps> = ({
  visible,
  value,
  onChange,
  onClose,
  title = 'Reminder time',
}) => {
  const [draft, setDraft] = useState<ReminderTime>(value);

  // Re-seed each time it opens, so a cancelled edit does not persist as the
  // starting point of the next one.
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value.hour, value.minute]);

  if (!visible) return null;

  if (Platform.OS !== 'ios') {
    return (
      <DateTimePicker
        value={toDate(draft)}
        mode="time"
        is24Hour={false}
        display="default"
        onChange={(event, selected) => {
          // Android fires once with 'set' (OK) or 'dismissed' (cancel).
          if (event.type === 'set' && selected) {
            onChange(toReminderTime(selected));
          }
          onClose();
        }}
      />
    );
  }

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      testID="time-picker-sheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel, discard this time"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="time-picker-cancel"
          >
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{title}</Text>

          <TouchableOpacity
            onPress={() => {
              onChange(draft);
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Done, use this time"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="time-picker-done"
          >
            <Text style={styles.done}>Done</Text>
          </TouchableOpacity>
        </View>

        <DateTimePicker
          value={toDate(draft)}
          mode="time"
          display="spinner"
          onChange={(_event, selected) => {
            // Draft only. Nothing leaves this component until Done.
            if (selected) setDraft(toReminderTime(selected));
          }}
          style={styles.picker}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Layout.borderRadius.lg,
    borderTopRightRadius: Layout.borderRadius.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  cancel: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    minHeight: 24,
  },
  done: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    minHeight: 24,
  },
  picker: {
    height: 200,
  },
});

export default TimePickerSheet;
