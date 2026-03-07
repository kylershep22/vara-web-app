/**
 * Content Card Component
 * Generic card for all library content types (breathwork, sleep, movement, masterclass)
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';

interface ContentCardProps {
  title: string;
  description: string;
  duration: string;
  category: string;
  thumbnail?: string;
  type: 'audio' | 'video' | 'guided';
  purpose?: string; // For breathwork: "Relax", "Sleep", "Focus"
  onPress: () => void;
}

export function ContentCard({
  title,
  description,
  duration,
  category,
  thumbnail,
  type,
  purpose,
  onPress,
}: ContentCardProps) {
  const getTypeIcon = () => {
    switch (type) {
      case 'audio':
        return 'headphones';
      case 'video':
        return 'play-circle';
      case 'guided':
        return 'meditation';
      default:
        return 'circle';
    }
  };

  const getPurposeColor = () => {
    switch (purpose) {
      case 'Relax':
        return Colors.silverSage;
      case 'Sleep':
        return '#9FA8DA'; // Light indigo
      case 'Focus':
        return Colors.sunriseAmber;
      default:
        return Colors.silverSage;
    }
  };

  return (
    <TouchableOpacity onPress={onPress} style={styles.container} activeOpacity={0.7}>
      {/* Thumbnail or Icon */}
      <View style={styles.mediaContainer}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.iconPlaceholder, { backgroundColor: Colors.background }]}>
            <Icon name={getTypeIcon()} size={32} color={Colors.evergreenTeal} />
          </View>
        )}
        {type === 'video' && (
          <View style={styles.playOverlay}>
            <Icon name="play-circle" size={48} color="rgba(255, 255, 255, 0.9)" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        {/* Metadata */}
        <View style={styles.metadata}>
          <View style={styles.metadataRow}>
            <Icon name="clock-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.metadataText}>
              {duration}
            </Text>
          </View>

          {category && (
            <View style={styles.categoryChip}>
              <Text style={styles.chipText}>{category}</Text>
            </View>
          )}

          {purpose && (
            <View style={[styles.purposeChip, { backgroundColor: getPurposeColor() }]}>
              <Text style={styles.purposeText}>{purpose}</Text>
            </View>
          )}
        </View>
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
    ...Layout.shadow.sm,
    overflow: 'hidden',
  },
  mediaContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  iconPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: {
    padding: Spacing.base,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    color: Colors.textSecondary,
  },
  categoryChip: {
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipText: {
    fontSize: Typography.fontSize.xs,
    marginVertical: 0,
  },
  purposeChip: {
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },
  purposeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginVertical: 0,
  },
});
