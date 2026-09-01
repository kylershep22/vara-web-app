/**
 * The daily picker (roadmap 3b-ii-b). Two questions, one confirm.
 *
 * PRESENTATIONAL, AND THAT IS THE SAFETY PROPERTY. This component owns no
 * write and no service call: it holds the two answers in local state and hands
 * them upwards once, when the user confirms. `hasPickedToday` keys on the time
 * field, so ANY write before the confirm would mark the day picked merely
 * because the sheet was opened and looked at. Keeping the write on the far side
 * of `onConfirm` is what makes that impossible rather than merely unlikely.
 *
 * PRE-FILLED, NOT PRE-COMMITTED. `initialCapacity` / `initialTime` arrive from
 * yesterday's row (or the day-one fallback) and are DISPLAY ONLY until
 * confirmed. An unchanged day is therefore one tap, which is the point: the
 * confirm is a daily affirmation, not a form.
 *
 * TIME IS COLLECTED HONESTLY AND DOES NOT CHANGE THE ANSWER YET. Every matrix
 * cell holds a single variant until the off-diagonal content is authored, so
 * the served protocol is capacity-driven. The copy for this question therefore
 * says nothing about what will be served; see TIME_GLOSSES.
 *
 * Built on EnhancedModal, the shared shell twelve other surfaces use, rather
 * than a hand-rolled Modal. `hasInputs={false}`: there is no text entry here,
 * so the keyboard machinery stays out of the way.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import { EnhancedModal } from '../shared/EnhancedModal';
import { OptionRow } from '../shared/OptionRow';
import {
  CAPACITY_TIERS,
  TIME_CLASSES,
  type CapacityTier,
  type TimeClass,
} from '../../protocolEngine';
import { CAPACITY_GLOSSES, CAPACITY_LABELS } from '../../constants/capacityCopy';
import {
  PICKER_COPY,
  TIME_GLOSSES,
  TIME_LABELS,
} from './dailyPicker.copy';

const MIN_TOUCH_TARGET = 48;

export interface DailyPickerSheetProps {
  visible: boolean;
  /** Yesterday's answer, or the day-one fallback. Display only until confirmed. */
  initialCapacity: CapacityTier;
  initialTime: TimeClass;
  /** The confirm write is in flight; the button is held so one tap stays one. */
  saving: boolean;
  /** The confirm write failed. The sheet stays open with the answer intact. */
  saveFailed: boolean;
  onConfirm: (capacity: CapacityTier, time: TimeClass) => void;
  onDismiss: () => void;
}

export const DailyPickerSheet: React.FC<DailyPickerSheetProps> = ({
  visible,
  initialCapacity,
  initialTime,
  saving,
  saveFailed,
  onConfirm,
  onDismiss,
}) => {
  // Seeded from the pre-fill and thereafter local. Nothing leaves this
  // component until the confirm below.
  const [capacity, setCapacity] = useState<CapacityTier>(initialCapacity);
  const [time, setTime] = useState<TimeClass>(initialTime);

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={onDismiss}
      title={PICKER_COPY.title}
      hasInputs={false}
      showCloseButton={false}
      maxHeightPercent="auto"
      testID="daily-pick-sheet"
      footer={
        <View>
          {/* The failure sits ABOVE the button it belongs to, and the sheet
              stays open: the user's two answers are still on screen and a
              retry costs one tap rather than the whole flow again. */}
          {saveFailed && (
            <Text style={styles.error} testID="daily-pick-error">
              {PICKER_COPY.saveFailed}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.confirm, saving && styles.confirmDisabled]}
            onPress={() => onConfirm(capacity, time)}
            disabled={saving}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
            accessibilityLabel={PICKER_COPY.confirm}
            testID="daily-pick-confirm"
          >
            <Text style={styles.confirmLabel}>{PICKER_COPY.confirm}</Text>
          </TouchableOpacity>

          {/* SKIP WRITES NOTHING, exactly like opening the sheet. It is the
              same handler as the scrim and the back button: a pure dismiss.
              The day stays unpicked, the hero returns to its resting state,
              and the sheet is re-openable for the rest of the day with the
              same pre-fill, because nothing about the skip touched it. */}
          <TouchableOpacity
            style={styles.skip}
            onPress={onDismiss}
            accessibilityRole="button"
            accessibilityLabel={PICKER_COPY.skip}
            testID="daily-pick-skip"
          >
            <Text style={styles.skipLabel}>{PICKER_COPY.skip}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <Text style={styles.question}>{PICKER_COPY.capacityQuestion}</Text>
      {CAPACITY_TIERS.map((tier) => (
        <OptionRow
          key={tier}
          label={CAPACITY_LABELS[tier]}
          description={CAPACITY_GLOSSES[tier]}
          selected={capacity === tier}
          onPress={() => setCapacity(tier)}
          testID={`daily-pick-capacity-${tier}`}
        />
      ))}

      <Text style={[styles.question, styles.secondQuestion]}>
        {PICKER_COPY.timeQuestion}
      </Text>
      {TIME_CLASSES.map((cls) => (
        <OptionRow
          key={cls}
          label={TIME_LABELS[cls]}
          description={TIME_GLOSSES[cls]}
          selected={time === cls}
          onPress={() => setTime(cls)}
          testID={`daily-pick-time-${cls}`}
        />
      ))}
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  question: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  secondQuestion: {
    marginTop: Spacing.lg,
  },
  confirm: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  confirmDisabled: { opacity: 0.4 },
  confirmLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  // Quiet and unbordered: skipping is always available and is never the thing
  // being asked for, but it is also not a failure state and gets no warning
  // colour. Muted Sage Gray, the same weight as any other secondary label.
  skip: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  error: {
    marginBottom: Spacing.sm,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
  },
});
