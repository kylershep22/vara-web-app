// Step 2 of the revised core loop: time-window selection.
//
// Five chips per Core Loop v2 lines 99-105. Single tap advances —
// no confirmation button. Back arrow returns to step 1 (parent
// preserves state selection). Top-left close dismisses the entire
// flow with no data saved.
//
// initialValue is the parent's preserved selection on back-navigation
// from a later step; on first arrival it should be null/undefined so
// no chip is pre-selected. Per spec line 113, "no option is
// pre-selected" — but a previously-selected chip on back-nav can
// carry a subtle teal outline to remind the user of their prior pick.

import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../constants';
import { getAllProtocols } from '../../constants/brainStateProtocols';
import type { BrainState, ProtocolTimeWindow } from '../../types/models';

const MIN_TOUCH_TARGET = 48;

export interface TimeWindowSelectorProps {
  initialValue?: ProtocolTimeWindow | null;
  onSelect: (value: ProtocolTimeWindow) => void;
  onBack?: () => void;
  onClose?: () => void;
  // Sub-step 2.7 round 5 (Bug E fix, option E2): when present, the
  // chip set is filtered to time windows that have at least one
  // eligible protocol for the given state. Prevents the user from
  // picking a (state, time) combo that has zero matches in the
  // catalog (e.g. clear+2, which previously crashed the recommender
  // via `protocolSelector: no protocol matched`). Optional —
  // omitted on the legacy / dev-harness call paths that don't have
  // a brain state captured.
  brainState?: BrainState;
}

interface TimeWindowChipData {
  value: ProtocolTimeWindow;
  label: string;
  framing: string;
}

const TIME_WINDOWS: TimeWindowChipData[] = [
  { value: 2, label: '2 minutes', framing: 'A quick reset' },
  { value: 5, label: '5 minutes', framing: 'A meaningful shift' },
  { value: 10, label: '10 minutes', framing: 'Deeper recovery' },
  { value: 20, label: '20 minutes', framing: 'Full reset' },
  { value: 45, label: '45+ minutes', framing: 'Focused work or deep rest' },
];

// Eligible time windows for a given state. A window is eligible if
// at least one protocol exists with that timeWindow AND lists the
// state in its suitableForStates. Mirrors the recommender's
// eligibility-set logic so a chip the user can tap will always
// resolve to ≥1 protocol downstream.
//
// Note: this uses *exact* timeWindow match, not "≤ user's window."
// Reason: the recommender's `<= chosenWindow` filter combined with
// the closest-match sort means a 5-min protocol will satisfy a
// 10-min-budget tap. So the chip set should hide ONLY the windows
// where literally nothing eligible exists for that state at any
// duration ≤ that window. For clear@2: no clear-suitable protocol
// exists at duration ≤ 2 (the smallest clear-suitable protocol is
// 5-min coherence-breathing-5), so the 2-min chip is hidden.
export function eligibleTimeWindowsFor(
  state: BrainState
): ReadonlyArray<ProtocolTimeWindow> {
  const allProtocols = getAllProtocols();
  const eligible = (window: ProtocolTimeWindow): boolean =>
    allProtocols.some(
      (p) => p.suitableForStates.includes(state) && p.timeWindow <= window
    );
  return TIME_WINDOWS.map((w) => w.value).filter(eligible);
}

export function TimeWindowSelector({
  initialValue = null,
  onSelect,
  onBack,
  onClose,
  brainState,
}: TimeWindowSelectorProps) {
  // Bug E fix (round 5, option E2): when brainState is present,
  // filter chips to eligible windows only. When absent (legacy /
  // dev-harness callers), show all chips — preserves prior behavior
  // until those callers are updated.
  const visibleChips = useMemo(() => {
    if (brainState == null) return TIME_WINDOWS;
    const eligibleSet = new Set(eligibleTimeWindowsFor(brainState));
    return TIME_WINDOWS.filter((c) => eligibleSet.has(c.value));
  }, [brainState]);

  return (
    <View style={styles.container} testID="time-window-selector">
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="time-window-back"
          >
            <Icon name="arrow-left" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        {onClose ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="time-window-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title} testID="time-window-title">
          How much time do you have?
        </Text>
        <Text style={styles.subtitle}>
          We'll suggest something that fits.
        </Text>

        <View style={styles.chips}>
          {visibleChips.map((chip) => {
            const isPreviouslySelected = chip.value === initialValue;
            return (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.chip,
                  isPreviouslySelected && styles.chipPreviouslySelected,
                ]}
                onPress={() => onSelect(chip.value)}
                accessibilityRole="button"
                accessibilityLabel={`${chip.label} — ${chip.framing}`}
                testID={`time-window-chip-${chip.value}`}
              >
                <Text style={styles.chipLabel}>{chip.label}</Text>
                <Text style={styles.chipFraming}>{chip.framing}</Text>
              </TouchableOpacity>
            );
          })}
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
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xl,
  },
  chips: {
    gap: Spacing.sm,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET + 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  chipPreviouslySelected: {
    // Subtle teal outline marks the user's prior pick on back-nav,
    // per Core Loop v2 line 113. Not a "selected" state — taps still
    // fire onSelect normally.
    borderColor: Colors.evergreenTeal,
    borderWidth: 2,
  },
  chipLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  chipFraming: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});
