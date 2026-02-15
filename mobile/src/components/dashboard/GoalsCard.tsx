/**
 * Goals Card
 * Displays active goals with positive progress labels
 * Uses positive framing - never shows deficit messaging
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import Card from '../Card';
import { Goal } from '../../types/models';

interface GoalsCardProps {
  goals: Goal[];
}

/**
 * Get positive progress label based on goal progress
 * Never shows deficit (e.g., "0/2 completed")
 * Always frames positively
 * Note: progress is stored as 0-100, not 0-1
 */
const getPositiveProgressLabel = (progress: number): { label: string; color: string } => {
  const percent = Math.round(progress);

  if (percent === 0) {
    return { label: 'Just started', color: Colors.textSecondary };
  } else if (percent < 25) {
    return { label: 'Building momentum', color: '#4A7BC5' };
  } else if (percent < 50) {
    return { label: 'Making progress', color: '#4A7BC5' };
  } else if (percent < 75) {
    return { label: 'Halfway there', color: Colors.evergreenTeal };
  } else if (percent < 100) {
    return { label: 'Almost there', color: Colors.evergreenTeal };
  } else {
    return { label: 'Complete!', color: Colors.evergreenTeal };
  }
};

/**
 * Get goal icon based on goal category or title
 */
const getGoalIcon = (goal: Goal): string => {
  const title = (goal.title || '').toLowerCase();
  const category = (goal.category || goal.primaryFocus || '').toLowerCase();

  if (category.includes('fitness') || category.includes('exercise') || title.includes('exercise')) {
    return 'run';
  } else if (category.includes('health') || title.includes('health')) {
    return 'heart-pulse';
  } else if (category.includes('career') || category.includes('work') || title.includes('career')) {
    return 'briefcase';
  } else if (category.includes('learn') || category.includes('education') || title.includes('learn')) {
    return 'school';
  } else if (category.includes('finance') || category.includes('money') || title.includes('save')) {
    return 'cash';
  } else if (category.includes('relation') || category.includes('social') || title.includes('friend')) {
    return 'account-group';
  } else if (category.includes('creative') || category.includes('art') || title.includes('creative')) {
    return 'palette';
  } else if (category.includes('mindful') || category.includes('meditat')) {
    return 'meditation';
  }

  return 'flag-checkered';
};

export const GoalsCard: React.FC<GoalsCardProps> = ({ goals }) => {
  const navigation = useNavigation<any>();

  // Filter to show active goals (or goals without a status - treat as active)
  // A goal is considered active if it's not explicitly marked as 'completed' or 'archived'
  const activeGoals = goals.filter((g) => !g.status || g.status === 'active');

  // Calculate summary stats
  const completedCount = goals.filter((g) => g.status === 'completed').length;
  const totalGoals = goals.length;

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Track', { tab: 'goals' })}
          style={styles.headerTitleButton}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Your Goals"
          accessibilityHint="Double tap to view all goals"
        >
          <Text variant="titleLarge" style={styles.title}>
            Your Goals
          </Text>
          <Icon name="chevron-right" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        {activeGoals.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Track', { tab: 'goals' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Goals List */}
      {activeGoals.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="flag-outline" size={40} color={Colors.dewSage} />
          <Text style={styles.emptyTitle}>Set your first goal</Text>
          <Text style={styles.emptySubtitle}>
            Goals give your habits purpose and direction
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Track', { tab: 'goals' })}
          >
            <Text style={styles.addButtonText}>Set a focus</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.goalsList}>
          {activeGoals.slice(0, 3).map((goal, index) => {
            const progress = goal.progress || 0;
            const progressInfo = getPositiveProgressLabel(progress);
            const iconName = getGoalIcon(goal);

            return (
              <TouchableOpacity
                key={goal.id}
                style={[
                  styles.goalItem,
                  index < activeGoals.slice(0, 3).length - 1 && styles.goalItemBorder,
                ]}
                onPress={() => navigation.navigate('Track', { tab: 'goals' })}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${goal.title}, ${progressInfo.label}`}
                accessibilityHint="Double tap to view goal details"
              >
                <View style={styles.goalIcon}>
                  <Icon name={iconName as any} size={20} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.goalContent}>
                  <Text style={styles.goalTitle} numberOfLines={1}>
                    {goal.title}
                  </Text>
                  <View style={styles.progressRow}>
                    <View
                      style={styles.progressBarContainer}
                      accessible={true}
                      accessibilityRole="progressbar"
                      accessibilityValue={{ min: 0, max: 100, now: progress }}
                      accessibilityLabel={`Progress: ${Math.round(progress)}%`}
                    >
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${Math.max(progress, 3)}%` },
                        ]}
                      />
                    </View>
                    <Text style={[styles.progressLabel, { color: progressInfo.color }]}>
                      {progressInfo.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {activeGoals.length > 3 && (
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => navigation.navigate('Track', { tab: 'goals' })}
            >
              <Text style={styles.viewMoreText}>
                {`View ${activeGoals.length - 3} more goal${activeGoals.length - 3 > 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          )}
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
  headerTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginRight: 4,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },
  goalsList: {},
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  goalItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  goalContent: {
    flex: 1,
  },
  goalTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarContainer: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.borderLight,
    borderRadius: 2,
    marginRight: Spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    minWidth: 80,
    textAlign: 'right',
  },
  viewMoreButton: {
    paddingTop: Spacing.sm,
  },
  viewMoreText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  addButton: {
    marginTop: Spacing.base,
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default GoalsCard;
