/**
 * Good moments — the entry sheet (journey slice 8).
 *
 * A BOTTOM SHEET ON THE HabitNoteSheet PATTERN, NOT AN EnhancedModal. Twelve
 * surfaces in this app are built on EnhancedModal and none of them is a bottom
 * sheet: it is a centred container with an all-round radius, a 50% scrim, a
 * fade transition, a minimum height and no way to dismiss by tapping outside.
 * UI Standards 10.5 specifies a bottom sheet here — top radius 16, a 40 by 4
 * handle, a 30% overlay, a 300 to 350ms rise, dismissal by swipe, overlay tap
 * or an explicit control — and `HabitNoteSheet` is the one component in the app
 * that already is one. It is also the closest surface by shape: a short,
 * optional, free-text addendum that writes nothing if you walk away from it.
 * This file follows it deliberately rather than inventing a second sheet idiom.
 *
 * PRESENTATIONAL, AND THE WRITE IS SOMEONE ELSE'S. It holds the text, decides
 * whether Save is live, and renders whichever status it is handed. It performs
 * no write and owns no timer. That is the split DailyPickerSheet, AddBlockSheet
 * and CaptureTaskSheet all use, and it is what makes an abandoned sheet
 * incapable of leaving anything behind: there is no code path from dismissal to
 * Firestore because the sheet cannot reach Firestore at all.
 *
 * THE TEXT SURVIVES A FAILURE BECAUSE IT LIVES HERE. `text` is local state and
 * the sheet stays mounted through a failed save, so a retry is genuinely in
 * place: the user's words are still on screen, still editable, and the same
 * Save button is still the thing that sends them. Lifting the text to the
 * caller would have made this a prop-sync problem for no gain.
 *
 * SUCCESS AND FAILURE RENDER IN THE SAME SLOT, one line above the buttons.
 * Two positions would move the buttons under the user's thumb between the tap
 * and the result. One slot means the sheet's height does not change on either
 * outcome.
 *
 * SAVE IS GENUINELY DISABLED ON EMPTY, WHICH DIVERGES FROM CaptureTaskSheet
 * AND MATCHES HabitNoteSheet. CaptureTaskSheet dims but never disables its
 * primary, so that assistive tech can still activate it and hear which of its
 * two fields is missing. That reasoning does not reach here: there is one field,
 * its emptiness is what the user is looking at, and there is nothing a tap
 * could explain that the screen does not already say. UI Standards 14.5 asks a
 * disabled control to give a reason on tap; the relationship between an empty
 * field and an unavailable Save needs none. `accessibilityState.disabled` is
 * set so the control announces as dimmed rather than silently refusing.
 *
 * WHITESPACE IS NOT TEXT. The gate is `text.trim().length > 0`, so a field
 * holding only spaces cannot be saved and deleting back to empty disables the
 * button again on the same keystroke.
 *
 * NO PLACEHOLDER IN THE FIELD (Jen, 2026-09-12). See goodMoments.copy.ts.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import Text from '../shared/Text';
import TextInput from '../shared/TextInput';
import { Colors, Layout, SizeTokens, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  GOOD_MOMENT_CANCEL,
  GOOD_MOMENT_MAX_LENGTH,
  GOOD_MOMENT_PROMPT,
  GOOD_MOMENT_SAVE,
  GOOD_MOMENT_SAVE_FAILED,
  GOOD_MOMENT_SAVED,
} from './goodMoments.copy';

/** Downward drag past this many px dismisses the sheet. HabitNoteSheet's values. */
const DISMISS_DRAG_THRESHOLD = 80;
const DISMISS_VELOCITY_THRESHOLD = 0.5;

/**
 * What the sheet is currently showing.
 *
 * `saved` is a state rather than a callback because the sheet has to keep
 * rendering for as long as the acknowledgment is held. The caller decides how
 * long that is and closes the sheet itself.
 */
export type GoodMomentStatus = 'idle' | 'saving' | 'saved' | 'failed';

export interface GoodMomentSheetProps {
  visible: boolean;
  status: GoodMomentStatus;
  /** Handed the trimmed text. Never called with an empty string. */
  onConfirm: (text: string) => void;
  /** Cancel, swipe down, tap outside and hardware back all land here. */
  onDismiss: () => void;
}

