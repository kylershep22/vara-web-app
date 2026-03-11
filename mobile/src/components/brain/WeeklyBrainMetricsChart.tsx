/**
 * Weekly Brain Metrics Chart
 * Shows 7-day view of brain readiness scores
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Card } from '../index';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

interface DayMetric {
  date: string;
  dayName: string;
  dayNumber: number;
  score: number;
  isToday: boolean;
}

export const WeeklyBrainMetricsChart: React.FC = () => {
  const { user } = useAuth();
  const [weeklyMetrics, setWeeklyMetrics] = useState<DayMetric[]>([]);
  const [averageScore, setAverageScore] = useState<number>(0);

  // Get last 7 days
  const getLast7Days = (): DayMetric[] => {
    const days: DayMetric[] = [];
    const today = new Date().toISOString().split('T')[0];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        score: 0,
        isToday: dateStr === today,
      });
    }

    return days;
  };

  // Load weekly metrics
  useEffect(() => {
    const loadWeeklyMetrics = async () => {
      if (!user || !db) return;

      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekStartDate = sevenDaysAgo.toISOString().split('T')[0];

        const metricsQuery = query(
          collection(db, 'brainMetrics'),
          where('userId', '==', user.uid),
          where('date', '>=', weekStartDate),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(metricsQuery);

        // Create map of date -> score
        const scoresMap: { [date: string]: number } = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          scoresMap[data.date] = data.readinessScore || 0;
        });

        // Populate last 7 days with scores
        const days = getLast7Days();
        const daysWithScores = days.map(day => ({
          ...day,
          score: scoresMap[day.date] || 0,
        }));

        setWeeklyMetrics(daysWithScores);

        // Calculate average (only for days with scores)
        const scoresWithData = daysWithScores.filter(d => d.score > 0);
        if (scoresWithData.length > 0) {
          const avg = scoresWithData.reduce((sum, d) => sum + d.score, 0) / scoresWithData.length;
          setAverageScore(Math.round(avg));
        } else {
          setAverageScore(0);
        }

      } catch (error) {
        console.error('Error loading weekly brain metrics:', error);
      }
    };

    loadWeeklyMetrics();
  }, [user]);

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score === 0) return Colors.border;
    if (score < 50) return Colors.error;
    if (score < 75) return Colors.sunriseAmber;
    return Colors.evergreenTeal;
  };

  // Calculate bar height (percentage of max height)
  const getBarHeight = (score: number): number => {
    return score > 0 ? Math.max(score, 10) : 0; // Minimum 10% if there's a score
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="chart-line" size={24} color={Colors.evergreenTeal} />
          <View>
            <Text style={styles.title}>
              Weekly Brain Metrics
            </Text>
            <Text style={styles.subtitle}>
              7-day readiness score trend
            </Text>
          </View>
        </View>
        {averageScore > 0 && (
          <View style={[styles.averageBadge, { backgroundColor: getScoreColor(averageScore) + '20' }]}>
            <Text style={[styles.averageText, { color: getScoreColor(averageScore) }]}>
              Avg {averageScore}
            </Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {weeklyMetrics.map((day, index) => {
          const barHeight = getBarHeight(day.score);
          const color = getScoreColor(day.score);

          return (
            <View key={day.date} style={styles.barContainer}>
              {/* Bar */}
              <View style={styles.barWrapper}>
                {day.score > 0 && (
                  <View style={styles.scoreLabel}>
                    <Text style={styles.scoreLabelText}>
                      {day.score}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${barHeight}%`,
                      backgroundColor: color,
                    },
                    day.score === 0 && styles.barEmpty,
                  ]}
                />
              </View>

              {/* Day label */}
              <View style={styles.dayLabelContainer}>
                <Text
                  style={[styles.dayName, day.isToday && styles.dayNameToday]}
                >
                  {day.dayName}
                </Text>
                <Text
                  style={[styles.dayNumber, day.isToday && styles.dayNumberToday]}
                >
                  {day.dayNumber}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.evergreenTeal }]} />
          <Text style={styles.legendText}>
            75-100: Excellent
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.sunriseAmber }]} />
          <Text style={styles.legendText}>
            50-74: Good
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.legendText}>
            0-49: Needs care
          </Text>
        </View>
      </View>

      {weeklyMetrics.every(d => d.score === 0) && (
        <View style={styles.emptyState}>
          <Icon name="chart-line" size={48} color={Colors.textSecondary} />
          <Text style={styles.emptyText}>
            Complete daily check-ins to see your brain health trend
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  averageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Layout.borderRadius.full,
  },
  averageText: {
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xs,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 180,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.xs / 2,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    position: 'relative',
  },
  scoreLabel: {
    position: 'absolute',
    top: -20,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.xs / 2,
    borderRadius: Layout.borderRadius.sm,
  },
  scoreLabelText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xs - 1,
  },
  bar: {
    width: '100%',
    minHeight: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  barEmpty: {
    height: 4,
    backgroundColor: Colors.border,
  },
  dayLabelContainer: {
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  dayName: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs - 1,
    fontWeight: Typography.fontWeight.semibold,
  },
  dayNameToday: {
    color: Colors.evergreenTeal,
  },
  dayNumber: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs - 1,
  },
  dayNumberToday: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.base,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: Layout.borderRadius.full,
  },
  legendText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
});
