/**
 * Task Detail Screen
 * View and manage individual task details
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button, Input, PriorityBadge, EnhancedModal, ModalFooterActions, BaseCard } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks';
import { updateTask, deleteTask, toggleTaskComplete } from '../services/firebase';
import { Task } from '../types';

type TaskDetailRouteParams = {
  TaskDetail: {
    taskId: string;
  };
};

const TaskDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<TaskDetailRouteParams, 'TaskDetail'>>();
  const { taskId } = route.params;
  const { user } = useAuth();
  const { tasks } = useTasks();

  // Find the task from the tasks hook (real-time updates)
  const task = tasks.find(t => t.id === taskId);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'medium' as 'low' | 'medium' | 'high',
  });
  const [submitting, setSubmitting] = useState(false);

  // If task not found, show empty state
  if (!task) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={48} color={Colors.mutedSageGray} />
          <Text style={styles.emptyTitle}>Task not found</Text>
          <Text style={styles.emptyText}>This task may have been deleted.</Text>
          <Button variant="outline" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const handleEdit = () => {
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
    });
    setEditModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    setSubmitting(true);
    try {
      await updateTask(task.id, formData);
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const handleToggleComplete = async () => {
    try {
      await toggleTaskComplete(task.id);
    } catch (error) {
      console.error('Error toggling task:', error);
      Alert.alert('Error', 'Failed to update task');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Info Card */}
        <BaseCard style={styles.mainCard}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={handleToggleComplete}
            activeOpacity={0.7}
          >
            <Checkbox
              status={task.completed ? 'checked' : 'unchecked'}
              onPress={handleToggleComplete}
              color={Colors.evergreenTeal}
            />
            <Text style={[
              styles.taskTitle,
              task.completed && styles.taskTitleCompleted,
            ]}>
              {task.title}
            </Text>
          </TouchableOpacity>

          <View style={styles.priorityRow}>
            <Text style={styles.priorityLabel}>Priority:</Text>
            <PriorityBadge priority={task.priority} />
          </View>

          {task.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{task.description}</Text>
            </>
          )}
        </BaseCard>

        {/* Timestamps Card */}
        <BaseCard style={styles.timestampCard}>
          <Text style={styles.sectionTitle}>Details</Text>

          <View style={styles.timestampRow}>
            <Icon name="clock-outline" size={16} color={Colors.mutedSageGray} />
            <Text style={styles.timestampLabel}>Created:</Text>
            <Text style={styles.timestampValue}>{formatDate(task.createdAt)}</Text>
          </View>

          {task.completed && task.completedAt && (
            <View style={styles.timestampRow}>
              <Icon name="check-circle-outline" size={16} color={Colors.success} />
              <Text style={styles.timestampLabel}>Completed:</Text>
              <Text style={styles.timestampValue}>{formatDate(task.completedAt)}</Text>
            </View>
          )}
        </BaseCard>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            variant="outline"
            onPress={handleEdit}
            style={styles.actionButton}
          >
            Edit Task
          </Button>

          <Button
            variant="text"
            onPress={handleDelete}
            style={styles.deleteButton}
            textColor={Colors.error}
          >
            Delete Task
          </Button>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <EnhancedModal
        visible={editModalVisible}
        onDismiss={() => setEditModalVisible(false)}
        title="Edit Task"
        subtitle="Update your task details"
        headerIcon="checkbox-marked-outline"
        inputAccessoryViewID="task-edit-modal"
        footer={
          <ModalFooterActions
            onCancel={() => setEditModalVisible(false)}
            onSubmit={handleSubmit}
            submitLabel="Save"
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
          inputAccessoryViewID="task-edit-modal"
        />

        <Input
          label="Description"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          placeholder="Add details..."
          multiline
          numberOfLines={3}
          style={styles.input}
          inputAccessoryViewID="task-edit-modal"
        />

        <Text style={styles.fieldLabel}>Priority</Text>
        <View style={styles.priorityButtons}>
          {(['low', 'medium', 'high'] as const).map((priority) => (
            <TouchableOpacity
              key={priority}
              onPress={() => setFormData({ ...formData, priority })}
              style={[
                styles.priorityButton,
                formData.priority === priority && styles[`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}Active` as keyof typeof styles],
              ]}
            >
              <Text style={[
                styles.priorityButtonText,
                formData.priority === priority && styles.priorityButtonTextActive
              ]}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </EnhancedModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.base,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  mainCard: {
    marginBottom: Spacing.base,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  taskTitle: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.softCharcoal,
    marginLeft: Spacing.sm,
    marginTop: 4,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.mutedSageGray,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  priorityLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.base,
  },
  descriptionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  descriptionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * 1.5,
  },
  timestampCard: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.base,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  timestampLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  timestampValue: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  actionsContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  deleteButton: {
    width: '100%',
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

export default TaskDetailScreen;
