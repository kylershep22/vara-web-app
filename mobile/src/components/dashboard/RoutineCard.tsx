// RoutineCard: the dashboard routine surface (both phases).
//
// Single-routine card matching its "Today's routine" title: it surfaces today's
// FIRST incomplete active routine as the one invitation to begin. No progress
// dots. A multi-routine dot strip (one dot per active routine) made the same
// "The Essentials" card show a different count as the active-routine set changed,
// reading as an inconsistency. Dashboard completion is binary per routine
// (getRoutineCompletionToday returns a boolean) and there is no routine-run model, so
// there is nothing to count at the card level.
//
// CTA: begin the surfaced routine, or create one when none exist. Once every
// routine is done the card stays, says so, and offers no action: "Check habits"
// left with habits (ROUTINES-RESTORE, ruling C of the V1 SCOPE REVISION block).
// Every action is a text link, never a filled primary: the day's protocol is the
// primary action on Today and routines must not compete with it (ruling B).
// Presentation only (data from useDashboard, refreshed on focus so it reflects
// routines added or deactivated on the Time screen).
//
// ON THE IMMERSIVE GROUND (R3a). The fill is the surface tier's, read through
// useSurfaceFill so Reduce Transparency makes it opaque White. Secondary text
// takes the onImmersive pattern (CloseWeekEntry, StartHereRow): Soft Charcoal,
// because Muted Sage Gray reaches only 3.75 to 4.24:1 on this tier. Geometry,
// spacing and type are placeholders R3b owns.

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../shared/Text';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useImmersiveSurface, useSurfaceFill } from '../shared/SurfaceTier';
import { CardHeading } from './CardHeading';
import {
  Routine,
  calculateTotalDuration,
} from '../../services/firebase/routines.service';

interface RoutineCardProps {
  routines: Routine[];
  completions: Record<string, boolean>;
  onBeginRoutine: (routine: Routine) => void;
  onNavigateToRoutines: () => void;
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  routines,
  completions,
  onBeginRoutine,
  onNavigateToRoutines,
}) => {
  const fill = useSurfaceFill();
  const onGround = useImmersiveSurface() && styles.onImmersive;

  // Warm empty state (spec §4).
  if (routines.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: fill }]} testID="dashboard-routine-empty">
        <CardHeading
          icon="clipboard-check-outline"
          title="Today's routine"
          style={styles.heading}
        />
        <Text style={[styles.emptyBody, onGround]}>
          {"When you set a routine, it'll show up here."}
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

  return (
    <View style={[styles.card, { backgroundColor: fill }]} testID="dashboard-routine">
      <CardHeading
        icon="clipboard-check-outline"
        title="Today's routine"
        style={styles.heading}
      />
      <Text style={styles.body}>
        {target ? target.name : 'All done for today.'}
      </Text>

      {/* All done: no action and no meta line (Kyle's ruling 2 of 2026-09-30). */}
      {target && (
        <View style={styles.row}>
          <Text style={[styles.meta, onGround]}>
            {`${calculateTotalDuration(target.activities)} min`}
          </Text>
          <TouchableOpacity
            onPress={() => onBeginRoutine(target)}
            accessibilityRole="button"
            accessibilityLabel="Begin"
            testID="dashboard-routine-begin"
          >
            <Text style={styles.cta}>Begin ›</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // No fill here: it is applied from useSurfaceFill at render.
  // marginTop is the calm remainder's row gap (DashboardScreen's rowSurface).
  // At 33847ca the card sat ABOVE the good-moments row and its marginBottom
  // made the gap; below that row nothing did, and the two surfaces touched.
  card: {
    marginTop: Spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Layout.shadow.sm,
  },
  heading: {
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
  // Secondary text. The card renders only on Today's ground, where onImmersive
  // supplies its colour; Muted Sage Gray is not restored (ruling C).
  meta: {
    fontSize: Typography.fontSize.sm,
  },
  emptyBody: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  onImmersive: {
    color: Colors.softCharcoal,
  },
  cta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
