import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { DaySlot } from '../../../hooks/useBrainStateWeekTrend';
import { BrainStateOption } from './brainStateOptions';

interface BrainStateCollapsedViewProps {
  selectedState: BrainStateOption;
  onChangePress: () => void;
  onSeeWeekPress: () => void;
  days: DaySlot[];
  summary: string | null;
}

export const BrainStateCollapsedView: React.FC<BrainStateCollapsedViewProps> = ({
  selectedState,
  onChangePress,
  onSeeWeekPress,
  days,
  summary,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.collapsedRow}>
        <View style={styles.collapsedLeft}>
          <View style={[styles.dot, { backgroundColor: selectedState.color }]} />
          <Text style={styles.collapsedLabel}>{selectedState.label}</Text>
        </View>
        <TouchableOpacity
          onPress={onChangePress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.changeButton}>Change</Text>
        </TouchableOpacity>
      </View>

      {summary && (
        <View style={styles.trendSection}>
          <View style={styles.dotsRow}>
            {days.map((day) => (
              <View key={day.date} style={styles.dayColumn}>
                <View
                  style={[
                    styles.trendDot,
                    day.color
                      ? { backgroundColor: day.color }
                      : styles.trendDotEmpty,
                  ]}
                />
                <Text style={styles.dayLabel}>{day.dayLabel}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.summaryText}>{summary}</Text>
          <TouchableOpacity
            onPress={onSeeWeekPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeWeekLink}>See your week →</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
  },
  collapsedLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  changeButton: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  trendSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trendDotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  summaryText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  seeWeekLink: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
});
