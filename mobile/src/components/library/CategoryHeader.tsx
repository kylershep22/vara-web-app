/**
 * Category Header Component
 * Section header with icon and optional action button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

interface CategoryHeaderProps {
  title: string;
  icon?: string; // MaterialCommunityIcons name
  count?: number;
  onSeeAll?: () => void;
}

export function CategoryHeader({ title, icon, count, onSeeAll }: CategoryHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {icon && (
          <Icon
            name={icon}
            size={24}
            color={Colors.evergreenTeal}
            style={styles.icon}
          />
        )}
        <Text style={styles.title}>
          {title}
        </Text>
        {count !== undefined && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {count}
            </Text>
          </View>
        )}
      </View>

      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>
            See All
          </Text>
          <Icon name="chevron-right" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.base,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  countBadge: {
    backgroundColor: Colors.silverSage,
    borderRadius: 12,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginLeft: Spacing.sm,
  },
  countText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    marginRight: 2,
  },
});
