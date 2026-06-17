// RightNowAcknowledgment — the quiet post-check-in priority.
//
// Replaces the post-check-in DashboardAnchor (5-state brief). Shows the felt
// "Right now: [state]" line derived from the circumplex QUADRANT via
// stateAcknowledgment(); calmer than the pre-check-in invite (this is a calm
// acknowledgment, not a call to action). A subtle "Check in again" relaunches
// the standard flow. Never a five-state label, never a number/score, and
// completion-agnostic (says nothing about whether a practice was finished).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography } from '../../constants';
import type { Quadrant, Situation } from '../../engine';
import { stateAcknowledgment } from './stateAcknowledgment';

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
    <View style={styles.container} testID="dashboard-right-now">
      <View style={styles.textBlock}>
        <Text style={styles.label}>Right now</Text>
        <Text style={styles.phrase} testID="dashboard-right-now-phrase">
          {phrase}
        </Text>
      </View>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
  },
  textBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: 2,
  },
  phrase: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  change: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
