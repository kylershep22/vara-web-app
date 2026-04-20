/**
 * RoutinesCard — Dashboard card surfacing user's routines
 * Collapsible container with auto-expand by time of day.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { Routine, Activity, calculateTotalDuration } from '../../services/firebase/routines.service';
import { getTemplatesForType, RoutineTemplate } from '../../constants/routineTemplates';

const COLLAPSE_KEY = 'dashboard_routines_collapsed';

interface RoutineCompletion {
  [routineId: string]: boolean;
}

interface RoutinesCardProps {
  routines: Routine[];
  completions: RoutineCompletion;
  onBeginRoutine: (routine: Routine) => void;
  onNavigateToRoutines: () => void;
  onApplyTemplate: (template: RoutineTemplate) => void;
}

function getTimeRelevantTypes(): Set<string> {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const relevant = new Set<string>();

  if (hour >= 5 && hour < 12) relevant.add('morning');
  if (hour >= 12) relevant.add('evening');
  if (day === 0) relevant.add('custom');

  return relevant;
}

function getTimeBasedTemplates(): RoutineTemplate[] {
  const hour = new Date().getHours();
  const day = new Date().getDay();

  if (day === 0) return getTemplatesForType('sunday').slice(0, 2);
  if (hour < 12) return getTemplatesForType('morning').slice(0, 2);
  return getTemplatesForType('evening').slice(0, 2);
}

const RoutineRow: React.FC<{
  routine: Routine;
  isExpanded: boolean;
  isCompleted: boolean;
  onToggleExpand: () => void;
  onBegin: () => void;
}> = ({ routine, isExpanded, isCompleted, onToggleExpand, onBegin }) => {
  const totalDuration = calculateTotalDuration(routine.activities);

  return (
    <View style={rowStyles.container}>
      <TouchableOpacity style={rowStyles.header} onPress={onToggleExpand} activeOpacity={0.7}>
        <View style={rowStyles.headerLeft}>
          {isCompleted && (
            <Icon name="check-circle" size={18} color={Colors.evergreenTeal} style={{ marginRight: 6 }} />
          )}
          <Text style={[rowStyles.name, isCompleted && rowStyles.nameCompleted]}>{routine.name}</Text>
        </View>
        <View style={rowStyles.headerRight}>
          <Text style={rowStyles.duration}>{totalDuration} min</Text>
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={rowStyles.expandedContent}>
          {routine.activities.map((activity, idx) => (
            <View key={activity.id || idx} style={rowStyles.activityRow}>
              <Icon name={activity.icon as any} size={16} color={Colors.evergreenTeal} />
              <Text style={rowStyles.activityName}>{activity.name}</Text>
              <Text style={rowStyles.activityDuration}>{activity.duration} min</Text>
            </View>
          ))}

          {routine.reminderTime && (
            <View style={rowStyles.reminderRow}>
              <Icon name="bell-outline" size={14} color={Colors.textSecondary} />
              <Text style={rowStyles.reminderText}>Reminder at {routine.reminderTime}</Text>
            </View>
          )}

          {isCompleted ? (
            <TouchableOpacity style={rowStyles.doAgainButton} onPress={onBegin} activeOpacity={0.7}>
              <Text style={rowStyles.doAgainText}>Do again</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={rowStyles.beginButton} onPress={onBegin} activeOpacity={0.8}>
              <Text style={rowStyles.beginText}>Begin</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const RoutinesCard: React.FC<RoutinesCardProps> = ({
  routines,
  completions,
  onBeginRoutine,
  onNavigateToRoutines,
  onApplyTemplate,
}) => {
  const [cardCollapsed, setCardCollapsed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(COLLAPSE_KEY).then(val => {
      if (val === 'true') setCardCollapsed(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (routines.length === 0) return;
    const relevant = getTimeRelevantTypes();
    const autoExpand = new Set<string>();

    routines.forEach(r => {
      if (relevant.has(r.type) && !completions[r.id]) {
        autoExpand.add(r.id);
      }
    });

    setExpandedIds(autoExpand);
  }, [routines, completions]);

  const toggleCardCollapse = useCallback(() => {
    const next = !cardCollapsed;
    setCardCollapsed(next);
    AsyncStorage.setItem(COLLAPSE_KEY, next ? 'true' : 'false').catch(() => {});
  }, [cardCollapsed]);

  const toggleRowExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (routines.length === 0) {
    const templates = getTimeBasedTemplates();

    return (
      <View style={styles.card}>
        <View style={styles.accentBar} />
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Your Routines</Text>
          </View>
          <View style={styles.emptyState}>
            <Icon name="lightbulb-outline" size={24} color={Colors.evergreenTeal} />
            <Text style={styles.emptyHeadline}>Routines help when you want structure.</Text>
            <Text style={styles.emptyBody}>
              None yet, and that's fine.
            </Text>
            {templates.map(template => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateRow}
                onPress={() => onApplyTemplate(template)}
                activeOpacity={0.7}
              >
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDuration}>{template.totalMinutes} min</Text>
                </View>
                <Text style={styles.templateCta}>Try this</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={onNavigateToRoutines} style={styles.browseLink}>
              <Text style={styles.browseLinkText}>Browse all routines</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.cardContent}>
        <TouchableOpacity style={styles.headerRow} onPress={toggleCardCollapse} activeOpacity={0.7}>
          <Text style={styles.headerTitle}>Your Routines</Text>
          <Icon name={cardCollapsed ? 'chevron-down' : 'chevron-up'} size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        {!cardCollapsed && (
          <View style={styles.routinesList}>
            {routines.map(routine => (
              <RoutineRow
                key={routine.id}
                routine={routine}
                isExpanded={expandedIds.has(routine.id)}
                isCompleted={!!completions[routine.id]}
                onToggleExpand={() => toggleRowExpand(routine.id)}
                onBegin={() => onBeginRoutine(routine)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    backgroundColor: Colors.evergreenTeal,
  },
  cardContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  routinesList: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  emptyHeadline: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(184,205,186,0.15)',
    borderRadius: 8,
    marginBottom: 6,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  templateDuration: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  templateCta: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  browseLink: {
    marginTop: 4,
  },
  browseLinkText: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});

const rowStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(184,205,186,0.15)',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  nameCompleted: {
    color: Colors.textSecondary,
  },
  duration: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  activityName: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  activityDuration: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  reminderText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  beginButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  beginText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
  },
  doAgainButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  doAgainText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

export default RoutinesCard;
