/**
 * DurationChips Component
 * Horizontal row of duration selector chips
 *
 * Per Focus Page Spec Section 5.2:
 * - Values: [10, 15, 25, 45, 60] (90m hidden as advanced option)
 * - Layout: Horizontal flex row, equal flex per chip, 8px gap
 * - Height: 40px, radius-lg (12px)
 * - Selected: color-primary background, white text, no border
 * - Unselected: surface background, 1.5px secondary border, text-primary
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  SizeTokens,
  FocusCopy,
} from '../../../tokens/design-tokens';

interface DurationChipsProps {
  /** Currently selected duration in minutes */
  selectedDuration: number;
  /** Callback when duration changes */
  onDurationChange: (duration: number) => void;
  /** Whether chip selection is disabled (e.g., timer running) */
  disabled?: boolean;
  /** Show the 90-minute advanced option */
  showAdvanced?: boolean;
}

// Standard durations per spec, with 90m as hidden advanced option
const STANDARD_DURATIONS = [10, 15, 25, 45, 60];
const ADVANCED_DURATIONS = [...STANDARD_DURATIONS, 90];

export const DurationChips: React.FC<DurationChipsProps> = ({
  selectedDuration,
  onDurationChange,
  disabled = false,
  showAdvanced = false,
}) => {
  const durations = showAdvanced ? ADVANCED_DURATIONS : STANDARD_DURATIONS;

  const handlePress = (duration: number) => {
    if (!disabled && duration !== selectedDuration) {
      Haptics.selectionAsync();
      onDurationChange(duration);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{FocusCopy.durationChipsLabel}</Text>
      <View style={styles.chipsRow}>
        {durations.map((duration) => {
          const isSelected = selectedDuration === duration;

          return (
            <TouchableOpacity
              key={duration}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => handlePress(duration)}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityState={{
                selected: isSelected,
                disabled,
              }}
              accessibilityLabel={`${duration} minute session${isSelected ? ', selected' : ''}`}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                  disabled && styles.chipTextDisabled,
                ]}
              >
                {`${duration}m`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SpacingTokens.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: ColorTokens.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: SpacingTokens.sm,
  },
  chip: {
    flex: 1,
    height: SizeTokens.durationChipHeight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.lg,
    borderWidth: 1.5,
    borderColor: ColorTokens.secondary,
  },
  chipSelected: {
    backgroundColor: ColorTokens.primary,
    borderColor: ColorTokens.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textPrimary,
  },
  chipTextSelected: {
    color: ColorTokens.textOnPrimary,
  },
  chipTextDisabled: {
    color: ColorTokens.textSecondary,
  },
});

export default DurationChips;
