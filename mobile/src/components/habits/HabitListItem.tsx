/**
 * HabitListItem
 * Renders a single habit card with checkbox, title, metadata, and chevron.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BaseCard } from '../../components';
import { AnimatedCheckbox } from '../../components/celebrations';
import { Colors } from '../../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Habit } from '../../types';

interface HabitListItemProps {
  habit: Habit;
  isCompleted: boolean;
  onToggle: (habitId: string) => void;
  onNavigateToDetail: (habit: Habit) => void;
}

export const HabitListItem: React.FC<HabitListItemProps> = ({
  habit,
  isCompleted,
  onToggle,
  onNavigateToDetail,
}) => {
  const habitName = habit?.name || (habit as any)?.title || 'Unnamed Habit';

  // Build metadata line: Category . Frequency . Trigger
  const metaParts: string[] = [];
  if (habit.category) metaParts.push(habit.category);
  if (habit.type) metaParts.push(habit.type.charAt(0).toUpperCase() + habit.type.slice(1));
  if (habit.cue?.value) metaParts.push(habit.cue.value);
  const metaLine = metaParts.join(' \u00B7 ');

  return (
    <BaseCard>
      <View style={styles.row}>
        <View style={styles.checkboxWrapper}>
          <AnimatedCheckbox
            status={isCompleted ? 'checked' : 'unchecked'}
            onPress={() => onToggle(habit.id)}
            color={Colors.evergreenTeal}
          />
        </View>

        <TouchableOpacity
          onPress={() => onNavigateToDetail(habit)}
          activeOpacity={0.7}
          style={styles.touchable}
        >
          <View style={styles.content}>
            <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
              {habitName}
            </Text>
            {metaLine ? <Text style={styles.meta}>{metaLine}</Text> : null}
            {(habit.intention || habit.cue?.value) && (
              <View style={styles.intentionRow}>
                {habit.intention && (
                  <Text style={styles.intentionLabel}>{habit.intention.label}</Text>
                )}
                {habit.intention && habit.cue?.value && (
                  <Text style={styles.intentionDot}> \u00B7 </Text>
                )}
                {habit.cue?.value && (
                  <Text style={styles.intentionTime}>{habit.cue.value}</Text>
                )}
              </View>
            )}
          </View>
          <Icon name="chevron-right" size={16} color="#6F7F77" />
        </TouchableOpacity>
      </View>
    </BaseCard>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxWrapper: {
    paddingTop: 1,
  },
  touchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3E3E3E',
    lineHeight: 21,
  },
  titleCompleted: {
    color: '#6F7F77',
    textDecorationLine: 'line-through',
  },
  meta: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6F7F77',
    marginTop: 4,
  },
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  intentionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6F7F77',
  },
  intentionDot: {
    fontSize: 12,
    color: '#B8CDBA',
  },
  intentionTime: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6F7F77',
  },
});
