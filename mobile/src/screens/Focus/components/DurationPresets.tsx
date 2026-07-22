/**
 * DurationPresets
 * Focus session length: two one-tap presets (25 / 90 min) plus a validated
 * custom entry. Default selection is 25. One option is always selected.
 *
 * Copy is deliberately neutral: 25 and 90 are conventional cycle lengths, not
 * clinically proven ones, so labels carry no efficacy claim ("25 min", "90 min",
 * "Custom" — with plain "a short cycle" / "a long cycle" descriptors only).
 *
 * Selection is a calm state change — a color swap, no bounce or celebration, so
 * it reads the same with Reduce Motion on.
 */

import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  SizeTokens,
} from '../../../constants/designTokens';
import { FocusCopy } from '../../../constants/focusContent';

/** Custom-entry bounds (minutes). Below 5, a focus timer is the wrong tool; 180 = 3h ceiling. */
export const DURATION_CUSTOM_MIN = 5;
export const DURATION_CUSTOM_MAX = 180;

const SHORT_CYCLE = 25;
const LONG_CYCLE = 90;

interface DurationPresetsProps {
  /** Currently selected duration in minutes (source of truth in the parent). */
  selectedDuration: number;
  /** Called with a valid duration when the selection changes. */
  onDurationChange: (duration: number) => void;
  /** Whether selection is disabled (e.g., timer running). */
  disabled?: boolean;
}

function isCustomDuration(duration: number): boolean {
  return duration !== SHORT_CYCLE && duration !== LONG_CYCLE;
}

/**
 * Validate a custom-entry string. Returns the parsed minutes when it is a whole
 * number within [MIN, MAX], else null. Rejects empty, non-numeric, zero,
 * negative, fractional, and out-of-range.
 */
export function parseCustomDuration(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) return null;
  const n = Number(text.trim());
  if (!Number.isInteger(n)) return null;
  if (n < DURATION_CUSTOM_MIN || n > DURATION_CUSTOM_MAX) return null;
  return n;
}

export const DurationPresets: React.FC<DurationPresetsProps> = ({
  selectedDuration,
  onDurationChange,
  disabled = false,
}) => {
  // Custom entry is open when the current duration isn't one of the presets
  // (e.g. a Center-first resume length), or once the user taps Custom.
  const startsCustom = isCustomDuration(selectedDuration);
  const [customOpen, setCustomOpen] = useState(startsCustom);
  const [customText, setCustomText] = useState(
    startsCustom ? String(selectedDuration) : ''
  );
  const [customError, setCustomError] = useState(false);

  const activeKey: 'short' | 'long' | 'custom' = customOpen
    ? 'custom'
    : selectedDuration === LONG_CYCLE
      ? 'long'
      : 'short';

  const selectPreset = (minutes: number) => {
    if (disabled) return;
    Haptics.selectionAsync();
    setCustomOpen(false);
    setCustomError(false);
    onDurationChange(minutes);
  };

  const openCustom = () => {
    if (disabled) return;
    Haptics.selectionAsync();
    setCustomOpen(true);
    // Reopening with an already-valid value keeps the duration; otherwise wait
    // for a valid entry (the parent's last valid duration stays selected).
    const parsed = parseCustomDuration(customText);
    setCustomError(customText.length > 0 && parsed === null);
    if (parsed !== null) onDurationChange(parsed);
  };

  const onCustomText = (text: string) => {
    setCustomText(text);
    const parsed = parseCustomDuration(text);
    if (parsed !== null) {
      setCustomError(false);
      onDurationChange(parsed);
    } else {
      // Empty is neutral (no error yet); anything else invalid shows the hint.
      setCustomError(text.length > 0);
    }
  };

  const presetStyle = (active: boolean) => [
    styles.preset,
    active && styles.presetSelected,
    disabled && styles.presetDisabled,
  ];
  const presetTextStyle = (active: boolean) => [
    styles.presetText,
    active && styles.presetTextSelected,
    disabled && styles.presetTextDisabled,
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{FocusCopy.durationChipsLabel}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          testID="duration-preset-25"
          style={presetStyle(activeKey === 'short')}
          onPress={() => selectPreset(SHORT_CYCLE)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: activeKey === 'short', disabled }}
          accessibilityLabel="25 minutes, a short cycle"
          activeOpacity={0.7}
        >
          <Text style={presetTextStyle(activeKey === 'short')}>25 min</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="duration-preset-90"
          style={presetStyle(activeKey === 'long')}
          onPress={() => selectPreset(LONG_CYCLE)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: activeKey === 'long', disabled }}
          accessibilityLabel="90 minutes, a long cycle"
          activeOpacity={0.7}
        >
          <Text style={presetTextStyle(activeKey === 'long')}>90 min</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="duration-preset-custom"
          style={presetStyle(activeKey === 'custom')}
          onPress={openCustom}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: activeKey === 'custom', disabled }}
          accessibilityLabel="Custom length"
          activeOpacity={0.7}
        >
          <Text style={presetTextStyle(activeKey === 'custom')}>Custom</Text>
        </TouchableOpacity>
      </View>

      {customOpen && (
        <View style={styles.customEntry}>
          <TextInput
            testID="duration-custom-input"
            style={[styles.customInput, customError && styles.customInputError]}
            value={customText}
            onChangeText={onCustomText}
            editable={!disabled}
            keyboardType="number-pad"
            maxLength={3}
            placeholder={`${DURATION_CUSTOM_MIN}–${DURATION_CUSTOM_MAX} min`}
            placeholderTextColor={ColorTokens.textSecondary}
            accessibilityLabel="Custom session length in minutes"
            returnKeyType="done"
          />
          {customError && (
            <Text testID="duration-custom-error" style={styles.customErrorText}>
              {`Enter a whole number from ${DURATION_CUSTOM_MIN} to ${DURATION_CUSTOM_MAX} minutes.`}
            </Text>
          )}
        </View>
      )}
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
  row: {
    flexDirection: 'row',
    gap: SpacingTokens.sm,
  },
  preset: {
    flex: 1,
    minHeight: SizeTokens.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.lg,
    borderWidth: 1.5,
    borderColor: ColorTokens.secondary,
  },
  presetSelected: {
    backgroundColor: ColorTokens.primary,
    borderColor: ColorTokens.primary,
  },
  presetDisabled: {
    opacity: 0.5,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textPrimary,
  },
  presetTextSelected: {
    color: ColorTokens.textOnPrimary,
  },
  presetTextDisabled: {
    color: ColorTokens.textSecondary,
  },
  customEntry: {
    marginTop: SpacingTokens.sm,
  },
  customInput: {
    minHeight: SizeTokens.touchTargetMin,
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.md,
    borderWidth: 1.5,
    borderColor: ColorTokens.secondary,
    paddingHorizontal: SpacingTokens.md,
    fontSize: 16,
    color: ColorTokens.textPrimary,
    textAlign: 'center',
  },
  customInputError: {
    borderColor: ColorTokens.error,
  },
  customErrorText: {
    fontSize: 12,
    color: ColorTokens.error,
    marginTop: SpacingTokens.xs,
    textAlign: 'center',
  },
});

export default DurationPresets;
