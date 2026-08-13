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

/**
 * How the iOS picker presents itself.
 *
 * `overlay` (the default) is the original: a scrimmed sheet pinned to the
 * bottom of the screen, absolutely positioned over whatever rendered it. Every
 * reminder-path caller uses this and its styling is unchanged.
 *
 * `inline` renders the same header and wheel as a PLAIN BLOCK with no scrim and
 * no absolute positioning, so a caller can swap it in place of its own content
 * as a full takeover. Added in TB-1b: stacking the overlay inside an already
 * open modal left the form visible between the two layers, which read as two
 * competing sheets. Android is unaffected either way — it defers to the system
 * dialog, which is a true modal and never bled through.
 */
export type TimePickerPresentation = 'overlay' | 'inline';

interface TimePickerSheetProps {
  visible: boolean;
  /** Seed value. The component holds its own draft while open. */
  value: ReminderTime;
  /** Called ONCE, with the committed time. */
  onChange: (next: ReminderTime) => void;
  /** Dismiss without committing. */
  onClose: () => void;
  title?: string;
  /** Defaults to 'overlay', the original presentation. */
  presentation?: TimePickerPresentation;
  /** Label for the inline presentation's bottom primary. Ignored by overlay. */
  commitLabel?: string;
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
  presentation = 'overlay',
  commitLabel = 'Use this time',
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

  const inline = presentation === 'inline';

  // Identical in both presentations: same draft, same single commit on Done,
  // same discard on Cancel. Only the chrome around it differs.
  const commit = () => {
    onChange(draft);
    onClose();
  };

  const body = (
    <View style={inline ? styles.inlineContainer : styles.container}>
      <View style={inline ? styles.inlineHeader : styles.header}>
        <TouchableOpacity
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cancel, discard this time"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          testID="time-picker-cancel"
        >
          <Text style={inline ? styles.inlineTertiary : styles.cancel}>Cancel</Text>
        </TouchableOpacity>

        <Text style={inline ? styles.inlineTitle : styles.title}>{title}</Text>

        {/* THE HEADER COMMIT EXISTS ONLY IN THE OVERLAY PRESENTATION. Inline
            moves it to a real primary below the wheel: a header text link is
            not weight-matched to the decision it commits, and the round-3 walk
            wanted the commit to look like the commit. Cancel stays here in both
            presentations, so there is still exactly one way out and one way
            forward. */}
        {inline ? (
          <View style={styles.inlineHeaderSpacer} />
        ) : (
          <TouchableOpacity
            onPress={commit}
            accessibilityRole="button"
            accessibilityLabel="Done, use this time"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            testID="time-picker-done"
          >
            <Text style={styles.done}>Done</Text>
          </TouchableOpacity>
        )}
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

      {/* Inline only: the sole commit, as a full-width brand primary. */}
      {inline && (
        <TouchableOpacity
          style={styles.inlinePrimary}
          onPress={commit}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={commitLabel}
          testID="time-picker-commit"
        >
          <Text style={styles.inlinePrimaryLabel}>{commitLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (inline) {
    // No scrim and no absolute positioning: the caller has already cleared the
    // space this occupies, so anything layered here would be the very
    // stacked-sheet effect this presentation exists to remove.
    return (
      <View accessibilityViewIsModal testID="time-picker-sheet">
        {body}
      </View>
    );
  }

  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      testID="time-picker-sheet"
    >
      {body}
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
  // ---- inline (takeover) presentation ----
  // Mist White ground, spacing-lg padding, wheel centred. No radius and no
  // shadow: this IS the sheet's content, not a card floating inside it.
  inlineContainer: {
    backgroundColor: Colors.mistWhite,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
  },
  inlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  // H3, Evergreen Teal, per the type scale.
  inlineTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  // Tertiary text buttons (standards 7.1): teal label, no fill, no border.
  // Cancel and Done are deliberately the SAME weight here. Done is the only
  // commit, but making it louder would re-create the "which one owns my
  // choice" ambiguity the takeover exists to remove.
  // Holds the Cancel/title layout symmetrical now that Done has moved out.
  inlineHeaderSpacer: {
    width: 56,
  },
  // Full-width brand primary, 48px, per standards 7.1.
  inlinePrimary: {
    minHeight: 48,
    marginTop: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  inlinePrimaryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  inlineTertiary: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    minHeight: 24,
  },
});

export default TimePickerSheet;
