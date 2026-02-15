/**
 * JournalEntryCard Component
 * Redesigned entry card with mood-colored border, gradient dot, and micro-interactions
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { getMoodConfig } from '../../constants/journalTags';
import { JournalEntry } from '../../types';
import { useReducedMotion } from '../../hooks';
import { MoodGradientDot } from './MoodGradientDot';

interface JournalEntryCardProps {
  /** Journal entry data */
  entry: JournalEntry;
  /** Callback when card is pressed */
  onPress: () => void;
  /** Optional callback for long press */
  onLongPress?: () => void;
}

/**
 * Truncate text to a maximum length
 */
const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Format time from Firestore timestamp
 */
const formatTime = (createdAt: any): string => {
  if (!createdAt?.seconds) return '';
  return new Date(createdAt.seconds * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const JournalEntryCard: React.FC<JournalEntryCardProps> = ({
  entry,
  onPress,
  onLongPress,
}) => {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const moodConfig = getMoodConfig(entry.mood || 'okay');
  const content = entry.text || entry.content || '';
  const time = formatTime(entry.createdAt);

  const handlePressIn = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withTiming(0.98, {
        duration: 100,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [reduceMotion, scale]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion) {
      scale.value = withSpring(1, { damping: 15, stiffness: 180 });
    }
  }, [reduceMotion, scale]);

  const handlePress = useCallback(() => {
    // Trigger haptic feedback on iOS
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onLongPress();
    }
  }, [onLongPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={`Journal entry from ${time}. Mood: ${moodConfig.label}. ${truncateText(content, 50)}`}
    >
      <Animated.View
        style={[
          styles.card,
          { borderLeftColor: moodConfig.borderColor },
          animatedStyle,
        ]}
      >
        {/* Header with mood dot and time */}
        <View style={styles.header}>
          <MoodGradientDot mood={entry.mood || 'okay'} size={12} />
          <Text variant="bodySmall" style={styles.time}>
            {time}
          </Text>
        </View>

        {/* Entry preview text */}
        <Text variant="bodyMedium" style={styles.preview} numberOfLines={3}>
          {truncateText(content)}
        </Text>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} style={styles.tag} textStyle={styles.tagText}>
                #{tag}
              </Chip>
            ))}
            {entry.tags.length > 3 && (
              <Text variant="bodySmall" style={styles.moreTagsText}>
                +{entry.tags.length - 3}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderLeftWidth: 2,
    // Shadow for iOS
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    // Elevation for Android
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  time: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  preview: {
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * 1.5,
    marginBottom: Spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tag: {
    backgroundColor: Colors.dewSage,
    height: 28,
  },
  tagText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
  },
  moreTagsText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginLeft: Spacing.xs,
  },
});

export default JournalEntryCard;
