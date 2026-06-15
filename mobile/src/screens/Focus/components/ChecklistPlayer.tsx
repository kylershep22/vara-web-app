/**
 * ChecklistPlayer Component
 * Routine execution as an ordered checklist — no timer, no pressure.
 * Activities can be checked off in any order.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ColorTokens, SpacingTokens, RadiusTokens } from '../../../constants/designTokens';
import { Activity } from '../../../services/firebase/routines.service';
import { getActivityColor } from './activityColors';

interface ChecklistPlayerProps {
  activities: Activity[];
  onComplete: () => void;
  routineName: string;
  /** Called when all items are checked for completion persistence */
  onRoutineComplete?: () => void;
}

export const ChecklistPlayer: React.FC<ChecklistPlayerProps> = ({
  activities,
  onComplete,
  routineName,
  onRoutineComplete,
}) => {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const allDone = completedIds.size === activities.length;

  useEffect(() => {
    if (allDone && activities.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onRoutineComplete?.();
      const timeout = setTimeout(() => onComplete(), 600);
      return () => clearTimeout(timeout);
    }
  }, [allDone]);

  const toggleActivity = (id: number | string) => {
    const stringId = String(id);
    Haptics.selectionAsync();
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(stringId)) {
        next.delete(stringId);
      } else {
        next.add(stringId);
      }
      return next;
    });
  };

  const completedCount = completedIds.size;
  const totalCount = activities.length;

  return (
    <View style={styles.container}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {completedCount} of {totalCount} complete
        </Text>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {activities.map((activity) => {
          const isCompleted = completedIds.has(String(activity.id));
          const activityColor = getActivityColor(activity.color);

          return (
            <TouchableOpacity
              key={activity.id}
              style={[styles.activityRow, isCompleted && styles.activityRowCompleted]}
              onPress={() => toggleActivity(activity.id)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isCompleted }}
              accessibilityLabel={`${activity.name}, ${activity.duration} minutes${isCompleted ? ', completed' : ''}`}
            >
              <View style={[styles.checkbox, isCompleted && { backgroundColor: ColorTokens.primary, borderColor: ColorTokens.primary }]}>
                {isCompleted && <Icon name="check" size={14} color="#FFFFFF" />}
              </View>
              <View style={[styles.activityIcon, { backgroundColor: isCompleted ? ColorTokens.backgroundPrimary : activityColor + '20' }]}>
                <Icon name={activity.icon as any} size={18} color={isCompleted ? ColorTokens.textSecondary : activityColor} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={[styles.activityName, isCompleted && styles.activityNameCompleted]}>{activity.name}</Text>
                <Text style={styles.activityDuration}>{activity.duration} min</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressHeader: { paddingHorizontal: SpacingTokens.lg, paddingVertical: SpacingTokens.md },
  progressText: { fontSize: 14, fontWeight: '500', color: ColorTokens.textSecondary, marginBottom: SpacingTokens.sm },
  progressBarTrack: { height: 4, backgroundColor: ColorTokens.backgroundPrimary, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: ColorTokens.primary, borderRadius: 2 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: SpacingTokens.lg, paddingBottom: SpacingTokens.xl },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: ColorTokens.backgroundSurface, borderRadius: RadiusTokens.md, marginBottom: SpacingTokens.sm, gap: 12,
  },
  activityRowCompleted: { opacity: 0.6 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: ColorTokens.secondary,
    alignItems: 'center', justifyContent: 'center',
  },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 15, fontWeight: '500', color: ColorTokens.textPrimary },
  activityNameCompleted: { textDecorationLine: 'line-through', color: ColorTokens.textSecondary },
  activityDuration: { fontSize: 13, color: ColorTokens.textSecondary, marginTop: 2 },
});

export default ChecklistPlayer;
