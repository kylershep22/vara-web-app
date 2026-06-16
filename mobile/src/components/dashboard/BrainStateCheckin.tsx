/**
 * BrainStateCheckin
 * Dashboard check-in entry surface.
 *
 * Engine-wiring fix (BUG 1): the dashboard now launches the NEW check-in flow
 * at its first step (situation_pick) via `entrySource: 'standard'`. The old
 * five-state chips (Wired/Foggy/Steady/Clear/Alive) + the `state_preselected`
 * navigation are retired — they bridged straight into the middle of the new
 * flow (time_pick), so the situation + two-tap circumplex were only reachable
 * by pressing back. There is now ONE forward path from the dashboard.
 *
 * Pre-checkin: a single "Check in" CTA card → CheckInFlow (standard).
 * Post-checkin: the collapsed week-trend view; "Change" relaunches the same
 * standard flow. (The collapsed view reads the bridged BrainState off the
 * legacy doc, unchanged.)
 *
 * The `state_preselected` FlowInit variant itself is kept — onboarding
 * (OnboardingV2ProtocolScreen) still uses it.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainState } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBrainStateWeekTrend } from '../../hooks/useBrainStateWeekTrend';
import { BRAIN_STATES } from './brainStateCheckin/brainStateOptions';
import { BrainStateCollapsedView } from './brainStateCheckin/BrainStateCollapsedView';

interface BrainStateCheckinProps {
  currentCheckIn: { brainState: BrainState } | null;
}

type Nav = NativeStackNavigationProp<{
  CheckInFlow: { entrySource: 'standard' };
  Insights: undefined;
}>;

export const BrainStateCheckin: React.FC<BrainStateCheckinProps> = ({
  currentCheckIn,
}) => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { days, summary } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

  // The single forward entry: launch the new flow at situation_pick.
  const launchCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CheckInFlow', { entrySource: 'standard' });
  };

  const handleSeeWeekPress = () => {
    navigation.navigate('Insights' as never);
  };

  // Post-checkin: collapsed week-trend view. "Change" relaunches the standard
  // flow (no more in-card chip re-expansion).
  if (currentCheckIn) {
    const selected = BRAIN_STATES.find(
      (s) => s.state === currentCheckIn.brainState
    );
    if (!selected) return null;
    return (
      <BrainStateCollapsedView
        selectedState={selected}
        onChangePress={launchCheckIn}
        onSeeWeekPress={handleSeeWeekPress}
        days={days}
        summary={summary}
      />
    );
  }

  // Pre-checkin: a single CTA into the new flow.
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={launchCheckIn}
      accessibilityRole="button"
      accessibilityLabel="Check in"
      testID="brain-state-checkin-cta"
    >
      <View style={styles.textBlock}>
        <Text style={styles.prompt}>How are you right now?</Text>
        <Text style={styles.subtext}>A quick check-in to find what fits.</Text>
      </View>
      <Icon name="chevron-right" size={24} color={Colors.evergreenTeal} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  prompt: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
});
