/**
 * Screen E. The first move, the terminal write, and the end of the flow.
 *
 * THE ONE WRITE. Every previous screen only added to context; this is where
 * recordRemoveCapture runs, which is why backing out anywhere earlier leaves no
 * half-capture behind and the entry card's gate stays honest.
 *
 * THE CONFIRMATION IS THE SOLE ECHO POINT for the user's own words in this
 * slice. It renders the text verbatim when there is one, else the chip label.
 * Neither is interpolated into anything: the heading is a fixed string and the
 * answer sits under it as its own line. The phase-page "In your words" home
 * arrives in slice 5.
 *
 * THE REPLACEMENT OFFER IS NOT HERE. That is 3c-ii; this screen goes straight
 * to done.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Layout, Spacing, Typography } from '../../../constants';
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

  const move = FIRST_MOVE_BY_FAMILY[family ?? 'behavioral'];

  const onPrimary = useCallback(async () => {
    if (!user?.uid || saving) return;
    setSaving(true);
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
      reset();
      navigation.goBack();
    } catch (error) {
      logger.error('[FirstMoveScreen] capture write failed:', error);
      setSaving(false);
    }
  }, [user?.uid, saving, family, chipId, text, timing, reset, navigation]);

  return (
    <RemoveCaptureScaffold
      title={FIRST_MOVE_COPY.title}
      primaryLabel={FIRST_MOVE_COPY.primary}
      primaryDisabled={saving}
      onPrimary={onPrimary}
      onBack={() => navigation.goBack()}
    >
      <View>
        <Text style={styles.move} testID="remove-capture-first-move">
          {move}
        </Text>

        {/* The confirmation. The user's own words, verbatim, or the label they
            tapped. Nothing is templated around either. */}
        <View style={styles.confirmation} testID="remove-capture-confirmation">
          <Text style={styles.confirmationHeading}>
            {FIRST_MOVE_COPY.confirmationHeading}
          </Text>
          <Text style={styles.confirmationBody} testID="remove-capture-echo">
            {text ?? chipLabel ?? ''}
          </Text>
        </View>
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
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.mutedSageGray,
  },
  confirmationHeading: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  confirmationBody: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
});
