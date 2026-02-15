/**
 * FilterChipBar Component
 * Horizontal scrolling filter chips for journal entries
 */

import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { JOURNAL_TAGS } from '../../constants/journalTags';

interface TagCount {
  value: string;
  count: number;
}

interface FilterChipBarProps {
  /** Top tags with their frequency counts */
  tags: TagCount[];
  /** Currently selected tag (null for "All") */
  selectedTag: string | null;
  /** Callback when tag selection changes */
  onSelectTag: (tag: string | null) => void;
}

/**
 * Get the display label for a tag value
 */
const getTagLabel = (value: string): string => {
  const tag = JOURNAL_TAGS.find((t) => t.value === value);
  return tag?.label || value.charAt(0).toUpperCase() + value.slice(1);
};

export const FilterChipBar: React.FC<FilterChipBarProps> = ({
  tags,
  selectedTag,
  onSelectTag,
}) => {
  const handleSelectTag = useCallback(
    (tag: string | null) => {
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
      onSelectTag(tag);
    },
    [onSelectTag]
  );

  // Don't render if no tags
  if (tags.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* "All" chip is always first */}
        <TouchableOpacity
          onPress={() => handleSelectTag(null)}
          style={[styles.chip, selectedTag === null && styles.chipActive]}
          accessibilityRole="button"
          accessibilityLabel="Filter: All entries"
          accessibilityState={{ selected: selectedTag === null }}
        >
          <Text
            style={[styles.chipText, selectedTag === null && styles.chipTextActive]}
          >
            All
          </Text>
        </TouchableOpacity>

        {/* Dynamic tag chips */}
        {tags.map((tag) => {
          const isActive = selectedTag === tag.value;
          return (
            <TouchableOpacity
              key={tag.value}
              onPress={() => handleSelectTag(tag.value)}
              style={[styles.chip, isActive && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Filter: ${getTagLabel(tag.value)}`}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {getTagLabel(tag.value)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.surface,
    minHeight: 48, // Accessibility: minimum touch target
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  chipText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
  },
  chipTextActive: {
    color: Colors.textOnPrimary,
  },
});

export default FilterChipBar;
