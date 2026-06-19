// RoutineCard — dashboard routine surface (both phases).
//
// Single-routine card matching its "Today's routine" title: it surfaces today's
// FIRST incomplete active routine as the one invitation to begin. No progress
// dots — a multi-routine dot strip (one dot per active routine) made the same
// "The Essentials" card show a different count as the active-routine set changed,
// reading as an inconsistency. Dashboard completion is binary per routine
// (getRoutineCompletionToday → boolean) and there is no routine-run model, so
// there is nothing to count at the card level.
//
// CTA: begin the surfaced routine → check habits once all are done → create one
// when none exist. Presentation only (data from useDashboard, refreshed on
// focus so it reflects routines added/deactivated on the Rhythms tab).

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  Routine,
  calculateTotalDuration,
} from '../../services/firebase/routines.service';

interface RoutineCardProps {
  routines: Routine[];
  completions: Record<string, boolean>;
  onBeginRoutine: (routine: Routine) => void;
  onNavigateToRoutines: () => void;
  onNavigateToHabits: () => void;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  routines,
  completions,
  onBeginRoutine,
  onNavigateToRoutines,
  onNavigateToHabits,
}) => {
  // ── Warm empty state (spec §4) ────────────────────────────────────
  if (routines.length === 0) {
    return (
      <View style={styles.card} testID="dashboard-routine-empty">
        <Text style={styles.title}>Today's routine</Text>
        <Text style={styles.emptyBody}>
          When you set a routine, it'll show up here.
        </Text>
        <TouchableOpacity
          onPress={onNavigateToRoutines}
          accessibilityRole="button"
          accessibilityLabel="Create a routine"
          testID="dashboard-routine-create"
        >
          <Text style={styles.cta}>Create a routine</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The one routine to surface: today's first active routine not yet completed.
  const target = routines.find((r) => !completions[r.id]);
  const allDone = target === undefined;

  // CTA: begin the surfaced routine, or check habits once everything's done.
  const ctaLabel = allDone ? 'Check habits ›' : 'Begin ›';
  const onCta = allDone ? onNavigateToHabits : () => onBeginRoutine(target);
  const ctaTestID = allDone
    ? 'dashboard-routine-check-habits'
    : 'dashboard-routine-begin';

  return (
    <View style={styles.card} testID="dashboard-routine">
      <Text style={styles.title}>Today's routine</Text>
      <Text style={styles.body}>
        {target ? target.name : 'All done for today.'}
      </Text>

      <View style={styles.row}>
        <Text style={styles.meta}>
          {target ? `${calculateTotalDuration(target.activities)} min` : ''}
        </Text>
        <TouchableOpacity
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel.replace(' ›', '')}
          testID={ctaTestID}
        >
          <Text style={styles.cta}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Layout.shadow.sm,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  emptyBody: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  cta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
