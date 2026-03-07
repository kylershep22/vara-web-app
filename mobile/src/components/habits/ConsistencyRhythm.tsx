/**
 * ConsistencyRhythm Component
 * Replaces streak counters with a pattern-based visualization
 *
 * Design Philosophy: Shows consistency as a rhythm/pattern rather than
 * a consecutive count that creates pressure. Missed days are shown as
 * natural variation, not broken chains.
 *
 * Aligns with Vara's "Progress Without Pressure" brand pillar.
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface ConsistencyRhythmProps {
  /** Array of completion dates (YYYY-MM-DD format) */
  completions: string[];
  /** Number of days to show (default: 30) */
  daysToShow?: number;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Show encouraging message */
  showMessage?: boolean;
}

type ConsistencyPattern = 'building' | 'steady' | 'strong' | 'returning' | 'starting';

/**
 * Analyzes completion pattern and returns an encouraging message
 */
const analyzePattern = (
  completions: string[],
  daysToShow: number
): { pattern: ConsistencyPattern; activeDays: number; message: string } => {
  const today = new Date();
  const completionSet = new Set(completions);

  // Count completions in the visible window
  let activeDays = 0;
  let recentStreak = 0;
  let lastSevenDays = 0;

  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (completionSet.has(dateStr)) {
      activeDays++;
      if (i < 7) lastSevenDays++;
      if (i === recentStreak) recentStreak++;
    }
  }

  const completionRate = activeDays / daysToShow;

  // Determine pattern and message
  if (activeDays === 0) {
    return {
      pattern: 'starting',
      activeDays: 0,
      message: "Every journey begins with a single step.",
    };
  }

  if (completionRate >= 0.8) {
    return {
      pattern: 'strong',
      activeDays,
      message: "You're in a great flow!",
    };
  }

  if (completionRate >= 0.5) {
    return {
      pattern: 'steady',
      activeDays,
      message: "Building a solid rhythm.",
    };
  }

  if (lastSevenDays >= 3) {
    return {
      pattern: 'building',
      activeDays,
      message: "You're building momentum.",
    };
  }

  if (recentStreak >= 1) {
    return {
      pattern: 'returning',
      activeDays,
      message: "Welcome back! You're getting on track.",
    };
  }

  return {
    pattern: 'building',
    activeDays,
    message: "Every day you show up counts.",
  };
};

/**
 * Generates array of last N days with completion status
 */
const getLastNDays = (daysToShow: number, completions: string[]) => {
  const today = new Date();
  const completionSet = new Set(completions);
  const days: { date: string; completed: boolean; isToday: boolean }[] = [];

  for (let i = daysToShow - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    days.push({
      date: dateStr,
      completed: completionSet.has(dateStr),
      isToday: i === 0,
    });
  }

  return days;
};

export const ConsistencyRhythm: React.FC<ConsistencyRhythmProps> = ({
  completions,
  daysToShow = 30,
  compact = false,
  showMessage = true,
}) => {
  const days = useMemo(() => getLastNDays(daysToShow, completions), [daysToShow, completions]);
  const analysis = useMemo(() => analyzePattern(completions, daysToShow), [completions, daysToShow]);

  if (compact) {
    // Compact mode: just dots in a row (for inline display)
    const compactDays = days.slice(-14); // Last 14 days in compact mode

    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactDots}>
          {compactDays.map((day) => (
            <View
              key={day.date}
              style={[
                styles.compactDot,
                day.completed ? styles.compactDotCompleted : styles.compactDotMissed,
                day.isToday && styles.compactDotToday,
              ]}
            />
          ))}
        </View>
        {analysis.activeDays > 0 && (
          <Text style={styles.compactLabel}>
            {analysis.activeDays} of {daysToShow} days
          </Text>
        )}
      </View>
    );
  }

  // Full mode: heatmap grid with message
  // Organize into rows of 7 (weeks)
  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="wave" size={16} color={Colors.evergreenTeal} />
        <Text style={styles.headerText}>Your Rhythm</Text>
      </View>

      {/* Heatmap Grid */}
      <View style={styles.heatmap}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day) => (
              <View
                key={day.date}
                style={[
                  styles.dayDot,
                  day.completed ? styles.dayDotCompleted : styles.dayDotMissed,
                  day.isToday && styles.dayDotToday,
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryCount}>
          {analysis.activeDays} day{analysis.activeDays !== 1 ? 's' : ''} this month
        </Text>
        {showMessage && (
          <Text style={styles.summaryMessage}>{analysis.message}</Text>
        )}
      </View>
    </View>
  );
};

/**
 * Compact badge version for habit rows (replaces fire emoji streak badge)
 */
export const ConsistencyBadge: React.FC<{
  completions: string[];
  daysToShow?: number;
}> = ({ completions, daysToShow = 30 }) => {
  const analysis = useMemo(
    () => analyzePattern(completions, daysToShow),
    [completions, daysToShow]
  );

  if (analysis.activeDays === 0) {
    return null;
  }

  // Determine badge color based on pattern
  const getBadgeColor = () => {
    switch (analysis.pattern) {
      case 'strong':
        return Colors.evergreenTeal;
      case 'steady':
        return Colors.evergreenTeal;
      case 'building':
        return Colors.silverSage;
      case 'returning':
        return Colors.silverSage;
      default:
        return Colors.silverSage;
    }
  };

  const badgeColor = getBadgeColor();

  return (
    <View style={[styles.badge, { backgroundColor: `${badgeColor}1F` }]}>
      <Icon name="wave" size={11} color={badgeColor} />
      <Text style={[styles.badgeText, { color: badgeColor }]}>
        {analysis.activeDays}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Full mode styles
  container: {
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  headerText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  heatmap: {
    marginBottom: Spacing.sm,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  dayDotCompleted: {
    backgroundColor: Colors.evergreenTeal,
  },
  dayDotMissed: {
    backgroundColor: Colors.borderLight,
  },
  dayDotToday: {
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
  },
  summary: {
    marginTop: Spacing.xs,
  },
  summaryCount: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  summaryMessage: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Compact mode styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactDots: {
    flexDirection: 'row',
    gap: 2,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactDotCompleted: {
    backgroundColor: Colors.evergreenTeal,
  },
  compactDotMissed: {
    backgroundColor: Colors.borderLight,
  },
  compactDotToday: {
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
  },
  compactLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },

  // Badge styles (replaces streak badge)
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ConsistencyRhythm;
