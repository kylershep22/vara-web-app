/**
 * Tasks Screen
 * Task management with priority and completion tracking
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, FAB, Portal, Modal, Button as PaperButton, Checkbox, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingSpinner } from '../components';
import { Colors, Spacing } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks';
import { createTask, updateTask, deleteTask, toggleTaskComplete } from '../services/firebase';
import { Task } from '../types';

interface TasksScreenProps {
  hideHeader?: boolean;
}

const TasksScreen: React.FC<TasksScreenProps> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { tasks: allTasks, loading } = useTasks();
  const [filter, setFilter] = useState('todo');
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

  const getPriorityColor = (priority?: string) => {
    switch (priority || 'medium') {
      case 'high':
        return '#FFEBEE';
      case 'medium':
        return '#FFF3E0';
      case 'low':
        return '#E8F5E9';
      default:
        return '#FFF3E0';
    }
  };

  const getPriorityTextColor = (priority?: string) => {
    switch (priority || 'medium') {
      case 'high':
        return '#C62828';
      case 'medium':
        return '#E65100';
      case 'low':
        return '#2E7D32';
      default:
        return '#E65100';
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <Card style={styles.taskCard}>
      <View style={styles.taskContent}>
        {/* Checkbox */}
        <Checkbox
          status={item.completed ? 'checked' : 'unchecked'}
          onPress={() => handleToggleComplete(item.id)}
          color={Colors.evergreenTeal}
        />

        {/* Task Info */}
        <TouchableOpacity
          style={styles.taskInfo}
          onPress={() => handleToggleComplete(item.id)}
          activeOpacity={0.7}
        >
          <Text
            variant="titleMedium"
            style={[styles.taskTitle, item.completed && styles.taskCompleted]}
          >
            {item.title}
          </Text>
          {item.description && (
            <Text
              variant="bodyMedium"
              style={[styles.taskDescription, item.completed && styles.taskCompleted]}
            >
              {item.description}
            </Text>
          )}

          {/* Timestamps */}
          <View style={styles.timestampContainer}>
            {item.createdAt && (
              <Text variant="bodySmall" style={styles.timestampText}>
                Created: {new Date(item.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            )}
            {item.completed && item.completedAt && (
              <Text variant="bodySmall" style={styles.timestampText}>
                Completed: {new Date(item.completedAt.seconds * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            )}
          </View>

          {/* Priority Badge */}
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(item.priority) },
            ]}
          >
            <Text
              variant="bodySmall"
              style={[
                styles.priorityText,
                { color: getPriorityTextColor(item.priority) },
              ]}
            >
              {(item.priority || 'medium').toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.taskActions}>
        <Button
          variant="text"
          onPress={() => handleEditTask(item)}
          style={styles.actionButton}
        >
          Edit
        </Button>
        <Button
          variant="text"
          onPress={() => handleDeleteTask(item.id)}
          style={styles.deleteButton}
        >
          Delete
        </Button>
      </View>
    </Card>
  );

  if (loading) {
    return <LoadingSpinner message="Loading tasks..." />;
  }

  return (
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

      {/* Filter */}
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

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>
            {filter === 'done' ? '🎉' : '📝'}
          </Text>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {filter === 'done' ? 'No completed tasks' : 'No tasks'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {filter === 'done'
              ? 'Complete some tasks to see them here'
              : 'Add a task to get started!'}
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

      {/* FAB */}
      <FAB
        icon="plus"
        label="New Task"
        style={styles.fab}
        onPress={handleCreateTask}
        color={Colors.textOnPrimary}
      />

      {/* Create/Edit Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'New Task'}
              </Text>

              <Input
                label="Task Title *"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="e.g., Review project proposal"
                style={styles.input}
              />

              <Input
                label="Description"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Add details..."
                multiline
                numberOfLines={3}
                style={styles.input}
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
                      {
                        backgroundColor:
                          formData.priority === priority
                            ? getPriorityColor(priority)
                            : Colors.borderLight,
                        borderColor:
                          formData.priority === priority
                            ? getPriorityTextColor(priority)
                            : Colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        {
                          color:
                            formData.priority === priority
                              ? getPriorityTextColor(priority)
                              : Colors.textSecondary,
                        },
                      ]}
                    >
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={submitting}
                  style={styles.modalButton}
                  buttonColor={Colors.evergreenTeal}
                >
                  {editingTask ? 'Update' : 'Create'}
                </PaperButton>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  taskCard: {
    marginBottom: Spacing.md,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  taskInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  taskTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  taskDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  timestampContainer: {
    marginVertical: Spacing.xs,
  },
  timestampText: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: Spacing.xs,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  input: {
    marginBottom: Spacing.md,
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
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default TasksScreen;
