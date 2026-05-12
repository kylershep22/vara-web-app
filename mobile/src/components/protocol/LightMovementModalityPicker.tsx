// LightMovementModalityPicker — pre-timer modality selection for
// the Light Movement (brief-movement family) protocols.
//
// Sub-step 2.7 round 4 (Obs 10). Light Movement's timer instruction
// previously read "Walking, light cardio, stretching, or a flow —
// whatever fits your space and energy." That copy ships the user
// straight into an unguided activity with no scaffolding for
// figuring out what "movement" means right now. The picker resolves
// that by asking the user once, before the timer starts, what fits.
//
// Two options only:
//   - Walk    — outside or in a hallway / large space.
//   - Stretch — at a desk or in a tight space.
//
// Flow / guided yoga is intentionally excluded. We don't currently
// provide the guidance, so we don't offer the option. Logged in
// TECH_DEBT_BACKLOG as a Phase 4+ consideration.
//
// Cancel pattern mirrors the Brain-state Change-state Cancel from
// commit ee73ca0: 24px MaterialCommunityIcons "close", softCharcoal,
// 12px hitSlop, light haptic on tap, no Firestore write (the session
// hasn't started yet — there's nothing to roll back). Parent wires
// `onCancel` to navigation.goBack() so the picker exits to whatever
// screen launched the protocol.
//
// Round 3 (Layer 2 / Layer 3): the picker is functionally a
// recommendation surface — it's the last stop before the user
// commits to a session. So it now shows the protocol name and
// duration above the title (Layer 2) and, when the recommender
// returned a protocol shorter than the user's chosen time window,
// renders a calm gap-acknowledgment line below the duration
// (Layer 3). `timeWindowSelected` is optional because the BrowseRun
// path doesn't currently thread it through; in that path the gap
// line silently doesn't render.

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, Typography } from '../../constants';
import type {
  MovementModality,
  Protocol,
  ProtocolTimeWindow,
} from '../../types/models';
import { formatProtocolDuration } from '../../utils/protocolDisplay';

const MIN_TOUCH_TARGET = 48;
const TIME_LEFT_LINE = "You'll have time left in your window.";

export interface LightMovementModalityPickerProps {
  protocol: Protocol;
  onSelect: (modality: MovementModality) => void;
  onCancel: () => void;
  // Optional — when provided and the protocol is shorter than the
  // user's chosen window, the gap-acknowledgment line renders below
  // the duration. Browse-launched sessions (PracticeRun route) omit
  // this; the user picked a specific protocol from a list and saw
  // its duration on the card, so the line would be redundant noise.
  timeWindowSelected?: ProtocolTimeWindow | null;
}

interface ModalityOption {
  modality: MovementModality;
  title: string;
  subtext: string;
  testID: string;
}

const OPTIONS: ModalityOption[] = [
  {
    modality: 'walk',
    title: 'Walk',
    subtext: 'If you have space or can step outside',
    testID: 'modality-picker-walk',
  },
  {
    modality: 'stretch',
    title: 'Stretch',
    subtext: "If you're at a desk or in a tight space",
    testID: 'modality-picker-stretch',
  },
];

export function LightMovementModalityPicker({
  protocol,
  onSelect,
  onCancel,
  timeWindowSelected = null,
}: LightMovementModalityPickerProps) {
  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onCancel();
  };

  const handleSelect = (modality: MovementModality) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect(modality);
  };

  const showTimeLeftLine =
    timeWindowSelected != null && protocol.timeWindow < timeWindowSelected;

  return (
    <View style={styles.container} testID="light-movement-modality-picker">
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.cancelButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel protocol"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          testID="modality-picker-cancel"
        >
          <Icon name="close" size={24} color={Colors.softCharcoal} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text
          style={styles.protocolMeta}
          testID="modality-picker-protocol-meta"
        >
          {protocol.name} · {formatProtocolDuration(protocol)}
        </Text>
        {showTimeLeftLine ? (
          <Text
            style={styles.timeLeftLine}
            testID="modality-picker-time-left"
          >
            {TIME_LEFT_LINE}
          </Text>
        ) : null}

        <Text style={styles.title} testID="modality-picker-title">
          Pick what fits right now
        </Text>

        <View style={styles.options}>
          {OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.modality}
              style={styles.card}
              onPress={() => handleSelect(option.modality)}
              accessibilityRole="button"
              accessibilityLabel={`${option.title} — ${option.subtext}`}
              testID={option.testID}
            >
              <Text style={styles.cardSubtext}>{option.subtext}</Text>
              <Text style={styles.cardTitle}>{option.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 56,
  },
  headerSpacer: {
    flex: 1,
  },
  cancelButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  protocolMeta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  timeLeftLine: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  options: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  card: {
    minHeight: MIN_TOUCH_TARGET * 2,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSubtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
});
