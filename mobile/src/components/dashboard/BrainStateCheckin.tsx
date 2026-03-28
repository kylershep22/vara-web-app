/**
 * BrainStateCheckin
 * Single-tap daily check-in for Dashboard V2.
 * Shows expanded state picker when not completed, collapses after selection.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainState } from '../../types';

interface BrainStateCheckinProps {
  currentCheckIn: { brainState: BrainState } | null;
  onSelect: (state: BrainState) => void;
  loading?: boolean;
}

const BRAIN_STATES: {
  state: BrainState;
  label: string;
  description: string;
  color: string;
}[] = [
  { state: 'wired', label: 'Wired', description: 'Racing thoughts, can\'t settle', color: Colors.softCoral },
  { state: 'foggy', label: 'Foggy', description: 'Low energy, hard to focus', color: Colors.sunriseAmber },
  { state: 'okay', label: 'Okay', description: 'Nothing great, nothing bad', color: Colors.mutedSageGray },
  { state: 'clear', label: 'Clear', description: 'Calm, present, ready', color: Colors.evergreenTeal },
  { state: 'energized', label: 'Energized', description: 'Focused and sharp', color: Colors.success },
];

export const BrainStateCheckin: React.FC<BrainStateCheckinProps> = ({
  currentCheckIn,
  onSelect,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!currentCheckIn);
  const [showCaptured, setShowCaptured] = useState(false);
  const capturedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsExpanded(!currentCheckIn);
  }, [currentCheckIn]);

  useEffect(() => {
    return () => {
      if (capturedTimerRef.current) clearTimeout(capturedTimerRef.current);
    };
  }, []);

  const handleSelect = (state: BrainState) => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    onSelect(state);
    setShowCaptured(true);

    capturedTimerRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCaptured(false);
      setIsExpanded(false);
    }, 2000);
  };

  const handleChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(true);
  };

  // Captured confirmation overlay
  if (showCaptured) {
    return (
      <View style={styles.container}>
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedText}>Captured.</Text>
        </View>
      </View>
    );
  }

  // Collapsed state (already checked in today)
  if (!isExpanded && currentCheckIn) {
    const selectedState = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selectedState) return null;

    return (
      <View style={styles.container}>
        <View style={styles.collapsedRow}>
          <View style={styles.collapsedLeft}>
            <View style={[styles.dot, { backgroundColor: selectedState.color }]} />
            <Text style={styles.collapsedLabel}>{selectedState.label}</Text>
          </View>
          <TouchableOpacity onPress={handleChange} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.changeButton}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Expanded state (not yet checked in, or user tapped "Change")
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How's your brain feeling?</Text>
      <Text style={styles.subtext}>Just one tap. No wrong answers.</Text>

      <View style={styles.statesContainer}>
        {BRAIN_STATES.map((item) => (
          <TouchableOpacity
            key={item.state}
            style={[
              styles.stateRow,
              currentCheckIn?.brainState === item.state && styles.stateRowSelected,
            ]}
            onPress={() => handleSelect(item.state)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <View style={styles.stateTextContainer}>
              <Text style={styles.stateLabel}>{item.label}</Text>
              <Text style={styles.stateDescription}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Saving...</Text>
        </View>
      )}
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
    marginBottom: Spacing.lg,
  },
  statesContainer: {
    gap: Spacing.sm,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background.default,
  },
  stateRowSelected: {
    backgroundColor: Colors.dewSage,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  stateTextContainer: {
    flex: 1,
  },
  stateLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  stateDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  // Collapsed state
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsedLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  changeButton: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  // Captured confirmation
  capturedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  capturedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.lg,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});