export const GoodMomentSheet: React.FC<GoodMomentSheetProps> = ({
  visible,
  status,
  onConfirm,
  onDismiss,
}) => {
  const reduceMotion = useReducedMotion();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const dragY = useRef(new Animated.Value(0)).current;

  // Each opening starts empty. A moment belongs to the day it was typed, and
  // carrying abandoned text into a later opening would attach it to the wrong
  // one. This is also what makes "dismissing discards" true rather than merely
  // unobservable.
  useEffect(() => {
    if (visible) {
      setText('');
      setFocused(false);
      dragY.setValue(0);
    }
  }, [visible, dragY]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  const canSave = text.trim().length > 0 && status !== 'saving' && status !== 'saved';

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    onConfirm(trimmed);
  }, [text, onConfirm]);

  // Swipe down to dismiss, bound to the handle and prompt area only, so a drag
  // inside the text field selects text instead of closing the sheet.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          // Under Reduce Motion the sheet does not track the finger. The
          // gesture still dismisses on release, so the affordance survives.
          if (gesture.dy > 0 && !reduceMotion) dragY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_, gesture) => {
          if (
            gesture.dy > DISMISS_DRAG_THRESHOLD ||
            gesture.vy > DISMISS_VELOCITY_THRESHOLD
          ) {
            dismiss();
            return;
          }
          Animated.timing(dragY, {
            toValue: 0,
            duration: reduceMotion ? 0 : 200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragY, dismiss, reduceMotion]
  );

  return (
    <Modal
      visible={visible}
      transparent
      // `slide` is RN's bottom-sheet rise and lands inside 10.5's 300 to 350ms
      // window. Reduce Motion takes the fade instead: the sheet still arrives,
      // it just does not travel.
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={dismiss}
      testID="good-moment-sheet"
    >
      {/* Tap outside. A Pressable rather than a bare View is the whole
          difference between a dismissable sheet and a trapped one. */}
      <Pressable
        style={styles.overlay}
        onPress={dismiss}
        accessibilityLabel="Close without adding a good moment"
        accessibilityRole="button"
        testID="good-moment-sheet-overlay"
      >
        <View />
      </Pressable>

      <KeyboardAvoidingView
        // No keyboardVerticalOffset, deliberately: RN ADDS the offset to the
        // keyboard height, so a positive value here pushes the sheet further
        // off screen rather than clearing it. The sheet also carries no fixed
        // height, which is the other half of the same trap.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: dragY }] }]}
          accessibilityViewIsModal
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.handleContainer} accessibilityElementsHidden>
              <View style={styles.handle} />
            </View>

            {/* The prompt is the field's label (10.3: a label above the field,
                and never a label and a placeholder both). It is tied to the
                input by accessibilityLabel below rather than repeated. */}
            <Text style={styles.prompt} testID="good-moment-sheet-prompt">
              {GOOD_MOMENT_PROMPT}
            </Text>
          </View>

          <TextInput
            style={[styles.input, focused && styles.inputFocused]}
            value={text}
            onChangeText={setText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={GOOD_MOMENT_MAX_LENGTH}
            autoFocus
            // Single line. A good moment is one line by design, and a growing
            // field would invite the journal entry this surface is not.
            multiline={false}
            // Editable through a failure so the retry is genuinely in place;
            // held only while the write is in flight and while the
            // acknowledgment is up, so one tap stays one write.
            editable={status !== 'saving' && status !== 'saved'}
            accessibilityLabel={GOOD_MOMENT_PROMPT}
            testID="good-moment-sheet-input"
          />

          {/* One slot, both outcomes, so neither moves the buttons. */}
          {status === 'saved' && (
            <Text
              style={styles.saved}
              accessibilityLiveRegion="polite"
              testID="good-moment-sheet-saved"
            >
              {GOOD_MOMENT_SAVED}
            </Text>
          )}
          {status === 'failed' && (
            <Text
              style={styles.error}
              accessibilityLiveRegion="polite"
              testID="good-moment-sheet-error"
            >
              {GOOD_MOMENT_SAVE_FAILED}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={GOOD_MOMENT_SAVE}
            // Announced as dimmed rather than silently refusing the activation.
            accessibilityState={{ disabled: !canSave }}
            testID="good-moment-sheet-save"
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              {GOOD_MOMENT_SAVE}
            </Text>
          </TouchableOpacity>

          {/* Tertiary, per 11.D. The template's "tertiary skip" slot is this
              one control, so there is no second dismiss button beside it. */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={dismiss}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={GOOD_MOMENT_CANCEL}
            testID="good-moment-sheet-cancel"
          >
            <Text style={styles.cancelText}>{GOOD_MOMENT_CANCEL}</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // 10.5's 30% scrim, from the token rather than a literal rgba() — the lint
  // rule does not catch rgba(), so this one is a choice rather than a catch.
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlayLight,
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  // 10.5: White, top radius 16, 24 horizontal and top, 32 bottom, shadow-lg.
  // The bottom padding is the standard's own figure and already clears the
  // home indicator, so no safe-area inset is added on top of it.
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Layout.borderRadius.xl,
    borderTopRightRadius: Layout.borderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    ...Layout.shadow.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.sm,
  },
  prompt: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.base,
  },
  // 10.3: White fill, 1.5px Silver Sage, radius 8, 48 tall, 12 horizontal and
  // 14 vertical padding.
  input: {
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    minHeight: SizeTokens.touchTargetMin,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  inputFocused: {
    borderColor: Colors.evergreenTeal,
  },
  // Teal, never bright green (14.3).
  saved: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
  },
  // Coral, one line, directly under the thing that failed (14.4).
  error: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.softCoral,
  },
  saveButton: {
    marginTop: Spacing.base,
    minHeight: SizeTokens.touchTargetMin,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: Colors.dewSage,
  },
  saveText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  saveTextDisabled: {
    color: Colors.mutedSageGray,
  },
  cancelButton: {
    marginTop: Spacing.sm,
    minHeight: SizeTokens.touchTargetMin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
  },
});

export default GoodMomentSheet;
