/**
 * Correlation Insight Card
 * Surfaces the top 1-2 behavioral correlations as plain-English insights.
 * Only renders when at least one correlation is significant.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import type { WeeklyCorrelations } from '../../services/correlationEngine.service';

const VARA_COLORS = {
  teal: '#1B5E57',
  dewSage: '#D5E3D1',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  white: '#FFFFFF',
};

interface CorrelationInsightCardProps {
  correlations: WeeklyCorrelations;
}

interface InsightLine {
  text: string;
}

function buildInsights(correlations: WeeklyCorrelations): InsightLine[] {
  const lines: InsightLine[] = [];

  if (correlations.sleepHabitCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.sleepHabitCorrelation.highSleepCompletion -
          correlations.sleepHabitCorrelation.lowSleepCompletion
      )
    );
    lines.push({ text: `When you sleep well, you complete ${gap}% more habits` });
  }

  if (correlations.energyHabitCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.energyHabitCorrelation.highEnergyCompletion -
          correlations.energyHabitCorrelation.lowEnergyCompletion
      )
    );
    lines.push({ text: `On high-energy days, you complete ${gap}% more habits` });
  }

  if (correlations.journalMoodCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.journalMoodCorrelation.journalDayMood -
          correlations.journalMoodCorrelation.nonJournalDayMood
      ) * 10
    ) / 10;
    lines.push({ text: `Days you journal, your mood averages ${gap} points higher` });
  }

  if (correlations.sleepFocusCorrelation.significant) {
    const gap = Math.round(
      Math.abs(
        correlations.sleepFocusCorrelation.highSleepFocusMin -
          correlations.sleepFocusCorrelation.lowSleepFocusMin
      )
    );
    lines.push({ text: `Good sleep nights lead to ${gap} more focus minutes` });
  }

  // Return top 2 max
  return lines.slice(0, 2);
}

export const CorrelationInsightCard: React.FC<CorrelationInsightCardProps> = ({
  correlations,
}) => {
  const insights = buildInsights(correlations);

  if (insights.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="lightbulb-on-outline" size={18} color={VARA_COLORS.teal} />
        </View>
        <Text style={styles.title}>Your top insight</Text>
      </View>
      {insights.length === 1 ? (
        <Text style={styles.insightText}>{insights[0].text}</Text>
      ) : (
        <View>
          {insights.map((insight, index) => (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bullet}>{'\u2022'}</Text>
              <Text style={styles.insightText}>{insight.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  insightText: {
    fontSize: 14,
    color: VARA_COLORS.charcoal,
    lineHeight: 21,
    flex: 1,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 14,
    color: VARA_COLORS.teal,
    marginRight: 8,
    lineHeight: 21,
  },
});
