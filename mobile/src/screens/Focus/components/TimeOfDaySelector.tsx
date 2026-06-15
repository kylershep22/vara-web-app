/**
 * TimeOfDaySelector Component
 * Horizontal chip row for selecting routine time of day
 *
 * Per Focus Page Spec Section 6.1:
 * - Options: Morning, Evening, Sunday, Custom (4 total - removed Bedtime)
 * - Layout: Horizontal flex row, 8px gap, vertical icon+label
 * - Selected: primary bg, white text/icon
 * - Unselected: surface bg, 1.5px secondary border
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
} from '../../../constants/designTokens';

export type TimeOfDay = 'morning' | 'evening' | 'sunday' | 'custom';

interface TimeOption {
  value: TimeOfDay;
  label: string;
  icon: string;
}

const TIME_OPTIONS: TimeOption[] = [
  { value: 'morning', label: 'Morning', icon: 'white-balance-sunny' },
  { value: 'evening', label: 'Evening', icon: 'moon-waning-crescent' },
  { value: 'sunday', label: 'Sunday', icon: 'calendar' },
  { value: 'custom', label: 'Custom', icon: 'creation' },
];

interface TimeOfDaySelectorProps {
  /** Currently selected time of day */
  selectedTime: TimeOfDay;
  /** Callback when selection changes */
  onTimeChange: (time: TimeOfDay) => void;
}

export const TimeOfDaySelector: React.FC<TimeOfDaySelectorProps> = ({
  selectedTime,
  onTimeChange,
}) => {
  const handlePress = (time: TimeOfDay) => {
    if (time !== selectedTime) {
      Haptics.selectionAsync();
      onTimeChange(time);
    }
  };

  return (
    <View style={styles.container}>
      {TIME_OPTIONS.map((option) => {
        const isSelected = selectedTime === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
            ]}
            onPress={() => handlePress(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${option.label} routine${isSelected ? ', selected' : ''}`}
            activeOpacity={0.7}
          >
            <Icon
              name={option.icon as any}
              size={18}
              color={isSelected ? '#FFFFFF' : '#1B5E57'}
            />
            <Text
              style={[
                styles.chipLabel,
                isSelected && styles.chipLabelSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chip: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B8CDBA', // Silver Sage
  },
  chipSelected: {
    backgroundColor: '#1B5E57', // Evergreen Teal
    borderColor: '#1B5E57',
  },
  chipLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textPrimary,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
  },
});

export default TimeOfDaySelector;
