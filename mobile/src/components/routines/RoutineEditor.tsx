/**
 * Routine Editor Component
 * Create and edit routines with activity management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { Button, Card } from '../';
import {
  Activity,
  Routine,
  RoutineType,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  calculateTotalDuration,
} from '../../services/firebase/routines.service';
import {
  getActivitiesForType,
  getRoutineTypeDisplayName,
  createActivityFromTemplate,
  ActivityTemplate,
} from '../../constants/activityLibrary';

interface RoutineEditorProps {
  userId: string;
  routineType: RoutineType;
  existingRoutine?: Routine | null;
  onSave: () => void;
  onCancel: () => void;
}

export const RoutineEditor: React.FC<RoutineEditorProps> = ({
  userId,
  routineType,
  existingRoutine,
  onSave,
  onCancel,
}) => {
  const [routineName, setRoutineName] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [reminderTime, setReminderTime] = useState('');
  const [showActivityLibrary, setShowActivityLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form with existing routine data or defaults
  useEffect(() => {
    if (existingRoutine) {
      setRoutineName(existingRoutine.name);
      setActivities(existingRoutine.activities);
      setReminderTime(existingRoutine.reminderTime || '');
    } else {
      setRoutineName(`My ${getRoutineTypeDisplayName(routineType)} Routine`);
      setActivities([]);
      setReminderTime('');
    }
  }, [existingRoutine, routineType]);

  const handleAddActivity = (template: ActivityTemplate) => {
    const newActivity = createActivityFromTemplate(template, activities.length);
    setActivities([...activities, newActivity]);
    setShowActivityLibrary(false);
  };

  const handleRemoveActivity = (index: number) => {
    const newActivities = activities.filter((_, i) => i !== index);
    // Reorder remaining activities
    const reorderedActivities = newActivities.map((act, i) => ({
      ...act,
      order: i,
    }));
    setActivities(reorderedActivities);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newActivities = [...activities];
    [newActivities[index - 1], newActivities[index]] = [
      newActivities[index],
      newActivities[index - 1],
    ];
    // Update order property
    const reorderedActivities = newActivities.map((act, i) => ({
      ...act,
      order: i,
    }));
    setActivities(reorderedActivities);
  };

  const handleMoveDown = (index: number) => {
    if (index === activities.length - 1) return;
    const newActivities = [...activities];
    [newActivities[index], newActivities[index + 1]] = [
      newActivities[index + 1],
      newActivities[index],
    ];
    // Update order property
    const reorderedActivities = newActivities.map((act, i) => ({
      ...act,
      order: i,
    }));
    setActivities(reorderedActivities);
  };

  const handleDurationChange = (index: number, duration: string) => {
    const newActivities = [...activities];
    newActivities[index] = {
      ...newActivities[index],
      duration: parseInt(duration) || 0,
    };
    setActivities(newActivities);
  };

  const handleSave = async () => {
    // Validation
    if (!routineName.trim()) {
      Alert.alert('Error', 'Please enter a routine name');
      return;
    }

    if (activities.length === 0) {
      Alert.alert('Error', 'Please add at least one activity');
      return;
    }

    setSaving(true);
    try {
      if (existingRoutine) {
        // Update existing routine
        await updateRoutine(existingRoutine.id, {
          name: routineName.trim(),
          activities,
          reminderTime: reminderTime.trim() || null,
        });
        Alert.alert('Success', 'Routine updated successfully!');
      } else {
        // Create new routine
        await createRoutine(userId, {
          name: routineName.trim(),
          type: routineType,
          activities,
          active: true,
          reminderTime: reminderTime.trim() || null,
        });
        Alert.alert('Success', 'Routine created successfully! 🎉');
      }
      onSave();
    } catch (error) {
      console.error('Error saving routine:', error);
      Alert.alert('Error', 'Failed to save routine. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existingRoutine) return;

    Alert.alert(
      'Delete Routine',
      'Are you sure you want to delete this routine? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoutine(existingRoutine.id);
              Alert.alert('Success', 'Routine deleted');
              onSave();
            } catch (error) {
              console.error('Error deleting routine:', error);
              Alert.alert('Error', 'Failed to delete routine');
            }
          },
        },
      ]
    );
  };

  const totalDuration = calculateTotalDuration(activities);
  const activityLibrary = getActivitiesForType(routineType);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Routine Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Routine Name</Text>
          <TextInput
            style={styles.input}
            value={routineName}
            onChangeText={setRoutineName}
            placeholder="My Morning Routine"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        {/* Activities List */}
        <View style={styles.section}>
          <Text style={styles.label}>Activities</Text>
          {activities.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon key="empty-icon" name="format-list-checks" size={40} color={Colors.textSecondary} />
              <Text key="empty-text" style={styles.emptyText}>No activities yet</Text>
              <Text key="empty-subtext" style={styles.emptySubtext}>
                Add activities to build your routine
              </Text>
            </Card>
          ) : (
            <View style={styles.activitiesList}>
              {activities.map((activity, index) => (
                <Card key={activity.id} style={styles.activityCard}>
                  <View style={styles.activityHeader}>
                    <View style={styles.activityInfo}>
                      <View
                        key="activity-icon-wrapper"
                        style={[
                          styles.activityIcon,
                          { backgroundColor: getColorForActivity(activity.color) },
                        ]}
                      >
                        <Icon
                          name={activity.icon}
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View key="activity-details" style={styles.activityDetails}>
                        <Text style={styles.activityName}>{activity.name}</Text>
                        <View style={styles.durationInput}>
                          <TouchableOpacity
                            key="duration-decrease"
                            style={styles.durationButton}
                            onPress={() => handleDurationChange(index, String(Math.max(1, activity.duration - 1)))}
                          >
                            <Icon name="minus" size={16} color={Colors.evergreenTeal} />
                          </TouchableOpacity>
                          <TextInput
                            key="duration-input"
                            style={styles.durationTextInput}
                            value={String(activity.duration)}
                            onChangeText={(text) => handleDurationChange(index, text)}
                            keyboardType="number-pad"
                            maxLength={3}
                          />
                          <TouchableOpacity
                            key="duration-increase"
                            style={styles.durationButton}
                            onPress={() => handleDurationChange(index, String(activity.duration + 1))}
                          >
                            <Icon name="plus" size={16} color={Colors.evergreenTeal} />
                          </TouchableOpacity>
                          <Text key="duration-label" style={styles.durationLabel}>min</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.activityActions}>
                      <IconButton
                        icon="chevron-up"
                        size={20}
                        onPress={() => handleMoveUp(index)}
                        disabled={index === 0}
                        iconColor={index === 0 ? Colors.textSecondary : Colors.evergreenTeal}
                      />
                      <IconButton
                        icon="chevron-down"
                        size={20}
                        onPress={() => handleMoveDown(index)}
                        disabled={index === activities.length - 1}
                        iconColor={
                          index === activities.length - 1
                            ? Colors.textSecondary
                            : Colors.evergreenTeal
                        }
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => handleRemoveActivity(index)}
                        iconColor="#EF4444"
                      />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          <Button
            variant="outline"
            onPress={() => setShowActivityLibrary(true)}
            style={styles.addButton}
          >
            <Icon key="add-icon" name="plus" size={20} color={Colors.evergreenTeal} />
            <Text key="add-text" style={styles.addButtonText}>Add Activity</Text>
          </Button>
        </View>

        {/* Reminder Time (Optional) */}
        <View style={styles.section}>
          <Text style={styles.label}>Reminder Time (Optional)</Text>
          <TextInput
            style={styles.input}
            value={reminderTime}
            onChangeText={setReminderTime}
            placeholder="08:00"
            placeholderTextColor={Colors.textSecondary}
          />
          <Text style={styles.helperText}>
            Set a daily reminder time (HH:MM format)
          </Text>
        </View>

        {/* Stats */}
        {activities.length > 0 && (
          <Card style={styles.statsCard}>
            <View key="duration-stat" style={styles.statRow}>
              <Text style={styles.statLabel}>Total Duration</Text>
              <Text style={styles.statValue}>{totalDuration} min</Text>
            </View>
            <View key="count-stat" style={styles.statRow}>
              <Text style={styles.statLabel}>Activity Count</Text>
              <Text style={styles.statValue}>{activities.length}</Text>
            </View>
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            key="save-button"
            variant="primary"
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? 'Saving...' : existingRoutine ? 'Update Routine' : 'Save Routine'}
          </Button>
          <Button key="cancel-button" variant="outline" onPress={onCancel} style={styles.cancelButton}>
            Cancel
          </Button>
          {existingRoutine && (
            <Button
              key="delete-button"
              variant="outline"
              onPress={handleDelete}
              style={[styles.cancelButton, styles.deleteButton]}
            >
              <Text style={styles.deleteText}>Delete Routine</Text>
            </Button>
          )}
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>

      {/* Activity Library Modal */}
      <Modal
        visible={showActivityLibrary}
        animationType="slide"
        transparent
        onRequestClose={() => setShowActivityLibrary(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text key="modal-title" style={styles.modalTitle}>Add Activity</Text>
              <IconButton
                key="modal-close"
                icon="close"
                size={24}
                onPress={() => setShowActivityLibrary(false)}
              />
            </View>
            <ScrollView style={styles.libraryScroll}>
              <View style={styles.libraryGrid}>
                {activityLibrary.map((template, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.libraryItem}
                    onPress={() => handleAddActivity(template)}
                  >
                    <View
                      key={`lib-icon-${index}`}
                      style={[
                        styles.libraryIcon,
                        { backgroundColor: getColorForActivity(template.color) },
                      ]}
                    >
                      <Icon name={template.icon} size={24} color="#fff" />
                    </View>
                    <Text key={`lib-name-${index}`} style={styles.libraryName}>{template.name}</Text>
                    <Text key={`lib-duration-${index}`} style={styles.libraryDuration}>{template.duration}m</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// Helper function to get color for activity
function getColorForActivity(color: string): string {
  const colorMap: { [key: string]: string } = {
    purple: '#9333EA',
    green: '#16A34A',
    blue: '#2563EB',
    orange: '#EA580C',
    indigo: '#4F46E5',
    red: '#DC2626',
    cyan: '#06B6D4',
    teal: '#14B8A6',
    yellow: '#EAB308',
    gray: '#6B7280',
    brown: '#92400E',
    pink: '#EC4899',
  };
  return colorMap[color] || Colors.evergreenTeal;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  activitiesList: {
    gap: Spacing.sm,
  },
  activityCard: {
    padding: Spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDetails: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  durationInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  durationButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
  },
  durationTextInput: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    padding: Spacing.xs,
    width: 40,
    textAlign: 'center',
    backgroundColor: Colors.background,
    borderRadius: 6,
  },
  durationLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activityActions: {
    flexDirection: 'row',
  },
  addButton: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  addButtonText: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
  },
  statsCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  actions: {
    gap: Spacing.sm,
  },
  saveButton: {
    marginBottom: Spacing.sm,
  },
  cancelButton: {
    marginBottom: Spacing.sm,
  },
  deleteButton: {
    borderColor: '#EF4444',
  },
  deleteText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  libraryScroll: {
    padding: Spacing.lg,
  },
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  libraryItem: {
    width: '30%',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  libraryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  libraryName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  libraryDuration: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
