// Step 1 of the multi-step check-in flow: brain-state selection.
//
// Single tap advances. No confirmation button. Top-left close
// dismisses the flow with no data saved (per Core Loop v2 line 81).
// Back from this step is a no-op in the reducer — the parent's close
// affordance handles flow dismissal.
//
// Reuses BRAIN_STATES + BrainStateOptionRow from the dashboard
// surface for visual consistency. Phase 1 of the redesign already
// renamed the underlying labels (okay→steady, energized→alive).

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../../constants';
import type { BrainState } from '../../../types/models';
import { BRAIN_STATES } from '../../dashboard/brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from '../../dashboard/brainStateCheckin/BrainStateOptionRow';

const MIN_TOUCH_TARGET = 48;

export interface StatePickStepViewProps {
  onSelect: (state: BrainState) => void;
  onClose?: () => void;
}

export function StatePickStepView({
  onSelect,
  onClose,
}: StatePickStepViewProps) {
  return (
    <View style={styles.container} testID="checkin-flow-state-pick">
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        {onClose ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="checkin-flow-state-pick-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} testID="checkin-flow-state-pick-title">
          How are you right now?
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    height: 56,
  },
  headerButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  optionsList: {
    gap: 0,
  },
});
