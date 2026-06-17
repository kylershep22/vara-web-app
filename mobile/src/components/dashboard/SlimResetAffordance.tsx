// SlimResetAffordance — the slim 2-minute reset on Home (both phases).
//
// The spec demotes the old OverwhelmSafetyCard from a full card to a slim
// affordance: present and reachable, but quiet — never competing with the bright
// check-in invite (pre) or the acknowledgment (post). Reuses the exact same
// entry the OverwhelmSafetyCard used (CheckInFlow at the locked overwhelm
// protocol), so the behavior is unchanged; only the visual weight drops.
//
// Calm, text-led, no emergency-coded iconography (Build Guide §4). The original
// OverwhelmSafetyCard is left intact (reversible).

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import { OVERWHELM_DEFAULT_PROTOCOL_ID } from '../../constants/overwhelmDefaults';

const LABEL = 'Need a reset right now?';
const HINT = '2 min ›';
const ACCESSIBILITY_LABEL = 'Need a reset right now? Two-minute reset.';

type Nav = NativeStackNavigationProp<{
  CheckInFlow: { entrySource: 'overwhelm_safety_card'; protocolId: string };
}>;

export interface SlimResetAffordanceProps {
  // Optional override for tests that assert the dispatch without mocking
  // useNavigation. Production callers omit it.
  onPress?: () => void;
}

export const SlimResetAffordance: React.FC<SlimResetAffordanceProps> = ({
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
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      testID="dashboard-slim-reset"
    >
      <Text style={styles.label}>{LABEL}</Text>
      <Text style={styles.hint}>{HINT}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Slim pill: lighter than the cards, reachable without scrolling (mockup
  // .reset — 1px silverSage border, pill radius).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.pill,
  },
  rowPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  hint: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
