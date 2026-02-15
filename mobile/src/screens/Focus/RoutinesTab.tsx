/**
 * RoutinesTab Component
 * Routines management tab with time-of-day selector
 *
 * Per Focus Page Spec Phase 3:
 * - TimeOfDaySelector: Morning, Evening, Bedtime, Custom
 * - RoutineCard with activity list
 * - "Begin at your own pace" CTA
 * - "Set a gentle reminder" link
 * - Brand-compliant empty state
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { useAuth } from '../../context/AuthContext';
import {
  Routine,
  Activity,
  fetchActiveRoutineByType,
  calculateTotalDuration,
  updateRoutine,
} from '../../services/firebase/routines.service';
import { runMigrationIfNeeded } from '../../services/firebase/routineMigration.service';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  SizeTokens,
  FocusCopy,
  formatSummary,
} from '../../tokens/design-tokens';
import { LoadingSpinner } from '../../components';
import { RoutineEditor } from '../../components/routines/RoutineEditor';
import {
  TimeOfDaySelector,
  TimeOfDay,
  ActivityListItem,
  AddActivityButton,
} from './components';
import { getActivityColor, getActivityColorWithOpacity } from './components/activityColors';

// Map new TimeOfDay to existing RoutineType
type RoutineType = 'morning' | 'bedtime' | 'evening' | 'custom';

const mapTimeOfDayToRoutineType = (time: TimeOfDay): RoutineType => {
  // Custom maps to what was 'sunday' in the database
  if (time === 'custom') return 'custom';
  return time;
};

interface RoutinesTabProps {
  /** Callback when "Begin at your own pace" is pressed */
  onStartRoutine: (routine: any) => void;
}

export const RoutinesTab: React.FC<RoutinesTabProps> = ({ onStartRoutine }) => {
  const { user } = useAuth();
  const [selectedTime, setSelectedTime] = useState<TimeOfDay>('morning');
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Run migration on mount (Sunday → Custom)
  useEffect(() => {
    if (user) {
      runMigrationIfNeeded(user.uid);
    }
  }, [user]);

  // Load active routine for selected time
  useEffect(() => {
    loadActiveRoutine();
  }, [selectedTime, user]);

  const loadActiveRoutine = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Map 'custom' to 'sunday' for backwards compatibility
      const routineType = selectedTime === 'custom' ? 'sunday' : selectedTime;
      const routine = await fetchActiveRoutineByType(user.uid, routineType as any);
      setActiveRoutine(routine);
    } catch (error) {
      console.error('Error loading routine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = useCallback((time: TimeOfDay) => {
    setSelectedTime(time);
  }, []);

  const handleStartRoutine = useCallback(() => {
    if (activeRoutine) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onStartRoutine(activeRoutine);
    }
  }, [activeRoutine, onStartRoutine]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCreate = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleActivityReorder = useCallback(async (data: Activity[]) => {
    if (!activeRoutine) return;

    // Update order property on each activity
    const reorderedActivities = data.map((activity, index) => ({
      ...activity,
      order: index,
    }));

    // Optimistic update
    setActiveRoutine({
      ...activeRoutine,
      activities: reorderedActivities,
    });

    // Persist to Firestore
    try {
      await updateRoutine(activeRoutine.id, {
        activities: reorderedActivities,
      });
    } catch (error) {
      console.error('Error reordering activities:', error);
      // Revert on error
      loadActiveRoutine();
    }
  }, [activeRoutine]);

  if (!user) {
    return null;
  }

  // Show RoutineEditor when editing
  if (isEditing) {
    // Map TimeOfDay to RoutineType for the editor
    const routineType = selectedTime === 'custom' ? 'sunday' : selectedTime;

    return (
      <RoutineEditor
        userId={user.uid}
        routineType={routineType as any}
        existingRoutine={activeRoutine}
        onSave={() => {
          setIsEditing(false);
          loadActiveRoutine();
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Time of Day Selector */}
      <TimeOfDaySelector
        selectedTime={selectedTime}
        onTimeChange={handleTimeChange}
      />

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="Loading routine..." />
      ) : activeRoutine ? (
        <RoutineView
          routine={activeRoutine}
          onEdit={handleEdit}
          onStart={handleStartRoutine}
          onReorder={handleActivityReorder}
        />
      ) : (
        <EmptyState onCreate={handleCreate} />
      )}
    </View>
  );
};

/**
 * RoutineView - Shows active routine with activity list
 */
interface RoutineViewProps {
  routine: Routine;
  onEdit: () => void;
  onStart: () => void;
  onReorder: (data: Activity[]) => void;
}

