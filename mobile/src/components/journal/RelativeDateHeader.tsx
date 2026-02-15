/**
 * RelativeDateHeader Component
 * Sticky section header with relative date labels (Today, Yesterday, This Week, etc.)
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Spacing, Typography } from '../../constants';

export type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'earlier';

interface RelativeDateHeaderProps {
  /** The date group to display */
  dateGroup: DateGroup;
  /** Optional specific date for "earlier" items to show month/year */
  date?: Date;
}

/**
 * Get the display label for a date group
 */
const getDateLabel = (dateGroup: DateGroup, date?: Date): string => {
  switch (dateGroup) {
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case 'thisWeek':
      return 'This Week';
    case 'lastWeek':
      return 'Last Week';
    case 'earlier':
      if (date) {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      }
      return 'Earlier';
    default:
      return 'Earlier';
  }
};

/**
 * Determine which date group a date belongs to
 */
export const getDateGroup = (date: Date): DateGroup => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Today
  if (entryDate.getTime() === today.getTime()) {
    return 'today';
  }

  // Yesterday
  if (entryDate.getTime() === yesterday.getTime()) {
    return 'yesterday';
  }

  // This week (last 7 days from today, excluding today and yesterday)
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (entryDate > weekAgo && entryDate < yesterday) {
    return 'thisWeek';
  }

  // Last week (7-14 days ago)
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  if (entryDate > twoWeeksAgo && entryDate <= weekAgo) {
    return 'lastWeek';
  }

  // Earlier
  return 'earlier';
};

/**
 * Group entries by relative date
 * Returns entries grouped by date category for use with SectionList
 */
export const groupEntriesByRelativeDate = <T extends { createdAt: any }>(
  entries: T[]
): Array<{ dateGroup: DateGroup; date?: Date; data: T[] }> => {
  const groups: Record<string, { dateGroup: DateGroup; date?: Date; data: T[] }> = {};

  entries.forEach((entry) => {
    const entryDate = entry.createdAt?.toDate?.()
      ? entry.createdAt.toDate()
      : new Date(entry.createdAt?.seconds ? entry.createdAt.seconds * 1000 : entry.createdAt);

    const dateGroup = getDateGroup(entryDate);

    // For "earlier" entries, group by month
    let key: string = dateGroup;
    let date: Date | undefined;

    if (dateGroup === 'earlier') {
      const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;
      key = `earlier-${monthKey}`;
      date = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
    }

    if (!groups[key]) {
      groups[key] = { dateGroup, date, data: [] };
    }
    groups[key].data.push(entry);
  });

  // Define sort order for date groups
  const sortOrder: Record<DateGroup, number> = {
    today: 0,
    yesterday: 1,
    thisWeek: 2,
    lastWeek: 3,
    earlier: 4,
  };

  // Sort groups and return as array
  return Object.values(groups).sort((a, b) => {
    const orderDiff = sortOrder[a.dateGroup] - sortOrder[b.dateGroup];
    if (orderDiff !== 0) return orderDiff;

    // For "earlier" entries, sort by date descending
    if (a.date && b.date) {
      return b.date.getTime() - a.date.getTime();
    }
    return 0;
  });
};

export const RelativeDateHeader: React.FC<RelativeDateHeaderProps> = ({
  dateGroup,
  date,
}) => {
  const label = getDateLabel(dateGroup, date);

  return (
    <View style={styles.container}>
      <Text variant="bodySmall" style={styles.label}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  label: {
    color: Colors.silverSage,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default RelativeDateHeader;
