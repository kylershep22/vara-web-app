/**
 * HabitNoteSheet
 *
 * Invites an optional free-text note AFTER a completion has already been
 * written. It is an addendum, never a gate:
 *
 *   - The completion is saved before this sheet ever appears. Dismissing it by
 *     any means — X, tap outside, swipe down, hardware back — writes nothing
 *     and leaves the completion exactly as it is.
 *   - No rating, score, or characterisation of the experience. It asks whether
 *     anything is worth remembering; it never implies a note is owed.
 *   - No "skip". Dismissal is a first-class outcome, not an omission, so it
 *     gets no button framing it as one.
 *   - Nothing previously captured is shown back here.
 *
 * Presentational: the caller owns the write, so dismissal and save stay
 * distinguishable at the call site.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
  PanResponder,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { MAX_QUICK_NOTE_LENGTH } from '../../constants/habitNotes';

/** Downward drag past this many px dismisses the sheet. */
const DISMISS_DRAG_THRESHOLD = 80;
const DISMISS_VELOCITY_THRESHOLD = 0.5;

interface HabitNoteSheetProps {
  visible: boolean;
  /** Shown for context only — which habit was just completed. */
  habitName: string;
  /** Called with the trimmed note. Never called with an empty string. */
  onSave: (note: string) => void;
  /** Every dismissal path lands here. Writes nothing. */
  onDismiss: () => void;
}

export const HabitNoteSheet: React.FC<HabitNoteSheetProps> = ({
  visible,
  habitName,
  onSave,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [note, setNote] = useState('');
  const dragY = useRef(new Animated.Value(0)).current;

  // Each opening starts empty: a note belongs to the completion just made, and
  // carrying text over from a previous one would attach it to the wrong day.
  useEffect(() => {
    if (visible) {
      setNote('');
      dragY.setValue(0);
    }
  }, [visible, dragY]);

  const dismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  const handleSave = useCallback(() => {
    const trimmed = note.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    onSave(trimmed);
  }, [note, onSave]);

  // Swipe down to dismiss. Bound to the handle/header area only, so dragging
  // inside the text field selects text rather than closing the sheet.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 10 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          // Under Reduce Motion the sheet does not track the finger; the
          // gesture still dismisses on release.
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

  const canSave = note.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={dismiss}
      testID="habit-note-sheet"
    >
      {/* Tap outside */}
      <Pressable
        style={styles.overlay}
        onPress={dismiss}
        accessibilityLabel="Close without adding a note"
        accessibilityRole="button"
        testID="habit-note-sheet-overlay"
      >
        <View />
      </Pressable>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + Spacing.lg, transform: [{ translateY: dragY }] },
          ]}
          accessibilityViewIsModal
        >
          {/* Handle bar — also the swipe-to-dismiss target */}
          <View {...panResponder.panHandlers}>
            <View style={styles.handleContainer} accessibilityElementsHidden>
              <View style={styles.handle} />
            </View>

            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={styles.prompt}>Anything worth remembering?</Text>
                <Text style={styles.habitName} numberOfLines={1}>
                  {habitName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={dismiss}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close without adding a note"
                testID="habit-note-sheet-close"
              >
                <Icon name="close" size={20} color={Colors.mutedSageGray} />
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder="A quick line you can look back on."
            placeholderTextColor={Colors.silverSage}
            maxLength={MAX_QUICK_NOTE_LENGTH}
            multiline
            autoFocus
            textAlignVertical="top"
            accessibilityLabel="Your note"
            testID="habit-note-sheet-input"
          />

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Save note"
            testID="habit-note-sheet-save"
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>Save</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
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
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  headerText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  prompt: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  habitName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    minHeight: 88,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
    backgroundColor: Colors.white,
  },
  saveButton: {
    marginTop: Spacing.base,
    minHeight: 48,
    borderRadius: 8,
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
});

export default HabitNoteSheet;
