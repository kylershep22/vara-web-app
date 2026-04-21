/**
 * Consolidated Metrics Card
 * Compact grid display for grouped metrics
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  apricot: '#F5B971',
  dewSage: '#D5E3D1',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

interface MetricTile {
  label: string;
  value: string | number;
  trend?: 'up' | 'steady' | 'down';
}

interface ConsolidatedMetricsCardProps {
  icon: string;
  title: string;
  metrics: MetricTile[];
  columns?: 2 | 3;
}

const getTrendIcon = (trend?: 'up' | 'steady' | 'down'): string => {
  switch (trend) {
    case 'up':
      return '\u2191';
    case 'down':
      return '\u2193';
    case 'steady':
      return '\u2192';
    default:
      return '';
  }
};

const getTrendColor = (trend?: 'up' | 'steady' | 'down'): string => {
  switch (trend) {
    case 'up':
      return VARA_COLORS.teal;
    case 'down':
      return VARA_COLORS.sageGray;
    case 'steady':
      return VARA_COLORS.apricot;
    default:
      return VARA_COLORS.sageGray;
  }
};

export const ConsolidatedMetricsCard: React.FC<ConsolidatedMetricsCardProps> = ({
  icon,
  title,
  metrics,
  columns = 2,
}) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name={icon as any} size={18} color={VARA_COLORS.teal} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Metrics grid */}
      <View style={[styles.grid, { flexWrap: 'wrap' }]}>
        {metrics.map((metric, index) => (
          <View
            key={index}
            style={[
              styles.tile,
              columns === 2 ? styles.tile2Col : styles.tile3Col,
            ]}
          >
            <View style={styles.tileContent}>
              <Text style={styles.tileValue}>
                {metric.value}
                {metric.trend && (
                  <Text style={[styles.trendIcon, { color: getTrendColor(metric.trend) }]}>
                    {' '}{getTrendIcon(metric.trend)}
                  </Text>
                )}
              </Text>
              <Text style={styles.tileLabel}>{metric.label}</Text>
            </View>
          </View>
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
    marginBottom: 12,
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
  grid: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    backgroundColor: '#FAFCFA',
    borderRadius: 10,
    padding: 9,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
    marginBottom: 8,
  },
  tile2Col: {
    width: '48%',
  },
  tile3Col: {
    width: '31%',
  },
  tileContent: {
    alignItems: 'center',
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '700',
    color: VARA_COLORS.charcoal,
  },
  tileLabel: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
    marginTop: 2,
    textAlign: 'center',
  },
  trendIcon: {
    fontSize: 12,
    fontWeight: '600',
  },
});
