/**
 * Habit Heatmap
 * 30-day rhythm heatmap in 7-column calendar grid
 * Color intensity based on daily completion percentage
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';

const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  dewSage: '#D5E3D1',
  silverSage: '#A8B5A0',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

const HEATMAP_COLORS = [
  '#F0F2F0', // 0%: empty
  '#D5E3D1', // ~25%: light sage
  '#9BB89D', // ~50%: medium sage
  '#A8B5A0', // ~75%: silver sage
  '#1B5E57', // 100%: teal
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface HabitHeatmapProps {
  data: { date: string; count: number }[];
  totalHabits: number;
  daysToShow?: number;
}

const getColorForPercentage = (percentage: number): string => {
  if (percentage === 0) return HEATMAP_COLORS[0];
  if (percentage <= 25) return HEATMAP_COLORS[1];
  if (percentage <= 50) return HEATMAP_COLORS[2];
  if (percentage <= 75) return HEATMAP_COLORS[3];
  return HEATMAP_COLORS[4];
};

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({
  data,
  totalHabits,
  daysToShow = 30,
}) => {
  const gridData = useMemo(() => {
    const today = new Date();
    const days: { date: string; percentage: number }[] = [];

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayData = data.find((d) => d.date === dateStr);
      const count = dayData?.count || 0;
      const percentage = totalHabits > 0 ? (count / totalHabits) * 100 : 0;
      days.push({ date: dateStr, percentage });
    }

    // Determine which day of week the first day falls on (Monday-based: 0=Mon, 6=Sun)
    const firstDate = new Date(days[0].date);
    const firstDayOfWeek = firstDate.getDay();
    const mondayBased = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    // Pad the beginning with empty cells so the grid aligns to day columns
    const paddedDays: ({ date: string; percentage: number } | null)[] = [];
    for (let i = 0; i < mondayBased; i++) {
      paddedDays.push(null);
    }
    paddedDays.push(...days);

    // Build rows of 7
    const rows: (typeof paddedDays)[] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      const row = paddedDays.slice(i, i + 7);
      while (row.length < 7) {
        row.push(null);
      }
      rows.push(row);
    }

    return rows;
  }, [data, totalHabits, daysToShow]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>30-day rhythm</Text>

      {/* Day labels */}
      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((label, i) => (
          <Text key={i} style={styles.dayLabel}>{label}</Text>
        ))}
      </View>

      {/* Grid rows */}
      {gridData.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.gridRow}>
          {row.map((cell, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}`}
              style={[
                styles.cell,
                {
                  backgroundColor: cell
                    ? getColorForPercentage(cell.percentage)
                    : 'transparent',
                },
              ]}
            />
          ))}
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendText}>Less</Text>
        <View style={styles.legendColors}>
          {HEATMAP_COLORS.map((color, index) => (
            <View key={index} style={[styles.legendDot, { backgroundColor: color }]} />
          ))}
        </View>
        <Text style={styles.legendText}>More</Text>
      </View>
    </View>
  );
};

const CELL_SIZE = 32;
const CELL_GAP = 5;

const styles = StyleSheet.create({
  container: {
    backgroundColor: VARA_COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
    marginBottom: 12,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    color: VARA_COLORS.sageGray,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 8,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  legendText: {
    fontSize: 11,
    color: VARA_COLORS.sageGray,
  },
  legendColors: {
    flexDirection: 'row',
    gap: 3,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
