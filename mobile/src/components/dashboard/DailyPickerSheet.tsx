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
 * TIME IS A CHIP ROW, CAPACITY IS NOT, AND THE ASYMMETRY IS THE POINT. Both
 * questions used the same two-line OptionRow until this slice, and six of those
 * ran ~504pt of control into a ~532pt viewport: the time question rendered
 * below the fold and, because iOS only shows a scroll indicator while the
 * finger is down, nothing on screen said it was there. A question the user has
 * never seen cannot be a control, so it had to become visible BEFORE any matrix
 * cell gains a second time-length variant.
 *
 * Compressing time rather than capacity is deliberate. Capacity is the answer
 * that currently selects the protocol and its three tiers carry glosses the
 * user needs in order to choose; time is a single closed dimension with three
 * self-describing windows. Chips lose the gloss line, which is a real cost, so
 * they are spent on the question that can afford it. The glosses are not
 * discarded: they ride along as each chip's accessibility label (see below),
 * so a screen reader hears exactly what it heard before this slice.
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
  TIME_CHIP_LABELS,
  TIME_GLOSSES,
  TIME_LABELS,
} from './dailyPicker.copy';

const MIN_TOUCH_TARGET = 48;
// The chip's own painted height. Below the 48 floor on purpose: three of these
// share one row, and a 48pt-tall chip makes the row read as three buttons
// rather than as one answer with three settings. The gap to the floor is made
// up in hit slop below, so the TARGET is 48 even though the paint is 44.
const CHIP_HEIGHT = 44;
const CHIP_HIT_SLOP = (MIN_TOUCH_TARGET - CHIP_HEIGHT) / 2;

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
      {/* SINGLE-SELECT, and it stays that way: `setTime` replaces rather than
          toggles, so there is no path to zero selections. The picker always
          has an answer for both questions, which is what lets the confirm be
          one tap from a cold open. */}
      <View style={styles.chipRow}>
        {TIME_CLASSES.map((cls) => {
          const selected = time === cls;
          return (
            <TouchableOpacity
              key={cls}
              style={[styles.chip, selected ? styles.chipSelected : styles.chipDefault]}
              onPress={() => setTime(cls)}
              activeOpacity={0.8}
              // Painted at 44 so the row reads as one control; slop carries the
              // real target to the 48 floor. Left and right stay at zero: the
              // chips are 8 apart and horizontal slop would overlap a
              // neighbour's target, which is worse than a slightly narrow one.
              hitSlop={{ top: CHIP_HIT_SLOP, bottom: CHIP_HIT_SLOP, left: 0, right: 0 }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              // THE FULL LABEL AND THE GLOSS, not the short chip text. The
              // compression is a fit constraint on a 313pt row and nothing a
              // screen reader has to inherit, so what is announced here is
              // byte-identical to what the OptionRow announced before it.
              accessibilityLabel={`${TIME_LABELS[cls]}. ${TIME_GLOSSES[cls]}`}
              testID={`daily-pick-time-${cls}`}
            >
              <Text
                style={[styles.chipLabel, selected && styles.chipLabelSelected]}
                numberOfLines={2}
                // Chips are the one place the standards allow 12pt, and 12pt is
                // where Dynamic Type bites first. Two lines and a capped
                // multiplier let the label grow inside the row instead of
                // clipping; the row grows with it.
                maxFontSizeMultiplier={1.3}
              >
                {TIME_CHIP_LABELS[cls]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
  // Standards 10.4: Dew Sage fill with Charcoal text at rest, Teal fill with
  // white text when selected, pill radius, 12pt Medium, 8 apart. Amber is
  // available here as the screen's warm point but is NOT taken: capacity is
  // the answer that currently drives the protocol, and giving the inert
  // question the louder treatment would misrank the two.
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    // Equal thirds rather than content-sized, so the row reads as one control
    // with three settings instead of three loose buttons of ragged width.
    flex: 1,
    minHeight: CHIP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.pill,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: Colors.dewSageLight,
    borderColor: Colors.silverSage,
  },
  chipSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  chipLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: Colors.white,
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
