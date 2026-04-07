/**
 * BrainStateCheckin
 * Single-tap daily check-in for Dashboard V2.
 * Shows expanded state picker when not completed, collapses after selection.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainState } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useBrainStateWeekTrend } from '../../hooks/useBrainStateWeekTrend';

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

  const navigation = useNavigation();
  const { user } = useAuth();
  const { days, summary, loading: trendLoading } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

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

        {summary && (
          <View style={styles.trendSection}>
            <View style={styles.dotsRow}>
              {days.map((day, i) => (
                <View key={day.date} style={styles.dayColumn}>
                  <View
                    style={[
                      styles.trendDot,
                      day.color
                        ? { backgroundColor: day.color }
                        : styles.trendDotEmpty,
                    ]}
                  />
                  <Text style={styles.dayLabel}>{day.dayLabel}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.summaryText}>{summary}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Insights' as never)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.seeWeekLink}>See your week →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Expanded state (not yet checked in, or user tapped "Change")
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How are you feeling right now?</Text>
      <Text style={styles.subtext}>Just one tap. No wrong answers.</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {BRAIN_STATES.map((item) => {
          const selected = currentCheckIn?.brainState === item.state;
          return (
            <TouchableOpacity
              key={item.state}
              style={[styles.pill, selected && styles.pillSelected]}
              onPress={() => handleSelect(item.state)}
              activeOpacity={0.7}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.pillLabel}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  scrollContent: {
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.base,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.dewSage,
  },
  pillLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
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
  // Trend section
  trendSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trendDotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  summaryText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  seeWeekLink: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    textAlign: 'right',
    marginTop: Spacing.xs,
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
