/**
 * Tasks Card
 * Displays tasks due today and upcoming with positive framing
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import Card from '../Card';
import { Task } from '../../types/models';

interface TasksCardProps {
  tasks: Task[];
}

/**
 * Get priority icon and color
 */
const getPriorityStyle = (priority?: string): { color: string; icon: string } => {
  switch (priority) {
    case 'urgent':
    case 'high':
      return { color: Colors.sunriseAmber, icon: 'flag' };
    case 'medium':
      return { color: Colors.evergreenTeal, icon: 'flag-outline' };
    case 'low':
    default:
      return { color: Colors.silverSage, icon: 'flag-outline' };
  }
};

export const TasksCard: React.FC<TasksCardProps> = ({ tasks }) => {
  const navigation = useNavigation<any>();

  // Get today's date string
  const today = new Date().toISOString().split('T')[0];

  // Filter and categorize tasks
  const { tasksDueToday, upcomingTasks } = useMemo(() => {
    const incomplete = tasks.filter((t) => !t.completed);

    const dueToday = incomplete.filter((t) => {
      const dueDate = t.dueDate?.toDate?.()
        ? t.dueDate.toDate().toISOString().split('T')[0]
        : t.dueDate?.seconds
        ? new Date(t.dueDate.seconds * 1000).toISOString().split('T')[0]
        : null;
      return dueDate === today;
    });

    const upcoming = incomplete.filter((t) => {
      const dueDate = t.dueDate?.toDate?.()
        ? t.dueDate.toDate().toISOString().split('T')[0]
        : t.dueDate?.seconds
        ? new Date(t.dueDate.seconds * 1000).toISOString().split('T')[0]
        : null;
      return dueDate && dueDate > today;
    }).slice(0, 3); // Show up to 3 upcoming

    return { tasksDueToday: dueToday, upcomingTasks: upcoming };
  }, [tasks, today]);

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const showTasks = [...tasksDueToday, ...upcomingTasks].slice(0, 4);

  return (
    <Card style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Track', { tab: 'tasks' })}
          style={styles.headerTitleButton}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Tasks"
          accessibilityHint="Double tap to view all tasks"
        >
          <Text variant="titleLarge" style={styles.title}>
            Tasks
          </Text>
          <Icon name="chevron-right" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        {incompleteTasks.length > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Track', { tab: 'tasks' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tasks List */}
      {showTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="checkbox-marked-circle-outline" size={40} color={Colors.dewSage} />
          <Text style={styles.emptyTitle}>No tasks yet</Text>
          <Text style={styles.emptySubtitle}>
            Add tasks to keep track of what matters
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('Track', { tab: 'tasks' })}
          >
            <Text style={styles.addButtonText}>Add a task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tasksList}>
          {tasksDueToday.length > 0 && (
            <Text style={styles.sectionLabel}>Due today</Text>
          )}
          {tasksDueToday.slice(0, 2).map((task, index) => {
            const priorityStyle = getPriorityStyle(task.priority);
            return (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskItem,
                  index < tasksDueToday.slice(0, 2).length - 1 && styles.taskItemBorder,
                ]}
                onPress={() => navigation.navigate('Track', { tab: 'tasks' })}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${task.title}, ${task.priority || 'normal'} priority, due today`}
                accessibilityHint="Double tap to view task"
              >
                <View style={[styles.taskIcon, { backgroundColor: `${priorityStyle.color}20` }]}>
                  <Icon name={priorityStyle.icon as any} size={16} color={priorityStyle.color} />
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {task.priority && (
                    <Text style={[styles.taskPriority, { color: priorityStyle.color }]}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {upcomingTasks.length > 0 && tasksDueToday.length > 0 && (
            <View style={styles.sectionDivider} />
          )}

          {upcomingTasks.length > 0 && (
            <Text style={styles.sectionLabel}>Upcoming</Text>
          )}
          {upcomingTasks.slice(0, 2).map((task, index) => {
            const priorityStyle = getPriorityStyle(task.priority);
            const dueDate = task.dueDate?.toDate?.()
              ? task.dueDate.toDate()
              : task.dueDate?.seconds
              ? new Date(task.dueDate.seconds * 1000)
              : null;
            const dueDateStr = dueDate
              ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : '';

            return (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.taskItem,
                  index < upcomingTasks.slice(0, 2).length - 1 && styles.taskItemBorder,
                ]}
                onPress={() => navigation.navigate('Track', { tab: 'tasks' })}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${task.title}, due ${dueDateStr}`}
                accessibilityHint="Double tap to view task"
              >
                <View style={[styles.taskIcon, { backgroundColor: `${priorityStyle.color}20` }]}>
                  <Icon name="calendar-outline" size={16} color={Colors.textSecondary} />
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskDueDate}>{dueDateStr}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {incompleteTasks.length > showTasks.length && (
            <TouchableOpacity
              style={styles.viewMoreButton}
              onPress={() => navigation.navigate('Track', { tab: 'tasks' })}
            >
              <Text style={styles.viewMoreText}>
                {`+${incompleteTasks.length - showTasks.length} more`}
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  tasksList: {},
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  taskItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  taskPriority: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  taskDueDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
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

export default TasksCard;
