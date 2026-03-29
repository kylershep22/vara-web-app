/**
 * Sparkline Trend Card
 * Compact card with sparkline chart for trend visualization
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  apricot: '#F5B971',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

interface SparklineTrendCardProps {
  label: string;
  value: string | number;
  data: number[];
  color: string;
  trend: 'up' | 'steady' | 'down';
  dataPointCount?: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const Sparkline: React.FC<{ data: number[]; color: string; width: number; height: number }> = ({
  data,
  color,
  width,
  height,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1100,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [data]);

  if (data.length === 0) {
    return <View style={{ width, height }} />;
  }

  const padding = 4;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const realPoints = data.filter(v => v > 0).length;

  if (realPoints <= 1) {
    const firstRealIndex = data.findIndex(v => v > 0);
    const idx = firstRealIndex >= 0 ? firstRealIndex : data.length - 1;
    const val = data[idx] || 0;
    const baseY = height - padding - 3;
    const pointX = padding + (idx / Math.max(data.length - 1, 1)) * chartWidth;
    const pointY = val > 0 ? padding + chartHeight * 0.3 : baseY;

    return (
      <Svg width={width} height={height}>
        <Path
          d={`M ${padding} ${baseY} L ${width - padding} ${baseY}`}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.3}
          strokeLinecap="round"
        />
        {val > 0 && (
          <>
            <Path
              d={`M ${pointX} ${baseY} L ${pointX} ${pointY}`}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <Circle cx={pointX} cy={pointY} r={2.5} fill={color} />
          </>
        )}
      </Svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((value - min) / range) * chartHeight;
    return { x, y };
  });

  // Generate SVG path
  const linePath = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    })
    .join(' ');

  // Generate area fill path
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </LinearGradient>
      </Defs>
      {/* Area fill */}
      <Path d={areaPath} fill={`url(#gradient-${color})`} />
      {/* Line */}
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <Circle cx={lastPoint.x} cy={lastPoint.y} r={3} fill={color} />
    </Svg>
  );
};

export const SparklineTrendCard: React.FC<SparklineTrendCardProps> = ({
  label,
  value,
  data,
  color,
  trend,
  dataPointCount,
}) => {
  const getTrendDisplay = () => {
    const realCount = dataPointCount ?? data.filter(v => v > 0).length;
    if (realCount < 3) {
      return { text: `Day ${Math.max(realCount, 1)} of 7`, color: VARA_COLORS.sageGray };
    }
    switch (trend) {
      case 'up':
        return { text: '\u2191 Improving', color: VARA_COLORS.tealMid };
      case 'down':
        return { text: '\u2193 Needs attention', color: '#D97A6E' };
      default:
        return { text: 'Trending steady', color: VARA_COLORS.sageGray };
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <View style={styles.sparklineContainer}>
        <Sparkline data={data} color={color} width={90} height={26} />
      </View>
      <Text style={[styles.trend, { color: getTrendDisplay().color }]}>
        {getTrendDisplay().text}
      </Text>
    </View>
  );
};

export const SparklineTrendCardRow: React.FC<{
  cards: SparklineTrendCardProps[];
}> = ({ cards }) => {
  return (
    <View style={styles.row}>
      {cards.map((card, index) => (
        <View key={index} style={styles.cardWrapper}>
          <SparklineTrendCard {...card} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  cardWrapper: {
    flex: 1,
  },
  container: {
    backgroundColor: VARA_COLORS.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: VARA_COLORS.sageGray,
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
    color: VARA_COLORS.charcoal,
    marginTop: 2,
  },
  sparklineContainer: {
    marginTop: 6,
  },
  trend: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
});

export { SparklineTrendCard };
