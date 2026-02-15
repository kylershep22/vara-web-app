/**
 * Masterclass Card Component
 * Card for masterclass display with progress tracking
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Chip, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { Masterclass } from '../../services/firebase/library.service';

interface MasterclassCardProps {
  masterclass: Masterclass;
  progress?: number; // 0-1 if started
  onPress: () => void;
}

export function MasterclassCard({ masterclass, progress, onPress }: MasterclassCardProps) {
  const getDifficultyColor = () => {
    switch (masterclass.difficulty) {
      case 'beginner':
        return Colors.success;
      case 'intermediate':
        return Colors.warning;
      case 'advanced':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.7}>
      {/* Thumbnail */}
      <View style={styles.thumbnailContainer}>
        {masterclass.thumbnail ? (
          <Image source={{ uri: masterclass.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Icon name="school" size={48} color={Colors.evergreenTeal} />
          </View>
        )}
        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />

        {/* Duration Badge */}
        <View style={styles.durationBadge}>
          <Icon name="clock-outline" size={14} color={Colors.white} />
          <Text variant="labelSmall" style={styles.durationText}>
            {masterclass.duration}
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text variant="titleMedium" style={styles.title} numberOfLines={2}>
          {masterclass.title}
        </Text>

        {/* Instructor */}
        <View style={styles.instructorRow}>
          <Icon name="account" size={16} color={Colors.textSecondary} />
          <Text variant="bodySmall" style={styles.instructor}>
            {masterclass.instructor}
          </Text>
        </View>

        {/* Description */}
        <Text variant="bodySmall" style={styles.description} numberOfLines={2}>
          {masterclass.description}
        </Text>

        {/* Tags & Difficulty */}
        <View style={styles.metadata}>
          <Chip
            mode="flat"
            compact
            style={[styles.difficultyChip, { backgroundColor: getDifficultyColor() + '20' }]}
            textStyle={[styles.difficultyText, { color: getDifficultyColor() }]}
          >
            {masterclass.difficulty.charAt(0).toUpperCase() + masterclass.difficulty.slice(1)}
          </Chip>

          {masterclass.topics.slice(0, 2).map((topic, index) => (
            <Chip
              key={index}
              mode="outlined"
              compact
              style={styles.topicChip}
              textStyle={styles.topicText}
            >
              {topic}
            </Chip>
          ))}
        </View>

        {/* Progress Bar (if started) */}
        {progress !== undefined && progress > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text variant="labelSmall" style={styles.progressLabel}>
                Progress
              </Text>
              <Text variant="labelSmall" style={styles.progressPercentage}>
                {Math.round(progress * 100)}%
              </Text>
            </View>
            <ProgressBar
              progress={progress}
              color={Colors.evergreenTeal}
              style={styles.progressBar}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.sm,
    ...Layout.shadow.md,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  durationBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.md,
    gap: 4,
  },
  durationText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.medium,
  },
  content: {
    padding: Spacing.base,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  instructor: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  difficultyChip: {
    height: 24,
  },
  difficultyText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    marginVertical: 0,
  },
  topicChip: {
    height: 24,
    borderColor: Colors.borderLight,
  },
  topicText: {
    fontSize: Typography.fontSize.xs,
    marginVertical: 0,
  },
  progressSection: {
    marginTop: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    color: Colors.textSecondary,
  },
  progressPercentage: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressBar: {
    height: 6,
    borderRadius: Layout.borderRadius.sm,
    backgroundColor: Colors.borderLight,
  },
});
