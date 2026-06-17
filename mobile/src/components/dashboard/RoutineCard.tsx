// RoutineCard — reworked dashboard routine surface (both phases).
//
// Replaces RoutinesCard (left intact/reversible) with the spec treatment:
//  - Neutral progress at ROUTINE level: each of today's routines is a teal dot
//    when complete, a pale dot when remaining. No streak, no count-up score.
//    (Per-activity progress is not available — dashboard completion is binary
//    per routine via getRoutineCompletionToday — so progress is routine-level.)
//  - One contextual CTA following the ladder: continue → begin → check habits →
//    create one.
//  - Warm empty state when no routine exists.
//
// Data comes from the existing useDashboard wiring (fetchUserRoutines +
// getRoutineCompletionToday); this is presentation only.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  Routine,
  calculateTotalDuration,
} from '../../services/firebase/routines.service';
import {
  getTemplatesForType,
  RoutineTemplate,
} from '../../constants/routineTemplates';

interface RoutineCardProps {
  routines: Routine[];
  completions: Record<string, boolean>;
  onBeginRoutine: (routine: Routine) => void;
  onNavigateToRoutines: () => void;
  onNavigateToHabits: () => void;
  onApplyTemplate: (template: RoutineTemplate) => void;
}

function timeBasedTemplates(): RoutineTemplate[] {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  if (day === 0) return getTemplatesForType('sunday').slice(0, 2);
  if (hour < 12) return getTemplatesForType('morning').slice(0, 2);
  return getTemplatesForType('evening').slice(0, 2);
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  routines,
  completions,
  onBeginRoutine,
  onNavigateToRoutines,
  onNavigateToHabits,
  onApplyTemplate,
}) => {
  // ── Warm empty state ──────────────────────────────────────────────
  if (routines.length === 0) {
    const templates = timeBasedTemplates();
    return (
      <View style={styles.card} testID="dashboard-routine-empty">
        <Text style={styles.title}>Your routines</Text>
        <Text style={styles.emptyBody}>
          Routines help when you want a little structure. None yet, and that's
          fine.
        </Text>
        {templates.map((template) => (
          <TouchableOpacity
            key={template.id}
            style={styles.templateRow}
            onPress={() => onApplyTemplate(template)}
            activeOpacity={0.7}
          >
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templateCta}>Try this</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={onNavigateToRoutines}
          accessibilityRole="button"
          accessibilityLabel="Create a routine"
          testID="dashboard-routine-create"
        >
          <Text style={styles.link}>Create a routine</Text>
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
    ctaLabel = 'Check habits';
    onCta = onNavigateToHabits;
    ctaTestID = 'dashboard-routine-check-habits';
  } else if (doneCount > 0 && firstIncomplete) {
    ctaLabel = 'Continue';
    onCta = () => onBeginRoutine(firstIncomplete);
    ctaTestID = 'dashboard-routine-continue';
  } else {
    ctaLabel = 'Begin routine';
    onCta = () => firstIncomplete && onBeginRoutine(firstIncomplete);
    ctaTestID = 'dashboard-routine-begin';
  }

  return (
    <View style={styles.card} testID="dashboard-routine">
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your routines</Text>
        {/* Neutral routine-level progress: teal = done, pale = remaining. */}
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
      </View>

      {firstIncomplete ? (
        <Text style={styles.routineMeta}>
          {firstIncomplete.name} · {calculateTotalDuration(firstIncomplete.activities)} min
        </Text>
      ) : (
        <Text style={styles.routineMeta}>All done for today.</Text>
      )}

      <TouchableOpacity
        style={styles.cta}
        onPress={onCta}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={ctaLabel}
        testID={ctaTestID}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotDone: {
    backgroundColor: Colors.evergreenTeal,
  },
  dotRemaining: {
    backgroundColor: Colors.divider,
  },
  routineMeta: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: Spacing.xs,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  ctaText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  emptyBody: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  templateName: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  templateCta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  link: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    marginTop: Spacing.sm,
  },
});
