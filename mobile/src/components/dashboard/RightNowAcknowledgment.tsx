// RightNowAcknowledgment — the quiet post-check-in priority.
//
// Replaces the post-check-in DashboardAnchor (5-state brief). The felt
// "Right now: [state]" derived from the circumplex QUADRANT via
// stateAcknowledgment(); calmer than the pre-check-in invite. Matches the mockup
// .ack: a quiet sage-filled card (dewSageLight) with a 4px teal left border,
// stacked label → phrase → sub → recheck. Never a five-state label, never a
// number; completion-agnostic.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import type { Quadrant, Situation } from '../../engine';
import {
  stateAcknowledgment,
  ACKNOWLEDGMENT_SUBLINE,
} from './stateAcknowledgment';
import { dashboardEyebrow } from './cardStyles';

type Nav = NativeStackNavigationProp<{
  CheckInFlow: { entrySource: 'standard' };
}>;

export interface RightNowAcknowledgmentProps {
  // Resolved quadrant for today's latest engine session, or null when none
  // could be read (a neutral line is shown then — never a guessed quadrant).
  quadrant: Quadrant | null;
  // Reserved/dormant — situation-refined phrasing is a later deliverable.
  situation?: Situation;
  onChangePress?: () => void;
}

export const RightNowAcknowledgment: React.FC<RightNowAcknowledgmentProps> = ({
  quadrant,
  situation,
  onChangePress,
}) => {
  const navigation = useNavigation<Nav>();
  const phrase = stateAcknowledgment(quadrant, situation);

  const handleChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onChangePress) {
      onChangePress();
      return;
    }
    navigation.navigate('CheckInFlow', { entrySource: 'standard' });
  };

  return (
    <View style={styles.card} testID="dashboard-right-now">
      <Text style={styles.label}>Right now</Text>
      <Text style={styles.phrase} testID="dashboard-right-now-phrase">
        {phrase}
      </Text>
      <Text style={styles.sub}>{ACKNOWLEDGMENT_SUBLINE}</Text>
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
  label: {
    ...dashboardEyebrow,
    marginBottom: 5,
  },
  phrase: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  sub: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    opacity: 0.78,
    marginTop: 4,
  },
  change: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 12,
  },
});
