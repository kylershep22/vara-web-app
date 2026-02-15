/**
 * AIWeeklySummaryCard Component
 * Collapsible card displaying AI-generated weekly journal insights
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, ActivityIndicator, Chip } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { JournalWeeklySummary } from '../../types';
import { useReducedMotion } from '../../hooks';

interface AIWeeklySummaryCardProps {
  /** The weekly summary data */
  summary: JournalWeeklySummary | null;
  /** Whether the summary is loading */
  loading: boolean;
  /** Error if summary generation failed */
  error: Error | null;
  /** Callback to retry fetching summary */
  onRetry: () => void;
  /** Whether there are enough entries to generate a summary */
  hasEnoughEntries?: boolean;
  /** Number of entries this week */
  weekEntryCount?: number;
}

/**
 * Get icon and color for mood trend
 */
const getMoodTrendDisplay = (trend: string) => {
  switch (trend) {
    case 'improving':
      return { icon: 'trending-up', color: Colors.success, label: 'Improving' };
    case 'declining':
      return { icon: 'trending-down', color: Colors.warning, label: 'Needs attention' };
    case 'stable':
    default:
      return { icon: 'remove', color: Colors.silverSage, label: 'Stable' };
  }
};

export const AIWeeklySummaryCard: React.FC<AIWeeklySummaryCardProps> = ({
  summary,
  loading,
  error,
  onRetry,
  hasEnoughEntries = true,
  weekEntryCount = 0,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  const rotation = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  const toggleExpanded = useCallback(() => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }

    setIsExpanded((prev) => {
      const newValue = !prev;
      rotation.value = withTiming(newValue ? 180 : 0, {
        duration: reduceMotion ? 0 : 200,
        easing: Easing.out(Easing.ease),
      });
      contentHeight.value = withTiming(newValue ? 1 : 0, {
        duration: reduceMotion ? 0 : 200,
        easing: Easing.out(Easing.ease),
      });
      return newValue;
    });
  }, [rotation, contentHeight, reduceMotion]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentHeight.value,
    maxHeight: contentHeight.value === 0 ? 0 : 500,
    overflow: 'hidden' as const,
  }));

  // Loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.evergreenTeal} />
          <Text style={styles.loadingText}>Generating weekly insights...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={24} color={Colors.error} />
          <Text style={styles.errorText}>Couldn't generate summary</Text>
          <TouchableOpacity onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Not enough entries state
  if (!hasEnoughEntries) {
    const entriesNeeded = 3 - weekEntryCount;
    return (
      <View style={styles.container}>
        <View style={styles.notEnoughContainer}>
          <MaterialCommunityIcons
            name="brain"
            size={24}
            color={Colors.evergreenTeal}
          />
          <View style={styles.notEnoughTextContainer}>
            <Text style={styles.notEnoughTitle}>Weekly Insights</Text>
            <Text style={styles.notEnoughText}>
              {weekEntryCount === 0
                ? 'Add 3 entries this week to unlock AI insights'
                : `${entriesNeeded} more ${entriesNeeded === 1 ? 'entry' : 'entries'} needed for insights`}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // No summary yet (waiting for data)
  if (!summary) {
    return null;
  }

  const moodTrendDisplay = getMoodTrendDisplay(summary.moodTrend);

  return (
    <View style={styles.container}>
      {/* Header (always visible) */}
      <TouchableOpacity
        onPress={toggleExpanded}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={`Weekly insights. ${isExpanded ? 'Collapse' : 'Expand'}`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="brain"
            size={20}
            color={Colors.evergreenTeal}
          />
          <Text style={styles.headerTitle}>Weekly Insights</Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={24} color={Colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      {/* Collapsible content */}
      <Animated.View style={contentStyle}>
        <View style={styles.content}>
          {/* Summary text */}
          <Text style={styles.summaryText}>{summary.text}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {/* Mood trend */}
            <View style={styles.statItem}>
              <Ionicons
                name={moodTrendDisplay.icon as any}
                size={20}
                color={moodTrendDisplay.color}
              />
              <Text style={styles.statLabel}>{moodTrendDisplay.label}</Text>
            </View>

            {/* Entry count */}
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{summary.entryCount}</Text>
              <Text style={styles.statLabel}>entries</Text>
            </View>

            {/* Word count */}
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{summary.wordCount}</Text>
              <Text style={styles.statLabel}>words</Text>
            </View>
          </View>

          {/* Top themes */}
          {summary.topThemes.length > 0 && (
            <View style={styles.themesContainer}>
              <Text style={styles.themesLabel}>Top themes</Text>
              <View style={styles.themesRow}>
                {summary.topThemes.map((theme) => (
                  <Chip key={theme} style={styles.themeChip} textStyle={styles.themeChipText}>
                    {theme}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    minHeight: 56,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.evergreenTeal,
  },
  content: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  summaryText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * 1.5,
    marginBottom: Spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.silverSage,
    marginBottom: Spacing.base,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statNumber: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.evergreenTeal,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  themesContainer: {
    gap: Spacing.sm,
  },
  themesLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium as any,
  },
  themesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  themeChip: {
    backgroundColor: Colors.surface,
    height: 28,
  },
  themeChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  retryButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  retryText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  notEnoughContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  notEnoughTextContainer: {
    flex: 1,
  },
  notEnoughTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  notEnoughText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});

export default AIWeeklySummaryCard;
