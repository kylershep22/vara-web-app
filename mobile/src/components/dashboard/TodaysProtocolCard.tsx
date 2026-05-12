/**
 * TodaysProtocolCard
 * Informational badge: shows the user's completed protocol for today
 * — name, modality icon, duration, description, completion check.
 *
 * Sub-step 2.7 fix (Observation 3): the V1 self-attest UI (Begin →
 * static instructions → Done) has been removed entirely. The card no
 * longer accepts `completed` or `onMarkCompleted` props; it always
 * renders the informational view. The dashboard guards the mount on
 * `brainStateCheckIn.protocolCompleted === true` so this never renders
 * pre-completion. Protocol launches happen through CheckInFlow (chip
 * tap on dashboard, or onboarding's first protocol).
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import type { Protocol } from '../../types/models';
import {
  formatProtocolDuration,
  modalityIconName,
} from '../../utils/protocolDisplay';

interface TodaysProtocolCardProps {
  protocol: Protocol;
}

export const TodaysProtocolCard: React.FC<TodaysProtocolCardProps> = ({
  protocol,
}) => {
  const iconName = modalityIconName(protocol.modality) as
    | 'weather-windy'
    | 'run-fast'
    | 'headphones'
    | 'eye-outline'
    | 'snowflake'
    | 'brain'
    | 'weather-sunny';
  const durationLabel = formatProtocolDuration(protocol);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name={iconName} size={20} color={Colors.evergreenTeal} />
          <Text style={styles.protocolName}>{protocol.name}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{durationLabel}</Text>
        </View>
      </View>

      <Text style={styles.description}>{protocol.description}</Text>

      <View style={styles.completedRow}>
        <Icon name="check-circle" size={16} color={Colors.success} />
        <Text style={styles.completedText}>Completed</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  protocolName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  durationBadge: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
