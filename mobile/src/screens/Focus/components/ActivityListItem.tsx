/**
 * ActivityListItem Component
 * Draggable activity row for routine building
 *
 * Per Focus Page Spec Section 6.3:
 * - Drag handle: 6-dot grip icon, 18px
 * - Activity icon: 20px in 38px rounded square
 * - Primary text: activity name, 15px Medium
 * - Duration: "{n} min", 13px Regular
 * - Trailing: Chevron-right, 18px
 * - Row height: minimum 56px
 * - Divider: 1px, inset 68px from left
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  SizeTokens,
} from '../../../tokens/design-tokens';
import { getActivityColor, getActivityColorWithOpacity } from './activityColors';

interface Activity {
  id: number | string;
  name: string;
  duration: number;
  icon: string;
  color: string;
}

interface ActivityListItemProps {
  /** Activity data */
  activity: Activity;
  /** Whether this is the last item (hides divider) */
  isLast?: boolean;
  /** Callback when item is pressed */
  onPress?: () => void;
  /** Whether drag is enabled */
  isDraggable?: boolean;
  /** Callback for drag handle press (for drag-to-reorder) */
  onDragStart?: () => void;
  /** Whether item is currently being dragged */
  isDragging?: boolean;
}

export const ActivityListItem: React.FC<ActivityListItemProps> = ({
  activity,
  isLast = false,
  onPress,
  isDraggable = true,
  onDragStart,
  isDragging = false,
}) => {
  const activityColor = getActivityColor(activity.color);
  const iconBgColor = getActivityColorWithOpacity(activity.color, 0.15);

  return (
    <View style={[styles.container, isDragging && styles.containerDragging]}>
      <TouchableOpacity
        style={styles.row}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${activity.name}, ${activity.duration} minutes, position in list`}
        accessibilityHint="Double tap to edit, long press to reorder"
      >
        {/* Drag handle */}
        {isDraggable && (
          <TouchableOpacity
            style={styles.dragHandle}
            onLongPress={onDragStart}
            accessibilityRole="button"
            accessibilityLabel={`Reorder ${activity.name}`}
            accessibilityHint="Long press and drag to reorder"
          >
            <Icon
              name="drag"
              size={18}
              color={ColorTokens.secondary}
            />
          </TouchableOpacity>
        )}

        {/* Activity icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Icon
            name={activity.icon as any}
            size={20}
            color={activityColor}
          />
        </View>

        {/* Text content */}
        <View style={styles.textContainer}>
          <Text style={styles.name}>{activity.name}</Text>
          <Text style={styles.duration}>{`${activity.duration} min`}</Text>
        </View>

        {/* Chevron */}
        <Icon
          name="chevron-right"
          size={18}
          color={ColorTokens.textSecondary}
        />
      </TouchableOpacity>

      {/* Divider */}
      {!isLast && <View style={styles.divider} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ColorTokens.backgroundSurface,
  },
  containerDragging: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SpacingTokens.md,
    paddingRight: SpacingTokens.base,
    minHeight: 56,
  },
  dragHandle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SpacingTokens.xs,
  },
  iconContainer: {
    width: SizeTokens.activityIconSquare,
    height: SizeTokens.activityIconSquare,
    borderRadius: RadiusTokens.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SpacingTokens.md,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '500',
    color: ColorTokens.textPrimary,
    marginBottom: 2,
  },
  duration: {
    fontSize: 13,
    fontWeight: '400',
    color: ColorTokens.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: `rgba(213, 227, 209, 0.6)`, // surfaceTinted at 60%
    marginLeft: 68, // Past drag handle + icon
  },
});

export default ActivityListItem;
