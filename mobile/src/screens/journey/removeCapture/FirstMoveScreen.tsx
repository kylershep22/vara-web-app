/**
 * Screen E. The first move, the terminal write, and the end of the flow.
 *
 * THE ONE WRITE. Every previous screen only added to context; this is where
 * recordRemoveCapture runs, which is why backing out anywhere earlier leaves no
 * half-capture behind and the entry card's gate stays honest.
 *
 * LEAVING THE FLOW POPS THE PARENT, NOT THIS STACK. `useNavigation` inside this
 * screen resolves to the NESTED capture stack, so `goBack()` here would pop one
 * screen inside the flow and land on the timing question. That is exactly the
 * defect the first device walk hit: the write succeeded, the user was returned
 * to a screen they had already answered, and pressing through a second time
 * re-entered this screen with the context already cleared. The whole flow is
 * ONE entry on the parent AppStack, so popping the parent unmounts the nested
 * stack and its provider together, which both returns the user to Today and
 * makes the flow unreachable by back.
 *
 * THE CONFIRMATION IS THE SOLE ECHO POINT for the user's own words in this
 * slice. It renders the text verbatim when there is one, else the chip label,
 * as STATIC TEXT with no container and no border: an earlier version shared the
 * clarify screen's input chrome and read as an empty editable field. The phase
 * page "In your words" home arrives in slice 5.
 *
 * THE REPLACEMENT OFFER IS NOT HERE. That is 3c-ii; this screen goes straight
 * to done.
 */
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '../../../constants';
import { useAuth } from '../../../context/AuthContext';
import { logEvent } from '../../../services/firebase/analyticsEvents.service';
import { recordRemoveCapture } from '../../../services/firebase/journeyState.service';
import { logger } from '../../../utils/logger';
import { RemoveCaptureScaffold } from './RemoveCaptureScaffold';
import { useRemoveCapture } from './RemoveCaptureContext';
import { FIRST_MOVE_BY_FAMILY, FIRST_MOVE_COPY } from './copy';

export const FirstMoveScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { family, chipId, chipLabel, text, timing, reset } = useRemoveCapture();
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Latches on the first successful write. Belt and braces beside the pop
  // below: even if the unmount were delayed a frame, a second tap cannot
  // produce a second write.
  const completedRef = useRef(false);

  const move = FIRST_MOVE_BY_FAMILY[family ?? 'behavioral'];

  // WHAT THE USER ACTUALLY NAMED. Completion is refused without one, because
  // the write is an updateDoc and an empty one would null a real answer while
  // stamping a fresh removeCapturedAt.
  const hasTarget = !!chipId || !!text || !!family;

  const onPrimary = useCallback(async () => {
    if (!user?.uid || saving || completedRef.current) return;
    if (!hasTarget) {
      // Nothing to record. This is only reachable if the flow is re-entered
      // after a completion, which the pop below is what prevents; refusing
      // here means the data is safe even if that ever regresses.
      logger.warn('[FirstMoveScreen] completion with no target; not writing');
      return;
    }

    setSaving(true);
    setSaveFailed(false);
    try {
      await recordRemoveCapture(user.uid, { family, chipId, text, timing });
      // THE TEXT IS NOT IN THIS PAYLOAD AND CANNOT BE: the event type has no
      // field for it. chipId carries 'free_text' when they typed, which records
      // the path without recording the answer.
      logEvent(user.uid, 'journey_remove_captured', {
        family: family ?? null,
        chipId: chipId ?? 'free_text',
        timing: timing ?? null,
      });
      completedRef.current = true;
      reset();
      // Pop the PARENT entry, not this stack. See the note at the top.
      const parent = navigation.getParent();
      if (parent) {
        parent.goBack();
      } else {
        // No parent means this screen is mounted outside the app stack, which
        // only happens in a test harness. Falling back keeps that case working
        // rather than silently doing nothing.
        navigation.goBack();
      }
    } catch (error) {
      logger.error('[FirstMoveScreen] capture write failed:', error);
      // STAY ON THIS SCREEN. The answers are still in context and the retry
      // costs one tap; navigating away would lose them and leave the user
      // unsure whether anything was recorded.
      setSaveFailed(true);
      setSaving(false);
    }
  }, [user?.uid, saving, hasTarget, family, chipId, text, timing, reset, navigation]);

  return (
    <RemoveCaptureScaffold
      title={FIRST_MOVE_COPY.title}
      primaryLabel={FIRST_MOVE_COPY.primary}
      primaryDisabled={saving || !hasTarget}
      onPrimary={onPrimary}
      onBack={() => navigation.goBack()}
    >
      <View>
        <Text style={styles.move} testID="remove-capture-first-move">
          {move}
        </Text>

        {/* STATIC TEXT, NOT INPUT CHROME. No border, no container, no field
            caption: a bordered box beside a real text field on the previous
            screen reads as an editable input, and an empty one reads as a bug.
            The caption is a quiet label above the answer, not a form label. */}
        <View style={styles.confirmation} testID="remove-capture-confirmation">
          <Text style={styles.confirmationCaption}>
            {FIRST_MOVE_COPY.confirmationHeading}
          </Text>
          <Text style={styles.confirmationBody} testID="remove-capture-echo">
            {text ?? chipLabel ?? ''}
          </Text>
        </View>

        {saveFailed && (
          <Text style={styles.error} testID="remove-capture-error">
            {FIRST_MOVE_COPY.saveFailed}
          </Text>
        )}
      </View>
    </RemoveCaptureScaffold>
  );
};

const styles = StyleSheet.create({
  move: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * 1.5,
  },
  confirmation: {
    marginTop: Spacing.lg,
  },
  confirmationCaption: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  confirmationBody: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  error: {
    marginTop: Spacing.base,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
  },
});
