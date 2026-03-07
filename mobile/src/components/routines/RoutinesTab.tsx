/**
 * Routines Tab Component
 * Main view for managing routines
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { Button, Card, LoadingSpinner } from '../';
import {
  Routine,
  RoutineType,
  fetchActiveRoutineByType,
  calculateTotalDuration,
} from '../../services/firebase/routines.service';
import {
  getRoutineTypeDisplayName,
  getRoutineTypeDescription,
  getRoutineTypeIcon,
} from '../../constants/activityLibrary';
import { RoutineEditor } from './RoutineEditor';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const ROUTINE_TYPES: RoutineType[] = ['morning', 'bedtime', 'evening', 'custom'];

export const RoutinesTab: React.FC = () => {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState<RoutineType>('morning');
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Load active routine for selected type
  useEffect(() => {
    loadActiveRoutine();
  }, [selectedType, user]);

  const loadActiveRoutine = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const routine = await fetchActiveRoutineByType(user.uid, selectedType);
      setActiveRoutine(routine);
    } catch (error) {
      console.error('Error loading routine:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComplete = () => {
    setIsEditing(false);
    loadActiveRoutine();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleCreate = () => {
    setActiveRoutine(null);
    setIsEditing(true);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  if (!user) {
    return null;
  }

  if (isEditing) {
    return (
      <RoutineEditor
        userId={user.uid}
        routineType={selectedType}
        existingRoutine={activeRoutine}
        onSave={handleSaveComplete}
        onCancel={handleCancelEdit}
      />
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Type Selector */}
      <View style={styles.typeSelector}>
        {ROUTINE_TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              selectedType === type && styles.typeButtonActive,
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Icon
              key={`${type}-icon`}
              name={getRoutineTypeIcon(type)}
              size={20}
              color={selectedType === type ? Colors.textOnPrimary : Colors.textPrimary}
            />
            <Text
              key={`${type}-text`}
              style={[
                styles.typeText,
                selectedType === type && styles.typeTextActive,
              ]}
            >
              {getRoutineTypeDisplayName(type)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="Loading routine..." />
      ) : activeRoutine ? (
        <RoutineView routine={activeRoutine} onEdit={handleEdit} />
      ) : (
        <EmptyState
          routineType={selectedType}
          onCreate={handleCreate}
        />
      )}
    </ScrollView>
  );
};

/**
 * Routine View - Shows active routine
 */
interface RoutineViewProps {
  routine: Routine;
  onEdit: () => void;
}

const RoutineView: React.FC<RoutineViewProps> = ({ routine, onEdit }) => {
  const navigation = useNavigation<any>();
  const totalDuration = calculateTotalDuration(routine.activities);

  const handleStartRoutine = () => {
    navigation.navigate('RoutineTimer', { routine });
  };

  return (
    <View style={styles.routineView}>
      <Card style={styles.routineCard}>
        <View key="routine-header" style={styles.routineHeader}>
          <View key="header-left" style={styles.routineHeaderLeft}>
            <Text key="routine-name" style={styles.routineName}>{routine.name}</Text>
            {routine.reminderTime && (
              <View key="reminder-badge" style={styles.reminderBadge}>
                <Icon key="reminder-icon" name="bell" size={14} color={Colors.evergreenTeal} />
                <Text key="reminder-text" style={styles.reminderText}>
                  Reminder set for {routine.reminderTime}
                </Text>
              </View>
            )}
          </View>
          <Button key="edit-button" variant="outline" onPress={onEdit} style={styles.editButton}>
            <Icon key="edit-icon" name="pencil" size={16} color={Colors.evergreenTeal} />
            <Text key="edit-text" style={styles.editButtonText}>Edit</Text>
          </Button>
        </View>

        {/* Activities Timeline */}
        <View key="routine-timeline" style={styles.timeline}>
          {routine.activities.map((activity, index) => (
            <View key={`activity-${index}`} style={styles.timelineItem}>
              <View key={`activity-${index}-left`} style={styles.timelineLeft}>
                <View
                  key={`activity-${index}-dot`}
                  style={[
                    styles.activityDot,
                    { backgroundColor: getColorForActivity(activity.color) },
                  ]}
                >
                  <Icon name={activity.icon} size={16} color="#fff" />
                </View>
                {index < routine.activities.length - 1 && (
                  <View key={`activity-${index}-line`} style={styles.timelineLine} />
                )}
              </View>
              <View key={`activity-${index}-content`} style={styles.timelineContent}>
                <Text key={`activity-${index}-name`} style={styles.activityName}>{activity.name}</Text>
                <Text key={`activity-${index}-duration`} style={styles.activityDuration}>{`${activity.duration} min`}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View key="routine-stats" style={styles.stats}>
          <View key="duration-stat" style={styles.statItem}>
            <Icon key="duration-icon" name="clock-outline" size={20} color={Colors.textSecondary} />
            <Text key="duration-text" style={styles.statText}>{`${totalDuration} min total`}</Text>
          </View>
          <View key="count-stat" style={styles.statItem}>
            <Icon key="count-icon" name="format-list-checks" size={20} color={Colors.textSecondary} />
            <Text key="count-text" style={styles.statText}>
              {routine.activities.length} {routine.activities.length === 1 ? 'activity' : 'activities'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Start Routine Button */}
      <Button
        key="start-button"
        variant="primary"
        onPress={handleStartRoutine}
        style={styles.startButton}
      >
        <Icon key="start-icon" name="play-circle" size={20} color="#fff" />
        <Text key="start-text" style={styles.startButtonText}>Start Routine</Text>
      </Button>
    </View>
  );
};

/**
 * Empty State - Shows when no routine exists
 */
interface EmptyStateProps {
  routineType: RoutineType;
  onCreate: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ routineType, onCreate }) => {
  return (
    <Card style={styles.emptyCard}>
      <Icon
        key="empty-icon"
        name={getRoutineTypeIcon(routineType)}
        size={64}
        color={Colors.textSecondary}
      />
      <Text key="empty-title" style={styles.emptyTitle}>
        No {getRoutineTypeDisplayName(routineType).toLowerCase()} routine yet
      </Text>
      <Text key="empty-description" style={styles.emptyDescription}>
        {getRoutineTypeDescription(routineType)}
      </Text>
      <Button
        key="create-button"
        variant="primary"
        onPress={onCreate}
        style={styles.createButton}
      >
        Create {getRoutineTypeDisplayName(routineType)} Routine
      </Button>
    </Card>
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
    gray: '#6F7F77',
  };
  return colorMap[color] || '#1B5E57';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  typeButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  typeTextActive: {
    color: Colors.textOnPrimary,
  },
  routineView: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  routineCard: {
    padding: Spacing.lg,
  },
  routineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  routineHeaderLeft: {
    flex: 1,
  },
  routineName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  reminderText: {
    fontSize: 12,
    color: Colors.evergreenTeal,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  editButtonText: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    fontSize: 14,
  },
  timeline: {
    marginBottom: Spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  timelineLeft: {
    width: 40,
    alignItems: 'center',
  },
  activityDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingTop: Spacing.xs,
    paddingLeft: Spacing.base,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  activityDuration: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptyCard: {
    margin: Spacing.lg,
    padding: Spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  createButton: {
    paddingHorizontal: Spacing.xl,
  },
  startButton: {
    marginTop: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
