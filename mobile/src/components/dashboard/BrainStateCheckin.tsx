/**
 * BrainStateCheckin
 * Single-tap daily check-in for Dashboard V2.
 * Orchestrates three views: expanded (pre-checkin), captured (celebration), collapsed (post-checkin).
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainState } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBrainStateWeekTrend } from '../../hooks/useBrainStateWeekTrend';
import { BRAIN_STATES } from './brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from './brainStateCheckin/BrainStateOptionRow';
import { BrainStateCapturedView } from './brainStateCheckin/BrainStateCapturedView';
import { BrainStateCollapsedView } from './brainStateCheckin/BrainStateCollapsedView';

interface BrainStateCheckinProps {
  currentCheckIn: { brainState: BrainState } | null;
  onSelect: (state: BrainState) => void;
  loading?: boolean;
}

type Phase = 'expanded' | 'captured' | 'collapsed';

export const BrainStateCheckin: React.FC<BrainStateCheckinProps> = ({
  currentCheckIn,
  onSelect,
  loading = false,
}) => {
  const [phase, setPhase] = useState<Phase>(currentCheckIn ? 'collapsed' : 'expanded');
  const [pendingSelection, setPendingSelection] = useState<BrainState | null>(null);

  const navigation = useNavigation();
  const { user } = useAuth();
  const { days, summary } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

  useEffect(() => {
    if (currentCheckIn && phase === 'expanded') {
      setPhase('collapsed');
    }
    if (!currentCheckIn && phase === 'collapsed') {
      setPhase('expanded');
    }
  }, [currentCheckIn, phase]);

  const handleSelect = (state: BrainState) => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(state);
    setPendingSelection(state);
    setPhase('captured');
  };

  const handleCapturedComplete = () => {
    setPhase('collapsed');
    setPendingSelection(null);
  };

  const handleChangePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase('expanded');
  };

  const handleSeeWeekPress = () => {
    navigation.navigate('Insights' as never);
  };

  if (phase === 'captured' && pendingSelection) {
    return (
      <BrainStateCapturedView
        selectedState={pendingSelection}
        onComplete={handleCapturedComplete}
      />
    );
  }

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
      <Text style={styles.prompt}>How are you feeling right now?</Text>
      <Text style={styles.subtext}>Just one tap. No wrong answers.</Text>
      {BRAIN_STATES.map((option, index) => (
        <BrainStateOptionRow
          key={option.state}
          option={option}
          onPress={handleSelect}
          selected={currentSelection === option.state}
          disabled={loading}
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
});
