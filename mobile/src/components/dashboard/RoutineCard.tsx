// RoutineCard — dashboard routine surface (both phases).
//
// Matches the mockup .card (title "Today's routine", routine name as the body
// line, neutral progress dots, contextual CTA), with one deliberate override:
//
//   Progress is ROUTINE-LEVEL, not per-step. Dashboard completion is binary per
//   routine (getRoutineCompletionToday → boolean); there is no per-activity
//   state and we are NOT building a routine-run model. So the dots are one per
//   routine (done = teal, remaining = silverSage @ .5), not the mockup's
//   "2 of 4" per-step dots.
//
// CTA ladder (spec §4): continue → begin → check habits → create one. Warm empty
// state when no routine exists. Presentation only (data from useDashboard).

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

  const total = routines.length;
  const doneCount = routines.filter((r) => completions[r.id]).length;
  const firstIncomplete = routines.find((r) => !completions[r.id]);
  const allDone = doneCount === total;

  // CTA ladder: continue → begin → check habits.
  let ctaLabel: string;
  let onCta: () => void;
  let ctaTestID: string;
  if (allDone) {
    ctaLabel = 'Check habits ›';
    onCta = onNavigateToHabits;
    ctaTestID = 'dashboard-routine-check-habits';
  } else if (doneCount > 0 && firstIncomplete) {
    ctaLabel = 'Continue ›';
    onCta = () => onBeginRoutine(firstIncomplete);
    ctaTestID = 'dashboard-routine-continue';
  } else {
    ctaLabel = 'Begin ›';
    onCta = () => firstIncomplete && onBeginRoutine(firstIncomplete);
    ctaTestID = 'dashboard-routine-begin';
  }

  return (
    <View style={styles.card} testID="dashboard-routine">
      <Text style={styles.title}>Today's routine</Text>
      <Text style={styles.body}>
        {firstIncomplete ? firstIncomplete.name : 'All done for today.'}
      </Text>

      {/* Routine-level neutral progress: teal = done, pale = remaining. */}
      <View style={styles.dots} testID="dashboard-routine-progress">
        {routines.map((r) => (
          <View
            key={r.id}
            style={[
              styles.dot,
              completions[r.id] ? styles.dotDone : styles.dotRemaining,
            ]}
          />
        ))}
      </View>

      <View style={styles.row}>
        <Text style={styles.meta}>
          {firstIncomplete
            ? `${calculateTotalDuration(firstIncomplete.activities)} min`
            : ''}
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
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 9999,
  },
  dotDone: {
    backgroundColor: Colors.evergreenTeal,
  },
  dotRemaining: {
    backgroundColor: Colors.silverSage,
    opacity: 0.5,
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
