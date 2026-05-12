/**
 * BrainStateCheckin
 * Single-tap brain state entry surface for the dashboard.
 *
 * Sub-step 2.5 migration: tapping a chip now navigates to the new
 * production CheckInFlow screen with `state_preselected` entry. The
 * Firestore writes (legacy brainStateCheckIns + new protocolSessions)
 * happen inside CheckInFlow's terminal useEffect via
 * writeStandardFlowSession. This component owns only the dashboard
 * card UX (expanded chip rows pre-checkin; collapsed view post-
 * checkin); the v1 'captured' celebration phase is removed because
 * the new flow's response screen IS the celebration.
 */

import React, { useState, useEffect } from 'react';
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
import { BrainStateOptionRow } from './brainStateCheckin/BrainStateOptionRow';
import { BrainStateCollapsedView } from './brainStateCheckin/BrainStateCollapsedView';

interface BrainStateCheckinProps {
  currentCheckIn: { brainState: BrainState } | null;
}

type Phase = 'expanded' | 'collapsed';

type Nav = NativeStackNavigationProp<{
  CheckInFlow: { entrySource: 'state_preselected'; stateBefore: BrainState };
  Insights: undefined;
}>;

export const BrainStateCheckin: React.FC<BrainStateCheckinProps> = ({
  currentCheckIn,
}) => {
  const [phase, setPhase] = useState<Phase>(currentCheckIn ? 'collapsed' : 'expanded');

  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { days, summary } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

  // Sync phase with currentCheckIn changes. The 'captured' phase is
  // gone (sub-step 2.5 migration); the new flow's response screen
  // owns the post-check-in celebration.
  useEffect(() => {
    if (!currentCheckIn && phase === 'collapsed') {
      setPhase('expanded');
    }
    // Removed: forced-collapse when currentCheckIn becomes truthy.
    // The V1 invariant ('currentCheckIn truthy → must be collapsed')
    // predated the Change affordance added in sub-step 2.5. With
    // Change present, the user's setPhase('expanded') call MUST win
    // over auto-collapse, which means the auto-collapse branch is
    // actively harmful.
  }, [currentCheckIn, phase]);

  const handleSelect = (state: BrainState) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CheckInFlow', {
      entrySource: 'state_preselected',
      stateBefore: state,
    });
  };

  const handleChangePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('expanded');
  };

  const handleCancelChange = () => {
    // Sub-step 2.7 round 2 — Observation 9: dismiss the expanded
    // picker without committing to a state change. Visible only
    // when currentCheckIn is truthy (i.e., the expansion came from
    // the Change button on the collapsed view, not from the
    // pre-checkin initial state). No Firestore write — the user's
    // existing brainStateCheckIn doc is untouched.
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('collapsed');
  };

  const handleSeeWeekPress = () => {
    navigation.navigate('Insights' as never);
  };

  if (phase === 'collapsed' && currentCheckIn) {
    const selected = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selected) return null;
    return (
      <BrainStateCollapsedView
        selectedState={selected}
        onChangePress={handleChangePress}
        onSeeWeekPress={handleSeeWeekPress}
        days={days}
        summary={summary}
      />
    );
  }

  const currentSelection = currentCheckIn?.brainState ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.prompt}>How are you feeling right now?</Text>
          <Text style={styles.subtext}>Just one tap. No wrong answers.</Text>
        </View>
        {currentCheckIn ? (
          <TouchableOpacity
            onPress={handleCancelChange}
            style={styles.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel state change"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : null}
      </View>
      {BRAIN_STATES.map((option, index) => (
        <BrainStateOptionRow
          key={option.state}
          option={option}
          onPress={handleSelect}
          selected={currentSelection === option.state}
          isLast={index === BRAIN_STATES.length - 1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
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
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  cancelButton: {
    paddingTop: Spacing.xs,
  },
});
