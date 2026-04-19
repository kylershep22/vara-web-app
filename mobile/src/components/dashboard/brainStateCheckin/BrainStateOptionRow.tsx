import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { BrainState } from '../../../types';
import { BrainStateOption } from './brainStateOptions';
import { withAlpha } from './colorUtils';

interface BrainStateOptionRowProps {
  option: BrainStateOption;
  onPress: (state: BrainState) => void;
  selected?: boolean;
  disabled?: boolean;
  isLast?: boolean;
}

export const BrainStateOptionRow: React.FC<BrainStateOptionRowProps> = ({
  option,
  onPress,
  selected = false,
  disabled = false,
  isLast = false,
}) => {
  const backgroundColor = withAlpha(option.color, 0.12);
  const borderColor = withAlpha(option.color, selected ? 0.6 : 0.3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={option.label}
      accessibilityHint={option.description}
      onPress={() => !disabled && onPress(option.state)}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor, borderColor },
        !isLast && styles.rowSpacing,
        disabled && styles.rowDisabled,
        pressed && !disabled && styles.rowPressed,
      ]}
    >
      <View
        testID={`brain-state-dot-${option.state}`}
        style={[styles.dot, { backgroundColor: option.color }]}
      />
      <View style={styles.textColumn}>
        <Text style={styles.label}>{option.label}</Text>
        <Text style={styles.description}>{option.description}</Text>
      </View>
      {selected && (
        <MaterialCommunityIcons
          testID={`brain-state-check-${option.state}`}
          name="check-circle"
          size={22}
          color={option.color}
          style={styles.check}
        />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  rowSpacing: {
    marginBottom: Spacing.sm,
  },
  rowPressed: {
    opacity: 0.85,
  },
  rowDisabled: {
    opacity: 0.5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: Spacing.base,
  },
  textColumn: {
    flex: 1,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  check: {
    marginLeft: Spacing.sm,
  },
});
