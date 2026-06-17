// SuggestedActionCard — post-check-in only.
//
// A standing short capacity practice (from suggestedAction(), time-of-day driven
// and independent of the just-completed plan, so it never re-surfaces what the
// user just did). Completion-agnostic copy — it serves both the finished and the
// checked-in-but-abandoned cases. "Create capacity" framing; no meter, no score.
//
// onStart is wired by the screen to launch PracticeRun with the protocol id.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography, Layout } from '../../constants';
import type { Protocol } from '../../types/models';

export interface SuggestedActionCardProps {
  protocol: Protocol;
  onStart: () => void;
}

export const SuggestedActionCard: React.FC<SuggestedActionCardProps> = ({
  protocol,
  onStart,
}) => {
  return (
    <View style={styles.card} testID="dashboard-suggested-action">
      <Text style={styles.eyebrow}>A little capacity</Text>
      <Text style={styles.name}>{protocol.name}</Text>
      <Text style={styles.meta}>{protocol.timeWindow} min</Text>
      <TouchableOpacity
        style={styles.cta}
        onPress={onStart}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Start ${protocol.name}, ${protocol.timeWindow} minutes`}
        testID="dashboard-suggested-action-start"
      >
        <Text style={styles.ctaText}>Start</Text>
        <Icon name="chevron-right" size={18} color={Colors.evergreenTeal} />
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
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  ctaText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
});
