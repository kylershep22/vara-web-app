// RightNowAcknowledgment — the quiet post-check-in slot.
//
// Names what the user DID (a completed practice), never the state they
// reported. Per Voice & Tone v2.1 §3.1 the reported state is used at input to
// route, then disappears — it is never reflected back after the work is done.
//
// Renders ONLY when a catalog practice completed today. In the
// checked-in-but-nothing-completed / pointer-handoff / zero-slot states there is
// nothing the user "did" to acknowledge, so the component returns null and the
// slot collapses (no ghost padding — the card's own margin lives on the card,
// which is not rendered). The standing SuggestedActionCard below is the
// forward-pointing element in that case.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import { completionAcknowledgment } from './completionAcknowledgment';

type Nav = NativeStackNavigationProp<{
  CheckInFlow: { entrySource: 'standard' };
}>;

export interface RightNowAcknowledgmentProps {
  // Display name of the catalog practice completed today, or null when no
  // practice completed (checked-in-but-nothing-done / pointer / zero-slot). When
  // null the component renders nothing and the slot collapses.
  practiceName: string | null;
  // Completion time, for the "done this morning/afternoon/evening" variant.
  // Sourced from the daily marker's `updatedAt` (no dedicated completion
  // timestamp exists). Omit / null to fall back to the plain "…, done." line.
  completedAt?: Date | null;
  onChangePress?: () => void;
}

export const RightNowAcknowledgment: React.FC<RightNowAcknowledgmentProps> = ({
  practiceName,
  completedAt,
  onChangePress,
}) => {
  const navigation = useNavigation<Nav>();

  const handleChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onChangePress) {
      onChangePress();
      return;
    }
    navigation.navigate('CheckInFlow', { entrySource: 'standard' });
  };

  // No completed practice → nothing to acknowledge. Return null so the slot
  // reserves no space (dashboardEyebrow/sub-line and the card container are all
  // gone with it — clean collapse, no empty wrapper).
  if (practiceName == null) return null;

  return (
    <View style={styles.card} testID="dashboard-right-now">
      <Text style={styles.line} testID="dashboard-right-now-completion">
        {completionAcknowledgment(practiceName, completedAt)}
      </Text>
      <TouchableOpacity
        onPress={handleChange}
        accessibilityRole="button"
        accessibilityLabel="Check in again"
        hitSlop={8}
        testID="dashboard-right-now-change"
      >
        <Text style={styles.change}>Check in again</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  // Quiet sage card with a teal left border (mockup .ack) — visibly calmer than
  // the bright pre-check-in invite, still a defined element.
  card: {
    backgroundColor: Colors.dewSageLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: Spacing.base,
  },
  line: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  change: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 12,
  },
});
