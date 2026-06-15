// Step 2 of the reworked core loop: the two-tap circumplex state read
// (Vara_Engine_Contract.md §2). Replaces the prior five-chip BrainState pick.
//
//   Tap 1 (arousal): "Where's your energy?"  → Revved up / Running low
//   Tap 2 (valence): "And how's it feeling?" → Good / Hard
//
// The two taps are one step with an internal sub-state: tapping arousal swaps
// the question to valence; tapping valence emits the full {arousal, valence}
// pair upward in a single `state_selected` action (keeps the reducer flat). A
// back affordance returns from the valence tap to the arousal tap; back from
// the arousal tap returns to the situation step (parent reducer).

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../../constants';
import type { Arousal, Valence } from '../../../engine';

const MIN_TOUCH_TARGET = 48;

export interface StatePickStepViewProps {
  onSelect: (state: { arousal: Arousal; valence: Valence }) => void;
  // Returns to the situation step (only meaningful from the arousal tap; the
  // valence tap's back returns to the arousal tap internally).
  onBack?: () => void;
  onClose?: () => void;
}

interface TapOption<T> {
  value: T;
  label: string;
}

const AROUSAL_OPTIONS: TapOption<Arousal>[] = [
  { value: 'revved', label: 'Revved up' },
  { value: 'low', label: 'Running low' },
];

const VALENCE_OPTIONS: TapOption<Valence>[] = [
  { value: 'good', label: 'Good' },
  { value: 'hard', label: 'Hard' },
];

export function StatePickStepView({
  onSelect,
  onBack,
  onClose,
}: StatePickStepViewProps) {
  const [arousal, setArousal] = useState<Arousal | null>(null);

  const onTap = arousal === null ? 'arousal' : 'valence';

  const handleBack = () => {
    if (arousal !== null) {
      // Return from the valence tap to the arousal tap.
      setArousal(null);
      return;
    }
    onBack?.();
  };

  return (
    <View style={styles.container} testID="checkin-flow-state-pick">
      <View style={styles.header}>
        {onBack || arousal !== null ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="checkin-flow-state-pick-back"
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
            testID="checkin-flow-state-pick-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {onTap === 'arousal' ? (
          <>
            <Text style={styles.title} testID="checkin-flow-arousal-title">
              Where's your energy?
            </Text>
            <View style={styles.options}>
              {AROUSAL_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.option}
                  onPress={() => setArousal(option.value)}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  testID={`checkin-flow-arousal-${option.value}`}
                >
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title} testID="checkin-flow-valence-title">
              And how's it feeling?
            </Text>
            <View style={styles.options}>
              {VALENCE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.option}
                  onPress={() => onSelect({ arousal: arousal!, valence: option.value })}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  testID={`checkin-flow-valence-${option.value}`}
                >
                  <Text style={styles.optionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
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
  options: {
    gap: Spacing.sm,
  },
  option: {
    minHeight: MIN_TOUCH_TARGET + 16,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  optionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
});
