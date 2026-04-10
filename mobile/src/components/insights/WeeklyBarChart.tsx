/**
 * Weekly Bar Chart
 * 7-day activity bar chart with peak day highlighting
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  dewSage: '#D5E3D1',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface WeeklyBarChartProps {
  data: number[]; // Array of values
  labels?: string[]; // Custom labels (defaults to M T W T F S S)
  title?: string; // Custom title (defaults to "Daily activity")
}

const AnimatedBar: React.FC<{
  value: number;
  maxValue: number;
  isPeak: boolean;
  index: number;
  label: string;
}> = ({ value, maxValue, isPeak, index, label }) => {
  const heightPercent = useSharedValue(0);

  useEffect(() => {
    const targetHeight = maxValue > 0 ? Math.max((value / maxValue) * 100, 8) : 8;
    heightPercent.value = withDelay(
      index * 80,
      withTiming(targetHeight, {
        duration: 800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      })
    );
  }, [value, maxValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${heightPercent.value}%`,
  }));

  return (
    <View style={styles.barContainer}>
      <View style={styles.barWrapper}>
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: isPeak ? VARA_COLORS.teal : VARA_COLORS.dewSage,
            },
            animatedStyle,
          ]}
        />
      </View>
      <Text
        style={[
          styles.dayLabel,
          {
            color: isPeak ? VARA_COLORS.teal : VARA_COLORS.sageGray,
            fontWeight: isPeak ? '600' : '400',
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export const WeeklyBarChart: React.FC<WeeklyBarChartProps> = ({
  data,
  labels,
  title: customTitle,
}) => {
  const chartData = [...data];
  const chartLabels = labels || DAY_LABELS;

  // Pad data to match labels if needed
  while (chartData.length < chartLabels.length) {
    chartData.push(0);
  }

  // Find the maximum value and peak day index
  const maxValue = Math.max(...chartData);

  // Find peak day (most recent if tied)
  let peakIndex = -1;
  if (maxValue > 0) {
    for (let i = chartData.length - 1; i >= 0; i--) {
      if (chartData[i] === maxValue) {
        peakIndex = i;
        break;
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="clock-outline" size={18} color={VARA_COLORS.teal} />
        </View>
        <Text style={styles.title}>{customTitle || 'Daily activity'}</Text>
      </View>

      {/* Bar chart */}
      <View style={styles.chartContainer}>
        {chartData.slice(0, chartLabels.length).map((value, index) => (
          <AnimatedBar
            key={index}
            value={value}
            maxValue={maxValue}
            isPeak={index === peakIndex}
            index={index}
            label={chartLabels[index]}
          />
        ))}
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
    marginBottom: 16,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: VARA_COLORS.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  barWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

export { WeeklyBarChart };
