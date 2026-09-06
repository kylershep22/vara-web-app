/**
 * Screen F. The curated replacement pick and the end of the flow for a
 * time-anchored behavioral capture (journey slice 3c-ii).
 *
 * ONLY QUALIFYING CAPTURES REACH IT. `replacementSlotFor` in routing.ts is the
 * single predicate: behavioral family, and a named slot. Mental, interpersonal
 * and 'varies' captures end on the first move with the scaffold they already
 * had, which this slice does not touch.
 *
 * ONE SCREEN, TWO STATES, AND THAT IS A CORRECTNESS CHOICE RATHER THAN A LAYOUT
 * ONE. The pack requires a confirmation after the pick, and putting it on its
 * own route would leave the menu one back-press behind a completed write, which
 * is the exact shape of the defect the first 3c-i device walk hit. Swapping the
 * body in place means there is no earlier screen to return to and no second
 * pick to make.
 *
 * NO REMINDER, NO NOTIFICATION, NO TIME PICKER. `Content Pack v1 §decisions-3`
 * defers all of that to slice 9, and the roadmap row says plainly that a menu
 * which seems to need a nudge is evidence the split was wrong rather than
 * licence to build one. The confirmation is neutral for that reason: it states
 * what was chosen and promises nothing the build cannot deliver.
 *
 * THE USER'S OWN WORDS CANNOT APPEAR HERE. Not by care, by construction: the
 * free-text path never asks timing, so it can never qualify, and this file
 * neither imports nor reads `text` from the capture context.
 *
 * LEAVING POPS THE PARENT, NOT THIS STACK, exactly as the first-move screen
 * does. `useNavigation` here resolves to the nested capture stack, so
 * `goBack()` would land on a screen the user has already answered. The flow is
 * ONE entry on the parent AppStack; popping the parent unmounts the nested
 * stack and its provider together.
 */
import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '../../../constants';
import { OptionRow } from '../../../components/shared/OptionRow';
import { useAuth } from '../../../context/AuthContext';
import { logEvent } from '../../../services/firebase/analyticsEvents.service';
import { recordRemoveReplacement } from '../../../services/firebase/journeyState.service';
import type { ReplacementSlot } from '../../../types/models';
import { logger } from '../../../utils/logger';
import { RemoveCaptureScaffold } from './RemoveCaptureScaffold';
import { useRemoveCapture } from './RemoveCaptureContext';
import {
  REPLACEMENT_CONFIRMATIONS,
  REPLACEMENT_COPY,
  REPLACEMENT_MENUS,
} from './copy';
import { replacementSlotFor } from './routing';

export const ReplacementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { family, timing } = useRemoveCapture();
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  // Latches on the first successful write, the same belt-and-braces the
  // first-move screen carries: even if the state swap were delayed a frame, a
  // second tap cannot produce a second write.
  const completedRef = useRef(false);

  // THE SLOT COMES FROM THE CAPTURE, and the route param is only a fallback for
  // a remount. The context is the answer the user actually gave; the param
  // exists because a params-only screen is testable in isolation and because a
  // provider reset would otherwise strand this screen with no menu at all.
  const slot: ReplacementSlot | null =
    replacementSlotFor(family, timing) ?? (route.params?.slot ?? null);

  const leave = useCallback(() => {
    // Pop the PARENT entry, not this stack. See the note at the top.
    const parent = navigation.getParent();
    if (parent) {
      parent.goBack();
    } else {
      // No parent means this screen is mounted outside the app stack, which
      // only happens in a test harness.
      navigation.goBack();
    }
  }, [navigation]);

  const onPick = useCallback(async () => {
    if (!user?.uid || !slot || !selected || saving || completedRef.current) return;

    setSaving(true);
    setSaveFailed(false);
    try {
      await recordRemoveReplacement(user.uid, { optionId: selected, slot });
      // A CURATED ID AND A CLOSED UNION. The event type has no field for text
      // and this screen has none to give it.
      logEvent(user.uid, 'journey_remove_replacement_chosen', {
        optionId: selected,
        slot,
      });
      completedRef.current = true;
      setConfirmed(true);
      setSaving(false);
    } catch (error) {
      logger.error('[ReplacementScreen] replacement write failed:', error);
      // STAY ON THE PICK. The selection is still in local state and the retry
      // costs one tap; navigating away would leave the user unsure whether
      // anything was recorded.
      setSaveFailed(true);
      setSaving(false);
    }
  }, [user?.uid, slot, selected, saving]);

  // A capture that does not qualify has no menu to show. Unreachable through
  // the flow, because the first-move screen only navigates here on a slot;
  // leaving rather than rendering an empty list is what keeps that true if a
  // future caller forgets.
  if (!slot) {
    return (
      <RemoveCaptureScaffold
        title={REPLACEMENT_COPY.title}
        primaryLabel={REPLACEMENT_COPY.confirmedPrimary}
        onPrimary={leave}
      >
        <View testID="remove-capture-replacement-no-slot" />
      </RemoveCaptureScaffold>
    );
  }

  if (confirmed) {
    return (
      <RemoveCaptureScaffold
        title={REPLACEMENT_CONFIRMATIONS[slot]}
        primaryLabel={REPLACEMENT_COPY.confirmedPrimary}
        onPrimary={leave}
      >
        {/* No body. The confirmation IS the screen: a neutral sentence and the
            way out. Anything more would be filling space the pack left empty on
            purpose, and the reminder that used to sit here is slice 9's. */}
        <View testID="remove-capture-replacement-confirmed" />
      </RemoveCaptureScaffold>
    );
  }

  return (
    <RemoveCaptureScaffold
      title={REPLACEMENT_COPY.title}
      primaryLabel={REPLACEMENT_COPY.primary}
      primaryDisabled={saving || !selected}
      onPrimary={onPick}
      onBack={() => navigation.goBack()}
    >
      <View testID={`remove-capture-replacement-menu-${slot}`}>
        {REPLACEMENT_MENUS[slot].map((option) => (
          <OptionRow
            key={option.id}
            label={option.label}
            description=""
            // SINGLE SELECTION. One id in state, so picking a second replaces
            // the first rather than adding to it.
            selected={selected === option.id}
            onPress={() => setSelected(option.id)}
            testID={`remove-capture-replacement-${option.id}`}
          />
        ))}

        {saveFailed && (
          <Text style={styles.error} testID="remove-capture-replacement-error">
            {REPLACEMENT_COPY.saveFailed}
          </Text>
        )}
      </View>
    </RemoveCaptureScaffold>
  );
};

const styles = StyleSheet.create({
  error: {
    marginTop: Spacing.base,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
  },
});
