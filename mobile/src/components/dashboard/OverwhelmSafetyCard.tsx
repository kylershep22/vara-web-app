// OverwhelmSafetyCard — Today-surface entry to the Overwhelm flow.
//
// Sub-step 2.6 — text-only "Need something right now?" affordance.
// Tap mounts CheckInFlow with `entrySource: 'overwhelm_safety_card'`
// and the locked protocol from `OVERWHELM_DEFAULT_PROTOCOL_ID`.
// CheckInFlow's existing reducer (locked in 2.2) initializes
// directly at the running step — no state-pick, no time-pick, no
// recommendation. The Safety Card itself is the consent moment.
//
// Visual treatment is text-only (no icon) per locked decision —
// emergency-coded icons (lifebuoy, SOS, etc.) violate Build Guide §4
// "calm over stimulation"; neutral icons don't help findability.
// Typography and placement do that work.
//
// Touch target is intentionally larger than the standard 48px
// minimum (60-72px tall, full card width). This is the affordance
// someone reaches for while overwhelmed; small targets fail.
//
// Accessibility label is warm and explicit ("Need something right
// now? Two-minute Sensory Reset.") rather than clinical
// ("Overwhelm safety card") or alarming ("Tap for help").

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import { OVERWHELM_DEFAULT_PROTOCOL_ID } from '../../constants/overwhelmDefaults';
import type { BrainState } from '../../types/models';

const TITLE = 'Need something right now?';
const SUBHEAD = 'A two-minute reset for hard moments.';

const ACCESSIBILITY_LABEL = 'Need something right now? Two-minute Sensory Reset.';

const MIN_CARD_HEIGHT = 64;

type Nav = NativeStackNavigationProp<{
  CheckInFlow:
    | { entrySource: 'standard' }
    | { entrySource: 'state_preselected'; stateBefore: BrainState }
    | { entrySource: 'overwhelm_safety_card'; protocolId: string };
}>;

export interface OverwhelmSafetyCardProps {
  // Optional override for the navigation handler — primarily for
  // tests that want to assert the dispatched route without mocking
  // useNavigation. Production callers omit; the card uses
  // useNavigation internally.
  onPress?: () => void;
}

export const OverwhelmSafetyCard: React.FC<OverwhelmSafetyCardProps> = ({
  onPress,
}) => {
  const navigation = useNavigation<Nav>();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
      return;
    }
    navigation.navigate('CheckInFlow', {
      entrySource: 'overwhelm_safety_card',
      protocolId: OVERWHELM_DEFAULT_PROTOCOL_ID,
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={ACCESSIBILITY_LABEL}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      testID="overwhelm-safety-card"
    >
      <Text style={styles.title} testID="overwhelm-safety-card-title">
        {TITLE}
      </Text>
      <Text style={styles.subhead} testID="overwhelm-safety-card-subhead">
        {SUBHEAD}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: MIN_CARD_HEIGHT,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    justifyContent: 'center',
  },
  cardPressed: {
    opacity: 0.85,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  subhead: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    lineHeight: 20,
  },
});
