// Step 5 of the multi-step check-in flow: post-protocol re-check.
//
// Locked re-check copy: "How are you now?" alone, no protocol-name
// subtitle (SPEC_CONSISTENCY_BACKLOG: re-check copy override; the
// just-completed protocol is identified visually elsewhere on the
// screen — header chip showing the protocol name).
//
// Same five-state chips as the initial check-in. Single tap advances.
// Back navigation is DISABLED (locked decision B) — once the player
// completes, the only forward path is selecting a stateAfter.

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Colors, Spacing, Typography } from '../../../constants';
import type { BrainState, Protocol } from '../../../types/models';
import { BRAIN_STATES } from '../../dashboard/brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from '../../dashboard/brainStateCheckin/BrainStateOptionRow';

export interface ReCheckStepViewProps {
  protocol: Protocol;
  onSelect: (stateAfter: BrainState) => void;
}

export function ReCheckStepView({ protocol, onSelect }: ReCheckStepViewProps) {
  return (
    <View style={styles.container} testID="checkin-flow-re-check">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={styles.protocolChip}
          testID="checkin-flow-re-check-protocol-chip"
          accessibilityLabel={`Just completed: ${protocol.name}`}
        >
          <Text style={styles.protocolChipLabel}>Just completed</Text>
          <Text style={styles.protocolChipName}>{protocol.name}</Text>
        </View>

        <Text style={styles.title} testID="checkin-flow-re-check-title">
          How are you now?
        </Text>

        <View style={styles.optionsList}>
          {BRAIN_STATES.map((option, index) => (
            <BrainStateOptionRow
              key={option.state}
              option={option}
              onPress={onSelect}
              isLast={index === BRAIN_STATES.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  protocolChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    backgroundColor: Colors.dewSage,
    marginBottom: Spacing.lg,
  },
  protocolChipLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  protocolChipName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginTop: 2,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    // Phase 2.8.3 — Evergreen Teal per UI Standards §4.2. Was
    // softCharcoal pre-2.8.3.
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
  },
  optionsList: {
    gap: 0,
  },
});
