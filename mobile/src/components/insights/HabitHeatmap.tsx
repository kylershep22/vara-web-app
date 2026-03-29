/**
 * Habit Heatmap
 * 30-day activity heatmap showing habit completion intensity
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  dewSage: '#D5E3D1',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

// Heatmap color scale (5 levels)
const HEATMAP_COLORS = [
  '#F0F2F0', // 0 completions (near white)
  '#D5E3D1', // 1 completion (dewSage)
  '#9BB89D', // 2 completions (mid sage)
  '#227A71', // 3 completions (tealMid)
  '#1B5E57', // 4+ completions (teal)
];

interface HabitHeatmapProps {
  data: { date: string; count: number }[];
  daysToShow?: number;
}

const getColorForCount = (count: number): string => {
  if (count === 0) return HEATMAP_COLORS[0];
  if (count === 1) return HEATMAP_COLORS[1];
  if (count === 2) return HEATMAP_COLORS[2];
  if (count === 3) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
};

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  data,
  daysToShow = 30,
}) => {
  // Generate last N days
  const generateDaysArray = () => {
    const days: { date: string; count: number }[] = [];
    const today = new Date();

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Find matching data or default to 0
      const dayData = data.find((d) => d.date === dateStr);
      days.push({
        date: dateStr,
        count: dayData?.count || 0,
      });
    }

    return days;
  };

  const days = generateDaysArray();

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon name="calendar-blank-outline" size={14} color={VARA_COLORS.teal} />
        </View>
        <Text style={styles.title}>Habit activity</Text>
        <Text style={styles.secondaryLabel}>Past {daysToShow} days</Text>
      </View>

      {/* Heatmap grid */}
      <View style={styles.grid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={day.date}
            style={[styles.cell, { backgroundColor: getColorForCount(day.count) }]}
            activeOpacity={0.7}
            onPress={() => {
              // Could show tooltip with date and count
            }}
          >
            {/* Tooltip could be added here */}
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={styles.legendColors}>
          {HEATMAP_COLORS.map((color, index) => (
            <View
              key={index}
              style={[styles.legendSquare, { backgroundColor: color }]}
            />
          ))}
        </View>
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: VARA_COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  iconCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: 'rgba(213,227,209,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
  },
  secondaryLabel: {
    fontSize: 9,
    fontWeight: '400',
    color: VARA_COLORS.sageGray,
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  cell: {
    width: 19,
    height: 19,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  legendText: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
  },
  legendColors: {
    flexDirection: 'row',
    gap: 3,
  },
  legendSquare: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
});

export { HabitHeatmap };
