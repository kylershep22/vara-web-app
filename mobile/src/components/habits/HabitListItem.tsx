/**
 * HabitListItem
 * Renders a single habit card with checkbox, title, metadata, and chevron.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BaseCard } from '../shared/BaseCard';
import { Tag } from '../shared/Tag';
import { AnimatedCheckbox } from '../../components/celebrations';
import { Colors } from '../../constants';
import { isCognitiveReserveCategory } from '../../constants/habitCategories';
import { habitCategoryLabel } from '../../constants/habitTaxonomy';
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
  const isCR = isCognitiveReserveCategory(habit.category);
  // The controlled taxonomy's friendly label. Null for habits created before
  // the capture shipped, which render no chip at all rather than a blank one.
  const categoryLabel = habitCategoryLabel(habit.habitCategory);

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
            <View style={styles.titleRow}>
              <Text style={[styles.title, isCompleted && styles.titleCompleted]}>
                {habitName}
              </Text>
              {isCR && (
                <View style={styles.crBadge}>
                  <Text style={styles.crBadgeText}>🌿 CR</Text>
                </View>
              )}
              {/* Shared Tag, default variant: Dew Sage on Soft Charcoal (8.02:1).
                  Neutral metadata, so it never competes with a teal CTA. No
                  onPress, so Tag renders a plain View and adds no second touch
                  target inside the card's own tappable region. */}
              {categoryLabel && (
                <Tag label={categoryLabel} variant="default" testID="habit-card-category" />
              )}
            </View>
            {metaLine ? <Text style={styles.meta}>{metaLine}</Text> : null}
            {habit.valueAlignment ? (
              <View style={styles.valueTag}>
                <Text style={styles.valueTagText}>→ {habit.valueAlignment}</Text>
              </View>
            ) : null}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Insurance for the one case where the CR badge and the category chip can
    // coexist: a habit given a legacy category by the web app AND a controlled
    // key on mobile. Without wrapping, two markers plus a long name squeeze the
    // title. Normally only one of the two renders, so this never engages.
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3E3E3E',
    lineHeight: 21,
    flexShrink: 1,
  },
  crBadge: {
    backgroundColor: '#E6F2EC',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  crBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2A6E4A',
  },
  valueTag: {
    backgroundColor: 'rgba(27, 94, 87, 0.07)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 7,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  valueTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1B5E57',
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
