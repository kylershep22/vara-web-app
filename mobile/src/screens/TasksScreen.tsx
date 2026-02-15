/**
 * Tasks Screen
 * Task management with priority and completion tracking
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { Text, FAB, Checkbox, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Input, LoadingSpinner, PriorityBadge, EnhancedModal, ModalFooterActions, BaseCard, InlineCreateButton, LockedScreenOverlay } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks';
import { createTask, updateTask, deleteTask, toggleTaskComplete } from '../services/firebase';
import { Task } from '../types';

interface TasksScreenProps {
  hideHeader?: boolean;
  /** Filter passed from parent (PlanScreen) */
  externalFilter?: string;
  /** Show inline create button instead of FAB */
  showInlineCreate?: boolean;
}

const TasksScreen: React.FC<TasksScreenProps> = ({
  hideHeader = false,
  externalFilter,
  showInlineCreate = false,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { tasks: allTasks, loading } = useTasks();
  const [filter, setFilter] = useState(externalFilter || 'todo');

  // Sync filter with external filter from PlanScreen
  useEffect(() => {
    if (externalFilter) {
      setFilter(externalFilter);
    }
  }, [externalFilter]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter tasks
  const filteredTasks = allTasks.filter((task) => {
    if (filter === 'todo') return !task.completed;
    if (filter === 'done') return task.completed;
    return true;
  });

  const handleCreateTask = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', priority: 'medium' });
    setModalVisible(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, formData);
      } else {
        await createTask(user!.uid, formData);
      }
      setModalVisible(false);
      setFormData({ title: '', description: '', priority: 'medium' });
    } catch (error) {
      console.error('Error saving task:', error);
      Alert.alert('Error', 'Failed to save task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(taskId);
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleToggleComplete = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId);
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  // Navigate to task detail screen
  const handleNavigateToDetail = (task: Task) => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  // Check if task has additional content that warrants a chevron
  const hasTaskDetails = (task: Task) => {
    return !!task.description;
  };

  const renderTaskItem = ({ item }: { item: Task }) => {
    const showChevron = hasTaskDetails(item);
    const showPriorityTag = item.priority === 'high' || item.priority === 'low';

    return (
      <BaseCard
        onPress={showChevron ? () => handleNavigateToDetail(item) : undefined}
        style={styles.taskCard}
        testID={`task-card-${item.id}`}
      >
        <View style={styles.taskCardRow}>
          {/* Checkbox */}
          <Checkbox
            status={item.completed ? 'checked' : 'unchecked'}
            onPress={() => handleToggleComplete(item.id)}
            color={Colors.evergreenTeal}
          />

          {/* Content area */}
          <TouchableOpacity
            style={styles.taskCardContent}
            onPress={() => handleToggleComplete(item.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.taskCardTitle,
                item.completed && styles.taskCardTitleCompleted,
              ]}
              numberOfLines={2}
            >
              {item.title}
            </Text>

            {/* Priority tag - only for High/Low */}
            {showPriorityTag && (
              <PriorityBadge
                priority={item.priority}
                style={styles.taskPriorityTag}
              />
            )}
          </TouchableOpacity>

          {/* Chevron - only if task has description */}
          {showChevron && (
            <Icon name="chevron-right" size={16} color={Colors.mutedSageGray} />
          )}
        </View>
      </BaseCard>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading tasks..." />;
  }

  return (
    <LockedScreenOverlay feature="tasks_basic">
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.screenTitle}>
            Tasks
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Stay organized and productive
          </Text>
        </View>
      )}

      {/* Filter - hide when externalFilter is provided (PlanScreen controls filter) */}
      {!externalFilter && (
        <View style={styles.filterContainer}>
          <SegmentedButtons
            value={filter}
            onValueChange={setFilter}
            buttons={[
              {
                value: 'todo',
                label: `To Do (${allTasks.filter(t => !t.completed).length})`,
              },
              {
                value: 'done',
                label: `Done (${allTasks.filter(t => t.completed).length})`,
              },
              {
                value: 'all',
                label: 'All',
              },
            ]}
            style={styles.segmentedButtons}
          />
        </View>
      )}

      {/* Inline Create Button - shown when embedded in PlanScreen */}
      {showInlineCreate && (
        <InlineCreateButton
          label="Add a task"
          onPress={handleCreateTask}
          testID="inline-create-task"
        />
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon
              name={filter === 'done' ? 'check-circle-outline' : 'leaf'}
              size={32}
              color={Colors.evergreenTeal}
            />
          </View>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {filter === 'done' ? 'No completed tasks yet' : 'A clear space for what matters'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {filter === 'done'
              ? 'Your completed tasks will appear here'
              : 'Add tasks whenever something comes to mind.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB - hide when using inline create button */}
      {!showInlineCreate && (
        <FAB
          icon="plus"
          label="New Task"
          style={styles.fab}
          onPress={handleCreateTask}
          color={Colors.textOnPrimary}
        />
      )}

      {/* Create/Edit Modal */}
      <EnhancedModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
        subtitle="Stay organized and productive"
        headerIcon="checkbox-marked-outline"
        inputAccessoryViewID="task-modal"
        footer={
          <ModalFooterActions
            onCancel={() => setModalVisible(false)}
            onSubmit={handleSubmit}
            submitLabel={editingTask ? 'Update' : 'Create'}
            submitLoading={submitting}
            submitDisabled={submitting}
          />
        }
      >
        <Input
          label="Task Title *"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="e.g., Review project proposal"
          style={styles.input}
          inputAccessoryViewID="task-modal"
        />

        <Input
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Add details..."
          multiline
          numberOfLines={3}
          style={styles.input}
          inputAccessoryViewID="task-modal"
        />

        <Text variant="bodyMedium" style={styles.fieldLabel}>
          Priority
        </Text>
        <View style={styles.priorityButtons}>
          {(['low', 'medium', 'high'] as const).map((priority) => (
            <TouchableOpacity
              key={priority}
              onPress={() => setFormData({ ...formData, priority })}
              style={[
                styles.priorityButton,
                formData.priority === priority && styles[`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}Active`],
              ]}
            >
              <Text style={[styles.priorityButtonText, formData.priority === priority && styles.priorityButtonTextActive]}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </EnhancedModal>
    </SafeAreaView>
    </LockedScreenOverlay>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  taskCard: {
    marginBottom: Spacing.sm,
    marginHorizontal: 0,
  },
  taskCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskCardContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  taskCardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * 1.3,
  },
  taskCardTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.mutedSageGray,
  },
  taskPriorityTag: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    color: Colors.softCharcoal,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  input: {
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.medium,
    borderColor: Colors.border,
    backgroundColor: Colors.borderLight,
    alignItems: 'center',
  },
  priorityLowActive: {
    backgroundColor: Colors.priority.low,
    borderColor: Colors.success,
  },
  priorityMediumActive: {
    backgroundColor: Colors.priority.medium,
    borderColor: Colors.sunriseAmber,
  },
  priorityHighActive: {
    backgroundColor: Colors.priority.high,
    borderColor: Colors.error,
  },
  priorityButtonText: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  priorityButtonTextActive: {
    color: Colors.textPrimary,
  },
});

export default TasksScreen;