const RoutineView: React.FC<RoutineViewProps> = ({
  routine,
  onEdit,
  onStart,
  onReorder,
}) => {
  const totalDuration = calculateTotalDuration(routine.activities);
  const summary = formatSummary(totalDuration, routine.activities.length);

  const renderActivity = ({ item, drag, isActive, getIndex }: RenderItemParams<Activity>) => {
    const index = getIndex() ?? 0;
    const isLast = index === routine.activities.length - 1;

    return (
      <ScaleDecorator>
        <ActivityListItem
          activity={item}
          isLast={isLast}
          isDragging={isActive}
          onDragStart={drag}
          isDraggable
        />
      </ScaleDecorator>
    );
  };

  return (
    <ScrollView
      style={styles.routineContainer}
      contentContainerStyle={styles.routineContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Routine Card */}
      <View style={styles.routineCard}>
        {/* Header */}
        <View style={styles.routineHeader}>
          <View style={styles.routineHeaderLeft}>
            <Text style={styles.routineName}>{routine.name}</Text>
            {routine.reminderTime && (
              <View style={styles.reminderBadge}>
                <Icon name="bell" size={14} color={ColorTokens.primary} />
                <Text style={styles.reminderText}>
                  {routine.reminderTime}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={FocusCopy.editButton}
          >
            <Icon name="pencil" size={14} color={ColorTokens.primary} />
            <Text style={styles.editButtonText}>{FocusCopy.editButton}</Text>
          </TouchableOpacity>
        </View>

        {/* Activity List */}
        <View style={styles.activityList}>
          <DraggableFlatList
            data={routine.activities}
            onDragEnd={({ data }) => onReorder(data)}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderActivity}
            scrollEnabled={false}
          />

          {/* Add Activity Button */}
          <AddActivityButton onPress={onEdit} />
        </View>

        {/* Summary Footer */}
        <View style={styles.summaryFooter}>
          <View style={styles.summaryItem}>
            <Icon name="clock-outline" size={16} color={ColorTokens.textSecondary} />
            <Text style={styles.summaryText}>{summary.duration}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Icon name="format-list-checks" size={16} color={ColorTokens.textSecondary} />
            <Text style={styles.summaryText}>{summary.count}</Text>
          </View>
        </View>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.startButton}
        onPress={onStart}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={FocusCopy.startCta}
      >
        <Text style={styles.startButtonText}>{FocusCopy.startCta}</Text>
      </TouchableOpacity>

      {/* Reminder Link */}
      <TouchableOpacity
        style={styles.reminderLink}
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={FocusCopy.reminderLink}
      >
        <Text style={styles.reminderLinkText}>{FocusCopy.reminderLink}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

/**
 * EmptyState - Shows when no routine exists for selected time
 */
interface EmptyStateProps {
  onCreate: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreate }) => {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyHeadline}>{FocusCopy.emptyHeadline}</Text>
      <Text style={styles.emptyBody}>{FocusCopy.emptyBody}</Text>

      <TouchableOpacity
        style={styles.createButton}
        onPress={onCreate}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={FocusCopy.emptyCta}
      >
        <Text style={styles.createButtonText}>{FocusCopy.emptyCta}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorTokens.backgroundPrimary,
  },
  routineContainer: {
    flex: 1,
  },
  routineContent: {
    paddingHorizontal: SpacingTokens.lg,
    paddingBottom: SpacingTokens.xl,
  },
  routineCard: {
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.lg,
    padding: 20,
    ...ShadowTokens.sm,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SpacingTokens.lg,
  },
  routineHeaderLeft: {
    flex: 1,
  },
  routineName: {
    fontSize: 18,
    fontWeight: '600',
    color: ColorTokens.textPrimary,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
    backgroundColor: ColorTokens.backgroundPrimary,
    paddingHorizontal: SpacingTokens.sm,
    paddingVertical: SpacingTokens.xs,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: SpacingTokens.xs,
  },
  reminderText: {
    fontSize: 12,
    color: ColorTokens.primary,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SpacingTokens.md,
    paddingVertical: SpacingTokens.sm,
    borderRadius: RadiusTokens.md,
    borderWidth: 1.5,
    borderColor: ColorTokens.secondary,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
  activityList: {
    marginBottom: SpacingTokens.base,
  },
  summaryFooter: {
    flexDirection: 'row',
    gap: SpacingTokens.base,
    paddingTop: SpacingTokens.md,
    borderTopWidth: 1,
    borderTopColor: ColorTokens.surfaceTinted,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SpacingTokens.xs,
  },
  summaryText: {
    fontSize: 13,
    color: ColorTokens.textSecondary,
  },
  startButton: {
    height: SizeTokens.buttonHeightPrimary,
    backgroundColor: ColorTokens.primary,
    borderRadius: RadiusTokens.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SpacingTokens.base,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: ColorTokens.textOnPrimary,
  },
  reminderLink: {
    alignItems: 'center',
    paddingVertical: SpacingTokens.md,
    marginTop: SpacingTokens.md,
  },
  reminderLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SpacingTokens.xl,
    paddingTop: SpacingTokens['2xl'],
  },
  emptyEmoji: {
    fontSize: 48,
    opacity: 0.6,
    marginBottom: SpacingTokens.base,
  },
  emptyHeadline: {
    fontSize: 18,
    fontWeight: '600',
    color: ColorTokens.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: ColorTokens.textSecondary,
    textAlign: 'center',
    lineHeight: 14 * 1.5,
    marginTop: SpacingTokens.sm,
    marginBottom: SpacingTokens.lg,
  },
  createButton: {
    height: SizeTokens.buttonHeightPrimary,
    paddingHorizontal: SpacingTokens.xl,
    backgroundColor: ColorTokens.primary,
    borderRadius: RadiusTokens.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: ColorTokens.textOnPrimary,
  },
});

export default RoutinesTab;
