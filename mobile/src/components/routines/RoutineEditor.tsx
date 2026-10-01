/**
 * Routine Editor Component
 * Create and edit routines with activity management
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import Text from '../shared/Text';
import TextInput from '../shared/TextInput';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
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
import {
  scheduleRoutineReminder,
  cancelRoutineReminder,
  parseTimeString,
  classifyReminderPermission,
  ReminderPermission,
  RoutineReminderInput,
} from '../../services/reminderScheduler.service';
import { getPermissionsStatus } from '../../services/notifications.service';
import { formatReminderTime } from '../../services/firebase/notificationPreferences.service';
import { REMINDER_ALERTS, REMINDER_ROW } from './routineEditor.copy';
import { TimePickerSheet } from '../shared/TimePickerSheet';
import { ReminderTime } from '../../types';
import {
  initialPickerTime,
  displayReminderTime,
  reminderModelFrom,
} from './routineReminderTime';

type ParsedTime = { hour: number; minute: number };

async function readReminderPermission(): Promise<ReminderPermission> {
  try {
    return classifyReminderPermission(await getPermissionsStatus());
  } catch {
    return 'undetermined';
  }
}

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
  // The reminder's local model (ROUTINE-REMINDER-TIME-PICKER R-6): a time
  // parseTimeString accepts, or null. Only the picker's Done, Remove reminder
  // and the load below ever set it, so it never holds malformed text.
  const [reminder, setReminder] = useState<string | null>(null);
  // The seed is computed ONCE, when the sheet opens, and held (R-4). Computing
  // it in render would move the wheel under the user's finger as the clock
  // crosses a quarter hour, because the sheet re-seeds when its value changes.
  const [pickerSeed, setPickerSeed] = useState<ReminderTime | null>(null);
  const [showActivityLibrary, setShowActivityLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form with existing routine data or defaults
  useEffect(() => {
    if (existingRoutine) {
      setRoutineName(existingRoutine.name);
      setActivities(existingRoutine.activities);
      // A legacy malformed value is null here and displays Add a reminder.
      // Loading writes nothing (R-6).
      setReminder(reminderModelFrom(existingRoutine.reminderTime));
    } else {
      setRoutineName(`My ${getRoutineTypeDisplayName(routineType)} Routine`);
      setActivities([]);
      setReminder(null);
    }
  }, [existingRoutine, routineType]);

  const openPicker = () => setPickerSeed(initialPickerTime(reminder, new Date()));
  // Cancel, and Android's dismissal, discard: the model is untouched.
  const closePicker = () => setPickerSeed(null);
  // Done: the picker writes the formatted time, "7:30 PM" (R-6).
  const commitPicker = (next: ReminderTime) => setReminder(formatReminderTime(next));

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

    // Empty means no reminder. A non-empty value is kept only if the single
    // parser accepts it; a rejected value is persisted as null (ruling R-D).
    // The picker-era model only ever holds a valid time or null, so the
    // rejected branch is defensive (R-6): whatever reaches here, the persisted
    // value is null or parses.
    const name = routineName.trim();
    const timeText = (reminder ?? '').trim();
    const parsed = timeText ? parseTimeString(timeText) : null;
    const storedTime = parsed ? timeText : null;

    setSaving(true);
    let routineId: string;
    try {
      if (existingRoutine) {
        await updateRoutine(existingRoutine.id, {
          name,
          activities,
          reminderTime: storedTime,
        });
        routineId = existingRoutine.id;
      } else {
        const created = await createRoutine(userId, {
          name,
          type: routineType,
          mode: 'checklist',
          activities,
          active: true,
          reminderTime: storedTime,
        });
        routineId = created.id;
        // A routine this create switched off loses its reminder now, not at
        // the next foreground sync (ruling R-H).
        for (const id of created.deactivatedIds) {
          await cancelRoutineReminder(id);
        }
      }
    } catch (error) {
      console.error('Error saving routine:', error);
      Alert.alert('Error', 'Failed to save routine. Please try again.');
      setSaving(false);
      return;
    }

    try {
      await resolveReminder(routineId, timeText, parsed);
    } finally {
      setSaving(false);
    }
  };

  /**
   * The save outcome flow (ruling R-E). Runs only here, on an explicit save,
   * after the routine write has succeeded. onSave runs exactly once: when the
   * last alert's button is pressed, or straight away when there is no alert.
   */
  const resolveReminder = async (
    routineId: string,
    timeText: string,
    parsed: ParsedTime | null
  ) => {
    const close = () => onSave();

    // E1. No reminder.
    if (!timeText) {
      if (existingRoutine) await cancelRoutineReminder(routineId);
      close();
      return;
    }

    // E2. Invalid time: already persisted as null. Never asks for permission.
    // Defensive only: unreachable from the picker-era UI (R-6).
    if (!parsed) {
      await cancelRoutineReminder(routineId);
      Alert.alert(REMINDER_ALERTS.invalidTime.title, REMINDER_ALERTS.invalidTime.body, [
        { text: REMINDER_ALERTS.invalidTime.ok, onPress: close },
      ]);
      return;
    }

    // E3. A valid time.
    const previous = existingRoutine?.reminderTime
      ? parseTimeString(existingRoutine.reminderTime)
      : null;
    const changed =
      !existingRoutine ||
      !previous ||
      previous.hour !== parsed.hour ||
      previous.minute !== parsed.minute;

    const input: RoutineReminderInput = {
      id: routineId,
      name: routineName.trim(),
      type: existingRoutine ? existingRoutine.type : routineType,
      activities,
      active: existingRoutine ? existingRoutine.active : true,
      reminderTime: timeText,
    };

    const showScheduled = () =>
      Alert.alert(
        REMINDER_ALERTS.scheduled.title,
        REMINDER_ALERTS.scheduled.body(formatReminderTime(parsed)),
        [{ text: REMINDER_ALERTS.scheduled.ok, onPress: close }]
      );
    const showFailure = () =>
      Alert.alert(REMINDER_ALERTS.schedulingFailure.title, REMINDER_ALERTS.schedulingFailure.body, [
        { text: REMINDER_ALERTS.schedulingFailure.ok, onPress: close },
      ]);
    const showDenied = () =>
      Alert.alert(REMINDER_ALERTS.deniedOff.title, REMINDER_ALERTS.deniedOff.body, [
        {
          text: REMINDER_ALERTS.deniedOff.openSettings,
          onPress: async () => {
            try {
              await Linking.openSettings();
            } catch (error) {
              console.error('Error opening settings:', error);
            }
            close();
          },
        },
        { text: REMINDER_ALERTS.deniedOff.notNow, onPress: close },
      ]);
    // Anything but a successful schedule means the reminder is not set.
    const schedule = async (announce: boolean) => {
      const outcome = await scheduleRoutineReminder(input);
      if (outcome !== 'scheduled') {
        showFailure();
      } else if (announce) {
        showScheduled();
      } else {
        close();
      }
    };

    await cancelRoutineReminder(routineId);
    const permission = await readReminderPermission();

    if (permission === 'granted') {
      await schedule(changed);
      return;
    }

    if (permission === 'denied') {
      if (changed) showDenied();
      else close();
      return;
    }

    // Undetermined: asked on every save with a reminder configured.
    Alert.alert(REMINDER_ALERTS.permissionNeeded.title, REMINDER_ALERTS.permissionNeeded.body, [
      {
        text: REMINDER_ALERTS.permissionNeeded.allow,
        onPress: async () => {
          let after: ReminderPermission;
          try {
            await Notifications.requestPermissionsAsync();
            after = classifyReminderPermission(await getPermissionsStatus());
          } catch (error) {
            console.error('Error requesting notification permission:', error);
            showFailure();
            return;
          }
          if (after === 'granted') await schedule(true);
          else if (after === 'denied') showDenied();
          else showFailure();
        },
      },
      { text: REMINDER_ALERTS.permissionNeeded.notNow, onPress: close },
    ]);
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
              // Only after the delete succeeds: a failed delete keeps its
              // reminder (ruling R-G).
              await cancelRoutineReminder(existingRoutine.id);
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
  // R-7: displayed in the picker-era format; never shown unless it parses.
  const shownReminder = displayReminderTime(reminder);

  const pickerSheet = pickerSeed ? (
    <TimePickerSheet
      visible
      value={pickerSeed}
      onChange={commitPicker}
      onClose={closePicker}
    />
  ) : null;
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
                      <TouchableOpacity
                        onPress={() => handleMoveUp(index)}
                        disabled={index === 0}
                        style={{width: 48, height: 48, borderRadius: 9999, justifyContent: 'center', alignItems: 'center'}}
                      >
                        <Icon name="chevron-up" size={20} color={index === 0 ? Colors.textSecondary : Colors.evergreenTeal} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveDown(index)}
                        disabled={index === activities.length - 1}
                        style={{width: 48, height: 48, borderRadius: 9999, justifyContent: 'center', alignItems: 'center'}}
                      >
                        <Icon name="chevron-down" size={20} color={index === activities.length - 1 ? Colors.textSecondary : Colors.evergreenTeal} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleRemoveActivity(index)}
                        style={{width: 48, height: 48, borderRadius: 9999, justifyContent: 'center', alignItems: 'center'}}
                      >
                        <Icon name="delete" size={20} color="#D97A6E" />
                      </TouchableOpacity>
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

        {/* Reminder (optional): picked, not typed (R-1, R-2, R-3) */}
        <View style={styles.section}>
          <Text style={styles.label}>{REMINDER_ROW.sectionLabel}</Text>
          <TouchableOpacity
            style={styles.reminderRow}
            onPress={openPicker}
            // Disabled while a save is in progress, like the save button: the
            // outcome flow reads the model that save started with.
            disabled={saving}
            accessibilityState={{ disabled: saving }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={
              shownReminder ? REMINDER_ROW.a11ySet(shownReminder) : REMINDER_ROW.a11yEmpty
            }
            testID="routine-reminder-row"
          >
            <Text style={shownReminder ? styles.reminderRowValue : styles.reminderRowEmpty}>
              {shownReminder ?? REMINDER_ROW.empty}
            </Text>
            <Icon name="chevron-right" size={Layout.iconSize.sm} color={Colors.textSecondary} />
          </TouchableOpacity>
          {shownReminder && (
            <TouchableOpacity
              style={styles.removeReminder}
              onPress={() => setReminder(null)}
              disabled={saving}
              accessibilityState={{ disabled: saving }}
              accessibilityRole="button"
              accessibilityLabel={REMINDER_ROW.a11yRemove}
              testID="routine-reminder-remove"
            >
              <Text style={styles.removeReminderLabel}>{REMINDER_ROW.remove}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        {activities.length > 0 && (
          <Card style={styles.statsCard}>
            <View key="duration-stat" style={styles.statRow}>
              <Text style={styles.statLabel}>Total Duration</Text>
              <Text style={styles.statValue}>{`${totalDuration} min`}</Text>
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
              <TouchableOpacity
                key="modal-close"
                onPress={() => setShowActivityLibrary(false)}
                style={{width: 48, height: 48, borderRadius: 9999, justifyContent: 'center', alignItems: 'center'}}
              >
                <Icon name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
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
                    <Text key={`lib-duration-${index}`} style={styles.libraryDuration}>{`${template.duration}m`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reminder time picker. iOS: the shared sheet's overlay inside a
          transparent Modal, the Activity Library's pattern, so it sits above
          the floating tab bar and is not clipped by PlanScreen (R-1). Android:
          the shared sheet is the system dialog, which is already modal. */}
      {Platform.OS === 'ios' ? (
        <Modal
          visible={pickerSeed !== null}
          animationType="slide"
          transparent
          onRequestClose={closePicker}
        >
          {pickerSheet}
        </Modal>
      ) : (
        pickerSheet
      )}
    </KeyboardAvoidingView>
  );
};

// Brand-compliant activity colors
// Per Focus Page Spec: Only use primary (#1B5E57), coral (#D97A6E), or apricot (#F5B971)
function getColorForActivity(color: string): string {
  const colorMap: { [key: string]: string } = {
    // Primary teal mappings
    purple: '#1B5E57',
    green: '#1B5E57',
    blue: '#1B5E57',
    cyan: '#1B5E57',
    indigo: '#1B5E57',
    teal: '#1B5E57',
    // Coral mappings (for heart/gratitude)
    red: '#D97A6E',
    pink: '#D97A6E',
    // Apricot mappings (for energy/warmth)
    orange: '#F5B971',
    yellow: '#F5B971',
    brown: '#F5B971',
    // Neutral
    gray: Colors.mutedSageGray,
  };
  return colorMap[color] || '#1B5E57';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
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
    padding: Spacing.base,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: Layout.buttonHeight.sm,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
  },
  reminderRowValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  reminderRowEmpty: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  // Housekeeping, not a destructive action: a text button with no fill.
  // The 48pt minimum target (UI Standards 18.2). The top margin is 2pt less
  // than before so the label sits exactly where it did at the old 44pt height.
  removeReminder: {
    alignSelf: 'flex-start',
    minHeight: Layout.buttonHeight.sm,
    justifyContent: 'center',
    marginTop: Spacing['2xs'],
  },
  removeReminderLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
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
    padding: Spacing.base,
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
    marginLeft: Spacing.base,
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
    backgroundColor: Colors.background.default,
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
    backgroundColor: Colors.background.default,
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
    marginTop: Spacing.base,
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
    padding: Spacing.base,
    marginBottom: Spacing.base,
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
    borderColor: '#D97A6E', // Brand-compliant Soft Coral
  },
  deleteText: {
    color: '#D97A6E', // Brand-compliant Soft Coral
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
    gap: Spacing.base,
  },
  libraryItem: {
    width: '30%',
    alignItems: 'center',
    padding: Spacing.base,
    backgroundColor: Colors.background.default,
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
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
